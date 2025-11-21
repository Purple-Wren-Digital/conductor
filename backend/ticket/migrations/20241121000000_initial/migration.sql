-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('ACCOUNT', 'ACTIVITY', 'MARKETING', 'PRODUCT', 'PERMISSIONS');

-- CreateEnum
CREATE TYPE "public"."NotificationFrequency" AS ENUM ('NONE', 'INSTANT', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP', 'SMS');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('AGENT', 'STAFF', 'STAFF_LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('ASSIGNED', 'AWAITING_RESPONSE', 'IN_PROGRESS', 'RESOLVED', 'DRAFT', 'CREATED', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "public"."Urgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CommentSource" AS ENUM ('WEB', 'EMAIL', 'API');

-- CreateTable
CREATE TABLE "public"."market_centers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'AGENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "market_center_id" TEXT,
    "clerk_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "title" TEXT,
    "description" TEXT,
    "status" "public"."TicketStatus" DEFAULT 'CREATED',
    "urgency" "public"."Urgency" DEFAULT 'MEDIUM',
    "creator_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "due_date" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "category_id" TEXT,
    "email_message_id" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "content" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "source" "public"."CommentSource" NOT NULL DEFAULT 'WEB',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "bucket_key" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_categories" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "market_center_id" TEXT NOT NULL,
    "default_assignee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."team_invitations" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'AGENT',
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "market_center_id" TEXT,
    "invited_by" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketCenterHistory" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "snapshot" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "MarketCenterHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSettings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreferences" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "userSettingsId" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL DEFAULT 'ACCOUNT',
    "frequency" "public"."NotificationFrequency" NOT NULL,
    "sms" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "priority" "public"."Urgency",
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationTemplate" (
    "id" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateDescription" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variables" JSONB,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0Id_key" ON "public"."users"("clerk_id");

-- CreateIndex
CREATE INDEX "users_market_center_id_idx" ON "public"."users"("market_center_id");

-- CreateIndex
CREATE INDEX "tickets_creator_id_idx" ON "public"."tickets"("creator_id");

-- CreateIndex
CREATE INDEX "tickets_assignee_id_idx" ON "public"."tickets"("assignee_id");

-- CreateIndex
CREATE INDEX "tickets_category_id_idx" ON "public"."tickets"("category_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "public"."tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_urgency_idx" ON "public"."tickets"("urgency");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "public"."tickets"("created_at");

-- CreateIndex
CREATE INDEX "comments_ticket_id_idx" ON "public"."comments"("ticket_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "public"."comments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_bucket_key_key" ON "public"."attachments"("bucket_key");

-- CreateIndex
CREATE INDEX "attachments_ticket_id_idx" ON "public"."attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_idx" ON "public"."attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "ticket_categories_market_center_id_idx" ON "public"."ticket_categories"("market_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_market_center_id_name_key" ON "public"."ticket_categories"("market_center_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "public"."team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_token_idx" ON "public"."team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_expires_at_idx" ON "public"."team_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_market_center_id_email_key" ON "public"."team_invitations"("market_center_id", "email");

-- CreateIndex
CREATE INDEX "TicketHistory_ticket_id_idx" ON "public"."TicketHistory"("ticket_id");

-- CreateIndex
CREATE INDEX "TicketHistory_changed_by_id_idx" ON "public"."TicketHistory"("changed_by_id");

-- CreateIndex
CREATE INDEX "UserHistory_userId_idx" ON "public"."UserHistory"("userId");

-- CreateIndex
CREATE INDEX "UserHistory_changed_by_id_idx" ON "public"."UserHistory"("changed_by_id");

-- CreateIndex
CREATE INDEX "MarketCenterHistory_changed_by_id_idx" ON "public"."MarketCenterHistory"("changed_by_id");

-- CreateIndex
CREATE INDEX "MarketCenterHistory_market_center_id_idx" ON "public"."MarketCenterHistory"("market_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_id_key" ON "public"."UserSettings"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE INDEX "UserSettings_userId_idx" ON "public"."UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_id_key" ON "public"."NotificationPreferences"("id");

-- CreateIndex
CREATE INDEX "NotificationPreferences_userSettingsId_idx" ON "public"."NotificationPreferences"("userSettingsId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_templateName_key" ON "public"."NotificationTemplate"("templateName");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_categories" ADD CONSTRAINT "ticket_categories_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_categories" ADD CONSTRAINT "ticket_categories_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_invitations" ADD CONSTRAINT "team_invitations_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketHistory" ADD CONSTRAINT "TicketHistory_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserHistory" ADD CONSTRAINT "UserHistory_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserHistory" ADD CONSTRAINT "UserHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketCenterHistory" ADD CONSTRAINT "MarketCenterHistory_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketCenterHistory" ADD CONSTRAINT "MarketCenterHistory_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userSettingsId_fkey" FOREIGN KEY ("userSettingsId") REFERENCES "public"."UserSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

