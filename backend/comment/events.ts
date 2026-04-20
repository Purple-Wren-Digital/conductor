import type { Comment } from "../ticket/types";

// Define event types for comment operations
export interface CommentCreatedEvent {
  type: "comment.created";
  comment: Comment;
  ticketId: string;
}

export interface CommentUpdatedEvent {
  type: "comment.updated";
  comment: Comment;
  ticketId: string;
}

export interface CommentDeletedEvent {
  type: "comment.deleted";
  commentId: string;
  ticketId: string;
}

export type CommentEvent = CommentCreatedEvent | CommentUpdatedEvent | CommentDeletedEvent;

// Simple in-memory event handler for real-time updates
// In a production environment, this would be replaced with Encore's pub/sub system
class CommentEventBus {
  private handlers: Map<string, ((event: CommentEvent) => Promise<void>)[]> = new Map();

  // Subscribe to comment events
  subscribe(eventType: CommentEvent["type"], handler: (event: CommentEvent) => Promise<void>) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  // Unsubscribe a handler from comment events
  unsubscribe(eventType: CommentEvent["type"], handler: (event: CommentEvent) => Promise<void>) {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Publish comment events
  async publish(event: CommentEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.allSettled(handlers.map(handler => handler(event)));
  }
}

// Global comment event bus instance
export const commentEventBus = new CommentEventBus();

// Event handlers can be added by other modules as needed