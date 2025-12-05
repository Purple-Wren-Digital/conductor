import { api, APIError } from "encore.dev/api";
import { canCreateMarketCenters } from "../auth/permissions";
import { getUserContext } from "../auth/user-context";
import { db, marketCenterRepository, withTransaction, fromTimestamp, toJson } from "../ticket/db";
import { MarketCenter, TicketCategory } from "./types";
import { User } from "../user/types";

export interface CreateMarketCenterRequest {
  name: string;
  users?: User[];
  ticketCategories?: TicketCategory[];
  // TODO:
  // settings:
  // settingsAuditLogs?: SettingsAuditLog[];
  // teamInvitations:
}

export interface CreateMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const create = api<
  CreateMarketCenterRequest,
  CreateMarketCenterResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canCreate = await canCreateMarketCenters(userContext);
    if (!canCreate) {
      throw APIError.permissionDenied("Only Amin can create market centers");
    }

    const result = await withTransaction(async (tx) => {
      // Create market center
      const marketCenterRow = await tx.queryRow<{
        id: string;
        name: string;
        settings: any;
        created_at: Date;
        updated_at: Date;
      }>`
        INSERT INTO market_centers (id, name, settings, created_at, updated_at)
        VALUES (gen_random_uuid()::text, ${req.name}, ${toJson({})}::jsonb, NOW(), NOW())
        RETURNING id, name, settings, created_at, updated_at
      `;

      if (!marketCenterRow) {
        throw APIError.internal("Failed to create market center");
      }

      // Associate users with market center
      if (req.users && req.users.length > 0) {
        for (const user of req.users) {
          await tx.exec`
            UPDATE users
            SET market_center_id = ${marketCenterRow.id}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
        }
      }

      // Create history entry
      await tx.exec`
        INSERT INTO market_center_history (
          id, market_center_id, action, snapshot, changed_at, changed_by_id
        ) VALUES (
          gen_random_uuid()::text,
          ${marketCenterRow.id},
          'CREATE',
          ${toJson({})}::jsonb,
          NOW(),
          ${userContext.userId}
        )
      `;

      // Fetch users associated with the market center
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
        WHERE market_center_id = ${marketCenterRow.id} AND is_active = true
      `;

      const marketCenter: MarketCenter = {
        id: marketCenterRow.id,
        name: marketCenterRow.name,
        settings: marketCenterRow.settings,
        createdAt: fromTimestamp(marketCenterRow.created_at)!,
        updatedAt: fromTimestamp(marketCenterRow.updated_at)!,
        users: userRows.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name ?? "",
          role: u.role as any,
          clerkId: u.clerk_id,
          isActive: u.is_active,
          marketCenterId: u.market_center_id ?? undefined,
          createdAt: fromTimestamp(u.created_at)!,
          updatedAt: fromTimestamp(u.updated_at)!,
        })),
      };

      return { marketCenter };
    });

    return { marketCenter: result.marketCenter };
  }
);
