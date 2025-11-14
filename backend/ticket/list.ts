import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";

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

    let where: any = {};

    if (userContext.role === "AGENT") {
      where.assigneeId = userContext.userId;
    }

    if (userContext.role === "STAFF" && !userContext?.marketCenterId) {
      where.assigneeId = userContext.userId;
      where.creatorId = userContext.userId;
    }

    if (userContext.role === "STAFF" && userContext?.marketCenterId) {
      where = {
        OR: [
          {
            category: {
              marketCenterId: req.marketCenterId,
            },
          },
          {
            creator: {
              marketCenterId: req.marketCenterId,
            },
          },
          {
            assignee: {
              marketCenterId: req.marketCenterId,
            },
          },
        ],
      };
    }

    if (userContext.role === "ADMIN" && req.marketCenterId) {
      where = {
        OR: [
          {
            creator: {
              marketCenterId: req.marketCenterId,
            },
          },
          {
            assignee: {
              marketCenterId: req.marketCenterId,
            },
          },
        ],
      };
    }

    if (req.status) where.status = { in: req.status };
    if (req.urgency) where.urgency = { in: req.urgency };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          // category: true,
          // creator: true,
          // assignee: true,
          // ticketHistory: true,
          _count: true,
          // {
          //   select: {
          //     comments: true,
          //     attachments: true,
          //   },
          // },
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

    return { tickets, total } as ListTicketsResponse;
  }
);
