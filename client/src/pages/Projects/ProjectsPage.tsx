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
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';

export interface PendingApplicant {
  userId: string;
  fullName: string;
  avatar?: string | null;
  roleDescription?: string;
  appliedAt: string;
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
  status: 'OPEN' | 'PENDING' | 'ASSIGNED';
}

export interface BuilderProject {
  id: string;
  title: string;
  ideaSummary: string;
  problemSolved: string;
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
  const [newIdeaSummary, setNewIdeaSummary] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newStage, setNewStage] = useState<'Ideation' | 'Prototyping' | 'MVP Build' | 'Alpha Testing' | 'Pre-Launch'>('Ideation');
  const [newVisibility, setNewVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [newTags, setNewTags] = useState('AI, Web3, SaaS');
  const [rolesList, setRolesList] = useState<string[]>([
    'Frontend Developer',
    'Backend Developer',
    'UI/UX Designer',
    'Growth & Marketing',
  ]);
  const [customRoleInput, setCustomRoleInput] = useState('');

  // Sync initial project groups
  useEffect(() => {
    projects.forEach((p) => syncProjectGroup(p));
  }, []);

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

  const handleDeleteProject = (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project idea?')) {
      return;
    }
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

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!newTitle.trim() || !newIdeaSummary.trim()) return;

    const creatorName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
    const newProject: BuilderProject = {
      id: `proj-${Date.now()}`,
      title: newTitle.trim(),
      ideaSummary: newIdeaSummary.trim(),
      problemSolved: newProblem.trim() || 'Pre-establishment problem discovery.',
      stage: newStage,
      visibility: newVisibility,
      creator: {
        userId: user.id,
        fullName: creatorName,
        avatar: user.profile?.avatar || null,
        role: user.profile?.headline || 'Project Lead',
      },
      roles: [
        {
          id: `r-creator-${Date.now()}`,
          roleName: 'Project Lead',
          iconType: 'product',
          status: 'ASSIGNED',
          assignedTo: {
            userId: user.id,
            fullName: creatorName,
            avatar: user.profile?.avatar || null,
          },
        },
        ...rolesList.map((rName, idx) => ({
          id: `r-open-${Date.now()}-${idx}`,
          roleName: rName,
          iconType: (rName.toLowerCase().includes('design') ? 'design' : rName.toLowerCase().includes('market') || rName.toLowerCase().includes('sales') ? 'marketing' : 'code') as any,
          status: 'OPEN' as const,
        })),
      ],
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: 'Just now',
    };

    const updated = [newProject, ...projects];
    saveProjects(updated);
    syncProjectGroup(newProject);

    setCreateModalOpen(false);
    showToast(`Project "${newProject.title}" created! Team chat group initialized in Messages.`);

    // Reset Form
    setNewTitle('');
    setNewIdeaSummary('');
    setNewProblem('');
    setNewStage('Ideation');
    setNewVisibility('PUBLIC');
  };

  const handleApplyRole = (projectId: string, roleId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const userName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
    const userHeadline = user.profile?.headline || 'Team Collaborator';

    const targetProject = projects.find((p) => p.id === projectId);
    const isCreator = targetProject?.creator.userId === user.id;

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              if (isCreator) {
                // Creator joins their own role directly
                return {
                  ...r,
                  status: 'ASSIGNED' as const,
                  assignedTo: {
                    userId: user.id,
                    fullName: userName,
                    avatar: user.profile?.avatar || null,
                  },
                  pendingApplicant: null,
                };
              }
              // Normal applicant: create a pending application, notify owner
              return {
                ...r,
                status: 'PENDING' as const,
                pendingApplicant: {
                  userId: user.id,
                  fullName: userName,
                  avatar: user.profile?.avatar || null,
                  roleDescription: userHeadline,
                  appliedAt: 'Just now',
                },
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
      showToast(`Application sent to ${targetProject.creator.fullName}! Once accepted, your name will fill this role.`);
    }
  };

  const handleAcceptApplicant = (projectId: string, roleId: string) => {
    let triggeredCompletion = false;
    let completedProject: BuilderProject | null = null;

    const updated = projects.map((p) => {
      if (p.id === projectId) {
        const nextRoles = p.roles.map((r) => {
          if (r.id === roleId && r.pendingApplicant) {
            return {
              ...r,
              status: 'ASSIGNED' as const,
              assignedTo: {
                userId: r.pendingApplicant.userId,
                fullName: r.pendingApplicant.fullName,
                avatar: r.pendingApplicant.avatar || null,
              },
              pendingApplicant: null,
            };
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

  const handleDeclineApplicant = (projectId: string, roleId: string) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          roles: p.roles.map((r) => {
            if (r.id === roleId) {
              return {
                ...r,
                status: 'OPEN' as const,
                pendingApplicant: null,
              };
            }
            return r;
          }),
        };
      }
      return p;
    });

    saveProjects(updated);
    showToast('Application declined. Role reopened.');
  };

  const handleToggleVisibility = (projectId: string, newVis: 'PUBLIC' | 'PRIVATE') => {
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
      const isMine = p.creator.userId === user?.id || p.roles.some((r) => r.assignedTo?.userId === user?.id);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Projects: Collaborate on Ideas
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

                    {/* Team Chat Link & Delete Action */}
                    <div className="flex items-center gap-1.5">
                      {isCreator && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
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
                        const isPending = role.status === 'PENDING';
                        const isMyAssignedRole = isAssigned && role.assignedTo?.userId === user?.id;
                        const isMyPendingRole = isPending && role.pendingApplicant?.userId === user?.id;

                        return (
                          <div
                            key={role.id}
                            className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                              isAssigned
                                ? 'bg-slate-50/70 dark:bg-dark-850/40 border-slate-200/60 dark:border-dark-800'
                                : isPending
                                ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
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
                              ) : isPending ? (
                                isCreator ? (
                                  /* Owner sees pending applicant with Accept / Decline */
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                                      {role.pendingApplicant?.fullName}:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptApplicant(project.id, role.id)}
                                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check size={11} /> Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeclineApplicant(project.id, role.id)}
                                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-dark-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : isMyPendingRole ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                                    <Clock size={11} /> Application Pending Review
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Applicant under review
                                  </span>
                                )
                              ) : (
                                /* Role is OPEN */
                                <button
                                  type="button"
                                  onClick={() => handleApplyRole(project.id, role.id)}
                                  className="btn-primary !py-1 !px-2.5 !text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Plus size={11} /> {isCreator ? 'Take Role' : 'Apply for Role'}
                                </button>
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
          <div className="max-w-xl w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl p-6 shadow-modal space-y-4 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                  <Rocket size={16} />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create Builder Project & Split Roles
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project / Idea Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. NextGen Micro-SaaS AI Automation"
                  className="input-base text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Idea Summary (What are you building?) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newIdeaSummary}
                  onChange={(e) => setNewIdeaSummary(e.target.value)}
                  placeholder="Briefly describe the concept, solution, and what the team will build together before establishment."
                  className="input-base text-xs resize-none"
                />
              </div>

              {/* Visibility Choice: Publish or Keep in Private */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Project Visibility: Publish Public or Keep in Private? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setNewVisibility('PUBLIC')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
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
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="AI, React, CleanTech"
                    className="input-base text-xs"
                  />
                </div>
              </div>

              {/* Roles Splitter Builder */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-2.5">
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
                    className="btn-secondary !text-xs !py-2 px-3 whitespace-nowrap"
                  >
                    + Add Role
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary !text-xs !py-2 !px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary !text-xs !py-2 !px-5 font-semibold cursor-pointer"
                >
                  Create Project & Split Roles
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
