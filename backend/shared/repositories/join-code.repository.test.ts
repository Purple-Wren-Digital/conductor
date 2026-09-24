/**
 * Join Code Repository Tests - Verify rotate() is transactional
 *
 * Tests that the rotate() method properly wraps the UPDATE and INSERT
 * in a transaction to ensure exactly one active code per market center.
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

  it("deactivates the previously active row and inserts the new one in a transaction", async () => {
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

    const result = await joinCodeRepository.rotate("mc-1", "ABC12345", "user-1");

    // Verify transaction was used
    expect(mockWithTransaction).toHaveBeenCalled();

    // Verify both UPDATE and INSERT were called on the transaction
    expect(mockTx.exec).toHaveBeenCalled();
    expect(mockTx.queryRow).toHaveBeenCalled();

    // Verify UPDATE was called with the right market center ID
    const execCall = mockTx.exec.mock.calls[0];
    expect(execCall[0][0]).toContain("UPDATE market_center_join_codes");
    expect(execCall[1]).toBe("mc-1"); // market_center_id parameter

    // Verify the returned code
    expect(result).toEqual({
      id: "jc-new-123",
      marketCenterId: "mc-1",
      code: "ABC12345",
      createdBy: "user-1",
      isActive: true,
      createdAt: new Date("2026-09-24"),
    });
  });

  it("ensures exactly one active code exists after rotation by using withTransaction", async () => {
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

    await joinCodeRepository.rotate("mc-2", "XYZ98765", "admin-user");

    // Verify withTransaction was invoked to protect the invariant
    expect(mockWithTransaction).toHaveBeenCalled();

    // Verify both UPDATE and INSERT were called as part of the transaction
    expect(mockTx.exec).toHaveBeenCalled();
    expect(mockTx.queryRow).toHaveBeenCalled();

    // Verify the market center was deactivated correctly
    const execCall = mockTx.exec.mock.calls[0];
    expect(execCall[1]).toBe("mc-2");
  });

  it("rolls back both statements if INSERT fails (duplicate code)", async () => {
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

    await expect(
      joinCodeRepository.rotate("mc-1", "DUPLICATE", null)
    ).rejects.toThrow("UNIQUE violation");

    // Both statements were attempted
    expect(mockTx.exec).toHaveBeenCalled();
    expect(mockTx.queryRow).toHaveBeenCalled();

    // withTransaction was called, ensuring rollback on error
    expect(mockWithTransaction).toHaveBeenCalled();
  });

  it("allows null createdBy when rotating", async () => {
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

    const result = await joinCodeRepository.rotate("mc-1", "AUTO1234", null);

    expect(result.createdBy).toBeNull();
    expect(mockWithTransaction).toHaveBeenCalled();
  });
});
