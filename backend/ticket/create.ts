import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, Urgency } from "./types";
// import { applyAutoAssignment } from "./auto-assignment";
import { getUserContext } from "../auth/user-context";
import { canCreateTicket } from "../auth/permissions";
import { mapHistorySnapshot } from "../utils";
import { UsersToNotify } from "../notifications/types";
import { create as createNotification } from "../notifications/create";

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  urgency: Urgency;
  dueDate?: Date;
  assigneeId?: string;
  todos?: string[];
}

export interface CreateTicketResponse {
  ticket: Ticket;
  usersToNotify: UsersToNotify[];
}

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

      // const assigneeId = await applyAutoAssignment({
      //   category: req.categoryId,
      //   urgency: req.urgency,
      //   title: req.title,
      //   description: req.description,
      //   creatorId: userContext.userId, // Change local-dev-user in userContext for different roles
      //   // assigneeId: req?.assigneeId,
      // });

      const result = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
          data: {
            title: req.title,
            description: req.description,
            categoryId: req.categoryId ?? null,
            urgency: req.urgency,
            creatorId: userContext.userId,
            assigneeId:
              req?.assigneeId && req?.assigneeId !== "Unassigned"
                ? req.assigneeId
                : null,
            status:
              req?.assigneeId && req?.assigneeId !== "Unassigned"
                ? "ASSIGNED"
                : "CREATED",
            dueDate: req.dueDate,
          },
          include: {
            creator: true,
            assignee: true,
            _count: { select: { comments: true } },
          },
        });

        if (req.todos && req.todos.length > 0) {
          const subtasks = await tx.todo.createMany({
            data: req.todos?.map((todo) => ({
              title: todo,
              ticketId: ticket.id,
              complete: false,
              createdById: userContext.userId,
              createdAt: ticket.createdAt,
            })),
          });
        }

        const history = await tx.ticketHistory.create({
          data: {
            ticketId: ticket.id,
            action: "CREATE",
            field: "ticket",
            changedById: userContext.userId,
          },
        });

        return { ticket, history };
      });

      const usersToNotify: UsersToNotify[] = [
        {
          id: userContext?.userId,
          name: result.ticket.creator.name ?? "No name",
          email: userContext.email,
          updateType: "created",
        },
      ];
      if (result?.ticket?.assigneeId && result?.ticket?.assignee) {
        usersToNotify.push({
          id: result.ticket.assigneeId,
          name: result.ticket.assignee.name ?? "No name",
          email: result.ticket.assignee.email,
          updateType: "added",
        });
      }

      return {
        ticket: {
          ...result.ticket,
          commentCount: result.ticket._count.comments,
          ticketHistory: mapHistorySnapshot([result.history]),
          categoryId: result?.ticket?.categoryId ?? null,
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
        usersToNotify: usersToNotify,
      } as CreateTicketResponse;
    } catch (error) {
      console.error("Failed to create ticket", error);
      throw new Error("Failed to create ticket");
    }
  }
);
