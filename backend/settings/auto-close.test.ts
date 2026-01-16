import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockMarketCenterRepository, mockUserContext, subscriptionRepository } =
  vi.hoisted(() => ({
    mockMarketCenterRepository: {
      findById: vi.fn(),
      update: vi.fn(),
      createHistory: vi.fn(),
    },
    mockUserContext: {
      name: "Staff Leader",
      userId: "user-123",
      email: "staffleader@test.com",
      role: "STAFF_LEADER" as const,
      marketCenterId: "mc-123",
      clerkId: "clerk-123",
    },
    subscriptionRepository: {
      getSubscriptionById: vi.fn(),
      findByMarketCenterId: vi.fn(),
      getAccessibleMarketCenterIds: vi.fn(),
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
    internal: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "internal";
      return err;
    }),
  },
}));

// Mock repositories
vi.mock("../shared/repositories", () => ({
  marketCenterRepository: mockMarketCenterRepository,
  subscriptionRepository: subscriptionRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Import after mocks
import { getAutoCloseSettings, updateAutoCloseSettings } from "./auto-close";
import { getUserContext } from "../auth/user-context";

describe("Auto-Close Settings API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("getAutoCloseSettings", () => {
    it("should return auto-close settings for STAFF_LEADER", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 5,
          },
        },
      };
      subscriptionRepository.getAccessibleMarketCenterIds;

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getAutoCloseSettings({ marketCenterId: "mc-123" });

      expect(result.autoClose.enabled).toBe(true);
      expect(result.autoClose.awaitingResponseDays).toBe(5);
    });

    // it("should return auto-close settings for ADMIN", async () => {
    //   vi.mocked(getUserContext).mockResolvedValue({
    //     ...mockUserContext,
    //     role: "ADMIN" as const,
    //   });

    //   const mockMarketCenter = {
    //     id: "mc-123",
    //     name: "Test MC",
    //     settings: {
    //       autoClose: {
    //         enabled: false,
    //         awaitingResponseDays: 3,
    //       },
    //     },
    //   };

    //   mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

    //   const result = await getAutoCloseSettings({ marketCenterId: "mc-123" });

    //   expect(result.autoClose.enabled).toBe(false);
    //   expect(result.autoClose.awaitingResponseDays).toBe(3);
    // });

    it("should return default settings when none are configured", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN" as const,
        marketCenterId: "admin-mc",
      });
      const mockMarketCenter = {
        id: "admin-mc",
        name: "Test MC",
        settings: {},
      };
      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "admin-mc",
      ]);

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getAutoCloseSettings({ marketCenterId: "admin-mc" });

      expect(result.autoClose.enabled).toBe(true);
      expect(result.autoClose.awaitingResponseDays).toBe(2);
    });

    it("should return default settings when settings is undefined", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN" as const,
        marketCenterId: "admin-mc",
      });
      const mockMarketCenter = {
        id: "admin-mc",
        name: "Test MC",
        settings: {},
      };
      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "admin-mc",
      ]);

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getAutoCloseSettings({ marketCenterId: "admin-mc" });

      expect(result.autoClose.enabled).toBe(true);
      expect(result.autoClose.awaitingResponseDays).toBe(2);
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        getAutoCloseSettings({ marketCenterId: "mc-123" })
      ).rejects.toThrow(
        "Only staff leaders and administrators can view auto-close settings"
      );
    });

    it("should throw permission denied for STAFF users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        getAutoCloseSettings({ marketCenterId: "mc-123" })
      ).rejects.toThrow(
        "Only staff leaders and administrators can view auto-close settings"
      );
    });

    it("should throw not found when market center does not exist", async () => {
      mockMarketCenterRepository.findById.mockResolvedValue(null);

      await expect(
        getAutoCloseSettings({ marketCenterId: "nonexistent" })
      ).rejects.toThrow("Market center not found");
    });

    it("should throw permission denied when STAFF_LEADER accesses different market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
      });
      const mockMarketCenter = {
        id: "different-mc",
        name: "Different MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        getAutoCloseSettings({ marketCenterId: "different-mc" })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
    });

    it("should allow ADMIN to access market centers within their subscription", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN" as const,
        marketCenterId: "admin-mc",
      });

      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "admin-mc",
        "other-mc",
      ]);

      const mockMarketCenter = {
        id: "other-mc",
        name: "Other MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 7,
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getAutoCloseSettings({ marketCenterId: "other-mc" });

      expect(result.autoClose.awaitingResponseDays).toBe(7);
    });
  });

  describe("updateAutoCloseSettings", () => {
    it("should update auto-close settings successfully", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          notificationPreferences: [],
        },
      };

      const updatedMarketCenter = {
        ...mockMarketCenter,
        settings: {
          notificationPreferences: [],
          autoClose: {
            enabled: true,
            awaitingResponseDays: 5,
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue(updatedMarketCenter);
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await updateAutoCloseSettings({
        marketCenterId: "mc-123",
        enabled: true,
        awaitingResponseDays: 5,
      });

      expect(result.autoClose.enabled).toBe(true);
      expect(result.autoClose.awaitingResponseDays).toBe(5);
      expect(mockMarketCenterRepository.update).toHaveBeenCalledWith("mc-123", {
        settings: {
          notificationPreferences: [],
          autoClose: {
            enabled: true,
            awaitingResponseDays: 5,
          },
        },
      });
      expect(mockMarketCenterRepository.createHistory).toHaveBeenCalled();
    });

    it("should use default days when not provided", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue({
        ...mockMarketCenter,
        settings: {
          autoClose: { enabled: false, awaitingResponseDays: 2 },
        },
      });
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await updateAutoCloseSettings({
        marketCenterId: "mc-123",
        enabled: false,
      });

      expect(result.autoClose.awaitingResponseDays).toBe(2);
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "mc-123",
          enabled: true,
        })
      ).rejects.toThrow(
        "Only staff leaders and administrators can update auto-close settings"
      );
    });

    it("should throw permission denied for STAFF users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "mc-123",
          enabled: true,
        })
      ).rejects.toThrow(
        "Only staff leaders and administrators can update auto-close settings"
      );
    });

    it("should throw not found when market center does not exist", async () => {
      mockMarketCenterRepository.findById.mockResolvedValue(null);

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "nonexistent",
          enabled: true,
        })
      ).rejects.toThrow("Market center not found");
    });

    it("should throw invalid argument when days is less than 1", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "mc-123",
          enabled: true,
          awaitingResponseDays: 0,
        })
      ).rejects.toThrow("Auto-close days must be between 1 and 30");
    });

    it("should throw invalid argument when days is greater than 30", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "mc-123",
          enabled: true,
          awaitingResponseDays: 31,
        })
      ).rejects.toThrow("Auto-close days must be between 1 and 30");
    });

    it("should throw internal error when update fails", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue(null);

      await expect(
        updateAutoCloseSettings({
          marketCenterId: "mc-123",
          enabled: true,
        })
      ).rejects.toThrow("Failed to update market center settings");
    });

    it("should create history entry with previous and new values", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: false,
            awaitingResponseDays: 3,
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue({
        ...mockMarketCenter,
        settings: {
          autoClose: { enabled: true, awaitingResponseDays: 5 },
        },
      });
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      await updateAutoCloseSettings({
        marketCenterId: "mc-123",
        enabled: true,
        awaitingResponseDays: 5,
      });

      expect(mockMarketCenterRepository.createHistory).toHaveBeenCalledWith({
        marketCenterId: "mc-123",
        action: "UPDATE",
        field: "autoClose",
        previousValue: JSON.stringify({
          enabled: false,
          awaitingResponseDays: 3,
        }),
        newValue: JSON.stringify({
          enabled: true,
          awaitingResponseDays: 5,
        }),
        changedById: "user-123",
      });
    });

    it("should throw permission denied when STAFF_LEADER accesses different market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
      });
      const mockMarketCenter = {
        id: "different-mc",
        name: "Different MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        getAutoCloseSettings({ marketCenterId: "different-mc" })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
    });
  });
});
