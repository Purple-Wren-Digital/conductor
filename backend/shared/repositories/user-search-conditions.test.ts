import { describe, it, expect } from "vitest";
import { buildMarketCenterConditions } from "./user-search-utils";

describe("buildMarketCenterConditions", () => {
  it("returns no conditions for empty array", () => {
    const result = buildMarketCenterConditions([], 1);
    expect(result.conditions).toEqual([]);
    expect(result.values).toEqual([]);
    expect(result.nextParamIndex).toBe(1);
  });

  it("filters by specific market center IDs (no Unassigned)", () => {
    const result = buildMarketCenterConditions(["mc-1", "mc-2"], 1);
    expect(result.conditions).toEqual(["market_center_id IN ($1, $2)"]);
    expect(result.values).toEqual(["mc-1", "mc-2"]);
    expect(result.nextParamIndex).toBe(3);
  });

  it("filters only unassigned when Unassigned is the sole ID", () => {
    const result = buildMarketCenterConditions(["Unassigned"], 1);
    expect(result.conditions).toEqual(["market_center_id IS NULL"]);
    expect(result.values).toEqual([]);
    expect(result.nextParamIndex).toBe(1);
  });

  it("includes both NULL and specific IDs when Unassigned + real IDs", () => {
    const result = buildMarketCenterConditions(
      ["Unassigned", "mc-1", "mc-2"],
      1
    );
    expect(result.conditions).toEqual([
      "(market_center_id IS NULL OR market_center_id IN ($1, $2))",
    ]);
    expect(result.values).toEqual(["mc-1", "mc-2"]);
    expect(result.nextParamIndex).toBe(3);
  });

  it("produces exactly ONE condition when Unassigned + real IDs (bug #2 regression)", () => {
    const result = buildMarketCenterConditions(
      ["Unassigned", "mc-1"],
      1
    );
    // Bug #2: previously produced TWO conditions:
    //   "market_center_id IS NULL" AND "(market_center_id IS NULL OR market_center_id IN ($1))"
    // which excluded all users WITH a market center.
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toContain("IS NULL");
    expect(result.conditions[0]).toContain("IN");
  });

  it("respects startParamIndex offset", () => {
    const result = buildMarketCenterConditions(["mc-1", "mc-2"], 5);
    expect(result.conditions).toEqual(["market_center_id IN ($5, $6)"]);
    expect(result.values).toEqual(["mc-1", "mc-2"]);
    expect(result.nextParamIndex).toBe(7);
  });

  it("respects startParamIndex for Unassigned + real IDs", () => {
    const result = buildMarketCenterConditions(
      ["Unassigned", "mc-3"],
      3
    );
    expect(result.conditions).toEqual([
      "(market_center_id IS NULL OR market_center_id IN ($3))",
    ]);
    expect(result.values).toEqual(["mc-3"]);
    expect(result.nextParamIndex).toBe(4);
  });

  it("handles single non-Unassigned ID", () => {
    const result = buildMarketCenterConditions(["mc-1"], 1);
    expect(result.conditions).toEqual(["market_center_id IN ($1)"]);
    expect(result.values).toEqual(["mc-1"]);
    expect(result.nextParamIndex).toBe(2);
  });
});
