import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { getUserContext } from "../auth/user-context";
import { canViewInternalComments } from "../auth/permissions";

export interface ListCommentsRequest {
  ticketId: string;
}

export interface ListCommentsResponse {
  comments: Comment[];
}

export const list = api<ListCommentsRequest, ListCommentsResponse>(
  {
    expose: true,
    method: "GET",
    path: "/tickets/:ticketId/comments",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const canSeeInternal = await canViewInternalComments(userContext);

    const where: any = { ticketId: req.ticketId };
    if (!canSeeInternal) {
      where.internal = false;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedComments: Comment[] = comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        name: comment.user.name ?? "",
      },
    }));

    return { comments: formattedComments };
  }
);
