import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket } from "./types";

export interface AssignTicketRequest {
  id: string;
  assigneeId: string;
}

export interface AssignTicketResponse {
  ticket: Ticket;
}

// Assigns a ticket to a user
export const assign = api<AssignTicketRequest, AssignTicketResponse>(
  { expose: true, method: "POST", path: "/tickets/:id/assign" },
  async (req) => {
    // Check if assignee exists
    const assignee = await prisma.user.findUnique({
      where: { id: req.assigneeId },
    });

    if (!assignee) {
      throw APIError.notFound("assignee not found");
    }

    try {
      const ticket = await prisma.ticket.update({
        where: { id: req.id },
        data: { assigneeId: req.assigneeId },
        include: {
          creator: true,
          assignee: true,
        },
      });

      return { ticket } as AssignTicketResponse;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("ticket not found");
      }
      throw error;
    }
  }
);
