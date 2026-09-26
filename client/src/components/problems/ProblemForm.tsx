import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Problem } from '../../types';
import { api } from '../../services/api';
import {
  Sparkles,
  Plus,
  X,
  AlertCircle,
  Save,
  Flame,
  Globe2,
  FolderTree,
  Tag as TagIcon,
  Link as LinkIcon,
} from 'lucide-react';

const FormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  categories: z.array(z.string()).min(1, 'Please select or add at least one category'),
  regions: z.array(z.string()),
  tags: z.array(z.string()),
  impactLevel: z.number().int().min(1).max(10),
  sourceUrl: z.string().url('Source URL must be a valid URL starting with http:// or https://').or(z.literal('')),
});

interface ProblemFormProps {
  initialData?: Problem | null;
  onSubmit: (formData: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Environment/Climate',
  'Health & Disease',
  'Food & Water',
  'Energy & Infrastructure',
  'Education & Skills',
  'Economy & Inequality',
  'Governance & Peace',
  'Technology & Innovation',
  'Women & Social',
  'Other (Future Tech)',
];

const DEFAULT_REGIONS = [
  'Global',
  'Sub-Saharan Africa',
  'South Asia',
  'Southeast Asia',
  'Latin America',
  'Europe',
  'North America',
  'Middle East',
  'Asia-Pacific',
];

export const ProblemForm: React.FC<ProblemFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categories, setCategories] = useState<string[]>(initialData?.categories || ['Environment/Climate']);
  const [regions, setRegions] = useState<string[]>(initialData?.regions || ['Global']);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [impactLevel, setImpactLevel] = useState<number>(initialData?.impactLevel || initialData?.impact_level || 8);
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || initialData?.source_url || '');

  const [tagInput, setTagInput] = useState('');
  const [customCatInput, setCustomCatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCategories(initialData.categories || []);
      setRegions(initialData.regions || []);
      setTags(initialData.tags || []);
      setImpactLevel(initialData.impactLevel || initialData.impact_level || 8);
      setSourceUrl(initialData.sourceUrl || initialData.source_url || '');
    }
  }, [initialData]);

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const addCustomCategory = () => {
    if (customCatInput.trim() && !categories.includes(customCatInput.trim())) {
      setCategories([...categories, customCatInput.trim()]);
      setCustomCatInput('');
    }
  };

  const toggleRegion = (reg: string) => {
    if (regions.includes(reg)) {
      setRegions(regions.filter((r) => r !== reg));
    } else {
      setRegions([...regions, reg]);
    }
  };

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAIAssist = async () => {
    if (!description || description.trim().length < 15) {
      alert('Please enter a brief description first so AI can categorize and suggest tags.');
      return;
    }

    setAiLoading(true);
    setServerError(null);
    try {
      const res = await api.categorizeProblemAI({ title, description });
      if (res.categories && res.categories.length > 0) {
        // Merge without duplicates
        setCategories((prev) => Array.from(new Set([...prev, ...res.categories])));
      }
      if (res.tags && res.tags.length > 0) {
        setTags((prev) => Array.from(new Set([...prev, ...res.tags])));
      }
    } catch (err: any) {
      console.error('AI categorization error:', err);
      setServerError('Failed to run AI Auto-Classification. You can manually assign categories and tags.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = {
      title: title.trim(),
      description: description.trim(),
      categories,
      regions,
      tags,
      impactLevel: Number(impactLevel),
      sourceUrl: sourceUrl.trim(),
    };

    const result = FormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(result.data);
    } catch (err: any) {
      console.error('Form submission failed:', err);
      setServerError(err.message || 'Failed to save problem statement.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {serverError && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Problem Title <span className="text-rose-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400 font-medium">
            {title.length}/150
          </span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Ensure Clean Drinking Water for Rural Communities"
          className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.title}</p>
        )}
      </div>

      {/* Description & AI Auto-Assist */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Full Problem Description <span className="text-rose-500">*</span>
          </label>

          {/* AI Auto-Categorize Button */}
          <button
            type="button"
            onClick={handleAIAssist}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors disabled:opacity-50"
            title="Automatically detect categories and tags using Gemini GenAI"
          >
            <Sparkles size={13} className={aiLoading ? 'animate-spin text-purple-500' : 'text-purple-500'} />
            <span>{aiLoading ? 'AI Analyzing...' : 'AI Auto-Tag & Categorize'}</span>
          </button>
        </div>
        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed problem statement, affected populations, root causes, market friction, and why new startup solutions are urgently required..."
          className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.description}</p>
        )}
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <FolderTree size={14} className="text-brand-500" />
          <span>Categories (Assign 1 or more) <span className="text-rose-500">*</span></span>
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {DEFAULT_CATEGORIES.map((cat) => {
            const selected = categories.includes(cat);
            return (
              <button
                type="button"
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selected
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                }`}
              >
                {selected && '✓ '}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Custom category input */}
        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            value={customCatInput}
            onChange={(e) => setCustomCatInput(e.target.value)}
            placeholder="Add custom category..."
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomCategory();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomCategory}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
          >
            Add
          </button>
        </div>
        {errors.categories && (
          <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.categories}</p>
        )}
      </div>

      {/* Regions */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <Globe2 size={14} className="text-cyan-500" />
          <span>Critical Regions / Geographies</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_REGIONS.map((reg) => {
            const selected = regions.includes(reg);
            return (
              <button
                type="button"
                key={reg}
                onClick={() => toggleRegion(reg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selected
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-500'
                }`}
              >
                {selected && '✓ '}
                {reg}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags Chips */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <TagIcon size={14} className="text-indigo-500" />
          <span>Tags & Keywords</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            >
              #{t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:text-rose-500 transition-colors"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 max-w-sm">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Type tag and press Add (e.g. Clean Water, SDG 6)"
            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button
            type="button"
            onClick={addTag}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Impact Level & Source URL Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* Impact Level */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Flame size={14} className="text-amber-500" />
            <span>Impact Urgency Score (1 - 10)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              value={impactLevel}
              onChange={(e) => setImpactLevel(parseInt(e.target.value, 10))}
              className="flex-1 accent-brand-600 cursor-pointer"
            />
            <span className="w-12 text-center px-2 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-black text-sm border border-brand-200 dark:border-brand-800">
              {impactLevel}/10
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {impactLevel >= 9 ? 'Critical Global Emergency' : impactLevel >= 7 ? 'High Global Priority' : 'Substantial Focus Area'}
          </span>
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <LinkIcon size={14} className="text-slate-400" />
            <span>Official Citation / Source URL</span>
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.who.int/ or https://un.org/..."
            className="w-full px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {errors.sourceUrl && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.sourceUrl}</p>
          )}
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105 disabled:opacity-50"
        >
          <Save size={15} />
          <span>{isSubmitting ? 'Saving Problem...' : initialData ? 'Update Problem' : 'Publish Problem Statement'}</span>
        </button>
      </div>
    </form>
  );
};
