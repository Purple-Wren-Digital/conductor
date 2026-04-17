import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for comment repository JOIN-based queries.
 * Verifies that findByTicketIdWithUsers uses a single JOIN query
 * instead of N+1 individual queries per comment.
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
}));

import { commentRepository } from "./comment.repository";

const now = new Date("2025-01-01T00:00:00Z");

const makeJoinedCommentRow = (overrides?: Record<string, any>) => ({
  id: "comment-1",
  content: "Test comment",
  ticket_id: "ticket-1",
  user_id: "user-1",
  internal: false,
  source: "WEB",
  metadata: null,
  created_at: now,
  updated_at: now,
  // User joined fields
  user_email: "user@test.com",
  user_name: "Test User",
  user_role: "AGENT",
  user_market_center_id: "mc-1",
  user_clerk_id: "clerk-1",
  user_is_active: true,
  user_created_at: now,
  user_updated_at: now,
  ...overrides,
});

describe("Comment Repository - JOIN queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByTicketIdWithUsers", () => {
    it("should use a single JOIN query instead of N+1", async () => {
      mockDb.rawQueryAll.mockResolvedValue([
        makeJoinedCommentRow({ id: "comment-1", user_id: "user-1" }),
        makeJoinedCommentRow({ id: "comment-2", user_id: "user-2", user_email: "user2@test.com" }),
        makeJoinedCommentRow({ id: "comment-3", user_id: "user-3", user_email: "user3@test.com" }),
      ]);

      const comments = await commentRepository.findByTicketIdWithUsers("ticket-1");

      // 1 query with JOIN, not 1 + N individual user queries
      expect(mockDb.rawQueryAll).toHaveBeenCalledTimes(1);
      expect(mockDb.queryRow).not.toHaveBeenCalled();

      expect(comments).toHaveLength(3);
      expect(comments[0].user).toBeDefined();
      expect(comments[0].user!.email).toBe("user@test.com");
      expect(comments[1].user!.email).toBe("user2@test.com");
    });

    it("should populate user data from JOIN columns", async () => {
      mockDb.rawQueryAll.mockResolvedValue([makeJoinedCommentRow()]);

      const comments = await commentRepository.findByTicketIdWithUsers("ticket-1");

      const comment = comments[0];
      expect(comment.id).toBe("comment-1");
      expect(comment.content).toBe("Test comment");
      expect(comment.user).toBeDefined();
      expect(comment.user!.email).toBe("user@test.com");
      expect(comment.user!.name).toBe("Test User");
      expect(comment.user!.role).toBe("AGENT");
      expect(comment.user!.marketCenterId).toBe("mc-1");
      expect(comment.user!.isActive).toBe(true);
    });

    it("should handle comments with no matching user", async () => {
      mockDb.rawQueryAll.mockResolvedValue([makeJoinedCommentRow({
        user_email: null,
        user_name: null,
        user_role: null,
        user_clerk_id: null,
        user_is_active: null,
        user_created_at: null,
        user_updated_at: null,
      })]);

      const comments = await commentRepository.findByTicketIdWithUsers("ticket-1");

      expect(comments).toHaveLength(1);
      expect(comments[0].user).toBeUndefined();
    });

    it("should filter out internal comments when includeInternal is false", async () => {
      mockDb.rawQueryAll.mockResolvedValue([
        makeJoinedCommentRow({ id: "comment-1", internal: false }),
      ]);

      await commentRepository.findByTicketIdWithUsers("ticket-1", {
        includeInternal: false,
      });

      const sql = mockDb.rawQueryAll.mock.calls[0][0] as string;
      expect(sql).toContain("c.internal = false");
    });

    it("should include internal comments by default", async () => {
      mockDb.rawQueryAll.mockResolvedValue([]);

      await commentRepository.findByTicketIdWithUsers("ticket-1");

      const sql = mockDb.rawQueryAll.mock.calls[0][0] as string;
      expect(sql).not.toContain("c.internal = false");
    });

    it("should support ascending and descending order", async () => {
      mockDb.rawQueryAll.mockResolvedValue([]);

      await commentRepository.findByTicketIdWithUsers("ticket-1", { orderBy: "desc" });
      const descSql = mockDb.rawQueryAll.mock.calls[0][0] as string;
      expect(descSql).toContain("DESC");

      mockDb.rawQueryAll.mockClear();

      await commentRepository.findByTicketIdWithUsers("ticket-1", { orderBy: "asc" });
      const ascSql = mockDb.rawQueryAll.mock.calls[0][0] as string;
      expect(ascSql).toContain("ASC");
    });

    it("should return empty array when no comments exist", async () => {
      mockDb.rawQueryAll.mockResolvedValue([]);

      const comments = await commentRepository.findByTicketIdWithUsers("ticket-1");

      expect(comments).toHaveLength(0);
    });
  });
});
