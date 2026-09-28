import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './Avatar';
import { Video, Calendar, Copy, Check, ExternalLink, ShieldAlert, Lock } from 'lucide-react';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: any;
  onSuccess?: () => void;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetingType, setMeetingType] = useState<'instant' | 'scheduled'>('instant');
  const [title, setTitle] = useState('Founder Sync & Collaboration');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!targetUser) return null;

  const displayName = targetUser.profile?.fullName || targetUser.email.split('@')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a meeting title.');
      return;
    }

    let scheduledAtIso: string | undefined = undefined;
    if (meetingType === 'scheduled') {
      if (!scheduledDate) {
        setError('Please select a date for the scheduled meeting.');
        return;
      }
      scheduledAtIso = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    } else {
      scheduledAtIso = new Date().toISOString();
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.scheduleMeeting({
        guestId: targetUser.id,
        title: title.trim(),
        scheduledAt: scheduledAtIso,
        durationMinutes,
        notes: notes.trim(),
      });

      const room = res.meeting?.roomCode || res.roomCode;
      setCreatedRoomCode(room);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize video meeting.');
    } finally {
      setLoading(false);
    }
  };

  const copyRoomLink = () => {
    if (!createdRoomCode) return;
    const url = `${window.location.origin}/meeting/${createdRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinNow = () => {
    if (createdRoomCode) {
      onClose();
      navigate(`/meeting/${createdRoomCode}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) {
          setError(null);
          setCreatedRoomCode(null);
          onClose();
        }
      }}
      title="Video Meeting & Pitch Room"
      maxWidth="lg"
    >
      {!user ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-md bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Lock size={18} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sign In Required
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please sign in to schedule or host video pitch meetings with {displayName}.
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
              Sign In to Meet
            </button>
          </div>
        </div>
      ) : createdRoomCode ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-md bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
            <Video size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {meetingType === 'instant' ? 'Instant Video Room Ready' : 'Meeting Scheduled'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {meetingType === 'instant'
                ? `You and ${displayName} can join right now via your private secure room.`
                : `A calendar invite and notification have been sent to ${displayName}.`}
            </p>
          </div>

          {/* Room Link Box */}
          <div className="p-3 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-left">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Meeting Room Link</span>
              <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 truncate block">
                {window.location.origin}/meeting/{createdRoomCode}
              </span>
            </div>
            <button
              onClick={copyRoomLink}
              className="p-1.5 rounded-md bg-white dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Copy room link"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setCreatedRoomCode(null);
                onClose();
              }}
              className="btn-secondary"
            >
              Done
            </button>
            <button
              onClick={handleJoinNow}
              className="btn-primary"
            >
              <ExternalLink size={13} />
              <span>Join Video Room Now</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Profile Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800">
            <Avatar
              src={targetUser.profile?.avatar}
              name={displayName}
              size="md"
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
              Video Sync
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md bg-slate-100 dark:bg-dark-850">
            <button
              type="button"
              onClick={() => setMeetingType('instant')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
                meetingType === 'instant'
                  ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video size={13} />
              <span>Instant Call</span>
            </button>
            <button
              type="button"
              onClick={() => setMeetingType('scheduled')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
                meetingType === 'scheduled'
                  ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-subtle'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={13} />
              <span>Schedule Call</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Co-Founder Fit & Technical Architecture Sync"
              className="input-base"
            />
          </div>

          {meetingType === 'scheduled' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    durationMinutes === mins
                      ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-600 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-850'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
              Agenda & Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What would you like to discuss? (e.g. Walkthrough MVP demo, discuss equity terms)"
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
              <Video size={13} />
              <span>{loading ? 'Creating Meeting...' : meetingType === 'instant' ? 'Start Instant Call' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
