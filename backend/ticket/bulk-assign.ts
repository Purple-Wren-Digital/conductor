import { api, APIError } from "encore.dev/api";
import { ticketRepository, userRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket } from "../auth/permissions";

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
      const user = await userRepository.findById(req.assigneeId);

      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    // Get tickets based on user role and access
    const { tickets } = await ticketRepository.search({
      userId: userContext.userId,
      userRole: userContext.role,
      userMarketCenterId: userContext.marketCenterId,
      status: [], // Empty to include all statuses
      limit: req.ticketIds.length,
    });

    // Filter to only requested ticket IDs that user has access to
    const accessibleTickets = tickets.filter((t) => req.ticketIds.includes(t.id));
    const existingIds = accessibleTickets.map((t) => t.id);
    const failed = req.ticketIds.filter((id) => !existingIds.includes(id));

    if (existingIds.length === 0) {
      return { updated: 0, failed };
    }

    const ticketHistoryData: Array<{
      ticketId: string;
      action: string;
      field: string | null;
      previousValue: string | null;
      newValue: string | null;
      snapshot: any;
      changedById: string;
    }> = [];

    accessibleTickets.forEach((ticket) => {
      if (req.assigneeId === "Unassigned" && !!ticket?.assigneeId) {
        ticketHistoryData.push(
          {
            ticketId: ticket.id,
            action: "REMOVE",
            field: "assignment",
            previousValue: ticket?.assignee?.name ?? "Unassigned",
            newValue: "Unassigned",
            snapshot: ticket,
            changedById: userContext.userId,
          },
          {
            ticketId: ticket.id,
            action: "UPDATE",
            field: "status",
            previousValue: ticket?.status ?? "CREATED",
            newValue: "UNASSIGNED",
            snapshot: ticket,
            changedById: userContext.userId,
          }
        );
      }
      if (newAssignee && newAssignee?.id !== ticket?.assigneeId) {
        ticketHistoryData.push(
          {
            ticketId: ticket.id,
            action: "ADD",
            field: "assignment",
            previousValue: ticket?.assignee?.name ?? "Unassigned",
            newValue: newAssignee?.name ?? "Not found",
            snapshot: ticket,
            changedById: userContext?.userId,
          },
          {
            ticketId: ticket.id,
            action: "UPDATE",
            field: "status",
            previousValue: ticket?.status ?? "CREATED",
            newValue: "ASSIGNED",
            snapshot: ticket,
            changedById: userContext.userId,
          }
        );
      }
    });

    // Update tickets
    const updateCount = await ticketRepository.updateMany(existingIds, {
      assigneeId: req.assigneeId !== "Unassigned" ? req.assigneeId : null,
      status: req.assigneeId === "Unassigned" ? "UNASSIGNED" : "ASSIGNED",
    });

    // Create history records
    await ticketRepository.createManyHistory(ticketHistoryData);

    return {
      updated: updateCount,
      failed,
    };
  }
);
