import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { TICKET_TEMPLATES } from "./utils";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../db";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";

export interface GetTemplatesRequest {
  marketCenterId: string;

  categoryId?: string;
  isActive?: boolean;
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

    if (!ticketTemplates) {
      for (const template of TICKET_TEMPLATES) {
        const createdTemplates: TicketTemplate[] = [];
        const created = await ticketTemplateRepository.create(
          {
            name: template.name ?? "Untitled Template",
            description: template.description ?? undefined,
            isActive: template.isActive ?? true,
            title: template.title ?? "No Title",
            ticketDescription: template.ticketDescription ?? "No Description",
            tags: template.tags ?? [],
            todos: template.todos ?? [],
            urgency: template.urgency ?? undefined,
            categoryId: template.categoryId ?? undefined,
            marketCenterId: req.marketCenterId,
            createdById: userContext.userId,
            updatedById: userContext.userId,
          },
          userContext.userId
        );
        if (created) createdTemplates.push(created);
      }
      // return { templates: ticketTemplates };
    }

    return { templates: ticketTemplates };
  }
);
