import * as React from "react";
import { Resend } from "resend";
import { secret } from "encore.dev/config";
// import { formatEmailNotification } from "./utils";
import {
  renderCustomizedEmailTemplate,
  renderDefaultEmailTemplate,
} from "./customization-renderer";
import type { CreateEmailResponse, CreateEmailResponseSuccess } from "resend";
import type { Notification } from "../../types";

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

type SendEmailNotification = {
  userEmail: string;
  notification: Notification;
  marketCenterId?: string | null;
  recipientName?: string;
};

export async function sendEmailNotification({
  userEmail,
  notification,
  marketCenterId,
  recipientName,
}: SendEmailNotification) {
  try {
    // First, check for market center customization
    let emailContent: React.ReactElement | null = null;

    if (marketCenterId) {
      emailContent = await renderCustomizedEmailTemplate(
        notification,
        marketCenterId,
        recipientName
      );
    }

    // If no customization found, fall back to default templates
    if (!emailContent) {
      emailContent = renderDefaultEmailTemplate(notification, recipientName);
    }

    if (!emailContent) {
      return;
    }

    const resendClient = getResendClient();
    const response: CreateEmailResponse = await resendClient.emails.send({
      from: "Conductor Ticketing <noreply@reply.conductorticket.com>",
      to: [userEmail],
      subject: `Conductor: ${notification.title}`,
      react: emailContent,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response;
  } catch (err) {
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
