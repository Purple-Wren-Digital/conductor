import { api, APIError } from "encore.dev/api";
import { userRepository } from "./db";
import { MarketCenterSettings } from "./types";

export interface SettingsExportData {
  marketCenter: {
    name: string;
    id: string;
  };
  settings: MarketCenterSettings;
  exportedAt: Date;
  version: string;
}

export const exportMarketCenterSettings = api(
  { method: "GET", path: "/settings/export", auth: true },
  async (): Promise<SettingsExportData> => {
    // TODO: Replace with proper auth
    const mockUserId = "user_1";

    // Find the user with their market center
    const user = await userRepository.findByIdWithMarketCenter(mockUserId);

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Only ADMIN users can export settings
    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only administrators can export settings");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Get current settings (using the same logic as get.ts)
    const settings = user.marketCenter.settings as any;

    const defaultSettings: MarketCenterSettings = {
      businessHours: {
        monday: { start: "09:00", end: "17:00", isOpen: true },
        tuesday: { start: "09:00", end: "17:00", isOpen: true },
        wednesday: { start: "09:00", end: "17:00", isOpen: true },
        thursday: { start: "09:00", end: "17:00", isOpen: true },
        friday: { start: "09:00", end: "17:00", isOpen: true },
        saturday: { start: "09:00", end: "17:00", isOpen: false },
        sunday: { start: "09:00", end: "17:00", isOpen: false }
      },
      branding: {
        primaryColor: "#2563eb",
        companyName: user.marketCenter.name
      },
      holidays: [],
      integrations: {
        apiKeys: {},
        webhooks: []
      },
      general: {
        name: user.marketCenter.name,
        timezone: "UTC",
        language: "en",
        autoAssignment: false
      },
      teamMembers: 0
    };

    // Merge default settings with stored settings
    const mergedSettings: MarketCenterSettings = {
      ...defaultSettings,
      ...settings,
      businessHours: {
        ...defaultSettings.businessHours,
        ...(settings?.businessHours || {})
      },
      branding: {
        ...defaultSettings.branding,
        ...(settings?.branding || {})
      },
      integrations: {
        ...defaultSettings.integrations,
        ...(settings?.integrations || {})
      },
      general: {
        ...defaultSettings.general,
        ...(settings?.general || {})
      }
    };

    return {
      marketCenter: {
        name: user.marketCenter.name,
        id: user.marketCenter.id
      },
      settings: mergedSettings,
      exportedAt: new Date(),
      version: "1.0"
    };
  }
);
