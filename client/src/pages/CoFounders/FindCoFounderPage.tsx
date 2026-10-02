import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, Investor } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { EmptyState } from '../../components/common/EmptyState';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/common/Avatar';
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
  MessageSquare,
  Megaphone,
  BriefcaseBusiness,
  X,
} from 'lucide-react';

export function getUserCategory(user: any): 'founders' | 'cofounders' | 'marketers' | 'investors' | 'other' {
  const role = (user.role || user.profile?.preferredRole || user.preferred_role || '').toString().trim().toLowerCase();
  const headline = (user.profile?.headline || user.headline || '').toLowerCase();

  // 1. Check Co-Founders first (crucial: 'co-founder' contains 'founder' substring)
  if (
    role.includes('co-founder') ||
    role.includes('cofounder') ||
    role === 'co-founder' ||
    role === 'cofounder' ||
    role === 'co-founders' ||
    role === 'cofounders' ||
    headline.startsWith('co-founder') ||
    headline.startsWith('cofounder') ||
    headline.includes('co-founder') ||
    headline.includes('cofounder')
  ) {
    return 'cofounders';
  }

  // 2. Check Founders
  if (
    role === 'founder' ||
    role === 'founders' ||
    role.startsWith('founder') ||
    headline.startsWith('founder') ||
    headline.includes('founder')
  ) {
    return 'founders';
  }

  // 3. Check Investors
  if (
    role.includes('investor') ||
    role.includes('investing') ||
    headline.includes('investor') ||
    user.investorProfile
  ) {
    return 'investors';
  }

  // 4. Check Marketers
  if (
    role.includes('market') ||
    role.includes('growth') ||
    headline.includes('marketer') ||
    headline.includes('marketing')
  ) {
    return 'marketers';
  }

  return 'other';
}

// Module-level caches to eliminate duplicate and N+1 network requests
const categoryDataCache = new Map<string, { rawCandidates: any[]; rawInvestors: any[]; expiresAt: number }>();
let cachedSupaProfiles: any[] | null = null;
let cachedSupaProfilesExpiresAt = 0;
let cachedSupaInvestors: any[] | null = null;
let cachedSupaInvestorsExpiresAt = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

