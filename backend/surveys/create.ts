import { api, APIError } from "encore.dev/api";
import {
  ticketRepository,
  surveyRepository,
  userRepository,
} from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import type { UsersToNotify } from "../notifications/types";

export interface CreateSurveyRequest {
  ticketId: string;
  surveyorId: string;
  marketCenterId?: string;
}

export interface CreateSurveyResponse {
  success: boolean;
  usersToNotify: UsersToNotify[];
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

    const ticket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!ticket) {
      throw APIError.notFound("Ticket not found");
    }

    const surveyorId = req.surveyorId ?? ticket?.creator?.id; // should be the same id

    const surveyor = await userRepository.findById(surveyorId);

    if (!surveyor) {
      throw APIError.notFound("Surveyor not found");
    }

    if (surveyor.role !== "AGENT") {
      throw APIError.invalidArgument("Surveyor must be an agent");
    }

    const marketCenterId =
      req?.marketCenterId ||
      ticket?.assignee?.marketCenterId ||
      ticket?.category?.marketCenterId ||
      ticket?.creator?.marketCenterId ||
      surveyor?.marketCenterId ||
      null;

    if (!marketCenterId) {
      throw APIError.notFound("Market Center not found");
    }

    await surveyRepository.findOrCreate({
      ticketId: req.ticketId,
      surveyorId: req.surveyorId,
      assigneeId: ticket?.assigneeId ?? null,
      marketCenterId: marketCenterId,
    });

    const usersToNotify: UsersToNotify[] = [];

    if (ticket?.creator && ticket?.creator?.id) {
      usersToNotify.push({
        id: ticket.creator.id,
        name: ticket.creator.name || "",
        email: ticket.creator.email,
        updateType: "ticketSurvey",
      });
    }

    return { success: true, usersToNotify: usersToNotify };
  }
);
