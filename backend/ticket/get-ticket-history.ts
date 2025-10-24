import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { TicketHistory } from "../ticket/types";
import { mapHistorySnapshot } from "../utils";

export interface GetTicketHistoryRequest {
  id: string;

  orderBy: string;

  limit?: number;
  offset?: number;
}

export interface GetTicketHistoryResponse {
  ticketHistory: TicketHistory[];
  total: number;
}

export const getTicketHistory = api<
  GetTicketHistoryRequest,
  GetTicketHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);

    const [history, total] = await Promise.all([
      prisma.ticketHistory.findMany({
        where: { ticketId: req.id },
        include: { ticket: true, changedBy: true },
        orderBy: { changedAt: req.orderBy === "desc" ? "desc" : "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.ticketHistory.count({
        where: { ticketId: req.id },
      }),
    ]);

    return {
      ticketHistory: mapHistorySnapshot(history),
      total,
    };
  }
);
