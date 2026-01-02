CREATE TABLE IF NOT EXISTS ticket_templates (
  id TEXT PRIMARY KEY,
  market_center_id TEXT NOT NULL REFERENCES market_centers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  title TEXT NOT NULL,
  ticket_description TEXT NOT NULL,

  categoryId TEXT REFERENCES ticket_categories(id) ON DELETE SET NULL,
  urgency TEXT,
  tags JSONB,
  todos JSONB,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_id TEXT,
  updated_by_id TEXT
);

CREATE INDEX idx_ticket_templates_market_center
  ON ticket_templates(market_center_id);

CREATE INDEX idx_ticket_templates_active
  ON ticket_templates(market_center_id, is_active);
