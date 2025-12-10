
-- Alter notification_templates table
ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS market_center_id TEXT;

ALTER TABLE notification_templates
    ADD COLUMN IF NOT EXISTS market_center_name TEXT;

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

-- Alter market_centers table
ALTER TABLE market_centers
    ADD COLUMN IF NOT EXISTS default_template_id TEXT;

-- Add the foreign key relation to default template
ALTER TABLE market_centers
    ADD CONSTRAINT market_centers_default_template_fk
    FOREIGN KEY (default_template_id)
    REFERENCES notification_templates(id)
    ON DELETE SET NULL;

DROP INDEX IF EXISTS notification_templates_template_name_key;
