import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket } from "./types";

export interface GetTicketRequest {
  ticketId: string;
  // creatorId: string;
}

export interface GetTicketResponse {
  ticket: Ticket;
}

export const get = api<GetTicketRequest, GetTicketResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:ticketId",
    auth: false, // true
  },
  async (req) => {
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

    console.log("Fetched ticket:", ticket);

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    return { 
      ticket: {
        ...ticket,
        commentCount: ticket._count.comments,
      }
    };
  }
);
