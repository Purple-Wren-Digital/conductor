import { api, APIError } from "encore.dev/api";
import { surveyRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { Survey } from "./types";

export interface GetSurveyRequest {
  surveyId: string;
}

export interface GetSurveyResponse {
  survey: Survey;
}

export const get = api<GetSurveyRequest, GetSurveyResponse>(
  {
    expose: true,
    method: "GET",
    path: "/surveys/:surveyId",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    if (!req.surveyId) {
      throw APIError.invalidArgument("Survey Id is required");
    }

    const survey = await surveyRepository.findByIdWithRelations(req.surveyId);

    if (!survey) {
      throw APIError.notFound("Survey not found for the given Ticket Id");
    }

    return { survey };
  }
);
