-- Add name column to team_invitations table
ALTER TABLE "public"."team_invitations" ADD COLUMN IF NOT EXISTS "name" TEXT;