import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
  const avatar =
    targetUser.profile?.avatar ||
    targetUser.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;

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

    setLoading(true);
    setError(null);

    try {
      const recipientId = targetUser.id || (targetUser as any).userId || (targetUser as any).user?.id;
      if (!recipientId) throw new Error('Recipient user ID could not be determined.');

      await api.sendStartupProposal({
        receiverId: recipientId,
        ideaTitle: ideaTitle.trim(),
        pitchDescription: pitchDescription.trim(),
        proposedRole,
        proposedEquity,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIdeaTitle('');
        setPitchDescription('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send startup proposal.');
    } finally {
      setLoading(false);
    }
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
          <div className="w-10 h-10 mx-auto rounded-md bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Lock size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sign In Required
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Startup Proposal Sent
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {displayName} has been notified and can review your venture idea and terms.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Profile Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800">
            <img
              src={avatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {displayName}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {targetUser.profile?.headline || 'Startup Builder'}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
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
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
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
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
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
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
