import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { ticketTemplateRepository } from "../../shared/repositories/ticket.template.repository";
import { canModifyTicketTemplate } from "../../auth/permissions";

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
    const canDelete = await canModifyTicketTemplate(
      userContext,
      template?.marketCenterId
    );

    if (!canDelete) {
      throw APIError.permissionDenied(
        "You do not have permission to delete this template"
      );
    }
    await ticketTemplateRepository.delete(req.templateId);

    return { success: true };
  }
);
