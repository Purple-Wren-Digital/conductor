import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import {
  marketCenterRepository,
  subscriptionRepository,
} from "../shared/repositories";
import type { AutoCloseSettings, MarketCenterSettings } from "./types";

const DEFAULT_AUTO_CLOSE_DAYS = 2;

export const defaultAutoCloseSettings: AutoCloseSettings = {
  enabled: true,
  awaitingResponseDays: DEFAULT_AUTO_CLOSE_DAYS,
};

export interface GetAutoCloseSettingsRequest {
  marketCenterId: string;
}

export interface GetAutoCloseSettingsResponse {
  autoClose: AutoCloseSettings;
}

export interface UpdateAutoCloseSettingsRequest {
  marketCenterId: string;
  enabled: boolean;
  awaitingResponseDays?: number;
}

export interface UpdateAutoCloseSettingsResponse {
  autoClose: AutoCloseSettings;
}

/**
 * Get auto-close settings for a market center
 */
export const getAutoCloseSettings = api<
  GetAutoCloseSettingsRequest,
  GetAutoCloseSettingsResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/settings/auto-close/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Only STAFF_LEADER and ADMIN can update auto-close settings
    if (
      !userContext?.role ||
      userContext?.role === "AGENT" ||
      userContext?.role === "STAFF"
    ) {
      throw APIError.permissionDenied(
        "Only staff leaders and administrators can view auto-close settings"
      );
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );

    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    if (userContext.role === "STAFF_LEADER") {
      if (userContext.marketCenterId !== req.marketCenterId) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }
    }
    // ⬇️ ONLY admins hit this
    else if (userContext.role === "ADMIN") {
      const accessibleMarketCenterIds =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext?.marketCenterId
        );

      if (!accessibleMarketCenterIds || !accessibleMarketCenterIds.length) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }

      const includesMarketCenterId = accessibleMarketCenterIds.some(
        (id) => id === req?.marketCenterId
      );

      if (!includesMarketCenterId) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }
    }

    const autoCloseSettings: AutoCloseSettings =
      marketCenter?.settings?.autoClose ?? defaultAutoCloseSettings;

    return { autoClose: autoCloseSettings };
  }
);

/**
 * Update auto-close settings for a market center
 * Only STAFF_LEADER and ADMIN can modify these settings
 */
export const updateAutoCloseSettings = api<
  UpdateAutoCloseSettingsRequest,
  UpdateAutoCloseSettingsResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/settings/auto-close/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const isStaffLeader = userContext?.role === "STAFF_LEADER";
    const isAdmin = userContext?.role === "ADMIN";

    // Only STAFF_LEADER and ADMIN can update auto-close settings
    if (
      !userContext?.role ||
      userContext?.role === "AGENT" ||
      userContext?.role === "STAFF"
    ) {
      throw APIError.permissionDenied(
        "Only staff leaders and administrators can update auto-close settings"
      );
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Verify user has access to this market center
    const accessibleMarketCenterIds =
      await subscriptionRepository.getAccessibleMarketCenterIds(
        req.marketCenterId
      );

    let includesMarketCenterId = false;
    if (accessibleMarketCenterIds && accessibleMarketCenterIds.length > 0) {
      for (const id of accessibleMarketCenterIds) {
        if (id === req.marketCenterId) {
          includesMarketCenterId = true;
          break;
        }
      }
    }

    const marketCenterId: string | undefined =
      isAdmin && includesMarketCenterId
        ? req.marketCenterId
        : isStaffLeader && userContext?.marketCenterId
          ? userContext.marketCenterId
          : undefined;

    if (!marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have access to this market center's settings"
      );
    }

    // Validate awaitingResponseDays
    const awaitingResponseDays =
      req.awaitingResponseDays ?? DEFAULT_AUTO_CLOSE_DAYS;
    if (awaitingResponseDays < 1 || awaitingResponseDays > 30) {
      throw APIError.invalidArgument(
        "Auto-close days must be between 1 and 30"
      );
    }

    const currentSettings =
      (marketCenter.settings as MarketCenterSettings) ?? {};

    const newAutoCloseSettings: AutoCloseSettings = {
      enabled: req.enabled,
      awaitingResponseDays: awaitingResponseDays,
    };

    const updatedSettings: MarketCenterSettings = {
      ...currentSettings,
      autoClose: newAutoCloseSettings,
    };

    if (
      !newAutoCloseSettings ||
      (newAutoCloseSettings.enabled === currentSettings.autoClose?.enabled &&
        newAutoCloseSettings.awaitingResponseDays ===
          currentSettings.autoClose?.awaitingResponseDays)
    ) {
      throw APIError.internal("Nothing to update in market center settings");
    }

    // Update market center settings
    const updatedMarketCenter = await marketCenterRepository.update(
      req.marketCenterId,
      {
        settings: updatedSettings,
      }
    );

    if (!updatedMarketCenter) {
      throw APIError.internal("Failed to update market center settings");
    }

    // Create history entry for the settings change
    await marketCenterRepository.createHistory({
      marketCenterId: req.marketCenterId,
      action: "UPDATE",
      field: "autoClose",
      previousValue: JSON.stringify(currentSettings.autoClose ?? null),
      newValue: JSON.stringify(newAutoCloseSettings),
      changedById: userContext.userId,
    });

    return {
      autoClose: newAutoCloseSettings,
    };
  }
);
