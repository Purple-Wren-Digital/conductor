import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Covers the mechanism that puts two locations on one bill.
 *
 * A child market center is grouped with its parent by inheriting the parent's
 * Stripe customer and subscription ids into `primary_stripe_customer_id` /
 * `primary_stripe_subscription_id`. Every downstream "which market centers does
 * this subscription cover" query reads those columns, so if the inheritance is
 * skipped the new location looks unsubscribed -- the same state that left
 * Greenville Drive unable to assign paid roles for six months.
 *
 * create.test.ts already mocks an ENTERPRISE subscription but never asserts the
 * inheritance, so this path has no coverage despite being the whole feature.
 */
const {
  mockDb,
  mockMarketCenterRepository,
  mockSubscriptionRepository,
  mockUserRepository,
  mockUserMarketCenterRepository,
  mockActivityTopic,
} = vi.hoisted(() => ({
  mockDb: { queryRow: vi.fn(), queryAll: vi.fn(), exec: vi.fn() },
  mockMarketCenterRepository: {
    create: vi.fn(),
    initializeMarketCenterDefaults: vi.fn(),
    createHistory: vi.fn(),
  },
  mockSubscriptionRepository: {
    findByMarketCenterId: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
  mockUserRepository: { findById: vi.fn(), createHistory: vi.fn() },
  mockUserMarketCenterRepository: { addUserToMarketCenter: vi.fn() },
  mockActivityTopic: { publish: vi.fn() },
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((m) => Object.assign(new Error(m), { code: "not_found" })),
    invalidArgument: vi.fn((m) => Object.assign(new Error(m), { code: "invalid_argument" })),
    permissionDenied: vi.fn((m) => Object.assign(new Error(m), { code: "permission_denied" })),
    internal: vi.fn((m) => Object.assign(new Error(m), { code: "internal" })),
  },
}));
vi.mock("../ticket/db", () => ({
  db: mockDb,
  marketCenterRepository: mockMarketCenterRepository,
  subscriptionRepository: mockSubscriptionRepository,
  userRepository: mockUserRepository,
  userMarketCenterRepository: mockUserMarketCenterRepository,
}));
vi.mock("../auth/user-context", () => ({ getUserContext: vi.fn() }));
vi.mock("../auth/permissions", () => ({
  canCreateMarketCenters: vi.fn(() => Promise.resolve(true)),
}));
vi.mock("../notifications/activity-topic", () => ({ activityTopic: mockActivityTopic }));

import { create } from "./create";
import { getUserContext } from "../auth/user-context";

/** An admin sitting inside the paying market center. */
const ADMIN_IN_PARENT = {
  name: "Admin User",
  userId: "admin-123",
  email: "admin@test.com",
  role: "ADMIN" as const,
  marketCenterId: "mc-parent",
  clerkId: "clerk-admin",
  isSuperuser: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserContext).mockResolvedValue({ ...ADMIN_IN_PARENT } as any);
  mockActivityTopic.publish.mockResolvedValue(undefined);
  mockMarketCenterRepository.create.mockResolvedValue({
    id: "mc-location-2",
    name: "Location 2",
    settings: null,
  });
  mockSubscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
    "mc-parent",
    "mc-location-2",
  ]);
  mockUserRepository.findById.mockResolvedValue({
    id: "admin-123",
    name: "Admin User",
    marketCenterId: "mc-parent",
  });
  mockMarketCenterRepository.initializeMarketCenterDefaults.mockResolvedValue({
    id: "mc-location-2",
    name: "Location 2",
    settings: {},
    ticketCategories: [],
  });
});

/** What create() asked the repository to persist. */
function persisted() {
  return mockMarketCenterRepository.create.mock.calls[0][0];
}

describe("enterprise multi-location billing", () => {
  it("puts a second location on the parent's subscription", async () => {
    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      planType: "ENTERPRISE",
      stripeCustomerId: "cus_enterprise",
      stripeSubscriptionId: "sub_enterprise",
    });

    await create({ name: "Location 2" });

    // These two become primary_stripe_customer_id / _subscription_id, which is
    // what makes the two locations bill as one account.
    expect(persisted()).toMatchObject({
      name: "Location 2",
      stripeCustomerId: "cus_enterprise",
      stripeSubscriptionId: "sub_enterprise",
    });
  });

  it("does not group locations on a non-enterprise plan", async () => {
    // Early Bird and Standard are per-market-center. Inheriting here would
    // silently give a second location a subscription nobody paid for.
    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      planType: "EARLY_BIRD",
      stripeCustomerId: "cus_earlybird",
      stripeSubscriptionId: "sub_earlybird",
    });

    await create({ name: "Location 2" });

    expect(persisted().stripeCustomerId).toBeUndefined();
    expect(persisted().stripeSubscriptionId).toBeUndefined();
  });

  it("leaves a superuser-created market center unlinked to any subscription", async () => {
    // The trap: the subscription is looked up from the CALLER's market center,
    // so a superuser provisioning from outside the org inherits nothing and
    // the new market center starts life with no subscription -- exactly how
    // Greenville Drive ended up unable to assign paid roles.
    vi.mocked(getUserContext).mockResolvedValue({
      ...ADMIN_IN_PARENT,
      marketCenterId: null,
      isSuperuser: true,
    } as any);

    await create({ name: "Location 2" });

    expect(mockSubscriptionRepository.findByMarketCenterId).not.toHaveBeenCalled();
    expect(persisted().stripeCustomerId).toBeUndefined();
  });
});
