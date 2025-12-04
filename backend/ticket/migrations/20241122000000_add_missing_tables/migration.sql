-- Add missing tables: todos, surveys (ticket_ratings), subscriptions

-- CreateEnum for Subscription types (if not exists)
DO $$ BEGIN
    CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAST_DUE', 'PAUSED', 'TRIALING', 'UNPAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."SubscriptionPlan" AS ENUM ('STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'UNCOLLECTIBLE', 'VOID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: todos
CREATE TABLE IF NOT EXISTS "public"."todos" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "title" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "ticket_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_by" JSONB NOT NULL DEFAULT '{}',
    "updated_by" JSONB,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket_ratings (surveys)
CREATE TABLE IF NOT EXISTS "public"."ticket_ratings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "surveyor_id" TEXT NOT NULL,
    "assigneeRating" DECIMAL(3,2),
    "marketCenterRating" DECIMAL(3,2),
    "overallRating" DECIMAL(3,2),
    "assignee_id" TEXT,
    "market_center_id" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ticket_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: subscriptions
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "market_center_id" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "planType" "public"."SubscriptionPlan" NOT NULL,
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

-- CreateTable: subscription_usage
CREATE TABLE IF NOT EXISTS "public"."subscription_usage" (
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

-- CreateTable: subscription_invoices
CREATE TABLE IF NOT EXISTS "public"."subscription_invoices" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "subscription_id" TEXT NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "public"."InvoiceStatus" NOT NULL,
    "line_items" JSONB NOT NULL DEFAULT '[]',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

-- Add survey_id column to tickets if not exists
DO $$ BEGIN
    ALTER TABLE "public"."tickets" ADD COLUMN "survey_id" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateIndexes for todos
CREATE INDEX IF NOT EXISTS "todos_ticket_id_idx" ON "public"."todos"("ticket_id");
CREATE INDEX IF NOT EXISTS "todos_complete_idx" ON "public"."todos"("complete");
CREATE INDEX IF NOT EXISTS "todos_created_by_user_id_idx" ON "public"."todos"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "todos_updated_by_user_id_idx" ON "public"."todos"("updated_by_user_id");

-- CreateIndexes for ticket_ratings
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_ratings_id_key" ON "public"."ticket_ratings"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_ratings_ticket_id_key" ON "public"."ticket_ratings"("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_ratings_surveyor_id_idx" ON "public"."ticket_ratings"("surveyor_id");
CREATE INDEX IF NOT EXISTS "ticket_ratings_assignee_id_idx" ON "public"."ticket_ratings"("assignee_id");
CREATE INDEX IF NOT EXISTS "ticket_ratings_market_center_id_idx" ON "public"."ticket_ratings"("market_center_id");

-- CreateIndexes for subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripe_subscription_id_key" ON "public"."subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_market_center_id_key" ON "public"."subscriptions"("market_center_id");
CREATE INDEX IF NOT EXISTS "subscriptions_market_center_id_idx" ON "public"."subscriptions"("market_center_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "public"."subscriptions"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "public"."subscriptions"("status");

-- CreateIndexes for subscription_usage
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_usage_subscription_id_month_key" ON "public"."subscription_usage"("subscription_id", "month");
CREATE INDEX IF NOT EXISTS "subscription_usage_subscription_id_idx" ON "public"."subscription_usage"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_usage_month_idx" ON "public"."subscription_usage"("month");

-- CreateIndexes for subscription_invoices
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_invoices_stripe_invoice_id_key" ON "public"."subscription_invoices"("stripe_invoice_id");
CREATE INDEX IF NOT EXISTS "subscription_invoices_subscription_id_idx" ON "public"."subscription_invoices"("subscription_id");
CREATE INDEX IF NOT EXISTS "subscription_invoices_status_idx" ON "public"."subscription_invoices"("status");

-- CreateIndex for tickets survey_id
CREATE INDEX IF NOT EXISTS "tickets_survey_id_idx" ON "public"."tickets"("survey_id");

-- AddForeignKeys for todos
DO $$ BEGIN
    ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKeys for ticket_ratings
DO $$ BEGIN
    ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_surveyor_id_fkey" FOREIGN KEY ("surveyor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_ratings" ADD CONSTRAINT "ticket_ratings_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKeys for subscriptions
DO $$ BEGIN
    ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKeys for subscription_usage
DO $$ BEGIN
    ALTER TABLE "public"."subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKeys for subscription_invoices
DO $$ BEGIN
    ALTER TABLE "public"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
