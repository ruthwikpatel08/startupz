import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase, getAuthErrorMessage, resolveEmailOrUsername } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SEO } from '../../components/common/SEO';
import { AuthLayout, GoogleButton } from '../../components/auth/AuthLayout';

export const LoginPage: React.FC = () => {
  const { user, loginWithPasswordOrUsername } = useAuth();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'resend' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (user) return <Navigate to={user.onboarding_completed === false ? '/onboarding' : '/'} replace />;

  const google = async () => {
    setBusy('google'); setError('');
    try {
      localStorage.setItem('startupz_oauth_intent', 'login');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account', access_type: 'offline' } } });
      if (error) throw error;
    } catch (error) { setError(getAuthErrorMessage(error)); setBusy(null); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy('email'); setError(''); setNotice('');
    try { await loginWithPasswordOrUsername(identifier.trim(), password); }
    catch (error) { setError(getAuthErrorMessage(error, identifier.trim())); }
    finally { setBusy(null); }
  };
  const resend = async () => {
    setBusy('resend'); setError('');
    try {
      const email = await resolveEmailOrUsername(identifier.trim());
      if (!email) throw new Error('Enter your email address to resend the confirmation link.');
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      setNotice('Confirmation email sent. Check your inbox.');
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { setBusy(null); }
  };

  return <AuthLayout title="Good to see you again." subtitle="Your people, projects, and next big idea are waiting.">
    <SEO title="Sign In | HookZ" noindex />
    <GoogleButton onClick={google} disabled={!!busy} loading={busy === 'google'} />
    <div className="auth-divider">OR</div>
    {params.get('deleted') === 'true' && <p className="auth-status" role="status">Your account has been deleted.</p>}
    {error && <div className="auth-alert" role="alert">{error}{/verify your email|verification link|confirm/i.test(error) && <button type="button" onClick={resend} disabled={!!busy}>Resend confirmation email</button>}</div>}
    {notice && <p className="auth-status" role="status">{notice}</p>}
    <form className="auth-form" onSubmit={submit}>
      <div><label htmlFor="login-email">Email or username</label><input id="login-email" className="input-base" autoComplete="username" required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@college.edu" disabled={!!busy} /></div>
      <div><div className="auth-field-heading"><label htmlFor="login-password">Password</label><Link to="/forgot-password">Forgot Password?</Link></div><div className="auth-password"><input id="login-password" className="input-base" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" disabled={!!busy} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
      <button className="btn-primary" disabled={!!busy}>{busy === 'email' ? 'Signing in…' : 'Sign In'}<ArrowRight size={16} /></button>
    </form>
    <p className="auth-switch">Don't have an account? <Link to="/register">Sign up</Link></p>
  </AuthLayout>;
};
