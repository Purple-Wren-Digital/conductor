import { api } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";
import { applyAutoAssignment } from "./auto-assignment";

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  dueDate?: Date;
  creatorId: string;
}

export interface CreateTicketResponse {
  ticket: Ticket;
}

// Creates a new ticket.
export const create = api<CreateTicketRequest, CreateTicketResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets",
    auth: false, // true
  },
  async (req) => {
    try {
      // TODO: AUTH
      // const mockUserId = "user_1";

      // Apply auto-assignment (checks category defaults first, then rules)
      const assigneeId = await applyAutoAssignment({
        category: req.category,
        urgency: req.urgency,
        title: req.title,
        description: req.description,
        creatorId: req.creatorId,
      });

      const ticket = await prisma.ticket.create({
        data: {
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          creatorId: req.creatorId,
          assigneeId: assigneeId,
          dueDate: req.dueDate,
        },
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

      return {
        ticket: {
          ...ticket,
          commentCount: ticket._count.comments,
        },
      } as CreateTicketResponse;
    } catch (error) {
      console.log("Failed to create ticket", error);
      throw new Error("Failed to create ticket");
    }
  }
);
