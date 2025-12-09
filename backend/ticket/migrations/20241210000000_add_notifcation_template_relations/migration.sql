
-- -- Alter notification_templates table
-- ALTER TABLE notification_templates
--     ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ALTER TABLE notification_templates
--     ADD COLUMN IF NOT EXISTS market_center_id TEXT;

-- ALTER TABLE notification_templates
--     ADD COLUMN IF NOT EXISTS market_center_name TEXT;

-- -- Add the foreign key relation to market_centers
-- ALTER TABLE notification_templates
--     ADD CONSTRAINT notification_templates_market_center_fk
--     FOREIGN KEY (market_center_id)
--     REFERENCES market_centers(id)
--     ON DELETE SET NULL;


-- -- Create indexes
-- CREATE INDEX IF NOT EXISTS notification_templates_is_active_idx
--     ON notification_templates (is_active);

-- CREATE INDEX IF NOT EXISTS notification_templates_market_center_id_idx
--     ON notification_templates (market_center_id);

-- -- Ensure uniqueness per market center and template name
-- CREATE UNIQUE INDEX IF NOT EXISTS notification_templates_unique_per_mc
--     ON notification_templates (market_center_id, template_name);

-- -- Alter market_centers table
-- ALTER TABLE market_centers
--     ADD COLUMN IF NOT EXISTS default_template_id TEXT;

-- -- Add foreign key relation from market_centers to notification_templates
-- ALTER TABLE market_centers
--     ADD CONSTRAINT market_centers_default_template_fk
--     FOREIGN KEY (default_template_id)
--     REFERENCES notification_templates(id)
--     ON DELETE SET NULL;



-- -- -- Remove foreign key constraints
-- -- ALTER TABLE market_centers
-- --     DROP CONSTRAINT IF EXISTS market_centers_default_template_fk;

-- -- ALTER TABLE notification_templates
-- --     DROP CONSTRAINT IF EXISTS notification_templates_market_center_fk;

-- -- -- Drop indexes
-- -- DROP INDEX IF EXISTS notification_templates_is_active_idx;
-- -- DROP INDEX IF EXISTS notification_templates_market_center_id_idx;
-- -- DROP INDEX IF EXISTS notification_templates_unique_per_mc;

-- -- -- Drop added columns
-- -- ALTER TABLE notification_templates
-- --     DROP COLUMN IF EXISTS is_active;

-- -- ALTER TABLE notification_templates
-- --     DROP COLUMN IF EXISTS market_center_id;

-- -- ALTER TABLE notification_templates
-- --     DROP COLUMN IF EXISTS market_center_name;

-- -- ALTER TABLE market_centers
-- --     DROP COLUMN IF EXISTS default_template_id;
