import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { ticketRepository } from "./db";
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

    // Use the search method which handles role-based filtering
    const { tickets, total } = await ticketRepository.search({
      userId: userContext.userId,
      userRole: userContext.role,
      userMarketCenterId: userContext.marketCenterId,
      status: req.status,
      urgency: req.urgency,
      assigneeId: req.assigneeId,
      creatorId: req.creatorId,
      categoryId: req.categoryId ? [req.categoryId] : undefined,
      query: req.search,
      sortBy: 'updatedAt',
      sortDir: 'desc',
      limit,
      offset,
    });

    if (!tickets) {
      throw APIError.notFound("Could not find any tickets that meets criteria");
    }

    return { tickets, total } as ListTicketsResponse;
  }
);
