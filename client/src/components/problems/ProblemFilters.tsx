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
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category Domains Selector */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)]  mb-1 flex items-center gap-1.5">
          <Filter size={12} className="text-[var(--text-muted)]" />
          <span>Category Domains</span>
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input-base py-1.5 px-2.5 text-xs"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Secondary Row: Regions, Impact Level & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)] ">
        
        {/* Region Selector */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]  mb-1 flex items-center gap-1.5">
            <Globe2 size={12} className="text-[var(--text-muted)]" />
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
          <label className="block text-xs font-medium text-[var(--text-secondary)]  mb-1 flex items-center gap-1.5">
            <Flame size={12} className="text-[var(--text-muted)]" />
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
          <label className="block text-xs font-medium text-[var(--text-secondary)]  mb-1 flex items-center gap-1.5">
            <TagIcon size={12} className="text-[var(--text-muted)]" />
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
      <div className="flex items-center justify-between pt-1 text-xs text-[var(--text-muted)] ">
        <div>
          Found <strong className="text-[var(--text-primary)]  font-semibold">{totalResults}</strong> authoritative problem statement{totalResults === 1 ? '' : 's'}
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
