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
    <div className="card-base p-4 sm:p-5 space-y-4">
      
      {/* Search Input Bar */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search world problems, SDGs, keywords (e.g. water, climate, education)..."
          className="input-base pl-9 pr-9 py-2 text-xs"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Categories Horizontal Pills */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter size={12} className="text-brand-600 dark:text-brand-400" />
            <span>Category Domains</span>
          </label>
          {selectedCategory && (
            <button
              onClick={() => onCategoryChange('')}
              className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              Clear category
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onCategoryChange('')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
              !selectedCategory
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-200/60 dark:border-dark-800'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(selectedCategory === cat ? '' : cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-200/60 dark:border-dark-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Row: Regions, Impact Level & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-dark-800">
        
        {/* Region Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <Globe2 size={12} className="text-slate-400" />
            <span>Region</span>
          </label>
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
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
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <Flame size={12} className="text-slate-400" />
            <span>Impact Urgency</span>
          </label>
          <select
            value={selectedImpact}
            onChange={(e) => onImpactChange(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
          >
            <option value="">Any Impact Level</option>
            <option value="9">Critical Impact (9 - 10)</option>
            <option value="8">High Impact (8+)</option>
            <option value="7">Substantial Impact (7+)</option>
          </select>
        </div>

        {/* Tags Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <TagIcon size={12} className="text-slate-400" />
            <span>Focus Tag</span>
          </label>
          <select
            value={selectedTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="input-base py-1.5 px-2.5 text-xs"
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
          Found <strong className="text-slate-900 dark:text-white font-semibold">{totalResults}</strong> authoritative problem statement{totalResults === 1 ? '' : 's'}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400 hover:underline transition-colors"
          >
            <RotateCcw size={12} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
