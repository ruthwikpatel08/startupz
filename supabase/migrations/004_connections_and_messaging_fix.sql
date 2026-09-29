-- ==============================================================================
-- StartupZ: Connections & Messaging System Complete Migration
-- Migration: 004_connections_and_messaging_fix.sql
-- ==============================================================================

-- 1. Ensure all auth.users have records in public.users and public.profiles
INSERT INTO public.users (id, email, password, role, is_verified, verification_badge, is_suspended, is_admin, created_at, updated_at)
SELECT 
  id, 
  email, 
  '', 
  COALESCE(UPPER(raw_user_meta_data->>'role'), 'FOUNDER'), 
  (email_confirmed_at IS NOT NULL), 
  CASE WHEN email_confirmed_at IS NOT NULL THEN 'Verified Member' ELSE NULL END, 
  false, 
  (email LIKE '%admin%'), 
  created_at, 
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, user_id, full_name, username, email, headline, location, avatar, preferred_role, auth_provider, profile_completion, created_at, updated_at)
SELECT 
  id, 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)), 
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)), 
  email, 
  COALESCE(raw_user_meta_data->>'headline', 'FOUNDER | Startup Builder'), 
  COALESCE(raw_user_meta_data->>'location', 'Remote'), 
  raw_user_meta_data->>'avatar_url', 
  COALESCE(raw_user_meta_data->>'role', 'FOUNDER'), 
  COALESCE(raw_app_meta_data->>'provider', 'email'), 
  75, 
  created_at, 
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Constraints on connections table
ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_no_self_connect;
ALTER TABLE public.connections ADD CONSTRAINT connections_no_self_connect CHECK (sender_id <> receiver_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_bidirectional_unique 
  ON public.connections (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

-- 3. Constraints on conversations table
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_no_self_chat;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_no_self_chat CHECK (participant1_id <> participant2_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_bidirectional_unique 
  ON public.conversations (LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id));

-- 4. Connection count RPC function
CREATE OR REPLACE FUNCTION public.get_connection_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM public.connections
  WHERE (sender_id = target_user_id OR receiver_id = target_user_id)
    AND status = 'ACCEPTED';
$$;

GRANT EXECUTE ON FUNCTION public.get_connection_count(uuid) TO authenticated, anon, public;

-- 5. Enable RLS
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Clean up old/insecure policies
DROP POLICY IF EXISTS "Connections viewable by members" ON public.connections;
DROP POLICY IF EXISTS "Connections insertable by authenticated" ON public.connections;
DROP POLICY IF EXISTS "Connections updatable by members" ON public.connections;
DROP POLICY IF EXISTS "Users can view own or accepted connections" ON public.connections;
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update their connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;

-- 7. Production RLS Policies: CONNECTIONS
CREATE POLICY "Allow select on connections" ON public.connections
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on connections" ON public.connections
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on connections" ON public.connections
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on connections" ON public.connections
  FOR DELETE TO anon, authenticated
  USING (true);

-- 8. Production RLS Policies: CONVERSATIONS
CREATE POLICY "Allow select on conversations" ON public.conversations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on conversations" ON public.conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on conversations" ON public.conversations
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on conversations" ON public.conversations
  FOR DELETE TO anon, authenticated
  USING (true);

-- 9. Production RLS Policies: MESSAGES
CREATE POLICY "Allow select on messages" ON public.messages
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on messages" ON public.messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on messages" ON public.messages
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on messages" ON public.messages
  FOR DELETE TO anon, authenticated
  USING (true);

-- 10. Realtime publication & replica identity
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.connections REPLICA IDENTITY FULL;
