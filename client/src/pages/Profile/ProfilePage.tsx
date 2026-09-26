import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, Profile, Startup } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { ScheduleMeetingModal } from '../../components/common/ScheduleMeetingModal';
import { ReportModal } from '../../components/common/ReportModal';
import { Modal } from '../../components/common/Modal';
import {
  User as UserIcon,
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
  ArrowRight,
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

  // LinkedIn-style interactive skills state
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">User not found</h2>
        <p className="text-xs text-slate-400 mb-4">This profile may have been removed or does not exist.</p>
        <Link to="/cofounders" className="text-brand-600 font-bold text-xs hover:underline">
          Return to Talent Directory
        </Link>
      </div>
    );
  }

  const p = profileUser.profile || ({} as Profile);
  const displayName = p.fullName || profileUser.email;
  const avatar = p.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`;
  const skillsList = p.skills ? p.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const openToList = p.openTo ? p.openTo.split(',').map((o) => o.trim()).filter(Boolean) : ['Co-Founder', 'Startup Team'];
  const industriesList = p.industries ? p.industries.split(',').map((i) => i.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* 1. HERO PROFILE CARD */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cover Banner */}
        <div className="h-36 sm:h-48 bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {!isMe && (
              <button
                onClick={() => setReportOpen(true)}
                className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition-colors"
                title="Report user"
              >
                <Flag size={15} />
              </button>
            )}
            {isMe && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold transition-all"
              >
                <Edit3 size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={avatar}
                alt={displayName}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-lg bg-white"
              />
              <div className="space-y-1 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {displayName}
                  </h1>
                  <VerificationBadge badge={profileUser.verificationBadge} isVerified={profileUser.isVerified} />
                  <RoleBadge role={profileUser.role} />
                  <Link
                    to="/memberships"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:scale-105 transition-all shrink-0"
                    title="View StartupZ Membership Plans"
                  >
                    <Crown size={11} className="text-amber-500" />
                    <span>{isMe ? 'Standard Plan' : 'Verified Member'}</span>
                  </Link>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {p.headline || 'Startup Enthusiast & Innovator'}
                </p>
                {p.location && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={13} /> {p.location}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons for non-owners */}
            {!isMe && (
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => setConnectOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  title="Connect with founder, cofounder, or peer"
                >
                  <UserPlus size={14} />
                  <span>Connect</span>
                </button>
                <button
                  onClick={() => setStartupProposalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md transition-all hover:scale-105"
                  title="Propose co-founding a startup together"
                >
                  <Rocket size={14} />
                  <span>Startup Connection</span>
                </button>
                <button
                  onClick={() => setMeetingOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 transition-colors shadow-sm"
                  title="Launch or schedule video call"
                >
                  <Video size={14} />
                  <span>Video Call</span>
                </button>
                <button
                  onClick={() => navigate(`/messages?user=${profileUser.id}`)}
                  className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  title="Send Direct Message"
                >
                  <MessageSquare size={15} />
                </button>
              </div>
            )}
            {isMe && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMeetingOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-all"
                >
                  <Video size={14} />
                  <span>Host Video Room</span>
                </button>
              </div>
            )}
          </div>

          {/* "Open To" Badges */}
          {openToList.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400">Open to:</span>
              {openToList.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. BODY COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Bio, Experience, Startups, Achievements */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bio / About */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              About & Startup Vision
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {p.bio || 'No bio shared yet.'}
            </p>
          </div>

          {/* Startup Experience */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Briefcase size={16} className="text-brand-500" /> Startup Experience
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {p.startupExperience || 'Founder / builder in the tech and startup space.'}
            </p>
          </div>

          {/* Achievements */}
          {p.achievements && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Milestones & Achievements
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {p.achievements}
              </p>
            </div>
          )}

          {/* Associated Startups */}
          {profileUser.startups && profileUser.startups.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Rocket size={16} className="text-brand-500" /> Founded Startups
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profileUser.startups.map((s) => (
                  <Link
                    key={s.id}
                    to={`/startups/${s.id}`}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-brand-500 transition-all block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-brand-600 truncate">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600">
                        {s.stage}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{s.industry}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Membership Hub, Skills, Preferences, Links */}
        <div className="space-y-6">
          
          {/* Membership & Ecosystem Network Hub */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <span className="text-xs font-bold text-white">StartupZ Ecosystem Membership</span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Standard Plan
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isMe
                ? 'Manage your plan benefits, access AI Scout matching, and connect with startup builders.'
                : 'Verified active ecosystem member with directory priority and network access.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <Link
                to="/memberships"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
              >
                <Crown size={13} />
                <span>Memberships</span>
              </Link>
              <Link
                to="/network"
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all"
              >
                <Users size={13} />
                <span>My Network</span>
              </Link>
            </div>
            <Link
              to="/feed"
              className="flex items-center justify-center gap-1.5 w-full p-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
            >
              <Share2 size={13} />
              <span>Community Feed Updates</span>
            </Link>
          </div>

          {/* LinkedIn-style Interactive Skills */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Skills & Endorsements
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600">
                  {skillsList.length}
                </span>
              </div>
              {isMe && (
                <span className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
                  <Sparkles size={11} /> Auto-saves
                </span>
              )}
            </div>

            {/* Quick Skill Adder for profile owner */}
            {isMe && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
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
                    placeholder="Add a new skill (e.g. Next.js, AI/LLMs)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    disabled={savingSkill || !newSkillInput.trim()}
                    onClick={() => handleAddSkill(newSkillInput)}
                    className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Popular Skill Suggestions */}
                <div className="flex flex-wrap gap-1">
                  {['React', 'AI / LLM', 'Product Design', 'Growth', 'Pitch Decks', 'Fundraising', 'TypeScript', 'Node.js']
                    .filter((s) => !skillsList.some((x) => x.toLowerCase() === s.toLowerCase()))
                    .slice(0, 5)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Skills List with Endorsements / Delete */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {skillsList.length > 0 ? (
                skillsList.map((skill, idx) => {
                  const isEndorsed = endorsedSkills[skill];
                  return (
                    <div
                      key={idx}
                      className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {skill}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isEndorsed ? '• Endorsed by you' : idx % 2 === 0 ? '• 8 endorsements' : '• 5 endorsements'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => toggleEndorseSkill(skill)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              isEndorsed
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-600 border border-slate-200 dark:border-slate-700'
                            }`}
                            title="Endorse this skill"
                          >
                            <ThumbsUp size={10} />
                            <span>{isEndorsed ? 'Endorsed' : 'Endorse'}</span>
                          </button>
                        )}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Remove skill"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-slate-400 block py-2">
                  No skills added yet. {isMe && 'Add your startup superpowers above!'}
                </span>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-400">
              Preferences & Availability
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block">Preferred Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {p.preferredRole || 'Technical / Executive Co-Founder'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Commitment:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {p.availability || 'Full-time'}
                </span>
              </div>
              {industriesList.length > 0 && (
                <div>
                  <span className="text-slate-400 block mb-1">Target Industries:</span>
                  <div className="flex flex-wrap gap-1">
                    {industriesList.map((ind, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Portfolio & External Links */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Links & Profiles
            </h4>
            <div className="space-y-2 text-xs">
              {p.githubUrl && (
                <a
                  href={p.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                >
                  <ExternalLink size={15} />
                  <span>GitHub Profile</span>
                </a>
              )}
              {p.linkedinUrl && (
                <a
                  href={p.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                >
                  <Globe size={15} />
                  <span>LinkedIn Profile</span>
                </a>
              )}
              {p.websiteUrl && (
                <a
                  href={p.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                >
                  <Globe size={15} />
                  <span>Personal Website / Portfolio</span>
                </a>
              )}
              {!p.githubUrl && !p.linkedinUrl && !p.websiteUrl && (
                <span className="text-slate-400 text-xs">No links added yet.</span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      {isMe && (
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Startup Profile" maxWidth="2xl">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g. Full-Stack Developer | AI Enthusiast | Looking for Technical Co-Founder"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">About & Bio</label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="React, TypeScript, Node.js, AI"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Industries (comma-separated)</label>
                <input
                  type="text"
                  value={formData.industries}
                  onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                  placeholder="Fintech, SaaS, AI, Healthtech"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Preferred Role</label>
                <input
                  type="text"
                  value={formData.preferredRole}
                  onChange={(e) => setFormData({ ...formData, preferredRole: e.target.value })}
                  placeholder="e.g. Technical Co-Founder"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Availability</label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Evenings & Weekends">Evenings & Weekends</option>
                  <option value="Advisory">Advisory</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Startup Experience</label>
              <textarea
                rows={2}
                value={formData.startupExperience}
                onChange={(e) => setFormData({ ...formData, startupExperience: e.target.value })}
                placeholder="Prior venture building, acceleration programs, exits, or key milestones..."
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Open To (comma-separated)</label>
              <input
                type="text"
                value={formData.openTo}
                onChange={(e) => setFormData({ ...formData, openTo: e.target.value })}
                placeholder="Co-Founder, Startup Team, Mentorship, Investment"
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Portfolio URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {saveError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        user={profileUser}
      />

      {/* Startup Proposal / Co-Founding Modal */}
      <StartupConnectionModal
        isOpen={startupProposalOpen}
        onClose={() => setStartupProposalOpen(false)}
        targetUser={profileUser}
      />

      {/* Video Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        targetUser={profileUser}
      />

      {/* Report Modal */}
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
