import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
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

  // Filters
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [fundingStatus, setFundingStatus] = useState('ALL');
  const [location, setLocation] = useState('');

  // Modals & Action States
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchStartups = async () => {
    if (startups.length === 0 && cachedStartupsList.length === 0) {
      setLoading(true);
    }
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
    } catch (err) {
      console.error(err);
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

  const industries = ['ALL', 'AgriTech', 'CleanTech', 'HealthTech', 'FinTech', 'EdTech', 'AI', 'Logistics', 'Accessibility', 'CyberSecurity', 'B2B SaaS', 'Consumer'];
  const stages = ['ALL', 'Idea', 'Validation', 'MVP', 'Early Revenue', 'Growth', 'Fundraising', 'Public'];
  const fundingOptions = ['ALL', 'Bootstrapped', 'Seeking Funding', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Venture Backed'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
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
      ) : startups.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No startups found"
          description="Try broadening your search query or selecting 'All Industries'."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setIndustry('ALL');
            setStage('ALL');
            setFundingStatus('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {startups.map((startup) => (
            <div
              key={startup.id}
              className="card-base p-5 hover:border-slate-300 dark:hover:border-dark-700 transition-colors flex flex-col justify-between"
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
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-slate-400 uppercase text-[10px] tracking-wider block">
                      Problem
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                      {startup.problem}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-600 dark:text-brand-400 uppercase text-[10px] tracking-wider block">
                      Solution
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                      {startup.solution}
                    </p>
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
                <div className="flex items-center justify-between text-xs pt-1">
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

                  <div className="flex items-center gap-1.5">
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

      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />
    </div>
  );
};
