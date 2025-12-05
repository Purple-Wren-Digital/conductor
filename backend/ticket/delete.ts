import { api, APIError } from "encore.dev/api";
import { db, ticketRepository } from "./db";
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

    const canDelete = await canDeleteTicket(userContext, req.ticketId);
    if (!canDelete) {
      throw APIError.permissionDenied(
        "You do not have permission to delete tickets"
      );
    }

    const ticket = await ticketRepository.findById(req.ticketId);

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }
    if (ticket && ticket.status === "RESOLVED") {
      throw APIError.invalidArgument("Resolved tickets cannot be deleted");
    }

    // Create history record (optional - commented out in original)
    // const history = await db.queryRow<{ id: string }>`
    //   INSERT INTO "TicketHistory" (
    //     id, "ticketId", action, field, snapshot, "changedById", "changedAt", "createdAt", "updatedAt"
    //   )
    //   VALUES (
    //     gen_random_uuid()::text, ${ticket.id}, 'DELETE', 'ticket',
    //     ${JSON.stringify(ticket)}, ${userContext.userId}, NOW(), NOW(), NOW()
    //   )
    //   RETURNING id
    // `;

    // Delete ticket (comments will cascade delete due to schema relation)
    await db.exec`
      DELETE FROM tickets WHERE id = ${req.ticketId}
    `;

    return {
      success: true,
      message: "Ticket deleted successfully",
      // history: history,
    };
  }
);
