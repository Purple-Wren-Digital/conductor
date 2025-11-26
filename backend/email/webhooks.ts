// import { api } from "encore.dev/api";
// import { PrismaClient } from "../ticket/.prisma/client";
// import { Secret } from "encore.dev/config";

// const prisma = new PrismaClient();

// // Optional webhook secret for verification
// const webhookSecret = new Secret("RESEND_WEBHOOK_SECRET");

// interface ResendWebhookPayload {
//   type: string;
//   data: {
//     email_id: string;
//     from: string;
//     to: string[];
//     subject: string;
//     html?: string;
//     text?: string;
//     headers?: Record<string, string>;
//     attachments?: Array<{
//       filename: string;
//       content: string;
//       content_type: string;
//     }>;
//   };
//   created_at: string;
// }

// // Health check endpoint for webhook
// export const webhookHealth = api(
//   { expose: true, method: "GET", path: "/webhooks/email/health", auth: false },
//   async (): Promise<{ status: string }> => {
//     return { status: "healthy" };
//   }
// );

// // Webhook endpoint for receiving emails from Resend
// export const inboundEmail = api.raw(
//   { expose: true, method: "POST", path: "/webhooks/email/inbound", auth: false },
//   async (req, res) => {
//     try {
//       // Optional: Verify webhook signature if secret is configured
//       const secret = webhookSecret();
//       if (secret) {
//         const signature = req.headers.get("resend-signature");
//         if (!signature) {
//           console.error("Missing webhook signature");
//           res.status(401).json({ error: "Unauthorized" });
//           return;
//         }
//         // Note: Implement signature verification based on Resend's documentation
//         // This is a placeholder - actual verification logic depends on Resend's signature format
//       }

//       const payload: ResendWebhookPayload = await req.body.json();
//       console.log("Received inbound email webhook:", {
//         type: payload.type,
//         from: payload.data.from,
//         to: payload.data.to,
//         subject: payload.data.subject,
//       });

//       // Only process email.received events
//       if (payload.type !== "email.received") {
//         res.status(200).json({ message: "Event type not processed" });
//         return;
//       }

//       // Extract ticket ID from the to address (ticket-{id}@reply.conductorticket.com)
//       const ticketId = extractTicketId(payload.data.to);
//       if (!ticketId) {
//         console.error("Could not extract ticket ID from email addresses:", payload.data.to);
//         res.status(200).json({ message: "No ticket ID found" });
//         return;
//       }

//       // Extract sender email
//       const fromEmail = extractEmail(payload.data.from);
//       if (!fromEmail) {
//         console.error("Could not extract sender email from:", payload.data.from);
//         res.status(200).json({ message: "Invalid sender" });
//         return;
//       }

//       // Find the user by email
//       const user = await prisma.user.findUnique({
//         where: { email: fromEmail },
//       });

//       if (!user) {
//         console.error("User not found for email:", fromEmail);
//         res.status(200).json({ message: "User not found" });
//         return;
//       }

//       // Verify the ticket exists
//       const ticket = await prisma.ticket.findUnique({
//         where: { id: ticketId },
//         include: {
//           creator: true,
//           assignee: true,
//         },
//       });

//       if (!ticket) {
//         console.error("Ticket not found:", ticketId);
//         res.status(200).json({ message: "Ticket not found" });
//         return;
//       }

//       // Check if user has permission to comment on this ticket
//       // (They should be the creator, assignee, or staff)
//       const canComment =
//         user.id === ticket.creator_id ||
//         user.id === ticket.assignee_id ||
//         user.role === "STAFF" ||
//         user.role === "STAFF_LEADER" ||
//         user.role === "ADMIN";

//       if (!canComment) {
//         console.error("User does not have permission to comment on ticket:", {
//           userId: user.id,
//           ticketId,
//           role: user.role,
//         });
//         res.status(200).json({ message: "Permission denied" });
//         return;
//       }

//       // Extract the email content (prefer text over HTML)
//       let content = payload.data.text || "";
//       if (!content && payload.data.html) {
//         // Strip HTML tags if only HTML is provided
//         content = payload.data.html.replace(/<[^>]*>/g, "");
//       }

//       // Remove email signatures and quoted text
//       content = cleanEmailContent(content);

//       if (!content) {
//         console.error("No content found in email");
//         res.status(200).json({ message: "Empty email content" });
//         return;
//       }

//       // Create the comment
//       const comment = await prisma.comment.create({
//         data: {
//           content,
//           ticket_id: ticketId,
//           user_id: user.id,
//           source: "EMAIL",
//           metadata: {
//             email_id: payload.data.email_id,
//             from: payload.data.from,
//             subject: payload.data.subject,
//             received_at: payload.created_at,
//           },
//         },
//       });

//       // Update ticket's updated_at timestamp
//       await prisma.ticket.update({
//         where: { id: ticketId },
//         data: {
//           updated_at: new Date(),
//           // If ticket was resolved and someone comments, change status to awaiting response
//           status: ticket.status === "RESOLVED" ? "AWAITING_RESPONSE" : ticket.status,
//         },
//       });

//       console.log("Created comment from email:", {
//         commentId: comment.id,
//         ticketId,
//         userId: user.id,
//         source: "EMAIL",
//       });

//       res.status(200).json({
//         success: true,
//         message: "Email processed successfully",
//         commentId: comment.id,
//       });

//     } catch (error) {
//       console.error("Error processing inbound email webhook:", error);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   }
// );

// // Helper function to extract ticket ID from email addresses
// function extractTicketId(toAddresses: string[]): string | null {
//   for (const address of toAddresses) {
//     // Match pattern: ticket-{id}@reply.conductorticket.com
//     const match = address.match(/ticket-([a-f0-9-]+)@reply\.conductorticket\.com/i);
//     if (match && match[1]) {
//       return match[1];
//     }
//   }
//   return null;
// }

// // Helper function to extract email from a string like "Name <email@example.com>" or just "email@example.com"
// function extractEmail(from: string): string | null {
//   // Try to match email in angle brackets first
//   const angleMatch = from.match(/<([^>]+)>/);
//   if (angleMatch && angleMatch[1]) {
//     return angleMatch[1].toLowerCase();
//   }

//   // Otherwise assume the whole string is the email
//   const emailMatch = from.match(/([^\s]+@[^\s]+)/);
//   if (emailMatch && emailMatch[1]) {
//     return emailMatch[1].toLowerCase();
//   }

//   return null;
// }

// // Helper function to clean email content (remove signatures, quoted text, etc.)
// function cleanEmailContent(content: string): string {
//   if (!content) return "";

//   // Remove lines that start with > (quoted text)
//   let lines = content.split("\n").filter(line => !line.trim().startsWith(">"));

//   // Remove everything after common signature markers
//   const signatureMarkers = [
//     "-- ",
//     "--",
//     "Sent from my",
//     "Get Outlook for",
//     "________________________________",
//     "From:",
//     "On .* wrote:",
//   ];

//   for (const marker of signatureMarkers) {
//     const regex = new RegExp(`^${marker}.*`, "mi");
//     const match = lines.join("\n").match(regex);
//     if (match) {
//       const index = lines.join("\n").indexOf(match[0]);
//       content = lines.join("\n").substring(0, index);
//       lines = content.split("\n");
//     }
//   }

//   // Rejoin and trim
//   content = lines.join("\n").trim();

//   // Remove excessive whitespace
//   content = content.replace(/\n{3,}/g, "\n\n");

//   return content;
// }
