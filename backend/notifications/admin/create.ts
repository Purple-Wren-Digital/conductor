// import { api, APIError } from "encore.dev/api";
// import { prisma } from "../../../ticket/db";
// import { getUserContext } from "../../../auth/user-context";
// import { defaultNotificationPreferences } from "../../../utils";
// import { NotificationPreferences } from "../../types";

// export interface AddNewNotificationTypesRequest {
//   newNotifications: NotificationPreferences[];
// }

// export interface AddNewNotificationTypesResponse {
//   added: boolean;
// }

// export const addNewNotificationTypes = api<
//   AddNewNotificationTypesRequest,
//   AddNewNotificationTypesResponse
// >(
//   {
//     expose: true,
//     method: "PUT",
//     path: "/users/update/settings/add-new-notification-types",
//     auth: false,
//   },
//   async (req) => {
//     const userContext = await getUserContext();

//     if (userContext?.role !== "ADMIN") {
//       throw APIError.permissionDenied(
//         "Only admin can add new types of notifications"
//       );
//     }

//     const users = await prisma.user.findMany({
//       where: { isActive: true },
//       include: {
//         userSettings: {
//           include: { notificationPreferences: true },
//         },
//       },
//     });

//     for (const user of users) {
//       const existingTypes = new Set(
//         user.userSettings?.notificationPreferences?.map((pref) =>
//           pref.type.toUpperCase()
//         ) ?? []
//       );

//       const newPreferencesToAdd = req.newNotifications.filter(
//         (pref) => !existingTypes.has(pref.type.toUpperCase())
//       );

//       if (newPreferencesToAdd.length === 0) continue;

//       await prisma.userSettings.update({
//         where: { id: user.userSettings.id },
//         data: {
//           notificationPreferences: {
//             create: newPreferencesToAdd,
//           },
//         },
//       });
//     }
//     return { added: true };
//   }
// );
