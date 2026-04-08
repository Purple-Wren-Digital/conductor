-- CreateTable: user_market_centers (many-to-many junction)
CREATE TABLE user_market_centers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_center_id TEXT NOT NULL REFERENCES market_centers(id) ON DELETE CASCADE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, market_center_id)
);

CREATE INDEX user_market_centers_user_id_idx ON user_market_centers(user_id);
CREATE INDEX user_market_centers_market_center_id_idx ON user_market_centers(market_center_id);

-- Backfill from existing data: every active user with a market_center_id gets a junction row
INSERT INTO user_market_centers (user_id, market_center_id)
SELECT id, market_center_id FROM users
WHERE market_center_id IS NOT NULL AND is_active = true
ON CONFLICT DO NOTHING;
