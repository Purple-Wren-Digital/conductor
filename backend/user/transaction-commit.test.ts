import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests that transaction-based endpoints call tx.commit().
 * Without explicit commits, `await using tx` relies on implicit disposal
 * which can hold connections/locks longer than necessary.
 */

const {
  mockTx,
  mockDb,
  mockUserRepository,
  mockUserContext,
} = vi.hoisted(() => {
  const mockTx = {
    exec: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    [Symbol.asyncDispose]: vi.fn(),
  };

  return {
    mockTx,
    mockDb: {
      begin: vi.fn(() => Promise.resolve(mockTx)),
      queryRow: vi.fn(),
      exec: vi.fn(),
    },
    mockUserRepository: {
      findById: vi.fn(),
      findByIdWithSettings: vi.fn(),
      createUserSettings: vi.fn(),
      createNotificationPreferences: vi.fn(),
    },
    mockUserContext: {
      userId: "user-123",
      email: "admin@test.com",
      role: "ADMIN" as const,
      marketCenterId: "mc-123",
      clerkId: "clerk-123",
      name: "Admin",
      isSuperuser: false,
    },
  };
});

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config: any, handler: any) => handler),
  APIError: {
    permissionDenied: vi.fn((msg: string) => new Error(msg)),
    notFound: vi.fn((msg: string) => new Error(msg)),
    aborted: vi.fn((msg: string) => new Error(msg)),
    internal: vi.fn((msg: string) => new Error(msg)),
    invalidArgument: vi.fn((msg: string) => new Error(msg)),
  },
}));

vi.mock("../ticket/db", () => ({
  db: mockDb,
  userRepository: mockUserRepository,
  toJson: vi.fn((obj: any) => JSON.stringify(obj)),
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

vi.mock("../auth/permissions", () => ({
  canDeactivateUsers: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../utils", () => ({
  defaultNotificationPreferences: [
    { type: "TICKET_CREATED", category: "TICKET", frequency: "INSTANT", email: true, push: false, inApp: true, sms: false },
  ],
}));

import { deleteUser } from "./delete";
import { resetNotificationPreferences } from "./settings/notificationPreferences/reset";
import { updateNotificationPreferences } from "./settings/notificationPreferences/update";

describe("Transaction commit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.exec.mockResolvedValue(undefined);
    mockTx.commit.mockResolvedValue(undefined);
  });

  describe("deleteUser", () => {
    it("should call tx.commit() after deactivating user", async () => {
      const mockUser = {
        id: "user-456",
        isActive: true,
        email: "user@test.com",
        name: "Test User",
        role: "AGENT",
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockDb.queryRow.mockResolvedValue({ deleted_at: null });

      await deleteUser({ id: "user-456" });

      expect(mockDb.begin).toHaveBeenCalled();
      expect(mockTx.exec).toHaveBeenCalledTimes(2); // UPDATE + INSERT history
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe("resetNotificationPreferences", () => {
    it("should call tx.commit() after resetting preferences", async () => {
      const mockUser = {
        id: "user-123",
        userSettings: {
          id: "settings-1",
          notificationPreferences: [{ id: "pref-1" }],
        },
      };

      mockUserRepository.findByIdWithSettings.mockResolvedValue(mockUser);

      await resetNotificationPreferences({ id: "user-123" });

      expect(mockDb.begin).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateNotificationPreferences", () => {
    it("should call tx.commit() after updating preferences", async () => {
      const mockUser = {
        id: "user-123",
        userSettings: { id: "settings-1" },
      };

      mockUserRepository.findByIdWithSettings.mockResolvedValue(mockUser);

      await updateNotificationPreferences({
        id: "user-123",
        notificationPreferences: [
          { id: "pref-1", frequency: "INSTANT", email: true, push: false, inApp: true, sms: false },
        ],
      });

      expect(mockDb.begin).toHaveBeenCalled();
      expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });
  });
});
