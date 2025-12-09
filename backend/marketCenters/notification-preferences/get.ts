import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../../shared/repositories/market-center.repository";
import type { MarketCenterNotificationPreferences } from "../../settings/types";

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

    const notificationPreferences: MarketCenterNotificationPreferences[] =
      mc?.settings?.notificationPreferences &&
      mc?.settings?.notificationPreferences.length > 0
        ? mc.settings.notificationPreferences
        : [];

    console.log(
      "Returning notification preferences:",
      `${mc?.settings?.notificationPreferences ? mc?.settings?.notificationPreferences.length : 0} existing`,
      notificationPreferences
    );

    return { notificationPreferences: notificationPreferences };
  }
);
