import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { MarketCenter } from "./types";
import { getUserContext } from "../auth/user-context";
import { marketCenterScopeFilter } from "../auth/permissions";

export interface GetMarketCenterRequest {
  id: string;
}

export interface GetMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const get = api<GetMarketCenterRequest, GetMarketCenterResponse>(
  {
    expose: true,
    method: "GET",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const scopeFilter = await marketCenterScopeFilter(userContext, req.id);

    if (!scopeFilter || !scopeFilter?.id) {
      throw APIError.permissionDenied(
        "You do not have permission to view this market center"
      );
    }

    let where: any = {
      ...scopeFilter,
    };

    const marketCenter = await prisma.marketCenter.findUnique({
      where,
      include: {
        users: true,
        ticketCategories: {
          include: {
            defaultAssignee: true,
            _count: { select: { tickets: true } },
          },
        },
      },
    });

    if (!marketCenter || !marketCenter?.id) {
      throw APIError.notFound("Market Center not found");
    }

    const surveyData = await prisma.survey.aggregate({
      where: { marketCenterId: marketCenter.id, completed: true },
      _avg: {
        overallRating: true,
        assigneeRating: true,
        marketCenterRating: true,
      },
      _count: true,
    });

    const totalTickets = await prisma.ticket.count({
      where: { category: { marketCenterId: req.id } },
    });

    const formattedMarketCenter = {
      ...marketCenter,
      totalTickets: totalTickets,
      ticketCategories: (marketCenter.ticketCategories || []).map(
        (category) => ({
          ...category,
          name: category.name ?? "",
          description: category.description ?? "",
          defaultAssignee: category.defaultAssignee
            ? {
                ...category.defaultAssignee,
                name: category.defaultAssignee.name ?? "",
              }
            : null,
          ticketCount: category._count?.tickets ?? 0,
        })
      ),
      averages: {
        totalSurveys: surveyData?._count ?? 0,
        overallAverageRating: surveyData?._avg?.overallRating
          ? Number(surveyData._avg.overallRating)
          : 0,
        assigneeAverageRating: surveyData?._avg?.assigneeRating
          ? Number(surveyData._avg.assigneeRating)
          : 0,
        marketCenterAverageRating: surveyData?._avg?.marketCenterRating
          ? Number(surveyData._avg.marketCenterRating)
          : 0,
      },
    };

    return {
      marketCenter: formattedMarketCenter,
    } as GetMarketCenterResponse;
  }
);
