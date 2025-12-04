import { api, APIError } from "encore.dev/api";
import { Prisma } from "@prisma/client";
import { prisma } from "../ticket/db";
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

    const survey = await prisma.survey.findUnique({
      where: { ticketId: req.ticketId },
      include: { assignee: true, marketCenter: true },
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

    const usersToNotify: UsersToNotify[] = [];
    if (survey?.assigneeId && survey?.assignee) {
      usersToNotify.push({
        id: survey.assigneeId,
        name: survey.assignee?.name || "",
        email: survey.assignee?.email || "",
        updateType: "ticketSurveyResults",
      });
    }

    if (survey?.marketCenterId && survey?.marketCenter) {
      let staffWhere: Prisma.UserWhereInput = {
        marketCenterId: survey.marketCenterId,
        role: "STAFF_LEADER",
        id: survey?.assigneeId ? { not: survey.assigneeId } : undefined,
      };
      const staffLeaders = await prisma.user.findMany({
        where: staffWhere,
      });
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
