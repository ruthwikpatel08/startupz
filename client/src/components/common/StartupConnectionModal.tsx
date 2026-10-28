import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Avatar } from './Avatar';
import { Rocket, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';

interface StartupConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: any;
  onSuccess?: () => void;
}

export const StartupConnectionModal: React.FC<StartupConnectionModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ideaTitle, setIdeaTitle] = useState('');
  const [pitchDescription, setPitchDescription] = useState('');
  const [proposedRole, setProposedRole] = useState('Technical Co-Founder');
  const [proposedEquity, setProposedEquity] = useState('30% - 50% Equity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!targetUser) return null;

  const displayName =
    targetUser.profile?.fullName ||
    targetUser.fullName ||
    targetUser.organization ||
    (targetUser.email ? targetUser.email.split('@')[0] : '') ||
    targetUser.username ||
    'Member';
  const avatar = targetUser.profile?.avatar || targetUser.avatar;
  const recipientEmail =
    targetUser.email ||
    targetUser.user?.email ||
    targetUser.profile?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    if (!ideaTitle.trim() || !pitchDescription.trim()) {
      setError('Please provide a startup title and pitch description.');
      return;
    }

    const recipientIdRaw =
      targetUser.id ||
      targetUser.userId ||
      targetUser.user?.id ||
      targetUser.profile?.userId;

    if (!recipientIdRaw) {
      setError('Recipient user ID could not be determined.');
      return;
    }

    // Prevent pitching self (IDs, emails, full names, usernames)
    const curEmail = (user.email || '').toLowerCase().trim();
    const curId = (user.id || '').trim();
    const curProfileId = (user.profile?.id || '').trim();
    const curProfileUserId = (user.profile?.userId || '').trim();
    const curFullName = (user.profile?.fullName || '').toLowerCase().trim();
    const curUsername = (user.profile?.username || '').toLowerCase().trim();
    const targetName = (displayName || '').toLowerCase().trim();
    const targetUsername = ((targetUser.profile?.username || targetUser.username || '') as string).toLowerCase().trim();

    const isSelf =
      (curId && recipientIdRaw && curId === recipientIdRaw) ||
      (curProfileId && recipientIdRaw && curProfileId === recipientIdRaw) ||
      (curProfileUserId && recipientIdRaw && curProfileUserId === recipientIdRaw) ||
      (curEmail && recipientEmail && curEmail === recipientEmail.toLowerCase().trim()) ||
      (curFullName && targetName && curFullName === targetName) ||
      (curUsername && targetUsername && curUsername === targetUsername);

    if (isSelf) {
      setError('You cannot send a startup collaboration proposal to your own profile.');
      return;
    }

    setLoading(true);
    setError(null);

    let completed = false;
    let backendErrorMsg = '';

    try {
      await api.sendStartupProposal({
        receiverId: recipientIdRaw,
        receiverEmail: recipientEmail,
        receiverName: displayName,
        ideaTitle: ideaTitle.trim(),
        pitchDescription: pitchDescription.trim(),
        proposedRole,
        proposedEquity,
      });
      completed = true;
    } catch (err: any) {
      backendErrorMsg = err?.message || '';
      console.warn('Backend sendStartupProposal notice:', backendErrorMsg);
    }

    // Mirror to Supabase ONLY if backend API is offline or failed to prevent duplicate proposals
    if (!completed) {
      try {
        const isUuid = (str?: string): boolean =>
          Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

        let targetSenderId = user.id;
        let targetRecipientId = recipientIdRaw;

        if (!isUuid(targetSenderId) && user.email) {
          const { data: sProf } = await supabase
            .from('profiles')
            .select('user_id, id')
            .eq('email', user.email.toLowerCase().trim())
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

        if (isUuid(targetSenderId) && isUuid(targetRecipientId)) {
          await supabase.from('startup_proposals').insert({
            sender_id: targetSenderId,
            receiver_id: targetRecipientId,
            idea_title: ideaTitle.trim(),
            pitch_description: pitchDescription.trim(),
            proposed_role: proposedRole,
            proposed_equity: proposedEquity,
            status: 'PENDING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          await supabase.from('notifications').insert({
            user_id: targetRecipientId,
            sender_id: targetSenderId,
            type: 'PROPOSAL_RECEIVED',
            title: 'New Startup Collaboration Pitch 🚀',
            message: `${
              user.profile?.fullName || 'A founder'
            } sent you a proposal for "${ideaTitle.trim()}" (Role: ${proposedRole}).`,
            link: '/network?tab=PROPOSALS',
            is_read: false,
            created_at: new Date().toISOString(),
          });

          completed = true;
        }
      } catch (supaErr: any) {
        console.warn('Supabase proposal fallback notice:', supaErr);
        if (!completed) {
          setError(backendErrorMsg || supaErr?.message || 'Failed to send startup proposal.');
          setLoading(false);
          return;
        }
      }
    }

    if (completed) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIdeaTitle('');
        setPitchDescription('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    }
    setLoading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setError(null);
          setSuccess(false);
          onClose();
        }
      }}
      title="Propose Startup Collaboration"
      maxWidth="lg"
    >
      {!user ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-10 h-10 mx-auto rounded-md bg-[var(--bg-soft)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <Lock size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              Sign In Required
            </h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Please sign in to send a formal startup proposal to {displayName}.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
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
              Sign In to Propose
            </button>
          </div>
        </div>
      ) : success ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Startup Proposal Sent
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {displayName} has been notified and can review your venture idea and terms.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Profile Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
            <Avatar src={avatar} name={displayName} size="md" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {displayName}
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {targetUser.profile?.headline || 'Startup Builder'}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--border-subtle)]">
              Co-Founder Pitch
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
              Venture / Startup Idea Name *
            </label>
            <input
              type="text"
              required
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="e.g. NexusAI — Enterprise CRM for Startups"
              className="input-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Proposed Role for {displayName}
              </label>
              <select
                value={proposedRole}
                onChange={(e) => setProposedRole(e.target.value)}
                className="input-base"
              >
                <option value="Technical Co-Founder">Technical Co-Founder (CTO)</option>
                <option value="Product Co-Founder">Product Co-Founder (CPO)</option>
                <option value="Growth / Marketing Co-Founder">Growth / CMO</option>
                <option value="Operations Co-Founder">Operations (COO)</option>
                <option value="Lead AI / ML Engineer">Lead AI / ML Engineer</option>
                <option value="Full-Stack Founding Engineer">Founding Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Proposed Equity Split
              </label>
              <select
                value={proposedEquity}
                onChange={(e) => setProposedEquity(e.target.value)}
                className="input-base"
              >
                <option value="50/50 Equal Partnership">50/50 Equal Partnership</option>
                <option value="30% - 40% Co-Founder Equity">30% - 40% Co-Founder Equity</option>
                <option value="20% - 30% Equity">20% - 30% Equity</option>
                <option value="10% - 20% Founding Team">10% - 20% Founding Team</option>
                <option value="To Be Discussed">To Be Discussed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
              The Pitch & Problem You're Solving *
            </label>
            <textarea
              required
              rows={4}
              value={pitchDescription}
              onChange={(e) => setPitchDescription(e.target.value)}
              placeholder="Explain the problem you're addressing, your early validation, current traction or MVP progress, and why you want to team up with them specifically..."
              className="input-base resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
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
              <Rocket size={13} />
              <span>{loading ? 'Sending Proposal...' : 'Send Proposal'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
