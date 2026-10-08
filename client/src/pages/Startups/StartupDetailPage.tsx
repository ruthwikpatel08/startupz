import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
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
} from 'lucide-react';

export const StartupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchStartup = async () => {
      try {
        const data = await api.getStartup(id);
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
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteStartup = async () => {
    if (!startup) return;
    if (!window.confirm('Are you sure you want to delete this startup? This action cannot be undone.')) {
      return;
    }
    try {
      try {
        await api.deleteStartup(startup.id);
      } catch (err) {
        await supabase.from('startups').delete().eq('id', startup.id);
      }
      navigate('/startups');
    } catch (err: any) {
      alert(err.message || 'Failed to delete startup.');
    }
  };

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

  const isOwner = Boolean(
    user && (
      user.id === startup.founderId ||
      user.id === startup.founder?.id ||
      user.isAdmin
    )
  );

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
      <div className="card-base p-6 sm:p-7 space-y-6">
        
        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleFollow}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                startup.isFollowed
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                startup.isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border-rose-200 dark:border-rose-900'
                  : 'bg-white dark:bg-dark-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:text-rose-500'
              }`}
            >
              <Heart size={14} fill={startup.isLiked ? 'currentColor' : 'none'} />
              <span>{startup.likesCount}</span>
            </button>

            <button
              onClick={handleSave}
              className={`p-2 rounded-md transition-colors border ${
                startup.isSaved
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
              <button
                onClick={handleDeleteStartup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                title="Delete this startup"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Startup Brand & One-Liner */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <img
            src={startup.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${startup.name}`}
            alt=""
            className="w-16 h-16 rounded-lg object-cover border border-slate-200 dark:border-dark-700 shrink-0"
          />
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {startup.name}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
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
          {startup.opportunities && startup.opportunities.length > 0 && (
            <div className="card-base p-5 sm:p-6 space-y-4">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase size={16} className="text-brand-600" /> Open Opportunities at {startup.name}
              </h4>
              <div className="space-y-2.5">
                {startup.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200/60 dark:border-dark-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h5 className="font-semibold text-xs text-slate-900 dark:text-white">{opp.role}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {opp.commitment} • {opp.compensation} • {opp.workplaceType}
                      </p>
                    </div>
                    <Link
                      to="/opportunities"
                      className="btn-primary px-3 py-1.5 text-xs font-medium"
                    >
                      Apply Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    </div>
  );
};
