import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { subscriptionRepository, ticketRepository } from "./db";
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
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );

    if (
      !accessibleMarketCenterIds ||
      !accessibleMarketCenterIds.length ||
      !userContext?.marketCenterId ||
      (userContext?.marketCenterId &&
        !accessibleMarketCenterIds.includes(
          req?.marketCenterId ?? userContext.marketCenterId
        ))
    ) {
      return { tickets: [], total: 0 };
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    let marketCenterIds: string[] = [];

    if (userContext.role === "ADMIN") {
      let marketCenterIds: string[] = [];

      if (
        req.marketCenterId &&
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
    // Use the search method which handles role-based filtering
    const { tickets, total } = await ticketRepository.search({
      userId: userContext?.userId,
      userRole: userContext?.role,
      marketCenterIds: marketCenterIds,
      status: req.status,
      urgency: req.urgency,
      assigneeId: req.assigneeId,
      creatorId: req.creatorId,
      categoryId: req.categoryId ? [req.categoryId] : undefined,
      query: req.search,
      sortBy: "updatedAt",
      sortDir: "desc",
      limit,
      offset,
    });

    if (!tickets || !tickets.length) {
      throw APIError.notFound("Could not find any tickets that meets criteria");
    }

    const ticketsMapped: Partial<Ticket>[] = tickets.map((r) => ({
      ...r,
      title: r.title ?? "",
      description: r.description ?? "",
      status:
        !r?.status || (r.status === "CREATED" && !!r?.assigneeId)
          ? ("ASSIGNED" as TicketStatus)
          : r.status === "CREATED" && !r?.assigneeId
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
    }));

    return { tickets: ticketsMapped, total } as ListTicketsResponse;
  }
);
