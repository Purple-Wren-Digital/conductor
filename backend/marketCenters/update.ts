import { api, APIError } from "encore.dev/api";
import { db, withTransaction, fromTimestamp, toJson } from "../ticket/db";
import { MarketCenter, TicketCategory } from "./types";
import { User } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { canManageMarketCenters } from "../auth/permissions";
import { subscriptionRepository } from "../shared/repositories";
import { UsersToNotify } from "../notifications/types";
import { AssignmentUpdateType } from "@/emails/types";

export interface UpdateMarketCenterRequest {
  id: string;
  name?: string;
  users?: User[];
  ticketCategories?: TicketCategory[]; // TODO:
}

export interface UpdateMarketCenterResponse {
  marketCenter: MarketCenter;
  usersToNotify: UsersToNotify[];
}

// Creates a new market center
export const update = api<
  UpdateMarketCenterRequest,
  UpdateMarketCenterResponse
>(
  {
    expose: true,
    method: "PATCH",
    path: "/marketCenters/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const canManage = await canManageMarketCenters(userContext);

    if (!canManage) {
      throw APIError.permissionDenied("Only Admin can update market centers");
    }

    // Check subscription-based access to this market center
    // Superusers can access any market center
    if (!userContext.isSuperuser) {
      const canAccess = await subscriptionRepository.canAccessMarketCenter(
        userContext.marketCenterId,
        req.id
      );

      if (!canAccess) {
        throw APIError.permissionDenied(
          "You do not have permission to update this market center"
        );
      }
    }

    // Fetch existing market center with users
    const marketCenterRow = await db.queryRow<{
      id: string;
      name: string;
      settings: any;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT id, name, settings, created_at, updated_at
      FROM market_centers
      WHERE id = ${req.id}
    `;

    if (!marketCenterRow) {
      throw APIError.notFound("Cannot find Market Center");
    }

    const existingUsers = await db.queryAll<{
      id: string;
      email: string;
      name: string | null;
      role: string;
    }>`
      SELECT id, email, name, role
      FROM users
      WHERE market_center_id = ${req.id} AND is_active = true
    `;

    let marketCenterHistory: Array<{
      marketCenterId: string;
      changedById: string;
      action: string;
      field: string;
      previousValue?: string;
      newValue?: string;
    }> = [];

    let removedUsers: User[] = [];
    let addedUsers: User[] = [];
    let hasUpdates = false;

    // Check for name change
    if (req?.name !== undefined && req.name !== marketCenterRow.name) {
      hasUpdates = true;
      marketCenterHistory.push({
        marketCenterId: marketCenterRow.id,
        changedById: userContext.userId,
        action: "UPDATE",
        field: "name",
        previousValue: marketCenterRow.name,
        newValue: req.name,
      });
    }

    // Check for user changes
    if (req?.users !== undefined) {
      const oldUserIds = existingUsers.map((u) => u.id);
      const newUserIds = req.users.map((u) => u.id);

      const addedUserIds = newUserIds.filter((id) => !oldUserIds.includes(id));
      const removedUserIds = oldUserIds.filter(
        (id) => !newUserIds.includes(id)
      );

      addedUsers = req.users.filter((u) => addedUserIds.includes(u.id));
      removedUsers = existingUsers.filter((u) =>
        removedUserIds.includes(u.id)
      ) as User[];

      if (addedUsers.length > 0 || removedUsers.length > 0) {
        hasUpdates = true;
      }

      // Track adds for history
      if (addedUsers.length > 0) {
        marketCenterHistory.push(
          ...addedUsers.map((userAdded) => ({
            marketCenterId: marketCenterRow.id,
            changedById: userContext.userId,
            action: "ADD",
            field: "team member",
            newValue: JSON.stringify({
              id: userAdded.id,
              name: userAdded.name,
            }),
          }))
        );
      }

      // Track removes for history
      if (removedUsers.length > 0) {
        marketCenterHistory.push(
          ...removedUsers.map((userRemoved) => ({
            marketCenterId: marketCenterRow.id,
            changedById: userContext.userId,
            action: "REMOVE",
            field: "team member",
            previousValue: JSON.stringify({
              id: userRemoved.id,
              name: userRemoved.name,
            }),
          }))
        );
      }
    }

    if (!hasUpdates) {
      throw APIError.invalidArgument("No fields to update");
    }

    const result = await withTransaction(async (tx) => {
      // Update market center name if changed
      if (req?.name && req.name !== marketCenterRow.name) {
        await tx.exec`
          UPDATE market_centers
          SET name = ${req.name}, updated_at = NOW()
          WHERE id = ${req.id}
        `;
      }

      // Add users to market center
      if (addedUsers.length > 0) {
        for (const user of addedUsers) {
          await tx.exec`
            UPDATE users
            SET market_center_id = ${req.id}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
          await tx.exec`
            INSERT INTO user_market_centers (user_id, market_center_id)
            VALUES (${user.id}, ${req.id})
            ON CONFLICT (user_id, market_center_id) DO NOTHING
          `;
        }
      }

      // Remove users from market center
      if (removedUsers.length > 0) {
        for (const user of removedUsers) {
          await tx.exec`
            DELETE FROM user_market_centers
            WHERE user_id = ${user.id} AND market_center_id = ${req.id}
          `;
          // Reassign active MC to next remaining, or NULL
          const nextMc = await tx.queryRow<{ market_center_id: string }>`
            SELECT market_center_id FROM user_market_centers
            WHERE user_id = ${user.id} AND market_center_id != ${req.id}
            ORDER BY created_at ASC
            LIMIT 1
          `;
          await tx.exec`
            UPDATE users
            SET market_center_id = ${nextMc?.market_center_id ?? null},
                updated_at = NOW()
            WHERE id = ${user.id}
          `;
        }
      }

      // Create history entries
      for (const historyEntry of marketCenterHistory) {
        await tx.exec`
          INSERT INTO market_center_history (
            market_center_id, changed_by_id, action, field, previous_value, new_value
          ) VALUES (
            ${historyEntry.marketCenterId},
            ${historyEntry.changedById},
            ${historyEntry.action},
            ${historyEntry.field},
            ${historyEntry.previousValue ?? null},
            ${historyEntry.newValue ?? null}
          )
        `;
      }

      // Fetch updated market center
      const updatedMarketCenterRow = await tx.queryRow<{
        id: string;
        name: string;
        settings: any;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, name, settings, created_at, updated_at
        FROM market_centers
        WHERE id = ${req.id}
      `;

      return { updatedMarketCenterRow };
    });

    const usersToNotify: UsersToNotify[] = [
      ...addedUsers.map((user: User) => ({
        id: user.id,
        name: user?.name ? user.name : "",
        email: user?.email ? user.email : "",
        updateType: "added" as AssignmentUpdateType,
      })),
      ...removedUsers.map((user: User) => ({
        id: user.id,
        name: user?.name ? user?.name : "",
        email: user?.email ? user?.email : "",
        updateType: "removed" as AssignmentUpdateType,
      })),
    ];

    const updatedMarketCenter: MarketCenter = {
      id: result.updatedMarketCenterRow!.id,
      name: result.updatedMarketCenterRow!.name,
      createdAt: fromTimestamp(result.updatedMarketCenterRow!.created_at)!,
      updatedAt: fromTimestamp(result.updatedMarketCenterRow!.updated_at)!,
      primaryStripeCustomerId: null,
      primaryStripeSubscriptionId: null,
    };

    return {
      marketCenter: updatedMarketCenter,
      usersToNotify: usersToNotify,
    };
  }
);
