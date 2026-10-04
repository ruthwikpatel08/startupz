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
import { ScheduleMeetingModal } from '../../components/common/ScheduleMeetingModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Modal } from '../../components/common/Modal';
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
} from 'lucide-react';

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
      setFormData({
        avatar: currentP.avatar || '',
        coverImage: currentP.coverImage || '',
        fullName: currentP.fullName || '',
        headline: currentP.headline || '',
        oneLineBio: currentP.oneLineBio || currentP.headline || '',
        location: currentP.location || '',
        bio: currentP.bio || '',
        skills: currentP.skills || '',
        startupInterests: currentP.startupInterests || '',
        industries: currentP.industries || '',
        preferredRole: currentP.preferredRole || 'Founders',
        availability: currentP.availability || 'Full-time',
        startupExperience: currentP.startupExperience || '',
        experiences: exps.length > 0 ? exps : [
          {
            id: `exp-${Date.now()}`,
            category: currentP.preferredRole || 'Founders',
            company: '',
            description: currentP.startupExperience && !currentP.startupExperience.startsWith('[') ? currentP.startupExperience : '',
          },
        ],
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
        await supabase
          .from('profiles')
          .update({ startup_experience: serializedExp })
          .eq('user_id', currentUser.id);
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
  const [meetingOpen, setMeetingOpen] = useState(false);
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
      const res = await api.updateProfile({ skills: updatedSkills });
      setProfileUser(res.user);
      if (isMe && currentUser) {
        updateUser(res.user);
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
      const res = await api.updateProfile({ skills: updatedSkills });
      setProfileUser(res.user);
      if (isMe && currentUser) {
        updateUser(res.user);
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

  const fetchUserProfile = async () => {
    if (!targetId) return;
    setLoading(true);

    if (isMe && currentUser?.profile) {
      setProfileUser(currentUser);
      setFormData({
        avatar: currentUser.profile?.avatar || '',
        coverImage: currentUser.profile?.coverImage || '',
        fullName: currentUser.profile?.fullName || '',
        headline: currentUser.profile?.headline || '',
        oneLineBio: currentUser.profile?.oneLineBio || currentUser.profile?.headline || '',
        location: currentUser.profile?.location || '',
        bio: currentUser.profile?.bio || '',
        skills: currentUser.profile?.skills || '',
        startupInterests: currentUser.profile?.startupInterests || '',
        industries: currentUser.profile?.industries || '',
        preferredRole: currentUser.profile?.preferredRole || '',
        availability: currentUser.profile?.availability || 'Full-time',
        startupExperience: currentUser.profile?.startupExperience || '',
        achievements: currentUser.profile?.achievements || '',
        education: currentUser.profile?.education || '',
        githubUrl: currentUser.profile?.githubUrl || '',
        linkedinUrl: currentUser.profile?.linkedinUrl || '',
        websiteUrl: currentUser.profile?.websiteUrl || '',
        openTo: currentUser.profile?.openTo || 'Co-Founder, Startup Team, Mentorship',
      });
    }

    try {
      const [backendRes, sbProfile] = await Promise.all([
        api.getUser(targetId).catch(() => null),
        fetchUserProfileFromSupabase(targetId).catch(() => null),
      ]);
      const backendData = backendRes?.user || backendRes;

      if (sbProfile) {
        const u: any = {
          id: sbProfile.user_id || targetId,
          email: sbProfile.email || currentUser?.email || '',
          role: sbProfile.preferred_role || currentUser?.role || 'FOUNDER',
          isVerified: true,
          verificationBadge: sbProfile.auth_provider === 'google' ? 'Verified via Google' : 'Verified Member',
          isSuspended: false,
          isAdmin: currentUser?.isAdmin || false,
          createdAt: sbProfile.created_at || new Date().toISOString(),
          connectionStatus: backendData?.connectionStatus || null,
          startups: backendData?.startups || [],
          profile: {
            id: sbProfile.id,
            userId: sbProfile.user_id || targetId,
            fullName: sbProfile.full_name || 'Founder',
            headline: sbProfile.headline || '',
            oneLineBio: sbProfile.one_line_bio || sbProfile.headline || '',
            location: sbProfile.location || '',
            bio: sbProfile.bio || '',
            avatar: sbProfile.avatar || '',
            skills: sbProfile.skills || '',
            startupInterests: sbProfile.startup_interests || '',
            industries: sbProfile.industries || '',
            preferredRole: sbProfile.preferred_role || '',
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
      } else if (backendData) {
        setProfileUser(backendData);
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
    fetchUserProfile();
    loadConnectionsAndStatus();

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
    window.addEventListener('connections_updated', handleConnEvt);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('connections_updated', handleConnEvt);
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
      await removeConnection(connInfo.connectionId, currentUser.id);
      setConnInfo({
        status: null,
        isSender: false,
        isReceiver: false,
        connectionId: null,
      });
      const checkTargetId = targetId || profileUser?.id || '';
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
    const primaryCat = exps[0]?.category || formData.preferredRole || 'Founders';

    try {
      // 1. Update Supabase public.profiles table
      if (currentUser?.id) {
        await upsertUserProfile(currentUser.id, {
          full_name: formData.fullName,
          headline: formData.headline,
          one_line_bio: formData.oneLineBio || formData.headline,
          location: formData.location,
          bio: formData.bio,
          avatar: formData.avatar,
          cover_image: formData.coverImage,
          skills: formData.skills,
          startup_interests: formData.startupInterests,
          industries: formData.industries,
          preferred_role: primaryCat,
          is_category_selected: true,
          availability: formData.availability,
          startup_experience: serializedExp,
          achievements: formData.achievements,
          education: formData.education,
          github_url: formData.githubUrl,
          linkedin_url: formData.linkedinUrl,
          website_url: formData.websiteUrl,
          open_to: formData.openTo,
        });
        invalidateUserProfileCache(currentUser.id);
      }

      // 2. Optionally mirror to backend API if reachable
      let updatedUser: User | null = null;
      try {
        const res = await api.updateProfile({
          ...formData,
          startupExperience: serializedExp,
          preferredRole: primaryCat,
        });
        if (res?.user) updatedUser = res.user;
      } catch (backendErr) {
        console.warn('Backend profile mirror warning (non-fatal):', backendErr);
      }

      const mergedUser: User = {
        ...(updatedUser || profileUser || currentUser!),
        profile: {
          ...(profileUser?.profile || currentUser?.profile!),
          ...(updatedUser?.profile || {}),
          ...formData,
          startupExperience: serializedExp,
          preferredRole: primaryCat,
          isCategorySelected: true, // EXPLICITLY TRUE to prevent category selection modal from re-triggering
        },
      };

      setProfileUser(mergedUser);
      if (isMe && currentUser) {
        updateUser(mergedUser);
      }
      setEditOpen(false);
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
  const industriesList = p.industries ? p.industries.split(',').map((i) => i.trim()).filter(Boolean) : [];
  const parsedExperiences = parseWorkExperiences(p.startupExperience);

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
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 py-8 px-3 sm:px-6 lg:px-8 font-sans transition-colors selection:bg-brand-600 selection:text-white w-full max-w-full overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6 w-full overflow-x-hidden">

        {/* 1. TOP HERO / COVER & MAIN PROFILE CARD */}
        <div className="card-base overflow-hidden">
          
          {/* Cover Section */}
          <div className="h-44 sm:h-52 relative overflow-hidden bg-[#768aab] dark:bg-slate-800 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {p.coverImage ? (
              <img
                src={p.coverImage}
                alt="Profile Cover Banner"
                className="w-full h-full object-cover"
                decoding="async"
              />
            ) : (
              /* Subtle Professional Pattern */
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            )}

            <div className="absolute top-4 right-4 flex items-center gap-2 z-10 flex-wrap justify-end">
              {!isMe && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="p-2 rounded-md bg-black/30 hover:bg-black/50 text-white backdrop-blur-xs transition-colors"
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-600/85 hover:bg-red-600 text-white backdrop-blur-xs text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      title="Remove background cover image"
                    >
                      <Trash2 size={13} />
                      <span className="hidden xs:inline">Remove Cover</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRequestGalleryPermission('cover')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs text-xs font-medium transition-colors cursor-pointer shadow-xs"
                    title="Change background cover image from gallery"
                  >
                    <Camera size={14} />
                    <span className="hidden xs:inline">{p.coverImage ? 'Change Cover' : 'Add Cover'}</span>
                  </button>
                  <button
                    onClick={handleOpenEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white text-slate-900 text-xs font-medium transition-colors shadow-xs hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 size={14} className="text-brand-600" />
                    <span>Edit Profile</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Profile Header Row */}
          <div className="px-4 sm:px-7 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-12 sm:-mt-16 mb-6">
              
              {/* Profile Photo (Partially Overlapping) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-5 w-full md:w-auto">
                <div className="relative shrink-0 group">
                  {hasCustomAvatar ? (
                    <img
                      src={avatar!}
                      alt={displayName}
                      decoding="async"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-dark-900 shadow-sm bg-white"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-dark-900 shadow-sm bg-brand-600 text-white flex flex-col items-center justify-center font-bold">
                      <Rocket className="w-8 h-8 sm:w-10 sm:h-10 mb-0.5 text-white" />
                      <span className="text-xs sm:text-sm font-semibold tracking-wider">{initials}</span>
                    </div>
                  )}
                  {isMe && (
                    <div className="absolute -bottom-1 -right-1 flex items-center gap-1">
                      {hasCustomAvatar && (
                        <button
                          onClick={() => handleRemovePhoto('avatar')}
                          disabled={isRemovingPhoto}
                          className="p-1.5 rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
                          title="Remove profile photo"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRequestGalleryPermission('avatar')}
                        className="p-1.5 rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition-colors cursor-pointer"
                        title="Upload/change profile photo from gallery"
                      >
                        <Camera size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                      {displayName}
                    </h1>
                    <VerificationBadge badge={profileUser.verificationBadge} isVerified={profileUser.isVerified} />
                    <RoleBadge role={profileUser.role} />
                  </div>

                  <p className="text-sm sm:text-base font-normal text-slate-600 dark:text-slate-300">
                    {p.headline || (isMe ? 'Add your role or startup vision' : 'Member of StartupZ')}
                  </p>

                  {p.oneLineBio && (
                    <p className="text-xs sm:text-sm font-medium text-brand-600 dark:text-brand-400 italic">
                      "{p.oneLineBio}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                    {p.location && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-brand-600" />
                          <span>{p.location}</span>
                        </span>
                        {(() => {
                          const resolved = resolveIndianLocation(p.location);
                          if (!resolved) return null;
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 font-semibold">
                              {resolved.district ? `${resolved.district} • ` : ''}{resolved.state}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                    {industriesList.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span>{industriesList[0]}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{p.availability || 'Available'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap pt-2 md:pt-0">
                {!isMe && (
                  <>
                    {connInfo.status === 'ACCEPTED' ? (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                        <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Check size={14} />
                          <span>Connected</span>
                        </span>
                        <button
                          onClick={handleDisconnect}
                          disabled={connActionLoading}
                          className="p-2 rounded-md border border-slate-200 dark:border-dark-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer"
                          title="Remove connection"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    ) : connInfo.status === 'PENDING' ? (
                      connInfo.isSender ? (
                        <span className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
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
                        className="flex-1 sm:flex-none btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer"
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
                      title="Propose Startup Connection"
                    >
                      <Rocket size={15} className="text-brand-600" />
                      <span>Startup Connection</span>
                    </button>
                  </>
                )}

                {isMe && (
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <button
                      onClick={handleOpenEdit}
                      className="flex-1 sm:flex-none btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium cursor-pointer"
                    >
                      <Edit3 size={15} />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => setMeetingOpen(true)}
                      className="flex-1 sm:flex-none btn-secondary inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium cursor-pointer"
                    >
                      <Video size={15} className="text-brand-600" />
                      <span>Host Meeting</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Statistics Row */}
            <div className="pt-4 border-t border-slate-100 dark:border-dark-800 grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-left">
              <button
                onClick={handleOpenConnectionsModal}
                className="group text-left cursor-pointer"
              >
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                  {connectionsCount}
                </div>
                <div className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400 group-hover:text-brand-600 transition-colors">
                  Connections
                </div>
              </button>

              <div className="border-l border-slate-100 dark:border-dark-800 pl-2 sm:pl-6">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {profileUser.startups?.length || 0}
                </div>
                <div className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                  Startups Founded
                </div>
              </div>

              <div className="border-l border-slate-100 dark:border-dark-800 pl-2 sm:pl-6">
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {skillsList.length}
                </div>
                <div className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
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

        {/* 2. TWO-COLUMN LAYOUT (DESKTOP) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAIN COLUMN (LEFT 2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* ABOUT SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                  About
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit About</span>
                  </button>
                )}
              </div>
              <p className="text-sm font-normal text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {p.bio || 'No background description shared yet. Add a short summary about your startup journey and vision!'}
              </p>

              {/* Interests Tags */}
              {interestsList.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-dark-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Startup Interests
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

            {/* EXPERIENCE SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Briefcase size={18} className="text-brand-600" />
                  <span>Experience</span>
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Experience</span>
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
                              {exp.category || p.preferredRole || 'Founders'}
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
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-lg">
                  <Briefcase size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No experience details added yet.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-medium text-brand-600 hover:underline cursor-pointer"
                    >
                      + Add Experience
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* EDUCATION SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <GraduationCap size={18} className="text-brand-600" />
                  <span>Education</span>
                </h2>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit Education</span>
                  </button>
                )}
              </div>

              {p.education ? (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200/50 flex items-center justify-center font-bold text-sm shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span>{p.education}</span>
                      {(() => {
                        const low = p.education.toLowerCase();
                        if (low.includes('niat')) {
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50">
                              Advanced Tech Institute
                            </span>
                          );
                        }
                        if (low.includes('iit') || low.includes('indian institute of technology')) {
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                              Premier IIT
                            </span>
                          );
                        }
                        if (low.includes('nit') || low.includes('national institute of technology')) {
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200/50">
                              NIT
                            </span>
                          );
                        }
                        if (low.includes('bits') || low.includes('vit') || low.includes('srm') || low.includes('manipal') || low.includes('amity') || low.includes('thapar')) {
                          return (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50">
                              Premier University
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-lg">
                  <GraduationCap size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No education details listed.</p>
                  {isMe && (
                    <button
                      onClick={handleOpenEdit}
                      className="mt-2 text-xs font-medium text-brand-600 hover:underline"
                    >
                      + Add Education
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STARTUPS / PROJECTS SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Rocket size={18} className="text-brand-600" />
                  <span>Startups & Projects</span>
                </h2>
                {isMe && (
                  <Link
                    to="/startups/create"
                    className="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Post Startup
                  </Link>
                )}
              </div>

              {profileUser.startups && profileUser.startups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profileUser.startups.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700 transition-colors flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50">
                            {s.stage}
                          </span>
                          <span className="text-xs font-medium text-slate-500">{s.industry}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {s.oneLineDescription || 'AI & tech platform startup.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 dark:border-dark-700/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Founder</span>
                        <Link
                          to={`/startups/${s.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                        >
                          <span>View Venture</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-lg space-y-2">
                  <FolderKanban size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No startups created yet.</p>
                  {isMe && (
                    <Link
                      to="/startups/create"
                      className="btn-primary inline-block px-3 py-1.5 text-xs font-medium"
                    >
                      + Create Startup Listing
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* ACTIVITY SECTION */}
            <div className="card-base p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Share2 size={18} className="text-brand-600" />
                  <span>Activity & Updates</span>
                </h2>
                <Link to="/feed" className="text-xs font-medium text-brand-600 hover:underline">
                  View Feed →
                </Link>
              </div>

              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-dark-800 rounded-lg space-y-1">
                <Share2 size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No activity or updates published yet.</p>
                {isMe && (
                  <Link
                    to="/feed"
                    className="inline-block mt-2 text-xs font-medium text-brand-600 hover:underline"
                  >
                    + Share an update on Feed
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR (1/3 WIDTH) */}
          <div className="space-y-6">

            {/* PROFILE COMPLETENESS CARD */}
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
                    <CheckCircle2 size={13} className={p.avatar ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'} />
                    <span>Upload profile photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={skillsList.length > 0 ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'} />
                    <span>Add verified skills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={p.startupExperience ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-600'} />
                    <span>Add startup experience</span>
                  </div>
                </div>
              </div>
            )}

            {/* SKILLS & ENDORSEMENTS SECTION */}
            <div className="card-base p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Skills & Expertise
                </h3>
                <span className="text-xs text-slate-400">{skillsList.length} skills</span>
              </div>

              {/* Add Skill Input */}
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
                    className="btn-primary px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Skills Pill Tags */}
              {skillsList.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 dark:bg-dark-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                    >
                      <span>{skill}</span>
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-600 transition-colors ml-0.5"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ECOSYSTEM HUB & LINKS CARD */}
            <div className="card-base p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Profiles & Portfolio
                </h3>
                {isMe && (
                  <button
                    onClick={handleOpenEdit}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={12} />
                    <span>Edit Links</span>
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={14} />
                      <span>LinkedIn Profile</span>
                    </span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink size={14} />
                      <span>GitHub Profile</span>
                    </span>
                    <ExternalLink size={12} />
                  </a>
                )}
                {p.websiteUrl && (
                  <a
                    href={p.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#64748B] hover:text-[#4F46E5] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={16} />
                      <span>Personal Website</span>
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {!p.linkedinUrl && !p.githubUrl && !p.websiteUrl && (
                  <p className="text-xs text-[#64748B] py-1">No external portfolio links added.</p>
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
            {/* Photos & Branding */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F46E5] flex items-center gap-1.5">
                  <Sparkles size={14} /> Profile & Background Photos
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">Add from device gallery</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Avatar Uploader */}
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2.5">
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
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2.5">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
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
                    placeholder="e.g. Warangal, Bengaluru, Delhi, or Remote"
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
                {/* Autocomplete Dropdown */}
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g. Founder & CEO at AgriTech Solutions"
                className="input-base w-full px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Describe Yourself in One Line</span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">Displayed on profile preview cards</span>
              </label>
              <input
                type="text"
                value={formData.oneLineBio || ''}
                onChange={(e) => setFormData({ ...formData, oneLineBio: e.target.value })}
                placeholder="e.g. AI Founder & Full-Stack Architect building scalable GTM tools"
                className="input-base w-full px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">About & Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Passionate about solving real-world problems through technology..."
                className="input-base w-full px-3 py-1.5 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Startup Experience</label>
                <textarea
                  rows={2}
                  value={formData.startupExperience}
                  onChange={(e) => setFormData({ ...formData, startupExperience: e.target.value })}
                  placeholder="Details about prior ventures or executive experience..."
                  className="input-base w-full px-3 py-1.5 text-xs resize-none"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>Education / College</span>
                  <span className="text-[10px] text-slate-400 font-medium">IITs, NITs, NIAT, Universities</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
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
                    placeholder="Institution name, degree (e.g. NIAT, IIT Madras, NIT Trichy, VIT, BITS Pilani)..."
                    className="input-base w-full px-3 py-1.5 text-xs resize-none"
                  />
                </div>
                {/* College Autocomplete Dropdown */}
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

            {/* Work Experience Section */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Briefcase size={14} className="text-brand-600 dark:text-brand-400" />
                    <span>Work Experience & Company Roles</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add your work history. Select primary category, your company name, and describe your work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddExperienceItem}
                  className="px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded border border-brand-200 dark:border-brand-900 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Experience</span>
                </button>
              </div>

              {(!formData.experiences || formData.experiences.length === 0) ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No work experiences added yet.</p>
                  <button
                    type="button"
                    onClick={handleAddExperienceItem}
                    className="mt-1.5 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                  >
                    + Add your first experience
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.experiences.map((exp: any, idx: number) => (
                    <div
                      key={exp.id || idx}
                      className="p-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Experience #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperienceItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove experience"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Primary Category
                          </label>
                          <select
                            value={exp.category || 'Founders'}
                            onChange={(e) => handleUpdateExperienceItem(idx, 'category', e.target.value)}
                            className="input-base w-full px-2.5 py-1.5 text-xs"
                          >
                            <option value="Founders">Founders</option>
                            <option value="Co-Founders">Co-Founders</option>
                            <option value="Marketers">Marketers</option>
                            <option value="Investors">Investors</option>
                            <option value="Developer">Developer / Technical</option>
                            <option value="Designer">Designer / UI-UX</option>
                            <option value="Mentor">Mentor / Advisor</option>
                            <option value="Other">Other / Operator</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleUpdateExperienceItem(idx, 'company', e.target.value)}
                            placeholder="e.g. Google, Microsoft, StartupZ"
                            className="input-base w-full px-2.5 py-1.5 text-xs uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Describe Work & Impact at Company
                        </label>
                        <textarea
                          rows={2}
                          value={exp.description || ''}
                          onChange={(e) => handleUpdateExperienceItem(idx, 'description', e.target.value)}
                          placeholder="Describe your role, what you built, achievements, technologies used..."
                          className="input-base w-full px-2.5 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddExperienceItem}
                    className="w-full py-1.5 rounded-md border border-dashed border-brand-300 dark:border-brand-800 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Another Experience</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="React, Python, Product Development, AI"
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Startup Interests (comma-separated)</label>
                <input
                  type="text"
                  value={formData.startupInterests}
                  onChange={(e) => setFormData({ ...formData, startupInterests: e.target.value })}
                  placeholder="Entrepreneurship, Technology, Agriculture, AI"
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="input-base w-full px-3 py-1.5 text-xs"
                />
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
                  Permanently erase your startup profile, ideas, messages, and connections.
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-dark-800">
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
                className="btn-primary px-4 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Profile'}
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

      <ScheduleMeetingModal
        isOpen={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        targetUser={profileUser}
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
              StartupZ requires your permission to access your device gallery/photos to select a{' '}
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
    </div>
  );
};
