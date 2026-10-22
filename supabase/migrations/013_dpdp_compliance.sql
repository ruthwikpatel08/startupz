-- ==============================================================================
-- HookZ: DPDP Act 2023 Compliance — Consent Logging and Data Subject Rights
-- Migration: 013_dpdp_compliance.sql
-- ==============================================================================

-- 1. Create Consent Logs Table (DPDP Section 6)
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

-- Index for rapid audit queries
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_email ON public.consent_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_consent_logs_purpose ON public.consent_logs(purpose);

-- 2. Create Data Subject Rights Requests (DSAR) Table (DPDP Chapter III)
CREATE TABLE IF NOT EXISTS public.dsar_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    request_type TEXT NOT NULL, -- ACCESS, CORRECTION, ERASURE, CONSENT_WITHDRAWAL, NOMINATION
    details TEXT NOT NULL,
    nominee_details TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, REJECTED
    response_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_user_id ON public.dsar_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_email ON public.dsar_requests(email);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_status ON public.dsar_requests(status);

-- 3. Row Level Security Policies
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent logs
DROP POLICY IF EXISTS "Users can view own consent logs" ON public.consent_logs;
CREATE POLICY "Users can view own consent logs" ON public.consent_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own consent logs
DROP POLICY IF EXISTS "Users can log their own consent" ON public.consent_logs;
CREATE POLICY "Users can log their own consent" ON public.consent_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role full access on consent logs
DROP POLICY IF EXISTS "Service role full access on consent_logs" ON public.consent_logs;
CREATE POLICY "Service role full access on consent_logs" ON public.consent_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view their own DSAR requests
DROP POLICY IF EXISTS "Users can view own DSAR requests" ON public.dsar_requests;
CREATE POLICY "Users can view own DSAR requests" ON public.dsar_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Anyone (authenticated or public) can submit a DSAR request
DROP POLICY IF EXISTS "Anyone can submit a DSAR request" ON public.dsar_requests;
CREATE POLICY "Anyone can submit a DSAR request" ON public.dsar_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Service role full access on DSAR requests
DROP POLICY IF EXISTS "Service role full access on dsar_requests" ON public.dsar_requests;
CREATE POLICY "Service role full access on dsar_requests" ON public.dsar_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
