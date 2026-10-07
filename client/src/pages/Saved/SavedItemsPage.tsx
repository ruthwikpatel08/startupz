import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { SavedItem } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { VerificationBadge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
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
    <div className="max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Bookmark className="text-brand-600" size={24} /> Saved Ecosystem Items
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Revisit saved startup ideas, prospective teammates, investors, and opportunities.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-dark-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all shrink-0 border-b-2 -mb-px flex items-center gap-1.5 ${
              filterType === tab.key
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.icon && <tab.icon size={13} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 card-base bg-slate-50 dark:bg-dark-900 animate-pulse" />
          ))}
        </div>
      ) : savedItems.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved items found"
          description="Bookmark startups, people, opportunities, or investors across HookZ to access them quickly here."
          actionText="Discover Startups"
          actionHref="/startups"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedItems.map((item) => {
            const d = item.details || item.data || {};

            return (
              <div
                key={item.id}
                className="card-base p-5 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top Type Pill & Remove */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700">
                      {item.itemType}
                    </span>
                    <button
                      onClick={() => handleRemoveSaved(item.itemType, item.itemId)}
                      title="Remove from saved"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Render based on itemType */}
                  {item.itemType === 'STARTUP' && (
                    <div>
                      <h3 className="font-semibold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                        {d.name || 'Startup Concept'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {d.oneLineDescription || d.problem || 'Innovative startup on HookZ'}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                        <span className="text-brand-600 dark:text-brand-400">{d.industry}</span>
                        <span className="text-slate-300 dark:text-dark-700">•</span>
                        <span className="text-slate-500 dark:text-slate-400">{d.stage}</span>
                      </div>
                    </div>
                  )}

                  {item.itemType === 'USER' && (
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={d.profile?.avatar}
                        name={d.profile?.fullName || d.email}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {d.profile?.fullName || d.email}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{d.profile?.headline || d.role}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{d.profile?.location || 'Remote'}</p>
                      </div>
                    </div>
                  )}

                  {item.itemType === 'INVESTOR' && (
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {d.organization || 'Venture Partner'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{d.investorType}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
                        {d.minCheckSize || '$25K'} - {d.maxCheckSize || '$500K'}
                      </p>
                    </div>
                  )}

                  {item.itemType === 'OPPORTUNITY' && (
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {d.role || 'Startup Opportunity'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {d.startup?.name} • {d.compensation}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{d.location} ({d.workplaceType})</p>
                    </div>
                  )}

                  {item.itemType === 'PROBLEM' && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">
                        <Flame size={13} />
                        <span>Impact {d.impactLevel || d.impact_level || 8}/10</span>
                      </div>
                      <h3 className="font-semibold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-1">
                        {d.title || 'World-wide Problem'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {d.description}
                      </p>
                      {d.categories && d.categories.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {d.categories.slice(0, 2).map((c: string, idx: number) => (
                            <span key={idx} className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-dark-700">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {item.itemType === 'POST' && (
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {d.title || `${d.postType || d.post_type || 'Update'} Post`}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {d.content || 'Shared a post on the startup feed.'}
                      </p>
                      {d.author?.profile?.fullName && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                          By {d.author.profile.fullName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom link */}
                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-dark-800">
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors"
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
