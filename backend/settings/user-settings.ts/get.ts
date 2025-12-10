import { api, APIError, Query } from "encore.dev/api";
import { db, fromTimestamp, fromJson } from "../../ticket/db";
import type { UserSettings, NotificationPreferences } from "../../user/types";
import { getUserContext } from "../../auth/user-context";

export interface GetUserSettingsRequest {
  id: string;
  userId: string;
}

export interface GetUserSettingsResponse {
  userSettings: UserSettings[];
}

interface UserHistoryRow {
  id: string;
  user_id: string;
  market_center_id: string | null;
  action: string;
  field: string | null;
  previous_value: string | null;
  new_value: string | null;
  snapshot: any;
  changed_by_id: string | null;
  changed_at: Date;
}

export const getUserHistory = api<GetUserSettingsRequest>(
  //   GetUserSettingsResponse
  {
    expose: true,
    method: "GET",
    path: "/settings/users/:userId/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    if (userContext?.userId !== req.userId)
      throw APIError.permissionDenied(
        "Must logged in to your account to update your settings"
      );

    const settings = await db.queryRow<UserHistoryRow>`
      SELECT *
      FROM user_history
      WHERE id = ${req.id}
    `;
  }
);
