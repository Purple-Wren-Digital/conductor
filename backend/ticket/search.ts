import { api } from "encore.dev/api";
import { prisma } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";

export interface SearchTicketsRequest {
  query?: string;           // Search in title and description
  status?: TicketStatus[];  // Filter by multiple statuses
  urgency?: Urgency[];      // Filter by multiple urgencies
  category?: string[];      // Filter by categories
  creatorId?: string;       // Filter by creator
  assigneeId?: string;      // Filter by assignee
  dateFrom?: string;        // Created after this date
  dateTo?: string;          // Created before this date
  hasComments?: boolean;    // Only tickets with/without comments
  isResolved?: boolean;     // Only resolved/unresolved tickets
  limit?: number;           // Max results (default 50)
  offset?: number;          // Pagination offset
}

export interface SearchTicketsResponse {
  tickets: Ticket[];
  total: number;
  hasMore: boolean;
}

export const search = api<SearchTicketsRequest, SearchTicketsResponse>(
  { expose: true, method: "GET", path: "/tickets/search", auth: true },
  async (req) => {
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    // Build dynamic where clause
    const where: any = {};

    // Text search in title and description
    if (req.query) {
      where.OR = [
        { title: { contains: req.query, mode: 'insensitive' } },
        { description: { contains: req.query, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (req.status && req.status.length > 0) {
      where.status = { in: req.status };
    }

    // Urgency filter
    if (req.urgency && req.urgency.length > 0) {
      where.urgency = { in: req.urgency };
    }

    // Category filter
    if (req.category && req.category.length > 0) {
      where.category = { in: req.category };
    }

    // Creator filter
    if (req.creatorId) {
      where.creatorId = req.creatorId;
    }

    // Assignee filter
    if (req.assigneeId) {
      where.assigneeId = req.assigneeId;
    }

    // Date range filter
    if (req.dateFrom || req.dateTo) {
      where.createdAt = {};
      if (req.dateFrom) {
        where.createdAt.gte = new Date(req.dateFrom);
      }
      if (req.dateTo) {
        where.createdAt.lte = new Date(req.dateTo);
      }
    }

    // Resolved filter
    if (req.isResolved !== undefined) {
      if (req.isResolved) {
        where.resolvedAt = { not: null };
      } else {
        where.resolvedAt = null;
      }
    }

    // Comments filter
    if (req.hasComments !== undefined) {
      if (req.hasComments) {
        where.comments = { some: {} };
      } else {
        where.comments = { none: {} };
      }
    }

    // Execute search with pagination
    const [ticketsRaw, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: true,
          assignee: true,
          _count: {
            select: { comments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ticket.count({ where }),
    ]);

    // Map to match Ticket type with commentCount
    const tickets = ticketsRaw.map(ticket => ({
      ...ticket,
      commentCount: ticket._count.comments,
      _count: undefined, // Remove _count from result
    })) as Ticket[];

    return {
      tickets,
      total,
      hasMore: offset + limit < total,
    };
  }
);