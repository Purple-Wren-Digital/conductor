import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket } from "../auth/permissions";
import { Prisma } from "@prisma/client";

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

    if (userContext.role === "AGENT") {
      throw APIError.permissionDenied(
        "Only staff and admins can bulk update tickets"
      );
    }

    let canReassign = await canReassignTicket({
      userContext: userContext,
      newAssigneeId: req?.assigneeId,
    });

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
    let where: Prisma.TicketWhereInput = {};

    switch (userContext.role) {
      case "STAFF":
      case "STAFF_LEADER":
        if (!userContext.marketCenterId) {
          where = {
            OR: [
              { assigneeId: userContext.userId },
              { creatorId: userContext.userId },
            ],
          };
        } else {
          where = {
            AND: [{ id: { in: req.ticketIds } }],
            OR: [
              { category: { marketCenterId: userContext.marketCenterId } },
              { creator: { marketCenterId: userContext.marketCenterId } },
              { assignee: { marketCenterId: userContext.marketCenterId } },
            ],
          };
        }
        break;

      case "ADMIN":
        where.AND = [{ id: { in: req.ticketIds } }];
        break;

      default:
        throw APIError.permissionDenied("User not permitted to search tickets");
    }

    // First, verify which tickets exist and user has access to
    const tickets = await prisma.ticket.findMany({
      where: where,
      select: {
        id: true,
        assigneeId: true,
        status: true,
        creator: { select: { id: true, name: true, marketCenterId: true } },
        assignee: { select: { id: true, name: true, marketCenterId: true } },
        category: { select: { id: true, marketCenterId: true } },
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
