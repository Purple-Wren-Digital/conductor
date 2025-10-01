import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canAccessTicket } from "../auth/permissions";
import { mapTicketHistorySnapshot } from "../utils";

export interface GetTicketRequest {
  ticketId: string;
}

export interface GetTicketResponse {
  ticket: Ticket;
}

export const get = api<GetTicketRequest, GetTicketResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess) {
      throw APIError.permissionDenied(
        "You do not have permission to view this ticket"
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: {
        creator: {
          include: {
            ticketHistory: true,
          },
        },
        assignee: {
          include: {
            ticketHistory: true,
          },
        },
        ticketHistory: {
          include: { changedBy: true },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }
    const formattedTicket = {
      ...ticket,
      title: ticket.title ?? "",
      description: ticket.description ?? "",
      status: ticket.status ?? ("ASSIGNED" as TicketStatus),
      urgency: ticket.urgency ?? ("MEDIUM" as Urgency),
      category: ticket.category ?? "",
      creator: {
        ...ticket.creator,
        name: ticket.creator.name ?? "",
        ticketHistory: mapTicketHistorySnapshot(ticket.creator?.ticketHistory),
      },
      assignee: ticket.assignee
        ? {
            ...ticket.assignee,
            name: ticket.assignee.name ?? "",
            ticketHistory: mapTicketHistorySnapshot(
              ticket.assignee.ticketHistory
            ),
          }
        : null,
      ticketHistory: mapTicketHistorySnapshot(ticket.ticketHistory),
      commentCount: ticket._count.comments,
    };

    return {
      ticket: formattedTicket,
    };
  }
);
