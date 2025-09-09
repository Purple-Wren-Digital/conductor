import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket, getTicketScopeFilter } from "../auth/permissions";

export interface BulkAssignRequest {
  ticketIds: string[];
  assigneeId: string;
}

export interface BulkAssignResponse {
  updated: number;
  failed: string[];
}

export const bulkAssign = api<BulkAssignRequest, BulkAssignResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/bulk-assign",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Check if user can reassign tickets
    const canReassign = await canReassignTicket(userContext);
    if (!canReassign) {
      throw APIError.permissionDenied(
        "You do not have permission to bulk assign tickets"
      );
    }

    // Validate assignee exists
    const assignee = await prisma.user.findUnique({
      where: { id: req.assigneeId },
    });

    if (!assignee) {
      throw APIError.notFound("Assignee not found");
    }

    // For STAFF, ensure they can only assign to users in their market center
    if (userContext.role === "STAFF" && userContext.marketCenterId) {
      if (assignee.marketCenterId !== userContext.marketCenterId) {
        throw APIError.permissionDenied("You can only assign tickets to users in your team");
      }
    }

    // Get ticket scope filter
    const scopeFilter = getTicketScopeFilter(userContext);
    
    // First, verify which tickets exist and user has access to
    const existingTickets = await prisma.ticket.findMany({
      where: {
        AND: [
          {
            id: {
              in: req.ticketIds,
            },
          },
          scopeFilter,
        ],
      },
      select: {
        id: true,
      },
    });

    const existingIds = existingTickets.map((t) => t.id);
    const failed = req.ticketIds.filter((id) => !existingIds.includes(id));

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
