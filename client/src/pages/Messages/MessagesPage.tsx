import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Conversation, Message } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import {
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  User as UserIcon,
  Trash2,
  FolderKanban,
  ChevronLeft,
  Pencil,
  Undo2,
  ShieldAlert,
  UserX,
  Check,
  X,
} from 'lucide-react';
import {
  supabase,
  fetchUserProfile,
  getSupabaseConversations,
  getSupabaseMessages,
  sendSupabaseMessage,
  deleteSupabaseConversation,
  getDeletedConversationIds,
  unsendSupabaseMessage,
  editSupabaseMessage,
  markMessagesAsRead,
} from '../../lib/supabase';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');
  const targetConvId = searchParams.get('conversationId');
  const targetProjectGroupId = searchParams.get('projectGroupId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
  const [search, setSearch] = useState('');

  // Block User State
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);

  // Message Edit State (Instagram style)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const getParticipantKey = (c: any) => {
    if (c.isProjectGroup) {
      return `group_${c.projectId || c.id}`;
    }
    const otherId =
      c.participant?.id ||
      (c.participant1Id === user?.id ? c.participant2Id : c.participant1Id);
    return otherId ? `user_${otherId}` : `conv_${c.id}`;
  };

  const fetchConversations = async () => {
    try {
      // Fetch from Supabase and backend API in parallel
      const [supaList, apiRes] = await Promise.all([
        user?.id ? getSupabaseConversations(user.id) : Promise.resolve([]),
        api.getConversations().catch(() => []),
      ]);
      const apiList = Array.isArray(apiRes) ? apiRes : apiRes?.conversations || apiRes?.data || [];

      // Merge and deduplicate by participant user ID so that each account only appears ONCE
      const convMap = new Map<string, Conversation>();
      const deletedIds = getDeletedConversationIds(user?.id);

      supaList.forEach((c) => {
        if (deletedIds.has(c.id)) return;
        const key = getParticipantKey(c);
        if (!convMap.has(key)) {
          convMap.set(key, c);
        }
      });

      apiList.forEach((c: any) => {
        if (deletedIds.has(c.id)) return;
        const key = getParticipantKey(c);
        if (!convMap.has(key)) {
          convMap.set(key, c);
        }
      });

      // Load project groups from local storage
      try {
        const rawGroups = localStorage.getItem('startupz_project_groups');
        if (rawGroups) {
          const parsed = JSON.parse(rawGroups);
          if (Array.isArray(parsed)) {
            parsed.forEach((g: any) => {
              const groupConv: any = {
                id: g.id,
                projectId: g.projectId,
                isProjectGroup: true,
                projectTitle: g.title,
                participant: {
                  id: g.id,
                  email: 'team@hookz.build',
                  role: 'PROJECT_TEAM',
                  isVerified: true,
                  profile: {
                    id: g.id,
                    userId: g.id,
                    fullName: `[Project Group] ${g.title}`,
                    avatar: null,
                    headline: `${g.members?.length || 1} team members`,
                  },
                },
                lastMessage: g.lastMessage || 'Project team group established.',
                lastMessageAt: g.lastMessageAt || g.createdAt || new Date().toISOString(),
                members: g.members || [],
              };
              const key = `group_${g.projectId || g.id}`;
              convMap.set(key, groupConv);
            });
          }
        }
      } catch (err) {
        console.error('Failed to load project groups:', err);
      }

      const list = Array.from(convMap.values());
      setConversations(list);

      // Check project group link: /messages?projectGroupId=xyz
      if (targetProjectGroupId && list.length > 0) {
        const found = list.find(
          (c: any) =>
            c.id === targetProjectGroupId ||
            c.projectId === targetProjectGroupId ||
            (c.id && c.id.includes(targetProjectGroupId))
        );
        if (found) {
          setSelectedConversation(found);
          return;
        }
      }

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
        let found = list.find(
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
            const pData = await fetchUserProfile(targetUserId);

            let userObj: any = null;
            if (pData) {
              userObj = {
                id: pData.user_id || pData.id,
                email: pData.email || '',
                role: pData.preferred_role || 'FOUNDER',
                isVerified: true,
                profile: {
                  id: pData.id,
                  userId: pData.user_id || pData.id,
                  fullName: pData.full_name || 'Founder',
                  avatar: pData.avatar || null,
                  headline: pData.headline || '',
                  oneLineBio: pData.one_line_bio || pData.headline || '',
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

  // Load blocked users
  useEffect(() => {
    if (!user?.id) return;
    const loadBlocked = async () => {
      try {
        const local = localStorage.getItem(`hookz_blocked_users_${user.id}`);
        if (local) {
          setBlockedUserIds(JSON.parse(local));
        }
        const res = await api.getBlockedUsers().catch(() => null);
        if (res?.blockedUserIds) {
          setBlockedUserIds(res.blockedUserIds);
          localStorage.setItem(`hookz_blocked_users_${user.id}`, JSON.stringify(res.blockedUserIds));
        }
      } catch {}
    };
    loadBlocked();
  }, [user?.id]);

  // Listen to custom updates (e.g. chat deletion, unsend, edit across components)
  useEffect(() => {
    const handleUpdate = () => {
      fetchConversations();
    };
    window.addEventListener('startupz_messages_updated', handleUpdate);
    return () => window.removeEventListener('startupz_messages_updated', handleUpdate);
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
        // Handle Project Group Messages
        if ((selectedConversation as any)?.isProjectGroup) {
          const pId = (selectedConversation as any).projectId || selectedConversation.id;
          const raw = localStorage.getItem(`startupz_project_messages_${pId}`);
          const parsed = raw
            ? JSON.parse(raw)
            : [
                {
                  id: `init-${selectedConversation.id}`,
                  conversationId: selectedConversation.id,
                  senderId: 'system',
                  content: `Welcome to the team chat for "${(selectedConversation as any).projectTitle || 'Project'}"! Team members and collaborators can coordinate and chat here.`,
                  createdAt: selectedConversation.lastMessageAt || new Date().toISOString(),
                  sender: {
                    id: 'system',
                    profile: {
                      fullName: 'HookZ System',
                      avatar: null,
                      headline: 'Workspace',
                    },
                  },
                },
              ];
          setMessages(parsed);
          setTimeout(() => scrollToBottom('auto'), 50);
          return;
        }

        // 1. Fetch persistent messages from Supabase
        const supaMsgs = await getSupabaseMessages(selectedConversation.id);

        if (supaMsgs.length > 0) {
          setMessages(supaMsgs);
        } else {
          // Fallback to backend API
          const res = await api.getMessages(selectedConversation.id).catch(() => []);
          const list = Array.isArray(res) ? res : res?.messages || res?.data || [];
          setMessages(list);
        }

        // 2. Mark unread messages in this conversation as read
        if (user?.id) {
          await markMessagesAsRead(selectedConversation.id, user.id);
          setConversations((prev) =>
            prev.map((c) => (c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c))
          );
        }

        setTimeout(() => scrollToBottom('auto'), 50);
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

            // Mark as read immediately if received by current user while actively viewing
            if (newRow.receiver_id === user?.id && user?.id) {
              markMessagesAsRead(selectedConversation.id, user.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const updatedRow = payload.new as any;
          if (updatedRow && updatedRow.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updatedRow.id
                  ? { ...m, isRead: updatedRow.is_read, content: updatedRow.content }
                  : m
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const oldRow = payload.old as any;
          if (oldRow && oldRow.id) {
            setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds for resilience
    const interval = setInterval(async () => {
      try {
        const msgs = await getSupabaseMessages(selectedConversation.id);
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
    scrollToBottom('smooth');
  }, [messages.length]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    if (conv.unreadCount && conv.unreadCount > 0 && conv.id !== 'draft' && user?.id) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
      await markMessagesAsRead(conv.id, user.id);
    }
  };

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

    // Handle sending message in Project Group Chat
    if ((selectedConversation as any)?.isProjectGroup) {
      const pId = (selectedConversation as any).projectId || selectedConversation.id;
      const newMsg: any = {
        id: `pmsg-${Date.now()}`,
        conversationId: selectedConversation.id,
        senderId: user.id,
        content: contentToSend,
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          email: user.email || '',
          role: (user as any).role || 'BUILDER',
          isVerified: true,
          profile: {
            id: user.profile?.id || user.id,
            userId: user.id,
            fullName: user.profile?.fullName || user.email?.split('@')[0] || 'Team Member',
            avatar: user.profile?.avatar || null,
            headline: user.profile?.headline || 'Team Collaborator',
          },
        },
      };

      const storageKey = `startupz_project_messages_${pId}`;
      try {
        const raw = localStorage.getItem(storageKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const updatedMsgs = [...existing, newMsg];
        localStorage.setItem(storageKey, JSON.stringify(updatedMsgs));
        setMessages((prev) => [...prev, newMsg]);
        setNewMessage('');

        // Update lastMessage in group list
        const rawGroups = localStorage.getItem('startupz_project_groups');
        if (rawGroups) {
          const groups = JSON.parse(rawGroups);
          const idx = groups.findIndex(
            (g: any) => g.id === selectedConversation.id || g.projectId === pId
          );
          if (idx >= 0) {
            groups[idx].lastMessage = `${user.profile?.fullName?.split(' ')[0] || 'Member'}: ${contentToSend}`;
            groups[idx].lastMessageAt = new Date().toISOString();
            localStorage.setItem('startupz_project_groups', JSON.stringify(groups));
          }
        }
      } catch (err) {
        console.error('Failed to save project message:', err);
      } finally {
        setSending(false);
      }
      return;
    }

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

  const otherParticipantId =
    (selectedConversation as any)?.isProjectGroup
      ? null
      : selectedConversation?.participant?.id ||
        (selectedConversation?.participant1Id === user?.id
          ? selectedConversation?.participant2Id
          : selectedConversation?.participant1Id);

  const isParticipantBlocked = Boolean(otherParticipantId && blockedUserIds.includes(otherParticipantId));

  const handleToggleBlock = async () => {
    if (!otherParticipantId || blockActionLoading) return;
    setBlockActionLoading(true);
    try {
      if (isParticipantBlocked) {
        await api.unblockUser(otherParticipantId);
        const next = blockedUserIds.filter((id) => id !== otherParticipantId);
        setBlockedUserIds(next);
        if (user?.id) localStorage.setItem(`hookz_blocked_users_${user.id}`, JSON.stringify(next));
      } else {
        await api.blockUser(otherParticipantId);
        const next = [...blockedUserIds, otherParticipantId];
        setBlockedUserIds(next);
        if (user?.id) localStorage.setItem(`hookz_blocked_users_${user.id}`, JSON.stringify(next));
      }
      setBlockModalOpen(false);
    } catch (err: any) {
      console.error('Toggle block error:', err);
      alert(err.message || 'Failed to update user block state.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingContent.trim() || !user?.id || editingSaving) return;
    setEditingSaving(true);
    try {
      await editSupabaseMessage(msgId, editingContent.trim(), user.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: editingContent.trim(), isEdited: true } : m
        )
      );
      setEditingMessageId(null);
      setEditingContent('');
    } catch (err: any) {
      console.error('Failed to edit message:', err);
      alert(err.message || 'Failed to edit message.');
    } finally {
      setEditingSaving(false);
    }
  };

  const handleUnsend = async (msgId: string) => {
    if (!user?.id) return;
    if (
      !window.confirm(
        'Unsend this message? This will remove the message for everyone in this chat.'
      )
    ) {
      return;
    }
    try {
      await unsendSupabaseMessage(msgId, user.id);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err: any) {
      console.error('Failed to unsend message:', err);
      alert(err.message || 'Failed to unsend message.');
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation || selectedConversation.id === 'draft' || !user?.id || deletingConv) return;
    if (
      !window.confirm(
        'Delete this conversation from your account? This chat will be removed permanently for you, while remaining visible for the other person until they delete it.'
      )
    )
      return;

    setDeletingConv(true);
    try {
      await deleteSupabaseConversation(selectedConversation.id, user.id);
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
      setSelectedConversation(null);
      setMessages([]);
      navigate('/messages', { replace: true });
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      alert(err.message || 'Unable to delete conversation. Please try again.');
    } finally {
      setDeletingConv(false);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    navigate('/messages', { replace: true });
  };

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const filteredConversations = safeConversations.filter((c) => {
    const pName = c.participant?.profile?.fullName || c.participant?.email || '';
    return pName.toLowerCase().includes(search.toLowerCase());
  });

  const isDifferentDay = (d1: string, d2?: string) => {
    if (!d2) return true;
    return new Date(d1).toDateString() !== new Date(d2).toDateString();
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const receiverName =
    (selectedConversation as any)?.isProjectGroup
      ? `[Project Group] ${(selectedConversation as any).projectTitle || selectedConversation?.participant?.profile?.fullName}`
      : selectedConversation?.participant?.profile?.fullName ||
        selectedConversation?.participant?.email ||
        'Founder';

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-0 sm:py-3 md:py-5 h-[calc(100dvh-64px)] md:h-[calc(100vh-80px)] flex flex-col">
      <div className="flex-1 card-base shadow-sm overflow-hidden flex flex-col md:flex-row border-0 sm:border border-slate-200 dark:border-dark-800 rounded-none sm:rounded-xl">
        
        {/* Left Side: Conversation List / Inbox */}
        {/* On mobile: Hidden if a conversation is selected. On desktop: Always visible */}
        <div
          className={`${
            selectedConversation ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-dark-800 flex-col h-full bg-slate-50/70 dark:bg-dark-900/60 shrink-0`}
        >
          {/* Inbox Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-dark-800 space-y-2.5 bg-white dark:bg-dark-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare size={17} className="text-brand-600 dark:text-brand-400" />
                <span>Messages</span>
              </h2>
              <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'chat' : 'chats'}
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search direct messages..."
                className="input-base pl-9 pr-3 py-1.5 text-xs w-full bg-slate-50 dark:bg-dark-850"
              />
            </div>
          </div>

          {/* Conversation Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-800">
            {loadingConversations ? (
              <div className="p-3.5 space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-14 rounded-lg bg-slate-200/60 dark:bg-dark-800 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-400 mb-2">
                  <MessageSquare size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No conversations yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Connect with founders or collaborators to start chatting.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const p = conv.participant;
                const name = p?.profile?.fullName || p?.email || 'User';
                const hasUnread = Boolean(conv.unreadCount && conv.unreadCount > 0 && !isSelected);

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer border-l-2 ${
                      isSelected
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-600 dark:border-brand-500'
                        : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-dark-800/50'
                    }`}
                  >
                    {(conv as any).isProjectGroup ? (
                      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/60 dark:border-brand-900/60 shrink-0">
                        <FolderKanban size={18} />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <Avatar
                          src={p?.profile?.avatar}
                          name={name}
                          size="md"
                          className="!w-10 !h-10 rounded-full"
                        />
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-600 rounded-full border-2 border-white dark:border-dark-900" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs truncate ${
                            hasUnread
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {name}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {hasUnread && (
                            <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center shadow-2xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          hasUnread
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {conv.lastMessage || 'Start a conversation...'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Instagram-style Chat Window */}
        {/* On mobile: Visible when selectedConversation != null. On desktop: Always visible */}
        <div
          className={`${
            !selectedConversation ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col h-full bg-white dark:bg-dark-900`}
        >
          {selectedConversation ? (
            <>
              {/* Instagram-style Chat Header on Top */}
              <div className="px-3.5 py-3 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between bg-white dark:bg-dark-900 shrink-0 sticky top-0 z-10 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button (<) */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full cursor-pointer transition-colors"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  {/* Participant Avatar */}
                  {(selectedConversation as any).isProjectGroup ? (
                    <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/60 dark:border-brand-900/60 shrink-0">
                      <FolderKanban size={17} />
                    </div>
                  ) : (
                    <Link
                      to={`/profile/${selectedConversation.participant?.id}`}
                      className="shrink-0 hover:opacity-85 transition-opacity"
                    >
                      <Avatar
                        src={selectedConversation.participant?.profile?.avatar}
                        name={receiverName}
                        size="md"
                        className="!w-9 !h-9 rounded-full"
                      />
                    </Link>
                  )}

                  {/* Participant Name & Status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={
                          (selectedConversation as any).isProjectGroup
                            ? '/projects'
                            : `/profile/${selectedConversation.participant?.id}`
                        }
                        className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate hover:underline"
                      >
                        {receiverName}
                      </Link>
                      {(selectedConversation as any).isProjectGroup ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                          Team
                        </span>
                      ) : (
                        <VerificationBadge
                          badge={selectedConversation.participant?.verificationBadge}
                          isVerified={selectedConversation.participant?.isVerified}
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {(selectedConversation as any).isProjectGroup
                        ? `${(selectedConversation as any).members?.length || 1} members • Team chat`
                        : selectedConversation.participant?.profile?.headline ||
                          selectedConversation.participant?.role ||
                          'Active on HookZ'}
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {!(selectedConversation as any).isProjectGroup && selectedConversation.id !== 'draft' && otherParticipantId && (
                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(true)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs ${
                        isParticipantBlocked
                          ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-transparent hover:border-rose-200 dark:hover:border-rose-900/50'
                      }`}
                      title={isParticipantBlocked ? 'Unblock user' : 'Block user'}
                    >
                      <UserX size={15} />
                      <span className="hidden sm:inline font-medium">
                        {isParticipantBlocked ? 'Unblock' : 'Block'}
                      </span>
                    </button>
                  )}

                  {selectedConversation.id !== 'draft' && (
                    <button
                      onClick={handleDeleteConversation}
                      disabled={deletingConv}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 text-xs"
                      title="Delete conversation permanently for you"
                    >
                      <Trash2 size={15} />
                      <span className="hidden sm:inline font-medium">Delete</span>
                    </button>
                  )}

                  {(selectedConversation as any).isProjectGroup ? (
                    <Link
                      to="/projects"
                      className="btn-secondary py-1 px-2.5 text-xs font-medium rounded-lg"
                    >
                      View Project
                    </Link>
                  ) : (
                    <Link
                      to={`/profile/${selectedConversation.participant?.id}`}
                      className="btn-secondary py-1 px-2.5 text-xs font-medium rounded-lg inline-flex items-center gap-1"
                    >
                      <UserIcon size={12} />
                      <span className="hidden sm:inline">Profile</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Blocked User Warning Banner */}
              {isParticipantBlocked && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/50 px-3.5 py-2 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={15} className="shrink-0 text-rose-600" />
                    <span>You have blocked this user. Unblock them to send or receive messages.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(true)}
                    className="font-bold underline cursor-pointer hover:text-rose-800 shrink-0 ml-2"
                  >
                    Unblock
                  </button>
                </div>
              )}

              {/* Messages Bubble Area */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-dark-950/30">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full text-xs text-slate-400">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  /* Instagram-style Initial Hero Intro */
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 my-auto">
                    <div className="relative">
                      <Avatar
                        src={selectedConversation.participant?.profile?.avatar}
                        name={receiverName}
                        size="lg"
                        className="!w-16 !h-16 shadow-md rounded-full ring-4 ring-slate-100 dark:ring-dark-800"
                      />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {receiverName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {selectedConversation.participant?.profile?.headline ||
                          'Startup Founder & Collaborator'}
                      </p>
                    </div>

                    {selectedConversation.participant?.id && (
                      <Link
                        to={`/profile/${selectedConversation.participant.id}`}
                        className="btn-secondary py-1 px-3 text-xs font-medium rounded-full inline-flex items-center gap-1.5"
                      >
                        <UserIcon size={12} />
                        <span>View Profile</span>
                      </Link>
                    )}

                    <div className="pt-2 text-[11px] text-slate-400 max-w-xs">
                      Send a message to introduce yourself, discuss mutual startup synergies, or share ideas.
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.senderId === user?.id;
                    const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
                    const showDateBreak = isDifferentDay(m.createdAt, prevMsg?.createdAt);

                    return (
                      <React.Fragment key={m.id || `msg-${idx}`}>
                        {/* Centered Date Separator */}
                        {showDateBreak && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 dark:bg-dark-800 text-slate-600 dark:text-slate-300 shadow-2xs">
                              {formatDateLabel(m.createdAt)}
                            </span>
                          </div>
                        )}

                        {/* Message Row */}
                        <div
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}
                        >
                          {isMe ? (
                            /* SENDER BUBBLE (Right Side) */
                            <div className="flex flex-col items-end max-w-[85%] sm:max-w-md ml-auto group relative">
                              {editingMessageId === m.id ? (
                                <div className="w-full bg-white dark:bg-dark-850 p-2.5 sm:p-3 rounded-2xl border border-brand-500 shadow-md space-y-2">
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    rows={2}
                                    className="input-base text-xs sm:text-sm w-full p-2 bg-slate-50 dark:bg-dark-900 resize-none"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={editingSaving || !editingContent.trim()}
                                      onClick={() => handleSaveEdit(m.id)}
                                      className="px-2.5 py-1 text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                                    >
                                      {editingSaving ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs break-words relative">
                                    {m.content}
                                    {m.isEdited && (
                                      <span className="text-[10px] text-brand-200 ml-1.5 italic">
                                        (edited)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-2 mr-1">
                                    {/* Instagram-style Actions on Sender message */}
                                    <div className="flex items-center gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(m)}
                                        className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-0.5 rounded cursor-pointer"
                                        title="Edit message"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUnsend(m.id)}
                                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                        title="Unsend message"
                                      >
                                        <Undo2 size={11} />
                                      </button>
                                    </div>

                                    <span>
                                      {new Date(m.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span title={m.isRead ? 'Read' : 'Delivered'} className="inline-flex">
                                      <CheckCheck
                                        size={12}
                                        className={
                                          m.isRead
                                            ? 'text-brand-600 dark:text-brand-400'
                                            : 'text-slate-400 dark:text-slate-500'
                                        }
                                      />
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            /* RECEIVER BUBBLE (Left Side) */
                            <div className="flex items-end justify-start gap-2 max-w-[85%] sm:max-w-md mr-auto">
                              <Avatar
                                src={
                                  (m as any).sender?.profile?.avatar ||
                                  selectedConversation.participant?.profile?.avatar
                                }
                                name={receiverName}
                                size="sm"
                                className="!w-7 !h-7 rounded-full mb-4 shrink-0 shadow-2xs"
                              />
                              <div className="flex flex-col items-start">
                                <div className="bg-white dark:bg-dark-850 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-dark-750 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs break-words">
                                  {m.content}
                                  {m.isEdited && (
                                    <span className="text-[10px] text-slate-400 ml-1.5 italic">
                                      (edited)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 ml-1">
                                  <span>
                                    {new Date(m.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Input */}
              {isParticipantBlocked ? (
                <div className="p-3 border-t border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <span>You cannot message this user because they are blocked.</span>
                  <button
                    type="button"
                    onClick={() => setBlockModalOpen(true)}
                    className="btn-secondary py-1 px-3 text-xs font-semibold cursor-pointer"
                  >
                    Unblock to Chat
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 flex items-center gap-2 shrink-0"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Message..."
                    className="input-base py-2 px-3.5 text-xs sm:text-sm flex-1 rounded-full bg-slate-50 dark:bg-dark-850 border-slate-200 dark:border-dark-750 focus:bg-white dark:focus:bg-dark-900"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0"
                    aria-label="Send message"
                  >
                    <Send size={15} />
                  </button>
                </form>
              )}
            </>
          ) : (
            /* Empty State for Desktop when no conversation is active */
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

      {/* Block User Confirmation Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={isParticipantBlocked ? "Unblock User" : "Block User"}
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isParticipantBlocked
                  ? `Unblock ${receiverName}?`
                  : `Block ${receiverName}?`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isParticipantBlocked
                  ? "They will be able to message you, view your profile, and connect with you again."
                  : "They will not be able to send you messages or view your activity. You can unblock them at any time."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-800">
            <button
              type="button"
              onClick={() => setBlockModalOpen(false)}
              className="btn-secondary py-2 px-4 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={blockActionLoading}
              onClick={handleToggleBlock}
              className={`py-2 px-4 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50 ${
                isParticipantBlocked ? 'bg-brand-600 hover:bg-brand-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {blockActionLoading ? 'Processing...' : isParticipantBlocked ? 'Confirm Unblock' : 'Confirm Block'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
