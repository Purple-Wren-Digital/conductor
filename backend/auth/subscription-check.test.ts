import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockSubscriptionRepository, mockCheckSubscriptionLimit } = vi.hoisted(
  () => ({
    mockSubscriptionRepository: {
      findByMarketCenterId: vi.fn(),
      findByMarketCenterIdWithUserCount: vi.fn(),
      findByMarketCenterIdWithCategoryCount: vi.fn(),
    },
    mockCheckSubscriptionLimit: vi.fn(),
  })
);

// Mock subscription repository
vi.mock("../shared/repositories", () => ({
  subscriptionRepository: mockSubscriptionRepository,
}));

// Mock subscription module
vi.mock("../subscription/subscription", () => ({
  checkSubscriptionLimit: mockCheckSubscriptionLimit,
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  APIError: {
    failedPrecondition: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "failed_precondition";
      return err;
    }),
    resourceExhausted: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "resource_exhausted";
      return err;
    }),
  },
}));

import {
  requireActiveSubscription,
  checkCanAddUser,
  checkCanCreateTicket,
  checkCanAddCategory,
  getSubscriptionContext,
  checkFeatureAccess,
  checkCanCreateMarketCenter,
} from "./subscription-check";
import { SubscriptionStatus } from "../subscription/types";
import type { User } from "../user/types";

// Helper to create a subscription
function createSubscription(overrides: any = {}) {
  return {
    id: "sub-123",
    marketCenterId: "mc-123",
    status: SubscriptionStatus.ACTIVE,
    planType: "TEAM",
    includedSeats: 5,
    additionalSeats: 0,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    features: {
      maxTicketsPerMonth: 100,
      customCategories: 10,
      customBranding: true,
    },
    ...overrides,
  };
}

