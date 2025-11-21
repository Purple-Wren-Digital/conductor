#!/usr/bin/env tsx
/**
 * Direct email sending test using Resend
 */

import { Resend } from 'resend';

const EMAIL = process.argv[2] || 'calebmcquaid+1@gmail.com';
const TICKET_ID = process.argv[3] || '395fb995-bb76-4954-8a32-ecd4b87e5f35';

async function sendTestEmail() {
  const apiKey = process.env.RESEND_API_KEY || "re_fDikV7Vh_38cGMBCYAXk7JPv64Cafd6Bi";

  console.log('📧 Sending test email to:', EMAIL);
  console.log('🎫 Ticket ID:', TICKET_ID);
  console.log('🔑 Using Resend API');

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: 'Conductor Ticketing <noreply@reply.conductorticket.com>',
      to: [EMAIL],
      replyTo: `ticket-${TICKET_ID}@reply.conductorticket.com`,
      subject: `[Ticket #${TICKET_ID}] Test Email - Contract deadline for 123 Maple St`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Ticket Update</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Contract deadline for 123 Maple St</h3>
            <p style="color: #666;">A new comment has been added to your ticket.</p>
            <p><strong>Ticket ID:</strong> ${TICKET_ID}</p>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
            <p style="margin: 0; color: #1976d2;"><strong>💡 Pro Tip:</strong> Reply directly to this email to add a comment to the ticket!</p>
          </div>

          <p style="color: #666;">This is a test email from the Conductor Ticketing System. When you reply to this email, it will be processed by our webhook and added as a comment to the ticket.</p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <div style="color: #999; font-size: 12px;">
            <p>Conductor Ticketing System<br>
            Ticket #${TICKET_ID}<br>
            Reply to: ticket-${TICKET_ID}@reply.conductorticket.com</p>
          </div>
        </div>
      `,
      headers: {
        'X-Ticket-ID': TICKET_ID,
        'Message-ID': `<ticket-${TICKET_ID}@conductorticket.com>`,
      },
    });

    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', result.data?.id);
    console.log('');
    console.log('Next steps:');
    console.log('1. Check', EMAIL, 'inbox');
    console.log('2. Reply to the email to test the webhook');
    console.log('3. Or run: npx tsx email/test-webhook.ts', TICKET_ID, EMAIL);

    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

sendTestEmail().catch(console.error);