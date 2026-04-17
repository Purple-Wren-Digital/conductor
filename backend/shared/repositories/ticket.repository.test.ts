import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for ticket repository JOIN-based queries.
 * Verifies that findByIdWithRelations and search use single queries
 * instead of N+1 individual queries per ticket.
 */

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    rawQueryRow: vi.fn(),
    rawQueryAll: vi.fn(),
    exec: vi.fn(),
    rawExec: vi.fn(),
  },
}));

vi.mock("../../ticket/db", () => ({
  db: mockDb,
  fromTimestamp: (d: Date | null) => d,
  toJson: vi.fn((obj: any) => JSON.stringify(obj)),
  fromJson: vi.fn((str: string) => JSON.parse(str)),
  withTransaction: vi.fn(),
}));

import { ticketRepository } from "./ticket.repository";

const now = new Date("2025-01-01T00:00:00Z");

// A full joined row as returned by the JOIN query
const makeJoinedTicketRow = (overrides?: Record<string, any>) => ({
  id: "ticket-1",
  title: "Test Ticket",
  description: "A test ticket",
  status: "IN_PROGRESS",
  urgency: "HIGH",
  creator_id: "user-creator",
  assignee_id: "user-assignee",
  due_date: null,
  resolved_at: null,
  created_at: now,
  updated_at: now,
  published_at: null,
  category_id: "cat-1",
  category: null,
  survey_id: null,
  email_message_id: null,
  // Creator joined fields
  creator_email: "creator@test.com",
  creator_name: "Creator User",
  creator_role: "AGENT",
  creator_market_center_id: "mc-1",
  creator_clerk_id: "clerk-creator",
  creator_is_active: true,
  creator_created_at: now,
  creator_updated_at: now,
  // Assignee joined fields
  assignee_email: "assignee@test.com",
  assignee_name: "Assignee User",
  assignee_role: "STAFF",
  assignee_market_center_id: "mc-1",
  assignee_clerk_id: "clerk-assignee",
  assignee_is_active: true,
  assignee_created_at: now,
  assignee_updated_at: now,
  // Category joined fields
  cat_name: "Billing",
  cat_description: "Billing issues",
  cat_market_center_id: "mc-1",
  cat_default_assignee_id: "user-assignee",
  cat_created_at: now,
  cat_updated_at: now,
  ...overrides,
});

