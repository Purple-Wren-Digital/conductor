import { api, APIError } from "encore.dev/api";
import { db, ticketRepository, surveyRepository } from "./db";
import { getUserContext } from "../auth/user-context";
import type { UsersToNotify } from "../notifications/types";
import type { TicketStatus } from "./types";
import { canDeleteTicket } from "../auth/permissions";
import { slaService } from "../sla/sla.service";

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

    const oldTicket = await ticketRepository.findByIdWithRelations(
      req.ticketId
    );

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
    const canClose = await canDeleteTicket(userContext, req.ticketId);
    if (!canClose) {
      throw APIError.permissionDenied(
        "You do not have permission to close this ticket"
      );
    }

    if (!oldTicket?.creatorId) {
      throw APIError.invalidArgument("Ticket creator is required");
    }

    let surveyId: string | undefined = undefined;
    // Create survey using repository
    if (oldTicket?.creator?.role === "AGENT") {
      const survey = await surveyRepository.findOrCreate({
        ticketId: req.ticketId,
        surveyorId: oldTicket.creatorId,
        assigneeId: oldTicket.assigneeId || null,
        marketCenterId: marketCenterId,
      });

      if (!survey || !survey?.id) {
        throw APIError.internal("Failed to find or create ticket survey");
      }

      surveyId = survey.id;
    }

    // Update ticket status to resolved
    await ticketRepository.update(req.ticketId, {
      status: "RESOLVED",
      resolvedAt: new Date(),
      surveyId: surveyId,
    });

    await slaService.recordResolution(req.ticketId);

    // Create ticket history
    await ticketRepository.createHistory({
      ticketId: req.ticketId,
      action: "CLOSE",
      field: "status",
      previousValue: oldTicket.status,
      newValue: "RESOLVED",
      snapshot: oldTicket as any,
      changedById: userContext.userId,
    });

    // Get updated ticket
    const ticket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!ticket || !ticket?.id || !ticket?.creatorId) {
      throw APIError.internal("Failed to retrieve updated ticket");
    }

    return {
      usersToNotify: [
        {
          id: ticket.creatorId,
          name: ticket.creator?.name || "",
          email: ticket.creator?.email || "",
          updateType: surveyId ? "ticketSurvey" : "unchanged",
        },
        ticket?.assigneeId &&
        ticket?.assignee &&
        ticket.creatorId !== ticket?.assigneeId
          ? {
              id: ticket.assigneeId,
              name: ticket.assignee?.name || "",
              email: ticket.assignee?.email || "",
              updateType: "unchanged",
            }
          : undefined,
      ].filter(Boolean) as UsersToNotify[],
    };
  }
);
