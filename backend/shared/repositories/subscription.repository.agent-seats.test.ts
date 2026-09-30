/**
 * Pins the property the whole agent-join-code feature rests on: an AGENT never
 * consumes a paid seat.
 *
 * `joinWithCode` deliberately skips `checkCanAddUser` because agents are free
 * (backend/joinCodes/join.ts). The test over there asserts only that the seat
 * check was not *called*, which says nothing about whether agents are actually
 * free — if a future edit to this seat query drops `role != 'AGENT'`, every
 * self-joined agent silently starts consuming a billable seat, market centers
 * at their limit stop being able to onboard, and nothing in the join suite
 * notices.
 *
 * These tests assert against the seat-counting SQL itself, so they fail on:
 *  - dropping `AND role != 'AGENT'` from the paid-user count
 *  - dropping `AND role != 'AGENT'` from the pending-invitation count
 *  - folding agentCount into totalUsedSeats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
    rawQueryRow: vi.fn(),
    rawQueryAll: vi.fn(),
  },
}));

// Mock modules that transitively import the Encore native runtime
vi.mock("../../settings", () => ({
  defaultAutoCloseSettings: { enabled: true, awaitingResponseDays: 2 },
}));
vi.mock("../../notifications/templates/utils", () => ({
  notificationTemplatesDefault: {},
}));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  marketCenterRepository: { findById: vi.fn() },
  fromTimestamp: (val: any) => (val ? new Date(val) : null),
  toTimestamp: (val: any) => (val ? val.toISOString() : null),
  toJson: (val: any) => JSON.stringify(val),
  fromJson: (val: any) =>
    val ? (typeof val === "string" ? JSON.parse(val) : val) : null,
  generateId: vi.fn().mockReturnValue("generated-id-123"),
}));

import { subscriptionRepository } from "./subscription.repository";

const subscriptionRow = {
  id: "sub-1",
  stripe_subscription_id: "stripe-sub-1",
  stripe_customer_id: "stripe-cus-1",
  market_center_id: "mc-1",
  status: "ACTIVE",
  plan_type: "STANDARD",
  price_id: "price-1",
  included_seats: 5,
  additional_seats: 0,
  seat_price: "10.00",
  current_period_start: new Date("2026-09-01"),
  current_period_end: new Date("2026-10-01"),
  cancel_at: null,
  canceled_at: null,
  trial_end: null,
  features: "{}",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
};

/** Reassembles a tagged-template query into inspectable SQL. */
function sqlOf(call: unknown[]): string {
  return (call[0] as TemplateStringsArray).join("?");
}

beforeEach(() => {
  vi.resetAllMocks();
  mockDb.queryRow
    .mockResolvedValueOnce(subscriptionRow) // findByMarketCenterId
    .mockResolvedValueOnce({ count: 5 }) // paid (non-AGENT) users
    .mockResolvedValueOnce({ count: 3 }) // AGENT users
    .mockResolvedValueOnce({ count: 2 }); // pending non-AGENT invitations
});

describe("subscriptionRepository — agents never consume a paid seat", () => {
  it("excludes AGENT-role users from the paid seat count query", async () => {
    await subscriptionRepository.findByMarketCenterIdWithUserCount("mc-1");

    const paidSeatSql = sqlOf(mockDb.queryRow.mock.calls[1]);

    expect(paidSeatSql).toContain("FROM users");
    expect(paidSeatSql).toMatch(/role\s*!=\s*'AGENT'/);
  });

  it("excludes AGENT-role invitations from the pending seat count query", async () => {
    await subscriptionRepository.findByMarketCenterIdWithUserCount("mc-1");

    const invitationSql = sqlOf(mockDb.queryRow.mock.calls[3]);

    expect(invitationSql).toContain("FROM team_invitations");
    expect(invitationSql).toMatch(/role\s*!=\s*'AGENT'/);
  });

  it("leaves agents out of totalUsedSeats even when the market center is full of them", async () => {
    const result =
      await subscriptionRepository.findByMarketCenterIdWithUserCount("mc-1");

    expect(result?.agentCount).toBe(3);
    // 5 paid + 2 pending. The 3 agents are reported separately and must not be
    // summed in — that sum is what the billing seat limit is compared against.
    expect(result?.totalUsedSeats).toBe(7);
    expect(result?.totalUsedSeats).toBe(
      result!.activeUserCount + result!.pendingInvitationCount
    );
  });
});
