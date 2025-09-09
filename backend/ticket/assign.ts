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
      throw APIError.permissionDenied("You do not have permission to reassign tickets");
    }

    // Check if assignee exists and is in the same market center for STAFF users
    const assignee = await prisma.user.findUnique({
      where: { id: req.assigneeId },
    });

    if (!assignee) {
      throw APIError.notFound("assignee not found");
    }
    
    // For STAFF, ensure they can only assign to users in their market center
    if (userContext.role === "STAFF" && userContext.marketCenterId) {
      if (assignee.marketCenterId !== userContext.marketCenterId) {
        throw APIError.permissionDenied("You can only assign tickets to users in your team");
      }
    }

    try {
      const ticket = await prisma.ticket.update({
        where: { id: req.id },
        data: { assigneeId: req.assigneeId },
        include: {
          creator: true,
          assignee: true,
          comments: true,
        },
      });

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
