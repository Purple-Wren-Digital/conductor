import { api, APIError } from "encore.dev/api";
import { db, toJson } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import {
  notificationTemplatesDefault,
  NotificationTemplateVariables,
} from "./utils";
import { NotificationCategory, NotificationChannel } from "../types";

export interface ResetAllNotificationTemplateResponse {
  success: boolean;
}

export const resetNotificationTemplate = api(
  {
    expose: true,
    method: "POST",
    path: "/notifications/templates/reset-all",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext || userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Insufficient permissions to create notification templates"
      );
    }

    // Reset all templates to default
    await db.exec`DELETE FROM notification_templates`;

    // Insert default templates one by one
    for (const template of notificationTemplatesDefault) {
      await db.exec`
        INSERT INTO notification_templates (
          id, template_name, template_description, subject, body, category, channel, is_default, created_at, variables
        ) VALUES (
          gen_random_uuid()::text,
          ${template.templateName},
          ${template.templateDescription},
          ${template.subject ?? null},
          ${template.body},
          ${template.category},
          ${template.channel},
          ${template.isDefault},
          NOW(),
          ${toJson(template.variables)}::jsonb
        )
      `;
    }

    return { success: true };
  }
);
