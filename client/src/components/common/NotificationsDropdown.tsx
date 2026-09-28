import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Check,
  X,
  MessageSquare,
  Users,
  Rocket,
  CheckCheck,
  Sparkles,
  ChevronRight,
  Trash2,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  userId: string;
  senderId?: string;
  sender?: {
    id: string;
    email: string;
    role?: string;
    isVerified?: boolean;
    verificationBadge?: string | null;
    profile?: {
      fullName?: string;
      avatar?: string;
      headline?: string;
      preferredRole?: string;
    };
  };
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  _actionStatus?: 'ACCEPTED' | 'DECLINED' | null;
}

export const NotificationsDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      const list = res.notifications || [];
      const unread = res.unreadCount ?? list.filter((n: any) => !n.isRead).length;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (err) {
      // Graceful poll fail
    }
  };

  // Initial load and periodic poll every 10 seconds
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        // Continue navigation
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  // One-click respond to connection directly from notification
  const handleQuickRespondConnection = async (
    e: React.MouseEvent,
    notif: NotificationItem,
    action: 'ACCEPT' | 'REJECT'
  ) => {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      // Find pending connection ID if senderId exists
      const pendingRes = await api.getPendingConnections();
      const match = (pendingRes?.received || []).find(
        (c: any) => c.senderId === notif.senderId || c.sender?.id === notif.senderId
      );

      if (match?.id) {
        await api.respondConnection(match.id, action);
      } else {
        navigate('/network?tab=PENDING');
        setIsOpen(false);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, isRead: true, _actionStatus: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Quick respond error:', err);
      navigate('/network?tab=PENDING');
      setIsOpen(false);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  // One-click respond to startup proposal directly from notification
  const handleQuickRespondProposal = async (
    e: React.MouseEvent,
    notif: NotificationItem,
    status: 'ACCEPTED' | 'DECLINED'
  ) => {
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      const proposalsRes = await api.getStartupProposals('received');
      const list = (proposalsRes as any)?.received || (Array.isArray(proposalsRes) ? proposalsRes : []);
      const match = list.find(
        (p: any) => p.senderId === notif.senderId || p.sender?.id === notif.senderId
      );

      if (match?.id) {
        await api.respondStartupProposal(match.id, status);
      } else {
        navigate('/network?tab=PROPOSALS');
        setIsOpen(false);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, isRead: true, _actionStatus: status } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Quick respond proposal error:', err);
      navigate('/network?tab=PROPOSALS');
      setIsOpen(false);
    } finally {
      setActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="View notifications"
        className={`relative p-1.5 rounded-md transition-colors cursor-pointer ${
          isOpen
            ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-[17px] h-[17px] rounded-full bg-rose-500 opacity-60 animate-ping pointer-events-none" />
          </>
        )}
      </button>

      {/* Notifications Panel Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-900 rounded-xl shadow-modal border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[580px] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-dark-850/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell size={14} className="text-brand-600 dark:text-brand-400" />
                <span>Notifications</span>
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={12} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-100 dark:bg-dark-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-slate-100 dark:bg-dark-800 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-400">
                  <Bell size={18} />
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[220px] mx-auto">
                  When someone connects with you or sends a startup proposal, you'll see it here!
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isConnection = n.type === 'CONNECTION_REQUEST';
                const isProposal = n.type === 'STARTUP_PROPOSAL';
                const isAccepted = n.type === 'CONNECTION_ACCEPTED' || n.type === 'PROPOSAL_ACCEPTED';
                const isMessage = n.type === 'NEW_MESSAGE';

                const senderName =
                  n.sender?.profile?.fullName ||
                  n.sender?.email?.split('@')[0] ||
                  'Startup Founder';
                const senderAvatar =
                  n.sender?.profile?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName)}`;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 sm:p-3.5 transition-colors cursor-pointer relative group flex gap-3 ${
                      n.isRead
                        ? 'bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850/60'
                        : 'bg-brand-50/30 dark:bg-brand-950/20 hover:bg-brand-50/50 dark:hover:bg-brand-950/30'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!n.isRead && (
                      <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                    )}

                    {/* Sender Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={senderAvatar}
                        alt={senderName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] ${
                          isConnection
                            ? 'bg-blue-600'
                            : isProposal
                            ? 'bg-amber-600'
                            : isAccepted
                            ? 'bg-emerald-600'
                            : isMessage
                            ? 'bg-purple-600'
                            : 'bg-brand-600'
                        }`}
                      >
                        {isConnection ? (
                          <Users size={9} />
                        ) : isProposal ? (
                          <Rocket size={9} />
                        ) : isAccepted ? (
                          <Check size={9} />
                        ) : isMessage ? (
                          <MessageSquare size={9} />
                        ) : (
                          <Sparkles size={9} />
                        )}
                      </span>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        {n.message}
                      </p>

                      {/* Interactive Connection Actions */}
                      {isConnection && (
                        <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                          {n._actionStatus === 'ACCEPTED' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={11} /> Connected!
                              </span>
                              {n.senderId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    navigate(`/messages?user=${n.senderId}`);
                                  }}
                                  className="btn-primary !py-0.5 !px-2 !text-[10px] font-semibold inline-flex items-center gap-1"
                                >
                                  <MessageSquare size={10} /> Chat Now
                                </button>
                              )}
                            </div>
                          ) : n._actionStatus === 'DECLINED' ? (
                            <span className="text-[10px] text-slate-400">Request Declined</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading[n.id]}
                                onClick={(e) => handleQuickRespondConnection(e, n, 'ACCEPT')}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check size={11} />
                                <span>{actionLoading[n.id] ? 'Accepting...' : 'Accept'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading[n.id]}
                                onClick={(e) => handleQuickRespondConnection(e, n, 'REJECT')}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <X size={11} />
                                <span>Decline</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Interactive Proposal Actions */}
                      {isProposal && (
                        <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                          {n._actionStatus === 'ACCEPTED' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={11} /> Co-Founder Accepted!
                              </span>
                              {n.senderId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    navigate(`/messages?user=${n.senderId}`);
                                  }}
                                  className="btn-primary !py-0.5 !px-2 !text-[10px] font-semibold inline-flex items-center gap-1"
                                >
                                  <MessageSquare size={10} /> Chat with Partner
                                </button>
                              )}
                            </div>
                          ) : n._actionStatus === 'DECLINED' ? (
                            <span className="text-[10px] text-slate-400">Proposal Declined</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading[n.id]}
                                onClick={(e) => handleQuickRespondProposal(e, n, 'ACCEPTED')}
                                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check size={11} />
                                <span>{actionLoading[n.id] ? 'Accepting...' : 'Accept Proposal'}</span>
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading[n.id]}
                                onClick={(e) => handleQuickRespondProposal(e, n, 'DECLINED')}
                                className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <X size={11} />
                                <span>Decline</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Direct Chat Action for Accepted or Messages */}
                      {(isAccepted || isMessage) && n.senderId && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
                              navigate(`/messages?user=${n.senderId}`);
                            }}
                            className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
                          >
                            <MessageSquare size={11} />
                            <span>{isMessage ? 'Reply in Chat' : 'Start Chat'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, n.id)}
                      title="Dismiss notification"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded self-start"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-dark-850/50 flex items-center justify-between text-xs">
            <Link
              to="/network"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1"
            >
              <span>Manage all invitations in Network</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
