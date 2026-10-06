import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, upsertUserProfile, recordAuthProviderHint, getAuthErrorMessage } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
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

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [headline, setHeadline] = useState('');
  const [customRoleDescription, setCustomRoleDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email confirmation state
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const profileTypes: { label: string; value: UserRole; desc: string }[] = [
    { label: 'Student', value: 'STUDENT', desc: 'College/university student & builder' },
    { label: 'Developer', value: 'DEVELOPER', desc: 'Software, AI & full-stack builder' },
    { label: 'Founder', value: 'FOUNDER', desc: 'Working on a startup project' },
    { label: 'Co-Founder', value: 'COFOUNDER', desc: 'Looking to join a student team' },
    { label: 'Marketer', value: 'MARKETER', desc: 'Growth, design & GTM enthusiast' },
    { label: 'Mentor', value: 'MENTOR', desc: 'Advisor & student coach' },
    { label: 'Investor', value: 'INVESTOR', desc: 'Angel / student venture scout' },
    { label: 'Other', value: 'OTHER', desc: 'Specialist or custom role' },
  ];

  // Continue with Google
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const cleanCustomRole = customRoleDescription.trim();
      const finalRole = role === 'OTHER' && cleanCustomRole ? `Other: ${cleanCustomRole}` : role;
      const finalHeadline = role === 'OTHER' && cleanCustomRole
        ? cleanCustomRole
        : (headline.trim() || `${role.charAt(0) + role.slice(1).toLowerCase()} | HookZ Member`);

      // Save preliminary role & headline so the OAuth callback can populate the profile
      const oauthMeta = {
        role: finalRole,
        headline: finalHeadline,
        location: location.trim() || 'Remote',
        customRole: cleanCustomRole || undefined,
      };
      localStorage.setItem('startupz_oauth_meta', JSON.stringify(oauthMeta));
      localStorage.setItem('startupz_oauth_intent', 'signup');

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
        setGoogleLoading(false);
        setError('Google Sign-In is unavailable. Please fill in your details below to create your account.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setGoogleLoading(false);
      setError(err?.message || 'Google Sign-In error. Please register using the form below.');
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
    const cleanCustomRole = customRoleDescription.trim();
    const finalRole = role === 'OTHER' && cleanCustomRole ? `Other: ${cleanCustomRole}` : role;
    const finalHeadline = role === 'OTHER' && cleanCustomRole
      ? cleanCustomRole
      : (headline.trim() || `${role.charAt(0) + role.slice(1).toLowerCase()} | HookZ Member`);
    const finalLocation = location.trim() || 'Remote';

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: finalRole,
            headline: finalHeadline,
            location: finalLocation,
            custom_role: cleanCustomRole || undefined,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Check if user session was immediately returned or email confirmation is required
      if (data.session && data.user) {
        recordAuthProviderHint(normalizedEmail, 'email');

        await upsertUserProfile(data.user.id, {
          full_name: trimmedName,
          headline: finalHeadline,
          location: finalLocation,
          preferred_role: finalRole,
          auth_provider: 'email',
          email: normalizedEmail,
          avatar: undefined,
          open_to: 'Hackathons,Project Teams,Networking',
          profile_completion: 65,
        });

        navigate('/');
      } else if (data.user) {
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
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 max-w-md w-full p-6 sm:p-8 text-center space-y-5">
          <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto border border-brand-100">
            <MailCheck size={24} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Check your email
            </h2>
            <p className="text-xs text-slate-500">
              We sent a verification link to:
            </p>
            <p className="text-xs font-semibold text-slate-900 font-mono bg-slate-50 py-2 px-3 rounded-lg border border-slate-200">
              {email}
            </p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Click the link in the verification email to activate your HookZ account and get started.
          </p>

          {resendSuccess && (
            <div className="p-3 text-xs rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 text-left">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>Verification email resent successfully!</span>
            </div>
          )}

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              disabled={resending}
              onClick={handleResendVerification}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>

            <Link
              to="/login"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl block text-center transition-all shadow-sm"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Subtle landing-page style background pattern */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-lg tracking-tighter">H</span>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Hook<span className="text-brand-600">Z</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Create your HookZ account
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Find hackathon teammates, showcase projects, and connect with fellow student builders
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin text-brand-600" />
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
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[11px]">
                OR
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Profile Ecosystem Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 tracking-wide mb-2">
                I am joining as a <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {profileTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setRole(t.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      role === t.value
                        ? 'border-brand-600 bg-brand-50/70 text-brand-700 ring-2 ring-brand-500/20 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">
                      {t.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Role Description for 'OTHER' */}
              {role === 'OTHER' && (
                <div className="mt-3 p-3.5 rounded-xl bg-brand-50/60 border border-brand-200 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-brand-900">
                      Describe your role <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-md">
                      Custom Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    What best describes you? e.g. <span className="font-semibold text-slate-800">Student Designer</span>, <span className="font-semibold text-slate-800">Researcher</span>, or <span className="font-semibold text-slate-800">Product Manager</span>
                  </p>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3.5 top-3 text-brand-600" />
                    <input
                      type="text"
                      required={role === 'OTHER'}
                      value={customRoleDescription}
                      disabled={loading}
                      onChange={(e) => {
                        setCustomRoleDescription(e.target.value);
                        if (!headline || headline.includes('HookZ') || headline.includes('Other')) {
                          setHeadline(e.target.value);
                        }
                      }}
                      placeholder="Enter your role (e.g. Student Designer, Researcher)"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-brand-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    disabled={loading}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@college.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    disabled={loading}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Headline <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={headline}
                    disabled={loading}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. CS Sophomore | Full Stack Dev"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    disabled={loading}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Stanford, CA / Remote"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-all text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm hover:shadow-md transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create HookZ Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
