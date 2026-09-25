import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Conversation, Message, User } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data || []);

      // If user came via /messages?user=xyz
      if (targetUserId && data) {
        const found = data.find(
          (c) => c.participant?.id === targetUserId || c.participant1Id === targetUserId || c.participant2Id === targetUserId
        );
        if (found) {
          setSelectedConversation(found);
        } else {
          // If conversation doesn't exist yet, fetch the user to start a draft conversation
          try {
            const targetUserRes = await api.getUser(targetUserId);
            const draftConv: any = {
              id: 'draft',
              participant: targetUserRes.user || targetUserRes,
              participant1Id: user?.id || '',
              participant2Id: targetUserId,
              lastMessage: 'Start a conversation...',
              lastMessageAt: new Date().toISOString(),
              messages: [],
            };
            setSelectedConversation(draftConv);
          } catch (err) {
            console.error('Failed to load target user for conversation:', err);
          }
        }
      } else if (!selectedConversation && data && data.length > 0) {
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [targetUserId]);

  // Fetch messages when selectedConversation changes
  useEffect(() => {
    if (!selectedConversation || selectedConversation.id === 'draft') {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.getMessages(selectedConversation.id);
        setMessages(res || []);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const receiverId =
      selectedConversation.participant?.id ||
      (selectedConversation.participant1Id === user?.id
        ? selectedConversation.participant2Id
        : selectedConversation.participant1Id);

    if (!receiverId) return;

    setSending(true);
    try {
      const res = await api.sendMessage({
        receiverId,
        content: newMessage.trim(),
      });

      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');

      // If it was draft, refresh conversations to get real conversationId
      if (selectedConversation.id === 'draft') {
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const pName = c.participant?.profile?.fullName || c.participant?.email || '';
    return pName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-brand-600" /> Messages
            </h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-14 rounded-xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No conversations yet. Connect with founders or teammates to chat!
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const p = conv.participant;
                const name = p?.profile?.fullName || p?.email || 'User';
                const avatar = p?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 border-l-4 border-brand-500'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedConversation.participant?.profile?.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${
                        selectedConversation.participant?.profile?.fullName || selectedConversation.participant?.email
                      }`
                    }
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
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
                    <p className="text-[11px] text-slate-400">
                      {selectedConversation.participant?.profile?.headline ||
                        selectedConversation.participant?.role}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/profile/${selectedConversation.participant?.id}`}
                  className="px-3 py-1 rounded-xl text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                >
                  View Profile
                </Link>
              </div>

              {/* Messages Bubble Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full text-xs text-slate-400">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
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
                          className={`max-w-xs sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isMe
                              ? 'bg-brand-600 text-white rounded-br-xs shadow-sm shadow-brand-500/10'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {m.content}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isMe && <CheckCheck size={12} className="text-brand-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-500/20 disabled:opacity-40 transition-all hover:scale-105"
                >
                  <Send size={16} />
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
