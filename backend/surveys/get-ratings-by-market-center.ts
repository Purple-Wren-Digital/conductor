import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { SurveyResults } from "./types";

export interface GetMarketCenterSurveyResultsRequest {
  marketCenterId: string;
}

export const getByMarketCenter = api<
  GetMarketCenterSurveyResultsRequest,
  SurveyResults
>(
  {
    expose: true,
    method: "GET",
    path: "/surveys/ratings/byMarketCenter/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (userContext.role === "ADMIN" && !req.marketCenterId) {
      throw APIError.invalidArgument("Market Center Id is required");
    }
    if (userContext.role !== "ADMIN" && !userContext.marketCenterId) {
      throw APIError.permissionDenied(
        "Market Center Id is required for non-admin users"
      );
    }

    const marketCenterId =
      userContext.role === "ADMIN"
        ? req.marketCenterId
        : userContext?.marketCenterId
          ? userContext.marketCenterId
          : "";

    const surveys = await prisma.survey.findMany({
      where: { marketCenterId, completed: true },
    });

    if (!surveys || surveys.length === 0) {
      throw APIError.notFound(
        "Surveys not found for the given market center Id"
      );
    }

    const result = await prisma.survey.aggregate({
      where: { marketCenterId: marketCenterId, completed: true },
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
);
