import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Investor } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { EmptyState } from '../../components/common/EmptyState';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Clock,
  Briefcase,
  UserPlus,
  Check,
  TrendingUp,
  ExternalLink,
  Target,
  Rocket,
  Megaphone,
  BriefcaseBusiness,
  X,
} from 'lucide-react';

export const FindCoFounderPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = (searchParams.get('category') || 'all').toLowerCase();
  const currentCategory = rawCategory === 'co-founders' ? 'cofounders' : rawCategory;

  const [matches, setMatches] = useState<any[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);

  // Search input state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Filter States
  const [targetRole, setTargetRole] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');

  // Investor specific filters
  const [investorSearch, setInvestorSearch] = useState('');
  const [investorType, setInvestorType] = useState('ALL');
  const [investorStage, setInvestorStage] = useState('ALL');

  // Modals
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [startupConnectUser, setStartupConnectUser] = useState<any | null>(null);

  const categories = [
    { label: 'All Members', value: 'all', icon: Users, hint: 'All registered platform members' },
    { label: 'Founders', value: 'founders', icon: Rocket, hint: 'Active founders building startups' },
    { label: 'Co-Founders', value: 'cofounders', icon: Users, hint: 'Builders seeking synergy' },
    { label: 'Marketers', value: 'marketers', icon: Megaphone, hint: 'Growth & demand specialists' },
    { label: 'Investors', value: 'investors', icon: TrendingUp, hint: 'Angel & VC capital backers' },
    { label: 'Other', value: 'other', icon: BriefcaseBusiness, hint: 'Engineers, designers & advisors' },
  ];

  const handleSelectCategory = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('category', cat);
    setSearchParams(params);
  };

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      if (currentCategory === 'investors') {
        const params = new URLSearchParams();
        if (investorSearch) params.append('search', investorSearch);
        if (investorType !== 'ALL') params.append('investorType', investorType);
        if (investorStage !== 'ALL') params.append('preferredStages', investorStage);

        let loadedInvestors: any[] = [];
        try {
          const res = await api.getInvestors(params.toString());
          if (res.investors && res.investors.length > 0) {
            loadedInvestors = res.investors;
          }
        } catch {
          // Backend loading fallback
        }

        // Also query live Supabase profiles for real investor accounts
        let supaMappedInvestors: any[] = [];
        try {
          const { data: supaInvestors } = await supabase
            .from('profiles')
            .select('*')
            .or('preferred_role.ilike.%investor%,skills.ilike.%investor%,skills.ilike.%investing%,headline.ilike.%investor%');

          if (supaInvestors && supaInvestors.length > 0) {
            supaMappedInvestors = supaInvestors.map((p) => ({
              id: p.id || p.user_id,
              userId: p.user_id || p.id,
              organization: p.full_name || 'Angel Investor',
              investorType: 'Angel / Early Investor',
              preferredStages: 'Pre-Seed, Seed',
              industries: p.industries || p.skills || 'Technology, Artificial Intelligence, SaaS',
              location: p.location || 'Remote',
              about: p.bio || p.headline || 'Active startup investor in the StartupZ ecosystem.',
              isVerified: true,
              minCheckSize: '$25K',
              maxCheckSize: '$250K',
              user: {
                id: p.user_id || p.id,
                email: p.email,
                role: 'INVESTOR',
                profile: {
                  fullName: p.full_name,
                  username: p.username || (p.email ? p.email.split('@')[0] : 'user'),
                  avatar: p.avatar,
                  headline: p.headline,
                  location: p.location,
                },
              },
            }));
          }
        } catch (supaErr) {
          console.warn('Supabase investor query notice:', supaErr);
        }

        const rawAllInvestors = [...supaMappedInvestors, ...loadedInvestors];
        const seenInvEmails = new Set<string>();
        const seenInvIds = new Set<string>();
        const seenInvNames = new Set<string>();
        const filteredInvestors: Investor[] = [];

        const term = (investorSearch || searchQuery).trim().toLowerCase().replace(/^@/, '');

        for (const inv of rawAllInvestors) {
          if (isDemoRecord(inv)) continue;

          const invEmail = (inv.user?.email || '').toLowerCase().trim();
          const invId = (inv.id || inv.userId || inv.user?.id || '').trim();
          const invOrg = (inv.organization || '').toLowerCase().trim();

          // 1. Exclude the currently logged-in user from their own view!
          if (currentUser) {
            const curEmail = (currentUser.email || '').toLowerCase().trim();
            const curId = (currentUser.id || '').trim();
            if (curEmail && invEmail && curEmail === invEmail) continue;
            if (curId && invId && curId === invId) continue;
          }

          // 2. Strict deduplication - never show the same profile twice
          if (invEmail && seenInvEmails.has(invEmail)) continue;
          if (invId && seenInvIds.has(invId)) continue;
          if (invOrg && seenInvNames.has(invOrg)) continue;

          if (invEmail) seenInvEmails.add(invEmail);
          if (invId) seenInvIds.add(invId);
          if (invOrg) seenInvNames.add(invOrg);

          // 3. Search and type filters
          if (term) {
            const org = invOrg;
            const ind = (inv.industries || '').toLowerCase();
            const abt = (inv.about || '').toLowerCase();
            const un = (inv.user?.profile?.username || (invEmail ? invEmail.split('@')[0] : '')).toLowerCase();
            if (!org.includes(term) && !ind.includes(term) && !abt.includes(term) && !un.includes(term)) {
              continue;
            }
          }

          if (investorType !== 'ALL' && inv.investorType !== investorType) {
            continue;
          }
          if (investorStage !== 'ALL' && !inv.preferredStages?.includes(investorStage)) {
            continue;
          }

          filteredInvestors.push(inv);
        }

        setInvestors(filteredInvestors);
      } else {
        const params = new URLSearchParams();
        params.append('category', currentCategory);
        if (targetRole !== 'ALL') params.append('targetRole', targetRole);
        if (industry !== 'ALL') params.append('industry', industry);
        if (availability !== 'ALL') params.append('availability', availability);

        let loadedMatches: any[] = [];
        try {
          const res = await api.getCofounderMatches(params.toString());
          if (res.matches && res.matches.length > 0) {
            loadedMatches = res.matches;
          }
        } catch {
          // Backend load fallback
        }

        // Also query live Supabase profiles table to guarantee real registered users are displayed
        let supaMappedProfiles: any[] = [];
        try {
          let query = supabase.from('profiles').select('*');
          if (currentCategory === 'founders') {
            query = query.or('preferred_role.ilike.%founder%,open_to.ilike.%founder%,headline.ilike.%founder%');
          } else if (currentCategory === 'cofounders') {
            query = query.or('preferred_role.ilike.%co-founder%,open_to.ilike.%co-founder%,preferred_role.ilike.%cofounder%,headline.ilike.%cofounder%');
          } else if (currentCategory === 'marketers') {
            query = query.or('preferred_role.ilike.%market%,skills.ilike.%marketing%,skills.ilike.%growth%,headline.ilike.%market%');
          } else if (currentCategory === 'other') {
            query = query.or('preferred_role.ilike.%developer%,preferred_role.ilike.%designer%,preferred_role.ilike.%engineer%,skills.ilike.%engineer%,skills.ilike.%design%,skills.ilike.%tech%');
          }

          const { data: supaProfiles } = await query;
          if (supaProfiles && supaProfiles.length > 0) {
            supaMappedProfiles = supaProfiles.map((p) => {
              const uName = p.username || (p.email ? p.email.split('@')[0] : 'user');
              return {
                id: p.user_id || p.id,
                email: p.email,
                role: (p.preferred_role || 'FOUNDER').toUpperCase(),
                verificationBadge: p.auth_provider === 'google' ? 'Verified via Google' : 'Verified Member',
                matchPercentage: null,
                matchExplanation: null,
                profile: {
                  id: p.id,
                  userId: p.user_id || p.id,
                  fullName: p.full_name,
                  username: uName,
                  headline: p.headline || '',
                  location: p.location || '',
                  bio: p.bio || '',
                  avatar: p.avatar,
                  skills: p.skills || '',
                  preferredRole: p.preferred_role,
                  availability: p.availability || 'Full-time',
                  openTo: p.open_to,
                },
              };
            });
          }
        } catch (supaErr) {
          console.warn('Supabase profiles query notice:', supaErr);
        }

        const rawAllCandidates = [...supaMappedProfiles, ...loadedMatches];
        const seenCandEmails = new Set<string>();
        const seenCandIds = new Set<string>();
        const seenCandUsernames = new Set<string>();
        const filteredCandidates: any[] = [];

        const qTerm = searchQuery.trim().toLowerCase().replace(/^@/, '');

        for (const cand of rawAllCandidates) {
          if (isDemoRecord(cand)) continue;

          const candEmail = (cand.email || '').toLowerCase().trim();
          const candId = (cand.id || cand.profile?.userId || cand.profile?.id || '').trim();
          const candUsername = (cand.profile?.username || (candEmail ? candEmail.split('@')[0] : '')).toLowerCase().trim();

          // 1. DO NOT show the currently logged-in user's profile to themselves!
          if (currentUser) {
            const curEmail = (currentUser.email || '').toLowerCase().trim();
            const curId = (currentUser.id || '').trim();
            const curUsername = (currentUser.profile?.username || (curEmail ? curEmail.split('@')[0] : '')).toLowerCase().trim();

            if (curEmail && candEmail && curEmail === candEmail) continue;
            if (curId && candId && curId === candId) continue;
            if (curUsername && candUsername && curUsername === candUsername) continue;
          }

          // 2. Strict deduplication - never show the same profile multiple times!
          if (candEmail && seenCandEmails.has(candEmail)) continue;
          if (candId && seenCandIds.has(candId)) continue;
          if (candUsername && seenCandUsernames.has(candUsername)) continue;

          if (candEmail) seenCandEmails.add(candEmail);
          if (candId) seenCandIds.add(candId);
          if (candUsername) seenCandUsernames.add(candUsername);

          // 3. Search and role filters
          if (qTerm) {
            const uname = candUsername;
            const fname = (cand.profile?.fullName || '').toLowerCase();
            const email = candEmail;
            const skills = (cand.profile?.skills || '').toLowerCase();
            const headline = (cand.profile?.headline || '').toLowerCase();
            const prefRole = (cand.profile?.preferredRole || cand.role || '').toLowerCase();

            const match =
              uname.includes(qTerm) ||
              fname.includes(qTerm) ||
              email.includes(qTerm) ||
              skills.includes(qTerm) ||
              headline.includes(qTerm) ||
              prefRole.includes(qTerm);

            if (!match) continue;
          }

          if (targetRole !== 'ALL') {
            const roleMatch = (
              cand.profile?.headline ||
              cand.profile?.preferredRole ||
              cand.role ||
              ''
            ).toLowerCase();
            if (!roleMatch.includes(targetRole.toLowerCase())) continue;
          }

          filteredCandidates.push(cand);
        }

        setMatches(filteredCandidates);
      }
    } catch (err) {
      console.error('Failed to load category data:', err);
      setMatches([]);
      setInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [currentCategory, searchQuery, targetRole, industry, availability, investorSearch, investorType, investorStage, currentUser]);

  const targetRoles = [
    { label: 'All Roles', value: 'ALL' },
    { label: 'Technical / CTO', value: 'Technical' },
    { label: 'Product / CEO', value: 'Product' },
    { label: 'Growth / Marketing', value: 'Marketing' },
    { label: 'Operations / COO', value: 'Operations' },
    { label: 'Design / UX', value: 'Design' },
  ];

  const industries = ['ALL', 'AgriTech', 'CleanTech', 'HealthTech', 'FinTech', 'EdTech', 'AI', 'Logistics', 'Accessibility', 'CyberSecurity', 'B2B SaaS'];
  const availabilities = ['ALL', 'Full-time', 'Part-time', 'Evenings/Weekends', 'Advisory'];

  const investorTypes = ['ALL', 'Angel', 'Pre-Seed Fund', 'Seed Fund', 'Venture Capital', 'Family Office', 'Corporate VC', 'Grant / Non-Dilutive'];
  const investorStages = ['ALL', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Grants', 'Idea / Prototype'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full overflow-x-hidden">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="text-brand-600" size={28} /> Network Directory & Co-Founders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real registered founders, co-founders, investors, and startup partners across categories.
          </p>
        </div>

        <Link
          to="/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all shrink-0"
        >
          <Sparkles size={16} /> Update My Category Profile
        </Link>
      </div>

      {/* Primary Category Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = currentCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => handleSelectCategory(cat.value)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/25 ring-2 ring-brand-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  <Icon size={18} />
                </span>
                {isSelected && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Active
                  </span>
                )}
              </div>
              <div>
                <div className={`font-bold text-sm leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {cat.label}
                </div>
                <div className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                  {cat.hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real User & Username Search Input Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-brand-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any user by @username (e.g. ruthwik, legacy, lavan), name, or skills..."
          className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-brand-500 text-slate-900 dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Specific Filters */}
      {currentCategory === 'investors' ? (
        /* Investor Filters */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search investor, fund, portfolio..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {investorTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Investor Types' : t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={investorStage}
              onChange={(e) => setInvestorStage(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {investorStages.map((st) => (
                <option key={st} value={st}>
                  {st === 'ALL' ? 'All Investment Stages' : st}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* "I am looking for" Filter Pills Row for People */
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Filter by Desired Skill / Role:
          </label>
          <div className="flex flex-wrap gap-2">
            {targetRoles.map((r) => {
              const isSelected = targetRole === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setTargetRole(r.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/30'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : currentCategory === 'investors' ? (
        /* Investors Grid */
        investors.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investors registered in this category yet"
            description="Be the first to join as an active investor or angel backer on StartupZ!"
            actionLabel="Join as Investor"
            onAction={() => handleSelectCategory('founders')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {investors.map((inv) => {
              const targetUserId = inv.user?.id || inv.id;
              const targetUserObj = inv.user || { id: inv.id, email: '', profile: { fullName: inv.organization } };
              return (
                <div
                  key={inv.id}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            inv.user?.profile?.avatar ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${inv.organization}&backgroundColor=4f46e5,06b6d4,10b981`
                          }
                          alt=""
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                              {inv.organization}
                            </h3>
                            {inv.user?.profile?.username && (
                              <span className="text-xs text-brand-600 dark:text-brand-400 font-mono font-semibold">
                                @{inv.user.profile.username}
                              </span>
                            )}
                            <RoleBadge role="INVESTOR" size="sm" />
                            <VerificationBadge badge="Verified Investor" isVerified={true} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500">
                            {inv.investorType} • {inv.location}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        {inv.minCheckSize && inv.maxCheckSize
                          ? `${inv.minCheckSize} - ${inv.maxCheckSize}`
                          : 'Active Capital'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {inv.about}
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                          Stages:
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">{inv.preferredStages}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(inv.industries || '').split(',').map((ind) => ind.trim()).filter(Boolean).map((ind, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-400 font-medium">{inv.location}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStartupConnectUser(targetUserObj)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 hover:bg-brand-100 transition-colors"
                        title="Pitch your startup venture"
                      >
                        <Rocket size={13} /> Startup Connection
                      </button>
                      <button
                        onClick={() => setConnectUser(targetUserObj)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 transition-all shadow-xs"
                      >
                        <UserPlus size={13} /> Connect
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : matches.length === 0 ? (
        /* People Empty State */
        <EmptyState
          icon={Users}
          title={`No real users in "${currentCategory}" category yet`}
          description="Be the first to join or invite other founders and builders to StartupZ!"
          actionLabel="View All Members"
          onAction={() => handleSelectCategory('all')}
        />
      ) : (
        /* People Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((cand) => {
            const username = cand.profile?.username || cand.email?.split('@')[0] || 'user';
            const displayName = cand.profile?.fullName || cand.email?.split('@')[0] || 'Builder';
            const categoryRole = cand.profile?.preferredRole || cand.role || 'MEMBER';

            return (
              <div
                key={cand.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={
                          cand.profile?.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=4f46e5,06b6d4,10b981`
                        }
                        alt={displayName}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/profile/${cand.id}`}
                            className="font-bold text-base text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                          >
                            {displayName}
                          </Link>
                          <span className="text-xs text-brand-600 dark:text-brand-400 font-mono font-semibold">
                            @{username}
                          </span>
                          <RoleBadge role={categoryRole} size="sm" />
                          <VerificationBadge badge={cand.verificationBadge} isVerified={true} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cand.profile?.headline}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {cand.profile?.location || 'Remote'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {cand.profile?.availability || 'Full-time'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {cand.matchPercentage ? (
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                          <Sparkles size={13} /> {cand.matchPercentage}% Match
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {cand.matchExplanation && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                        Category Alignment & Synergy
                      </span>
                      <p className="leading-relaxed">{cand.matchExplanation}</p>
                    </div>
                  )}

                  {cand.profile?.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {cand.profile.bio}
                    </p>
                  )}

                  {cand.profile?.skills && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cand.profile.skills.split(',').slice(0, 4).map((sk: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {cand.profile?.startupExperience || 'Active Builder'}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/profile/${cand.id}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      View Profile
                    </Link>

                    {/* Startup Connection Button */}
                    <button
                      onClick={() => setStartupConnectUser(cand)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900 hover:bg-brand-100 transition-colors"
                      title="Propose Co-Founding a Startup"
                    >
                      <Rocket size={13} /> Startup Connection
                    </button>

                    {/* User Connection Button */}
                    {cand.connectionStatus?.status === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                        <Check size={14} /> Connected
                      </span>
                    ) : cand.connectionStatus?.status === 'PENDING' ? (
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950">
                        Request Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => setConnectUser(cand)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                      >
                        <UserPlus size={14} /> Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
        onSuccess={fetchCategoryData}
      />

      {/* Startup Proposal Connection Modal */}
      <StartupConnectionModal
        isOpen={!!startupConnectUser}
        onClose={() => setStartupConnectUser(null)}
        targetUser={startupConnectUser}
        onSuccess={fetchCategoryData}
      />
    </div>
  );
};
