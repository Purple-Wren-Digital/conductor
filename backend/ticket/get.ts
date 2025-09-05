import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getAuthData } from "~encore/auth";

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
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: {
        creator: true,
        assignee: true,
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
      },
      assignee: ticket.assignee
        ? { ...ticket.assignee, name: ticket.assignee.name ?? "" }
        : null,
      commentCount: ticket._count.comments,
    };

    return {
      ticket: formattedTicket,
    };
  }
);
