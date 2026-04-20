import type { Comment } from "../ticket/types";

// Comment event types used by the Pub/Sub topic (see topic.ts)

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
