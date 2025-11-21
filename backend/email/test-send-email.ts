#!/usr/bin/env tsx
/**
 * Test script for sending email notifications
 * This tests the complete email sending flow including reply-to functionality
 *
 * Usage:
 * npx tsx email/test-send-email.ts [userEmail] [ticketId]
 *
 * Examples:
 * npx tsx email/test-send-email.ts                              # Uses defaults
 * npx tsx email/test-send-email.ts your@email.com              # Custom email
 * npx tsx email/test-send-email.ts your@email.com ticket-123   # Custom email and ticket
 */

const API_URL = 'http://localhost:4000';

// Get arguments or use defaults
const userEmail = process.argv[2] || 'test@example.com';
const ticketId = process.argv[3] || 'cm4a9sn7t0001mbp0cqd3d7xh'; // You'll need a real ticket ID

async function createTestNotification() {
  console.log('📧 Testing Email Notification System');
  console.log('=====================================');
  console.log('Recipient:', userEmail);
  console.log('Ticket ID:', ticketId);
  console.log('API URL:', API_URL);
  console.log('');

  // First, we need to find the user ID for this email
  // In a real scenario, you'd have this from your auth system
  const testUserId = 'test-user-id'; // You'll need to replace with a real user ID

  const notificationPayload = {
    userId: testUserId,
    category: 'ACTIVITY' as const,
    type: 'ticket_comment',
    title: `New comment on ticket #${ticketId}`,
    body: `A new comment has been added to your ticket. Reply directly to this email to add a comment.`,
    data: {
      ticketId,
      metadata: {
        ticketId,
        commentText: 'This is a test comment that triggered the notification',
      }
    },
    priority: 'MEDIUM' as const,
  };

  try {
    console.log('📤 Sending notification...');
    const response = await fetch(`${API_URL}/notifications/create/${testUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You might need auth headers here depending on your setup
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(notificationPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();

    console.log('✅ Notification sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('📬 Next steps:');
    console.log(`1. Check ${userEmail} for the notification email`);
    console.log(`2. The email should have reply-to: ticket-${ticketId}@reply.conductorticket.com`);
    console.log('3. Reply to the email to test the inbound webhook');
    console.log('4. Or run: npx tsx email/test-webhook.ts ' + ticketId + ' ' + userEmail);

  } catch (error) {
    console.error('❌ Failed to send notification:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Make sure the backend is running: npm run dev');
    console.error('2. Verify RESEND_API_KEY is set in backend/.env');
    console.error('3. Check that the user ID and ticket ID exist in the database');
  }
}

// Alternative: Test direct email sending without the notification system
async function testDirectEmail() {
  console.log('');
  console.log('📨 Alternative: Testing Direct Email Send via Resend');
  console.log('====================================================');

  try {
    const { Resend } = await import('resend');

    // Load the API key from environment
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not found in environment variables');
    }

    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: 'Conductor Ticketing <noreply@conductorticket.com>',
      to: [userEmail],
      replyTo: `ticket-${ticketId}@reply.conductorticket.com`,
      subject: `[Ticket #${ticketId}] Test Email from Conductor`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email from Conductor</h2>
          <p>This is a test email for ticket #${ticketId}</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Reply to this email to test the inbound webhook!</strong></p>
            <p>Your reply will be added as a comment to the ticket.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from Conductor Ticketing System<br>
            Ticket ID: ${ticketId}<br>
            Reply-To: ticket-${ticketId}@reply.conductorticket.com
          </p>
        </div>
      `,
      headers: {
        'X-Ticket-ID': ticketId,
        'X-Entity-Ref': `ticket-${ticketId}@conductorticket.com`,
      },
    });

    console.log('✅ Direct email sent successfully!');
    console.log('Email ID:', result.data?.id);
    console.log('');
    console.log('Check your inbox and try replying to test the webhook!');

  } catch (error) {
    console.error('❌ Failed to send direct email:', error);
    console.error('');
    console.error('Make sure RESEND_API_KEY is set in your environment');
  }
}

// Main execution
async function main() {
  // Try the notification API first
  await createTestNotification().catch(err => {
    console.error('Notification API failed:', err.message);
  });

  // Also try direct email as a fallback test
  console.log('');
  console.log('Press Enter to test direct email sending, or Ctrl+C to exit...');

  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await testDirectEmail();
}

// Run the main function
main().catch(console.error);