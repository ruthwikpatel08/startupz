import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { VideoMeeting } from '../../types';
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
            <Video size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{meeting.title}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            <Clock size={14} className="text-cyan-500" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied Link' : 'Invite'}</span>
          </button>

          {/* Toggle Chat / Notes button */}
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTab === 'chat'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title="Toggle In-Call Chat"
          >
            <MessageSquare size={16} />
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'notes' ? null : 'notes')}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTab === 'notes'
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title="Toggle Live Notes"
          >
            <FileText size={16} />
          </button>
        </div>
      </div>

      {/* Main Video Arena + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[580px]">
        {/* Video Stage (3 cols if side panel open, else 4 cols) */}
        <div className={`space-y-4 ${activeTab ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[480px]">
            {/* 1. Host / Local Participant Tile */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-lg">
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
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 p-6 text-center">
                  <div className="relative">
                    <img
                      src={
                        currentUser?.profile?.avatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${hostName}`
                      }
                      alt={hostName}
                      className="w-24 h-24 rounded-full border-4 border-cyan-500 shadow-xl object-cover animate-pulse"
                    />
                    {isMicOn && (
                      <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-md">
                        <Volume2 size={12} />
                      </span>
                    )}
                  </div>
                  <span className="mt-3 text-xs font-bold text-white">{hostName} (You)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Simulated HD Camera</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                    <VideoOff size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-400">Camera Paused</span>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                <span>{hostName} (You)</span>
                {!isMicOn && <MicOff size={13} className="text-rose-400" />}
              </div>
            </div>

            {/* 2. Guest / Peer Participant Tile */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-lg">
              {isScreenSharing ? (
                /* Screen sharing mode */
                <div className="w-full h-full p-6 flex flex-col justify-between bg-slate-900 border-2 border-dashed border-cyan-500/50 rounded-2xl">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Monitor size={15} /> Presenting: Pitch Deck & Architecture Demo
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-800 text-[10px]">
                      1080p 60fps
                    </span>
                  </div>
                  <div className="space-y-2 text-center py-10">
                    <h3 className="text-lg font-extrabold text-white">StartupZ Live Screen Share</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Showing interactive product mockups, codebase structure, and financial model.
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">Encrypted WebRTC Channel</div>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-6 text-center">
                  <div className="relative">
                    <img
                      src={
                        meeting.guest?.profile?.avatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${guestName}`
                      }
                      alt={guestName}
                      className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-xl object-cover"
                    />
                    <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-md animate-ping" />
                  </div>
                  <span className="mt-3 text-xs font-bold text-white">{guestName}</span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-center gap-1">
                    <Volume2 size={11} /> Connected • Speaking
                  </span>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                <span>{guestName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>

          {/* Meeting Control Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center gap-3">
            {/* Mic Toggle */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3.5 rounded-2xl transition-all ${
                isMicOn
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200'
                  : 'bg-rose-500 text-white shadow-md'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`p-3.5 rounded-2xl transition-all ${
                isCameraOn
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200'
                  : 'bg-rose-500 text-white shadow-md'
              }`}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            {/* Screen Share */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3.5 rounded-2xl transition-all ${
                isScreenSharing
                  ? 'bg-cyan-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor size={20} />
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
            >
              <PhoneOff size={18} />
              <span>Leave Room</span>
            </button>
          </div>
        </div>

        {/* Side Panel: In-Call Chat or Scratchpad Notes */}
        {activeTab && (
          <div className="lg:col-span-1 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[560px] overflow-hidden">
            {/* Header Switcher */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-1 bg-slate-50 dark:bg-slate-800/40">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                In-Call Chat
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  activeTab === 'notes'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xs'
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
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
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
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 p-3 flex flex-col justify-between">
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full h-full p-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
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
