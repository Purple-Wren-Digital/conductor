import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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
);
