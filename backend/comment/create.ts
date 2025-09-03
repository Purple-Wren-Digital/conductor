import { api, APIError } from "encore.dev/api";
// import { getAuthData } from "encore.dev/internal/auth/mod";
import { getAuthData } from "~encore/auth";

import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { commentRateLimiter } from "./rate-limiter";
import { processCommentContent } from "./sanitize";

interface AuthData {
  userID: string;
  imageUrl: string | null;
  emailAddress: string;
}

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  internal?: boolean;
}

export interface CreateCommentResponse {
  comment: Comment;
}

export const create = api<CreateCommentRequest, CreateCommentResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:ticketId/comments",
    auth: true,
  },
  async (req) => {
    const authData = getAuthData();
    if (!authData) {
      throw APIError.unauthenticated("user not authenticated");
    }

    const userId = authData.userID;

    // Apply rate limiting
    commentRateLimiter.checkRateLimit(userId);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    const comment = await prisma.comment.create({
      data: {
        content: processCommentContent(req.content),
        ticketId: req.ticketId,
        userId: userId,
        internal: req.internal || false,
      },
      include: {
        user: true,
      },
    });

    return { comment };
  }
);
