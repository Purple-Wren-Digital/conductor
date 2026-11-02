import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Covers subscribing a market center the caller is not a member of.
 *
 * Checkout previously read the market center from the authenticated user and
 * offered no way to name a different one, so an operator could only ever buy
 * for their own organisation. The only remaining route for a market center
 * provisioned by hand was to create the subscription in the Stripe dashboard --
 * which does not set `metadata.marketCenterId`, so the webhook discarded it and
 * the market center stayed unlinked while the card was charged. That is exactly
 * how Greenville Drive paid $399 and still could not assign a paid role.
 */
const {
  stripe,
  mockDb,
  mockUserRepository,
  mockSubscriptionRepository,
  mockGetAuthData,
} = vi.hoisted(() => ({
  stripe: {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
    subscriptionItems: { update: vi.fn(), create: vi.fn(), del: vi.fn() },
    prices: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
  mockDb: { queryRow: vi.fn() },
  mockUserRepository: { findByClerkId: vi.fn(), update: vi.fn() },
  mockSubscriptionRepository: { findByMarketCenterId: vi.fn() },
  mockGetAuthData: vi.fn(),
}));

vi.mock("stripe", () => ({ default: vi.fn(() => stripe) }));
vi.mock("encore.dev/api", () => {
  const api: any = vi.fn((_c: unknown, h: unknown) => h);
  api.raw = vi.fn((_c: unknown, h: unknown) => h);
  return {
    api,
    Header: {},
    APIError: {
      unauthenticated: (m: string) => Object.assign(new Error(m), { code: "unauthenticated" }),
      notFound: (m: string) => Object.assign(new Error(m), { code: "not_found" }),
      permissionDenied: (m: string) => Object.assign(new Error(m), { code: "permission_denied" }),
      invalidArgument: (m: string) => Object.assign(new Error(m), { code: "invalid_argument" }),
      alreadyExists: (m: string) => Object.assign(new Error(m), { code: "already_exists" }),
      failedPrecondition: (m: string) => Object.assign(new Error(m), { code: "failed_precondition" }),
    },
  };
});
vi.mock("~encore/auth", () => ({ getAuthData: mockGetAuthData }));
vi.mock("encore.dev/config", () => ({ secret: () => () => "sk_test_x" }));
vi.mock("encore.dev/log", () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("../ticket/db", () => ({
  db: mockDb,
  userRepository: mockUserRepository,
  subscriptionRepository: mockSubscriptionRepository,
}));
vi.mock("../auth/user-context", () => ({ getUserContext: vi.fn() }));

import { createCheckoutSession } from "./subscription";

const SUPERUSER = {
  id: "u-super",
  email: "ops@conductor.test",
  name: "Ops",
  role: "ADMIN",
  marketCenterId: "mc-ops",
  isSuperuser: true,
};

const TARGET = { id: "mc-drive", name: "Greenville Drive - 1080" };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthData.mockReturnValue({ userID: "clerk-super" });
  mockUserRepository.findByClerkId.mockResolvedValue({ ...SUPERUSER });
  mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue(null);
  mockDb.queryRow.mockResolvedValue({ id: TARGET.id, name: TARGET.name });
  stripe.customers.create.mockResolvedValue({ id: "cus_new" });
  stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout" });
});

/** The subscription metadata the webhook will later key off. */
function sessionMetadata() {
  return stripe.checkout.sessions.create.mock.calls[0][0].subscription_data.metadata;
}

describe("checkout for another market center", () => {
  it("lets a superuser subscribe a market center they are not in", async () => {
    const res = await createCheckoutSession({
      planType: "EARLY_BIRD",
      marketCenterId: TARGET.id,
    });

    // Without this metadata the webhook writes nothing at all.
    expect(sessionMetadata().marketCenterId).toBe(TARGET.id);
    expect(res.url).toBe("https://checkout");
  });

  it("names the target market center on the Stripe customer", async () => {
    await createCheckoutSession({
      planType: "EARLY_BIRD",
      marketCenterId: TARGET.id,
    });

    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TARGET.name,
        metadata: expect.objectContaining({ marketCenterId: TARGET.id }),
      })
    );
  });

  it("never moves the superuser into the market center they are paying for", async () => {
    // Buying for someone else must not reassign the operator's own account,
    // which is what the new-organisation branch does.
    await createCheckoutSession({
      planType: "EARLY_BIRD",
      marketCenterId: TARGET.id,
    });

    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it("refuses a non-superuser naming someone else's market center", async () => {
    mockUserRepository.findByClerkId.mockResolvedValue({
      ...SUPERUSER,
      isSuperuser: false,
    });

    await expect(
      createCheckoutSession({ planType: "EARLY_BIRD", marketCenterId: TARGET.id })
    ).rejects.toThrow(/superuser/i);

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects a market center that does not exist", async () => {
    mockDb.queryRow.mockResolvedValue(null);

    await expect(
      createCheckoutSession({ planType: "EARLY_BIRD", marketCenterId: "mc-nope" })
    ).rejects.toThrow(/not found/i);
  });

  it("refuses to double-subscribe a market center that already pays", async () => {
    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-row",
      status: "ACTIVE",
    });

    await expect(
      createCheckoutSession({ planType: "EARLY_BIRD", marketCenterId: TARGET.id })
    ).rejects.toThrow(/already has an active subscription/i);

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("still subscribes the caller's own market center when none is named", async () => {
    mockDb.queryRow.mockResolvedValue({ name: "Ops HQ" });

    await createCheckoutSession({ planType: "EARLY_BIRD" });

    expect(sessionMetadata().marketCenterId).toBe("mc-ops");
  });
});
