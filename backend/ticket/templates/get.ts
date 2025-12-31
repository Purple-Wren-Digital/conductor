import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { getUserContext } from "../../auth/user-context";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";
import { canModifyTicketTemplate } from "../../auth/permissions";

export interface GetTemplateRequest {
  templateId: string;
}

export const getTemplateById = api<GetTemplateRequest, TicketTemplate>(
  {
    expose: true,
    method: "GET",
    path: "/ticket-templates/template/:templateId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const template = await ticketTemplateRepository.findById(req.templateId);

    if (!template) {
      throw APIError.notFound("Template not found");
    }

    const canModify = await canModifyTicketTemplate(
      userContext,
      template?.marketCenterId
    );

    if (!canModify) {
      throw APIError.permissionDenied(
        "You do not have permission to access this template"
      );
    }

    return template;
  }
);
