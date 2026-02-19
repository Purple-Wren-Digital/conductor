#!/bin/bash

# Quick test script for email sending
# This creates a notification which triggers an email

echo "📧 Quick Email Test"
echo "=================="

# Default values
USER_ID="${1:-test-user-id}"
TICKET_ID="${2:-test-ticket-123}"
USER_EMAIL="${3:-test@example.com}"

echo "User ID: $USER_ID"
echo "Ticket ID: $TICKET_ID"
echo "Email: $USER_EMAIL"
echo ""

# Test 1: Create a notification (this should trigger an email)
echo "📤 Sending test notification..."

curl -X POST "http://localhost:4000/notifications/create/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "userId": "'$USER_ID'",
    "category": "ACTIVITY",
    "type": "ticket_comment",
    "title": "New comment on ticket #'$TICKET_ID'",
    "body": "Test notification that should trigger an email. Reply to this email to test the webhook!",
    "data": {
      "ticketId": "'$TICKET_ID'",
      "metadata": {
        "ticketId": "'$TICKET_ID'"
      }
    },
    "priority": "MEDIUM"
  }'

echo ""
echo ""

# Test 2: Simulate an email reply webhook
echo "📥 Testing email reply webhook..."

curl -X POST "http://localhost:4000/email/inbound" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.received",
    "data": {
      "to": ["ticket-'$TICKET_ID'@reply.conductortickets.com"],
      "from": "'$USER_EMAIL'",
      "subject": "Re: Ticket #'$TICKET_ID'",
      "text": "This is a test reply from email.",
      "html": "<p>This is a test reply from email.</p>"
    }
  }'

echo ""
echo ""
echo "✅ Tests complete!"
echo ""
echo "Next steps:"
echo "1. Check if the notification was created"
echo "2. Check if an email was sent (check Resend dashboard)"
echo "3. Check if the reply webhook created a comment"