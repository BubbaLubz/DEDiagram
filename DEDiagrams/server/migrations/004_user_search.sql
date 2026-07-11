-- Enables fast ILIKE '%partial%' matching for the user-search invite flow,
-- via a trigram GIN index (a plain btree index can't accelerate a
-- leading-wildcard search; pg_trgm's GIN index can).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
