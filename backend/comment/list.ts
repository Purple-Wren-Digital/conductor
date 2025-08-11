import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";

export interface ListCommentsRequest {
  ticketId: string;
}

export interface ListCommentsResponse {
  comments: Comment[];
}

// Retrieves all comments for a ticket.
export const list = api<ListCommentsRequest, ListCommentsResponse>(
  { expose: true, method: "GET", path: "/tickets/:ticketId/comments" },
  async (req) => {
    const comments = await prisma.comment.findMany({
      where: { ticketId: req.ticketId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { comments };
  }
);
