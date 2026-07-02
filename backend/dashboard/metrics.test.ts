import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, mockGetUserContext, mockGetAccessibleMarketCenterIds } =
  vi.hoisted(() => ({
    mockDb: {
      rawQueryRow: vi.fn(),
      rawQueryAll: vi.fn(),
    },
    mockGetUserContext: vi.fn(),
    mockGetAccessibleMarketCenterIds: vi.fn(),
  }));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    permissionDenied: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
  },
}));

vi.mock("../ticket/db", () => ({ db: mockDb }));
vi.mock("../auth/user-context", () => ({ getUserContext: mockGetUserContext }));
vi.mock("../auth/permissions", () => ({
  getAccessibleMarketCenterIds: mockGetAccessibleMarketCenterIds,
}));

import { getMetrics } from "./metrics";

const AGENT_CTX = {
  name: "Agent",
  userId: "agent-1",
  email: "agent@test.com",
  role: "AGENT" as const,
  marketCenterId: "mc-1",
  clerkId: "clerk-agent",
  isSuperuser: false,
};

const STAFF_CTX = {
  ...AGENT_CTX,
  userId: "staff-1",
  role: "STAFF" as const,
  clerkId: "clerk-staff",
};

const STAFF_LEADER_CTX = {
  ...AGENT_CTX,
  userId: "leader-1",
  role: "STAFF_LEADER" as const,
  clerkId: "clerk-leader",
};

const ADMIN_CTX = {
  ...AGENT_CTX,
  userId: "admin-1",
  role: "ADMIN" as const,
  clerkId: "clerk-admin",
};

const SUPERUSER_CTX = {
  ...AGENT_CTX,
  userId: "super-1",
  role: "ADMIN" as const,
  marketCenterId: null,
  clerkId: "clerk-super",
  isSuperuser: true,
};

const emptyRow = {
  total_tickets: 0,
  open_tickets: 0,
  overdue_tickets: 0,
  high_priority_open: 0,
  unassigned_open: 0,
  created_last_7_days: 0,
  resolved_last_7_days: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  mockDb.rawQueryRow.mockResolvedValue(emptyRow);
  mockDb.rawQueryAll.mockResolvedValue([]);
});

describe("getMetrics scope filter", () => {
  it("AGENT scope filters by creator_id only", async () => {
    mockGetUserContext.mockResolvedValue(AGENT_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    const values = mockDb.rawQueryRow.mock.calls[0].slice(1);
    expect(sql).toContain("t.creator_id = $1");
    expect(values).toEqual(["agent-1"]);
  });

  it("STAFF scope filters by assignee_id OR unassigned-created", async () => {
    mockGetUserContext.mockResolvedValue(STAFF_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    const values = mockDb.rawQueryRow.mock.calls[0].slice(1);
    expect(sql).toContain("t.assignee_id = $1");
    expect(sql).toContain("t.assignee_id IS NULL AND t.creator_id = $1");
    expect(values).toEqual(["staff-1"]);
  });

  it("STAFF_LEADER scope filters by market_center across category/creator/assignee", async () => {
    mockGetUserContext.mockResolvedValue(STAFF_LEADER_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    const values = mockDb.rawQueryRow.mock.calls[0].slice(1);
    expect(sql).toContain("c.market_center_id = $1");
    expect(sql).toContain("cr.market_center_id = $1");
    expect(sql).toContain("asg.market_center_id = $1");
    expect(values).toEqual(["mc-1"]);
  });

  it("STAFF_LEADER with null marketCenterId resolves to FALSE (no rows)", async () => {
    mockGetUserContext.mockResolvedValue({
      ...STAFF_LEADER_CTX,
      marketCenterId: null,
    });
    mockGetAccessibleMarketCenterIds.mockResolvedValue([]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE FALSE");
  });

  it("ADMIN scope uses 3 distinct placeholder sets and pushes IDs three times", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2"]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    const values = mockDb.rawQueryRow.mock.calls[0].slice(1);
    expect(sql).toContain("c.market_center_id IN ($1, $2)");
    expect(sql).toContain("cr.market_center_id IN ($3, $4)");
    expect(sql).toContain("asg.market_center_id IN ($5, $6)");
    expect(values).toEqual([
      "mc-1",
      "mc-2",
      "mc-1",
      "mc-2",
      "mc-1",
      "mc-2",
    ]);
  });

  it("ADMIN with no accessible MCs resolves to FALSE", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue([]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE FALSE");
  });

  it("ADMIN filtering by a specific accessible marketCenterId narrows scope to that single ID", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1", "mc-2"]);

    await getMetrics({ marketCenterId: "mc-2" });

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    const values = mockDb.rawQueryRow.mock.calls[0].slice(1);
    expect(sql).toContain("c.market_center_id IN ($1)");
    expect(values).toEqual(["mc-2", "mc-2", "mc-2"]);
  });

  it("ADMIN filtering by an inaccessible marketCenterId resolves to FALSE", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    await getMetrics({ marketCenterId: "mc-99" });

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE FALSE");
  });

  it("Superuser scope is TRUE (no filtering)", async () => {
    mockGetUserContext.mockResolvedValue(SUPERUSER_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue([]);

    await getMetrics({});

    const sql = mockDb.rawQueryRow.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE TRUE");
    expect(mockDb.rawQueryRow.mock.calls[0].slice(1)).toEqual([]);
  });
});

describe("getMetrics response shape", () => {
  it("maps DB columns into the response and zero-fills enum maps", async () => {
    mockGetUserContext.mockResolvedValue(STAFF_LEADER_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);

    mockDb.rawQueryRow.mockResolvedValueOnce({
      total_tickets: 145,
      open_tickets: 113,
      overdue_tickets: 37,
      high_priority_open: 12,
      unassigned_open: 4,
      created_last_7_days: 9,
      resolved_last_7_days: 6,
    });
    mockDb.rawQueryAll
      .mockResolvedValueOnce([
        { status: "ASSIGNED", count: 50 },
        { status: "IN_PROGRESS", count: 30 },
      ])
      .mockResolvedValueOnce([
        { urgency: "HIGH", count: 12 },
        { urgency: "MEDIUM", count: 40 },
      ]);

    const { metrics } = await getMetrics({});

    expect(metrics.totalTickets).toBe(145);
    expect(metrics.openTickets).toBe(113);
    expect(metrics.overdueTickets).toBe(37);
    expect(metrics.highPriorityOpen).toBe(12);
    expect(metrics.unassignedOpen).toBe(4);
    expect(metrics.createdLast7Days).toBe(9);
    expect(metrics.resolvedLast7Days).toBe(6);
    expect(metrics.ticketsByStatus).toEqual({
      DRAFT: 0,
      CREATED: 0,
      ASSIGNED: 50,
      UNASSIGNED: 0,
      AWAITING_RESPONSE: 0,
      IN_PROGRESS: 30,
      RESOLVED: 0,
    });
    expect(metrics.ticketsByUrgency).toEqual({ HIGH: 12, MEDIUM: 40, LOW: 0 });
  });

  it("returns zeros when DB returns no row", async () => {
    mockGetUserContext.mockResolvedValue(ADMIN_CTX);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-1"]);
    mockDb.rawQueryRow.mockResolvedValueOnce(null);

    const { metrics } = await getMetrics({});

    expect(metrics.totalTickets).toBe(0);
    expect(metrics.overdueTickets).toBe(0);
    expect(metrics.ticketsByStatus.ASSIGNED).toBe(0);
    expect(metrics.ticketsByUrgency.HIGH).toBe(0);
  });
});
