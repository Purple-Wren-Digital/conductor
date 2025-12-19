import { api, APIError } from "encore.dev/api";
import {
  db,
  fromTimestamp,
  fromJson,
  userRepository,
  marketCenterRepository,
} from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationContent,
  CreateNotificationPayload,
  NotificationTemplate,
} from "../types";
import { MarketCenterNotificationPreferences } from "../../settings";
import { defaultMarketCenterNotificationPreferences } from "../../marketCenters/notification-preferences/utils";
import {
  formatNotificationWithoutTemplate,
  formatNotificationWithTemplate,
} from "./utils";

export interface FormatNotificationRequest {
  id: string; // templateName
  type:
    | "App Permissions"
    | "Invitation"
    | "Account Information"
    | "Ticket Created"
    | "Ticket Updated"
    | "Ticket Assignment"
    | "Mentions"
    | "New Comments"
    | "Market Center Assignment"
    | "Category Assignment"
    | "Ticket Survey"
    | "Ticket Survey Results";
  content: NotificationContent;
}

export interface FormatNotificationResponse {
  formattedNotification: CreateNotificationPayload;
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
  is_active: boolean;
  market_center_id: string | null;
}

const convertRowToNotificationTemplate = (
  row: NotificationTemplateRow
): NotificationTemplate => {
  return {
    id: row.id,
    templateName: row.template_name,
    templateDescription: row.template_description,
    subject: row.subject ?? row.template_name,
    body: row.body,
    category: row.category,
    channel: row.channel,
    isDefault: row.is_default,
    createdAt: fromTimestamp(row.created_at)!,
    variables: fromJson(row.variables) ?? undefined,
    isActive: row.is_active,
    marketCenterId: row.market_center_id,
    marketCenterDefaultTemplates: [],
  };
};

export const format = api<
  FormatNotificationRequest,
  FormatNotificationResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/templates/format/:id",
    auth: false,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!req.type || !req.id || !req.content) {
      throw APIError.invalidArgument("Missing required fields");
    }

    const foundUser = await userRepository.findByIdWithSettings(
      userContext.userId
    );

    if (
      !foundUser ||
      !foundUser.isActive ||
      !foundUser?.id ||
      !foundUser?.clerkId
    ) {
      throw APIError.notFound("User not found");
    }

    let marketCenterNotificationPreferences: MarketCenterNotificationPreferences[] =
      defaultMarketCenterNotificationPreferences;

    if (foundUser?.marketCenterId) {
      const mc = await marketCenterRepository.findById(
        foundUser.marketCenterId
      );
      if (mc && mc?.settings && mc?.settings?.notificationPreferences) {
        marketCenterNotificationPreferences =
          mc.settings.notificationPreferences;
      } else {
        marketCenterNotificationPreferences =
          defaultMarketCenterNotificationPreferences;
      }
    }

    const userTypeSettings =
      foundUser.userSettings?.notificationPreferences?.find((preference) => {
        if (req.type === "Invitation") true;
        preference.type === req.type;
      });

    const marketCenterTypeSettings = marketCenterNotificationPreferences.find(
      (preference) => {
        if (req.type === "Invitation") true;
        preference.type === req.type;
      }
    );

    if (
      userTypeSettings &&
      !userTypeSettings.inApp &&
      marketCenterTypeSettings &&
      !marketCenterTypeSettings.inApp
    ) {
      throw APIError.permissionDenied(
        "Notifications of this type are disabled for the user or market center"
      );
    }
    const notificationTemplateRow = await db.queryRow<NotificationTemplateRow>`
        SELECT * FROM notification_templates
        WHERE template_name = ${req.id}
        AND is_active = true
        AND market_center_id = ${userContext.marketCenterId}
      `;

    if (!notificationTemplateRow) {
      throw APIError.notFound("Notification Template not found");
    }
    const notificationTemplate: NotificationTemplate =
      convertRowToNotificationTemplate(notificationTemplateRow);

    let formattedNotification: CreateNotificationPayload | null = null;

    if (
      req?.type === "App Permissions" ||
      req?.type === "Invitation" ||
      req?.type === "Account Information"
    ) {
      formattedNotification = formatNotificationWithoutTemplate(req.content);
    }

    if (
      req?.type === "Market Center Assignment" ||
      req?.type === "Category Assignment" ||
      req?.type === "Ticket Created" ||
      req?.type === "Ticket Assignment" ||
      req?.type === "Ticket Updated" ||
      req?.type === "New Comments" ||
      req?.type === "Ticket Survey" ||
      req?.type === "Ticket Survey Results"
    ) {
      formattedNotification = formatNotificationWithTemplate(
        req.content,
        notificationTemplate
      );
    }
    if (!formattedNotification) {
      throw APIError.internal("Failed to format notification");
    }
    return { formattedNotification };
  }
);
