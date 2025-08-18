import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";

export interface BulkAssignRequest {
  ticketIds: string[];
  assigneeId: string;
}

export interface BulkAssignResponse {
  updated: number;
  failed: string[];
}

export const bulkAssign = api<BulkAssignRequest, BulkAssignResponse>(
  { expose: true, method: "POST", path: "/tickets/bulk-assign", auth: true },
  async (req) => {
    // TODO: Implement auth context
    const currentUserRole = "STAFF"; // Should come from auth context

    // Only staff and admins can bulk assign
    // @ts-ignore
    if (currentUserRole === "AGENT") {
      throw APIError.permissionDenied("Only staff and admins can bulk assign tickets");
    }

    // Validate assignee exists
    const assignee = await prisma.user.findUnique({
      where: { id: req.assigneeId },
    });

    if (!assignee) {
      throw APIError.notFound("Assignee not found");
    }

    // Validate assignee can be assigned tickets (not an agent)
    if (assignee.role === "AGENT") {
      throw APIError.unavailable("Cannot assign tickets to agents");
    }

    // First, verify which tickets exist
    const existingTickets = await prisma.ticket.findMany({
      where: {
        id: {
          in: req.ticketIds,
        },
      },
      select: {
        id: true,
      },
    });

    const existingIds = existingTickets.map(t => t.id);
    const failed = req.ticketIds.filter(id => !existingIds.includes(id));

    // Update only the existing tickets
    const result = await prisma.ticket.updateMany({
      where: {
        id: {
          in: existingIds,
        },
      },
      data: {
        assigneeId: req.assigneeId,
        status: "ASSIGNED",
        updatedAt: new Date(),
      },
    });

    return {
      updated: result.count,
      failed,
    };
  }
);