import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
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
    await prisma.notificationTemplate.deleteMany({});
    await prisma.notificationTemplate.createMany({
      data: notificationTemplatesDefault,
    });

    return { success: true };
  }
);
