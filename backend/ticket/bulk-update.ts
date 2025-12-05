import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import type { TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket, getTicketScopeFilter } from "../auth/permissions";

export interface BulkUpdateRequest {
  // currentUserId: string;
  // currentUserRole: UserRole;
  ticketIds: string[];
  status?: TicketStatus;
  urgency?: Urgency;
  category?: string;
  dueDate?: string;
}

export interface BulkUpdateResponse {
  updated: number;
  failed: string[];
}

export const bulkUpdate = api<BulkUpdateRequest, BulkUpdateResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/bulk-update",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Only staff and admins can bulk update
    if (userContext.role === "AGENT") {
      throw APIError.permissionDenied(
        "Only staff and admins can bulk update tickets"
      );
    }

    // Build update data
    const updateData: any = {};
    if (req.status !== undefined) updateData.status = req.status;
    if (req.urgency !== undefined) updateData.urgency = req.urgency;
    if (req.category !== undefined) updateData.category = req.category;
    if (req.dueDate !== undefined) updateData.dueDate = new Date(req.dueDate);

    // Add resolvedAt if status is being set to RESOLVED
    if (req.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    } else if (req.status) {
      updateData.resolvedAt = null;
    }

    updateData.updatedAt = new Date();

    // Validate at least one field to update
    if (Object.keys(updateData).length === 1) {
      // Only updatedAt
      throw APIError.invalidArgument("No fields to update");
    }

    // Note: Since we're using raw SQL, we need to manually build the scope filter
    // This is a simplified version that filters by ticketIds only
    // In production, you'd want to validate permissions per ticket

    const validIds: string[] = [];
    const failed: string[] = [];

    // Validate each ticket ID against user permissions
    for (const ticketId of req.ticketIds) {
      const canModify = await canModifyTicket(userContext, ticketId);
      if (canModify) {
        validIds.push(ticketId);
      } else {
        failed.push(ticketId);
      }
    }

    // Update only the valid tickets
    if (validIds.length === 0) {
      return { updated: 0, failed };
    }

    let updatedCount = 0;

    // Update each ticket and create history records
    for (const ticketId of validIds) {
      // Get old ticket data for history
      const oldTicket = await db.queryRow<{
        id: string;
        status: string | null;
        urgency: string | null;
        category: string | null;
        dueDate: Date | null;
      }>`
        SELECT id, status, urgency, category_id as category, due_date as "dueDate"
        FROM tickets
        WHERE id = ${ticketId}
      `;

      if (!oldTicket) continue;

      // Build update query
      const updates: string[] = [];
      const fields: { field: string; oldValue: string; newValue: string }[] = [];

      if (updateData.status !== undefined) {
        updates.push(`status = '${updateData.status}'`);
        fields.push({
          field: "status",
          oldValue: oldTicket.status?.toString() ?? "null",
          newValue: updateData.status,
        });
      }
      if (updateData.urgency !== undefined) {
        updates.push(`urgency = '${updateData.urgency}'`);
        fields.push({
          field: "urgency",
          oldValue: oldTicket.urgency?.toString() ?? "null",
          newValue: updateData.urgency,
        });
      }
      if (updateData.category !== undefined) {
        updates.push(`category_id = '${updateData.category}'`);
        fields.push({
          field: "category",
          oldValue: oldTicket.category?.toString() ?? "null",
          newValue: updateData.category,
        });
      }
      if (updateData.dueDate !== undefined) {
        fields.push({
          field: "dueDate",
          oldValue: oldTicket.dueDate?.toString() ?? "null",
          newValue: updateData.dueDate.toString(),
        });
      }
      if (updateData.resolvedAt !== undefined) {
        // Added by status change logic
      }

      // Execute update - build dynamic SQL
      if (updates.length > 0 || updateData.dueDate !== undefined || updateData.resolvedAt !== undefined) {
        // Build complete SET clause
        const allUpdates = [...updates];
        if (updateData.dueDate !== undefined) {
          allUpdates.push(`due_date = '${updateData.dueDate.toISOString()}'`);
        }
        if (updateData.resolvedAt !== undefined && updateData.resolvedAt !== null) {
          allUpdates.push(`resolved_at = '${updateData.resolvedAt.toISOString()}'`);
        } else if (updateData.resolvedAt === null) {
          allUpdates.push(`resolved_at = NULL`);
        }
        allUpdates.push(`updated_at = NOW()`);

        const updateSQL = `UPDATE tickets SET ${allUpdates.join(", ")} WHERE id = '${ticketId}'`;
        await db.exec([updateSQL] as any);

        updatedCount++;

        // Create history records for each changed field
        for (const field of fields) {
          await db.exec`
            INSERT INTO ticket_history (
              id, ticket_id, field, previous_value, new_value,
              changed_at, changed_by_id
            )
            VALUES (
              gen_random_uuid()::text, ${ticketId}, ${field.field},
              ${field.oldValue}, ${field.newValue},
              NOW(), ${userContext.userId}
            )
          `;
        }
      }
    }

    return {
      updated: updatedCount,
      failed,
    };
  }
);
