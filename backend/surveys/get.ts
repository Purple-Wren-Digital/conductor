import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
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

    const rawSurvey = await prisma.survey.findUnique({
      where: { id: req.surveyId },
      include: {
        ticket: true,
        marketCenter: true,
        assignee: true,
        surveyor: true,
      },
    });

    if (!rawSurvey) {
      throw APIError.notFound("Survey not found for the given Ticket Id");
    }
    const ticket = rawSurvey?.ticket;
    const surveyor = rawSurvey?.surveyor;
    const assignee = rawSurvey?.assignee;
    const marketCenter = rawSurvey?.marketCenter;

    const survey: Survey = {
      ...rawSurvey,
      updatedAt: rawSurvey.updatedAt ?? undefined,
      marketCenterId: rawSurvey.marketCenterId,
      overallRating: rawSurvey?.overallRating
        ? Number(rawSurvey.overallRating)
        : null,
      assigneeRating: rawSurvey?.assigneeRating
        ? Number(rawSurvey.assigneeRating)
        : null,
      marketCenterRating: rawSurvey?.marketCenterRating
        ? Number(rawSurvey.marketCenterRating)
        : null,
      ticket: {
        ...ticket,
        id: rawSurvey.ticketId,
        title: ticket?.title ?? "Not Provided",
        description: ticket?.description ?? "",
        status: ticket?.status ?? "RESOLVED",
        urgency: ticket?.urgency ?? "LOW",
        dueDate: ticket?.dueDate ?? null,
        createdAt: ticket?.createdAt ?? new Date(0),
        updatedAt: ticket?.updatedAt ?? new Date(0),
        resolvedAt: ticket?.resolvedAt ?? null,
      },
      surveyor: {
        ...surveyor,
        name: surveyor?.name ?? "",
        email: surveyor?.email ?? "",
      },
      assignee:
        ticket?.assigneeId && assignee
          ? {
              ...assignee,
              name: assignee?.name ?? "",
              email: assignee?.email ?? "",
            }
          : undefined,
      marketCenter: marketCenter
        ? {
            ...marketCenter,
            name: marketCenter?.name ?? "",
          }
        : undefined,
    };


    return { survey: survey };
  }
);
