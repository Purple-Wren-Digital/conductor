-- CreateTable: market_center_join_codes
CREATE TABLE IF NOT EXISTS market_center_join_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_center_id TEXT NOT NULL REFERENCES market_centers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP(3)
);

-- One live code per market center; rotated codes remain as history.
CREATE UNIQUE INDEX IF NOT EXISTS market_center_join_codes_one_active
  ON market_center_join_codes(market_center_id) WHERE is_active;

CREATE INDEX IF NOT EXISTS market_center_join_codes_code_idx
  ON market_center_join_codes(code);

-- Marks members who self-joined rather than being invited.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS joined_via_join_code BOOLEAN NOT NULL DEFAULT false;
