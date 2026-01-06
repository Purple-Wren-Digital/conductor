import { api, APIError } from "encore.dev/api";
import { ticketRepository, userRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket } from "../auth/permissions";
import { UsersToNotify } from "../notifications/types";
import { slaService } from "../sla/sla.service";

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

    let usersToNotify: UsersToNotify[] = [];

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
      changedById: userContext.userId, // TODO: Replace with actual user ID from userContext
    });

    // Collect users to notify
    if (ticket?.creatorId) {
      const creator = await userRepository.findById(ticket.creatorId);
      if (creator) {
        usersToNotify.push({
          id: creator.id,
          name: creator?.name ? creator.name : creator.id,
          email: creator?.email,
          updateType: "unchanged",
        });
      }
    } else if (ticket?.assigneeId && ticket?.assigneeId !== ticket?.creatorId) {
      const assignee = await userRepository.findById(ticket.assigneeId);
      if (assignee) {
        usersToNotify.push({
          id: assignee.id,
          name: assignee?.name ? assignee.name : assignee.id,
          email: assignee?.email,
          updateType: "unchanged",
        });
      }
    } else {
      const currentUser = await userRepository.findById(userContext.userId);

      usersToNotify.push({
        id: userContext.userId,
        name: currentUser?.name ? currentUser.name : userContext.userId,
        email: currentUser?.email || "",
        updateType: "unchanged",
      });
    }

    return { usersToNotify };
  }
);
