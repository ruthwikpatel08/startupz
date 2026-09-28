import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
      try {
        await api.sendConnection(activeUser.id, note.trim() || undefined);
      } catch (backendErr) {
        console.warn('Backend connection notice, syncing directly to Supabase:', backendErr);
        const { error: supaErr } = await supabase.from('connections').insert({
          sender_id: currentUser.id,
          receiver_id: activeUser.id,
          note: note.trim() || null,
          status: 'PENDING',
        });
        if (supaErr) throw supaErr;

        try {
          await supabase.from('notifications').insert({
            user_id: activeUser.id,
            sender_id: currentUser.id,
            type: 'CONNECTION_REQUEST',
            title: 'New Connection Request 🤝',
            message: `${currentUser.profile?.fullName || 'A startup builder'} wants to connect with you.${note.trim() ? ` Note: "${note.trim()}"` : ''}`,
            link: '/network?tab=PENDING',
            is_read: false,
          });
        } catch {}
      }

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
          <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Lock size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Sign In Required to Connect</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Join StartupZ or log in to send connection requests and collaborate with {displayName}.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="btn-primary"
            >
              Sign In to Connect
            </button>
          </div>
        </div>
      ) : sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={20} />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Connection Request Sent</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {displayName} will receive your invitation and note.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                {displayName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {displayHeadline}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Personalized Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hi, I noticed your startup background. I'd love to connect to discuss potential synergy!"
              rows={3}
              className="input-base"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              <Send size={13} />
              <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
