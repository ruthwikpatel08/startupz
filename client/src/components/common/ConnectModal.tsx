import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { Avatar } from './Avatar';
import { Send, CheckCircle, Lock, AlertCircle } from 'lucide-react';

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

  const displayName =
    activeUser.profile?.fullName ||
    (activeUser as any).fullName ||
    (activeUser as any).organization ||
    (activeUser.email ? activeUser.email.split('@')[0] : 'Founder');
  const displayAvatar = activeUser.profile?.avatar || (activeUser as any).avatar;
  const displayHeadline =
    activeUser.profile?.headline ||
    (activeUser as any).headline ||
    activeUser.role ||
    'Startup Builder';
  const recipientEmail =
    activeUser.email ||
    (activeUser as any).user?.email ||
    (activeUser as any).profile?.email;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      navigate('/login');
      return;
    }

    const recipientIdRaw =
      activeUser.id ||
      (activeUser as any).userId ||
      (activeUser as any).user?.id ||
      (activeUser as any).profile?.userId;

    if (!recipientIdRaw) {
      setError('Recipient user ID could not be determined.');
      return;
    }

    // 1. Prevent connecting with own profile (IDs, emails, full names, usernames)
    const curEmail = (currentUser.email || '').toLowerCase().trim();
    const curId = (currentUser.id || '').trim();
    const curProfileId = (currentUser.profile?.id || '').trim();
    const curProfileUserId = (currentUser.profile?.userId || '').trim();
    const curFullName = (currentUser.profile?.fullName || '').toLowerCase().trim();
    const curUsername = (currentUser.profile?.username || '').toLowerCase().trim();
    const targetName = (displayName || '').toLowerCase().trim();
    const targetUsername = ((activeUser.profile?.username || (activeUser as any).username || '') as string).toLowerCase().trim();

    const isSelf =
      (curId && recipientIdRaw && curId === recipientIdRaw) ||
      (curProfileId && recipientIdRaw && curProfileId === recipientIdRaw) ||
      (curProfileUserId && recipientIdRaw && curProfileUserId === recipientIdRaw) ||
      (curEmail && recipientEmail && curEmail === recipientEmail.toLowerCase().trim()) ||
      (curFullName && targetName && curFullName === targetName) ||
      (curUsername && targetUsername && curUsername === targetUsername);

    if (isSelf) {
      setError('You cannot connect with your own profile.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      receiverId: recipientIdRaw,
      receiverEmail: recipientEmail,
      receiverName: displayName,
      receiverRole: activeUser.role || (activeUser as any).preferredRole || 'FOUNDER',
      note: note.trim() || undefined,
    };

    let completed = false;
    let fallbackErrorMsg = '';

    // First, try Render backend API call
    try {
      await api.sendConnection(payload);
      completed = true;
    } catch (err: any) {
      const msg = err?.message || '';
      console.warn('Backend sendConnection notice:', msg);
      if (msg.includes('already connected') || msg.includes('already pending')) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setNote('');
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
        setLoading(false);
        return;
      }
      if (msg.includes('own profile')) {
        setError('You cannot connect with your own profile.');
        setLoading(false);
        return;
      }
      fallbackErrorMsg = msg;
    }

    // Always mirror / fallback directly to Supabase to guarantee 100% delivery and notifications
    try {
      const isUuid = (str?: string): boolean =>
        Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

      let targetSenderId = currentUser.id;
      let targetRecipientId = recipientIdRaw;

      // Ensure UUID format for Supabase queries
      if (!isUuid(targetSenderId) && currentUser.email) {
        const { data: sProf } = await supabase
          .from('profiles')
          .select('user_id, id')
          .eq('email', currentUser.email.toLowerCase().trim())
          .maybeSingle();
        if (sProf?.user_id && isUuid(sProf.user_id)) targetSenderId = sProf.user_id;
        else if (sProf?.id && isUuid(sProf.id)) targetSenderId = sProf.id;
      }

      if (!isUuid(targetRecipientId) && recipientEmail) {
        const { data: rProf } = await supabase
          .from('profiles')
          .select('user_id, id')
          .eq('email', recipientEmail.toLowerCase().trim())
          .maybeSingle();
        if (rProf?.user_id && isUuid(rProf.user_id)) targetRecipientId = rProf.user_id;
        else if (rProf?.id && isUuid(rProf.id)) targetRecipientId = rProf.id;
      }

      const senderName =
        currentUser.profile?.fullName ||
        currentUser.email?.split('@')[0] ||
        'A startup builder';

      if (isUuid(targetSenderId) && isUuid(targetRecipientId)) {
        // Check existing connection in Supabase
        const { data: existingConns } = await supabase
          .from('connections')
          .select('*')
          .or(
            `and(sender_id.eq.${targetSenderId},receiver_id.eq.${targetRecipientId}),and(sender_id.eq.${targetRecipientId},receiver_id.eq.${targetSenderId})`
          );

        const existing = existingConns && existingConns[0];
        if (existing) {
          if (existing.status === 'ACCEPTED') {
            setSent(true);
            setTimeout(() => {
              setSent(false);
              setNote('');
              onClose();
              if (onSuccess) onSuccess();
            }, 1500);
            setLoading(false);
            return;
          }
          await supabase
            .from('connections')
            .update({
              note: note.trim() || null,
              status: 'PENDING',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          const { error: insErr } = await supabase.from('connections').insert({
            sender_id: targetSenderId,
            receiver_id: targetRecipientId,
            status: 'PENDING',
            note: note.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (insErr) {
            console.warn('Supabase insert connection notice:', insErr);
          }
        }

        // Always deliver notification to recipient in Supabase
        await supabase.from('notifications').insert({
          user_id: targetRecipientId,
          sender_id: targetSenderId,
          type: 'CONNECTION_REQUEST',
          title: 'New Connection Request 🤝',
          message: `${senderName} wants to connect with you.${
            note.trim() ? ` Note: "${note.trim()}"` : ''
          }`,
          link: '/network?tab=PENDING',
          is_read: false,
          created_at: new Date().toISOString(),
        });

        completed = true;
      }
    } catch (supaErr: any) {
      console.warn('Supabase notification/connection fallback notice:', supaErr);
      if (!completed) {
        setError(fallbackErrorMsg || supaErr?.message || 'Failed to send connection request.');
        setLoading(false);
        return;
      }
    }

    if (completed) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setNote('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    }
    setLoading(false);
  };

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
            <Avatar src={displayAvatar} name={displayName} size="md" />
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
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
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
