import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket, getTicketScopeFilter } from "../auth/permissions";
import { Ticket } from "./types";

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
    let newAssignee: any = null;
    if (req.assigneeId !== "Unassigned") {
      // Validate assignee exists
      const user = await prisma.user.findUnique({
        where: { id: req.assigneeId },
      });

      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    // For STAFF, ensure they can only assign to users in their market center
    if (
      userContext?.role === "STAFF" &&
      userContext?.marketCenterId &&
      newAssignee &&
      newAssignee?.marketCenterId &&
      newAssignee.marketCenterId !== userContext.marketCenterId
    ) {
      throw APIError.permissionDenied(
        "You can only assign tickets to users in your team"
      );
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
        assignee: true,
        status: true,
      },
    });

    const existingIds = tickets.map((t) => t.id);
    const failed = req.ticketIds.filter((id) => !existingIds.includes(id));

    if (existingIds.length === 0) {
      return { updated: 0, failed };
    }

    const ticketHistoryData: any[] = [];
    tickets.forEach((ticket) => {
      if (req.assigneeId === "Unassigned" && !!ticket?.assigneeId) {
        ticketHistoryData.push([
          {
            ticketId: ticket.id,
            action: "REMOVE",
            field: "assignment",
            previousValue: ticket?.assignee?.name ?? "Unassigned",
            newValue: "Unassigned",
            snapshot: ticket,
            changedAt: new Date(),
            changedById: userContext.userId,
          },
          {
            ticketId: ticket.id,
            action: "UPDATE",
            field: "status",
            previousValue: ticket?.status ?? "CREATED",
            newValue: "UNASSIGNED",
            snapshot: ticket,
            changedAt: new Date(),
            changedById: userContext.userId,
          },
        ]);
      }
      if (newAssignee && newAssignee?.id !== ticket?.assigneeId) {
        ticketHistoryData.push([
          {
            ticketId: ticket.id,
            action: "ADD",
            field: "assignment",
            previousValue: ticket?.assignee?.name ?? "Unassigned",
            newValue: newAssignee?.name ?? "Not found",
            changedById: userContext?.userId,
            changedAt: new Date(),
          },
          {
            ticketId: ticket.id,
            action: "UPDATE",
            field: "status",
            previousValue: ticket?.status ?? "CREATED",
            newValue: "ASSIGNED",
            snapshot: ticket,
            changedAt: new Date(),
            changedById: userContext.userId,
          },
        ]);
      }
    });

    // Transaction: Update only the existing tickets, then insert history
    const result = await prisma.$transaction(async (p) => {
      const update = await p.ticket.updateMany({
        where: { id: { in: existingIds } },
        data: {
          assigneeId: req.assigneeId !== "Unassigned" ? req.assigneeId : null,
          status: req.assigneeId === "Unassigned" ? "UNASSIGNED" : "ASSIGNED",
          updatedAt: new Date(),
        },
      });

      await p.ticketHistory.createMany({
        data: ticketHistoryData,
        skipDuplicates: true,
      });

      return update;
    });

    return {
      updated: result.count,
      failed,
    };
  }
);
