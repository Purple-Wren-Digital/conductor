import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";

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
    auth: false, // true
  },
  async (req) => {
    const comments = await prisma.comment.findMany({
      where: { ticketId: req.ticketId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return { comments };
  }
);
