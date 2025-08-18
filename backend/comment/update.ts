import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";

export interface UpdateCommentRequest {
  ticketId: string;
  commentId: string;
  content: string;
  internal?: boolean;
}

export interface UpdateCommentResponse {
  comment: Comment;
}

export const update = api<UpdateCommentRequest, UpdateCommentResponse>(
  { expose: true, method: "PUT", path: "/tickets/:ticketId/comments/:commentId", auth: true },
  async (req) => {
    // TODO: implement auth
    const mockUserId = "user_2";

    const existingComment = await prisma.comment.findFirst({
      where: {
        id: req.commentId,
        ticketId: req.ticketId,
      },
    });

    if (!existingComment) {
      throw APIError.notFound("Comment not found");
    }

    if (existingComment.userId !== mockUserId) {
      throw APIError.permissionDenied("You can only edit your own comments");
    }

    const updatedComment = await prisma.comment.update({
      where: { id: req.commentId },
      data: {
        content: req.content,
        internal: req.internal !== undefined ? req.internal : existingComment.internal,
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return { comment: updatedComment };
  }
);