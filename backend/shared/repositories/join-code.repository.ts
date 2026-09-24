/**
 * Join Code Repository - one active, rotatable join code per market center.
 *
 * For transaction-aware writes, use tx.exec directly in the caller
 * (Encore's compiler requires static db usage — no dynamic conn dispatch).
 */

import { db, withTransaction } from "../../ticket/db";

export interface JoinCode {
  id: string;
  marketCenterId: string;
  code: string;
  createdBy: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface JoinCodeRow {
  id: string;
  market_center_id: string;
  code: string;
  created_by: string | null;
  is_active: boolean;
  created_at: Date;
}

function rowToJoinCode(row: JoinCodeRow): JoinCode {
  return {
    id: row.id,
    marketCenterId: row.market_center_id,
    code: row.code,
    createdBy: row.created_by,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export const joinCodeRepository = {
  /** Resolves a normalized code. Returns null for unknown AND rotated codes alike. */
  async findActiveByCode(
    code: string
  ): Promise<(JoinCode & { marketCenterName: string }) | null> {
    const row = await db.queryRow<JoinCodeRow & { market_center_name: string }>`
      SELECT jc.*, mc.name AS market_center_name
      FROM market_center_join_codes jc
      JOIN market_centers mc ON mc.id = jc.market_center_id
      WHERE jc.code = ${code} AND jc.is_active = true
    `;
    if (!row) return null;
    return { ...rowToJoinCode(row), marketCenterName: row.market_center_name };
  },

  async findActiveByMarketCenterId(
    marketCenterId: string
  ): Promise<JoinCode | null> {
    const row = await db.queryRow<JoinCodeRow>`
      SELECT * FROM market_center_join_codes
      WHERE market_center_id = ${marketCenterId} AND is_active = true
    `;
    return row ? rowToJoinCode(row) : null;
  },

  /** Deactivates the current code (if any) and installs a new one. */
  async rotate(
    marketCenterId: string,
    code: string,
    createdBy: string | null
  ): Promise<JoinCode> {
    return await withTransaction(async (tx) => {
      await tx.exec`
        UPDATE market_center_join_codes
        SET is_active = false, deactivated_at = NOW()
        WHERE market_center_id = ${marketCenterId} AND is_active = true
      `;
      const row = await tx.queryRow<JoinCodeRow>`
        INSERT INTO market_center_join_codes (market_center_id, code, created_by)
        VALUES (${marketCenterId}, ${code}, ${createdBy})
        RETURNING *
      `;
      return rowToJoinCode(row!);
    });
  },
};
