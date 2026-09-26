import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { SavedItem } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { VerificationBadge } from '../../components/common/Badge';
import {
  Bookmark,
  Compass,
  Users,
  Briefcase,
  TrendingUp,
  Share2,
  Trash2,
  ArrowRight,
  MapPin,
  Globe,
  Flame,
} from 'lucide-react';

export const SavedItemsPage: React.FC = () => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const typeParam = filterType === 'ALL' ? undefined : filterType;
      const res: any = await api.getSavedItems(typeParam);
      const items = Array.isArray(res) ? res : res?.savedItems || [];
      setSavedItems(items);
    } catch (err) {
      console.error('Failed to load saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, [filterType]);

  const handleRemoveSaved = async (itemType: string, itemId: string) => {
    try {
      await api.toggleSave(itemType, itemId);
      setSavedItems((prev) => prev.filter((item) => !(item.itemType === itemType && item.itemId === itemId)));
    } catch (err) {
      console.error('Failed to remove saved item:', err);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'All Saved' },
    { key: 'PROBLEM', label: 'Problem Statements', icon: Globe },
    { key: 'STARTUP', label: 'Startups', icon: Compass },
    { key: 'USER', label: 'People & Co-Founders', icon: Users },
    { key: 'INVESTOR', label: 'Investors', icon: TrendingUp },
    { key: 'OPPORTUNITY', label: 'Opportunities', icon: Briefcase },
    { key: 'POST', label: 'Posts & Feed', icon: Share2 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
          <Bookmark className="text-brand-600 fill-brand-600" size={28} /> Saved Ecosystem Items
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Revisit saved startup ideas, prospective teammates, investors, and opportunities.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              filterType === tab.key
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : savedItems.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved items found"
          description="Bookmark startups, people, opportunities, or investors across StartupZ to access them quickly here."
          actionText="Discover Startups"
          actionHref="/startups"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedItems.map((item) => {
            const d = item.details || {};

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Type Pill & Remove */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {item.itemType}
                    </span>
                    <button
                      onClick={() => handleRemoveSaved(item.itemType, item.itemId)}
                      title="Remove from saved"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Render based on itemType */}
                  {item.itemType === 'STARTUP' && (
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                        {d.name || 'Startup Concept'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {d.oneLineDescription || d.problem || 'Innovative startup on StartupZ'}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold">
                        <span className="text-brand-600">{d.industry}</span>
                        <span>•</span>
                        <span className="text-slate-400">{d.stage}</span>
                      </div>
                    </div>
                  )}

                  {item.itemType === 'USER' && (
                    <div className="flex items-center gap-3">
                      <img
                        src={d.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${d.profile?.fullName || d.email}`}
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {d.profile?.fullName || d.email}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{d.profile?.headline || d.role}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{d.profile?.location || 'Remote'}</p>
                      </div>
                    </div>
                  )}

                  {item.itemType === 'INVESTOR' && (
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {d.organization || 'Venture Partner'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{d.investorType}</p>
                      <p className="text-xs text-emerald-600 font-medium mt-2">
                        {d.minCheckSize || '$25K'} - {d.maxCheckSize || '$500K'}
                      </p>
                    </div>
                  )}

                  {item.itemType === 'OPPORTUNITY' && (
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {d.role || 'Startup Opportunity'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {d.startup?.name} • {d.compensation}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{d.location} ({d.workplaceType})</p>
                    </div>
                  )}

                  {item.itemType === 'PROBLEM' && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold mb-1">
                        <Flame size={12} />
                        <span>Impact {d.impactLevel || d.impact_level || 8}/10</span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">
                        {d.title || 'World-wide Problem'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {d.description}
                      </p>
                      {d.categories && d.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.categories.slice(0, 2).map((c: string, idx: number) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {item.itemType === 'POST' && (
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {d.title || `${d.postType} Post`}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                        {d.content}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom link */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={
                      item.itemType === 'PROBLEM'
                        ? `/problems/${item.itemId}`
                        : item.itemType === 'STARTUP'
                        ? `/startups/${item.itemId}`
                        : item.itemType === 'USER'
                        ? `/profile/${item.itemId}`
                        : item.itemType === 'INVESTOR'
                        ? `/investors`
                        : item.itemType === 'OPPORTUNITY'
                        ? `/opportunities`
                        : `/feed`
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-500 transition-colors"
                  >
                    <span>View Details</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
