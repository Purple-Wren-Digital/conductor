import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  internal?: boolean;
}

export interface CreateCommentResponse {
  comment: Comment;
}

export const create = api<CreateCommentRequest, CreateCommentResponse>(
  { expose: true, method: "POST", path: "/tickets/:ticketId/comments", auth: true },
  async (req) => {
    // TODO: Implement auth
    const mockUserId = "user_1";

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    const comment = await prisma.comment.create({
      data: {
        content: req.content,
        ticketId: req.ticketId,
        userId: mockUserId,
        internal: req.internal || false,
      },
      include: {
        user: true,
      },
    });

    return { comment };
  }
);
