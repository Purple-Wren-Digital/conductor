import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
// TODO: Generate notification for creator to rate the ticket

export interface CreateSurveyRequest {
  ticketId: string;
  surveyorId: string;
  marketCenterId?: string;
}

export interface CreateSurveyResponse {
  success: boolean;
}

export const createSurvey = api<CreateSurveyRequest, CreateSurveyResponse>(
  {
    expose: true,
    method: "POST",
    path: "/surveys/:ticketId/create",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    if (!req?.ticketId || !req?.surveyorId) {
      throw APIError.invalidArgument("Missing data");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
      include: { assignee: true, creator: true, category: true },
    });

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    const marketCenterId =
      req?.marketCenterId ||
      ticket?.assignee?.marketCenterId ||
      ticket?.category?.marketCenterId ||
      ticket?.creator?.marketCenterId ||
      null;

    if (!marketCenterId) {
      throw APIError.notFound("Market Center not found");
    }

    await prisma.survey.create({
      data: {
        ticketId: req.ticketId,
        surveyorId: req.surveyorId,
        assigneeId: ticket?.assigneeId ?? null,
        marketCenterId: marketCenterId,
      },
    });

    return { success: true };
  }
);
