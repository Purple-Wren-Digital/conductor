import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

export interface DeleteSurveyRequest {
  ticketId: string;
}

export interface DeleteSurveyResponse {
  success: boolean;
}

export const deleteSurvey = api<DeleteSurveyRequest, DeleteSurveyResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/ticket/surveys/:ticketId",
    auth: false,
  },
  async (req) => {
    await getUserContext();

    if (!req.ticketId) {
      throw APIError.invalidArgument("Ticket ID is required");
    }

    const survey = await prisma.survey.findUnique({
      where: { ticketId: req.ticketId },
    });

    if (!survey) {
      throw APIError.notFound("Survey not found for the given Ticket ID");
    }

    await prisma.survey.delete({
      where: { id: survey.id },
    });

    return { success: true };
  }
);
