import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getAuthData } from "~encore/auth";

export interface DeleteTicketRequest {
  ticketId: string;
  creatorId: string;
  userRole: string; // Role of the user attempting to delete the ticket
}

export interface DeleteTicketResponse {
  success: boolean;
  message: string;
}

export const deleteTicket = api<DeleteTicketRequest, DeleteTicketResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/tickets/:ticketId",
    auth: true,
  },
  async (req) => {
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
    });

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    // Permission check: admins can delete anything, creators can delete their own tickets
    const isAdmin = req.userRole === "ADMIN";
    const isCreator = ticket.creatorId === req.creatorId;

    if (!isAdmin && !isCreator) {
      throw APIError.permissionDenied(
        "You can only delete tickets you created"
      );
    }

    // Delete ticket (comments will cascade delete due to schema relation)
    await prisma.ticket.delete({
      where: { id: req.ticketId },
    });

    return {
      success: true,
      message: "Ticket deleted successfully",
    };
  }
);
