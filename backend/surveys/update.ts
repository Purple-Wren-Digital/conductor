import { api, APIError } from "encore.dev/api";
import { surveyRepository, userRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { UsersToNotify } from "../notifications/types";

export interface UpdateSurveyRequest {
  ticketId: string;
  overallRating: number;
  assigneeRating: number;
  marketCenterRating: number;
  comments?: string;
}

export interface UpdateSurveyResponse {
  success: boolean;
  usersToNotify: UsersToNotify[];
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

    const survey = await surveyRepository.findByTicketId(req.ticketId);

    if (!survey || !survey?.surveyorId) {
      throw APIError.notFound("Survey not found for the given Ticket ID");
    }

    if (survey?.surveyorId !== userContext?.userId) {
      throw APIError.permissionDenied(
        "You do not have permission to update this survey"
      );
    }

    await surveyRepository.update(survey.id, {
      overallRating: req.overallRating ?? survey.overallRating,
      assigneeRating: req.assigneeRating ?? survey.assigneeRating,
      marketCenterRating: req.marketCenterRating ?? survey.marketCenterRating,
      comment: req.comments ?? survey.comment,
      completed: true,
    });

    const usersToNotify: UsersToNotify[] = [];
    if (survey?.assigneeId && survey?.assignee) {
      usersToNotify.push({
        id: survey.assigneeId,
        name: survey.assignee?.name || "",
        email: survey.assignee?.email || "",
        updateType: "ticketSurveyResults",
      });
    }

    if (survey?.marketCenterId) {
      // Find staff leaders in the market center (excluding the assignee)
      const staffLeaders = await userRepository.findByMarketCenterIdAndRole(
        survey.marketCenterId,
        "STAFF_LEADER"
      );

      staffLeaders.forEach((leader) => {
        usersToNotify.push({
          id: leader.id,
          name: leader.name || "",
          email: leader.email || "",
          updateType: "ticketSurveyResults",
        });
      });
    }

    return { success: true, usersToNotify: usersToNotify };
  }
);
