import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { MarketCenterSettings } from "./types";

export const getMarketCenterSettings = api(
  { method: "GET", path: "/settings/market-center", auth: true },
  async (): Promise<MarketCenterSettings> => {
    const prisma = getPrisma();

    // TODO: Replace with proper auth
    const mockUserId = "user_1";

    // Find the user and their market center
    const user = await prisma.user.findUnique({
      where: { id: mockUserId },
      include: { marketCenter: true }
    });

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Only ADMIN users can access settings
    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only administrators can access settings");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Return settings with defaults if not set
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
        timezone: "UTC",
        language: "en",
        autoAssignment: false
      }
    };

    // Merge default settings with stored settings
    return {
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
  }
);