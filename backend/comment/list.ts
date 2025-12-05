import { api } from "encore.dev/api";
import { commentRepository } from "../ticket/db";
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

    const comments = await commentRepository.findByTicketIdWithUsers(req.ticketId, {
      includeInternal: canSeeInternal,
      orderBy: "asc",
    });

    const formattedComments: Comment[] = comments.map((comment) => ({
      ...comment,
      user: comment.user
        ? {
            ...comment.user,
            name: comment.user.name ?? "",
          }
        : undefined,
    }));

    return { comments: formattedComments };
  }
);
