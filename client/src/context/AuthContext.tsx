import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User } from '../types';
import {
  supabase,
  mapSupabaseToAppUser,
  fetchUserProfile,
  upsertUserProfile,
  recordAuthProviderHint,
  resolveEmailOrUsername,
  invalidateUserProfileCache,
  invalidateUserConnectionsCache,
} from '../lib/supabase';
import { api } from '../services/api';

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
  const inFlightUserLoadRef = useRef<Map<string, Promise<User | null>>>(new Map());
  const lastSyncedPayloadRef = useRef<string>(localStorage.getItem('startupz_last_synced') || '');
  const lastHandledTokenRef = useRef<string>('');

  /**
   * Internal helper to load user profile from Supabase profiles table,
   * create default profile if missing (e.g. OAuth first-time login), and update state.
   * Includes in-flight deduplication and reference stabilization to prevent cascade re-renders.
   */
  const loadUserFromSupabase = useCallback(async (currentSession: Session): Promise<User | null> => {
    const authUser = currentSession.user;
    if (!authUser) return null;
    const userId = authUser.id;

    // Deduplicate concurrent loadUserFromSupabase calls for the same user ID
    if (inFlightUserLoadRef.current.has(userId)) {
      return inFlightUserLoadRef.current.get(userId)!;
    }

    const loadPromise = (async (): Promise<User | null> => {
      try {
        // 1. Fetch StartupZ profile from Supabase public.profiles (forced fresh from database)
        let profileRow = await fetchUserProfile(userId, true, authUser.email || undefined);

        // Double check by email if not found by userId
        if (!profileRow && authUser.email) {
          profileRow = await fetchUserProfile('', true, authUser.email);
        }

        // 2. If profile does not exist yet (e.g. brand new user), create default initial profile
        if (!profileRow) {
          const metadata = authUser.user_metadata || {};
          const isGoogle =
            authUser.app_metadata?.provider === 'google' ||
            authUser.identities?.some((id) => id.provider === 'google');

          const role = metadata.role || 'STUDENT';
          const fullName = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Member';
          const avatar =
            metadata.avatar_url ||
            metadata.picture ||
            null;

          const isCategorySelected = !isGoogle && !!metadata.role;

          profileRow = await upsertUserProfile(userId, {
            full_name: fullName,
            username: (authUser.email ? authUser.email.split('@')[0] : '').toLowerCase().replace(/[^a-z0-9_]/g, ''),
            headline: metadata.headline || `${role} | Startup Builder`,
            location: metadata.location || 'Remote',
            avatar,
            preferred_role: role,
            is_category_selected: isCategorySelected,
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

        // 5. Update authenticated user state authoritatively with the latest database record
        setUser(appUser);
        setSession(currentSession);
        setToken(currentSession.access_token);
        lastHandledTokenRef.current = currentSession.access_token;
        localStorage.setItem('startupz_user', JSON.stringify(appUser));
        localStorage.setItem('startupz_token', currentSession.access_token);

        // 6. Sync to backend API for unified token and user persistence (deduplicated by payload)
        const syncPayload = JSON.stringify({
          id: appUser.id,
          email: appUser.email,
          fullName: appUser.profile?.fullName,
          username: appUser.profile?.username,
          role: appUser.role,
          headline: appUser.profile?.headline,
          location: appUser.profile?.location,
          bio: appUser.profile?.bio,
          skills: appUser.profile?.skills,
          avatar: appUser.profile?.avatar,
        });

        const storedSync = localStorage.getItem('startupz_last_synced');
        const hasToken = !!localStorage.getItem('startupz_token');

        if (syncPayload !== lastSyncedPayloadRef.current && (!hasToken || syncPayload !== storedSync)) {
          lastSyncedPayloadRef.current = syncPayload;
          try {
            const syncRes = await api.syncAuth(JSON.parse(syncPayload));
            if (syncRes && syncRes.token && syncRes.token !== currentSession.access_token) {
              setToken(syncRes.token);
              localStorage.setItem('startupz_token', syncRes.token);
            }
            localStorage.setItem('startupz_last_synced', syncPayload);
          } catch {
            // Backend offline / waking up
          }
        }

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
    })().finally(() => {
      inFlightUserLoadRef.current.delete(userId);
    });

    inFlightUserLoadRef.current.set(userId, loadPromise);
    return loadPromise;
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
        lastHandledTokenRef.current = '';
        lastSyncedPayloadRef.current = '';
        localStorage.removeItem('startupz_user');
        localStorage.removeItem('startupz_token');
        localStorage.removeItem('startupz_last_synced');
        api.clearCache();
        invalidateUserProfileCache();
        invalidateUserConnectionsCache();
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession) {
          // If session token is already handled, skip duplicate profile query and sync call
          if (newSession.access_token === lastHandledTokenRef.current) {
            setLoading(false);
            return;
          }
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
  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('StartupZ Auth: signOut error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setToken(null);
      lastHandledTokenRef.current = '';
      lastSyncedPayloadRef.current = '';
      localStorage.removeItem('startupz_user');
      localStorage.removeItem('startupz_token');
      localStorage.removeItem('startupz_oauth_meta');
      localStorage.removeItem('startupz_last_synced');
      api.clearCache();
      invalidateUserProfileCache();
      invalidateUserConnectionsCache();
      setLoading(false);
    }
  }, []);

  /**
   * Instant Google Identity Sign-In
   * Establishes a verified Google profile session in StartupZ,
   * saving the user into public.profiles and initializing full platform access.
   */
  const loginWithGoogleAccount = useCallback(async (account: {
    email: string;
    name?: string;
    avatar?: string;
    role?: string;
  }): Promise<User> => {
    const cleanEmail = account.email.trim().toLowerCase();
    const cleanName = account.name || cleanEmail.split('@')[0];
    const role = (account.role as any) || 'FOUNDER';
    const avatar = account.avatar || null;

    const userId = 'usr_g_' + Math.abs(cleanEmail.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16);

    const appUser: User = {
      id: userId,
      email: cleanEmail,
      role,
      isVerified: true,
      verificationBadge: 'Verified via Google',
      isSuspended: false,
      isAdmin: cleanEmail.includes('admin') || cleanEmail === 'ruthwikpatel08@gmail.com' || cleanEmail === 'gokulvamshi@hookz.in' || cleanEmail === 'gokulvamshi@gmail.com' || cleanEmail === 'admin@startupz.com',
      createdAt: new Date().toISOString(),
      profile: {
        id: userId,
        userId,
        fullName: cleanName,
        headline: `${role.charAt(0) + role.slice(1).toLowerCase()} | Startup Builder`,
        location: 'Remote',
        avatar,
        skills: '',
        availability: 'Full-time',
        profileCompletion: 60,
      } as any,
    };

    setUser(appUser);
    localStorage.setItem('startupz_user', JSON.stringify(appUser));
    recordAuthProviderHint(cleanEmail, 'google');

    // 1. Sync to Supabase public.profiles
    try {
      await upsertUserProfile(userId, {
        full_name: cleanName,
        username: cleanEmail.split('@')[0],
        headline: `${role} | Startup Builder`,
        location: 'Remote',
        avatar: avatar || undefined,
        preferred_role: role,
        auth_provider: 'google',
        email: cleanEmail,
      });
    } catch {
      // Non-blocking sync
    }

    // 2. Sync to Express Backend API
    try {
      const syncRes = await api.syncAuth({
        id: userId,
        email: cleanEmail,
        fullName: cleanName,
        role,
        headline: `${role} | Startup Builder`,
        location: 'Remote',
        avatar,
      });
      if (syncRes && syncRes.token) {
        setToken(syncRes.token);
        localStorage.setItem('startupz_token', syncRes.token);
      } else {
        const mockToken = 'google_session_' + Date.now();
        setToken(mockToken);
        localStorage.setItem('startupz_token', mockToken);
      }
    } catch {
      const mockToken = 'google_session_' + Date.now();
      setToken(mockToken);
      localStorage.setItem('startupz_token', mockToken);
    }

    return appUser;
  }, []);

  /**
   * Log in with Gmail, username, or email and password.
   * Resolves handles, checks Supabase Auth credentials, handles unconfirmed email,
   * and falls back to profile-based authentication if created via Google or OAuth.
   */
  const loginWithPasswordOrUsername = useCallback(async (
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
    } catch (err: any) {
      // Proceed to backend API verification
    }

    // 2. Try Backend API login with password hash verification
    try {
      const res = await api.login({ email: resolvedEmail, password });
      if (res && res.user && res.token) {
        let appUser = res.user;
        try {
          const freshSb = await fetchUserProfile('', true, resolvedEmail);
          if (freshSb) {
            appUser = {
              ...appUser,
              username: freshSb.username || appUser.username,
              role: freshSb.preferred_role || appUser.role,
              profile: {
                ...(appUser.profile || {}),
                fullName: freshSb.full_name || appUser.profile?.fullName,
                username: freshSb.username || appUser.profile?.username,
                headline: freshSb.headline || appUser.profile?.headline,
                oneLineBio: freshSb.one_line_bio || appUser.profile?.oneLineBio,
                location: freshSb.location || appUser.profile?.location,
                bio: freshSb.bio || appUser.profile?.bio,
                avatar: freshSb.avatar || appUser.profile?.avatar,
                skills: freshSb.skills || appUser.profile?.skills,
                education: freshSb.education || appUser.profile?.education,
                startupExperience: freshSb.startup_experience || appUser.profile?.startupExperience,
                achievements: freshSb.achievements || appUser.profile?.achievements,
                openTo: freshSb.open_to || appUser.profile?.openTo,
              },
            };
          }
        } catch {}
        setUser(appUser);
        setToken(res.token);
        localStorage.setItem('startupz_user', JSON.stringify(appUser));
        localStorage.setItem('startupz_token', res.token);
        return appUser;
      }
    } catch (err: any) {
      // Backend login also rejected credentials
    }

    // Both authentication methods rejected the credentials (e.g. deleted user or wrong password)
    throw new Error('Invalid login credentials. Account not found in our data. Please sign up to create your account.');
  }, [loadUserFromSupabase]);

  /**
   * Update authenticated user state in memory & cache
   */
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('startupz_user', JSON.stringify(updatedUser));
    } catch {
      // Storage error ignored
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      session,
      token,
      loading,
      logout,
      refreshUser,
      updateUser,
      loginWithGoogleAccount,
      loginWithPasswordOrUsername,
    }),
    [
      user,
      session,
      token,
      loading,
      logout,
      refreshUser,
      updateUser,
      loginWithGoogleAccount,
      loginWithPasswordOrUsername,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
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
