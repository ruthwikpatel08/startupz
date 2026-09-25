import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { Rocket, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  const [ideaTitle, setIdeaTitle] = useState('');
  const [pitchDescription, setPitchDescription] = useState('');
  const [proposedRole, setProposedRole] = useState('Technical Co-Founder');
  const [proposedEquity, setProposedEquity] = useState('30% - 50% Equity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!targetUser) return null;

  const displayName = targetUser.profile?.fullName || targetUser.email.split('@')[0];
  const avatar =
    targetUser.profile?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim() || !pitchDescription.trim()) {
      setError('Please provide a startup title and pitch description.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.sendStartupProposal({
        receiverId: targetUser.id,
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
      title="🚀 Propose Co-Founding a Startup"
      maxWidth="lg"
    >
      {success ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Startup Proposal Sent!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {displayName} has been notified and can review your venture idea, proposed role, and equity breakdown.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Profile Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <img
              src={avatar}
              alt={displayName}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {displayName}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-1">
                {targetUser.profile?.headline || 'Startup Builder'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-600 border border-brand-200 dark:border-brand-800">
              Co-Founder Pitch
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Venture / Startup Idea Name *
            </label>
            <input
              type="text"
              required
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="e.g. NexusAI — Autonomous CRM for Founders"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Proposed Role for {displayName}
              </label>
              <select
                value={proposedRole}
                onChange={(e) => setProposedRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Proposed Equity Split
              </label>
              <select
                value={proposedEquity}
                onChange={(e) => setProposedEquity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              The Pitch & Problem You're Solving *
            </label>
            <textarea
              required
              rows={4}
              value={pitchDescription}
              onChange={(e) => setPitchDescription(e.target.value)}
              placeholder="Explain the problem you're addressing, your early validation, current traction or MVP progress, and why you want to team up with them specifically..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Rocket size={14} />
              <span>{loading ? 'Sending Proposal...' : 'Send Startup Proposal'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
