-- Phase 1: one authenticated, atomic onboarding submission.
-- Apply this migration alone after 014. Do not replay 001 (it drops tables).
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_answers JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_category_selected BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing members; explicit unfinished signups remain unfinished.
UPDATE public.profiles p
SET onboarding_completed = COALESCE((
  SELECT CASE WHEN u.raw_user_meta_data->>'onboarding_completed' = 'false' THEN false ELSE true END
  FROM auth.users u WHERE u.id = p.user_id
), true)
WHERE p.onboarding_completed IS NULL;
ALTER TABLE public.profiles ALTER COLUMN onboarding_completed SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_answers JSONB,
  p_profile_consent BOOLEAN,
  p_terms_consent BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_role TEXT;
  v_key TEXT;
  v_required TEXT[];
  v_arrays TEXT[];
  v_allowed TEXT[];
  v_choices TEXT[];
  v_answers JSONB;
  v_value JSONB;
  v_headline TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to complete onboarding.' USING ERRCODE = '28000'; END IF;
  IF p_profile_consent IS DISTINCT FROM true OR p_terms_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Both consent choices are required.' USING ERRCODE = '22023';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' OR octet_length(p_answers::text) > 16000 THEN
    RAISE EXCEPTION 'Invalid onboarding answers.' USING ERRCODE = '22023';
  END IF;
  v_role := p_answers->>'role';
  IF v_role IS NULL OR v_role NOT IN ('Student', 'Investor', 'Other') THEN
    RAISE EXCEPTION 'Choose Student, Investor, or Other.' USING ERRCODE = '22023';
  END IF;
  IF v_role = 'Student' THEN
    v_required := ARRAY['fullName', 'college', 'year', 'major', 'primaryRole', 'hackathons'];
    v_arrays := ARRAY['skills', 'lookingFor'];
    v_allowed := v_required || v_arrays || ARRAY['role', 'bio'];
  ELSIF v_role = 'Investor' THEN
    v_required := ARRAY['fullName', 'checkSize', 'mentoring'];
    v_arrays := ARRAY['stages', 'sectors'];
    v_allowed := v_required || v_arrays || ARRAY['role', 'bio', 'organization'];
  ELSE
    v_required := ARRAY['fullName', 'otherRole'];
    v_arrays := ARRAY['skills', 'lookingFor'];
    v_allowed := v_required || v_arrays || ARRAY['role', 'bio', 'location'];
  END IF;
  SELECT jsonb_object_agg(key, CASE WHEN jsonb_typeof(value) = 'string' THEN to_jsonb(btrim(value #>> '{}')) ELSE value END)
  INTO v_answers FROM jsonb_each(p_answers) WHERE key = ANY(v_allowed);
  FOREACH v_key IN ARRAY v_required LOOP
    IF jsonb_typeof(v_answers->v_key) IS DISTINCT FROM 'string' OR length(btrim(v_answers->>v_key)) = 0 THEN
      RAISE EXCEPTION 'Missing answer: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOREACH v_key IN ARRAY v_allowed LOOP
    IF NOT v_key = ANY(v_arrays) AND v_answers ? v_key THEN
      IF jsonb_typeof(v_answers->v_key) <> 'string' OR length(v_answers->>v_key) >
        (CASE WHEN v_key IN ('fullName', 'major', 'otherRole') THEN 100 WHEN v_key = 'location' THEN 120 ELSE 160 END) THEN
        RAISE EXCEPTION 'Invalid or oversized answer: %', v_key USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;
  FOREACH v_key IN ARRAY v_arrays LOOP
    IF jsonb_typeof(v_answers->v_key) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose options for %', v_key USING ERRCODE = '22023'; END IF;
    IF jsonb_array_length(v_answers->v_key) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Choose 1 to 20 options for %', v_key USING ERRCODE = '22023'; END IF;
    v_choices := CASE v_key
      WHEN 'stages' THEN ARRAY['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Later']
      WHEN 'sectors' THEN ARRAY['AI/ML', 'FinTech', 'EdTech', 'HealthTech', 'Consumer', 'SaaS', 'Climate', 'Other']
      WHEN 'lookingFor' THEN CASE WHEN v_role = 'Student' THEN ARRAY['Hackathon teammates', 'Project collaborators', 'Co-founders', 'Mentorship', 'Just exploring'] ELSE ARRAY['Networking', 'Collaborating on projects', 'Mentoring students', 'Discovering opportunities', 'Other'] END
      ELSE NULL END;
    FOR v_value IN SELECT value FROM jsonb_array_elements(v_answers->v_key) LOOP
      IF jsonb_typeof(v_value) <> 'string' OR length(btrim(v_value #>> '{}')) NOT BETWEEN 1 AND 50
        OR (v_choices IS NOT NULL AND NOT (v_value #>> '{}') = ANY(v_choices)) THEN
        RAISE EXCEPTION 'Invalid selection for %', v_key USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END LOOP;
  IF v_role = 'Student' AND (
    NOT (v_answers->>'year') = ANY(ARRAY['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgrad']) OR
    NOT (v_answers->>'primaryRole') = ANY(ARRAY['Frontend', 'Backend', 'Full-Stack', 'UI-UX Designer', 'ML-AI', 'Mobile Dev', 'DevOps', 'Presenter-Pitcher', 'Product Manager', 'Other']) OR
    NOT (v_answers->>'hackathons') = ANY(ARRAY['0', '1-3', '4-7', '8+'])
  ) THEN RAISE EXCEPTION 'Invalid student selection.' USING ERRCODE = '22023'; END IF;
  IF v_role = 'Investor' AND (
    NOT (v_answers->>'checkSize') = ANY(ARRAY['Under $10k', '$10k-$50k', '$50k-$250k', '$250k+', 'Varies']) OR
    NOT (v_answers->>'mentoring') = ANY(ARRAY['Yes', 'No'])
  ) THEN RAISE EXCEPTION 'Invalid investor selection.' USING ERRCODE = '22023'; END IF;

  -- Serialize retries for this member only; a retry returns the saved profile.
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile is not ready. Please sign in again.'; END IF;
  IF v_profile.onboarding_completed THEN RETURN to_jsonb(v_profile); END IF;
  v_headline := CASE v_role WHEN 'Student' THEN v_answers->>'primaryRole' WHEN 'Investor' THEN concat_ws(' at ', 'Investor', nullif(v_answers->>'organization', '')) ELSE v_answers->>'otherRole' END;
  UPDATE public.profiles SET
    full_name = v_answers->>'fullName',
    preferred_role = upper(v_role),
    headline = v_headline,
    bio = COALESCE(v_answers->>'bio', ''),
    education = CASE WHEN v_role = 'Student' THEN concat_ws(' | ', v_answers->>'college', v_answers->>'year', v_answers->>'major') ELSE education END,
    skills = CASE WHEN v_answers ? 'skills' THEN (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(v_answers->'skills')) ELSE skills END,
    industries = CASE WHEN v_role = 'Investor' THEN (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(v_answers->'sectors')) ELSE industries END,
    startup_interests = CASE WHEN v_role = 'Investor' THEN (SELECT string_agg(value, ', ') FROM jsonb_array_elements_text(v_answers->'stages')) ELSE startup_interests END,
    startup_experience = CASE WHEN v_role = 'Student' THEN (v_answers->>'hackathons') || ' hackathons' ELSE startup_experience END,
    open_to = CASE WHEN v_answers ? 'lookingFor' THEN (SELECT string_agg(value, ',') FROM jsonb_array_elements_text(v_answers->'lookingFor')) WHEN v_answers->>'mentoring' = 'Yes' THEN 'Mentoring students' ELSE '' END,
    location = CASE WHEN v_role = 'Other' THEN COALESCE(v_answers->>'location', '') ELSE location END,
    onboarding_answers = v_answers,
    is_category_selected = true,
    onboarding_completed = true,
    profile_completion = 85,
    updated_at = now()
  WHERE user_id = v_uid RETURNING * INTO v_profile;
  UPDATE public.users SET role = upper(v_role), updated_at = now() WHERE id = v_uid AND is_admin = false;
  INSERT INTO public.consent_logs (user_id, user_email, purpose, consent_version, status, details)
  VALUES
    (v_uid, v_profile.email, 'PROFILE_DIRECTORY_AND_MATCHMAKING', '1.0', 'GRANTED', 'Explicit consent at onboarding completion'),
    (v_uid, v_profile.email, 'TERMS_AND_PRIVACY_NOTICE', '1.0', 'GRANTED', 'Explicit acceptance at onboarding completion');
  RETURN to_jsonb(v_profile);
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_onboarding(JSONB, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(JSONB, BOOLEAN, BOOLEAN) TO authenticated;
COMMIT;
