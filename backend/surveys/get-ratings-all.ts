import { api, APIError, Query } from "encore.dev/api";
import { db, subscriptionRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { SurveyResults } from "./types";

interface SurveyAveragesRow {
  total: number;
  assignee_avg: string | null;
  overall_avg: string | null;
  mc_avg: string | null;
}

export const getAllRatings = api<{}, SurveyResults>(
  {
    expose: true,
    method: "GET",
    path: "/surveys/ratings/all",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const subscription = await subscriptionRepository.findByMarketCenterId(
      userContext?.marketCenterId
    );
    const isActive = subscription && subscription?.status === "ACTIVE";

    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Market Center Id is required for non-admin users"
      );
    }
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        userContext?.marketCenterId
      );

    let surveyResults: SurveyResults = {
      totalSurveys: 0,
      overallAverageRating: 0,
      assigneeAverageRating: 0,
      marketCenterAverageRating: 0,
    };

    if (
      isActive &&
      accessibleMarketCenterIds &&
      accessibleMarketCenterIds.length > 0
    ) {
      const enterpriseResults = await db.queryRow<SurveyAveragesRow>`
        SELECT
          COUNT(*)::int as total,
          AVG(market_center_rating)::decimal(3,2) as mc_avg,
          AVG(overall_rating)::decimal(3,2) as overall_avg,
          AVG(assignee_rating)::decimal(3,2) as assignee_avg
        FROM ticket_ratings
        WHERE market_center_id = ANY(${accessibleMarketCenterIds}) AND completed = true
        `;
      surveyResults = {
        totalSurveys: enterpriseResults?.total ?? 0,
        overallAverageRating: enterpriseResults?.overall_avg
          ? parseFloat(enterpriseResults.overall_avg)
          : 0,
        marketCenterAverageRating: enterpriseResults?.mc_avg
          ? parseFloat(enterpriseResults.mc_avg)
          : 0,
        assigneeAverageRating: enterpriseResults?.assignee_avg
          ? parseFloat(enterpriseResults.assignee_avg)
          : 0,
      };
    } else {
      // No subscription or inactive subscription - limit to own surveys
      const result = await db.queryRow<SurveyAveragesRow>`
          SELECT
            COUNT(*)::int as total,
            AVG(assignee_rating)::decimal(3,2) as assignee_avg,
            AVG(overall_rating)::decimal(3,2) as overall_avg,
            AVG(market_center_rating)::decimal(3,2) as mc_avg
          FROM ticket_ratings
          WHERE assignee_id = ${userContext?.userId} AND completed = true
        `;
      surveyResults = {
        totalSurveys: result?.total ?? 0,
        overallAverageRating: result?.overall_avg
          ? parseFloat(result.overall_avg)
          : 0,
        marketCenterAverageRating: result?.mc_avg
          ? parseFloat(result.mc_avg)
          : 0,
        assigneeAverageRating: result?.assignee_avg
          ? parseFloat(result.assignee_avg)
          : 0,
      };
    }

    return surveyResults;
  }
);
