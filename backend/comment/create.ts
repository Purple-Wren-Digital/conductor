import { api, APIError } from "encore.dev/api";
import { ticketRepository, commentRepository } from "../ticket/db";
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

    // Get previous comments to notify other commenters
    const previousComments = await commentRepository.findByTicketIdWithUsers(
      req.ticketId
    );

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

    // Automatically update ticket status based on commenter role
    // Only update if ticket is not resolved or draft
    const nonUpdatableStatuses = ["RESOLVED", "DRAFT"];
    if (!nonUpdatableStatuses.includes(ticket.status)) {
      const isStaffComment =
        userContext.role === "STAFF" ||
        userContext.role === "STAFF_LEADER" ||
        userContext.role === "ADMIN";
      const newStatus = isStaffComment ? "AWAITING_RESPONSE" : "IN_PROGRESS";

      // Only update if status is actually changing
      if (ticket.status !== newStatus) {
        await ticketRepository.update(ticket.id, { status: newStatus });

        // Record status change in ticket history
        await ticketRepository.createHistory({
          ticketId: ticket.id,
          action: "UPDATE",
          field: "status",
          previousValue: ticket.status,
          newValue: newStatus,
          changedById: userContext.userId,
          snapshot: { ...ticket, status: newStatus },
        });
      }
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

    const safeComment = {
      ...comment,
      user: {
        ...comment.user,
        name: comment.user.name ?? "",
      },
    };

    // Publish comment created event for real-time updates
    await CommentEventPublisher.publishCommentCreated(safeComment);

    const usersToNotify: UsersToNotify[] = [];

    if (
      ticket?.assigneeId &&
      ticket?.assignee &&
      (await canBeNotifiedAboutComments({
        userId: ticket.assigneeId,
        role: ticket.assignee.role,
        isInternal: req.internal || false,
        currentUserId: userContext.userId,
      }))
    ) {
      usersToNotify.push({
        id: ticket.assigneeId,
        name: ticket.assignee?.name || "The assigned staff member",
        email: ticket.assignee?.email || "",
        updateType: "created",
      });
    }

    if (
      (!ticket?.assigneeId || ticket?.assigneeId !== ticket?.creatorId) &&
      ticket?.creatorId &&
      ticket?.creator &&
      (await canBeNotifiedAboutComments({
        userId: ticket.creatorId,
        role: ticket.creator.role,
        isInternal: req.internal || false,
        currentUserId: userContext.userId,
      }))
    ) {
      usersToNotify.push({
        id: ticket.creatorId,
        name: ticket.creator?.name || "The ticket creator",
        email: ticket.creator?.email || "",
        updateType: "created",
      });
    }

    for (const comment of previousComments) {
      const commenter = comment?.user;
      if (!commenter) continue;

      const alreadyNotified = usersToNotify.find(
        (user) => user.id === commenter.id
      );
      if (alreadyNotified !== undefined) continue;

      const canAccess = await canAccessTicket(userContext, req.ticketId);
      const canBeNotified = await canBeNotifiedAboutComments({
        userId: commenter.id,
        role: commenter.role,
        isInternal: req.internal || false,
        currentUserId: userContext.userId,
      });

      if (canAccess && canBeNotified && !alreadyNotified) {
        usersToNotify.push({
          id: commenter.id,
          name: commenter.name || "A team member",
          email: commenter.email || "",
          updateType: "created",
        });
      } else {
        continue;
      }
    }

    return {
      comment: safeComment,
      usersToNotify: usersToNotify,
      ticketTitle: ticket?.title || "Untitled Ticket",
    };
  }
);
