-- ==============================================================================
-- StartupZ: Notifications Table RLS & Realtime Fix
-- Migration: 005_notifications_rls_fix.sql
-- 
-- PROBLEM: The notifications table had RLS enabled but only service_role policies,
-- meaning all client-side Supabase operations (select, insert, update, delete) 
-- on notifications were silently failing. This caused:
--   1. Notification Accept/Decline buttons re-appearing on refresh
--   2. Connection accepted via notification not updating notification read status
--   3. Notifications not being inserted from the client (e.g. CONNECTION_ACCEPTED)
-- ==============================================================================

-- 1. Clean up old notification policies
DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete on notifications" ON public.notifications;

-- 2. Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Permissive RLS policies for client-side access (matching connections pattern)
CREATE POLICY "Allow select on notifications" ON public.notifications
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on notifications" ON public.notifications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on notifications" ON public.notifications
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on notifications" ON public.notifications
  FOR DELETE TO anon, authenticated
  USING (true);

-- 4. Service role full access (re-create)
CREATE POLICY "Service role full access on notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Add notifications to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 6. Set replica identity for realtime to work properly
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
