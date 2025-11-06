import { api, APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { commentRateLimiter } from "./rate-limiter";
import { processCommentContent } from "./sanitize";
import { getUserContext } from "../auth/user-context";
import {
  canAccessTicket,
  canCreateInternalComments,
} from "../auth/permissions";
import { CommentEventPublisher } from "./publisher";

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
    const userContext = await getUserContext();

    // Check if user can access the ticket
    const hasAccess = await canAccessTicket(userContext, req.ticketId);
    if (!hasAccess) {
      throw APIError.permissionDenied(
        "You do not have permission to comment on this ticket"
      );
    }

    // Check if user can create internal comments
    if (req.internal) {
      const canCreateInternal = await canCreateInternalComments(userContext);
      if (!canCreateInternal) {
        throw APIError.permissionDenied(
          "You do not have permission to create internal comments"
        );
      }
    }

    // Apply rate limiting
    commentRateLimiter.checkRateLimit(userContext.userId);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.ticketId },
    });

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    const result = await prisma.$transaction(async (p) => {
      const comment = await p.comment.create({
        data: {
          content: processCommentContent(req.content),
          ticketId: req.ticketId,
          userId: userContext.userId,
          internal: req.internal || false,
        },
        include: {
          user: true,
        },
      });

      const history = await p.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: "CREATE",
          field: "comment",
          snapshot: ticket,
          newValue: processCommentContent(req.content),
          changedById: userContext.userId,
        },
      });
      // TODO: notifications based on user preference
      // TODO: notifications based on
      const usersToNotify: string[] =
        userContext?.userId && ticket?.creatorId && ticket?.assigneeId
          ? [userContext?.userId, ticket?.creatorId, ticket?.assigneeId]
          : userContext?.userId && ticket?.creatorId
          ? [userContext?.userId, ticket?.creatorId]
          : [];

      // Notification<Partial>
      const notifications: any[] =
        usersToNotify && usersToNotify.length > 0
          ? usersToNotify.map((userId) => {
              return {
                userId: userId, // notifications for commenter and assignee
                channel: "IN_APP",
                category: "ACTIVITY",
                type: "Ticket New Comment",
                title: `${
                  comment?.user && comment?.user?.name
                    ? `${comment.user.name} commented on`
                    : "New comment on"
                } ticket: "${ticket?.title}"`,
                body: comment?.content,
                data: {
                  ticketId: ticket?.id,
                  commentId: comment?.id,
                },
              };
            })
          : [];
      const notificationData = notifications.filter(Boolean);
      if (notificationData && notificationData.length > 0) {
        const notification = await p.notification.createMany({
          data: notificationData,
        });
      }
      return { comment, history };
    });

    const safeComment = {
      ...result.comment,
      user: {
        ...result.comment.user,
        name: result.comment.user.name ?? "",
      },
    };

    // Publish comment created event for real-time updates
    await CommentEventPublisher.publishCommentCreated(safeComment);

    return { comment: safeComment };
  }
);
