import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Rocket, Mail, ArrowRight, Check } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSent(true);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
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
            Reset your password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your email and we'll send you instructions to reset your password.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <Check size={26} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Reset link sent</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check your email inbox for password reset instructions.
              </p>

              {resetToken && (
                <div className="p-3 bg-brand-50 dark:bg-brand-950/60 rounded-xl border border-brand-200 dark:border-brand-900 text-xs">
                  <p className="text-brand-800 dark:text-brand-300 font-semibold mb-2">Development Demo Reset Link:</p>
                  <Link
                    to={`/reset-password?token=${resetToken}`}
                    className="inline-block px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold text-[11px]"
                  >
                    Click to Reset Password
                  </Link>
                </div>
              )}

              <Link to="/login" className="block text-xs font-semibold text-brand-600 hover:underline pt-2">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@startup.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  Return to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
