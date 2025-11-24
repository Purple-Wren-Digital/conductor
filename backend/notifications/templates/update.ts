import { api, APIError } from "encore.dev/api";
import { prisma } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";

export interface UpdateNotificationTemplateRequest {
  id: string;
  subject?: string;
  body?: string;
}

export interface UpdateNotificationTemplateResponse {
  success: boolean;
}

export const updateNotificationTemplate = api<
  UpdateNotificationTemplateRequest,
  UpdateNotificationTemplateResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/notifications/templates/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext || userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Insufficient permissions to update notification templates"
      );
    }
    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: req.id },
    });

    if (!existingTemplate) {
      throw APIError.notFound("Notification template not found");
    }
    let updatedData: Partial<{
      subject: string;
      body: string;
    }> = {};

    if (req.subject !== undefined) {
      updatedData.subject = req.subject;
    }

    if (req.body !== undefined) {
      updatedData.body = req.body;
    }
    if (Object.keys(updatedData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }
    const updatedTemplate = await prisma.notificationTemplate.update({
      where: { id: req.id },
      data: {
        ...updatedData,
        isDefault: false,
      },
    });

    return { success: true };
  }
);
