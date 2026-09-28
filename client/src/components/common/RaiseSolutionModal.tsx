import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FailedStartup } from '../../types';
import { Lightbulb, Sparkles, CheckCircle2, ShieldAlert, ArrowRight, Lock } from 'lucide-react';

interface RaiseSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedStartup: FailedStartup | null;
  onSuccess?: (newSolution: any) => void;
}

export const RaiseSolutionModal: React.FC<RaiseSolutionModalProps> = ({
  isOpen,
  onClose,
  failedStartup,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [differentiation, setDifferentiation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!failedStartup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Please provide a solution title and detailed description.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.raiseSolution(failedStartup.id, {
        title: title.trim(),
        description: description.trim(),
        targetAudience: targetAudience.trim() || undefined,
        differentiation: differentiation.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        setTargetAudience('');
        setDifferentiation('');
        onClose();
        if (onSuccess) onSuccess(res.solution || res);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit your solution proposal.');
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
      title={`Propose Solution — ${failedStartup.name}`}
      maxWidth="xl"
    >
      {!user ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <Lock size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sign In Required
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please sign in to publish your solution to this startup challenge and collaborate with builders.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary !text-xs !py-1.5 !px-3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="btn-primary !text-xs !py-1.5 !px-3.5"
            >
              Sign In to Submit
            </button>
          </div>
        </div>
      ) : success ? (
        <div className="py-6 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Solution Submitted
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your proposed solution is now published. Founders, mentors, and investors can review and collaborate with you.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 font-sans">
          {/* Failed Startup Problem Summary */}
          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber-600" /> Challenge left by {failedStartup.name}:
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium">
                {failedStartup.peakFunding} lost
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              "{failedStartup.unsolvedProblem}"
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Solution Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Cloud Kitchen Hubs with AI Demand Forecasting"
              className="input-base !text-xs !py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Solution Blueprint *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How would your model fix what broke in the original company? What business model or tech makes it viable today?"
              className="input-base !text-xs !py-2 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Target Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Urban busy professionals, SMB merchants"
                className="input-base !text-xs !py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Key Differentiation & Moat
              </label>
              <input
                type="text"
                value={differentiation}
                onChange={(e) => setDifferentiation(e.target.value)}
                placeholder="e.g. 80% lower capital expenditure via franchise model"
                className="input-base !text-xs !py-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary !text-xs !py-1.5 !px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary !text-xs !py-1.5 !px-3.5 inline-flex items-center gap-1.5"
            >
              <Lightbulb size={13} />
              <span>{loading ? 'Submitting...' : 'Submit Solution'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
