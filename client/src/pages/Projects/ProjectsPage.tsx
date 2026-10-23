import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Users,
  Rocket,
  CheckCircle2,
  Code,
  Palette,
  Megaphone,
  Briefcase,
  Search,
  MessageSquare,
  Clock,
  Check,
  X,
  Lock,
  Globe,
  Bell,
  Trash2,
  Bookmark,
  UserPlus,
  XCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { Avatar } from '../../components/common/Avatar';
import { ShareModal, ShareItemData } from '../../components/common/ShareModal';
import { api, clearApiCache } from '../../services/api';
import {
  supabase,
  fetchUserConnections,
  broadcastEntityDeleted,
  getDeletedProjectIds,
  recordDeletedProjectId,
} from '../../lib/supabase';

export interface PendingApplicant {
  userId: string;
  fullName: string;
  username?: string;
  avatar?: string | null;
  roleDescription?: string;
  appliedAt: string;
}

export interface InvitedUser {
  userId: string;
  fullName: string;
  avatar?: string | null;
  invitedAt: string;
}

export interface ProjectRole {
  id: string;
  roleName: string;
  iconType: 'code' | 'design' | 'marketing' | 'product' | 'general';
  assignedTo?: {
    userId: string;
    fullName: string;
    avatar?: string | null;
  } | null;
  pendingApplicant?: PendingApplicant | null;
  pendingApplicants?: PendingApplicant[];
  declinedApplicantIds?: string[];
  invitedUser?: InvitedUser | null;
  status: 'OPEN' | 'PENDING' | 'INVITED' | 'ASSIGNED';
}

export interface BuilderProject {
  id: string;
  title: string;
  ideaSummary: string;
  tagline?: string;
  problemSolved: string;
  solutionApproach?: string;
  detailedDescription?: string;
  stage: 'Ideation' | 'Prototyping' | 'MVP Build' | 'Alpha Testing' | 'Pre-Launch';
  visibility: 'PUBLIC' | 'PRIVATE';
  creator: {
    userId: string;
    fullName: string;
    avatar?: string | null;
    role: string;
  };
  roles: ProjectRole[];
  githubUrl?: string;
  demoUrl?: string;
  tags: string[];
  createdAt: string;
}

export const TITLE_MAX = 60;
export const TAGLINE_MAX = 100;
export const PROBLEM_MAX = 500;
export const SOLUTION_MAX = 500;

const INITIAL_PROJECTS: BuilderProject[] = [];

export const isCurrentUserMatch = (
  target: { userId?: string | null; id?: string | null; fullName?: string | null; email?: string | null } | null | undefined,
  currentUser: any
): boolean => {
  if (!target || !currentUser) return false;
  const targetId = String(target.userId || target.id || '').trim().toLowerCase();
  const currentId = String(currentUser.id || '').trim().toLowerCase();

  // If target has no identifying information, it cannot match
  if (!targetId && !target.email && !target.fullName) return false;

  // 1. Direct ID match
  if (targetId && currentId && targetId === currentId) return true;

  // 2. Check candidate IDs of current user
  const currentCandidateIds = new Set<string>();
  if (currentId) currentCandidateIds.add(currentId);
  if (currentUser.profile?.id) currentCandidateIds.add(String(currentUser.profile.id).trim().toLowerCase());
  if (currentUser.profile?.userId) currentCandidateIds.add(String(currentUser.profile.userId).trim().toLowerCase());
  if (currentUser._id) currentCandidateIds.add(String(currentUser._id).trim().toLowerCase());

  // Cross-reference targetId with current user's candidate IDs
  if (targetId && currentCandidateIds.has(targetId)) return true;

  // Well-known test aliases
  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];
  if (targetId && ruthwikIds.includes(targetId) && Array.from(currentCandidateIds).some((id) => ruthwikIds.includes(id))) return true;
  if (targetId && gokulIds.includes(targetId) && Array.from(currentCandidateIds).some((id) => gokulIds.includes(id))) return true;

  // 3. Email match (case-insensitive, non-empty)
  const targetEmail = String(target.email || '').trim().toLowerCase();
  const currentEmail = String(currentUser.email || '').trim().toLowerCase();
  if (targetEmail && currentEmail && targetEmail === currentEmail) return true;

  // 4. Exact full name match (case-insensitive, exclude generic placeholder names)
  const targetName = String(target.fullName || '').trim().toLowerCase();
  const currentName = String(currentUser.profile?.fullName || currentUser.fullName || '').trim().toLowerCase();
  const ignoredNames = new Set(['builder', 'connection', 'connected builder', 'project lead', 'member', 'user', 'undefined', 'null']);
  if (
    targetName &&
    currentName &&
    targetName.length >= 2 &&
    !ignoredNames.has(targetName) &&
    !ignoredNames.has(currentName) &&
    targetName === currentName
  ) {
    return true;
  }

  return false;
};

/**
 * Strictly verifies whether the authenticated user is the user who created/uploaded this project.
 * Uses exact user ID / email match only (never display names, never localStorage).
 */
export const isUserCreatorOfProject = (project: BuilderProject | null | undefined, currentUser: any): boolean => {
  if (!project || !currentUser || currentUser.isSuspended) return false;
  if (currentUser.isAdmin) return true;

  const creatorId = String(
    project.creator?.userId ||
    (project.creator as any)?.id ||
    (project as any)?.creatorId ||
    (project as any)?.creator_id ||
    ''
  ).trim().toLowerCase();

  const userIds = new Set<string>();
  if (currentUser.id) userIds.add(String(currentUser.id).trim().toLowerCase());
  if (currentUser.profile?.id) userIds.add(String(currentUser.profile.id).trim().toLowerCase());
  if (currentUser.profile?.userId) userIds.add(String(currentUser.profile.userId).trim().toLowerCase());
  if (currentUser._id) userIds.add(String(currentUser._id).trim().toLowerCase());

  // Well-known test aliases
  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  if (creatorId && ruthwikIds.includes(creatorId) && Array.from(userIds).some((id) => ruthwikIds.includes(id))) return true;
  if (creatorId && gokulIds.includes(creatorId) && Array.from(userIds).some((id) => gokulIds.includes(id))) return true;

  if (creatorId && userIds.has(creatorId)) return true;

  const creatorEmail = String((project.creator as any)?.email || '').trim().toLowerCase();
  const currentEmail = String(currentUser.email || '').trim().toLowerCase();
  if (creatorEmail && currentEmail && creatorEmail === currentEmail) return true;

  return false;
};

/**
 * Deduplicates project lists by project ID and (creatorId + normalized title).
 * Guarantees zero project doubling on creation, invite response, or polling.
 */
export const deduplicateProjectsList = (list: BuilderProject[]): BuilderProject[] => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const seenCreatorTitle = new Set<string>();
  const result: BuilderProject[] = [];

  for (const p of list) {
    if (!p || !p.id) continue;
    if (seenIds.has(p.id)) continue;

    const creatorId = String(
      p.creator?.userId ||
      (p.creator as any)?.id ||
      (p as any)?.creatorId ||
      (p as any)?.creator_id ||
      ''
    ).trim().toLowerCase();
    const cleanTitle = (p.title || '').trim().toLowerCase();
    const titleKey = `${creatorId}:::${cleanTitle}`;

    if (creatorId && cleanTitle && seenCreatorTitle.has(titleKey)) {
      continue;
    }

    seenIds.add(p.id);
    if (creatorId && cleanTitle) {
      seenCreatorTitle.add(titleKey);
    }
    result.push(p);
  }
  return result;
};

