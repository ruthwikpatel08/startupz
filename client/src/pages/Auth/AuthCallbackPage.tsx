import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, upsertUserProfile, recordAuthProviderHint, fetchUserProfile } from '../../lib/supabase';
import { Rocket, AlertCircle, RefreshCw } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const handleCallback = async () => {
      // 1. Check for error in query params (e.g. user denied consent)
      const errorParam = searchParams.get('error_description') || searchParams.get('error');
      if (errorParam) {
        if (isSubscribed) {
          setErrorMessage(errorParam.replace(/\+/g, ' '));
        }
        return;
      }

      try {
        // 2. Obtain session from Supabase client
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          const authUser = session.user;

          // Record Google auth provider hint
          if (authUser.email) {
            recordAuthProviderHint(authUser.email, 'google');
          }

          // Check if profile exists in public.profiles
          const existingProfile = await fetchUserProfile(authUser.id);

          if (!existingProfile) {
            // Read any role or headline saved before starting OAuth flow
            let savedMeta: any = {};
            try {
              const rawMeta = localStorage.getItem('startupz_oauth_meta');
              if (rawMeta) savedMeta = JSON.parse(rawMeta);
            } catch {
              // Ignore
            }

            const fullName =
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split('@')[0] ||
              'Founder';

            const avatar =
              authUser.user_metadata?.avatar_url ||
              authUser.user_metadata?.picture ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

            const role = savedMeta.role || authUser.user_metadata?.role || 'FOUNDER';

            await upsertUserProfile(authUser.id, {
              full_name: fullName,
              headline: savedMeta.headline || `${role} | Startup Builder`,
              location: savedMeta.location || 'Remote',
              avatar,
              preferred_role: role,
              auth_provider: 'google',
              email: authUser.email || '',
              open_to: 'Co-Founder,Startup Team,Investment',
              profile_completion: 65,
            });

            localStorage.removeItem('startupz_oauth_meta');
          }

          // Navigate to dashboard
          if (isSubscribed) {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // If session not ready yet, listen for the SIGNED_IN event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            const authUser = newSession.user;
            if (authUser.email) {
              recordAuthProviderHint(authUser.email, 'google');
            }
            if (isSubscribed) {
              navigate('/dashboard', { replace: true });
            }
          }
        });

        // Timeout fallback if session doesn't arrive within 6 seconds
        const timer = setTimeout(() => {
          if (isSubscribed) {
            setErrorMessage('Authentication timed out. Please try signing in again.');
          }
        }, 6000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMessage(err.message || 'Failed to complete authentication. Please try again.');
        }
      }
    };

    handleCallback();

    return () => {
      isSubscribed = false;
    };
  }, [navigate, searchParams]);

  if (errorMessage) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Authentication Error
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {errorMessage}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto">
          <Rocket size={28} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Connecting to StartupZ...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Verifying your Google session and preparing your profile.
        </p>
        <div className="flex justify-center pt-2">
          <RefreshCw size={22} className="text-brand-500 animate-spin" />
        </div>
      </div>
    </div>
  );
};
