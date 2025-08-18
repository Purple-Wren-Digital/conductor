import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";

export interface DeleteCommentRequest {
  ticketId: string;
  commentId: string;
}

export interface DeleteCommentResponse {
  success: boolean;
  message: string;
}

export const deleteComment = api<DeleteCommentRequest, DeleteCommentResponse>(
  { expose: true, method: "DELETE", path: "/tickets/:ticketId/comments/:commentId", auth: true },
  async (req) => {
    // TODO: implement auth
    const mockUserId = "user_1";

    const comment = await prisma.comment.findFirst({
      where: {
        id: req.commentId,
        ticketId: req.ticketId,
      },
    });

    if (!comment) {
      throw APIError.notFound("Comment not found");
    }

    if (comment.userId !== mockUserId) {
      throw APIError.permissionDenied("You can only delete your own comments");
    }

    await prisma.comment.delete({
      where: { id: req.commentId },
    });

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  }
);