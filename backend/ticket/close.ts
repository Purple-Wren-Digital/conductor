import { api, APIError } from "encore.dev/api";
import { db, ticketRepository, surveyRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import type { UsersToNotify } from "../notifications/types";
import type { TicketStatus } from "./types";
import { canDeleteTicket } from "../auth/permissions";

export interface CloseTicketRequest {
  ticketId: string;
  status?: TicketStatus;
}

export interface CloseTicketResponse {
  usersToNotify: UsersToNotify[];
}

export const closeTicket = api<CloseTicketRequest, CloseTicketResponse>(
  {
    expose: true,
    method: "PATCH",
    path: "/tickets/close/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (!req.ticketId) {
      throw APIError.invalidArgument("Ticket ID is required");
    }

    if (!req.status || req?.status !== "RESOLVED") {
      throw APIError.invalidArgument("Status is required");
    }

    const oldTicket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }
    if (oldTicket && oldTicket.status === "RESOLVED") {
      throw APIError.invalidArgument("Resolved tickets cannot be updated");
    }
    const marketCenterId =
      oldTicket.assignee?.marketCenterId ||
      oldTicket.creator?.marketCenterId ||
      oldTicket.category?.marketCenterId ||
      null;

    if (!marketCenterId) {
      throw APIError.notFound("Market Center not found");
    }
    let canClose = await canDeleteTicket(userContext, req.ticketId);
    if (!canClose) {
      throw APIError.permissionDenied(
        "You do not have permission to close this ticket"
      );
    }

    // Create survey using repository
    const survey = await surveyRepository.create({
      ticketId: req.ticketId,
      surveyorId: oldTicket.creatorId,
      assigneeId: oldTicket.assigneeId || null,
      marketCenterId: marketCenterId,
      overallRating: null,
      assigneeRating: null,
      marketCenterRating: null,
      comment: null,
      completed: false,
    });

    if (!survey) {
      throw APIError.internal("Failed to create survey");
    }

    // Update ticket status to resolved
    await ticketRepository.update(req.ticketId, {
      status: "RESOLVED",
      resolvedAt: new Date(),
      surveyId: survey.id,
    });

    // Create ticket history
    await ticketRepository.createHistory({
      ticketId: req.ticketId,
      action: "UPDATE",
      field: "status",
      previousValue: oldTicket.status,
      newValue: "RESOLVED",
      snapshot: oldTicket as any,
      changedById: userContext.userId,
    });

    // Get updated ticket
    const ticket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!ticket) {
      throw APIError.internal("Failed to retrieve updated ticket");
    }

    const usersToNotify: UsersToNotify[] = [
      {
        id: ticket.creatorId,
        name: ticket.creator?.name || "",
        email: ticket.creator?.email || "",
        updateType: "ticketSurvey",
      },
    ];

    if (
      ticket?.assigneeId &&
      ticket.creatorId !== ticket?.assigneeId &&
      ticket?.assignee
    ) {
      usersToNotify.push({
        id: ticket.assigneeId,
        name: ticket.assignee?.name || "",
        email: ticket.assignee?.email || "",
        updateType: "unchanged",
      });
    }

    return { usersToNotify: usersToNotify };
  }
);
