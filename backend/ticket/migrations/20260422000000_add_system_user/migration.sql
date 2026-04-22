-- Create a SYSTEM user for automated actions (auto-close, cron jobs, etc.)
-- This satisfies FK constraints on ticket_history, user_history, and market_center_history
-- where changed_by_id references users.id.
INSERT INTO users (id, email, name, role, clerk_id, is_active)
VALUES ('SYSTEM', 'system@conductor.internal', 'System', 'ADMIN', 'system_internal', true)
ON CONFLICT (id) DO NOTHING;
