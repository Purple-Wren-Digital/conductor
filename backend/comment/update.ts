import { api, APIError } from "encore.dev/api";
import { commentRepository, db } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { processCommentContent } from "./sanitize";
import { getUserContext } from "../auth/user-context";
import { CommentEventPublisher } from "./publisher";

export interface UpdateCommentRequest {
  userId: string;
  ticketId: string;
  commentId: string;
  content: string;
  internal?: boolean;
}

export interface UpdateCommentResponse {
  comment: Comment;
}

export const update = api<UpdateCommentRequest, UpdateCommentResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/:ticketId/comments/:commentId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const userId = userContext?.userId;

    const existingComment = await commentRepository.findById(req.commentId);

    if (!existingComment) {
      throw APIError.notFound("Comment not found");
    }

    if (existingComment.ticketId !== req.ticketId) {
      throw APIError.notFound("Comment not found for this ticket");
    }

    if (existingComment.userId !== userId) {
      throw APIError.permissionDenied("You can only edit your own comments");
    }

    // Process the new content and determine internal flag
    const processedContent = processCommentContent(req.content);
    const internal = req.internal !== undefined ? req.internal : existingComment.internal;

    // Use a transaction to update comment and create history
    await using tx = await db.begin();

    try {
      // Update the comment
      await tx.exec`
        UPDATE comments
        SET
          content = ${processedContent},
          internal = ${internal},
          updated_at = NOW()
        WHERE id = ${req.commentId}
      `;

      // Create history record
      await tx.exec`
        INSERT INTO ticket_history (
          ticket_id,
          action,
          field,
          previous_value,
          new_value,
          changed_by_id,
          created_at
        ) VALUES (
          ${existingComment.ticketId},
          'UPDATE',
          'comment',
          ${processCommentContent(existingComment.content)},
          ${processedContent},
          ${userContext.userId},
          NOW()
        )
      `;
    } catch (error) {
      throw error;
    }

    // Fetch the updated comment with user details
    const updatedComment = await commentRepository.findByIdWithUser(req.commentId);

    if (!updatedComment) {
      throw APIError.internal("Failed to fetch updated comment");
    }

    // Ensure user name is not null for the response
    const safeUpdatedComment: Comment = {
      id: updatedComment.id,
      content: updatedComment.content,
      ticketId: updatedComment.ticketId,
      userId: updatedComment.userId,
      internal: updatedComment.internal,
      createdAt: updatedComment.createdAt,
      user: updatedComment.user ? {
        ...updatedComment.user,
        name: updatedComment.user.name ?? "",
      } : undefined,
    };

    // Publish comment updated event for real-time updates
    await CommentEventPublisher.publishCommentUpdated(safeUpdatedComment);

    return { comment: safeUpdatedComment };
  }
);
