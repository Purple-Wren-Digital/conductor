import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { UserHistory } from "../../ticket/types";
import { mapHistorySnapshot } from "../../utils";

export interface GetUserHistoryRequest {
  id: string;

  orderBy: Query<"asc" | "desc">;

  limit?: number;
  offset?: number;
}

export interface GetUserHistoryResponse {
  userHistory: UserHistory[];
  total: number;
}

export const getUserHistory = api<
  GetUserHistoryRequest,
  GetUserHistoryResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/users/:id/history",
    auth: true,
  },
  async (req) => {
    const limit =
      req.limit && Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = req.offset && Math.max(Number(req.offset ?? 0), 0);

    const whereClause = {
      OR: [{ changedById: req.id }, { userId: req.id }],
    };

    const [history, total] = await Promise.all([
      prisma.userHistory.findMany({
        where: whereClause,
        include: {
          changedBy: true,
          user: true,
        },
        orderBy: { changedAt: req.orderBy === "asc" ? "asc" : "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.userHistory.count({
        where: whereClause,
      }),
    ]);

    return {
      userHistory: mapHistorySnapshot(history),
      total: total ?? 0,
    };
  }
);
