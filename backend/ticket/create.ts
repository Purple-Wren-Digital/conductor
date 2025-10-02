import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";
import { applyAutoAssignment } from "./auto-assignment";
import { getUserContext } from "../auth/user-context";
import { canCreateTicket } from "../auth/permissions";
import { mapTicketHistorySnapshot } from "../utils";

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

      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            title: req.title,
            description: req.description,
            category: req.category,
            urgency: req.urgency,
            creatorId: userContext.userId,
            assigneeId,
            dueDate: req.dueDate,
          },
          include: {
            creator: true,
            assignee: true,
            _count: { select: { comments: true } },
          },
        });

        const history = await tx.ticketHistory.create({
          data: {
            ticketId: ticket.id,
            field: "created",
            previousValue: "N/A",
            newValue: "New Ticket",
            changedById: userContext.userId,
          },
        });

        return { ticket, history };
      });

      return {
        ticket: {
          ...result.ticket,
          commentCount: result.ticket._count.comments,
          ticketHistory: mapTicketHistorySnapshot([result.history]),
          creator: {
            ...result.ticket.creator,
            name: result.ticket.creator.name ?? "",
          },
          assignee: result.ticket.assignee
            ? {
                ...result.ticket.assignee,
                name: result.ticket.assignee.name ?? "",
              }
            : null,
        },
      } as CreateTicketResponse;
    } catch (error) {
      console.log("Failed to create ticket", error);
      throw new Error("Failed to create ticket");
    }
  }
);
