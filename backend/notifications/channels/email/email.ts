import * as React from "react";
import { Resend } from "resend";
import { secret } from "encore.dev/config";
import {
  renderCustomizedEmailTemplate,
  renderDefaultEmailTemplate,
} from "./customization-renderer";
import type { CreateEmailResponse, CreateEmailResponseSuccess } from "resend";
import type { Notification } from "../../types";
import { emailsSent, emailSendErrors } from "../../metrics";
import log from "encore.dev/log";

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

    // Build replyTo address if notification is ticket-related
    const ticketId = notification.data?.ticketId;
    const replyTo = ticketId
      ? `ticket-${ticketId}@reply.conductortickets.com`
      : undefined;

    const response: CreateEmailResponse = await resendClient.emails.send({
      from: "Conductor Ticketing <noreply@reply.conductortickets.com>",
      to: [userEmail],
      subject: `Conductor: ${notification.title}`,
      react: emailContent,
      ...(replyTo && { replyTo }),
    });

    if (response.error) {
      emailSendErrors.increment();
      log.error("resend API returned error", { error: response.error.message, to: userEmail });
      throw new Error(response.error.message);
    }

    emailsSent.increment();
    return response;
  } catch (err) {
    emailSendErrors.increment();
    log.error("email send failed", {
      error: err instanceof Error ? err.message : String(err),
      to: userEmail,
    });
    throw err;
  }
}

