import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";

/**
 * Covers the Stripe webhook as the entry point for setting up an enterprise
 * account by hand in the Stripe dashboard.
 *
 * Nothing about a market center's billing exists in our database until this
 * handler writes it. The handler keys entirely off
 * `subscription.metadata.marketCenterId`, which our own checkout sets but the
 * Stripe dashboard does not -- and when it is absent the handler logs, answers
 * 200, and writes nothing. A 200 with no row is indistinguishable from success
 * on the Stripe side, which is the failure mode to pin down here.
 */
const { stripe, mockSubscriptionRepository, mockLog } = vi.hoisted(() => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
    subscriptionItems: { update: vi.fn(), create: vi.fn(), del: vi.fn() },
    prices: { create: vi.fn() },
  },
  mockSubscriptionRepository: {
    findByStripeSubscriptionId: vi.fn(),
    findByMarketCenterId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockLog: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
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
vi.mock("~encore/auth", () => ({ getAuthData: vi.fn() }));
vi.mock("encore.dev/config", () => ({ secret: () => () => "whsec_test" }));
vi.mock("encore.dev/log", () => ({ default: mockLog }));
vi.mock("../ticket/db", () => ({
  db: { queryRow: vi.fn() },
  userRepository: { findByClerkId: vi.fn() },
  subscriptionRepository: mockSubscriptionRepository,
}));
vi.mock("../auth/user-context", () => ({ getUserContext: vi.fn() }));

import { webhookHandler, PRICING_PLANS } from "./subscription";

/** A request carrying a signed Stripe payload. */
function fakeReq() {
  const r: any = new Readable({ read() {} });
  r.push("{}");
  r.push(null);
  r.headers = { "stripe-signature": "sig_test" };
  return r;
}

function fakeRes() {
  return { writeHead: vi.fn(), write: vi.fn(), end: vi.fn() } as any;
}

/** A customer.subscription.created event for the given price and metadata. */
function subscriptionCreated(priceId: string, metadata: Record<string, string>) {
  return {
    id: "evt_1",
    type: "customer.subscription.created",
    data: {
      object: {
        id: "sub_live",
        customer: "cus_live",
        status: "active",
        metadata,
        items: { data: [{ id: "si_1", price: { id: priceId } }] },
        current_period_start: 1761000000,
        current_period_end: 1763678400,
        cancel_at: null,
        canceled_at: null,
        trial_end: null,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscriptionRepository.findByStripeSubscriptionId.mockResolvedValue(null);
  mockSubscriptionRepository.create.mockResolvedValue({ id: "sub-row-1" });
});

describe("stripe webhook — enterprise setup by hand", () => {
  it("records an enterprise subscription against the market center", async () => {
    stripe.webhooks.constructEvent.mockReturnValue(
      subscriptionCreated(PRICING_PLANS.ENTERPRISE.priceId, {
        marketCenterId: "mc-location-1",
      })
    );

    await webhookHandler(fakeReq(), fakeRes());

    // planType ENTERPRISE is what later lets a second location inherit this
    // subscription and bill as one account.
    expect(mockSubscriptionRepository.create).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionRepository.create.mock.calls[0][0]).toMatchObject({
      marketCenterId: "mc-location-1",
      planType: "ENTERPRISE",
      stripeSubscriptionId: "sub_live",
      stripeCustomerId: "cus_live",
      status: "ACTIVE",
    });
  });

  it("writes nothing, but still answers 200, when marketCenterId is missing", async () => {
    // Creating the subscription in the Stripe dashboard without setting this
    // metadata key leaves Stripe billing the customer while our app shows no
    // subscription at all -- roles stay locked and nothing looks wrong.
    stripe.webhooks.constructEvent.mockReturnValue(
      subscriptionCreated(PRICING_PLANS.ENTERPRISE.priceId, {})
    );
    const res = fakeRes();

    await webhookHandler(fakeReq(), res);

    expect(mockSubscriptionRepository.create).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(200);
    expect(mockLog.error).toHaveBeenCalled();
  });

  it("mislabels a negotiated custom price as Early Bird", async () => {
    // The consequence of the getPlanTypeFromPriceId fallback, at the point it
    // actually bites: a custom-priced enterprise deal lands as EARLY_BIRD, so
    // the second location will not inherit the subscription.
    stripe.webhooks.constructEvent.mockReturnValue(
      subscriptionCreated("price_custom_negotiated", {
        marketCenterId: "mc-location-1",
      })
    );

    await webhookHandler(fakeReq(), fakeRes());

    const row = mockSubscriptionRepository.create.mock.calls[0][0];
    expect(row.planType).toBe("EARLY_BIRD");
    expect(row.includedSeats).toBe(PRICING_PLANS.EARLY_BIRD.includedSeats);
  });
});
