/**
 * Join Code Repository - one active, rotatable join code per market center.
 *
 * rotate() opens its own transaction (the deactivate and the insert must land
 * together), so callers must not wrap it in one of their own. Every other write
 * here uses the non-transactional `db`; a write that has to join a caller's
 * transaction belongs in the caller as a raw tx.exec (Encore's compiler
 * requires static db usage — no dynamic conn dispatch).
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

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Matches the detection already used for the users table
 * (auth/user-context.ts:88) — the driver surfaces the SQLSTATE on the error or
 * on its cause depending on how it was wrapped.
 */
function isUniqueViolation(err: unknown): boolean {
  const candidate = err as
    | { code?: string; cause?: { code?: string }; message?: string }
    | null
    | undefined;
  return (
    candidate?.code === UNIQUE_VIOLATION ||
    candidate?.cause?.code === UNIQUE_VIOLATION ||
    candidate?.message?.includes("duplicate key") === true
  );
}

/**
 * How many freshly generated codes to try before giving up. The keyspace is
 * 32^8 (~1.1e12), so a collision is already vanishingly unlikely; this exists so
 * that one is a retry instead of a raw 500.
 */
const MAX_CODE_ATTEMPTS = 5;

async function rotateOnce(
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

    // ON CONFLICT names the partial unique index
    // (market_center_join_codes_one_active) explicitly rather than using a bare
    // DO NOTHING, so a collision on the separate `code UNIQUE` constraint still
    // raises 23505 and is retried with a fresh code by rotate() below.
    const row = await tx.queryRow<JoinCodeRow>`
      INSERT INTO market_center_join_codes (market_center_id, code, created_by)
      VALUES (${marketCenterId}, ${code}, ${createdBy})
      ON CONFLICT (market_center_id) WHERE is_active DO NOTHING
      RETURNING *
    `;
    if (row) return rowToJoinCode(row);

    // Lost the race: another request committed an active code for this market
    // center between our UPDATE and our INSERT. Both callers only ever want
    // "this market center's currently-active code", so hand back the winner
    // rather than surfacing an unmapped 23505 as a 500.
    const winner = await tx.queryRow<JoinCodeRow>`
      SELECT * FROM market_center_join_codes
      WHERE market_center_id = ${marketCenterId} AND is_active = true
    `;
    if (!winner) {
      throw new Error(
        `Failed to install a join code for market center ${marketCenterId}`
      );
    }
    return rowToJoinCode(winner);
  });
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

  /**
   * Deactivates the current code (if any) and installs a new one.
   *
   * Takes a generator rather than a finished code so that a collision on the
   * `code UNIQUE` constraint can be retried here, which is the only place the
   * uniqueness failure is observable. A Postgres error aborts the whole
   * transaction, so each attempt re-runs the transaction from the top with a
   * freshly generated code.
   *
   * Concurrency: both callers can reach this with no active code present — the
   * mint-on-read in getMarketCenterJoinCode fires twice under React StrictMode
   * alone — so the loser of that race reads back the winner's row instead of
   * failing.
   */
  async rotate(
    marketCenterId: string,
    generateCode: () => string,
    createdBy: string | null
  ): Promise<JoinCode> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
      try {
        return await rotateOnce(marketCenterId, generateCode(), createdBy);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        lastError = err;
      }
    }
    throw lastError;
  },
};
