import { createClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, Profile, UserRole, Connection, Conversation, Message } from '../types';
import { api } from '../services/api';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://aqbnylhmsawdagoyggrf.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('StartupZ: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const AUTH_PROVIDERS_KEY = 'startupz_auth_provider_hints';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (str?: string | null): boolean => typeof str === 'string' && UUID_REGEX.test(str.trim());

/**
 * Safely store an auth provider hint (e.g. 'google' or 'email') for an email.
 * This ensures that when a Google OAuth user later enters their email + password,
 * we can immediately recognize that their account uses Google and guide them accurately.
 */
export function recordAuthProviderHint(email: string, provider: 'google' | 'email'): void {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem(AUTH_PROVIDERS_KEY);
    const hints = raw ? JSON.parse(raw) : {};
    hints[normalized] = provider;
    localStorage.setItem(AUTH_PROVIDERS_KEY, JSON.stringify(hints));
  } catch {
    // Non-critical local hint storage
  }
}

export function getAuthProviderHint(email: string): 'google' | 'email' | null {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem(AUTH_PROVIDERS_KEY);
    if (!raw) return null;
    const hints = JSON.parse(raw);
    return hints[normalized] || null;
  } catch {
    return null;
  }
}

/**
 * Maps a Supabase Auth user and their database profile row
 * into the complete StartupZ User object structure.
 */
export function mapSupabaseToAppUser(
  authUser: SupabaseAuthUser,
  profileRow?: any
): User {
  const metadata = authUser.user_metadata || {};
  const isGoogle =
    authUser.app_metadata?.provider === 'google' ||
    authUser.identities?.some((id) => id.provider === 'google') ||
    getAuthProviderHint(authUser.email || '') === 'google';

  const role: UserRole = profileRow?.preferred_role || metadata.role || 'FOUNDER';
  const fullName =
    profileRow?.full_name ||
    metadata.full_name ||
    metadata.name ||
    authUser.email?.split('@')[0] ||
    'Member';

  const avatar =
    profileRow?.avatar ||
    metadata.avatar_url ||
    metadata.picture ||
    undefined;

  const profile: Profile = {
    id: profileRow?.id || authUser.id,
    userId: authUser.id,
    fullName,
    username: profileRow?.username || metadata.username || (authUser.email ? authUser.email.split('@')[0] : ''),
    headline: profileRow?.headline || metadata.headline || `${role} | Startup Builder`,
    oneLineBio: profileRow?.one_line_bio || profileRow?.headline || metadata.one_line_bio || '',
    location: profileRow?.location || metadata.location || 'Remote',
    bio: profileRow?.bio || metadata.bio || '',
    avatar,
    coverImage: profileRow?.cover_image || null,
    education: profileRow?.education || '',
    portfolioUrl: profileRow?.portfolio_url || '',
    githubUrl: profileRow?.github_url || '',
    linkedinUrl: profileRow?.linkedin_url || '',
    websiteUrl: profileRow?.website_url || '',
    skills: profileRow?.skills || '',
    startupInterests: profileRow?.startup_interests || '',
    industries: profileRow?.industries || '',
    preferredRole: role,
    availability: profileRow?.availability || 'Full-time',
    startupExperience: profileRow?.startup_experience || '',
    achievements: profileRow?.achievements || '',
    openTo: profileRow?.open_to || 'Co-Founder,Startup Team,Investment',
    profileCompletion: profileRow?.profile_completion || 60,
    roleChangeCount: profileRow?.role_change_count ?? profileRow?.roleChangeCount ?? metadata.role_change_count ?? 0,
    role_change_count: profileRow?.role_change_count ?? profileRow?.roleChangeCount ?? metadata.role_change_count ?? 0,
    usernameChangedAt: profileRow?.username_changed_at ?? profileRow?.usernameChangedAt ?? metadata.username_changed_at ?? null,
    username_changed_at: profileRow?.username_changed_at ?? profileRow?.usernameChangedAt ?? metadata.username_changed_at ?? null,
    isCategorySelected: profileRow?.is_category_selected === true,
    onboardingCompleted: profileRow?.onboarding_completed !== false && metadata.onboarding_completed !== false,
    onboarding_completed: profileRow?.onboarding_completed !== false && metadata.onboarding_completed !== false,
    createdAt: profileRow?.created_at || authUser.created_at,
    updatedAt: profileRow?.updated_at || authUser.updated_at,
  };

  const roleChangeCount = profile.roleChangeCount ?? 0;

  return {
    id: authUser.id,
    email: authUser.email || '',
    username: profile.username,
    role,
    roleChangeCount,
    isVerified: !!authUser.email_confirmed_at || isGoogle,
    verificationBadge: isGoogle ? 'Verified via Google' : (authUser.email_confirmed_at ? 'Active Builder' : null),
    isSuspended: false,
    isAdmin:
      metadata.isAdmin === true ||
      metadata.role === 'ADMIN' ||
      authUser.email?.toLowerCase() === 'ruthwikpatel08@gmail.com' ||
      authUser.email?.toLowerCase() === 'gokulvamshi@hookz.in' ||
      authUser.email?.toLowerCase() === 'gokulvamshi@gmail.com' ||
      authUser.email?.toLowerCase() === 'admin@startupz.com' ||
      profile.username?.toLowerCase() === 'ruthwikpatel08' ||
      profile.username?.toLowerCase() === 'gokulvamshi',
    onboardingCompleted: profileRow?.onboarding_completed !== false && metadata.onboarding_completed !== false,
    onboarding_completed: profileRow?.onboarding_completed !== false && metadata.onboarding_completed !== false,
    createdAt: authUser.created_at,
    updatedAt: authUser.updated_at,
    profile,
  };
}

const userProfileCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightProfileRequests = new Map<string, Promise<any | null>>();
const PROFILE_CACHE_TTL_MS = 5000; // 5 seconds fresh cache TTL

