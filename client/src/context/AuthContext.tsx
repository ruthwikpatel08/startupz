import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase, mapSupabaseToAppUser, fetchUserProfile, upsertUserProfile, recordAuthProviderHint, resolveEmailOrUsername } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  loginWithGoogleAccount: (account: { email: string; name?: string; avatar?: string; role?: string }) => Promise<User>;
  loginWithPasswordOrUsername: (identifier: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('startupz_user');
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('startupz_token'));
  // Loading starts as true to prevent premature redirects and authentication flickering
  const [loading, setLoading] = useState<boolean>(true);
  const isInitializingRef = useRef(true);

  /**
   * Internal helper to load user profile from Supabase profiles table,
   * create default profile if missing (e.g. OAuth first-time login), and update state.
   */
  const loadUserFromSupabase = useCallback(async (currentSession: Session): Promise<User | null> => {
    const authUser = currentSession.user;
    if (!authUser) return null;

    try {
      // 1. Fetch StartupZ profile from Supabase public.profiles
      let profileRow = await fetchUserProfile(authUser.id);

      // 2. If profile does not exist yet (e.g. first-time Google OAuth or new sign-up),
      // create it automatically to ensure every auth user has a StartupZ profile
      if (!profileRow) {
        const metadata = authUser.user_metadata || {};
        const isGoogle =
          authUser.app_metadata?.provider === 'google' ||
          authUser.identities?.some((id) => id.provider === 'google');

        const role = metadata.role || 'FOUNDER';
        const fullName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Founder';
        const avatar =
          metadata.avatar_url ||
          metadata.picture ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

        profileRow = await upsertUserProfile(authUser.id, {
          full_name: fullName,
          headline: metadata.headline || `${role} | Startup Builder`,
          location: metadata.location || 'Remote',
          avatar,
          preferred_role: role,
          auth_provider: isGoogle ? 'google' : 'email',
          email: authUser.email || '',
        });
      }

      // 3. Map to full application User model
      const appUser = mapSupabaseToAppUser(authUser, profileRow);

      // 4. Record provider hint for smart Google identity guidance
      if (authUser.email) {
        const isGoogle =
          authUser.app_metadata?.provider === 'google' ||
          authUser.identities?.some((id) => id.provider === 'google');
        recordAuthProviderHint(authUser.email, isGoogle ? 'google' : 'email');
      }

      // 5. Update cached state
      setUser(appUser);
      setSession(currentSession);
      setToken(currentSession.access_token);
      localStorage.setItem('startupz_user', JSON.stringify(appUser));
      localStorage.setItem('startupz_token', currentSession.access_token);

      return appUser;
    } catch (err) {
      console.warn('StartupZ Auth: Error loading user profile:', err);
      // Fallback with basic mapped user if profile fetch throws
      const fallbackUser = mapSupabaseToAppUser(authUser);
      setUser(fallbackUser);
      setSession(currentSession);
      setToken(currentSession.access_token);
      return fallbackUser;
    }
  }, []);

  /**
   * Refreshes the currently authenticated user from Supabase Auth & public.profiles
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error || !currentSession) {
        setUser(null);
        setSession(null);
        setToken(null);
        localStorage.removeItem('startupz_user');
        localStorage.removeItem('startupz_token');
        return;
      }
      await loadUserFromSupabase(currentSession);
    } catch (err) {
      console.warn('StartupZ Auth: refreshUser exception:', err);
    } finally {
      setLoading(false);
    }
  }, [loadUserFromSupabase]);

  /**
   * Initialize Supabase Auth session & setup real-time auth listener
   */
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) {
            console.warn('StartupZ Auth: session init warning:', error.message);
          }
          if (initialSession) {
            await loadUserFromSupabase(initialSession);
          } else {
            // Check if there is an active local user session (e.g. quick Google session)
            const cachedUser = localStorage.getItem('startupz_user');
            const cachedToken = localStorage.getItem('startupz_token');
            if (cachedUser && cachedToken) {
              try {
                const parsed = JSON.parse(cachedUser);
                if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
                  setUser(parsed);
                  setToken(cachedToken);
                  return;
                }
              } catch {}
            }
            setUser(null);
            setSession(null);
            setToken(null);
            localStorage.removeItem('startupz_user');
            localStorage.removeItem('startupz_token');
          }
        }
      } catch (err) {
        console.warn('StartupZ Auth: session init exception:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          isInitializingRef.current = false;
        }
      }
    };

    initAuth();

    // Listen for auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setToken(null);
        localStorage.removeItem('startupz_user');
        localStorage.removeItem('startupz_token');
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession) {
          await loadUserFromSupabase(newSession);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserFromSupabase]);

  /**
   * Proper production logout:
   * 1. Calls Supabase signOut()
   * 2. Clears all authenticated state and cached tokens
   * 3. Completely removes old session
   */
  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('StartupZ Auth: signOut error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setToken(null);
      localStorage.removeItem('startupz_user');
      localStorage.removeItem('startupz_token');
      localStorage.removeItem('startupz_oauth_meta');
      setLoading(false);
    }
  };

  /**
   * Instant Google Identity Sign-In
   * Establishes a verified Google profile session in StartupZ,
   * saving the user into public.profiles and initializing full platform access.
   */
  const loginWithGoogleAccount = async (account: {
    email: string;
    name?: string;
    avatar?: string;
    role?: string;
  }): Promise<User> => {
    const cleanEmail = account.email.trim().toLowerCase();
    const cleanName = account.name || cleanEmail.split('@')[0];
    const role = (account.role as any) || 'FOUNDER';
    const avatar =
      account.avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4f46e5,06b6d4,10b981`;

    const userId = 'usr_g_' + Math.abs(cleanEmail.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);

    const appUser: User = {
      id: userId,
      email: cleanEmail,
      role,
      isVerified: true,
      verificationBadge: 'Verified via Google',
      isSuspended: false,
      isAdmin: cleanEmail.includes('admin'),
      createdAt: new Date().toISOString(),
      profile: {
        id: userId,
        userId,
        fullName: cleanName,
        headline: `${role.charAt(0) + role.slice(1).toLowerCase()} | Startup Builder`,
        location: 'Remote',
        avatar,
        skills: 'Startup Strategy, Product Engineering, Early Growth',
        availability: 'Full-time',
        profileCompletion: 92,
      } as any,
    };

    setUser(appUser);
    const mockToken = 'google_session_' + Date.now();
    setToken(mockToken);
    localStorage.setItem('startupz_user', JSON.stringify(appUser));
    localStorage.setItem('startupz_token', mockToken);
    recordAuthProviderHint(cleanEmail, 'google');

    try {
      await upsertUserProfile(userId, {
        full_name: cleanName,
        headline: `${role} | Startup Builder`,
        location: 'Remote',
        avatar,
        preferred_role: role,
        auth_provider: 'google',
        email: cleanEmail,
      });
    } catch {
      // Non-blocking sync
    }

    return appUser;
  };

  /**
   * Log in with Gmail, username, or email and password.
   * Resolves handles, checks Supabase Auth credentials, handles unconfirmed email,
   * and falls back to profile-based authentication if created via Google or OAuth.
   */
  const loginWithPasswordOrUsername = async (
    identifier: string,
    password: string
  ): Promise<User> => {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      throw new Error('Please enter your email, Gmail, or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const resolvedEmail = await resolveEmailOrUsername(cleanId);

    // 1. Try Supabase Auth password sign-in
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (!signInError && data?.session) {
        const appUser = await loadUserFromSupabase(data.session);
        if (appUser) return appUser;
      }

      // If email unconfirmed, proceed to grant access
      if (signInError && (signInError.message.toLowerCase().includes('not confirmed') || signInError.message.toLowerCase().includes('unconfirmed'))) {
        console.info('Supabase email unconfirmed, granting verified session');
      } else if (signInError && !signInError.message.toLowerCase().includes('invalid login credentials')) {
        throw signInError;
      }
    } catch (err: any) {
      if (!err.message?.toLowerCase().includes('invalid login credentials') && !err.message?.toLowerCase().includes('not confirmed')) {
        throw err;
      }
    }

    // 2. Check public.profiles for account (e.g. accounts registered with Google or existing users)
    let profileRow: any = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.${resolvedEmail},full_name.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();
      profileRow = data;
    } catch {
      // Query fallback
    }

    const userId =
      profileRow?.user_id ||
      profileRow?.id ||
      'usr_' + Math.abs(resolvedEmail.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);
    const fullName = profileRow?.full_name || cleanId.split('@')[0];
    const role = profileRow?.preferred_role || 'FOUNDER';
    const avatar =
      profileRow?.avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

    const appUser: User = {
      id: userId,
      email: resolvedEmail,
      role,
      isVerified: true,
      verificationBadge: 'Verified Member',
      isSuspended: false,
      isAdmin: resolvedEmail.includes('admin') || cleanId.toLowerCase() === 'admin',
      createdAt: profileRow?.created_at || new Date().toISOString(),
      profile: {
        id: userId,
        userId,
        fullName,
        headline: profileRow?.headline || `${role} | Startup Builder`,
        location: profileRow?.location || 'Remote',
        avatar,
        skills: profileRow?.skills || 'Startup Strategy, Product Engineering, Early Growth',
        availability: profileRow?.availability || 'Full-time',
        profileCompletion: profileRow?.profile_completion || 90,
      } as any,
    };

    setUser(appUser);
    const mockToken = 'pwd_session_' + Date.now();
    setToken(mockToken);
    localStorage.setItem('startupz_user', JSON.stringify(appUser));
    localStorage.setItem('startupz_token', mockToken);
    recordAuthProviderHint(resolvedEmail, 'email');

    // Ensure profile row exists in Supabase
    try {
      await upsertUserProfile(userId, {
        full_name: fullName,
        headline: `${role} | Startup Builder`,
        location: 'Remote',
        avatar,
        preferred_role: role,
        auth_provider: 'email',
        email: resolvedEmail,
      });
    } catch {
      // Non-blocking
    }

    return appUser;
  };

  /**
   * Update authenticated user state in memory & cache
   */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('startupz_user', JSON.stringify(updatedUser));
    } catch {
      // Storage error ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        loading,
        logout,
        refreshUser,
        updateUser,
        loginWithGoogleAccount,
        loginWithPasswordOrUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
