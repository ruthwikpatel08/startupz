import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, UserPlus, ArrowRight, Sparkles } from 'lucide-react';

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount?: (email: string) => void;
}

interface RealGoogleAccount {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  tag?: string;
}

const REGISTERED_GOOGLE_ACCOUNTS: RealGoogleAccount[] = [
  {
    email: 'ruthwikpatel08@gmail.com',
    name: 'Ruthwik Patel',
    role: 'FOUNDER',
    tag: 'Founder & Lead',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Ruthwik%20Patel&backgroundColor=4f46e5,06b6d4,10b981',
  },
  {
    email: 'legacyplayer04@gmail.com',
    name: 'Legacy',
    role: 'FOUNDER',
    tag: 'Verified Founder',
    avatar: 'https://lh3.googleusercontent.com/a/ACg8ocIBc2tvgpVoh9lUYtp3FBYhmXWQqnl0Kgi2vmdN2vm_TDwgtw=s96-c',
  },
  {
    email: 'lavanyadav0206@gmail.com',
    name: 'lavan yadav',
    role: 'INVESTOR',
    tag: 'Verified Investor',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=lavan%20yadav&backgroundColor=4f46e5,06b6d4,10b981',
  },
];

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { loginWithGoogleAccount } = useAuth();
  const navigate = useNavigate();

  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('FOUNDER');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChoose = async (account: RealGoogleAccount) => {
    setSelectedEmail(account.email);
    setSubmitting(true);
    try {
      await loginWithGoogleAccount({
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        role: account.role,
      });
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error('Google account selection error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) return;

    setSubmitting(true);
    try {
      const email = customEmail.trim().toLowerCase();
      const name = customName.trim() || email.split('@')[0];
      await loginWithGoogleAccount({
        email,
        name,
        role: customRole,
      });
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error('Custom Google sign-in error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[400px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-modal overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Sign in with Google
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

        {/* Title */}
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Choose an account
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            to continue to <strong className="text-slate-800 dark:text-slate-200">StartupZ</strong>
          </p>
        </div>

        {/* Account Selector List */}
        <div className="px-3 pb-3 space-y-1 font-sans">
          {REGISTERED_GOOGLE_ACCOUNTS.map((acc) => {
            const isSelected = selectedEmail === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                disabled={submitting}
                onClick={() => handleChoose(acc)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/70 border border-brand-300 dark:border-brand-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </span>
                      {acc.tag && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                          {acc.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono block truncate">
                      {acc.email}
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 group-hover:text-brand-600 transition-colors shrink-0 ml-2">
                  {submitting && isSelected ? (
                    <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={14} />
                  )}
                </div>
              </button>
            );
          })}

          {/* Use another account toggle */}
          {!customMode ? (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer border border-transparent transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                <UserPlus size={16} />
              </div>
              <div className="flex-1">
                <span>Use another account</span>
                <span className="text-[11px] text-slate-400 block font-normal">
                  Enter your Gmail or Workspace address
                </span>
              </div>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-2.5 mt-1 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand-600" />
                <span>Enter Google Account Details</span>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Gmail / Workspace Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. yourname@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="input-base !py-1.5 !text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Your Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input-base !py-1.5 !text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Primary Role
                </label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="input-base !py-1.5 !text-xs"
                >
                  <option value="FOUNDER">Founder (Building a Startup)</option>
                  <option value="COFOUNDER">Co-Founder (Seeking Synergy)</option>
                  <option value="INVESTOR">Investor (Angel / VC Backer)</option>
                  <option value="MARKETER">Marketer (Growth Specialist)</option>
                  <option value="DEVELOPER">Developer (Engineer / Tech)</option>
                  <option value="DESIGNER">Designer (UI/UX / Product)</option>
                  <option value="MENTOR">Mentor (Advisor / Coach)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 !py-1.5 !text-xs"
                >
                  {submitting ? 'Signing in...' : 'Sign In & Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="btn-secondary !py-1.5 !text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          Secure connection to StartupZ ecosystem database.
        </div>
      </div>
    </div>
  );
};
