import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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
    let updateData: any = {
      updatedById: userContext.userId,
      updatedAt: new Date(),
    };
    if (req.title !== undefined) {
      updateData.title = req.title;
    }
    if (req.completed !== undefined) {
      updateData.complete = req.completed;
    }

    await prisma.todo.update({
      where: { id: req.todoId },
      data: updateData,
    });

    return { success: true };
  }
);
