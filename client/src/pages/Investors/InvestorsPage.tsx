import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { supabase, fetchUserConnections } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Investor, Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { SendPitchModal } from '../../components/common/SendPitchModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { SEO } from '../../components/common/SEO';
import {
  TrendingUp,
  Search,
  Filter,
  Globe,
  MapPin,
  Send,
  UserPlus,
  Bookmark,
  DollarSign,
  Layers,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Rocket,
  ShieldCheck,
} from 'lucide-react';

let cachedInvestorsList: Investor[] = [];
function getInitialInvestors(): Investor[] {
  if (cachedInvestorsList.length > 0) return cachedInvestorsList;
  try {
    const raw = sessionStorage.getItem('startupz_cached_investors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedInvestorsList = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

export const InvestorsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInitialMount = React.useRef(true);
  const [investors, setInvestors] = useState<Investor[]>(getInitialInvestors);
  const [userStartups, setUserStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(() => getInitialInvestors().length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [investorType, setInvestorType] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [pitchInvestor, setPitchInvestor] = useState<Investor | null>(null);
  const [connectUser, setConnectUser] = useState<any | null>(null);

  const fetchInvestors = async () => {
    if (investors.length === 0 && cachedInvestorsList.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams();
      if (investorType !== 'ALL') params.append('investorType', investorType);
      if (stage !== 'ALL') params.append('stage', stage);
      if (industry !== 'ALL') params.append('industry', industry);
      if (search) params.append('search', search);

      const res = await api.getInvestors(params.toString());
      const rawList = res.investors || [];

      let connectedIds = new Set<string>();
      if (user?.id) {
        const connData = await fetchUserConnections(user.id).catch(() => null);
        if (connData?.connectedIds) {
          connectedIds = connData.connectedIds;
        }
      }

      const seenEmails = new Set<string>();
      const seenIds = new Set<string>();
      const seenOrgs = new Set<string>();
      const cleanList: Investor[] = [];

      for (const inv of rawList) {
        if (isDemoRecord(inv)) continue;

        const invEmail = (inv.user?.email || '').toLowerCase().trim();
        const invId = (inv.id || inv.userId || inv.user?.id || '').trim();
        const invOrg = (inv.organization || '').toLowerCase().trim();

        // Hide current logged in user and connected users from their own directory view
        if (user) {
          const curEmail = (user.email || '').toLowerCase().trim();
          const curId = (user.id || '').trim();
          if (curEmail && invEmail && curEmail === invEmail) continue;
          if (curId && invId && curId === invId) continue;
          if (invId && connectedIds.has(invId)) continue;
          if (inv.userId && connectedIds.has(inv.userId)) continue;
          if (inv.user?.id && connectedIds.has(inv.user.id)) continue;
          if (inv.connectionStatus === 'CONNECTED' || inv.connectionStatus === 'ACCEPTED') continue;
        }

        if (invEmail && seenEmails.has(invEmail)) continue;
        if (invId && seenIds.has(invId)) continue;
        if (invOrg && seenOrgs.has(invOrg)) continue;

        if (invEmail) seenEmails.add(invEmail);
        if (invId) seenIds.add(invId);
        if (invOrg) seenOrgs.add(invOrg);

        cleanList.push(inv);
      }

      setInvestors(cleanList);
      if (investorType === 'ALL' && stage === 'ALL' && industry === 'ALL' && !search && cleanList.length > 0) {
        cachedInvestorsList = cleanList;
        try {
          sessionStorage.setItem('startupz_cached_investors', JSON.stringify(cleanList));
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load investors:', err);
      setError(err?.message || 'Unable to connect to the investor directory server.');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = Boolean(search.trim() || investorType !== 'ALL' || stage !== 'ALL' || industry !== 'ALL');

  const handleResetFilters = () => {
    setInvestorType('ALL');
    setStage('ALL');
    setIndustry('ALL');
    setSearch('');
  };

  useEffect(() => {
    if (user?.id) {
      api.getMe()
        .then((data) => setUserStartups(data.user?.startups || []))
        .catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchInvestors();
      return;
    }
    const timer = setTimeout(() => {
      fetchInvestors();
    }, 250);
    return () => clearTimeout(timer);
  }, [investorType, stage, industry, search, user?.id]);

  const handleToggleSave = async (id: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.toggleSave('INVESTOR', id);
      setInvestors((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, isSaved: res.saved } : inv))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const types = ['ALL', 'Angel', 'Venture Capital', 'Syndicate', 'Accelerator'];
  const stages = ['ALL', 'Pre-Seed', 'Seed', 'Series A', 'Growth'];
  const industries = ['ALL', 'Artificial Intelligence', 'B2B SaaS', 'AgTech', 'HealthTech', 'FinTech', 'ClimateTech'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title="Find Startup Investors | HookZ"
        description="Discover vetted venture funds, syndicates, and angel investors actively backing early-stage startups and student founders on HookZ."
        canonicalPath="/investors"
        breadcrumbs={[{ name: 'Investors', path: '/investors' }]}
      />
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-brand-600 dark:text-brand-400" size={24} /> Investor Directory & Angel Network
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Discover vetted venture funds, syndicates, and angel investors actively backing early-stage startups.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="card-base p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search investors, thesis, portfolio..."
            className="input-base pl-9 pr-3 py-1.5 text-xs"
          />
        </div>

        <div>
          <select
            value={investorType}
            onChange={(e) => setInvestorType(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Investor Types' : t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
          >
            {stages.map((st) => (
              <option key={st} value={st}>
                {st === 'ALL' ? 'All Investment Stages' : st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
          >
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind === 'ALL' ? 'All Focus Industries' : ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Investors Grid / Loading / Error / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 card-base animate-pulse bg-slate-100 dark:bg-dark-850" />
          ))}
        </div>
      ) : error ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Unable to Load Investors
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-1">
            <button
              onClick={fetchInvestors}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        </div>
      ) : investors.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={TrendingUp}
            title="No investors match your filters"
            description="Try broadening your stage or industry selections to explore more venture partners."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="card-base p-8 sm:p-10 text-center space-y-4 border-dashed border-2 border-slate-300 dark:border-dark-700 bg-slate-50/40 dark:bg-dark-850/40">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-200/60 dark:border-brand-900/60">
              <TrendingUp size={22} />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Investor &amp; Venture Directory Open for Registration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                There are currently no public investor profiles listed in the directory. If you are an angel backer, syndicate lead, or venture fund investing in early-stage teams, you can register your investment thesis to discover high-potential startups on HookZ. Founders can check back regularly as verified investment partners join.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/profile"
                className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <ShieldCheck size={14} /> Register as an Investor
              </Link>
              <button
                onClick={fetchInvestors}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <RefreshCw size={13} /> Check Again
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Accredited funds and angel syndicate profiles appear here once verified. Check back regularly.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investors.map((inv) => (
            <div
              key={inv.id}
              className="card-base p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={inv.user?.profile?.avatar}
                      name={inv.organization}
                      size="md"
                      className="!w-11 !h-11 rounded-lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {inv.organization}
                        </h3>
                        <VerificationBadge type={inv.isVerified ? 'Verified Investor' : null} />
                        {inv.website && (
                          <a
                            href={inv.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-brand-600 transition-colors p-0.5 rounded"
                            title="Visit Official Website"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {inv.investorType} • {inv.location}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50">
                    {inv.minCheckSize && inv.maxCheckSize
                      ? `${inv.minCheckSize} - ${inv.maxCheckSize}`
                      : 'Active Checks'}
                  </span>
                </div>

                {/* About / Thesis */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {inv.about}
                </p>

                {/* Preferred Stages & Portfolio */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-400 text-[11px]">
                      Stages:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{inv.preferredStages}</span>
                  </div>
                  {inv.portfolio && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-400 text-[11px]">
                        Portfolio:
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">{inv.portfolio}</span>
                    </div>
                  )}
                </div>

                {/* Focus Industries Pills */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {inv.industries.split(',').map((ind, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-800"
                    >
                      {ind.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                <button
                  onClick={() => handleToggleSave(inv.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    inv.isSaved
                      ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/40'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bookmark size={14} fill={inv.isSaved ? 'currentColor' : 'none'} />
                  <span>{inv.isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConnectUser((inv as any).user || ({ id: inv.userId, role: 'INVESTOR', profile: { fullName: inv.organization } } as any))}
                    className="btn-secondary py-1.5 px-3 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <UserPlus size={13} /> Connect
                  </button>

                  <button
                    onClick={() => setPitchInvestor(inv)}
                    className="btn-primary py-1.5 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Send size={13} /> Send Pitch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permanent Educational Guide & Capital Pillars */}
      <section className="pt-8 border-t border-slate-200/80 dark:border-dark-800 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Startup Capital &amp; Venture Partnerships on HookZ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Understand the funding ecosystem, how early-stage teams present traction, and how check-writers evaluate founders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Types of Early-Stage Capital */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                <DollarSign size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Types of Startup Backers
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                From individual angel investors and micro-syndicates to institutional seed venture funds and university accelerators. Different stages require distinct capital partners aligned with your product maturity and growth trajectory.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Stages: Pre-Seed, Seed, Series A, Accelerators
              </span>
            </div>
          </div>

          {/* Pillar 2: How Founders Pitch Traction */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-900/40">
                <Rocket size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                How Founders Connect
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Share verifiable milestones, product prototypes, and co-founder backgrounds directly. Avoid cold generic outreach by matching your venture's domain focus directly with an investor's declared sector thesis.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/startups"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Explore Ventures <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Information for Accredited Investors */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                For Accredited Investors &amp; Funds
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Angel syndicates and VC partners can register verified profiles, specify check sizes, and review student and first-time founder submissions across AI, B2B SaaS, ClimateTech, and FinTech.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Join as Investor <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* 3-Step Matchmaking Workflow */}
        <div className="card-base p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-dark-850/50">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            The Venture Connection Process
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Discover Aligned Theses</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Filter by sector focus, typical ticket size, and investment stage to find genuine partners.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Submit Concise Traction Overviews</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Provide crisp metrics on customer validation, team roles, and current capital requirements.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Direct Founder-Funder Dialogue</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Engage directly without broker markups or referral fee bottlenecks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Send Pitch Modal */}
      <SendPitchModal
        isOpen={!!pitchInvestor}
        onClose={() => setPitchInvestor(null)}
        investor={pitchInvestor}
        userStartups={userStartups}
      />

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />
    </div>
  );
};
