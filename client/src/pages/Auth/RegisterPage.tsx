import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react';
import { supabase, getAuthErrorMessage, recordAuthProviderHint } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SEO } from '../../components/common/SEO';
import { AuthLayout, GoogleButton } from '../../components/auth/AuthLayout';

export const RegisterPage: React.FC = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'resend' | null>(null);
  const [error, setError] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [notice, setNotice] = useState('');
  if (user) return <Navigate to={user.onboarding_completed === false ? '/onboarding' : '/'} replace />;
  const google = async () => {
    if (!agree) { setError('Please agree to the Terms and Privacy Notice to create your account.'); return; }
    setBusy('google'); setError('');
    try {
      localStorage.removeItem('startupz_oauth_meta');
      localStorage.setItem('startupz_oauth_intent', 'signup');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account', access_type: 'offline' } } });
      if (error) throw error;
    } catch (error) { setError(getAuthErrorMessage(error)); setBusy(null); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setError('');
    if (!agree) { setError('Please agree to the Terms and Privacy Notice.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match. Please try again.'); return; }
    setBusy('email');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { onboarding_completed: false, terms_accepted: true } } });
      if (error) throw error;
      recordAuthProviderHint(normalizedEmail, 'email');
      if (!data.session) setVerificationRequired(true);
    } catch (error) { setError(getAuthErrorMessage(error, email)); }
    finally { setBusy(null); }
  };
  const resend = async () => {
    setBusy('resend'); setError(''); setNotice('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      setNotice('A fresh confirmation link is on its way.');
    } catch (error) { setError(getAuthErrorMessage(error)); }
    finally { setBusy(null); }
  };
  return <AuthLayout title={verificationRequired ? 'Check your inbox.' : 'Your people are here.'} subtitle={verificationRequired ? 'One quick confirmation, then let’s meet your next team.' : 'Create your free account. Find teammates. Make something real.'}>
    <SEO title="Join Free | HookZ" noindex />
    {verificationRequired ? <div className="auth-status"><MailCheck size={32} className="mx-auto mb-4 text-brand-600" /><p>Open the confirmation link sent to <strong>{email}</strong>. You'll create your profile after confirming.</p><button className="mt-5" type="button" onClick={resend} disabled={!!busy}>{busy ? 'Sending…' : 'Resend confirmation email'}</button></div> : <>
      <GoogleButton onClick={google} disabled={!!busy} loading={busy === 'google'} />
      <div className="auth-divider">OR</div>
      <form className="auth-form" onSubmit={submit}>
        <div><label htmlFor="signup-email">Email</label><input id="signup-email" className="input-base" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" disabled={!!busy} /></div>
        <div><label htmlFor="signup-password">Password</label><div className="auth-password"><input id="signup-password" className="input-base" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" disabled={!!busy} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        <div><label htmlFor="signup-confirm">Confirm password</label><input id="signup-confirm" className="input-base" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Once more, just to be sure" disabled={!!busy} /></div>
        <label className="auth-consent"><input type="checkbox" required checked={agree} onChange={e => setAgree(e.target.checked)} disabled={!!busy} /><span>I agree to the <Link to="/terms" target="_blank" rel="noopener">Terms of Service</Link> and <Link to="/privacy" target="_blank" rel="noopener">Privacy Notice</Link>.</span></label>
        <button className="btn-primary" disabled={!!busy}>{busy === 'email' ? 'Creating your account…' : 'Create Account'}<ArrowRight size={16} /></button>
      </form>
    </>}
    {error && <div className="auth-alert mt-4" role="alert">{error}</div>}
    {notice && <p className="auth-status" role="status">{notice}</p>}
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthLayout>;
};
