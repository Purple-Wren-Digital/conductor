import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Pins the joined_via_join_code -> joinedViaJoinCode mapping in rowToUser.
 *
 * This is the only signal an admin has that a roster member self-joined
 * with a (possibly leaked) join code rather than being invited — the badge
 * on /users/search results depends entirely on this field surviving the
 * DB row -> User transform. A regression here would silently remove that
 * mitigation while every other suite in the repo stayed green.
 *
 * These tests would catch, at minimum:
 *  - renaming/removing `joined_via_join_code` in the mapper (rowToUser)
 *    without updating the read
 *  - dropping the `?? false` coercion, which would let a NULL/undefined
 *    column value leak through as `undefined` instead of `false`
 *  - renaming the camelCase `joinedViaJoinCode` field on the `User` type
 *    (the assertions read the field by name, so a rename would make
 *    `result.joinedViaJoinCode` be `undefined` in the "true" case too)
 */

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    rawQueryRow: vi.fn(),
    rawQueryAll: vi.fn(),
    exec: vi.fn(),
  },
}));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  fromTimestamp: (d: Date | null) => d,
  toTimestamp: (d: any) => d,
  fromJson: (v: any) => v,
  toJson: (v: any) => JSON.stringify(v),
}));

import { userRepository } from "./user.repository";

const now = new Date("2025-01-01T00:00:00Z");

function makeRow(overrides?: Record<string, any>) {
  return {
    id: "user-1",
    email: "u1@test.com",
    name: "User One",
    role: "AGENT",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    is_active: true,
    is_superuser: false,
    market_center_id: "mc-1",
    clerk_id: "clerk-1",
    joined_via_join_code: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("userRepository — joined_via_join_code mapping", () => {
  it("maps joined_via_join_code: true on the row to joinedViaJoinCode: true on the User", async () => {
    mockDb.queryRow.mockResolvedValueOnce(
      makeRow({ joined_via_join_code: true })
    );

    const user = await userRepository.findById("user-1");

    expect(user?.joinedViaJoinCode).toBe(true);
  });

  it("maps joined_via_join_code: false to joinedViaJoinCode: false", async () => {
    mockDb.queryRow.mockResolvedValueOnce(
      makeRow({ joined_via_join_code: false })
    );

    const user = await userRepository.findById("user-1");

    expect(user?.joinedViaJoinCode).toBe(false);
  });

  it("coerces a missing/null column to joinedViaJoinCode: false, not undefined", async () => {
    const { joined_via_join_code, ...rowWithoutColumn } = makeRow();

    mockDb.queryRow.mockResolvedValueOnce(rowWithoutColumn as any);

    const user = await userRepository.findById("user-1");

    expect(user?.joinedViaJoinCode).toBe(false);
    expect(user?.joinedViaJoinCode).not.toBeUndefined();
  });
});
