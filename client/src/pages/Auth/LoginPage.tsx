import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, getAuthErrorMessage, recordAuthProviderHint } from '../../lib/supabase';
import { Rocket, Lock, Mail, ArrowRight, Sparkles, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Real Supabase Google OAuth Flow
  const handleGoogleSignInClick = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error('Google OAuth initialization error:', err);
      setError(getAuthErrorMessage(err, email));
      setGoogleLoading(false);
    }
  };

  // Real Supabase Email + Password Sign In Flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        recordAuthProviderHint(normalizedEmail, 'email');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.warn('Supabase Auth signInWithPassword error:', err);
      const friendlyMessage = getAuthErrorMessage(err, normalizedEmail);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Resend email verification link via Supabase Auth
  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (resendErr) {
        setError(getAuthErrorMessage(resendErr));
      } else {
        setResendSuccess(true);
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  // Demo account quick filler for evaluators
  const handleSelectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  const isEmailUnconfirmed = error?.includes('verify your email') || error?.includes('verification link');
  const isGoogleAccount = error?.includes('Continue with Google');

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
              <Rocket size={22} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Startup<span className="text-brand-600 dark:text-brand-400">Z</span>
            </span>
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome back to the Network
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sign in to discover co-founders, opportunities, and startup updates.
          </p>
        </div>

        {/* Demo Accounts Evaluation Helper */}
        <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Demo Accounts (For Evaluation):
            </span>
            <span className="text-[10px] text-brand-500 font-mono">Password123!</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('sarah.chen@aiagri.io')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Sarah Chen</div>
              <div className="text-[10px] text-brand-600 dark:text-brand-400">Founder @ FarmConnect</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('marcus.dev@codeflow.dev')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Marcus Brody</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Staff Full-Stack Dev</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('elena.investor@apexventures.vc')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Elena Rostova</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Partner @ Apex VC</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoAccount('admin@startupz.com')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Alex Vance</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400">Platform Admin</div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          
          {/* Continue With Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignInClick}
            disabled={googleLoading || loading}
            className="w-full inline-flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 hover:bg-slate-50 dark:hover:bg-dark-800 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.99] disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin text-brand-500" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-dark-900 px-3 text-slate-400 font-semibold tracking-wider text-[11px]">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{error}</span>
                </div>

                {/* Helpful contextual actions */}
                {isGoogleAccount && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      className="inline-flex items-center gap-1.5 font-bold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>Click here to Continue with Google</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {isEmailUnconfirmed && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendVerification}
                      className="font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Resend verification email'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                <span>Verification email sent! Please check your inbox and spam folder.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@startup.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
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
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Don't have a StartupZ account yet?{' '}
              <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
