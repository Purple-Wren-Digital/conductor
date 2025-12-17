import { api, APIError, Query } from "encore.dev/api";
import {
  db,
  fromTimestamp,
  fromJson,
  subscriptionRepository,
} from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type {
  NotificationTemplate,
  NotificationCategory,
  NotificationChannel,
  MarketCenterDefaultTemplates,
} from "../types";
import type { MarketCenter } from "../../marketCenters/types";

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
  type: string;
  channel: NotificationChannel;
  is_default: boolean;
  created_at: Date;
  variables: any;
  is_active: boolean;
  market_center_id: string | null;
  market_center: MarketCenter;
  market_center_default_templates: MarketCenterDefaultTemplates[] | undefined;
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
    const userContext = await getUserContext();

    const accessibleMarketCenterIds =
      userContext.role === "ADMIN"
        ? await subscriptionRepository.getAccessibleMarketCenterIds(
            userContext.marketCenterId
          )
        : userContext.marketCenterId
          ? [userContext.marketCenterId]
          : [];

    if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
      throw APIError.permissionDenied(
        "User does not have access to any market centers."
      );
    }

    const templates = await db.queryAll<NotificationTemplateRow>`
      SELECT *
      FROM notification_templates
      WHERE market_center_id = ANY(${accessibleMarketCenterIds})
      ORDER BY template_name ASC
    `;

    const formattedTemplates: NotificationTemplate[] = templates.map((t) => ({
      id: t.id,
      templateName: t.template_name,
      templateDescription: t.template_description,
      subject: t.subject ?? "",
      body: t.body,
      category: t.category,
      channel: t.channel,
      type: t.type,
      isDefault: t.is_default,
      createdAt: fromTimestamp(t.created_at)!,
      variables: fromJson(t.variables) ?? undefined,
      isActive: t.is_active,
      marketCenterId: t.market_center_id,
      marketCenterDefaultTemplates: t.market_center_default_templates,
    }));

    return {
      templates: formattedTemplates ?? [],
    };
  }
);
