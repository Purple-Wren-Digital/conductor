import { API_BASE } from "@/lib/api/utils";
import type { Notification } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

type UserNotificationsProps = {
  isAccountLoaded: boolean;
  clerkId?: string;
  email?: string;
};

export function useFetchAllUserNotifications({
  isAccountLoaded,
  clerkId,
  email,
}: UserNotificationsProps) {
  return useQuery({
    queryKey: ["all-user-notifications", email],
    queryFn: async () => {
      try {
        if (!clerkId) throw new Error("Missing auth token");
        const response = await fetch(
          `${API_BASE}/notifications/in-app/${email}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${clerkId}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error(
            response?.statusText
              ? response.statusText
              : "Unable to fetch all notifications"
          );
        }
        const data: { unReadAmount: number; notifications: Notification[] } =
          await response.json();
        // console.log("Data - USER NOTIFICATIONS", data);
        return data;
      } catch (error) {
        console.error("Failed to fetch user notifications", error);
      }
    },
    enabled: !!clerkId && isAccountLoaded,
  });
}

// // TODO: ERROR - use-user-notifications.ts:48 Failed to fetch user notification preferences SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
// //     at useFetchNotificationPreferences.useQuery (

// type UserSettingsProps = {
//   id?: string;
//   userSettingsId?: string;
//   queryKey: (string | undefined)[];
//   getAuth0AccessToken: () => Promise<string>;
// };

// export function useFetchNotificationPreferences({
//   id,
//   userSettingsId,
//   queryKey,
//   getAuth0AccessToken,
// }: UserSettingsProps) {
//   return useQuery({
//     queryKey: queryKey,
//     queryFn: async () => {
//       console.log("user-settings-notifications", id, userSettingsId);
//       if (!id || !userSettingsId) {
//         throw new Error("Missing ids");
//       }
//       //   return [];

//       try {
//         const accessToken = await getAuth0AccessToken();
//         console.log("access token", accessToken);
//         const response = await fetch(
//           `/api/users/${id}/settings/notifications/${userSettingsId}`,
//           {
//             method: "GET",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${accessToken}`,
//             },
//           }
//         );

//         console.log("NOTIFICATION PREFERENCE RESPONSE", response);
//         if (!response || !response.ok) {
//           throw new Error(`Bad response: ${response?.status}`);
//         }
//         const data = await response.json();
//         console.log("NOTIFICATION PREFERENCE DATA", data);
//         return data?.notificationPreferences;
//       } catch (error) {
//         console.error("Failed to fetch user notification preferences", error);
//         return [];
//       }
//     },
//     enabled: !!id && !!userSettingsId,
//   });
// }
