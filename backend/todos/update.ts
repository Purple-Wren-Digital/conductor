import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
// import { getUserContext } from "../auth/user-context";
// import {
//   canAccessTicket,
//   canCreateInternalComments,
// } from "../auth/permissions";
// import type { UsersToNotify } from "../notifications/types";
import type { Todo } from "./types";

export interface UpdateTodoRequest {
  ticketId: string;
  todoId: string;
  title?: string;
  completed?: boolean;
}

export interface UpdateTodoResponse {
  success: boolean;
  // TODO:  usersToNotify?: UsersToNotify[];
}
// , CreateTodoResponse
export const update = api<UpdateTodoRequest, UpdateTodoResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/:ticketId/todos/:todoId",
    auth: false,
  },
  async (req) => {
    // const userContext = await getUserContext();

    // const hasAccess = await canAccessTicket(userContext, req.ticketId);
    // if (!hasAccess) {
    //   throw APIError.permissionDenied(
    //     "You do not have permission to add todos to this ticket"
    //   );
    // }
    let updateData: any = {
      updatedById: "f06139b7-bee8-49aa-98de-86a5371118b9",
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
