import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { ConnectModal } from '../../components/common/ConnectModal';
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

export const ExploreStartupsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (industry !== 'ALL') params.append('industry', industry);
      if (stage !== 'ALL') params.append('stage', stage);
      if (fundingStatus !== 'ALL') params.append('fundingStatus', fundingStatus);
      if (location) params.append('location', location);

      const res = await api.getStartups(params.toString());
      setStartups(res.startups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="text-brand-600" size={28} /> Explore Startup Ideas & Ventures
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover cutting-edge ideas, join as a co-founder, or support early-stage founders.
          </p>
        </div>

        <Link
          to="/startups/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all shrink-0"
        >
          <Plus size={16} /> Publish Your Startup Idea
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problem, solution, skills..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-slate-100 dark:bg-dark-850 animate-pulse" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {startups.map((startup) => (
            <div
              key={startup.id}
              className="group p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-500/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header: Logo, Name, Verified, Stage */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={startup.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${startup.name}`}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-800 shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${startup.id}`}
                        className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors truncate block"
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

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 uppercase tracking-wider shrink-0">
                    {startup.stage}
                  </span>
                </div>

                {/* Problem & Solution */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                      Problem
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                      {startup.problem}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-brand-600 dark:text-brand-400 uppercase text-[10px] tracking-wider block">
                      Solution
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                      {startup.solution}
                    </p>
                  </div>
                </div>

                {/* Required Skills */}
                {startup.requiredSkills && (
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1.5">
                      Looking for Skills
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {startup.requiredSkills.split(',').slice(0, 3).map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300"
                        >
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Founder, Stats, Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                {/* Founder Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        startup.founder?.profile?.avatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${startup.founder?.profile?.fullName}`
                      }
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {startup.founder?.profile?.fullName || 'Founder'}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {startup.fundingStatus || 'Bootstrapped'}
                  </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleLike(startup.id, e)}
                      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                        startup.isLiked
                          ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50'
                          : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-dark-800'
                      }`}
                      title="Like Idea"
                    >
                      <Heart size={15} fill={startup.isLiked ? 'currentColor' : 'none'} />
                      <span className="font-semibold text-[11px]">{startup.likesCount}</span>
                    </button>

                    <button
                      onClick={(e) => handleSave(startup.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        startup.isSaved
                          ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/50'
                          : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-800'
                      }`}
                      title="Save Startup"
                    >
                      <Bookmark size={15} fill={startup.isSaved ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={(e) => handleShare(startup.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-dark-800"
                      title="Share Link"
                    >
                      {copiedId === startup.id ? (
                        <Check size={15} className="text-emerald-500" />
                      ) : (
                        <Share2 size={15} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleFollow(startup.id, e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        startup.isFollowed
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-dark-800'
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                    >
                      <UserPlus size={13} /> Connect
                    </button>
                    <Link
                      to={`/startups/${startup.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
                    >
                      <Eye size={13} /> View
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
