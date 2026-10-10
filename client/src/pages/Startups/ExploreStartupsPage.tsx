import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { SEO } from '../../components/common/SEO';
import {
  Compass,
  Search,
  Filter,
  Heart,
  Bookmark,
  Share2,
  Users,
  MapPin,
  Sparkles,
  UserPlus,
  Plus,
  Eye,
  Check,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Rocket,
  Lightbulb,
  ArrowRight,
  Edit2,
  Trash2,
} from 'lucide-react';

let cachedStartupsList: Startup[] = [];
function getInitialStartups(): Startup[] {
  if (cachedStartupsList.length > 0) return cachedStartupsList;
  try {
    const raw = sessionStorage.getItem('startupz_cached_startups');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedStartupsList = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

export const ExploreStartupsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInitialMount = React.useRef(true);
  const [startups, setStartups] = useState<Startup[]>(getInitialStartups);
  const [loading, setLoading] = useState(() => getInitialStartups().length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [fundingStatus, setFundingStatus] = useState('ALL');
  const [location, setLocation] = useState('');

  const hasActiveFilters = Boolean(
    search.trim() ||
    industry !== 'ALL' ||
    stage !== 'ALL' ||
    fundingStatus !== 'ALL' ||
    location.trim()
  );

  const handleResetFilters = () => {
    setSearch('');
    setIndustry('ALL');
    setStage('ALL');
    setFundingStatus('ALL');
    setLocation('');
  };

  // Modals & Action States
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIdeas, setExpandedIdeas] = useState<Record<string, boolean>>({});

  const fetchStartups = async () => {
    if (startups.length === 0 && cachedStartupsList.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (industry !== 'ALL') params.append('industry', industry);
      if (stage !== 'ALL') params.append('stage', stage);
      if (fundingStatus !== 'ALL') params.append('fundingStatus', fundingStatus);
      if (location) params.append('location', location);

      const res = await api.getStartups(params.toString());
      const clean = (res.startups || []).filter((s: any) => !isDemoRecord(s));
      setStartups(clean);
      if (!search && industry === 'ALL' && stage === 'ALL' && fundingStatus === 'ALL' && !location && clean.length > 0) {
        cachedStartupsList = clean;
        try {
          sessionStorage.setItem('startupz_cached_startups', JSON.stringify(clean));
        } catch {}
      }
    } catch (err: any) {
      console.error('ExploreStartupsPage fetch error:', err);
      setError(err?.message || 'Unable to connect to the backend server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchStartups();
      return;
    }
    const timer = setTimeout(() => {
      fetchStartups();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, industry, stage, fundingStatus, location]);

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.likeStartup(id);
      setStartups((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isLiked: res.liked, likesCount: res.likesCount } : s
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleSave('STARTUP', id);
      setStartups((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isSaved: res.saved } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.followStartup(id);
      setStartups((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, isFollowed: res.following ?? res.followed, followersCount: res.followersCount }
            : s
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/startups/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteStartup = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteStartup(id).catch(() => null);
      try {
        await supabase.from('posts').delete().eq('startup_id', id);
        await supabase.from('posts').delete().ilike('title', `%${name}%`);
        await supabase.from('startup_opportunities').delete().eq('startup_id', id);
        await supabase.from('startups').delete().eq('id', id);
      } catch (cleanErr) {
        console.warn('Supabase cleanup on delete:', cleanErr);
      }
      setStartups((prev) => prev.filter((s) => s.id !== id));
      cachedStartupsList = cachedStartupsList.filter((s) => s.id !== id);
      try {
        sessionStorage.setItem('startupz_cached_startups', JSON.stringify(cachedStartupsList));
      } catch {}
    } catch (err: any) {
      alert(err?.message || 'Failed to delete startup.');
    }
  };

  const industries = ['ALL', 'AgriTech', 'CleanTech', 'HealthTech', 'FinTech', 'EdTech', 'AI', 'Logistics', 'Accessibility', 'CyberSecurity', 'B2B SaaS', 'Consumer'];
  const stages = ['ALL', 'Idea', 'Validation', 'MVP', 'Early Revenue', 'Growth', 'Fundraising', 'Public'];
  const fundingOptions = ['ALL', 'Bootstrapped', 'Seeking Funding', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Venture Backed'];

  return (
    <div className="w-full max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title="Discover Startups | HookZ"
        description="Discover cutting-edge startup ideas, join as a co-founder, or support early-stage founders and ventures across the HookZ ecosystem."
        canonicalPath="/startups"
        breadcrumbs={[{ name: 'Startups', path: '/startups' }]}
      />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Compass className="text-brand-600" size={26} /> Explore Startups & Ventures
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover cutting-edge ideas, join as a co-founder, or support early-stage founders across the ecosystem.
          </p>
        </div>

        <Link
          to="/startups/create"
          className="btn-primary inline-flex items-center gap-2 text-xs shrink-0"
        >
          <Plus size={15} /> Publish Startup Venture
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="card-base p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problem, solution, skills..."
              className="input-base w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === 'ALL' ? 'All Industries' : ind}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs"
            >
              {stages.map((st) => (
                <option key={st} value={st}>
                  {st === 'ALL' ? 'All Stages' : st}
                </option>
              ))}
            </select>
          </div>

          {/* Funding Status */}
          <div>
            <select
              value={fundingStatus}
              onChange={(e) => setFundingStatus(e.target.value)}
              className="input-base w-full py-2 px-3 text-xs"
            >
              {fundingOptions.map((f) => (
                <option key={f} value={f}>
                  {f === 'ALL' ? 'All Funding' : f}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Startups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-lg bg-slate-100 dark:bg-dark-850 animate-pulse border border-slate-200 dark:border-dark-800" />
          ))}
        </div>
      ) : error && startups.length === 0 ? (
        <div className="card-base p-8 text-center space-y-3 border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
            Unable to Load Ventures
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <button
              onClick={fetchStartups}
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
            >
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        </div>
      ) : startups.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={Search}
            title="No matching ventures found"
            description="No published startups matched your active filter criteria. Try adjusting keywords, selecting 'All Industries', or clearing all filters."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="card-base p-8 sm:p-10 text-center space-y-4 border-dashed border-2 border-slate-300 dark:border-dark-700 bg-slate-50/40 dark:bg-dark-850/40">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-200/60 dark:border-brand-900/60">
              <Rocket size={22} />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Startup Directory Open for Submissions
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                There are currently no public ventures listed in the directory. If you are building an early-stage startup, MVP, or venture, you can publish your project today to gain visibility across the HookZ network and connect with builders and collaborators.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/startups/create"
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <Plus size={14} /> Publish a Startup Venture
              </Link>
              <button
                onClick={fetchStartups}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs"
              >
                <RefreshCw size={13} /> Check Again
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              New venture submissions appear here once published. Check back regularly as new startups join the directory.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {startups.map((startup) => (
            <div
              key={startup.id}
              className="card-base p-5 hover:border-slate-300 dark:hover:border-dark-700 transition-colors flex flex-col justify-between min-w-0 overflow-hidden break-words"
            >
              <div className="space-y-3.5">
                {/* Header: Logo, Name, Verified, Stage */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={startup.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${startup.name}`}
                      alt=""
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-dark-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${startup.id}`}
                        className="font-semibold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors truncate block"
                      >
                        {startup.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span>{startup.industry}</span>
                        {startup.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin size={11} /> {startup.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-900/50 shrink-0">
                    {startup.stage}
                  </span>
                </div>

                {/* Problem & Solution */}
                <div className="space-y-2 text-xs min-w-0 break-words">
                  <div>
                    <span className="font-medium text-slate-400 uppercase text-[10px] tracking-wider block">
                      Problem
                    </span>
                    <p className={`text-slate-600 dark:text-slate-300 ${expandedIdeas[startup.id + '-prob'] ? '' : 'line-clamp-2 sm:line-clamp-3'} mt-0.5 leading-relaxed break-words`}>
                      {startup.problem}
                    </p>
                    {startup.problem && (startup.problem.length > 90 || startup.problem.split('\n').length > 2) && (
                      <button
                        type="button"
                        onClick={() => setExpandedIdeas((prev) => ({ ...prev, [startup.id + '-prob']: !prev[startup.id + '-prob'] }))}
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-0.5 cursor-pointer"
                      >
                        {expandedIdeas[startup.id + '-prob'] ? 'Show less' : '...more'}
                      </button>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-brand-600 dark:text-brand-400 uppercase text-[10px] tracking-wider block">
                      Solution
                    </span>
                    <p className={`text-slate-600 dark:text-slate-300 ${expandedIdeas[startup.id + '-sol'] ? '' : 'line-clamp-2 sm:line-clamp-3'} mt-0.5 leading-relaxed break-words`}>
                      {startup.solution}
                    </p>
                    {startup.solution && (startup.solution.length > 90 || startup.solution.split('\n').length > 2) && (
                      <button
                        type="button"
                        onClick={() => setExpandedIdeas((prev) => ({ ...prev, [startup.id + '-sol']: !prev[startup.id + '-sol'] }))}
                        className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-0.5 cursor-pointer"
                      >
                        {expandedIdeas[startup.id + '-sol'] ? 'Show less' : '...more'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Required Skills */}
                {startup.requiredSkills && (
                  <div>
                    <span className="font-medium text-slate-400 uppercase text-[10px] tracking-wider block mb-1.5">
                      Looking for Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {startup.requiredSkills.split(',').slice(0, 3).map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700/60"
                        >
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Founder, Stats, Actions */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-dark-800 space-y-3">
                {/* Founder Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={startup.founder?.profile?.avatar}
                      name={startup.founder?.profile?.fullName || 'Founder'}
                      size="xs"
                      className="!w-5 !h-5"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {startup.founder?.profile?.fullName || 'Founder'}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {startup.fundingStatus || 'Bootstrapped'}
                  </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleLike(startup.id, e)}
                      className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                        startup.isLiked
                          ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/50'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-dark-800'
                      }`}
                      title="Like Idea"
                    >
                      <Heart size={14} fill={startup.isLiked ? 'currentColor' : 'none'} />
                      <span className="font-medium text-[11px]">{startup.likesCount}</span>
                    </button>

                    <button
                      onClick={(e) => handleSave(startup.id, e)}
                      className={`p-1.5 rounded-md transition-colors ${
                        startup.isSaved
                          ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/50'
                          : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-800'
                      }`}
                      title="Save Startup"
                    >
                      <Bookmark size={14} fill={startup.isSaved ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={(e) => handleShare(startup.id, e)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-dark-800"
                      title="Share Link"
                    >
                      {copiedId === startup.id ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Share2 size={14} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Boolean(
                      user && (
                        user.id === startup.founderId ||
                        user.id === startup.founder?.id ||
                        user.id === (startup as any).founder_id ||
                        user.id === (startup as any).userId ||
                        (startup.founder?.email && user.email && startup.founder.email.toLowerCase() === user.email.toLowerCase()) ||
                        user.isAdmin
                      )
                    ) && (
                      <>
                        <Link
                          to={`/startups/${startup.id}?edit=true`}
                          className="px-2 py-1 text-xs rounded-md font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/60 hover:bg-brand-100 dark:hover:bg-brand-900/40 inline-flex items-center gap-1 transition-colors"
                          title="Edit your startup"
                        >
                          <Edit2 size={11} />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteStartup(startup.id, startup.name, e)}
                          className="px-2 py-1 text-xs rounded-md font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Delete your startup"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => handleFollow(startup.id, e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        startup.isFollowed
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-800 border border-slate-200 dark:border-dark-700'
                      }`}
                      title="Follow Startup"
                    >
                      <UserCheck size={12} />
                      <span>{startup.isFollowed ? 'Following' : 'Follow'}</span>
                      {startup.followersCount ? (
                        <span className="text-[10px] opacity-75">({startup.followersCount})</span>
                      ) : null}
                    </button>
                    <button
                      onClick={() => setConnectUser(startup.founder || null)}
                      className="btn-secondary px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Connect
                    </button>
                    <Link
                      to={`/startups/${startup.id}`}
                      className="btn-primary px-3 py-1 text-xs inline-flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Directory Guide & Ecosystem Information */}
      <section className="pt-6 space-y-6 border-t border-slate-200/80 dark:border-dark-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="text-brand-600" size={20} /> About the HookZ Startup Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            A collaborative registry where founders share early-stage ideas, validation projects, and active ventures with builders across the ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: What visitors can discover */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
                <Lightbulb size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                What You Can Discover
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Explore emerging ventures across sectors such as AI, B2B SaaS, CleanTech, HealthTech, and EdTech. Listings outline the problem addressed, solution architecture, venture stage (Idea, Validation, MVP, Early Revenue), and current funding approach.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-dark-800">
              Filter by industry, development stage, or funding model above.
            </div>
          </div>

          {/* Pillar 2: How collaborators, students, and builders participate */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                <Users size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Participate as a Builder or Co-Founder
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Students, developers, designers, and aspiring co-founders can discover teams seeking specific skill sets. Connect directly with founders, explore open contributor roles, or discuss collaborative partnerships with no middleman.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/cofounders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Find Co-Founders <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Pillar 3: How founders publish a venture */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40">
                <Rocket size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                How Founders Publish a Venture
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Have a project or problem you're tackling? Share your startup's core premise, specify the stage and target audience, and outline the skill profiles you need. Published ventures become discoverable across the network immediately.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/startups/create"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Publish a Venture <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* How Venture Publishing & Collaboration Works */}
        <div className="card-base p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-dark-850/50">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            How Venture Publishing &amp; Collaboration Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Define the Core Idea</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Detail the problem statement, proposed solution, and market context without requiring pre-existing revenue or external capital.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Specify Needed Skills</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  List the technical, product, or go-to-market roles required so interested collaborators and students can reach out.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Connect Directly</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Receive direct messages, schedule introductory calls, and review applicant profiles directly on HookZ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />
    </div>
  );
};
