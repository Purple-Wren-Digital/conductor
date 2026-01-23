/**
 * Tests for Market Center endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockDb, mockWithTransaction, mockUserContext } = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
    begin: vi.fn(),
  },
  mockWithTransaction: vi.fn(),
  mockUserContext: {
    name: "Admin User",
    userId: "admin-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-admin",
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "not_found";
      return err;
    }),
    invalidArgument: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "invalid_argument";
      return err;
    }),
    permissionDenied: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "permission_denied";
      return err;
    }),
  },
}));

// Mock the database module
vi.mock("../ticket/db", () => ({
  db: mockDb,
  withTransaction: mockWithTransaction,
  fromTimestamp: vi.fn((d) => d),
  toJson: vi.fn((d) => JSON.stringify(d)),
}));

// Mock the auth module
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

vi.mock("../auth/permissions", () => ({
  canManageMarketCenters: vi.fn(() => Promise.resolve(true)),
}));

import { update } from "./update";
import { getUserContext } from "../auth/user-context";
import { canManageMarketCenters } from "../auth/permissions";

describe("Market Center Update", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default admin user context
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    vi.mocked(canManageMarketCenters).mockResolvedValue(true);
  });

  describe("User removal from market center", () => {
    it("should remove users from market center when they are not in the new users list", async () => {
      // Setup: Market center with existing users
      mockDb.queryRow.mockResolvedValue({
        id: "mc-123",
        name: "Test Market Center",
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Existing users in market center
      mockDb.queryAll.mockResolvedValue([
        {
          id: "user-1",
          email: "user1@test.com",
          name: "User 1",
          role: "STAFF",
        },
        {
          id: "user-2",
          email: "user2@test.com",
          name: "User 2",
          role: "STAFF",
        },
        {
          id: "user-3",
          email: "user3@test.com",
          name: "User 3",
          role: "AGENT",
        },
      ]);

      // Mock transaction
      const mockTx = {
        exec: vi.fn(),
        queryRow: vi.fn().mockResolvedValue({
          id: "mc-123",
          name: "Test Market Center",
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      mockWithTransaction.mockImplementation(async (fn) => {
        return fn(mockTx as any);
      });

      // Call update with only user-1 (removing user-2 and user-3)
      const result = await update({
        id: "mc-123",
        users: [
          {
            id: "user-1",
            email: "user1@test.com",
            name: "User 1",
            role: "STAFF",
          } as any,
        ],
      });

      // Verify transaction was called
      expect(mockWithTransaction).toHaveBeenCalled();

      // Verify users were removed (SET market_center_id = NULL)
      const execCalls = mockTx.exec.mock.calls;

      // Should have exec calls for removing users
      const removeUserCalls = execCalls.filter((call: any) => {
        const sql = call[0]?.join?.(" ") || "";
        return (
          sql.includes("market_center_id = NULL") ||
          sql.includes("market_center_id")
        );
      });

      // Expecting 2 remove calls (for user-2 and user-3)
      expect(removeUserCalls.length).toBeGreaterThanOrEqual(2);

      // Verify usersToNotify includes removed users
      expect(result.usersToNotify).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-2", updateType: "removed" }),
          expect.objectContaining({ id: "user-3", updateType: "removed" }),
        ])
      );
    });

    it("should add users to market center when they are new", async () => {
      mockDb.queryRow.mockResolvedValue({
        id: "mc-123",
        name: "Test Market Center",
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      // No existing users
      mockDb.queryAll.mockResolvedValue([]);

      const mockTx = {
        exec: vi.fn(),
        queryRow: vi.fn().mockResolvedValue({
          id: "mc-123",
          name: "Test Market Center",
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      mockWithTransaction.mockImplementation(async (fn) => {
        return fn(mockTx as any);
      });

      const result = await update({
        id: "mc-123",
        users: [
          {
            id: "user-new",
            email: "new@test.com",
            name: "New User",
            role: "STAFF",
          } as any,
        ],
      });

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(result.usersToNotify).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-new", updateType: "added" }),
        ])
      );
    });

    it("should handle empty users array (remove all users)", async () => {
      mockDb.queryRow.mockResolvedValue({
        id: "mc-123",
        name: "Test Market Center",
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDb.queryAll.mockResolvedValue([
        {
          id: "user-1",
          email: "user1@test.com",
          name: "User 1",
          role: "STAFF",
        },
      ]);

      const mockTx = {
        exec: vi.fn(),
        queryRow: vi.fn().mockResolvedValue({
          id: "mc-123",
          name: "Test Market Center",
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      mockWithTransaction.mockImplementation(async (fn) => {
        return fn(mockTx as any);
      });

      const result = await update({
        id: "mc-123",
        users: [],
      });

      expect(result.usersToNotify).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "user-1", updateType: "removed" }),
        ])
      );
    });
  });

  describe("Transaction handling", () => {
    it("should commit transaction on success", async () => {
      mockDb.queryRow.mockResolvedValue({
        id: "mc-123",
        name: "Old Name",
        settings: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockDb.queryAll.mockResolvedValue([]);

      const mockTx = {
        exec: vi.fn(),
        queryRow: vi.fn().mockResolvedValue({
          id: "mc-123",
          name: "New Name",
          settings: {},
          created_at: new Date(),
          updated_at: new Date(),
        }),
      };

      mockWithTransaction.mockImplementation(async (fn) => {
        return fn(mockTx as any);
      });

      await update({
        id: "mc-123",
        name: "New Name",
      });

      expect(mockWithTransaction).toHaveBeenCalled();
    });
  });
});
