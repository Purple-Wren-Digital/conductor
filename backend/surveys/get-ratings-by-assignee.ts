import { api, APIError } from "encore.dev/api";
import { surveyRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { SurveyResults } from "./types";

export interface GetRatingsByAssigneeRequest {
  assigneeId: string;
}

export const getRatingsByAssignee = api<
  GetRatingsByAssigneeRequest,
  SurveyResults
>(
  {
    expose: true,
    method: "GET",
    path: "/surveys/ratings/byAssignee/:assigneeId",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    if (!req.assigneeId) {
      throw APIError.invalidArgument("Assignee Id is required");
    }

    const hasSurveys = await surveyRepository.hasCompletedSurveysForAssignee(req.assigneeId);

    if (!hasSurveys) {
      throw APIError.notFound("Surveys not found for the given assignee Id");
    }

    const result = await surveyRepository.getAssigneeAverages(req.assigneeId);

    return {
      totalSurveys: result.totalSurveys,
      overallAverageRating: result.overallAverageRating ?? 0,
      assigneeAverageRating: result.assigneeAverageRating ?? 0,
      marketCenterAverageRating: result.marketCenterAverageRating ?? 0,
    };
  }
);
