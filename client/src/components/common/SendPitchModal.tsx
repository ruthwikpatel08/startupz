import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { Investor, Startup } from '../../types';
import { Send, CheckCircle, TrendingUp } from 'lucide-react';

interface SendPitchModalProps {
  investor: Investor | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userStartups?: Startup[];
}

export const SendPitchModal: React.FC<SendPitchModalProps> = ({
  investor,
  isOpen,
  onClose,
  onSuccess,
  userStartups,
}) => {
  const [myStartups, setMyStartups] = useState<Startup[]>(userStartups || []);
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [pitchSummary, setPitchSummary] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingStartups, setFetchingStartups] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFetchingStartups(true);
      api.getStartups({ limit: 50 })
        .then((data) => {
          setMyStartups(data || []);
          if (data && data.length > 0) {
            setSelectedStartupId(data[0].id);
          }
        })
        .catch(console.error)
        .finally(() => setFetchingStartups(false));
    }
  }, [isOpen]);

  if (!investor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitchSummary.trim()) {
      setError('Please provide a short pitch overview.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await api.sendPitch(investor.id, {
        startupId: selectedStartupId || undefined,
        pitchSummary,
        pitchDeckUrl,
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setPitchSummary('');
        setPitchDeckUrl('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit pitch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pitch to ${investor.organization}`} maxWidth="lg">
      {sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Pitch Dispatched!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {investor.user?.profile?.fullName || investor.organization} will review your startup profile and materials.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">{investor.organization}</span>
              <span className="text-slate-400 mx-1.5">•</span>
              <span className="text-slate-500 dark:text-slate-400">{investor.investorType}</span>
            </div>
            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
              Check: {investor.minCheckSize || '$25K'} - {investor.maxCheckSize || '$250K'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Select Startup to Pitch
            </label>
            {fetchingStartups ? (
              <div className="text-xs text-slate-400 animate-pulse">Loading startups...</div>
            ) : myStartups.length > 0 ? (
              <select
                value={selectedStartupId}
                onChange={(e) => setSelectedStartupId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {myStartups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.industry} • {s.stage})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400">
                You haven't registered a startup yet. Your pitch will be sent as an independent founder introduction.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Executive Summary & Traction Highlights *
            </label>
            <textarea
              required
              value={pitchSummary}
              onChange={(e) => setPitchSummary(e.target.value)}
              placeholder="State what problem you solve, your current revenue or user growth (e.g. 5,000 active users, $12k MRR), and your round target..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Pitch Deck or Demo Link
            </label>
            <input
              type="url"
              value={pitchDeckUrl}
              onChange={(e) => setPitchDeckUrl(e.target.value)}
              placeholder="https://docsend.com/view/..."
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
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              <Send size={15} />
              {loading ? 'Submitting...' : 'Send Pitch'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
