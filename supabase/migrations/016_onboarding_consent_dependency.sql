-- Repair deployments where 015 exists but its consent table from 013 is absent.
-- Matches the existing consent schema; does not replay unrelated migrations.
BEGIN;
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  purpose TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL DEFAULT 'GRANTED',
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_email ON public.consent_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_consent_logs_purpose ON public.consent_logs(purpose);
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own consent logs" ON public.consent_logs;
CREATE POLICY "Users can view own consent logs" ON public.consent_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can log their own consent" ON public.consent_logs;
CREATE POLICY "Users can log their own consent" ON public.consent_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access on consent_logs" ON public.consent_logs;
CREATE POLICY "Service role full access on consent_logs" ON public.consent_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT ON public.consent_logs TO authenticated;
GRANT ALL ON public.consent_logs TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
