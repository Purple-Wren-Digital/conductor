import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
// import { getUserContext } from "../auth/user-context";
// import {
//   canAccessTicket,
//   canCreateInternalComments,
// } from "../auth/permissions";
import type { Todo } from "./types";

export interface ListTodosRequest {
  ticketId: string;
}

export interface ListTodosResponse {
  todos: Todo[];
}
export const list = api<ListTodosRequest, ListTodosResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:ticketId/todos",
    auth: false,
  },
  async (req) => {
    // const userContext = await getUserContext();
    // const hasAccess = await canAccessTicket(userContext, req.ticketId);
    // if (!hasAccess) {
    //   throw APIError.permissionDenied(
    //     "You do not have permission to view todos for this ticket"
    //   );
    // }

    const todos = await prisma.todo.findMany({
      where: { ticketId: req.ticketId },
    });

    return { todos: todos };
  }
);
