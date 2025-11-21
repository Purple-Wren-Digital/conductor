#!/usr/bin/env ts-node

/**
 * Test script for the email reply webhook
 * Run this to simulate an email reply to a ticket
 *
 * Usage: npx tsx test-webhook.ts [ticketId] [userEmail]
 */

import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:4000/webhooks/email/inbound';

// Get arguments or use defaults
const ticketId = process.argv[2] || 'test-ticket-123';
const userEmail = process.argv[3] || 'test@example.com';

// Simulate a Resend webhook payload
const testPayload = {
  type: 'email.received',
  data: {
    id: `test-email-${Date.now()}`,
    to: [`ticket-${ticketId}@reply.conductor.app`],
    from: `Test User <${userEmail}>`,
    from_name: 'Test User',
    subject: `Re: [Ticket #${ticketId}] Support Request`,
    text: `This is a test reply via email.

I'm responding to the ticket notification I received.

This content should appear as a comment on the ticket.

--
Test User
Get Outlook for iOS`,
    html: `<p>This is a test reply via email.</p>
<p>I'm responding to the ticket notification I received.</p>
<p>This content should appear as a comment on the ticket.</p>
<p>--<br>Test User<br>Get Outlook for iOS</p>`,
    headers: {
      'Message-ID': `<test-${Date.now()}@mail.gmail.com>`,
      'In-Reply-To': `<ticket-${ticketId}@conductor.app>`,
      'References': `<ticket-${ticketId}@conductor.app>`,
    },
    created_at: new Date().toISOString(),
  },
};

async function testWebhook() {
  console.log('🚀 Testing email reply webhook...');
  console.log('📧 Ticket ID:', ticketId);
  console.log('👤 User Email:', userEmail);
  console.log('🔗 Webhook URL:', WEBHOOK_URL);
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
      console.log('📝 Result:', JSON.stringify(result, null, 2));

      if (result.commentId) {
        console.log('');
        console.log(`💬 Comment created with ID: ${result.commentId}`);
        console.log(`🎫 Check ticket ${ticketId} to see the new comment`);
      }
    } else {
      console.error('❌ Webhook failed:', response.status, response.statusText);
      console.error('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Failed to call webhook:', error);
  }
}

// Run the test
testWebhook().catch(console.error);