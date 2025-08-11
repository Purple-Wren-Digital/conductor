import { api } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  dueDate?: Date;
}

export interface CreateTicketResponse {
  ticket: Ticket;
}

// Creates a new ticket.
export const create = api<CreateTicketRequest, CreateTicketResponse>(
  { expose: true, method: "POST", path: "/tickets" },
  async (req) => {
    try {
      // For now, we'll use a mock user ID. In a real app, this would come from auth
      const mockUserId = "user_1";

      const ticket = await prisma.ticket.create({
        data: {
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          creatorId: mockUserId,
          dueDate: req.dueDate,
        },
        include: {
          creator: true,
          assignee: true,
        },
      });

      return { ticket } as CreateTicketResponse;
    } catch (error) {
      console.log("Failed to create ticket", error);
      throw new Error("Failed to create ticket");
    }
  }
);
