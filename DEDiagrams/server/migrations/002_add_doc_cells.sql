-- DocPanel annotation cells were never added to the original schema.
ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS doc_cells JSONB NOT NULL DEFAULT '[]'::jsonb;
