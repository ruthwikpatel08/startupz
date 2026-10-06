import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, clearApiCache } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Post, Startup, Problem } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Avatar } from '../../components/common/Avatar';
import { ProblemCard } from '../../components/problems/ProblemCard';
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
  Globe,
  Flame,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const StartupFeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activePillar, setActivePillar] = useState<'ACHIEVEMENTS' | 'IDEAS' | 'PROBLEMS'>('ACHIEVEMENTS');
  const [posts, setPosts] = useState<Post[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // Strict classification sets: Ideas and Achievements NEVER mix
  const IDEA_POST_TYPES = new Set(['IDEA', 'COFOUNDER', 'ADVICE', 'HIRING']);
  const ACHIEVEMENT_POST_TYPES = new Set(['EXPERIENCE', 'LAUNCH', 'FUNDING', 'MILESTONE', 'ACHIEVEMENT']);

  // Post composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState('EXPERIENCE');
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

  const handlePillarChange = (pillar: 'ACHIEVEMENTS' | 'IDEAS' | 'PROBLEMS') => {
    setActivePillar(pillar);
    setFilterType('ALL');
    if (pillar === 'ACHIEVEMENTS') {
      setPostType('EXPERIENCE');
    } else if (pillar === 'IDEAS') {
      setPostType('IDEA');
    }
  };

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.getPosts();
      if (res?.posts && res.posts.length > 0) {
        setPosts(res.posts);
      } else {
        // Fallback: direct Supabase select if backend is empty
        const { data: supaPosts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && supaPosts && supaPosts.length > 0) {
          const authorIds = [...new Set(supaPosts.map((p) => p.author_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', authorIds);
          const profMap = new Map((profiles || []).map((pr) => [pr.user_id, pr]));

          const formatted = supaPosts.map((p) => {
            const pr = profMap.get(p.author_id);
            return {
              id: p.id,
              authorId: p.author_id,
              postType: p.post_type,
              title: p.title,
              content: p.content,
              links: p.links,
              images: p.images,
              likesCount: p.likes_count || 0,
              commentsCount: p.comments_count || 0,
              createdAt: p.created_at,
              isLiked: false,
              isSaved: false,
              author: {
                id: p.author_id,
                email: '',
                role: pr?.preferred_role || 'STUDENT',
                isVerified: false,
                isSuspended: false,
                isAdmin: false,
                createdAt: p.created_at || new Date().toISOString(),
                profile: pr
                  ? {
                      fullName: pr.full_name,
                      avatar: pr.avatar,
                      headline: pr.headline,
                      location: pr.location,
                    }
                  : null,
              },
            };
          });
          setPosts(formatted as any);
        } else if (res?.posts) {
          setPosts(res.posts);
        }
      }
    } catch (err) {
      console.error('Failed to load feed posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (activePillar === 'PROBLEMS' && problems.length === 0) {
      const fetchProblems = async () => {
        setProblemsLoading(true);
        try {
          const res = await api.getProblems();
          setProblems(res.problems || []);
        } catch (err) {
          console.error('Failed to load problems:', err);
        } finally {
          setProblemsLoading(false);
        }
      };
      fetchProblems();
    }
  }, [activePillar, problems.length]);

  const filteredPosts = posts.filter((p) => {
    const rawType = (p.postType || 'UPDATE').toUpperCase();

    if (activePillar === 'ACHIEVEMENTS') {
      // 1. STRICT: Exclude ALL ideas/cofounder/advice/hiring
      if (IDEA_POST_TYPES.has(rawType)) {
        return false;
      }
      if (filterType !== 'ALL') {
        return rawType === filterType;
      }
      return (
        ACHIEVEMENT_POST_TYPES.has(rawType) ||
        rawType === 'UPDATE'
      );
    }

    if (activePillar === 'IDEAS') {
      // 1. STRICT: Exclude ALL achievements/experiences/launches/funding
      if (ACHIEVEMENT_POST_TYPES.has(rawType)) {
        return false;
      }
      if (filterType !== 'ALL') {
        return rawType === filterType;
      }
      return (
        IDEA_POST_TYPES.has(rawType) ||
        rawType === 'UPDATE'
      );
    }

    return true;
  });

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

    const finalPostType = activePillar === 'IDEAS'
      ? (IDEA_POST_TYPES.has(postType) ? postType : 'IDEA')
      : (ACHIEVEMENT_POST_TYPES.has(postType) || postType === 'UPDATE' ? postType : 'EXPERIENCE');

    setSubmittingPost(true);
    setComposerError(null);
    try {
      let createdPost: any = null;

      // 1. Primary: Server API
      try {
        const res = await api.createPost({
          postType: finalPostType,
          title: postTitle.trim() || undefined,
          content: postContent.trim(),
          links: postLinks.trim() || undefined,
        });
        createdPost = res?.post || res;
      } catch (apiErr) {
        console.warn('Backend API createPost failed, attempting direct Supabase insert:', apiErr);
      }

      // 2. Direct Supabase insert fallback if backend API failed
      if (!createdPost || !createdPost.id) {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            post_type: finalPostType,
            title: postTitle.trim() || null,
            content: postContent.trim(),
            links: postLinks.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;
        createdPost = {
          id: data.id,
          authorId: user.id,
          postType: data.post_type || finalPostType,
          title: data.title,
          content: data.content,
          links: data.links,
          createdAt: data.created_at || new Date().toISOString(),
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isSaved: false,
          author: {
            id: user.id,
            email: user.email,
            role: user.role || 'STUDENT',
            isVerified: user.isVerified,
            verificationBadge: user.verificationBadge,
            profile: {
              fullName: user.profile?.fullName || user.email.split('@')[0],
              avatar: user.profile?.avatar || null,
              headline: user.profile?.headline || '',
              location: user.profile?.location || '',
            },
          },
        };
      }

      // Ensure author object is populated
      if (createdPost && !createdPost.author) {
        createdPost.author = {
          id: user.id,
          email: user.email,
          role: user.role || 'STUDENT',
          profile: user.profile,
        };
      }

      if (createdPost) {
        setPosts((prev) => [createdPost, ...prev]);
        clearApiCache();
      }

      setPostTitle('');
      setPostContent('');
      setPostLinks('');
      setComposerOpen(false);
      setSuccessToast('Post published successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Create post failed:', err);
      const msg = err.message || 'Failed to publish post.';
      setComposerError(msg);
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 4000);
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

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      try {
        await api.deletePost(postId);
      } catch (apiErr) {
        // Fallback: direct Supabase delete
        await supabase.from('posts').delete().eq('id', postId);
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete post.');
    }
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!window.confirm('Are you sure you want to delete this startup idea?')) return;
    try {
      await api.deleteProblem(problemId);
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete idea.');
    }
  };

  const achievementFilters = [
    { id: 'ALL', label: 'All Achievements' },
    { id: 'EXPERIENCE', label: '📖 Experiences' },
    { id: 'LAUNCH', label: '🎉 Launches' },
    { id: 'FUNDING', label: '💰 Funding' },
    { id: 'UPDATE', label: '🏆 Milestones' },
  ];

  const ideaFilters = [
    { id: 'ALL', label: 'All Ideas' },
    { id: 'IDEA', label: '💡 Ideas' },
    { id: 'COFOUNDER', label: '🤝 Co-Founders' },
    { id: 'ADVICE', label: '💬 Advice' },
    { id: 'HIRING', label: '💼 Hiring' },
  ];

  const achievementComposerTypes = [
    { id: 'EXPERIENCE', label: '📖 Experience' },
    { id: 'LAUNCH', label: '🎉 Product Launch' },
    { id: 'FUNDING', label: '💰 Funding Round' },
    { id: 'UPDATE', label: '🏆 Milestone' },
  ];

  const ideaComposerTypes = [
    { id: 'IDEA', label: '💡 Idea' },
    { id: 'COFOUNDER', label: '🤝 Co-Founder' },
    { id: 'ADVICE', label: '💬 Advice' },
    { id: 'HIRING', label: '💼 Hiring Talent' },
  ];

  const postTypes = [
    { key: 'ALL', label: 'All Updates' },
    { key: 'IDEA', label: '💡 Ideas' },
    { key: 'EXPERIENCE', label: '📖 Experiences' },
    { key: 'UPDATE', label: '🚀 Updates' },
    { key: 'LAUNCH', label: '🎉 Launches' },
    { key: 'COFOUNDER', label: '🤝 Co-Founder' },
    { key: 'HIRING', label: '💼 Hiring' },
    { key: 'FUNDING', label: '💰 Funding' },
    { key: 'ADVICE', label: '💬 Advice' },
  ];

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'IDEA':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'EXPERIENCE':
        return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800';
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
      {/* Toast notifications */}
      {successToast && (
        <div className="fixed top-18 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-modal text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="fixed top-18 right-6 z-50 p-4 rounded-xl bg-rose-600 text-white shadow-modal text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 max-w-md">
          <AlertCircle size={16} />
          <span>{errorToast}</span>
        </div>
      )}

      {/* 3 Core Pillars Header (Fixed on mobile view, no sliding) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
        {/* 1. Achievements */}
        <button
          type="button"
          onClick={() => handlePillarChange('ACHIEVEMENTS')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activePillar === 'ACHIEVEMENTS'
              ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Award size={16} className="text-amber-500 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            Achievements
          </span>
          {activePillar === 'ACHIEVEMENTS' && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 hidden sm:block" />
          )}
        </button>

        {/* 2. Ideas */}
        <button
          type="button"
          onClick={() => handlePillarChange('IDEAS')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activePillar === 'IDEAS'
              ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Rocket size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            Ideas
          </span>
          {activePillar === 'IDEAS' && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 hidden sm:block" />
          )}
        </button>

        {/* 3. Problem Statements */}
        <button
          type="button"
          onClick={() => handlePillarChange('PROBLEMS')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activePillar === 'PROBLEMS'
              ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Globe size={16} className="text-blue-500 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            <span className="sm:hidden">Problems</span>
            <span className="hidden sm:inline">Problem Statements</span>
          </span>
          {activePillar === 'PROBLEMS' && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 hidden sm:block" />
          )}
        </button>
      </div>

      {/* Active Category Header Banner (Displays category caption on the page at top) */}
      <div className="card-base p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-white dark:from-dark-900 dark:via-dark-900 dark:to-dark-850 border border-slate-200/80 dark:border-dark-800 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          {activePillar === 'ACHIEVEMENTS' && <Award size={18} className="text-amber-500 shrink-0" />}
          {activePillar === 'IDEAS' && <Rocket size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />}
          {activePillar === 'PROBLEMS' && <Globe size={18} className="text-blue-500 shrink-0" />}
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {activePillar === 'ACHIEVEMENTS' && 'Achievements'}
            {activePillar === 'IDEAS' && 'Startup Ideas'}
            {activePillar === 'PROBLEMS' && 'Real-World Problem Statements'}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {activePillar === 'ACHIEVEMENTS' && 'See what others achieved across product launches, funding rounds, milestones, and work experiences.'}
          {activePillar === 'IDEAS' && 'Work on their ideas to build — discover concepts, pitch synergies, or find dedicated co-founders.'}
          {activePillar === 'PROBLEMS' && 'Work on real-world problems and Sustainable Development Goals to build high-impact global solutions.'}
        </p>
      </div>

      {/* Post Composer Card */}
      {user && (
        <div className="card-base p-4 sm:p-5 transition-colors">
          <div className="flex items-center gap-3">
            <Avatar
              src={user.profile?.avatar}
              name={user.profile?.fullName || user.email}
              size="md"
              className="!w-9 !h-9"
            />
            <button
              onClick={() => setComposerOpen(!composerOpen)}
              className="flex-1 text-left px-3.5 py-2 rounded-md bg-slate-50 dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 text-xs font-normal border border-slate-200/80 dark:border-dark-700/80 transition-colors"
            >
              {activePillar === 'ACHIEVEMENTS'
                ? 'Share a work experience, product launch, or milestone achievement...'
                : 'Share a startup idea, early concept, or seek co-founders...'}
            </button>
          </div>

          {composerOpen && (
            <form onSubmit={handleCreatePost} className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-800 space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Post Category:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
                  {(activePillar === 'ACHIEVEMENTS' ? achievementComposerTypes : ideaComposerTypes).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPostType(t.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                        postType === t.id
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder={
                  activePillar === 'ACHIEVEMENTS'
                    ? 'Achievement or experience headline (optional)'
                    : 'Startup idea title or concept name (optional)'
                }
                className="input-base w-full px-3 py-2 text-xs"
              />

              <textarea
                required
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={
                  activePillar === 'ACHIEVEMENTS'
                    ? 'Describe what you achieved, metrics reached, lessons learned, or new product features...'
                    : 'Describe your startup idea, problem it solves, target users, or co-founder criteria...'
                }
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
                  className="btn-secondary px-3 py-1.5 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="btn-primary px-4 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  <span>{submittingPost ? 'Publishing...' : 'Publish'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Sub-Category Filter Chips Bar (Horizontal scrollable option on mobile) */}
      {activePillar !== 'PROBLEMS' && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {(activePillar === 'ACHIEVEMENTS' ? achievementFilters : ideaFilters).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                filterType === item.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-dark-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Feed Stream or Problem Statements View */}
      {activePillar === 'PROBLEMS' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-dark-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe size={15} className="text-blue-500" />
                Real-World Problem Statements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore real challenges from the United Nations, WHO, and the World Bank to build impactful startups.
              </p>
            </div>
            <Link
              to="/problems"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
            >
              <span>Explore all</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {problemsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-lg bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 animate-pulse" />
              ))}
            </div>
          ) : problems.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No Problem Statements Available"
              description="World-wide problem statements will appear here as they are published by the ecosystem."
              actionLabel="Explore Global SDGs"
              onAction={() => navigate('/problems')}
            />
          ) : (
            <div className="space-y-4">
              {problems.map((problem) => (
                <ProblemCard key={problem.id} problem={problem} onDelete={handleDeleteProblem} />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-lg bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={activePillar === 'ACHIEVEMENTS' ? "No achievements published yet" : "No idea posts found"}
          description={
            activePillar === 'ACHIEVEMENTS'
              ? "Be the first to share an achievement, product launch, or funding milestone."
              : "Share an early idea, concept proposal, or seek co-founders to build together."
          }
          actionLabel={activePillar === 'ACHIEVEMENTS' ? "Share Achievement" : "Post an Idea"}
          onAction={() => setComposerOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const author = post.author;
            const authorName = author?.profile?.fullName || author?.email || 'Founder';
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
                      <Avatar
                        src={author?.profile?.avatar}
                        name={authorName}
                        size="md"
                        className="!w-10 !h-10"
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

                  {/* Post Type Badge & Report / Delete Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getPostTypeBadge(
                        post.postType
                      )}`}
                    >
                      {post.postType}
                    </span>

                    {(user?.id === post.authorId || user?.id === author?.id || user?.isAdmin) && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        title="Delete Post"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

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
