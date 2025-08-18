import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { TicketStatus, Urgency } from "./types";

export interface BulkUpdateRequest {
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
  { expose: true, method: "PUT", path: "/tickets/bulk-update", auth: true },
  async (req) => {
    // TODO: Implement auth context
    const currentUserId = "user_1";
    const currentUserRole = "STAFF"; // Should come from auth context

    // Only staff and admins can bulk update
    // @ts-ignore
    if (currentUserRole === "AGENT") {
      throw APIError.permissionDenied("Only staff and admins can bulk update tickets");
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
    if (Object.keys(updateData).length === 1) { // Only updatedAt
      throw APIError.invalidArgument("No fields to update");
    }

    // First, find which tickets are valid for update
    const whereClause: any = {
      id: {
        in: req.ticketIds,
      },
    };

    // Staff can only update tickets assigned to them
    if (currentUserRole === "STAFF") {
      whereClause.assigneeId = currentUserId;
    }

    // Get the tickets that can be updated
    const validTickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
      },
    });

    const validIds = validTickets.map(t => t.id);
    const failed = req.ticketIds.filter(id => !validIds.includes(id));

    // Update only the valid tickets
    const result = await prisma.ticket.updateMany({
      where: {
        id: {
          in: validIds,
        },
      },
      data: updateData,
    });

    return {
      updated: result.count,
      failed,
    };
  }
);