import { api, APIError } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../db";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";
import { Urgency } from "../types";

export interface DeleteTemplatesRequest {
  templateId: string;
}

export interface DeleteTemplatesResponse {
  success: boolean;
}
export const deleteTemplate = api<
  DeleteTemplatesRequest,
  DeleteTemplatesResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/ticket-templates/delete/:templateId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const template = await ticketTemplateRepository.findById(req.templateId);
    if (!template) {
      throw APIError.notFound("Template not found");
    }
    const canDeleteTicketTemplate =
      userContext.role === "ADMIN" ||
      (userContext.role === "STAFF_LEADER" &&
        template.marketCenterId === userContext.marketCenterId);

    if (!canDeleteTicketTemplate) {
      throw APIError.permissionDenied(
        "You do not have permission to delete this template"
      );
    }
    await ticketTemplateRepository.delete(req.templateId);

    return { success: true };
  }
);
