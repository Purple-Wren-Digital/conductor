import { api, APIError } from "encore.dev/api";
import { userRepository, marketCenterRepository } from "../../ticket/db";
import { getUserContext } from "../../auth/user-context";
import type { NotificationContent, CreateNotificationPayload } from "../types";
import { MarketCenterNotificationPreferences } from "../../settings";
import { defaultMarketCenterNotificationPreferences } from "../../marketCenters/notification-preferences/utils";
import { formatNotificationWithoutTemplate } from "./utils";

export interface FormatNotificationRequest {
  templateName: string;
  type: "App Permissions" | "Invitation" | "Account Information";
  content: NotificationContent;
}

export interface FormatNotificationResponse {
  formattedNotification: CreateNotificationPayload | null;
}

export const formatStandard = api<
  FormatNotificationRequest,
  FormatNotificationResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/templates/format/standard/:templateName",
    auth: false,
  },
  async (req) => {
    if (
      !req.type ||
      !req.templateName ||
      !req.content ||
      !req?.content?.receivingUser ||
      !req?.content?.receivingUser?.id
    ) {
      throw APIError.invalidArgument("Missing required fields");
    }

    const foundUser = await userRepository.findByIdWithSettings(
      req.content.receivingUser.id
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

    const inAppEnabled =
      (marketCenterTypeSettings?.inApp ?? true) &&
      (userTypeSettings?.inApp ?? true);

    const emailEnabled =
      (marketCenterTypeSettings?.email ?? true) &&
      (userTypeSettings?.email ?? true);

    if (!inAppEnabled && !emailEnabled) {
      console.log(
        "All notifications of this type are disabled for the user or market center"
      );
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

    return {
      formattedNotification: formatNotificationWithoutTemplate(
        req.content,
        emailEnabled,
        inAppEnabled
      ),
    };
  }
);
