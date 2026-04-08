/**
 * User Market Center Repository - Junction table for many-to-many user <-> market center
 *
 * For transaction-aware writes, use tx.exec directly in the caller
 * (Encore's compiler requires static db usage — no dynamic conn dispatch).
 */

import { db } from "../../ticket/db";

interface MarketCenterRef {
  id: string;
  name: string;
}

export const userMarketCenterRepository = {
  async findMarketCentersByUserId(userId: string): Promise<MarketCenterRef[]> {
    const rows = await db.queryAll<{ id: string; name: string }>`
      SELECT mc.id, mc.name
      FROM user_market_centers umc
      JOIN market_centers mc ON mc.id = umc.market_center_id
      WHERE umc.user_id = ${userId}
      ORDER BY mc.name ASC
    `;
    return rows;
  },

  async userBelongsToMarketCenter(
    userId: string,
    marketCenterId: string
  ): Promise<boolean> {
    const row = await db.queryRow<{ id: string }>`
      SELECT id FROM user_market_centers
      WHERE user_id = ${userId} AND market_center_id = ${marketCenterId}
    `;
    return !!row;
  },

  async addUserToMarketCenter(
    userId: string,
    marketCenterId: string
  ): Promise<void> {
    await db.exec`
      INSERT INTO user_market_centers (user_id, market_center_id)
      VALUES (${userId}, ${marketCenterId})
      ON CONFLICT (user_id, market_center_id) DO NOTHING
    `;
  },

  async removeUserFromMarketCenter(
    userId: string,
    marketCenterId: string
  ): Promise<void> {
    await db.exec`
      DELETE FROM user_market_centers
      WHERE user_id = ${userId} AND market_center_id = ${marketCenterId}
    `;
  },

  async getNextMarketCenterId(
    userId: string,
    excludeMarketCenterId: string
  ): Promise<string | null> {
    const row = await db.queryRow<{ market_center_id: string }>`
      SELECT market_center_id FROM user_market_centers
      WHERE user_id = ${userId} AND market_center_id != ${excludeMarketCenterId}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    return row?.market_center_id ?? null;
  },
};
