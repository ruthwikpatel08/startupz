import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { User, Investor } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { EmptyState } from '../../components/common/EmptyState';
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
} from 'lucide-react';

import {
  FALLBACK_BUILDERS,
  FALLBACK_INVESTORS,
} from '../../data/curatedFallbackData';

export const FindCoFounderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = (searchParams.get('category') || 'cofounders').toLowerCase();
  const currentCategory = rawCategory === 'co-founders' ? 'cofounders' : rawCategory;

  const [matches, setMatches] = useState<User[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for People
  const [targetRole, setTargetRole] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');

  // Filters for Investors
  const [investorSearch, setInvestorSearch] = useState('');
  const [investorType, setInvestorType] = useState('ALL');
  const [investorStage, setInvestorStage] = useState('ALL');

  const [connectUser, setConnectUser] = useState<any | null>(null);

  const categories = [
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
        const res = await api.getInvestors(params.toString());
        if (res.investors && res.investors.length > 0) {
          setInvestors(res.investors);
        } else {
          // Fallback to verified investors
          const filtered = FALLBACK_INVESTORS.filter((inv) => {
            if (
              investorSearch &&
              !`${inv.organization} ${inv.industries} ${inv.portfolio}`
                .toLowerCase()
                .includes(investorSearch.toLowerCase())
            ) {
              return false;
            }
            if (investorType !== 'ALL' && inv.investorType !== investorType) {
              return false;
            }
            if (investorStage !== 'ALL' && !inv.preferredStages.includes(investorStage)) {
              return false;
            }
            return true;
          });
          setInvestors(filtered);
        }
      } else {
        const params = new URLSearchParams();
        params.append('category', currentCategory);
        if (targetRole !== 'ALL') params.append('targetRole', targetRole);
        if (industry !== 'ALL') params.append('industry', industry);
        if (availability !== 'ALL') params.append('availability', availability);

        const res = await api.getCofounderMatches(params.toString());
        if (res.matches && res.matches.length > 0) {
          setMatches(res.matches);
        } else {
          // Fallback to verified builders for this category
          const pool = FALLBACK_BUILDERS[currentCategory] || FALLBACK_BUILDERS['cofounders'] || [];
          const filtered = pool.filter((cand) => {
            if (targetRole !== 'ALL') {
              const roleMatch = (
                cand.profile?.headline ||
                cand.profile?.preferredRole ||
                cand.role ||
                ''
              ).toLowerCase();
              if (!roleMatch.includes(targetRole.toLowerCase())) return false;
            }
            return true;
          });
          setMatches(filtered);
        }
      }
    } catch (err) {
      console.warn('Backend load returned warning, using curated fallback:', err);
      if (currentCategory === 'investors') {
        setInvestors(FALLBACK_INVESTORS);
      } else {
        setMatches(FALLBACK_BUILDERS[currentCategory] || FALLBACK_BUILDERS['cofounders'] || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [currentCategory, targetRole, industry, availability, investorSearch, investorType, investorStage]);

  const targetRoles = [
    { label: 'All Roles', value: 'ALL' },
    { label: 'Technical Co-Founder', value: 'Technical' },
    { label: 'Business Co-Founder', value: 'Business' },
    { label: 'Marketing Co-Founder', value: 'Marketing' },
    { label: 'Design Co-Founder', value: 'Design' },
    { label: 'Operations Co-Founder', value: 'Operations' },
    { label: 'Finance Co-Founder', value: 'Finance' },
  ];

  const investorTypes = ['ALL', 'Angel', 'Venture Capital', 'Syndicate', 'Accelerator'];
  const investorStages = ['ALL', 'Pre-Seed', 'Seed', 'Series A', 'Growth'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          {currentCategory === 'investors' ? (
            <>
              <TrendingUp className="text-emerald-500" size={28} /> Investor Directory & Angel Network
            </>
          ) : currentCategory === 'founders' ? (
            <>
              <Rocket className="text-brand-600" size={28} /> Founder Network & Startup Builders
            </>
          ) : currentCategory === 'marketers' ? (
            <>
              <Megaphone className="text-cyan-500" size={28} /> Growth Marketers & GTM Specialists
            </>
          ) : currentCategory === 'other' ? (
            <>
              <BriefcaseBusiness className="text-amber-500" size={28} /> Engineers, Designers & Startup Advisors
            </>
          ) : (
            <>
              <Users className="text-indigo-600" size={28} /> Algorithmic Co-Founder Matchmaking
            </>
          )}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          {currentCategory === 'investors'
            ? 'Discover vetted venture funds, syndicates, and angel investors actively backing early-stage startups.'
            : currentCategory === 'founders'
            ? 'Connect with verified startup founders actively building innovative ventures across emerging markets.'
            : currentCategory === 'marketers'
            ? 'Discover experienced growth leads, demand marketers, and customer acquisition architects.'
            : currentCategory === 'other'
            ? 'Find product designers, AI researchers, fractional CFOs, and verified startup mentors.'
            : 'Connect with vetted builders seeking complementary skill sets. Ranked by our proprietary founder synergy index.'}
        </p>
      </div>

      {/* Category Tabs: Founders, Co-Founders, Marketers, Investors, Other */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Select Category:
        </label>
        <div className="flex flex-wrap gap-2.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = currentCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => handleSelectCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/30'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category-Specific Toolbar / Filters */}
      {currentCategory === 'investors' ? (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              placeholder="Search investors, thesis, portfolio..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
              className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
            I am looking for:
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
            title="No investors match your filters"
            description="Try changing your search terms or clearing your stage and investor type filters."
            actionLabel="Reset Investor Filters"
            onAction={() => {
              setInvestorSearch('');
              setInvestorType('ALL');
              setInvestorStage('ALL');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {investors.map((inv) => (
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
                          `https://api.dicebear.com/7.x/initials/svg?seed=${inv.organization}`
                        }
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                            {inv.organization}
                          </h3>
                          <VerificationBadge type={inv.isVerified ? 'Verified Investor' : null} />
                          {inv.website && (
                            <a
                              href={inv.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-brand-500 transition-colors p-0.5 rounded"
                              title="Visit Official Website"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.investorType} • {inv.location}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      {inv.minCheckSize && inv.maxCheckSize
                        ? `${inv.minCheckSize} - ${inv.maxCheckSize}`
                        : 'Active Checks'}
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
                    {inv.portfolio && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                          Portfolio:
                        </span>
                        <span className="text-slate-500 truncate">{inv.portfolio}</span>
                      </div>
                    )}
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

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">{inv.location}</span>
                  <div className="flex items-center gap-2">
                    {inv.website && (
                      <a
                        href={inv.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/60 hover:bg-brand-100 transition-colors"
                      >
                        <ExternalLink size={13} /> Official Portal
                      </a>
                    )}
                    <Link
                      to="/investors"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 transition-all shadow-xs"
                    >
                      Pitch Venture
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : matches.length === 0 ? (
        /* People Empty State */
        <EmptyState
          icon={Users}
          title={`No matching ${currentCategory} found`}
          description="Try selecting a different role or resetting your filters to explore builders across the ecosystem."
          actionLabel="Reset Role Filter"
          onAction={() => setTargetRole('ALL')}
        />
      ) : (
        /* People Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((cand) => (
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
                        `https://api.dicebear.com/7.x/initials/svg?seed=${cand.profile?.fullName}`
                      }
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${cand.id}`}
                          className="font-bold text-base text-slate-900 dark:text-white hover:text-brand-600 truncate block"
                        >
                          {cand.profile?.fullName}
                        </Link>
                        <VerificationBadge type={cand.verificationBadge} />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{cand.profile?.headline}</p>
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

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                      <Sparkles size={13} /> {cand.matchPercentage}% Match
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                    Synergy Analysis
                  </span>
                  <p className="leading-relaxed">{cand.matchExplanation}</p>
                </div>

                {cand.profile?.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {cand.profile.bio}
                  </p>
                )}

                {cand.profile?.skills && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cand.profile.skills.split(',').slice(0, 4).map((sk, idx) => (
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

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {cand.profile?.startupExperience || 'Early Builder'}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${cand.id}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    View Profile
                  </Link>

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
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                    >
                      <UserPlus size={14} /> Connect
                    </button>
                  )}
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
        onSuccess={fetchCategoryData}
      />
    </div>
  );
};
