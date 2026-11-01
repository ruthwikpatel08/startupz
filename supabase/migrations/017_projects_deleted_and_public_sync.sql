-- ==============================================================================
-- StartupZ: Deleted Projects Persistence & Projects Sync
-- Migration: 017_projects_deleted_and_public_sync.sql
-- ==============================================================================

-- 1. Create deleted_projects table to permanently record deleted project IDs
CREATE TABLE IF NOT EXISTS deleted_projects (
    id TEXT PRIMARY KEY,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_deleted_projects_id ON deleted_projects(id);

-- 3. Row Level Security for deleted_projects
ALTER TABLE deleted_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deleted_projects' AND policyname = 'Deleted projects viewable by everyone') THEN
    CREATE POLICY "Deleted projects viewable by everyone" ON deleted_projects FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deleted_projects' AND policyname = 'Service role full access on deleted_projects') THEN
    CREATE POLICY "Service role full access on deleted_projects" ON deleted_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Enable INSERT/UPDATE/DELETE policies on projects for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Authenticated users can create projects') THEN
    CREATE POLICY "Authenticated users can create projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Creators and leads can update projects') THEN
    CREATE POLICY "Creators and leads can update projects" ON projects FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Creators can delete projects') THEN
    CREATE POLICY "Creators can delete projects" ON projects FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
