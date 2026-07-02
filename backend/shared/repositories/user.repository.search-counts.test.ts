import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for userRepository.search — verifies that the SQL it issues
 * carries per-user ticket counts via correlated subqueries, and that
 * those counts surface as User._count.assignedTickets / createdTickets
 * on the returned objects (used by the MC Team list UI).
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
    assigned_count: 0,
    created_count: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("userRepository.search — _count.assignedTickets / createdTickets", () => {
  it("issues a SELECT that includes correlated subqueries for assigned_count and created_count", async () => {
    mockDb.rawQueryRow.mockResolvedValueOnce({ count: 0 });
    mockDb.rawQueryAll.mockResolvedValueOnce([]);

    await userRepository.search({});

    const calls = mockDb.rawQueryAll.mock.calls;
    expect(calls.length).toBe(1);
    const sql = calls[0][0] as string;

    expect(sql).toMatch(/FROM tickets WHERE assignee_id = users\.id/);
    expect(sql).toMatch(/FROM tickets WHERE creator_id = users\.id/);
    expect(sql).toContain("AS assigned_count");
    expect(sql).toContain("AS created_count");
  });

  it("populates User._count.assignedTickets / createdTickets from row counts", async () => {
    mockDb.rawQueryRow.mockResolvedValueOnce({ count: 2 });
    mockDb.rawQueryAll.mockResolvedValueOnce([
      makeRow({ id: "tony", name: "Tony", assigned_count: 40, created_count: 101 }),
      makeRow({ id: "caleb", name: "Caleb", assigned_count: 101, created_count: 80 }),
    ]);

    const { users, total } = await userRepository.search({});

    expect(total).toBe(2);
    expect(users).toHaveLength(2);
    expect((users[0] as any)._count).toEqual({
      assignedTickets: 40,
      createdTickets: 101,
    });
    expect((users[1] as any)._count).toEqual({
      assignedTickets: 101,
      createdTickets: 80,
    });
  });

  it("returns _count zeros when no tickets exist for a user", async () => {
    mockDb.rawQueryRow.mockResolvedValueOnce({ count: 1 });
    mockDb.rawQueryAll.mockResolvedValueOnce([makeRow()]);

    const { users } = await userRepository.search({});

    expect((users[0] as any)._count).toEqual({
      assignedTickets: 0,
      createdTickets: 0,
    });
  });

  it("respects limit / offset and basic role + MC filters in the WHERE clause", async () => {
    mockDb.rawQueryRow.mockResolvedValueOnce({ count: 0 });
    mockDb.rawQueryAll.mockResolvedValueOnce([]);

    await userRepository.search({
      role: ["AGENT"],
      marketCenterIds: ["mc-1"],
      limit: 25,
      offset: 50,
    });

    const sql = mockDb.rawQueryAll.mock.calls[0][0] as string;
    expect(sql).toContain("role IN (");
    expect(sql).toContain("LIMIT 25");
    expect(sql).toContain("OFFSET 50");
  });
});
