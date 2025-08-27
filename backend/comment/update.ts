import { api, APIError } from "encore.dev/api";
// @ts-ignore - Encore internal module
import { getAuthData } from "encore.dev/internal/auth/mod";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { processCommentContent } from "./sanitize";

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

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
    const authData = getAuthData<AuthData>();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }

    const userId = authData.userID;

    const existingComment = await prisma.comment.findFirst({
      where: {
        id: req.commentId,
        ticketId: req.ticketId,
      },
    });

    if (!existingComment) {
      throw APIError.notFound("Comment not found");
    }

    if (existingComment.userId !== userId) {
      throw APIError.permissionDenied("You can only edit your own comments");
    }

    const updatedComment = await prisma.comment.update({
      where: { id: req.commentId },
      data: {
        content: processCommentContent(req.content),
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