-- Add template customization tables for market center specific email and in-app notification templates
-- These allow MC admins to customize notification content while maintaining system defaults

-- =============================================================================
-- EMAIL TEMPLATE CUSTOMIZATIONS
-- =============================================================================
-- Stores market center specific email template overrides
-- Uses structured sections (not raw HTML) for non-technical admin editing

CREATE TABLE IF NOT EXISTS "public"."email_template_customizations" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,  -- e.g., 'TICKET_CREATED', 'TICKET_ASSIGNED', etc.

    -- Customizable content sections
    "subject" TEXT NOT NULL,              -- Email subject line (supports {{variables}})
    "greeting" TEXT NOT NULL,             -- e.g., "Hi {{user_name}},"
    "main_message" TEXT NOT NULL,         -- Rich text content (stored as HTML)
    "button_text" TEXT,                   -- CTA button text, NULL = hide button
    "visible_fields" JSONB NOT NULL DEFAULT '[]',  -- Array of field names to show in details section

    -- Metadata
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "email_template_customizations_pkey" PRIMARY KEY ("id"),
    -- Each MC can only have one customization per template type
    CONSTRAINT "email_template_customizations_mc_type_unique" UNIQUE ("market_center_id", "template_type")
);

-- Indexes for email template customizations
CREATE INDEX IF NOT EXISTS "email_template_customizations_mc_idx"
    ON "public"."email_template_customizations" ("market_center_id");

CREATE INDEX IF NOT EXISTS "email_template_customizations_type_idx"
    ON "public"."email_template_customizations" ("template_type");

CREATE INDEX IF NOT EXISTS "email_template_customizations_active_idx"
    ON "public"."email_template_customizations" ("is_active");

-- Foreign keys for email template customizations
DO $$ BEGIN
    ALTER TABLE "public"."email_template_customizations"
        ADD CONSTRAINT "email_template_customizations_mc_fkey"
        FOREIGN KEY ("market_center_id")
        REFERENCES "public"."market_centers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."email_template_customizations"
        ADD CONSTRAINT "email_template_customizations_created_by_fkey"
        FOREIGN KEY ("created_by_id")
        REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."email_template_customizations"
        ADD CONSTRAINT "email_template_customizations_updated_by_fkey"
        FOREIGN KEY ("updated_by_id")
        REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =============================================================================
-- IN-APP TEMPLATE CUSTOMIZATIONS
-- =============================================================================
-- Stores market center specific in-app notification template overrides
-- Simpler structure: just title and body with variable support

CREATE TABLE IF NOT EXISTS "public"."in_app_template_customizations" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "market_center_id" TEXT NOT NULL,
    "template_type" TEXT NOT NULL,  -- e.g., 'TICKET_CREATED', 'TICKET_ASSIGNED', etc.

    -- Customizable content (both support {{variables}})
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    -- Metadata
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "in_app_template_customizations_pkey" PRIMARY KEY ("id"),
    -- Each MC can only have one customization per template type
    CONSTRAINT "in_app_template_customizations_mc_type_unique" UNIQUE ("market_center_id", "template_type")
);

-- Indexes for in-app template customizations
CREATE INDEX IF NOT EXISTS "in_app_template_customizations_mc_idx"
    ON "public"."in_app_template_customizations" ("market_center_id");

CREATE INDEX IF NOT EXISTS "in_app_template_customizations_type_idx"
    ON "public"."in_app_template_customizations" ("template_type");

CREATE INDEX IF NOT EXISTS "in_app_template_customizations_active_idx"
    ON "public"."in_app_template_customizations" ("is_active");

-- Foreign keys for in-app template customizations
DO $$ BEGIN
    ALTER TABLE "public"."in_app_template_customizations"
        ADD CONSTRAINT "in_app_template_customizations_mc_fkey"
        FOREIGN KEY ("market_center_id")
        REFERENCES "public"."market_centers"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."in_app_template_customizations"
        ADD CONSTRAINT "in_app_template_customizations_created_by_fkey"
        FOREIGN KEY ("created_by_id")
        REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "public"."in_app_template_customizations"
        ADD CONSTRAINT "in_app_template_customizations_updated_by_fkey"
        FOREIGN KEY ("updated_by_id")
        REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
