import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, Profile } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { ScheduleMeetingModal } from '../../components/common/ScheduleMeetingModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Modal } from '../../components/common/Modal';
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
  ChevronRight,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const isMe = !id || id === currentUser?.id;
  const targetId = id || currentUser?.id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modals
  const [connectOpen, setConnectOpen] = useState(false);
  const [startupProposalOpen, setStartupProposalOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
    try {
      const data = await api.getUser(targetId);
      const u = data.user || data;
      setProfileUser(u);

      if (isMe) {
        setFormData({
          avatar: u.profile?.avatar || '',
          coverImage: u.profile?.coverImage || '',
          fullName: u.profile?.fullName || '',
          headline: u.profile?.headline || '',
          location: u.profile?.location || '',
          bio: u.profile?.bio || '',
          skills: u.profile?.skills || '',
          startupInterests: u.profile?.startupInterests || '',
          industries: u.profile?.industries || '',
          preferredRole: u.profile?.preferredRole || '',
          availability: u.profile?.availability || 'Full-time',
          startupExperience: u.profile?.startupExperience || '',
          achievements: u.profile?.achievements || '',
          education: u.profile?.education || '',
          githubUrl: u.profile?.githubUrl || '',
          linkedinUrl: u.profile?.linkedinUrl || '',
          websiteUrl: u.profile?.websiteUrl || '',
          openTo: u.profile?.openTo || 'Co-Founder, Startup Team, Mentorship',
        });
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [targetId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.updateProfile(formData);
      setProfileUser(res.user);
      if (isMe && currentUser) {
        updateUser(res.user);
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

  const p = profileUser.profile || ({} as Profile);
  const displayName = p.fullName || profileUser.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const avatar = p.avatar;
  const skillsList = p.skills ? p.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const openToList = p.openTo ? p.openTo.split(',').map((o) => o.trim()).filter(Boolean) : ['Co-Founder', 'Startup Team'];
  const interestsList = p.startupInterests
    ? p.startupInterests.split(',').map((i) => i.trim()).filter(Boolean)
    : ['Entrepreneurship', 'Technology', 'AI', 'Growth'];
  const industriesList = p.industries ? p.industries.split(',').map((i) => i.trim()).filter(Boolean) : [];

  // Calculate profile completion percentage
  let completedFields = 0;
  const totalFields = 6;
  if (p.avatar) completedFields++;
  if (p.headline) completedFields++;
  if (p.bio) completedFields++;
  if (skillsList.length > 0) completedFields++;
  if (p.startupExperience) completedFields++;
  if (profileUser.startups && profileUser.startups.length > 0) completedFields++;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors selection:bg-[#4F46E5] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. TOP HERO / COVER & MAIN PROFILE CARD */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Cover Section */}
          <div className="h-44 sm:h-56 relative overflow-hidden bg-[#064E3B] bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900">
            {p.coverImage ? (
              <img
                src={p.coverImage}
                alt="Profile Cover Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              /* Royal Green Fallback with Subtle Pattern */
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            )}

            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              {!isMe && (
                <button
                  onClick={() => setReportOpen(true)}
                  className="p-2 rounded-lg bg-black/25 hover:bg-black/40 text-white backdrop-blur-md transition-colors"
                  title="Report user"
                >
                  <Flag size={15} />
                </button>
              )}
              {isMe && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-semibold transition-all shadow-sm"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Header Row */}
          <div className="px-6 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
              
              {/* Profile Photo (Partially Overlapping) */}
              <div className="flex items-end gap-5">
                <div className="relative shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={displayName}
                      className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md bg-white"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-md bg-indigo-50 dark:bg-slate-800 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center font-bold text-3xl sm:text-4xl">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="space-y-1 mb-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-[32px] font-bold text-[#0F172A] dark:text-white tracking-tight leading-tight">
                      {displayName}
                    </h1>
                    <VerificationBadge badge={profileUser.verificationBadge} isVerified={profileUser.isVerified} />
                    <RoleBadge role={profileUser.role} />
                  </div>

                  <p className="text-base sm:text-lg font-medium text-[#64748B] dark:text-slate-300">
                    {p.headline || 'Startup Enthusiast & Innovator'}
                  </p>

                  <div className="flex items-center gap-3 text-xs sm:text-sm text-[#64748B] dark:text-slate-400 flex-wrap pt-0.5">
                    {p.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} className="text-[#4F46E5]" />
                        <span>{p.location}</span>
                      </span>
                    )}
                    {industriesList.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-[#E2E8F0] hidden sm:inline">•</span>
                        <span>{industriesList[0]}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                      <span>{p.availability || 'Open to Co-Founder Opportunities'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap pt-2 md:pt-0">
                {!isMe && (
                  <>
                    <button
                      onClick={() => setConnectOpen(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors shadow-xs"
                    >
                      <UserPlus size={16} />
                      <span>Connect</span>
                    </button>
                    <button
                      onClick={() => navigate(`/messages?user=${profileUser.id}`)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#4F46E5] dark:text-indigo-400 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
                    >
                      <MessageSquare size={16} />
                      <span>Message</span>
                    </button>
                    <button
                      onClick={() => setStartupProposalOpen(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                      title="Propose Startup Connection"
                    >
                      <Rocket size={16} className="text-[#4F46E5]" />
                      <span>Startup Connection</span>
                    </button>
                  </>
                )}

                {isMe && (
                  <button
                    onClick={() => setMeetingOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#4F46E5] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                  >
                    <Video size={16} />
                    <span>Host Video Meeting</span>
                  </button>
                )}
              </div>
            </div>

            {/* Profile Statistics Row */}
            <div className="pt-5 border-t border-[#E2E8F0] dark:border-slate-800 grid grid-cols-3 gap-4 text-center sm:text-left">
              <Link to="/network" className="group">
                <div className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] transition-colors">
                  128
                </div>
                <div className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400">
                  Connections
                </div>
              </Link>

              <div className="border-l border-[#E2E8F0] dark:border-slate-800 pl-4 sm:pl-8">
                <div className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
                  {profileUser.startups?.length || 1}
                </div>
                <div className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400">
                  Startups Founded
                </div>
              </div>

              <div className="border-l border-[#E2E8F0] dark:border-slate-800 pl-4 sm:pl-8">
                <div className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white">
                  {skillsList.length}
                </div>
                <div className="text-xs sm:text-sm font-normal text-[#64748B] dark:text-slate-400">
                  Verified Skills
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 2. TWO-COLUMN LAYOUT (DESKTOP) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAIN COLUMN (LEFT 2/3) */}
          <div className="lg:col-span-2 space-y-6">

            {/* ABOUT SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-white tracking-tight">
                About
              </h2>
              <p className="text-sm sm:text-base font-normal text-[#0F172A] dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {p.bio || 'No background description shared yet. Add a short summary about your startup journey and vision!'}
              </p>

              {/* Interests Tags */}
              <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                  Startup Interests
                </h4>
                <div className="flex flex-wrap gap-2">
                  {interestsList.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* EXPERIENCE SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                  <Briefcase size={20} className="text-[#4F46E5]" />
                  <span>Experience</span>
                </h2>
              </div>

              {p.startupExperience ? (
                <div className="relative pl-6 border-l-2 border-[#E2E8F0] dark:border-slate-800 space-y-6">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#4F46E5] border-4 border-white dark:border-slate-900" />
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                        {p.preferredRole || 'Founder & CEO'}
                      </h3>
                      <p className="text-sm font-medium text-[#4F46E5]">
                        {profileUser.startups?.[0]?.name || 'Early-Stage Venture'}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-2">
                        <Calendar size={13} />
                        <span>Jan 2024 – Present</span>
                        <span>•</span>
                        <span>{p.location || 'Remote'}</span>
                      </p>
                      <p className="text-sm text-[#64748B] dark:text-slate-300 pt-2 whitespace-pre-line leading-relaxed">
                        {p.startupExperience}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
                  <Briefcase size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">No experience details added yet.</p>
                  {isMe && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="mt-2 text-xs font-bold text-[#4F46E5] hover:underline"
                    >
                      + Add Experience
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* EDUCATION SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                <GraduationCap size={20} className="text-[#4F46E5]" />
                <span>Education</span>
              </h2>

              {p.education ? (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5] flex items-center justify-center font-bold text-sm shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                      {p.education}
                    </h3>
                    <p className="text-sm font-normal text-[#64748B] dark:text-slate-400">
                      Bachelor of Science / Computer Science & Business
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl">
                  <GraduationCap size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">No education details listed.</p>
                  {isMe && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="mt-2 text-xs font-bold text-[#4F46E5] hover:underline"
                    >
                      + Add Education
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STARTUPS / PROJECTS SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                  <Rocket size={20} className="text-[#4F46E5]" />
                  <span>Startups & Projects</span>
                </h2>
                {isMe && (
                  <Link
                    to="/startups/create"
                    className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Post Startup
                  </Link>
                )}
              </div>

              {profileUser.startups && profileUser.startups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profileUser.startups.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#4F46E5] transition-all flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-[#4F46E5]">
                            {s.stage}
                          </span>
                          <span className="text-xs font-medium text-[#64748B]">{s.industry}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-[#4F46E5] transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-xs text-[#64748B] dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {s.oneLineDescription || 'AI & tech platform startup.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-700/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-[#64748B]">Founder & CEO</span>
                        <Link
                          to={`/startups/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:underline"
                        >
                          <span>View Startup</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-[#E2E8F0] dark:border-slate-800 rounded-xl space-y-2">
                  <FolderKanban size={28} className="mx-auto text-slate-300" />
                  <p className="text-sm text-[#64748B] dark:text-slate-400 font-medium">No startups created yet.</p>
                  {isMe && (
                    <Link
                      to="/startups/create"
                      className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors"
                    >
                      + Create Startup Listing
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* ACTIVITY SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2">
                  <Share2 size={20} className="text-[#4F46E5]" />
                  <span>Activity & Posts</span>
                </h2>
                <Link to="/feed" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                  View Community Feed →
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold text-[#4F46E5]">Founder Update</span>
                  <span>2 days ago</span>
                </div>
                <p className="text-sm text-[#0F172A] dark:text-slate-200 leading-relaxed">
                  "Looking for a passionate Technical Co-Founder to scale our AI-driven startup ecosystem platform!"
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR (1/3 WIDTH) */}
          <div className="space-y-6">

            {/* PROFILE COMPLETENESS CARD */}
            {isMe && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    Profile Completeness
                  </h3>
                  <span className="text-sm font-bold text-[#4F46E5]">{completionPercentage}%</span>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4F46E5] transition-all duration-500 rounded-full"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>

                <div className="space-y-2 text-xs text-[#64748B] pt-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={p.avatar ? 'text-[#16A34A]' : 'text-slate-300'} />
                    <span>Upload profile photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={skillsList.length > 0 ? 'text-[#16A34A]' : 'text-slate-300'} />
                    <span>Add verified skills</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={p.startupExperience ? 'text-[#16A34A]' : 'text-slate-300'} />
                    <span>Add startup experience</span>
                  </div>
                </div>
              </div>
            )}

            {/* SKILLS & ENDORSEMENTS SECTION */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                  Skills & Expertise
                </h3>
                <span className="text-xs font-medium text-[#64748B]">{skillsList.length} skills</span>
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
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                  />
                  <button
                    type="button"
                    disabled={savingSkill || !newSkillInput.trim()}
                    onClick={() => handleAddSkill(newSkillInput)}
                    className="px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Skills Pill Tags */}
              <div className="flex flex-wrap gap-2">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                  >
                    <span>{skill}</span>
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-rose-600 transition-colors ml-1"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* ECOSYSTEM HUB & LINKS CARD */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">
                Profiles & Portfolio
              </h3>
              <div className="space-y-2.5 text-sm">
                {p.linkedinUrl && (
                  <a
                    href={p.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#64748B] hover:text-[#4F46E5] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Globe size={16} />
                      <span>LinkedIn Profile</span>
                    </span>
                    <ExternalLink size={14} />
                  </a>
                )}
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#64748B] hover:text-[#4F46E5] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink size={16} />
                      <span>GitHub Profile</span>
                    </span>
                    <ExternalLink size={14} />
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

      {/* EDIT PROFILE MODAL */}
      {isMe && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile Details" maxWidth="2xl">
          <form onSubmit={handleSaveProfile} className="space-y-4 font-sans">
            {/* Photos & Branding */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4F46E5] flex items-center gap-1.5">
                <Sparkles size={14} /> Profile & Background Photos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Profile Photo URL (Avatar)</label>
                  <input
                    type="url"
                    value={formData.avatar || ''}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://images.unsplash.com/... or image link"
                    className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">Background Cover Image URL</label>
                  <input
                    type="url"
                    value={formData.coverImage || ''}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="Leave blank for Royal Green default background"
                    className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Bengaluru, India or Remote"
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">Professional Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g. Founder & CEO at AgriTech Solutions"
                className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] mb-1">About & Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Passionate about solving real-world problems through technology..."
                className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Startup Experience</label>
                <textarea
                  rows={2}
                  value={formData.startupExperience}
                  onChange={(e) => setFormData({ ...formData, startupExperience: e.target.value })}
                  placeholder="Details about prior ventures or executive experience..."
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Education</label>
                <textarea
                  rows={2}
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="Institution name, degree, and field of study..."
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="React, Python, Product Development, AI"
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Startup Interests (comma-separated)</label>
                <input
                  type="text"
                  value={formData.startupInterests}
                  onChange={(e) => setFormData({ ...formData, startupInterests: e.target.value })}
                  placeholder="Entrepreneurship, Technology, Agriculture, AI"
                  className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-white"
                />
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#DC2626] text-xs font-medium">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors"
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
        user={profileUser}
      />

      <StartupConnectionModal
        isOpen={startupProposalOpen}
        onClose={() => setStartupProposalOpen(false)}
        targetUser={profileUser}
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
    </div>
  );
};
