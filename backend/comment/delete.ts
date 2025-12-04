import { api, APIError } from "encore.dev/api";
import { commentRepository, db } from "../ticket/db";
import { getUserContext } from "../auth/user-context";
import { processCommentContent } from "./sanitize";
import { CommentEventPublisher } from "./publisher";

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

export interface DeleteCommentRequest {
  ticketId: string;
  commentId: string;
}

export interface DeleteCommentResponse {
  success: boolean;
  message: string;
}

export const deleteComment = api<DeleteCommentRequest, DeleteCommentResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/tickets/:ticketId/comments/:commentId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const userId = userContext?.userId;

    const comment = await commentRepository.findById(req.commentId);

    if (!comment) {
      throw APIError.notFound("Comment not found");
    }

    if (comment.ticketId !== req.ticketId) {
      throw APIError.notFound("Comment not found for this ticket");
    }

    if (comment.userId !== userId) {
      throw APIError.permissionDenied("You can only delete your own comments");
    }

    // Store ticketId before deletion for event publishing
    const ticketId = comment.ticketId;

    // Create history record
    await db.exec`
      INSERT INTO ticket_history (
        ticket_id,
        action,
        field,
        previous_value,
        changed_by_id,
        created_at
      ) VALUES (
        ${comment.ticketId},
        'DELETE',
        'comment',
        ${processCommentContent(comment.content)},
        ${userContext.userId},
        NOW()
      )
    `;

    // Delete the comment
    await commentRepository.delete(req.commentId);

    // Publish comment deleted event for real-time updates
    await CommentEventPublisher.publishCommentDeleted(req.commentId, ticketId);

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  }
);
