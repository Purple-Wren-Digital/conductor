import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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

    const surveys = await prisma.survey.findMany({
      where: { assigneeId: req.assigneeId, completed: true },
    });

    if (!surveys || surveys.length === 0) {
      throw APIError.notFound("Surveys not found for the given assignee Id");
    }

    const result = await prisma.survey.aggregate({
      where: { assigneeId: req.assigneeId, completed: true },
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
