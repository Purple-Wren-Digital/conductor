import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for comment stream cleanup behavior.
 * Verifies that event handlers are unsubscribed when streams disconnect,
 * preventing the memory leak that caused crashes in production.
 */

const {
  mockGetUserContext,
  mockTicketRepository,
  mockCanAccessTicket,
  mockCommentEventBus,
} = vi.hoisted(() => ({
  mockGetUserContext: vi.fn(),
  mockTicketRepository: {
    findById: vi.fn(),
  },
  mockCanAccessTicket: vi.fn(),
  mockCommentEventBus: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publish: vi.fn(),
  },
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

vi.mock("./events", () => ({
  commentEventBus: mockCommentEventBus,
}));

import { commentStream } from "./stream";

describe("Comment Stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStream = {
    send: vi.fn(),
    close: vi.fn(),
  };

  const mockTicket = {
    id: "ticket-123",
    title: "Test Ticket",
    status: "IN_PROGRESS",
    creatorId: "user-123",
  };

  const mockUserContext = {
    userId: "user-123",
    email: "user@test.com",
    role: "ADMIN",
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
  };

  it("should subscribe to all three event types on connect", async () => {
    mockGetUserContext.mockResolvedValue(mockUserContext);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCanAccessTicket.mockResolvedValue(true);

    const subscribedTypes: string[] = [];
    let subscribeCalls = 0;
    mockCommentEventBus.subscribe.mockImplementation((type: string) => {
      subscribedTypes.push(type);
      subscribeCalls++;
      if (subscribeCalls === 3) {
        throw new Error("force-exit");
      }
    });

    try {
      await (commentStream as any)({ ticketId: "ticket-123" }, mockStream);
    } catch {
      // Expected: force-exit error
    }

    expect(subscribedTypes).toEqual([
      "comment.created",
      "comment.updated",
      "comment.deleted",
    ]);
  });

  it("should unsubscribe all handlers in finally block on disconnect", async () => {
    mockGetUserContext.mockResolvedValue(mockUserContext);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCanAccessTicket.mockResolvedValue(true);

    let subscribeCalls = 0;
    mockCommentEventBus.subscribe.mockImplementation(() => {
      subscribeCalls++;
      if (subscribeCalls === 3) {
        throw new Error("force-exit");
      }
    });

    try {
      await (commentStream as any)({ ticketId: "ticket-123" }, mockStream);
    } catch {
      // Expected
    }

    expect(mockCommentEventBus.unsubscribe).toHaveBeenCalledTimes(3);
    expect(mockCommentEventBus.unsubscribe).toHaveBeenCalledWith("comment.created", expect.any(Function));
    expect(mockCommentEventBus.unsubscribe).toHaveBeenCalledWith("comment.updated", expect.any(Function));
    expect(mockCommentEventBus.unsubscribe).toHaveBeenCalledWith("comment.deleted", expect.any(Function));
  });

  it("should unsubscribe the same handler references that were subscribed", async () => {
    mockGetUserContext.mockResolvedValue(mockUserContext);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCanAccessTicket.mockResolvedValue(true);

    const subscribedHandlers: Function[] = [];
    const unsubscribedHandlers: Function[] = [];

    let subscribeCalls = 0;
    mockCommentEventBus.subscribe.mockImplementation((_type: string, handler: Function) => {
      subscribedHandlers.push(handler);
      subscribeCalls++;
      if (subscribeCalls === 3) {
        throw new Error("force-exit");
      }
    });

    mockCommentEventBus.unsubscribe.mockImplementation((_type: string, handler: Function) => {
      unsubscribedHandlers.push(handler);
    });

    try {
      await (commentStream as any)({ ticketId: "ticket-123" }, mockStream);
    } catch {
      // Expected
    }

    // All 3 subscribe calls use the same handler function
    expect(subscribedHandlers[0]).toBe(subscribedHandlers[1]);
    expect(subscribedHandlers[1]).toBe(subscribedHandlers[2]);

    // Unsubscribe uses the exact same reference
    expect(unsubscribedHandlers[0]).toBe(subscribedHandlers[0]);
    expect(unsubscribedHandlers[1]).toBe(subscribedHandlers[0]);
    expect(unsubscribedHandlers[2]).toBe(subscribedHandlers[0]);
  });

  it("should not unsubscribe if handler was never created (auth failure)", async () => {
    mockGetUserContext.mockResolvedValue(null);

    try {
      await (commentStream as any)({ ticketId: "ticket-123" }, mockStream);
    } catch {
      // Expected: unauthenticated error
    }

    expect(mockCommentEventBus.subscribe).not.toHaveBeenCalled();
    expect(mockCommentEventBus.unsubscribe).not.toHaveBeenCalled();
  });

  it("should not unsubscribe if handler was never created (ticket not found)", async () => {
    mockGetUserContext.mockResolvedValue(mockUserContext);
    mockTicketRepository.findById.mockResolvedValue(null);

    try {
      await (commentStream as any)({ ticketId: "nonexistent" }, mockStream);
    } catch {
      // Expected: not found error
    }

    expect(mockCommentEventBus.subscribe).not.toHaveBeenCalled();
    expect(mockCommentEventBus.unsubscribe).not.toHaveBeenCalled();
  });
});
