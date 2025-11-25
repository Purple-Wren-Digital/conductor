import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { Prisma } from "@prisma/client";
import { getUserContext } from "../auth/user-context";
import type { MarketCenter } from "./types";
import type { SurveyResults } from "../surveys/types";

export interface ListMarketCentersRequest {
  id?: Query<string>;
  categoryId?: Query<string[]>;
  userIds?: Query<string[]>;

  query?: Query<string>;

  sortBy?: Query<"updatedAt" | "createdAt" | "urgency" | "status">;
  sortDir?: Query<"asc" | "desc">;

  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListMarketCentersResponse {
  marketCenters: MarketCenter[];
  total: number;
  globalAverages?: SurveyResults;
}

async function getSurveyAverages(marketCenterId: string) {
  const result = await prisma.survey.aggregate({
    where: { marketCenterId, completed: true },
    _avg: {
      overallRating: true,
      assigneeRating: true,
      marketCenterRating: true,
    },
    _count: true,
  });

  return {
    totalSurveys: result?._count ?? 0,
    overallAverageRating: result?._avg?.overallRating
      ? Number(result._avg.overallRating)
      : 0,
    assigneeAverageRating: result?._avg?.assigneeRating
      ? Number(result._avg.assigneeRating)
      : 0,
    marketCenterAverageRating: result?._avg?.marketCenterRating
      ? Number(result._avg.marketCenterRating)
      : 0,
  };
}

async function getGlobalSurveyAverages() {
  const result = await prisma.survey.aggregate({
    where: { completed: true },
    _avg: {
      overallRating: true,
      assigneeRating: true,
      marketCenterRating: true,
    },
    _count: true,
  });

  return {
    totalSurveys: result?._count ?? 0,
    overallAverageRating: result?._avg?.overallRating
      ? Number(result._avg.overallRating)
      : 0,
    assigneeAverageRating: result?._avg?.assigneeRating
      ? Number(result._avg.assigneeRating)
      : 0,
    marketCenterAverageRating: result?._avg?.marketCenterRating
      ? Number(result._avg.marketCenterRating)
      : 0,
  };
}

export const search = api<ListMarketCentersRequest, ListMarketCentersResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/search",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    // AGENT + STAFF + STAFF_LEADER: only return their market center
    if (
      (userContext.role === "AGENT" ||
        userContext.role === "STAFF" ||
        userContext.role === "STAFF_LEADER") &&
      userContext?.marketCenterId
    ) {
      const marketCenter = await prisma.marketCenter.findUnique({
        where: { id: userContext.marketCenterId },
        include: { users: true, ticketCategories: true },
      });

      if (!marketCenter) {
        throw APIError.notFound("Market center not found");
      }

      const totalTickets = await prisma.ticket.count({
        where: { category: { marketCenterId: marketCenter.id } },
      });

      const averages = await getSurveyAverages(marketCenter.id);

      return {
        marketCenters: [
          {
            ...marketCenter,
            totalTickets,
            averages,
            users: marketCenter.users.map((user) => ({
              ...user,
              name: user.name ?? "",
            })),
          },
        ],
        total: 1,
      };
    }

    // ADMIN
    const limit = Math.min(Math.max(Number(req.limit ?? 50), 1), 200);
    const offset = Math.max(Number(req.offset ?? 0), 0);

    const sortBy: "updatedAt" | "createdAt" =
      (req.sortBy as any) ?? "updatedAt";

    const sortDir: Prisma.SortOrder = req.sortDir === "asc" ? "asc" : "desc";

    const orderBy: Prisma.MarketCenterOrderByWithRelationInput[] = [];

    switch (sortBy) {
      case "createdAt":
        orderBy.push({ createdAt: sortDir }, { id: "desc" });
        break;
      case "updatedAt":
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
      default:
        orderBy.push({ updatedAt: sortDir }, { id: "desc" });
        break;
    }

    let where: any = {};

    if (userContext.role === "ADMIN" && req?.id) {
      where.id = req.id;
    }

    if (req?.query) {
      where.OR = [
        { name: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
        { id: { contains: req.query, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (req?.categoryId && req.categoryId?.length > 0) {
      where.ticketCategories = {
        some: {
          id: { in: req.categoryId },
        },
      };
    }

    if (req?.userIds && req?.userIds.length > 0) {
      where.users = {
        some: {
          id: {
            in: req.userIds as string[],
          },
        },
      };
    }

    const [marketCenters, total] = await Promise.all([
      prisma.marketCenter.findMany({
        where,
        include: { users: true, ticketCategories: true },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.marketCenter.count({ where }),
    ]);

    const formattedMarketCenters = await Promise.all(
      marketCenters.map(async (mc) => {
        const totalTickets = await prisma.ticket.count({
          where: {
            category: {
              marketCenterId: mc.id,
            },
          },
        });
        const averages = await getSurveyAverages(mc.id);
        return {
          ...mc,
          totalTickets,
          averages,
          users: mc.users.map((user) => ({
            ...user,
            name: user.name ?? "",
          })),
        };
      })
    );

    const globalAverages = await getGlobalSurveyAverages();
    return {
      marketCenters: formattedMarketCenters,
      total: total,
      globalAverages: globalAverages,
    };
  }
);
