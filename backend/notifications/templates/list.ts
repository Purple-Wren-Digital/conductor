import { api, APIError, Query } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type { NotificationData, NotificationTemplate } from "../types";

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
    // const userContext =
    // if (userContext?.role !== "ADMIN") {
    //   throw APIError.permissionDenied(
    //     "You do not have permission to access notification templates"
    //   );
    // }

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
