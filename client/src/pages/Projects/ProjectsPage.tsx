import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Users,
  UserCheck,
  Rocket,
  CheckCircle2,
  Code,
  Palette,
  Megaphone,
  Briefcase,
  Share2,
  ExternalLink,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  MessageSquare,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';

export interface ProjectRole {
  id: string;
  roleName: string;
  iconType: 'code' | 'design' | 'marketing' | 'product' | 'general';
  assignedTo?: {
    userId: string;
    fullName: string;
    avatar?: string | null;
  } | null;
  status: 'OPEN' | 'ASSIGNED';
}

export interface BuilderProject {
  id: string;
  title: string;
  ideaSummary: string;
  problemSolved: string;
  stage: 'Ideation' | 'Prototyping' | 'MVP Build' | 'Alpha Testing' | 'Pre-Launch';
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

const INITIAL_PROJECTS: BuilderProject[] = [
  {
    id: 'proj-1',
    title: 'PulseAgent AI — Autonomous Customer Success',
    ideaSummary: 'AI agent that proactively detects customer friction and automates resolution before users churn.',
    problemSolved: 'Customer support teams are overwhelmed with reactive tickets and lack automated root cause fixes.',
    stage: 'Prototyping',
    creator: {
      userId: 'creator-1',
      fullName: 'Vikram Sethi',
      role: 'Founder / Product Lead',
    },
    roles: [
      { id: 'r1', roleName: 'Project Lead & AI Prompt Architect', iconType: 'product', status: 'ASSIGNED', assignedTo: { userId: 'creator-1', fullName: 'Vikram Sethi' } },
      { id: 'r2', roleName: 'Frontend Engineer (React + Tailwind)', iconType: 'code', status: 'OPEN' },
      { id: 'r3', roleName: 'Python Backend & LangChain Dev', iconType: 'code', status: 'OPEN' },
      { id: 'r4', roleName: 'UI/UX Interaction Designer', iconType: 'design', status: 'OPEN' },
      { id: 'r5', roleName: 'Growth & Developer Marketing Lead', iconType: 'marketing', status: 'OPEN' },
    ],
    tags: ['AI Agent', 'FastAPI', 'React', 'B2B SaaS'],
    createdAt: '2 days ago',
  },
  {
    id: 'proj-2',
    title: 'SolarGrid P2P — Community Clean Power Trading',
    ideaSummary: 'A decentralized microgrid marketplace for rooftop solar owners to sell surplus power to neighbors.',
    problemSolved: 'Rooftop solar producers receive rock-bottom utility feed-in tariffs while grid power prices skyrocket.',
    stage: 'MVP Build',
    creator: {
      userId: 'creator-2',
      fullName: 'Aarav Patel',
      role: 'CleanTech Specialist',
    },
    roles: [
      { id: 'r21', roleName: 'Project Lead & Power Grid Architect', iconType: 'product', status: 'ASSIGNED', assignedTo: { userId: 'creator-2', fullName: 'Aarav Patel' } },
      { id: 'r22', roleName: 'Smart Contract & Web3 Engineer', iconType: 'code', status: 'OPEN' },
      { id: 'r23', roleName: 'Mobile App Developer (Flutter/React Native)', iconType: 'code', status: 'OPEN' },
      { id: 'r24', roleName: 'B2B Sales & Regulatory Lead', iconType: 'marketing', status: 'OPEN' },
    ],
    tags: ['CleanTech', 'Energy', 'IoT', 'Mobile'],
    createdAt: '5 days ago',
  },
  {
    id: 'proj-3',
    title: 'MediDoc Voice — Doctor Consultation Scribe',
    ideaSummary: 'Ambient voice AI that listens to multilingual doctor-patient chats and drafts EHR records automatically.',
    problemSolved: 'Doctors spend 2+ hours every day on clerical EHR data entry instead of patient care.',
    stage: 'Ideation',
    creator: {
      userId: 'creator-3',
      fullName: 'Dr. Meera Iyer',
      role: 'Clinical Lead & Physician',
    },
    roles: [
      { id: 'r31', roleName: 'Medical Lead & Domain Expert', iconType: 'product', status: 'ASSIGNED', assignedTo: { userId: 'creator-3', fullName: 'Dr. Meera Iyer' } },
      { id: 'r32', roleName: 'Speech-to-Text Whisper AI Engineer', iconType: 'code', status: 'OPEN' },
      { id: 'r33', roleName: 'Full-Stack Developer (Next.js)', iconType: 'code', status: 'OPEN' },
      { id: 'r34', roleName: 'HIPAA & Compliance Security Advisor', iconType: 'general', status: 'OPEN' },
    ],
    tags: ['HealthTech', 'Whisper AI', 'HIPAA', 'Voice'],
    createdAt: '1 week ago',
  },
];

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<BuilderProject[]>(() => {
    try {
      const stored = localStorage.getItem('startupz_builder_projects');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_PROJECTS;
  });

  const [filterTab, setFilterTab] = useState<'all' | 'open_roles' | 'my_projects'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newIdeaSummary, setNewIdeaSummary] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newStage, setNewStage] = useState<'Ideation' | 'Prototyping' | 'MVP Build' | 'Alpha Testing' | 'Pre-Launch'>('Ideation');
  const [newTags, setNewTags] = useState('AI, Web3, SaaS');
  const [rolesList, setRolesList] = useState<string[]>([
    'Frontend Developer',
    'Backend Developer',
    'UI/UX Designer',
    'Growth & Marketing',
  ]);
  const [customRoleInput, setCustomRoleInput] = useState('');

  const saveProjects = (updated: BuilderProject[]) => {
    setProjects(updated);
    try {
      localStorage.setItem('startupz_builder_projects', JSON.stringify(updated));
    } catch {}
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
      creator: {
        userId: user.id,
        fullName: creatorName,
        avatar: user.profile?.avatar,
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
            avatar: user.profile?.avatar,
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
    setCreateModalOpen(false);
    // Reset Form
    setNewTitle('');
    setNewIdeaSummary('');
    setNewProblem('');
    setNewStage('Ideation');
  };

  const handleJoinRole = (projectId: string, roleId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const userName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';
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
                  userId: user.id,
                  fullName: userName,
                  avatar: user.profile?.avatar,
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
  };

  const filteredProjects = projects.filter((p) => {
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
            Have an idea before officially incorporating a startup? Create a project, invite team members, split up roles (Frontend, Backend, Design, Marketing), and build together.
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
          className="btn-primary !py-3 !px-5 font-bold shadow-lg inline-flex items-center gap-2 whitespace-nowrap self-start md:self-center"
        >
          <Plus size={16} />
          <span>Create a Project</span>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-dark-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'all'
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setFilterTab('open_roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterTab === 'open_roles'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Open Roles to Join
          </button>
          {user && (
            <button
              onClick={() => setFilterTab('my_projects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === 'my_projects'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Projects
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects or roles..."
            className="input-base pl-9 pr-3 py-1.5 text-xs w-full"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center card-base space-y-4">
          <FolderKanban size={36} className="mx-auto text-slate-400" />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              No Projects Found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to start a pre-establishment project!'}
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
          >
            <Plus size={13} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const openRolesCount = project.roles.filter((r) => r.status === 'OPEN').length;

            return (
              <div
                key={project.id}
                className="card-base p-5 flex flex-col justify-between hover:border-brand-400 dark:hover:border-dark-700 transition-all space-y-4"
              >
                <div>
                  {/* Top Bar: Stage & Open roles badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300">
                      Stage: {project.stage}
                    </span>
                    {openRolesCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {openRolesCount} Open {openRolesCount === 1 ? 'Role' : 'Roles'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-dark-800 text-slate-500">
                        Team Filled
                      </span>
                    )}
                  </div>

                  {/* Project Title & Idea */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {project.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {project.ideaSummary}
                  </p>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {project.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 dark:bg-dark-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-dark-800"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Team Roles Split Breakdown */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-dark-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-brand-600" />
                        Split Team Roles
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {project.roles.length} roles total
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {project.roles.map((r) => {
                        const isAssigned = r.status === 'ASSIGNED';
                        const isAssignedToMe = user && r.assignedTo?.userId === user.id;

                        return (
                          <div
                            key={r.id}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                              isAssigned
                                ? 'bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800'
                                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="shrink-0 text-slate-400">
                                {r.iconType === 'design' ? (
                                  <Palette size={13} />
                                ) : r.iconType === 'marketing' ? (
                                  <Megaphone size={13} />
                                ) : (
                                  <Code size={13} />
                                )}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {r.roleName}
                              </span>
                            </div>

                            {isAssigned ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {isAssignedToMe ? 'You' : r.assignedTo?.fullName}
                                </span>
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleJoinRole(project.id, r.id)}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                              >
                                Join Role
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Creator info and connect */}
                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
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
                        Project Lead
                      </p>
                    </div>
                  </div>

                  {user && project.creator.userId !== user.id && (
                    <Link
                      to={`/messages?user=${project.creator.userId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <MessageSquare size={12} />
                      <span>Message Lead</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
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
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                  Specify what team members you need to build this project before incorporating.
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {rolesList.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <span>{r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(r)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

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
                    placeholder="Add a role (e.g. Mobile Developer, Growth Marketer)"
                    className="input-base text-xs flex-1 !py-1.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRole}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                  >
                    + Add Role
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary !text-xs !py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1"
                >
                  <Rocket size={13} />
                  <span>Launch Project & Recruit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
