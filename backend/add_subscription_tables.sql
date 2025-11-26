-- Create enum types for subscriptions
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'PAUSED', 'TRIALING', 'UNPAID');
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "market_center_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "plan_type" "SubscriptionPlan" NOT NULL,
    "price_id" TEXT NOT NULL,
    "included_seats" INTEGER NOT NULL DEFAULT 5,
    "additional_seats" INTEGER NOT NULL DEFAULT 0,
    "seat_price" DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "features" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_market_center_id_key" ON "subscriptions"("market_center_id");

-- Create regular indexes
CREATE INDEX IF NOT EXISTS "subscriptions_market_center_id_idx" ON "subscriptions"("market_center_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- Create subscription_usage table
CREATE TABLE IF NOT EXISTS "subscription_usage" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "subscription_id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "active_seats" INTEGER NOT NULL,
    "tickets_created" INTEGER NOT NULL DEFAULT 0,
    "storage_used_mb" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

-- Create unique and regular indexes for subscription_usage
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_usage_subscription_id_month_key" ON "subscription_usage"("subscription_id", "month");
CREATE INDEX IF NOT EXISTS "subscription_usage_subscription_id_idx" ON "subscription_usage"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_usage_month_idx" ON "subscription_usage"("month");

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "subscription_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- Create unique index for subscription_invoices
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_invoices_stripe_invoice_id_key" ON "subscription_invoices"("stripe_invoice_id");

-- Add foreign key constraints
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_market_center_id_fkey"
    FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;