import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface UpdateSurveyRequest {
  ticketId: string;
  overallRating: number;
  assigneeRating: number;
  marketCenterRating: number;
  comments?: string;
}

export interface UpdateSurveyResponse {
  success: boolean;
}

export const update = api<UpdateSurveyRequest, UpdateSurveyResponse>(
  {
    expose: true,
    method: "PATCH",
    path: "/ticket/surveys/:ticketId",
    auth: false,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!req.ticketId) {
      throw APIError.invalidArgument("Ticket ID is required");
    }

    const survey = await prisma.survey.findUnique({
      where: { ticketId: req.ticketId },
    });

    if (!survey || !survey?.surveyorId) {
      throw APIError.notFound("Survey not found for the given Ticket ID");
    }

    if (survey?.surveyorId !== userContext?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to update this survey"
      );
    }

    await prisma.survey.update({
      where: { id: survey.id },
      data: {
        overallRating: req.overallRating ?? survey.overallRating,
        assigneeRating: req.assigneeRating ?? survey.assigneeRating,
        marketCenterRating: req.marketCenterRating ?? survey.marketCenterRating,
        comment: req.comments ?? survey.comment,
        completed: true,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }
);
