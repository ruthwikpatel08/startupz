import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { Send, CheckCircle, Lock } from 'lucide-react';

interface ConnectModalProps {
  user?: User | null;
  targetUser?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  user,
  targetUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const activeUser = user || targetUser;
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeUser) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.sendConnection(activeUser.id, note.trim() || undefined);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setNote('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send connection request.');
    } finally {
      setLoading(false);
    }
  };

  const displayName = activeUser.profile?.fullName || (activeUser as any).fullName || activeUser.email || 'Founder';
  const displayAvatar = activeUser.profile?.avatar || (activeUser as any).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeUser.email || activeUser.id}`;
  const displayHeadline = activeUser.profile?.headline || (activeUser as any).headline || activeUser.role;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Connect with ${displayName}`}>
      {!currentUser ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Sign In Required to Connect</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Join StartupZ or log in to send connection requests and collaborate with {displayName}.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 cursor-pointer"
            >
              Sign In to Connect
            </button>
          </div>
        </div>
      ) : sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Connection Request Sent!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {displayName} will receive your invitation and note.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {displayName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {displayHeadline}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Personalized Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hi, I noticed your background in tech and startup experience. I'd love to connect to discuss potential collaboration!"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              <Send size={15} />
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
