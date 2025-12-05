import { api, APIError } from "encore.dev/api";
import { db } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";

export interface UpdateNotificationTemplateRequest {
  id: string;
  subject?: string;
  body?: string;
}

export interface UpdateNotificationTemplateResponse {
  success: boolean;
}

interface NotificationTemplateRow {
  id: string;
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

    const existingTemplate = await db.queryRow<NotificationTemplateRow>`
      SELECT id FROM notification_templates
      WHERE id = ${req.id}
    `;

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

    // Build dynamic UPDATE query
    const updates: string[] = ['is_default = false'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updatedData.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(updatedData.subject);
    }

    if (updatedData.body !== undefined) {
      updates.push(`body = $${paramIndex++}`);
      values.push(updatedData.body);
    }

    values.push(req.id);

    const sql = `
      UPDATE notification_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.rawExec(sql, ...values);

    return { success: true };
  }
);
