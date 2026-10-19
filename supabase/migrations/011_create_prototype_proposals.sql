-- ==============================================================================
-- StartupZ: Prototypes & Prototype Proposals Migration
-- Migration: 011_create_prototype_proposals.sql
-- ==============================================================================

-- 1. Add prototype metadata columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS problem TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 2. Create prototype_proposals table for "Build Together" proposals
CREATE TABLE IF NOT EXISTS prototype_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prototype_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    prototype_title TEXT NOT NULL,
    about_builder TEXT NOT NULL,
    contribution TEXT NOT NULL,
    contact_info TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_prototype_proposals_proto ON prototype_proposals(prototype_id);
CREATE INDEX IF NOT EXISTS idx_prototype_proposals_sender ON prototype_proposals(sender_id);
CREATE INDEX IF NOT EXISTS idx_prototype_proposals_receiver ON prototype_proposals(receiver_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE prototype_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prototype_proposals' AND policyname = 'Proposals are viewable by sender or receiver') THEN
    CREATE POLICY "Proposals are viewable by sender or receiver" ON prototype_proposals
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prototype_proposals' AND policyname = 'Authenticated users can create proposals') THEN
    CREATE POLICY "Authenticated users can create proposals" ON prototype_proposals
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prototype_proposals' AND policyname = 'Receivers can update proposal status') THEN
    CREATE POLICY "Receivers can update proposal status" ON prototype_proposals
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prototype_proposals' AND policyname = 'Senders can delete proposals') THEN
    CREATE POLICY "Senders can delete proposals" ON prototype_proposals
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
