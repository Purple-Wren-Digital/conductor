-- Add Resolution SLA support

-- Add resolution_time_minutes column to sla_policies (separate from response_time_minutes)
ALTER TABLE "public"."sla_policies" ADD COLUMN IF NOT EXISTS "resolution_time_minutes" INTEGER;

-- Initialize resolution_time_minutes to same values as response_time_minutes
UPDATE "public"."sla_policies" SET resolution_time_minutes = response_time_minutes WHERE resolution_time_minutes IS NULL;

-- Make column NOT NULL after setting default values
ALTER TABLE "public"."sla_policies" ALTER COLUMN "resolution_time_minutes" SET NOT NULL;

-- Add Resolution SLA tracking fields to tickets
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_resolution_due_at" TIMESTAMP(3);
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_resolution_breached" BOOLEAN DEFAULT false;
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_resolution_warning_50_sent" BOOLEAN DEFAULT false;
ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "sla_resolution_warning_75_sent" BOOLEAN DEFAULT false;

-- Add indexes for Resolution SLA queries
CREATE INDEX IF NOT EXISTS "tickets_sla_resolution_due_at_idx" ON "public"."tickets"("sla_resolution_due_at");
CREATE INDEX IF NOT EXISTS "tickets_sla_resolution_breached_idx" ON "public"."tickets"("sla_resolution_breached");
CREATE INDEX IF NOT EXISTS "tickets_resolved_at_idx" ON "public"."tickets"("resolved_at");

-- Add new event types for resolution SLA (using sla_events table which stores event_type as TEXT)
-- Event types for resolution: 'RESOLUTION_WARNING_50', 'RESOLUTION_WARNING_75', 'RESOLUTION_BREACHED', 'RESOLUTION_MET'
