import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';
import { api } from '../../services/api';
import { supabase, fetchUserConnections } from '../../lib/supabase';

export interface PendingApplicant {
  userId: string;
  fullName: string;
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

export const syncProjectGroup = (project: BuilderProject) => {
  try {
    const raw = localStorage.getItem('startupz_project_groups');
    let groups: any[] = raw ? JSON.parse(raw) : [];
    const groupId = `proj-group-${project.id}`;
    const existingIdx = groups.findIndex((g) => g.id === groupId);

    const members = [
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

  const [projects, setProjects] = useState<BuilderProject[]>(() => {
    try {
      const stored = localStorage.getItem('startupz_builder_projects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly filter out any legacy fake/starter projects
          return parsed.filter(
            (p: any) =>
              p &&
              !['proj-1', 'proj-2', 'proj-3'].includes(p.id) &&
              !['creator-1', 'creator-2', 'creator-3'].includes(p?.creator?.userId)
          );
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

  // Saved Projects state
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
  const [connectionsList, setConnectionsList] = useState<Array<{ id: string; fullName: string; avatar?: string | null; headline?: string }>>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const saveProjects = (updated: BuilderProject[]) => {
    setProjects(updated);
    try {
      localStorage.setItem('startupz_builder_projects', JSON.stringify(updated));
    } catch {}
  };

  // Fetch projects from server on mount & merge with local storage
  useEffect(() => {
    let isMounted = true;
    const fetchServerProjects = async () => {
      try {
        const res = await api.getProjects().catch(() => null);
        if (res && Array.isArray(res.projects)) {
          const serverList: BuilderProject[] = res.projects;
          if (isMounted) {
            setProjects(serverList);
            try {
              localStorage.setItem('startupz_builder_projects', JSON.stringify(serverList));
            } catch {}
            serverList.forEach((p) => syncProjectGroup(p));
          }
        }
      } catch (err) {
        console.warn('Could not fetch server projects:', err);
      }
    };

    fetchServerProjects();
    return () => {
      isMounted = false;
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

      setConnectionsList(Array.from(connMap.values()));
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
    try {
      await api.assignProjectRole(projectId, roleId, {
        targetUserId,
        targetFullName: targetName,
        targetAvatar: targetAvatar || undefined,
      }).catch(() => null);
    } catch (err) {}

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                status: 'ASSIGNED' as const,
                assignedTo: {
                  userId: targetUserId,
                  fullName: targetName,
                  avatar: targetAvatar || null,
                },
                pendingApplicant: null,
                pendingApplicants: [],
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
    setAssignModalRole(null);
    showToast(`Role "${assignModalRole?.roleName || 'Role'}" directly assigned to ${targetName}!`);
  };

  const handleSendRoleInvite = async (projectId: string, roleId: string, targetUserId: string, targetName: string) => {
    try {
      await api.inviteProjectRole(projectId, roleId, targetUserId).catch(() => null);
    } catch (err) {}

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
    try {
      await api.respondProjectInvite(projectId, roleId, action).catch(() => null);
    } catch (err) {}

    const userName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
    let triggeredCompletion = false;
    let completedProject: BuilderProject | null = null;

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

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project idea?')) {
      return;
    }
    try {
      await api.deleteProject(projectId).catch(() => null);
    } catch {}
    const updated = projects.filter((p) => p.id !== projectId);
    saveProjects(updated);
    try {
      const raw = localStorage.getItem('startupz_project_groups');
      if (raw) {
        const groups = JSON.parse(raw);
        const filteredGroups = groups.filter(
          (g: any) => g.projectId !== projectId && g.id !== `proj-group-${projectId}`
        );
        localStorage.setItem('startupz_project_groups', JSON.stringify(filteredGroups));
      }
    } catch {}
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
    if (!isFormValid) return;

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

    const updated = [newProject, ...projects];
    saveProjects(updated);
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
  };

  const handleApplyRole = async (projectId: string, roleId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await api.applyProjectRole(projectId, roleId).catch(() => null);
    } catch {}

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

              return {
                ...r,
                // Status remains OPEN so any number of builders can also apply!
                status: 'OPEN' as const,
                pendingApplicant: nextList[0] || null,
                pendingApplicants: nextList,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);

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
      await api.respondProjectApplicant(projectId, roleId, 'ACCEPT', applicantUserId).catch(() => null);
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

    if (triggeredCompletion && completedProject) {
      setRoleCompletionModal(completedProject);
    } else {
      showToast('Applicant accepted! Role is now filled and member added to project chat.');
    }
  };

  const handleDeclineApplicant = async (projectId: string, roleId: string, applicantUserId?: string) => {
    try {
      await api.respondProjectApplicant(projectId, roleId, 'DECLINE', applicantUserId).catch(() => null);
    } catch {}

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

              return {
                ...r,
                status: 'OPEN' as const,
                pendingApplicant: nextList[0] || null,
                pendingApplicants: nextList,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);
    showToast('Application declined.');
  };

  const handleToggleVisibility = async (projectId: string, newVis: 'PUBLIC' | 'PRIVATE') => {
    try {
      await api.updateProject(projectId, { visibility: newVis }).catch(() => null);
    } catch {}

    const updated = projects.map((p) => (p.id === projectId ? { ...p, visibility: newVis } : p));
    saveProjects(updated);
    showToast(`Project visibility set to ${newVis}.`);
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
    // Visibility check: Private projects only visible to creator or assigned members
    if (p.visibility === 'PRIVATE') {
      const creatorId = p.creator?.userId || (p as any).creatorId;
      const isMine = creatorId === user?.id || (Array.isArray(p.roles) && p.roles.some((r) => r.assignedTo?.userId === user?.id));
      if (!isMine) return false;
    }

    if (filterTab === 'open_roles') {
      const hasOpen = p.roles.some((r) => r.status === 'OPEN');
      if (!hasOpen) return false;
    }
    if (filterTab === 'my_projects') {
      const isMine = p.creator.userId === user?.id || p.roles.some((r) => r.assignedTo?.userId === user?.id);
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
    <div className="max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      
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
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-brand-900 via-slate-900 to-indigo-950 text-white shadow-modal border border-brand-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
            <Rocket size={13} /> Pre-Establishment Builder Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FFFFFF] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
            <span className="text-[#FFFFFF]">Projects: </span>
            <span className="bg-gradient-to-r from-[#FFFFFF] via-[#F8FAFC] to-brand-300 bg-clip-text text-transparent">Collaborate on Ideas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
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
          className="btn-primary !py-2.5 !px-5 whitespace-nowrap self-start md:self-auto cursor-pointer inline-flex items-center gap-2 font-semibold shadow-md"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const isCreator = user?.id === project.creator.userId;
            const openRolesCount = project.roles.filter((r) => r.status === 'OPEN').length;
            const pendingRolesCount = project.roles.filter((r) => r.status === 'PENDING').length;
            const allFilled = project.roles.every((r) => r.status === 'ASSIGNED');

            return (
              <div
                key={project.id}
                className="card-base p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
              >
                <div className="space-y-3">
                  
                  {/* Card Header: Stage, Visibility & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                        {project.stage}
                      </span>

                      {/* Visibility Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          project.visibility === 'PUBLIC'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700'
                        }`}
                      >
                        {project.visibility === 'PUBLIC' ? <Globe size={10} /> : <Lock size={10} />}
                        <span>{project.visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
                      </span>

                      {/* Creator Visibility Switcher */}
                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(project.id, project.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                          className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                          title="Click to toggle visibility"
                        >
                          Switch to {project.visibility === 'PUBLIC' ? 'Private' : 'Public'}
                        </button>
                      )}
                    </div>

                    {/* Save Bookmark, Team Chat Link & Delete Action */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleBookmarkToggle(project.id, project.title)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                          savedProjectIds.has(project.id)
                            ? 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-950/60 dark:text-brand-400 dark:border-brand-900'
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-dark-800 dark:text-slate-400 dark:border-dark-700 hover:text-slate-700'
                        }`}
                        title={savedProjectIds.has(project.id) ? 'Remove from Saved' : 'Save Project'}
                      >
                        <Bookmark size={12} className={savedProjectIds.has(project.id) ? 'fill-current' : ''} />
                        <span>{savedProjectIds.has(project.id) ? 'Saved' : 'Save'}</span>
                      </button>

                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                          title="Delete this project"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      )}
                      <Link
                        to={`/messages?projectGroupId=proj-group-${project.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 hover:bg-brand-100 transition-colors"
                        title="Open project group team chat"
                      >
                        <MessageSquare size={12} />
                        <span>Team Chat</span>
                      </Link>
                    </div>
                  </div>

                  {/* Title & Idea */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {project.ideaSummary}
                    </p>
                  </div>

                  {/* Problem Addressed */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-850/60 border border-slate-100 dark:border-dark-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Problem Solved:
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {project.problemSolved}
                    </span>
                  </div>

                  {/* Roles Splitter Table / Cards */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users size={14} className="text-brand-600" /> Team Roles Split:
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {openRolesCount > 0 ? `${openRolesCount} role(s) open` : allFilled ? 'All roles filled ✓' : 'In progress'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {project.roles.map((role) => {
                        const isAssigned = role.status === 'ASSIGNED';
                        const isInvited = role.status === 'INVITED';
                        const isMyAssignedRole = isAssigned && role.assignedTo?.userId === user?.id;
                        const isMyInvitedRole = isInvited && role.invitedUser?.userId === user?.id;

                        const applicantsList = Array.isArray(role.pendingApplicants) && role.pendingApplicants.length > 0
                          ? role.pendingApplicants
                          : (role.pendingApplicant ? [role.pendingApplicant] : []);
                        const isMyPendingRole = applicantsList.some((a) => a.userId === user?.id);
                        const hasApplicants = applicantsList.length > 0;

                        return (
                          <div
                            key={role.id}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                              isAssigned
                                ? 'bg-slate-50/70 dark:bg-dark-850/40 border-slate-200/60 dark:border-dark-800'
                                : hasApplicants
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                                : isInvited
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60'
                                : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded bg-slate-100 dark:bg-dark-800">
                                {getRoleIcon(role.iconType)}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {role.roleName}
                              </span>
                            </div>

                            {/* Status and Action */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {isAssigned ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar
                                    src={role.assignedTo?.avatar}
                                    name={role.assignedTo?.fullName}
                                    size="xs"
                                    className="!w-5 !h-5"
                                  />
                                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                    {role.assignedTo?.fullName} {isMyAssignedRole && '(You)'}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                    Assigned
                                  </span>
                                </div>
                              ) : isInvited ? (
                                isMyInvitedRole ? (
                                  /* Target user sees invitation with Accept / Decline */
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-bold">
                                      Invited You!
                                    </span>
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
                                ) : isCreator ? (
                                  /* Creator sees invitation pending acceptance */
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                                      Invited: {role.invitedUser?.fullName} (Waiting for acceptance)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCancelInvite(project.id, role.id)}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
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
                              ) : isCreator ? (
                                /* Role is unassigned - Creator controls */
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                  {hasApplicants && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {applicantsList.map((app) => (
                                        <div
                                          key={app.userId}
                                          className="inline-flex items-center gap-1.5 bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded text-[11px]"
                                        >
                                          <Avatar src={app.avatar} name={app.fullName} size="xs" className="!w-4 !h-4" />
                                          <span className="font-semibold text-amber-900 dark:text-amber-300">
                                            {app.fullName}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleAcceptApplicant(project.id, role.id, app.userId)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-0.5 cursor-pointer ml-1"
                                            title="Accept applicant into role"
                                          >
                                            <Check size={10} /> Accept
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeclineApplicant(project.id, role.id, app.userId)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 cursor-pointer"
                                            title="Decline applicant"
                                          >
                                            Decline
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignModal(project.id, role.id, role.roleName)}
                                      className="btn-primary !py-1 !px-2.5 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                      title="Invite or assign a connection to this role"
                                    >
                                      <UserPlus size={11} /> Assign Connection
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApplyRole(project.id, role.id)}
                                      className="btn-secondary !py-1 !px-2 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                    >
                                      Take Role
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Role is unassigned - Non-creator perspective */
                                <div className="flex items-center gap-1.5">
                                  {isMyPendingRole ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                                      <Clock size={11} /> Applied (Pending Review)
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      {hasApplicants && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {applicantsList.length} applicant{applicantsList.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleApplyRole(project.id, role.id)}
                                        className="btn-primary !py-1 !px-2.5 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Plus size={11} /> Apply for Role
                                      </button>
                                    </div>
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
                  <div className="flex flex-wrap gap-1 pt-1">
                    {project.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Creator info & chat */}
                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={project.creator.avatar}
                      name={project.creator.fullName}
                      size="xs"
                      className="!w-6 !h-6"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {project.creator.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {project.creator.role}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {project.createdAt}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leader Post-Completion Prompt Modal */}
      {roleCompletionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-md w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95">
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
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 sm:p-7 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-8">
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
        </div>
      )}

      {/* Assign Connection to Role Modal */}
      {assignModalRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="max-w-md w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-8">
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
                        <button
                          type="button"
                          onClick={() =>
                            handleSendRoleInvite(
                              assignModalRole.projectId,
                              assignModalRole.roleId,
                              conn.id,
                              conn.fullName
                            )
                          }
                          className="btn-secondary !py-1 !px-2.5 !text-xs font-medium cursor-pointer"
                          title="Send role invitation request"
                        >
                          Invite
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
        </div>
      )}

    </div>
  );
};
