import { api, APIError } from "encore.dev/api";
import { ticketRepository, todoRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canAccessTicket } from "../auth/permissions";

export interface DeleteTodoRequest {
  ticketId: string;
  todoId: string;
}

export interface DeleteTodoResponse {
  success: boolean;
}

export const deleteTask = api<DeleteTodoRequest, DeleteTodoResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/tickets/:ticketId/todos/:todoId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess) {
      throw APIError.permissionDenied(
        "You do not have permission to delete subtasks from this ticket"
      );
    }

    // Check that the todo belongs to this ticket
    const todo = await todoRepository.findById(req.todoId);

    if (!todo || todo.ticketId !== req.ticketId) {
      throw APIError.notFound("Subtask not found for the specified ticket");
    }

    await todoRepository.delete(todo.id);

    await ticketRepository.createHistory({
      ticketId: req.ticketId,
      action: "DELETE",
      field: "todos",
      previousValue: `"${todo.title}"`,
      changedById: userContext.userId,
    });

    return { success: true };
  }
);
