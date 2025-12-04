import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockDb,
  mockTicketRepository,
  mockCommentRepository,
  mockNotificationRepository,
  mockUserContext,
} = vi.hoisted(() => ({
  mockDb: {
    queryAll: vi.fn(),
    queryRow: vi.fn(),
    exec: vi.fn(),
  },
  mockTicketRepository: {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    createHistory: vi.fn(),
  },
  mockCommentRepository: {
    findById: vi.fn(),
    findByTicketId: vi.fn(),
    findByTicketIdWithUsers: vi.fn(),
    create: vi.fn(),
    createWithUser: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockNotificationRepository: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  mockUserContext: {
    userId: "user-123",
    email: "user@test.com",
    role: "ADMIN",
    marketCenterId: "mc-123",
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
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

// Mock ticket/db
vi.mock("../ticket/db", () => ({
  db: mockDb,
  ticketRepository: mockTicketRepository,
  commentRepository: mockCommentRepository,
  notificationRepository: mockNotificationRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock permissions
vi.mock("../auth/permissions", () => ({
  canAccessTicket: vi.fn(() => Promise.resolve(true)),
  canViewInternalComments: vi.fn(() => Promise.resolve(true)),
  canCreateInternalComments: vi.fn(() => Promise.resolve(true)),
  canBeNotifiedAboutComments: vi.fn(() => Promise.resolve(true)),
}));

// Mock rate limiter
vi.mock("./rate-limiter", () => ({
  commentRateLimiter: {
    checkRateLimit: vi.fn(),
  },
}));

// Mock sanitize
vi.mock("./sanitize", () => ({
  processCommentContent: vi.fn((content) => content),
}));

// Mock publisher
vi.mock("./publisher", () => ({
  CommentEventPublisher: {
    publishCommentCreated: vi.fn(() => Promise.resolve()),
    publishCommentDeleted: vi.fn(() => Promise.resolve()),
    publishCommentUpdated: vi.fn(() => Promise.resolve()),
  },
}));

// Import after mocks
import { create } from "./create";
import { list } from "./list";
import { deleteComment } from "./delete";
import { getUserContext } from "../auth/user-context";
import {
  canAccessTicket,
  canViewInternalComments,
  canCreateInternalComments,
} from "../auth/permissions";

describe("Comment Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    vi.mocked(canAccessTicket).mockResolvedValue(true);
    vi.mocked(canViewInternalComments).mockResolvedValue(true);
    vi.mocked(canCreateInternalComments).mockResolvedValue(true);
  });

  describe("create", () => {
    it("should create a comment successfully", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        creatorId: "user-456",
        assigneeId: "user-789",
        creator: { id: "user-456", name: "Creator", email: "creator@test.com", role: "AGENT" },
        assignee: { id: "user-789", name: "Assignee", email: "assignee@test.com", role: "STAFF" },
      };

      const mockComment = {
        id: "comment-123",
        content: "Test comment",
        ticketId: "ticket-123",
        userId: "user-123",
        internal: false,
        source: "WEB",
        createdAt: new Date(),
        user: { id: "user-123", name: "Commenter", email: "user@test.com" },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue([]);
      mockCommentRepository.createWithUser.mockResolvedValue(mockComment);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockNotificationRepository.createMany.mockResolvedValue([]);

      const result = await create({
        ticketId: "ticket-123",
        content: "Test comment",
      });

      expect(result.comment).toBeDefined();
      expect(result.comment.content).toBe("Test comment");
      expect(result.ticketTitle).toBe("Test Ticket");
      expect(mockCommentRepository.createWithUser).toHaveBeenCalled();
    });

    it("should create an internal comment when allowed", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        creatorId: "user-456",
        assigneeId: null,
        creator: { id: "user-456", name: "Creator", email: "creator@test.com", role: "AGENT" },
        assignee: null,
      };

      const mockComment = {
        id: "comment-123",
        content: "Internal note",
        ticketId: "ticket-123",
        userId: "user-123",
        internal: true,
        source: "WEB",
        createdAt: new Date(),
        user: { id: "user-123", name: "Staff", email: "staff@test.com" },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue([]);
      mockCommentRepository.createWithUser.mockResolvedValue(mockComment);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockNotificationRepository.createMany.mockResolvedValue([]);

      const result = await create({
        ticketId: "ticket-123",
        content: "Internal note",
        internal: true,
      });

      expect(result.comment.internal).toBe(true);
    });

    it("should throw permission denied when user cannot access ticket", async () => {
      vi.mocked(canAccessTicket).mockResolvedValue(false);

      await expect(
        create({ ticketId: "ticket-123", content: "Test" })
      ).rejects.toThrow("You do not have permission to comment on this ticket");
    });

    it("should throw permission denied for internal comments when not allowed", async () => {
      vi.mocked(canCreateInternalComments).mockResolvedValue(false);

      await expect(
        create({ ticketId: "ticket-123", content: "Internal", internal: true })
      ).rejects.toThrow("You do not have permission to create internal comments");
    });

    it("should throw not found when ticket does not exist", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(
        create({ ticketId: "nonexistent", content: "Test" })
      ).rejects.toThrow("ticket not found");
    });

    it("should notify assignee and previous commenters", async () => {
      const mockTicket = {
        id: "ticket-123",
        title: "Test Ticket",
        creatorId: "user-creator",
        assigneeId: "user-assignee",
        creator: { id: "user-creator", name: "Creator", email: "creator@test.com", role: "AGENT" },
        assignee: { id: "user-assignee", name: "Assignee", email: "assignee@test.com", role: "STAFF" },
      };

      const mockPreviousComments = [
        {
          id: "comment-old",
          user: { id: "user-other", name: "Other Commenter", email: "other@test.com" },
        },
      ];

      const mockComment = {
        id: "comment-new",
        content: "New comment",
        ticketId: "ticket-123",
        userId: "user-123",
        internal: false,
        createdAt: new Date(),
        user: { id: "user-123", name: "Commenter", email: "user@test.com" },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue(mockPreviousComments);
      mockCommentRepository.createWithUser.mockResolvedValue(mockComment);
      mockTicketRepository.createHistory.mockResolvedValue({});
      mockNotificationRepository.createMany.mockResolvedValue([]);

      const result = await create({
        ticketId: "ticket-123",
        content: "New comment",
      });

      expect(result.usersToNotify.length).toBeGreaterThan(0);
    });
  });

  describe("list", () => {
    it("should return comments for a ticket", async () => {
      const mockComments = [
        {
          id: "comment-1",
          content: "First comment",
          ticketId: "ticket-123",
          userId: "user-1",
          internal: false,
          createdAt: new Date(),
          user: { id: "user-1", name: "User 1", email: "user1@test.com" },
        },
        {
          id: "comment-2",
          content: "Second comment",
          ticketId: "ticket-123",
          userId: "user-2",
          internal: false,
          createdAt: new Date(),
          user: { id: "user-2", name: "User 2", email: "user2@test.com" },
        },
      ];

      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue(mockComments);

      const result = await list({ ticketId: "ticket-123" });

      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].content).toBe("First comment");
    });

    it("should include internal comments when user has permission", async () => {
      const mockComments = [
        {
          id: "comment-1",
          content: "Public comment",
          internal: false,
          user: { id: "user-1", name: "User", email: "user@test.com" },
        },
        {
          id: "comment-2",
          content: "Internal comment",
          internal: true,
          user: { id: "user-2", name: "Staff", email: "staff@test.com" },
        },
      ];

      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue(mockComments);

      const result = await list({ ticketId: "ticket-123" });

      expect(result.comments).toHaveLength(2);
      expect(mockCommentRepository.findByTicketIdWithUsers).toHaveBeenCalledWith(
        "ticket-123",
        { includeInternal: true, orderBy: "asc" }
      );
    });

    it("should exclude internal comments when user lacks permission", async () => {
      vi.mocked(canViewInternalComments).mockResolvedValue(false);

      const mockComments = [
        {
          id: "comment-1",
          content: "Public comment",
          internal: false,
          user: { id: "user-1", name: "User", email: "user@test.com" },
        },
      ];

      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue(mockComments);

      await list({ ticketId: "ticket-123" });

      expect(mockCommentRepository.findByTicketIdWithUsers).toHaveBeenCalledWith(
        "ticket-123",
        { includeInternal: false, orderBy: "asc" }
      );
    });

    it("should handle null user names gracefully", async () => {
      const mockComments = [
        {
          id: "comment-1",
          content: "Comment",
          internal: false,
          user: { id: "user-1", name: null, email: "user@test.com" },
        },
      ];

      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue(mockComments);

      const result = await list({ ticketId: "ticket-123" });

      expect(result.comments[0].user?.name).toBe("");
    });
  });

  describe("deleteComment", () => {
    it("should delete a comment successfully", async () => {
      const mockComment = {
        id: "comment-123",
        content: "Test comment",
        ticketId: "ticket-123",
        userId: "user-123", // Same as mockUserContext.userId
      };

      mockCommentRepository.findById.mockResolvedValue(mockComment);
      mockDb.exec.mockResolvedValue({ rowsAffected: 1 });
      mockCommentRepository.delete.mockResolvedValue(undefined);

      const result = await deleteComment({
        ticketId: "ticket-123",
        commentId: "comment-123",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Comment deleted successfully");
      expect(mockCommentRepository.delete).toHaveBeenCalledWith("comment-123");
    });

    it("should throw not found when comment does not exist", async () => {
      mockCommentRepository.findById.mockResolvedValue(null);

      await expect(
        deleteComment({ ticketId: "ticket-123", commentId: "nonexistent" })
      ).rejects.toThrow("Comment not found");
    });

    it("should throw not found when comment belongs to different ticket", async () => {
      const mockComment = {
        id: "comment-123",
        content: "Test comment",
        ticketId: "different-ticket",
        userId: "user-123",
      };

      mockCommentRepository.findById.mockResolvedValue(mockComment);

      await expect(
        deleteComment({ ticketId: "ticket-123", commentId: "comment-123" })
      ).rejects.toThrow("Comment not found for this ticket");
    });

    it("should throw permission denied when deleting another users comment", async () => {
      const mockComment = {
        id: "comment-123",
        content: "Test comment",
        ticketId: "ticket-123",
        userId: "different-user", // Different from mockUserContext.userId
      };

      mockCommentRepository.findById.mockResolvedValue(mockComment);

      await expect(
        deleteComment({ ticketId: "ticket-123", commentId: "comment-123" })
      ).rejects.toThrow("You can only delete your own comments");
    });
  });
});
