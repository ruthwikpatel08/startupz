import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Investor, Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { SendPitchModal } from '../../components/common/SendPitchModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
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
} from 'lucide-react';

export const InvestorsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [userStartups, setUserStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [investorType, setInvestorType] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [pitchInvestor, setPitchInvestor] = useState<Investor | null>(null);
  const [connectUser, setConnectUser] = useState<any | null>(null);

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (investorType !== 'ALL') params.append('investorType', investorType);
      if (stage !== 'ALL') params.append('stage', stage);
      if (industry !== 'ALL') params.append('industry', industry);
      if (search) params.append('search', search);

      const res = await api.getInvestors(params.toString());
      const rawList = res.investors || [];
      const seenEmails = new Set<string>();
      const seenIds = new Set<string>();
      const seenOrgs = new Set<string>();
      const cleanList: Investor[] = [];

      for (const inv of rawList) {
        if (isDemoRecord(inv)) continue;

        const invEmail = (inv.user?.email || '').toLowerCase().trim();
        const invId = (inv.id || inv.userId || inv.user?.id || '').trim();
        const invOrg = (inv.organization || '').toLowerCase().trim();

        // Hide current logged in user from their own directory view
        if (user) {
          const curEmail = (user.email || '').toLowerCase().trim();
          const curId = (user.id || '').trim();
          if (curEmail && invEmail && curEmail === invEmail) continue;
          if (curId && invId && curId === invId) continue;
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      api.getMe()
        .then((data) => setUserStartups(data.user?.startups || []))
        .catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
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

      {/* Investors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 card-base animate-pulse bg-slate-100 dark:bg-dark-850" />
          ))}
        </div>
      ) : investors.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No investors match your filters"
          description="Try broadening your stage or industry selections to explore more venture partners."
          actionLabel="Clear Filters"
          onAction={() => {
            setInvestorType('ALL');
            setStage('ALL');
            setIndustry('ALL');
            setSearch('');
          }}
        />
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
