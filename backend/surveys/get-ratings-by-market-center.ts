import { api, APIError } from "encore.dev/api";
import { surveyRepository } from "../ticket/db";
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

    const result = await surveyRepository.getMarketCenterAverages(marketCenterId);

    // Return zero values if no surveys exist instead of 404
    // This allows the UI to display "no data" gracefully
    return {
      totalSurveys: result.totalSurveys,
      overallAverageRating: result.overallAverageRating ?? 0,
      assigneeAverageRating: result.assigneeAverageRating ?? 0,
      marketCenterAverageRating: result.marketCenterAverageRating ?? 0,
    };
  }
);
