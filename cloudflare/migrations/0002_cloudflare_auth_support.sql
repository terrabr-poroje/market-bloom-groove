-- Cloudflare D1 authentication and operational support schema
-- Additive only; preserves all migrated production rows.
ALTER TABLE auth_users ADD COLUMN email_confirmed_at TEXT;
ALTER TABLE auth_users ADD COLUMN password_hash TEXT;
ALTER TABLE auth_users ADD COLUMN user_metadata TEXT;
ALTER TABLE auth_users ADD COLUMN app_metadata TEXT;
ALTER TABLE auth_users ADD COLUMN last_sign_in_at TEXT;

ALTER TABLE otp_challenges ADD COLUMN identifier TEXT;
ALTER TABLE otp_challenges ADD COLUMN channel TEXT NOT NULL DEFAULT 'sms';
ALTER TABLE otp_challenges ADD COLUMN request_ip_hash TEXT;
UPDATE otp_challenges SET identifier = phone WHERE identifier IS NULL;
CREATE INDEX d1_idx_otp_identifier_channel_expiry ON otp_challenges(identifier, channel, expires_at);

CREATE TABLE admin_login_attempts (
  username_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER
);

CREATE VIEW site_visit_summary AS
SELECT
  COUNT(*) AS total_visits,
  COUNT(DISTINCT COALESCE(user_id, member_id)) AS unique_visitors,
  SUM(CASE WHEN visited_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS visits_last_24_hours,
  COUNT(DISTINCT CASE WHEN visited_at >= datetime('now', '-1 day') THEN COALESCE(user_id, member_id) END) AS visitors_last_24_hours
FROM site_visits;

INSERT INTO schema_migrations(id) VALUES ('0002_cloudflare_auth_support') ON CONFLICT DO NOTHING;
