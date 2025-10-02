import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { getUserContext } from "../auth/user-context";

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

    const comment = await prisma.comment.findFirst({
      where: {
        id: req.commentId,
        ticketId: req.ticketId,
      },
    });

    if (!comment) {
      throw APIError.notFound("Comment not found");
    }

    if (comment.userId !== userId) {
      throw APIError.permissionDenied("You can only delete your own comments");
    }
    // isActive
    await prisma.comment.delete({
      where: { id: req.commentId },
    });

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  }
);
