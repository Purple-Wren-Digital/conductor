import * as React from "react";
import { Resend } from "resend";
import type { CreateEmailResponse } from "resend";
import type { Notification } from "../../types";
import { formatEmailNotification } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY!);

type SendEmailNotification = { userEmail: string; notification: Notification };

export async function sendEmailNotification({
  userEmail,
  notification,
}: SendEmailNotification) {
  console.log("******** Sending Email Notification ********");
  try {
    const emailContent: React.ReactElement | null =
      formatEmailNotification(notification);

    if (!emailContent) throw new Error("Email Content is null");

    const response: CreateEmailResponse = await resend.emails.send({
      from: "Conductor Ticketing <onboarding@resend.dev>",
      to: [userEmail],
      subject: `Conductor: ${notification.title}`,
      react: emailContent,
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
