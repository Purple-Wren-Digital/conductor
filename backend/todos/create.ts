import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
// import { getUserContext } from "../auth/user-context";
// import {
//   canAccessTicket,
//   canCreateInternalComments,
// } from "../auth/permissions";
// import type { UsersToNotify } from "../notifications/types";
import type { Todo } from "./types";

// TODO: User Id/Name

export interface CreateTodoRequest {
  ticketId: string;
  title: string;
  completed?: boolean;
}

export interface CreateTodoResponse {
  todo: Todo;
  // TODO:  usersToNotify?: UsersToNotify[];
}
// , CreateTodoResponse
export const create = api<CreateTodoRequest, CreateTodoResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:ticketId/todos",
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

    const todo = await prisma.todo.create({
      data: {
        title: req.title,
        complete: req?.completed ?? false,
        ticketId: req.ticketId,
        createdById: "f06139b7-bee8-49aa-98de-86a5371118b9",
      },
    });

    return { todo };
  }
);
