import { describe, it, expect, beforeEach } from "vitest";

// Test the CommentEventBus directly — no Encore runtime needed
import { commentEventBus } from "./events";
import type { CommentEvent } from "./events";

describe("CommentEventBus", () => {
  // Access the private handlers map for verification
  const getHandlerCount = (eventType: string) => {
    return (commentEventBus as any).handlers.get(eventType)?.length ?? 0;
  };

  beforeEach(() => {
    // Clear all handlers between tests
    (commentEventBus as any).handlers = new Map();
  });

  describe("subscribe", () => {
    it("should add a handler for an event type", () => {
      const handler = async () => {};
      commentEventBus.subscribe("comment.created", handler);
      expect(getHandlerCount("comment.created")).toBe(1);
    });

    it("should support multiple handlers for the same event type", () => {
      const handler1 = async () => {};
      const handler2 = async () => {};
      commentEventBus.subscribe("comment.created", handler1);
      commentEventBus.subscribe("comment.created", handler2);
      expect(getHandlerCount("comment.created")).toBe(2);
    });
  });

  describe("unsubscribe", () => {
    it("should remove a specific handler", () => {
      const handler = async () => {};
      commentEventBus.subscribe("comment.created", handler);
      expect(getHandlerCount("comment.created")).toBe(1);

      commentEventBus.unsubscribe("comment.created", handler);
      expect(getHandlerCount("comment.created")).toBe(0);
    });

    it("should only remove the specified handler, not others", () => {
      const handler1 = async () => {};
      const handler2 = async () => {};
      commentEventBus.subscribe("comment.created", handler1);
      commentEventBus.subscribe("comment.created", handler2);
      expect(getHandlerCount("comment.created")).toBe(2);

      commentEventBus.unsubscribe("comment.created", handler1);
      expect(getHandlerCount("comment.created")).toBe(1);
    });

    it("should be safe to call with a handler that was never subscribed", () => {
      const handler = async () => {};
      commentEventBus.unsubscribe("comment.created", handler);
      expect(getHandlerCount("comment.created")).toBe(0);
    });

    it("should be safe to call with an event type that has no handlers", () => {
      const handler = async () => {};
      commentEventBus.unsubscribe("comment.deleted", handler);
      expect(getHandlerCount("comment.deleted")).toBe(0);
    });

    it("should not leak handlers after subscribe/unsubscribe cycles", () => {
      const handlers: ((event: CommentEvent) => Promise<void>)[] = [];

      // Simulate 100 client connect/disconnect cycles
      for (let i = 0; i < 100; i++) {
        const handler = async () => {};
        handlers.push(handler);

        commentEventBus.subscribe("comment.created", handler);
        commentEventBus.subscribe("comment.updated", handler);
        commentEventBus.subscribe("comment.deleted", handler);

        commentEventBus.unsubscribe("comment.created", handler);
        commentEventBus.unsubscribe("comment.updated", handler);
        commentEventBus.unsubscribe("comment.deleted", handler);
      }

      expect(getHandlerCount("comment.created")).toBe(0);
      expect(getHandlerCount("comment.updated")).toBe(0);
      expect(getHandlerCount("comment.deleted")).toBe(0);
    });
  });

  describe("publish", () => {
    it("should call all subscribed handlers for an event", async () => {
      let called1 = false;
      let called2 = false;

      commentEventBus.subscribe("comment.created", async () => { called1 = true; });
      commentEventBus.subscribe("comment.created", async () => { called2 = true; });

      await commentEventBus.publish({
        type: "comment.created",
        ticketId: "ticket-1",
        comment: {} as any,
      });

      expect(called1).toBe(true);
      expect(called2).toBe(true);
    });

    it("should not call unsubscribed handlers", async () => {
      let called = false;
      const handler = async () => { called = true; };

      commentEventBus.subscribe("comment.created", handler);
      commentEventBus.unsubscribe("comment.created", handler);

      await commentEventBus.publish({
        type: "comment.created",
        ticketId: "ticket-1",
        comment: {} as any,
      });

      expect(called).toBe(false);
    });

    it("should not call handlers for different event types", async () => {
      let createdCalled = false;
      let deletedCalled = false;

      commentEventBus.subscribe("comment.created", async () => { createdCalled = true; });
      commentEventBus.subscribe("comment.deleted", async () => { deletedCalled = true; });

      await commentEventBus.publish({
        type: "comment.created",
        ticketId: "ticket-1",
        comment: {} as any,
      });

      expect(createdCalled).toBe(true);
      expect(deletedCalled).toBe(false);
    });
  });
});
