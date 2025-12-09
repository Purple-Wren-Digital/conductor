import { api, APIError, Query } from "encore.dev/api";
import { db, toJson } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import { notificationTemplatesDefault } from "./utils";

export interface ResetNotificationTemplateRequest {
  templateIds?: string[];
  type: string;
  templateName: string;
}

export interface ResetNotificationTemplateResponse {
  success: boolean;
}

export const resetNotificationTemplate = api<
  ResetNotificationTemplateRequest,
  ResetNotificationTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/templates/reset",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext || userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Insufficient permissions to reset notification templates"
      );
    }

    if (!req?.templateIds || !req?.templateIds.length) {
      throw APIError.invalidArgument("At least template IDs are required");
    }

    const templateToReset = notificationTemplatesDefault.find(
      (t) =>
        t.templateName === req.templateName &&
        t.channel.toLowerCase() === req.type.toLowerCase()
    );

    if (!templateToReset) {
      throw APIError.notFound(
        "Default template not found for the specified type and name"
      );
    }

    await Promise.all(
      req.templateIds.map(async (templateId) => {
        await db.exec`
        UPDATE notification_templates
        SET
          template_description = ${templateToReset.templateDescription ?? ""},
          subject = ${templateToReset.subject ?? null},
          body = ${templateToReset.body},
          category = ${templateToReset.category},
          channel = ${templateToReset.channel},
          is_default = ${templateToReset.isDefault ?? true},
          variables = ${toJson(templateToReset.variables)}::jsonb,
          created_at = NOW()
        WHERE id = ${templateId}
      `;
      })
    );

    return { success: true };
  }
);
