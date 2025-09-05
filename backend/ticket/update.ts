import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getAuthData } from "~encore/auth";

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
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }
    const userId = "u1"; // TODO: authData.userID;
    const updateData: any = {};

    if (req.title !== undefined) updateData.title = req.title;
    if (req.description !== undefined) updateData.description = req.description;
    if (req.urgency !== undefined) updateData.urgency = req.urgency;
    if (req.category !== undefined) updateData.category = req.category;
    if (req.dueDate !== undefined) updateData.dueDate = req.dueDate;

    if (req.status !== undefined) {
      updateData.status = req.status;
      if (req.status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    try {
      const ticket = await prisma.ticket.update({
        where: { id: req.ticketId },
        data: updateData,
        include: {
          creator: true,
          assignee: true,
        },
      });

      return { ticket } as UpdateTicketResponse;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("ticket not found");
      }
      throw error;
    }
  }
);
