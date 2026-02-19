import { api } from "encore.dev/api";
import {
  userRepository,
  ticketRepository,
  commentRepository,
} from "../shared/repositories";

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    html?: string;
    text?: string;
    headers?: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content: string;
      content_type: string;
    }>;
  };
  created_at: string;
}

// Health check endpoint for webhook
export const webhookHealth = api(
  { expose: true, method: "GET", path: "/webhooks/email/health", auth: false },
  async (): Promise<{ status: string }> => {
    return { status: "healthy" };
  }
);

// Webhook endpoint for receiving emails from Resend
export const inboundEmail = api.raw(
  { expose: true, method: "POST", path: "/webhooks/email/inbound", auth: false },
  async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString("utf-8");
      const payload: ResendWebhookPayload = JSON.parse(body);

      console.log("Received inbound email webhook:", {
        type: payload.type,
        from: payload.data.from,
        to: payload.data.to,
        subject: payload.data.subject,
      });

      // Only process email.received events
      if (payload.type !== "email.received") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Event type not processed" }));
        return;
      }

      // Extract ticket ID from the to address (ticket-{id}@reply.conductortickets.com)
      const ticketId = extractTicketId(payload.data.to);
      if (!ticketId) {
        console.error("Could not extract ticket ID from email addresses:", payload.data.to);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "No ticket ID found" }));
        return;
      }

      // Extract sender email
      const fromEmail = extractEmail(payload.data.from);
      if (!fromEmail) {
        console.error("Could not extract sender email from:", payload.data.from);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid sender" }));
        return;
      }

      // Find the user by email
      const user = await userRepository.findByEmail(fromEmail);
      if (!user) {
        console.error("User not found for email:", fromEmail);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "User not found" }));
        return;
      }

      // Verify the ticket exists
      const ticket = await ticketRepository.findById(ticketId);
      if (!ticket) {
        console.error("Ticket not found:", ticketId);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Ticket not found" }));
        return;
      }

      // Check if user has permission to comment on this ticket
      const canComment =
        user.id === ticket.creatorId ||
        user.id === ticket.assigneeId ||
        user.role === "STAFF" ||
        user.role === "STAFF_LEADER" ||
        user.role === "ADMIN";

      if (!canComment) {
        console.error("User does not have permission to comment on ticket:", {
          userId: user.id,
          ticketId,
          role: user.role,
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Permission denied" }));
        return;
      }

      // Extract the email content (prefer text over HTML)
      let content = payload.data.text || "";
      if (!content && payload.data.html) {
        content = payload.data.html.replace(/<[^>]*>/g, "");
      }

      // Remove email signatures and quoted text
      content = cleanEmailContent(content);

      if (!content) {
        console.error("No content found in email");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Empty email content" }));
        return;
      }

      // Create the comment
      const comment = await commentRepository.create({
        content,
        ticketId,
        userId: user.id,
        source: "EMAIL",
        metadata: {
          source: "EMAIL",
          email_id: payload.data.email_id,
          from: payload.data.from,
          subject: payload.data.subject,
          received_at: payload.created_at,
        },
      });

      // Update ticket status if it was resolved
      if (ticket.status === "RESOLVED") {
        await ticketRepository.update(ticketId, {
          status: "AWAITING_RESPONSE",
        });
      }

      console.log("Created comment from email:", {
        commentId: comment.id,
        ticketId,
        userId: user.id,
        source: "EMAIL",
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        message: "Email processed successfully",
        commentId: comment.id,
      }));
    } catch (error) {
      console.error("Error processing inbound email webhook:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
);

// Helper function to extract ticket ID from email addresses
function extractTicketId(toAddresses: string[]): string | null {
  for (const address of toAddresses) {
    // Match pattern: ticket-{id}@reply.conductortickets.com
    const match = address.match(/ticket-([a-f0-9-]+)@reply\.conductortickets\.com/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Helper function to extract email from "Name <email@example.com>" or just "email@example.com"
function extractEmail(from: string): string | null {
  const angleMatch = from.match(/<([^>]+)>/);
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].toLowerCase();
  }

  const emailMatch = from.match(/([^\s]+@[^\s]+)/);
  if (emailMatch && emailMatch[1]) {
    return emailMatch[1].toLowerCase();
  }

  return null;
}

// Helper function to clean email content (remove signatures, quoted text, etc.)
function cleanEmailContent(content: string): string {
  if (!content) return "";

  // Remove lines that start with > (quoted text)
  let lines = content.split("\n").filter(line => !line.trim().startsWith(">"));

  // Remove everything after common signature markers
  const signatureMarkers = [
    "-- ",
    "--",
    "Sent from my",
    "Get Outlook for",
    "________________________________",
    "From:",
    "On .* wrote:",
  ];

  for (const marker of signatureMarkers) {
    const regex = new RegExp(`^${marker}.*`, "mi");
    const match = lines.join("\n").match(regex);
    if (match) {
      const index = lines.join("\n").indexOf(match[0]);
      content = lines.join("\n").substring(0, index);
      lines = content.split("\n");
    }
  }

  content = lines.join("\n").trim();
  content = content.replace(/\n{3,}/g, "\n\n");

  return content;
}
