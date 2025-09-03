import { api, APIError } from "encore.dev/api";
// import { getAuthData } from "encore.dev/internal/auth/mod";
import { getAuthData } from "~encore/auth";
import { prisma } from "../ticket/db";

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

export interface DeleteCommentRequest {
  userID: string;
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
    auth: false, //true,
  },
  async (req) => {
    // const authData = getAuthData();
    // if (!authData) {
    //   throw APIError.unauthenticated("user not authenticated");
    // }

    const userId = req.userID; // authData.userID;

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

    await prisma.comment.delete({
      where: { id: req.commentId },
    });

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  }
);
