import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
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
  category?: Query<string>;
  marketCenterId?: Query<string>;

  dateFrom?: Query<string>;
  dateTo?: Query<string>;

  sortBy?: Query<"updatedAt" | "createdAt" | "urgency" | "status">;
  sortDir?: Query<"asc" | "desc">;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface SearchTicketsResponse {
  tickets: Ticket[];
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

    let scopeFilter = getTicketScopeFilter(userContext);
    
    if (userContext.role === "ADMIN" && req.marketCenterId) {
      scopeFilter = {
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
    
    const where: Prisma.TicketWhereInput = { ...scopeFilter };

    if (!req.status || (Array.isArray(req.status) && req.status.length === 0)) {
      where.status = { not: "RESOLVED" as TicketStatus };
    } else {
      where.status = { in: req.status as TicketStatus[] };
    }

    if (req.urgency && req.urgency.length > 0) {
      where.urgency = { in: req.urgency as Urgency[] };
    }

    if (req.assigneeId) where.assigneeId = req.assigneeId;
    if (req.creatorId) where.creatorId = req.creatorId;
    if (req.category) where.category = req.category;

    if (req.query) {
      const searchCondition = {
        OR: [
          { title: { contains: req.query, mode: "insensitive" } },
          { description: { contains: req.query, mode: "insensitive" } },
        ],
      };
      
      if (scopeFilter.OR) {
        where.AND = [scopeFilter, searchCondition];
        delete where.OR;
      } else {
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
      default:
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
    }

    type Row = Prisma.TicketGetPayload<{
      include: {
        creator: true;
        assignee: true;
        _count: { select: { comments: true } };
      };
    }>;

    const [rows, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: true,
          assignee: true,
          _count: { select: { comments: true } },
        },
        orderBy,
        take: limit,
        skip: offset,
      }) as Promise<Row[]>,
      prisma.ticket.count({ where }),
    ]);

    const tickets: Ticket[] = rows.map((r) => ({
      ...r,
      title: r.title ?? "",
      description: r.description ?? "",
      status: r.status ?? ("ASSIGNED" as TicketStatus),
      urgency: r.urgency ?? ("MEDIUM" as Urgency),
      category: r.category ?? "",
      creator: {
        ...r.creator,
        name: r.creator.name ?? "",
      },
      assignee: r.assignee
        ? { ...r.assignee, name: r.assignee.name ?? "" }
        : null,
      commentCount: r._count.comments,
    }));

    return { tickets, total };
  }
);
