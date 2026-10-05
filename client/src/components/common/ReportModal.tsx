import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ShieldAlert } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'USER' | 'POST' | 'STARTUP' | 'INVESTOR';
  targetId: string;
  targetTitle?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createReport({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to submit safety report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Inappropriate Content">
      {!user ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <div className="w-10 h-10 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
            <ShieldAlert size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Sign In Required</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Please sign in to submit a safety report to our moderation team.
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
              className="btn-danger"
            >
              Sign In to Report
            </button>
          </div>
        </div>
      ) : submitted ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={20} />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Report Received</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thank you for helping keep HookZ safe. Our moderation team will investigate this report promptly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Reporting {targetType.toLowerCase()} {targetTitle ? `"${targetTitle}"` : ''}. All reports are reviewed privately by our safety team.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason for reporting
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-base"
            >
              <option value="SPAM">Spam or unwanted solicitation</option>
              <option value="SCAM">Fraudulent startup claim or scam</option>
              <option value="FAKE_PROFILE">Fake profile or impersonation</option>
              <option value="INAPPROPRIATE">Harassment or hate speech</option>
              <option value="IP_INFRINGEMENT">Intellectual property violation</option>
              <option value="OTHER">Other violation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or evidence..."
              rows={3}
              className="input-base resize-none"
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
              className="btn-danger"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
