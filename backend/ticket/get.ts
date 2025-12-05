import { api, APIError } from "encore.dev/api";
import { ticketRepository, db } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";

export interface GetTicketRequest {
  ticketId: string;
}

export interface GetTicketResponse {
  ticket: Ticket;
  commentCount: number;
  attachmentCount: number;
}

export const get = api<GetTicketRequest, GetTicketResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:ticketId",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    const ticket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    // Get attachments separately
    const attachmentRows = await db.queryAll<{
      id: string;
      file_name: string;
      file_type: string;
      file_size: number;
      file_key: string;
      ticket_id: string;
      uploader_id: string;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT * FROM attachments
      WHERE ticket_id = ${req.ticketId}
      ORDER BY created_at DESC
    `;

    // Get uploader info for each attachment
    const attachments = await Promise.all(
      attachmentRows.map(async (att) => {
        const uploader = await db.queryRow<{
          id: string;
          name: string | null;
          email: string;
        }>`
          SELECT id, name, email FROM users WHERE id = ${att.uploader_id}
        `;
        return {
          id: att.id,
          fileName: att.file_name,
          fileType: att.file_type,
          fileSize: att.file_size,
          fileKey: att.file_key,
          ticketId: att.ticket_id,
          uploaderId: att.uploader_id,
          createdAt: att.created_at,
          updatedAt: att.updated_at,
          uploader: uploader
            ? {
                id: uploader.id,
                name: uploader.name ?? "Unknown",
                email: uploader.email,
              }
            : undefined,
        };
      })
    );

    // Get counts
    const counts = await db.queryRow<{ comments: number; attachments: number }>`
      SELECT
        (SELECT COUNT(*)::int FROM comments WHERE ticket_id = ${req.ticketId}) as comments,
        (SELECT COUNT(*)::int FROM attachments WHERE ticket_id = ${req.ticketId}) as attachments
    `;

    const formattedTicket = {
      ...ticket,
      title: ticket.title ?? "",
      description: ticket.description ?? "",
      status: ticket.status ?? ("ASSIGNED" as TicketStatus),
      urgency: ticket.urgency ?? ("MEDIUM" as Urgency),
      categoryId: ticket.categoryId ?? "",
      category: ticket?.category
        ? {
            ...ticket.category,
            description: ticket.category.description ?? "",
            defaultAssigneeId: ticket.category.defaultAssigneeId ?? null,
          }
        : null,
      creator: ticket.creator
        ? {
            ...ticket.creator,
            name: ticket.creator.name ?? "",
          }
        : undefined,

      assignee: ticket?.assignee
        ? {
            ...ticket.assignee,
            name: ticket.assignee.name ?? "",
          }
        : null,

      attachments: attachments,
    };

    return {
      ticket: formattedTicket as Ticket,
      commentCount: counts?.comments ?? 0,
      attachmentCount: counts?.attachments ?? 0,
    };
  }
);
