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
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {postTypes.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              filterType === tab.key
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post Composer Card */}
      {user && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <img
              src={user.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <button
              onClick={() => setComposerOpen(!composerOpen)}
              className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition-colors"
            >
              Share a startup update, ask for advice, or hire co-founders...
            </button>
          </div>

          {composerOpen && (
            <form onSubmit={handleCreatePost} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Post Type:</span>
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
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      postType === t.id
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              <textarea
                required
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your update, metrics, co-founder criteria, or question..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />

              <div className="flex items-center gap-2">
                <LinkIcon size={14} className="text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={postLinks}
                  onChange={(e) => setPostLinks(e.target.value)}
                  placeholder="External link (e.g. demo URL, announcement blog, deck)"
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {composerError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs">
                  {composerError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm shadow-brand-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-all hover:scale-105"
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
            <div key={n} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No posts in this feed"
          description="Be the first to publish a startup update, hiring notice, or co-founder search."
          actionText="Publish Update"
          onAction={() => setComposerOpen(true)}
        />
      ) : (
        <div className="space-y-6">
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
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all space-y-4"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${author?.id}`}>
                      <img
                        src={authorAvatar}
                        alt={authorName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/profile/${author?.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                        >
                          {authorName}
                        </Link>
                        <VerificationBadge badge={author?.verificationBadge} isVerified={author?.isVerified} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{authorHeadline}</p>
                      <div className="text-[10px] text-slate-400 mt-0.5">
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
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getPostTypeBadge(
                        post.postType
                      )}`}
                    >
                      {post.postType}
                    </span>

                    <button
                      onClick={() => setReportTarget({ id: post.id, title: post.title || post.content.slice(0, 30) })}
                      title="Report Post"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <Flag size={14} />
                    </button>
                  </div>
                </div>

                {/* Post Body */}
                <div className="space-y-2">
                  {post.title && (
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>

                  {post.links && (
                    <div className="pt-2">
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
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-colors ${
                        post.isLiked
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'hover:text-rose-600'
                      }`}
                    >
                      <Heart size={16} className={post.isLiked ? 'fill-rose-600' : ''} />
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
                      className="flex items-center gap-1.5 font-bold hover:text-brand-600 transition-colors"
                    >
                      <MessageSquare size={16} />
                      <span>{post.commentsCount || 0}</span>
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleToggleSave(post.id)}
                      className={`flex items-center gap-1.5 font-bold transition-colors ${
                        post.isSaved
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'hover:text-brand-600'
                      }`}
                    >
                      <Bookmark size={16} className={post.isSaved ? 'fill-brand-600' : ''} />
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
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Check size={14} /> Copied!
                        </span>
                      ) : (
                        <>
                          <Share2 size={15} />
                          <span className="hidden sm:inline">Share</span>
                        </>
                      )}
                    </button>

                    {/* Connect with author */}
                    {user && user.id !== author?.id && (
                      <button
                        onClick={() => setConnectUser(author)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 font-bold transition-colors"
                      >
                        <UserPlus size={14} />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Comments Section */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
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
                          className="flex-1 px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={submittingComment[post.id] || !(commentInputs[post.id] || '').trim()}
                          className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs disabled:opacity-40 hover:bg-brand-500 transition-colors"
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
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">
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
        user={connectUser}
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
