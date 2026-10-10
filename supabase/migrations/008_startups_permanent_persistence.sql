-- ==============================================================================
-- StartupZ: Startups Permanent Persistence Migration
-- Migration: 008_startups_permanent_persistence.sql
-- ==============================================================================

-- 1. Ensure foreign key constraint does not block user startup creation
ALTER TABLE startups DROP CONSTRAINT IF EXISTS startups_founder_id_fkey;

-- 2. Enable RLS and setup permissive policies
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startups' AND policyname = 'Public startups are viewable') THEN
    CREATE POLICY "Public startups are viewable" ON startups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startups' AND policyname = 'Authenticated users can create startups') THEN
    CREATE POLICY "Authenticated users can create startups" ON startups FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startups' AND policyname = 'Authenticated users can update startups') THEN
    CREATE POLICY "Authenticated users can update startups" ON startups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startups' AND policyname = 'Users can delete their own startups') THEN
    CREATE POLICY "Users can delete their own startups" ON startups FOR DELETE TO authenticated USING (auth.uid() = founder_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'startups' AND policyname = 'Service role full access on startups') THEN
    CREATE POLICY "Service role full access on startups" ON startups FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
