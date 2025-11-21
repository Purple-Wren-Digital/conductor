/**
 * Comment Service Module
 * Provides centralized comment creation and management functionality
 */

import { prisma } from "../ticket/db";
import type { Comment } from "../ticket/types";
import { processCommentContent } from "./sanitize";
import { CommentEventPublisher } from "./publisher";
import { NotificationChannel } from "@prisma/client";

export interface CreateCommentData {
  content: string;
  ticketId: string;
  userId: string;
  internal?: boolean;
  metadata?: {
    source?: 'EMAIL' | 'WEB' | 'API';
    emailId?: string;
    originalSubject?: string;
    [key: string]: any;
  };
}

export class CommentService {
  /**
   * Create a new comment
   * Used by both API endpoints and webhook handlers
   */
  static async create(data: CreateCommentData): Promise<Comment> {
    const { content, ticketId, userId, internal = false, metadata = {} } = data;

    // Process content for sanitization
    const processedContent = processCommentContent(content);

    // Get the ticket for history tracking
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Create comment with metadata
    const result = await prisma.$transaction(async (p) => {
      const comment = await p.comment.create({
        data: {
          content: processedContent,
          ticketId,
          userId,
          internal,
          source: metadata.source || 'WEB',
          metadata: metadata ? metadata : undefined,
        },
        include: {
          user: true,
        },
      });

      // Create history entry
      const history = await p.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: "CREATE",
          field: "comment",
          snapshot: ticket,
          newValue: processedContent,
          changedById: userId,
        },
      });

      // Create notifications for relevant users
      const usersToNotify: string[] = [];

      // Notify assignee if comment is not from them
      if (ticket.assigneeId && ticket.assigneeId !== userId) {
        usersToNotify.push(ticket.assigneeId);
      }

      // Notify creator if comment is not from them
      if (ticket.creatorId !== userId) {
        usersToNotify.push(ticket.creatorId);
      }

      // Create in-app notifications
      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map((notifyUserId) => ({
          userId: notifyUserId,
          channel: NotificationChannel.IN_APP,
          category: "ACTIVITY" as const,
          type: "Ticket New Comment",
          title: `${comment.user.name || 'Someone'} commented on ticket: "${ticket.title}"`,
          body: processedContent,
          data: {
            ticketId: ticket.id,
            commentId: comment.id,
            source: metadata.source || 'WEB',
          },
        }));

        await p.notification.createMany({
          data: notifications,
        });
      }

      return { comment, history };
    });

    const safeComment: Comment = {
      ...result.comment,
      user: {
        ...result.comment.user,
        name: result.comment.user.name ?? "",
      },
    };

    // Publish comment created event for real-time updates
    await CommentEventPublisher.publishCommentCreated(safeComment);

    return safeComment;
  }

  /**
   * Get a comment by ID
   */
  static async getById(commentId: string): Promise<Comment | null> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: true,
      },
    });

    if (!comment) {
      return null;
    }

    return {
      ...comment,
      user: {
        ...comment.user,
        name: comment.user.name ?? "",
      },
    };
  }

  /**
   * List comments for a ticket
   */
  static async listByTicket(
    ticketId: string,
    includeInternal: boolean = false
  ): Promise<Comment[]> {
    const comments = await prisma.comment.findMany({
      where: {
        ticketId,
        ...(includeInternal ? {} : { internal: false }),
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return comments.map(comment => ({
      ...comment,
      user: {
        ...comment.user,
        name: comment.user.name ?? "",
      },
    }));
  }
}