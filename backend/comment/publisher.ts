import { commentEventTopic } from "./topic";
import type { CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent } from "./events";
import type { Comment } from "../ticket/types";

/**
 * Publisher functions for comment events via Encore Pub/Sub
 */
export class CommentEventPublisher {
  static async publishCommentCreated(comment: Comment): Promise<void> {
    const event: CommentCreatedEvent = {
      type: "comment.created",
      comment,
      ticketId: comment.ticketId,
    };
    await commentEventTopic.publish(event);
  }

  static async publishCommentUpdated(comment: Comment): Promise<void> {
    const event: CommentUpdatedEvent = {
      type: "comment.updated",
      comment,
      ticketId: comment.ticketId,
    };
    await commentEventTopic.publish(event);
  }

  static async publishCommentDeleted(commentId: string, ticketId: string): Promise<void> {
    const event: CommentDeletedEvent = {
      type: "comment.deleted",
      commentId,
      ticketId,
    };
    await commentEventTopic.publish(event);
  }
}
