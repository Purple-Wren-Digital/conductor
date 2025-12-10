import { Resend } from "resend";
import { secret } from "encore.dev/config";
import type { UserRole } from "../user/types";

const RESEND_API_KEY = secret("RESEND_API_KEY");
const APP_BASE_URL = process.env.APP_BASE_URL || "https://app.conductorticket.com";
const EMAIL_FROM_ADDRESS = "noreply@reply.conductorticket.com";
const EMAIL_FROM_NAME = "Conductor";

interface SendInvitationEmailParams {
  to: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeRole: UserRole;
  marketCenterName: string;
  inviterName: string;
  inviterEmail: string;
  token: string;
  expiresAt: Date;
}

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
  const {
    to,
    inviteeName,
    inviteeEmail,
    inviteeRole,
    marketCenterName,
    inviterName,
    inviterEmail,
    token,
    expiresAt,
  } = params;

  // Generate the signup URL
  const signupUrl = `${APP_BASE_URL}/sign-up?token=${token}`;

  // Always log invitation URL for local development/testing
  console.log("\n========================================");
  console.log("📧 INVITATION CREATED");
  console.log("========================================");
  console.log(`To: ${to}`);
  console.log(`Name: ${inviteeName}`);
  console.log(`Role: ${inviteeRole}`);
  console.log(`Market Center: ${marketCenterName}`);
  console.log(`Invited By: ${inviterName}`);
  console.log(`Token: ${token}`);
  console.log(`\n🔗 SIGNUP URL: ${signupUrl}`);
  console.log("========================================\n");

  const apiKey = RESEND_API_KEY();
  if (!apiKey) {
    console.warn("⚠️  RESEND_API_KEY not configured - email not sent (use URL above to test)");
    return;
  }

  const resend = new Resend(apiKey);

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build HTML email directly (avoiding cross-project import issues)
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <p style="color: black; font-weight: bold; font-size: 16px; margin-bottom: 8px;">Conductor Ticketing</p>
          <h1 style="font-size: 22px; font-weight: 600;">Join Conductor Ticketing</h1>

          <div style="background-color: lightgray; height: 1px; margin: 10px 0; border-radius: 10px; opacity: 50%;"></div>

          <div style="margin-bottom: 40px;">
            <p style="font-size: 20px; font-weight: 600;">${inviteeName},</p>
            <p style="font-size: 20px; font-weight: 600;">${inviterName} sent you an invite to join Conductor Ticketing!</p>
          </div>

          <p style="font-size: 20px; font-weight: 600;"><b>Invitation Details</b></p>

          <p style="font-size: 18px; font-weight: 600;">Name: ${inviteeName}</p>
          <p style="font-size: 18px; font-weight: 600;">Email: ${inviteeEmail}</p>
          <p style="font-size: 18px; font-weight: 600;">Role: ${inviteeRole}</p>
          <p style="font-size: 18px; font-weight: 600;">Market Center: ${marketCenterName}</p>

          <p style="font-size: 16px; font-weight: 600; margin-top: 40px; margin-bottom: 40px;">
            Click below to set your password and sign up with this email address:
          </p>

          <a href="${signupUrl}" style="background-color: black; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block;">
            Sign up
          </a>

          <p style="font-size: 14px; color: #666; margin-top: 40px;">
            This invitation expires on ${expirationDate}.
          </p>

          <p style="font-size: 16px; font-weight: 600; color: gray; margin-top: 40px;">
            If any of this information is incorrect, please contact ${inviterName} at ${inviterEmail} to resend an invitation with your correct details.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      to: [to],
      subject: `${inviterName} invited you to join ${marketCenterName} on Conductor`,
      html: emailHtml,
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}
