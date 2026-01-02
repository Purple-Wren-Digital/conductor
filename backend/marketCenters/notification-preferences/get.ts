import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../../shared/repositories/market-center.repository";
import type { MarketCenterNotificationPreferences } from "../../settings/types";
import { defaultMarketCenterNotificationPreferences } from "./utils";

export interface GetMarketCenterNotificationPreferencesRequest {
  marketCenterId: string;
}

export interface GetMarketCenterNotificationPreferencesResponse {
  notificationPreferences: MarketCenterNotificationPreferences[];
}

export const getMCNotificationPreferences = api<
  GetMarketCenterNotificationPreferencesRequest,
  GetMarketCenterNotificationPreferencesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/settings/market-center/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.role || userContext?.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Only administrators can view market center notification preferences"
      );
    }

    const mc = await marketCenterRepository.findById(req.marketCenterId);
    if (!mc) throw new Error("Market center not found");

    let notificationPreferences: MarketCenterNotificationPreferences[] = [];

    if (
      mc.settings &&
      mc.settings.notificationPreferences &&
      mc?.settings?.notificationPreferences.length > 0
    ) {
      notificationPreferences = mc.settings.notificationPreferences;
    } else {
      const marketCenterUpdated = await marketCenterRepository.update(
        req.marketCenterId,
        {
          settings: {
            ...mc.settings,
            notificationPreferences: defaultMarketCenterNotificationPreferences,
          },
        }
      );
      if (
        marketCenterUpdated?.settings &&
        marketCenterUpdated?.settings?.notificationPreferences &&
        marketCenterUpdated.settings.notificationPreferences.length > 0
      ) {
        notificationPreferences =
          marketCenterUpdated.settings.notificationPreferences;
      }
    }
    if (!notificationPreferences || notificationPreferences.length === 0) {
      throw new Error("Notification preferences not found");
    }

    return { notificationPreferences: notificationPreferences };
  }
);
