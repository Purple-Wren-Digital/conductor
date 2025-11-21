# Email Notification Setup Guide

## Current Status

Email notifications are **fully implemented** in the codebase with the following features:

### ✅ What's Working

1. **Email Templates** - All React Email templates are created:
   - Ticket creation notifications
   - Ticket assignment notifications
   - Comment notifications
   - Ticket updates
   - User invitations
   - Market center updates

2. **Email Triggers** - Frontend sends notifications for:
   - Ticket creation (creator & assignee)
   - New comments (all participants)
   - Ticket assignment changes
   - Ticket updates (status, urgency, etc.)

3. **Email Service** - Resend integration complete:
   - API key configured in Encore secrets
   - Email sending logic implemented
   - React templates render to HTML

4. **Email Reply Handling** - Webhook for email replies:
   - Converts email replies to comments
   - Updates ticket status if needed
   - Validates user permissions

### 🔧 Fixed Issues

1. **Hardcoded Test Email** - FIXED
   - Changed from `delivered@resend.dev` to `user.email` in `/backend/notifications/create.ts`

## Production Configuration Required

### 1. Email Domain Setup

**Current Configuration:**
- From: `noreply@conductorticket.com`
- Reply-to: `ticket-{id}@reply.conductorticket.com`

**Required DNS Configuration:**

For sending emails (conductorticket.com):
```
# SPF Record
TXT @ "v=spf1 include:amazonses.com ~all"

# DKIM Records (from Resend dashboard)
TXT resend._domainkey "p=MIGfMA0GCSq..."

# DMARC Record
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@conductorticket.com"
```

For receiving replies (reply.conductorticket.com):
```
# MX Records
MX 10 feedback-smtp.us-east-1.amazonses.com
MX 20 feedback-smtp-backup.us-east-1.amazonses.com
```

### 2. Resend Dashboard Configuration

1. **Add and verify domain**: conductorticket.com
2. **Configure inbound domain**: reply.conductorticket.com
3. **Set up webhook**:
   - URL: `https://your-api.com/webhooks/email/inbound`
   - Events: `email.received`
4. **Get webhook signing secret** and add to Encore:
   ```bash
   encore secret set --prod RESEND_WEBHOOK_SECRET <secret>
   ```

### 3. Environment Variables

Update these for production:

```bash
# Already set
encore secret set --prod RESEND_API_KEY <your-production-key>

# Need to add
encore secret set --prod APP_BASE_URL https://conductor.app
encore secret set --prod RESEND_INBOUND_DOMAIN reply.conductorticket.com
```

### 4. Update Email Addresses

In `/backend/notifications/channels/email/email.ts`:
- Change from address if needed (currently `noreply@conductorticket.com`)
- Update reply domain if different

In email templates, update any hardcoded URLs to production domain.

## Testing Email Notifications

### Local Development Testing

1. **Create a test ticket**:
   - Should send email to creator
   - Should send email to assignee (if assigned)

2. **Add a comment**:
   - Should notify all participants

3. **Change assignee**:
   - Should notify new assignee (added)
   - Should notify old assignee (removed)

4. **Update ticket**:
   - Should notify relevant users

### Production Testing Checklist

- [ ] Verify Resend API key is set for production
- [ ] Confirm DNS records are propagated
- [ ] Test email delivery to real addresses
- [ ] Test email reply-to-comment conversion
- [ ] Monitor Resend dashboard for delivery status
- [ ] Check notification preferences are respected

## Email Reply Feature

When users reply to notification emails:

1. Email sent to `ticket-{id}@reply.conductorticket.com`
2. Resend forwards to webhook endpoint
3. Backend extracts ticket ID from address
4. Creates comment with `source: 'EMAIL'`
5. Updates ticket status if needed
6. Sends in-app notifications

**Note**: Email signatures and quoted text are automatically removed.

## Monitoring

Check email delivery status:
- Resend Dashboard: https://resend.com/emails
- Webhook logs: Check Encore logs for `/webhooks/email/inbound`
- Failed sends: Monitor `console.error` in notification service

## Troubleshooting

**Emails not sending:**
1. Check Resend API key is valid
2. Verify user has email address
3. Check notification preferences
4. Look for errors in Encore logs

**Replies not creating comments:**
1. Verify webhook URL is accessible
2. Check MX records for reply domain
3. Verify user has permission to comment
4. Check webhook endpoint health: `GET /webhooks/email/health`

## Important Notes

- Victoria mentioned: "we do locally in development with the resend dev email. for production, we need to replace the dev emails with the conductor email/recipients"
- The hardcoded test email has been fixed - emails now go to actual user addresses
- All notification types are implemented and triggered from the frontend
- Email templates use React Email components for consistent styling