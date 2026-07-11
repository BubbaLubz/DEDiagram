-- Our server only ever connects with the service_role/secret key, which
-- bypasses RLS entirely, so no policies are needed. This just closes off
-- access via the anon/publishable key in case it's ever used client-side.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
