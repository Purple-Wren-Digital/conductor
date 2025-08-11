import { api } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency, User, UserRole } from "./types";

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  dueDate?: Date;
  assigneeId: string | null;
  creatorId: string;
}

export interface CreateTicketResponse {
  ticket: Ticket & {
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

// Creates a new ticket
export const create = api<CreateTicketRequest>( //, CreateTicketResponse
  { expose: true, method: "POST", path: "/tickets" },
  async (req) => {
    try {
      const ticket = await prisma.ticket.create({
        data: {
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          creatorId: "0605f83b-c4e1-4d6b-b96f-1893f0b60798", // req.userId
          dueDate: req.dueDate,
          assigneeId: req.assigneeId,
        },
        include: {
          creator: true,
          assignee: true,
        },
      });

      return { ticket };
    } catch (error) {
      console.error("Backend - Failed to created user", error);
    }
  }
);
