-- Users table (synced from Clerk webhooks or on-demand)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Clerk user ID
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diagrams table  
CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id),
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  share_link_token TEXT UNIQUE,  -- null means not shared via link
  share_link_role TEXT CHECK (share_link_role IN ('viewer', 'editor')),
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  yjs_state BYTEA,  -- Liveblocks/Yjs encoded state for cold storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions table (explicit per-user grants)
CREATE TABLE IF NOT EXISTS diagram_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(diagram_id, user_id)
);

-- Comments table (threaded, anchored to nodes)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,  -- ReactFlow node ID
  author_id TEXT NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots table (named Yjs state checkpoints)
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'ai_apply', 'save', 'migration')),
  author_id TEXT NOT NULL REFERENCES users(id),
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diagrams_owner ON diagrams(owner_id);
CREATE INDEX IF NOT EXISTS idx_permissions_diagram ON diagram_permissions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON diagram_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_diagram ON comments(diagram_id);
CREATE INDEX IF NOT EXISTS idx_comments_node ON comments(node_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_diagram ON snapshots(diagram_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diagrams_updated_at BEFORE UPDATE ON diagrams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
