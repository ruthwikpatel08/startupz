import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { Avatar } from '../../components/common/Avatar';
import { supabase } from '../../lib/supabase';
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
  UserPlus,
  Rocket,
  MapPin,
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

  // Modals
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [startupConnectUser, setStartupConnectUser] = useState<any | null>(null);

  const performSearch = async (q: string, type: string) => {
    const cleanQ = q.trim();
    if (!cleanQ) {
      setResults({ users: [], startups: [], investors: [], mentors: [], opportunities: [], problems: [], posts: [] });
      return;
    }

    setLoading(true);
    try {
      let apiUsers: any[] = [];
      let apiStartups: any[] = [];
      let apiInvestors: any[] = [];
      let apiMentors: any[] = [];
      let apiOpportunities: any[] = [];
      let apiProblems: any[] = [];
      let apiPosts: any[] = [];

      try {
        const data = await api.searchAll(cleanQ, type);
        const res = data.results || data || {};
        apiUsers = res.users || res.people || [];
        apiStartups = res.startups || [];
        apiInvestors = res.investors || [];
        apiMentors = res.mentors || [];
        apiOpportunities = res.opportunities || [];
        apiProblems = res.problems || [];
        apiPosts = res.posts || [];
      } catch (backendErr) {
        console.warn('Backend search notice:', backendErr);
      }

      const handleClean = cleanQ.replace(/^@/, '').trim();

      // Also search Supabase profiles directly by username, full_name, email, headline, skills
      try {
        const { data: supaProfiles } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${handleClean}%,full_name.ilike.%${handleClean}%,email.ilike.%${handleClean}%,headline.ilike.%${handleClean}%,skills.ilike.%${handleClean}%,preferred_role.ilike.%${handleClean}%`)
          .limit(30);

        if (supaProfiles && supaProfiles.length > 0) {
          const mappedSupa = supaProfiles.map((p) => {
            const uName = p.username || (p.email ? p.email.split('@')[0] : 'user');
            return {
              id: p.user_id || p.id,
              email: p.email,
              role: (p.preferred_role || 'FOUNDER').toUpperCase(),
              isVerified: true,
              verificationBadge: p.auth_provider === 'google' ? 'Verified via Google' : 'Verified Member',
              profile: {
                id: p.id,
                userId: p.user_id,
                fullName: p.full_name,
                username: uName,
                headline: p.headline || `${p.preferred_role || 'Builder'} | StartupZ Network`,
                location: p.location || 'Remote',
                avatar: p.avatar,
                skills: p.skills,
                preferredRole: p.preferred_role,
              },
            };
          });

          // Merge: Supabase real profiles FIRST
          const supaIds = new Set(mappedSupa.map((u) => u.id));
          const nonDemoApiUsers = apiUsers.filter((u: any) => !supaIds.has(u.id) && !isDemoRecord(u));
          apiUsers = [...mappedSupa, ...nonDemoApiUsers];
        } else {
          apiUsers = apiUsers.filter((u: any) => !isDemoRecord(u));
        }
      } catch (supaErr) {
        console.warn('Supabase search lookup error:', supaErr);
        apiUsers = apiUsers.filter((u: any) => !isDemoRecord(u));
      }

      const seenUserEmails = new Set<string>();
      const seenUserIds = new Set<string>();
      const seenUsernames = new Set<string>();
      const cleanUsers: any[] = [];
      for (const u of apiUsers) {
        if (isDemoRecord(u)) continue;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uId = (u.id || u.profile?.userId || '').trim();
        const uName = (u.profile?.username || (uEmail ? uEmail.split('@')[0] : '')).toLowerCase().trim();

        if (uEmail && seenUserEmails.has(uEmail)) continue;
        if (uId && seenUserIds.has(uId)) continue;
        if (uName && seenUsernames.has(uName)) continue;

        if (uEmail) seenUserEmails.add(uEmail);
        if (uId) seenUserIds.add(uId);
        if (uName) seenUsernames.add(uName);

        cleanUsers.push(u);
      }

      setResults({
        users: cleanUsers,
        startups: apiStartups.filter((s: any) => !isDemoRecord(s)),
        investors: apiInvestors.filter((i: any) => !isDemoRecord(i)),
        mentors: apiMentors.filter((m: any) => !isDemoRecord(m)),
        opportunities: apiOpportunities.filter((o: any) => !isDemoRecord(o)),
        problems: apiProblems.filter((p: any) => !isDemoRecord(p)),
        posts: apiPosts.filter((p: any) => !isDemoRecord(p)),
      });
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const lastFetchedQueryRef = React.useRef<string>('');

  useEffect(() => {
    setQuery(queryParam);
    setActiveTab(typeParam);
    const clean = queryParam.trim().toLowerCase();
    if (clean && clean !== lastFetchedQueryRef.current) {
      lastFetchedQueryRef.current = clean;
      performSearch(queryParam, typeParam);
    } else if (!clean) {
      lastFetchedQueryRef.current = '';
      setResults({ users: [], startups: [], investors: [], mentors: [], opportunities: [], problems: [], posts: [] });
    }
  }, [queryParam, typeParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      lastFetchedQueryRef.current = ''; // force re-fetch on explicit submit
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
    { key: 'MENTORS', label: `Mentors (${results.mentors?.length || 0})`, icon: GraduationCap },
    { key: 'OPPORTUNITIES', label: `Roles (${results.opportunities?.length || 0})`, icon: Briefcase },
    { key: 'PROBLEMS', label: `Problems (${results.problems?.length || 0})`, icon: Globe },
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
      
      {/* Search Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Search className="text-brand-600 dark:text-brand-400" size={26} /> Network & Ecosystem Search
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover verified founders, startups, investors, mentors, opportunities, and documented problems.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username, category, startups, problems..."
            className="input-base w-full pl-10 pr-24 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="btn-primary absolute right-1.5 top-1.5 text-xs py-1.5 px-4"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-dark-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-3 py-2 rounded-t-md text-xs font-semibold transition-all shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results View */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 card-base bg-slate-50 dark:bg-dark-900 animate-pulse" />
          ))}
        </div>
      ) : totalResults === 0 && query ? (
        <EmptyState
          icon={Search}
          title="No records found"
          description={`We couldn't find any results matching "${query}". Try searching for usernames, or categories like founder, investor.`}
          actionLabel="Clear Search"
          onAction={() => {
            setQuery('');
            setSearchParams({});
          }}
        />
      ) : (
        <div className="space-y-8">
          
          {/* People Section */}
          {(activeTab === 'ALL' || activeTab === 'PEOPLE') && results.users?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users size={14} /> Real People & Co-Founders ({results.users.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.users.map((u: any) => {
                  const username = u.profile?.username || (u.email ? u.email.split('@')[0] : 'user');
                  const fullName = u.profile?.fullName || (u.email ? u.email.split('@')[0] : 'User');
                  const role = u.profile?.preferredRole || u.role || 'FOUNDER';
                  return (
                    <div
                      key={u.id}
                      className="card-base p-5 flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          src={u.profile?.avatar}
                          name={fullName}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/profile/${u.id}`}
                              className="font-semibold text-sm text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            >
                              {fullName}
                            </Link>
                            <span className="text-xs text-brand-600 dark:text-brand-400 font-mono font-medium">
                              @{username}
                            </span>
                            <RoleBadge role={role} size="sm" />
                            <VerificationBadge badge={u.verificationBadge} isVerified={true} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{u.profile?.headline || role}</p>
                          {u.profile?.location && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {u.profile.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {u.profile?.skills && (
                        <div className="flex flex-wrap gap-1">
                          {u.profile.skills.split(',').slice(0, 3).map((sk: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700"
                            >
                              {sk.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between flex-wrap gap-2">
                        <Link
                          to={`/profile/${u.id}`}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                        >
                          View Profile →
                        </Link>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStartupConnectUser(u)}
                            className="btn-secondary inline-flex items-center gap-1 text-xs py-1.5 px-3"
                          >
                            <Rocket size={13} /> Startup Connection
                          </button>

                          <button
                            type="button"
                            onClick={() => setConnectUser(u)}
                            className="btn-primary inline-flex items-center gap-1 text-xs py-1.5 px-3"
                          >
                            <UserPlus size={13} /> Connect
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Startups Section */}
          {(activeTab === 'ALL' || activeTab === 'STARTUPS') && results.startups?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Compass size={14} /> Startups ({results.startups.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.startups.map((s: any) => (
                  <Link
                    key={s.id}
                    to={`/startups/${s.id}`}
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors space-y-2 block"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{s.name}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40">
                        {s.stage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {s.oneLineDescription || s.problem}
                    </p>
                    <div className="text-xs font-medium text-brand-600 dark:text-brand-400">
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} /> Investors ({results.investors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.investors.map((inv: any) => (
                  <Link
                    key={inv.id}
                    to="/investors"
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors space-y-1 block"
                  >
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{inv.organization}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{inv.investorType}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                      Check: {inv.minCheckSize || '$25K'} - {inv.maxCheckSize || '$500K'}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mentors Section */}
          {(activeTab === 'ALL' || activeTab === 'MENTORS') && results.mentors?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <GraduationCap size={14} /> Mentors & Programs ({results.mentors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.mentors.map((m: any) => (
                  <Link
                    key={m.id}
                    to="/mentors"
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors space-y-1.5 block"
                  >
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">
                      {m.user?.profile?.fullName || m.expertise}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{m.about || m.mentoringTopics}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities Section */}
          {(activeTab === 'ALL' || activeTab === 'OPPORTUNITIES') && results.opportunities?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Briefcase size={14} /> Opportunities & Roles ({results.opportunities.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.opportunities.map((opp: any) => (
                  <Link
                    key={opp.id}
                    to="/opportunities"
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                        {opp.role}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opp.startup?.name} • {opp.compensation}</div>
                    </div>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{opp.workplaceType}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Documented Problems Section */}
          {(activeTab === 'ALL' || activeTab === 'PROBLEMS') && results.problems?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Globe size={14} /> Documented Problems ({results.problems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.problems.map((prob: any) => (
                  <Link
                    key={prob.id}
                    to={`/problems/${prob.id}`}
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors space-y-2 block group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">
                        {prob.title}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40 shrink-0">
                        Impact: {prob.impactLevel}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {prob.description}
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-brand-600 dark:text-brand-400 font-medium">
                      <span>View Problem Statement & Evidence</span>
                      <ArrowRight size={12} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Feed Posts */}
          {(activeTab === 'ALL' || activeTab === 'POSTS') && results.posts?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Share2 size={14} /> Feed Posts ({results.posts.length})
              </h2>
              <div className="space-y-3">
                {results.posts.map((post: any) => (
                  <Link
                    key={post.id}
                    to={`/feed#post-${post.id}`}
                    className="card-base p-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors space-y-1.5 block"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {post.author?.profile?.fullName || 'Member'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700">
                        {post.postType}
                      </span>
                    </div>
                    {post.title && <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{post.title}</h4>}
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{post.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
        onSuccess={() => performSearch(query, activeTab)}
      />

      {/* Startup Proposal Connection Modal */}
      <StartupConnectionModal
        isOpen={!!startupConnectUser}
        onClose={() => setStartupConnectUser(null)}
        targetUser={startupConnectUser}
        onSuccess={() => performSearch(query, activeTab)}
      />
    </div>
  );
};
