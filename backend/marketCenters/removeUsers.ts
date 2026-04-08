import { api, APIError, Query } from "encore.dev/api";
import { db, withTransaction, fromTimestamp, toJson } from "../ticket/db";
import { MarketCenter } from "./types";
import { User } from "../user/types";
import { getUserContext } from "../auth/user-context";
import { marketCenterScopeFilter } from "../auth/permissions";

export interface RemoveUsersRequest {
  id: string;
  users: User[];
  // settingsAuditLogs?: SettingsAuditLog[]; // TODO:
  // ticketCategories?: TicketCategory[]; // TODO:
}

export interface RemoveUsersResponse {
  marketCenter: MarketCenter;
}

// Removes users from a market center
export const removeUsers = api<RemoveUsersRequest, RemoveUsersResponse>(
  {
    expose: true,
    method: "PATCH",
    path: "/marketCenters/users/:id",
    auth: true,
  },
  async (req) => {
    if (!req.users || !req.id) {
      throw APIError.invalidArgument("Missing data");
    }
    const userContext = await getUserContext();
    const scopeFilter = await marketCenterScopeFilter(userContext, req.id);

    if (userContext.role === "AGENT" || !scopeFilter || !scopeFilter?.id) {
      throw APIError.permissionDenied(
        "Only Admin and Staff can update market centers"
      );
    }

    const marketCenter = await db.queryRow<{ id: string }>`
      SELECT id FROM market_centers WHERE id = ${req.id}
    `;
    if (!marketCenter) {
      throw APIError.notFound("Cannot find Market Center");
    }

    const result = await withTransaction(async (tx) => {
      // Remove users from market center: delete junction row, reassign active MC
      for (const user of req.users) {
        await tx.exec`
          DELETE FROM user_market_centers
          WHERE user_id = ${user.id} AND market_center_id = ${req.id}
        `;
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

      // Create history entries for removed users
      for (const user of req.users) {
        await tx.exec`
          INSERT INTO market_center_history (
            id, market_center_id, changed_by_id, action, field, previous_value
          ) VALUES (
            gen_random_uuid()::text,
            ${marketCenter.id},
            ${userContext.userId},
            'REMOVE',
            'team',
            ${toJson({ id: user.id, name: user.name })}
          )
        `;
      }

      // Fetch updated market center with users
      const marketCenterRow = await tx.queryRow<{
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

      const userRows = await tx.queryAll<{
        id: string;
        email: string;
        name: string | null;
        role: string;
        clerk_id: string;
        is_active: boolean;
        market_center_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, email, name, role, clerk_id, is_active, market_center_id, created_at, updated_at
        FROM users
        WHERE market_center_id = ${req.id} AND is_active = true
      `;

      return { marketCenterRow, userRows };
    });

    const formattedMarketCenter: MarketCenter = {
      id: result.marketCenterRow!.id,
      name: result.marketCenterRow!.name,
      settings: result.marketCenterRow!.settings,
      createdAt: fromTimestamp(result.marketCenterRow!.created_at)!,
      updatedAt: fromTimestamp(result.marketCenterRow!.updated_at)!,
      primaryStripeCustomerId: null,
      primaryStripeSubscriptionId: null,
      users: result.userRows.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        role: user.role as any,
        clerkId: user.clerk_id,
        isActive: user.is_active,
        marketCenterId: user.market_center_id ?? null,
        createdAt: fromTimestamp(user.created_at)!,
        updatedAt: fromTimestamp(user.updated_at)!,
      })),
    };

    return { marketCenter: formattedMarketCenter };
  }
);
