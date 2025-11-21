import * as React from "react";
import { Resend } from "resend";
import type { CreateEmailResponse } from "resend";
import { secret } from "encore.dev/config";
import type { Notification } from "../../types";
import { formatEmailNotification } from "./utils";

const RESEND_API_KEY = secret("RESEND_API_KEY");

// Lazy initialization - only create when needed
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = RESEND_API_KEY();
    if (!apiKey) {
      throw new Error("RESEND_API_KEY secret not configured");
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

type SendEmailNotification = { userEmail: string; notification: Notification };

export async function sendEmailNotification({
  userEmail,
  notification,
}: SendEmailNotification) {
  try {
    const emailContent: React.ReactElement | null =
      formatEmailNotification(notification);

    if (!emailContent) {
      console.error("Email Content is null");
      return;
    }

    // Generate reply-to address if this is a ticket-related notification
    let replyTo: string | undefined;
    if (notification.metadata?.ticketId) {
      // Use subdomain for receiving replies - configure this in Resend dashboard
      replyTo = `ticket-${notification.metadata.ticketId}@reply.conductorticket.com`;
    }

    const resendClient = getResendClient();
    const response: CreateEmailResponse = await resendClient.emails.send({
      from: "Conductor Ticketing <noreply@conductorticket.com>",
      to: [userEmail],
      replyTo: replyTo, // Dynamic reply-to for ticket emails
      subject: `Conductor: ${notification.title}`,
      react: emailContent,
      headers: notification.metadata?.ticketId ? {
        'X-Ticket-ID': String(notification.metadata.ticketId),
        'X-Entity-Ref': `ticket-${notification.metadata.ticketId}@conductorticket.com`,
      } : undefined,
    });

    if (response.error) {
      console.error("Resend email error:", response.error);
      throw new Error(response.error.message);
    }

    return response;
  } catch (err) {
    console.error("Failed to send email notification:", err);
    throw err;
  }
}

// TODO:
// from: "Conductor Ticketing <notification@conductor.com>",

// replyTo: "<reply>@<conductor.com>",

// scheduledAt: "", // https://resend.com/docs/dashboard/emails/schedule-email

// attachments: [
//   { // https://resend.com/docs/dashboard/emails/attachments
//    path: 'https://resend.com/static/sample/invoice.pdf',
//    filename: 'invoice.pdf',
//   },
//   { // https://resend.com/docs/dashboard/emails/embed-inline-images
//     path: "https://resend.com/static/sample/logo.png",
//     filename: "logo.png",
//     content_id: "logo-image",
//   },
// ],
