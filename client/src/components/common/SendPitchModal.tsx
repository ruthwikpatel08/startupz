import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Investor, Startup } from '../../types';
import { Send, CheckCircle, Lock } from 'lucide-react';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myStartups, setMyStartups] = useState<Startup[]>(userStartups || []);
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [pitchSummary, setPitchSummary] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingStartups, setFetchingStartups] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
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
  }, [isOpen, user]);

  if (!investor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
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
      {!user ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Lock size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Sign In Required to Send Pitch</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Please sign in to pitch your startup directly to {investor.organization}.
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
              Sign In to Pitch
            </button>
          </div>
        </div>
      ) : sent ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={20} />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Pitch Dispatched</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {investor.user?.profile?.fullName || investor.organization} will review your startup profile.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-2.5 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">{investor.organization}</span>
              <span className="text-slate-400 mx-1.5">•</span>
              <span className="text-slate-500 dark:text-slate-400">{investor.investorType}</span>
            </div>
            <div className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              Check Size: {investor.minCheckSize || '$25K'} - {investor.maxCheckSize || '$250K'}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Startup to Pitch
            </label>
            {fetchingStartups ? (
              <div className="text-xs text-slate-400 animate-pulse">Loading startups...</div>
            ) : myStartups.length > 0 ? (
              <select
                value={selectedStartupId}
                onChange={(e) => setSelectedStartupId(e.target.value)}
                className="input-base"
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
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Executive Summary & Traction Highlights *
            </label>
            <textarea
              required
              value={pitchSummary}
              onChange={(e) => setPitchSummary(e.target.value)}
              placeholder="State what problem you solve, your current revenue or user growth (e.g. 5,000 active users, $12k MRR), and your round target..."
              rows={4}
              className="input-base resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pitch Deck or Demo Link
            </label>
            <input
              type="url"
              value={pitchDeckUrl}
              onChange={(e) => setPitchDeckUrl(e.target.value)}
              placeholder="https://docsend.com/view/..."
              className="input-base"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

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
              <Send size={13} />
              <span>{loading ? 'Submitting...' : 'Send Pitch'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
