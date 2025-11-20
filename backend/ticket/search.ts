import { api, Query } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import { getTicketScopeFilter } from "../auth/permissions";

export interface SearchTicketsRequest {
  query?: Query<string>;

  status?: Query<TicketStatus[]>;
  urgency?: Query<Urgency[]>;
  assigneeId?: Query<string>;
  creatorId?: Query<string>;
  categoryId?: Query<string[]>;
  marketCenterId?: Query<string>;

  dateFrom?: Query<string>;
  dateTo?: Query<string>;

  sortBy?: Query<"updatedAt" | "createdAt" | "urgency" | "status">;
  sortDir?: Query<"asc" | "desc">;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface SearchTicketsResponse {
  tickets: Partial<Ticket>[];
  total: number;
}

export const search = api<SearchTicketsRequest, SearchTicketsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/search",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    // let scopeFilter = await getTicketScopeFilter(userContext);

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
              marketCenterId: userContext.marketCenterId,
            },
          },
          {
            creator: {
              marketCenterId: userContext.marketCenterId,
            },
          },
          {
            assignee: {
              marketCenterId: userContext.marketCenterId,
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

    if (!req.status || (Array.isArray(req.status) && req.status.length === 0)) {
      where.status = { not: "RESOLVED" as TicketStatus };
    } else {
      where.status = { in: req.status as TicketStatus[] };
    }

    if (req.urgency && req.urgency.length > 0) {
      where.urgency = { in: req.urgency as Urgency[] };
    }
    if (req.categoryId) where.categoryId = { in: req.categoryId };

    if (req.query) {
      const searchCondition = {
        OR: [
          {
            title: { contains: req.query, mode: Prisma.QueryMode.insensitive },
          },
          {
            description: {
              contains: req.query,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      };

      if (where.OR) {
        //   where.AND = [scopeFilter, searchCondition];
        // } else {
        where.OR = searchCondition.OR;
      }
    }

    if (req.dateFrom || req.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (req.dateFrom) {
        const from = new Date(req.dateFrom);
        if (!isNaN(from.getTime())) createdAt.gte = from;
      }
      if (req.dateTo) {
        const to = new Date(req.dateTo);
        if (!isNaN(to.getTime())) createdAt.lte = to;
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    const sortBy: "updatedAt" | "createdAt" | "urgency" | "status" =
      (req.sortBy as any) ?? "updatedAt";

    const sortDir: Prisma.SortOrder = req.sortDir === "asc" ? "asc" : "desc";

    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [];

    switch (sortBy) {
      case "createdAt":
        orderBy.push({ createdAt: sortDir }, { id: "desc" });
        break;
      case "urgency":
        orderBy.push(
          { urgency: sortDir },
          { updatedAt: "desc" },
          { id: "desc" }
        );
        break;
      case "status":
        orderBy.push(
          { status: sortDir },
          { updatedAt: "desc" },
          { id: "desc" }
        );
        break;
      case "updatedAt":
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
      default:
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: true,
          assignee: true,
          category: true,
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
      prisma.attachment.count(),
    ]);

    const ticketsMapped: Partial<Ticket>[] = tickets.map((r) => ({
      ...r,
      title: r.title ?? "",
      description: r.description ?? "",
      status: r.status ?? ("ASSIGNED" as TicketStatus),
      urgency: r.urgency ?? ("MEDIUM" as Urgency),
      categoryId: r.categoryId ?? "",
      category: r?.category
        ? {
            ...r.category,
            description: r.category.description ?? "",
            defaultAssigneeId: r.category.defaultAssigneeId ?? null,
          }
        : null,
      creator: {
        ...r.creator,
        name: r.creator.name ?? "",
      },
      assignee: r.assignee
        ? { ...r.assignee, name: r.assignee.name ?? "" }
        : null,

      commentCount: r._count.comments,
      attachmentCount: r._count.attachments,
    }));
    return {
      tickets: ticketsMapped,
      total,
    };
  }
);
