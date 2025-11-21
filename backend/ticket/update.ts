import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket, canReassignTicket } from "../auth/permissions";
import { ActivityUpdates } from "@/emails/types";
import { TicketHistory } from "@prisma/client";
import { UsersToNotify } from "../notifications/types";

export interface UpdateTicketRequest {
  ticketId: string;
  title?: string;
  description?: string;
  status?: TicketStatus;
  urgency?: Urgency;
  categoryId?: string;
  dueDate?: Date;
  assigneeId?: string;
  todos?: string[];
}

export interface UpdateTicketResponse {
  ticket: Ticket;
  usersToNotify: UsersToNotify[];
  changedDetails: ActivityUpdates[];
}

export const update = api<UpdateTicketRequest, UpdateTicketResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/update/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canModify = await canModifyTicket(userContext, req.ticketId);
    if (!canModify) {
      throw APIError.permissionDenied(
        "You do not have permission to modify this ticket"
      );
    }

    const canAssign = await canReassignTicket({
      userContext: userContext,
      newAssigneeId: req?.assigneeId,
    });

    const oldTicket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: { creator: true, assignee: true, category: true },
    });
    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }

    if (oldTicket && oldTicket.status === "RESOLVED") {
      throw APIError.invalidArgument(
        "Resolved tickets cannot be modified further"
      );
    }

    const unassignTicket = req.assigneeId === "Unassigned";

    // Check if assignee exists and is in the same market center for STAFF users
    let newAssignee = null;
    if (canAssign && req.assigneeId && !unassignTicket) {
      const user = await prisma.user.findUnique({
        where: { id: req.assigneeId },
      });
      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      req.assigneeId &&
      !canAssign
    ) {
      throw APIError.permissionDenied(
        "You can only assign tickets to users in your team"
      );
    }

    const updateData: any = {};
    let ticketHistoryData: any = [];
    let usersToNotify: UsersToNotify[] = [];

    if (req?.title && req.title !== oldTicket.title) {
      updateData.title = req.title;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "title",
        previousValue: oldTicket?.title ?? null,
        newValue: req?.title ?? null,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req?.description && req.description !== oldTicket.description) {
      updateData.description = req.description;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "description",
        previousValue: oldTicket?.description ?? null,
        newValue: req?.description ?? null,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req?.urgency && req.urgency !== oldTicket.urgency) {
      updateData.urgency = req.urgency;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "urgency",
        previousValue: oldTicket.urgency,
        newValue: req.urgency,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req?.categoryId && req.categoryId !== oldTicket.categoryId) {
      const newCategory = await prisma.ticketCategory.findUnique({
        where: { id: req.categoryId },
      });
      updateData.categoryId = req.categoryId;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "category",
        previousValue: oldTicket?.category?.name ?? null,
        newValue: newCategory?.name ?? null,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req?.dueDate) {
      const oldTime = oldTicket.dueDate ? oldTicket.dueDate.getTime() : null;
      const newTime = req.dueDate ? req.dueDate.getTime() : null;
      if (oldTime !== newTime) {
        updateData.dueDate = req.dueDate;
        ticketHistoryData.push({
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "dueDate",
          previousValue: oldTicket.dueDate
            ? oldTicket.dueDate.toISOString()
            : null,
          newValue: req.dueDate ? req.dueDate.toISOString() : null,

          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        });
      }
    }

    if (
      req?.status &&
      req.status !== oldTicket.status &&
      req.assigneeId !== "Unassigned"
    ) {
      updateData.status = req.status;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "status",
        previousValue: oldTicket.status,
        newValue: req.status,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
      if (req.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }

    // ASSIGNMENT CHANGES
    const reassignTicket =
      newAssignee && newAssignee?.id !== oldTicket?.assigneeId;
    const previousAssignee = oldTicket?.assignee ?? null;
    const previousAssigneeName =
      previousAssignee && previousAssignee?.name
        ? previousAssignee.name
        : previousAssignee && !previousAssignee?.name
          ? "No name listed"
          : "Unassigned";

    if (canAssign && unassignTicket && !!oldTicket?.assigneeId) {
      updateData.assigneeId = null;
      updateData.status = "UNASSIGNED";
      usersToNotify.push({
        id: oldTicket.assigneeId,
        name: previousAssigneeName,
        email: previousAssignee?.email ?? "N/a",
        updateType: "removed",
      });

      ticketHistoryData.push(
        {
          ticketId: req.ticketId,
          action: "REMOVE",
          field: "assignment",
          previousValue: previousAssigneeName,
          newValue: "Unassigned",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
        {
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket?.status ?? null,
          newValue: "UNASSIGNED",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        }
      );
    }
    if (canAssign && reassignTicket && !!newAssignee?.id) {
      updateData.assigneeId = req.assigneeId;
      updateData.status = "ASSIGNED";
      usersToNotify.push(
        {
          id: previousAssignee?.id!!,
          name: previousAssigneeName,
          email: previousAssignee?.email ?? "N/a",
          updateType: "removed",
        },
        {
          id: newAssignee?.id,
          name: newAssignee?.name ?? "No name listed",
          email: newAssignee?.email ?? "N/a",
          updateType: "added",
        },
        {
          id: newAssignee?.id!!,
          name: newAssignee?.name ?? "No name listed",
          email: newAssignee?.email ?? "N/a",
          updateType: "unchanged",
        }
      );

      ticketHistoryData.push(
        {
          ticketId: req.ticketId,
          action: "ADD",
          field: "assignment",
          previousValue: previousAssigneeName,
          newValue: newAssignee?.name ?? "No name listed",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
        {
          ticketId: oldTicket.id,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket?.status ?? "CREATED",
          newValue: "ASSIGNED",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        }
      );
    } else if (
      canAssign &&
      !unassignTicket &&
      !reassignTicket &&
      !!oldTicket?.assigneeId
    ) {
      usersToNotify.push({
        id: oldTicket?.assigneeId,
        name: oldTicket?.assignee?.name ?? "No name listed",
        email: oldTicket?.assignee?.email ?? "N/a",
        updateType: "unchanged",
      });
    } else {
      usersToNotify.push({
        id: oldTicket?.creatorId,
        name: oldTicket?.creator?.name ?? "No name listed",
        email: oldTicket?.creator?.email ?? "N/a",
        updateType: "unchanged",
      });
    }

    if (Object.keys(updateData).length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    try {
      const [ticket] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id: req.ticketId },
          data: updateData,
        }),
        prisma.ticketHistory.createMany({
          data: ticketHistoryData,
        }),
      ]);
      if (req.todos && req.todos.length > 0) {
        const subtasks = await prisma.todo.createMany({
          data: req.todos?.map((todo) => ({
            title: todo,
            ticketId: ticket.id,
            complete: false,
            createdById: userContext.userId,
            updatedById: userContext.userId,
            createdAt: ticket.updatedAt,
            updatedAt: ticket.updatedAt,
          })),
        });
      }

      const formattedTicket: Ticket = {
        ...ticket,
        status: ticket?.status
          ? ticket.status
          : oldTicket?.status
            ? oldTicket.status
            : "UNASSIGNED",
        urgency: ticket?.urgency
          ? ticket.urgency
          : oldTicket?.urgency
            ? oldTicket.urgency
            : "MEDIUM",
      };

      const allChanges: ActivityUpdates[] = ticketHistoryData.map(
        (history: TicketHistory) => {
          return {
            label: history.field,
            originalValue: history.previousValue,
            newValue: history.newValue,
          };
        }
      );

      return {
        ticket: formattedTicket,
        usersToNotify: usersToNotify,
        changedDetails: allChanges,
      };
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("Ticket not found");
      }
      throw error;
    }
  }
);