describe("Ticket Repository - JOIN queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByIdWithRelations", () => {
    it("should return ticket with creator, assignee, and category from a single query", async () => {
      mockDb.queryRow.mockResolvedValue(makeJoinedTicketRow());

      const ticket = await ticketRepository.findByIdWithRelations("ticket-1");

      // Only 1 query call (the JOIN), not 4 separate calls
      expect(mockDb.queryRow).toHaveBeenCalledTimes(1);

      expect(ticket).not.toBeNull();
      expect(ticket!.id).toBe("ticket-1");
      expect(ticket!.title).toBe("Test Ticket");

      // Creator populated from JOIN
      expect(ticket!.creator).toBeDefined();
      expect(ticket!.creator!.email).toBe("creator@test.com");
      expect(ticket!.creator!.name).toBe("Creator User");
      expect(ticket!.creator!.role).toBe("AGENT");

      // Assignee populated from JOIN
      expect(ticket!.assignee).toBeDefined();
      expect(ticket!.assignee!.email).toBe("assignee@test.com");
      expect(ticket!.assignee!.name).toBe("Assignee User");

      // Category populated from JOIN
      expect(ticket!.category).toBeDefined();
      expect(ticket!.category!.name).toBe("Billing");
      expect(ticket!.category!.description).toBe("Billing issues");
    });

    it("should return null when ticket not found", async () => {
      mockDb.queryRow.mockResolvedValue(null);

      const ticket = await ticketRepository.findByIdWithRelations("nonexistent");

      expect(ticket).toBeNull();
      expect(mockDb.queryRow).toHaveBeenCalledTimes(1);
    });

    it("should handle ticket with no assignee", async () => {
      mockDb.queryRow.mockResolvedValue(makeJoinedTicketRow({
        assignee_id: null,
        assignee_email: null,
        assignee_name: null,
        assignee_role: null,
        assignee_clerk_id: null,
        assignee_is_active: null,
        assignee_created_at: null,
        assignee_updated_at: null,
      }));

      const ticket = await ticketRepository.findByIdWithRelations("ticket-1");

      expect(ticket!.creator).toBeDefined();
      expect(ticket!.assignee).toBeUndefined();
      expect(ticket!.category).toBeDefined();
    });

    it("should handle ticket with no category", async () => {
      mockDb.queryRow.mockResolvedValue(makeJoinedTicketRow({
        category_id: null,
        cat_name: null,
        cat_description: null,
        cat_market_center_id: null,
        cat_default_assignee_id: null,
        cat_created_at: null,
        cat_updated_at: null,
      }));

      const ticket = await ticketRepository.findByIdWithRelations("ticket-1");

      expect(ticket!.creator).toBeDefined();
      expect(ticket!.assignee).toBeDefined();
      expect(ticket!.category).toBeUndefined();
    });
  });

  describe("search", () => {
    it("should use JOINs instead of N+1 queries", async () => {
      const searchRow = {
        ...makeJoinedTicketRow(),
        comment_count: 5,
        attachment_count: 2,
      };

      mockDb.rawQueryRow.mockResolvedValue({ count: 1 });
      mockDb.rawQueryAll.mockResolvedValue([searchRow]);

      const result = await ticketRepository.search({
        userRole: "ADMIN",
        status: ["IN_PROGRESS"],
      });

      // Should be exactly 2 calls: 1 count + 1 data query
      // NOT 2 + N*3 (which was the old N+1 pattern)
      expect(mockDb.rawQueryRow).toHaveBeenCalledTimes(1); // count
      expect(mockDb.rawQueryAll).toHaveBeenCalledTimes(1); // data with JOINs
      // No individual queryRow calls for creator/assignee/category
      expect(mockDb.queryRow).not.toHaveBeenCalled();

      expect(result.total).toBe(1);
      expect(result.tickets).toHaveLength(1);
      expect(result.tickets[0].creator!.email).toBe("creator@test.com");
      expect(result.tickets[0].assignee!.email).toBe("assignee@test.com");
      expect(result.tickets[0].category!.name).toBe("Billing");
      expect(result.tickets[0].commentCount).toBe(5);
      expect(result.tickets[0].attachmentCount).toBe(2);
    });

    it("should handle multiple tickets without N+1", async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        ...makeJoinedTicketRow({ id: `ticket-${i}` }),
        comment_count: i,
        attachment_count: 0,
      }));

      mockDb.rawQueryRow.mockResolvedValue({ count: 10 });
      mockDb.rawQueryAll.mockResolvedValue(rows);

      const result = await ticketRepository.search({ userRole: "ADMIN" });

      // Still only 2 DB calls total, regardless of ticket count
      expect(mockDb.rawQueryRow).toHaveBeenCalledTimes(1);
      expect(mockDb.rawQueryAll).toHaveBeenCalledTimes(1);
      expect(mockDb.queryRow).not.toHaveBeenCalled();

      expect(result.tickets).toHaveLength(10);
    });

    it("should return empty results when no tickets found", async () => {
      mockDb.rawQueryRow.mockResolvedValue({ count: 0 });
      mockDb.rawQueryAll.mockResolvedValue([]);

      const result = await ticketRepository.search({ userRole: "ADMIN" });

      expect(result.total).toBe(0);
      expect(result.tickets).toHaveLength(0);
    });
  });

  describe("findByIdsWithRelations", () => {
    it("should use JOINs instead of N+1 queries", async () => {
      mockDb.rawQueryAll.mockResolvedValue([
        makeJoinedTicketRow({ id: "ticket-1" }),
        makeJoinedTicketRow({ id: "ticket-2" }),
      ]);

      const tickets = await ticketRepository.findByIdsWithRelations(
        ["ticket-1", "ticket-2"],
        { includeCreator: true, includeAssignee: true, includeCategory: true }
      );

      // 1 query with JOINs, not 1 + N*3
      expect(mockDb.rawQueryAll).toHaveBeenCalledTimes(1);
      expect(mockDb.queryRow).not.toHaveBeenCalled();

      expect(tickets).toHaveLength(2);
      expect(tickets[0].creator).toBeDefined();
      expect(tickets[0].assignee).toBeDefined();
      expect(tickets[0].category).toBeDefined();
    });

    it("should return empty array for empty ids", async () => {
      const tickets = await ticketRepository.findByIdsWithRelations([]);

      expect(tickets).toHaveLength(0);
      expect(mockDb.rawQueryAll).not.toHaveBeenCalled();
    });

    it("should only JOIN requested relations", async () => {
      mockDb.rawQueryAll.mockResolvedValue([makeJoinedTicketRow()]);

      await ticketRepository.findByIdsWithRelations(
        ["ticket-1"],
        { includeCreator: true, includeAssignee: false, includeCategory: false }
      );

      const sql = mockDb.rawQueryAll.mock.calls[0][0] as string;
      expect(sql).toContain("LEFT JOIN users c ON t.creator_id");
      expect(sql).not.toContain("LEFT JOIN users a ON t.assignee_id");
      expect(sql).not.toContain("LEFT JOIN ticket_categories");
    });
  });
});
