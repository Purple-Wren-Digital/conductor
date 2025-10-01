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
        throw APIError.permissionDenied(
          "You can only assign tickets to users in your team"
        );
      }
    }
    // Get ticket scope filter
    const scopeFilter = await getTicketScopeFilter(userContext);

    // First, verify which tickets exist and user has access to
    const tickets = await prisma.ticket.findMany({
      where: {
        AND: [
          {
            id: { in: req.ticketIds },
          },
          scopeFilter,
        ],
      },
      select: {
        id: true,
        assigneeId: true,
      },
    });

    const existingIds = tickets.map((t) => t.id);
    const failed = req.ticketIds.filter((id) => !existingIds.includes(id));

    if (existingIds.length === 0) {
      return { updated: 0, failed };
    }

    // Transaction: Update only the existing tickets, then insert history
    const result = await prisma.$transaction(async (tx) => {
      const update = await tx.ticket.updateMany({
        where: { id: { in: existingIds } },
        data: {
          assigneeId: req.assigneeId,
          status: "ASSIGNED",
          updatedAt: new Date(),
        },
      });

      // Build history records
      const historyRecords = tickets.map((ticket) => ({
        ticketId: ticket.id,
        changedById: userContext?.userId,
        field: "assigneeId",
        previousValue: ticket.assigneeId ?? "",
        newValue: req.assigneeId,
        createdAt: new Date(),
      }));

      await tx.ticketHistory.createMany({
        data: historyRecords,
      });

      return update;
    });

    return {
      updated: result.count,
      failed,
    };
  }
);
