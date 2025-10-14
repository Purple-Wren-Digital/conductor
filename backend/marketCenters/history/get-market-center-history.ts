import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { mapHistorySnapshot } from "../../utils";
import { MarketCenterHistory } from "../types";

export interface GetMarketCenterHistoryRequest {
  id: string;

  orderBy: Query<"asc" | "desc">;

  limit?: number;
  offset?: number;
}

export interface GetMarketCenterHistoryResponse {
  marketCenterHistory: MarketCenterHistory[];
  total: number;
}

export const getUserHistory = api<
  GetMarketCenterHistoryRequest,
  GetMarketCenterHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenter/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);

    const [history, total] = await Promise.all([
      prisma.marketCenterHistory.findMany({
        where: { marketCenterId: req.id },
        include: {
          changedBy: true,
          marketCenter: true,
        },
        orderBy: { changedAt: req.orderBy === "asc" ? "asc" : "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.marketCenterHistory.count({
        where: { marketCenterId: req.id },
      }),
    ]);

    return {
      marketCenterHistory: mapHistorySnapshot(history),
      total: total ?? 0,
    };
  }
);
