import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { processCommentContent } from "./sanitize";
import { getUserContext } from "../auth/user-context";

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

    // const updatedComment = await prisma.comment.update({
    //   where: { id: req.commentId },
    //   data: {
    //     content: processCommentContent(req.content),
    //     internal:
    //       req.internal !== undefined ? req.internal : existingComment.internal,
    //     updatedAt: new Date(),
    //   },
    //   include: {
    //     user: true,
    //   },
    // });
    const result = await prisma.$transaction(async (p) => {
      const updatedComment = await p.comment.update({
        where: { id: req.commentId },
        data: {
          content: processCommentContent(req.content),
          internal:
            req.internal !== undefined
              ? req.internal
              : existingComment.internal,
          updatedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      const history = await p.ticketHistory.create({
        data: {
          ticketId: existingComment?.ticketId,
          field: "edited comment",
          previousValue: "N/A",
          newValue: processCommentContent(req.content),
          changedById: userContext.userId,
        },
      });

      return { updatedComment, history };
    });

    const safeUpdatedComment = {
      ...result.updatedComment,
      user: {
        ...result.updatedComment.user,
        name: result.updatedComment.user.name ?? "",
      },
    };

    return { comment: safeUpdatedComment };
  }
);