export const KNOWN_ACCOUNT_MAP: Record<string, string> = {
  'admin': 'admin@startupz.com',
  'ruthwik': 'ruthwik9595@gmail.com',
  'ruthwikpatel': 'ruthwik9595@gmail.com',
  'ruthwikpatel08': 'ruthwik9595@gmail.com',
  'gokul': 'gokulvamshi.workspace@gmail.com',
  'gokulvamshi': 'gokulvamshi.workspace@gmail.com',
  'legacy': 'legacyplayer04@gmail.com',
  'legacyplayer': 'legacyplayer04@gmail.com',
  'legacyplayer04': 'legacyplayer04@gmail.com',
  'lavan': 'lavanyadav0206@gmail.com',
  'lavanyadav': 'lavanyadav0206@gmail.com',
  'lavanyadav0206': 'lavanyadav0206@gmail.com',
};

export function invalidateUserProfileCache(userId?: string): void {
  if (userId) {
    userProfileCache.delete(userId);
    inFlightProfileRequests.delete(userId);
  } else {
    userProfileCache.clear();
    inFlightProfileRequests.clear();
  }
}

/**
 * Fetch a profile row from Supabase public.profiles by user UUID, username handle, or email.
 * Includes short in-memory caching and deduplication to prevent redundant network requests,
 * with explicit forceRefresh support to always bypass cache.
 */
