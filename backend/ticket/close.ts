import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import type { ActivityUpdates } from "@/emails/types";
import type { UsersToNotify } from "../notifications/types";
import { TicketStatus } from "./types";
import { canDeleteTicket } from "../auth/permissions";

export interface CloseTicketRequest {
  ticketId: string;
  status?: TicketStatus;
}

export interface CloseTicketResponse {
  usersToNotify: UsersToNotify[];
  changedDetails: ActivityUpdates;
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

    const oldTicket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: { assignee: true, creator: true, category: true },
    });

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

    const { ticket } = await prisma.$transaction(async (p) => {
      const survey = await p.survey.create({
        data: {
          ticketId: req.ticketId,
          surveyorId: oldTicket.creatorId,
          assigneeId: oldTicket.assigneeId || null,
          marketCenterId: marketCenterId,
          overallRating: null,
          assigneeRating: null,
          marketCenterRating: null,
          comment: null,
        },
      });

      const ticket = await p.ticket.update({
        where: { id: req.ticketId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          surveyId: survey.id,
        },
        include: { assignee: true, creator: true },
      });
      await p.ticketHistory.create({
        data: {
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket.status,
          newValue: "RESOLVED",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      });

      return { ticket };
    });

    const usersToNotify: UsersToNotify[] = [
      {
        id: ticket.creatorId,
        name: ticket.creator?.name || "",
        email: ticket.creator?.email || "",
        updateType: "unchanged",
      },
    ];

    if (
      ticket?.assignee &&
      ticket?.assigneeId &&
      ticket?.assigneeId !== ticket?.creatorId
    ) {
      usersToNotify.push({
        id: ticket.assigneeId,
        name: ticket.assignee?.name || "",
        email: ticket.assignee?.email || "",
        updateType: "unchanged",
      });
    }

    return {
      usersToNotify: usersToNotify,
      changedDetails: {
        label: "Status",
        originalValue: oldTicket.status,
        newValue: "RESOLVED",
      },
    };
  }
);
