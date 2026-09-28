import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Post, Startup } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
import { ReportModal } from '../../components/common/ReportModal';
import {
  Share2,
  Heart,
  MessageSquare,
  Bookmark,
  Send,
  Sparkles,
  Rocket,
  Plus,
  Briefcase,
  TrendingUp,
  HelpCircle,
  Award,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  MoreVertical,
  Flag,
  UserPlus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const StartupFeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // Post composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState('UPDATE');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLinks, setPostLinks] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Comments state: map of postId -> boolean (expanded) and comment inputs
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Modals
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('type', filterType);
      const res = await api.getPosts(params.toString());
      setPosts(res.posts || []);
    } catch (err) {
      console.error('Failed to load feed posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterType]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!postContent.trim()) {
      setComposerError('Please write something before publishing.');
      return;
    }

    setSubmittingPost(true);
    setComposerError(null);
    try {
      const res = await api.createPost({
        postType,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        links: postLinks.trim() || undefined,
      });

      // Insert new post at top of feed
      setPosts((prev) => [res.post, ...prev]);
      setPostTitle('');
      setPostContent('');
      setPostLinks('');
      setComposerOpen(false);
    } catch (err: any) {
      setComposerError(err.message || 'Failed to publish post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.liked, likesCount: res.likesCount }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleToggleSave = async (postId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleSave('POST', postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isSaved: res.saved } : p
        )
      );
    } catch (err) {
      console.error('Failed to save post:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.addComment(postId, text);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const comments = p.comments || [];
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...comments, res.comment],
            };
          }
          return p;
        })
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/feed#post-${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  const postTypes = [
    { key: 'ALL', label: 'All Updates' },
    { key: 'UPDATE', label: '🚀 Updates' },
    { key: 'LAUNCH', label: '🎉 Launches' },
    { key: 'COFOUNDER', label: '🤝 Co-Founder' },
    { key: 'HIRING', label: '💼 Hiring' },
    { key: 'FUNDING', label: '💰 Funding' },
    { key: 'ADVICE', label: '💡 Advice' },
  ];

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'LAUNCH':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'COFOUNDER':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'HIRING':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'FUNDING':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'ADVICE':
        return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {postTypes.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterType === tab.key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post Composer Card */}
      {user && (
        <div className="card-base p-4 sm:p-5 transition-colors">
          <div className="flex items-center gap-3">
            <img
              src={user.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-dark-700"
            />
            <button
              onClick={() => setComposerOpen(!composerOpen)}
              className="flex-1 text-left px-3.5 py-2 rounded-md bg-slate-50 dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 text-xs font-normal border border-slate-200/80 dark:border-dark-700/80 transition-colors"
            >
              Share a startup update, ask for advice, or hire co-founders...
            </button>
          </div>

          {composerOpen && (
            <form onSubmit={handleCreatePost} className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-800 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 mr-1">Post Type:</span>
                {[
                  { id: 'UPDATE', label: 'Update' },
                  { id: 'LAUNCH', label: 'Product Launch' },
                  { id: 'COFOUNDER', label: 'Seeking Co-Founder' },
                  { id: 'HIRING', label: 'Hiring Talent' },
                  { id: 'FUNDING', label: 'Funding Round' },
                  { id: 'ADVICE', label: 'Ask for Advice' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPostType(t.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      postType === t.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Post title or milestone headline (optional)"
                className="input-base w-full px-3 py-2 text-xs"
              />

              <textarea
                required
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your update, metrics, co-founder criteria, or question..."
                rows={4}
                className="input-base w-full px-3 py-2 text-xs resize-none"
              />

              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={postLinks}
                  onChange={(e) => setPostLinks(e.target.value)}
                  placeholder="External link (e.g. demo URL, announcement blog, deck)"
                  className="input-base flex-1 px-3 py-1.5 text-xs"
                />
              </div>

              {composerError && (
                <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
                  {composerError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="btn-secondary px-3 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="btn-primary px-4 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{submittingPost ? 'Publishing...' : 'Publish'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Feed Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-lg bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No posts in this feed"
          description="Be the first to publish a startup update, hiring notice, or co-founder search."
          actionLabel="Publish Update"
          onAction={() => setComposerOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const author = post.author;
            const authorName = author?.profile?.fullName || author?.email || 'Founder';
            const authorAvatar = author?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;
            const authorHeadline = author?.profile?.headline || author?.role;
            const isCommentsOpen = !!expandedComments[post.id];

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className="card-base p-5 sm:p-6 transition-colors space-y-4"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${author?.id}`}>
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-dark-700"
                      />
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/profile/${author?.id}`}
                          className="font-semibold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                        >
                          {authorName}
                        </Link>
                        <VerificationBadge badge={author?.verificationBadge} isVerified={author?.isVerified} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{authorHeadline}</p>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Post Type Badge & Report Dropdown */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getPostTypeBadge(
                        post.postType
                      )}`}
                    >
                      {post.postType}
                    </span>

                    <button
                      onClick={() => setReportTarget({ id: post.id, title: post.title || post.content.slice(0, 30) })}
                      title="Report Post"
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <Flag size={14} />
                    </button>
                  </div>
                </div>

                {/* Post Body */}
                <div className="space-y-2">
                  {post.title && (
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>

                  {post.links && (
                    <div className="pt-1.5">
                      <a
                        href={post.links}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline break-all"
                      >
                        <LinkIcon size={13} />
                        <span>{post.links}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Post Actions Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 font-medium transition-colors ${
                        post.isLiked
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart size={15} className={post.isLiked ? 'fill-rose-600' : ''} />
                      <span>{post.likesCount || 0}</span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="flex items-center gap-1.5 font-medium hover:text-brand-600 transition-colors"
                    >
                      <MessageSquare size={15} />
                      <span>{post.commentsCount || 0}</span>
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleToggleSave(post.id)}
                      className={`flex items-center gap-1.5 font-medium transition-colors ${
                        post.isSaved
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'hover:text-brand-600'
                      }`}
                    >
                      <Bookmark size={15} className={post.isSaved ? 'fill-brand-600' : ''} />
                      <span className="hidden sm:inline">{post.isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {copiedPostId === post.id ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <Check size={14} /> Copied!
                        </span>
                      ) : (
                        <>
                          <Share2 size={14} />
                          <span className="hidden sm:inline">Share</span>
                        </>
                      )}
                    </button>

                    {/* Connect with author */}
                    {user && user.id !== author?.id && (
                      <button
                        onClick={() => setConnectUser(author)}
                        className="btn-secondary px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1"
                      >
                        <UserPlus size={13} />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Comments Section */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-100 dark:border-dark-800 space-y-3">
                    {/* Add Comment Box */}
                    {user && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Write a constructive comment or thought..."
                          className="input-base flex-1 px-3 py-1.5 text-xs"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={submittingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                          className="btn-primary px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                        >
                          Send
                        </button>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-2 pt-1">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {c.author?.profile?.fullName || c.author?.email || 'Member'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">
                          No comments yet. Start the conversation!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetType="POST"
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
        />
      )}
    </div>
  );
};
