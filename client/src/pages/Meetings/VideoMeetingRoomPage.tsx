import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { VideoMeeting } from '../../types';
import { Avatar } from '../../components/common/Avatar';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  MessageSquare,
  FileText,
  Copy,
  Check,
  Users,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Volume2,
} from 'lucide-react';

export const VideoMeetingRoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<VideoMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio / Video device states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | null>('chat');

  // Local media stream
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hasWebcamAccess, setHasWebcamAccess] = useState(false);

  // In-call chat messages
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'StartupZ AI Assistant', text: 'Welcome to your private encrypted pitch room! Meeting notes will auto-sync.', time: 'Just now' },
  ]);
  const [messageInput, setMessageInput] = useState('');

  // Meeting notes
  const [meetingNotes, setMeetingNotes] = useState(
    '### Founder Sync Notes\n- Agenda: Review MVP Traction & Architecture\n- Discussion points:\n  1. Frontend React & Supabase integration\n  2. Target co-founder equity split\n  3. Launch timeline & milestones\n- Next steps agreed:'
  );

  // Call duration timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    const fetchMeeting = async () => {
      try {
        const data = await api.getMeetingRoom(roomCode);
        setMeeting(data.meeting || data);
      } catch (err: any) {
        setError(err.message || 'Meeting room not found or expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [roomCode]);

  // Request actual user webcam / mic if possible
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initCamera = async () => {
      if (isCameraOn && navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            setHasWebcamAccess(true);
          }
        } catch (e) {
          // Fallback to simulated stream if camera permission denied or unavailable
          setHasWebcamAccess(false);
        }
      }
    };
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOn]);

  // Run call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    const myName = currentUser?.profile?.fullName || currentUser?.email.split('@')[0] || 'Me';
    setChatMessages((prev) => [
      ...prev,
      {
        sender: myName,
        text: messageInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setMessageInput('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEndCall = async () => {
    if (meeting?.id) {
      try {
        await api.updateMeetingStatus(meeting.id, 'COMPLETED');
      } catch (e) {
        console.error(e);
      }
    }
    navigate('/network');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Entering encrypted video room...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950 mx-auto flex items-center justify-center text-rose-500">
          <VideoOff size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Join Room</h2>
        <p className="text-xs text-slate-500">{error || 'This video meeting is invalid or has ended.'}</p>
        <button
          onClick={() => navigate('/network')}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const hostName = meeting.host?.profile?.fullName || meeting.host?.email?.split('@')[0] || 'Host';
  const guestName = meeting.guest?.profile?.fullName || meeting.guest?.email?.split('@')[0] || 'Guest Partner';

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Top Meeting Header */}
      <div className="card-base p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold border border-brand-100 dark:border-brand-900/40">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{meeting.title}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                LIVE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Private room code: <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{roomCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 dark:bg-dark-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700">
            <Clock size={13} className="text-slate-500" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied Link' : 'Invite'}</span>
          </button>

          {/* Toggle Chat / Notes button */}
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            className={`p-2 rounded-md text-xs transition-colors border ${
              activeTab === 'chat'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700'
            }`}
            title="Toggle In-Call Chat"
          >
            <MessageSquare size={15} />
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'notes' ? null : 'notes')}
            className={`p-2 rounded-md text-xs transition-colors border ${
              activeTab === 'notes'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700'
            }`}
            title="Toggle Live Notes"
          >
            <FileText size={15} />
          </button>
        </div>
      </div>

      {/* Main Video Arena + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[580px]">
        {/* Video Stage (3 cols if side panel open, else 4 cols) */}
        <div className={`space-y-4 ${activeTab ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[480px]">
            {/* 1. Host / Local Participant Tile */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-xs">
              {isCameraOn && hasWebcamAccess ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              ) : isCameraOn ? (
                /* Simulated video stream */
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 p-6 text-center">
                  <div className="relative">
                    <Avatar
                      src={currentUser?.profile?.avatar}
                      name={hostName}
                      size="2xl"
                      className="w-20 h-20 border-2 border-brand-500 shadow-md"
                    />
                    {isMicOn && (
                      <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-sm">
                        <Volume2 size={11} />
                      </span>
                    )}
                  </div>
                  <span className="mt-3 text-xs font-semibold text-white">{hostName} (You)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Connected Camera</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center">
                    <VideoOff size={20} />
                  </div>
                  <span className="text-xs font-medium text-slate-400">Camera Paused</span>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-xs text-white text-xs font-medium">
                <span>{hostName} (You)</span>
                {!isMicOn && <MicOff size={12} className="text-rose-400" />}
              </div>
            </div>

            {/* 2. Guest / Peer Participant Tile */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-xs">
              {isScreenSharing ? (
                /* Screen sharing mode */
                <div className="w-full h-full p-6 flex flex-col justify-between bg-slate-900 border-2 border-dashed border-brand-500/40 rounded-lg">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-400">
                    <span className="flex items-center gap-1.5">
                      <Monitor size={14} /> Presenting: Pitch Deck & Architecture Demo
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                      1080p 60fps
                    </span>
                  </div>
                  <div className="space-y-2 text-center py-10">
                    <h3 className="text-base font-bold text-white">StartupZ Live Screen Share</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Showing interactive product mockups, codebase structure, and financial model.
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">Encrypted Channel</div>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-850 to-slate-900 p-6 text-center">
                  <div className="relative">
                    <Avatar
                      src={meeting.guest?.profile?.avatar}
                      name={guestName}
                      size="2xl"
                      className="w-20 h-20 border-2 border-emerald-500 shadow-md"
                    />
                  </div>
                  <span className="mt-3 text-xs font-semibold text-white">{guestName}</span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <Volume2 size={11} /> Connected • Speaking
                  </span>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-xs text-white text-xs font-medium">
                <span>{guestName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* Meeting Control Bar */}
          <div className="card-base p-3 flex items-center justify-center gap-3">
            {/* Mic Toggle */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-2.5 rounded-lg transition-all ${
                isMicOn
                  ? 'btn-secondary'
                  : 'bg-rose-600 text-white'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-2.5 rounded-lg transition-all ${
                isCameraOn
                  ? 'btn-secondary'
                  : 'bg-rose-600 text-white'
              }`}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            {/* Screen Share */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-2.5 rounded-lg transition-all ${
                isScreenSharing
                  ? 'bg-brand-600 text-white'
                  : 'btn-secondary'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor size={18} />
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <PhoneOff size={16} />
              <span>Leave Room</span>
            </button>
          </div>
        </div>

        {/* Side Panel: In-Call Chat or Scratchpad Notes */}
        {activeTab && (
          <div className="lg:col-span-1 card-base flex flex-col h-[560px] overflow-hidden">
            {/* Header Switcher */}
            <div className="flex border-b border-slate-200 dark:border-dark-800 p-2 gap-1 bg-slate-50 dark:bg-dark-800/40">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                In-Call Chat
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'notes'
                    ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Shared Notes
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col justify-between p-3 overflow-hidden">
                {/* Messages list */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-dark-800 text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200/40 dark:border-dark-700">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input box */}
                <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type in-call message..."
                    className="input-base flex-1 text-xs py-1.5"
                  />
                  <button
                    type="submit"
                    className="btn-primary p-2 text-xs"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 p-3 flex flex-col justify-between">
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="input-base w-full h-full p-2.5 text-xs font-mono resize-none leading-relaxed"
                  placeholder="Record mutual decisions, equity splits, and responsibilities..."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
