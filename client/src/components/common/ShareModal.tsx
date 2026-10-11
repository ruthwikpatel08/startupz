import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Send,
  Search,
  Users,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Smartphone,
  Globe,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, sendSupabaseMessage, isUUID } from '../../lib/supabase';
import { api } from '../../services/api';
import { Avatar } from './Avatar';
import { Link } from 'react-router-dom';

/**
 * Bulletproof clipboard copy function with fallback for non-secure contexts or older browsers.
 * Never throws an uncaught error.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, using fallback:', err);
  }

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (fallbackErr) {
    console.error('Fallback clipboard copy failed:', fallbackErr);
  }

  return false;
}

export interface ShareItemData {
  title: string;
  url: string;
  description?: string | null;
  type?: 'post' | 'startup' | 'profile' | 'problem' | 'project' | 'general';
}

interface ConnectionUser {
  id: string;
  fullName: string;
  username?: string | null;
  avatar?: string | null;
  headline?: string | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ShareItemData | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'connections' | 'links'>('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sendingToUser, setSendingToUser] = useState<{ [userId: string]: boolean }>({});
  const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load connections whenever modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) {
      return;
    }

    let isMounted = true;
    setLoadingConnections(true);
    setSendError(null);

    const loadConnections = async () => {
      const connMap = new Map<string, ConnectionUser>();

      // 1. Try Supabase connections table
      try {
        const { data: supaConns, error } = await supabase
          .from('connections')
          .select('id, sender_id, receiver_id, status')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'ACCEPTED');

        if (!error && Array.isArray(supaConns) && supaConns.length > 0) {
          const neededIds = new Set<string>();
          supaConns.forEach((c: any) => {
            const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
            if (otherId && otherId !== user.id) neededIds.add(otherId);
          });

          if (neededIds.size > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, username, avatar, headline')
              .in('user_id', Array.from(neededIds));

            (profiles || []).forEach((p: any) => {
              connMap.set(p.user_id, {
                id: p.user_id,
                fullName: p.full_name || p.username || 'Connection',
                username: p.username || null,
                avatar: p.avatar || null,
                headline: p.headline || 'HookZ Connection',
              });
            });

            neededIds.forEach((nid) => {
              if (!connMap.has(nid)) {
                connMap.set(nid, {
                  id: nid,
                  fullName: 'Connection',
                  headline: 'Accepted Connection',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Supabase fetch connections warning in ShareModal:', err);
      }

      // 2. Fallback to API if empty
      if (connMap.size === 0) {
        try {
          const apiRes = await api.getConnections().catch(() => null);
          if (apiRes && Array.isArray(apiRes.connections)) {
            apiRes.connections.forEach((c: any) => {
              const otherUser = c.user || c.sender || c.receiver;
              const otherId = otherUser?.id || c.userId || (c.senderId === user.id ? c.receiverId : c.senderId);
              if (otherId && otherId !== user.id) {
                connMap.set(otherId, {
                  id: otherId,
                  fullName: otherUser?.profile?.fullName || otherUser?.name || 'Connection',
                  username: otherUser?.profile?.username || otherUser?.username || null,
                  avatar: otherUser?.profile?.avatar || otherUser?.avatar || null,
                  headline: otherUser?.profile?.headline || otherUser?.headline || 'Accepted Connection',
                });
              }
            });
          }
        } catch {}
      }

      if (isMounted) {
        setConnections(Array.from(connMap.values()));
        setLoadingConnections(false);
      }
    };

    loadConnections();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  // Reset transient state when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCustomNote('');
      setSentUserIds(new Set());
      setSendingToUser({});
      setCopied(false);
      setSendError(null);
    }
  }, [isOpen]);

  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const q = searchQuery.toLowerCase().trim();
    return connections.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.headline && c.headline.toLowerCase().includes(q))
    );
  }, [connections, searchQuery]);

  if (!isOpen || !item) return null;

  const shareTitle = item.title || 'Shared from HookZ';
  const shareUrl = item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`;
  const shareDescription = item.description || '';

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendToConnection = async (conn: ConnectionUser) => {
    if (!user?.id) return;
    setSendingToUser((prev) => ({ ...prev, [conn.id]: true }));
    setSendError(null);

    try {
      const notePart = customNote.trim() ? `${customNote.trim()}\n\n` : '';
      const messageContent = `${notePart}Check this out on HookZ: "${shareTitle}"\n${shareUrl}`;

      // 1. Direct message via Supabase
      try {
        await sendSupabaseMessage(user.id, conn.id, messageContent);
      } catch (supaErr) {
        // Fallback to API if direct Supabase message failed
        await api.sendMessage({ receiverId: conn.id, content: messageContent });
      }

      setSentUserIds((prev) => new Set(prev).add(conn.id));
    } catch (err: any) {
      console.error('Failed to share with connection:', err);
      setSendError(`Failed to send to ${conn.fullName}. Please try again.`);
    } finally {
      setSendingToUser((prev) => ({ ...prev, [conn.id]: false }));
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription || `Check out ${shareTitle} on HookZ`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const encodedTitle = encodeURIComponent(shareTitle);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedSummary = encodeURIComponent(`${shareTitle} - ${shareDescription}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-900/40 shadow-xs">
              <Share2 size={17} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Share with Connections
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share directly with your network on HookZ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Preview Card */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 shrink-0 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
            <Sparkles size={11} />
            <span>{item.type || 'Item'}</span>
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
            {shareTitle}
          </h4>
          {shareDescription && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {shareDescription}
            </p>
          )}
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center rounded-xl p-1 bg-slate-100 dark:bg-dark-850 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={13} />
            <span>My Connections {connections.length > 0 ? `(${connections.length})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Copy size={13} />
            <span>Copy Link & Social</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'connections' ? (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
            {!user ? (
              <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-dark-850 rounded-xl border border-slate-200 dark:border-dark-800">
                <Lock size={28} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Please log in to share directly with your connections.
                </p>
                <Link
                  to="/login"
                  onClick={onClose}
                  className="btn-primary inline-flex items-center gap-1 text-xs py-1.5 px-4"
                >
                  Log In to HookZ
                </Link>
              </div>
            ) : (
              <>
                {/* Optional Note to Connections */}
                <div className="shrink-0">
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Add an optional note (e.g. 'Hey, thought you would like this')..."
                    className="input-base w-full py-1.5 px-3 text-xs"
                    maxLength={250}
                  />
                </div>

                {/* Connection Search */}
                {connections.length > 3 && (
                  <div className="relative shrink-0">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search connections by name..."
                      className="input-base w-full pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                )}

                {sendError && (
                  <div className="p-2 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shrink-0">
                    {sendError}
                  </div>
                )}

                {/* Connections List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[260px]">
                  {loadingConnections ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 rounded-xl bg-slate-100 dark:bg-dark-850 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : filteredConnections.length === 0 ? (
                    <div className="py-8 text-center space-y-2 text-slate-500">
                      <Users size={24} className="mx-auto text-slate-400" />
                      <p className="text-xs">
                        {connections.length === 0
                          ? "You don't have any accepted connections yet."
                          : 'No connections found matching your search.'}
                      </p>
                      {connections.length === 0 && (
                        <Link
                          to="/cofounders"
                          onClick={onClose}
                          className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline inline-block pt-1"
                        >
                          Find and connect with builders →
                        </Link>
                      )}
                    </div>
                  ) : (
                    filteredConnections.map((conn) => {
                      const isSent = sentUserIds.has(conn.id);
                      const isSending = !!sendingToUser[conn.id];

                      return (
                        <div
                          key={conn.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 bg-white dark:bg-dark-900 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Avatar
                              src={conn.avatar}
                              name={conn.fullName}
                              size="sm"
                              className="shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {conn.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {conn.headline}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendToConnection(conn)}
                            disabled={isSending || isSent}
                            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSent
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                : 'btn-primary'
                            } disabled:opacity-80`}
                          >
                            {isSent ? (
                              <>
                                <Check size={12} />
                                <span>Sent</span>
                              </>
                            ) : isSending ? (
                              <span>Sending...</span>
                            ) : (
                              <>
                                <Send size={12} />
                                <span>Send</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Direct URL Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 input-base text-xs select-all py-2 px-3"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0 ${
                    copied ? '!bg-emerald-600 !border-emerald-600' : ''
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Native Mobile/Desktop Share Sheet */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <div>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full btn-secondary py-2 text-xs flex items-center justify-center gap-2 cursor-pointer font-medium"
                >
                  <Smartphone size={14} className="text-brand-600" />
                  <span>Share via Device Share Sheet</span>
                </button>
              </div>
            )}

            {/* External Social Channels */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-dark-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                External Channels
              </p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodedSummary}%20${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>WhatsApp</span>
                  <ExternalLink size={11} className="ml-auto text-slate-400" />
                </a>

                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:border-sky-300 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>LinkedIn</span>
                  <ExternalLink size={11} className="ml-auto text-slate-400" />
                </a>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedSummary}&url=${encodedUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-dark-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-300" />
                  <span>X / Twitter</span>
                  <ExternalLink size={11} className="ml-auto text-slate-400" />
                </a>

                <a
                  href={`mailto:?subject=${encodedTitle}&body=${encodedSummary}%0A%0A${encodedUrl}`}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <span>Email</span>
                  <ExternalLink size={11} className="ml-auto text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Globe size={12} className="text-slate-400" />
            <span>Shared items open securely on HookZ</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-1 px-3 text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
