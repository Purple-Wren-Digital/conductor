import { api, APIError } from "encore.dev/api";
import {
  ticketRepository,
  commentRepository,
  notificationRepository,
} from "../ticket/db";
import type { Comment } from "../ticket/types";
import { commentRateLimiter } from "./rate-limiter";
import { processCommentContent } from "./sanitize";
import { getUserContext } from "../auth/user-context";
import {
  canAccessTicket,
  canBeNotifiedAboutComments,
  canCreateInternalComments,
} from "../auth/permissions";
import { CommentEventPublisher } from "./publisher";
import type { UsersToNotify } from "../notifications/types";
import { slaService } from "../sla/sla.service";

export interface CreateCommentRequest {
  ticketId: string;
  content: string;
  internal?: boolean;
}

export interface CreateCommentResponse {
  comment: Comment;
  usersToNotify: UsersToNotify[];
  ticketTitle: string;
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

    const ticket = await ticketRepository.findByIdWithRelations(req.ticketId);

    if (!ticket) {
      throw APIError.notFound("ticket not found");
    }

    const usersToNotify: UsersToNotify[] = [];

    if (
      ticket?.assigneeId &&
      ticket?.assignee &&
      (await canBeNotifiedAboutComments(
        ticket.assignee.role,
        req.internal || false
      ))
    ) {
      usersToNotify.push({
        id: ticket.assigneeId,
        name: ticket.assignee?.name || "The assigned staff member",
        email: ticket.assignee?.email || "",
        updateType: "created",
      });
    }

    if (
      !ticket?.assigneeId &&
      ticket.creatorId &&
      ticket?.creator &&
      (await canBeNotifiedAboutComments(
        ticket.creator.role,
        req.internal || false
      ))
    ) {
      usersToNotify.push({
        id: ticket.creatorId,
        name: ticket.creator?.name || "The ticket creator",
        email: ticket.creator?.email || "",
        updateType: "created",
      });
    }

    // Get previous comments to notify other commenters
    const previousComments = await commentRepository.findByTicketIdWithUsers(
      req.ticketId
    );

    const notifiedUserIds = new Set(usersToNotify.map((user) => user.id));

    for (const comment of previousComments) {
      const commenter = comment.user;
      if (!commenter) continue;

      const alreadyNotified = notifiedUserIds.has(commenter.id);
      const canAccess = await canAccessTicket(userContext, req.ticketId);
      if (!alreadyNotified && canAccess) {
        usersToNotify.push({
          id: commenter.id,
          name: commenter.name || "A team member",
          email: commenter.email || "",
          updateType: "created",
        });
        notifiedUserIds.add(commenter.id);
      }
    }

    // Create comment
    const comment = await commentRepository.createWithUser({
      content: processCommentContent(req.content),
      ticketId: req.ticketId,
      userId: userContext.userId,
      internal: req.internal || false,
      source: "WEB",
      metadata: { source: "WEB" },
    });

    // Record first response for SLA tracking if staff member comments
    // A staff/admin comment counts as a response to the ticket
    if (
      userContext.role === "STAFF" ||
      userContext.role === "STAFF_LEADER" ||
      userContext.role === "ADMIN"
    ) {
      await slaService.recordFirstResponse(req.ticketId);
    }

    // Create ticket history
    await ticketRepository.createHistory({
      ticketId: ticket.id,
      action: "CREATE",
      field: "comment",
      newValue: processCommentContent(req.content),
      changedById: userContext.userId,
      snapshot: ticket,
    });

    // Create notifications
    const notificationUserIds: string[] =
      userContext?.userId && ticket?.creatorId && ticket?.assigneeId
        ? [userContext?.userId, ticket?.creatorId, ticket?.assigneeId]
        : userContext?.userId && ticket?.creatorId
          ? [userContext?.userId, ticket?.creatorId]
          : [];

    if (notificationUserIds.length > 0) {
      const notificationsData = notificationUserIds.map((userId) => ({
        userId,
        channel: "IN_APP" as const,
        category: "ACTIVITY" as const,
        type: "Ticket New Comment",
        title: `${
          comment?.user?.name
            ? `${comment.user.name} commented on`
            : "New comment on"
        } ticket: "${ticket?.title}"`,
        body: comment?.content,
        data: {
          ticketId: ticket?.id,
          commentId: comment?.id,
        },
      }));

      await notificationRepository.createMany(notificationsData);
    }

    const safeComment = {
      ...comment,
      user: {
        ...comment.user,
        name: comment.user.name ?? "",
      },
    };

    // Publish comment created event for real-time updates
    await CommentEventPublisher.publishCommentCreated(safeComment);

    return {
      comment: safeComment,
      usersToNotify: usersToNotify,
      ticketTitle: ticket?.title || "Untitled Ticket",
    };
  }
);
