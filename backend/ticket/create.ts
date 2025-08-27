import { api } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";
import { applyAutoAssignment } from "./auto-assignment";
import { getAuthData } from "~encore/auth";

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
  { expose: true, method: "POST", path: "/tickets", auth: true },
  async (req) => {
    try {
      const auth = await getAuthData();
      console.log("create ticket auth", auth);
      if (!auth) {
        // || !auth?.userID) {
        throw new Error("Unauthorized");
      }

      // Apply auto-assignment (checks category defaults first, then rules)
      const assigneeId = await applyAutoAssignment({
        category: req.category,
        urgency: req.urgency,
        title: req.title,
        description: req.description,
        creatorId: auth.userID,
      });

      const ticket = await prisma.ticket.create({
        data: {
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          creatorId: auth.userID,
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
