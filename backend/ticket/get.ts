import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, UserRole } from "./types";

export interface GetTicketRequest {
  ticketId: string;
}

export interface GetTicketResponse {
  ticket:
    | Ticket & {
        creator: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          name: string;
          email: string;
          role: UserRole;
        } | null;
        assignee: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          name: string;
          email: string;
          role: UserRole;
        } | null;
      };
}

export const get = api<GetTicketRequest>( 
  { expose: true, method: "GET", path: "/tickets/:ticketId", auth: false },
  async (req) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: {
        creator: true,
        assignee: true,
      },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    return { ticket }; 
  }
);
