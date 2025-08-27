import { commentEventBus, CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent } from "./events";
import type { Comment } from "../ticket/types";

/**
 * Publisher functions for comment events
 */
export class CommentEventPublisher {
  /**
   * Publish a comment created event
   */
  static async publishCommentCreated(comment: Comment): Promise<void> {
    const event: CommentCreatedEvent = {
      type: "comment.created",
      comment,
      ticketId: comment.ticketId,
    };

    await commentEventBus.publish(event);
  }

  /**
   * Publish a comment updated event
   */
  static async publishCommentUpdated(comment: Comment): Promise<void> {
    const event: CommentUpdatedEvent = {
      type: "comment.updated",
      comment,
      ticketId: comment.ticketId,
    };

    await commentEventBus.publish(event);
  }

  /**
   * Publish a comment deleted event
   */
  static async publishCommentDeleted(commentId: string, ticketId: string): Promise<void> {
    const event: CommentDeletedEvent = {
      type: "comment.deleted",
      commentId,
      ticketId,
    };

    await commentEventBus.publish(event);
  }
}