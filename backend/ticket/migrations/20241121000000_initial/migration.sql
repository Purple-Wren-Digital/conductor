-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum (with IF NOT EXISTS handling)
DO $$ BEGIN
    CREATE TYPE "public"."NotificationCategory" AS ENUM ('ACCOUNT', 'ACTIVITY', 'MARKETING', 'PRODUCT', 'PERMISSIONS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."NotificationFrequency" AS ENUM ('NONE', 'INSTANT', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."UserRole" AS ENUM ('AGENT', 'STAFF', 'STAFF_LEADER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."TicketStatus" AS ENUM ('ASSIGNED', 'AWAITING_RESPONSE', 'IN_PROGRESS', 'RESOLVED', 'DRAFT', 'CREATED', 'UNASSIGNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."Urgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."CommentSource" AS ENUM ('WEB', 'EMAIL', 'API');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."market_centers" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'AGENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "market_center_id" TEXT,
    "clerk_id" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."tickets" (
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
    "published_at" TIMESTAMP(3),
    "category_id" TEXT,
    "email_message_id" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."comments" (
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
CREATE TABLE IF NOT EXISTS "public"."attachments" (
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
CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
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
CREATE TABLE IF NOT EXISTS "public"."team_invitations" (
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
CREATE TABLE IF NOT EXISTS "public"."ticket_history" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "ticket_id" TEXT NOT NULL,
    "field" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "snapshot" JSONB,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."user_history" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT,
    "field" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "snapshot" JSONB,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "user_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."market_center_history" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT NOT NULL,
    "field" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "snapshot" JSONB,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_id" TEXT,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',

    CONSTRAINT "market_center_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "type" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "user_settings_id" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL DEFAULT 'ACCOUNT',
    "frequency" "public"."NotificationFrequency" NOT NULL,
    "sms" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "user_id" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "priority" "public"."Urgency",
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "template_name" TEXT NOT NULL,
    "template_description" TEXT NOT NULL,
    "category" "public"."NotificationCategory" NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variables" JSONB,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_auth0Id_key" ON "public"."users"("clerk_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_market_center_id_idx" ON "public"."users"("market_center_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_creator_id_idx" ON "public"."tickets"("creator_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_assignee_id_idx" ON "public"."tickets"("assignee_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_category_id_idx" ON "public"."tickets"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "public"."tickets"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_urgency_idx" ON "public"."tickets"("urgency");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "public"."tickets"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "comments_ticket_id_idx" ON "public"."comments"("ticket_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "public"."comments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "attachments_bucket_key_key" ON "public"."attachments"("bucket_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attachments_ticket_id_idx" ON "public"."attachments"("ticket_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attachments_uploaded_by_idx" ON "public"."attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ticket_categories_market_center_id_idx" ON "public"."ticket_categories"("market_center_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_categories_market_center_id_name_key" ON "public"."ticket_categories"("market_center_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_invitations_token_key" ON "public"."team_invitations"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_invitations_token_idx" ON "public"."team_invitations"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_invitations_expires_at_idx" ON "public"."team_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_invitations_market_center_id_email_key" ON "public"."team_invitations"("market_center_id", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ticket_history_ticket_id_idx" ON "public"."ticket_history"("ticket_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ticket_history_changed_by_id_idx" ON "public"."ticket_history"("changed_by_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_history_user_id_idx" ON "public"."user_history"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_history_changed_by_id_idx" ON "public"."user_history"("changed_by_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "market_center_history_changed_by_id_idx" ON "public"."market_center_history"("changed_by_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "market_center_history_market_center_id_idx" ON "public"."market_center_history"("market_center_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_id_key" ON "public"."user_settings"("id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key" ON "public"."user_settings"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx" ON "public"."user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_id_key" ON "public"."notification_preferences"("id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_preferences_user_settings_id_idx" ON "public"."notification_preferences"("user_settings_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_template_name_key" ON "public"."notification_templates"("template_name");

-- AddForeignKey (with IF NOT EXISTS handling)
DO $$ BEGIN
    ALTER TABLE "public"."users" ADD CONSTRAINT "users_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_categories" ADD CONSTRAINT "ticket_categories_default_assignee_id_fkey" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_categories" ADD CONSTRAINT "ticket_categories_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."team_invitations" ADD CONSTRAINT "team_invitations_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_history" ADD CONSTRAINT "ticket_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."user_history" ADD CONSTRAINT "user_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."user_history" ADD CONSTRAINT "user_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."market_center_history" ADD CONSTRAINT "market_center_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."market_center_history" ADD CONSTRAINT "market_center_history_market_center_id_fkey" FOREIGN KEY ("market_center_id") REFERENCES "public"."market_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_settings_id_fkey" FOREIGN KEY ("user_settings_id") REFERENCES "public"."user_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;