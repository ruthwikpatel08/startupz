-- ==============================================================================
-- StartupZ: Fix Profile Save & Prevent Auth Triggers From Overwriting User Edits
-- Migration: 006_fix_auth_profile_save_trigger.sql
-- ==============================================================================

-- 1. Redefine handle_new_auth_user to NEVER overwrite profile edits
-- Previous bug: Every time a user logged in, Supabase Auth updated auth.users.last_sign_in_at,
-- which fired the trigger and reset full_name and username back to initial signup/oauth values.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_username TEXT;
  v_headline TEXT;
  v_location TEXT;
  v_avatar TEXT;
BEGIN
  -- If this is an UPDATE on auth.users (e.g. login timestamp updates), do not touch profile data!
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'FOUNDER'
  );
  v_headline := COALESCE(
    NEW.raw_user_meta_data->>'headline',
    v_role || ' | Startup Builder'
  );
  v_location := COALESCE(
    NEW.raw_user_meta_data->>'location',
    'Remote'
  );
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- 1. Insert into public.users only if not existing
  INSERT INTO public.users (id, email, password, role, is_verified, verification_badge, is_suspended, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    UPPER(v_role),
    (NEW.email_confirmed_at IS NOT NULL),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'Verified Member' ELSE NULL END,
    false,
    (NEW.email LIKE '%admin%'),
    NEW.created_at,
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();

  -- 2. Insert into public.profiles only if not existing (preserve any user edits)
  INSERT INTO public.profiles (
    id, user_id, full_name, username, email, headline, location, avatar, preferred_role, auth_provider, profile_completion, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    v_full_name,
    v_username,
    NEW.email,
    v_headline,
    v_location,
    v_avatar,
    v_role,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    75,
    NEW.created_at,
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$function$;