export const FindCoFounderPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = (searchParams.get('category') || 'all').toLowerCase();
  const currentCategory = rawCategory === 'co-founders' ? 'cofounders' : rawCategory;

  const [rawCandidates, setRawCandidates] = useState<any[]>([]);
  const [rawInvestors, setRawInvestors] = useState<any[]>([]);
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

  const fetchCategoryData = async (force = false) => {
    const cacheKey = `${currentCategory}_${industry}_${availability}`;
    if (!force) {
      const cached = categoryDataCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        setRawCandidates(cached.rawCandidates);
        setRawInvestors(cached.rawInvestors);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      if (currentCategory === 'investors') {
        const params = new URLSearchParams();
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

        // Live Supabase profiles for investor accounts (cached with TTL)
        let supaMappedInvestors: any[] = [];
        if (!force && cachedSupaInvestors && cachedSupaInvestorsExpiresAt > Date.now()) {
          supaMappedInvestors = cachedSupaInvestors;
        } else {
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
              cachedSupaInvestors = supaMappedInvestors;
              cachedSupaInvestorsExpiresAt = Date.now() + CACHE_TTL_MS;
            }
          } catch (supaErr) {
            console.warn('Supabase investor query notice:', supaErr);
          }
        }

        const rawAllInvestors = [...supaMappedInvestors, ...loadedInvestors];
        setRawInvestors(rawAllInvestors);
        setRawCandidates([]);
        categoryDataCache.set(cacheKey, {
          rawCandidates: [],
          rawInvestors: rawAllInvestors,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
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

        // Live Supabase profiles table (cached with TTL to avoid duplicate full table scans)
        let supaMappedProfiles: any[] = [];
        if (!force && cachedSupaProfiles && cachedSupaProfilesExpiresAt > Date.now()) {
          supaMappedProfiles = cachedSupaProfiles;
        } else {
          try {
            const { data: supaProfiles } = await supabase.from('profiles').select('*');
            if (supaProfiles && supaProfiles.length > 0) {
              supaMappedProfiles = supaProfiles.map((p) => {
                const uName = p.username || (p.email ? p.email.split('@')[0] : 'user');
                return {
                  id: p.user_id || p.id,
                  email: p.email,
                  role: (p.preferred_role || 'FOUNDER').toUpperCase(),
                  preferred_role: p.preferred_role,
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
              cachedSupaProfiles = supaMappedProfiles;
              cachedSupaProfilesExpiresAt = Date.now() + CACHE_TTL_MS;
            }
          } catch (supaErr) {
            console.warn('Supabase profiles query notice:', supaErr);
          }
        }

        // If category is 'all', also load registered investors so All Members includes every member
        let extraAllInvestors: any[] = [];
        if (currentCategory === 'all') {
          try {
            const res = await api.getInvestors('');
            if (res.investors && res.investors.length > 0) {
              extraAllInvestors = res.investors.map((inv: any) => ({
                id: inv.user?.id || inv.userId || inv.id,
                email: inv.user?.email || '',
                role: 'INVESTOR',
                preferred_role: 'INVESTOR',
                verificationBadge: 'Verified Investor',
                profile: {
                  id: inv.id,
                  userId: inv.userId || inv.id,
                  fullName: inv.organization || inv.user?.profile?.fullName || 'Angel Investor',
                  username: inv.user?.profile?.username || (inv.user?.email ? inv.user.email.split('@')[0] : 'investor'),
                  headline: inv.about || inv.user?.profile?.headline || 'Angel & Venture Investor',
                  location: inv.location || 'Remote',
                  bio: inv.about || '',
                  avatar: inv.user?.profile?.avatar,
                  skills: inv.industries || '',
                  preferredRole: 'INVESTOR',
                  availability: 'Capital & Mentorship',
                  openTo: 'Investment, Advisory',
                },
              }));
            }
          } catch {
            // Backend offline fallback
          }
        }

        const rawAllCandidates = [...supaMappedProfiles, ...loadedMatches, ...extraAllInvestors];
        setRawCandidates(rawAllCandidates);
        setRawInvestors([]);
        categoryDataCache.set(cacheKey, {
          rawCandidates: rawAllCandidates,
          rawInvestors: [],
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }
    } catch (err) {
      console.error('Failed to load category data:', err);
      setRawCandidates([]);
      setRawInvestors([]);
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered matches in-memory with useMemo to completely prevent network requests on keystrokes
  const matches = useMemo(() => {
    const seenCandEmails = new Set<string>();
    const seenCandIds = new Set<string>();
    const seenCandUsernames = new Set<string>();
    const filteredCandidates: any[] = [];

    const qTerm = searchQuery.trim().toLowerCase().replace(/^@/, '');

    for (const cand of rawCandidates) {
      if (isDemoRecord(cand)) continue;

      const candEmail = (cand.email || '').toLowerCase().trim();
      const candId = (cand.id || cand.profile?.userId || cand.profile?.id || '').trim();
      const candUsername = (cand.profile?.username || (candEmail ? candEmail.split('@')[0] : '')).toLowerCase().trim();

      // 1. DO NOT show the currently logged-in user's profile to themselves!
      if (currentUser) {
        const curEmail = (currentUser.email || '').toLowerCase().trim();
        const curId = (currentUser.id || '').trim();
        const curUsername = (currentUser.profile?.username || (curEmail ? curEmail.split('@')[0] : '')).toLowerCase().trim();
        const curFullName = (currentUser.profile?.fullName || '').toLowerCase().trim();
        const candFullName = (cand.profile?.fullName || cand.organization || '').toLowerCase().trim();

        if (curEmail && candEmail && curEmail === candEmail) continue;
        if (curId && candId && curId === candId) continue;
        if (curUsername && candUsername && curUsername === candUsername) continue;
        if (curFullName && candFullName && curFullName === candFullName) continue;
      }

      // 2. Strict deduplication - never show the same profile multiple times!
      if (candEmail && seenCandEmails.has(candEmail)) continue;
      if (candId && seenCandIds.has(candId)) continue;
      if (candUsername && seenCandUsernames.has(candUsername)) continue;

      if (candEmail) seenCandEmails.add(candEmail);
      if (candId) seenCandIds.add(candId);
      if (candUsername) seenCandUsernames.add(candUsername);

      // 3. Strict category separation
      if (currentCategory !== 'all') {
        const candCategory = getUserCategory(cand);
        if (candCategory !== currentCategory) {
          continue;
        }
      }

      // 4. Search and role filters
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

    return filteredCandidates;
  }, [rawCandidates, searchQuery, targetRole, currentCategory, currentUser?.id]);

  // Compute filtered investors in-memory with useMemo
  const investors = useMemo(() => {
    const seenInvEmails = new Set<string>();
    const seenInvIds = new Set<string>();
    const seenInvNames = new Set<string>();
    const filteredInvestors: Investor[] = [];

    const term = (investorSearch || searchQuery).trim().toLowerCase().replace(/^@/, '');

    for (const inv of rawInvestors) {
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

    return filteredInvestors;
  }, [rawInvestors, investorSearch, searchQuery, investorType, investorStage, currentUser?.id]);

  useEffect(() => {
    fetchCategoryData();
  }, [currentCategory, targetRole, industry, availability, investorType, investorStage, currentUser?.id]);

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
          className="btn-primary !text-xs !py-2 !px-3.5 flex items-center gap-1.5 shrink-0"
        >
          <Sparkles size={14} /> Update Category Profile
        </Link>
      </div>

      {/* Primary Category Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 font-sans">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = currentCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => handleSelectCategory(cat.value)}
              className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between space-y-1.5 ${
                isSelected
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-900 dark:text-brand-200 border-brand-600 dark:border-brand-500 shadow-subtle'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`p-1.5 rounded-md ${isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  <Icon size={16} />
                </span>
                {isSelected && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                    Active
                  </span>
                )}
              </div>
              <div>
                <div className={`font-semibold text-xs leading-tight ${isSelected ? 'text-brand-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                  {cat.label}
                </div>
                <div className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>
                  {cat.hint}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real User & Username Search Input Bar */}
      <div className="relative font-sans">
        <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by @username (e.g. ruthwik, legacy, lavan), name, role, or skills..."
          className="input-base !pl-9 !pr-9 !py-2.5 !text-xs sm:!text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Category Specific Filters */}
      {currentCategory === 'investors' ? (
        /* Investor Filters */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle font-sans">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search investor, fund, portfolio..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="input-base !pl-8 !py-1.5 !text-xs"
            />
          </div>

          <div>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
              className="input-base !py-1.5 !text-xs"
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
              className="input-base !py-1.5 !text-xs"
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
        /* Filter Pills Row for People */
        <div className="space-y-1.5 font-sans">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Filter by Desired Skill / Role:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {targetRoles.map((r) => {
              const isSelected = targetRole === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setTargetRole(r.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : currentCategory === 'investors' ? (
        /* Investors Grid */
        investors.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investors in this category yet"
            description="Be the first to join as an active investor or angel backer on StartupZ."
            actionLabel="View All Members"
            onAction={() => handleSelectCategory('all')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            {investors.map((inv) => {
              const targetUserId = inv.user?.id || inv.id;
              const targetUserObj = inv.user || { id: inv.id, email: '', profile: { fullName: inv.organization } };
              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={inv.user?.profile?.avatar}
                          name={inv.organization}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {inv.organization}
                            </h3>
                            {inv.user?.profile?.username && (
                              <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
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

                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shrink-0">
                        {inv.minCheckSize && inv.maxCheckSize
                          ? `${inv.minCheckSize} - ${inv.maxCheckSize}`
                          : 'Active Capital'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {inv.about}
                    </p>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                          Stages:
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 text-xs">{inv.preferredStages}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(inv.industries || '').split(',').map((ind) => ind.trim()).filter(Boolean).map((ind, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-400 font-normal">{inv.location}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStartupConnectUser(targetUserObj)}
                        className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                        title="Pitch your startup venture"
                      >
                        <Rocket size={12} /> Pitch
                      </button>
                      <button
                        onClick={() => setConnectUser(targetUserObj)}
                        className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                      >
                        <UserPlus size={12} /> Connect
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
          title={`No members in "${currentCategory}" category`}
          description="Be the first to join or invite other founders and builders to StartupZ."
          actionLabel="View All Members"
          onAction={() => handleSelectCategory('all')}
        />
      ) : (
        /* People Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {matches.map((cand) => {
            const username = cand.profile?.username || cand.email?.split('@')[0] || 'user';
            const displayName = cand.profile?.fullName || cand.email?.split('@')[0] || 'Builder';
            const categoryRole = cand.profile?.preferredRole || cand.role || 'MEMBER';

            return (
              <div
                key={cand.id}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={cand.profile?.avatar}
                        name={displayName}
                        size="lg"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/profile/${cand.id}`}
                            className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                          >
                            {displayName}
                          </Link>
                          <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                            @{username}
                          </span>
                          <RoleBadge role={categoryRole} size="sm" />
                          <VerificationBadge badge={cand.verificationBadge} isVerified={true} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cand.profile?.headline}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          <Sparkles size={11} /> {cand.matchPercentage}% Match
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {cand.matchExplanation && (
                    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                        Category Alignment
                      </span>
                      <p className="leading-relaxed">{cand.matchExplanation}</p>
                    </div>
                  )}

                  {cand.profile?.bio && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {cand.profile.bio}
                    </p>
                  )}

                  {cand.profile?.skills && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {cand.profile.skills.split(',').slice(0, 4).map((sk: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-400 font-normal">
                    {cand.profile?.startupExperience || 'Active Builder'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/profile/${cand.id}`}
                      className="btn-tertiary !text-xs !py-1 !px-2"
                    >
                      View Profile
                    </Link>

                    {/* Startup Connection Button */}
                    <button
                      onClick={() => setStartupConnectUser(cand)}
                      className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                      title="Propose Co-Founding a Startup"
                    >
                      <Rocket size={12} /> Pitch
                    </button>

                    {/* User Connection Button */}
                    {cand.connectionStatus?.status === 'ACCEPTED' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                          <Check size={12} /> Connected
                        </span>
                        <Link
                          to={`/messages?user=${cand.id}`}
                          className="btn-primary !text-xs !py-1 !px-2 flex items-center gap-1"
                        >
                          <MessageSquare size={12} /> Chat
                        </Link>
                      </div>
                    ) : cand.connectionStatus?.status === 'PENDING' ? (
                      <span className="px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                        Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => setConnectUser(cand)}
                        className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                      >
                        <UserPlus size={12} /> Connect
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
        onSuccess={() => fetchCategoryData(true)}
      />

      {/* Startup Proposal Connection Modal */}
      <StartupConnectionModal
        isOpen={!!startupConnectUser}
        onClose={() => setStartupConnectUser(null)}
        targetUser={startupConnectUser}
        onSuccess={() => fetchCategoryData(true)}
      />
    </div>
  );
};
