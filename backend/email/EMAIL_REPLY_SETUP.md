# Email Reply Feature Setup Guide

## Overview
This feature allows users to reply to ticket notification emails, and their replies will automatically be added as comments to the corresponding ticket.

## Architecture
- **Inbound Email**: Uses Resend's inbound email processing
- **Reply-To Address**: Dynamic addresses like `ticket-123@reply.conductor.app`
- **Webhook Endpoint**: `/webhooks/email/inbound` receives email data
- **Comment Creation**: Automatically creates comments with email source tracking

## Setup Instructions

### 1. Resend Configuration

1. **Set up a subdomain for receiving emails**:
   - Choose a subdomain (e.g., `reply.conductor.app`)
   - This will be used for reply-to addresses

2. **Configure DNS MX Records**:
   Add these MX records to your domain's DNS:
   ```
   MX  10  feedback-smtp.us-west-2.amazonses.com
   MX  10  feedback-smtp.eu-west-1.amazonses.com
   ```
   (Note: Exact records depend on your Resend configuration)

3. **Configure Resend Webhook**:
   - Go to Resend Dashboard → Webhooks
   - Add webhook endpoint: `https://your-api-domain.com/webhooks/email/inbound`
   - Select event type: `email.received`
   - Save the webhook secret for verification (future enhancement)

### 2. Environment Variables

Add to your `.env` files:

```bash
# Backend (.env)
RESEND_API_KEY=your_resend_api_key
RESEND_WEBHOOK_SECRET=your_webhook_secret  # For future webhook verification
RESEND_REPLY_DOMAIN=reply.conductor.app    # Your reply subdomain

# Update the from address in email.ts if needed
# Currently set to: noreply@conductor.app
```

### 3. Database Migration

The database schema has been updated to track:
- `ticket.emailMessageId` - For email threading
- `comment.source` - Track if comment came from EMAIL, WEB, or API
- `comment.metadata` - Store email ID and other metadata

Run migration if not already done:
```bash
cd backend
npx prisma db push --schema=ticket/schema.prisma
```

### 4. Testing

#### Local Testing
Use the provided test script to simulate an email reply:

```bash
cd backend/email
npx tsx test-webhook.ts [ticketId] [userEmail]

# Example:
npx tsx test-webhook.ts abc-123 john@example.com
```

#### Manual Testing
1. Create a ticket in the system
2. Ensure the user receives an email notification
3. Reply to that email
4. Check if the reply appears as a comment on the ticket

#### Webhook Health Check
```bash
curl http://localhost:4000/webhooks/email/health
```

## How It Works

### Email Flow
1. User receives notification email with reply-to: `ticket-123@reply.conductor.app`
2. User replies to the email
3. Resend receives the email at the configured subdomain
4. Resend sends webhook to our endpoint
5. Our webhook:
   - Extracts ticket ID from the to address
   - Verifies sender exists in database
   - Cleans email content (removes signatures, quotes)
   - Creates comment with source='EMAIL'
   - Updates ticket status if needed
   - Sends in-app notifications

### Security Features
- Basic email verification (sender must exist in database)
- Permission check (user must have access to ticket)
- Email content sanitization
- Rate limiting inherited from comment system

## Frontend Indicators

Comments from email replies show a special indicator:
- Badge with mail icon and "via email" text
- Different visual treatment to distinguish from web comments

## Troubleshooting

### Common Issues

1. **Webhook not receiving emails**:
   - Check DNS MX records are properly configured
   - Verify Resend webhook is active
   - Check webhook endpoint is accessible

2. **User not found errors**:
   - Ensure sender's email exists in database
   - Check email parsing is extracting address correctly

3. **Ticket not found**:
   - Verify ticket ID extraction from reply-to address
   - Check ticket exists and is not deleted

4. **Empty comments**:
   - Review email content extraction logic
   - Check if email client is sending plain text

### Debug Logging

The webhook logs detailed information:
```javascript
console.log('Received inbound email webhook:', {
  to: req.data.to,
  from: req.data.from,
  subject: req.data.subject,
  id: req.data.id
});
```

## Future Enhancements

- [ ] Webhook signature verification for security
- [ ] Handle email attachments
- [ ] Support for HTML email parsing
- [ ] Better signature and quote detection
- [ ] Email bounce handling
- [ ] Support for multiple reply-to formats
- [ ] Thread-based conversation view
- [ ] Auto-unsubscribe handling
- [ ] Email allowlist/blocklist
- [ ] Rich text formatting preservation

## API Reference

### Webhook Endpoint
```
POST /webhooks/email/inbound
```

Receives Resend webhook payload and processes email replies.

### Response
```json
{
  "success": true,
  "message": "Comment added successfully",
  "commentId": "comment-id-here"
}
```

### Error Responses
- `400 Bad Request` - Invalid ticket address or missing data
- `404 Not Found` - Sender or ticket not found
- `403 Forbidden` - User not authorized to comment
- `500 Internal Server Error` - Processing failure