import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket } from "../auth/permissions";
import { mapHistorySnapshot, mapUser } from "../utils";

export interface UpdateTicketRequest {
  ticketId: string;
  title?: string;
  description?: string;
  status?: TicketStatus;
  urgency?: Urgency;
  categoryId?: string;
  dueDate?: Date;
  assigneeId?: string;
}

export interface UpdateTicketResponse {
  ticket: Ticket;
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

    const oldTicket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: { assignee: true, category: true },
    });
    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }

    const updateData: any = {};
    let ticketHistoryData: any = [];

    if (req.title && req.title !== oldTicket.title) {
      updateData.title = req.title;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "title",
        previousValue: oldTicket.title,
        newValue: req.title,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.description && req.description !== oldTicket.description) {
      updateData.description = req.description;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "description",
        previousValue: oldTicket.description,
        newValue: req.description,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.urgency && req.urgency !== oldTicket.urgency) {
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
    if (req.categoryId && req.categoryId !== oldTicket.categoryId) {
      const newCategory = await prisma.ticketCategory.findUnique({
        where: { id: req.categoryId },
      });
      updateData.categoryId = req.categoryId;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "category",
        previousValue: oldTicket?.category?.name ?? "None",
        newValue: newCategory?.name ?? "None",
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.dueDate) {
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

    if (req.status && req.status !== oldTicket.status) {
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

    if (req.assigneeId && req.assigneeId !== oldTicket.assigneeId) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: req.assigneeId },
      });

      updateData.assigneeId = req.assigneeId;

      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "ADD",
        field: "assignment",
        previousValue: oldTicket?.assignee?.name ?? "None",
        newValue: newAssignee?.name ?? "None",
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
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
          include: {
            creator: {
              include: {
                ticketHistory: true,
              },
            },
            assignee: {
              include: {
                ticketHistory: true,
              },
            },
            ticketHistory: true,
          },
        }),
        prisma.ticketHistory.createMany({
          data: ticketHistoryData,
        }),
      ]);

      const safeTicket = {
        ...ticket,
        creator: mapUser(ticket.creator),
        assignee: mapUser(ticket.assignee),
        ticketHistory: mapHistorySnapshot(ticket.ticketHistory),
      };

      return { ticket: safeTicket } as UpdateTicketResponse;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("ticket not found");
      }
      throw error;
    }
  }
);
