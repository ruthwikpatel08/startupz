import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Conversation, Message, User } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import {
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  User as UserIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  supabase,
  getSupabaseConversations,
  getSupabaseMessages,
  sendSupabaseMessage,
  deleteSupabaseConversation,
} from '../../lib/supabase';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');
  const targetConvId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
  const [search, setSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      // 1. Fetch from Supabase directly for persistent database storage
      const supaList = user?.id ? await getSupabaseConversations(user.id) : [];

      // 2. Fetch from backend API
      const apiRes = await api.getConversations().catch(() => []);
      const apiList = Array.isArray(apiRes) ? apiRes : (apiRes?.conversations || apiRes?.data || []);

      // Merge and deduplicate by conversation id
      const convMap = new Map<string, Conversation>();
      supaList.forEach((c) => convMap.set(c.id, c));
      apiList.forEach((c: any) => {
        if (!convMap.has(c.id)) {
          convMap.set(c.id, c);
        }
      });

      const list = Array.from(convMap.values());
      setConversations(list);

      // 1. If user came via /messages?conversationId=xyz
      if (targetConvId && list.length > 0) {
        const found = list.find((c: any) => c.id === targetConvId);
        if (found) {
          setSelectedConversation(found);
          return;
        }
      }

      // 2. If user came via /messages?user=xyz
      if (targetUserId) {
        const found = list.find(
          (c: any) =>
            c.participant?.id === targetUserId ||
            c.participant1Id === targetUserId ||
            c.participant2Id === targetUserId
        );
        if (found) {
          setSelectedConversation(found);
        } else {
          // If conversation doesn't exist in list yet, fetch user to start a clean draft conversation
          try {
            // Check Supabase profiles first
            const { data: pData } = await supabase
              .from('profiles')
              .select('id, user_id, full_name, avatar, headline, email, preferred_role')
              .eq('user_id', targetUserId)
              .maybeSingle();

            let userObj: any = null;
            if (pData) {
              userObj = {
                id: pData.user_id,
                email: pData.email || '',
                role: pData.preferred_role || 'FOUNDER',
                isVerified: true,
                profile: {
                  id: pData.id,
                  userId: pData.user_id,
                  fullName: pData.full_name || 'Founder',
                  avatar: pData.avatar || null,
                  headline: pData.headline || '',
                },
              };
            } else {
              const targetUserRes = await api.getUser(targetUserId).catch(() => null);
              userObj = targetUserRes?.user || targetUserRes;
            }

            if (userObj?.id) {
              const draftConv: any = {
                id: 'draft',
                participant: userObj,
                participant1Id: user?.id || '',
                participant2Id: userObj.id,
                lastMessage: 'Start a conversation...',
                lastMessageAt: new Date().toISOString(),
                messages: [],
              };
              setSelectedConversation(draftConv);
            }
          } catch (err) {
            console.error('Failed to load target user for conversation:', err);
          }
        }
      } else if (!selectedConversation && list.length > 0) {
        setSelectedConversation(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [targetUserId, targetConvId, user?.id]);

  // Realtime subscription for conversation updates
  useEffect(() => {
    if (!user?.id) return;

    const convChannel = supabase
      .channel(`user_conversations_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [user?.id]);

  // Fetch messages when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation || selectedConversation.id === 'draft') {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        // 1. Fetch persistent messages from Supabase
        const supaMsgs = await getSupabaseMessages(selectedConversation.id, user?.id || '');

        if (supaMsgs.length > 0) {
          setMessages(supaMsgs);
        } else {
          // Fallback to backend API
          const res = await api.getMessages(selectedConversation.id).catch(() => []);
          const list = Array.isArray(res) ? res : (res?.messages || res?.data || []);
          setMessages(list);
        }
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation?.id, user?.id]);

  // Supabase Realtime subscription for instant message updates in the active conversation
  useEffect(() => {
    if (!selectedConversation || selectedConversation.id === 'draft') return;

    const channel = supabase
      .channel(`chat_room_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newRow.id)) return prev;
              return [
                ...prev,
                {
                  id: newRow.id,
                  conversationId: newRow.conversation_id,
                  senderId: newRow.sender_id,
                  receiverId: newRow.receiver_id,
                  content: newRow.content,
                  isRead: newRow.is_read,
                  createdAt: newRow.created_at,
                },
              ];
            });

            // Mark as read if received by current user
            if (newRow.receiver_id === user?.id) {
              (async () => {
                try {
                  await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('id', newRow.id);
                } catch {}
              })();
            }
          }
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds for resilience
    const interval = setInterval(async () => {
      try {
        const msgs = await getSupabaseMessages(selectedConversation.id, user?.id || '');
        if (msgs.length > 0) {
          setMessages((prev) => {
            if (
              msgs.length !== prev.length ||
              (msgs.length > 0 && msgs[msgs.length - 1]?.id !== prev[prev.length - 1]?.id)
            ) {
              return msgs;
            }
            return prev;
          });
        }
      } catch {}
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedConversation?.id, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user?.id || sending) return;

    const receiverId =
      selectedConversation.participant?.id ||
      (selectedConversation.participant1Id === user.id
        ? selectedConversation.participant2Id
        : selectedConversation.participant1Id);

    if (!receiverId) return;

    setSending(true);
    const contentToSend = newMessage.trim();
    try {
      const res = await sendSupabaseMessage(
        user.id,
        receiverId,
        contentToSend,
        selectedConversation.id === 'draft' ? undefined : selectedConversation.id
      );

      if (res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
      }
      setNewMessage('');

      if (selectedConversation.id === 'draft' && res.conversationId) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, id: res.conversationId, lastMessage: contentToSend } : null
        );
      }
      await fetchConversations();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Unable to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation || selectedConversation.id === 'draft' || !user?.id || deletingConv) return;
    if (!window.confirm('Are you sure you want to delete this conversation? All message history will be permanently deleted.')) return;

    setDeletingConv(true);
    try {
      await deleteSupabaseConversation(selectedConversation.id, user.id);
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
      setSelectedConversation(null);
      setMessages([]);
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      alert(err.message || 'Unable to delete conversation. Please try again.');
    } finally {
      setDeletingConv(false);
    }
  };


  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = safeConversations.filter((c) => {
    const pName = c.participant?.profile?.fullName || c.participant?.email || '';
    return pName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-1 card-base shadow-xs overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-dark-800 flex flex-col h-full bg-slate-50/50 dark:bg-dark-850/40">
          <div className="p-3.5 border-b border-slate-200 dark:border-dark-800 space-y-2.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-600 dark:text-brand-400" /> Messages
            </h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="input-base pl-9 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-800">
            {loadingConversations ? (
              <div className="p-3.5 space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-12 rounded-md bg-slate-200/60 dark:bg-dark-800 animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No conversations yet. Connect with founders or teammates to chat.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const p = conv.participant;
                const name = p?.profile?.fullName || p?.email || 'User';

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/30 border-l-2 border-brand-600'
                        : 'hover:bg-slate-100/70 dark:hover:bg-dark-800/40'
                    }`}
                  >
                    <Avatar
                      src={p?.profile?.avatar}
                      name={name}
                      size="md"
                      className="!w-9 !h-9"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {conv.lastMessage || 'Say hello...'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-dark-900">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={selectedConversation.participant?.profile?.avatar}
                    name={
                      selectedConversation.participant?.profile?.fullName ||
                      selectedConversation.participant?.email
                    }
                    size="md"
                    className="!w-9 !h-9"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-white">
                        {selectedConversation.participant?.profile?.fullName ||
                          selectedConversation.participant?.email ||
                          'Founder'}
                      </h3>
                      <VerificationBadge
                        badge={selectedConversation.participant?.verificationBadge}
                        isVerified={selectedConversation.participant?.isVerified}
                        size="sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {selectedConversation.participant?.profile?.headline ||
                        selectedConversation.participant?.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConversation.id !== 'draft' && (
                    <button
                      onClick={handleDeleteConversation}
                      disabled={deletingConv}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-dark-800 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 text-xs font-medium"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                  <Link
                    to={`/profile/${selectedConversation.participant?.id}`}
                    className="btn-secondary py-1 px-2.5 text-xs font-medium"
                  >
                    View Profile
                  </Link>
                </div>
              </div>

              {/* Messages Bubble Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/30 dark:bg-dark-950/20">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full text-xs text-slate-400">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                    <div className="w-10 h-10 rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/50 dark:border-brand-900/50">
                      <Sparkles size={20} />
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                      Start of conversation
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Send a message to introduce yourself, discuss mutual startup synergies, or share ideas.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === user?.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-xs sm:max-w-md px-3.5 py-2 rounded-lg text-xs leading-relaxed ${
                            isMe
                              ? 'bg-brand-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-white dark:bg-dark-850 text-slate-900 dark:text-white rounded-bl-xs border border-slate-200 dark:border-dark-800'
                          }`}
                        >
                          {m.content}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <CheckCheck size={11} className="text-brand-600 dark:text-brand-400" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-dark-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input-base py-2 px-3 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="btn-primary py-2 px-3 text-xs font-semibold inline-flex items-center justify-center disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Pick a chat from the left panel or click 'Chat' on any connected member's profile."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
