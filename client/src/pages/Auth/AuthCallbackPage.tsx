import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { supabase, fetchUserProfile, mapSupabaseToAppUser, recordAuthProviderHint, getAuthErrorMessage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from '../../components/auth/AuthLayout';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { updateUser } = useAuth();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const complete = async () => {
      try {
        const callbackError = params.get('error_description') || params.get('error');
        if (callbackError) throw new Error(callbackError);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error('Your sign-in link expired. Please sign in again.');
        const profile = await fetchUserProfile(session.user.id, true, session.user.email);
        const user = mapSupabaseToAppUser(session.user, profile);
        if (!active) return;
        if (session.user.email) recordAuthProviderHint(session.user.email, session.user.app_metadata.provider === 'google' ? 'google' : 'email');
        updateUser(user);
        localStorage.removeItem('startupz_oauth_meta');
        localStorage.removeItem('startupz_oauth_intent');
        navigate(user.onboarding_completed === false ? '/onboarding' : '/', { replace: true });
      } catch (error) { if (active) setError(getAuthErrorMessage(error)); }
    };
    complete();
    return () => { active = false; };
  }, [navigate, params, updateUser]);
  return <AuthLayout title={error ? 'Let’s try that again.' : 'You’re almost in.'} subtitle="Connecting you to your HookZ account.">
    {error ? <><p className="auth-alert" role="alert">{error}</p><Link className="btn-primary w-full" to="/login">Back to Sign In</Link></> : <div role="status" className="auth-status"><LoaderCircle className="animate-spin mx-auto mb-4 text-brand-600" size={28} />Verifying your session…</div>}
  </AuthLayout>;
};
