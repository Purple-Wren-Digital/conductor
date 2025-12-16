import { api, APIError } from "encore.dev/api";
import { ticketRepository, todoRepository } from "../ticket/db";
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
    const todo = await todoRepository.findById(req.todoId);

    if (!todo || todo.ticketId !== req.ticketId) {
      throw APIError.notFound("Subtask not found for the specified ticket");
    }

    if (req.title === undefined && req.completed === undefined) {
      return { success: true };
    }

    await todoRepository.update(req.todoId, {
      title: req.title,
      complete: req.completed,
      updatedById: userContext.userId,
    });

    let todoHistory = [];
    if (req.title && req.title !== todo.title) {
      todoHistory.push({
        field: "title",
        previousValue: `"${todo.title}"`,
        newValue: `"${req.title}"`,
      });
    }
    if (req.completed !== undefined && req.completed !== todo.complete) {
      const completedNewValue =
        req.completed === true ? "Complete" : "Incomplete";
      const completedPreviousValue =
        todo.complete === true ? "Complete" : "Incomplete";

      todoHistory.push({
        previousValue: `${completedPreviousValue}`,
        newValue: `${completedNewValue} - "${todo.title}" `,
      });
    }

    for (const history of todoHistory) {
      await ticketRepository.createHistory({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: `todos`,
        previousValue: history.previousValue,
        newValue: history.newValue,
        changedById: userContext.userId,
      });
    }

    return { success: true };
  }
);
