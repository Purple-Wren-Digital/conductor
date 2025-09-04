import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getAuthData } from "~encore/auth";

export interface ListTicketsRequest {
  status?: Query<TicketStatus[]>;
  urgency?: Query<Urgency[]>;
  assigneeId?: Query<string>;
  creatorId?: Query<string>;
  category?: Query<string>;
  search?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListTicketsResponse {
  tickets: Ticket[];
  total: number;
}

export const list = api<ListTicketsRequest, ListTicketsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets",
    auth: true,
  },
  async (req) => {
    const authData = await getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    const where: any = {};

    if (req.status && req.status.length > 0) {
      where.status = { in: req.status };
    }

    if (req.urgency && req.urgency.length > 0) {
      where.urgency = { in: req.urgency };
    }

    if (req.assigneeId) {
      where.assigneeId = req.assigneeId;
    }

    if (req.creatorId) {
      where.creatorId = req.creatorId;
    }

    if (req.category) {
      where.category = req.category;
    }

    if (req.search) {
      where.OR = [
        { title: { contains: req.search, mode: "insensitive" } },
        { description: { contains: req.search, mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: true,
          assignee: true,
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
    ]);

    const formattedTickets: Ticket[] = tickets.map((ticket) => ({
      ...ticket,
      title: ticket.title ?? "",
      description: ticket.description ?? "",
      status: ticket.status ?? ("ASSIGNED" as TicketStatus),
      urgency: ticket.urgency ?? ("MEDIUM" as Urgency),
      category: ticket.category ?? "",
      creator: {
        ...ticket.creator,
        name: ticket.creator.name ?? "",
      },
      assignee: ticket.assignee
        ? { ...ticket.assignee, name: ticket.assignee.name ?? "" }
        : null,
      commentCount: ticket._count.comments,
    }));

    return { tickets: formattedTickets, total } as ListTicketsResponse;
  }
);