export async function fetchUserProfile(userId: string, forceRefresh = false, email?: string): Promise<any | null> {
  if (!userId && !email) return null;

  const cacheKey = (userId || email || '').trim().toLowerCase();
  if (!forceRefresh) {
    const cached = userProfileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (inFlightProfileRequests.has(cacheKey)) {
      return inFlightProfileRequests.get(cacheKey)!;
    }
  } else {
    invalidateUserProfileCache(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      let data: any = null;

      // 1. If valid UUID, look up by user_id or id
      if (userId && isUuid(userId)) {
        const res = await supabase
          .from('profiles')
          .select('*')
          .or(`user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();
        data = res.data;
      }

      // 2. If userId is a username handle (not a UUID and does not contain @)
      if (!data && userId && !isUuid(userId) && !userId.includes('@')) {
        const uName = userId.trim().toLowerCase().replace(/^@/, '');
        
        // 2a. Query by username column in profiles
        const uRes = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', uName)
          .maybeSingle();
        if (uRes.data) {
          data = uRes.data;
        }

        // 2b. If not found by username column, try known email mapping (e.g. ruthwikpatel08 -> ruthwikpatel08@gmail.com)
        if (!data && KNOWN_ACCOUNT_MAP[uName]) {
          const mapEmailRes = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', KNOWN_ACCOUNT_MAP[uName])
            .maybeSingle();
          if (mapEmailRes.data) {
            data = mapEmailRes.data;
          }
        }

        // 2c. Fallback for built-in HookZ leadership profiles
        if (!data) {
          if (uName === 'ruthwikpatel08' || uName === 'ruthwik' || uName === 'ruthwikpatel') {
            data = {
              id: 'b669157c-4d30-42f4-a8bf-4e27dc425e00',
              user_id: 'b669157c-4d30-42f4-a8bf-4e27dc425e00',
              email: 'ruthwik9595@gmail.com',
              full_name: 'Ruthwik patel',
              username: 'ruthwikpatel08',
              preferred_role: 'FOUNDER',
              role: 'FOUNDER',
              headline: 'Founder of Hookz',
              one_line_bio: 'Started',
              bio: 'Started',
              avatar: '',
              location: 'Hyderabad, Telangana, India',
              skills: '',
              startup_experience: '',
              achievements: '',
              education: '',
              open_to: 'Startup Team',
              profile_completion: 40,
              verification_badge: 'HookZ Founder',
              is_verified: true,
            };
          } else if (uName === 'gokulvamshi' || uName === 'gokul') {
            data = {
              id: '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba',
              user_id: '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba',
              email: 'gokulvamshi.workspace@gmail.com',
              full_name: 'Gokul Vamshi',
              username: 'gokulvamshi',
              preferred_role: 'DEVELOPER',
              role: 'DEVELOPER',
              headline: 'Student | Technical Builder',
              one_line_bio: 'Student | Technical Builder',
              bio: '',
              avatar: '',
              location: 'Kolhapur',
              skills: 'React, Node.js',
              startup_experience: '',
              achievements: '',
              education: '',
              open_to: 'Co-Founder,Startup Team,Investment',
              profile_completion: 40,
              verification_badge: 'HookZ Co-Founder',
              is_verified: true,
            };
          }
        }
      }

      // 3. Look up by email (only if userId was an email, or if no userId was provided)
      const targetEmail = (
        (!userId && email) ||
        (userId && userId.includes('@') ? userId : (!isUuid(userId) && email ? email : ''))
      ).trim().toLowerCase();

      if (!data && targetEmail) {
        const emailRes = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', targetEmail)
          .maybeSingle();
        if (emailRes.data) {
          data = emailRes.data;
        }
      }

      if (data) {
        userProfileCache.set(cacheKey, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
        if (userId && cacheKey !== userId) {
          userProfileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
        }
      }
      return data;
    } catch (err) {
      console.warn('Network exception fetching profile:', err);
      return null;
    }
  })().finally(() => {
    inFlightProfileRequests.delete(cacheKey);
  });

  inFlightProfileRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Upsert or create a user profile in Supabase public.profiles table.
 */
export async function upsertUserProfile(
  userId: string,
  profileData: Record<string, any>
): Promise<any> {
  if (!userId) throw new Error('User ID is required to save profile.');

  // Extract and map ONLY valid columns that exist in the PostgreSQL public.profiles table
  const dbPayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (profileData.full_name !== undefined || profileData.fullName !== undefined) {
    dbPayload.full_name = profileData.full_name ?? profileData.fullName;
  }
  if (profileData.username !== undefined && profileData.username) {
    dbPayload.username = String(profileData.username).trim().toLowerCase().replace(/^@/, '');
  }
  if (profileData.headline !== undefined) {
    dbPayload.headline = profileData.headline;
  }
  if (profileData.one_line_bio !== undefined || profileData.oneLineBio !== undefined) {
    dbPayload.one_line_bio = profileData.one_line_bio ?? profileData.oneLineBio;
  }
  if (profileData.location !== undefined) {
    dbPayload.location = profileData.location;
  }
  if (profileData.bio !== undefined) {
    dbPayload.bio = profileData.bio;
  }
  if (profileData.avatar !== undefined) {
    dbPayload.avatar = profileData.avatar;
  }
  if (profileData.cover_image !== undefined || profileData.coverImage !== undefined) {
    dbPayload.cover_image = profileData.cover_image ?? profileData.coverImage;
  }
  if (profileData.education !== undefined) {
    dbPayload.education = profileData.education;
  }
  if (profileData.portfolio_url !== undefined || profileData.portfolioUrl !== undefined) {
    dbPayload.portfolio_url = profileData.portfolio_url ?? profileData.portfolioUrl;
  }
  if (profileData.github_url !== undefined || profileData.githubUrl !== undefined) {
    dbPayload.github_url = profileData.github_url ?? profileData.githubUrl;
  }
  if (profileData.linkedin_url !== undefined || profileData.linkedinUrl !== undefined) {
    dbPayload.linkedin_url = profileData.linkedin_url ?? profileData.linkedinUrl;
  }
  if (profileData.website_url !== undefined || profileData.websiteUrl !== undefined) {
    dbPayload.website_url = profileData.website_url ?? profileData.websiteUrl;
  }
  if (profileData.skills !== undefined) {
    dbPayload.skills = profileData.skills;
  }
  if (profileData.startup_interests !== undefined || profileData.startupInterests !== undefined) {
    dbPayload.startup_interests = profileData.startup_interests ?? profileData.startupInterests;
  }
  if (profileData.industries !== undefined) {
    dbPayload.industries = profileData.industries;
  }
  if (profileData.preferred_role !== undefined || profileData.preferredRole !== undefined || profileData.role !== undefined) {
    dbPayload.preferred_role = profileData.preferred_role ?? profileData.preferredRole ?? profileData.role;
  }
  if (profileData.availability !== undefined) {
    dbPayload.availability = profileData.availability;
  }
  if (profileData.startup_experience !== undefined || profileData.startupExperience !== undefined) {
    dbPayload.startup_experience = profileData.startup_experience ?? profileData.startupExperience;
  }
  if (profileData.achievements !== undefined) {
    dbPayload.achievements = profileData.achievements;
  }
  if (profileData.open_to !== undefined || profileData.openTo !== undefined) {
    const val = profileData.open_to ?? profileData.openTo;
    dbPayload.open_to = Array.isArray(val) ? val.join(',') : val;
  }
  if (profileData.profile_completion !== undefined || profileData.profileCompletion !== undefined) {
    dbPayload.profile_completion = Number(profileData.profile_completion ?? profileData.profileCompletion) || 60;
  }
  if (profileData.role_change_count !== undefined || profileData.roleChangeCount !== undefined) {
    dbPayload.role_change_count = Number(profileData.role_change_count ?? profileData.roleChangeCount) || 0;
  }
  if (profileData.username_changed_at !== undefined || profileData.usernameChangedAt !== undefined) {
    dbPayload.username_changed_at = profileData.username_changed_at || profileData.usernameChangedAt;
  }
  if (profileData.is_category_selected !== undefined || profileData.isCategorySelected !== undefined) {
    dbPayload.is_category_selected = Boolean(profileData.is_category_selected ?? profileData.isCategorySelected);
  }
  if (profileData.onboarding_completed !== undefined || profileData.onboardingCompleted !== undefined) {
    dbPayload.onboarding_completed = Boolean(profileData.onboarding_completed ?? profileData.onboardingCompleted);
  }
  if (profileData.auth_provider !== undefined || profileData.authProvider !== undefined) {
    dbPayload.auth_provider = profileData.auth_provider ?? profileData.authProvider;
  }
  if (profileData.email !== undefined && profileData.email) {
    dbPayload.email = String(profileData.email).trim().toLowerCase();
  }

  // If username not provided, generate default
  if (!dbPayload.username) {
    if (dbPayload.email) {
      dbPayload.username = dbPayload.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    } else if (dbPayload.full_name) {
      dbPayload.username = dbPayload.full_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
  }

  // Invalidate stale cache first
  invalidateUserProfileCache(userId);
  if (dbPayload.email) invalidateUserProfileCache(dbPayload.email);

  // Check if username is already taken by another user before performing update
  if (dbPayload.username) {
    let takenQuery = supabase
      .from('profiles')
      .select('id, user_id, email')
      .ilike('username', dbPayload.username);

    if (isUuid(userId)) {
      takenQuery = takenQuery.neq('user_id', userId).neq('id', userId);
    }
    const { data: takenCheck } = await takenQuery.maybeSingle();
    if (takenCheck) {
      const isSameEmail = dbPayload.email && takenCheck.email?.toLowerCase() === dbPayload.email.toLowerCase();
      if (!isSameEmail) {
        throw new Error('This username is already taken. Please choose another username.');
      }
    }
  }

  // 1. Locate existing profile safely by UUID, email, or username
  let existing: any = null;
  if (userId && isUuid(userId)) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();
    existing = data;
  }
  if (!existing && dbPayload.email) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', dbPayload.email)
      .maybeSingle();
    existing = data;
  }
  if (!existing && dbPayload.username) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', dbPayload.username)
      .maybeSingle();
    existing = data;
  }

  let savedData: any = null;
  if (existing?.id) {
    const { data: updatedRow, error: updateError } = await supabase
      .from('profiles')
      .update(dbPayload)
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Supabase profile update error:', updateError);
      throw new Error(updateError.message || 'Failed to update profile in database.');
    }
    savedData = updatedRow;
  } else {
    // 2. If profile did not exist, insert it
    const insertPayload: any = { ...dbPayload };
    if (userId && isUuid(userId)) {
      insertPayload.user_id = userId;
    }
    const { data: insertedRow, error: insertError } = await supabase
      .from('profiles')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase profile insert error:', insertError);
      throw new Error(insertError.message || 'Failed to create profile in database.');
    }
    savedData = insertedRow;
  }

  // 3. Keep Supabase Auth session metadata in sync with profile edits
  if (dbPayload.full_name || dbPayload.avatar !== undefined || dbPayload.preferred_role !== undefined) {
    try {
      const authMetaUpdate: any = {};
      if (dbPayload.full_name) {
        authMetaUpdate.full_name = dbPayload.full_name;
        authMetaUpdate.name = dbPayload.full_name;
      }
      if (dbPayload.avatar !== undefined) {
        authMetaUpdate.avatar_url = dbPayload.avatar;
        authMetaUpdate.picture = dbPayload.avatar;
      }
      if (dbPayload.preferred_role !== undefined) {
        authMetaUpdate.role = dbPayload.preferred_role;
      }
      await supabase.auth.updateUser({ data: authMetaUpdate });
    } catch {
      // Non-blocking metadata sync
    }
  }

  // 4. Also sync role, role_change_count, username_changed_at to public.users table if changed
  if (dbPayload.preferred_role || dbPayload.role_change_count !== undefined || dbPayload.username_changed_at !== undefined) {
    const userUpdate: any = {
      updated_at: new Date().toISOString(),
    };
    if (dbPayload.preferred_role) userUpdate.role = dbPayload.preferred_role;
    if (dbPayload.role_change_count !== undefined) userUpdate.role_change_count = dbPayload.role_change_count;
    if (dbPayload.username_changed_at !== undefined) userUpdate.username_changed_at = dbPayload.username_changed_at;

    const targetUserId = existing?.user_id || (userId && isUuid(userId) ? userId : null);
    if (targetUserId) {
      try {
        await supabase
          .from('users')
          .update(userUpdate)
          .eq('id', targetUserId);
      } catch {}
    } else if (dbPayload.email) {
      try {
        await supabase
          .from('users')
          .update(userUpdate)
          .ilike('email', dbPayload.email);
      } catch {}
    }
  }

  // 5. Update in-memory cache with the fresh persistent data
  if (savedData) {
    userProfileCache.set(userId, { data: savedData, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
    if (dbPayload.email) {
      userProfileCache.set(dbPayload.email, { data: savedData, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
    }
    try {
      window.dispatchEvent(new CustomEvent('profile_updated', { detail: { userId, profile: savedData } }));
    } catch {}
  }

  return savedData;
}

/**
 * Resolves an identifier (which can be a Gmail address, custom email, or username)
 * into a valid email string for authentication.
 */
export async function resolveEmailOrUsername(identifier: string): Promise<string> {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) return '';
  if (clean.includes('@')) {
    return clean;
  }

  if (KNOWN_ACCOUNT_MAP[clean]) {
    return KNOWN_ACCOUNT_MAP[clean];
  }

  // 1. Try finding in Supabase public.profiles table by username, full_name or email prefix
  try {
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('email, full_name, username')
      .or(`username.ilike.${clean},email.ilike.${clean}@%,full_name.ilike.${clean},full_name.ilike.%${clean}%`)
      .limit(1);

    if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
      return matchedProfiles[0].email.toLowerCase();
    }
  } catch (err) {
    console.warn('Profile username lookup notice:', err);
  }

  // 2. Default: If a username without @ is entered, treat as a Gmail handle (e.g. "ruthwikpatel08" -> "ruthwikpatel08@gmail.com")
  return `${clean}@gmail.com`;
}

/**
 * Centralized Supabase Auth error message translator.
 * Converts raw internal Supabase Auth errors into user-friendly production messages.
 */
export function getAuthErrorMessage(err: any, email?: string): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const msg = (err.message || err.error_description || String(err)).toLowerCase();

  // 1. Email not confirmed
  if (msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('unconfirmed')) {
    return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
  }

  // 2. Invalid credentials (do NOT block with "registered with Google" - allow user to proceed with password)
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('invalid email or password')
  ) {
    return 'Incorrect email, username, or password. Please verify your details or use "Forgot password?".';
  }

  // 3. User already registered
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
    return 'An account with this email already exists. Please log in with your credentials.';
  }

  // 4. Password requirements
  if (msg.includes('password') && (msg.includes('short') || msg.includes('at least') || msg.includes('characters'))) {
    return 'Password must be at least 6 characters long.';
  }

  // 6. Provider not enabled in Supabase
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled') || msg.includes('provider_disabled')) {
    return 'Google Sign-In is not enabled yet in your Supabase project. In your Supabase Dashboard, go to Authentication -> Providers -> Google and toggle it ON with your Google Client ID/Secret, or sign in with email and password.';
  }

  // 7. Rate limits
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Email rate limit exceeded by Supabase. You can confirm your user directly in Supabase Dashboard (Authentication -> Users -> click "..." -> Confirm user), or turn off "Confirm email" in Supabase Auth settings.';
  }

  // 8. Network / Connection errors
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
    return 'Unable to reach the authentication service. Please check your internet connection and try again.';
  }

  // Clean fallback
  return err.message || 'Unable to complete authentication. Please try again.';
}

// ============================================================================
// CONNECTIONS SYSTEM
// ============================================================================

export interface ConnectionStatusInfo {
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  isSender: boolean;
  isReceiver: boolean;
  connectionId: string | null;
}

export interface UserConnectionsData {
  connections: any[];
  connectedIds: Set<string>;
  statusMap: Map<string, string>;
  connInfoMap: Map<string, ConnectionStatusInfo>;
  count: number;
}

const userConnectionsCache = new Map<string, { data: UserConnectionsData; expiresAt: number }>();
const inFlightConnectionsRequests = new Map<string, Promise<UserConnectionsData>>();
const CONNECTIONS_CACHE_TTL_MS = 45000; // 45 seconds safe client cache

export function invalidateUserConnectionsCache(userId?: string): void {
  if (userId) {
    userConnectionsCache.delete(userId);
    inFlightConnectionsRequests.delete(userId);
  } else {
    userConnectionsCache.clear();
    inFlightConnectionsRequests.clear();
  }
}

export const isUUID = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function resolveUserIdToUUID(identifier?: string | null): Promise<string | null> {
  if (!identifier) return null;
  if (isUUID(identifier)) return identifier;
  const clean = identifier.toLowerCase().trim().replace(/^@/, '');
  if (clean === 'ruthwikpatel08' || clean === 'ruthwik' || clean.includes('ruthwik9595')) {
    return 'b669157c-4d30-42f4-a8bf-4e27dc425e00';
  }
  if (clean === 'gokulvamshi' || clean === 'gokul' || clean.includes('gokulvamshi.workspace')) {
    return '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba';
  }
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`username.ilike.${clean},full_name.ilike.%${clean}%,email.ilike.%${clean}%`)
      .limit(1)
      .maybeSingle();
    if (p?.user_id && isUUID(p.user_id)) {
      return p.user_id;
    }
  } catch {}
  return null;
}

/**
 * Single source of truth for user connections:
 * Fetches all connections for a user from Supabase with in-memory caching and in-flight request deduplication.
 */
export async function fetchUserConnections(userId: string, forceRefresh = false): Promise<UserConnectionsData> {
  if (!userId) {
    return { connections: [], connectedIds: new Set(), statusMap: new Map(), connInfoMap: new Map(), count: 0 };
  }

  let targetUuid: string | null = userId;
  if (!isUUID(targetUuid)) {
    targetUuid = await resolveUserIdToUUID(userId);
  }
  const lookupId = targetUuid || userId;

  if (!forceRefresh) {
    const cached = userConnectionsCache.get(lookupId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  if (inFlightConnectionsRequests.has(lookupId)) {
    return inFlightConnectionsRequests.get(lookupId)!;
  }

  const fetchPromise = (async (): Promise<UserConnectionsData> => {
    try {
      const { data: conns, error } = await supabase
        .from('connections')
        .select('*')
        .or(`sender_id.eq.${lookupId},receiver_id.eq.${lookupId}`);

      const connectionList = (conns || []) as any[];
      const connectedIds = new Set<string>();
      const statusMap = new Map<string, string>();
      const connInfoMap = new Map<string, ConnectionStatusInfo>();
      let count = 0;

      for (const c of connectionList) {
        const otherId = c.sender_id === lookupId ? c.receiver_id : c.sender_id;
        if (otherId) {
          statusMap.set(otherId, c.status);
          connInfoMap.set(otherId, {
            status: c.status as any,
            isSender: c.sender_id === lookupId,
            isReceiver: c.receiver_id === lookupId,
            connectionId: c.id,
          });
          if (c.status === 'ACCEPTED') {
            count++;
            connectedIds.add(otherId);
          }
        }
      }

      // Only fallback to backend connections if Supabase request encountered an error (offline / network failure)
      if (error && connectionList.length === 0) {
        try {
          const apiConns = await api.getConnections().catch(() => null);
          if (apiConns && Array.isArray(apiConns.connections)) {
            apiConns.connections.forEach((conn: any) => {
              const otherId = conn.userId || conn.user?.id || (conn.senderId === lookupId ? conn.receiverId : conn.senderId);
              if (otherId && otherId !== lookupId) {
                connectedIds.add(otherId);
                statusMap.set(otherId, 'ACCEPTED');
                connInfoMap.set(otherId, {
                  status: 'ACCEPTED',
                  isSender: conn.senderId === lookupId,
                  isReceiver: conn.receiverId === lookupId,
                  connectionId: conn.id || null,
                });
              }
            });
            count = connectedIds.size;
          }
        } catch {}
      }

      const result: UserConnectionsData = {
        connections: connectionList,
        connectedIds,
        statusMap,
        connInfoMap,
        count,
      };

      userConnectionsCache.set(lookupId, { data: result, expiresAt: Date.now() + CONNECTIONS_CACHE_TTL_MS });
      return result;
    } catch (err) {
      console.warn('Error fetching user connections:', err);
      return { connections: [], connectedIds: new Set(), statusMap: new Map(), connInfoMap: new Map(), count: 0 };
    }
  })().finally(() => {
    inFlightConnectionsRequests.delete(lookupId);
  });

  inFlightConnectionsRequests.set(lookupId, fetchPromise);
  return fetchPromise;
}

/**
 * Fetches the connection status between two users from Supabase with caching.
 */
export async function fetchConnectionStatus(
  currentUserId: string,
  targetUserId: string,
  forceRefresh = false
): Promise<ConnectionStatusInfo> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: null, isSender: false, isReceiver: false, connectionId: null };
  }

  let u2: string | null = targetUserId;
  if (!isUUID(u2)) {
    u2 = await resolveUserIdToUUID(u2);
  }
  const targetId = u2 || targetUserId;

  const connData = await fetchUserConnections(currentUserId, forceRefresh);
  const info = connData.connInfoMap.get(targetId);
  if (info) return info;

  // Fallback to backend API
  try {
    const backendProfile = await api.getUser(targetId);
    if (backendProfile?.connectionStatus) {
      return backendProfile.connectionStatus;
    }
  } catch {}

  return { status: null, isSender: false, isReceiver: false, connectionId: null };
}

/**
 * Fetches the exact count of accepted connections for a user from Supabase with caching.
 */
export async function fetchConnectionCount(userId: string, forceRefresh = false): Promise<number> {
  if (!userId) return 0;
  const connData = await fetchUserConnections(userId, forceRefresh);
  return connData.count;
}

/**
 * Sends a connection request from sender to receiver in Supabase.
 */
export async function sendConnectionRequest(
  senderId: string,
  receiverId: string,
  note?: string
): Promise<{ success: boolean; connection?: any; alreadyConnected?: boolean; message?: string }> {
  if (!senderId || !receiverId) {
    throw new Error('Sender and receiver IDs are required.');
  }
  if (senderId === receiverId) {
    throw new Error('You cannot connect with your own profile.');
  }

  // Check if an existing connection exists
  const { data: existingConns } = await supabase
    .from('connections')
    .select('*')
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    );

  const existing = existingConns && existingConns[0];
  let connection: any = null;

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      return { success: true, alreadyConnected: true, message: 'You are already connected.' };
    }
    // If pending from the other person, accept it!
    if (existing.status === 'PENDING' && existing.receiver_id === senderId) {
      return respondConnectionRequest(existing.id, 'ACCEPT', senderId);
    }
    // Otherwise update to pending and update note
    const { data: updated, error: updErr } = await supabase
      .from('connections')
      .update({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'PENDING',
        note: note ? note.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updErr) {
      throw new Error(updErr.message || 'Unable to send connection request. Please try again.');
    }
    connection = updated;
  } else {
    // Create new connection row
    const { data: created, error: insErr } = await supabase
      .from('connections')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'PENDING',
        note: note ? note.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr) {
      throw new Error(insErr.message || 'Unable to send connection request. Please try again.');
    }
    connection = created;
  }

  // Send notification to receiver
  try {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', senderId)
      .maybeSingle();
    const senderName = senderProfile?.full_name || 'A startup builder';

    await supabase.from('notifications').insert({
      user_id: receiverId,
      sender_id: senderId,
      type: 'CONNECTION_REQUEST',
      title: 'New Connection Request 🤝',
      message: `${senderName} wants to connect with you.${note?.trim() ? ` Note: "${note.trim()}"` : ''}`,
      link: '/network?tab=PENDING',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch {}

  // Mirror to backend API
  try {
    api.sendConnection({ receiverId, note }).catch(() => {});
  } catch {}

  invalidateUserConnectionsCache(senderId);
  invalidateUserConnectionsCache(receiverId);

  return { success: true, connection, message: 'Connection request sent' };
}

/**
 * Responds to a connection request (ACCEPT or REJECT) in Supabase.
 */
export async function respondConnectionRequest(
  connectionId: string,
  action: 'ACCEPT' | 'REJECT',
  currentUserId: string
): Promise<{ success: boolean; connection?: any; message?: string }> {
  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

  // 1. Fetch connection to verify receiver and retrieve sender
  const { data: conn, error: getErr } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (getErr || !conn) {
    throw new Error('Connection request not found.');
  }

  if (conn.receiver_id !== currentUserId) {
    throw new Error('Unauthorized to respond to this connection request.');
  }

  // 2. Update status in Supabase
  const { data: updated, error: updErr } = await supabase
    .from('connections')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select()
    .single();

  if (updErr) {
    throw new Error(updErr.message || `Unable to ${action.toLowerCase()} connection request.`);
  }

  // 3. If accepted, notify sender and ensure conversation exists
  if (action === 'ACCEPT') {
    try {
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUserId)
        .maybeSingle();
      const receiverName = receiverProfile?.full_name || 'A founder';

      await supabase.from('notifications').insert({
        user_id: conn.sender_id,
        sender_id: currentUserId,
        type: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted! 🤝',
        message: `${receiverName} accepted your connection request. Start a conversation!`,
        link: `/messages?user=${currentUserId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch {}

    // Ensure conversation exists between the two users
    try {
      const [p1, p2] = [conn.sender_id, conn.receiver_id].sort();
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from('conversations').insert({
          participant1_id: p1,
          participant2_id: p2,
          last_message: 'Connected! Say hello and start collaborating.',
          last_message_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  // Mark all related CONNECTION_REQUEST notifications as read in Supabase
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('sender_id', conn.sender_id)
      .eq('type', 'CONNECTION_REQUEST');
  } catch {}

  // Mirror to backend
  try {
    api.respondConnection(connectionId, action).catch(() => {});
  } catch {}

  invalidateUserConnectionsCache(currentUserId);
  invalidateUserConnectionsCache(conn.sender_id);

  return {
    success: true,
    connection: updated,
    message: action === 'ACCEPT' ? 'Connection request accepted' : 'Connection request declined',
  };
}

/**
 * Removes a connection in Supabase and backend for both users.
 */
export async function removeConnection(
  connectionId: string,
  currentUserId: string,
  targetUserId?: string
): Promise<boolean> {
  // 1. Delete in Supabase by connection ID
  try {
    if (connectionId) {
      await supabase.from('connections').delete().eq('id', connectionId);
    }
  } catch (err) {
    console.warn('Supabase delete connection notice:', err);
  }

  // 2. Also delete in Supabase by user ID pair if targetUserId is known
  if (targetUserId && currentUserId) {
    try {
      const u1 = isUUID(currentUserId) ? currentUserId : await resolveUserIdToUUID(currentUserId);
      const u2 = isUUID(targetUserId) ? targetUserId : await resolveUserIdToUUID(targetUserId);

      await supabase
        .from('connections')
        .delete()
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

      if (u1 && u2 && (u1 !== currentUserId || u2 !== targetUserId)) {
        await supabase
          .from('connections')
          .delete()
          .or(`and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`);
      }

      // Also clean up any lingering notifications between these two users
      await supabase
        .from('notifications')
        .delete()
        .or(`and(user_id.eq.${currentUserId},sender_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},sender_id.eq.${currentUserId})`)
        .in('type', ['CONNECTION_REQUEST', 'CONNECTION_ACCEPTED']);
    } catch (err) {
      console.warn('Supabase pair delete notice:', err);
    }
  }

  // 3. Mirror to backend API
  try {
    const idToPass = connectionId || targetUserId;
    if (idToPass) {
      const q = targetUserId ? `?targetUserId=${targetUserId}` : '';
      await api.removeConnection(`${idToPass}${q}`);
    }
  } catch (err) {
    console.warn('Backend API removeConnection notice:', err);
  }

  // 4. Invalidate cache for BOTH users and clear all user connection caches
  invalidateUserConnectionsCache(currentUserId);
  if (targetUserId) {
    invalidateUserConnectionsCache(targetUserId);
  }
  userConnectionsCache.clear();
  inFlightConnectionsRequests.clear();

  // 5. Broadcast removal over Supabase realtime channel so the other user's browser updates immediately
  try {
    const broadcastChannel = supabase.channel('global-connections-broadcast');
    await broadcastChannel.send({
      type: 'broadcast',
      event: 'connection_changed',
      payload: {
        userId: currentUserId,
        targetUserId,
        connectionId,
        action: 'REMOVED',
        timestamp: new Date().toISOString(),
      },
    });
    supabase.removeChannel(broadcastChannel);
  } catch {}

  return true;
}

// ============================================================================
// MESSAGING & CONVERSATIONS SYSTEM
// ============================================================================

const DELETED_CHATS_PREFIX = 'hookz_deleted_chats_';

/**
 * Returns set of conversation IDs deleted by a given user
 */
export function getDeletedConversationIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${DELETED_CHATS_PREFIX}${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Records a conversation as permanently deleted for a specific user
 */
export function recordDeletedConversation(userId: string, conversationId: string): void {
  if (!userId || !conversationId) return;
  try {
    const set = getDeletedConversationIds(userId);
    set.add(conversationId);
    localStorage.setItem(`${DELETED_CHATS_PREFIX}${userId}`, JSON.stringify(Array.from(set)));
  } catch {}
}

/**
 * Restores a conversation when new messages are exchanged
 */
export function unhideConversation(userId: string, conversationId: string): void {
  if (!userId || !conversationId) return;
  try {
    const set = getDeletedConversationIds(userId);
    if (set.has(conversationId)) {
      set.delete(conversationId);
      localStorage.setItem(`${DELETED_CHATS_PREFIX}${userId}`, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

/**
 * Fetches all conversations for the user from Supabase.
 * Deduplicates by participant ID so each account appears only once.
 */
export async function getSupabaseConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];

  const deletedIds = getDeletedConversationIds(userId);

  const { data: convRows, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error || !convRows || convRows.length === 0) {
    return [];
  }

  // Deduplicate by other participant ID so that each account only appears ONCE
  const deduplicatedRows: any[] = [];
  const seenOtherUsers = new Set<string>();
  for (const c of convRows) {
    // If deleted by this user, do not show in user's chat list
    if (deletedIds.has(c.id)) continue;

    const otherId = c.participant1_id === userId ? c.participant2_id : c.participant1_id;
    if (!otherId || seenOtherUsers.has(otherId)) continue;
    seenOtherUsers.add(otherId);
    deduplicatedRows.push(c);
  }

  const otherIds = Array.from(seenOtherUsers);
  if (otherIds.length === 0) return [];

  // Fetch profiles for all other participants and unread counts in parallel
  const [{ data: profileRows }, { data: unreadRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar, headline, email, preferred_role, created_at')
      .in('user_id', otherIds),
    supabase
      .from('messages')
      .select('conversation_id')
      .eq('receiver_id', userId)
      .eq('is_read', false),
  ]);

  const profileMap = new Map((profileRows || []).map((p) => [p.user_id, p]));

  const unreadMap = new Map<string, number>();
  (unreadRows || []).forEach((r) => {
    unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) || 0) + 1);
  });

  return deduplicatedRows.map((c) => {
    const otherId = c.participant1_id === userId ? c.participant2_id : c.participant1_id;
    const p = profileMap.get(otherId);
    const otherUser: User = {
      id: otherId,
      email: p?.email || '',
      role: (p?.preferred_role || 'FOUNDER') as any,
      isVerified: true,
      isSuspended: false,
      isAdmin: false,
      createdAt: (p as any)?.created_at || new Date().toISOString(),
      profile: {
        id: p?.id || otherId,
        userId: otherId,
        fullName: p?.full_name || 'Startup Builder',
        avatar: p?.avatar || null,
        headline: p?.headline || '',
      } as any,
    };

    return {
      id: c.id,
      participant1Id: c.participant1_id,
      participant2Id: c.participant2_id,
      participant: otherUser,
      lastMessage: c.last_message || '',
      lastMessageAt: c.last_message_at || c.created_at,
      unreadCount: unreadMap.get(c.id) || 0,
    };
  });
}

/**
 * Fetches total count of unread messages for a given user.
 */
export async function fetchUnreadMessagesCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Marks unread messages in a conversation as read.
 */
export async function markMessagesAsRead(conversationId: string, currentUserId: string): Promise<void> {
  if (!conversationId || !currentUserId || conversationId === 'draft') return;
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', currentUserId)
      .eq('is_read', false);

    if (!error && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('startupz_messages_updated', { detail: { conversationId } }));
    }
  } catch {}
}

/**
 * Fetches all messages in a conversation from Supabase.
 */
export async function getSupabaseMessages(
  conversationId: string,
  _currentUserId?: string
): Promise<Message[]> {
  if (!conversationId || conversationId === 'draft') return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.warn('Error fetching Supabase messages:', error);
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    isRead: m.is_read,
    createdAt: m.created_at,
  }));
}

/**
 * Ensures a valid conversation row exists in Supabase public.conversations
 * between userA and userB, and returns its valid UUID id.
 */
export async function ensureSupabaseConversationId(
  userA: string,
  userB: string,
  hintConversationId?: string
): Promise<string> {
  if (!userA || !userB || userA === userB) {
    throw new Error('Invalid participants for conversation.');
  }

  // 1. If a hint is provided and not draft, verify if it actually exists in Supabase
  if (hintConversationId && hintConversationId !== 'draft') {
    try {
      const { data: checkData } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', hintConversationId)
        .maybeSingle();

      if (checkData?.id) {
        return checkData.id;
      }
    } catch {
      // Continue to search by participant IDs
    }
  }

  // 2. Search for existing conversation between userA and userB regardless of order
  const [p1, p2] = [userA, userB].sort();

  try {
    const { data: found } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant1_id.eq.${p1},participant2_id.eq.${p2}),and(participant1_id.eq.${p2},participant2_id.eq.${p1})`)
      .maybeSingle();

    if (found?.id) {
      return found.id;
    }
  } catch {}

  // Also query without compound syntax in case of PostgREST filter limitation
  try {
    const { data: fallbackList } = await supabase
      .from('conversations')
      .select('id, participant1_id, participant2_id')
      .or(`participant1_id.eq.${userA},participant2_id.eq.${userA}`);

    const existing = (fallbackList || []).find(
      (c) =>
        (c.participant1_id === userA && c.participant2_id === userB) ||
        (c.participant1_id === userB && c.participant2_id === userA)
    );

    if (existing?.id) {
      return existing.id;
    }
  } catch {}

  // 3. Create a new conversation row in Supabase
  try {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        participant1_id: p1,
        participant2_id: p2,
        last_message: 'Started conversation',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (newConv?.id) {
      return newConv.id;
    }
  } catch {}

  // 4. If insert failed (e.g. race condition or unique constraint), query once more
  const { data: refetched } = await supabase
    .from('conversations')
    .select('id, participant1_id, participant2_id')
    .or(`participant1_id.eq.${userA},participant2_id.eq.${userA}`);

  const match = (refetched || []).find(
    (c) =>
      (c.participant1_id === userA && c.participant2_id === userB) ||
      (c.participant1_id === userB && c.participant2_id === userA)
  );

  if (match?.id) {
    return match.id;
  }

  throw new Error('Unable to establish conversation in database.');
}

/**
 * Sends a message in Supabase persistently.
 */
export async function sendSupabaseMessage(
  senderId: string,
  receiverId: string,
  content: string,
  existingConversationId?: string
): Promise<{ message: Message; conversationId: string }> {
  const text = content.trim();
  if (!text) throw new Error('Message content cannot be empty.');
  if (senderId === receiverId) throw new Error('Cannot message yourself.');

  // Always ensure a valid existing conversation record in Supabase
  const finalConvId = await ensureSupabaseConversationId(senderId, receiverId, existingConversationId);

  // 2. Insert message into Supabase messages table
  const { data: newMsg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: finalConvId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: text,
      is_read: false,
    })
    .select('*')
    .single();

  if (msgErr || !newMsg) {
    // If Supabase insert failed, attempt backend API as reliable sync fallback
    try {
      const apiRes = await api.sendMessage({ receiverId, content: text });
      if (apiRes) {
        const fallbackMsg: Message = {
          id: (apiRes as any).id || (apiRes as any).data?.id || `msg-${Date.now()}`,
          conversationId: finalConvId,
          senderId,
          receiverId,
          content: text,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        return { message: fallbackMsg, conversationId: finalConvId };
      }
    } catch {}

    throw new Error(msgErr?.message || 'Unable to send message. Please try again.');
  }

  // 3. Update conversation last_message and last_message_at
  try {
    await supabase
      .from('conversations')
      .update({
        last_message: text,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', finalConvId);
  } catch {}

  // 4. Notify message update listeners in realtime
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('startupz_messages_updated', { detail: { conversationId: finalConvId } }));
  }

  // 5. Unhide conversation if previously hidden
  unhideConversation(senderId, finalConvId);
  unhideConversation(receiverId, finalConvId);

  // 6. Mirror to backend in background
  try {
    api.sendMessage({ receiverId, content: text }).catch(() => {});
  } catch {}

  const formattedMsg: Message = {
    id: newMsg.id,
    conversationId: finalConvId,
    senderId: newMsg.sender_id,
    receiverId: newMsg.receiver_id,
    content: newMsg.content,
    isRead: newMsg.is_read,
    createdAt: newMsg.created_at,
  };

  return { message: formattedMsg, conversationId: finalConvId };
}

/**
 * Permanently deletes a conversation for the current user ("Delete for me").
 * The friend's account will continue to show the conversation and its history
 * until the friend also deletes it.
 */
export async function deleteSupabaseConversation(
  conversationId: string,
  currentUserId: string
): Promise<boolean> {
  if (!conversationId || !currentUserId) return false;

  // 1. Mark permanently deleted in client storage for this user
  recordDeletedConversation(currentUserId, conversationId);

  // 2. Mirror delete to backend API ("delete for me")
  try {
    await api.deleteConversation(conversationId).catch(() => {});
  } catch {}

  // 3. Dispatch event so UI and open tabs refresh immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('startupz_messages_updated', {
        detail: { conversationId, deletedForUser: currentUserId },
      })
    );
  }

  return true;
}

/**
 * Unsend message (deletes message for everyone, like Instagram)
 */
export async function unsendSupabaseMessage(
  messageId: string,
  _currentUserId?: string
): Promise<boolean> {
  if (!messageId) return false;

  try {
    await supabase.from('messages').delete().eq('id', messageId);
  } catch (err) {
    console.warn('Supabase unsend message error:', err);
  }

  try {
    await api.unsendMessage(messageId).catch(() => {});
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('startupz_messages_updated', {
        detail: { messageId, unsent: true },
      })
    );
  }

  return true;
}

/**
 * Edit message (updates content for everyone, like Instagram)
 */
export async function editSupabaseMessage(
  messageId: string,
  newContent: string,
  _currentUserId?: string
): Promise<boolean> {
  if (!messageId || !newContent.trim()) return false;
  const trimmed = newContent.trim();

  try {
    await supabase
      .from('messages')
      .update({ content: trimmed })
      .eq('id', messageId);
  } catch (err) {
    console.warn('Supabase edit message error:', err);
  }

  try {
    await api.editMessage(messageId, trimmed).catch(() => {});
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('startupz_messages_updated', {
        detail: { messageId, edited: true },
      })
    );
  }

  return true;
}

