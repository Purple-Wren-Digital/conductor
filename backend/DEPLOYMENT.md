# Encore Production Deployment Guide

## Pre-Deployment Checklist

### 1. Set Production Secrets
```bash
# Set all required secrets for production
encore secret set --prod RESEND_API_KEY
encore secret set --prod CLERK_SECRET_KEY
encore secret set --prod STRIPE_SECRET_KEY
encore secret set --prod STRIPE_WEBHOOK_SECRET
```

### 2. Database Setup
The database migrations are automatically handled by Encore on deployment:
- Initial migration (`20241121000000_initial`) will be applied
- Prisma client is generated during build via `postinstall` script

## Deployment Steps

### 1. Deploy to Production
```bash
# Deploy to production
encore deploy --prod

# Or if you have a staging environment
encore deploy --staging
```

### 2. After Deployment - Update External Services

#### Resend Webhook
1. Get your production URL from Encore:
   ```bash
   encore app info --prod
   ```
2. Go to https://resend.com/webhooks
3. Update webhook URL to: `https://your-app.encr.app/webhooks/email/inbound`

#### DNS Configuration (if not done)
Ensure your DNS records point to the correct servers:
- MX records for `reply.conductorticket.com` → Resend's mail servers
- Your main domain should point to Encore's servers

### 3. Seed Initial Data (Optional)
If you need initial data in production:
```bash
# Create a production seed endpoint or run manually
curl -X POST https://your-app.encr.app/seed \
  -H "Authorization: Bearer <admin-token>"
```

## Environment-Specific Configuration

### Production Database
Encore automatically manages:
- Database connection strings
- Connection pooling
- SSL certificates
- Automatic backups

### Prisma in Production
The `postinstall` script in package.json ensures Prisma client is generated:
```json
"postinstall": "npx prisma generate --schema=ticket/schema.prisma"
```

## Monitoring

### Check Application Health
```bash
# Check if the app is running
curl https://your-app.encr.app/health

# Check logs
encore logs --prod
```

### Check Email System
```bash
# Test webhook endpoint
curl -X POST https://your-app.encr.app/webhooks/email/inbound \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Rollback (if needed)
```bash
# List deployments
encore deploy list --prod

# Rollback to previous version
encore deploy rollback --prod <deployment-id>
```

## Common Issues

### Migrations Not Applied
- Encore automatically runs migrations on deploy
- Check logs: `encore logs --prod | grep migration`

### Emails Not Sending
1. Verify RESEND_API_KEY is set: `encore secret list --prod`
2. Check domain is verified in Resend
3. Check webhook URL is updated in Resend dashboard

### Database Connection Issues
- Encore manages database connections automatically
- If issues persist, check: `encore db conn-info --prod`

## Production URLs
After deployment, you'll have:
- API: `https://your-app.encr.app`
- Webhook: `https://your-app.encr.app/webhooks/email/inbound`
- Health: `https://your-app.encr.app/health`