-- Drop foreign key constraints first (if they exist)
ALTER TABLE notification_templates
    DROP CONSTRAINT IF EXISTS notification_templates_market_center_fk;

ALTER TABLE market_centers
    DROP CONSTRAINT IF EXISTS market_centers_default_template_fk;

-- Drop indexes (if they exist)
DROP INDEX IF EXISTS notification_templates_is_active_idx;
DROP INDEX IF EXISTS notification_templates_market_center_id_idx;
DROP INDEX IF EXISTS notification_templates_template_name_key;

-- Drop columns (if they exist)
ALTER TABLE notification_templates
    DROP COLUMN IF EXISTS is_active,
    DROP COLUMN IF EXISTS market_center_id,
    DROP COLUMN IF EXISTS market_center_name;

ALTER TABLE market_centers
    DROP COLUMN IF EXISTS default_template_id;

-- Drop junction table if exists
DROP TABLE IF EXISTS market_center_default_templates;

-- Add them back
ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS market_center_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS notification_templates_is_active_idx
    ON notification_templates (is_active);

CREATE INDEX IF NOT EXISTS notification_templates_market_center_id_idx
    ON notification_templates (market_center_id);

-- Add the foreign key relation to market_centers
ALTER TABLE notification_templates
    ADD CONSTRAINT notification_templates_market_center_fk
    FOREIGN KEY (market_center_id)
    REFERENCES market_centers(id)
    ON DELETE SET NULL;

-- Create junction table for default templates
CREATE TABLE IF NOT EXISTS market_center_default_templates (
    market_center_id TEXT NOT NULL,
    notification_template_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (market_center_id, notification_template_id),
    FOREIGN KEY (market_center_id) REFERENCES market_centers(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS market_center_default_templates_mc_idx
    ON market_center_default_templates (market_center_id);

DROP INDEX IF EXISTS notification_templates_template_name_key;