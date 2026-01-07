import { api, APIError } from "encore.dev/api";
import { ticketRepository, todoRepository, userRepository } from "./db";
import type { Ticket, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canCreateTicket } from "../auth/permissions";
import { UsersToNotify } from "../notifications/types";
import { checkCanCreateTicket } from "../auth/subscription-check";
import { slaService } from "../sla/sla.service";
// Subscription usage tracking disabled - unlimited tickets allowed
// import { trackUsage } from "../subscription/subscription";

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

      // Check subscription limits
      if (userContext.marketCenterId) {
        await checkCanCreateTicket(userContext.marketCenterId);
      }

      // Create ticket
      const ticket = await ticketRepository.create({
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
            : "UNASSIGNED",
        dueDate: req.dueDate,
      });

      // Set SLA due date based on urgency // TODO:
      await slaService.setTicketSla(ticket.id, req.urgency, ticket.createdAt);

      // If ticket is assigned on creation, record that as first response
      if (req?.assigneeId && req?.assigneeId !== "Unassigned") {
        await slaService.recordFirstResponse(ticket.id);
      }

      // Create history record
      await ticketRepository.createHistory({
        ticketId: ticket.id,
        action: "CREATE",
        field: "ticket",
        newValue: `"${ticket.title}"`,
        changedById: userContext.userId,
      });

      // Create todos if provided
      if (req.todos && req.todos.length > 0) {
        await todoRepository.createMany(
          req.todos.map((todo) => ({
            title: todo,
            ticketId: ticket.id,
            createdById: userContext.userId,
          }))
        );
        await ticketRepository.createHistory({
          ticketId: ticket.id,
          action: "CREATE",
          field: "todos",
          newValue: `${req.todos.length} todos created`,
          previousValue: `N/a`,
          changedById: userContext.userId,
        });
      }

      // Get creator and assignee details
      const creator = await userRepository.findById(userContext.userId);
      let assignee = null;
      if (ticket.assigneeId) {
        assignee = await userRepository.findById(ticket.assigneeId);
      }

      const usersToNotify: UsersToNotify[] = [
        {
          id: userContext?.userId,
          name: creator?.name ?? "No name",
          email: userContext.email,
          updateType: "created",
        },
      ];

      if (ticket.assigneeId && assignee) {
        usersToNotify.push({
          id: ticket.assigneeId,
          name: assignee.name ?? "No name",
          email: assignee.email,
          updateType: "added",
        });
      }

      // Get comment count
      const commentCount = 0; // New ticket has no comments

      return {
        ticket: {
          ...ticket,
          commentCount,
          categoryId: ticket.categoryId ?? null,
          creator: creator
            ? {
                ...creator,
                name: creator.name ?? "",
              }
            : undefined,
          assignee: assignee
            ? {
                ...assignee,
                name: assignee.name ?? "",
              }
            : null,
        },
        usersToNotify: usersToNotify,
      } as CreateTicketResponse;
    } catch {
      throw new Error("Failed to create ticket");
    }
  }
);
