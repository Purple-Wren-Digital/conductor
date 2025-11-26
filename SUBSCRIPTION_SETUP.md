# Subscription Setup Guide

## Overview

This guide will help you set up the subscription system for Conductor. The system uses Stripe for payment processing and implements a seat-based pricing model at the Market Center (organization) level.

## Architecture

- **Subscriptions are per Market Center**: Each Market Center has its own subscription
- **Seat-based pricing**: Plans include a base number of seats with the option to purchase additional seats
- **Three tiers**: Starter (5 seats), Team (15 seats), Business (50 seats), plus Enterprise
- **14-day free trial**: All new subscriptions start with a trial period
- **Immediate enforcement**: Features are restricted as soon as subscription expires

## Setup Steps

### 1. Stripe Configuration

#### Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Note your **Test Mode** API keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)

#### Create Products and Prices
You need to create products in Stripe that match the plans in `frontend/lib/plans.ts`:

1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Create three products:

**Starter Plan**:
- Name: Starter
- Price: $50/month
- Price ID: `price_starter` (or note the generated ID)

**Team Plan**:
- Name: Team
- Price: $150/month
- Price ID: `price_team` (or note the generated ID)

**Business Plan**:
- Name: Business
- Price: $400/month
- Price ID: `price_business` (or note the generated ID)

3. Update `frontend/lib/plans.ts` with your actual Stripe Product IDs and Price IDs
4. Update `backend/subscription/subscription.ts` PRICING_PLANS with your Price IDs

#### Configure Customer Portal
1. Go to [Customer Portal Settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. Enable the portal
3. Configure allowed actions:
   - ✅ Update payment methods
   - ✅ Cancel subscriptions
   - ✅ Update quantities (for seat management)
   - ✅ View invoices

### 2. Environment Variables

#### Backend (Encore Secrets)

Set these secrets using the Encore CLI:

```bash
# Development
encore secret set --dev StripeSecretKey
# Enter: sk_test_YOUR_STRIPE_SECRET_KEY

encore secret set --dev StripeWebhookSigningSecret
# Enter: whsec_YOUR_WEBHOOK_SECRET (see webhook setup below)

# Production (when ready)
encore secret set --prod StripeSecretKey
encore secret set --prod StripeWebhookSigningSecret
```

#### Frontend (.env.local)

Add to your `frontend/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
```

### 3. Webhook Configuration

#### Local Development

1. Install Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to your local backend:
```bash
stripe listen --forward-to localhost:4000/stripe/webhook
```

4. Copy the webhook signing secret shown and set it:
```bash
encore secret set --dev StripeWebhookSigningSecret
# Enter: whsec_... (from the stripe listen output)
```

#### Production

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your production URL: `https://YOUR_BACKEND_DOMAIN/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the signing secret and set it in production:
```bash
encore secret set --prod StripeWebhookSigningSecret
```

### 4. Database Migration

The subscription tables have already been added to the Prisma schema. To apply them:

```bash
cd backend
npm run reset  # For development (will reset database)

# OR for production (preserves data):
cd backend/ticket
npx prisma migrate deploy
```

### 5. Update Stripe Price IDs

Update the price IDs in two places with your actual Stripe values:

1. **Frontend** (`frontend/lib/plans.ts`):
```typescript
stripePriceId: "price_YOUR_ACTUAL_STRIPE_PRICE_ID"
```

2. **Backend** (`backend/subscription/subscription.ts`):
```typescript
PRICING_PLANS = {
  STARTER: {
    priceId: "price_YOUR_ACTUAL_STRIPE_PRICE_ID",
    ...
  }
}
```

## Testing the Integration

### 1. Start Services

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Stripe webhooks (local only)
stripe listen --forward-to localhost:4000/stripe/webhook

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### 2. Test Subscription Flow

1. **Sign up/in** to create a user account
2. **Join/Create a Market Center** (organization)
3. **Navigate** to `/dashboard/subscription`
4. **Select a plan** and click "Start 14-Day Free Trial"
5. **Use test card**: 4242 4242 4242 4242 (any future date, any CVC)
6. **Complete checkout**
7. **Verify** subscription is active on the subscription page

### 3. Test Feature Limits

Try these actions to verify limits are enforced:

- **Create tickets**: Should be limited based on plan
- **Add users**: Should be limited by seat count
- **Add categories**: Should be limited based on plan

### 4. Test Subscription Management

1. Click "Manage Subscription" to open Stripe Customer Portal
2. Try updating payment method
3. Try adding/removing seats
4. Try canceling subscription

## Subscription Features by Plan

| Feature | Starter | Team | Business | Enterprise |
|---------|---------|------|----------|------------|
| Included Seats | 5 | 15 | 50 | Custom |
| Additional Seat Price | $10 | $8 | $6 | Custom |
| Tickets/Month | 100 | 500 | Unlimited | Unlimited |
| Custom Categories | 5 | 20 | Unlimited | Unlimited |
| Priority Support | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| Advanced Reporting | ❌ | ❌ | ✅ | ✅ |

## API Endpoints

### Subscription Management
- `POST /subscription/checkout` - Create Stripe checkout session
- `POST /subscription/portal` - Open Stripe customer portal
- `GET /subscription/current` - Get current subscription details
- `PUT /subscription/seats` - Update additional seats

### Webhook
- `POST /stripe/webhook` - Stripe webhook handler (auto-updates subscription status)

## Troubleshooting

### Common Issues

**"No subscription found"**
- Ensure the user's Market Center has a subscription
- Check that webhook events are being received

**"User limit reached"**
- Purchase additional seats through the customer portal
- Or upgrade to a plan with more included seats

**Webhook not working**
- Verify webhook signing secret is correct
- Check Encore logs for webhook errors
- Ensure webhook endpoint is publicly accessible (production)

**Price mismatch**
- Ensure Price IDs match between Stripe and your code
- Update both frontend and backend configurations

## Security Considerations

1. **Never expose** Stripe Secret Key or Webhook Signing Secret
2. **Always verify** webhook signatures
3. **Validate permissions** - only Market Center admins can manage subscriptions
4. **Use test mode** for development, live mode for production
5. **Monitor failed payments** and handle grace periods appropriately

## Next Steps

1. Customize the plans and pricing for your needs
2. Add usage-based billing if needed (storage, API calls, etc.)
3. Implement subscription analytics and reporting
4. Set up email notifications for subscription events
5. Add more granular feature flags based on plans