import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, upsertUserProfile, recordAuthProviderHint, getAuthErrorMessage } from '../../lib/supabase';
import {
  Rocket,
  User,
  Mail,
  Lock,
  Briefcase,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MailCheck,
} from 'lucide-react';
import { UserRole } from '../../types';
import { GoogleAccountChooserModal } from '../../components/auth/GoogleAccountChooserModal';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('FOUNDER');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email confirmation state
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const profileTypes: { label: string; value: UserRole; desc: string }[] = [
    { label: 'Founder', value: 'FOUNDER', desc: 'Building a startup, looking for co-founders & capital' },
    { label: 'Co-Founder', value: 'COFOUNDER', desc: 'Ready to join an early-stage startup full/part-time' },
    { label: 'Developer', value: 'DEVELOPER', desc: 'Software engineer, technical builder, AI engineer' },
    { label: 'Designer', value: 'DESIGNER', desc: 'UI/UX architect, brand designer, product design lead' },
    { label: 'Marketer', value: 'MARKETER', desc: 'Growth lead, performance marketer, GTM strategist' },
    { label: 'Investor', value: 'INVESTOR', desc: 'Angel investor, venture capitalist, syndicate lead' },
    { label: 'Mentor', value: 'MENTOR', desc: 'Experienced advisor, founder coach, industry specialist' },
    { label: 'Other', value: 'OTHER', desc: 'Startup enthusiast, community builder, operator' },
  ];

  // Continue with Google
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);
    const resetTimer = setTimeout(() => setGoogleLoading(false), 5000);

    try {
      // Save preliminary role & headline so the OAuth callback can populate the profile
      const oauthMeta = {
        role,
        headline: headline.trim() || `${role.charAt(0) + role.slice(1).toLowerCase()} | Startup Builder`,
        location: location.trim() || 'Remote',
      };
      localStorage.setItem('startupz_oauth_meta', JSON.stringify(oauthMeta));

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
          // Probe completed
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

  // Sign up with Email + Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validations
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    const finalHeadline = headline.trim() || `${role.charAt(0) + role.slice(1).toLowerCase()} | Startup Enthusiast`;
    const finalLocation = location.trim() || 'Remote';

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role,
            headline: finalHeadline,
            location: finalLocation,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check if user session was immediately returned or email confirmation is required
      if (data.session && data.user) {
        // Email confirmation is disabled on this Supabase project
        recordAuthProviderHint(normalizedEmail, 'email');

        // Create or update StartupZ profile
        await upsertUserProfile(data.user.id, {
          full_name: trimmedName,
          headline: finalHeadline,
          location: finalLocation,
          preferred_role: role,
          auth_provider: 'email',
          email: normalizedEmail,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedName)}&backgroundColor=4f46e5,06b6d4,10b981`,
          open_to: 'Co-Founder,Startup Team,Investment',
          profile_completion: 65,
        });

        navigate('/dashboard');
      } else if (data.user) {
        // Email confirmation is enabled on this Supabase project
        recordAuthProviderHint(normalizedEmail, 'email');
        setVerificationRequired(true);
      }
    } catch (err: any) {
      console.warn('Supabase Auth signUp error:', err);
      setError(getAuthErrorMessage(err, normalizedEmail));
    } finally {
      setLoading(false);
    }
  };

  // Resend confirmation link
  const handleResendVerification = async () => {
    setResending(true);
    setResendSuccess(false);
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

  // Verification Screen if email confirmation is required
  if (verificationRequired) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <MailCheck size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Check your email
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We sent a verification link to:
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono bg-slate-50 dark:bg-dark-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              {email}
            </p>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Click the link in the verification email to activate your StartupZ profile and sign in.
          </p>

          {resendSuccess && (
            <div className="p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>Verification email resent successfully!</span>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button
              type="button"
              disabled={resending}
              onClick={handleResendVerification}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-800 transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>

            <Link
              to="/login"
              className="block w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8">
        
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
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Join the Startup Ecosystem
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Find the right people. Build the right startup. Create your professional startup identity.
          </p>
        </div>

        {/* Card Form */}
        <div className="p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
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
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            {/* Profile Ecosystem Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                I am joining as a <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {profileTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setRole(t.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === t.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {t.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    disabled={loading}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Headline (Optional)
                </label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={headline}
                    disabled={loading}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. AI Founder | Serial Builder"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    disabled={loading}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco / Remote"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create StartupZ Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Sign in here
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
