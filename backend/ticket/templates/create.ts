import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../db";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";
import { Urgency } from "../types";

export interface GetTemplatesRequest {
  marketCenterId: string;
  newTemplate?: {
    name: string;
    description?: string;
    isActive: boolean;
    title: string;
    ticketDescription: string;
    categoryId?: string;
    urgency?: Urgency;
    tags?: string[];
    todos?: string[];
  };
  //   newTemplates?: Partial<TicketTemplate[]>;
}

export interface GetTemplatesResponse {
  template: TicketTemplate; //[];
}
export const createTemplate = api<GetTemplatesRequest, GetTemplatesResponse>(
  {
    expose: true,
    method: "POST",
    path: "/ticket-templates/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (!req.newTemplate) {
      throw APIError.invalidArgument("No template provided to create");
    }
    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    const ticketTemplates =
      await ticketTemplateRepository.findAllByMarketCenter(req.marketCenterId);

    const existingTemplate = ticketTemplates.find(
      (template) => template.name === req.newTemplate?.name
    );

    if (existingTemplate) {
      throw APIError.alreadyExists("A template with this name already exists");
    }

    const createdTemplate = await ticketTemplateRepository.create(
      {
        name: req.newTemplate.name,
        description: req.newTemplate.description ?? undefined,
        isActive: req.newTemplate.isActive,
        title: req.newTemplate.title,
        ticketDescription: req.newTemplate.ticketDescription,
        categoryId: req.newTemplate.categoryId ?? undefined,
        urgency: req.newTemplate.urgency ?? undefined,
        tags: req.newTemplate.tags ?? [],
        todos: req.newTemplate.todos ?? [],
        marketCenterId: req.marketCenterId,
        createdById: userContext.userId,
        updatedById: userContext.userId,
      },
      userContext.userId
    );

    if (!createdTemplate) {
      throw APIError.internal("Failed to create ticket template");
    }
    return { template: createdTemplate };
  }
);
