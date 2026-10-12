-- ==============================================================================
-- StartupZ: Project Messages Chat Permanent Persistence Migration
-- Migration: 010_project_messages_chat_persistence.sql
-- ==============================================================================

-- 1. Create project_messages table for permanent group chat storage
CREATE TABLE IF NOT EXISTS project_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    conversation_id TEXT,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    sender JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_ai_scout BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for querying by project and chronological ordering
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_created_at ON project_messages(created_at ASC);

-- 3. Row Level Security
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_messages' AND policyname = 'Public read on project_messages') THEN
    CREATE POLICY "Public read on project_messages" ON project_messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_messages' AND policyname = 'Service role full access on project_messages') THEN
    CREATE POLICY "Service role full access on project_messages" ON project_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_messages' AND policyname = 'Authenticated insert on project_messages') THEN
    CREATE POLICY "Authenticated insert on project_messages" ON project_messages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_messages' AND policyname = 'Authenticated delete on project_messages') THEN
    CREATE POLICY "Authenticated delete on project_messages" ON project_messages FOR DELETE USING (true);
  END IF;
END $$;
