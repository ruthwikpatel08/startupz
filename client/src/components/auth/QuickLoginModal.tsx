import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAuthErrorMessage } from '../../lib/supabase';
import { X, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGoogleChooser?: () => void;
}

export const QuickLoginModal: React.FC<QuickLoginModalProps> = ({
  isOpen,
  onClose,
  onOpenGoogleChooser,
}) => {
  const navigate = useNavigate();
  const { loginWithPasswordOrUsername } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your email, Gmail, or username.');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      await loginWithPasswordOrUsername(cleanId, password);
      onClose();
      navigate('/');
    } catch (err: any) {
      console.warn('Quick login error:', err);
      setError(getAuthErrorMessage(err, cleanId));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (id: string) => {
    setIdentifier(id);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[400px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-modal overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white font-bold text-xs">
              Z
            </div>
            <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white">
              Sign In to Startup<span className="text-brand-600">Z</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Welcome back
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your credentials to continue.
            </p>
          </div>

          {/* Continue with Google Option */}
          {onOpenGoogleChooser && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGoogleChooser();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            </button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-medium tracking-wider">
                Or password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 text-xs rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email, Gmail, or Username
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  disabled={loading}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. ruthwik, user@gmail.com, or email"
                  className="input-base !pl-8 !py-1.5 !text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-base !pl-8 !pr-8 !py-1.5 !text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2 !text-xs inline-flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {/* Quick test accounts for real accounts */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium block mb-1">
              Quick Accounts:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleQuickFill('ruthwikpatel08@gmail.com')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition-colors"
              >
                ruthwikpatel08@gmail.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('legacyplayer04@gmail.com')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition-colors"
              >
                legacyplayer04@gmail.com
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('lavanyadav0206@gmail.com')}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition-colors"
              >
                lavanyadav0206@gmail.com
              </button>
            </div>
          </div>

          <div className="pt-1 text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              onClick={onClose}
              className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
