import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { marketCenterRepository } from "../../shared/repositories/market-center.repository";
import { defaultMarketCenterNotificationPreferences } from "./utils";

export interface CreateMCNotificationPreferencesRequest {
  marketCenterId: string;
}

export interface CreateMCNotificationPreferencesResponse {
  success: boolean;
}

export const createMCNotificationPreferences = api<
  CreateMCNotificationPreferencesRequest,
  CreateMCNotificationPreferencesResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/settings/market-center/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.role || userContext?.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Only administrators can create market center notification preferences"
      );
    }

    const mc = await marketCenterRepository.findById(req.marketCenterId);
    if (!mc) throw new Error("Market center not found");

    const settings = await marketCenterRepository.update(req.marketCenterId, {
      settings: {
        ...mc.settings,
        notificationPreferences: defaultMarketCenterNotificationPreferences,
      },
    });

    return { success: true };
  }
);
