import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../db";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";

export interface GetTemplatesRequest {
  marketCenterId: string;
}

export interface GetTemplatesResponse {
  templates: TicketTemplate[];
}

export const getTemplates = api<GetTemplatesRequest, GetTemplatesResponse>(
  {
    expose: true,
    method: "GET",
    path: "/ticket-templates/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (!req.marketCenterId) {
      throw new Error("marketCenterId is required");
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    const ticketTemplates =
      await ticketTemplateRepository.findAllByMarketCenter(req.marketCenterId);

    return { templates: ticketTemplates };
  }
);
