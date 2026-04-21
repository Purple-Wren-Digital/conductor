import { api, APIError } from "encore.dev/api";
import { ticketRepository, userRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket } from "../auth/permissions";
import { UsersToNotify } from "../notifications/types";
import { slaService } from "../sla/sla.service";
import { activityTopic } from "../notifications/activity-topic";

export interface ReopenTicketRequest {
  ticketId: string;
}

export interface ReopenTicketResponse {
  usersToNotify: UsersToNotify[];
}

export const reopen = api<ReopenTicketRequest, ReopenTicketResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/reopen/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canModify = await canModifyTicket(userContext, req.ticketId);
    if (!canModify) {
      throw APIError.permissionDenied(
        "You do not have permission to modify this ticket"
      );
    }

    const ticket = await ticketRepository.findById(req.ticketId);
    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    if (ticket?.status !== "RESOLVED") {
      throw APIError.invalidArgument("Only closed tickets can be reopened");
    }

    await ticketRepository.update(ticket.id, {
      status: "IN_PROGRESS",
      resolvedAt: ticket.resolvedAt,
    });

    // Reset SLA timers
    await slaService.setTicketSla(
      req.ticketId,
      ticket.urgency,
      ticket.createdAt
    );

    await ticketRepository.createHistory({
      ticketId: ticket.id,
      action: "REOPEN",
      field: "ticket",
      previousValue: "RESOLVED",
      newValue: "IN_PROGRESS",
      snapshot: ticket,
      changedById: userContext.userId,
    });

    // Publish activity event for backend notification dispatch
    await activityTopic.publish({
      type: "ticket.reopened",
      ticketId: req.ticketId,
      ticketTitle: ticket.title || "",
      creatorId: ticket.creatorId ?? userContext.userId,
      assigneeId: ticket.assigneeId ?? undefined,
      editorId: userContext.userId,
    });

    return { usersToNotify: [] };
  }
);
