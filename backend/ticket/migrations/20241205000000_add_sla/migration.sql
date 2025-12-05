-- SLA Policies Table
CREATE TABLE IF NOT EXISTS "public"."sla_policies" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "urgency" "public"."Urgency" NOT NULL UNIQUE,
    "response_time_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- Add SLA tracking fields to tickets
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_response_due_at" TIMESTAMP(3);
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "first_response_at" TIMESTAMP(3);
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_breached" BOOLEAN DEFAULT false;
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_warning_50_sent" BOOLEAN DEFAULT false;
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_warning_75_sent" BOOLEAN DEFAULT false;
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_policy_id" TEXT;

-- Add foreign key for SLA policy
DO $$ BEGIN
    ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_sla_policy_id_fkey"
    FOREIGN KEY ("sla_policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index for SLA queries
CREATE INDEX IF NOT EXISTS "tickets_sla_response_due_at_idx" ON "public"."tickets"("sla_response_due_at");
CREATE INDEX IF NOT EXISTS "tickets_sla_breached_idx" ON "public"."tickets"("sla_breached");
CREATE INDEX IF NOT EXISTS "sla_policies_urgency_idx" ON "public"."sla_policies"("urgency");

-- Insert default SLA policies
INSERT INTO "public"."sla_policies" ("urgency", "response_time_minutes")
VALUES
    ('HIGH', 120),      -- 2 hours
    ('MEDIUM', 1440),   -- 24 hours
    ('LOW', 4320)       -- 72 hours
ON CONFLICT ("urgency") DO NOTHING;

-- SLA Events Log for tracking warnings and breaches
CREATE TABLE IF NOT EXISTS "public"."sla_events" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,  -- 'WARNING_50', 'WARNING_75', 'BREACHED', 'MET'
    "notification_sent" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_events_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "public"."sla_events" ADD CONSTRAINT "sla_events_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "sla_events_ticket_id_idx" ON "public"."sla_events"("ticket_id");
CREATE INDEX IF NOT EXISTS "sla_events_event_type_idx" ON "public"."sla_events"("event_type");
CREATE INDEX IF NOT EXISTS "sla_events_created_at_idx" ON "public"."sla_events"("created_at");
