import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, clearApiCache } from '../../services/api';
import { supabase, fetchUserConnections, broadcastEntityDeleted, resolveUserIdToUUID, isUUID } from '../../lib/supabase';
import { Post, Startup, Problem } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Avatar } from '../../components/common/Avatar';
import { PrototypeCard } from '../../components/prototypes/PrototypeCard';
import { CreatePrototypeModal } from '../../components/prototypes/CreatePrototypeModal';
import { SEO } from '../../components/common/SEO';
import { ShareModal, ShareItemData } from '../../components/common/ShareModal';
import {
  Share2,
  Heart,
  ArrowBigUp,
  ArrowBigDown,
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
  Users,
  Boxes,
} from 'lucide-react';

import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';

const LOCAL_POSTS_KEY = 'startupz_user_persisted_posts';

// Clean up any legacy deleted post tombstones so user data is never suppressed
try {
  localStorage.removeItem('startupz_user_deleted_post_ids');
} catch {}

const getLocalPersistedPosts = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalPersistedPost = (newPost: any) => {
  try {
    const current = getLocalPersistedPosts().filter((p) => p.id !== newPost.id);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify([newPost, ...current]));
  } catch {}
};

const markPostDeletedLocally = (postId: string) => {
  try {
    const currentPosts = getLocalPersistedPosts().filter((p) => p.id !== postId);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(currentPosts));
  } catch {}
};

