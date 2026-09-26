import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Video, Calendar, Clock, Copy, Check, ExternalLink, ShieldAlert, Lock } from 'lucide-react';

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
  const avatar =
    targetUser.profile?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;

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
      title="📹 Video Meeting & Pitch Room"
      maxWidth="lg"
    >
      {!user ? (
        <div className="py-6 space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
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
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-500/25 cursor-pointer"
            >
              Sign In to Meet
            </button>
          </div>
        </div>
      ) : createdRoomCode ? (
        <div className="py-6 space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Video size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {meetingType === 'instant' ? 'Instant Video Room Ready!' : 'Meeting Scheduled!'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {meetingType === 'instant'
                ? `You and ${displayName} can join right now via your private secure room.`
                : `A calendar invite and notification have been sent to ${displayName}.`}
            </p>
          </div>

          {/* Room Link Box */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-left">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Meeting Room Link</span>
              <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 truncate block">
                {window.location.origin}/meeting/{createdRoomCode}
              </span>
            </div>
            <button
              onClick={copyRoomLink}
              className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
              title="Copy room link"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setCreatedRoomCode(null);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Done
            </button>
            <button
              onClick={handleJoinNow}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 rounded-xl shadow-md transition-all"
            >
              <ExternalLink size={14} />
              <span>Join Video Room Now</span>
            </button>
          </div>
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
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 border border-cyan-200 dark:border-cyan-800">
              Live Video Sync
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMeetingType('instant')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                meetingType === 'instant'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video size={14} />
              <span>Instant Call</span>
            </button>
            <button
              type="button"
              onClick={() => setMeetingType('scheduled')}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                meetingType === 'scheduled'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar size={14} />
              <span>Schedule Call</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Co-Founder Fit & Technical Architecture Sync"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {meetingType === 'scheduled' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    durationMinutes === mins
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Agenda & Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What would you like to discuss? (e.g. Walkthrough MVP demo, discuss equity terms, review code repo)"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-brand-600 hover:from-cyan-500 hover:to-brand-500 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Video size={14} />
              <span>{loading ? 'Creating Meeting...' : meetingType === 'instant' ? 'Start Instant Call' : 'Schedule Meeting'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
