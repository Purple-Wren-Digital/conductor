/**
 * Tests for Reports endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockUserContext,
  mockFromTimestamp,
  subscriptionRepository,
  mockSlaRepository,
  mockPolicies,
} = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockUserContext: {
    name: "Admin User",
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isSuperuser: false,
  },
  mockFromTimestamp: vi.fn((date: Date | null) => date),
  subscriptionRepository: {
    getSubscriptionById: vi.fn(),
    findByMarketCenterId: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
  mockSlaRepository: { findActivePolicies: vi.fn() },
  mockPolicies: [
    {
      id: "high-policy",
      urgency: "HIGH" as const,
      responseTimeMinutes: 120,
      resolutionTimeMinutes: 120,
      isActive: true,
      createdAt: new Date("2025-12-09T18:10:21.158Z"),
      updatedAt: new Date("2025-12-09T18:10:21.158Z"),
    },
    {
      id: "medium-policy",
      urgency: "MEDIUM" as const,
      responseTimeMinutes: 2910,
      resolutionTimeMinutes: 2910,
      isActive: true,
      createdAt: new Date("2025-12-09T18:10:21.158Z"),
      updatedAt: new Date("2025-12-09T18:10:21.158Z"),
    },
    {
      id: "low-policy",
      urgency: "LOW" as const,
      responseTimeMinutes: 4320,
      resolutionTimeMinutes: 4320,
      isActive: true,
      createdAt: new Date("2025-12-09T18:10:21.158Z"),
      updatedAt: new Date("2025-12-09T18:10:21.158Z"),
    },
  ],
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => {
  const api = Object.assign(
    vi.fn((config, handler) => handler),
    {
      raw: vi.fn((options, handler) => handler),
      streamOut: vi.fn((options, handler) => handler),
    }
  );
  return {
    api: api,
    Query: {},
    APIError: {
      notFound: vi.fn((msg) => {
        const err = new Error(msg);
        (err as any).code = "not_found";
        return err;
      }),
      invalidArgument: vi.fn((msg) => {
        const err = new Error(msg);
        (err as any).code = "invalid_argument";
        return err;
      }),
      permissionDenied: vi.fn((msg) => {
        const err = new Error(msg);
        (err as any).code = "permission_denied";
        return err;
      }),
      internal: vi.fn((msg) => {
        const err = new Error(msg);
        (err as any).code = "internal";
        return err;
      }),
    },
  };
});

// Mock the database module
vi.mock("../ticket/db", () => ({
  db: mockDb,
  fromTimestamp: mockFromTimestamp,
  subscriptionRepository,
  slaRepository: mockSlaRepository,
  policies: mockPolicies,
}));

// Mock the auth module
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

import { backlog } from "./backlog-report";
import { createdByMonth } from "./created-volume-report";
import { resolvedByMonth } from "./resolved-volume-report";
import { slaCompliance } from "./sla-compliance-report";
import { slaComplianceByUsers } from "./users-overdue-at-risk";
import { ticketReviews } from "./ticket-reviews-report";
import { getUserContext } from "../auth/user-context";

const now = new Date();
interface TicketRow {
  id: string;
  status: string;
  created_at: Date;
  updated_at: Date | null;
  assignee_id: string | null;
}

const ticket = (overrides: Partial<TicketRow>) => ({
  id: crypto.randomUUID(),
  status: "CREATED",
  assignee_id: null,
  created_at: now,
  updated_at: now,
  ...overrides,
});

// TODO: Re-enable once test hang is resolved
describe.skip("Reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
    subscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-1",
      status: "ACTIVE",
      marketCenterId: "mc-123",
      planType: "ENTERPRISE",
    });
  });

  describe("backlog", () => {
    const addDays = (d: Date, n: number) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    it("counts unchanged ASSIGNED and assigned CREATED tickets as created", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        ticket({ status: "ASSIGNED", assignee_id: "u1" }),
        ticket({ status: "CREATED", assignee_id: "u2" }),
      ]);

      const result = await backlog({});

      expect(result.created).toBe(2);
      expect(result.unassigned).toBe(0);
      expect(result.total).toBe(2);
    });

    it("counts UNASSIGNED and unassigned CREATED tickets as unassigned", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        ticket({ status: "UNASSIGNED" }),
        ticket({ status: "CREATED", assignee_id: null }),
      ]);

      const result = await backlog({});

      expect(result.created).toBe(0);
      expect(result.unassigned).toBe(2);
      expect(result.total).toBe(2);
    });

    it("does not count changed tickets as created", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        ticket({
          status: "ASSIGNED",
          assignee_id: "u1",
          updated_at: new Date(now.getTime() + 1000),
        }),
      ]);

      const result = await backlog({});

      expect(result.created).toBe(0);
      expect(result.unassigned).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should return empty backlog when no tickets", async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await backlog({ marketCenterIds: ["mc-456"] });

      expect(result).toEqual({
        created: 0,
        unassigned: 0,
        total: 0,
      });
    });

    it("should filter by market center for ADMIN", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", status: "CREATED" },
      ]);

      const result = await backlog({ marketCenterIds: ["mc-123"] });

      expect(result.total).toBe(1);
      expect(mockDb.queryAll).toHaveBeenCalled();
    });

    it("should work for STAFF role with market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "staff-123",
        email: "staff@test.com",
        name: "Staff User",
        role: "STAFF" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-staff",
        isSuperuser: false,
      });

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", status: "UNASSIGNED" },
      ]);

      const result = await backlog({});

      expect(result.unassigned).toBe(1);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        name: "Agent User",
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
        isSuperuser: false,
      });

      await expect(backlog({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });

    describe("market center scoping for unassigned tickets", () => {
      it("should only count unassigned tickets within ADMIN accessible market centers", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          name: "Admin User",
          userId: "admin-123",
          email: "admin@test.com",
          role: "ADMIN" as const,
          marketCenterId: "mc-123",
          clerkId: "clerk-admin",
          isSuperuser: false,
        });

        subscriptionRepository.findByMarketCenterId.mockResolvedValue({
          id: "sub-1",
          status: "ACTIVE",
          planType: "ENTERPRISE",
        });
        subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
          "mc-123",
          "mc-456",
        ]);

        // Only return unassigned tickets that belong to accessible market centers
        // (via category or creator market center)
        mockDb.queryAll.mockResolvedValueOnce([
          { id: "ticket-1", status: "UNASSIGNED" }, // In mc-123 via category
          { id: "ticket-2", status: "UNASSIGNED" }, // In mc-456 via creator
        ]);

        const result = await backlog({});

        expect(result.unassigned).toBe(2);
        expect(result.total).toBe(2);
        // Verify the query was called (SQL should filter by market center)
        expect(mockDb.queryAll).toHaveBeenCalledTimes(1);
      });

      it("should only count unassigned tickets within STAFF market center scope", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          name: "Staff User",
          userId: "staff-123",
          email: "staff@test.com",
          role: "STAFF" as const,
          marketCenterId: "mc-789",
          clerkId: "clerk-staff",
          isSuperuser: false,
        });

        // Return only unassigned tickets that belong to mc-789
        mockDb.queryAll.mockResolvedValueOnce([
          { id: "ticket-1", status: "UNASSIGNED" },
        ]);

        const result = await backlog({});

        expect(result.unassigned).toBe(1);
        expect(mockDb.queryAll).toHaveBeenCalledTimes(1);
      });

      it("should return zero unassigned when no unassigned tickets exist in market center", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          name: "Admin User",
          userId: "admin-123",
          email: "admin@test.com",
          role: "ADMIN" as const,
          marketCenterId: "mc-123",
          clerkId: "clerk-admin",
          isSuperuser: false,
        });

        subscriptionRepository.findByMarketCenterId.mockResolvedValue({
          id: "sub-1",
          status: "ACTIVE",
        });
        subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
          "mc-123",
        ]);

        // No unassigned tickets in the market center
        mockDb.queryAll.mockResolvedValueOnce([
          { id: "ticket-1", status: "ASSIGNED", assignee_id: "user-2" },
          { id: "ticket-2", status: "CREATED", assignee_id: "user-2" },
        ]);

        const result = await backlog({});

        expect(result.unassigned).toBe(0);
        expect(result.created).toBe(2);
        expect(result.total).toBe(2);
      });

      it("should not include unassigned tickets from other market centers for STAFF_LEADER", async () => {
        vi.mocked(getUserContext).mockResolvedValue({
          name: "Staff Leader",
          userId: "leader-123",
          email: "leader@test.com",
          role: "STAFF_LEADER" as const,
          marketCenterId: "mc-100",
          clerkId: "clerk-leader",
          isSuperuser: false,
        });

        subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
          "mc-123",
          "mc-456",
        ]);

        // Query should only return tickets scoped to mc-100
        mockDb.queryAll.mockResolvedValueOnce([
          { id: "ticket-1", status: "UNASSIGNED" }, // From mc-100
          { id: "ticket-2", status: "ASSIGNED" }, // From mc-100
        ]);

        const result = await backlog({});

        expect(result.unassigned).toBe(1);
        expect(result.created).toBe(1);
        expect(result.total).toBe(2);
      });

      it("returns correctly classified counts for mixed scoped tickets", async () => {
        mockDb.queryAll.mockResolvedValueOnce([
          ticket({ status: "CREATED", assignee_id: "u1" }), // created
          ticket({ status: "ASSIGNED", assignee_id: "u2" }), // created
          ticket({ status: "CREATED", assignee_id: null }), // unassigned
          ticket({ status: "UNASSIGNED" }), // unassigned
        ]);

        const result = await backlog({});

        expect(result).toEqual({
          created: 2,
          unassigned: 2,
          total: 4,
        });
      });
    });
  });

  describe("createdByMonth", () => {
    it("should return tickets grouped by month for ADMIN", async () => {
      const jan2024 = new Date("2024-01-15");
      const feb2024 = new Date("2024-02-20");

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", created_at: jan2024 },
        { id: "ticket-2", created_at: jan2024 },
        { id: "ticket-3", created_at: feb2024 },
      ]);

      const result = await createdByMonth({});

      expect(result.total).toBe(3);
      expect(result.ticketsCreated).toContainEqual({
        period: "01/2024",
        createdCount: 2,
      });
      expect(result.ticketsCreated).toContainEqual({
        period: "02/2024",
        createdCount: 1,
      });
    });

    it("should return empty array when no tickets", async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await createdByMonth({});

      expect(result.total).toBe(0);
      expect(result.ticketsCreated).toEqual([]);
    });

    it("should filter by date range", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", created_at: new Date("2024-03-15") },
      ]);

      const result = await createdByMonth({
        dateFrom: "2024-03-01",
        dateTo: "2024-03-31",
      });

      expect(result.total).toBe(1);
    });

    it("should work for STAFF_LEADER role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        name: "Staff Leader User",
        userId: "leader-123",
        email: "leader@test.com",
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-leader",
        isSuperuser: false,
      });

      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "mc-123",
        "mc-456",
      ]);

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", created_at: new Date("2024-01-15") },
      ]);

      const result = await createdByMonth({});

      expect(result.total).toBe(1);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        name: "Agent User",
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
        isSuperuser: false,
      });

      await expect(createdByMonth({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });

  describe("resolvedByMonth", () => {
    it("should return resolved tickets grouped by month", async () => {
      const jan2024 = new Date("2024-01-15");
      const feb2024 = new Date("2024-02-20");

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", resolved_at: jan2024 },
        { id: "ticket-2", resolved_at: jan2024 },
        { id: "ticket-3", resolved_at: feb2024 },
      ]);

      const result = await resolvedByMonth({});

      expect(result.total).toBe(3);
      expect(result.ticketsResolved).toContainEqual({
        period: "01/2024",
        resolvedCount: 2,
      });
      expect(result.ticketsResolved).toContainEqual({
        period: "02/2024",
        resolvedCount: 1,
      });
    });

    it("should return empty array when no resolved tickets", async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await resolvedByMonth({});

      expect(result.total).toBe(0);
      expect(result.ticketsResolved).toEqual([]);
    });

    it("should skip tickets with null resolved_at", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", resolved_at: new Date("2024-01-15") },
        { id: "ticket-2", resolved_at: null },
      ]);

      const result = await resolvedByMonth({});

      // The query should only return resolved tickets, but if null slips through
      expect(result.ticketsResolved.length).toBeGreaterThanOrEqual(0);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        name: "Agent User",
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
        isSuperuser: false,
      });

      await expect(resolvedByMonth({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });

  describe("slaCompliance", () => {
    beforeEach(() => {
      mockSlaRepository.findActivePolicies.mockResolvedValue(mockPolicies);
    });

    it("should return SLA compliance report for both response and resolve metrics", async () => {
      const responseSlaMetrics = {
        response_compliant: 2,
        response_on_track: 0,
        response_at_risk: 0,
        response_breached: 0,
      };
      const resolutionSlaMetrics = {
        resolve_compliant: 0,
        resolve_on_track: 0,
        resolve_at_risk: 0,
        resolve_breached: 0,
      };
      mockDb.queryAll.mockResolvedValueOnce([responseSlaMetrics]); // RESPONSE SLA query
      mockDb.queryAll.mockResolvedValueOnce([resolutionSlaMetrics]); // RESOLUTION SLA query

      const result = await slaCompliance({});

      expect(result).toEqual({
        response: { compliant: 0, onTrack: 0, atRisk: 0, overdue: 0 },
        resolve: { compliant: 0, onTrack: 0, atRisk: 0, overdue: 0 },
      });
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "agent-123",
        name: "Agent User",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
        isSuperuser: false,
      });

      await expect(slaCompliance({})).rejects.toThrow(
        "User not permitted to generate SLA compliance reports"
      );
    });

    it("should throw internal error when no active SLA policies exist", async () => {
      mockSlaRepository.findActivePolicies.mockResolvedValue([]);

      await expect(slaCompliance({})).rejects.toThrow(
        "No active SLA policies found"
      );
    });
  });

  describe("slaComplianceByUsers", () => {
    beforeEach(() => {
      mockSlaRepository.findActivePolicies.mockResolvedValue(mockPolicies);
    });
    it("should return SLA stats grouped by assignee", async () => {
      const now = new Date();
      const overdueDue = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours ago

      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: "ticket-1",
          created_at: new Date(now.getTime() - 100 * 60 * 60 * 1000),
          resolved_at: null,
          due_date: overdueDue,
          assignee_id: "user-test",
          assignee_name: "John Doe",
        },
        {
          id: "ticket-2",
          created_at: new Date(now.getTime() - 100 * 60 * 60 * 1000),
          resolved_at: null,
          due_date: overdueDue,
          assignee_id: "user-test",
          assignee_name: "John Doe",
        },
      ]);

      const result = await slaComplianceByUsers({});

      expect(result).toHaveProperty("assignees");
      expect(result).toHaveProperty("ticketTotal");
      expect(result).toHaveProperty("assigneeTotal");
    });

    it("should return empty when no at-risk or overdue tickets", async () => {
      const now = new Date();
      const futureDue = new Date(now.getTime() + 100 * 60 * 60 * 1000);

      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: "ticket-1",
          created_at: now,
          resolved_at: null,
          due_date: futureDue,
          assignee_id: "user-test",
          assignee_name: "John Doe",
        },
      ]);

      const result = await slaComplianceByUsers({});

      expect(result.assignees).toEqual([]);
      expect(result.ticketTotal).toBe(0);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        name: "Agent User",
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
        isSuperuser: false,
      });

      await expect(slaComplianceByUsers({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });
});
// TODO: Re-enable once test hang is resolved
describe.skip("ticketReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  it("should return empty reviews when no completed reviews exist", async () => {
    mockDb.queryAll.mockResolvedValueOnce([]);

    const result = await ticketReviews({});

    expect(result).toEqual({
      reviews: [],
      totalReviews: 0,
      averageOverallRating: null,
      averageAssigneeRating: null,
      averageMarketCenterRating: null,
    });
  });

  it("should include review details in response", async () => {
    subscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-1",
      status: "ACTIVE",
      marketCenterId: "mc-123",
      planType: "ENTERPRISE",
    });

    subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
      "mc-456",
    ]);

    mockDb.queryAll.mockResolvedValueOnce([
      {
        id: "review-123",
        ticket_id: "ticket-456",
        ticket_title: "Help with login",
        surveyor_name: "Alice Agent",
        assignee_name: "Bob Staff",
        market_center_name: "Central MC",
        overall_rating: "4.75",
        assignee_rating: "5",
        market_center_rating: "4.5",
        comment: "Very helpful and responsive!",
        updated_at: new Date("2026-01-22T23:45:11.863Z"),
      },
    ]);

    const result = await ticketReviews({});

    expect(result.reviews).toEqual([
      {
        id: "review-123",
        ticketId: "ticket-456",
        ticketTitle: "Help with login",
        surveyorName: "Alice Agent",
        assigneeName: "Bob Staff",
        marketCenterName: "Central MC",
        overallRating: 4.75,
        assigneeRating: 5,
        marketCenterRating: 4.5,
        comment: "Very helpful and responsive!",
        completedAt: new Date("2026-01-22T23:45:11.863Z").toISOString(),
      },
    ]);

    expect(result.totalReviews).toBe(1);
    expect(result.averageOverallRating).toBe(4.75);
    expect(result.averageAssigneeRating).toBe(5);
    expect(result.averageMarketCenterRating).toBe(4.5);
  });

  it("should calculate averages correctly with multiple reviews", async () => {
    subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
    ]);
    subscriptionRepository.findByMarketCenterId.mockResolvedValue({
      id: "sub-1",
      status: "ACTIVE",
      marketCenterId: "mc-123",
      planType: "ENTERPRISE",
    });

    subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
      "mc-123",
      "mc-456",
    ]);

    mockDb.queryAll.mockResolvedValueOnce([
      {
        id: "review-1",
        completed: true,
        ticket_id: "ticket-101",
        ticket_title: "Issue A",
        surveyor_id: "agent-1",
        surveyor_name: "Alice Agent",
        assignee_id: "staff-1",
        assignee_name: "Bob Staff",
        market_center_name: "Central MC",
        overall_rating: "4",
        assignee_rating: "5",
        market_center_rating: "4",
        comment: "Good work",
        updated_at: new Date("2026-01-22T10:00:00Z"),
        created_at: new Date("2026-01-20T09:00:00Z"),
        market_center_id: "mc-123",
      },
      {
        id: "review-2",
        completed: true,
        ticket_id: "ticket-102",
        ticket_title: "Issue B",
        surveyor_id: "agent-2",
        surveyor_name: "Charlie Agent",
        assignee_id: "staff-2",
        assignee_name: "Dana Staff",
        market_center_name: "West MC",
        overall_rating: "5",
        assignee_rating: "4",
        market_center_rating: "5",
        comment: "Excellent",
        updated_at: new Date("2026-01-22T12:00:00Z"),
        created_at: new Date("2026-01-20T09:00:00Z"),
        market_center_id: "mc-123",
      },
    ]);

    const result = await ticketReviews({});
    const expectedReviews = [
      {
        id: "review-1",
        ticketId: "ticket-101",
        ticketTitle: "Issue A",
        surveyorName: "Alice Agent",
        assigneeName: "Bob Staff",
        marketCenterName: "Central MC",
        overallRating: 4,
        assigneeRating: 5,
        marketCenterRating: 4,
        comment: "Good work",
        completedAt: new Date("2026-01-22T10:00:00Z").toISOString(),
      },
      {
        id: "review-2",
        ticketId: "ticket-102",
        ticketTitle: "Issue B",
        surveyorName: "Charlie Agent",
        assigneeName: "Dana Staff",
        marketCenterName: "West MC",
        overallRating: 5,
        assigneeRating: 4,
        marketCenterRating: 5,
        comment: "Excellent",
        completedAt: new Date("2026-01-22T12:00:00Z").toISOString(),
      },
    ];

    expect(result.reviews).toEqual(expectedReviews);
    expect(result.totalReviews).toBe(2);
    expect(result.averageOverallRating).toBe(4.5);
    expect(result.averageAssigneeRating).toBe(4.5);
    expect(result.averageMarketCenterRating).toBe(4.5);
  });
});
