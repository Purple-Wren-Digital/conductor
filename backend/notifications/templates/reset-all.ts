import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import {
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
      data: [
        {
          templateName: "Market Center User Added",
          templateDescription: "Sent when a user is added to a Market Center",
          category: "ACTIVITY" as NotificationCategory,
          channel: "IN_APP" as NotificationChannel,
          type: "Market Center Assignment",
          subject: "Market Center Assignment",
          body: `{{editorName}} added you to {{marketCenterName}}`,
          isDefault: true,
          variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
        },
        {
          templateName: "Market Center User Removed",
          templateDescription:
            "Sent when a user is removed from a Market Center",
          category: "ACTIVITY" as NotificationCategory,
          channel: "IN_APP" as NotificationChannel,
          type: "Market Center Assignment",
          subject: "Market Center Assignment",
          body: `{{editorName}} removed you from {{marketCenterName}}`,
          isDefault: true,
          variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
        },
      ],
    });

    return { success: true };
  }
);
