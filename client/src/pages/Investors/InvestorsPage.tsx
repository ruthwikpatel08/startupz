import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Investor, Startup } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { SendPitchModal } from '../../components/common/SendPitchModal';
import { ConnectModal } from '../../components/common/ConnectModal';
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
      setInvestors(res.investors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
    // Fetch current user startups for pitch modal
    if (user) {
      api.getMe()
        .then((data) => setUserStartups(data.user?.startups || []))
        .catch(() => {});
    }
  }, [investorType, stage, industry, search, user]);

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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={28} /> Investor Directory & Angel Network
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Discover vetted venture funds, syndicates, and angel investors actively backing early-stage startups.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search investors, thesis, portfolio..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <select
            value={investorType}
            onChange={(e) => setInvestorType(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-dark-850 animate-pulse" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {investors.map((inv) => (
            <div
              key={inv.id}
              className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header */}
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
                            onClick={(e) => e.stopPropagation()}
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

                {/* About / Thesis */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {inv.about}
                </p>

                {/* Preferred Stages & Portfolio */}
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

                {/* Focus Industries Pills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {inv.industries.split(',').map((ind, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300"
                    >
                      {ind.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleToggleSave(inv.id)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    inv.isSaved
                      ? 'text-brand-600 bg-brand-50 dark:bg-brand-950'
                      : 'text-slate-400 hover:text-brand-600'
                  }`}
                >
                  <Bookmark size={15} fill={inv.isSaved ? 'currentColor' : 'none'} />
                  <span>{inv.isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConnectUser((inv as any).user || ({ id: inv.userId, role: 'INVESTOR', profile: { fullName: inv.organization } } as any))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                  >
                    <UserPlus size={13} /> Connect
                  </button>

                  <button
                    onClick={() => setPitchInvestor(inv)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
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
