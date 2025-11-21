import { api } from "encore.dev/api";
import { APIError } from "encore.dev/api";
import { prisma } from "../ticket/db";
import { CommentService } from "../comment/comment";
import { create as createNotification } from "../notifications/create";

// Resend webhook payload structure
interface ResendInboundEmail {
  type: "email.received";
  data: {
    id: string;
    to: string[];
    from: string;
    from_name?: string;
    subject: string;
    text?: string;
    html?: string;
    reply_to?: string[];
    headers: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content_type: string;
      size: number;
    }>;
    created_at: string;
  };
}

interface InboundEmailResponse {
  success: boolean;
  message?: string;
  commentId?: string;
}

/**
 * Handle inbound email replies from Resend
 * This endpoint receives webhooks when users reply to ticket notification emails
 */
export const handleInboundEmail = api(
  {
    expose: true,
    method: "POST",
    path: "/webhooks/email/inbound",
    auth: false, // Webhooks don't use standard auth
  },
  async (req: ResendInboundEmail): Promise<InboundEmailResponse> => {
    console.log("Received inbound email webhook:", {
      to: req.data.to,
      from: req.data.from,
      subject: req.data.subject,
      id: req.data.id,
    });

    try {
      // Verify webhook signature (if Resend provides one)
      // TODO: Add webhook signature verification once Resend provides it

      // Extract ticket ID from the to address
      // Expected format: ticket-123@reply.conductor.app
      const ticketId = extractTicketId(req.data.to);
      if (!ticketId) {
        console.error(
          "Could not extract ticket ID from email addresses:",
          req.data.to
        );
        return {
          success: false,
          message: "Invalid ticket address",
        };
      }

      // Get the sender's user account
      const senderEmail = extractEmailAddress(req.data.from);
      const user = await prisma.user.findUnique({
        where: { email: senderEmail },
      });

      if (!user) {
        console.error("Unknown sender email:", senderEmail);
        return {
          success: false,
          message: "Sender not found in system",
        };
      }

      // Verify the ticket exists
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          creator: true,
          assignee: true,
        },
      });

      if (!ticket) {
        console.error("Ticket not found:", ticketId);
        return {
          success: false,
          message: "Ticket not found",
        };
      }

      // Basic permission check - user should be creator, assignee, or staff
      const canComment =
        user.id === ticket.creatorId ||
        user.id === ticket.assigneeId ||
        user.role === "STAFF" ||
        user.role === "ADMIN";

      if (!canComment) {
        console.error("User not authorized to comment on ticket:", {
          userId: user.id,
          ticketId: ticket.id,
          userRole: user.role,
        });
        return {
          success: false,
          message: "Not authorized to comment on this ticket",
        };
      }

      // Extract and clean the email content
      const content = extractReplyContent(
        req.data.text || req.data.html || "",
        req.data.from_name || user.name
      );

      if (!content.trim()) {
        console.error("Empty email content after extraction");
        return {
          success: false,
          message: "Email content was empty",
        };
      }

      // Create the comment
      const comment = await CommentService.create({
        content,
        ticketId: ticket.id,
        userId: user.id,
        internal: false,
        metadata: {
          source: "EMAIL",
          emailId: req.data.id,
          originalSubject: req.data.subject,
        },
      });

      // Update ticket status if it was resolved
      if (ticket.status === "RESOLVED") {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "AWAITING_RESPONSE",
            updatedAt: new Date(),
          },
        });
      }

      // Send notifications to relevant parties
      const notificationRecipients = [];

      // Notify assignee if commenter is not the assignee
      if (ticket.assigneeId && ticket.assigneeId !== user.id) {
        notificationRecipients.push(ticket.assigneeId);
      }

      // Notify creator if commenter is not the creator
      if (ticket.creatorId !== user.id) {
        notificationRecipients.push(ticket.creatorId);
      }

      // Send in-app notifications
      for (const recipientId of notificationRecipients) {
        await createNotification({
          userId: recipientId,
          type: "NEW_COMMENT",
          category: "ACTIVITY",
          title: "New comment on ticket",
          body: `${user.name} replied to ticket #${ticket.id} via email`,
          data: {
            ticketId: ticket.id,
            commentId: comment.id,
            commenterId: user.id,
          },
        });
      }

      console.log("Successfully processed email reply:", {
        ticketId: ticket.id,
        commentId: comment.id,
        userId: user.id,
      });

      return {
        success: true,
        commentId: comment.id,
        message: "Comment added successfully",
      };
    } catch (error) {
      console.error("Error processing inbound email:", error);
      throw APIError.internal("Failed to process email reply");
    }
  }
);

/**
 * Extract ticket ID from email address
 * Format: ticket-123@reply.conductor.app -> 123
 */
function extractTicketId(toAddresses: string[]): string | null {
  for (const address of toAddresses) {
    const match = address.match(/ticket-([a-zA-Z0-9-]+)@/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extract clean email address from sender string
 * "John Doe <john@example.com>" -> "john@example.com"
 */
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim().toLowerCase();
}

/**
 * Extract reply content from email, removing signatures and quoted text
 * This is a simplified version - consider using a library like 'email-reply-parser'
 */
function extractReplyContent(rawContent: string, senderName?: string): string {
  // First, normalize line breaks
  let content = rawContent.replace(/\r\n/g, "\n");

  // Remove HTML if present (basic strip)
  if (content.includes("<html") || content.includes("<body")) {
    // Very basic HTML stripping - consider using a proper library
    content = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
  }

  const lines = content.split("\n");
  const replyLines: string[] = [];
  let foundQuoted = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Stop at common email signatures
    if (
      trimmedLine === "--" ||
      trimmedLine === "---" ||
      trimmedLine.startsWith("Sent from my") ||
      trimmedLine.startsWith("Get Outlook for")
    ) {
      break;
    }

    // Stop at quoted text indicators
    if (
      trimmedLine.startsWith(">") ||
      trimmedLine.startsWith("|") ||
      (trimmedLine.includes("wrote:") && trimmedLine.includes("@")) ||
      (trimmedLine.startsWith("On ") && line.includes(" wrote:")) ||
      trimmedLine.startsWith("From:") ||
      trimmedLine.startsWith("-----Original Message-----") ||
      trimmedLine.includes("________")
    ) {
      foundQuoted = true;
      break;
    }

    // Skip email metadata lines
    if (
      trimmedLine.startsWith("Date:") ||
      trimmedLine.startsWith("Subject:") ||
      trimmedLine.startsWith("To:") ||
      trimmedLine.startsWith("Cc:")
    ) {
      continue;
    }

    replyLines.push(line);
  }

  // Clean up the extracted content
  let cleanContent = replyLines
    .join("\n")
    .trim()
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, "\n\n");

  // Remove sender's signature if it appears at the end
  if (senderName) {
    const signatureVariations = [
      `Best,\n${senderName}`,
      `Regards,\n${senderName}`,
      `Thanks,\n${senderName}`,
      `Sincerely,\n${senderName}`,
      `- ${senderName}`,
      senderName,
    ];

    for (const sig of signatureVariations) {
      if (cleanContent.endsWith(sig)) {
        cleanContent = cleanContent.slice(0, -sig.length).trim();
      }
    }
  }

  return cleanContent || "Unable to extract email content";
}

/**
 * Health check endpoint for webhook testing
 */
export const webhookHealth = api(
  { expose: true, method: "GET", path: "/webhooks/email/health" },
  async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
);