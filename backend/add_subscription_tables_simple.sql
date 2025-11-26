-- Check and create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'PAUSED', 'TRIALING', 'UNPAID');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionPlan') THEN
        CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
        CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
    END IF;
END$$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "market_center_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "planType" "SubscriptionPlan" NOT NULL,
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

-- Create indexes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscriptions_stripe_subscription_id_key') THEN
        CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscriptions_market_center_id_key') THEN
        CREATE UNIQUE INDEX "subscriptions_market_center_id_key" ON "subscriptions"("market_center_id");
    END IF;
END$$;

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

-- Create subscription_invoices table
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "subscription_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "InvoiceStatus" NOT NULL,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_market_center_id_fkey') THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_market_center_id_fkey"
            FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_usage_subscription_id_fkey') THEN
        ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey"
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_invoices_subscription_id_fkey') THEN
        ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey"
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;

-- Verify tables were created
SELECT 'subscriptions' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'subscriptions'
UNION ALL
SELECT 'subscription_usage', COUNT(*) FROM information_schema.tables WHERE table_name = 'subscription_usage'
UNION ALL
SELECT 'subscription_invoices', COUNT(*) FROM information_schema.tables WHERE table_name = 'subscription_invoices';