export const syncProjectGroup = (project: BuilderProject) => {
  try {
    const raw = localStorage.getItem('startupz_project_groups');
    let groups: any[] = raw ? JSON.parse(raw) : [];
    const groupId = `proj-group-${project.id}`;
    const existingIdx = groups.findIndex((g) => g.id === groupId);

    const rawMembers = [
      {
        userId: project.creator.userId,
        fullName: project.creator.fullName,
        avatar: project.creator.avatar || null,
        role: 'Project Lead',
      },
      ...project.roles
        .filter((r) => r.status === 'ASSIGNED' && r.assignedTo && r.assignedTo.userId !== project.creator.userId)
        .map((r) => ({
          userId: r.assignedTo!.userId,
          fullName: r.assignedTo!.fullName,
          avatar: r.assignedTo!.avatar || null,
          role: r.roleName,
        })),
    ];

    const seenMemberKeys = new Set<string>();
    const members = rawMembers.filter((m) => {
      const key = String(m.userId || m.fullName).toLowerCase();
      if (seenMemberKeys.has(key)) return false;
      seenMemberKeys.add(key);
      return true;
    });

    const groupObj = {
      id: groupId,
      projectId: project.id,
      title: project.title,
      creatorId: project.creator.userId,
      creatorName: project.creator.fullName,
      members,
      createdAt: project.createdAt || new Date().toISOString(),
      lastMessage: existingIdx >= 0 ? groups[existingIdx].lastMessage : 'Project team group established. Welcome team!',
      lastMessageAt: existingIdx >= 0 ? groups[existingIdx].lastMessageAt : new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      groups[existingIdx] = groupObj;
    } else {
      groups.push(groupObj);
    }
    localStorage.setItem('startupz_project_groups', JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to sync project group:', err);
  }
};

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);

  const [projects, setProjects] = useState<BuilderProject[]>(() => {
    try {
      const isPurged = localStorage.getItem('startupz_projects_purged_clean_v3');
      if (!isPurged) {
        localStorage.removeItem('startupz_builder_projects');
        localStorage.setItem('startupz_projects_purged_clean_v3', 'true');
        return [];
      }
      const stored = localStorage.getItem('startupz_builder_projects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deletedIds = getDeletedProjectIds();
          const cleaned = parsed.filter(
            (p: any) =>
              p &&
              !deletedIds.has(p.id) &&
              !['proj-1', 'proj-2', 'proj-3'].includes(p.id) &&
              !['creator-1', 'creator-2', 'creator-3'].includes(p?.creator?.userId)
          );
          return deduplicateProjectsList(cleaned);
        }
      }
    } catch {}
    return [];
  });

  const [filterTab, setFilterTab] = useState<'all' | 'open_roles' | 'my_projects'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Completion Prompt Modal for Leader
  const [roleCompletionModal, setRoleCompletionModal] = useState<BuilderProject | null>(null);

  // Review Applicants Modal for Team Lead
  const [reviewRoleModal, setReviewRoleModal] = useState<{ project: BuilderProject; role: ProjectRole } | null>(null);

  // New Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newDetailedDescription, setNewDetailedDescription] = useState('');
  const [newTechStack, setNewTechStack] = useState<string[]>(['React', 'TypeScript']);
  const [techInput, setTechInput] = useState('');
  const [newStage, setNewStage] = useState<'Ideation' | 'Prototyping' | 'MVP Build' | 'Alpha Testing' | 'Pre-Launch'>('Ideation');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [rolesList, setRolesList] = useState<string[]>([
    'Frontend Developer',
    'Backend Developer',
    'UI/UX Designer',
    'Growth & Marketing',
  ]);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Validation rules
  const isTitleValid = newTitle.trim().length > 0 && newTitle.length <= TITLE_MAX;
  const isTaglineValid = newTagline.trim().length > 0 && newTagline.length <= TAGLINE_MAX;
  const isProblemValid = newProblem.trim().length > 0 && newProblem.length <= PROBLEM_MAX;
  const isSolutionValid = newSolution.trim().length > 0 && newSolution.length <= SOLUTION_MAX;
  const isTechValid = newTechStack.length >= 1;

  const isFormValid = isTitleValid && isTaglineValid && isProblemValid && isSolutionValid && isTechValid;

  const handleAddTechTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const clean = techInput.trim().replace(/^,+|,+$/g, '');
    if (!clean) return;
    if (!newTechStack.includes(clean)) {
      setNewTechStack([...newTechStack, clean]);
    }
    setTechInput('');
  };

  const handleRemoveTechTag = (tag: string) => {
    setNewTechStack(newTechStack.filter((t) => t !== tag));
  };

  // Sync initial project groups
  useEffect(() => {
    projects.forEach((p) => syncProjectGroup(p));
  }, []);

  // Handle direct redirection to a shared project (?projectId=xyz or #project-xyz)
  useEffect(() => {
    const rawTarget =
      searchParams.get('projectId') ||
      (location.hash.startsWith('#project-') ? location.hash.replace('#project-', '') : null);
    if (!rawTarget) return;

    const scrollToTarget = () => {
      const el = document.getElementById(`project-${rawTarget}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedProjectId(rawTarget);
        setTimeout(() => setHighlightedProjectId(null), 4500);
        return true;
      }
      return false;
    };

    if (projects.length > 0) {
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
  }, [projects, location.hash, searchParams]);

  // Saved Projects state
  const [expandedProjectText, setExpandedProjectText] = useState<Record<string, boolean>>({});
  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(() => {
    try {
      const mirror = localStorage.getItem('startupz_saved_items');
      if (mirror) {
        const parsed = JSON.parse(mirror);
        if (Array.isArray(parsed)) {
          return new Set(
            parsed
              .filter((item: any) => (item.itemType === 'PROJECT' || item.type === 'PROJECT') && item.itemId)
              .map((item: any) => item.itemId)
          );
        }
      }
    } catch {}
    return new Set();
  });

  // Assign Connection Modal State
  const [assignModalRole, setAssignModalRole] = useState<{ projectId: string; roleId: string; roleName: string } | null>(null);
  const [shareModalItem, setShareModalItem] = useState<ShareItemData | null>(null);
  const [connectionsList, setConnectionsList] = useState<Array<{ id: string; fullName: string; avatar?: string | null; headline?: string }>>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');

  // Prevent background scrolling and enable Escape key when any modal is open
  useEffect(() => {
    const isAnyModalOpen = Boolean(createModalOpen || roleCompletionModal || assignModalRole || reviewRoleModal);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (createModalOpen) setCreateModalOpen(false);
          if (roleCompletionModal) setRoleCompletionModal(null);
          if (assignModalRole) setAssignModalRole(null);
          if (reviewRoleModal) setReviewRoleModal(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [createModalOpen, roleCompletionModal, assignModalRole, reviewRoleModal]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const saveProjects = (updated: BuilderProject[]) => {
    const deduplicated = deduplicateProjectsList(updated);
    setProjects(deduplicated);
    try {
      localStorage.setItem('startupz_builder_projects', JSON.stringify(deduplicated));
      localStorage.setItem('startupz_projects', JSON.stringify(deduplicated));
    } catch {}
  };

  // Applied roles tracker for current user to guarantee state persistence on refresh
  const [appliedRolesSet, setAppliedRolesSet] = useState<Set<string>>(() => {
    try {
      const uid = user?.id || (localStorage.getItem('startupz_user') ? JSON.parse(localStorage.getItem('startupz_user')!).id : null);
      if (uid) {
        const stored = localStorage.getItem(`startupz_applied_roles_${uid}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {}
    return new Set();
  });

  useEffect(() => {
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`startupz_applied_roles_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setAppliedRolesSet(new Set(parsed));
        }
      } catch {}
    }
  }, [user?.id]);

  // Fetch projects from server on mount with cross-device synchronization
  useEffect(() => {
    let isMounted = true;
    const fetchServerProjects = async () => {
      try {
        clearApiCache();
        let serverList: BuilderProject[] | null = null;
        const res = await api.getProjects().catch(() => null);
        if (res && Array.isArray(res.projects)) {
          serverList = res.projects;
        } else {
          // Direct Supabase fallback if server is waking up or offline
          try {
            const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
            if (Array.isArray(data)) {
              serverList = data.map((row: any) => ({
                id: row.id,
                title: row.title,
                ideaSummary: row.idea_summary || row.tagline || '',
                tagline: row.tagline || row.idea_summary || '',
                problemSolved: row.problem_solved || '',
                solutionApproach: row.solution_approach || '',
                detailedDescription: row.detailed_description || '',
                stage: row.stage || 'Ideation',
                visibility: row.visibility || 'PUBLIC',
                creator: row.creator || { userId: row.creator_id, fullName: 'Builder' },
                roles: Array.isArray(row.roles) ? row.roles : [],
                tags: Array.isArray(row.tags) ? row.tags : [],
                githubUrl: row.github_url || undefined,
                demoUrl: row.demo_url || undefined,
                createdAt: row.created_at || new Date().toISOString(),
              }));
            }
          } catch {}
        }

        if (isMounted && serverList !== null) {
          // Guarantee that applied roles for current user are preserved and declined roles are purged
          const currentUid = user?.id || (localStorage.getItem('startupz_user') ? JSON.parse(localStorage.getItem('startupz_user')!).id : null);
          let appliedKeys: string[] = [];
          if (currentUid) {
            try {
              const stored = localStorage.getItem(`startupz_applied_roles_${currentUid}`);
              appliedKeys = stored ? JSON.parse(stored) : [];
            } catch {}
          }
          const aSet = new Set(appliedKeys);

          serverList = serverList.map((p) => ({
            ...p,
            roles: p.roles.map((r) => {
              const declined = Array.isArray(r.declinedApplicantIds) ? r.declinedApplicantIds : [];
              if (declined.length > 0) {
                const prevList = Array.isArray(r.pendingApplicants) ? r.pendingApplicants : (r.pendingApplicant ? [r.pendingApplicant] : []);
                const cleanedList = prevList.filter((a) => !declined.includes(a.userId));
                r = {
                  ...r,
                  pendingApplicants: cleanedList,
                  pendingApplicant: cleanedList[0] || null,
                };
              }

              if (currentUid && declined.includes(currentUid)) {
                if (aSet.has(`${p.id}:${r.id}`)) {
                  aSet.delete(`${p.id}:${r.id}`);
                  appliedKeys = appliedKeys.filter((k) => k !== `${p.id}:${r.id}`);
                  try {
                    localStorage.setItem(`startupz_applied_roles_${currentUid}`, JSON.stringify(appliedKeys));
                  } catch {}
                }
                return r;
              }

              if (currentUid && aSet.has(`${p.id}:${r.id}`) && r.status === 'OPEN') {
                const prevList = Array.isArray(r.pendingApplicants) ? r.pendingApplicants : (r.pendingApplicant ? [r.pendingApplicant] : []);
                const exists = prevList.some((a) => a.userId === currentUid);
                if (!exists) {
                  const newApp: PendingApplicant = {
                    userId: currentUid,
                    fullName: user?.profile?.fullName || user?.email?.split('@')[0] || 'Builder',
                    avatar: user?.profile?.avatar || null,
                    roleDescription: user?.profile?.headline || 'Team Collaborator',
                    appliedAt: 'Applied',
                  };
                  const nextList = [...prevList, newApp];
                  return {
                    ...r,
                    pendingApplicant: nextList[0],
                    pendingApplicants: nextList,
                  };
                }
              }
              return r;
            }),
          }));

          const deletedIds = getDeletedProjectIds();
          serverList = deduplicateProjectsList(
            serverList.filter((p) => p && p.id && !deletedIds.has(p.id))
          );

          setAppliedRolesSet(new Set(aSet));
          setProjects(serverList);
          try {
            localStorage.setItem('startupz_builder_projects', JSON.stringify(serverList));
            localStorage.setItem('startupz_projects', JSON.stringify(serverList));
          } catch {}
          serverList.forEach((p) => syncProjectGroup(p));
        }
      } catch (err) {
        console.warn('Could not fetch server projects:', err);
      }
    };

    fetchServerProjects();

    const handleRemoteProjectDelete = (payload: any) => {
      if (payload?.entityType === 'PROJECT' && payload?.id) {
        recordDeletedProjectId(payload.id);
        setProjects((prev) => {
          const next = prev.filter((p) => p.id !== payload.id);
          try {
            localStorage.setItem('startupz_builder_projects', JSON.stringify(next));
          } catch {}
          return next;
        });
        try {
          const raw = localStorage.getItem('startupz_project_groups');
          if (raw) {
            const groups = JSON.parse(raw);
            const filteredGroups = groups.filter(
              (g: any) => g.projectId !== payload.id && g.id !== payload.id && g.id !== `proj-group-${payload.id}`
            );
            localStorage.setItem('startupz_project_groups', JSON.stringify(filteredGroups));
          }
          localStorage.removeItem(`startupz_project_messages_${payload.id}`);
        } catch {}
      }
    };

    // Cross-device broadcast listeners (mobile <-> laptop)
    const syncChannel = supabase.channel('global-projects-sync-channel');
    syncChannel
      .on('broadcast', { event: 'entity_deleted' }, ({ payload }) => {
        handleRemoteProjectDelete(payload);
      })
      .on('broadcast', { event: 'project_updated' }, () => {
        clearApiCache();
        fetchServerProjects();
      })
      .subscribe();

    const dataChannel = supabase.channel('global-data-sync-broadcast');
    dataChannel
      .on('broadcast', { event: 'entity_deleted' }, ({ payload }) => {
        handleRemoteProjectDelete(payload);
      })
      .on('broadcast', { event: 'project_updated' }, () => {
        clearApiCache();
        fetchServerProjects();
      })
      .subscribe();

    // Direct database change listener
    const dbChannel = supabase
      .channel('projects-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        clearApiCache();
        fetchServerProjects();
      })
      .subscribe();

    // Local custom event listener
    const handleLocalDelete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      handleRemoteProjectDelete(detail);
    };
    window.addEventListener('global_entity_deleted', handleLocalDelete);

    const handleProjectsUpdated = () => {
      clearApiCache();
      fetchServerProjects();
    };
    window.addEventListener('startupz_projects_updated', handleProjectsUpdated);

    // Auto-refresh when switching back to this tab or mobile device wakes up
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchServerProjects();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // Periodic 10s background sync
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchServerProjects();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('global_entity_deleted', handleLocalDelete);
      window.removeEventListener('startupz_projects_updated', handleProjectsUpdated);
      supabase.removeChannel(syncChannel);
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [user?.id]);

  // Load saved projects list
  useEffect(() => {
    let isMounted = true;
    const loadSaved = async () => {
      try {
        const res = await api.getSavedItems('PROJECT').catch(() => null);
        if (res && Array.isArray(res.savedItems)) {
          const ids = new Set<string>(res.savedItems.map((item: any) => item.itemId));
          if (isMounted) {
            setSavedProjectIds((prev) => new Set([...Array.from(prev), ...Array.from(ids)]));
          }
        }
      } catch {}
    };
    if (user) loadSaved();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleBookmarkToggle = async (projectId: string, projectTitle: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const isCurrentlySaved = savedProjectIds.has(projectId);
    const newSaved = new Set(savedProjectIds);
    if (isCurrentlySaved) {
      newSaved.delete(projectId);
    } else {
      newSaved.add(projectId);
    }
    setSavedProjectIds(newSaved);

    try {
      const raw = localStorage.getItem('startupz_saved_items');
      let items: any[] = raw ? JSON.parse(raw) : [];
      if (isCurrentlySaved) {
        items = items.filter((x: any) => !(x.itemId === projectId && (x.itemType === 'PROJECT' || x.type === 'PROJECT')));
      } else {
        const targetProj = projects.find((p) => p.id === projectId);
        items.unshift({
          id: `saved-proj-${projectId}`,
          itemId: projectId,
          itemType: 'PROJECT',
          type: 'PROJECT',
          createdAt: new Date().toISOString(),
          project: targetProj || { id: projectId, title: projectTitle },
        });
      }
      localStorage.setItem('startupz_saved_items', JSON.stringify(items));
    } catch {}

    try {
      await api.toggleSave('PROJECT', projectId).catch(() => null);
    } catch {}

    showToast(isCurrentlySaved ? 'Project removed from saved items.' : `Project "${projectTitle}" saved!`);
  };

  const handleOpenAssignModal = async (projectId: string, roleId: string, roleName: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAssignModalRole({ projectId, roleId, roleName });
    setConnectionSearchQuery('');
    setLoadingConnections(true);
    try {
      const connMap = new Map<string, { id: string; fullName: string; avatar?: string | null; headline?: string }>();

      // 1. Fetch from server API
      try {
        const res = await api.getConnections().catch(() => null);
        if (res && Array.isArray(res.connections)) {
          res.connections.forEach((c: any) => {
            const uid = c.user?.id || c.targetUserId || c.id;
            if (uid && uid !== user.id) {
              connMap.set(uid, {
                id: uid,
                fullName: c.user?.profile?.fullName || c.user?.email?.split('@')[0] || 'Connection',
                avatar: c.user?.profile?.avatar || null,
                headline: c.user?.profile?.headline || '',
              });
            }
          });
        }
      } catch {}

      // 2. Fetch from Supabase connections table & resolve profiles
      try {
        const { data: supaConns } = await supabase
          .from('connections')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'ACCEPTED');

        if (Array.isArray(supaConns) && supaConns.length > 0) {
          const neededIds = new Set<string>();
          supaConns.forEach((c: any) => {
            const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
            if (otherId && otherId !== user.id) {
              neededIds.add(otherId);
            }
          });

          if (neededIds.size > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', Array.from(neededIds));

            (profiles || []).forEach((pr: any) => {
              connMap.set(pr.user_id, {
                id: pr.user_id,
                fullName: pr.full_name || 'Connection',
                avatar: pr.avatar || null,
                headline: pr.headline || pr.one_line_bio || '',
              });
            });

            neededIds.forEach((nid) => {
              if (!connMap.has(nid)) {
                connMap.set(nid, {
                  id: nid,
                  fullName: 'Connected Builder',
                  avatar: null,
                  headline: 'Connection',
                });
              }
            });
          }
        }
      } catch (sErr) {
        console.warn('Supabase connections fetch in modal notice:', sErr);
      }

      // Deduplicate by normalized fullName
      const seenNames = new Set<string>();
      const deduplicated: { id: string; fullName: string; avatar?: string | null; headline?: string }[] = [];
      for (const conn of connMap.values()) {
        const key = conn.fullName.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          deduplicated.push(conn);
        }
      }
      setConnectionsList(deduplicated);
    } catch (err) {
      console.warn('Error fetching connections:', err);
      setConnectionsList([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleDirectAssignRole = async (
    projectId: string,
    roleId: string,
    targetUserId: string,
    targetName: string,
    targetAvatar?: string | null
  ) => {
    const project = projects.find((p) => p.id === projectId);
    const role = project?.roles.find((r) => r.id === roleId);
    const roleName = role?.roleName || assignModalRole?.roleName || 'Role';
    const projTitle = project?.title || 'Project';
    const leadName = user?.profile?.fullName || 'Project Lead';

    // 1. Immediately update local state
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const nextRoles = p.roles.map((r) => {
          if (r.id === roleId) {
            return {
              ...r,
              status: 'ASSIGNED' as const,
              assignedTo: {
                userId: targetUserId,
                fullName: targetName,
                avatar: targetAvatar || null,
              },
              invitedUser: null,
              pendingApplicant: null,
              pendingApplicants: [],
            };
          }
          return r;
        });
        const updatedProj = { ...p, roles: nextRoles };
        syncProjectGroup(updatedProj);
        return updatedProj;
      }
      return p;
    });

    saveProjects(updated);
    setAssignModalRole(null);
    showToast(`Role "${roleName}" successfully assigned to ${targetName}!`);

    // 2. Direct Supabase sync so cloud database reflects assignment immediately
    try {
      const projToSync = updated.find((p) => p.id === projectId);
      if (projToSync) {
        const { error: sbErr } = await supabase.from('projects').update({
          roles: projToSync.roles,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
        if (sbErr) {
          console.warn('Supabase direct assign update error:', sbErr);
        }
      }
    } catch (sbErr) {
      console.warn('Supabase direct assign sync notice:', sbErr);
    }

    // 3. Notify connection via Supabase
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        sender_id: user?.id,
        type: 'PROJECT_ROLE_ASSIGNED',
        title: `Role Assigned: ${roleName} in ${projTitle} 🎉`,
        message: `${leadName} assigned you to the role "${roleName}" in project "${projTitle}"!`,
        link: `/projects`,
        is_read: false,
      });
    } catch {}

    // 4. Background sync with backend API
    clearApiCache();
    try {
      const res = await api.assignProjectRole(projectId, roleId, {
        targetUserId,
        targetFullName: targetName,
        targetAvatar: targetAvatar || undefined,
      }).catch(() => null);
      if (res && res.project) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)));
        syncProjectGroup(res.project);
      }
    } catch (err) {}

    // 5. Broadcast real-time updates and trigger UI refresh
    try {
      clearApiCache();
      window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
      window.dispatchEvent(new CustomEvent('startupz_projects_updated'));
      supabase.channel('global-projects-sync-channel').send({
        type: 'broadcast',
        event: 'project_updated',
        payload: { projectId },
      }).catch(() => null);
    } catch {}
  };

  const handleSendRoleInvite = async (projectId: string, roleId: string, targetUserId: string, targetName: string) => {
    let apiHandled = false;
    try {
      const res = await api.inviteProjectRole(projectId, roleId, targetUserId).catch(() => null);
      if (res) apiHandled = true;
    } catch (err) {}

    const project = projects.find((p) => p.id === projectId);
    const role = project?.roles.find((r) => r.id === roleId);
    const roleName = role?.roleName || 'Role';
    const projTitle = project?.title || 'Project';
    const leadName = user?.profile?.fullName || 'Project Lead';

    // Only insert a Supabase notification if the backend API did not handle it
    if (!apiHandled) {
      try {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          sender_id: user?.id,
          type: 'PROJECT_ROLE_INVITE',
          title: `Role Invitation: ${roleName} in ${projTitle} 🎯`,
          message: `${leadName} invited you to join "${projTitle}" as ${roleName}. Accept or decline to join the team!`,
          link: `/projects?roleInvite=${roleId}&projectId=${projectId}`,
          is_read: false,
        });
      } catch {}
    }

    try {
      window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
      window.dispatchEvent(new CustomEvent('startupz_projects_updated'));
    } catch {}

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                status: 'INVITED' as const,
                invitedUser: {
                  userId: targetUserId,
                  fullName: targetName,
                  avatar: null,
                  invitedAt: 'Just now',
                },
                assignedTo: null,
                pendingApplicant: null,
                pendingApplicants: [],
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);
    setAssignModalRole(null);
    showToast(`Role invitation sent to ${targetName}! Once they accept, the role will be filled.`);
  };

  const handleRespondInvite = async (projectId: string, roleId: string, action: 'ACCEPT' | 'DECLINE') => {
    if (!user) return;

    const userName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
    let triggeredCompletion = false;
    let completedProject: BuilderProject | null = null;

    const targetProj = projects.find((p) => p.id === projectId);
    const targetRole = targetProj?.roles.find((r) => r.id === roleId);
    const leadId = targetProj?.creator?.userId || (targetProj as any)?.creatorId;

    // 1. Immediately update local state
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const nextRoles = p.roles.map((r) => {
          if (r.id === roleId) {
            if (action === 'ACCEPT') {
              return {
                ...r,
                status: 'ASSIGNED' as const,
                assignedTo: {
                  userId: user.id,
                  fullName: userName,
                  avatar: user.profile?.avatar || null,
                },
                invitedUser: null,
              };
            } else {
              return {
                ...r,
                status: 'OPEN' as const,
                assignedTo: null,
                invitedUser: null,
              };
            }
          }
          return r;
        });

        const updatedProj = { ...p, roles: nextRoles };
        if (action === 'ACCEPT') {
          syncProjectGroup(updatedProj);
          const allFilled = nextRoles.every((r) => r.status === 'ASSIGNED');
          if (allFilled && p.visibility === 'PUBLIC') {
            triggeredCompletion = true;
            completedProject = updatedProj;
          }
        }
        return updatedProj;
      }
      return p;
    });

    saveProjects(updated);

    if (action === 'ACCEPT') {
      if (triggeredCompletion && completedProject) {
        setRoleCompletionModal(completedProject);
      } else {
        showToast('Role accepted! You are now part of the project team and added to project chat.');
      }
    } else {
      showToast('Role invitation declined.');
    }

    // 2. Direct Supabase sync so cloud database reflects acceptance immediately
    try {
      const projToSync = updated.find((p) => p.id === projectId);
      if (projToSync) {
        const { error: sbErr } = await supabase.from('projects').update({
          roles: projToSync.roles,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
        if (sbErr) {
          console.warn('Supabase respond invite sync error:', sbErr);
        }
      }
    } catch (sbErr) {
      console.warn('Supabase respond invite sync notice:', sbErr);
    }

    // 3. Notify project lead via Supabase
    try {
      if (leadId && leadId !== user.id) {
        await supabase.from('notifications').insert({
          user_id: leadId,
          sender_id: user.id,
          type: action === 'ACCEPT' ? 'PROJECT_INVITE_ACCEPTED' : 'PROJECT_INVITE_DECLINED',
          title: action === 'ACCEPT' ? 'Role Accepted! 🎉' : 'Role Declined',
          message: action === 'ACCEPT'
            ? `${userName} accepted your invitation to join "${targetProj?.title || 'Project'}" as ${targetRole?.roleName || 'team member'}!`
            : `${userName} declined the invitation to join "${targetProj?.title || 'Project'}" as ${targetRole?.roleName || 'team member'}.`,
          link: `/projects`,
          is_read: false,
        });
      }
    } catch {}

    // 4. Background sync with backend API
    clearApiCache();
    try {
      const res = await api.respondProjectInvite(projectId, roleId, action).catch(() => null);
      if (res && res.project) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)));
        syncProjectGroup(res.project);
      }
    } catch (err) {}

    // 5. Broadcast real-time updates
    try {
      clearApiCache();
      window.dispatchEvent(new CustomEvent('startupz_notifications_updated'));
      window.dispatchEvent(new CustomEvent('startupz_projects_updated'));
      supabase.channel('global-projects-sync-channel').send({
        type: 'broadcast',
        event: 'project_updated',
        payload: { projectId },
      }).catch(() => null);
    } catch {}
  };

  const handleCancelInvite = (projectId: string, roleId: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                status: 'OPEN' as const,
                invitedUser: null,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });
    saveProjects(updated);
    showToast('Invitation cancelled. Role reopened.');
  };

  const handleDeleteRole = async (projectId: string, roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role from the project?')) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const nextRoles = project.roles.filter((r) => r.id !== roleId);
    const updatedProj = { ...project, roles: nextRoles };

    try {
      await api.updateProject(projectId, { roles: nextRoles }).catch(() => null);
    } catch {}

    const updated = projects.map((p) => (p.id === projectId ? updatedProj : p));
    saveProjects(updated);
    syncProjectGroup(updatedProj);
    showToast('Role deleted successfully from project.');
  };

  const handleUnassignRole = async (projectId: string, roleId: string) => {
    if (!window.confirm('Are you sure you want to unassign this member? The role will become open again for applicants.')) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const nextRoles = project.roles.map((r) => {
      if (r.id === roleId) {
        return {
          ...r,
          status: 'OPEN' as const,
          assignedTo: null,
          invitedUser: null,
        };
      }
      return r;
    });
    const updatedProj = { ...project, roles: nextRoles };

    try {
      await api.updateProject(projectId, { roles: nextRoles }).catch(() => null);
    } catch {}

    const updated = projects.map((p) => (p.id === projectId ? updatedProj : p));
    saveProjects(updated);
    syncProjectGroup(updatedProj);
    showToast('Member unassigned. Role is now open for applicants.');
  };

  const handleDeleteProject = async (projectId: string) => {
    const targetProj = projects.find((p) => p.id === projectId);
    if (!targetProj || !isUserCreatorOfProject(targetProj, user)) {
      showToast('Only the user who uploaded this project can delete it.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this project idea?')) {
      return;
    }
    // 1. Immediately record in persistent deleted set across all sessions
    recordDeletedProjectId(projectId);

    // 2. Optimistically update local state & localStorage
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    saveProjects(updated);

    try {
      const raw = localStorage.getItem('startupz_project_groups');
      if (raw) {
        const groups = JSON.parse(raw);
        const filteredGroups = groups.filter(
          (g: any) => g.projectId !== projectId && g.id !== projectId && g.id !== `proj-group-${projectId}`
        );
        localStorage.setItem('startupz_project_groups', JSON.stringify(filteredGroups));
      }
      localStorage.removeItem(`startupz_project_messages_${projectId}`);
    } catch {}

    // 3. Direct Supabase delete for cloud permanence
    try {
      await supabase.from('projects').delete().eq('id', projectId);
      await supabase.from('project_messages').delete().eq('project_id', projectId);
    } catch (sbErr) {
      console.warn('Supabase direct project delete notice:', sbErr);
    }

    // 4. Server API delete
    try {
      await api.deleteProject(projectId);
    } catch (apiErr) {
      console.warn('Server project delete notice:', apiErr);
    }

    // 5. Broadcast deletion to all other connected devices & tabs (mobile <-> laptop)
    broadcastEntityDeleted('PROJECT', projectId);

    showToast('Project deleted successfully.');
  };

  const handleAddCustomRole = () => {
    if (!customRoleInput.trim()) return;
    if (!rolesList.includes(customRoleInput.trim())) {
      setRolesList((prev) => [...prev, customRoleInput.trim()]);
    }
    setCustomRoleInput('');
  };

  const handleRemoveRole = (roleName: string) => {
    setRolesList((prev) => prev.filter((r) => r !== roleName));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isFormValid || isSubmittingProject) return;
    setIsSubmittingProject(true);

    try {
      const creatorName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
      const payload = {
        title: newTitle.trim(),
        ideaSummary: newTagline.trim(),
        tagline: newTagline.trim(),
        problemSolved: newProblem.trim(),
        solutionApproach: newSolution.trim(),
        detailedDescription: newDetailedDescription.trim(),
        stage: newStage,
        visibility: newVisibility,
        tags: newTechStack,
        roles: [
          {
            id: `r-creator-${Date.now()}`,
            roleName: 'Project Lead',
            iconType: 'product' as const,
            status: 'ASSIGNED' as const,
            assignedTo: {
              userId: user.id,
              fullName: creatorName,
              avatar: user.profile?.avatar || null,
            },
          },
          ...rolesList.map((rName, idx) => ({
            id: `r-open-${Date.now()}-${idx}`,
            roleName: rName,
            iconType: (rName.toLowerCase().includes('design') ? 'design' : rName.toLowerCase().includes('market') || rName.toLowerCase().includes('sales') ? 'marketing' : 'code') as 'design' | 'marketing' | 'code',
            status: 'OPEN' as const,
          })),
        ] as ProjectRole[],
      };

      let serverProj: BuilderProject | null = null;
      try {
        const res = await api.createProject(payload).catch(() => null);
        if (res && res.project) {
          serverProj = res.project;
        }
      } catch (err) {}

      const newProject: BuilderProject = serverProj || ({
        id: `proj-${Date.now()}`,
        ...payload,
        creator: {
          userId: user.id,
          fullName: creatorName,
          avatar: user.profile?.avatar || null,
          role: user.profile?.headline || 'Project Lead',
        },
        createdAt: 'Just now',
      } as BuilderProject);

      const nextList = [newProject, ...projects.filter((p) => p.id !== newProject.id)];
      const seenIds = new Set<string>();
      const deduplicated = nextList.filter((p) => {
        if (!p || !p.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      saveProjects(deduplicated);
      syncProjectGroup(newProject);

      setCreateModalOpen(false);
      showToast(`Project "${newProject.title}" created! Team chat group initialized in Messages.`);

      // Reset Form
      setNewTitle('');
      setNewTagline('');
      setNewProblem('');
      setNewSolution('');
      setNewDetailedDescription('');
      setNewTechStack(['React', 'TypeScript']);
      setTechInput('');
      setFormTouched(false);
      setNewStage('Ideation');
      setNewVisibility('PUBLIC');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleApplyRole = async (projectId: string, roleId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const userName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
    const userHeadline = user.profile?.headline || 'Team Collaborator';

    const targetProject = projects.find((p) => p.id === projectId);
    const creatorId = targetProject?.creator?.userId || (targetProject as any)?.creatorId;
    const isCreator = creatorId === user.id;

    const newApplicant: PendingApplicant = {
      userId: user.id,
      fullName: userName,
      avatar: user.profile?.avatar || null,
      roleDescription: userHeadline,
      appliedAt: 'Just now',
    };

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              if (isCreator) {
                return {
                  ...r,
                  status: 'ASSIGNED' as const,
                  assignedTo: {
                    userId: user.id,
                    fullName: userName,
                    avatar: user.profile?.avatar || null,
                  },
                  pendingApplicant: null,
                  pendingApplicants: [],
                  invitedUser: null,
                };
              }

              const prevList = Array.isArray(r.pendingApplicants)
                ? r.pendingApplicants
                : r.pendingApplicant
                ? [r.pendingApplicant]
                : [];
              const exists = prevList.some((a) => a.userId === user.id);
              const nextList = exists ? prevList : [...prevList, newApplicant];

              const currentDeclined = Array.isArray(r.declinedApplicantIds) ? r.declinedApplicantIds : [];
              const nextDeclined = currentDeclined.filter((id) => id !== user.id);

              return {
                ...r,
                // Status remains OPEN so any number of builders can also apply!
                status: 'OPEN' as const,
                pendingApplicant: nextList[0] || null,
                pendingApplicants: nextList,
                declinedApplicantIds: nextDeclined,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);

    // Track user's applied roles persistently in localStorage and state
    if (!isCreator && user?.id) {
      const roleKey = `${projectId}:${roleId}`;
      setAppliedRolesSet((prev) => new Set([...Array.from(prev), roleKey]));
      try {
        const storedRoles = localStorage.getItem(`startupz_applied_roles_${user.id}`);
        const list: string[] = storedRoles ? JSON.parse(storedRoles) : [];
        if (!list.includes(roleKey)) {
          list.push(roleKey);
          localStorage.setItem(`startupz_applied_roles_${user.id}`, JSON.stringify(list));
        }
      } catch {}
    }

    // Direct Supabase sync so cloud database reflects the application immediately
    try {
      const projToSync = updated.find((p) => p.id === projectId);
      if (projToSync) {
        await supabase.from('projects').update({
          roles: projToSync.roles,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
      }
    } catch {}

    // Send realtime notification directly to team lead and creator in Supabase
    if (!isCreator && targetProject && user?.id) {
      const creatorId = targetProject.creator?.userId;
      const leadRole = targetProject.roles.find((r) => r.roleName === 'Project Lead');
      const leadId = leadRole?.assignedTo?.userId;
      const targetIds = new Set<string>();
      if (creatorId && creatorId !== user.id) targetIds.add(creatorId);
      if (leadId && leadId !== user.id) targetIds.add(leadId);

      const targetRole = targetProject.roles.find((r) => r.id === roleId);
      const roleName = targetRole?.roleName || 'Project Role';

      targetIds.forEach(async (tId) => {
        try {
          await supabase.from('notifications').insert({
            user_id: tId,
            sender_id: user.id,
            type: 'PROJECT_APPLICATION',
            title: `Role Application: ${roleName}`,
            message: `${userName} applied for the "${roleName}" role on "${targetProject.title}". Review their profile to accept or decline.`,
            link: '/projects',
            is_read: false,
          });
        } catch {}
      });
    }

    // Call server endpoint and adopt authoritative project response
    try {
      const res = await api.applyProjectRole(projectId, roleId).catch(() => null);
      if (res && res.project) {
        const merged = projects.map((p) => (p.id === projectId ? res.project : p));
        saveProjects(merged);
      }
    } catch {}

    if (isCreator) {
      const proj = updated.find((p) => p.id === projectId);
      if (proj) syncProjectGroup(proj);
      showToast('Assigned to role.');
    } else if (targetProject) {
      showToast(`Application submitted for ${targetProject.title}! Once the team leader accepts, this role will be filled.`);
    }
  };

  const handleAcceptApplicant = async (projectId: string, roleId: string, applicantUserId?: string) => {
    try {
      const res = await api.respondProjectApplicant(projectId, roleId, 'ACCEPT', applicantUserId).catch(() => null);
      if (res && res.project) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)));
        saveProjects(projects.map((p) => (p.id === projectId ? res.project : p)));
      }
    } catch {}

    let triggeredCompletion = false;
    let completedProject: BuilderProject | null = null;

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const nextRoles = p.roles.map((r) => {
          if (r.id === roleId) {
            const list = Array.isArray(r.pendingApplicants) && r.pendingApplicants.length > 0
              ? r.pendingApplicants
              : r.pendingApplicant
              ? [r.pendingApplicant]
              : [];
            const chosenApplicant = applicantUserId
              ? list.find((a) => a.userId === applicantUserId) || list[0]
              : list[0];

            if (chosenApplicant) {
              return {
                ...r,
                status: 'ASSIGNED' as const,
                assignedTo: {
                  userId: chosenApplicant.userId,
                  fullName: chosenApplicant.fullName,
                  avatar: chosenApplicant.avatar || null,
                },
                pendingApplicant: null,
                pendingApplicants: [], // remaining applications closed, filled by single person!
                invitedUser: null,
              };
            }
          }
          return r;
        });

        const updatedProj = { ...p, roles: nextRoles };
        syncProjectGroup(updatedProj);

        const allFilled = nextRoles.every((r) => r.status === 'ASSIGNED');
        if (allFilled && p.visibility === 'PUBLIC') {
          triggeredCompletion = true;
          completedProject = updatedProj;
        }

        return updatedProj;
      }
      return p;
    });

    saveProjects(updated);

    // Direct Supabase sync so cloud database reflects acceptance immediately
    try {
      const projToSync = updated.find((p) => p.id === projectId);
      if (projToSync) {
        await supabase.from('projects').update({
          roles: projToSync.roles,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
      }
    } catch (sbErr) {
      console.warn('Supabase accept sync notice:', sbErr);
    }

    if (reviewRoleModal && reviewRoleModal.role.id === roleId) {
      setReviewRoleModal(null);
    }

    if (triggeredCompletion && completedProject) {
      setRoleCompletionModal(completedProject);
    } else {
      showToast('Applicant accepted! Role is now filled and member added to project chat.');
    }
  };

  const handleDeclineApplicant = async (projectId: string, roleId: string, applicantUserId?: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              const list = Array.isArray(r.pendingApplicants) && r.pendingApplicants.length > 0
                ? r.pendingApplicants
                : r.pendingApplicant
                ? [r.pendingApplicant]
                : [];
              const nextList = applicantUserId
                ? list.filter((a) => a.userId !== applicantUserId)
                : list.slice(1);

              const currentDeclined = Array.isArray(r.declinedApplicantIds) ? r.declinedApplicantIds : [];
              const nextDeclined = applicantUserId && !currentDeclined.includes(applicantUserId)
                ? [...currentDeclined, applicantUserId]
                : currentDeclined;

              return {
                ...r,
                status: 'OPEN' as const,
                pendingApplicant: nextList[0] || null,
                pendingApplicants: nextList,
                declinedApplicantIds: nextDeclined,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);

    const roleKey = `${projectId}:${roleId}`;
    if (applicantUserId) {
      try {
        const stored = localStorage.getItem(`startupz_applied_roles_${applicantUserId}`);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          const filtered = list.filter((k) => k !== roleKey);
          localStorage.setItem(`startupz_applied_roles_${applicantUserId}`, JSON.stringify(filtered));
        }
      } catch {}
    }

    if (user?.id && (applicantUserId === user.id || !applicantUserId || appliedRolesSet.has(roleKey))) {
      setAppliedRolesSet((prev) => {
        const next = new Set(prev);
        next.delete(roleKey);
        return next;
      });
      try {
        const stored = localStorage.getItem(`startupz_applied_roles_${user.id}`);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          const filtered = list.filter((k) => k !== roleKey);
          localStorage.setItem(`startupz_applied_roles_${user.id}`, JSON.stringify(filtered));
        }
      } catch {}
    }

    // Direct Supabase sync so cloud database reflects decline immediately
    try {
      const projToSync = updated.find((p) => p.id === projectId);
      if (projToSync) {
        await supabase.from('projects').update({
          roles: projToSync.roles,
          updated_at: new Date().toISOString(),
        }).eq('id', projectId);
      }
    } catch (sbErr) {
      console.warn('Supabase decline sync notice:', sbErr);
    }

    // Server API call
    try {
      const res = await api.respondProjectApplicant(projectId, roleId, 'DECLINE', applicantUserId).catch(() => null);
      if (res && res.project) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? res.project : p)));
        saveProjects(projects.map((p) => (p.id === projectId ? res.project : p)));
      }
    } catch {}

    if (reviewRoleModal && reviewRoleModal.role.id === roleId) {
      const targetProj = updated.find((p) => p.id === projectId);
      const targetRole = targetProj?.roles.find((r) => r.id === roleId);
      if (targetProj && targetRole) {
        setReviewRoleModal({ project: targetProj, role: targetRole });
      }
    }

    showToast('Application declined.');
  };

  const handleToggleVisibility = async (projectId: string, newVis: 'PUBLIC' | 'PRIVATE') => {
    // 1. Optimistically update local state & localStorage
    const updated = projects.map((p) => (p.id === projectId ? { ...p, visibility: newVis } : p));
    setProjects(updated);
    saveProjects(updated);

    // 2. Direct Supabase update for immediate database persistence across mobile and desktop
    try {
      await supabase
        .from('projects')
        .update({ visibility: newVis, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    } catch (sbErr) {
      console.warn('Supabase visibility update notice:', sbErr);
    }

    // 3. Server API update
    try {
      await api.updateProject(projectId, { visibility: newVis });
    } catch (apiErr) {
      console.warn('Server visibility update notice:', apiErr);
    }

    showToast(`Project visibility set to ${newVis === 'PRIVATE' ? 'Private' : 'Public'}.`);
    if (roleCompletionModal?.id === projectId) {
      setRoleCompletionModal(null);
    }
  };

  const getRoleIcon = (iconType: string) => {
    switch (iconType) {
      case 'code':
        return <Code size={14} className="text-blue-500" />;
      case 'design':
        return <Palette size={14} className="text-purple-500" />;
      case 'marketing':
        return <Megaphone size={14} className="text-amber-500" />;
      case 'product':
        return <Rocket size={14} className="text-emerald-500" />;
      default:
        return <Briefcase size={14} className="text-slate-400" />;
    }
  };

  const filteredProjects = projects.filter((p) => {
    // Visibility check: Private projects only visible to creator, lead, or assigned/invited members
    if (p.visibility === 'PRIVATE') {
      if (!user) return false;
      if (user.isAdmin) return true;

      const userIds = new Set(
        [user.id, user.profile?.id, user.profile?.userId].filter(Boolean).map(String)
      );
      const creatorId = String(p.creator?.userId || (p as any).creatorId || '');
      const isCreator = Boolean(creatorId && userIds.has(creatorId)) || isCurrentUserMatch(p.creator, user);

      const isMember = Array.isArray(p.roles) && p.roles.some((r) => {
        if (r.status !== 'ASSIGNED' || !r.assignedTo) return false;
        return isCurrentUserMatch(r.assignedTo, user);
      });

      const isInvited = Array.isArray(p.roles) && p.roles.some((r) => {
        if (r.status !== 'INVITED' || !r.invitedUser) return false;
        return isCurrentUserMatch(r.invitedUser, user);
      });

      const isLead = Array.isArray(p.roles) && p.roles.some((r) => {
        const isLeadRole = (r.roleName || '').toLowerCase().includes('lead') || (r as any).isLead;
        if (!isLeadRole || !r.assignedTo) return false;
        return isCurrentUserMatch(r.assignedTo, user);
      });

      const userEmail = (user.email || '').toLowerCase().trim();
      const emailMatches =
        Boolean(userEmail) &&
        (((p.creator as any)?.email && userEmail === (p.creator as any).email.toLowerCase().trim()) ||
          (Array.isArray(p.roles) &&
            p.roles.some((r) => (r.assignedTo as any)?.email && userEmail === (r.assignedTo as any).email.toLowerCase().trim())));

      const userFullName = (user.profile?.fullName || '').toLowerCase().trim();
      const nameMatches =
        Boolean(userFullName) &&
        ((p.creator?.fullName && userFullName === p.creator.fullName.trim().toLowerCase()) ||
          (Array.isArray(p.roles) &&
            p.roles.some(
              (r) =>
                r.assignedTo?.fullName &&
                userFullName === r.assignedTo.fullName.trim().toLowerCase()
            )));

      if (!isCreator && !isMember && !isInvited && !isLead && !emailMatches && !nameMatches) {
        return false;
      }
    }

    if (filterTab === 'open_roles') {
      const hasOpen = p.roles.some((r) => r.status === 'OPEN');
      if (!hasOpen) return false;
    }
    if (filterTab === 'my_projects') {
      const isMine =
        isCurrentUserMatch(p.creator, user) ||
        p.roles.some((r) => r.status === 'ASSIGNED' && isCurrentUserMatch(r.assignedTo, user)) ||
        p.roles.some((r) => r.status === 'INVITED' && isCurrentUserMatch(r.invitedUser, user));
      if (!isMine) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.ideaSummary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.roles.some((r) => r.roleName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="w-full max-w-full xl:max-w-7xl 2xl:max-w-[1500px] mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8 min-w-0 overflow-x-hidden">
      <SEO
        title="Builder Projects & Collaborative Teams | HookZ"
        description="Discover collaborative builder projects, split roles with teammates, and build real-world products together on HookZ."
        canonicalPath="/projects"
        breadcrumbs={[{ name: 'Projects', path: '/projects' }]}
      />
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-modal text-xs font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 max-w-md">
          <Bell size={16} className="text-brand-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-6 min-w-0 overflow-hidden">
        <div className="max-w-xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.08] text-brand-300 text-[11px] font-medium border border-white/10">
            <Rocket size={12} /> Pre-Establishment Builder Workspace
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight !text-[#F8FAFC]"
            style={{ color: '#F8FAFC' }}
          >
            Projects: Collaborate on Ideas
          </h1>
          <p
            className="text-xs sm:text-sm !text-[#CBD5E1] leading-relaxed font-normal"
            style={{ color: '#CBD5E1' }}
          >
            Have an idea before officially incorporating a startup? Create a project, choose to publish it public or keep it private, split roles with your team, and chat together in your project group.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              navigate('/login');
              return;
            }
            setCreateModalOpen(true);
          }}
          className="btn-primary !py-2.5 !px-5 whitespace-nowrap self-start md:self-auto cursor-pointer inline-flex items-center gap-2 font-semibold shadow-xs rounded-lg"
        >
          <Plus size={16} />
          <span>Create Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-dark-850 rounded-xl border border-slate-200 dark:border-dark-800 self-start">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setFilterTab('open_roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterTab === 'open_roles'
                ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Seeking Roles
          </button>
          {user && (
            <button
              onClick={() => setFilterTab('my_projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === 'my_projects'
                  ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Projects & Roles
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, roles, tech stack..."
            className="input-base pl-9 pr-3 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="card-base p-12 text-center space-y-3">
          <FolderKanban size={32} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            No projects match your filter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new builder project to split roles.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
          >
            <Plus size={13} /> Post First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 min-w-0">
          {filteredProjects.map((project) => {
            const isCreator = isUserCreatorOfProject(project, user);
            const leadRole = project.roles.find((r) => (r.roleName || '').toLowerCase().includes('lead') || (r as any).isLead);
            const isProjectLead = Boolean(user && (isCurrentUserMatch(leadRole?.assignedTo, user) || isCreator));
            const isAcceptedMember = Boolean(
              user &&
              Array.isArray(project.roles) &&
              project.roles.some((r) => r.status === 'ASSIGNED' && isCurrentUserMatch(r.assignedTo, user))
            );
            const openRolesCount = project.roles.filter((r) => r.status === 'OPEN').length;
            const pendingRolesCount = project.roles.filter((r) => r.status === 'PENDING').length;
            const allFilled = project.roles.every((r) => r.status === 'ASSIGNED');

            const memberIds = new Set<string>();
            const projCreatorId = String(project.creator?.userId || (project as any)?.creatorId || '').trim();
            if (projCreatorId) {
              memberIds.add(projCreatorId.toLowerCase());
            } else if (project.creator?.fullName) {
              memberIds.add(String(project.creator.fullName).trim().toLowerCase());
            }
            (project.roles || []).forEach((r) => {
              if (r.status === 'ASSIGNED' && r.assignedTo) {
                const uid = String(r.assignedTo.userId || (r.assignedTo as any)?.id || '').trim();
                if (uid) {
                  memberIds.add(uid.toLowerCase());
                } else if (r.assignedTo.fullName) {
                  memberIds.add(String(r.assignedTo.fullName).trim().toLowerCase());
                }
              }
            });
            const totalMembersCount = Math.max(1, memberIds.size);

            return (
              <div
                key={project.id}
                id={`project-${project.id}`}
                className={`card-base p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-dark-700 transition-all duration-500 min-w-0 overflow-hidden break-words ${
                  highlightedProjectId === project.id
                    ? 'ring-4 ring-brand-500 ring-offset-2 dark:ring-offset-dark-900 shadow-2xl scale-[1.01] bg-brand-50/25 dark:bg-brand-950/25'
                    : ''
                }`}
              >
                <div className="space-y-3 min-w-0">
                  {/* Card Top: Title & Status Badges */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug break-words">
                        {project.title}
                      </h3>

                      {/* Status Badges Group */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] shrink-0">
                          {project.stage}
                        </span>

                        {/* Visibility Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0 ${
                            project.visibility === 'PUBLIC'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08]'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08]'
                          }`}
                        >
                          {project.visibility === 'PUBLIC' ? <Globe size={10} className="text-emerald-500" /> : <Lock size={10} />}
                          <span>{project.visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
                        </span>

                        {/* Total Members Count Badge */}
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] shrink-0"
                          title={`${totalMembersCount} team member${totalMembersCount > 1 ? 's' : ''} in this project`}
                        >
                          <Users size={11} className="text-slate-400" />
                          <span>{totalMembersCount} {totalMembersCount === 1 ? 'Member' : 'Members'}</span>
                        </span>

                        {/* Creator / Team Lead Visibility Switcher */}
                        {isProjectLead && (
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(project.id, project.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline ml-0.5 shrink-0 cursor-pointer transition-colors"
                            title="Click to toggle visibility"
                          >
                            Switch to {project.visibility === 'PUBLIC' ? 'Private' : 'Public'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Idea Summary / Description */}
                    {project.ideaSummary && (
                      <div className="min-w-0 break-words">
                        <p
                          className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words ${
                            expandedProjectText[project.id + '-idea'] ? '' : 'line-clamp-2 sm:line-clamp-3'
                          }`}
                        >
                          {project.ideaSummary}
                        </p>
                        {(project.ideaSummary.length > 90 || project.ideaSummary.split('\n').length > 2) && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProjectText((prev) => ({
                                ...prev,
                                [project.id + '-idea']: !prev[project.id + '-idea'],
                              }))
                            }
                            className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-0.5 cursor-pointer inline-flex items-center gap-0.5"
                          >
                            {expandedProjectText[project.id + '-idea'] ? 'Show less' : '...more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Problem Addressed */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-850/60 border border-slate-100 dark:border-dark-800 text-xs min-w-0 break-words">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Problem Solved:
                    </span>
                    <p
                      className={`text-slate-500 dark:text-slate-400 break-words ${
                        expandedProjectText[project.id + '-prob'] ? '' : 'line-clamp-2 sm:line-clamp-3'
                      }`}
                    >
                      {project.problemSolved}
                    </p>
                    {project.problemSolved && (project.problemSolved.length > 90 || project.problemSolved.split('\n').length > 2) && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProjectText((prev) => ({
                            ...prev,
                            [project.id + '-prob']: !prev[project.id + '-prob'],
                          }))
                        }
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-0.5 cursor-pointer inline-flex items-center gap-0.5"
                      >
                        {expandedProjectText[project.id + '-prob'] ? 'Show less' : '...more'}
                      </button>
                    )}
                  </div>

                  {/* Roles Splitter Table / Cards */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users size={14} className="text-brand-600" /> Team Roles Split ({totalMembersCount} {totalMembersCount === 1 ? 'member' : 'members'}):
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {openRolesCount > 0 ? `${openRolesCount} role(s) open` : allFilled ? 'All roles filled ✓' : 'In progress'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {project.roles.map((role) => {
                        const isAssigned = role.status === 'ASSIGNED';
                        const isInvited = role.status === 'INVITED';
                        const isMyAssignedRole = isAssigned && isCurrentUserMatch(role.assignedTo, user);
                        const isMyInvitedRole = isInvited && isCurrentUserMatch(role.invitedUser, user);
                        const isTargetHighlightedRole = searchParams.get('roleInvite') === role.id;

                        const declinedList = Array.isArray(role.declinedApplicantIds) ? role.declinedApplicantIds : [];
                        const rawApplicants = Array.isArray(role.pendingApplicants) && role.pendingApplicants.length > 0
                          ? role.pendingApplicants
                          : (role.pendingApplicant ? [role.pendingApplicant] : []);
                        const applicantsList = rawApplicants.filter((a) => !declinedList.includes(a.userId));
                        const isDeclined = Boolean(user?.id && declinedList.includes(user.id));
                        const isMyPendingRole = !isDeclined && Boolean(
                          (user?.id && applicantsList.some((a) => a.userId === user.id)) ||
                          appliedRolesSet.has(`${project.id}:${role.id}`)
                        );
                        const hasApplicants = applicantsList.length > 0;

                        return (
                          <div
                            key={role.id}
                            id={`role-${role.id}`}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col gap-2 transition-colors min-w-0 overflow-hidden break-words ${
                              isTargetHighlightedRole ? 'ring-2 ring-brand-500 shadow-md ' : ''
                            }${
                              isAssigned
                                ? 'bg-slate-50/70 dark:bg-dark-850/40 border-slate-200/60 dark:border-dark-800'
                                : hasApplicants
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                                : isInvited
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60'
                                : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800'
                            }`}
                          >
                            {/* Role Header: Icon, Name and Status Badge */}
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-1 rounded bg-slate-100 dark:bg-dark-800 shrink-0">
                                  {getRoleIcon(role.iconType)}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={role.roleName}>
                                  {role.roleName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isAssigned ? (
                                  <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                                    <Avatar
                                      src={role.assignedTo?.avatar}
                                      name={role.assignedTo?.fullName}
                                      size="xs"
                                      className="!w-4 !h-4"
                                    />
                                    <span className="truncate max-w-[85px]">
                                      {(role.assignedTo?.fullName || (role.assignedTo as any)?.email?.split('@')[0] || 'Team Member')} {isMyAssignedRole && '(You)'}
                                    </span>
                                  </div>
                                ) : isInvited ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                                    Invited
                                  </span>
                                ) : hasApplicants ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                                    {applicantsList.length} Applicant{applicantsList.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Open
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Role Actions Footer */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap pt-1.5 border-t border-slate-100 dark:border-dark-800/70 min-w-0">
                              {isAssigned ? (
                                <div className="flex items-center gap-1 w-full justify-between min-w-0">
                                  <span className="text-[10px] text-slate-400">Role Assigned</span>
                                  {isCreator && role.roleName !== 'Project Lead' && (
                                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                                      <button
                                        type="button"
                                        onClick={() => handleUnassignRole(project.id, role.id)}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/80 cursor-pointer"
                                        title="Unassign member and reopen role"
                                      >
                                        Unassign
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRole(project.id, role.id)}
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 cursor-pointer inline-flex items-center gap-0.5"
                                        title="Delete this role from project"
                                      >
                                        <Trash2 size={11} /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : isInvited ? (
                                isMyInvitedRole ? (
                                  <div className="flex items-center gap-1.5 flex-wrap w-full justify-between min-w-0">
                                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-bold">
                                      Invited You!
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleRespondInvite(project.id, role.id, 'ACCEPT')}
                                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                      >
                                        <Check size={11} /> Accept Role
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRespondInvite(project.id, role.id, 'DECLINE')}
                                        className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-200 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  </div>
                                ) : isProjectLead ? (
                                  <div className="flex items-center gap-1.5 flex-wrap w-full justify-between min-w-0">
                                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium truncate max-w-[170px]">
                                      Invited: {role.invitedUser?.fullName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelInvite(project.id, role.id)}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                                      title="Cancel role invitation"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Invitation sent to {role.invitedUser?.fullName}
                                  </span>
                                )
                              ) : isProjectLead ? (
                                <div className="flex items-center gap-1.5 flex-wrap w-full justify-between min-w-0">
                                  {hasApplicants ? (
                                    <button
                                      type="button"
                                      onClick={() => setReviewRoleModal({ project, role })}
                                      className="btn-primary !py-1 !px-2.5 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                                      title="Review candidate profiles who applied for this role"
                                    >
                                      <Users size={11} /> Review Profiles ({applicantsList.length})
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Open for applicants
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignModal(project.id, role.id, role.roleName)}
                                      className="btn-secondary !py-1 !px-2 !text-[11px] font-medium cursor-pointer inline-flex items-center gap-1 shrink-0"
                                      title="Invite or assign a connection to this role"
                                    >
                                      <UserPlus size={11} /> Assign
                                    </button>
                                    {isProjectLead && role.roleName !== 'Project Lead' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRole(project.id, role.id)}
                                        className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 cursor-pointer inline-flex items-center text-[10px] shrink-0"
                                        title="Delete this role from project"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full min-w-0">
                                  {isDeclined ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 shrink-0">
                                      <XCircle size={11} /> Application Declined
                                    </span>
                                  ) : isMyPendingRole ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 shrink-0">
                                      <Clock size={11} /> Applied (Pending Review)
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-[10px] text-slate-400 truncate mr-1">
                                        {hasApplicants ? `${applicantsList.length} applicant${applicantsList.length > 1 ? 's' : ''}` : 'No applicants yet'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleApplyRole(project.id, role.id)}
                                        className="btn-primary !py-1 !px-2.5 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0 ml-auto"
                                      >
                                        <Plus size={11} /> Apply for Role
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1 min-w-0 overflow-hidden">
                    {project.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700/60 truncate max-w-full"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Creator info & Action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      src={project.creator.avatar}
                      name={project.creator.fullName}
                      size="xs"
                      className="!w-6 !h-6 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {project.creator.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {project.creator.role ? `${project.creator.role} • ` : ''}{project.createdAt}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons: Team Chat, Save, Share, Delete */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap">
                    {/* Team Chat Link: strictly visible ONLY to project lead and accepted members */}
                    {(isProjectLead || isAcceptedMember) && (
                      <Link
                        to={`/messages?projectGroupId=proj-group-${project.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/60 hover:bg-brand-100 transition-colors shrink-0"
                        title="Open project group team chat"
                      >
                        <MessageSquare size={12} />
                        <span>Team Chat</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => handleBookmarkToggle(project.id, project.title)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
                        savedProjectIds.has(project.id)
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-800 dark:border-slate-700'
                          : 'bg-white dark:bg-[#0F1624] text-slate-600 border-slate-200/80 dark:border-white/[0.08] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50'
                      }`}
                      title={savedProjectIds.has(project.id) ? 'Remove from Saved' : 'Save Project'}
                    >
                      <Bookmark size={12} className={savedProjectIds.has(project.id) ? 'fill-current' : ''} />
                      <span>{savedProjectIds.has(project.id) ? 'Saved' : 'Save'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setShareModalItem({
                          title: project.title,
                          url: `/projects?projectId=${project.id}#project-${project.id}`,
                          description: project.ideaSummary || project.problemSolved || 'Collaboration project on HookZ',
                          type: 'project',
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                      title="Share project with connections"
                    >
                      <Share2 size={12} />
                      <span>Share</span>
                    </button>

                    {isCreator && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                        title="Delete this project"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leader Post-Completion Prompt Modal */}
      {roleCompletionModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setRoleCompletionModal(null)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 max-w-md w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Team Complete: All Roles Filled!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every role in <strong className="text-slate-800 dark:text-slate-200">{roleCompletionModal.title}</strong> has been accepted. Would you like to keep this project Public for the community to follow, or make it Private to build exclusively with your team?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleToggleVisibility(roleCompletionModal.id, 'PUBLIC')}
                className="btn-primary !py-2 text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe size={14} />
                <span>Keep Public</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(roleCompletionModal.id, 'PRIVATE')}
                className="btn-secondary !py-2 text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} />
                <span>Make Private</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Project Modal */}
      {createModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
          {/* Full-viewport transparent backdrop covering 100% of entire page */}
          <div
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setCreateModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 sm:p-7 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                  <Rocket size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create Builder Project & Split Roles
                  </h3>
                  <p className="text-xs text-slate-500">Post a project workspace and find collaborators</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* 1. Project Name (Max 60 chars) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="e.g. NextGen Micro-SaaS AI Automation"
                  className={`input-base text-xs ${formTouched && !isTitleValid ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  {formTouched && !newTitle.trim() ? (
                    <span className="text-rose-500 font-medium">Project name is required</span>
                  ) : newTitle.length >= TITLE_MAX ? (
                    <span className="text-rose-500 font-medium">Reached {TITLE_MAX} character limit</span>
                  ) : (
                    <span className="text-slate-400">Max {TITLE_MAX} characters</span>
                  )}
                  <span className={`font-mono ml-auto ${newTitle.length >= TITLE_MAX ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {newTitle.length}/{TITLE_MAX}
                  </span>
                </div>
              </div>

              {/* 2. Short Description / Tagline (Max 100 chars) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Description / Tagline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value.slice(0, TAGLINE_MAX))}
                  placeholder="e.g. AI-driven workflow copilot built for student researchers"
                  className={`input-base text-xs ${formTouched && !isTaglineValid ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  {formTouched && !newTagline.trim() ? (
                    <span className="text-rose-500 font-medium">Short description / tagline is required</span>
                  ) : newTagline.length >= TAGLINE_MAX ? (
                    <span className="text-rose-500 font-medium">Reached {TAGLINE_MAX} character limit</span>
                  ) : (
                    <span className="text-slate-400">Max {TAGLINE_MAX} characters</span>
                  )}
                  <span className={`font-mono ml-auto ${newTagline.length >= TAGLINE_MAX ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {newTagline.length}/{TAGLINE_MAX}
                  </span>
                </div>
              </div>

              {/* 3. Problem Statement (Max 500 chars, required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Problem Statement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value.slice(0, PROBLEM_MAX))}
                  placeholder="What core problem or pain point is your project solving?"
                  className={`input-base text-xs resize-none ${formTouched && !isProblemValid ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  {formTouched && !newProblem.trim() ? (
                    <span className="text-rose-500 font-medium">Problem statement is required</span>
                  ) : newProblem.length >= PROBLEM_MAX ? (
                    <span className="text-rose-500 font-medium">Reached {PROBLEM_MAX} character limit</span>
                  ) : (
                    <span className="text-slate-400">Max {PROBLEM_MAX} characters</span>
                  )}
                  <span className={`font-mono ml-auto ${newProblem.length >= PROBLEM_MAX ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {newProblem.length}/{PROBLEM_MAX}
                  </span>
                </div>
              </div>

              {/* 4. Solution / Approach (Max 500 chars, required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Solution / Approach <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newSolution}
                  onChange={(e) => setNewSolution(e.target.value.slice(0, SOLUTION_MAX))}
                  placeholder="How does your project uniquely solve this problem and what is your technical approach?"
                  className={`input-base text-xs resize-none ${formTouched && !isSolutionValid ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`}
                />
                <div className="flex justify-between items-center mt-1 text-[11px]">
                  {formTouched && !newSolution.trim() ? (
                    <span className="text-rose-500 font-medium">Solution / approach is required</span>
                  ) : newSolution.length >= SOLUTION_MAX ? (
                    <span className="text-rose-500 font-medium">Reached {SOLUTION_MAX} character limit</span>
                  ) : (
                    <span className="text-slate-400">Max {SOLUTION_MAX} characters</span>
                  )}
                  <span className={`font-mono ml-auto ${newSolution.length >= SOLUTION_MAX ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {newSolution.length}/{SOLUTION_MAX}
                  </span>
                </div>
              </div>

              {/* 5. Detailed Description (No character limit) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={newDetailedDescription}
                  onChange={(e) => setNewDetailedDescription(e.target.value)}
                  placeholder="Provide any additional architecture details, milestones, hackathon context, or vision..."
                  className="input-base text-xs resize-none"
                />
              </div>

              {/* 6. Tech Stack (Tag Input, min 1 required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tech Stack <span className="text-rose-500">*</span>
                </label>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                    {newTechStack.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shadow-2xs"
                      >
                        <span>{tech}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTechTag(tech)}
                          className="hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {newTechStack.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No tags added yet. Add at least 1 technology tag.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTechTag(e);
                        }
                      }}
                      placeholder="Type a technology (e.g. Next.js, Python, Supabase) and hit Enter"
                      className="input-base text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleAddTechTag(e)}
                      disabled={!techInput.trim()}
                      className="btn-secondary !text-xs !py-2 px-3 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      + Add Tag
                    </button>
                  </div>
                </div>
                {formTouched && !isTechValid && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    At least 1 tech stack tag is required
                  </p>
                )}
              </div>

              {/* Visibility Choice: Publish or Keep in Private */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project Visibility <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setNewVisibility('PUBLIC')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                      newVisibility === 'PUBLIC'
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850/40'
                    }`}
                  >
                    <Globe size={16} className={newVisibility === 'PUBLIC' ? 'text-brand-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Publish (Public)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Discoverable by community. Anyone can view and apply for open roles.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setNewVisibility('PRIVATE')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                      newVisibility === 'PRIVATE'
                        ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 ring-1 ring-brand-500'
                        : 'border-slate-200 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850/40'
                    }`}
                  >
                    <Lock size={16} className={newVisibility === 'PRIVATE' ? 'text-brand-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Keep in Private
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        Only you and accepted team members can see this project.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Development Stage
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as any)}
                  className="input-base text-xs"
                >
                  <option value="Ideation">Ideation & Concept</option>
                  <option value="Prototyping">Prototyping / Wireframing</option>
                  <option value="MVP Build">MVP Build</option>
                  <option value="Alpha Testing">Alpha / Early Testing</option>
                  <option value="Pre-Launch">Pre-Launch</option>
                </select>
              </div>

              {/* Roles Splitter Builder */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Split Roles Needed in Your Team:
                </label>
                <p className="text-[11px] text-slate-500">
                  Define specific responsibilities for collaborators. You will be assigned as Project Lead automatically.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                    ✓ Project Lead (You)
                  </span>
                  {rolesList.map((rName) => (
                    <span
                      key={rName}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <span>{rName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(rName)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Custom Role Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    placeholder="Add custom role (e.g. Prompt Engineer, Sales Rep, Growth Lead)"
                    className="input-base text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    className="btn-secondary !text-xs !py-2 px-3 whitespace-nowrap cursor-pointer"
                  >
                    + Add Role
                  </button>
                </div>
              </div>

              {/* Submit / Cancel Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary !text-xs !py-2.5 !px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className={`btn-primary !text-xs !py-2.5 !px-5 font-semibold transition-all ${
                    !isFormValid
                      ? 'opacity-50 cursor-not-allowed hover:bg-brand-600'
                      : 'cursor-pointer hover:bg-brand-700'
                  }`}
                >
                  Create Project & Split Roles
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Assign Connection to Role Modal */}
      {assignModalRole && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
          <div
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setAssignModalRole(null)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 max-w-md w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign Role to Connection
                  </h3>
                  <p className="text-xs text-slate-500">
                    Role: <strong className="text-brand-600 dark:text-brand-400">{assignModalRole.roleName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalRole(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Select one of your connections to send a role invitation. The role will be officially filled only once they accept.
            </p>

            {/* Search connections */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={connectionSearchQuery}
                onChange={(e) => setConnectionSearchQuery(e.target.value)}
                placeholder="Search connections by name..."
                className="input-base pl-9 pr-3 py-1.5 text-xs w-full"
              />
            </div>

            {/* Connections list */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {loadingConnections ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading your connections...
                </div>
              ) : (
                (() => {
                  const filtered = connectionsList.filter(
                    (c) =>
                      !connectionSearchQuery.trim() ||
                      c.fullName.toLowerCase().includes(connectionSearchQuery.toLowerCase()) ||
                      (c.headline && c.headline.toLowerCase().includes(connectionSearchQuery.toLowerCase()))
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center space-y-2">
                        <Users size={24} className="mx-auto text-slate-400" />
                        <p className="text-xs text-slate-500">
                          {connectionsList.length === 0
                            ? "You don't have any accepted connections yet. Connect with other builders first!"
                            : 'No matching connections found.'}
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((conn) => (
                    <div
                      key={conn.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-800 hover:border-brand-500 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-dark-850/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={conn.avatar} name={conn.fullName} size="sm" className="!w-8 !h-8 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {conn.fullName}
                          </p>
                          {conn.headline && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {conn.headline}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDirectAssignRole(
                              assignModalRole.projectId,
                              assignModalRole.roleId,
                              conn.id,
                              conn.fullName,
                              conn.avatar
                            )
                          }
                          className="btn-primary !py-1 !px-2.5 !text-xs font-semibold cursor-pointer"
                          title="Directly assign this role to connection"
                        >
                          Assign Role
                        </button>
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAssignModalRole(null)}
                className="btn-secondary !text-xs !py-1.5 !px-3.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Team Lead Review Role Applicants Modal */}
      {reviewRoleModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setReviewRoleModal(null)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 max-w-lg w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={18} className="text-amber-600" />
                  Review Applicants: {reviewRoleModal.role.roleName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applicants who applied for this role on "{reviewRoleModal.project.title}". Review profiles and select whom to accept.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewRoleModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List of pending applicants */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(() => {
                const role = reviewRoleModal.project.roles.find((r) => r.id === reviewRoleModal.role.id) || reviewRoleModal.role;
                const declinedList = Array.isArray(role.declinedApplicantIds) ? role.declinedApplicantIds : [];
                const rawList = Array.isArray(role.pendingApplicants) && role.pendingApplicants.length > 0
                  ? role.pendingApplicants
                  : role.pendingApplicant
                  ? [role.pendingApplicant]
                  : [];
                const activeApplicants = rawList.filter((a) => !declinedList.includes(a.userId));

                if (activeApplicants.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      No pending applicants for this role currently.
                    </div>
                  );
                }

                return activeApplicants.map((app) => (
                  <div
                    key={app.userId}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-dark-800 bg-slate-50/70 dark:bg-dark-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar src={app.avatar} name={app.fullName} size="sm" className="!w-9 !h-9 mt-0.5 shrink-0" />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {app.fullName}
                          </span>
                          {app.username && (
                            <span className="text-[11px] text-slate-400 truncate">
                              @{app.username}
                            </span>
                          )}
                        </div>
                        {app.roleDescription && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {app.roleDescription}
                          </p>
                        )}
                        <Link
                          to={`/profile/${app.userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-0.5"
                        >
                          View Full Profile <ExternalLink size={10} />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleAcceptApplicant(reviewRoleModal.project.id, reviewRoleModal.role.id, app.userId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineApplicant(reviewRoleModal.project.id, reviewRoleModal.role.id, app.userId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-dark-800 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex justify-end">
              <button
                type="button"
                onClick={() => setReviewRoleModal(null)}
                className="btn-secondary !text-xs !py-1.5 !px-3.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share with Connections Modal */}
      <ShareModal
        isOpen={Boolean(shareModalItem)}
        onClose={() => setShareModalItem(null)}
        item={shareModalItem}
      />
    </div>
  );
};
