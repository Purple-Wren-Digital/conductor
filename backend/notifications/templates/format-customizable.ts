import { api, APIError } from "encore.dev/api";
import {
  db,
  fromTimestamp,
  fromJson,
  userRepository,
  marketCenterRepository,
} from "../../ticket/db";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationContent,
  CreateNotificationPayload,
  NotificationTemplate,
} from "../types";
import { MarketCenterNotificationPreferences } from "../../settings";
import { defaultMarketCenterNotificationPreferences } from "../../marketCenters/notification-preferences/utils";
import {
  formatNotificationWithTemplate,
  notificationTemplatesDefault,
} from "./utils";
import {
  emailTemplateCustomizationRepository,
  inAppTemplateCustomizationRepository,
} from "./customization-repository";
import { CustomizableTemplateType } from "./customization-types";

export interface FormatNotificationRequest {
  templateName: string;
  type:
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
  formattedNotification: CreateNotificationPayload | null;
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
    path: "/notifications/templates/format/:templateName",
    auth: false,
  },
  async (req) => {
    if (
      !req.type ||
      !req.templateName ||
      !req.content ||
      !req?.content?.receivingUser
    ) {
      throw APIError.invalidArgument("Missing required fields");
    }

    const foundUser = await userRepository.findByIdWithSettings(
      req?.content?.receivingUser.id
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
        preference.type === req.type;
      });

    const marketCenterTypeSettings = marketCenterNotificationPreferences.find(
      (preference) => {
        preference.type === req.type;
      }
    );
    const emailEnabled =
      (marketCenterTypeSettings?.email ?? true) &&
      (userTypeSettings?.email ?? true);

    const inAppEnabled =
      (marketCenterTypeSettings?.inApp ?? true) &&
      (userTypeSettings?.inApp ?? true);

    if (!emailEnabled && !inAppEnabled) {
      return {
        formattedNotification: {
          userId: foundUser.id,
          category: userTypeSettings?.category || "General",
          type: req.type,
          email: "Notifications deactivated",
          inApp: "Notifications deactivated",
        } as CreateNotificationPayload,
      };
    }

    // Handle customizable templates
    const customizableTemplateType = req.type
      .toLowerCase()
      .split(" ")
      .join("_");

    let formattedNotification: CreateNotificationPayload | null = null;
    let notificationInAppTemplate: NotificationTemplate | null = null;
    let notificationEmailTemplate: NotificationTemplate | null = null;

    // In-app template
    const defaultInAppTemplate = await db.queryRow<NotificationTemplateRow>`
          SELECT * FROM notification_templates
          WHERE template_name = ${req.templateName}
          AND market_center_id = ${foundUser.marketCenterId}
        `;
    if (inAppEnabled && foundUser?.marketCenterId) {
      const customInAppTemplate =
        await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
          foundUser.marketCenterId,
          customizableTemplateType as CustomizableTemplateType
        );
      if (customInAppTemplate && customInAppTemplate.isActive) {
        notificationInAppTemplate = {
          id: customInAppTemplate.id,
          templateName: req.templateName,
          templateDescription: "",
          channel: "IN_APP",
          type: req.type,
          category: "ACTIVITY",
          subject: customInAppTemplate.title,
          body: customInAppTemplate.body,
          isDefault: false,
          createdAt: customInAppTemplate.createdAt,
          variables:
            defaultInAppTemplate?.variables ??
            notificationTemplatesDefault.find((t) => t.type === req.type)
              ?.variables,
          isActive: customInAppTemplate.isActive,
          marketCenterId: foundUser.marketCenterId,
          marketCenterDefaultTemplates: [],
        };
      }

      if (
        defaultInAppTemplate &&
        (!customInAppTemplate || !customInAppTemplate.isActive)
      ) {
        notificationInAppTemplate =
          convertRowToNotificationTemplate(defaultInAppTemplate);
      }
    }
    if (inAppEnabled && !notificationInAppTemplate) {
      const fallbackInAppTemplate = notificationTemplatesDefault.find(
        (t) => t.type === req.type
      );
      if (!fallbackInAppTemplate) {
        throw APIError.notFound(
          `${req.type} IN_APP Notification Template not found`
        );
      }
      notificationInAppTemplate = {
        id: `default-${fallbackInAppTemplate.templateName}`,
        templateName: fallbackInAppTemplate.templateName,
        templateDescription: fallbackInAppTemplate.templateDescription,
        subject: fallbackInAppTemplate.subject,
        body: fallbackInAppTemplate.body,
        category: fallbackInAppTemplate.category,
        channel: fallbackInAppTemplate.channel,
        isDefault: fallbackInAppTemplate.isDefault,
        isActive: fallbackInAppTemplate.isActive,
        variables: fallbackInAppTemplate?.variables,
        createdAt: new Date(),
        marketCenterId: null,
        marketCenterDefaultTemplates: [],
      };
    }

    // Email template
    const defaultEmailTemplate = await db.queryRow<NotificationTemplateRow>`
          SELECT * FROM notification_templates
          WHERE template_name = ${req.templateName}
          AND market_center_id = ${foundUser.marketCenterId}
        `;
    if (emailEnabled && foundUser?.marketCenterId) {
      const customEmailTemplate =
        await emailTemplateCustomizationRepository.findByMarketCenterAndType(
          foundUser.marketCenterId,
          customizableTemplateType as CustomizableTemplateType
        );
      if (customEmailTemplate && customEmailTemplate.isActive) {
        notificationEmailTemplate = {
          id: customEmailTemplate.id,
          templateName: req.templateName,
          templateDescription: "",
          channel: "EMAIL",
          type: req.type,
          category: "ACTIVITY",
          subject: customEmailTemplate.subject,
          body: customEmailTemplate.mainMessage,
          isDefault: false,
          createdAt: customEmailTemplate.createdAt,
          variables:
            defaultEmailTemplate?.variables ??
            notificationTemplatesDefault.find((t) => t.type === req.type)
              ?.variables,
          isActive: customEmailTemplate.isActive,
          marketCenterId: foundUser.marketCenterId,
          marketCenterDefaultTemplates: [],
        };
      }

      if (
        defaultEmailTemplate &&
        (!customEmailTemplate || !customEmailTemplate.isActive)
      ) {
        notificationEmailTemplate =
          convertRowToNotificationTemplate(defaultEmailTemplate);
      }
    }
    if (emailEnabled && !notificationEmailTemplate) {
      const fallbackEmailTemplate = notificationTemplatesDefault.find(
        (t) => t.type === req.type
      );

      if (!fallbackEmailTemplate) {
        throw APIError.notFound(
          `${req.type} EMAIL Notification Template not found`
        );
      }

      notificationEmailTemplate = {
        id: `default-${fallbackEmailTemplate.templateName}`,
        templateName: fallbackEmailTemplate.templateName,
        templateDescription: fallbackEmailTemplate.templateDescription,
        subject: fallbackEmailTemplate.subject,
        body: fallbackEmailTemplate.body,
        category: fallbackEmailTemplate.category,
        channel: fallbackEmailTemplate.channel,
        isDefault: fallbackEmailTemplate.isDefault,
        isActive: fallbackEmailTemplate.isActive,
        variables: fallbackEmailTemplate.variables,
        createdAt: new Date(),
        marketCenterId: null,
        marketCenterDefaultTemplates: [],
      };
    }

    // Format the notification with the found templates/lack thereof
    formattedNotification = formatNotificationWithTemplate({
      content: req.content,
      template: {
        email: notificationEmailTemplate,
        inApp: notificationInAppTemplate,
      },
    });

    return {
      formattedNotification,
    };
  }
);
