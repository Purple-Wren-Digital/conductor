import { api, APIError } from "encore.dev/api";
import { db, marketCenterRepository } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type { MarketCenterNotificationPreferences } from "../../settings/types";

export interface UpdateNotificationTemplateRequest {
  templateId: string;
  subject?: string;
  body?: string;
  isActive?: boolean;
}

export interface UpdateNotificationTemplateResponse {
  success: boolean;
}

interface NotificationTemplateRow {
  id: string;
  market_center_id: string | null;
  type: string;
  isActive: boolean;
  subject: string;
  body: string;
}

export const updateNotificationTemplate = api<
  UpdateNotificationTemplateRequest,
  UpdateNotificationTemplateResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/notifications/templates/update",
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
      SELECT id, market_center_id, type, is_active, subject, body FROM notification_templates
      WHERE id = ${req.templateId}
    `;

    if (!existingTemplate) {
      throw APIError.notFound("Notification template not found");
    }

    let updatedData: Partial<{
      subject: string;
      body: string;
      isActive: boolean;
    }> = {};

    if (req.subject !== undefined && req.subject !== existingTemplate.subject) {
      updatedData.subject = req.subject;
    }

    if (req.body !== undefined && req.body !== existingTemplate.body) {
      updatedData.body = req.body;
    }

    if (
      req.isActive !== undefined &&
      req.isActive !== existingTemplate.isActive
    ) {
      updatedData.isActive = req.isActive;
    }

    if (Object.keys(updatedData).length === 0) {
      throw APIError.invalidArgument("No fields to update");
    }

    // Build dynamic UPDATE query
    const updates: string[] = ["is_default = false"];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.subject !== undefined && req.subject !== existingTemplate.subject) {
      updates.push(`subject = $${paramIndex}`);
      values.push(req.subject);
      paramIndex++;
    }

    if (req.body !== undefined && req.body !== existingTemplate.body) {
      updates.push(`body = $${paramIndex}`);
      values.push(req.body);
      paramIndex++;
    }

    if (
      req.isActive !== undefined &&
      req.isActive !== existingTemplate.isActive
    ) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(req.isActive);
      paramIndex++;
      // Also update market center notification preferences accordingly
      const marketCenterId = existingTemplate.market_center_id;
      if (!marketCenterId) {
        throw APIError.invalidArgument(
          "Notification template is not associated with a market center"
        );
      }

      const mc = await marketCenterRepository.findById(marketCenterId);
      if (!mc) {
        throw APIError.notFound("Associated market center not found");
      }

      const notificationPreferences: MarketCenterNotificationPreferences[] =
        mc?.settings?.notificationPreferences &&
        mc?.settings?.notificationPreferences.length > 0
          ? mc.settings.notificationPreferences
          : [];

      const updatedPreferences = notificationPreferences.map((pref) => {
        if (
          req.isActive !== undefined &&
          pref.type === existingTemplate.type &&
          pref.inApp !== req.isActive
        ) {
          return {
            ...pref,
            inApp: req.isActive,
          };
        } else {
          return pref;
        }
      });

      if (updatedPreferences) {
        await marketCenterRepository.update(marketCenterId, {
          settings: {
            ...mc.settings,
            notificationPreferences: updatedPreferences,
          },
        });
      }
    }

    values.push(req.templateId);

    const sql = `
      UPDATE notification_templates
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
    `;

    await db.rawExec(sql, ...values);

    return { success: true };
  }
);
