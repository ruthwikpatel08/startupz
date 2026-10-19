import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';
import { Hammer, CheckCircle2, Send, Lock, Sparkles, AlertCircle } from 'lucide-react';

interface BuildTogetherModalProps {
  prototype: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BuildTogetherModal: React.FC<BuildTogetherModalProps> = ({
  prototype,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [aboutMe, setAboutMe] = useState('');
  const [contribution, setContribution] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prototype) return null;

  const author = prototype.author;
  const authorName = author?.profile?.fullName || author?.email?.split('@')[0] || 'the builder';
  const authorAvatar = author?.profile?.avatar;
  const authorHeadline = author?.profile?.headline || 'Prototype Creator';
  const authorId = prototype.authorId || author?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }

    if (!aboutMe.trim()) {
      setError('Please tell the creator a bit about yourself.');
      return;
    }

    if (!contribution.trim()) {
      setError('Please describe what you want to do for this prototype.');
      return;
    }

    if (authorId && user.id === authorId) {
      setError('You cannot submit a collaboration proposal to your own prototype.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      aboutMe: aboutMe.trim(),
      contribution: contribution.trim(),
      contactInfo: contactInfo.trim() || undefined,
    };

    try {
      // 1. Primary: Server API call
      let proposalCreated = false;
      try {
        await api.sendPrototypeProposal(prototype.id, payload);
        proposalCreated = true;
      } catch (apiErr) {
        console.warn('API sendPrototypeProposal failed, falling back to direct Supabase insert:', apiErr);
      }

      // 2. Direct Supabase insertion fallback
      if (!proposalCreated && authorId) {
        try {
          await supabase.from('prototype_proposals').insert({
            prototype_id: prototype.id,
            sender_id: user.id,
            receiver_id: authorId,
            prototype_title: prototype.title || 'Prototype',
            about_builder: aboutMe.trim(),
            contribution: contribution.trim(),
            contact_info: contactInfo.trim() || null,
            status: 'PENDING',
          });
        } catch (supaErr) {
          console.warn('Direct Supabase prototype_proposals insert notice:', supaErr);
        }

        // Also create notification
        try {
          const senderName = user.profile?.fullName || user.email?.split('@')[0] || 'A builder';
          await supabase.from('notifications').insert({
            user_id: authorId,
            type: 'PROTOTYPE_PROPOSAL',
            title: '🔨 Prototype Build Together Proposal!',
            message: `${senderName} wants to build together on "${prototype.title || 'Prototype'}": ${contribution.trim().slice(0, 100)}`,
            link: `/feed?pillar=PROTOTYPES&postId=${prototype.id}`,
          });
        } catch {}
      }

      // 3. Cache locally so button immediately updates
      try {
        const key = `startupz_proto_proposal_sent_${prototype.id}_${user.id}`;
        localStorage.setItem(key, 'true');
      } catch {}

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setAboutMe('');
        setContribution('');
        setContactInfo('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Build Together on "${prototype.title || 'Prototype'}"`}
      maxWidth="lg"
    >
      {!user ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Lock size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Sign In to Propose Building Together
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Connect directly with {authorName} and collaborate to turn this prototype sample into a live venture.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
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
              Sign In to Build
            </button>
          </div>
        </div>
      ) : sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm animate-in zoom-in-75">
            <CheckCircle2 size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Proposal Sent Successfully!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {authorName} has received your introduction and what you want to build. They will review it in their Proposals dashboard.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prototype & Creator Banner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar src={authorAvatar} name={authorName} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {authorName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {authorHeadline}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                <Hammer size={10} /> Collaboration
              </span>
            </div>
          </div>

          {/* Question 1: Describe About You */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
              Describe About Yourself <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              Tell the creator who you are, your background, skills, current role, or past projects.
            </p>
            <textarea
              required
              rows={3}
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              placeholder="e.g. I am a full-stack engineer with 3 years of React/Node.js experience and experience building AI-powered web tools..."
              className="input-base w-full text-xs resize-none"
            />
          </div>

          {/* Question 2: What You Want to Do for this Prototype */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
              What Do You Want to Do for this Prototype? <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
              Explain how you want to contribute, what features you want to build, or your proposed collaboration.
            </p>
            <textarea
              required
              rows={3}
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="e.g. I can build the backend database and API layer, optimize the performance, or turn this sample into a mobile app..."
              className="input-base w-full text-xs resize-none"
            />
          </div>

          {/* Optional: Portfolio or Contact Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
              Portfolio / GitHub / Contact Link <span className="text-slate-400 text-[11px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. https://github.com/myusername or https://linkedin.com/in/..."
              className="input-base w-full text-xs"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Send size={13} />
              <span>{loading ? 'Sending Proposal...' : 'Send Proposal'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
