import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../auth/user-context";
import { db } from "../../ticket/db";
import { marketCenterRepository } from "../../shared/repositories/market-center.repository";
import type {
  MarketCenterSettings,
  MarketCenterNotificationPreferences,
} from "../../settings/types";

interface MarketCenterRow {
  id: string;
  name: string;
  settings?: MarketCenterSettings;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateMCNotificationPreferencesRequest {
  marketCenterId: string;
  updatedPreferences: MarketCenterNotificationPreferences[];
}

export interface UpdateMCNotificationPreferencesResponse {
  success: boolean;
}

export const updateMCNotificationPreferences = api<
  UpdateMCNotificationPreferencesRequest,
  UpdateMCNotificationPreferencesResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/settings/market-center/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const mc = await marketCenterRepository.findById(req.marketCenterId);
    if (!mc) throw new Error("Market center not found");

    if (!userContext?.role || userContext?.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "Only administrators can update market center notification preferences"
      );
    }

    if (!req?.updatedPreferences || !req?.updatedPreferences.length) {
      throw APIError.invalidArgument("No updated preferences provided");
    }

    const mcRawRow = await db.queryRow<MarketCenterRow>`
      SELECT * FROM market_centers WHERE id = ${req.marketCenterId}
    `;
    if (!mcRawRow) throw new Error("Market center not found");

    const existingSettings: MarketCenterSettings = mcRawRow.settings ?? {};

    const newSettings: MarketCenterSettings = {
      ...existingSettings,
      notificationPreferences: req.updatedPreferences,
    };

    const result = await marketCenterRepository.update(req.marketCenterId, {
      settings: newSettings,
    });

    console.log("Updated notification pref for MC:", result);

    return { success: true };
  }
);
