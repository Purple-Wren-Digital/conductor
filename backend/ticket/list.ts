import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import { getTicketScopeFilter } from "../auth/permissions";
import { mapHistorySnapshot } from "../utils";

export interface ListTicketsRequest {
  status?: Query<TicketStatus[]>;
  urgency?: Query<Urgency[]>;
  assigneeId?: Query<string>;
  creatorId?: Query<string>;
  categoryId?: Query<string>;
  search?: Query<string>;
  marketCenterId?: Query<string>;
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
    const userContext = await getUserContext();
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    let scopeFilter = await getTicketScopeFilter(userContext);

    let where: any = {};

    if (req.search) {
      const searchCondition = {
        OR: [
          { title: { contains: req.search, mode: "insensitive" } },
          { description: { contains: req.search, mode: "insensitive" } },
        ],
      };

      if (where.OR) {
        where.AND = [scopeFilter, searchCondition];
      } else {
        where.OR = searchCondition.OR;
      }
    } else {
      where = {
        ...scopeFilter,
      };
    }

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
    // TODO: LIST CATEGORIES BY MARKET CENTER
    if (req.categoryId) {
      where.categoryId = req.categoryId;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          category: true,
          creator: true,
          assignee: true,
          ticketHistory: true,
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
    if (!tickets) {
      throw APIError.notFound("Could not find any tickets that meets criteria");
    }

    const formattedTickets: Ticket[] = tickets.map((ticket) => ({
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
        ? { ...ticket.assignee, name: ticket.assignee.name ?? "" }
        : null,
      commentCount: ticket._count.comments,
      ticketHistory: mapHistorySnapshot(ticket.ticketHistory),
    }));

    return { tickets: formattedTickets, total } as ListTicketsResponse;
  }
);
