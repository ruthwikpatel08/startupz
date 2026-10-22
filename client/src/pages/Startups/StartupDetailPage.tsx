import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { supabase, broadcastEntityDeleted } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { ShareModal, ShareItemData } from '../../components/common/ShareModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { IdeaFeedbackModal } from '../../components/common/IdeaFeedbackModal';
import { Avatar } from '../../components/common/Avatar';
import { SEO } from '../../components/common/SEO';
import {
  Rocket,
  MapPin,
  Globe,
  ExternalLink,
  Heart,
  Bookmark,
  Share2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
  Briefcase,
  AlertCircle,
  FileText,
  UserCheck,
  Trash2,
  Edit2,
  X,
  GraduationCap,
  DollarSign,
  Clock,
  Calendar,
  Plus,
} from 'lucide-react';

export const StartupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareModalItem, setShareModalItem] = useState<ShareItemData | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchStartup = async () => {
      try {
        let data: any = null;
        try {
          data = await api.getStartup(id);
        } catch (apiErr) {
          console.warn('api.getStartup failed, trying direct Supabase query:', apiErr);
        }

        // Direct Supabase fallback
        if (!data) {
          const { data: supaStartup } = await supabase
            .from('startups')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (supaStartup) {
            const { data: founderProf } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', supaStartup.founder_id)
              .maybeSingle();

            data = {
              id: supaStartup.id,
              founderId: supaStartup.founder_id,
              name: supaStartup.name,
              logo: supaStartup.logo,
              oneLineDescription: supaStartup.one_line_description,
              problem: supaStartup.problem,
              solution: supaStartup.solution,
              targetCustomers: supaStartup.target_customers,
              industry: supaStartup.industry,
              businessModel: supaStartup.business_model,
              stage: supaStartup.stage,
              location: supaStartup.location,
              requiredSkills: supaStartup.required_skills,
              fundingStatus: supaStartup.funding_status,
              fundingRequired: supaStartup.funding_required,
              currentTraction: supaStartup.current_traction,
              website: supaStartup.website,
              demoLink: supaStartup.demo_link,
              pitchDeckUrl: supaStartup.pitch_deck_url,
              images: supaStartup.images,
              visibility: supaStartup.visibility,
              isConfidential: supaStartup.is_confidential,
              isVerified: supaStartup.is_verified,
              likesCount: supaStartup.likes_count || 0,
              viewsCount: supaStartup.views_count || 0,
              createdAt: supaStartup.created_at,
              updatedAt: supaStartup.updated_at,
              founder: {
                id: supaStartup.founder_id,
                email: founderProf?.email || '',
                role: founderProf?.preferred_role || 'FOUNDER',
                profile: founderProf
                  ? {
                    fullName: founderProf.full_name,
                    avatar: founderProf.avatar,
                    headline: founderProf.headline,
                    location: founderProf.location,
                    bio: founderProf.bio,
                    skills: founderProf.skills,
                  }
                  : null,
              },
            };
          }
        }
        setStartup(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStartup();
  }, [id]);

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!startup) return;
    try {
      const res = await api.likeStartup(startup.id);
      setStartup({ ...startup, isLiked: res.liked, likesCount: res.likesCount });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!startup) return;
    try {
      const res = await api.toggleSave('STARTUP', startup.id);
      setStartup({ ...startup, isSaved: res.saved });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!startup) return;
    try {
      const res = await api.followStartup(startup.id);
      setStartup({
        ...startup,
        isFollowed: res.following ?? res.followed,
        followersCount: res.followersCount,
      });
    } catch (err) {
      console.error('Follow failed:', err);
    }
  };

  const handleShare = () => {
    if (!startup) return;
    setShareModalItem({
      title: startup.name,
      url: `/startups/${startup.id}`,
      description: startup.oneLineDescription || startup.solution || 'Startup on HookZ',
      type: 'startup',
    });
  };

  const handleDeleteStartup = async () => {
    if (!startup) return;
    if (!window.confirm('Are you sure you want to delete this startup? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteStartup(startup.id).catch(() => null);
      try {
        await supabase.from('posts').delete().eq('startup_id', startup.id);
        await supabase.from('startup_opportunities').delete().eq('startup_id', startup.id);
        await supabase.from('startups').delete().eq('id', startup.id);
      } catch (err) {
        console.warn('Supabase cleanup notice on startup delete:', err);
      }
      broadcastEntityDeleted('STARTUP', startup.id);
      navigate('/startups');
    } catch (err: any) {
      alert(err.message || 'Failed to delete startup.');
    }
  };

  // Edit Startup Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'details' | 'internship' | 'job'>('details');
  const [editFormData, setEditFormData] = useState({
    name: '',
    oneLineDescription: '',
    problem: '',
    solution: '',
    targetCustomers: '',
    industry: '',
    stage: 'Idea',
    location: '',
    businessModel: '',
    requiredSkills: '',
    fundingStatus: 'Bootstrapped',
    fundingRequired: '',
    website: '',
    demoLink: '',
  });

  // Separate Internship Form State
  const [offerInternship, setOfferInternship] = useState(false);
  const [internshipRole, setInternshipRole] = useState('');
  const [internshipWorkplaceType, setInternshipWorkplaceType] = useState('Remote');
  const [internshipCompensation, setInternshipCompensation] = useState('');
  const [internshipDurationType, setInternshipDurationType] = useState<'Permanent' | 'Custom'>('Custom');
  const [internshipCustomDays, setInternshipCustomDays] = useState('60');
  const [internshipDescription, setInternshipDescription] = useState('');

  // Separate Job Form State
  const [offerJob, setOfferJob] = useState(false);
  const [jobRole, setJobRole] = useState('');
  const [jobWorkplaceType, setJobWorkplaceType] = useState('Remote');
  const [jobCompensation, setJobCompensation] = useState('');
  const [jobDurationType, setJobDurationType] = useState<'Permanent' | 'Custom'>('Custom');
  const [jobCustomDays, setJobCustomDays] = useState('180');
  const [jobDescription, setJobDescription] = useState('');

  const handleOpenEditModal = (initialTab?: 'details' | 'internship' | 'job' | React.MouseEvent) => {
    if (!startup) return;
    const tab: 'details' | 'internship' | 'job' = typeof initialTab === 'string' ? initialTab : 'details';
    setEditFormData({
      name: startup.name || '',
      oneLineDescription: startup.oneLineDescription || '',
      problem: startup.problem || '',
      solution: startup.solution || '',
      targetCustomers: startup.targetCustomers || '',
      industry: startup.industry || '',
      stage: startup.stage || 'Idea',
      location: startup.location || '',
      businessModel: startup.businessModel || '',
      requiredSkills: startup.requiredSkills || '',
      fundingStatus: startup.fundingStatus || 'Bootstrapped',
      fundingRequired: startup.fundingRequired || '',
      website: startup.website || '',
      demoLink: startup.demoLink || '',
    });

    const internOpp = startup.opportunities?.find((o) =>
      o.commitment?.toLowerCase().includes('intern') || o.role?.toLowerCase().includes('intern')
    );
    if (internOpp) {
      setOfferInternship(true);
      setInternshipRole(internOpp.role.replace(/\s*\(Internship\)/i, ''));
      setInternshipWorkplaceType(internOpp.workplaceType || 'Remote');
      setInternshipCompensation(internOpp.compensation || '');
      const isPerm = internOpp.commitment?.toLowerCase().includes('permanent');
      setInternshipDurationType(isPerm ? 'Permanent' : 'Custom');
      const daysMatch = internOpp.commitment?.match(/(\d+)\s*Days/i);
      setInternshipCustomDays(daysMatch ? daysMatch[1] : '60');
      setInternshipDescription(internOpp.description || '');
    } else {
      setOfferInternship(false);
      setInternshipRole(`${startup.name} Intern`);
      setInternshipWorkplaceType('Remote');
      setInternshipCompensation('');
      setInternshipDurationType('Custom');
      setInternshipCustomDays('60');
      setInternshipDescription('');
    }

    const jobOpp = startup.opportunities?.find((o) =>
      o.commitment?.toLowerCase().includes('job') ||
      (!o.role?.toLowerCase().includes('intern') && !o.commitment?.toLowerCase().includes('intern'))
    );
    if (jobOpp) {
      setOfferJob(true);
      setJobRole(jobOpp.role);
      setJobWorkplaceType(jobOpp.workplaceType || 'Remote');
      setJobCompensation(jobOpp.compensation || '');
      const isPerm = jobOpp.commitment?.toLowerCase().includes('permanent');
      setJobDurationType(isPerm ? 'Permanent' : 'Custom');
      const daysMatch = jobOpp.commitment?.match(/(\d+)\s*Days/i);
      setJobCustomDays(daysMatch ? daysMatch[1] : '180');
      setJobDescription(jobOpp.description || '');
    } else {
      setOfferJob(false);
      setJobRole(`${startup.name} Team Member`);
      setJobWorkplaceType('Remote');
      setJobCompensation('');
      setJobDurationType('Custom');
      setJobCustomDays('180');
      setJobDescription('');
    }

    setEditTab(tab);
    setEditError(null);
    setEditModalOpen(true);
  };

  // Prevent background scrolling and enable Escape key when edit modal is open
  useEffect(() => {
    if (editModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setEditModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [editModalOpen]);

  const handleDeleteOpportunity = async (oppId: string) => {
    if (!window.confirm('Are you sure you want to remove this opportunity?')) return;
    try {
      await api.deleteOpportunity(oppId);
      setStartup((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          opportunities: (prev.opportunities || []).filter((o) => o.id !== oppId),
        };
      });
    } catch (err: any) {
      alert(err.message || 'Failed to remove opportunity.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startup) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const payload = {
        ...editFormData,
        internshipData: {
          enabled: offerInternship,
          role: internshipRole,
          workplaceType: internshipWorkplaceType,
          compensation: internshipCompensation,
          durationType: internshipDurationType,
          customDays: internshipCustomDays,
          description: internshipDescription,
        },
        jobData: {
          enabled: offerJob,
          role: jobRole,
          workplaceType: jobWorkplaceType,
          compensation: jobCompensation,
          durationType: jobDurationType,
          customDays: jobCustomDays,
          description: jobDescription,
        },
      };

      const res = await api.updateStartup(startup.id, payload);
      const updated = res.startup || { ...startup, ...editFormData };
      setStartup((prev) => (prev ? { ...prev, ...updated } : null));
      setEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update startup.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isOwner = Boolean(
    user && startup && (
      user.id === startup.founderId ||
      user.id === startup.founder?.id ||
      user.id === (startup as any).founder_id ||
      user.id === (startup as any).userId ||
      (startup.founder?.email && user.email && startup.founder.email.toLowerCase() === user.email.toLowerCase()) ||
      user.isAdmin
    )
  );

  useEffect(() => {
    if (startup && searchParams.get('edit') === 'true' && isOwner) {
      const reqTab = searchParams.get('tab');
      handleOpenEditModal(reqTab === 'internship' || reqTab === 'job' ? reqTab : 'details');
    }
  }, [startup, searchParams, isOwner]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-64 card-base bg-slate-50 dark:bg-dark-900 animate-pulse" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <SEO title="Startup Profile Not Found | HookZ" noindex={true} />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Startup Profile Not Found</h2>
        <p className="text-xs text-slate-500">The requested venture does not exist or has been removed.</p>
        <Link to="/startups" className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">
          Explore Other Startups
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={`${startup.name} | Startups on HookZ`}
        description={startup.oneLineDescription || startup.problem || `Explore ${startup.name} on HookZ.`}
        canonicalPath={`/startups/${id}`}
        ogImage={startup.logo || undefined}
        breadcrumbs={[
          { name: 'Startups', path: '/startups' },
          { name: startup.name, path: `/startups/${id}` },
        ]}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: startup.name,
          description: startup.oneLineDescription || startup.problem,
          url: `https://hookz.in/startups/${id}`,
          ...(startup.logo ? { logo: startup.logo } : {}),
        }}
      />

      {/* 1. HERO HEADER */}
      <div className="card-base p-4 sm:p-7 space-y-5 sm:space-y-6 overflow-hidden">

        {/* Founder Controls Banner for Mobile & Desktop */}
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-brand-50/80 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-900/60">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Founder Controls
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  You are the founder of this startup venture.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors cursor-pointer"
                title="Edit this startup"
              >
                <Edit2 size={13} />
                <span>Edit Startup</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteStartup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                title="Delete this startup"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/60 uppercase tracking-wider">
              {startup.stage} STAGE
            </span>
            <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 border border-slate-200/60 dark:border-dark-700/60">
              {startup.industry}
            </span>
            {startup.isConfidential && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock size={12} /> Confidential Idea
              </span>
            )}
            <VerificationBadge type={startup.isVerified ? 'Verified Startup' : null} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFollow}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${startup.isFollowed
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'btn-primary'
                }`}
            >
              <UserCheck size={14} />
              <span>{startup.isFollowed ? 'Following' : 'Follow Startup'}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-black/10 dark:bg-white/10 font-medium">
                {startup.followersCount ?? 0}
              </span>
            </button>

            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${startup.isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-900'
                  : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:text-rose-500'
                }`}
            >
              <Heart size={14} fill={startup.isLiked ? 'currentColor' : 'none'} />
              <span>{startup.likesCount}</span>
            </button>

            <button
              onClick={handleSave}
              className={`p-2 rounded-md transition-colors border ${startup.isSaved
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 border-brand-200 dark:border-brand-900'
                  : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:text-brand-600'
                }`}
              title="Save Startup"
            >
              <Bookmark size={14} fill={startup.isSaved ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-md bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-700 hover:text-brand-600 transition-colors"
              title="Share"
            >
              <Share2 size={14} />
            </button>

            <button
              onClick={() => setFeedbackOpen(true)}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
            >
              <Sparkles size={14} className="text-brand-600" /> AI Validation
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors cursor-pointer"
                  title="Edit this startup"
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStartup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                  title="Delete this startup"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Startup Brand & One-Liner */}
        <div className="flex flex-col sm:flex-row items-start gap-5 min-w-0">
          <img
            src={startup.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${startup.name}`}
            alt=""
            className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-dark-700 shrink-0"
          />
          <div className="space-y-1.5 min-w-0 break-words flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
              {startup.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl break-words">
              {startup.oneLineDescription}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              {startup.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} /> {startup.location}
                </span>
              )}
              {startup.website && (
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-brand-600 hover:underline"
                >
                  <Globe size={13} /> Website <ExternalLink size={11} />
                </a>
              )}
              {startup.demoLink && (
                <a
                  href={startup.demoLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-cyan-600 hover:underline"
                >
                  <Rocket size={13} /> Product Demo <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-dark-800 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider block">Funding Status</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{startup.fundingStatus || 'Bootstrapped'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider block">Round Target</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{startup.fundingRequired || 'Not specified'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider block">Business Model</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{startup.businessModel || 'SaaS'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider block">Team Size</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">{startup.teamSize || 1} Builders</span>
          </div>
        </div>

      </div>

      {/* 2. MAIN PROBLEM / SOLUTION / DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols): Problem, Solution, Traction */}
        <div className="lg:col-span-2 space-y-5">

          {/* Problem Statement Card */}
          <div className="card-base p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs uppercase tracking-wider">
              <AlertCircle size={15} /> Problem We Are Solving
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {startup.problem}
            </p>
          </div>

          {/* Solution & Value Proposition */}
          <div className="card-base p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <CheckCircle2 size={15} /> Our Solution & Technology
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {startup.solution}
            </p>
          </div>

          {/* Target Customers & Traction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-base p-4 sm:p-5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Target Customer Profile
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {startup.targetCustomers || 'Early adopters, high-growth SMBs, and modern enterprises.'}
              </p>
            </div>

            <div className="card-base p-4 sm:p-5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Current Traction & Milestones
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {startup.currentTraction || 'Early validation and pilot phase underway.'}
              </p>
            </div>
          </div>

          {/* Required Skills */}
          {startup.requiredSkills && (
            <div className="card-base p-5 sm:p-6 space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                Looking for Collaborators & Co-Founders with Skills:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {startup.requiredSkills.split(',').map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/60"
                  >
                    {sk.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Opportunities for this startup */}
          {startup.opportunities && startup.opportunities.length > 0 ? (
            <div className="card-base p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-brand-600" /> Open Opportunities at {startup.name}
                </h4>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal('internship')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 px-2.5 py-1 rounded-md border border-brand-200 dark:border-brand-900/60 cursor-pointer transition-colors"
                  >
                    <Plus size={12} />
                    <span>Manage / Add Opportunities</span>
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {startup.opportunities.map((opp) => {
                  const isIntern = opp.commitment?.toLowerCase().includes('intern') || opp.role.toLowerCase().includes('intern');
                  return (
                    <div
                      key={opp.id}
                      className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200/60 dark:border-dark-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">{opp.role}</h5>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isIntern
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60'
                              }`}
                          >
                            {isIntern ? 'Internship' : 'Job Position'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {opp.commitment} • {opp.compensation} • {opp.workplaceType}
                        </p>
                        {opp.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {opp.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(isIntern ? 'internship' : 'job')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-900/60 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title={`Edit this ${isIntern ? 'internship' : 'job'}`}
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOpportunity(opp.id)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Delete this opportunity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                        <Link
                          to="/opportunities"
                          className="btn-primary px-3 py-1.5 text-xs font-medium"
                        >
                          Apply Now
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isOwner ? (
            <div className="card-base p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-brand-600" /> Opportunities at {startup.name}
                </h4>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal('internship')}
                  className="btn-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Internship or Job</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                You haven't listed any internships or jobs yet. Add opportunities to attract student builders and talent.
              </p>
            </div>
          ) : null}

        </div>

        {/* Right Column: Founder Card & Team */}
        <div className="space-y-5">

          {/* Founder Card */}
          <div className="card-base p-5 sm:p-6 space-y-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              FOUNDER
            </span>
            <div className="flex items-center gap-3">
              <Avatar
                src={startup.founder?.profile?.avatar}
                name={startup.founder?.profile?.fullName || 'Founder'}
                size="lg"
                className="!w-12 !h-12 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/profile/${startup.founder?.id}`}
                  className="font-semibold text-sm text-slate-900 dark:text-white hover:text-brand-600 block truncate"
                >
                  {startup.founder?.profile?.fullName || 'Founder'}
                </Link>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {startup.founder?.profile?.headline || 'Startup Builder'}
                </p>
                {startup.founder?.profile?.location && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {startup.founder.profile.location}
                  </span>
                )}
              </div>
            </div>

            {startup.founder?.profile?.bio && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-dark-800 pt-3">
                {startup.founder.profile.bio}
              </p>
            )}

            <button
              onClick={() => setConnectUser(startup.founder || null)}
              className="w-full btn-primary inline-flex items-center justify-center gap-2 py-2 text-xs font-medium"
            >
              <span>Connect with Founder</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Team Members */}
          <div className="card-base p-5 sm:p-6 space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              STARTUP TEAM ({startup.teamSize || (startup.members?.length || 0) + 1})
            </span>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
                <Avatar
                  src={startup.founder?.profile?.avatar}
                  name={startup.founder?.profile?.fullName}
                  size="sm"
                  className="!w-7 !h-7"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {startup.founder?.profile?.fullName}
                  </div>
                  <div className="text-[10px] text-brand-600 font-medium">Founder / CEO</div>
                </div>
              </div>

              {startup.members?.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-dark-800">
                  <Avatar
                    src={m.user?.profile?.avatar}
                    name={m.user?.profile?.fullName || m.id}
                    size="sm"
                    className="!w-7 !h-7"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {m.user?.profile?.fullName || 'Team Member'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />

      <IdeaFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        initialProblem={startup.problem}
        initialSolution={startup.solution}
        initialTargetCustomer={startup.targetCustomers || ''}
        industry={startup.industry}
      />

      {/* Edit Startup Modal */}
      {editModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
          {/* Full-viewport transparent backdrop */}
          <div
            className="fixed inset-0 w-full h-full bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setEditModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 card-base max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-dark-700 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-dark-850/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Edit Startup & Opportunities
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update details, internship roles, and job positions for {startup.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-dark-700 px-4 sm:px-6 pt-2 bg-slate-50/40 dark:bg-dark-850/40 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setEditTab('details')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${editTab === 'details'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <Rocket size={13} />
                <span>Startup Details</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('internship')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${editTab === 'internship'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <GraduationCap size={13} />
                <span>Internships</span>
                {offerInternship && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Active
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditTab('job')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${editTab === 'job'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <Briefcase size={13} />
                <span>Jobs</span>
                {offerJob && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Active
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
                  {editError}
                </div>
              )}

              {/* TAB 1: STARTUP DETAILS */}
              {editTab === 'details' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Startup Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Industry *
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.industry}
                        onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      One-Line Pitch / Tagline *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.oneLineDescription}
                      onChange={(e) => setEditFormData({ ...editFormData, oneLineDescription: e.target.value })}
                      className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Stage
                      </label>
                      <select
                        value={editFormData.stage}
                        onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value as any })}
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      >
                        <option value="Idea">Idea</option>
                        <option value="Prototype">Prototype</option>
                        <option value="MVP">MVP</option>
                        <option value="Early Traction">Early Traction</option>
                        <option value="Scaling">Scaling</option>
                        <option value="Growth">Growth</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Funding Status
                      </label>
                      <select
                        value={editFormData.fundingStatus}
                        onChange={(e) => setEditFormData({ ...editFormData, fundingStatus: e.target.value })}
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      >
                        <option value="Bootstrapped">Bootstrapped</option>
                        <option value="Seeking Angel">Seeking Angel</option>
                        <option value="Pre-Seed">Pre-Seed</option>
                        <option value="Seed Funded">Seed Funded</option>
                        <option value="Series A+">Series A+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editFormData.location}
                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                        placeholder="e.g. Remote, Bangalore, SF"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      The Problem It Solves *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editFormData.problem}
                      onChange={(e) => setEditFormData({ ...editFormData, problem: e.target.value })}
                      className="input-base w-full px-3 py-2 text-xs sm:text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      The Proposed Solution *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editFormData.solution}
                      onChange={(e) => setEditFormData({ ...editFormData, solution: e.target.value })}
                      className="input-base w-full px-3 py-2 text-xs sm:text-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Target Customers
                      </label>
                      <input
                        type="text"
                        value={editFormData.targetCustomers}
                        onChange={(e) => setEditFormData({ ...editFormData, targetCustomers: e.target.value })}
                        placeholder="e.g. B2B SaaS, College Students"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Business Model
                      </label>
                      <input
                        type="text"
                        value={editFormData.businessModel}
                        onChange={(e) => setEditFormData({ ...editFormData, businessModel: e.target.value })}
                        placeholder="e.g. Subscription, Marketplace Fee"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Required Skills / Looking For
                      </label>
                      <input
                        type="text"
                        value={editFormData.requiredSkills}
                        onChange={(e) => setEditFormData({ ...editFormData, requiredSkills: e.target.value })}
                        placeholder="e.g. AI Engineers, Growth Marketer"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Funding Required ($)
                      </label>
                      <input
                        type="text"
                        value={editFormData.fundingRequired}
                        onChange={(e) => setEditFormData({ ...editFormData, fundingRequired: e.target.value })}
                        placeholder="e.g. 50,000"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={editFormData.website}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Demo / Pitch Link
                      </label>
                      <input
                        type="url"
                        value={editFormData.demoLink}
                        onChange={(e) => setEditFormData({ ...editFormData, demoLink: e.target.value })}
                        placeholder="https://youtube.com/..."
                        className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERNSHIP OPPORTUNITY FORM */}
              {editTab === 'internship' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400">
                          <GraduationCap size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Internship Opportunity Form
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Offer student builder internships with allotted stipend and duration (permanent or custom days).
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={offerInternship}
                          onChange={(e) => setOfferInternship(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-dark-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {offerInternship ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {offerInternship ? (
                      <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-900/50 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Internship Role Title *
                            </label>
                            <input
                              type="text"
                              value={internshipRole}
                              onChange={(e) => setInternshipRole(e.target.value)}
                              placeholder="e.g. AI Research Intern, Frontend Intern"
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Workplace Mode
                            </label>
                            <select
                              value={internshipWorkplaceType}
                              onChange={(e) => setInternshipWorkplaceType(e.target.value)}
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            >
                              <option value="Remote">Remote</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="On-site">On-site</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Money Allotted / Stipend */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <DollarSign size={13} className="text-indigo-600" />
                              Money Allotted / Stipend *
                            </label>
                            <input
                              type="text"
                              value={internshipCompensation}
                              onChange={(e) => setInternshipCompensation(e.target.value)}
                              placeholder="e.g. ₹15,000 / month, $500 / month, Stipend + Equity"
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            />
                          </div>

                          {/* Duration Category: Permanent vs Custom Days */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <Clock size={13} className="text-indigo-600" />
                              Working Duration Category *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setInternshipDurationType('Permanent')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${internshipDurationType === 'Permanent'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-indigo-300'
                                  }`}
                              >
                                Permanent
                              </button>
                              <button
                                type="button"
                                onClick={() => setInternshipDurationType('Custom')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${internshipDurationType === 'Custom'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-indigo-300'
                                  }`}
                              >
                                Custom Days
                              </button>
                            </div>
                          </div>
                        </div>

                        {internshipDurationType === 'Custom' && (
                          <div className="p-2.5 rounded-lg bg-indigo-100/50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                              <Calendar size={14} /> Total Working Days Needed:
                            </span>
                            <div className="flex items-center gap-2">
                              {[30, 60, 90, 180].map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => setInternshipCustomDays(String(days))}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${internshipCustomDays === String(days)
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700'
                                    }`}
                                >
                                  {days}d
                                </button>
                              ))}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="730"
                                  value={internshipCustomDays}
                                  onChange={(e) => setInternshipCustomDays(e.target.value)}
                                  className="input-base !w-18 !py-1 !px-2 text-xs text-center"
                                  placeholder="Days"
                                />
                                <span className="text-xs text-slate-500">Days</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Internship Overview & Learning Outcomes
                          </label>
                          <input
                            type="text"
                            value={internshipDescription}
                            onChange={(e) => setInternshipDescription(e.target.value)}
                            placeholder="Brief summary of projects, mentorship support, and deliverables"
                            className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-dark-800/50 text-xs text-slate-500">
                        Internship hiring is currently disabled for this venture. Toggle "Enabled" above to post or edit an internship role.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: JOB OPENING FORM */}
              {editTab === 'job' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Job Opening Form
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Hiring core engineers or leads? Specify allotted salary and commitment (permanent or custom days).
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={offerJob}
                          onChange={(e) => setOfferJob(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-dark-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {offerJob ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {offerJob ? (
                      <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/50 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Job Position Title *
                            </label>
                            <input
                              type="text"
                              value={jobRole}
                              onChange={(e) => setJobRole(e.target.value)}
                              placeholder="e.g. Senior Full Stack Engineer, Growth Lead"
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Workplace Mode
                            </label>
                            <select
                              value={jobWorkplaceType}
                              onChange={(e) => setJobWorkplaceType(e.target.value)}
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            >
                              <option value="Remote">Remote</option>
                              <option value="Hybrid">Hybrid</option>
                              <option value="On-site">On-site</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Money Allotted / Salary */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <DollarSign size={13} className="text-emerald-600" />
                              Money Allotted / Salary *
                            </label>
                            <input
                              type="text"
                              value={jobCompensation}
                              onChange={(e) => setJobCompensation(e.target.value)}
                              placeholder="e.g. ₹80,000 / month, $4,000 / month, Equity + Salary"
                              className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                            />
                          </div>

                          {/* Duration Category: Permanent vs Custom Days */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                              <Clock size={13} className="text-emerald-600" />
                              Working Duration Category *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setJobDurationType('Permanent')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${jobDurationType === 'Permanent'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-emerald-300'
                                  }`}
                              >
                                Permanent
                              </button>
                              <button
                                type="button"
                                onClick={() => setJobDurationType('Custom')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${jobDurationType === 'Custom'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-emerald-300'
                                  }`}
                              >
                                Custom Days
                              </button>
                            </div>
                          </div>
                        </div>

                        {jobDurationType === 'Custom' && (
                          <div className="p-2.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                              <Calendar size={14} /> Total Duration:
                            </span>
                            <div className="flex items-center gap-2">
                              {[90, 180, 270, 365].map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => setJobCustomDays(String(days))}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${jobCustomDays === String(days)
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700'
                                    }`}
                                >
                                  {days}d
                                </button>
                              ))}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="1825"
                                  value={jobCustomDays}
                                  onChange={(e) => setJobCustomDays(e.target.value)}
                                  className="input-base !w-18 !py-1 !px-2 text-xs text-center"
                                  placeholder="Days"
                                />
                                <span className="text-xs text-slate-500">Days</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Job Responsibilities & Impact
                          </label>
                          <input
                            type="text"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Brief outline of architecture, systems, and ownership expectations"
                            className="input-base w-full px-3 py-2 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-100/50 dark:bg-dark-800/50 text-xs text-slate-500">
                        Job hiring is currently disabled for this venture. Toggle "Enabled" above to post or edit a job opening.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {editTab === 'details' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('internship')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Edit Internships →</span>
                    </button>
                  )}
                  {editTab === 'internship' && (
                    <button
                      type="button"
                      onClick={() => setEditTab('job')}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Edit Jobs →</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="btn-primary px-4 py-2 text-xs font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Edit2 size={13} />
                    <span>{isSavingEdit ? 'Saving Changes...' : 'Save All Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
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
