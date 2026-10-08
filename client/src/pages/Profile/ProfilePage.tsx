import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, Profile } from '../../types';
import {
  supabase,
  fetchUserProfile as fetchUserProfileFromSupabase,
  upsertUserProfile,
  fetchConnectionStatus,
  fetchConnectionCount,
  respondConnectionRequest,
  removeConnection,
  ConnectionStatusInfo,
  invalidateUserProfileCache,
} from '../../lib/supabase';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Modal } from '../../components/common/Modal';
import { SEO } from '../../components/common/SEO';
import { searchLocations, searchColleges, resolveIndianLocation } from '../../data/indiaData';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Globe,
  ExternalLink,
  Edit3,
  MessageSquare,
  UserPlus,
  Rocket,
  Award,
  Flag,
  Video,
  Plus,
  X,
  Sparkles,
  ThumbsUp,
  Crown,
  Share2,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  BookOpen,
  FolderKanban,
  Check,
  Clock,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  UserX,
  Lock,
} from 'lucide-react';

export const PROFILE_ROLE_OPTIONS = [
  { id: 'STUDENT', label: 'Student', desc: 'Learning, building projects, seeking internships & startup opportunities' },
  { id: 'OTHER', label: 'Others', desc: 'Designers, operators, domain specialists & community members' },
  { id: 'FOUNDER', label: 'Founder', desc: 'Starting a new venture and seeking passionate teammates or resources' },
  { id: 'COFOUNDER', label: 'Co-Founder', desc: 'Looking to join an early-stage startup as a core partner' },
  { id: 'DEVELOPER', label: 'Developer', desc: 'Technical & software engineering talent building robust products' },
  { id: 'MARKETER', label: 'Marketer', desc: 'Growth marketing, customer acquisition and brand scaling expert' },
  { id: 'INVESTOR', label: 'Investor', desc: 'Angel investor or venture capitalist exploring high-potential startups' },
  { id: 'MENTOR', label: 'Mentor', desc: 'Experienced advisor, founder or executive guiding emerging teams' },
];

export function normalizeRoleValue(role?: string | null): string {
  if (!role) return 'STUDENT';
  const clean = role.trim().toUpperCase();
  if (clean.includes('STUDENT')) return 'STUDENT';
  if (clean.includes('OTHER')) return 'OTHER';
  if (clean.includes('COFOUNDER') || clean.includes('CO-FOUNDER')) return 'COFOUNDER';
  if (clean.includes('FOUNDER')) return 'FOUNDER';
  if (clean.includes('DEV') || clean.includes('ENG')) return 'DEVELOPER';
  if (clean.includes('MARKET')) return 'MARKETER';
  if (clean.includes('INVEST')) return 'INVESTOR';
  if (clean.includes('MENTOR') || clean.includes('ADVISOR')) return 'MENTOR';
  return clean;
}

export interface WorkExperienceItem {
  id?: string;
  category: string;
  company: string;
  description: string;
}

export function parseWorkExperiences(raw: string | undefined | null): WorkExperienceItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: item.id || `exp-${index}`,
        category: item.category || 'Founders',
        company: item.company || '',
        description: item.description || '',
      }));
    }
  } catch {}

  const trimmed = String(raw).trim();
  if (trimmed) {
    return [
      {
        id: 'exp-0',
        category: 'Founders',
        company: '',
        description: trimmed,
      },
    ];
  }
  return [];
}

