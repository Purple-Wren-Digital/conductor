import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { getUserContext } from "../../auth/user-context";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";
import { canModifyTicketTemplate } from "../../auth/permissions";
import { Urgency } from "../types";
import { Todo } from "../../todos/types";
import { user } from "~encore/clients";

export interface GetTemplateRequest {
  templateId: string;
  isActive: boolean;
  templateName: string;
  templateDescription: string;
  selectedMarketCenter: string;
  categoryId: string;
  urgency: Urgency;
  ticketTitle: string;
  ticketTemplateDescription: string;
  ticketTemplateTodos: string[];
}

export const updateTemplate = api<GetTemplateRequest, TicketTemplate>(
  {
    expose: true,
    method: "PUT",
    path: "/ticket-templates/template/:templateId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const existingTemplate = await ticketTemplateRepository.findById(
      req.templateId
    );

    if (!existingTemplate) {
      throw APIError.notFound("Template not found");
    }

    const canModify = await canModifyTicketTemplate(
      userContext,
      existingTemplate?.marketCenterId
    );

    if (!canModify) {
      throw APIError.permissionDenied(
        "You do not have permission to access this template"
      );
    }

    const updates: Partial<TicketTemplate> = {
      isActive: req.isActive,
      name: req.templateName,
      description: req.templateDescription,
      marketCenterId: req.selectedMarketCenter,
      categoryId: req.categoryId,
      urgency: req.urgency,
      title: req.ticketTitle,
      ticketDescription: req.ticketTemplateDescription,
      todos: req.ticketTemplateTodos,
    };

    const updatedTemplate = await ticketTemplateRepository.update(
      req.templateId,
      updates,
      userContext.userId
    );

    if (!updatedTemplate) {
      throw APIError.internal("Failed to update template");
    }

    return updatedTemplate;
  }
);
