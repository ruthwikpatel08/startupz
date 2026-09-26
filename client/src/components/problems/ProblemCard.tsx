import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Problem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Bookmark,
  ExternalLink,
  Flame,
  Globe2,
  Sparkles,
  ArrowRight,
  Edit,
  Trash2,
  Share2,
} from 'lucide-react';

interface ProblemCardProps {
  problem: Problem;
  onSaveToggle?: (problemId: string, isSaved: boolean) => void;
  onDelete?: (problemId: string) => void;
  onShare?: (problem: Problem) => void;
}

export const getCategoryColor = (category: string): string => {
  const cat = category.toLowerCase();
  if (cat.includes('climate') || cat.includes('environment')) {
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  if (cat.includes('health') || cat.includes('disease')) {
    return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }
  if (cat.includes('water') || cat.includes('food')) {
    return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  }
  if (cat.includes('energy') || cat.includes('infra')) {
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }
  if (cat.includes('education') || cat.includes('skill')) {
    return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  }
  if (cat.includes('economy') || cat.includes('inequality')) {
    return 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
  }
  if (cat.includes('tech') || cat.includes('innovat')) {
    return 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
  }
  if (cat.includes('women') || cat.includes('social')) {
    return 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onSaveToggle,
  onDelete,
  onShare,
}) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState<boolean>(!!problem.isSaved);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please log in to save problem statements to your profile.');
      return;
    }

    setSaveLoading(true);
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await api.toggleSave('PROBLEM', problem.id);
      if (onSaveToggle) {
        onSaveToggle(problem.id, nextSaved);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
      setIsSaved(!nextSaved); // revert on failure
    } finally {
      setSaveLoading(false);
    }
  };

  const impact = problem.impactLevel || problem.impact_level || 7;

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-xl hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all duration-300 hover:-translate-y-1">
      
      {/* Top Meta: Categories & Impact Score */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {problem.categories?.slice(0, 2).map((category, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryColor(
                  category
                )}`}
              >
                {category}
              </span>
            ))}
            {problem.categories && problem.categories.length > 2 && (
              <span className="text-[11px] font-semibold text-slate-400">
                +{problem.categories.length - 2}
              </span>
            )}
          </div>

          {/* Impact Meter Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
              impact >= 9
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
            }`}
            title={`Global Urgency & Impact Score: ${impact}/10`}
          >
            <Flame size={13} className={impact >= 9 ? 'animate-pulse' : ''} />
            <span>Impact {impact}/10</span>
          </div>
        </div>

        {/* Problem Title */}
        <Link to={`/problems/${problem.id}`} className="block">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 mb-2 leading-snug">
            {problem.title}
          </h3>
        </Link>

        {/* Truncated Description */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 leading-relaxed">
          {problem.description}
        </p>

        {/* Regions & Tags */}
        <div className="space-y-2 mb-4">
          {problem.regions && problem.regions.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Globe2 size={13} className="text-brand-500 shrink-0" />
              <span className="truncate">
                Region: <strong className="text-slate-700 dark:text-slate-200">{problem.regions.join(', ')}</strong>
              </span>
            </div>
          )}

          {/* Tags Chips */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {problem.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                >
                  #{tag}
                </span>
              ))}
              {problem.tags.length > 3 && (
                <span className="text-[10px] text-slate-400 font-medium self-center">
                  +{problem.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5">
          {/* Save/Bookmark Button */}
          <button
            onClick={handleSave}
            disabled={saveLoading}
            aria-label={isSaved ? 'Remove from saved' : 'Save problem statement'}
            className={`p-2 rounded-xl transition-all ${
              isSaved
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 border border-amber-200 dark:border-amber-800'
                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isSaved ? 'Saved to My Problems' : 'Save to My Problems'}
          >
            <Bookmark
              size={16}
              className={`${isSaved ? 'fill-amber-500 text-amber-500' : ''} ${
                saveLoading ? 'animate-spin' : ''
              }`}
            />
          </button>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={() => onShare(problem)}
              className="p-2 rounded-xl text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Share Challenge"
            >
              <Share2 size={16} />
            </button>
          )}

          {/* Source Link */}
          {(problem.sourceUrl || problem.source_url) && (
            <a
              href={problem.sourceUrl || problem.source_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="View Official UN / WHO / Global Citation Source"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={15} />
            </a>
          )}

          {/* Admin Management Controls */}
          {user?.isAdmin && (
            <div className="flex items-center gap-1 ml-1 border-l border-slate-200 dark:border-slate-800 pl-1.5">
              <Link
                to={`/admin/problems/${problem.id}/edit`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                title="Edit Problem Statement (Admin)"
              >
                <Edit size={14} />
              </Link>
              {onDelete && (
                <button
                  onClick={() => onDelete(problem.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  title="Delete Problem (Admin)"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* View Details CTA */}
        <Link
          to={`/problems/${problem.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition-all group-hover:translate-x-0.5"
        >
          <span>Explore</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};
