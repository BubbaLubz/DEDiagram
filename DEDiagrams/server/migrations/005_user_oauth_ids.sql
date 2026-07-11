-- Passport used to look up returning users via a local users.json file,
-- which doesn't survive a restart on Render's free tier (ephemeral
-- filesystem). Moving that lookup into Supabase closes the dependency on
-- local disk entirely, rather than working around it with a paid disk.
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
