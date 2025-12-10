// import { api, APIError } from "encore.dev/api";
// import { userRepository, marketCenterRepository, settingsAuditRepository } from "./db";
// import { SettingsUpdateRequest, MarketCenterSettings, BusinessHours, BrandingSettings } from "./types";
// import { notifySettingsChange } from "./notifications";

// const validateBusinessHours = (businessHours: any): BusinessHours => {
//   const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
//   const result: any = {};

//   for (const day of days) {
//     if (businessHours[day]) {
//       const dayHours = businessHours[day];
//       if (typeof dayHours.isOpen !== 'boolean') {
//         throw APIError.invalidArgument(`${day}.isOpen must be a boolean`);
//       }

//       if (dayHours.isOpen) {
//         if (!dayHours.start || !dayHours.end) {
//           throw APIError.invalidArgument(`${day} must have start and end times when open`);
//         }

//         // Validate time format (HH:MM)
//         const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
//         if (!timeRegex.test(dayHours.start)) {
//           throw APIError.invalidArgument(`${day}.start must be in HH:MM format`);
//         }
//         if (!timeRegex.test(dayHours.end)) {
//           throw APIError.invalidArgument(`${day}.end must be in HH:MM format`);
//         }
//       }

//       result[day] = {
//         start: dayHours.start || "09:00",
//         end: dayHours.end || "17:00",
//         isOpen: dayHours.isOpen
//       };
//     }
//   }

//   return result as BusinessHours;
// };

// const validateBranding = (branding: any): BrandingSettings => {
//   if (branding.primaryColor && typeof branding.primaryColor !== 'string') {
//     throw APIError.invalidArgument("primaryColor must be a string");
//   }

//   // Validate hex color format
//   if (branding.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(branding.primaryColor)) {
//     throw APIError.invalidArgument("primaryColor must be a valid hex color (e.g., #2563eb)");
//   }

//   if (branding.logoUrl && typeof branding.logoUrl !== 'string') {
//     throw APIError.invalidArgument("logoUrl must be a string");
//   }

//   if (branding.companyName && typeof branding.companyName !== 'string') {
//     throw APIError.invalidArgument("companyName must be a string");
//   }

//   return branding as BrandingSettings;
// };

// const validateSettings = (settings: Partial<MarketCenterSettings>): Partial<MarketCenterSettings> => {
//   const validated: Partial<MarketCenterSettings> = {};

//   if (settings.businessHours) {
//     validated.businessHours = validateBusinessHours(settings.businessHours);
//   }

//   if (settings.branding) {
//     validated.branding = validateBranding(settings.branding);
//   }

//   if (settings.holidays) {
//     if (!Array.isArray(settings.holidays)) {
//       throw APIError.invalidArgument("holidays must be an array");
//     }
//     validated.holidays = settings.holidays.filter(h => typeof h === 'string');
//   }

//   if (settings.general) {
//     const general: any = {};
//     if (settings.general.timezone && typeof settings.general.timezone === 'string') {
//       general.timezone = settings.general.timezone;
//     }
//     if (settings.general.language && typeof settings.general.language === 'string') {
//       general.language = settings.general.language;
//     }
//     if (typeof settings.general.autoAssignment === 'boolean') {
//       general.autoAssignment = settings.general.autoAssignment;
//     }
//     validated.general = general;
//   }

//   if (settings.integrations) {
//     validated.integrations = {
//       apiKeys: {},
//       webhooks: []
//     };
//     if (settings.integrations.apiKeys && typeof settings.integrations.apiKeys === 'object') {
//       validated.integrations.apiKeys = settings.integrations.apiKeys;
//     }
//     if (settings.integrations.webhooks && Array.isArray(settings.integrations.webhooks)) {
//       validated.integrations.webhooks = settings.integrations.webhooks;
//     }
//   }

//   return validated;
// };

// export const updateMarketCenterSettings = api(
//   { method: "PUT", path: "/settings/market-center", auth: true },
//   async (req: SettingsUpdateRequest): Promise<MarketCenterSettings> => {
//     // TODO: Replace with proper auth
//     const mockUserId = "user_1";

//     // Find the user with their market center
//     const user = await userRepository.findByIdWithMarketCenter(mockUserId);

//     if (!user) {
//       throw APIError.notFound("User not found");
//     }

//     // Only ADMIN users can update settings
//     if (user.role !== "ADMIN") {
//       throw APIError.permissionDenied("Only administrators can update settings");
//     }

//     if (!user.marketCenter) {
//       throw APIError.notFound("Market center not found");
//     }

//     // Validate the settings
//     const validatedSettings = validateSettings(req.settings);

//     // Get current settings
//     const currentSettings = user.marketCenter.settings as any || {};

//     // Merge with existing settings
//     const newSettings = {
//       ...currentSettings,
//       ...validatedSettings,
//       businessHours: {
//         ...currentSettings.businessHours,
//         ...validatedSettings.businessHours
//       },
//       branding: {
//         ...currentSettings.branding,
//         ...validatedSettings.branding
//       },
//       integrations: {
//         ...currentSettings.integrations,
//         ...validatedSettings.integrations
//       },
//       general: {
//         ...currentSettings.general,
//         ...validatedSettings.general
//       }
//     };

//     // Update the market center settings
//     const updatedMarketCenter = await marketCenterRepository.update(user.marketCenter.id, {
//       settings: newSettings
//     });

//     if (!updatedMarketCenter) {
//       throw APIError.internal("Failed to update market center settings");
//     }

//     // Create audit log entries for each changed section
//     const auditLogs = [];
//     for (const [section, newValue] of Object.entries(validatedSettings)) {
//       const previousValue = currentSettings[section];

//       auditLogs.push({
//         marketCenterId: user.marketCenter.id,
//         userId: user.id,
//         action: "update",
//         section: section,
//         previousValue: previousValue || null,
//         newValue: newValue as any
//       });
//     }

//     if (auditLogs.length > 0) {
//       await settingsAuditRepository.createMany(auditLogs);

//       // Send email notifications to all market center admins
//       await notifySettingsChange(
//         user.marketCenter.id,
//         user.id,
//         auditLogs.map(log => ({
//           section: log.section,
//           previousValue: log.previousValue,
//           newValue: log.newValue
//         }))
//       );
//     }

//     return updatedMarketCenter.settings as any;
//   }
// );
