import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { supabase, resolveUserIdToUUID, isUUID } from '../../lib/supabase';
import { Post, Comment } from '../../types';
import { Avatar } from '../common/Avatar';
import { VerificationBadge } from '../common/Badge';
import { BuildTogetherModal } from './BuildTogetherModal';
import { PrototypeProposalsModal } from './PrototypeProposalsModal';
import { ShareModal } from '../common/ShareModal';
import {
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  ExternalLink,
  Globe,
  Hammer,
  Users,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Play,
  Video,
  Send,
  MoreVertical,
  Flag,
  Boxes,
  Sparkles,
} from 'lucide-react';

interface PrototypeCardProps {
  post: Post;
  onDelete?: (id: string) => void;
  onPostUpdated?: (updated: Post) => void;
  onVote?: (postId: string, vote: 'UP' | 'DOWN' | null) => void;
  onSaveToggle?: (postId: string, isSaved: boolean) => void;
}

export const PrototypeCard: React.FC<PrototypeCardProps> = ({
  post,
  onDelete,
  onPostUpdated,
  onVote,
  onSaveToggle,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Extract structured prototype data from post
  let parsedData: any = {};
  if (post.content && post.content.startsWith('{')) {
    try {
      parsedData = JSON.parse(post.content);
    } catch {}
  }

  const problemText = post.problem || parsedData.problem || '';
  const solutionText = post.solution || parsedData.solution || '';
  const descriptionText =
    parsedData.description ||
    (!post.problem && !parsedData.problem ? post.content : '');

  const websiteUrl =
    post.websiteUrl ||
    parsedData.websiteUrl ||
    post.links ||
    null;

  const mediaUrl =
    post.mediaUrl ||
    parsedData.mediaUrl ||
    post.images ||
    null;

  const isVideo =
    post.mediaType === 'video' ||
    parsedData.mediaType === 'video' ||
    (typeof mediaUrl === 'string' &&
      (mediaUrl.endsWith('.mp4') ||
        mediaUrl.endsWith('.webm') ||
        mediaUrl.endsWith('.mov') ||
        mediaUrl.includes('/video/')));

  // Author check
  const author = post.author;
  const authorId = post.authorId || (post as any).author_id || author?.id;
  const isAuthor = Boolean(user) && Boolean(
    (user?.id && (String(user.id).toLowerCase() === String(authorId).toLowerCase() || String(user.id).toLowerCase() === String(author?.id).toLowerCase())) ||
    (user?.profile?.userId && String(user.profile.userId).toLowerCase() === String(authorId).toLowerCase()) ||
    (user?.email && author?.email && String(user.email).toLowerCase() === String(author.email).toLowerCase())
  );

  const sendPrototypeNotification = async (type: 'POST_LIKE' | 'POST_COMMENT', title: string, message: string) => {
    if (!user) return;
    const authorTargetId = post.authorId || (post as any).author_id || post.author?.id;
    if (!authorTargetId || isAuthor) return;

    try {
      const authorUuid = isUUID(authorTargetId) ? authorTargetId : await resolveUserIdToUUID(authorTargetId);
      const senderUuid = isUUID(user.id) ? user.id : await resolveUserIdToUUID(user.id);
      if (!authorUuid || authorUuid === senderUuid) return;

      await supabase.from('notifications').insert({
        user_id: authorUuid,
        sender_id: senderUuid || user.id,
        type,
        title,
        message,
        link: `/feed?pillar=PROTOTYPES&postId=${post.id}#post-${post.id}`,
        is_read: false,
      });

      window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
    } catch (err) {
      console.warn('Prototype notification notice:', err);
    }
  };

  // Social interactions state
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(post.isSaved));
  const [likeLoading, setLikeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

  // Proposal Modals state
  const [buildTogetherOpen, setBuildTogetherOpen] = useState(false);
  const [proposalsModalOpen, setProposalsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [proposalsCount, setProposalsCount] = useState<number>(post.proposalsCount || 0);
  const [hasSentProposal, setHasSentProposal] = useState(false);

  // Check if current user sent a proposal
  useEffect(() => {
    if (!user?.id || isAuthor) return;
    try {
      const sentLocal = localStorage.getItem(`startupz_proto_proposal_sent_${post.id}_${user.id}`);
      if (sentLocal === 'true') {
        setHasSentProposal(true);
      }
    } catch {}

    // Check directly in Supabase
    const checkSent = async () => {
      try {
        const { data } = await supabase
          .from('prototype_proposals')
          .select('id')
          .eq('prototype_id', post.id)
          .eq('sender_id', user.id)
          .maybeSingle();
        if (data?.id) {
          setHasSentProposal(true);
        }
      } catch {}
    };
    checkSent();
  }, [user?.id, post.id, isAuthor]);

  // Fetch proposals count for author
  const fetchProposalsCount = async () => {
    if (!isAuthor) return;
    try {
      const { data, count, error } = await supabase
        .from('prototype_proposals')
        .select('*', { count: 'exact' })
        .eq('prototype_id', post.id);

      if (!error && typeof count === 'number') {
        setProposalsCount(count);
      } else {
        // Fallback API
        const res = await api.getPrototypeProposals(post.id).catch(() => ({ proposals: [] }));
        if (res?.proposals) {
          setProposalsCount(res.proposals.length);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchProposalsCount();
  }, [isAuthor, post.id]);

  // Handle Like Toggle
  const handleLikeToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (likeLoading) return;

    setLikeLoading(true);
    const newLiked = !isLiked;
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    setIsLiked(newLiked);
    setLikesCount(newCount);

    try {
      if (onVote) {
        onVote(post.id, newLiked ? 'UP' : null);
      } else {
        if (newLiked) {
          await api.likePost(post.id).catch(() => null);
        } else {
          await api.votePost(post.id, { vote: null }).catch(() => null);
        }
      }

      try {
        if (newLiked) {
          await supabase
            .from('likes')
            .upsert({ user_id: user.id, post_id: post.id, vote_type: 'UP' }, { onConflict: 'user_id,post_id' });

          const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
          sendPrototypeNotification(
            'POST_LIKE',
            'Liked your prototype ❤️',
            `${myName} liked your prototype "${post.title || 'Prototype'}".`
          );
        } else {
          await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', post.id);
        }
      } catch {}
    } catch (err) {
      console.warn('Like toggle notice:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  // Handle Save / Bookmark Toggle
  const handleSaveToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (saveLoading) return;

    setSaveLoading(true);
    const newSaved = !isSaved;
    setIsSaved(newSaved);

    try {
      if (onSaveToggle) {
        onSaveToggle(post.id, newSaved);
      }

      // Local storage mirror
      try {
        const rawLocal = localStorage.getItem('startupz_saved_items');
        let localList: any[] = rawLocal ? JSON.parse(rawLocal) : [];
        if (newSaved) {
          if (!localList.some((li) => li.itemType === 'POST' && li.itemId === post.id)) {
            localList.push({
              id: `saved-${Date.now()}`,
              itemType: 'POST',
              itemId: post.id,
              savedAt: new Date().toISOString(),
              data: post,
              details: post,
            });
          }
        } else {
          localList = localList.filter((li) => !(li.itemType === 'POST' && li.itemId === post.id));
        }
        localStorage.setItem('startupz_saved_items', JSON.stringify(localList));
      } catch {}

      // Supabase mirror
      try {
        if (newSaved) {
          await supabase
            .from('saved_items')
            .upsert({ user_id: user.id, item_type: 'POST', item_id: post.id }, { onConflict: 'user_id,item_type,item_id' });
        } else {
          await supabase
            .from('saved_items')
            .delete()
            .eq('user_id', user.id)
            .eq('item_type', 'POST')
            .eq('item_id', post.id);
        }
      } catch {}
    } catch (err) {
      console.warn('Save toggle notice:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle Comment Submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    const content = commentText.trim();
    setCommentText('');

    try {
      let createdComment: any = null;
      try {
        const res = await api.addComment(post.id, content);
        createdComment = res?.comment || res;
      } catch (apiErr) {
        // Direct Supabase insert fallback
        const { data } = await supabase
          .from('comments')
          .insert({ post_id: post.id, author_id: user.id, content })
          .select()
          .single();
        if (data) {
          createdComment = {
            ...data,
            author: { id: user.id, profile: user.profile },
          };
        }
      }

      if (createdComment) {
        setComments((prev) => [createdComment, ...prev]);
        setCommentsCount((prev) => prev + 1);

        const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
        sendPrototypeNotification(
          'POST_COMMENT',
          'New Comment on your prototype 💬',
          `${myName} commented on your prototype "${post.title || 'Prototype'}": "${content.slice(0, 50)}..."`
        );
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Format creation date
  const timeFormatted = new Date(post.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div
        id={`post-${post.id}`}
        className="card-base p-4 sm:p-5 border border-slate-200/90 dark:border-dark-800 bg-white dark:bg-dark-900 rounded-2xl shadow-xs hover:shadow-card transition-all space-y-4"
      >
        {/* 1. Header: Author profile & Prototype badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/profile/${authorId}`} className="shrink-0 group">
              <Avatar
                src={author?.profile?.avatar}
                name={author?.profile?.fullName || author?.email || 'Builder'}
                size="md"
                className="group-hover:ring-2 ring-brand-500 transition-all"
              />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  to={`/profile/${authorId}`}
                  className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate"
                >
                  {author?.profile?.fullName || author?.email?.split('@')[0] || 'Early Builder'}
                </Link>
                {author?.isVerified && (
                  <VerificationBadge badge={author.verificationBadge} size="sm" />
                )}
                <span className="text-slate-400 dark:text-slate-500 text-xs">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{timeFormatted}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {author?.profile?.headline || 'Startup Builder'}
              </div>
            </div>
          </div>

          {/* Prototype Badge & Author Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/50 dark:to-blue-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 shadow-2xs">
              <Boxes size={12} className="text-cyan-600 dark:text-cyan-400" />
              <span>Prototype Sample</span>
            </span>

            {/* Author Delete option */}
            {(isAuthor || user?.isAdmin) && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(post.id)}
                title="Delete this prototype"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Prototype Title */}
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {post.title || 'Untitled Prototype'}
          </h3>
        </div>

        {/* 3. Question & Solution: Highlighted Dual Callouts */}
        {(problemText || solutionText) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Question / Problem */}
            {problemText && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
                <div className="text-[11px] font-extrabold tracking-wide uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>The Problem (Question)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                  {problemText}
                </p>
              </div>
            )}

            {/* Solution */}
            {solutionText && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
                <div className="text-[11px] font-extrabold tracking-wide uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>The Solution</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                  {solutionText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. What Was Built / Description (if provided) */}
        {descriptionText && (
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {descriptionText}
          </p>
        )}

        {/* 5. Live Website URL Banner */}
        {websiteUrl && (
          <div className="pt-1">
            <a
              href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-dark-850 hover:bg-brand-50/70 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-800 w-full transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Globe size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                    <span>Explore Live Website / Demo Sample</span>
                    <ExternalLink size={12} className="opacity-70 group-hover:opacity-100" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                    {websiteUrl}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-brand-600 dark:text-brand-400 hidden sm:inline">
                Open Link &rarr;
              </span>
            </a>
          </div>
        )}

        {/* 6. Media Display: Video (<60s) or Photo */}
        {mediaUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center relative">
            {isVideo ? (
              <div className="w-full relative">
                {/* 60s limit badge */}
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                  <Video size={11} className="text-indigo-400" />
                  <span>&lt; 60s Demo</span>
                </div>
                <video
                  src={mediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[460px] object-contain mx-auto"
                />
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt={post.title || 'Prototype Preview'}
                className="w-full max-h-[460px] object-contain mx-auto"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* 7. Action Bar: Like, Comments, Share, Save + BUILD TOGETHER or PROPOSALS */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
          {/* Left social actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Like button */}
            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLiked
                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
              }`}
            >
              <Heart size={15} className={isLiked ? 'fill-current text-rose-600' : ''} />
              <span>{likesCount}</span>
            </button>

            {/* Comment button */}
            <button
              type="button"
              onClick={() => setCommentsOpen(!commentsOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
            >
              <MessageSquare size={15} />
              <span>{commentsCount}</span>
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
              title="Share prototype"
            >
              <Share2 size={15} />
            </button>

            {/* Save / Bookmark button */}
            <button
              type="button"
              onClick={handleSaveToggle}
              disabled={saveLoading}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSaved
                  ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save prototype'}
            >
              <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Right: COLLABORATION BUTTON (Build Together vs Proposals) */}
          <div>
            {isAuthor ? (
              // Author view: "Proposals (count)" button
              <button
                type="button"
                onClick={() => setProposalsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900 transition-all cursor-pointer shadow-2xs group"
              >
                <Users size={14} className="text-brand-600 group-hover:scale-110 transition-transform" />
                <span>Proposals</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-600 text-white ml-0.5">
                  {proposalsCount}
                </span>
              </button>
            ) : (
              // Non-author view: "Build Together" button
              <button
                type="button"
                onClick={() => setBuildTogetherOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-subtle ${
                  hasSentProposal
                    ? 'bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    : 'bg-brand-600 hover:bg-brand-700 text-white active:scale-95'
                }`}
              >
                <Hammer size={14} />
                <span>{hasSentProposal ? 'Proposal Sent' : 'Build Together'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 8. Comments Section (Expanded) */}
        {commentsOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {/* Comment input form */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write feedback or ask a question about this prototype..."
                className="input-base flex-1 text-xs py-2"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="btn-primary py-2 px-3 text-xs"
              >
                <Send size={13} />
                <span className="hidden sm:inline">Comment</span>
              </button>
            </form>

            {/* Comments list */}
            {comments.length > 0 ? (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.author?.profile?.fullName || c.author?.email?.split('@')[0] || 'Builder'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-400">
                No comments yet. Be the first to give feedback on this prototype!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Build Together Modal (for non-uploaders) */}
      <BuildTogetherModal
        prototype={post}
        isOpen={buildTogetherOpen}
        onClose={() => setBuildTogetherOpen(false)}
        onSuccess={() => {
          setHasSentProposal(true);
        }}
      />

      {/* Proposals Modal (for uploader) */}
      <PrototypeProposalsModal
        prototype={post}
        isOpen={proposalsModalOpen}
        onClose={() => setProposalsModalOpen(false)}
        onProposalUpdated={fetchProposalsCount}
      />

      {/* Share Modal */}
      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          item={{
            title: post.title || 'Prototype Sample',
            description: problemText ? `Problem: ${problemText}` : 'Check out this prototype on HookZ!',
            url: `/feed?pillar=PROTOTYPES&postId=${post.id}`,
            type: 'post',
          }}
        />
      )}
    </>
  );
};
