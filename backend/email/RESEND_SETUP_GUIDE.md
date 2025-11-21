# Resend Inbound Email Configuration Guide

## Prerequisites
✅ Resend API Key (already configured: `re_bzpwyB79_...`)
- Access to your domain's DNS settings
- Resend account with access to webhooks

## Step-by-Step Setup

### Step 1: Choose Your Reply Domain

You need to decide on a subdomain for receiving email replies. Common options:
- `reply.conductor.app`
- `inbound.conductor.app`
- `email.conductor.app`

**Important**: This should be a subdomain you're NOT using for anything else.

### Step 2: Configure DNS Records

Add these MX records to your domain's DNS (e.g., in Cloudflare, Route53, etc.):

#### For Resend (using AWS SES):
```
Type: MX
Name: reply (or your chosen subdomain)
Priority: 10
Value: inbound-smtp.us-east-1.amazonaws.com
```

**Note**: The exact MX record may vary based on your Resend region. Check your Resend dashboard for the correct values.

#### Alternative Resend MX Records (if above doesn't work):
```
reply.conductor.app    MX    10    feedback-smtp.us-east-1.amazonses.com
reply.conductor.app    MX    10    feedback-smtp.eu-west-1.amazonses.com
```

### Step 3: Set Up Resend Inbound Domain

1. **Log into Resend Dashboard**
   - Go to https://resend.com/domains

2. **Add Inbound Domain**
   - Click "Add Domain"
   - Enter: `reply.conductor.app` (or your chosen subdomain)
   - Select "Inbound" as the domain type

3. **Verify Domain**
   - Resend will provide verification records
   - Add these to your DNS:
     ```
     Type: TXT
     Name: _resend.reply
     Value: [verification-string-from-resend]
     ```

4. **Wait for Verification**
   - DNS propagation can take 5-30 minutes
   - Resend will show "Verified" when complete

### Step 4: Configure Webhook in Resend

1. **Navigate to Webhooks**
   - Go to https://resend.com/webhooks
   - Click "Create Webhook"

2. **Configure Webhook Settings**:
   ```
   Endpoint URL: https://your-backend-url.com/webhooks/email/inbound

   For local testing:
   - Use ngrok: ngrok http 4000
   - Then use: https://[your-ngrok-id].ngrok.io/webhooks/email/inbound
   ```

3. **Select Events**:
   - ✅ Check: `email.received`
   - Leave other events unchecked

4. **Save Webhook**
   - Copy the webhook signing secret (for future security implementation)
   - Save it to your .env file (optional, for future):
     ```
     RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxx
     ```

### Step 5: Update Environment Variables

Add these to your backend `.env` file:

```bash
# Existing (already configured)
RESEND_API_KEY="re_bzpwyB79_KSNesMsLbKDG9AkBmkZ7KECT"

# Add these new ones:
RESEND_INBOUND_DOMAIN=reply.conductor.app
RESEND_WEBHOOK_SECRET=whsec_xxxxx  # From Step 4 (optional for now)
```

### Step 6: Test Webhook Connectivity

1. **First, ensure your backend is running**:
   ```bash
   cd backend
   encore run
   ```

2. **Test the health endpoint**:
   ```bash
   curl http://localhost:4000/webhooks/email/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-11-07T..."
   }
   ```

3. **If using ngrok for testing**:
   ```bash
   # In a new terminal
   ngrok http 4000

   # Test via ngrok URL
   curl https://[your-ngrok-id].ngrok.io/webhooks/email/health
   ```

### Step 7: Test Email Reply Flow

1. **Use the test script** (with a real ticket ID from your database):
   ```bash
   cd backend/email

   # First, get a real ticket ID from your database
   # Then test with a user email that exists in your system
   npx tsx test-webhook.ts [real-ticket-id] [existing-user-email]

   # Example:
   npx tsx test-webhook.ts clm3n4x5w0000356kgc7f8d9p user@example.com
   ```

2. **Send a real test email** (after DNS propagation):
   - Create a ticket in your system
   - Note the ticket ID
   - Send an email to: `ticket-[ID]@reply.conductor.app`
   - Check if it appears as a comment

### Step 8: Monitor and Debug

Check Resend dashboard for:
- Webhook delivery status
- Failed webhook attempts
- Email logs

Check your backend logs for:
```bash
# In your Encore terminal, you should see:
"Received inbound email webhook:"
```

## Troubleshooting

### DNS Not Propagating
- Use DNS checker: https://dnschecker.org
- Check MX records: `dig MX reply.conductor.app`
- Wait up to 48 hours for full propagation

### Webhook Not Receiving
1. Verify endpoint is accessible:
   ```bash
   curl -X POST https://your-url/webhooks/email/inbound \
     -H "Content-Type: application/json" \
     -d '{"type":"email.received","data":{"to":["test@test.com"]}}'
   ```

2. Check Resend webhook logs for errors

3. Ensure no firewall/security rules blocking Resend IPs

### Email Not Creating Comments
1. Check ticket ID exists in database
2. Verify sender email exists in users table
3. Check backend logs for detailed error messages

## Security Considerations

For production, implement:
1. Webhook signature verification (using RESEND_WEBHOOK_SECRET)
2. Rate limiting per sender
3. Email allowlist for sensitive tickets
4. Spam detection

## Quick Checklist

- [ ] Subdomain chosen (e.g., reply.conductor.app)
- [ ] MX records added to DNS
- [ ] Domain verified in Resend
- [ ] Webhook configured in Resend
- [ ] Environment variables updated
- [ ] Health endpoint responding
- [ ] Test webhook working
- [ ] Real email test successful

## Next Steps

Once working:
1. Update notification emails to use the reply-to domain ✅ (already done)
2. Test with real users
3. Monitor for issues
4. Implement webhook signature verification
5. Add email attachment support (future enhancement)