import { api, APIError } from "encore.dev/api";
import { ticketRepository, todoRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canAccessTicket } from "../auth/permissions";
import type { Todo } from "./types";

export interface CreateTodoRequest {
  ticketId: string;
  title: string;
  completed?: boolean;
}

export interface CreateTodoResponse {
  todo: Todo;
}

export const create = api<CreateTodoRequest, CreateTodoResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:ticketId/todos",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess || !userContext?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to add todos to this ticket"
      );
    }

    const todo = await todoRepository.create({
      title: req.title,
      complete: req.completed ?? false,
      ticketId: req.ticketId,
      createdById: userContext.userId,
    });

    await ticketRepository.createHistory({
      ticketId: req.ticketId,
      action: "ADD",
      field: "todos",
      newValue: `"${req.title}"`,
      previousValue: `N/a`,
      changedById: userContext.userId,
    });

    return { todo };
  }
);
