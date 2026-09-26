import React from 'react';
import { Search, X, RotateCcw, Filter, Flame, Globe2, Tag as TagIcon } from 'lucide-react';

interface ProblemFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  selectedImpact: string;
  onImpactChange: (impact: string) => void;
  selectedTag: string;
  onTagChange: (tag: string) => void;
  categories: string[];
  regions: string[];
  tags: string[];
  totalResults: number;
  onReset: () => void;
}

export const ProblemFilters: React.FC<ProblemFiltersProps> = ({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedRegion,
  onRegionChange,
  selectedImpact,
  onImpactChange,
  selectedTag,
  onTagChange,
  categories,
  regions,
  tags,
  totalResults,
  onReset,
}) => {
  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedCategory) ||
    Boolean(selectedRegion) ||
    Boolean(selectedImpact) ||
    Boolean(selectedTag);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-5">
      
      {/* Search Input Bar */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search world problems, SDGs, keywords (e.g. water, climate, education)..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Categories Horizontal Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Filter size={13} className="text-brand-500" />
            <span>Category Domains</span>
          </label>
          {selectedCategory && (
            <button
              onClick={() => onCategoryChange('')}
              className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Clear category
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onCategoryChange('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              !selectedCategory
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(selectedCategory === cat ? '' : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Row: Regions, Impact Level & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* Region Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Globe2 size={13} className="text-cyan-500" />
            <span>Region</span>
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Regions</option>
            {regions.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>

        {/* Impact Level Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Flame size={13} className="text-rose-500" />
            <span>Impact Urgency</span>
          </label>
          <select
            value={selectedImpact}
            onChange={(e) => onImpactChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Any Impact Level</option>
            <option value="9">Critical Impact (9 - 10)</option>
            <option value="8">High Impact (8+)</option>
            <option value="7">Substantial Impact (7+)</option>
          </select>
        </div>

        {/* Tags Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <TagIcon size={13} className="text-indigo-500" />
            <span>Focus Tag</span>
          </label>
          <select
            value={selectedTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Bar: Results count & Reset action */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Found <strong className="text-slate-900 dark:text-white font-bold">{totalResults}</strong> authoritative problem statement{totalResults === 1 ? '' : 's'}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
