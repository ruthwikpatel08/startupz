import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Conversation, Message } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { Modal } from '../../components/common/Modal';
import { SEO } from '../../components/common/SEO';
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
  ExternalLink,
  ArrowRight,
  Bot,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  Link2,
  Download,
  FileText,
  FileCode,
  FileArchive,
  Music,
  Video,
  Loader2,
  MoreHorizontal,
  Copy,
} from 'lucide-react';
import { ProjectAiScoutControl } from '../../components/ai/ProjectAiScoutControl';
import {
  supabase,
  fetchUserProfile,
  getSupabaseConversations,
  getSupabaseMessages,
  sendSupabaseMessage,
  deleteSupabaseConversation,
  getDeletedConversationIds,
  recordDeletedConversation,
  unsendSupabaseMessage,
  editSupabaseMessage,
  markMessagesAsRead,
  deleteSupabaseMessageForMe,
  getDeletedMessageIds,
  recordDeletedMessage,
} from '../../lib/supabase';

function renderLineTokens(
  text: string,
  isMine: boolean,
  onNavigate?: (targetPath: string, fullUrl: string) => void
): React.ReactNode {
  if (!text) return null;
  const tokenRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+|\*\*[^*]+\*\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (match) {
        const linkLabel = match[1];
        const linkUrl = match[2];
        return (
          <a
            key={idx}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-bold underline underline-offset-2 ${
              isMine ? 'text-white' : 'text-brand-600 dark:text-brand-400 hover:text-brand-700'
            }`}
          >
            {linkLabel}
          </a>
        );
      }
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-extrabold font-bold tracking-tight">
          {boldText}
        </strong>
      );
    }

    if (part.startsWith('http://') || part.startsWith('https://')) {
      let internalPath: string | null = null;
      try {
        const u = new URL(part);
        if (
          u.origin === window.location.origin ||
          u.hostname === 'hookz.in' ||
          u.hostname.includes('localhost')
        ) {
          internalPath = u.pathname + u.search + u.hash;
        }
      } catch {}

      return (
        <a
          key={idx}
          href={internalPath || part}
          onClick={(e) => {
            if (internalPath && onNavigate) {
              e.preventDefault();
              e.stopPropagation();
              onNavigate(internalPath, part);
            }
          }}
          target={internalPath ? undefined : '_blank'}
          rel="noopener noreferrer"
          className={`font-bold underline underline-offset-2 break-all ${
            isMine
              ? 'text-white hover:text-brand-100'
              : 'text-brand-600 dark:text-brand-400 hover:text-brand-700'
          }`}
        >
          {part}
        </a>
      );
    }

    return part;
  });
}

function renderTextWithMarkdown(
  text: string,
  isMine: boolean,
  onNavigate?: (targetPath: string, fullUrl: string) => void
): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('#### ')) {
      return (
        <div key={lineIdx} className="font-bold text-xs text-brand-600 dark:text-brand-400 mt-2 mb-0.5">
          {renderLineTokens(trimmed.replace(/^####\s+/, ''), isMine, onNavigate)}
        </div>
      );
    }

    if (trimmed.startsWith('### ')) {
      return (
        <div key={lineIdx} className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-2.5 mb-1">
          {renderLineTokens(trimmed.replace(/^###\s+/, ''), isMine, onNavigate)}
        </div>
      );
    }

    if (trimmed.startsWith('## ')) {
      return (
        <div key={lineIdx} className="font-extrabold text-sm text-slate-900 dark:text-white mt-3 mb-1">
          {renderLineTokens(trimmed.replace(/^##\s+/, ''), isMine, onNavigate)}
        </div>
      );
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={lineIdx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-brand-500 font-bold shrink-0 mt-0.5">•</span>
          <div className="flex-1">
            {renderLineTokens(trimmed.replace(/^[-*]\s+/, ''), isMine, onNavigate)}
          </div>
        </div>
      );
    }

    return (
      <div key={lineIdx} className={trimmed === '' ? 'h-1.5' : 'my-0.5'}>
        {renderLineTokens(line, isMine, onNavigate)}
      </div>
    );
  });
}

function getFileIcon(name: string) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.pdf')) return <FileText size={18} className="text-rose-500" />;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(lower)) return <FileArchive size={18} className="text-amber-500" />;
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(lower)) return <Music size={18} className="text-purple-500" />;
  if (/\.(mp4|mov|webm|avi|mkv)$/i.test(lower)) return <Video size={18} className="text-cyan-500" />;
  if (/\.(js|jsx|ts|tsx|py|html|css|json|java|cpp|c|go|rs)$/i.test(lower)) return <FileCode size={18} className="text-emerald-500" />;
  return <FileText size={18} className="text-blue-500" />;
}

const RenderMessageContent: React.FC<{
  content: string;
  isMine: boolean;
  onNavigate: (targetPath: string, fullUrl: string) => void;
  onOpenImage?: (url: string, name: string) => void;
}> = ({ content, isMine, onNavigate, onOpenImage }) => {
  if (!content) return null;
  const trimmed = content.trim();

  // 1. Pattern for shared HookZ item
  const sharePattern = /^(?:([\s\S]*?)\n\n)?Check this out on HookZ:\s*(?:\*\*|")?([^\n\r*"]+?)(?:\*\*|")?\s*\n\s*(https?:\/\/[^\s]+|\/[^\s]+)$/i;
  const shareMatch = trimmed.match(sharePattern);

  if (shareMatch) {
    const note = shareMatch[1]?.trim();
    const sharedTitle = shareMatch[2]?.trim();
    const sharedUrl = shareMatch[3]?.trim();

    let internalPath: string = sharedUrl;
    try {
      if (sharedUrl.startsWith('http')) {
        const parsed = new URL(sharedUrl);
        internalPath = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {}

    let typeBadge = 'Shared Item';
    let ctaText = 'View on HookZ';
    if (sharedUrl.includes('/feed')) {
      typeBadge = 'Feed Post';
      ctaText = 'View Post';
    } else if (sharedUrl.includes('/startups/')) {
      typeBadge = 'Startup';
      ctaText = 'View Startup';
    } else if (sharedUrl.includes('/profile/')) {
      typeBadge = 'Builder Profile';
      ctaText = 'View Profile';
    } else if (sharedUrl.includes('/projects')) {
      typeBadge = 'Project';
      ctaText = 'View Project';
    } else if (sharedUrl.includes('/problems/')) {
      typeBadge = 'Challenge';
      ctaText = 'View Challenge';
    }

    return (
      <div className="space-y-2">
        {note && (
          <p className="whitespace-pre-line leading-relaxed">
            {renderTextWithMarkdown(note, isMine, onNavigate)}
          </p>
        )}

        <div className="text-[11px] font-medium opacity-90">
          Check this out on HookZ:
        </div>

        {/* BOLD letters for shared things, clickable and redirects to post */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onNavigate(internalPath, sharedUrl);
          }}
          className={`rounded-xl p-3 border transition-all cursor-pointer select-none text-left block shadow-xs hover:shadow-md ${
            isMine
              ? 'bg-white/15 hover:bg-white/20 border-white/30 text-white'
              : 'bg-slate-50 dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white'
          }`}
          role="button"
          tabIndex={0}
          title={`Click to open ${sharedTitle}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                isMine
                  ? 'bg-white/25 text-white'
                  : 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-900'
              }`}
            >
              {typeBadge}
            </span>
            <ExternalLink size={12} className={isMine ? 'text-white/80' : 'text-slate-400'} />
          </div>

          {/* BOLD LETTERS */}
          <div className="font-extrabold text-sm sm:text-base leading-snug mt-2 tracking-tight break-words">
            {sharedTitle}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/20 dark:border-dark-700/60 flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-bold flex items-center gap-1 ${
                isMine ? 'text-white' : 'text-brand-600 dark:text-brand-400'
              }`}
            >
              <span>{ctaText}</span>
              <ArrowRight size={12} />
            </span>
            <span className={`text-[10px] truncate max-w-[140px] opacity-70 ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
              {sharedUrl.replace(/^https?:\/\/[^\/]+/, '') || sharedUrl}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Attachment tokens: [attachment:image|URL|NAME|SIZE] or [attachment:file|URL|NAME|SIZE]
  const attachmentRegex = /\[attachment:(image|file)\|([^|\]]+)\|([^|\]]+)(?:\|([^|\]]*))?\]/g;
  if (attachmentRegex.test(trimmed)) {
    attachmentRegex.lastIndex = 0;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = attachmentRegex.exec(trimmed)) !== null) {
      const matchStart = match.index;
      const textBefore = trimmed.slice(lastIdx, matchStart).trim();
      if (textBefore) {
        parts.push(
          <div key={`text-${lastIdx}`} className="whitespace-pre-line leading-relaxed mb-2">
            {renderTextWithMarkdown(textBefore, isMine, onNavigate)}
          </div>
        );
      }

      const attachType = match[1];
      const attachUrl = match[2];
      const attachName = match[3];
      const attachSize = match[4] || '';

      if (attachType === 'image') {
        parts.push(
          <div
            key={`img-${matchStart}`}
            className="my-1.5 max-w-sm rounded-xl overflow-hidden border border-slate-200/80 dark:border-dark-700 shadow-sm bg-slate-900/10 dark:bg-black/20 group relative"
          >
            <img
              src={attachUrl}
              alt={attachName}
              loading="lazy"
              className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => (onOpenImage ? onOpenImage(attachUrl, attachName) : window.open(attachUrl, '_blank'))}
            />
            <div className="p-2 bg-white/95 dark:bg-dark-850/95 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-dark-750 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]" title={attachName}>
                {attachName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {attachSize && <span className="text-[10px] text-slate-400">{attachSize}</span>}
                <a
                  href={attachUrl}
                  download={attachName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-dark-750 text-slate-500 hover:text-brand-600 transition-colors"
                  title="Download image"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={13} />
                </a>
              </div>
            </div>
          </div>
        );
      } else {
        parts.push(
          <div
            key={`file-${matchStart}`}
            className={`my-1.5 p-3 rounded-xl border flex items-center justify-between gap-3 max-w-sm transition-all shadow-2xs hover:shadow-sm ${
              isMine
                ? 'bg-white/15 border-white/30 text-white'
                : 'bg-slate-50 dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isMine
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900'
                }`}
              >
                {getFileIcon(attachName)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs truncate" title={attachName}>
                  {attachName}
                </p>
                <p className={`text-[10px] ${isMine ? 'text-white/75' : 'text-slate-400'}`}>
                  {attachSize || 'File attachment'}
                </p>
              </div>
            </div>
            <a
              href={attachUrl}
              download={attachName}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                isMine
                  ? 'bg-white/25 hover:bg-white/35 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
              }`}
              title={`Download ${attachName}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={14} />
            </a>
          </div>
        );
      }

      lastIdx = match.index + match[0].length;
    }

    const trailingText = trimmed.slice(lastIdx).trim();
    if (trailingText) {
      parts.push(
        <div key="text-end" className="whitespace-pre-line leading-relaxed mt-2">
          {renderTextWithMarkdown(trailingText, isMine, onNavigate)}
        </div>
      );
    }

    return <div className="space-y-1">{parts}</div>;
  }

  // 3. Standalone Link check: if entire message is a single URL
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
    return (
      <div className="space-y-1">
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 max-w-sm transition-all hover:opacity-95 ${
            isMine
              ? 'bg-white/15 border-white/30 text-white'
              : 'bg-slate-50 dark:bg-dark-800 border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Link2 size={15} className={isMine ? 'text-white' : 'text-brand-500'} />
            <span className="font-bold text-xs truncate">{trimmed}</span>
          </div>
          <ExternalLink size={13} className="shrink-0 opacity-80" />
        </a>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-line leading-relaxed">
      {renderTextWithMarkdown(content, isMine, onNavigate)}
    </div>
  );
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');
  const targetConvId = searchParams.get('conversationId');
  const targetProjectGroupId = searchParams.get('projectGroupId');

  const handleNavigateShared = (targetPath: string, fullUrl: string) => {
    if (targetPath.startsWith('/')) {
      navigate(targetPath);
    } else {
      try {
        const u = new URL(fullUrl);
        if (
          u.origin === window.location.origin ||
          u.hostname === 'hookz.in' ||
          u.hostname.includes('localhost')
        ) {
          navigate(u.pathname + u.search + u.hash);
        } else {
          window.open(fullUrl, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingConv, setDeletingConv] = useState(false);
  const [search, setSearch] = useState('');
  const [chatTab, setChatTab] = useState<'DIRECT' | 'PROJECTS' | 'ALL'>(
    targetProjectGroupId ? 'PROJECTS' : 'DIRECT'
  );

  // Block User State
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);

  // Message Edit State (Instagram style)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingSaving, setEditingSaving] = useState(false);
  const [isScoutAnalyzing, setIsScoutAnalyzing] = useState(false);

  // Conversation deletion modal state (syncs across desktop and mobile)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  // Active message actions menu (Edit, Unsend, Delete for you)
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 2500);
  };

  // File, Photo, and Link Attachment States
  const [selectedAttachment, setSelectedAttachment] = useState<{
    file: File;
    name: string;
    size: string;
    isImage: boolean;
    previewUrl?: string;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
    let previewUrl = '';
    if (isImage) {
      previewUrl = URL.createObjectURL(file);
    }
    setSelectedAttachment({
      file,
      name: file.name,
      size: formatBytes(file.size),
      isImage,
      previewUrl,
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link URL (e.g. https://github.com):');
    if (!url || !url.trim()) return;
    const clean = url.trim();
    const full = clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
    const label = window.prompt('Enter link title (optional):');
    const formatted = label?.trim() ? `[${label.trim()}](${full})` : full;
    setNewMessage((prev) => (prev ? `${prev} ${formatted}` : formatted));
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleTriggerScoutMention = () => {
    setNewMessage((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return '@AI Scout ';
      if (/@(AI\s*Scout|Scout|AI)\b/i.test(trimmed)) return prev;
      return `@AI Scout ${trimmed}`;
    });
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 40);
  };

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
      // Sync deleted conversations from server so desktop & mobile are identical!
      if (user?.id) {
        try {
          const delRes = await api.getDeletedChatItems().catch(() => null);
          if (delRes?.deletedConversationIds) {
            delRes.deletedConversationIds.forEach((id: string) => {
              recordDeletedConversation(user.id, id);
            });
          }
          if (delRes?.deletedMessageIds) {
            delRes.deletedMessageIds.forEach((id: string) => {
              recordDeletedMessage(user.id, id);
            });
          }
        } catch {}
      }

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
        const key = getParticipantKey(c);
        const otherId =
          c.participant?.id ||
          (c.participant1Id === user?.id ? c.participant2Id : c.participant1Id);
        if (deletedIds.has(c.id) || (otherId && deletedIds.has(otherId)) || deletedIds.has(key)) return;
        if (!convMap.has(key)) {
          convMap.set(key, c);
        }
      });

      apiList.forEach((c: any) => {
        const key = getParticipantKey(c);
        const otherId =
          c.participant?.id ||
          (c.participant1Id === user?.id ? c.participant2Id : c.participant1Id);
        if (deletedIds.has(c.id) || (otherId && deletedIds.has(otherId)) || deletedIds.has(key)) return;
        if (!convMap.has(key)) {
          convMap.set(key, c);
        }
      });

      // Load project groups from local storage and backend API projects
      try {
        const rawGroups = localStorage.getItem('startupz_project_groups');
        const localGroups = rawGroups ? JSON.parse(rawGroups) : [];
        const groupList: any[] = Array.isArray(localGroups) ? [...localGroups] : [];

        // Also fetch user's projects from API so any assigned team member sees the group chat!
        try {
          const pRes = await api.getProjects().catch(() => null);
          const serverProjs = Array.isArray(pRes?.projects) ? pRes.projects : [];
          serverProjs.forEach((sp: any) => {
            const isCreator = user?.id && (sp.creator?.userId === user.id || sp.creatorId === user.id);
            const isMember = user?.id && Array.isArray(sp.roles) && sp.roles.some((r: any) => r.assignedTo?.userId === user.id);
            if (isCreator || isMember) {
              const exists = groupList.some((g: any) => g.id === sp.id || g.projectId === sp.id);
              if (!exists) {
                const members = (sp.roles || []).filter((r: any) => r.assignedTo).map((r: any) => ({
                  userId: r.assignedTo.userId,
                  fullName: r.assignedTo.fullName,
                  role: r.roleName,
                  avatar: r.assignedTo.avatar || null,
                }));
                groupList.push({
                  id: `group-${sp.id}`,
                  projectId: sp.id,
                  title: sp.title,
                  members,
                  createdAt: sp.createdAt || new Date().toISOString(),
                });
              }
            }
          });
        } catch {}

        groupList.forEach((g: any) => {
          const pId = g.projectId || g.id;
          const key = `group_${pId}`;
          if (deletedIds.has(g.id) || (g.projectId && deletedIds.has(g.projectId)) || deletedIds.has(key)) {
            return;
          }
          const groupConv: any = {
            id: g.id,
            projectId: pId,
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
          convMap.set(key, groupConv);
        });
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
    if (targetProjectGroupId) {
      setChatTab('PROJECTS');
    }
  }, [targetProjectGroupId]);

  useEffect(() => {
    fetchConversations();
  }, [targetUserId, targetConvId, targetProjectGroupId, user?.id]);

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

  // Realtime subscription for cross-device conversation deletion & sync (laptop <-> mobile)
  useEffect(() => {
    if (!user?.id) return;
    const syncChannel = supabase
      .channel(`user_chat_sync_${user.id}`)
      .on('broadcast', { event: 'chat_deleted' }, ({ payload }) => {
        if (payload?.userId === user.id && payload?.conversationId) {
          const cId = payload.conversationId;
          recordDeletedConversation(user.id, cId);
          setConversations((prev) => prev.filter((c) => c.id !== cId && (c as any).projectId !== cId));
          setSelectedConversation((curr: any) => {
            if (curr && (curr.id === cId || curr.projectId === cId)) {
              setMessages([]);
              return null;
            }
            return curr;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, [user?.id]);

  // Close message options menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMessageMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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
          let msgs: any[] = [];
          try {
            const sRes = await api.getProjectMessages(pId).catch(() => null);
            if (sRes && Array.isArray(sRes.messages) && sRes.messages.length > 0) {
              msgs = sRes.messages;
              try {
                localStorage.setItem(`startupz_project_messages_${pId}`, JSON.stringify(msgs));
              } catch {}
            }
          } catch {}

          if (msgs.length === 0) {
            try {
              const { data: supaMsgs } = await supabase
                .from('project_messages')
                .select('*')
                .eq('project_id', pId)
                .order('created_at', { ascending: true });
              if (Array.isArray(supaMsgs) && supaMsgs.length > 0) {
                msgs = supaMsgs.map((sm: any) => ({
                  id: sm.id,
                  projectId: sm.project_id,
                  conversationId: sm.conversation_id || `proj-group-${sm.project_id}`,
                  senderId: sm.sender_id,
                  content: sm.content,
                  sender: sm.sender || {},
                  isAiScout: Boolean(sm.is_ai_scout),
                  createdAt: sm.created_at,
                }));
              }
            } catch {}
          }

          if (msgs.length === 0) {
            const raw = localStorage.getItem(`startupz_project_messages_${pId}`);
            msgs = raw ? JSON.parse(raw) : [];
          }

          if (msgs.length === 0) {
            msgs = [
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
          }
          const deletedMsgs = getDeletedMessageIds(user?.id);
          setMessages(msgs.filter((m) => !deletedMsgs.has(m.id)));
          setTimeout(() => scrollToBottom('auto'), 50);
          return;
        }

        const deletedMsgs = getDeletedMessageIds(user?.id);

        // 1. Fetch persistent messages from Supabase
        const supaMsgs = await getSupabaseMessages(selectedConversation.id, user?.id);

        if (supaMsgs.length > 0) {
          setMessages(supaMsgs.filter((m) => !deletedMsgs.has(m.id)));
        } else {
          // Fallback to backend API
          const res = await api.getMessages(selectedConversation.id).catch(() => []);
          const list = Array.isArray(res) ? res : res?.messages || res?.data || [];
          setMessages(list.filter((m: any) => !deletedMsgs.has(m.id)));
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

    if ((selectedConversation as any)?.isProjectGroup) {
      const pId = (selectedConversation as any).projectId || selectedConversation.id;
      const projChannel = supabase
        .channel(`proj_room_${pId}`)
        .on('broadcast', { event: 'new_project_msg' }, ({ payload }) => {
          if (payload && payload.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
            window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
            window.dispatchEvent(new CustomEvent('startupz_messages_updated'));
          }
        })
        .subscribe();

      // Poll every 3 seconds so all members receive all project group messages reliably across browsers
      const pInterval = setInterval(async () => {
        try {
          const sRes = await api.getProjectMessages(pId).catch(() => null);
          if (sRes && Array.isArray(sRes.messages) && sRes.messages.length > 0) {
            setMessages((prev) => {
              if (
                sRes.messages.length !== prev.length ||
                (sRes.messages.length > 0 && sRes.messages[sRes.messages.length - 1]?.id !== prev[prev.length - 1]?.id)
              ) {
                return sRes.messages;
              }
              return prev;
            });
          }
        } catch {}
      }, 3000);

      return () => {
        supabase.removeChannel(projChannel);
        clearInterval(pInterval);
      };
    }

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
    if ((!newMessage.trim() && !selectedAttachment) || !selectedConversation || !user?.id || sending || isUploadingAttachment) return;

    const receiverId =
      selectedConversation.participant?.id ||
      (selectedConversation.participant1Id === user.id
        ? selectedConversation.participant2Id
        : selectedConversation.participant1Id);

    if (!receiverId) return;

    setSending(true);
    let contentToSend = newMessage.trim();

    // Process attachment if selected
    if (selectedAttachment) {
      try {
        setIsUploadingAttachment(true);
        let fileUrl = '';
        try {
          const uploadRes = await api.uploadFile(selectedAttachment.file);
          if (uploadRes && uploadRes.url) {
            fileUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn('Backend file upload fallback:', uploadErr);
        }

        // Safe client-side fallback if server upload is unreachable
        if (!fileUrl) {
          fileUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve(selectedAttachment.previewUrl || '');
            reader.readAsDataURL(selectedAttachment.file);
          });
        }

        if (fileUrl) {
          const tagType = selectedAttachment.isImage ? 'image' : 'file';
          const token = `[attachment:${tagType}|${fileUrl}|${selectedAttachment.name}|${selectedAttachment.size}]`;
          contentToSend = contentToSend ? `${contentToSend}\n\n${token}` : token;
        }
        setSelectedAttachment(null);
      } catch (attachErr) {
        console.error('File attach notice:', attachErr);
      } finally {
        setIsUploadingAttachment(false);
      }
    }

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
        // 1. Post to Server API so all project members receive it
        let savedMsg = newMsg;
        try {
          const apiRes = await api.sendProjectMessage(pId, contentToSend).catch(() => null);
          if (apiRes && apiRes.message) {
            savedMsg = apiRes.message;
          }
        } catch {}

        // 2. Persist in Supabase project_messages table & broadcast
        try {
          await supabase.from('project_messages').upsert({
            id: savedMsg.id || `pmsg-${Date.now()}`,
            project_id: pId,
            conversation_id: `proj-group-${pId}`,
            sender_id: user.id,
            content: contentToSend,
            sender: savedMsg.sender || {},
            is_ai_scout: false,
            created_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch {}

        try {
          const projChannel = supabase.channel(`proj_room_${pId}`);
          projChannel.send({
            type: 'broadcast',
            event: 'new_project_msg',
            payload: savedMsg,
          });
        } catch {}

        // 2b. Insert project message notifications for other team members in Supabase
        try {
          const teamMembers = ((selectedConversation as any).members || []).filter((m: any) => {
            const mId = m.userId || m.id;
            return mId && mId !== user.id;
          });
          const senderName = user.profile?.fullName || user.email?.split('@')[0] || 'Team member';
          const projTitle = (selectedConversation as any).projectTitle || 'Project Team';

          for (const m of teamMembers) {
            const targetId = m.userId || m.id;
            try {
              await supabase.from('notifications').insert({
                user_id: targetId,
                sender_id: user.id,
                type: 'PROJECT_MESSAGE',
                title: `New message in ${projTitle} 📁`,
                message: `${senderName}: ${contentToSend.slice(0, 80)}`,
                link: `/messages?projectGroupId=${pId}`,
                is_read: false,
              });
            } catch {}
          }
        } catch (notifErr) {
          console.warn('Project message notification notice:', notifErr);
        }

        try {
          window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
          window.dispatchEvent(new CustomEvent('startupz_messages_updated'));
        } catch {}

        // 3. Cache in local storage
        const raw = localStorage.getItem(storageKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const updatedMsgs = [...existing, savedMsg];
        localStorage.setItem(storageKey, JSON.stringify(updatedMsgs));
        setMessages((prev) => [...prev, savedMsg]);
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

        // 4. Trigger AI Scout analysis if message mentions @AI Scout, @Scout, or @AI
        const isScoutMention = /@(AI\s*Scout|Scout|AI)\b/i.test(contentToSend);
        if (isScoutMention) {
          (async () => {
            try {
              setIsScoutAnalyzing(true);
              const scoutRes = await api.askProjectAiScout(pId, contentToSend);
              if (scoutRes && scoutRes.message) {
                const sMsg = scoutRes.message;
                setMessages((prev) => {
                  if (prev.some((m) => m.id === sMsg.id)) return prev;
                  return [...prev, sMsg];
                });
                const latestRaw = localStorage.getItem(storageKey);
                const latestList: any[] = latestRaw ? JSON.parse(latestRaw) : [];
                if (!latestList.some((m) => m.id === sMsg.id)) {
                  localStorage.setItem(storageKey, JSON.stringify([...latestList, sMsg]));
                }
              }
            } catch (scoutErr) {
              console.error('AI Scout analysis call notice:', scoutErr);
              const fallbackMsg: any = {
                id: `scout-fallback-${Date.now()}`,
                projectId: pId,
                conversationId: selectedConversation.id,
                senderId: 'ai-scout',
                content: "AI Scout's available requests for today have been used. Please try again tomorrow when the quota becomes available.",
                createdAt: new Date().toISOString(),
                isAiScout: true,
                sender: {
                  id: 'ai-scout',
                  email: 'scout@hookz.build',
                  role: 'AI_SCOUT',
                  isVerified: true,
                  profile: {
                    id: 'ai-scout',
                    userId: 'ai-scout',
                    fullName: 'AI Scout',
                    avatar: null,
                    headline: 'HookZ Project Chat Assistant',
                  },
                },
              };
              setMessages((prev) => [...prev, fallbackMsg]);
            } finally {
              setIsScoutAnalyzing(false);
              setTimeout(() => scrollToBottom('smooth'), 120);
            }
          })();
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

  const handleDeleteMessageForMe = async (msgId: string) => {
    if (!user?.id) return;
    try {
      await deleteSupabaseMessageForMe(msgId, user.id);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setActiveMessageMenuId(null);
      showToast('Message deleted for you.');
    } catch (err: any) {
      console.error('Delete message for me error:', err);
      alert('Unable to delete message for you.');
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
      setActiveMessageMenuId(null);
      showToast('Message unsent for everyone.');
    } catch (err: any) {
      console.error('Failed to unsend message:', err);
      alert(err.message || 'Failed to unsend message.');
    }
  };

  const handleCopyMessage = (msg: Message) => {
    if (!msg?.content) return;
    navigator.clipboard.writeText(msg.content);
    setCopiedMessageId(msg.id);
    setActiveMessageMenuId(null);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleConfirmDeleteConversation = async () => {
    if (!conversationToDelete || !user?.id || deletingConv) return;
    setDeletingConv(true);
    try {
      const conv = conversationToDelete;
      const convId = conv.id;
      const isProject = (conv as any)?.isProjectGroup;
      const projId = (conv as any)?.projectId;
      const otherId =
        conv.participant?.id ||
        (conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id);

      // 1. Mark permanently deleted in Supabase & broadcast cross-device
      await deleteSupabaseConversation(convId, user.id);

      // 2. Also record otherId and group key as deleted so it can never reappear
      if (otherId) {
        recordDeletedConversation(user.id, otherId);
        recordDeletedConversation(user.id, `user_${otherId}`);
      }
      if (isProject) {
        try {
          const rawGroups = localStorage.getItem('startupz_project_groups');
          if (rawGroups) {
            const parsed = JSON.parse(rawGroups);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((g: any) => g.id !== convId && g.projectId !== projId);
              localStorage.setItem('startupz_project_groups', JSON.stringify(filtered));
            }
          }
          if (projId) {
            localStorage.removeItem(`startupz_project_messages_${projId}`);
          }
          localStorage.removeItem(`startupz_project_messages_${convId}`);
        } catch {}
        recordDeletedConversation(user.id, `group_${projId || convId}`);
        if (projId) recordDeletedConversation(user.id, projId);
      }

      // 3. Mirror delete in backend API
      await api.deleteConversation(convId).catch(() => {});

      // 4. Update UI state in both desktop and mobile
      setConversations((prev) =>
        prev.filter((c) => c.id !== convId && (c as any).projectId !== projId)
      );

      if (
        selectedConversation?.id === convId ||
        (selectedConversation as any)?.projectId === projId
      ) {
        setSelectedConversation(null);
        setMessages([]);
        navigate('/messages', { replace: true });
      }

      setConversationToDelete(null);
      showToast('Conversation deleted permanently.');
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      alert(err.message || 'Unable to delete conversation. Please try again.');
    } finally {
      setDeletingConv(false);
    }
  };

  // Trigger conversation deletion modal or execute deletion
  const handleDeleteConversation = (conv?: Conversation) => {
    if (conv) {
      setConversationToDelete(conv);
    } else {
      handleConfirmDeleteConversation();
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    navigate('/messages', { replace: true });
  };

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const directConversations = safeConversations.filter((c) => !(c as any).isProjectGroup);
  const projectConversations = safeConversations.filter((c) => Boolean((c as any).isProjectGroup));

  const tabConversations =
    chatTab === 'PROJECTS'
      ? projectConversations
      : chatTab === 'ALL'
      ? safeConversations
      : directConversations;

  const filteredConversations = tabConversations.filter((c) => {
    const pName =
      (c as any).isProjectGroup
        ? (c as any).projectTitle || c.participant?.profile?.fullName || ''
        : c.participant?.profile?.fullName || c.participant?.email || '';
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
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-0 sm:py-3 md:py-5 h-[calc(100dvh-56px)] md:h-[calc(100vh-80px)] flex flex-col">
      <SEO title="Direct Messages | HookZ" noindex={true} />
      <div className="flex-1 card-base shadow-none sm:shadow-sm overflow-hidden flex flex-col md:flex-row border-0 sm:border border-slate-200 dark:border-dark-800 rounded-none sm:rounded-xl">
        
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

            {/* Category Tabs: Separate Direct Messages from Project Team Chats */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-dark-850 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChatTab('DIRECT')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  chatTab === 'DIRECT'
                    ? 'bg-white dark:bg-dark-750 text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserIcon size={13} />
                <span>Direct</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    chatTab === 'DIRECT'
                      ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold'
                      : 'bg-slate-200/60 dark:bg-dark-700 text-slate-500'
                  }`}
                >
                  {directConversations.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChatTab('PROJECTS')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  chatTab === 'PROJECTS'
                    ? 'bg-white dark:bg-dark-750 text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FolderKanban size={13} />
                <span>Projects</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    chatTab === 'PROJECTS'
                      ? 'bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold'
                      : 'bg-slate-200/60 dark:bg-dark-700 text-slate-500'
                  }`}
                >
                  {projectConversations.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChatTab('ALL')}
                className={`py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  chatTab === 'ALL'
                    ? 'bg-white dark:bg-dark-750 text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All</span>
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={chatTab === 'PROJECTS' ? 'Search project chats...' : 'Search direct messages...'}
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
                  <div
                    key={conv.id}
                    className={`group relative w-full flex items-center transition-colors cursor-pointer border-l-2 ${
                      isSelected
                        ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-600 dark:border-brand-500'
                        : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-dark-800/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv)}
                      className="flex-1 min-w-0 text-left p-3.5 pr-1 flex items-center gap-3 cursor-pointer"
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
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-xs truncate ${
                                hasUnread
                                  ? 'font-bold text-slate-900 dark:text-white'
                                  : 'font-semibold text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {name}
                            </span>
                            {(conv as any).isProjectGroup && (
                              <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                Project
                              </span>
                            )}
                          </div>
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

                    {/* Quick Delete Chat Button (Visible directly on mobile, hover on desktop) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv);
                      }}
                      className="p-2 mr-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                      title="Delete conversation for you"
                      aria-label="Delete chat"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Instagram-style Chat Window */}
        {/* On mobile: Visible when selectedConversation != null. On desktop: Always visible */}
        <div
          ref={chatContainerRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={`${
            !selectedConversation ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col h-full bg-white dark:bg-dark-900 relative overflow-hidden`}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 z-40 bg-brand-600/10 border-2 border-dashed border-brand-500 backdrop-blur-2xs flex items-center justify-center pointer-events-none animate-in fade-in">
              <div className="bg-brand-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <Paperclip size={16} />
                <span>Drop photo or file to attach to chat</span>
              </div>
            </div>
          )}
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
                      type="button"
                      onClick={() => handleDeleteConversation(selectedConversation)}
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
                                    <RenderMessageContent
                                      content={m.content}
                                      isMine={true}
                                      onNavigate={handleNavigateShared}
                                      onOpenImage={(url, name) => setLightboxImage({ url, name })}
                                    />
                                    {m.isEdited && (
                                      <span className="text-[10px] text-brand-200 ml-1.5 italic">
                                        (edited)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-2 mr-1">
                                    {/* Action Buttons & Dropdown for Sender Message */}
                                    <div className="relative flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(m)}
                                        className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 p-0.5 rounded cursor-pointer"
                                        title="Edit message"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUnsend(m.id)}
                                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                        title="Unsend for everyone"
                                      >
                                        <Undo2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMessageMenuId(activeMessageMenuId === m.id ? null : m.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                                        title="Message options"
                                      >
                                        <MoreHorizontal size={13} />
                                      </button>

                                      {/* Dropdown Menu */}
                                      {activeMessageMenuId === m.id && (
                                        <div
                                          className="absolute right-0 bottom-full mb-1 bg-white dark:bg-dark-850 border border-slate-200 dark:border-dark-750 rounded-xl shadow-xl py-1 px-1 min-w-[150px] z-30 animate-in fade-in zoom-in-95"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleStartEdit(m)}
                                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-750 flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <Pencil size={13} className="text-brand-600 dark:text-brand-400" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUnsend(m.id)}
                                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <Undo2 size={13} />
                                            <span>Unsend</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMessageForMe(m.id)}
                                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <Trash2 size={13} />
                                            <span>Delete for you</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyMessage(m)}
                                            className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-750 flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <Copy size={13} />
                                            <span>{copiedMessageId === m.id ? 'Copied!' : 'Copy'}</span>
                                          </button>
                                        </div>
                                      )}
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
                            (() => {
                              const isScout = m.isAiScout || m.senderId === 'ai-scout' || (m as any).sender?.role === 'AI_SCOUT';

                              if (isScout) {
                                return (
                                  <div className="flex items-start justify-start gap-2.5 max-w-[95%] sm:max-w-xl mr-auto my-1.5 animate-in fade-in">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-brand-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-sm border border-brand-400/40 mt-1">
                                      <Bot size={16} />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 mb-1 ml-1">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                          HookZ AI Scout
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                          Project Assistant
                                        </span>
                                      </div>
                                      <div className="bg-white dark:bg-dark-850 text-slate-900 dark:text-slate-100 border border-brand-500/25 dark:border-brand-500/30 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs break-words w-full space-y-1">
                                        <RenderMessageContent
                                          content={m.content}
                                          isMine={false}
                                          onNavigate={handleNavigateShared}
                                          onOpenImage={(url, name) => setLightboxImage({ url, name })}
                                        />
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1 ml-1 flex items-center gap-1.5">
                                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>•</span>
                                        <span className="text-brand-600 dark:text-brand-400 font-medium">Verified Team Analysis</span>
                                        <div className="relative ml-auto">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMessageMenuId(activeMessageMenuId === m.id ? null : m.id);
                                            }}
                                            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
                                            title="Message options"
                                          >
                                            <MoreHorizontal size={12} />
                                          </button>
                                          {activeMessageMenuId === m.id && (
                                            <div
                                              className="message-menu-dropdown absolute right-0 bottom-full mb-1 z-30 w-36 bg-white dark:bg-dark-850 border border-slate-200 dark:border-dark-750 rounded-xl shadow-lg p-1 text-xs animate-in fade-in"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteMessageForMe(m.id)}
                                                className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
                                              >
                                                <Trash2 size={13} />
                                                <span>Delete for you</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyMessage(m)}
                                                className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-750 flex items-center gap-2 cursor-pointer font-medium"
                                              >
                                                <Copy size={13} />
                                                <span>{copiedMessageId === m.id ? 'Copied!' : 'Copy'}</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
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
                                      <RenderMessageContent
                                        content={m.content}
                                        isMine={false}
                                        onNavigate={handleNavigateShared}
                                        onOpenImage={(url, name) => setLightboxImage({ url, name })}
                                      />
                                      {m.isEdited && (
                                        <span className="text-[10px] text-slate-400 ml-1.5 italic">
                                          (edited)
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 ml-1 flex items-center gap-1.5">
                                      <span>
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMessageMenuId(activeMessageMenuId === m.id ? null : m.id);
                                          }}
                                          className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
                                          title="Message options"
                                        >
                                          <MoreHorizontal size={12} />
                                        </button>
                                        {activeMessageMenuId === m.id && (
                                          <div
                                            className="message-menu-dropdown absolute left-0 bottom-full mb-1 z-30 w-36 bg-white dark:bg-dark-850 border border-slate-200 dark:border-dark-750 rounded-xl shadow-lg p-1 text-xs animate-in fade-in"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteMessageForMe(m.id)}
                                              className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-medium"
                                            >
                                              <Trash2 size={13} />
                                              <span>Delete for you</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleCopyMessage(m)}
                                              className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-750 flex items-center gap-2 cursor-pointer font-medium"
                                            >
                                              <Copy size={13} />
                                              <span>{copiedMessageId === m.id ? 'Copied!' : 'Copy'}</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                {isScoutAnalyzing && (
                  <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-md mr-auto my-2 animate-in fade-in">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                      <Sparkles size={14} className="animate-spin" />
                    </div>
                    <div className="bg-white dark:bg-dark-850 border border-brand-500/30 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300 shadow-2xs flex items-center gap-2">
                      <Bot size={14} className="text-brand-600 animate-pulse" />
                      <span className="font-medium">AI Scout is analyzing your team discussion...</span>
                      <div className="flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
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
                <div className="border-t border-slate-200 dark:border-dark-800 bg-white dark:bg-dark-900 shrink-0 sticky bottom-0 z-10">
                  {/* Hidden file pickers */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />

                  {/* Attachment Preview Chip */}
                  {selectedAttachment && (
                    <div className="px-3 pt-2 pb-1.5 flex items-center justify-between bg-slate-50 dark:bg-dark-850 border-b border-slate-100 dark:border-dark-800 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedAttachment.isImage && selectedAttachment.previewUrl ? (
                          <img
                            src={selectedAttachment.previewUrl}
                            alt="Attachment preview"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-dark-750 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-800/40">
                            {getFileIcon(selectedAttachment.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px] sm:max-w-xs">
                            {selectedAttachment.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {selectedAttachment.size} {isUploadingAttachment ? '• Uploading...' : '• Ready to send'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAttachment(null)}
                        className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove attachment"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={handleSendMessage}
                    className="p-2 sm:p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-1.5 sm:gap-2"
                  >
                    {/* Attachment Action Buttons */}
                    <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 shrink-0">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={sending || isUploadingAttachment}
                        title="Share Photo"
                        className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-brand-600 transition-colors cursor-pointer"
                        aria-label="Upload photo"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || isUploadingAttachment}
                        title="Share File / Document"
                        className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-brand-600 transition-colors cursor-pointer"
                        aria-label="Upload file"
                      >
                        <Paperclip size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertLink}
                        disabled={sending || isUploadingAttachment}
                        title="Share Link"
                        className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-800 hover:text-brand-600 transition-colors cursor-pointer"
                        aria-label="Insert link"
                      >
                        <Link2 size={18} />
                      </button>

                      {/* Quick AI Scout trigger button for project chat (accessible on mobile & desktop) */}
                      {(selectedConversation as any)?.isProjectGroup && (
                        <button
                          type="button"
                          onClick={handleTriggerScoutMention}
                          disabled={sending || isUploadingAttachment}
                          title="Ask AI Scout in this project"
                          className="px-2 py-1 sm:py-1.5 rounded-full bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/70 dark:hover:bg-brand-900/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-xs shrink-0"
                          aria-label="Ask AI Scout"
                        >
                          <Bot size={15} className={isScoutAnalyzing ? 'animate-spin' : ''} />
                          <span className="text-[11px] font-bold">@AI Scout</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onPaste={handlePaste}
                      placeholder={selectedAttachment ? 'Add a caption (optional)...' : 'Type a message, drop files, paste links...'}
                      className="input-base py-2 px-3 text-xs sm:text-sm flex-1 rounded-full bg-slate-50 dark:bg-dark-850 border-slate-200 dark:border-dark-750 focus:bg-white dark:focus:bg-dark-900"
                    />

                    <button
                      type="submit"
                      disabled={sending || isUploadingAttachment || (!newMessage.trim() && !selectedAttachment)}
                      className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-xs shrink-0"
                      aria-label="Send message"
                    >
                      {sending || isUploadingAttachment ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Movable AI Scout Control strictly inside Project Group Chats */}
              {(selectedConversation as any).isProjectGroup && (
                <ProjectAiScoutControl
                  onTriggerMention={handleTriggerScoutMention}
                  containerRef={chatContainerRef}
                  userId={user?.id}
                  isAnalyzing={isScoutAnalyzing}
                />
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

      {/* Delete Conversation Confirmation Modal */}
      <Modal
        isOpen={Boolean(conversationToDelete)}
        onClose={() => setConversationToDelete(null)}
        title="Delete Conversation"
        maxWidth="sm"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Delete chat history?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                This will delete this conversation for you across all your devices (desktop and mobile). The other participant will still retain their copy of the chat.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-800">
            <button
              type="button"
              onClick={() => setConversationToDelete(null)}
              className="btn-secondary py-2 px-4 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteConversation}
              className="py-2 px-4 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Delete for me
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-800 dark:border-slate-200">
          <Check size={14} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={lightboxImage.url}
                download={lightboxImage.name}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                title="Download full image"
              >
                <Download size={18} />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            {lightboxImage.name && (
              <p className="mt-2 text-xs text-white/80 font-medium truncate max-w-md">
                {lightboxImage.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
