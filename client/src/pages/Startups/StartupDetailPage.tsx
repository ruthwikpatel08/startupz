import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { IdeaFeedbackModal } from '../../components/common/IdeaFeedbackModal';
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-64 rounded-3xl bg-slate-100 dark:bg-dark-850 animate-pulse" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
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
      
      {/* 1. HERO HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Top Badges & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              {startup.stage} STAGE
            </span>
            <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800">
              {startup.industry}
            </span>
            {startup.isConfidential && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock size={12} /> Confidential Idea
              </span>
            )}
            <VerificationBadge type={startup.isVerified ? 'Verified Startup' : null} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFollow}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                startup.isFollowed
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-brand-600 hover:bg-brand-500 text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>{startup.isFollowed ? 'Following' : 'Follow Startup'}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                {startup.followersCount ?? 0}
              </span>
            </button>

            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                startup.isLiked
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
                  : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-rose-500'
              }`}
            >
              <Heart size={15} fill={startup.isLiked ? 'currentColor' : 'none'} />
              <span>{startup.likesCount}</span>
            </button>

            <button
              onClick={handleSave}
              className={`p-2 rounded-xl transition-colors ${
                startup.isSaved
                  ? 'bg-brand-50 dark:bg-brand-950 text-brand-600'
                  : 'bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-brand-600'
              }`}
              title="Save Startup"
            >
              <Bookmark size={15} fill={startup.isSaved ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-brand-600"
              title="Share"
            >
              <Share2 size={15} />
            </button>

            <button
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 shadow-md"
            >
              <Sparkles size={14} /> AI Validation
            </button>
          </div>
        </div>

        {/* Startup Brand & One-Liner */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <img
            src={startup.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${startup.name}`}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0"
          />
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Funding Status</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{startup.fundingStatus || 'Bootstrapped'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Round Target</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{startup.fundingRequired || 'Not specified'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Business Model</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{startup.businessModel || 'SaaS'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-850">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Team Size</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{startup.teamSize || 1} Builders</span>
          </div>
        </div>

      </div>

      {/* 2. MAIN PROBLEM / SOLUTION / DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Problem, Solution, Traction */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Problem Statement Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertCircle size={16} /> Problem We Are Solving
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {startup.problem}
            </p>
          </div>

          {/* Solution & Value Proposition */}
          <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 size={16} /> Our Solution & Technology
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
              {startup.solution}
            </p>
          </div>

          {/* Target Customers & Traction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Target Customer Profile
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {startup.targetCustomers || 'Early adopters, high-growth SMBs, and modern enterprises.'}
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Current Traction & Milestones
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {startup.currentTraction || 'Early validation and pilot phase underway.'}
              </p>
            </div>
          </div>

          {/* Required Skills */}
          {startup.requiredSkills && (
            <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Looking for Collaborators & Co-Founders with Skills:
              </h4>
              <div className="flex flex-wrap gap-2">
                {startup.requiredSkills.split(',').map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900"
                  >
                    {sk.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Opportunities for this startup */}
          {startup.opportunities && startup.opportunities.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase size={16} className="text-brand-600" /> Open Opportunities at {startup.name}
              </h4>
              <div className="space-y-3">
                {startup.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-850 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white">{opp.role}</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {opp.commitment} • {opp.compensation} • {opp.workplaceType}
                      </p>
                    </div>
                    <Link
                      to="/opportunities"
                      className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
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
        <div className="space-y-6">
          
          {/* Founder Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              FOUNDER
            </span>
            <div className="flex items-center gap-3">
              <img
                src={
                  startup.founder?.profile?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${startup.founder?.profile?.fullName}`
                }
                alt=""
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/profile/${startup.founder?.id}`}
                  className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 block truncate"
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
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                {startup.founder.profile.bio}
              </p>
            )}

            <button
              onClick={() => setConnectUser(startup.founder || null)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all"
            >
              <span>Connect with Founder</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Team Members */}
          <div className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              STARTUP TEAM ({startup.teamSize || (startup.members?.length || 0) + 1})
            </span>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-dark-850">
                <img
                  src={startup.founder?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${startup.founder?.profile?.fullName}`}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {startup.founder?.profile?.fullName}
                  </div>
                  <div className="text-[10px] text-brand-600 font-semibold">Founder / CEO</div>
                </div>
              </div>

              {startup.members?.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-dark-850">
                  <img
                    src={m.user?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.profile?.fullName || m.id}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {m.user?.profile?.fullName || 'Team Member'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">{m.role}</div>
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
