import { describe, it, expect, vi } from "vitest";

/**
 * Covers how a Stripe subscription's price is turned into one of our plan types.
 *
 * This single function decides, for every incoming webhook, which plan a market
 * center is recorded as being on. Plan type then drives seat allowances, the
 * unlimited-seat bypass, and whether a second location inherits the parent's
 * Stripe customer -- so a wrong answer here is silent and expensive.
 */
vi.mock("stripe", () => ({ default: vi.fn(() => ({})) }));
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
vi.mock("encore.dev/config", () => ({ secret: () => () => "sk_test_x" }));
vi.mock("encore.dev/log", () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("../ticket/db", () => ({
  db: { queryRow: vi.fn() },
  userRepository: { findByClerkId: vi.fn() },
  subscriptionRepository: { findByMarketCenterId: vi.fn(), update: vi.fn() },
}));
vi.mock("../auth/user-context", () => ({ getUserContext: vi.fn() }));

import { getPlanTypeFromPriceId, PRICING_PLANS } from "./subscription";

describe("getPlanTypeFromPriceId", () => {
  it("recognises each configured plan", () => {
    expect(getPlanTypeFromPriceId(PRICING_PLANS.EARLY_BIRD.priceId)).toBe("EARLY_BIRD");
    expect(getPlanTypeFromPriceId(PRICING_PLANS.STANDARD.priceId)).toBe("STANDARD");
    // Enterprise is the plan that groups multiple locations onto one bill, so
    // misreading it breaks combined billing, not just a label.
    expect(getPlanTypeFromPriceId(PRICING_PLANS.ENTERPRISE.priceId)).toBe("ENTERPRISE");
  });

  it("silently reports an unrecognised price as Early Bird", () => {
    // This is the live trap. Negotiated pricing means creating a new Stripe
    // price, whose id is in no config -- and the fallback then records that
    // market center as Early Bird: 50 seats, $6/seat, and NOT enterprise, so
    // a second location will not inherit the subscription and combined billing
    // quietly fails. Custom pricing must be applied as a discount on the
    // Enterprise price id, never as a new price.
    expect(getPlanTypeFromPriceId("price_custom_negotiated_399")).toBe("EARLY_BIRD");
    expect(getPlanTypeFromPriceId("")).toBe("EARLY_BIRD");
  });
});
