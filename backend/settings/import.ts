import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { MarketCenterSettings, SettingsUpdateRequest } from "./types";
import { SettingsExportData } from "./export";

export interface SettingsImportRequest {
  data: SettingsExportData;
  overwriteExisting?: boolean;
}

export interface SettingsImportResponse {
  success: boolean;
  message: string;
  importedSettings: MarketCenterSettings;
}

export function validateBusinessHours(businessHours: any): boolean {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  if (!businessHours || typeof businessHours !== 'object') return false;
  
  return days.every(day => {
    const dayHours = businessHours[day];
    return dayHours &&
           typeof dayHours === 'object' &&
           typeof dayHours.start === 'string' &&
           typeof dayHours.end === 'string' &&
           typeof dayHours.isOpen === 'boolean';
  });
}

export function validateBrandingSettings(branding: any): boolean {
  if (!branding || typeof branding !== 'object') return false;
  
  return typeof branding.primaryColor === 'string' &&
         (branding.logoUrl === undefined || typeof branding.logoUrl === 'string') &&
         (branding.companyName === undefined || typeof branding.companyName === 'string');
}

export function validateMarketCenterSettings(settings: any): boolean {
  if (!settings || typeof settings !== 'object') return false;
  
  // Validate required sections
  if (!validateBusinessHours(settings.businessHours)) return false;
  if (!validateBrandingSettings(settings.branding)) return false;
  
  // Validate holidays array
  if (!Array.isArray(settings.holidays)) return false;
  
  // Validate integrations
  if (!settings.integrations || 
      typeof settings.integrations !== 'object' ||
      typeof settings.integrations.apiKeys !== 'object' ||
      !Array.isArray(settings.integrations.webhooks)) {
    return false;
  }
  
  // Validate general settings
  if (!settings.general ||
      typeof settings.general !== 'object' ||
      typeof settings.general.timezone !== 'string' ||
      typeof settings.general.language !== 'string' ||
      typeof settings.general.autoAssignment !== 'boolean') {
    return false;
  }
  
  return true;
}

function validateImportData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Check required top-level fields
  if (!data.marketCenter || 
      !data.settings || 
      !data.exportedAt || 
      !data.version) {
    return false;
  }
  
  // Validate marketCenter info
  if (typeof data.marketCenter.name !== 'string' || 
      typeof data.marketCenter.id !== 'string') {
    return false;
  }
  
  // Validate settings structure
  if (!validateMarketCenterSettings(data.settings)) {
    return false;
  }
  
  // Validate version
  if (typeof data.version !== 'string') {
    return false;
  }
  
  return true;
}

export const importMarketCenterSettings = api(
  { method: "POST", path: "/settings/import", auth: true },
  async ({ data, overwriteExisting = false }: SettingsImportRequest): Promise<SettingsImportResponse> => {
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

    // Only ADMIN users can import settings
    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only administrators can import settings");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Validate import data
    if (!validateImportData(data)) {
      throw APIError.invalidArgument("Invalid settings data format");
    }

    try {
      // Get current settings to merge with imported ones if not overwriting
      let finalSettings: MarketCenterSettings = data.settings;
      
      if (!overwriteExisting && user.marketCenter.settings) {
        const currentSettings = user.marketCenter.settings as MarketCenterSettings;
        
        // Merge settings intelligently
        finalSettings = {
          businessHours: { ...currentSettings.businessHours, ...data.settings.businessHours },
          branding: { ...currentSettings.branding, ...data.settings.branding },
          holidays: data.settings.holidays.length > 0 ? data.settings.holidays : currentSettings.holidays,
          integrations: {
            apiKeys: { ...currentSettings.integrations?.apiKeys, ...data.settings.integrations.apiKeys },
            webhooks: data.settings.integrations.webhooks.length > 0 
              ? data.settings.integrations.webhooks 
              : currentSettings.integrations?.webhooks || []
          },
          general: { ...currentSettings.general, ...data.settings.general }
        };
      }

      // Update the market center settings
      await prisma.marketCenter.update({
        where: { id: user.marketCenter.id },
        data: {
          settings: finalSettings as any
        }
      });

      // Log the import action
      await prisma.settingsAuditLog.create({
        data: {
          marketCenterId: user.marketCenter.id,
          userId: user.id,
          action: "IMPORT",
          section: "ALL",
          previousValue: user.marketCenter.settings,
          newValue: finalSettings,
        }
      });

      return {
        success: true,
        message: `Settings imported successfully${overwriteExisting ? ' (overwrite mode)' : ' (merge mode)'}`,
        importedSettings: finalSettings
      };

    } catch (error) {
      console.error("Settings import error:", error);
      throw APIError.internal("Failed to import settings");
    }
  }
);