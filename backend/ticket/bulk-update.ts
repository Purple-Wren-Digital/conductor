import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
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

    // Get ticket scope filter
    const scopeFilter = await getTicketScopeFilter(userContext);
    
    // First, find which tickets are valid for update
    const whereClause: any = {
      AND: [
        {
          id: {
            in: req.ticketIds,
          },
        },
        scopeFilter,
      ],
    };

    // Get the tickets that can be updated
    const validTickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
      },
    });

    const validIds = validTickets.map((t) => t.id);
    const failed = req.ticketIds.filter((id) => !validIds.includes(id));

    // Update only the valid tickets
    if (validIds.length === 0) {
      return { updated: 0, failed };
    }

    const results: number = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;

      for (const oldTicket of validTickets) {
        const updated = await tx.ticket.update({
          where: { id: oldTicket.id },
          data: updateData,
        });

        updatedCount++;

        // Build history entries for each changed field
        const histories = Object.keys(updateData).map((field) => ({
          ticketId: oldTicket.id,
          field,
          previousValue: (oldTicket as any)[field]?.toString() ?? "null",
          newValue: (updated as any)[field]?.toString() ?? "null",
          changedAt: new Date(),
          changedById: userContext.userId,
        }));

        await tx.ticketHistory.createMany({
          data: histories,
        });
      }

      return updatedCount;
    });

    return {
      updated: results,
      failed,
    };
  }
);
