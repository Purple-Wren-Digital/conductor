import { api, APIError, Query } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type { NotificationTemplate, NotificationCategory, NotificationChannel } from "../types";

export interface ListNotificationTemplatesRequest {
  templateName?: Query<string>;
}

export interface ListNotificationTemplatesResponse {
  templates: NotificationTemplate[];
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
}

export const listTemplates = api<
  ListNotificationTemplatesRequest,
  ListNotificationTemplatesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/templates",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    const templates = await db.queryAll<NotificationTemplateRow>`
      SELECT * FROM notification_templates
      ORDER BY template_name ASC
    `;

    const formattedTemplates: NotificationTemplate[] = templates.map((t) => ({
      id: t.id,
      templateName: t.template_name,
      templateDescription: t.template_description,
      subject: t.subject ?? null,
      body: t.body,
      category: t.category,
      channel: t.channel,
      isDefault: t.is_default,
      createdAt: fromTimestamp(t.created_at)!,
      variables: fromJson(t.variables) ?? undefined,
      data: null,
    }));

    return {
      templates: formattedTemplates ?? [],
    };
  }
);
