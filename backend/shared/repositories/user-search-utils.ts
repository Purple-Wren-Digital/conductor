/**
 * Builds SQL conditions for market center filtering in user search.
 * Handles "Unassigned" as a virtual ID meaning market_center_id IS NULL.
 */
export function buildMarketCenterConditions(
  marketCenterIds: string[],
  startParamIndex: number
): { conditions: string[]; values: string[]; nextParamIndex: number } {
  const conditions: string[] = [];
  const values: string[] = [];
  let paramIndex = startParamIndex;

  if (!marketCenterIds || marketCenterIds.length === 0) {
    return { conditions, values, nextParamIndex: paramIndex };
  }

  const includesUnassigned = marketCenterIds.includes("Unassigned");

  if (includesUnassigned) {
    const actualIds = marketCenterIds.filter((id) => id !== "Unassigned");

    if (actualIds.length > 0) {
      const placeholders = actualIds
        .map((_, i) => `$${paramIndex + i}`)
        .join(", ");
      conditions.push(
        `(market_center_id IS NULL OR market_center_id IN (${placeholders}))`
      );
      values.push(...actualIds);
      paramIndex += actualIds.length;
    } else {
      conditions.push(`market_center_id IS NULL`);
    }
  } else {
    const placeholders = marketCenterIds
      .map((_, i) => `$${paramIndex + i}`)
      .join(", ");
    conditions.push(`market_center_id IN (${placeholders})`);
    values.push(...marketCenterIds);
    paramIndex += marketCenterIds.length;
  }

  return { conditions, values, nextParamIndex: paramIndex };
}
