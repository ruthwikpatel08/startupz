import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, getAuthErrorMessage, recordAuthProviderHint, resolveEmailOrUsername, upsertUserProfile, invalidateUserProfileCache } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Rocket, Lock, Mail, ArrowRight, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { GoogleAccountChooserModal } from '../../components/auth/GoogleAccountChooserModal';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDeletedNotice = searchParams.get('deleted') === 'true';
  const { user, loginWithPasswordOrUsername } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);

  // Real Supabase Google OAuth Flow with Account Selector
  const handleGoogleSignInClick = async () => {
    setGoogleLoading(true);
    setError(null);
    const resetTimer = setTimeout(() => setGoogleLoading(false), 5000);

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (oauthError) {
        clearTimeout(resetTimer);
        setGoogleLoading(false);
        setGoogleChooserOpen(true);
        return;
      }

      if (data?.url) {
        try {
          const probe = await fetch(data.url, { redirect: 'manual' });
          if (probe.status === 400) {
            clearTimeout(resetTimer);
            setGoogleLoading(false);
            setGoogleChooserOpen(true);
            return;
          }
        } catch {
          // If probe redirects, provider is active
        }

        clearTimeout(resetTimer);
        window.location.href = data.url;
      }
    } catch {
      clearTimeout(resetTimer);
      setGoogleLoading(false);
      setGoogleChooserOpen(true);
    }
  };

  // Sign In with Email, Gmail, or Username and Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleLoading(false);
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter your Gmail, username, or email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password to proceed.');
      setLoading(false);
      return;
    }

    try {
      await loginWithPasswordOrUsername(cleanIdentifier, password);
      navigate('/');
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      const friendlyMessage = getAuthErrorMessage(err, cleanIdentifier);
      if (
        friendlyMessage.toLowerCase().includes('invalid login credentials') ||
        friendlyMessage.toLowerCase().includes('not found') ||
        friendlyMessage.toLowerCase().includes('no user')
      ) {
        setError('Account not found in our data. Please sign up to create your account.');
      } else {
        setError(friendlyMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend email verification link via Supabase Auth
  const handleResendVerification = async () => {
    const targetEmail = await resolveEmailOrUsername(identifier.trim());
    if (!targetEmail) {
      setError('Please enter your email or Gmail in the field below to resend the confirmation link.');
      return;
    }
    setResending(true);
    setResendSuccess(false);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
      });
      if (resendErr) {
        setError(getAuthErrorMessage(resendErr, targetEmail));
      } else {
        setResendSuccess(true);
        setError(null);
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err, targetEmail));
    } finally {
      setResending(false);
    }
  };

  const isEmailUnconfirmed = error?.includes('verify your email') || error?.includes('verification link');

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Hero Section Banner */}
        <div className="text-center space-y-3">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium shadow-subtle">
            <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
            <span>Startup ecosystem platform for builders and backers</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
            Build your startup team.{' '}
            <span className="text-brand-600 dark:text-brand-400">Discover opportunities.</span>{' '}
            Grow together.
          </h1>

          {/* Subtext */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-sm mx-auto">
            StartupZ connects founders, co-founders, developers, designers, mentors, and investors in one structured, professional network.
          </p>
        </div>

        {/* Quick Platform Exploration Links */}
        <div className="card-base p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-600" /> Explore Directory Without Sign In:
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Free Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/cofounders"
              className="text-left p-2 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 text-xs transition-colors block cursor-pointer"
            >
              <div className="font-semibold text-slate-900 dark:text-white truncate">Co-Founders</div>
              <div className="text-[10px] text-brand-600 dark:text-brand-400">Founders & builders →</div>
            </Link>
            <Link
              to="/opportunities"
              className="text-left p-2 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 text-xs transition-colors block cursor-pointer"
            >
              <div className="font-semibold text-slate-900 dark:text-white truncate">Opportunities</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Internships & roles →</div>
            </Link>
            <Link
              to="/startups"
              className="text-left p-2 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 text-xs transition-colors block cursor-pointer"
            >
              <div className="font-semibold text-slate-900 dark:text-white truncate">Startups</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Live ventures →</div>
            </Link>
            <Link
              to="/investors"
              className="text-left p-2 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 text-xs transition-colors block cursor-pointer"
            >
              <div className="font-semibold text-slate-900 dark:text-white truncate">Investors</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400">VCs & angels →</div>
            </Link>
          </div>
        </div>

        {/* Login Form */}
        <div className="card-base p-6 sm:p-7 shadow-xs">
          
          {/* Continue With Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={googleLoading || loading}
            className="btn-secondary w-full inline-flex items-center justify-center gap-2.5 py-2 px-4 text-xs font-semibold disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <RefreshCw size={15} className="animate-spin text-brand-600" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-dark-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-dark-900 px-2.5 text-slate-400 font-medium tracking-wider text-[11px]">
                Or sign in with password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isDeletedNotice && (
              <div className="p-3 text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Account Permanently Deleted</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-300 pl-6">
                  All your profile data, connections, messages, and listings have been permanently wiped from StartupZ. If you log in again, you will be registered as a brand new user.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>

                {/* Helpful troubleshooting options */}
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 space-y-1 text-[11px]">
                  {isEmailUnconfirmed && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-slate-600 dark:text-slate-400">
                        Email not confirmed?
                      </span>
                      <button
                        type="button"
                        disabled={resending}
                        onClick={handleResendVerification}
                        className="font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {resending ? 'Sending...' : 'Resend verification email'}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      Forgot your password?
                    </span>
                    <Link
                      to="/forgot-password"
                      className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Reset password →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {resendSuccess && (
              <div className="p-2.5 text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <span>Verification email sent! Please check your inbox.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Email, Gmail, or Username</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">proceed by password</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  disabled={loading}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. yourname@gmail.com, ruthwik, or user"
                  className="input-base w-full pl-9 pr-3 py-2 text-xs disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base w-full pl-9 pr-9 py-2 text-xs disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-dark-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have a StartupZ account yet?{' '}
              <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Google Account Selector Modal */}
      <GoogleAccountChooserModal
        isOpen={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
      />
    </div>
  );
};
