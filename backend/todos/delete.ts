import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
// import { getUserContext } from "../auth/user-context";
// import {
//   canAccessTicket,
//   canCreateInternalComments,
// } from "../auth/permissions";
// import type { UsersToNotify } from "../notifications/types";
import type { Todo } from "./types";

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
    auth: false,
  },
  async (req) => {
    // const userContext = await getUserContext();

    // const hasAccess = await canAccessTicket(userContext, req.ticketId);
    // if (!hasAccess) {
    //   throw APIError.permissionDenied(
    //     "You do not have permission to delete todos from this ticket"
    //   );
    // }
    const todo = await prisma.todo.findFirstOrThrow({
      where: { AND: [{ id: req.todoId }, { ticketId: req.ticketId }] },
    });

    if (!todo) {
      throw APIError.notFound("Subtask not found for the specified ticket");
    }

    const deleted = await prisma.todo.delete({
      where: { id: todo.id },
    });

    return { success: true };
  }
);
