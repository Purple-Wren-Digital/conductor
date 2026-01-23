import { api, APIError, Query } from "encore.dev/api";
import { subscriptionRepository, ticketRepository } from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";

export interface SearchTicketsRequest {
  query?: Query<string>;

  status?: Query<TicketStatus[]>;
  urgency?: Query<Urgency[]>;
  assigneeId?: Query<string>;
  creatorId?: Query<string>;

  categoryId?: Query<string>;
  categoryIdsMultiple?: Query<string[]>;

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
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );

    if (
      !accessibleMarketCenterIds ||
      !accessibleMarketCenterIds.length ||
      !userContext?.marketCenterId
    ) {
      return { tickets: [], total: 0 };
    }

    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    // Parse dates
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (req.dateFrom) {
      const from = new Date(req.dateFrom);
      if (!isNaN(from.getTime())) dateFrom = from;
    }
    if (req.dateTo) {
      const to = new Date(req.dateTo);
      if (!isNaN(to.getTime())) dateTo = to;
    }

    // Handle "Unassigned" special case
    let assigneeId: string | null | undefined = req.assigneeId;
    if (assigneeId === "Unassigned") {
      assigneeId = null;
    }

    let categoryId: string[] | undefined = undefined;
    if (req.categoryIdsMultiple && req.categoryIdsMultiple.length > 0) {
      categoryId = req.categoryIdsMultiple;
    }
    if (req.categoryId) {
      categoryId = [req.categoryId];
    }

    let marketCenterIds: string[] = [];

    if (userContext.role === "ADMIN") {
      if (
        req?.marketCenterId &&
        accessibleMarketCenterIds.includes(req?.marketCenterId)
      ) {
        marketCenterIds.push(req.marketCenterId);
      } else {
        marketCenterIds = accessibleMarketCenterIds;
      }
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
    ) {
      marketCenterIds = [userContext.marketCenterId];
    }

    // Use repository search with role-based access control built in
    const { tickets, total } = await ticketRepository.search({
      userId: userContext.userId,
      userRole: userContext.role,
      query: req.query,
      status: req.status as TicketStatus[] | undefined,
      urgency: req.urgency as Urgency[] | undefined,
      assigneeId,
      creatorId: req.creatorId,
      categoryId,
      marketCenterIds,
      dateFrom,
      dateTo,
      sortBy: req.sortBy as any,
      sortDir: req.sortDir as any,
      limit,
      offset,
    });

    // Map tickets to response format
    const ticketsMapped: Partial<Ticket>[] = tickets.map((r) => ({
      ...r,
      title: r.title ?? "",
      description: r.description ?? "",
      status:
        r.status === "ASSIGNED" || (r.status === "CREATED" && !!r?.assigneeId)
          ? ("ASSIGNED" as TicketStatus)
          : r.status === "UNASSIGNED" ||
              (r.status === "CREATED" && !r?.assigneeId)
            ? ("UNASSIGNED" as TicketStatus)
            : (r.status ?? "ASSIGNED"),
      urgency: r.urgency ?? ("MEDIUM" as Urgency),
      categoryId: r.categoryId ?? "",
      category: r.category
        ? {
            ...r.category,
            description: r.category.description ?? "",
            defaultAssigneeId: r.category.defaultAssigneeId ?? null,
          }
        : null,
      creator: r.creator
        ? {
            ...r.creator,
            name: r.creator.name ?? "",
          }
        : undefined,
      assignee: r.assignee
        ? { ...r.assignee, name: r.assignee.name ?? "" }
        : null,
      commentCount: r.commentCount,
      attachmentCount: r.attachmentCount,
    }));

    return {
      tickets: ticketsMapped,
      total,
    };
  }
);
