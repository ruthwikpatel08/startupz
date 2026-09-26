import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import {
  Search,
  Users,
  Compass,
  Briefcase,
  TrendingUp,
  Share2,
  GraduationCap,
  Globe,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const GlobalSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'ALL';

  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState(typeParam);
  const [results, setResults] = useState<any>({
    users: [],
    startups: [],
    investors: [],
    mentors: [],
    opportunities: [],
    problems: [],
    posts: [],
  });
  const [loading, setLoading] = useState(false);

  const performSearch = async (q: string, type: string) => {
    if (!q.trim()) {
      setResults({ users: [], startups: [], investors: [], mentors: [], opportunities: [], problems: [], posts: [] });
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchAll(q, type);
      const res = data.results || data || {};
      setResults({
        users: res.users || res.people || [],
        startups: res.startups || [],
        investors: res.investors || [],
        mentors: res.mentors || [],
        opportunities: res.opportunities || [],
        problems: res.problems || [],
        posts: res.posts || [],
      });
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(queryParam);
    setActiveTab(typeParam);
    performSearch(queryParam, typeParam);
  }, [queryParam, typeParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim(), type: activeTab });
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ q: query, type: newTab });
  };

  const tabs = [
    { key: 'ALL', label: 'All Results' },
    { key: 'PROBLEMS', label: `Problems (${results.problems?.length || 0})`, icon: Globe },
    { key: 'STARTUPS', label: `Startups (${results.startups?.length || 0})`, icon: Compass },
    { key: 'INVESTORS', label: `Investors (${results.investors?.length || 0})`, icon: TrendingUp },
    { key: 'MENTORS', label: `Mentors (${results.mentors?.length || 0})`, icon: GraduationCap },
    { key: 'OPPORTUNITIES', label: `Roles (${results.opportunities?.length || 0})`, icon: Briefcase },
    { key: 'PEOPLE', label: `People (${results.users?.length || 0})`, icon: Users },
    { key: 'POSTS', label: `Posts (${results.posts?.length || 0})`, icon: Share2 },
  ];

  const totalResults =
    (results.users?.length || 0) +
    (results.startups?.length || 0) +
    (results.investors?.length || 0) +
    (results.mentors?.length || 0) +
    (results.opportunities?.length || 0) +
    (results.problems?.length || 0) +
    (results.posts?.length || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Big Search Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="text-brand-600" size={28} /> Global Ecosystem Search
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search verified problems, startups, investors, mentors, grants..."
            className="w-full pl-12 pr-28 py-3 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-5 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-500 shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results View */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : totalResults === 0 && query ? (
        <EmptyState
          icon={Search}
          title="No records found"
          description={`We couldn't find any results matching "${query}". Try searching for categories like agriculture, climate, AI, or health.`}
          actionLabel="Clear Search"
          onAction={() => {
            setQuery('');
            setSearchParams({});
          }}
        />
      ) : (
        <div className="space-y-8">
          
          {/* Documented Problems Section */}
          {(activeTab === 'ALL' || activeTab === 'PROBLEMS') && results.problems?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe size={16} /> Verified Problems ({results.problems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.problems.map((prob: any) => (
                  <Link
                    key={prob.id}
                    to={`/problems/${prob.id}`}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all space-y-2 block group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {prob.title}
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                        Impact: {prob.impactLevel}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {prob.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                      <span>View Problem Statement & Sourced Evidence</span>
                      <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Startups Section */}
          {(activeTab === 'ALL' || activeTab === 'STARTUPS') && results.startups?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass size={16} /> Startups ({results.startups.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.startups.map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/startups/${s.id}`}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all space-y-2 block"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600">
                        {s.stage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {s.oneLineDescription || s.problem}
                    </p>
                    <div className="text-[10px] font-bold text-brand-600">
                      {s.industry} • {s.location || 'Remote'}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Investors Section */}
          {(activeTab === 'ALL' || activeTab === 'INVESTORS') && results.investors?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={16} /> Investors ({results.investors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.investors.map((inv: any) => (
                  <Link
                    key={inv.id}
                    to="/investors"
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all space-y-1 block"
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{inv.organization}</div>
                    <p className="text-[11px] text-slate-500">{inv.investorType}</p>
                    <p className="text-[10px] text-emerald-600 font-bold pt-1">
                      Check: {inv.minCheckSize || '$100K'} - {inv.maxCheckSize || '$5M'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mentors Section */}
          {(activeTab === 'ALL' || activeTab === 'MENTORS') && results.mentors?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GraduationCap size={16} /> Mentors & Programs ({results.mentors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.mentors.map((m: any) => (
                  <Link
                    key={m.id}
                    to="/mentors"
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all space-y-1.5 block"
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {m.user?.profile?.fullName || m.expertise}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{m.about || m.mentoringTopics}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities Section */}
          {(activeTab === 'ALL' || activeTab === 'OPPORTUNITIES') && results.opportunities?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase size={16} /> Opportunities & Grants ({results.opportunities.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.opportunities.map((opp: any) => (
                  <Link
                    key={opp.id}
                    to="/opportunities"
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-600">
                        {opp.role}
                      </div>
                      <div className="text-[11px] text-slate-500">{opp.startup?.name} • {opp.compensation}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{opp.workplaceType}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* People Section */}
          {(activeTab === 'ALL' || activeTab === 'PEOPLE') && results.users?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users size={16} /> People ({results.users.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map((u: any) => (
                  <Link
                    key={u.id}
                    to={`/profile/${u.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all flex items-center gap-3"
                  >
                    <img
                      src={u.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.profile?.fullName || 'User'}`}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {u.profile?.fullName || 'Anonymous'}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{u.profile?.headline || u.role}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === 'ALL' || activeTab === 'POSTS') && results.posts?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Share2 size={16} /> Feed Posts ({results.posts.length})
              </h2>
              <div className="space-y-3">
                {results.posts.map((post: any) => (
                  <Link
                    key={post.id}
                    to={`/feed#post-${post.id}`}
                    className="block p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {post.author?.profile?.fullName || 'Member'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {post.postType}
                      </span>
                    </div>
                    {post.title && <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">{post.title}</h4>}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{post.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
