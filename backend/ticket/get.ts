import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";

export interface GetTicketRequest {
  ticketId: string;
}

export interface GetTicketResponse {
  ticket: Ticket;
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: {
        category: true,
        creator: true,
        assignee: true,
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedBy: true,
            createdAt: true,
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          },
        },
      },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }
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
      creator: {
        ...ticket.creator,
        name: ticket.creator.name ?? "",
      },

      assignee: ticket.assignee
        ? {
            ...ticket.assignee,
            name: ticket.assignee.name ?? "",
          }
        : null,
      commentCount: ticket._count.comments,
      attachmentCount: ticket._count.attachments,
      attachments: ticket.attachments.map(attachment => ({
        ...attachment,
        uploaderName: attachment.uploader.name || attachment.uploader.email,
      })),
    };

    return {
      ticket: formattedTicket,
    };
  }
);
