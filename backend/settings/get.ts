// import { api, APIError } from "encore.dev/api";
// import { prisma } from "../ticket/db";
// import { MarketCenterSettings } from "./types";
// import { getUserContext } from "../auth/user-context";
// import { MarketCenter } from "../marketCenters/types";

// type MarketCenterWithSettingsRequest = {
//   marketCenterId: string;
// };

// type MarketCenterWithSettingsResponse = {
//   marketCenter: MarketCenter;
// };

// export const getMarketCenterSettings = api<
//   MarketCenterWithSettingsRequest,
//   MarketCenterWithSettingsResponse
// >(
//   { method: "GET", path: "/settings/market-center/:id", auth: true },
//   async (req) => {
//     const userContext = await getUserContext();

//     // Only ADMIN users can access settings
//     if (userContext.role !== "ADMIN" && userContext.role !== "STAFF") {
//       throw APIError.permissionDenied(
//         "Only administrators can access settings"
//       );
//     }

//     if (!userContext.marketCenterId) {
//       throw APIError.notFound("Market center not found");
//     }

//     const marketCenterWithSettings = prisma.marketCenter.findUnique({
//       where: { id: req.marketCenterId },
//       include: {
//         settingsAuditLogs: true,
//         users: true,
//       },
//     });

//     return {
//       marketCenter: marketCenterWithSettings,
//       // settings: {
//       //   ...settings,
//       //   marketCenter: settings?.marketCenter || undefined,
//       // },
//     };
//   }
// );

// // Return settings with defaults if not set
// // const settings = user.marketCenter.settings as any;
// // const defaultSettings: MarketCenterSettings = {
// //   businessHours: {
// //     monday: { start: "09:00", end: "17:00", isOpen: true },
// //     tuesday: { start: "09:00", end: "17:00", isOpen: true },
// //     wednesday: { start: "09:00", end: "17:00", isOpen: true },
// //     thursday: { start: "09:00", end: "17:00", isOpen: true },
// //     friday: { start: "09:00", end: "17:00", isOpen: true },
// //     saturday: { start: "09:00", end: "17:00", isOpen: false },
// //     sunday: { start: "09:00", end: "17:00", isOpen: false }
// //   },
// //   branding: {
// //     primaryColor: "#2563eb",
// //     companyName: user.marketCenter.name
// //   },
// //   holidays: [],
// //   integrations: {
// //     apiKeys: {},
// //     webhooks: []
// //   },
// //   general: {
// //     timezone: "UTC",
// //     language: "en",
// //     autoAssignment: false
// //   },
// // };

// // Merge default settings with stored settings
// // return {
// //   ...defaultSettings,
// //   ...settings,
// //   businessHours: {
// //     ...defaultSettings.businessHours,
// //     ...(settings?.businessHours || {})
// //   },
// //   branding: {
// //     ...defaultSettings.branding,
// //     ...(settings?.branding || {})
// //   },
// //   integrations: {
// //     ...defaultSettings.integrations,
// //     ...(settings?.integrations || {})
// //   },
// //   general: {
// //     ...defaultSettings.general,
// //     ...(settings?.general || {})
// //   }
// // };
