import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import logoIcon from '../../assets/logo-icon.png';
import './AuthLayout.css';

export const AuthLayout: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="auth-stage">
    <Link to="/" className="auth-back"><ArrowLeft size={15} /> Back to HookZ</Link>
    <div className="auth-orbit" aria-hidden="true" />
    <div className="auth-card">
      <Link to="/" className="brand-wordmark"><img src={logoIcon} alt="" />HookZ</Link>
      <div className="auth-heading"><span className="auth-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h1>{title}</h1><p>{subtitle}</p></div>
      {children}
    </div>
    <p className="auth-caption">A little curiosity. A great team. Something worth building.</p>
  </div>
);

export const GoogleButton: React.FC<{ onClick: () => void; disabled: boolean; loading: boolean }> = ({ onClick, disabled, loading }) => (
  <button className="btn-secondary auth-google" type="button" onClick={onClick} disabled={disabled}>
    {loading ? <LoaderCircle size={18} className="animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.5v3h3.9c2.3-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9L16 18c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.8-2.1-6.7-4.9H1.2v3.2C3.3 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.3 14.2a7.3 7.3 0 010-4.4V6.6H1.2a12 12 0 000 10.8z"/><path fill="#EA4335" d="M12 4.9c1.8 0 3.3.6 4.6 1.8L20 3.3A11.5 11.5 0 0012 0C7.3 0 3.3 2.7 1.2 6.6l4.1 3.2C6.2 7 8.9 4.9 12 4.9z"/></svg>}
    {loading ? 'Connecting to Google…' : 'Continue with Google'}
  </button>
);