// Helper to create a user
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "user@test.com",
    name: "Test User",
    role: "STAFF",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("Subscription Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireActiveSubscription", () => {
    it("should not throw for ACTIVE subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      await expect(
        requireActiveSubscription("mc-123")
      ).resolves.not.toThrow();
    });

    it("should not throw for TRIALING subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.TRIALING,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      await expect(
        requireActiveSubscription("mc-123")
      ).resolves.not.toThrow();
    });

    it("should throw when no subscription exists", async () => {
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);

      await expect(requireActiveSubscription("mc-123")).rejects.toThrow(
        "No subscription found. Please subscribe to continue."
      );
    });

    describe("PAST_DUE subscription with grace period", () => {
      it("should not throw when within 7-day grace period", async () => {
        // Period ended 3 days ago - still within grace period
        const subscription = createSubscription({
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
          subscription
        );

        await expect(
          requireActiveSubscription("mc-123")
        ).resolves.not.toThrow();
      });

      it("should throw when grace period has expired", async () => {
        // Period ended 10 days ago - grace period expired
        const subscription = createSubscription({
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
          subscription
        );

        await expect(requireActiveSubscription("mc-123")).rejects.toThrow(
          "Subscription is past due. Please update your payment method."
        );
      });

      it("should not throw at exactly 7 days", async () => {
        // Period ended exactly 7 days ago (edge case - still valid)
        const subscription = createSubscription({
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000 + 1000
          ), // 7 days minus 1 second
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
          subscription
        );

        await expect(
          requireActiveSubscription("mc-123")
        ).resolves.not.toThrow();
      });
    });

    it("should throw for CANCELED subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.CANCELED,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      await expect(requireActiveSubscription("mc-123")).rejects.toThrow(
        "Subscription is CANCELED. Please contact support."
      );
    });

    it("should throw for UNPAID subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.UNPAID,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      await expect(requireActiveSubscription("mc-123")).rejects.toThrow(
        "Subscription is UNPAID. Please contact support."
      );
    });

    it("should throw for PAUSED subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.PAUSED,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      await expect(requireActiveSubscription("mc-123")).rejects.toThrow(
        "Subscription is PAUSED. Please contact support."
      );
    });
  });

  describe("checkCanAddUser", () => {
    it("should not throw when under user limit", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(true);

      await expect(checkCanAddUser("mc-123")).resolves.not.toThrow();
      expect(mockCheckSubscriptionLimit).toHaveBeenCalledWith("mc-123", "users");
    });

    it("should throw when user limit is reached", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(false);
      mockSubscriptionRepository.findByMarketCenterIdWithUserCount.mockResolvedValue(
        {
          subscription: createSubscription({
            includedSeats: 5,
            additionalSeats: 0,
          }),
          activeUserCount: 5,
        }
      );

      await expect(checkCanAddUser("mc-123")).rejects.toThrow(
        "User limit reached (5/5 seats)"
      );
    });

    it("should include additional seats in limit message", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(false);
      mockSubscriptionRepository.findByMarketCenterIdWithUserCount.mockResolvedValue(
        {
          subscription: createSubscription({
            includedSeats: 5,
            additionalSeats: 3,
          }),
          activeUserCount: 8,
        }
      );

      await expect(checkCanAddUser("mc-123")).rejects.toThrow(
        "User limit reached (8/8 seats)"
      );
    });

    it("should throw when no subscription found", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(false);
      mockSubscriptionRepository.findByMarketCenterIdWithUserCount.mockResolvedValue(
        null
      );

      await expect(checkCanAddUser("mc-123")).rejects.toThrow(
        "No subscription found. Please subscribe to continue."
      );
    });
  });

  describe("checkCanCreateTicket", () => {
    // Note: Ticket limit checking is disabled - unlimited tickets allowed
    it("should always allow ticket creation (unlimited tickets)", async () => {
      await expect(checkCanCreateTicket("mc-123")).resolves.not.toThrow();
      // checkSubscriptionLimit should NOT be called since ticket limits are disabled
      expect(mockCheckSubscriptionLimit).not.toHaveBeenCalled();
    });

    it("should not check limits even with mock subscription", async () => {
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        createSubscription({
          features: { maxTicketsPerMonth: 50 },
        })
      );

      // Should still not throw - ticket limits disabled
      await expect(checkCanCreateTicket("mc-123")).resolves.not.toThrow();
    });

    it("should not check limits for any market center", async () => {
      // Even with no subscription, should not throw
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);

      await expect(checkCanCreateTicket("mc-123")).resolves.not.toThrow();
    });
  });

  describe("checkCanAddCategory", () => {
    it("should not throw when under category limit", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(true);

      await expect(checkCanAddCategory("mc-123")).resolves.not.toThrow();
      expect(mockCheckSubscriptionLimit).toHaveBeenCalledWith(
        "mc-123",
        "categories"
      );
    });

    it("should throw when category limit is reached", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(false);
      mockSubscriptionRepository.findByMarketCenterIdWithCategoryCount.mockResolvedValue(
        {
          subscription: createSubscription({
            features: { customCategories: 10 },
          }),
          categoryCount: 10,
        }
      );

      await expect(checkCanAddCategory("mc-123")).rejects.toThrow(
        "Category limit reached (10/10 categories)"
      );
    });

    it("should handle missing result gracefully", async () => {
      mockCheckSubscriptionLimit.mockResolvedValue(false);
      mockSubscriptionRepository.findByMarketCenterIdWithCategoryCount.mockResolvedValue(
        null
      );

      await expect(checkCanAddCategory("mc-123")).rejects.toThrow(
        "Category limit reached (0/0 categories)"
      );
    });
  });

  describe("getSubscriptionContext", () => {
    it("should return inactive context for user without market center", async () => {
      const user = createUser({ marketCenterId: null });

      const result = await getSubscriptionContext(user);

      expect(result).toEqual({
        hasActiveSubscription: false,
        canAddUsers: false,
        canCreateTickets: false,
        canAddCategories: false,
      });
    });

    it("should return inactive context when no subscription found", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);

      const result = await getSubscriptionContext(user);

      expect(result).toEqual({
        hasActiveSubscription: false,
        canAddUsers: false,
        canCreateTickets: false,
        canAddCategories: false,
      });
    });

    it("should return active context for ACTIVE subscription", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );
      mockCheckSubscriptionLimit.mockResolvedValue(true);

      const result = await getSubscriptionContext(user);

      expect(result.hasActiveSubscription).toBe(true);
      expect(result.canAddUsers).toBe(true);
      expect(result.canCreateTickets).toBe(true);
      expect(result.canAddCategories).toBe(true);
      expect(result.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
      expect(result.planType).toBe("TEAM");
    });

    it("should return active context for TRIALING subscription", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      const subscription = createSubscription({
        status: SubscriptionStatus.TRIALING,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );
      mockCheckSubscriptionLimit.mockResolvedValue(true);

      const result = await getSubscriptionContext(user);

      expect(result.hasActiveSubscription).toBe(true);
      expect(result.subscriptionStatus).toBe(SubscriptionStatus.TRIALING);
    });

    it("should return inactive context for CANCELED subscription", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      const subscription = createSubscription({
        status: SubscriptionStatus.CANCELED,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await getSubscriptionContext(user);

      expect(result.hasActiveSubscription).toBe(false);
      expect(result.canAddUsers).toBe(false);
      expect(result.subscriptionStatus).toBe(SubscriptionStatus.CANCELED);
    });

    it("should check individual limits correctly", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      // Can add users, can't create tickets, can add categories
      mockCheckSubscriptionLimit
        .mockResolvedValueOnce(true) // users
        .mockResolvedValueOnce(false) // tickets
        .mockResolvedValueOnce(true); // categories

      const result = await getSubscriptionContext(user);

      expect(result.canAddUsers).toBe(true);
      expect(result.canCreateTickets).toBe(false);
      expect(result.canAddCategories).toBe(true);
    });

    it("should include features in context", async () => {
      const user = createUser({ marketCenterId: "mc-123" });
      const features = { customBranding: true, apiAccess: true };
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
        features,
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );
      mockCheckSubscriptionLimit.mockResolvedValue(true);

      const result = await getSubscriptionContext(user);

      expect(result.features).toEqual(features);
    });
  });

  describe("checkFeatureAccess", () => {
    it("should return false when no subscription exists", async () => {
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);

      const result = await checkFeatureAccess("mc-123", "customBranding");

      expect(result).toBe(false);
    });

    it("should return false for inactive subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.CANCELED,
        features: { customBranding: true },
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "customBranding");

      expect(result).toBe(false);
    });

    it("should return true when feature is enabled (true)", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
        features: { customBranding: true },
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "customBranding");

      expect(result).toBe(true);
    });

    it("should return true when feature is unlimited (-1)", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
        features: { apiCalls: -1 },
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "apiCalls");

      expect(result).toBe(true);
    });

    it("should return false when feature is disabled (false)", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
        features: { customBranding: false },
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "customBranding");

      expect(result).toBe(false);
    });

    it("should return false when feature is not defined", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.ACTIVE,
        features: {},
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "nonExistentFeature");

      expect(result).toBe(false);
    });

    it("should work for TRIALING subscription", async () => {
      const subscription = createSubscription({
        status: SubscriptionStatus.TRIALING,
        features: { customBranding: true },
      });
      mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(
        subscription
      );

      const result = await checkFeatureAccess("mc-123", "customBranding");

      expect(result).toBe(true);
    });
  });

  describe("checkCanCreateMarketCenter", () => {
    describe("first market center creation (no existing market center)", () => {
      it("should allow creating first market center when user has no market center", async () => {
        await expect(checkCanCreateMarketCenter(null)).resolves.not.toThrow();
        // Should not even check subscription since user has no market center
        expect(mockSubscriptionRepository.findByMarketCenterId).not.toHaveBeenCalled();
      });

      it("should allow creating first market center with undefined market center id", async () => {
        await expect(checkCanCreateMarketCenter(null)).resolves.not.toThrow();
      });
    });

    describe("additional market center creation (user has existing market center)", () => {
      it("should throw when no subscription exists for existing market center", async () => {
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "No active subscription found. Please subscribe to continue."
        );
      });

      it("should throw for STARTER plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.ACTIVE,
          planType: "STARTER",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Multiple market centers require an Enterprise subscription"
        );
      });

      it("should throw for TEAM plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.ACTIVE,
          planType: "TEAM",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Multiple market centers require an Enterprise subscription"
        );
      });

      it("should throw for BUSINESS plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.ACTIVE,
          planType: "BUSINESS",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Multiple market centers require an Enterprise subscription"
        );
      });

      it("should allow ENTERPRISE plan to create additional market centers", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.ACTIVE,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).resolves.not.toThrow();
      });

      it("should allow ENTERPRISE plan with TRIALING status", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.TRIALING,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).resolves.not.toThrow();
      });
    });

    describe("subscription status checks", () => {
      it("should throw for CANCELED subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.CANCELED,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is CANCELED. Please update your billing to continue."
        );
      });

      it("should throw for PAST_DUE subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.PAST_DUE,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is PAST_DUE. Please update your billing to continue."
        );
      });

      it("should throw for UNPAID subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.UNPAID,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is UNPAID. Please update your billing to continue."
        );
      });

      it("should throw for PAUSED subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.PAUSED,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is PAUSED. Please update your billing to continue."
        );
      });

      it("should throw for INCOMPLETE subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.INCOMPLETE,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is INCOMPLETE. Please update your billing to continue."
        );
      });

      it("should throw for INCOMPLETE_EXPIRED subscription even with ENTERPRISE plan", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.INCOMPLETE_EXPIRED,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          "Subscription is INCOMPLETE_EXPIRED. Please update your billing to continue."
        );
      });
    });

    describe("error messages", () => {
      it("should include upgrade suggestion in error for non-Enterprise plans", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.ACTIVE,
          planType: "BUSINESS",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          /Please upgrade to create additional market centers/
        );
      });

      it("should include billing update suggestion for inactive subscriptions", async () => {
        const subscription = createSubscription({
          status: SubscriptionStatus.CANCELED,
          planType: "ENTERPRISE",
        });
        mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(subscription);

        await expect(checkCanCreateMarketCenter("mc-123")).rejects.toThrow(
          /Please update your billing to continue/
        );
      });
    });
  });
});
