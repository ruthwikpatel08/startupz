import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '../types';
import { supabase, mapSupabaseToAppUser, fetchUserProfile, upsertUserProfile, recordAuthProviderHint } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('startupz_user');
      return cached ? JSON.parse(cached) : null;
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
            // No active Supabase session
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

      if (event === 'SIGNED_OUT' || !newSession) {
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
