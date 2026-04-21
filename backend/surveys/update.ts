import { api, APIError } from "encore.dev/api";
import { surveyRepository, userRepository, ticketRepository } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { UsersToNotify } from "../notifications/types";
import { activityTopic } from "../notifications/activity-topic";

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

    // Publish activity event for backend notification dispatch
    if (survey?.marketCenterId) {
      const ticket = await ticketRepository.findById(req.ticketId);
      await activityTopic.publish({
        type: "survey.completed",
        ticketId: req.ticketId,
        ticketTitle: ticket?.title || "Untitled Ticket",
        assigneeId: survey.assigneeId ?? undefined,
        marketCenterId: survey.marketCenterId,
        staffName: userContext.name || "User",
      });
    }

    return { success: true, usersToNotify: [] };
  }
);
