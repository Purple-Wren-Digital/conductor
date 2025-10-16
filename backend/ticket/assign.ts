import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket } from "./types";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket } from "../auth/permissions";

export interface AssignTicketRequest {
  id: string;
  assigneeId: string;
}

export interface AssignTicketResponse {
  ticket: Ticket;
}

// Assigns a ticket to a user
export const assign = api<AssignTicketRequest, AssignTicketResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:id/assign",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canReassign = await canReassignTicket(userContext);
    if (!canReassign) {
      throw APIError.permissionDenied(
        "You do not have permission to reassign tickets"
      );
    }

    const unassignTicket = req.assigneeId === "Unassigned";

    // Check if assignee exists and is in the same market center for STAFF users
    let newAssignee = null;
    if (!unassignTicket) {
      const user = await prisma.user.findUnique({
        where: { id: req.assigneeId },
      });
      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    // For STAFF, ensure they can only assign to users in their market center
    if (
      userContext?.role === "STAFF" &&
      userContext?.marketCenterId &&
      newAssignee &&
      newAssignee?.marketCenterId &&
      newAssignee?.marketCenterId !== userContext.marketCenterId
    ) {
      throw APIError.permissionDenied(
        "You can only assign tickets to users in your team"
      );
    }

    const oldTicket = await prisma.ticket.findUnique({
      where: { id: req.id },
      include: { assignee: true },
    });
    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }

    try {
      const updateData: any = {};
      if (unassignTicket && !!oldTicket?.assigneeId) {
        updateData.assigneeId = null;
        updateData.status = "UNASSIGNED";
      }
      if (newAssignee && newAssignee?.id !== oldTicket?.assigneeId) {
        updateData.assigneeId = req.assigneeId;
        updateData.status = "ASSIGNED";
      }

      if (Object.keys(updateData).length === 0) {
        throw APIError.invalidArgument("No fields to update");
      }

      const previousAssignee = oldTicket?.assignee ?? null;
      const previousAssigneeName =
        previousAssignee && previousAssignee?.name
          ? previousAssignee.name
          : previousAssignee && !previousAssignee?.name
          ? "No name listed"
          : "Unassigned";

      const newAssigneeName = newAssignee?.name ?? "No name listed";

      const [ticket] = await prisma.$transaction([
        prisma.ticket.update({
          where: { id: req.id },
          data: updateData,
          include: {
            creator: true,
            assignee: true,
            comments: true,
          },
        }),
        prisma.ticketHistory.createMany({
          data: [
            {
              ticketId: req.id,
              action: unassignTicket ? "REMOVE" : "ADD",
              field: "assignment",
              previousValue: unassignTicket
                ? previousAssigneeName
                : "Unassigned",
              newValue: unassignTicket ? "Unassigned" : newAssigneeName,
              snapshot: oldTicket,
              changedAt: new Date(),
              changedById: userContext.userId,
            },
            {
              ticketId: oldTicket.id,
              action: "UPDATE",
              field: "status",
              previousValue: oldTicket?.status ?? "CREATED",
              newValue: unassignTicket ? "UNASSIGNED" : "ASSIGNED",
              snapshot: oldTicket,
              changedAt: new Date(),
              changedById: userContext.userId,
            },
          ],
        }),
      ]);

      const ticketWithCommentCount = {
        ...ticket,
        commentCount: ticket.comments ? ticket.comments.length : 0,
      };

      return { ticket: ticketWithCommentCount } as AssignTicketResponse;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("ticket not found");
      }
      throw error;
    }
  }
);
