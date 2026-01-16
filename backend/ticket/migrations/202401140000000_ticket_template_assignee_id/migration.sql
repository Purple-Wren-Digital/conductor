ALTER TABLE ticket_templates
  ADD COLUMN IF NOT EXISTS assignee_id TEXT
    REFERENCES users(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_templates_category
  ON ticket_templates(categoryId);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_assignee
  ON ticket_templates(assignee_id);