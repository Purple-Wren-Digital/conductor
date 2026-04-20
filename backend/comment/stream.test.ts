import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for comment stream behavior after Pub/Sub migration.
 * The stream no longer subscribes to an in-memory event bus.
 * Instead, broadcastCommentEvent() is called by the Pub/Sub subscription handler.
 */

const {
  mockGetUserContext,
  mockTicketRepository,
  mockCanAccessTicket,
} = vi.hoisted(() => ({
  mockGetUserContext: vi.fn(),
  mockTicketRepository: {
    findById: vi.fn(),
  },
  mockCanAccessTicket: vi.fn(),
}));

vi.mock("encore.dev/api", () => ({
  api: {
    streamOut: vi.fn((_config: any, handler: any) => handler),
  },
  APIError: {
    unauthenticated: vi.fn((msg: string) => new Error(msg)),
    notFound: vi.fn((msg: string) => new Error(msg)),
    permissionDenied: vi.fn((msg: string) => new Error(msg)),
  },
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock("../ticket/db", () => ({
  ticketRepository: mockTicketRepository,
}));

vi.mock("./metrics", () => ({
  activeCommentStreams: { set: vi.fn() },
  streamDisconnects: { increment: vi.fn() },
  caughtErrors: { with: vi.fn(() => ({ increment: vi.fn() })) },
}));

vi.mock("../auth/permissions", () => ({
  canAccessTicket: mockCanAccessTicket,
}));

import { broadcastCommentEvent } from "./stream";

describe("Comment Stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserContext = {
    userId: "user-123",
    email: "user@test.com",
    role: "ADMIN",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
  };

  const mockTicket = {
    id: "ticket-123",
    title: "Test Ticket",
    status: "IN_PROGRESS",
    creatorId: "user-123",
  };

  describe("broadcastCommentEvent", () => {
    it("should not throw when no streams are active for a ticket", async () => {
      await expect(
        broadcastCommentEvent({
          type: "comment.created",
          ticketId: "ticket-999",
          comment: {} as any,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("auth failures", () => {
    it("should throw when user is not authenticated", async () => {
      mockGetUserContext.mockResolvedValue(null);

      const { commentStream } = await import("./stream");

      await expect(
        (commentStream as any)({ ticketId: "ticket-123" }, { send: vi.fn(), close: vi.fn() })
      ).rejects.toThrow();
    });

    it("should throw when ticket is not found", async () => {
      mockGetUserContext.mockResolvedValue(mockUserContext);
      mockTicketRepository.findById.mockResolvedValue(null);

      const { commentStream } = await import("./stream");

      await expect(
        (commentStream as any)({ ticketId: "nonexistent" }, { send: vi.fn(), close: vi.fn() })
      ).rejects.toThrow();
    });

    it("should throw when user lacks permission", async () => {
      mockGetUserContext.mockResolvedValue(mockUserContext);
      mockTicketRepository.findById.mockResolvedValue(mockTicket);
      mockCanAccessTicket.mockResolvedValue(false);

      const { commentStream } = await import("./stream");

      await expect(
        (commentStream as any)({ ticketId: "ticket-123" }, { send: vi.fn(), close: vi.fn() })
      ).rejects.toThrow();
    });
  });
});
