import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: {
        category: true,
        creator: true,
        assignee: true,
        attachments: {
          include: {
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

      assignee: ticket?.assignee
        ? {
            ...ticket.assignee,
            name: ticket.assignee.name ?? "",
          }
        : null,

      attachments:
        ticket?.attachments && ticket?.attachments.length > 0
          ? ticket.attachments.map((attachment) => ({
              ...attachment,
              uploader: attachment?.uploader
                ? {
                    ...attachment.uploader,
                    name: attachment.uploader.name ?? "Unknown",
                  }
                : undefined,
            }))
          : [],
    };

    return {
      ticket: formattedTicket,
      commentCount: ticket?._count.comments,
      attachmentCount: ticket?._count.attachments || 0,
    };
  }
);
