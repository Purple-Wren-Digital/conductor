import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import type { ActivityUpdates } from "@/emails/types";
import type { UsersToNotify } from "../notifications/types";
import { TicketStatus } from "./types";

export interface CloseTicketRequest {
  ticketId: string;
  status?: TicketStatus;
}

export interface CloseTicketResponse {
  usersToNotify: UsersToNotify[];
  changedDetails: ActivityUpdates;
}

export const closeTicket = api<CloseTicketRequest, CloseTicketResponse>(
  {
    expose: true,
    method: "PATCH",
    path: "/tickets/close/:ticketId",
    auth: true,
  },
  async (req) => {
    console.log("Close ticket request:", req);
    const userContext = await getUserContext();
    if (!req.ticketId) {
      throw APIError.invalidArgument("Ticket ID is required");
    }

    if (!req.status) {
      throw APIError.invalidArgument("Status is required");
    }

    const oldTicket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: { assignee: true, creator: true },
    });

    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }
    if (oldTicket && oldTicket.status === "RESOLVED") {
      throw APIError.invalidArgument("Resolved tickets cannot be updated");
    }
    let canDelete = false;
    if (userContext.role === "ADMIN") {
      canDelete = true;
    }

    if (userContext.role === "STAFF" && userContext?.marketCenterId) {
      canDelete =
        userContext?.marketCenterId === oldTicket?.creator?.marketCenterId ||
        userContext?.marketCenterId === oldTicket?.assignee?.marketCenterId;
    }

    if (userContext.role === "STAFF" && !userContext?.marketCenterId) {
      canDelete =
        oldTicket.creatorId === userContext.userId ||
        oldTicket.assigneeId === userContext.userId;
    }

    if (userContext.role === "AGENT") {
      canDelete = oldTicket.creatorId === userContext.userId;
    }

    const [ticket] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: req.ticketId },
        data: { status: "RESOLVED", resolvedAt: new Date() },
        include: { assignee: true, creator: true },
      }),
      prisma.ticketHistory.create({
        data: {
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket.status,
          newValue: "RESOLVED",
          snapshot: oldTicket,
          changedAt: new Date(),
          changedById: userContext.userId,
        },
      }),
    ]);

    const usersToNotify: UsersToNotify[] = [
      {
        id: ticket.creatorId,
        name: ticket.creator?.name || "",
        email: ticket.creator?.email || "",
        updateType: "unchanged",
      },
    ];

    if (
      ticket?.assignee &&
      ticket?.assigneeId &&
      ticket?.assigneeId !== ticket?.creatorId
    ) {
      usersToNotify.push({
        id: ticket.assigneeId,
        name: ticket.assignee?.name || "",
        email: ticket.assignee?.email || "",
        updateType: "unchanged",
      });
    }

    return {
      usersToNotify: usersToNotify,
      changedDetails: {
        label: "Status",
        originalValue: oldTicket.status,
        newValue: "RESOLVED",
      },
    };
  }
);
