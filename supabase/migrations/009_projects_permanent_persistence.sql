-- ==============================================================================
-- StartupZ: Projects Permanent Persistence Migration
-- Migration: 009_projects_permanent_persistence.sql
-- ==============================================================================

-- 1. Create projects table for persistent cross-member visibility
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    idea_summary TEXT,
    tagline TEXT,
    problem_solved TEXT,
    solution_approach TEXT,
    detailed_description TEXT,
    stage TEXT NOT NULL DEFAULT 'Ideation',
    visibility TEXT NOT NULL DEFAULT 'PUBLIC',
    creator JSONB NOT NULL,
    roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    github_url TEXT,
    demo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for visibility and creator querying
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- 3. Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Public projects are viewable by everyone') THEN
    CREATE POLICY "Public projects are viewable by everyone" ON projects FOR SELECT USING (visibility = 'PUBLIC');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Service role full access on projects') THEN
    CREATE POLICY "Service role full access on projects" ON projects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
