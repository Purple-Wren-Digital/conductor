-- Backup current state before modifying
CREATE TABLE IF NOT EXISTS sla_policies_backup AS SELECT * FROM sla_policies;

-- Split SLA active toggles: separate response vs resolution
ALTER TABLE sla_policies
  ADD COLUMN resolution_is_active BOOLEAN NOT NULL DEFAULT true;

-- Copy existing is_active values so current behavior is preserved
UPDATE sla_policies SET resolution_is_active = is_active;
