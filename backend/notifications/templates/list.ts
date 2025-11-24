import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type { NotificationTemplate } from "../types";

export interface ListNotificationTemplatesRequest {
  templateName?: Query<string>;
}

export interface ListNotificationTemplatesResponse {
  templates: NotificationTemplate[];
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

    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { templateName: "asc" },
    });

    const formattedTemplates: NotificationTemplate[] = templates.map((t) => ({
      ...t,
      subject: t?.subject ?? null,
      data: null,
    }));

    return {
      templates: formattedTemplates ?? [],
    };
  }
);
