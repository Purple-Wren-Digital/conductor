-- Add is_active column to ticket_categories table
ALTER TABLE "public"."ticket_categories" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
