-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "market_centers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "market_center_id" TEXT NOT NULL,
    "default_assignee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "market_center_id" TEXT NOT NULL,
    "invited_by" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "market_center_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD COLUMN "market_center_id" TEXT;

-- CreateIndex
CREATE INDEX "users_market_center_id_idx" ON "users"("market_center_id");

-- CreateIndex
CREATE INDEX "ticket_categories_market_center_id_idx" ON "ticket_categories"("market_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_market_center_id_name_key" ON "ticket_categories"("market_center_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_market_center_id_email_key" ON "team_invitations"("market_center_id", "email");

-- CreateIndex
CREATE INDEX "team_invitations_token_idx" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_expires_at_idx" ON "team_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "settings_audit_logs_market_center_id_idx" ON "settings_audit_logs"("market_center_id");

-- CreateIndex
CREATE INDEX "settings_audit_logs_created_at_idx" ON "settings_audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings_audit_logs" ADD CONSTRAINT "settings_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;