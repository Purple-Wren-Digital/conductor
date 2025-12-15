import { api, APIError, Query } from "encore.dev/api";
import { db, toJson } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import { notificationTemplatesDefault } from "./utils";

export interface ResetNotificationTemplateRequest {
  templateId: string;
}

export interface ResetNotificationTemplateResponse {
  success: boolean;
}

interface NotificationTemplateRow {
  id: string;
  type: string;
  template_name: string;
}

export const resetNotificationTemplate = api<
  ResetNotificationTemplateRequest,
  ResetNotificationTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/templates/reset/:templateId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext || userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Insufficient permissions to reset notification templates"
      );
    }

    if (!req?.templateId) {
      throw APIError.invalidArgument("Template ID is required");
    }

    const templateToReset = await db.queryRow<NotificationTemplateRow>`
      SELECT id, type, template_name FROM notification_templates
      WHERE id = ${req.templateId}
    `;

    if (!templateToReset) {
      throw APIError.notFound("Notification template not found");
    }
    // TODO: Update with defaults

    const defaultTemplate = notificationTemplatesDefault.find(
      (template) =>
        template.templateName === templateToReset?.template_name &&
        template.type === templateToReset?.type
    );
    if (!defaultTemplate) {
      throw APIError.invalidArgument("No default template found for this type");
    }

    const updates = [
      `subject = $1`,
      `body = $2`,
      `is_default = $3`,
      `is_active = $4`,
    ];
    const values: any[] = [
      defaultTemplate.subject,
      defaultTemplate.body,
      defaultTemplate.isDefault,
      defaultTemplate.isActive,
      req.templateId,
    ];

    const paramIndex = 5;

    const sql = `
      UPDATE notification_templates
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `;

    await db.rawExec(sql, ...values);

    return { success: true };
  }
);
