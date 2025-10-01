import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketHistory, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { canModifyTicket } from "../auth/permissions";
import { mapTicketHistorySnapshot, mapUser } from "../utils";

export interface UpdateTicketRequest {
  ticketId: string;
  title?: string;
  description?: string;
  status?: TicketStatus;
  urgency?: Urgency;
  category?: string;
  dueDate?: Date;
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
    });
    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }

    const updateData: any = {};
    let historyData: any = []; // TicketHistory[]

    if (req.title !== undefined && req.title !== oldTicket.title) {
      updateData.title = req.title;
      historyData.push({
        ticketId: req.ticketId,
        field: "title",
        previousValue: oldTicket.title,
        newValue: req.title,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (
      req.description !== undefined &&
      req.description !== oldTicket.description
    ) {
      updateData.description = req.description;
      historyData.push({
        ticketId: req.ticketId,
        field: "description",
        previousValue: oldTicket.description,
        newValue: req.description,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.urgency !== undefined && req.urgency !== oldTicket.urgency) {
      updateData.urgency = req.urgency;
      historyData.push({
        ticketId: req.ticketId,
        field: "urgency",
        previousValue: oldTicket.urgency,
        newValue: req.urgency,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.category !== undefined && req.category !== oldTicket.category) {
      updateData.category = req.category;
      historyData.push({
        ticketId: req.ticketId,
        field: "category",
        previousValue: oldTicket.category,
        newValue: req.category,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }
    if (req.dueDate !== undefined && req.dueDate !== oldTicket.dueDate) {
      updateData.dueDate = req.dueDate;
      historyData.push({
        ticketId: req.ticketId,
        field: "dueDate",
        previousValue: oldTicket.dueDate,
        newValue: req.dueDate,
        snapshot: oldTicket,
        changedAt: new Date(),
        changedById: userContext.userId,
      });
    }

    if (req.status !== undefined && req.status !== oldTicket.status) {
      updateData.status = req.status;
      historyData.push({
        ticketId: req.ticketId,
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
          data: historyData,
        }),
      ]);

      const safeTicket = {
        ...ticket,
        creator: mapUser(ticket.creator),
        assignee: mapUser(ticket.assignee),
        ticketHistory: mapTicketHistorySnapshot(ticket.ticketHistory),
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
