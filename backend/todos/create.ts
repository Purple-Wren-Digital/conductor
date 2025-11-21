import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { canAccessTicket } from "../auth/permissions";
// import type { UsersToNotify } from "../notifications/types";
import type { Todo } from "./types";

export interface CreateTodoRequest {
  ticketId: string;
  title: string;
  completed?: boolean;
}

export interface CreateTodoResponse {
  todo: Todo;
  // TODO:  usersToNotify?: UsersToNotify[];
}

export const create = api<CreateTodoRequest, CreateTodoResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:ticketId/todos",
    auth: true,
  },
  async (req) => {
    console.log("Creating todo with request:", req);
    const userContext = await getUserContext();

    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess || !userContext?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to add todos to this ticket"
      );
    }

    const todo = await prisma.todo.create({
      data: {
        title: req.title,
        complete: req.completed ? true : false,
        ticketId: req.ticketId,
        createdById: userContext.userId,
        updatedById: userContext.userId,
      },
    });

    return { todo };
  }
);
