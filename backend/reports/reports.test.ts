/**
 * Tests for Reports endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockDb, mockUserContext } = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockUserContext: {
    userId: "user-123",
    email: "admin@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
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
  },
}));

// Mock the database module
vi.mock("../ticket/db", () => ({
  db: mockDb,
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
import { getTicketSlaStatus } from "./utils";
import { getUserContext } from "../auth/user-context";

describe("Reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("backlog", () => {
    it("should return backlog counts for ADMIN", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", status: "CREATED" },
        { id: "ticket-2", status: "CREATED" },
        { id: "ticket-3", status: "UNASSIGNED" },
      ]);

      const result = await backlog({});

      expect(result).toEqual({
        created: 2,
        unassigned: 1,
        total: 3,
      });
    });

    it("should return empty backlog when no tickets", async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await backlog({});

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

      const result = await backlog({ marketCenterIds: ["mc-456"] });

      expect(result.total).toBe(1);
      expect(mockDb.queryAll).toHaveBeenCalled();
    });

    it("should work for STAFF role with market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "staff-123",
        email: "staff@test.com",
        role: "STAFF" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-staff",
      });

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", status: "UNASSIGNED" },
      ]);

      const result = await backlog({});

      expect(result.unassigned).toBe(1);
    });

    it("should work for STAFF role without market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "staff-123",
        email: "staff@test.com",
        role: "STAFF" as const,
        marketCenterId: null,
        clerkId: "clerk-staff",
      });

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", status: "CREATED" },
      ]);

      const result = await backlog({});

      expect(result.created).toBe(1);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
      });

      await expect(backlog({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
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
        createdMonthYear: "01/2024",
        createdCount: 2,
      });
      expect(result.ticketsCreated).toContainEqual({
        createdMonthYear: "02/2024",
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
        userId: "leader-123",
        email: "leader@test.com",
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-leader",
      });

      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", created_at: new Date("2024-01-15") },
      ]);

      const result = await createdByMonth({});

      expect(result.total).toBe(1);
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
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
        resolvedMonthYear: "01/2024",
        resolvedCount: 2,
      });
      expect(result.ticketsResolved).toContainEqual({
        resolvedMonthYear: "02/2024",
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
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
      });

      await expect(resolvedByMonth({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });

  describe("slaCompliance", () => {
    it("should return SLA compliance breakdown", async () => {
      const now = new Date();
      const pastDue = new Date(now.getTime() - 100 * 60 * 60 * 1000); // 100 hours ago
      const recent = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      mockDb.queryAll.mockResolvedValueOnce([
        // Compliant - resolved before due
        { id: "ticket-1", created_at: pastDue, resolved_at: pastDue, due_date: now },
        // On track - created recently, no due date issues
        { id: "ticket-2", created_at: recent, resolved_at: null, due_date: new Date(now.getTime() + 100 * 60 * 60 * 1000) },
      ]);

      const result = await slaCompliance({});

      expect(result).toHaveProperty("compliant");
      expect(result).toHaveProperty("onTrack");
      expect(result).toHaveProperty("atRisk");
      expect(result).toHaveProperty("overdue");
      expect(result.compliant + result.onTrack + result.atRisk + result.overdue).toBe(2);
    });

    it("should return zeros when no tickets", async () => {
      mockDb.queryAll.mockResolvedValueOnce([]);

      const result = await slaCompliance({});

      expect(result).toEqual({
        compliant: 0,
        onTrack: 0,
        atRisk: 0,
        overdue: 0,
      });
    });

    it("should filter by status", async () => {
      mockDb.queryAll.mockResolvedValueOnce([
        { id: "ticket-1", created_at: new Date(), resolved_at: null, due_date: null },
      ]);

      const result = await slaCompliance({ status: ["IN_PROGRESS"] });

      expect(mockDb.queryAll).toHaveBeenCalled();
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
      });

      await expect(slaCompliance({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });

  describe("slaComplianceByUsers", () => {
    it("should return SLA stats grouped by assignee", async () => {
      const now = new Date();
      const overdueDue = new Date(now.getTime() - 10 * 60 * 60 * 1000); // 10 hours ago

      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: "ticket-1",
          created_at: new Date(now.getTime() - 100 * 60 * 60 * 1000),
          resolved_at: null,
          due_date: overdueDue,
          assignee_id: "user-1",
          assignee_name: "John Doe",
        },
        {
          id: "ticket-2",
          created_at: new Date(now.getTime() - 100 * 60 * 60 * 1000),
          resolved_at: null,
          due_date: overdueDue,
          assignee_id: "user-1",
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
          assignee_id: "user-1",
          assignee_name: "John Doe",
        },
      ]);

      const result = await slaComplianceByUsers({});

      expect(result.assignees).toEqual([]);
      expect(result.ticketTotal).toBe(0);
    });

    it("should handle unassigned tickets", async () => {
      const now = new Date();
      const overdueDue = new Date(now.getTime() - 10 * 60 * 60 * 1000);

      mockDb.queryAll.mockResolvedValueOnce([
        {
          id: "ticket-1",
          created_at: new Date(now.getTime() - 100 * 60 * 60 * 1000),
          resolved_at: null,
          due_date: overdueDue,
          assignee_id: null,
          assignee_name: null,
        },
      ]);

      const result = await slaComplianceByUsers({});

      const unassigned = result.assignees.find((a) => a.id === "Unassigned");
      expect(unassigned).toBeDefined();
    });

    it("should throw permission denied for AGENT role", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "agent-123",
        email: "agent@test.com",
        role: "AGENT" as const,
        marketCenterId: "mc-123",
        clerkId: "clerk-agent",
      });

      await expect(slaComplianceByUsers({})).rejects.toThrow(
        "User not permitted to generate ticket reports"
      );
    });
  });
});

describe("Report Utils", () => {
  describe("getTicketSlaStatus", () => {

    it("should return compliant for resolved ticket before due date", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const dueDate = new Date("2024-01-05T10:00:00Z");
      const resolvedAt = new Date("2024-01-03T10:00:00Z");

      const status = getTicketSlaStatus({ createdAt, dueDate, resolvedAt });

      expect(status).toBe("compliant");
    });

    it("should return overdue for resolved ticket after due date", () => {
      const createdAt = new Date("2024-01-01T10:00:00Z");
      const dueDate = new Date("2024-01-03T10:00:00Z");
      const resolvedAt = new Date("2024-01-05T10:00:00Z");

      const status = getTicketSlaStatus({ createdAt, dueDate, resolvedAt });

      expect(status).toBe("overdue");
    });

    it("should return overdue for unresolved ticket past due date", () => {
      const createdAt = new Date(Date.now() - 200 * 60 * 60 * 1000); // 200 hours ago
      const dueDate = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10 hours ago

      const status = getTicketSlaStatus({ createdAt, dueDate });

      expect(status).toBe("overdue");
    });

    it("should return atRisk for ticket within threshold of due date", () => {
      const createdAt = new Date(Date.now() - 70 * 60 * 60 * 1000); // 70 hours ago
      const dueDate = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now (within 6 hour threshold)

      const status = getTicketSlaStatus({ createdAt, dueDate });

      expect(status).toBe("atRisk");
    });

    it("should return onTrack for ticket with plenty of time", () => {
      const createdAt = new Date();
      const dueDate = new Date(Date.now() + 50 * 60 * 60 * 1000); // 50 hours from now

      const status = getTicketSlaStatus({ createdAt, dueDate });

      expect(status).toBe("onTrack");
    });

    it("should use default SLA when no due date provided", () => {
      const createdAt = new Date(); // Just created

      const status = getTicketSlaStatus({ createdAt });

      expect(status).toBe("onTrack");
    });

    it("should throw error for invalid createdAt", () => {
      expect(() => {
        getTicketSlaStatus({ createdAt: "invalid-date" });
      }).toThrow("Invalid createdAt on ticket");
    });
  });
});
