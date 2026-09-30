/**
 * Join Code Repository Tests - Verify rotate() is transactional
 *
 * The "one active code per market center" guarantee is enforced by the partial
 * unique index in backend/ticket/migrations/20260924000000_add_join_codes/migration.sql,
 * not by application code. These tests verify the rotate() implementation's structure
 * and parameter handling within a transaction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockWithTransaction,
  mockDb,
} = vi.hoisted(() => ({
  mockWithTransaction: vi.fn(),
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
  },
}));

// Mock modules that transitively import Encore native runtime
vi.mock("../../settings", () => ({
  defaultAutoCloseSettings: { enabled: true, awaitingResponseDays: 2 },
}));
vi.mock("../../notifications/templates/utils", () => ({
  notificationTemplatesDefault: {},
}));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  withTransaction: mockWithTransaction,
  marketCenterRepository: {
    findById: vi.fn(),
  },
  fromTimestamp: (val: any) => (val ? new Date(val) : null),
  toTimestamp: (val: any) => (val ? val.toISOString() : null),
  toJson: (val: any) => JSON.stringify(val),
  fromJson: (val: any) =>
    val ? (typeof val === "string" ? JSON.parse(val) : val) : null,
  generateId: vi.fn().mockReturnValue("generated-id-123"),
}));

import { joinCodeRepository } from "./join-code.repository";

describe("Join Code Repository - rotate()", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("UPDATE deactivates prior active row with correct WHERE clause", async () => {
    const mockTx = {
      exec: vi.fn(),
      queryRow: vi.fn(),
      queryAll: vi.fn(),
      query: vi.fn(),
    };

    const newJoinCodeRow = {
      id: "jc-new-123",
      market_center_id: "mc-1",
      code: "ABC12345",
      created_by: "user-1",
      is_active: true,
      created_at: new Date("2026-09-24"),
    };

    mockTx.queryRow.mockResolvedValue(newJoinCodeRow);
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    await joinCodeRepository.rotate("mc-1", () => "ABC12345", "user-1");

    // Reconstruct the UPDATE SQL from template literals
    const updateCall = mockTx.exec.mock.calls[0];
    const updateSql = updateCall[0].join("?");

    // Assert UPDATE contains required deactivation logic
    expect(updateSql).toContain("UPDATE market_center_join_codes");
    expect(updateSql).toContain("is_active = false");
    expect(updateSql).toContain("deactivated_at");
    expect(updateSql).toContain("market_center_id = ?");
    expect(updateSql).toContain("is_active = true");

    // Verify the market_center_id parameter is passed
    expect(updateCall[1]).toBe("mc-1");
  });

  it("INSERT carries marketCenterId, code, and createdBy in correct order", async () => {
    const mockTx = {
      exec: vi.fn(),
      queryRow: vi.fn(),
      queryAll: vi.fn(),
      query: vi.fn(),
    };

    const newJoinCodeRow = {
      id: "jc-new-456",
      market_center_id: "mc-2",
      code: "XYZ98765",
      created_by: "admin-user",
      is_active: true,
      created_at: new Date("2026-09-24"),
    };

    mockTx.queryRow.mockResolvedValue(newJoinCodeRow);
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    await joinCodeRepository.rotate("mc-2", () => "XYZ98765", "admin-user");

    // Reconstruct the INSERT SQL from template literals
    const insertCall = mockTx.queryRow.mock.calls[0];
    const insertSql = insertCall[0].join("?");

    // Assert INSERT structure
    expect(insertSql).toContain("INSERT INTO market_center_join_codes");
    expect(insertSql).toContain("market_center_id");
    expect(insertSql).toContain("code");
    expect(insertSql).toContain("created_by");
    expect(insertSql).toContain("RETURNING");

    // Verify parameters in correct order: marketCenterId, code, createdBy
    expect(insertCall[1]).toBe("mc-2");      // marketCenterId
    expect(insertCall[2]).toBe("XYZ98765");   // code
    expect(insertCall[3]).toBe("admin-user"); // createdBy
  });

  it("UPDATE executes before INSERT within a single transaction", async () => {
    const mockTx = {
      exec: vi.fn(),
      queryRow: vi.fn(),
      queryAll: vi.fn(),
      query: vi.fn(),
    };

    const newJoinCodeRow = {
      id: "jc-new-789",
      market_center_id: "mc-3",
      code: "NEW99999",
      created_by: "sys",
      is_active: true,
      created_at: new Date("2026-09-24"),
    };

    mockTx.queryRow.mockResolvedValue(newJoinCodeRow);
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    await joinCodeRepository.rotate("mc-3", () => "NEW99999", "sys");

    // Verify withTransaction was called exactly once
    expect(mockWithTransaction).toHaveBeenCalledTimes(1);

    // Verify UPDATE was called before INSERT (by invocation order)
    const execCallOrder = mockTx.exec.mock.invocationCallOrder[0];
    const queryRowCallOrder = mockTx.queryRow.mock.invocationCallOrder[0];
    expect(execCallOrder).toBeLessThan(queryRowCallOrder);

    // Both operations were within the transaction callback
    expect(mockTx.exec).toHaveBeenCalledTimes(1);
    expect(mockTx.queryRow).toHaveBeenCalledTimes(1);
  });

  it("rejects when INSERT fails for a reason other than a unique violation", async () => {
    const mockTx = {
      exec: vi.fn(),
      queryRow: vi.fn().mockRejectedValue(new Error("UNIQUE violation: code")),
      queryAll: vi.fn(),
      query: vi.fn(),
    };

    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      try {
        return await fn(mockTx);
      } catch (error) {
        throw error;
      }
    });

    // Verify error propagates from rotate()
    await expect(
      joinCodeRepository.rotate("mc-1", () => "DUPLICATE", null)
    ).rejects.toThrow("UNIQUE violation: code");

    // Verify UPDATE was attempted before the INSERT failed
    expect(mockTx.exec).toHaveBeenCalled();
    expect(mockTx.queryRow).toHaveBeenCalled();
  });

  it("INSERT with null createdBy passes null parameter correctly", async () => {
    const mockTx = {
      exec: vi.fn(),
      queryRow: vi.fn(),
      queryAll: vi.fn(),
      query: vi.fn(),
    };

    const newJoinCodeRow = {
      id: "jc-auto",
      market_center_id: "mc-1",
      code: "AUTO1234",
      created_by: null,
      is_active: true,
      created_at: new Date("2026-09-24"),
    };

    mockTx.queryRow.mockResolvedValue(newJoinCodeRow);
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    const result = await joinCodeRepository.rotate("mc-1", () => "AUTO1234", null);

    // Verify null is passed as the createdBy parameter
    const insertCall = mockTx.queryRow.mock.calls[0];
    expect(insertCall[3]).toBeNull();

    // Verify the row is returned correctly with null createdBy
    expect(result.createdBy).toBeNull();
  });

  // ---- Concurrency and collision handling ----

  function makeTx() {
    return {
      exec: vi.fn(),
      queryRow: vi.fn(),
      queryAll: vi.fn(),
      query: vi.fn(),
    };
  }

  function uniqueViolation(message: string) {
    return Object.assign(new Error(message), { code: "23505" });
  }

  it("INSERT is idempotent against the one-active-code index, not a bare DO NOTHING", async () => {
    const mockTx = makeTx();
    mockTx.queryRow.mockResolvedValue({
      id: "jc-1",
      market_center_id: "mc-1",
      code: "ABC12345",
      created_by: null,
      is_active: true,
      created_at: new Date("2026-09-24"),
    });
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    await joinCodeRepository.rotate("mc-1", () => "ABC12345", null);

    const insertSql = mockTx.queryRow.mock.calls[0][0].join("?");
    // A bare INSERT turns the mint-on-read race (two Settings loads, or React
    // StrictMode's double effect) into an unmapped 23505 -> 500. A bare
    // `ON CONFLICT DO NOTHING` would over-swallow instead, silently returning
    // some other market center's row on a `code` collision, so the conflict
    // target must name the partial index's column and predicate.
    expect(insertSql).toContain("ON CONFLICT (market_center_id) WHERE is_active");
    expect(insertSql).toContain("DO NOTHING");
  });

  it("a mint that loses the race returns the winning code instead of failing", async () => {
    const mockTx = makeTx();
    // INSERT ... DO NOTHING matched nothing: someone else committed first.
    mockTx.queryRow.mockResolvedValueOnce(null);
    // The follow-up SELECT finds the winner's row.
    mockTx.queryRow.mockResolvedValueOnce({
      id: "jc-winner",
      market_center_id: "mc-1",
      code: "WINNER99",
      created_by: "other-admin",
      is_active: true,
      created_at: new Date("2026-09-24"),
    });
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    const result = await joinCodeRepository.rotate("mc-1", () => "LOSER123", null);

    expect(result.code).toBe("WINNER99");
    const selectSql = mockTx.queryRow.mock.calls[1][0].join("?");
    expect(selectSql).toContain("SELECT * FROM market_center_join_codes");
    expect(selectSql).toContain("is_active = true");
  });

  it("retries with a freshly generated code when the code collides", async () => {
    const mockTx = makeTx();
    const winningRow = {
      id: "jc-2",
      market_center_id: "mc-1",
      code: "FRESH222",
      created_by: null,
      is_active: true,
      created_at: new Date("2026-09-24"),
    };
    mockTx.queryRow
      .mockRejectedValueOnce(
        uniqueViolation("duplicate key value violates unique constraint")
      )
      .mockResolvedValueOnce(winningRow);
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    const codes = ["TAKEN111", "FRESH222"];
    let issued = 0;
    const result = await joinCodeRepository.rotate(
      "mc-1",
      () => codes[issued++],
      null
    );

    // Without the retry, a collision on `code TEXT NOT NULL UNIQUE` surfaces as
    // a raw 500 for the admin opening Settings -- the case the spec calls out
    // as "collisions retry".
    expect(issued).toBe(2);
    expect(result.code).toBe("FRESH222");
    // Each attempt re-runs the transaction: a 23505 aborts the one in flight.
    expect(mockWithTransaction).toHaveBeenCalledTimes(2);
  });

  it("gives up after a bounded number of collisions rather than looping forever", async () => {
    const mockTx = makeTx();
    mockTx.queryRow.mockRejectedValue(
      uniqueViolation("duplicate key value violates unique constraint")
    );
    mockWithTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockTx)
    );

    let issued = 0;
    await expect(
      joinCodeRepository.rotate("mc-1", () => `TAKEN${issued++}`, null)
    ).rejects.toThrow("duplicate key");

    // An unbounded retry would hang the request forever if the collision were
    // caused by something other than luck (e.g. a broken generator).
    expect(issued).toBe(5);
  });
});
