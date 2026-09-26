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
      title={`💡 Raise a Solution for ${failedStartup.name}'s Problem`}
      maxWidth="xl"
    >
      {!user ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sign In Required
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please sign in to publish your solution to this failed startup challenge and collaborate with builders.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
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
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/25 cursor-pointer"
            >
              Sign In to Submit Solution
            </button>
          </div>
        </div>
      ) : success ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Solution Raised Successfully!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your proposed solution is now published in the Startup Graveyard. Founders, mentors, and investors can upvote, review, and collaborate with you.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Failed Startup Problem Summary */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Lightbulb size={14} /> The Unsolved Problem Left by {failedStartup.name}:
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                {failedStartup.peakFunding} lost
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              "{failedStartup.unsolvedProblem}"
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Your Solution Name / Idea Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Cloud Kitchen Hubs with AI Demand Forecasting"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Solution Blueprint *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="How would your model fix what broke in the original company? What is the business model, unit economics, or tech breakthrough that makes it viable today?"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Audience / Ideal Customer
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Urban busy professionals, SMB merchants"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Key Differentiation & Moat
              </label>
              <input
                type="text"
                value={differentiation}
                onChange={(e) => setDifferentiation(e.target.value)}
                placeholder="e.g. 80% lower capital expenditure via franchise model"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Lightbulb size={14} />
              <span>{loading ? 'Publishing Solution...' : 'Raise Solution'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
