import { api, APIError } from "encore.dev/api";
import { todoRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canAccessTicket } from "../auth/permissions";

export interface UpdateTodoRequest {
  ticketId: string;
  todoId: string;
  title?: string;
  completed?: boolean;
}

export interface UpdateTodoResponse {
  success: boolean;
}

export const update = api<UpdateTodoRequest, UpdateTodoResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/:ticketId/todos/:todoId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess || !userContext?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to add subtasks to this ticket"
      );
    }

    await todoRepository.update(req.todoId, {
      title: req.title,
      complete: req.completed,
      updatedById: userContext.userId,
    });

    return { success: true };
  }
);
