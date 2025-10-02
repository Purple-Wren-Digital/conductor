import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import { getUserContext } from "../auth/user-context";
import { canDeleteTicket } from "../auth/permissions";
import { TicketHistory } from "./types";

export interface DeleteTicketRequest {
  ticketId: string;
}

export interface DeleteTicketResponse {
  success: boolean;
  message: string;
  // history: TicketHistory;
}

export const deleteTicket = api<DeleteTicketRequest, DeleteTicketResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/tickets/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canDelete = await canDeleteTicket(userContext);
    if (!canDelete) {
      throw APIError.permissionDenied(
        "You do not have permission to delete tickets"
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
    });

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    // const history = await prisma.ticketHistory.create({
    //   data: {
    //     ticketId: ticket.id,
    //     field: "isActive",
    //     snapshot: ticket,
    //     previousValue: "true",
    //     newValue: "false",
    //     changedById: userContext.userId,
    //   },
    //   // include: {
    //   //   ticket: true
    //   // }
    // });

    // Delete ticket (comments will cascade delete due to schema relation)
    await prisma.ticket.delete({
      where: { id: req.ticketId },
    });

    return {
      success: true,
      message: "Ticket deleted successfully",
      history: history,
    };
  }
);
