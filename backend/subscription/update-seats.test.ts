import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Covers the mid-cycle seat change, which bills real money.
 *
 * The original implementation looked for the seat line item with
 * `item.price.product === "additional_seats"` -- a literal string where Stripe
 * returns a product id, next to a `// You'll need to set this up in Stripe`
 * note. That match could never succeed, so every call fell through to the
 * create branch and would have stacked a second seat line item onto the
 * subscription each time an admin adjusted their seats. The duplicate-item test
 * below is the one that matters.
 */
const { stripe, mockUserRepository, mockSubscriptionRepository, mockDb, mockGetAuthData } =
  vi.hoisted(() => ({
    stripe: {
      subscriptions: { retrieve: vi.fn() },
      subscriptionItems: { update: vi.fn(), create: vi.fn(), del: vi.fn() },
      prices: { create: vi.fn() },
    },
    mockUserRepository: { findByClerkId: vi.fn() },
    mockSubscriptionRepository: { findByMarketCenterId: vi.fn(), update: vi.fn() },
    mockDb: { queryRow: vi.fn() },
    mockGetAuthData: vi.fn(),
  }));

vi.mock("stripe", () => ({ default: vi.fn(() => stripe) }));
vi.mock("encore.dev/api", () => {
  // The module also defines a raw webhook handler at import time.
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
// subscription.ts pulls db AND the repositories from ../ticket/db
vi.mock("../ticket/db", () => ({
  db: mockDb,
  userRepository: mockUserRepository,
  subscriptionRepository: mockSubscriptionRepository,
}));
vi.mock("../auth/user-context", () => ({ getUserContext: vi.fn() }));

import { updateSeats, PRICING_PLANS } from "./subscription";

const PLAN_PRICE_ID = PRICING_PLANS.STANDARD.priceId;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthData.mockReturnValue({ userID: "clerk-admin" });
  mockUserRepository.findByClerkId.mockResolvedValue({
    id: "u-1",
    role: "ADMIN",
    marketCenterId: "mc-1",
  });
  mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
    id: "sub-row-1",
    stripeSubscriptionId: "sub_123",
    includedSeats: 5,
    seatPrice: 10,
  });
  // 3 paid users today
  mockDb.queryRow.mockResolvedValue({ count: 3 });
  stripe.prices.create.mockResolvedValue({ id: "price_new" });
});

/** A subscription carrying only the plan item (no seats yet). */
function planOnly() {
  stripe.subscriptions.retrieve.mockResolvedValue({
    items: {
      data: [
        { id: "si_plan", price: { id: PLAN_PRICE_ID, product: { name: "Conductor Standard" } } },
      ],
    },
  });
}

/** A subscription that already has a seat line item. */
function planPlusSeats() {
  stripe.subscriptions.retrieve.mockResolvedValue({
    items: {
      data: [
        { id: "si_plan", price: { id: PLAN_PRICE_ID, product: { name: "Conductor Standard" } } },
        {
          id: "si_seats",
          price: { id: "price_seats_adhoc", product: { name: "Additional Seats (3 seats)" } },
        },
      ],
    },
  });
}

describe("updateSeats", () => {
  it("adds a seat line item when none exists", async () => {
    planOnly();

    const res = await updateSeats({ additionalSeats: 2 });

    expect(stripe.subscriptionItems.create).toHaveBeenCalledTimes(1);
    const [arg] = stripe.subscriptionItems.create.mock.calls[0];
    expect(arg.quantity).toBe(2);
    expect(arg.price).toBe("price_new");
    // Priced from the subscription's own seat price, in cents.
    expect(stripe.prices.create.mock.calls[0][0].unit_amount).toBe(1000);
    expect(res).toMatchObject({ success: true, totalSeats: 7, additionalSeats: 2 });
    expect(mockSubscriptionRepository.update).toHaveBeenCalledWith("sub-row-1", {
      additionalSeats: 2,
    });
  });

  it("updates the existing seat item instead of stacking a second one", async () => {
    planPlusSeats();

    await updateSeats({ additionalSeats: 4 });

    // The regression that shipped: a never-matching lookup meant this path was
    // skipped and a duplicate seat item was created, double-billing the admin.
    expect(stripe.subscriptionItems.update).toHaveBeenCalledWith("si_seats", {
      quantity: 4,
      proration_behavior: "create_prorations",
    });
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
  });

  it("never mistakes the plan item for the seat item", async () => {
    planPlusSeats();

    await updateSeats({ additionalSeats: 1 });

    const touched = stripe.subscriptionItems.update.mock.calls[0][0];
    expect(touched).not.toBe("si_plan");
  });

  it("removes the seat item rather than billing for zero seats", async () => {
    planPlusSeats();

    await updateSeats({ additionalSeats: 0 });

    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith("si_seats", {
      proration_behavior: "create_prorations",
    });
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
  });

  it("refuses to cut seats below the people already occupying them", async () => {
    planPlusSeats();
    mockSubscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-row-1",
      stripeSubscriptionId: "sub_123",
      includedSeats: 2,
      seatPrice: 10,
    });
    mockDb.queryRow.mockResolvedValue({ count: 4 });

    await expect(updateSeats({ additionalSeats: 0 })).rejects.toThrow(
      /Cannot reduce seats below/
    );
    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled();
    expect(mockSubscriptionRepository.update).not.toHaveBeenCalled();
  });

  it("is admin-only", async () => {
    planOnly();
    mockUserRepository.findByClerkId.mockResolvedValue({
      id: "u-2",
      role: "STAFF_LEADER",
      marketCenterId: "mc-1",
    });

    await expect(updateSeats({ additionalSeats: 1 })).rejects.toThrow(
      /Only admins/
    );
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
  });

  it("does not touch the plan when its price is unknown to PRICING_PLANS", async () => {
    // A rotated price, a grandfathered customer, or a different Stripe account.
    // The old "whichever item isn't the plan" rule pointed straight at the plan
    // here and would have repriced or deleted someone's subscription.
    stripe.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [
          {
            id: "si_plan",
            price: { id: "price_grandfathered", product: { name: "Conductor Legacy" } },
          },
        ],
      },
    });

    await updateSeats({ additionalSeats: 2 });

    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled();
    // It adds a seat item instead, which is the correct outcome.
    expect(stripe.subscriptionItems.create).toHaveBeenCalledTimes(1);
  });

  it("refuses to guess when a subscription already has two seat items", async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [
          { id: "si_plan", price: { id: PLAN_PRICE_ID, product: { name: "Conductor Standard" } } },
          { id: "si_seats_a", price: { id: "p1", product: { name: "Additional Seats" } } },
          { id: "si_seats_b", price: { id: "p2", product: { name: "Additional Seats (2 seats)" } } },
        ],
      },
    });

    await expect(updateSeats({ additionalSeats: 5 })).rejects.toThrow(
      /more than one additional-seats line item/
    );
    expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
    expect(stripe.subscriptionItems.del).not.toHaveBeenCalled();
  });

});