export const StartupFeedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  const tabParam = searchParams.get('pillar') || searchParams.get('tab');
  const [activePillar, setActivePillar] = useState<'ACHIEVEMENTS' | 'IDEAS' | 'PROTOTYPES'>(() => {
    const p = (tabParam || '').toUpperCase();
    if (p === 'IDEAS' || p === 'PROTOTYPES') return p;
    return 'ACHIEVEMENTS';
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [createPrototypeModalOpen, setCreatePrototypeModalOpen] = useState(false);

  // Strict classification sets: Ideas, Executions, and Prototypes NEVER mix
  const IDEA_POST_TYPES = new Set(['IDEA', 'COFOUNDER', 'ADVICE', 'HIRING']);
  const ACHIEVEMENT_POST_TYPES = new Set([
    'EXECUTION',
    'ACHIEVEMENT',
    'DRAWBACK',
    'DRAWBACKS',
    'LAUNCH',
    'EXPERIENCE',
    'FUNDING',
    'MILESTONE',
  ]);

  // Post composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState('EXECUTION');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLinks, setPostLinks] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  // Comments state: map of postId -> boolean (expanded) and comment inputs
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [expandedPostContent, setExpandedPostContent] = useState<Record<string, boolean>>({});

  // Modals
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; title: string } | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [shareModalItem, setShareModalItem] = useState<ShareItemData | null>(null);
  const [postVisibility, setPostVisibility] = useState<'PUBLIC' | 'CONNECTIONS'>('PUBLIC');

  // Connection tracking to ensure connect button is hidden once connected
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      setConnectedUserIds(new Set());
      return;
    }
    const loadConnections = async () => {
      try {
        const data = await fetchUserConnections(user.id);
        setConnectedUserIds(data.connectedIds);
      } catch {}
    };
    loadConnections();
    const handleUpdate = () => loadConnections();
    window.addEventListener('connections_updated', handleUpdate);
    return () => window.removeEventListener('connections_updated', handleUpdate);
  }, [user?.id]);

  // Reddit/Hacker News style idea post votes tracking: postId -> 'up' | 'down' | null
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    try {
      const storageKey = user?.id ? `startupz_idea_votes_${user.id}` : 'startupz_idea_votes_guest';
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setUserVotes(JSON.parse(raw));
      } else {
        setUserVotes({});
      }
    } catch {
      setUserVotes({});
    }
  }, [user?.id]);

  const handlePillarChange = (pillar: 'ACHIEVEMENTS' | 'IDEAS' | 'PROTOTYPES') => {
    setActivePillar(pillar);
    setFilterType('ALL');
    const newParams = new URLSearchParams(searchParams);
    newParams.set('pillar', pillar);
    navigate({ search: newParams.toString() }, { replace: true });
    if (pillar === 'ACHIEVEMENTS') {
      setPostType('EXECUTION');
    } else if (pillar === 'IDEAS') {
      setPostType('IDEA');
    } else if (pillar === 'PROTOTYPES') {
      setPostType('PROTOTYPE');
    }
  };


  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let savedPostIds = new Set<string>();
      try {
        const rawSaved = localStorage.getItem('startupz_saved_items');
        if (rawSaved) {
          const parsedSaved: any[] = JSON.parse(rawSaved);
          if (Array.isArray(parsedSaved)) {
            parsedSaved.filter((s) => s.itemType === 'POST').forEach((s) => savedPostIds.add(s.itemId));
          }
        }
      } catch {}

      let userLikedIds = new Set<string>();
      let userVoteMap: Record<string, 'up' | 'down' | null> = {};
      if (user?.id) {
        try {
          const { data: supaLikes } = await supabase
            .from('likes')
            .select('post_id, vote_type')
            .eq('user_id', user.id);
          (supaLikes || []).forEach((l: any) => {
            const vType = (l.vote_type || 'UP').toUpperCase();
            if (vType === 'DOWN') {
              userVoteMap[l.post_id] = 'down';
            } else {
              userVoteMap[l.post_id] = 'up';
              userLikedIds.add(l.post_id);
            }
          });
        } catch {}
      }

      let loadedList: any[] = [];
      try {
        const res = await api.getPosts();
        if (res?.posts && Array.isArray(res.posts) && res.posts.length > 0) {
          loadedList = res.posts.map((p: any) => {
            const isLiked = p.isLiked ?? userLikedIds.has(p.id);
            const uVote = p.userVote || userVoteMap[p.id] || (isLiked ? 'up' : null);
            if (uVote) {
              userVoteMap[p.id] = uVote;
            }

            return {
              ...p,
              likesCount: p.likesCount ?? 0,
              commentsCount: p.commentsCount ?? 0,
              isLiked: Boolean(isLiked),
              isSaved: savedPostIds.has(p.id) || p.isSaved || false,
            };
          });
        }
      } catch (apiErr) {
        console.warn('Backend API getPosts failed, attempting direct Supabase query:', apiErr);
      }

      // Direct Supabase select fallback if backend API is offline, sleeping, or empty
      if (loadedList.length === 0) {
        const { data: supaPosts, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && supaPosts && supaPosts.length > 0) {
          const authorIds = [...new Set(supaPosts.map((p) => p.author_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', authorIds);
          const profMap = new Map((profiles || []).map((pr) => [pr.user_id, pr]));

          loadedList = supaPosts.map((p) => {
            const pr = profMap.get(p.author_id);
            const isLiked = userLikedIds.has(p.id);
            const uVote = userVoteMap[p.id] || (isLiked ? 'up' : null);
            if (uVote) {
              userVoteMap[p.id] = uVote;
            }

            return {
              id: p.id,
              authorId: p.author_id,
              postType: p.post_type,
              title: p.title,
              content: p.content,
              problem: p.problem || null,
              solution: p.solution || null,
              websiteUrl: p.website_url || p.links || null,
              mediaUrl: p.media_url || p.images || null,
              mediaType: p.media_type || null,
              links: p.links,
              images: p.images,
              likesCount: p.likes_count || 0,
              commentsCount: p.comments_count || 0,
              createdAt: p.created_at,
              isLiked,
              isSaved: savedPostIds.has(p.id),
              author: {
                id: p.author_id,
                email: (user?.id && String(p.author_id).toLowerCase() === String(user.id).toLowerCase()) ? (user.email || '') : (pr?.email || ''),
                role: pr?.preferred_role || ((user?.id && String(p.author_id).toLowerCase() === String(user.id).toLowerCase()) ? (user.role || 'STUDENT') : 'STUDENT'),
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
                      username: pr.username,
                    }
                  : ((user?.id && String(p.author_id).toLowerCase() === String(user.id).toLowerCase()) ? user.profile : null),
              },
            };
          });
        }
      }

      // Merge local drafts that are not yet returned by backend/Supabase
      const localPersisted = getLocalPersistedPosts();
      const loadedIds = new Set(loadedList.map((p) => p.id));
      const missingLocal = localPersisted.filter((lp) => !loadedIds.has(lp.id));
      const finalPosts = [...missingLocal, ...loadedList];

      setPosts(finalPosts);
      setUserVotes((prev) => ({ ...prev, ...userVoteMap }));
    } catch (err) {
      console.error('Failed to load feed posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user?.id]);

  // Handle direct redirection to a shared post (?postId=xyz or #post-xyz)
  useEffect(() => {
    const rawTarget =
      searchParams.get('postId') ||
      (location.hash.startsWith('#post-') ? location.hash.replace('#post-', '') : null);
    if (!rawTarget) return;

    if (posts.length > 0) {
      const targetPost = posts.find((p) => p.id === rawTarget);
      if (targetPost) {
        const rawType = (targetPost.postType || 'UPDATE').toUpperCase();
        if (rawType === 'PROTOTYPE' || targetPost.content?.startsWith('{"isPrototype"')) {
          setActivePillar('PROTOTYPES');
        } else if (IDEA_POST_TYPES.has(rawType)) {
          setActivePillar('IDEAS');
        } else {
          setActivePillar('ACHIEVEMENTS');
        }
        setFilterType('ALL');
      }


      const scrollToTarget = () => {
        const el = document.getElementById(`post-${rawTarget}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedPostId(rawTarget);
          setTimeout(() => setHighlightedPostId(null), 4500);
          return true;
        }
        return false;
      };

      if (!scrollToTarget()) {
        const t1 = setTimeout(scrollToTarget, 150);
        const t2 = setTimeout(scrollToTarget, 500);
        const t3 = setTimeout(scrollToTarget, 1200);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }
    }
  }, [posts, location.hash, searchParams]);

  const isMyPost = (p: any): boolean => {
    if (!user || !p) return false;

    const currentId = user.id ? String(user.id).trim().toLowerCase() : '';
    const userIds = new Set<string>();
    if (currentId) userIds.add(currentId);
    if (user.profile?.id) userIds.add(String(user.profile.id).trim().toLowerCase());
    if (user.profile?.userId) userIds.add(String(user.profile.userId).trim().toLowerCase());
    if ((user as any)._id) userIds.add(String((user as any)._id).trim().toLowerCase());

    // 1. Direct device persisted post check (guarantees immediate match for posts uploaded by THIS user on this device)
    try {
      const persisted = getLocalPersistedPosts();
      const match = persisted.find((lp: any) => lp.id === p.id);
      if (match) {
        const lpAuthorId = String(match.authorId || match.author_id || match.author?.id || '').trim().toLowerCase();
        if (lpAuthorId && (lpAuthorId === currentId || userIds.has(lpAuthorId))) {
          return true;
        }
      }
    } catch {}

    // 2. Cached backend synced user ID from localStorage
    try {
      const rawSynced = localStorage.getItem('startupz_last_synced');
      if (rawSynced) {
        const parsed = JSON.parse(rawSynced);
        if (parsed?.id) userIds.add(String(parsed.id).trim().toLowerCase());
      }
      const rawUser = localStorage.getItem('startupz_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id) userIds.add(String(parsed.id).trim().toLowerCase());
      }
    } catch {}

    // 3. Well-known test aliases
    const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08', 'ruthwik'];
    const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

    const pAuthorId = String(
      p.authorId ||
      p.author_id ||
      p.author?.id ||
      p.author?.userId ||
      (p as any).creatorId ||
      ''
    ).trim().toLowerCase();

    if (pAuthorId) {
      if (userIds.has(pAuthorId)) return true;
      if (ruthwikIds.includes(pAuthorId) && Array.from(userIds).some((id) => ruthwikIds.includes(id))) return true;
      if (gokulIds.includes(pAuthorId) && Array.from(userIds).some((id) => gokulIds.includes(id))) return true;
    }

    // 4. Email match
    const myEmail = String(user.email || '').trim().toLowerCase();
    const pEmail = String(
      p.author?.email ||
      (p as any).authorEmail ||
      (p as any).author_email ||
      ''
    ).trim().toLowerCase();
    if (myEmail && pEmail && myEmail === pEmail) {
      return true;
    }

    // 5. Username match
    const myUsername = String(user.profile?.username || (user.email ? user.email.split('@')[0] : '')).trim().toLowerCase();
    const pUsername = String(p.author?.profile?.username || p.author?.username || '').trim().toLowerCase();
    if (myUsername && pUsername && myUsername === pUsername) {
      return true;
    }

    return false;
  };

  const isPrototypePost = (p: any): boolean => {
    const rawType = (p.postType || (p as any).post_type || 'UPDATE').toUpperCase();
    return (
      rawType === 'PROTOTYPE' ||
      p.postType === 'PROTOTYPE' ||
      (p as any).post_type === 'PROTOTYPE' ||
      (typeof p.content === 'string' && (p.content.startsWith('{"isPrototype"') || p.content.includes('"isPrototype":true')))
    );
  };

  const sendPostNotification = async (
    targetPost: any,
    type: 'POST_LIKE' | 'POST_COMMENT' | 'POST_DOWNVOTE',
    title: string,
    message: string
  ) => {
    if (!user) return;
    const authorId = targetPost?.authorId || targetPost?.author?.id || (targetPost as any)?.author_id;
    if (!authorId || isMyPost(targetPost)) return;

    try {
      const authorUuid = isUUID(authorId) ? authorId : await resolveUserIdToUUID(authorId);
      const senderUuid = isUUID(user.id) ? user.id : await resolveUserIdToUUID(user.id);
      if (!authorUuid || authorUuid === senderUuid) return;

      const notifLink = `/feed?pillar=${activePillar}&postId=${targetPost.id}#post-${targetPost.id}`;

      if (type === 'POST_DOWNVOTE') {
        await supabase
          .from('notifications')
          .delete()
          .match({ user_id: authorUuid, sender_id: senderUuid || user.id })
          .in('type', ['POST_LIKE', 'POST_UPVOTE']);
      } else if (type === 'POST_LIKE') {
        await supabase
          .from('notifications')
          .delete()
          .match({ user_id: authorUuid, sender_id: senderUuid || user.id, type: 'POST_DOWNVOTE' });
      }

      await supabase.from('notifications').insert({
        user_id: authorUuid,
        sender_id: senderUuid || user.id,
        type,
        title,
        message,
        link: notifLink,
        is_read: false,
      });

      window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
    } catch (err) {
      console.warn('sendPostNotification warning:', err);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const rawType = (p.postType || (p as any).post_type || 'UPDATE').toUpperCase();
    const isMine = isMyPost(p);

    // If post is marked for connections only, ensure only author or connections can see it
    const isConnectionsOnly = (p as any).visibility === 'CONNECTIONS' || p.title?.includes('[Connections Only]');
    if (isConnectionsOnly) {
      const pAuthorId = p.authorId || p.author?.id || (p as any).author_id;
      const isConnection = pAuthorId && connectedUserIds.has(pAuthorId);
      if (!isMine && !isConnection) return false;
    }

    const isProtoPost = isPrototypePost(p);

    if (activePillar === 'ACHIEVEMENTS') {
      if (isProtoPost) return false;
      // Exclude ALL ideas/cofounder/advice/hiring
      if (IDEA_POST_TYPES.has(rawType)) {
        return false;
      }
      if (filterType === 'MY_SHARES' || filterType === 'MY_ACHIEVEMENTS') {
        return isMine;
      }
      if (filterType === 'EXECUTION' || filterType === 'ACHIEVEMENT') {
        return rawType === 'EXECUTION' || rawType === 'ACHIEVEMENT';
      }
      if (filterType === 'DRAWBACK' || filterType === 'DRAWBACKS') {
        return rawType === 'DRAWBACK' || rawType === 'DRAWBACKS';
      }
      if (filterType === 'LAUNCH') {
        return rawType === 'LAUNCH';
      }
      if (filterType === 'EXPERIENCE') {
        return rawType === 'EXPERIENCE';
      }
      if (filterType !== 'ALL') {
        return rawType === filterType;
      }
      return (
        ACHIEVEMENT_POST_TYPES.has(rawType) ||
        rawType === 'UPDATE' ||
        !IDEA_POST_TYPES.has(rawType)
      );
    }

    if (activePillar === 'IDEAS') {
      if (isProtoPost) return false;
      // Exclude ALL achievements/experiences/launches/funding
      if (ACHIEVEMENT_POST_TYPES.has(rawType)) {
        return false;
      }
      if (filterType === 'MY_IDEAS') {
        return isMine;
      }
      if (filterType !== 'ALL') {
        return rawType === filterType;
      }
      return (
        IDEA_POST_TYPES.has(rawType) ||
        rawType === 'UPDATE'
      );
    }

    if (activePillar === 'PROTOTYPES') {
      if (!isProtoPost) return false;

      if (filterType === 'MY_PROTOTYPES') {
        return isMine;
      }
      if (filterType === 'WEBSITES') {
        return Boolean(p.websiteUrl || (p as any).website_url || p.links || (typeof p.content === 'string' && p.content.includes('"websiteUrl"')));
      }
      if (filterType === 'VIDEOS') {
        return (
          p.mediaType === 'video' ||
          (p as any).media_type === 'video' ||
          (typeof p.content === 'string' && p.content.includes('"mediaType":"video"')) ||
          (typeof p.images === 'string' && (p.images.endsWith('.mp4') || p.images.endsWith('.webm') || p.images.endsWith('.mov')))
        );
      }
      return true;
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
      : (ACHIEVEMENT_POST_TYPES.has(postType) || postType === 'UPDATE' ? postType : 'EXECUTION');

    setSubmittingPost(true);
    setComposerError(null);
    try {
      let createdPost: any = null;

      // 1. Primary: Server API
      try {
        const postTitleFormatted = postVisibility === 'CONNECTIONS'
          ? (postTitle.trim() ? `[Connections Only] ${postTitle.trim()}` : '[Connections Only]')
          : (postTitle.trim() || undefined);

        const res = await api.createPost({
          postType: finalPostType,
          title: postTitleFormatted,
          content: postContent.trim(),
          links: postLinks.trim() || undefined,
          visibility: postVisibility,
        } as any);
        createdPost = res?.post || res;
      } catch (apiErr) {
        console.warn('Backend API createPost failed, attempting direct Supabase insert:', apiErr);
      }

      // 2. Direct Supabase insert fallback if backend API failed
      if (!createdPost || !createdPost.id) {
        const postTitleFormatted = postVisibility === 'CONNECTIONS'
          ? (postTitle.trim() ? `[Connections Only] ${postTitle.trim()}` : '[Connections Only]')
          : (postTitle.trim() || null);

        const { data, error } = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            post_type: finalPostType,
            title: postTitleFormatted,
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
          visibility: postVisibility,
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
      if (createdPost) {
        createdPost.authorId = user.id;
        createdPost.author_id = user.id;
        if (!createdPost.author) {
          createdPost.author = {
            id: user.id,
            email: user.email,
            role: user.role || 'STUDENT',
            profile: user.profile,
          };
        } else {
          createdPost.author.id = user.id;
          if (!createdPost.author.email) createdPost.author.email = user.email;
          if (!createdPost.author.profile) createdPost.author.profile = user.profile;
        }
      }

      if (createdPost) {
        saveLocalPersistedPost(createdPost);
        setPosts((prev) => [createdPost, ...prev.filter((p) => p.id !== createdPost.id)]);
        clearApiCache();
      }

      setPostTitle('');
      setPostContent('');
      setPostLinks('');
      setPostVisibility('PUBLIC');
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
    const currentPost = posts.find((p) => p.id === postId);
    const currentlyLiked = !!currentPost?.isLiked;
    const nextLiked = !currentlyLiked;
    const nextLikesCount = Math.max(0, (currentPost?.likesCount || 0) + (nextLiked ? 1 : -1));

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: nextLiked, likesCount: nextLikesCount }
          : p
      )
    );

    try {
      const res = await api.likePost(postId).catch(() => null);
      if (res && res.liked !== undefined) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLiked: res.liked, likesCount: res.likesCount }
              : p
          )
        );
      }
    } catch {}

    // Permanently sync with Supabase and send notifications
    try {
      if (nextLiked) {
        await supabase.from('likes').upsert({ post_id: postId, user_id: user.id, vote_type: 'UP' }, { onConflict: 'user_id,post_id' });
        await supabase.from('posts').update({ likes_count: nextLikesCount }).eq('id', postId);

        // Notify author if someone else liked their post
        if (currentPost) {
          const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
          sendPostNotification(
            currentPost,
            'POST_LIKE',
            'Liked your post ❤️',
            `${myName} liked your post.`
          );
        }
      } else {
        await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id });
        await supabase.from('posts').update({ likes_count: nextLikesCount }).eq('id', postId);
      }
    } catch (sErr) {
      console.warn('Supabase like sync notice:', sErr);
    }
  };

  const handleVotePost = async (postId: string, clickedVote: 'up' | 'down') => {
    if (!user) {
      navigate('/login');
      return;
    }

    const currentPost = posts.find((p) => p.id === postId);
    if (!currentPost) return;

    const currentVote = userVotes[postId] !== undefined
      ? userVotes[postId]
      : (currentPost.isLiked ? 'up' : null);

    let nextVote: 'up' | 'down' | null = null;
    let delta = 0;

    if (currentVote === clickedVote) {
      // Toggle off: remove vote (return to 0 change from base)
      nextVote = null;
      delta = clickedVote === 'up' ? -1 : 1;
    } else if (currentVote === 'up' && clickedVote === 'down') {
      // Transition from upvoted to downvoted: -2 net transition
      nextVote = 'down';
      delta = -2;
    } else if (currentVote === 'down' && clickedVote === 'up') {
      // Transition from downvoted to upvoted: +2 net transition
      nextVote = 'up';
      delta = 2;
    } else {
      // Transition from unselected to clicked vote: +1 or -1
      nextVote = clickedVote;
      delta = clickedVote === 'up' ? 1 : -1;
    }

    const nextScore = (currentPost.likesCount || 0) + delta;

    // 1. Optimistic UI update
    setUserVotes((prev) => ({ ...prev, [postId]: nextVote }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likesCount: nextScore,
              isLiked: nextVote === 'up',
            }
          : p
      )
    );

    // 2. Persist to localStorage
    try {
      const storageKey = user?.id ? `startupz_idea_votes_${user.id}` : 'startupz_idea_votes_guest';
      const raw = localStorage.getItem(storageKey);
      const existing = raw ? JSON.parse(raw) : {};
      if (nextVote) {
        existing[postId] = nextVote;
      } else {
        delete existing[postId];
      }
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch {}

    // 3. Sync to backend API
    try {
      await api.votePost(postId, { vote: nextVote, previousVote: currentVote });
    } catch {
      if (nextVote === 'up' && !currentPost.isLiked) {
        await api.likePost(postId).catch(() => null);
      } else if (nextVote !== 'up' && currentPost.isLiked) {
        await api.likePost(postId).catch(() => null);
      }
    }

    // 4. Supabase sync & notification if author is another user
    try {
      if (nextVote === 'up') {
        await supabase.from('likes').upsert({ post_id: postId, user_id: user.id, vote_type: 'UP' }, { onConflict: 'user_id,post_id' });
        await supabase.from('posts').update({ likes_count: nextScore }).eq('id', postId);

        if (currentPost) {
          const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
          sendPostNotification(
            currentPost,
            'POST_LIKE',
            'Upvoted your idea 💡',
            `${myName} upvoted your idea.`
          );
        }
      } else if (nextVote === 'down') {
        await supabase.from('likes').upsert({ post_id: postId, user_id: user.id, vote_type: 'DOWN' }, { onConflict: 'user_id,post_id' });
        await supabase.from('posts').update({ likes_count: nextScore }).eq('id', postId);

        if (currentPost) {
          const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
          sendPostNotification(
            currentPost,
            'POST_DOWNVOTE',
            'Downvoted your idea 👎',
            `${myName} downvoted your idea.`
          );
        }
      } else {
        // Vote removed: erase vote notification
        await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id });
        await supabase.from('posts').update({ likes_count: nextScore }).eq('id', postId);

        const targetAuthId = currentPost.authorId || currentPost.author?.id || (currentPost as any)?.author_id;
        if (targetAuthId && !isMyPost(currentPost)) {
          try {
            const authorUuid = isUUID(targetAuthId) ? targetAuthId : await resolveUserIdToUUID(targetAuthId);
            const senderUuid = isUUID(user.id) ? user.id : await resolveUserIdToUUID(user.id);
            if (authorUuid) {
              await supabase.from('notifications')
                .delete()
                .match({ user_id: authorUuid, sender_id: senderUuid || user.id })
                .in('type', ['POST_LIKE', 'POST_UPVOTE', 'POST_DOWNVOTE']);
              window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
            }
          } catch {}
        }
      }
    } catch (sErr) {
      console.warn('Supabase vote sync notice:', sErr);
    }
  };

  const handleToggleComments = async (postId: string) => {
    const willOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: willOpen,
    }));

    if (willOpen) {
      const targetPost = posts.find((p) => p.id === postId);
      if (!targetPost?.comments || targetPost.comments.length === 0) {
        try {
          const res = await api.getPostComments(postId).catch(() => null);
          if (res?.comments) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId ? { ...p, comments: res.comments } : p
              )
            );
            return;
          }
        } catch {}

        try {
          const { data: supaComments } = await supabase
            .from('comments')
            .select('id, content, created_at, author_id, profiles:author_id(full_name, avatar)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

          if (supaComments) {
            const formatted: any = supaComments.map((sc: any) => ({
              id: sc.id,
              postId,
              authorId: sc.author_id,
              content: sc.content,
              createdAt: sc.created_at,
              author: {
                id: sc.author_id,
                email: '',
                role: 'STUDENT',
                profile: {
                  fullName: sc.profiles?.full_name || 'Member',
                  avatar: sc.profiles?.avatar || null,
                },
              },
            }));
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId ? { ...p, comments: formatted } : p
              )
            );
          }
        } catch (sErr) {
          console.warn('Supabase comments fetch error:', sErr);
        }
      }
    }
  };

  const handleToggleSave = async (postId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const targetPost = posts.find((p) => p.id === postId);
    try {
      const res = await api.toggleSave('POST', postId);
      const isSaved = res.saved !== undefined ? res.saved : !targetPost?.isSaved;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isSaved } : p
        )
      );

      // Mirror to local storage saved items cache
      try {
        const rawLocal = localStorage.getItem('startupz_saved_items');
        let localList: any[] = rawLocal ? JSON.parse(rawLocal) : [];
        if (isSaved) {
          if (!localList.some((li) => li.itemType === 'POST' && li.itemId === postId)) {
            localList.push({
              id: `saved-${Date.now()}`,
              itemType: 'POST',
              itemId: postId,
              savedAt: new Date().toISOString(),
              data: targetPost || { id: postId, title: 'Saved Post' },
              details: targetPost || { id: postId, title: 'Saved Post' },
            });
          }
        } else {
          localList = localList.filter((li) => !(li.itemType === 'POST' && li.itemId === postId));
        }
        localStorage.setItem('startupz_saved_items', JSON.stringify(localList));
      } catch {}
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

    const tempCommentId = `c-temp-${Date.now()}`;
    const optimisticComment: any = {
      id: tempCommentId,
      postId,
      authorId: user.id,
      content: text,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        email: user.email,
        role: user.role || 'STUDENT',
        profile: {
          fullName: user.profile?.fullName || user.email?.split('@')[0] || 'You',
          avatar: user.profile?.avatar || null,
        },
      },
    };

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    // Optimistically update comments and commentsCount
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const comments = p.comments || [];
          return {
            ...p,
            commentsCount: (p.commentsCount || 0) + 1,
            comments: [...comments, optimisticComment],
          };
        }
        return p;
      })
    );

    // 1. Post to API
    let apiSuccess = false;
    try {
      const res = await api.addComment(postId, text);
      if (res?.comment) {
        apiSuccess = true;
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              const comments = (p.comments || []).map((c: any) =>
                c.id === tempCommentId ? res.comment : c
              );
              return {
                ...p,
                comments,
              };
            }
            return p;
          })
        );
      }
    } catch {}

    // 2. Direct Supabase insert fallback only if backend API failed
    try {
      const targetPost = posts.find((p) => p.id === postId);
      const nextCommentsCount = (targetPost?.commentsCount || 0) + 1;

      if (!apiSuccess) {
        await supabase
          .from('comments')
          .insert({
            post_id: postId,
            author_id: user.id,
            content: text,
          });

        await supabase.from('posts').update({ comments_count: nextCommentsCount }).eq('id', postId);
      }

      if (targetPost) {
        const myName = user.profile?.fullName || user.email?.split('@')[0] || 'Someone';
        sendPostNotification(
          targetPost,
          'POST_COMMENT',
          'New Comment on your post 💬',
          `${myName} commented: "${text.slice(0, 50)}..."`
        );
      }
    } catch (sErr) {
      console.warn('Supabase comment sync notice:', sErr);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSharePost = (targetPost: any) => {
    const rawTitle = targetPost.title ? targetPost.title.replace('[Connections Only] ', '') : 'Feed Post on HookZ';
    setShareModalItem({
      title: rawTitle,
      url: `/feed?postId=${targetPost.id}#post-${targetPost.id}`,
      description: targetPost.content,
      type: 'post',
    });
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
      markPostDeletedLocally(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      broadcastEntityDeleted('POST', postId);
      setSuccessToast('Post deleted successfully.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete post.');
    }
  };

  // Cross-device sync & auto-refresh on focus
  useEffect(() => {
    const syncChannel = supabase.channel('global-feed-sync-channel');
    syncChannel
      .on('broadcast', { event: 'entity_deleted' }, ({ payload }) => {
        if (payload?.entityType === 'POST' && payload?.id) {
          markPostDeletedLocally(payload.id);
          setPosts((prev) => prev.filter((p) => p.id !== payload.id));
        }
      })
      .subscribe();

    const dbChannel = supabase
      .channel('feed-posts-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const handleLocalDelete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.entityType === 'POST' && detail?.id) {
        markPostDeletedLocally(detail.id);
        setPosts((prev) => prev.filter((p) => p.id !== detail.id));
      }
    };
    window.addEventListener('global_entity_deleted', handleLocalDelete);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPosts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('global_entity_deleted', handleLocalDelete);
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(dbChannel);
    };
  }, []);

  const mySharesCount = posts.filter((p) => {
    const rawType = (p.postType || (p as any).post_type || 'UPDATE').toUpperCase();
    const isProtoPost = isPrototypePost(p);
    return isMyPost(p) && !isProtoPost && !IDEA_POST_TYPES.has(rawType);
  }).length;

  const myIdeasCount = posts.filter((p) => {
    const rawType = (p.postType || (p as any).post_type || 'UPDATE').toUpperCase();
    const isProtoPost = isPrototypePost(p);
    return isMyPost(p) && !isProtoPost && !ACHIEVEMENT_POST_TYPES.has(rawType) && (IDEA_POST_TYPES.has(rawType) || rawType === 'UPDATE');
  }).length;

  const myPrototypesCount = posts.filter((p) => {
    return isMyPost(p) && isPrototypePost(p);
  }).length;

  const executionFilters = [
    { id: 'ALL', label: 'All Describes' },
    { id: 'MY_SHARES', label: user ? `My Shares (${mySharesCount})` : 'My Shares' },
    { id: 'EXECUTION', label: 'Describes' },
    { id: 'DRAWBACK', label: 'Drawbacks' },
    { id: 'LAUNCH', label: 'Product Launch' },
    { id: 'EXPERIENCE', label: 'Experience' },
  ];

  const ideaFilters = [
    { id: 'ALL', label: 'All Ideas' },
    { id: 'MY_IDEAS', label: user ? `My Ideas (${myIdeasCount})` : 'My Ideas' },
    { id: 'IDEA', label: 'Ideas' },
    { id: 'ADVICE', label: 'Advice' },
    { id: 'HIRING', label: 'Hiring' },
  ];

  const prototypeFilters = [
    { id: 'ALL', label: 'All Prototypes' },
    { id: 'MY_PROTOTYPES', label: user ? `My Prototypes (${myPrototypesCount})` : 'My Prototypes' },
    { id: 'WEBSITES', label: 'Live Websites' },
    { id: 'VIDEOS', label: 'Demo Videos' },
  ];

  const executionComposerTypes = [
    { id: 'EXECUTION', label: 'Describes' },
    { id: 'DRAWBACK', label: 'Drawbacks' },
    { id: 'LAUNCH', label: 'Product Launch' },
    { id: 'EXPERIENCE', label: 'Experience' },
  ];

  const ideaComposerTypes = [
    { id: 'IDEA', label: 'Idea' },
    { id: 'COFOUNDER', label: 'Co-Founder' },
    { id: 'ADVICE', label: 'Advice' },
    { id: 'HIRING', label: 'Hiring Talent' },
  ];

  const postTypes = [
    { key: 'ALL', label: 'All Updates' },
    { key: 'EXECUTION', label: 'Describes' },
    { key: 'DRAWBACK', label: 'Drawbacks' },
    { key: 'LAUNCH', label: 'Product Launch' },
    { key: 'EXPERIENCE', label: 'Experiences' },
    { key: 'IDEA', label: 'Ideas' },
    { key: 'UPDATE', label: 'Updates' },
    { key: 'COFOUNDER', label: 'Co-Founder' },
    { key: 'HIRING', label: 'Hiring' },
    { key: 'FUNDING', label: 'Funding' },
    { key: 'ADVICE', label: 'Advice' },
  ];

  const getPostTypeBadge = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'EXECUTION':
      case 'ACHIEVEMENT':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'DRAWBACK':
      case 'DRAWBACKS':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
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

  const formatPostTypeLabel = (type: string) => {
    const upper = (type || '').toUpperCase();
    if (upper === 'ACHIEVEMENT' || upper === 'EXECUTION') return 'DESCRIBES';
    if (upper === 'DRAWBACK' || upper === 'DRAWBACKS') return 'DRAWBACKS';
    if (upper === 'LAUNCH') return 'PRODUCT LAUNCH';
    return type || 'UPDATE';
  };

  return (
    <div className="w-full max-w-full px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      <SEO
        title="Startup Feed — Describes, Ideas & Updates | HookZ"
        description="Follow real-time startup describes, drawbacks, breakthrough ideas, problem solutions, and founder updates across the HookZ ecosystem."
        canonicalPath="/feed"
        breadcrumbs={[{ name: 'Feed', path: '/feed' }]}
      />
      <h1 className="sr-only">Startup Feed — Real-Time Describes, Ideas & Updates | HookZ</h1>
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
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
        {/* 1. Describes */}
        <button
          type="button"
          onClick={() => handlePillarChange('ACHIEVEMENTS')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activePillar === 'ACHIEVEMENTS'
              ? 'bg-[#50C878] text-white border-[#50C878] dark:bg-[#50C878] dark:text-white dark:border-[#50C878] shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Award size={15} className={`shrink-0 ${activePillar === 'ACHIEVEMENTS' ? 'text-white' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            Describes
          </span>
        </button>

        {/* 2. Ideas */}
        <button
          type="button"
          onClick={() => handlePillarChange('IDEAS')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activePillar === 'IDEAS'
              ? 'bg-[#50C878] text-white border-[#50C878] dark:bg-[#50C878] dark:text-white dark:border-[#50C878] shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Rocket size={15} className={`shrink-0 ${activePillar === 'IDEAS' ? 'text-white' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            Ideas
          </span>
        </button>

        {/* 3. Prototypes */}
        <button
          type="button"
          onClick={() => handlePillarChange('PROTOTYPES')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activePillar === 'PROTOTYPES'
              ? 'bg-[#50C878] text-white border-[#50C878] dark:bg-[#50C878] dark:text-white dark:border-[#50C878] shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Boxes size={15} className={`shrink-0 ${activePillar === 'PROTOTYPES' ? 'text-white' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            Prototypes
          </span>
        </button>
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
            {activePillar === 'PROTOTYPES' ? (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => setCreatePrototypeModalOpen(true)}
                  className="flex-1 text-left px-3.5 py-2 rounded-md bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100/70 dark:hover:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 text-xs font-semibold border border-cyan-200/80 dark:border-cyan-800/80 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <Boxes size={14} className="text-cyan-600 dark:text-cyan-400" />
                    <span>Share what you built (sample website, MVP, or video &lt;60s)...</span>
                  </span>
                  <span className="btn-primary py-1 px-2.5 text-[11px] rounded-lg shrink-0">
                    + Post Prototype
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setComposerOpen(!composerOpen)}
                className="flex-1 text-left px-3.5 py-2 rounded-md bg-slate-50 dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 text-xs font-normal border border-slate-200/80 dark:border-dark-700/80 transition-colors"
              >
                {activePillar === 'ACHIEVEMENTS'
                  ? 'Share what you describe, drawback, product launch, or experience...'
                  : 'Share a startup idea, early concept, or seek co-founders...'}
              </button>
            )}
          </div>

          {composerOpen && activePillar !== 'PROTOTYPES' && (
            <form onSubmit={handleCreatePost} className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-800 space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Post Category:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
                  {(activePillar === 'ACHIEVEMENTS' ? executionComposerTypes : ideaComposerTypes).map((t) => (
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
                    ? 'Describe or experience headline (optional)'
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
                    ? 'Describe your progress, metrics reached, drawbacks encountered, lessons learned, or new product features...'
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

              <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">Audience:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700">
                    <button
                      type="button"
                      onClick={() => setPostVisibility('PUBLIC')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        postVisibility === 'PUBLIC'
                          ? 'bg-white dark:bg-dark-900 text-brand-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Globe size={11} />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostVisibility('CONNECTIONS')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        postVisibility === 'CONNECTIONS'
                          ? 'bg-white dark:bg-dark-900 text-purple-600 dark:text-purple-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Users size={11} />
                      <span>Connections Only</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
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
              </div>
            </form>
          )}
        </div>
      )}

      {/* Sub-Category Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(activePillar === 'ACHIEVEMENTS'
          ? executionFilters
          : activePillar === 'IDEAS'
          ? ideaFilters
          : prototypeFilters
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilterType(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              filterType === item.id
                ? 'bg-slate-900 text-white dark:bg-[#1E293B] dark:text-[#F8FAFC] shadow-xs'
                : 'bg-white dark:bg-[#0F1624] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Feed Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-lg bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 animate-pulse" />
          ))}
        </div>
      ) : activePillar === 'PROTOTYPES' ? (
        filteredPosts.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={
              filterType === 'MY_PROTOTYPES'
                ? "You haven't posted any prototypes yet"
                : "No Prototypes Found"
            }
            description="Founders and builders can showcase early samples, websites, or video demos under 60 seconds."
            actionLabel="Post a Prototype"
            onAction={() => setCreatePrototypeModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PrototypeCard
                key={post.id}
                post={post}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        )
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={
            filterType === 'MY_SHARES' || filterType === 'MY_ACHIEVEMENTS'
              ? "You haven't posted any describes yet"
              : filterType === 'MY_IDEAS'
              ? "You haven't posted any startup ideas yet"
              : activePillar === 'ACHIEVEMENTS'
              ? "No describes published yet"
              : "No idea posts found"
          }
          description={
            filterType === 'MY_SHARES' || filterType === 'MY_ACHIEVEMENTS'
              ? "Share your describes, drawbacks, product launches, or experiences with the community."
              : filterType === 'MY_IDEAS'
              ? "Publish a new startup concept or problem to gather feedback and find builders."
              : activePillar === 'ACHIEVEMENTS'
              ? "Be the first to share what you describe, drawback, or product launch."
              : "Share an early idea, concept proposal, or seek co-founders to build together."
          }
          actionLabel={activePillar === 'ACHIEVEMENTS' ? "Share Describes" : "Post an Idea"}
          onAction={() => setComposerOpen(true)}
        />
      ) : (
        <div className="space-y-4">

          {filteredPosts.map((post) => {
            const author = post.author;
            const authorName = author?.profile?.fullName || author?.email || 'Founder';
            const authorHeadline = author?.profile?.headline || author?.role;
            const isCommentsOpen = !!expandedComments[post.id];

            const isIdeaPost =
              activePillar === 'IDEAS' ||
              (post.postType || '').toUpperCase() === 'IDEA' ||
              (activePillar !== 'ACHIEVEMENTS' && IDEA_POST_TYPES.has((post.postType || '').toUpperCase()));

            const currentVote = userVotes[post.id] !== undefined
              ? userVotes[post.id]
              : (post.isLiked ? 'up' : null);

            const netScore = post.likesCount || 0;

            let scoreColorClass = 'text-slate-600 dark:text-slate-400 font-medium';
            if (currentVote === 'up' || (currentVote === null && netScore > 0)) {
              scoreColorClass = 'text-emerald-600 dark:text-emerald-400 font-bold';
            } else if (currentVote === 'down' || (currentVote === null && netScore < 0)) {
              scoreColorClass = 'text-rose-600 dark:text-rose-400 font-bold';
            }

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className={`card-base p-5 sm:p-6 transition-all duration-500 space-y-4 min-w-0 overflow-hidden break-words ${
                  highlightedPostId === post.id
                    ? 'ring-4 ring-brand-500 ring-offset-2 dark:ring-offset-dark-900 shadow-2xl scale-[1.01] bg-brand-50/25 dark:bg-brand-950/25'
                    : ''
                }`}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(post.visibility === 'CONNECTIONS' || post.title?.includes('[Connections Only]')) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
                        <Users size={11} />
                        <span>Connections</span>
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getPostTypeBadge(
                        post.postType
                      )}`}
                    >
                      {formatPostTypeLabel(post.postType)}
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
                <div className="space-y-2 min-w-0 break-words">
                  {post.title && (
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white break-words">
                      {post.title}
                    </h3>
                  )}
                  <div>
                    <p
                      className={`text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed break-words ${
                        expandedPostContent[post.id] ? '' : 'line-clamp-2 sm:line-clamp-3'
                      }`}
                    >
                      {post.content}
                    </p>
                    {post.content && (post.content.length > 120 || post.content.split('\n').length > 2) && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPostContent((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-1 cursor-pointer inline-flex items-center gap-0.5"
                      >
                        {expandedPostContent[post.id] ? 'Show less' : '...more'}
                      </button>
                    )}
                  </div>

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
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Reaction: Upvote/Downvote Pill for Ideas, Heart for other feeds */}
                    {isIdeaPost ? (
                      <div
                        className="inline-flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 rounded-full bg-slate-100/90 dark:bg-dark-800 border border-slate-200/90 dark:border-dark-700 shadow-2xs transition-colors duration-150"
                        role="group"
                        aria-label="Idea post voting"
                      >
                        {/* Upvote Button (▲) */}
                        <button
                          type="button"
                          onClick={() => handleVotePost(post.id, 'up')}
                          aria-label="Upvote idea"
                          title="Upvote idea"
                          className={`p-1 sm:p-1.5 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                            currentVote === 'up'
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : 'bg-transparent border-emerald-500/80 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-600'
                          }`}
                        >
                          <ArrowBigUp
                            size={14}
                            className="transition-transform duration-150 active:scale-90"
                            fill={currentVote === 'up' ? 'currentColor' : 'none'}
                            strokeWidth={currentVote === 'up' ? 1.5 : 2}
                          />
                        </button>

                        {/* Score Counter */}
                        <span
                          className={`text-xs px-1 min-w-[20px] text-center select-none transition-colors duration-150 ${scoreColorClass}`}
                        >
                          {netScore}
                        </span>

                        {/* Downvote Button (▼) */}
                        <button
                          type="button"
                          onClick={() => handleVotePost(post.id, 'down')}
                          aria-label="Downvote idea"
                          title="Downvote idea"
                          className={`p-1 sm:p-1.5 rounded-full border transition-all duration-150 flex items-center justify-center cursor-pointer ${
                            currentVote === 'down'
                              ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                              : 'bg-transparent border-rose-500/80 dark:border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-600'
                          }`}
                        >
                          <ArrowBigDown
                            size={14}
                            className="transition-transform duration-150 active:scale-90"
                            fill={currentVote === 'down' ? 'currentColor' : 'none'}
                            strokeWidth={currentVote === 'down' ? 1.5 : 2}
                          />
                        </button>
                      </div>
                    ) : (
                      /* Default Heart reaction button for Executions / other feeds */
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
                          post.isLiked
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'hover:text-rose-600'
                        }`}
                      >
                        <Heart size={15} className={post.isLiked ? 'fill-rose-600' : ''} />
                        <span>{post.likesCount || 0}</span>
                      </button>
                    )}

                    {/* Comments Toggle */}
                    <button
                      onClick={() => handleToggleComments(post.id)}
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
                      type="button"
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                      title="Share post with connections"
                    >
                      <Share2 size={14} />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Connect with author - hidden if already connected */}
                    {user && author?.id && user.id !== author.id && !connectedUserIds.has(author.id) && (
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

      {/* Share with Connections Modal */}
      <ShareModal
        isOpen={Boolean(shareModalItem)}
        onClose={() => setShareModalItem(null)}
        item={shareModalItem}
      />

      {/* Create Prototype Modal */}
      <CreatePrototypeModal
        isOpen={createPrototypeModalOpen}
        onClose={() => setCreatePrototypeModalOpen(false)}
        onSuccess={(newPost) => {
          if (user) {
            newPost.authorId = user.id;
            (newPost as any).author_id = user.id;
            if (newPost.author) {
              newPost.author.id = user.id;
              if (!newPost.author.email) newPost.author.email = user.email;
              if (!newPost.author.profile) newPost.author.profile = user.profile;
            }
          }
          saveLocalPersistedPost(newPost);
          setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
          clearApiCache();
          setSuccessToast('Prototype published successfully!');
          setTimeout(() => setSuccessToast(null), 3000);
        }}
      />
    </div>
  );
};

