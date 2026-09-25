import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { User } from '../../types';
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
  Award,
} from 'lucide-react';

export const FindCoFounderPage: React.FC = () => {
  const [matches, setMatches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [targetRole, setTargetRole] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');

  const [connectUser, setConnectUser] = useState<any | null>(null);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetRole !== 'ALL') params.append('targetRole', targetRole);
      if (industry !== 'ALL') params.append('industry', industry);
      if (availability !== 'ALL') params.append('availability', availability);

      const res = await api.getCofounderMatches(params.toString());
      setMatches(res.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [targetRole, industry, availability]);

  const targetRoles = [
    { label: 'All Roles', value: 'ALL' },
    { label: 'Technical Co-Founder', value: 'Technical' },
    { label: 'Business Co-Founder', value: 'Business' },
    { label: 'Marketing Co-Founder', value: 'Marketing' },
    { label: 'Design Co-Founder', value: 'Design' },
    { label: 'Operations Co-Founder', value: 'Operations' },
    { label: 'Finance Co-Founder', value: 'Finance' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-indigo-600" size={28} /> Algorithmic Co-Founder Matchmaking
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Connect with vetted builders seeking complementary skill sets. Ranked by our proprietary founder synergy index.
        </p>
      </div>

      {/* "I am looking for" Filter Pills Row */}
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
                    : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-dark-850 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No matching co-founders found"
          description="Try broadening your role filter or exploring our general community directory."
          actionLabel="Reset Filters"
          onAction={() => setTargetRole('ALL')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((cand) => (
            <div
              key={cand.id}
              className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Avatar, Name, Compatibility Badge */}
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

                  {/* Compatibility Badge */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                      <Sparkles size={13} /> {cand.matchPercentage}% Match
                    </span>
                  </div>
                </div>

                {/* Match Synergy Explanation Box */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                    Synergy Analysis
                  </span>
                  <p className="leading-relaxed">{cand.matchExplanation}</p>
                </div>

                {/* Bio snippet */}
                {cand.profile?.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {cand.profile.bio}
                  </p>
                )}

                {/* Skills tags */}
                {cand.profile?.skills && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cand.profile.skills.split(',').slice(0, 4).map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300"
                      >
                        {sk.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Connection action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {cand.profile?.startupExperience || 'Early Builder'}
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${cand.id}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
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
        onSuccess={fetchMatches}
      />
    </div>
  );
};
