import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import { NotificationTemplate } from "../types";

export interface GetNotificationTemplateRequest {
  id: string;
}

export interface GetNotificationTemplateResponse {
  notificationTemplate: NotificationTemplate;
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

    const notificationTemplate = await prisma.notificationTemplate.findUnique({
      where: {
        templateName: req.id,
      },
    });
    if (!notificationTemplate) {
      throw APIError.notFound("Notification Template not found");
    }

    return {
      notificationTemplate: notificationTemplate,
    };
  }
);
