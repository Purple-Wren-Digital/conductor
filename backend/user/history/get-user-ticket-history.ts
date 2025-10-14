import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { TicketHistory } from "../../ticket/types";
import { mapHistorySnapshot } from "../../utils";

export interface GetUserTicketHistoryRequest {
  id: string;

  orderBy: string;

  limit?: number;
  offset?: number;
}

export interface GetUserTicketHistoryResponse {
  ticketHistory: TicketHistory[];
  total: number;
}

export const getUserTicketHistory = api<
  GetUserTicketHistoryRequest,
  GetUserTicketHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/history/tickets",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);

    const [history, total] = await Promise.all([
      prisma.ticketHistory.findMany({
        where: { changedById: req.id },
        include: { ticket: true },
        orderBy: { changedAt: req.orderBy === "asc" ? "asc" : "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.ticketHistory.count({
        where: { changedById: req.id },
      }),
    ]);

    return {
      ticketHistory: mapHistorySnapshot(history),
      total: total ?? 0,
    };
  }
);
