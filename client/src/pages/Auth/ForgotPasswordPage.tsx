import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, getAuthErrorMessage } from '../../lib/supabase';
import { Rocket, Mail, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { SEO } from '../../components/common/SEO';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSent(true);
    } catch (err: any) {
      console.warn('Supabase Auth resetPasswordForEmail error:', err);
      setError(getAuthErrorMessage(err, normalizedEmail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SEO title="Reset Password | HookZ" noindex={true} />
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <img
              src="/logo-icon.png"
              alt="HookZ"
              className="w-8 h-8 rounded-md object-contain shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hook<span className="text-brand-600 dark:text-brand-400">Z</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Reset your password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your email and we'll send you secure instructions to reset your password.
          </p>
        </div>

        <div className="card-base p-6 sm:p-7 shadow-xs">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-900/60">
                <Check size={22} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Password reset link sent</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If an account exists for <strong className="text-slate-700 dark:text-slate-300 font-mono">{email}</strong>, you will receive an email with instructions to securely choose a new password.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="btn-primary block w-full py-2.5 px-4 text-xs font-semibold text-center"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@startup.com"
                    className="input-base pl-9 pr-3 py-2 text-xs disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
