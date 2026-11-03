import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Pins that the creation-date and resolution-date filters target different
 * columns.
 *
 * The dashboard's "Resolved Tickets in the last 7 days" card counts tickets by
 * `resolvedAt`, but the drill-down it links to filtered by `created_at`. Every
 * ticket created earlier and resolved this week was silently dropped, so the
 * list disagreed with the number that had just been clicked -- 20 on the card,
 * 5 in the list.
 *
 * These assertions fail if resolvedFrom/resolvedTo are ever folded back onto
 * created_at, or dropped from the WHERE clause entirely.
 */
const { mockDb } = vi.hoisted(() => ({
  mockDb: { rawQueryAll: vi.fn(), rawQueryRow: vi.fn() },
}));

vi.mock("../../ticket/db", () => ({ db: mockDb }));
vi.mock("./user-search-utils", () => ({
  buildMarketCenterConditions: () => ({ clause: "", values: [] }),
}));

import { ticketRepository } from "./ticket.repository";

/** The WHERE clause the repository actually sent. */
function sentSql(): string {
  const call =
    mockDb.rawQueryAll.mock.calls[0] ?? mockDb.rawQueryRow.mock.calls[0];
  return call ? String(call[0]) : "";
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.rawQueryAll.mockResolvedValue([]);
  mockDb.rawQueryRow.mockResolvedValue({ count: 0 });
});

const BASE = {
  userId: "u-1",
  userRole: "ADMIN" as const,
  marketCenterIds: ["mc-1"],
};

describe("ticketRepository.search date windows", () => {
  it("filters on created_at for dateFrom/dateTo", async () => {
    await ticketRepository.search({
      ...BASE,
      dateFrom: new Date("2026-10-01T00:00:00Z"),
      dateTo: new Date("2026-10-08T00:00:00Z"),
    });

    const sql = sentSql();
    expect(sql).toContain("t.created_at >=");
    expect(sql).toContain("t.created_at <=");
    expect(sql).not.toContain("t.resolved_at");
  });

  it("filters on resolved_at for resolvedFrom/resolvedTo", async () => {
    await ticketRepository.search({
      ...BASE,
      resolvedFrom: new Date("2026-10-01T00:00:00Z"),
      resolvedTo: new Date("2026-10-08T00:00:00Z"),
    });

    const sql = sentSql();
    expect(sql).toContain("t.resolved_at >=");
    expect(sql).toContain("t.resolved_at <=");
    // The whole point: a resolution-date query must not become a
    // creation-date one.
    expect(sql).not.toContain("t.created_at >=");
    expect(sql).not.toContain("t.created_at <=");
  });

  it("keeps the two windows independent when both are supplied", async () => {
    await ticketRepository.search({
      ...BASE,
      dateFrom: new Date("2026-01-01T00:00:00Z"),
      resolvedFrom: new Date("2026-10-01T00:00:00Z"),
    });

    const sql = sentSql();
    expect(sql).toContain("t.created_at >=");
    expect(sql).toContain("t.resolved_at >=");
  });
});
