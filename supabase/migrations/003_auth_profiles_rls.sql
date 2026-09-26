-- ==============================================================================
-- StartupZ: Supabase Auth & Profiles RLS Policy Integration
-- Migration: 003_auth_profiles_rls.sql
-- Single Source of Truth: Supabase Auth (auth.users)
-- ==============================================================================

-- 1. Ensure columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Safely manage Foreign Key to auth.users
DO $$
BEGIN
  -- Drop old custom users table constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_user_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public profiles are readable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;

-- 5. Create production RLS policies
-- Anyone can view profiles (public network visibility)
CREATE POLICY "Public profiles are readable" ON public.profiles
  FOR SELECT
  USING (true);

-- Authenticated users can create their own profile matching auth.uid()
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update ONLY their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypass for server tasks
CREATE POLICY "Service role full access on profiles" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Automated Profile Creation Trigger
-- Fires automatically whenever a new user signs up via Google OAuth or Email/Password
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_full_name TEXT;
  user_avatar TEXT;
  user_role TEXT;
  user_headline TEXT;
  user_location TEXT;
  provider_name TEXT;
BEGIN
  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  user_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(new.email::bytea, 'hex')
  );

  user_role := COALESCE(new.raw_user_meta_data->>'role', 'FOUNDER');
  user_headline := COALESCE(new.raw_user_meta_data->>'headline', user_role || ' | Startup Builder');
  user_location := COALESCE(new.raw_user_meta_data->>'location', 'Remote');
  provider_name := COALESCE(new.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.profiles (
    user_id,
    full_name,
    avatar,
    headline,
    location,
    preferred_role,
    open_to,
    profile_completion,
    auth_provider,
    email
  )
  VALUES (
    new.id,
    user_full_name,
    user_avatar,
    user_headline,
    user_location,
    user_role,
    'Co-Founder,Startup Team,Investment',
    60,
    provider_name,
    new.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar = COALESCE(public.profiles.avatar, EXCLUDED.avatar),
    auth_provider = COALESCE(EXCLUDED.auth_provider, public.profiles.auth_provider),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
