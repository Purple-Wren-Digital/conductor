import { api, APIError } from "encore.dev/api";
import { surveyRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { SurveyResults } from "./types";

export const getAllRatings = api<{}, SurveyResults>(
  {
    expose: true,
    method: "GET",
    path: "/surveys/ratings/all",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Market Center Id is required for non-admin users"
      );
    }

    const result = await surveyRepository.getAllAverages();

    return {
      totalSurveys: result.totalSurveys,
      overallAverageRating: result.overallAverageRating ?? 0,
      assigneeAverageRating: result.assigneeAverageRating ?? 0,
      marketCenterAverageRating: result.marketCenterAverageRating ?? 0,
    };
  }
);
