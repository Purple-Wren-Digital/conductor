import { Resend } from "resend";
import type { CreateEmailResponse } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
// TODO: Email Templates for html
export async function sendEmailNotification({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) {
  try {
    const response: CreateEmailResponse = await resend.emails.send({
      from: "Conductor Ticketing <onboarding@resend.dev>",

      //   from: "Conductor <no-reply@conductor.app>",
      to,
      subject,
      html,
    });

    if (response.error) {
      console.error("❌ Resend email error:", response.error);
      throw new Error(response.error.message);
    }

    console.log("✅ Email sent:", response.data.id);
    return response;
  } catch (err) {
    console.error("❌ sendEmailNotification failed:", err);
    throw err;
  }
}