function resizeImageToDataUrl(file: File, maxDimension = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<User | null>(null);

  const isMe = Boolean(
    !id ||
    id === 'me' ||
    id === currentUser?.id ||
    id === currentUser?.profile?.id ||
    (currentUser?.profile?.username && id.toLowerCase() === currentUser.profile.username.toLowerCase()) ||
    (currentUser?.email && id.toLowerCase() === currentUser.email.toLowerCase()) ||
    (currentUser?.email && id.toLowerCase() === currentUser.email.split('@')[0].toLowerCase()) ||
    (currentUser && profileUser && (
      currentUser.id === profileUser.id ||
      (currentUser.email && profileUser.email && currentUser.email.toLowerCase() === profileUser.email.toLowerCase())
    ))
  );

  const targetId = id && id !== 'me' ? id : currentUser?.id;
  const [connectionsCount, setConnectionsCount] = useState<number>(0);
  const [connInfo, setConnInfo] = useState<ConnectionStatusInfo>({
    status: null,
    isSender: false,
    isReceiver: false,
    connectionId: null,
  });
  const [connActionLoading, setConnActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // User Posts & Updates
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // User Safety & Block Feature
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  // Connections list modal
  const [connectionsModalOpen, setConnectionsModalOpen] = useState(false);
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [connectionsListLoading, setConnectionsListLoading] = useState(false);
  const [removingConnId, setRemovingConnId] = useState<string | null>(null);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Smart India Location & College Autocomplete states for Edit Profile
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [collegeSuggestions, setCollegeSuggestions] = useState<any[]>([]);
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

  const { logout } = useAuth();

  const handleOpenEdit = () => {
    const currentP = profileUser?.profile || currentUser?.profile;
    if (currentP) {
      const exps = parseWorkExperiences(currentP.startupExperience);
      let parsedHackathons: any[] = [];
      let parsedProjects: any[] = [];
      try {
        if (currentP.achievements) {
          const achObj = JSON.parse(currentP.achievements);
          if (achObj && typeof achObj === 'object') {
            if (Array.isArray(achObj.hackathons)) parsedHackathons = achObj.hackathons;
            if (Array.isArray(achObj.projects)) parsedProjects = achObj.projects;
          }
        }
      } catch {}

      const initialRole = normalizeRoleValue(profileUser?.role || currentP.preferredRole || currentUser?.role || 'STUDENT');
      const changeCount = currentP.roleChangeCount ?? currentP.role_change_count ?? (profileUser as any)?.roleChangeCount ?? (currentUser as any)?.roleChangeCount ?? 0;
      const initialUsername = (currentP.username || (profileUser?.email || currentUser?.email ? (profileUser?.email || currentUser?.email)!.split('@')[0] : '')).toLowerCase().replace(/^@/, '');
      const usernameChangedAt = currentP.usernameChangedAt || currentP.username_changed_at || (profileUser as any)?.usernameChangedAt || (profileUser as any)?.username_changed_at || null;

      setFormData({
        avatar: currentP.avatar || '',
        coverImage: currentP.coverImage || '',
        fullName: currentP.fullName || '',
        username: initialUsername,
        initialUsername: initialUsername,
        usernameChangedAt: usernameChangedAt,
        headline: currentP.headline || '',
        oneLineBio: currentP.oneLineBio || currentP.headline || '',
        location: currentP.location || '',
        bio: currentP.bio || '',
        skills: currentP.skills || '',
        startupInterests: currentP.startupInterests || '',
        industries: currentP.industries || '',
        role: initialRole,
        preferredRole: initialRole,
        initialRole: initialRole,
        roleChangeCount: changeCount,
        availability: currentP.availability || 'Full-time',
        startupExperience: currentP.startupExperience || '',
        experiences: exps.length > 0 ? exps : [
          {
            id: `exp-${Date.now()}`,
            category: initialRole,
            company: '',
            description: currentP.startupExperience && !currentP.startupExperience.startsWith('[') ? currentP.startupExperience : '',
          },
        ],
        hackathons: parsedHackathons,
        projects: parsedProjects,
        achievements: currentP.achievements || '',
        education: currentP.education || '',
        githubUrl: currentP.githubUrl || '',
        linkedinUrl: currentP.linkedinUrl || '',
        websiteUrl: currentP.websiteUrl || '',
        openTo: currentP.openTo || 'Co-Founder, Startup Team, Mentorship',
      });
      setLocationSuggestions([]);
      setCollegeSuggestions([]);
    }
    setEditOpen(true);
  };

  const handleAddExperienceItem = () => {
    setFormData((prev: any) => ({
      ...prev,
      experiences: [
        ...(prev.experiences || []),
        {
          id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          category: 'Founders',
          company: '',
          description: '',
        },
      ],
    }));
  };

  const handleUpdateExperienceItem = (index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const list = [...(prev.experiences || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: value };
      }
      return { ...prev, experiences: list };
    });
  };

  const handleRemoveExperienceItem = (index: number) => {
    setFormData((prev: any) => {
      const list = [...(prev.experiences || [])];
      list.splice(index, 1);
      return { ...prev, experiences: list };
    });
  };

  const handleDeleteExperienceDirect = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this work experience?')) return;
    const list = [...parsedExperiences];
    list.splice(index, 1);
    const serializedExp = JSON.stringify(list);
    try {
      if (currentUser?.id) {
        await upsertUserProfile(currentUser.id, {
          startup_experience: serializedExp,
          email: currentUser.email,
        }).catch(() => null);
        await api.updateProfile({ startupExperience: serializedExp }).catch(() => null);
        invalidateUserProfileCache(currentUser.id);
      }
      setProfileUser((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...(prev.profile || {}),
            startupExperience: serializedExp,
          },
        };
      });
      if (currentUser?.profile) {
        updateUser({
          ...currentUser,
          profile: {
            ...currentUser.profile,
            startupExperience: serializedExp,
          },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete experience.');
    }
  };

  // Auto-open edit modal if requested via URL (?edit=true)
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && isMe) {
      handleOpenEdit();
    }
  }, [searchParams, isMe, profileUser]);

  // Gallery upload, permission, and photo keeping states
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [galleryPermissionOpen, setGalleryPermissionOpen] = useState(false);
  const [targetImageType, setTargetImageType] = useState<'avatar' | 'cover'>('avatar');
  const [confirmPhotoModalOpen, setConfirmPhotoModalOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSavedNotice, setPhotoSavedNotice] = useState<string | null>(null);

  const handleRequestGalleryPermission = (type: 'avatar' | 'cover') => {
    setTargetImageType(type);
    setGalleryPermissionOpen(true);
  };

  const handleGrantGalleryPermission = () => {
    setGalleryPermissionOpen(false);
    setTimeout(() => {
      if (targetImageType === 'avatar') {
        avatarFileInputRef.current?.click();
      } else {
        coverFileInputRef.current?.click();
      }
    }, 100);
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await resizeImageToDataUrl(file, type === 'cover' ? 1400 : 800, 0.85);
      setTargetImageType(type);
      setPreviewPhotoUrl(dataUrl);
      setConfirmPhotoModalOpen(true);
    } catch (err) {
      console.error('Failed to read image:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmKeepPhoto = async () => {
    if (!previewPhotoUrl || !currentUser?.id) return;
    setIsSavingPhoto(true);
    try {
      const fieldKey = targetImageType === 'avatar' ? 'avatar' : 'cover_image';
      const formKey = targetImageType === 'avatar' ? 'avatar' : 'coverImage';

      // 1. Update Supabase profiles table immediately
      await upsertUserProfile(currentUser.id, {
        [fieldKey]: previewPhotoUrl,
        email: currentUser.email,
      });

      // 2. Mirror to backend if possible
      try {
        await api.updateProfile({
          [formKey]: previewPhotoUrl,
        });
      } catch {
        // Backend mirror non-critical
      }

      // 3. Update local states
      setFormData((prev: any) => ({
        ...prev,
        [formKey]: previewPhotoUrl,
      }));

      const updatedUser: User = {
        ...(profileUser || currentUser),
        profile: {
          ...((profileUser || currentUser).profile || ({} as Profile)),
          [formKey]: previewPhotoUrl,
        },
      };

      setProfileUser(updatedUser);
      updateUser(updatedUser);

      setConfirmPhotoModalOpen(false);
      setPreviewPhotoUrl('');
      setPhotoSavedNotice(
        targetImageType === 'avatar'
          ? 'Profile photo updated and saved successfully!'
          : 'Background cover updated and saved successfully!'
      );
      setTimeout(() => setPhotoSavedNotice(null), 4000);
    } catch (err) {
      console.error('Failed to save photo:', err);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Modals
  const [connectOpen, setConnectOpen] = useState(false);
  const [startupProposalOpen, setStartupProposalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  // Account deletion states
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleRemovePhoto = async (type: 'avatar' | 'cover') => {
    if (!currentUser?.id) return;
    setIsRemovingPhoto(true);
    try {
      const fieldKey = type === 'avatar' ? 'avatar' : 'cover_image';
      const formKey = type === 'avatar' ? 'avatar' : 'coverImage';

      // 1. Update Supabase profile
      await upsertUserProfile(currentUser.id, {
        [fieldKey]: null,
        email: currentUser.email,
      });

      // 2. Mirror to backend if avatar
      if (type === 'avatar') {
        try {
          await api.updateProfile({ avatar: '' });
        } catch {}
      }

      // 3. Update local state
      setFormData((prev: any) => ({
        ...prev,
        [formKey]: '',
      }));

      const updatedUser: User = {
        ...(profileUser || currentUser),
        profile: {
          ...((profileUser || currentUser).profile || ({} as Profile)),
          [formKey]: '',
        },
      };

      setProfileUser(updatedUser);
      updateUser(updatedUser);

      setPhotoSavedNotice(
        type === 'avatar'
          ? 'Profile photo removed successfully!'
          : 'Background cover removed successfully!'
      );
      setTimeout(() => setPhotoSavedNotice(null), 4000);
    } catch (err) {
      console.error('Failed to remove photo:', err);
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') {
      setDeleteError('Please type "delete" to confirm permanent deletion.');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const uid = currentUser.id;
      const userEmail = currentUser.email;

      // 1. Client-side Supabase table purge fallback
      try {
        if (uid) {
          await supabase.from('profiles').delete().or(`user_id.eq.${uid},id.eq.${uid}`);
          await supabase.from('connections').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);
          await supabase.from('users').delete().eq('id', uid);
        }
        if (userEmail) {
          await supabase.from('profiles').delete().ilike('email', userEmail);
          await supabase.from('users').delete().ilike('email', userEmail);
        }
      } catch (sbClientErr) {
        console.warn('Client Supabase direct delete fallback warning:', sbClientErr);
      }

      // 2. Call backend server to execute authoritative deletion across
      // Supabase Auth (auth.users), Supabase PostgreSQL (public tables), and Prisma backend database
      try {
        await api.deleteAccount({ userId: uid, email: userEmail });
      } catch (apiErr: any) {
        console.warn('Backend API delete warning:', apiErr?.message);
      }

      // 3. Invalidate profile caches and API cache
      invalidateUserProfileCache(uid);
      api.clearCache();

      // 4. Clear all browser storage completely (no stale sessions or user keys)
      localStorage.clear();
      sessionStorage.clear();

      // 5. Sign out completely from Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut warning on delete:', err);
      }

      // 6. Logout in AuthContext
      try {
        await logout();
      } catch (err) {
        console.warn('logout context warning on delete:', err);
      }

      // 7. Redirect straight to login page with deletion notice
      window.location.href = '/login?deleted=true';
    } catch (err: any) {
      console.error('Failed to permanently delete account:', err);
      setDeleteError(err?.message || 'Failed to permanently delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  // Interactive skills state
  const [newSkillInput, setNewSkillInput] = useState('');
  const [savingSkill, setSavingSkill] = useState(false);
  const [endorsedSkills, setEndorsedSkills] = useState<Record<string, boolean>>({});

  const handleAddSkill = async (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed || !profileUser) return;
    const currentSkills = profileUser.profile?.skills
      ? profileUser.profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    if (currentSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkillInput('');
      return;
    }
    const updatedSkills = [...currentSkills, trimmed].join(', ');
    setSavingSkill(true);
    try {
      if (currentUser?.id) {
        await upsertUserProfile(currentUser.id, {
          skills: updatedSkills,
          email: currentUser.email,
        }).catch(() => null);
      }
      const res = await api.updateProfile({ skills: updatedSkills });
      if (res?.user) {
        setProfileUser(res.user);
        if (isMe && currentUser) {
          updateUser(res.user);
        }
      }
      setNewSkillInput('');
    } catch (err) {
      console.error('Failed to add skill:', err);
    } finally {
      setSavingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (!profileUser) return;
    const currentSkills = profileUser.profile?.skills
      ? profileUser.profile.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const updatedSkills = currentSkills.filter((s) => s !== skillToRemove).join(', ');
    setSavingSkill(true);
    try {
      if (currentUser?.id) {
        await upsertUserProfile(currentUser.id, {
          skills: updatedSkills,
          email: currentUser.email,
        }).catch(() => null);
      }
      const res = await api.updateProfile({ skills: updatedSkills });
      if (res?.user) {
        setProfileUser(res.user);
        if (isMe && currentUser) {
          updateUser(res.user);
        }
      }
    } catch (err) {
      console.error('Failed to remove skill:', err);
    } finally {
      setSavingSkill(false);
    }
  };

  const toggleEndorseSkill = (skill: string) => {
    setEndorsedSkills((prev) => ({
      ...prev,
      [skill]: !prev[skill],
    }));
  };

  const fetchUserPosts = async (authorId: string) => {
    if (!authorId) return;
    setLoadingPosts(true);
    try {
      // 1. Fetch from backend API
      const res: any = await api.getPosts({ authorId }).catch(() => null);
      let postsList: any[] = Array.isArray(res?.posts) ? res.posts : [];

      // 2. Fetch/merge from Supabase posts table
      try {
        const { data: supaPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', authorId)
          .order('created_at', { ascending: false });

        if (Array.isArray(supaPosts) && supaPosts.length > 0) {
          const existingIds = new Set(postsList.map((p: any) => p.id));
          supaPosts.forEach((sp: any) => {
            if (!existingIds.has(sp.id)) {
              postsList.push({
                id: sp.id,
                authorId: sp.author_id,
                postType: sp.post_type || 'UPDATE',
                title: sp.title,
                content: sp.content,
                links: sp.links,
                likesCount: sp.likes_count || 0,
                commentsCount: sp.comments_count || 0,
                createdAt: sp.created_at,
              });
            }
          });
        }
      } catch (sbErr) {
        console.warn('Supabase profile posts fetch notice:', sbErr);
      }

      postsList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserPosts(postsList);
    } catch (err) {
      console.error('Failed to load profile posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this post? This cannot be undone.')) {
      return;
    }
    setDeletingPostId(postId);
    try {
      await api.deletePost(postId).catch(() => null);
      try {
        await supabase.from('posts').delete().eq('id', postId);
      } catch {}
      setUserPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post. Please try again.');
    } finally {
      setDeletingPostId(null);
    }
  };

  // Block / Unblock logic
  useEffect(() => {
    if (!currentUser?.id || !profileUser?.id || isMe) return;
    try {
      const key = `hookz_blocked_${currentUser.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const list = JSON.parse(stored);
        setIsBlocked(list.includes(profileUser.id));
      }
    } catch {}
  }, [currentUser?.id, profileUser?.id, isMe]);

  const handleToggleBlock = async () => {
    if (!currentUser?.id || !profileUser?.id) return;
    setBlockingLoading(true);
    try {
      const key = `hookz_blocked_${currentUser.id}`;
      let list: string[] = [];
      try {
        list = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {}

      if (isBlocked) {
        list = list.filter((uid: string) => uid !== profileUser.id);
        setIsBlocked(false);
      } else {
        if (!list.includes(profileUser.id)) list.push(profileUser.id);
        setIsBlocked(true);
      }
      localStorage.setItem(key, JSON.stringify(list));
      setBlockModalOpen(false);
    } catch (err) {
      console.error('Toggle block error:', err);
    } finally {
      setBlockingLoading(false);
    }
  };

  const fetchUserProfile = async (force = false) => {
    if (!targetId) return;

    setLoading(true);
    try {
      // First check fresh Supabase profile
      const sbProfile = await fetchUserProfileFromSupabase(targetId, true, currentUser?.email || undefined).catch(() => null);

      if (sbProfile) {
        const uRole = normalizeRoleValue(sbProfile.preferred_role || currentUser?.role || 'STUDENT');
        const changeCount = sbProfile.role_change_count ?? sbProfile.roleChangeCount ?? 0;
        const uName = sbProfile.username || (sbProfile.email ? sbProfile.email.split('@')[0] : 'user');

        const u: any = {
          id: sbProfile.user_id || targetId,
          email: sbProfile.email || currentUser?.email || '',
          username: uName,
          role: uRole,
          roleChangeCount: changeCount,
          isVerified: true,
          verificationBadge: sbProfile.auth_provider === 'google' ? 'Verified via Google' : 'Active Builder',
          isSuspended: false,
          isAdmin: currentUser?.isAdmin || false,
          createdAt: sbProfile.created_at || new Date().toISOString(),
          connectionStatus: null,
          startups: [],
          profile: {
            id: sbProfile.id,
            userId: sbProfile.user_id || targetId,
            fullName: sbProfile.full_name || 'Founder',
            username: uName,
            usernameChangedAt: sbProfile.username_changed_at || null,
            username_changed_at: sbProfile.username_changed_at || null,
            headline: sbProfile.headline || '',
            oneLineBio: sbProfile.one_line_bio || sbProfile.headline || '',
            location: sbProfile.location || '',
            bio: sbProfile.bio || '',
            avatar: sbProfile.avatar || '',
            coverImage: sbProfile.cover_image || '',
            skills: sbProfile.skills || '',
            startupInterests: sbProfile.startup_interests || '',
            industries: sbProfile.industries || '',
            preferredRole: uRole,
            roleChangeCount: changeCount,
            role_change_count: changeCount,
            availability: sbProfile.availability || 'Full-time',
            startupExperience: sbProfile.startup_experience || '',
            achievements: sbProfile.achievements || '',
            education: sbProfile.education || '',
            githubUrl: sbProfile.github_url || '',
            linkedinUrl: sbProfile.linkedin_url || '',
            websiteUrl: sbProfile.website_url || '',
            openTo: sbProfile.open_to || 'Co-Founder, Startup Team, Mentorship',
            profileCompletion: sbProfile.profile_completion || 60,
          },
        };
        setProfileUser(u);
        if (isMe && currentUser) {
          updateUser(u);
        }
        fetchUserPosts(u.id);
      } else {
        // Fallback to backend API only if Supabase profile was not found
        const backendRes = await api.getUser(targetId).catch(() => null);
        const backendData = backendRes?.user || backendRes;
        if (backendData) {
          setProfileUser(backendData);
          if (isMe && currentUser) {
            updateUser(backendData);
          }
          fetchUserPosts(backendData.id || targetId);
        }
      }
    } catch (err) {
      console.warn('Profile fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionsList = async (userId: string) => {
    setConnectionsListLoading(true);
    try {
      const { data: conns } = await supabase
        .from('connections')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'ACCEPTED');

      if (!conns || conns.length === 0) {
        setConnectionsList([]);
        return;
      }

      const otherIds = conns.map((c) => (c.sender_id === userId ? c.receiver_id : c.sender_id));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', otherIds);
      const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const list = conns.map((c) => {
        const otherId = c.sender_id === userId ? c.receiver_id : c.sender_id;
        const p = profMap.get(otherId);
        return {
          connectionId: c.id,
          connectedAt: c.updated_at,
          userId: otherId,
          fullName: p?.full_name || 'Startup Builder',
          avatar: p?.avatar || null,
          headline: p?.headline || '',
          preferredRole: p?.preferred_role || 'FOUNDER',
        };
      });
      setConnectionsList(list);
    } catch (err) {
      console.warn('Failed to load connections list:', err);
      setConnectionsList([]);
    } finally {
      setConnectionsListLoading(false);
    }
  };

  const handleOpenConnectionsModal = () => {
    setConnectionsModalOpen(true);
    const userId = targetId || profileUser?.id;
    if (userId) loadConnectionsList(userId);
  };

  const handleRemoveFromModal = async (connectionId: string) => {
    if (!currentUser?.id) return;
    if (!window.confirm('Remove this connection?')) return;
    setRemovingConnId(connectionId);
    try {
      await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
      try { await api.removeConnection(connectionId); } catch {}
      setConnectionsList((prev) => prev.filter((c) => c.connectionId !== connectionId));
      setConnectionsCount((prev) => Math.max(0, prev - 1));
      // Refresh connInfo if this was our connection
      if (connInfo.connectionId === connectionId) {
        setConnInfo({ status: null, isSender: false, isReceiver: false, connectionId: null });
      }

      // Broadcast changes so other tabs and components update counts
      window.dispatchEvent(new CustomEvent('connections_updated'));
      try {
        const broadcastChannel = supabase.channel('global-connections-broadcast');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'connection_changed',
          payload: {
            connectionId,
            userId: currentUser.id,
            action: 'REMOVED',
            timestamp: new Date().toISOString(),
          },
        });
        supabase.removeChannel(broadcastChannel);
      } catch {}
    } catch (err) {
      alert('Failed to remove connection.');
    } finally {
      setRemovingConnId(null);
    }
  };

  const loadConnectionsAndStatus = async () => {
    try {
      const checkTargetId =
        profileUser?.profile?.userId ||
        profileUser?.id ||
        (isMe ? currentUser?.id : targetId);

      if (checkTargetId) {
        const countPromise = fetchConnectionCount(checkTargetId);
        const statusPromise = (!isMe && currentUser?.id && checkTargetId !== currentUser.id)
          ? fetchConnectionStatus(currentUser.id, checkTargetId)
          : Promise.resolve({ status: null, isSender: false, isReceiver: false, connectionId: null });

        const [count, statusInfo] = await Promise.all([countPromise, statusPromise]);
        setConnectionsCount(count);
        setConnInfo(statusInfo);
      }
    } catch (err) {
      console.warn('loadConnectionsAndStatus notice:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile(true);
    loadConnectionsAndStatus();

    // Subscribe to realtime profile changes so any updates by other users reflect live
    const profileChannel = supabase
      .channel(`profile-updates-${targetId || currentUser?.id || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload: any) => {
          const updatedUserId = payload.new?.user_id || payload.new?.id;
          if (updatedUserId === targetId || updatedUserId === currentUser?.id) {
            invalidateUserProfileCache(updatedUserId);
            fetchUserProfile(true);
          }
        }
      )
      .subscribe();

    // Subscribe to realtime connection changes so both accounts update live
    const channel = supabase
      .channel(`profile-conns-${targetId || currentUser?.id || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => {
          loadConnectionsAndStatus();
        }
      )
      .subscribe();

    // Also listen for broadcast events from NotificationsDropdown and NetworkPage
    const broadcastChannel = supabase
      .channel('global-connections-broadcast')
      .on('broadcast', { event: 'connection_changed' }, () => {
        loadConnectionsAndStatus();
      })
      .subscribe();

    const handleConnEvt = () => {
      loadConnectionsAndStatus();
    };
    const handleProfileEvt = (e: any) => {
      if (!e.detail?.userId || e.detail?.userId === targetId || e.detail?.userId === currentUser?.id) {
        fetchUserProfile(true);
      }
    };
    window.addEventListener('connections_updated', handleConnEvt);
    window.addEventListener('profile_updated', handleProfileEvt);

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('connections_updated', handleConnEvt);
      window.removeEventListener('profile_updated', handleProfileEvt);
    };
  }, [targetId, currentUser?.id, isMe]);

  const handleAcceptConnection = async () => {
    if (!connInfo.connectionId || !currentUser?.id) return;
    setConnActionLoading(true);
    try {
      const res = await respondConnectionRequest(connInfo.connectionId, 'ACCEPT', currentUser.id);
      if (res.success) {
        setConnInfo({
          status: 'ACCEPTED',
          isSender: false,
          isReceiver: true,
          connectionId: connInfo.connectionId,
        });
        const checkTargetId = targetId || profileUser?.id || '';
        const newCount = await fetchConnectionCount(checkTargetId);
        setConnectionsCount(newCount);

        // Broadcast to sync counts across tabs and pages
        window.dispatchEvent(new CustomEvent('connections_updated'));
        try {
          const broadcastChannel = supabase.channel('global-connections-broadcast');
          await broadcastChannel.send({
            type: 'broadcast',
            event: 'connection_changed',
            payload: {
              connectionId: connInfo.connectionId,
              userId: currentUser.id,
              action: 'ACCEPT',
              timestamp: new Date().toISOString(),
            },
          });
          supabase.removeChannel(broadcastChannel);
        } catch {}
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept connection.');
    } finally {
      setConnActionLoading(false);
    }
  };

  const handleRejectConnection = async () => {
    if (!connInfo.connectionId || !currentUser?.id) return;
    setConnActionLoading(true);
    try {
      const res = await respondConnectionRequest(connInfo.connectionId, 'REJECT', currentUser.id);
      if (res.success) {
        setConnInfo({
          status: null,
          isSender: false,
          isReceiver: false,
          connectionId: null,
        });
        window.dispatchEvent(new CustomEvent('connections_updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to decline connection.');
    } finally {
      setConnActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connInfo.connectionId || !currentUser?.id) return;
    if (!window.confirm('Are you sure you want to disconnect from this user?')) return;
    setConnActionLoading(true);
    try {
      const checkTargetId = targetId || profileUser?.id || '';
      await removeConnection(connInfo.connectionId, currentUser.id, checkTargetId);
      setConnInfo({
        status: null,
        isSender: false,
        isReceiver: false,
        connectionId: null,
      });
      const newCount = await fetchConnectionCount(checkTargetId);
      setConnectionsCount(newCount);

      // Broadcast removal
      window.dispatchEvent(new CustomEvent('connections_updated'));
      try {
        const broadcastChannel = supabase.channel('global-connections-broadcast');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'connection_changed',
          payload: {
            connectionId: connInfo.connectionId,
            userId: currentUser.id,
            action: 'REMOVED',
            timestamp: new Date().toISOString(),
          },
        });
        supabase.removeChannel(broadcastChannel);
      } catch {}
    } catch (err: any) {
      alert(err.message || 'Failed to remove connection.');
    } finally {
      setConnActionLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const exps = formData.experiences || [];
    const serializedExp = JSON.stringify(exps);
    const selectedRole = normalizeRoleValue(formData.preferredRole || formData.role || 'STUDENT');
    const initialRole = normalizeRoleValue(formData.initialRole || selectedRole);
    const currentChangeCount = Number(formData.roleChangeCount) || 0;
    const isRoleChanging = selectedRole !== initialRole;

    if (isRoleChanging && currentChangeCount >= 3) {
      setSaveError('You have reached the maximum limit of 3 role changes. Your role is permanently locked.');
      setSaving(false);
      return;
    }

    const newRoleChangeCount = isRoleChanging ? currentChangeCount + 1 : currentChangeCount;

    // Validate username and 30-day restriction
    const cleanUsername = String(formData.username || '').trim().toLowerCase().replace(/^@/, '');
    const initialUsername = String(formData.initialUsername || '').trim().toLowerCase().replace(/^@/, '');
    const isUsernameChanging = cleanUsername && initialUsername && cleanUsername !== initialUsername;

    if (cleanUsername) {
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        setSaveError('Username must be between 3 and 30 characters and can only contain letters, numbers, and underscores.');
        setSaving(false);
        return;
      }
    }

    if (isUsernameChanging && formData.usernameChangedAt) {
      const changedTime = new Date(formData.usernameChangedAt).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const timePassed = Date.now() - changedTime;
      if (timePassed < thirtyDaysMs) {
        const daysRemaining = Math.ceil((thirtyDaysMs - timePassed) / (24 * 60 * 60 * 1000));
        setSaveError(`You can only change your username once every 30 days. You can change it again in ${daysRemaining} day(s).`);
        setSaving(false);
        return;
      }
    }

    const newUsernameChangedAt = isUsernameChanging ? new Date().toISOString() : formData.usernameChangedAt;

    // Validate headline
    const cleanHeadline = String(formData.headline || '').trim();
    const headlineWords = cleanHeadline.split(/\s+/).filter(Boolean).length;
    if (cleanHeadline && cleanHeadline.length < 3) {
      setSaveError('Headline must be at least 3 characters.');
      setSaving(false);
      return;
    }
    if (headlineWords > 50) {
      setSaveError('Headline cannot exceed 50 words.');
      setSaving(false);
      return;
    }

    // Validate one-line bio
    const cleanOneLine = String(formData.oneLineBio || '').trim();
    if (cleanOneLine && cleanOneLine.length < 3) {
      setSaveError('One-line bio must be at least 3 characters.');
      setSaving(false);
      return;
    }
    if (cleanOneLine && cleanOneLine.length > 160) {
      setSaveError('One-line bio cannot exceed 160 characters.');
      setSaving(false);
      return;
    }

    const serializedAchievements = (formData.hackathons?.length > 0 || formData.projects?.length > 0)
      ? JSON.stringify({
          hackathons: formData.hackathons || [],
          projects: formData.projects || [],
          raw: typeof formData.achievements === 'string' && !formData.achievements.startsWith('{') ? formData.achievements : '',
        })
      : (formData.achievements || '');

    try {
      if (!currentUser?.id) {
        throw new Error('You must be logged in to save your profile.');
      }

      // 1. Update Supabase public.profiles table
      let savedProfileRow: any = null;
      try {
        savedProfileRow = await upsertUserProfile(currentUser.id, {
          full_name: formData.fullName,
          username: cleanUsername,
          username_changed_at: newUsernameChangedAt,
          headline: formData.headline,
          one_line_bio: formData.oneLineBio || formData.headline,
          location: formData.location,
          bio: formData.bio,
          avatar: formData.avatar,
          cover_image: formData.coverImage,
          skills: formData.skills,
          startup_interests: formData.startupInterests,
          industries: formData.industries,
          preferred_role: selectedRole,
          role_change_count: newRoleChangeCount,
          is_category_selected: true,
          availability: formData.availability,
          startup_experience: serializedExp,
          achievements: serializedAchievements,
          education: formData.education,
          github_url: formData.githubUrl,
          linkedin_url: formData.linkedinUrl,
          website_url: formData.websiteUrl,
          open_to: formData.openTo,
          email: currentUser.email,
        });
      } catch (sbErr: any) {
        console.warn('Direct Supabase profile update error:', sbErr);
      }

      // 2. Authoritatively update backend API (which syncs to SQLite/Prisma & Supabase Admin with service-role privileges)
      let updatedUser: User | null = null;
      try {
        const res = await api.updateProfile({
          ...formData,
          username: cleanUsername,
          usernameChangedAt: newUsernameChangedAt,
          startupExperience: serializedExp,
          preferredRole: selectedRole,
          role: selectedRole,
          roleChangeCount: newRoleChangeCount,
          isCategorySelected: true,
          email: currentUser.email,
        });
        if (res?.user) updatedUser = res.user;
      } catch (backendErr: any) {
        console.warn('Backend profile mirror warning:', backendErr);
        if (!savedProfileRow && backendErr?.response?.data?.error) {
          throw new Error(backendErr.response.data.error);
        }
      }

      if (!savedProfileRow && !updatedUser) {
        throw new Error('Failed to update profile. Please try again.');
      }

      const authoritativeUser: User = {
        ...(updatedUser || profileUser || currentUser),
        username: savedProfileRow?.username || cleanUsername || currentUser.username,
        role: savedProfileRow?.preferred_role || selectedRole,
        roleChangeCount: savedProfileRow?.role_change_count ?? newRoleChangeCount,
        profile: {
          ...(profileUser?.profile || currentUser.profile || {}),
          ...(updatedUser?.profile || {}),
          ...formData,
          fullName: savedProfileRow?.full_name || formData.fullName,
          username: savedProfileRow?.username || cleanUsername,
          usernameChangedAt: savedProfileRow?.username_changed_at || newUsernameChangedAt,
          username_changed_at: savedProfileRow?.username_changed_at || newUsernameChangedAt,
          headline: savedProfileRow?.headline || formData.headline,
          oneLineBio: savedProfileRow?.one_line_bio || formData.oneLineBio,
          location: savedProfileRow?.location || formData.location,
          bio: savedProfileRow?.bio || formData.bio,
          avatar: savedProfileRow?.avatar || formData.avatar,
          coverImage: savedProfileRow?.cover_image || formData.coverImage,
          skills: savedProfileRow?.skills || formData.skills,
          startupInterests: savedProfileRow?.startup_interests || formData.startupInterests,
          industries: savedProfileRow?.industries || formData.industries,
          preferredRole: savedProfileRow?.preferred_role || selectedRole,
          roleChangeCount: savedProfileRow?.role_change_count ?? newRoleChangeCount,
          role_change_count: savedProfileRow?.role_change_count ?? newRoleChangeCount,
          availability: savedProfileRow?.availability || formData.availability,
          startupExperience: savedProfileRow?.startup_experience || serializedExp,
          achievements: savedProfileRow?.achievements || formData.achievements,
          education: savedProfileRow?.education || formData.education,
          githubUrl: savedProfileRow?.github_url || formData.githubUrl,
          linkedinUrl: savedProfileRow?.linkedin_url || formData.linkedinUrl,
          websiteUrl: savedProfileRow?.website_url || formData.websiteUrl,
          openTo: savedProfileRow?.open_to || formData.openTo,
          isCategorySelected: true,
        },
      };

      setFormData((prev: any) => ({
        ...prev,
        ...formData,
        fullName: savedProfileRow?.full_name || formData.fullName,
        username: savedProfileRow?.username || cleanUsername,
        initialUsername: savedProfileRow?.username || cleanUsername,
        usernameChangedAt: savedProfileRow?.username_changed_at || newUsernameChangedAt,
        startupExperience: serializedExp,
        preferredRole: savedProfileRow?.preferred_role || selectedRole,
        role: savedProfileRow?.preferred_role || selectedRole,
        initialRole: savedProfileRow?.preferred_role || selectedRole,
        roleChangeCount: savedProfileRow?.role_change_count ?? newRoleChangeCount,
      }));

      setProfileUser(authoritativeUser);
      if (isMe && currentUser) {
        updateUser(authoritativeUser);
      }
      setEditOpen(false);
      setPhotoSavedNotice('Profile changes saved successfully!');
      setTimeout(() => setPhotoSavedNotice(null), 4000);
      window.dispatchEvent(new CustomEvent('profile_updated', { detail: authoritativeUser }));
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Skeleton Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-6">
              <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 py-20 px-4 text-center font-sans">
        <SEO title="Profile Not Found | HookZ" noindex={true} />
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Profile Not Found</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            This founder or member profile is unavailable or may have been removed.
          </p>
          <Link
            to="/cofounders"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors"
          >
            Explore Talent Directory
          </Link>
        </div>
      </div>
    );
  }

  const p = profileUser?.profile || ({} as Profile);
  const displayName = p.fullName || profileUser?.email || 'Startup Founder';
  const initials = String(displayName)
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0] || '')
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'SZ';
  const avatar = p.avatar;
  const hasCustomAvatar = Boolean(
    avatar &&
    typeof avatar === 'string' &&
    avatar.trim() !== '' &&
    !avatar.includes('dicebear.com') &&
    !avatar.includes('avataaars')
  );
  const hasCustomCover = Boolean(
    p.coverImage &&
    typeof p.coverImage === 'string' &&
    p.coverImage.trim() !== ''
  );
  const skillsList = p.skills ? p.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const openToList = p.openTo ? p.openTo.split(',').map((o) => o.trim()).filter(Boolean) : [];
  const interestsList = p.startupInterests
    ? p.startupInterests.split(',').map((i) => i.trim()).filter(Boolean)
    : [];
  const parsedExperiences = parseWorkExperiences(p.startupExperience);
  let parsedHackathons: any[] = [];
  let parsedProjects: any[] = [];
  try {
    if (p.achievements) {
      const achObj = JSON.parse(p.achievements);
      if (achObj && typeof achObj === 'object') {
        if (Array.isArray(achObj.hackathons)) parsedHackathons = achObj.hackathons;
        if (Array.isArray(achObj.projects)) parsedProjects = achObj.projects;
      }
    }
  } catch {}

  // Calculate profile completion percentage
  let completedFields = 0;
  const totalFields = 6;
  if (p.avatar) completedFields++;
  if (p.headline) completedFields++;
  if (p.bio) completedFields++;
  if (skillsList.length > 0) completedFields++;
  if (parsedExperiences.length > 0 || p.startupExperience) completedFields++;
  if (profileUser.startups && profileUser.startups.length > 0) completedFields++;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 py-4 sm:py-8 px-2.5 sm:px-6 lg:px-8 font-sans transition-colors selection:bg-brand-600 selection:text-white w-full max-w-full overflow-x-hidden">
      {isMe ? (
        <SEO title="Your Profile | HookZ" noindex={true} />
      ) : (
        <SEO
          title={`${p.fullName || 'Builder Profile'} | HookZ Network`}
          description={p.headline || p.oneLineBio || p.bio || `Connect with ${p.fullName || 'builders'} on HookZ.`}
          canonicalPath={`/profile/${id}`}
          ogType="profile"
          ogImage={avatar || undefined}
          breadcrumbs={[
            { name: 'Community', path: '/cofounders' },
            { name: p.fullName || 'Profile', path: `/profile/${id}` },
          ]}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 w-full overflow-x-hidden">

        {/* Success Notice Banner */}
        {photoSavedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{photoSavedNotice}</span>
            </div>
            <button
              onClick={() => setPhotoSavedNotice(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1. TOP HERO / COVER & MAIN PROFILE CARD */}
        <div className="card-base overflow-hidden">
          
          {/* Cover Section */}
          <div className="h-44 sm:h-52 relative overflow-hidden bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700">
            {p.coverImage ? (
              <img
                src={p.coverImage}
                alt="Profile Cover Banner"
                className="w-full h-full object-cover"
                decoding="async"
              />
            ) : (
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            )}

            <div className="absolute top-4 right-4 flex items-center gap-2 z-10 flex-wrap justify-end">
              {!isMe && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white backdrop-blur-xs transition-colors cursor-pointer"
                  title="Report user"
                >
                  <Flag size={15} />
                </button>
              )}
              {isMe && (
                <>
                  {hasCustomCover && (
                    <button
                      onClick={() => handleRemovePhoto('cover')}
                      disabled={isRemovingPhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white backdrop-blur-xs text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      title="Remove background cover image"
                    >
                      <Trash2 size={13} />
                      <span className="hidden xs:inline">Remove Cover</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRequestGalleryPermission('cover')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    title="Change background cover image from gallery"
                  >
                    <Camera size={14} />
                    <span className="hidden xs:inline">{p.coverImage ? 'Change Cover' : 'Add Cover'}</span>
                  </button>
                  <button
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-semibold transition-all shadow-xs hover:bg-slate-50 cursor-pointer"
                  >
                    <Edit3 size={14} className="text-brand-600" />
                    <span>Edit Profile</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Profile Header Row with solid white background so details never overlap cover image */}
          <div className="px-6 sm:px-8 pb-6 pt-3 relative bg-white dark:bg-dark-900 border-t border-slate-100 dark:border-dark-800">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-6">
              
              {/* Profile Photo */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5 w-full md:w-auto">
                <div className="relative shrink-0 group -mt-16 sm:-mt-20">
                  {hasCustomAvatar ? (
                    <img
                      src={avatar!}
                      alt={displayName}
                      decoding="async"
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-dark-900 shadow-md bg-white"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-dark-900 shadow-md bg-brand-600 text-white flex flex-col items-center justify-center font-bold">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-wider">{initials}</span>
                    </div>
                  )}
                  {isMe && (
                    <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                      {hasCustomAvatar && (
                        <button
                          onClick={() => handleRemovePhoto('avatar')}
                          disabled={isRemovingPhoto}
                          className="p-1.5 rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                          title="Remove profile photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRequestGalleryPermission('avatar')}
                        className="p-1.5 rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition-colors cursor-pointer"
                        title="Change profile photo"
                      >
                        <Camera size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {displayName}
                    </h1>
                    {(profileUser?.username || p.username) && (
                      <span className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-0.5 rounded-md border border-brand-100 dark:border-brand-900/50">
                        @{profileUser?.username || p.username}
                      </span>
                    )}
                    <VerificationBadge badge={profileUser.verificationBadge} isVerified={profileUser.isVerified} />
                    {isMe && <RoleBadge role={profileUser.role} />}
                  </div>

                  <p className="text-sm sm:text-base font-normal text-slate-600 dark:text-slate-300">
                    {p.headline || (isMe ? 'Add your headline (e.g. CS Sophomore | Full Stack Builder)' : 'Student Builder at HookZ')}
                  </p>

                  {p.oneLineBio && (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {p.oneLineBio}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                    {p.education && (
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <GraduationCap size={15} className="text-brand-600" />
                        <span>{p.education}</span>
                      </span>
                    )}
                    {p.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={15} className="text-brand-600" />
                        <span>{p.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{p.availability || 'Available for Hackathons'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap pt-2 md:pt-0">
                {!isMe && (
                  <>
                    {isBlocked ? (
                      <button
                        onClick={handleToggleBlock}
                        disabled={blockingLoading}
                        className="flex-1 sm:flex-none btn-danger inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold cursor-pointer"
                      >
                        <UserX size={14} />
                        <span>Unblock User</span>
                      </button>
                    ) : (
                      <>
                        {connInfo.status === 'ACCEPTED' ? (
                          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                            <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check size={14} />
                              <span>Connected</span>
                            </span>
                            <button
                              onClick={handleDisconnect}
                              disabled={connActionLoading}
                              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                              title="Remove connection"
                            >
                              <UserX size={14} />
                            </button>
                          </div>
                        ) : connInfo.status === 'PENDING' ? (
                          connInfo.isSender ? (
                            <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={14} />
                              <span>Request Sent</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                              <button
                                onClick={handleAcceptConnection}
                                disabled={connActionLoading}
                                className="btn-primary inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
                              >
                                <Check size={14} />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={handleRejectConnection}
                                disabled={connActionLoading}
                                className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
                              >
                                <X size={14} />
                                <span>Reject</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => setConnectOpen(true)}
                            className="flex-1 sm:flex-none btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer"
                          >
                            <UserPlus size={15} />
                            <span>Connect</span>
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/messages?user=${profileUser.id}`)}
                          className="flex-1 sm:flex-none btn-secondary inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium cursor-pointer"
                        >
                          <MessageSquare size={15} />
                          <span>Chat</span>
                        </button>
                        <button
                          onClick={() => setStartupProposalOpen(true)}
                          className="flex-1 sm:flex-none btn-secondary inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium cursor-pointer"
                          title="Pitch an idea"
                        >
                          <Rocket size={15} className="text-brand-600" />
                          <span>Pitch</span>
                        </button>
                        <button
                          onClick={() => setBlockModalOpen(true)}
                          className="flex-1 sm:flex-none p-2 rounded-xl border border-slate-200 dark:border-dark-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                          title="Block this user"
                        >
                          <UserX size={15} />
                        </button>
                      </>
                    )}
                  </>
                )}

                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="flex-1 sm:flex-none btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 size={15} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Statistics Row (ONLY Connections & Verified Skills, REMOVED Startups Created) */}
            <div className="pt-4 border-t border-slate-100 dark:border-dark-800 grid grid-cols-2 gap-4 text-left">
              <button
                onClick={handleOpenConnectionsModal}
                className="group text-left cursor-pointer"
              >
                <div className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                  {connectionsCount}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-brand-600 transition-colors">
                  Connections
                </div>
              </button>

              <div className="border-l border-slate-100 dark:border-dark-800 pl-6">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {skillsList.length}
                </div>
                <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                  Verified Skills
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Photo Saved Success Banner */}
        {photoSavedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{photoSavedNotice}</span>
            </span>
            <button onClick={() => setPhotoSavedNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* User Blocked Alert Banner */}
        {isBlocked && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <UserX size={16} className="text-rose-600 shrink-0" />
              <span>You have blocked this user. They cannot send you messages or pitch requests.</span>
            </span>
            <button
              onClick={handleToggleBlock}
              className="text-xs font-bold text-rose-700 dark:text-rose-400 underline hover:no-underline cursor-pointer ml-3 shrink-0"
            >
              Unblock
            </button>
          </div>
        )}

        {/* 2. SECTIONS LAID OUT IN CARDS (ABOUT, POSTS, SKILLS, EXPERIENCE, EDUCATION, HACKATHON HISTORY, PROJECTS, SOCIAL LINKS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAIN COLUMN (LEFT 2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. ABOUT SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  About
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit About"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>
              {/* MOBILE VIEW (under About only keep skills) */}
              <div className="block sm:hidden space-y-2.5">
                {skillsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No skills added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50/80 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* DESKTOP VIEW: Full bio and interests */}
              <div className="hidden sm:block space-y-4">
                <p className="text-sm font-normal text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {p.bio || 'No background description shared yet. Add a short summary about your hackathon journey, interests, and what you are building!'}
                </p>

                {interestsList.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-dark-800 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Interests & Focus
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {interestsList.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 dark:bg-dark-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* POSTS & COMMUNITY UPDATES SECTION (Permanent until manually deleted) */}
            <div className="card-base p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 size={18} className="text-brand-600" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Posts & Updates
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400">
                    {userPosts.length}
                  </span>
                </div>
                {isMe && (
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>Create Post</span>
                  </Link>
                )}
              </div>

              {loadingPosts ? (
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="h-20 bg-slate-50 dark:bg-dark-850 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/60">
                            {post.postType || 'UPDATE'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {(isMe || currentUser?.isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            title="Delete this post permanently"
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-xs"
                          >
                            <Trash2 size={13} />
                            <span className="text-[11px]">Delete</span>
                          </button>
                        )}
                      </div>

                      {post.title && (
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {post.title}
                        </h3>
                      )}

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {post.content}
                      </p>

                      {post.links && (
                        <a
                          href={post.links.startsWith('http') ? post.links : `https://${post.links}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                        >
                          <ExternalLink size={12} />
                          <span className="truncate max-w-xs">{post.links}</span>
                        </a>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 dark:border-dark-800 flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={12} />
                          <span>{post.likesCount || 0} likes</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={12} />
                          <span>{post.commentsCount || 0} comments</span>
                        </span>
                        <Link
                          to="/feed"
                          className="text-brand-600 hover:underline ml-auto font-medium"
                        >
                          View in Feed →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-7 border border-dashed border-slate-200 dark:border-dark-800 rounded-xl space-y-2">
                  <Share2 size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isMe
                      ? "You haven't posted any updates yet. Share your milestones, learnings, or ask for feedback on the Feed!"
                      : "No posts or updates published by this builder yet."}
                  </p>
                  {isMe && (
                    <Link
                      to="/feed"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Plus size={13} />
                      <span>Post on Feed</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* 2. EXPERIENCE SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Briefcase size={18} className="text-brand-600" />
                  <span>Experience</span>
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Experience"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {parsedExperiences.length > 0 ? (
                <div className="relative pl-5 border-l-2 border-slate-200 dark:border-dark-800 space-y-5">
                  {parsedExperiences.map((exp, idx) => (
                    <div key={exp.id || idx} className="relative group">
                      <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white dark:border-dark-900" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {exp.category || p.preferredRole || 'Builder'}
                            </h3>
                            {exp.company && (
                              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/70 px-2 py-0.5 rounded border border-brand-200/60 dark:border-brand-900/60 font-mono">
                                {exp.company.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isMe && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExperienceDirect(idx)}
                              title="Delete experience"
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {exp.description && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-0.5 whitespace-pre-line leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                  <Briefcase size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No experience details added yet.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      + Add Experience
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. EDUCATION SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <GraduationCap size={18} className="text-brand-600" />
                  <span>Education</span>
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Education"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {p.education ? (
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50/70 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/50 flex items-center justify-center font-bold text-sm shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>{p.education}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      College / University Program
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                  <GraduationCap size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No education details listed.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      + Add Education
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. HACKATHON HISTORY SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Award size={18} className="text-brand-600" />
                    <span>Hackathon History</span>
                  </h2>
                  {parsedHackathons.length > 0 && (
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-full">
                      {parsedHackathons.length}
                    </span>
                  )}
                </div>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Hackathon History"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {parsedHackathons.length > 0 ? (
                <div className="space-y-3.5">
                  {parsedHackathons.map((hack: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850 hover:bg-white dark:hover:bg-dark-900 hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {hack.name || 'Hackathon Event'}
                            </h3>
                            {hack.award && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                                <Award size={12} className="text-amber-500" />
                                {hack.award}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            {hack.role && <span className="font-semibold text-brand-600">{hack.role}</span>}
                            {hack.project && <span>• Project: <strong className="text-slate-800 dark:text-slate-200">{hack.project}</strong></span>}
                            {hack.date && <span>• {hack.date}</span>}
                          </div>
                        </div>
                        {hack.link && (
                          <a
                            href={hack.link.startsWith('http') ? hack.link : `https://${hack.link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                          >
                            <span>Project Link</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                  <Award size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No hackathon history listed yet.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      + Add Hackathon
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 5. PROJECTS SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <FolderKanban size={18} className="text-brand-600" />
                    <span>Projects</span>
                  </h2>
                  {(parsedProjects.length > 0 || (profileUser.startups && profileUser.startups.length > 0)) && (
                    <span className="text-xs font-semibold text-brand-600 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-full">
                      {parsedProjects.length + (profileUser.startups?.length || 0)}
                    </span>
                  )}
                </div>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Projects"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {(parsedProjects.length > 0 || (profileUser.startups && profileUser.startups.length > 0)) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {parsedProjects.map((proj: any, idx: number) => (
                    <div
                      key={proj.id || idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850 hover:bg-white dark:hover:bg-dark-900 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {proj.name || 'Project'}
                        </h3>
                        {proj.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                        {proj.techStack && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.techStack.split(',').map((t: string, tidx: number) => (
                              <span
                                key={tidx}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-900/40"
                              >
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {(proj.githubUrl || proj.demoUrl) && (
                        <div className="pt-2 border-t border-slate-200/80 dark:border-dark-700/60 flex items-center gap-3 text-xs">
                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl.startsWith('http') ? proj.githubUrl : `https://${proj.githubUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600"
                            >
                              <span>Code</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {proj.demoUrl && (
                            <a
                              href={proj.demoUrl.startsWith('http') ? proj.demoUrl : `https://${proj.demoUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                            >
                              <span>Live Demo</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {profileUser.startups?.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850 hover:bg-white dark:hover:bg-dark-900 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-100">
                            {s.stage}
                          </span>
                          <span className="text-xs text-slate-500">{s.industry}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {s.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {s.oneLineDescription || 'Student venture.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-dark-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Founder</span>
                        <Link
                          to={`/startups/${s.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                        >
                          <span>View Project</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-xl">
                  <FolderKanban size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No projects added yet.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >
                      + Add Project
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (1/3 WIDTH) */}
          <div className="space-y-6">

            {/* PROFILE COMPLETENESS (FOR OWNER) */}
            {isMe && (
              <div className="card-base p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Profile Completeness
                  </h3>
                  <span className="text-xs font-bold text-brand-600">{completionPercentage}%</span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={p.avatar ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Profile photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={skillsList.length > 0 ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Skills listed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={parsedHackathons.length > 0 || parsedProjects.length > 0 ? 'text-emerald-600' : 'text-slate-300'} />
                    <span>Hackathons / Projects</span>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SKILLS SECTION */}
            <div className="card-base p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Skills
                  </h3>
                  <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {skillsList.length}
                  </span>
                </div>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Skills"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              {/* Quick Add Skill Input */}
              {isMe && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(newSkillInput);
                      }
                    }}
                    placeholder="Add skill (e.g. React, AI)..."
                    className="input-base flex-1 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={savingSkill || !newSkillInput.trim()}
                    onClick={() => handleAddSkill(newSkillInput)}
                    className="btn-primary px-3 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Skills Tags */}
              {skillsList.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-dark-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                    >
                      <span>{skill}</span>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 7. SOCIAL LINKS SECTION */}
            <div className="card-base p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe size={16} className="text-brand-600" />
                  <span>Social Links</span>
                </h3>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Social Links"
                  >
                    <Edit3 size={15} />
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl.startsWith('http') ? p.linkedinUrl : `https://${p.linkedinUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Globe size={14} className="text-brand-600" />
                      <span>LinkedIn</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl.startsWith('http') ? p.githubUrl : `https://${p.githubUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <ExternalLink size={14} className="text-brand-600" />
                      <span>GitHub</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}
                {p.websiteUrl && (
                  <a
                    href={p.websiteUrl.startsWith('http') ? p.websiteUrl : `https://${p.websiteUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Globe size={14} className="text-brand-600" />
                      <span>Personal Website</span>
                    </span>
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                )}
                {!p.linkedinUrl && !p.githubUrl && !p.websiteUrl && (
                  <p className="text-xs text-slate-400 py-1">No external social links added.</p>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Mobile Floating "Edit Profile" Button for Founder */}
      {isMe && (
        <div className="fixed sm:hidden bottom-5 right-5 z-40">
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] shadow-2xl shadow-indigo-600/60 border border-indigo-400/40 active:scale-95 transition-all cursor-pointer"
            aria-label="Edit Profile"
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isMe && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile Details" maxWidth="2xl">
          <form onSubmit={handleSaveProfile} className="space-y-4 font-sans">
            {/* --- SECTION 1: BASIC INFO --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Edit3 size={14} /> Basic Information & Branding
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Public details</span>
              </div>

              {/* Photos & Branding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Avatar Uploader */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Profile Photo (Avatar)
                  </label>
                  <div className="flex items-center gap-2">
                    {formData.avatar && !formData.avatar.includes('dicebear') && !formData.avatar.includes('avataaars') ? (
                      <img
                        src={formData.avatar}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-dark-700 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-brand-500/30">
                        {String(formData.fullName || displayName || 'SZ')
                          .split(' ')
                          .filter(Boolean)
                          .map((n: string) => n[0] || '')
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'SZ'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRequestGalleryPermission('avatar')}
                      className="btn-secondary flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Camera size={13} className="text-brand-600" />
                      <span>{formData.avatar && !formData.avatar.includes('dicebear') && !formData.avatar.includes('avataaars') ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    {formData.avatar && !formData.avatar.includes('dicebear') && !formData.avatar.includes('avataaars') && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('avatar')}
                        disabled={isRemovingPhoto}
                        className="px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title="Remove Profile Photo"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.avatar || ''}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="Or paste image URL"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>

                {/* Cover Uploader */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Background Cover Image
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-10 rounded-md bg-slate-800 overflow-hidden border border-slate-200 dark:border-dark-700 shrink-0">
                      {formData.coverImage ? (
                        <img src={formData.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRequestGalleryPermission('cover')}
                      className="btn-secondary flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <ImageIcon size={13} className="text-brand-600" />
                      <span>{formData.coverImage ? 'Change Cover' : 'Upload Cover'}</span>
                    </button>
                    {formData.coverImage && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('cover')}
                        disabled={isRemovingPhoto}
                        className="px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title="Remove Cover Image"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.coverImage || ''}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="Or paste cover URL"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Account Role Section (Max 3 edits allowed) */}
              {(() => {
                const currentCount = Number(formData.roleChangeCount) || 0;
                const chancesRemaining = Math.max(0, 3 - currentCount);
                const selectedRole = normalizeRoleValue(formData.preferredRole || formData.role || 'STUDENT');
                const initialRole = normalizeRoleValue(formData.initialRole || selectedRole);
                const isChanging = selectedRole !== initialRole;
                const isLocked = chancesRemaining <= 0;

                const currentRoleObj = PROFILE_ROLE_OPTIONS.find((r) => r.id === selectedRole);
                const initialRoleObj = PROFILE_ROLE_OPTIONS.find((r) => r.id === initialRole);

                return (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Users size={14} className="text-brand-600" />
                          <span>Account Role (I am joining as a)</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Your primary role on HookZ. Limited to 3 edits total.
                        </p>
                      </div>

                      {isLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                          <Lock size={11} className="text-amber-600 dark:text-amber-400" />
                          <span>Role Locked (3/3 used)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                          <Sparkles size={11} className="text-indigo-600 dark:text-indigo-400" />
                          <span>{chancesRemaining}/3 role {chancesRemaining === 1 ? 'change' : 'changes'} left</span>
                        </span>
                      )}
                    </div>

                    <select
                      value={selectedRole}
                      disabled={isLocked}
                      onChange={(e) => {
                        setFormData((prev: any) => ({
                          ...prev,
                          preferredRole: e.target.value,
                          role: e.target.value,
                        }));
                      }}
                      className="input-base w-full px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {PROFILE_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label} — {opt.desc}
                        </option>
                      ))}
                    </select>

                    {isLocked && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                        <Lock size={13} className="shrink-0 mt-0.5 text-amber-600" />
                        <span>Role permanently locked to <strong>{currentRoleObj?.label || selectedRole}</strong>.</span>
                      </div>
                    )}

                    {!isLocked && isChanging && (
                      <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-1.5">
                        <Sparkles size={13} className="shrink-0 mt-0.5 text-indigo-600" />
                        <span>Switching role from <strong>{initialRoleObj?.label || initialRole}</strong> to <strong>{currentRoleObj?.label || selectedRole}</strong> will use 1 chance.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Full Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  {(() => {
                    const initialUsername = String(formData.initialUsername || '').trim().toLowerCase().replace(/^@/, '');
                    const currentUsername = String(formData.username || '').trim().toLowerCase().replace(/^@/, '');
                    const changedAt = formData.usernameChangedAt ? new Date(formData.usernameChangedAt).getTime() : null;
                    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
                    const timePassed = changedAt ? Date.now() - changedAt : Infinity;
                    const isUsernameLocked = changedAt ? timePassed < thirtyDaysMs : false;
                    const daysRemaining = isUsernameLocked ? Math.ceil((thirtyDaysMs - timePassed) / (24 * 60 * 60 * 1000)) : 0;

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Username
                          </label>
                          {isUsernameLocked ? (
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Lock size={10} /> Locked ({daysRemaining}d)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">1 change / 30 days</span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 select-none">@</span>
                          <input
                            type="text"
                            value={formData.username || ''}
                            disabled={isUsernameLocked}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                            placeholder="username"
                            className="input-base w-full pl-7 pr-3 py-1.5 text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                        {isUsernameLocked && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                            Locked for {daysRemaining} more days.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Location */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Location</span>
                  {(() => {
                    const res = resolveIndianLocation(formData.location);
                    if (!res) return null;
                    return (
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                        {res.district ? `${res.district}, ` : ''}{res.state}
                      </span>
                    );
                  })()}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, location: val });
                      setLocationSuggestions(searchLocations(val));
                      setShowLocDropdown(true);
                    }}
                    onFocus={() => {
                      if (formData.location) {
                        setLocationSuggestions(searchLocations(formData.location));
                      }
                      setShowLocDropdown(true);
                    }}
                    placeholder="e.g. Bengaluru, Hyderabad, Delhi, or Remote"
                    className="input-base w-full px-3 py-1.5 text-xs pr-7"
                  />
                  {formData.location && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, location: '' });
                        setLocationSuggestions([]);
                        setShowLocDropdown(false);
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {showLocDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-lg shadow-xl py-1 text-xs">
                    {locationSuggestions.map((loc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const formatted = `${loc.district ? loc.district + ', ' : ''}${loc.state}, India`;
                          setFormData({ ...formData, location: formatted });
                          setShowLocDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {loc.district ? `${loc.district}, ` : ''}{loc.state}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-500 capitalize">
                          {loc.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Headline & One-liner with live character counts and validation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Headline</label>
                    <span className={`text-[10px] font-medium ${(formData.headline?.trim().split(/\s+/).filter(Boolean).length || 0) > 50 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                      {formData.headline?.trim().split(/\s+/).filter(Boolean).length || 0}/50 words
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.headline || ''}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    placeholder="e.g. CS Sophomore | Full-Stack Builder & Hackathon Enthusiast"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                  {formData.headline && formData.headline.trim().length > 0 && formData.headline.trim().length < 3 && (
                    <p className="text-[10px] text-rose-500 mt-1">Must be at least 3 characters</p>
                  )}
                  {formData.headline && (formData.headline.trim().split(/\s+/).filter(Boolean).length || 0) > 50 && (
                    <p className="text-[10px] text-rose-500 mt-1">Cannot exceed 50 words</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>One-Line Bio</span>
                    </label>
                    <span className={`text-[10px] font-medium ${(formData.oneLineBio?.length || 0) > 160 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                      {formData.oneLineBio?.length || 0}/160
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={160}
                    value={formData.oneLineBio || ''}
                    onChange={(e) => setFormData({ ...formData, oneLineBio: e.target.value })}
                    placeholder="e.g. Building AI tools & looking for hackathon teammates"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                  {formData.oneLineBio && formData.oneLineBio.trim().length > 0 && formData.oneLineBio.trim().length < 3 && (
                    <p className="text-[10px] text-rose-500 mt-1">Must be at least 3 characters</p>
                  )}
                </div>
              </div>
            </div>

            {/* --- SECTION 2: ABOUT & BIO (Up to 2000 chars) --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Edit3 size={14} /> About & Bio
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  {String(formData.bio || '').length} / 2000 chars
                </span>
              </div>
              <div>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell your story — what drives you, what technologies you love, hackathons you're interested in, and what projects you're building..."
                  className="input-base w-full p-2.5 text-xs leading-relaxed resize-y min-h-[90px]"
                />
              </div>
            </div>

            {/* --- SECTION 3: SKILLS (Tag-based multi-select) --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Skills & Expertise
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Tag-based multi-select</span>
              </div>

              {/* Selected Skill Badges */}
              {(() => {
                const currentSkills = (formData.skills || '')
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean);

                const popularSuggestions = [
                  'React', 'TypeScript', 'Node.js', 'Python', 'Next.js', 'UI/UX Design',
                  'Machine Learning', 'TailwindCSS', 'PostgreSQL', 'Docker', 'Figma',
                  'Flutter', 'DevOps', 'Mobile Dev', 'C++', 'Java', 'Full-Stack'
                ].filter(s => !currentSkills.some((c: string) => c.toLowerCase() === s.toLowerCase()));

                const handleAddSkill = (skillName: string) => {
                  const trimmed = skillName.trim();
                  if (!trimmed) return;
                  if (currentSkills.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) return;
                  const updated = [...currentSkills, trimmed].join(', ');
                  setFormData({ ...formData, skills: updated });
                };

                const handleRemoveSkill = (skillToRemove: string) => {
                  const updated = currentSkills.filter((s: string) => s.toLowerCase() !== skillToRemove.toLowerCase()).join(', ');
                  setFormData({ ...formData, skills: updated });
                };

                return (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      {currentSkills.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No skills added yet. Select or type below.</span>
                      ) : (
                        currentSkills.map((sk: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                          >
                            <span>{sk}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(sk)}
                              className="hover:text-red-500 cursor-pointer ml-0.5"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a skill & press Add..."
                        id="skill-custom-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              handleAddSkill(val);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="input-base flex-1 px-3 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('skill-custom-input') as HTMLInputElement;
                          if (input && input.value) {
                            handleAddSkill(input.value);
                            input.value = '';
                          }
                        }}
                        className="btn-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Popular Quick Suggestions */}
                    {popularSuggestions.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Quick Suggestions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {popularSuggestions.slice(0, 10).map((sugg) => (
                            <button
                              key={sugg}
                              type="button"
                              onClick={() => handleAddSkill(sugg)}
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:hover:bg-brand-950 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              + {sugg}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* --- SECTION 4: WORK EXPERIENCE --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Briefcase size={14} /> Experience & Roles
                </h4>
                <button
                  type="button"
                  onClick={handleAddExperienceItem}
                  className="px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Experience
                </button>
              </div>

              {(!formData.experiences || formData.experiences.length === 0) ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">No experiences added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.experiences.map((exp: any, idx: number) => (
                    <div
                      key={exp.id || idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Entry #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperienceItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Role / Title
                          </label>
                          <input
                            type="text"
                            value={exp.role || exp.company || ''}
                            onChange={(e) => handleUpdateExperienceItem(idx, 'company', e.target.value)}
                            placeholder="e.g. Lead Frontend Engineer"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Organization / Category
                          </label>
                          <select
                            value={exp.category || 'Developer'}
                            onChange={(e) => handleUpdateExperienceItem(idx, 'category', e.target.value)}
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          >
                            <option value="Student">Student Project</option>
                            <option value="Developer">Developer / Technical</option>
                            <option value="Designer">Designer / UI-UX</option>
                            <option value="Founders">Founder / Co-Founder</option>
                            <option value="Marketers">Marketer / Growth</option>
                            <option value="Investors">Investor</option>
                            <option value="Mentor">Mentor / Advisor</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Description of Work & Impact
                        </label>
                        <textarea
                          rows={2}
                          value={exp.description || ''}
                          onChange={(e) => handleUpdateExperienceItem(idx, 'description', e.target.value)}
                          placeholder="What did you build, scale, or contribute?"
                          className="input-base w-full px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- SECTION 5: EDUCATION --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <GraduationCap size={14} /> Education & College
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Degree & institution</span>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College / University (Indian Autocomplete)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.education || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, education: val });
                      setCollegeSuggestions(searchColleges(val));
                      setShowCollegeDropdown(true);
                    }}
                    onFocus={() => {
                      if (formData.education) {
                        setCollegeSuggestions(searchColleges(formData.education));
                      }
                      setShowCollegeDropdown(true);
                    }}
                    placeholder="Institution name, degree (e.g. NIAT, IIT Madras, NIT Trichy, BITS Pilani)..."
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
                {showCollegeDropdown && collegeSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-lg shadow-xl py-1 text-xs">
                    {collegeSuggestions.map((col, idx) => {
                      const colName = typeof col === 'string' ? col : col?.name || '';
                      const colCategory = typeof col === 'string' ? 'COLLEGE' : (col?.category || 'COLLEGE').toUpperCase();
                      const colCity = typeof col === 'object' && col?.city ? col.city : '';
                      const colState = typeof col === 'object' && col?.state ? col.state : '';
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, education: `${colName} (${colCategory})` });
                            setShowCollegeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 flex items-center justify-between cursor-pointer"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{colName}</span>
                            {(colCity || colState) && (
                              <span className="text-slate-400 ml-1">({[colCity, colState].filter(Boolean).join(', ')})</span>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold shrink-0">
                            {colCategory}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* --- SECTION 6: HACKATHON HISTORY --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Award size={14} /> Hackathon History & Awards
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(formData.hackathons || [])];
                    list.push({ id: `hack-${Date.now()}`, name: '', date: '', result: '', link: '' });
                    setFormData({ ...formData, hackathons: list });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Hackathon
                </button>
              </div>

              {(!formData.hackathons || formData.hackathons.length === 0) ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">No hackathons added yet. Add past hackathons or wins.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.hackathons.map((hack: any, idx: number) => (
                    <div
                      key={hack.id || idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Hackathon #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...(formData.hackathons || [])];
                            list.splice(idx, 1);
                            setFormData({ ...formData, hackathons: list });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Hackathon Name
                          </label>
                          <input
                            type="text"
                            value={hack.name || ''}
                            onChange={(e) => {
                              const list = [...(formData.hackathons || [])];
                              list[idx] = { ...list[idx], name: e.target.value };
                              setFormData({ ...formData, hackathons: list });
                            }}
                            placeholder="e.g. Smart India Hackathon, ETHIndia"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Result / Award
                          </label>
                          <input
                            type="text"
                            value={hack.result || ''}
                            onChange={(e) => {
                              const list = [...(formData.hackathons || [])];
                              list[idx] = { ...list[idx], result: e.target.value };
                              setFormData({ ...formData, hackathons: list });
                            }}
                            placeholder="e.g. 1st Place Winner, Top 10 Finalist"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Date / Year
                          </label>
                          <input
                            type="text"
                            value={hack.date || ''}
                            onChange={(e) => {
                              const list = [...(formData.hackathons || [])];
                              list[idx] = { ...list[idx], date: e.target.value };
                              setFormData({ ...formData, hackathons: list });
                            }}
                            placeholder="e.g. Nov 2024"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Project / Devpost Link
                          </label>
                          <input
                            type="url"
                            value={hack.link || ''}
                            onChange={(e) => {
                              const list = [...(formData.hackathons || [])];
                              list[idx] = { ...list[idx], link: e.target.value };
                              setFormData({ ...formData, hackathons: list });
                            }}
                            placeholder="https://devpost.com/software/..."
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- SECTION 7: PROJECTS --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <FolderKanban size={14} /> Projects & Showcase
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(formData.projects || [])];
                    list.push({ id: `proj-${Date.now()}`, name: '', description: '', techStack: '', githubUrl: '', demoUrl: '' });
                    setFormData({ ...formData, projects: list });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 rounded border border-brand-200 dark:border-brand-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Project
                </button>
              </div>

              {(!formData.projects || formData.projects.length === 0) ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500">No projects added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.projects.map((proj: any, idx: number) => (
                    <div
                      key={proj.id || idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Project #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...(formData.projects || [])];
                            list.splice(idx, 1);
                            setFormData({ ...formData, projects: list });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Project Name
                          </label>
                          <input
                            type="text"
                            value={proj.name || ''}
                            onChange={(e) => {
                              const list = [...(formData.projects || [])];
                              list[idx] = { ...list[idx], name: e.target.value };
                              setFormData({ ...formData, projects: list });
                            }}
                            placeholder="e.g. AI Code Reviewer"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Tech Stack
                          </label>
                          <input
                            type="text"
                            value={proj.techStack || ''}
                            onChange={(e) => {
                              const list = [...(formData.projects || [])];
                              list[idx] = { ...list[idx], techStack: e.target.value };
                              setFormData({ ...formData, projects: list });
                            }}
                            placeholder="e.g. React, Node.js, OpenAI, Supabase"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={proj.description || ''}
                          onChange={(e) => {
                            const list = [...(formData.projects || [])];
                            list[idx] = { ...list[idx], description: e.target.value };
                            setFormData({ ...formData, projects: list });
                          }}
                          placeholder="Explain what the project does and its core features..."
                          className="input-base w-full px-2.5 py-1.5 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            GitHub Repo URL
                          </label>
                          <input
                            type="url"
                            value={proj.githubUrl || ''}
                            onChange={(e) => {
                              const list = [...(formData.projects || [])];
                              list[idx] = { ...list[idx], githubUrl: e.target.value };
                              setFormData({ ...formData, projects: list });
                            }}
                            placeholder="https://github.com/..."
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Live Demo URL
                          </label>
                          <input
                            type="url"
                            value={proj.demoUrl || ''}
                            onChange={(e) => {
                              const list = [...(formData.projects || [])];
                              list[idx] = { ...list[idx], demoUrl: e.target.value };
                              setFormData({ ...formData, projects: list });
                            }}
                            placeholder="https://myproject.vercel.app"
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- SECTION 8: SOCIAL LINKS --- */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Globe size={14} /> Social & Portfolio Links
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Connect external profiles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={formData.githubUrl || ''}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedinUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Twitter / X URL</label>
                  <input
                    type="url"
                    value={formData.startupInterests || ''}
                    onChange={(e) => setFormData({ ...formData, startupInterests: e.target.value })}
                    placeholder="https://x.com/username"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Portfolio / Website URL</label>
                  <input
                    type="url"
                    value={formData.websiteUrl || ''}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourportfolio.dev"
                    className="input-base w-full px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {saveError && (
              <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900">
                {saveError}
              </div>
            )}

            {/* Danger Zone: Permanent Account Deletion */}
            <div className="p-3.5 rounded-lg bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 mt-4">
              <div>
                <h5 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>Danger Zone: Permanent Account Deletion</span>
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Permanently erase your student profile, ideas, messages, and connections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditOpen(false);
                  setDeleteAccountModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-dark-900 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 transition-colors cursor-pointer shrink-0"
              >
                Delete Account
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-800 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="btn-secondary px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modals */}
      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        targetUser={profileUser}
        user={profileUser}
        onSuccess={fetchUserProfile}
      />

      <StartupConnectionModal
        isOpen={startupProposalOpen}
        onClose={() => setStartupProposalOpen(false)}
        targetUser={profileUser}
        onSuccess={fetchUserProfile}
      />


      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="USER"
        targetId={profileUser.id}
        targetTitle={displayName}
      />

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteAccountModalOpen}
        onClose={() => {
          if (!isDeletingAccount) {
            setDeleteAccountModalOpen(false);
            setDeleteConfirmText('');
            setDeleteError(null);
          }
        }}
        title="Permanently Delete Account"
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3">
            <AlertOctagon size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                Warning: This action cannot be undone
              </h4>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                Deleting your account will immediately remove your profile, startups, pitch proposals, connections, conversations, and all saved items forever.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Type <span className="font-mono text-red-600 dark:text-red-400 font-bold">delete</span> below to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => {
                setDeleteConfirmText(e.target.value);
                setDeleteError(null);
              }}
              placeholder='Type "delete"'
              className="input-base w-full px-3 py-2 text-xs font-mono"
            />
          </div>

          {deleteError && (
            <div className="p-2.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-medium">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isDeletingAccount}
              onClick={() => {
                setDeleteAccountModalOpen(false);
                setDeleteConfirmText('');
                setDeleteError(null);
              }}
              className="btn-secondary px-3.5 py-2 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingAccount || deleteConfirmText.trim().toLowerCase() !== 'delete'}
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isDeletingAccount ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Deleting Account...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Hidden File Inputs for Device Gallery Picking */}
      <input
        type="file"
        ref={avatarFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilePicked(e, 'avatar')}
      />
      <input
        type="file"
        ref={coverFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilePicked(e, 'cover')}
      />

      {/* 1. GALLERY PERMISSION MODAL */}
      <Modal
        isOpen={galleryPermissionOpen}
        onClose={() => setGalleryPermissionOpen(false)}
        title="Permission Required"
        maxWidth="md"
      >
        <div className="text-center space-y-4 py-2 font-sans">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] mx-auto flex items-center justify-center shadow-inner">
            <Camera size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Access Device Photo Gallery
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed px-2">
              HookZ requires your permission to access your device gallery/photos to select a{' '}
              <span className="font-bold text-[#4F46E5]">
                {targetImageType === 'avatar' ? 'profile photo' : 'background cover image'}
              </span>
              . You will review the selected image before it is kept and saved.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGalleryPermissionOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGrantGalleryPermission}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
            >
              Allow & Open Gallery
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. CONFIRM & KEEP PHOTO MODAL */}
      <Modal
        isOpen={confirmPhotoModalOpen}
        onClose={() => {
          if (!isSavingPhoto) {
            setConfirmPhotoModalOpen(false);
            setPreviewPhotoUrl('');
          }
        }}
        title={`Confirm & Keep ${targetImageType === 'avatar' ? 'Profile Photo' : 'Background Cover'}`}
        maxWidth="md"
      >
        <div className="space-y-4 py-2 font-sans">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review your selected image. Only after your permission and confirmation will this photo be kept on your profile.
          </p>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            {targetImageType === 'avatar' ? (
              <img
                src={previewPhotoUrl}
                alt="Selected Avatar Preview"
                className="w-36 h-36 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-xl"
              />
            ) : (
              <img
                src={previewPhotoUrl}
                alt="Selected Cover Preview"
                className="w-full h-44 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-md"
              />
            )}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSavingPhoto}
              onClick={() => {
                setConfirmPhotoModalOpen(false);
                setPreviewPhotoUrl('');
                handleRequestGalleryPermission(targetImageType);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Choose Another
            </button>
            <button
              type="button"
              disabled={isSavingPhoto}
              onClick={handleConfirmKeepPhoto}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSavingPhoto ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Photo...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Proceed & Keep Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== CONNECTIONS LIST MODAL ===================== */}
      {connectionsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setConnectionsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-dark-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-dark-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Connections ({connectionsCount})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMe ? 'Your network connections' : `${(profileUser?.profile as any)?.fullName?.split(' ')[0] || 'Their'}'s connections`}
                </p>
              </div>
              <button
                onClick={() => setConnectionsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-dark-800">
              {connectionsListLoading ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Loading connections...</p>
                </div>
              ) : connectionsList.length === 0 ? (
                <div className="py-12 text-center px-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center mb-3">
                    <Users size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No connections yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isMe ? 'Start connecting with other founders and builders!' : 'This member has no connections yet.'}
                  </p>
                </div>
              ) : (
                connectionsList.map((conn) => (
                  <div
                    key={conn.connectionId}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-dark-850 transition-colors"
                  >
                    {/* Avatar */}
                    <Link
                      to={`/profile/${conn.userId}`}
                      onClick={() => setConnectionsModalOpen(false)}
                      className="shrink-0"
                    >
                      {conn.avatar ? (
                        <img
                          src={conn.avatar}
                          alt={conn.fullName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-dark-900 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                          {(conn?.fullName?.charAt?.(0) || 'U').toUpperCase()}
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${conn.userId}`}
                        onClick={() => setConnectionsModalOpen(false)}
                        className="font-semibold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors block truncate"
                      >
                        {conn.fullName}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conn.headline || conn.preferredRole}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setConnectionsModalOpen(false);
                          navigate(`/messages?user=${conn.userId}`);
                        }}
                        className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-950 transition-colors"
                        title="Chat"
                      >
                        <MessageSquare size={14} />
                      </button>
                      {/* Only show Remove button if viewing own profile */}
                      {isMe && (
                        <button
                          onClick={() => handleRemoveFromModal(conn.connectionId)}
                          disabled={removingConnId === conn.connectionId}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          title="Remove connection"
                        >
                          {removingConnId === conn.connectionId ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserX size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            {isMe && (
              <div className="p-3 border-t border-slate-100 dark:border-dark-800 bg-slate-50/60 dark:bg-dark-850/50">
                <Link
                  to="/network"
                  onClick={() => setConnectionsModalOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                >
                  <Users size={14} />
                  <span>Manage All Connections in Network</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block User Confirmation Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={isBlocked ? "Unblock User" : "Block User"}
      >
        <div className="space-y-4 py-2 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isBlocked
                  ? `Unblock ${(profileUser?.profile as any)?.fullName || 'this user'}?`
                  : `Block ${(profileUser?.profile as any)?.fullName || 'this user'}?`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBlocked
                  ? "They will be able to view your profile, send messages, and connect with you again."
                  : "They will not be able to message you, pitch ideas, or see your activity. You can unblock them at any time."}
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
              disabled={blockingLoading}
              onClick={handleToggleBlock}
              className={`py-2 px-4 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-50 ${
                isBlocked ? 'bg-brand-600 hover:bg-brand-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {blockingLoading ? 'Processing...' : isBlocked ? 'Confirm Unblock' : 'Confirm Block'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
