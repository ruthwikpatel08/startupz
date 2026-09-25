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
  ArrowRight,
  Sparkles,
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
    posts: [],
  });
  const [loading, setLoading] = useState(false);

  const performSearch = async (q: string, type: string) => {
    if (!q.trim()) {
      setResults({ users: [], startups: [], investors: [], mentors: [], opportunities: [], posts: [] });
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchAll(q, type);
      setResults(data.results || { users: [], startups: [], investors: [], mentors: [], opportunities: [], posts: [] });
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
    { key: 'PEOPLE', label: `People (${results.users?.length || 0})`, icon: Users },
    { key: 'STARTUPS', label: `Startups (${results.startups?.length || 0})`, icon: Compass },
    { key: 'INVESTORS', label: `Investors (${results.investors?.length || 0})`, icon: TrendingUp },
    { key: 'OPPORTUNITIES', label: `Roles (${results.opportunities?.length || 0})`, icon: Briefcase },
    { key: 'POSTS', label: `Posts (${results.posts?.length || 0})`, icon: Share2 },
  ];

  const totalResults =
    (results.users?.length || 0) +
    (results.startups?.length || 0) +
    (results.investors?.length || 0) +
    (results.mentors?.length || 0) +
    (results.opportunities?.length || 0) +
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
            placeholder="Search skills (e.g. AI, React), startup names, industries, investors..."
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
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : totalResults === 0 && query ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`We couldn't find any matches for "${query}". Try searching for alternative skills, startup concepts, or locations.`}
        />
      ) : (
        <div className="space-y-8">
          
          {/* People Section */}
          {(activeTab === 'ALL' || activeTab === 'PEOPLE') && results.users?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users size={16} /> People & Co-Founders ({results.users.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map((u: any) => (
                  <Link
                    key={u.id}
                    to={`/profile/${u.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all flex items-center gap-3 group"
                  >
                    <img
                      src={u.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.profile?.fullName || u.email}`}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-brand-600 truncate">
                          {u.profile?.fullName || u.email}
                        </span>
                        <VerificationBadge badge={u.verificationBadge} isVerified={u.isVerified} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{u.profile?.headline || u.role}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{u.profile?.location || 'Remote'}</p>
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
                <Compass size={16} /> Startups & Ideas ({results.startups.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.startups.map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/startups/${s.id}`}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600">
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
                      Check: {inv.minCheckSize || '$25K'} - {inv.maxCheckSize || '$250K'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities Section */}
          {(activeTab === 'ALL' || activeTab === 'OPPORTUNITIES') && results.opportunities?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase size={16} /> Startup Opportunities ({results.opportunities.length})
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
