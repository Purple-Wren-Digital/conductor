import { api, APIError } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import {
  NotificationTemplate,
  NotificationCategory,
  NotificationChannel,
} from "../types";

export interface GetNotificationTemplateRequest {
  id: string;
}

export interface GetNotificationTemplateResponse {
  notificationTemplate: NotificationTemplate;
}

interface NotificationTemplateRow {
  id: string;
  template_name: string;
  template_description: string;
  subject: string | null;
  body: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  is_default: boolean;
  created_at: Date;
  variables: any;
  is_active: boolean;
  market_center_id: string | null;
}

export const get = api<
  GetNotificationTemplateRequest,
  GetNotificationTemplateResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/templates/:id",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    const notificationTemplate = await db.queryRow<NotificationTemplateRow>`
      SELECT * FROM notification_templates
      WHERE template_id = ${req.id}
    `;

    if (!notificationTemplate) {
      throw APIError.notFound("Notification Template not found");
    }

    return {
      notificationTemplate: {
        id: notificationTemplate.id,
        templateName: notificationTemplate.template_name,
        templateDescription: notificationTemplate.template_description,
        subject: notificationTemplate.subject ?? "",
        body: notificationTemplate.body,
        category: notificationTemplate.category,
        channel: notificationTemplate.channel,
        type: notificationTemplate.category, // Use category as type
        isDefault: notificationTemplate.is_default,
        createdAt: fromTimestamp(notificationTemplate.created_at)!,
        variables: fromJson(notificationTemplate.variables) ?? undefined,
        isActive: notificationTemplate.is_active,
        marketCenterId: notificationTemplate.market_center_id,
        marketCenterDefaultTemplates: [],
      },
    };
  }
);
