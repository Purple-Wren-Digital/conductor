import { describe, it, expect } from "vitest";
import type { CommentEvent, CommentCreatedEvent, CommentDeletedEvent } from "./events";

/**
 * Tests for comment event type definitions.
 * The in-memory CommentEventBus has been replaced by Encore Pub/Sub (see topic.ts).
 * These tests verify the event type contracts still hold.
 */

describe("CommentEvent types", () => {
  it("should accept a valid CommentCreatedEvent", () => {
    const event: CommentCreatedEvent = {
      type: "comment.created",
      ticketId: "ticket-123",
      comment: {
        id: "comment-1",
        ticketId: "ticket-123",
        content: "test",
        userId: "user-1",
        internal: false,
        source: "WEB",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "Test", email: "test@test.com", role: "AGENT" },
      } as any,
    };

    expect(event.type).toBe("comment.created");
    expect(event.ticketId).toBe("ticket-123");
  });

  it("should accept a valid CommentDeletedEvent", () => {
    const event: CommentDeletedEvent = {
      type: "comment.deleted",
      commentId: "comment-1",
      ticketId: "ticket-123",
    };

    expect(event.type).toBe("comment.deleted");
    expect(event.commentId).toBe("comment-1");
  });

  it("should discriminate CommentEvent union by type field", () => {
    const event: CommentEvent = {
      type: "comment.deleted",
      commentId: "c1",
      ticketId: "t1",
    };

    if (event.type === "comment.deleted") {
      expect(event.commentId).toBe("c1");
    }
  });
});
