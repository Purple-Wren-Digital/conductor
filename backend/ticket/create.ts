import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";
import { applyAutoAssignment } from "./auto-assignment";
import { getUserContext } from "../auth/user-context";
import { canCreateTicket } from "../auth/permissions";

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
  {
    expose: true,
    method: "POST",
    path: "/tickets",
    auth: true,
  },
  async (req) => {
    try {
      const userContext = await getUserContext();

      const canCreate = await canCreateTicket(userContext);

      if (!canCreate) {
        throw APIError.permissionDenied(
          "You do not have permission to create tickets"
        );
      }

      // Apply auto-assignment (checks category defaults first, then rules)

      const assigneeId = await applyAutoAssignment({
        category: req.category,
        urgency: req.urgency,
        title: req.title,
        description: req.description,
        creatorId: userContext.userId, // Change local-dev-user in userContext for different roles
      });

      const ticket = await prisma.ticket.create({
        data: {
          title: req.title,
          description: req.description,
          category: req.category,
          urgency: req.urgency,
          creatorId: userContext.userId,
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
