import { createClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, Profile, UserRole } from '../types';

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
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

  const profile: Profile = {
    id: profileRow?.id || authUser.id,
    userId: authUser.id,
    fullName,
    headline: profileRow?.headline || metadata.headline || `${role} | Startup Builder`,
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
    createdAt: profileRow?.created_at || authUser.created_at,
    updatedAt: profileRow?.updated_at || authUser.updated_at,
  };

  return {
    id: authUser.id,
    email: authUser.email || '',
    role,
    isVerified: !!authUser.email_confirmed_at || isGoogle,
    verificationBadge: isGoogle ? 'Verified via Google' : (authUser.email_confirmed_at ? 'Verified Member' : null),
    isSuspended: false,
    isAdmin: metadata.isAdmin === true || metadata.role === 'ADMIN' || authUser.email === 'admin@startupz.com',
    createdAt: authUser.created_at,
    updatedAt: authUser.updated_at,
    profile,
  };
}

/**
 * Fetch a profile row from Supabase public.profiles by user UUID.
 */
export async function fetchUserProfile(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Network exception fetching profile:', err);
    return null;
  }
}

/**
 * Upsert or create a user profile in Supabase public.profiles table.
 */
export async function upsertUserProfile(
  userId: string,
  profileData: Partial<{
    full_name: string;
    headline: string;
    location: string;
    bio: string;
    avatar: string;
    skills: string;
    startup_interests: string;
    industries: string;
    preferred_role: string;
    availability: string;
    startup_experience: string;
    achievements: string;
    education: string;
    github_url: string;
    linkedin_url: string;
    website_url: string;
    open_to: string;
    profile_completion: number;
    auth_provider: string;
    email: string;
  }>
): Promise<any | null> {
  try {
    // Check if profile exists first for clean upsert
    const existing = await fetchUserProfile(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.warn('Error updating profile in Supabase:', error.message);
        return existing;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          ...profileData,
        })
        .select()
        .single();

      if (error) {
        console.warn('Error creating profile in Supabase:', error.message);
        return null;
      }
      return data;
    }
  } catch (err) {
    console.warn('Exception during profile upsert:', err);
    return null;
  }
}

/**
 * Centralized Supabase Auth error message translator.
 * Converts raw internal Supabase Auth errors into user-friendly production messages.
 */
export function getAuthErrorMessage(err: any, email?: string): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const msg = (err.message || err.error_description || String(err)).toLowerCase();
  const normalizedEmail = (email || '').trim().toLowerCase();

  // 1. Email not confirmed
  if (msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('unconfirmed')) {
    return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
  }

  // 2. Google OAuth / Provider conflict check
  const providerHint = normalizedEmail ? getAuthProviderHint(normalizedEmail) : null;
  if (providerHint === 'google' && (msg.includes('invalid login credentials') || msg.includes('invalid_grant'))) {
    return 'This email is registered with Google. Please click "Continue with Google" to sign in.';
  }

  // 3. Invalid credentials
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('invalid email or password')
  ) {
    return 'Incorrect email or password. Please verify your details or use "Forgot password?".';
  }

  // 4. User already registered
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
    if (providerHint === 'google') {
      return 'An account with this email already exists using Google. Please click "Continue with Google" to sign in.';
    }
    return 'An account with this email already exists. Please log in with your credentials.';
  }

  // 5. Password requirements
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
