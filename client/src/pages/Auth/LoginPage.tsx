import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Rocket, Lock, Mail, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: demoEmail, password: 'Password123!' });
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Demo Accounts Switcher Pill */}
        <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/80 dark:border-brand-900/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Quick Demo Account Sign-In:
            </span>
            <span className="text-[10px] text-brand-500 font-mono">Password123!</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('sarah.chen@aiagri.io')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Sarah Chen</div>
              <div className="text-[10px] text-brand-600 dark:text-brand-400">Founder @ FarmConnect</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('marcus.dev@codeflow.dev')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Marcus Brody</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400">Staff Full-Stack Dev</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('elena.investor@apexventures.vc')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Elena Rostova</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Partner @ Apex VC</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@startupz.com')}
              className="text-left p-2 rounded-xl bg-white dark:bg-dark-850 border border-brand-100 dark:border-brand-900 hover:border-brand-500 text-xs transition-all shadow-xs"
            >
              <div className="font-bold text-slate-900 dark:text-white truncate">Alex Vance</div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400">Platform Admin</div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                {error}
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@startup.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                'Authenticating...'
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
