import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Problem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { broadcastEntityDeleted, recordDeletedEntityId } from '../../lib/supabase';
import { sanitizeExternalUrl } from '../../utils/urlSecurity';
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
    return 'bg-[var(--brand-soft)]  text-[var(--brand-primary)]  border-indigo-200 dark:border-indigo-800';
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
  return 'bg-[var(--bg-soft)]  text-[var(--text-secondary)]  border-[var(--border-subtle)] ';
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
    <div className="card-base p-5 flex flex-col justify-between space-y-3.5 hover:border-[var(--border-subtle)]  transition-colors">
      
      {/* Top Meta: Categories & Impact Score */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {problem.categories?.slice(0, 2).map((category, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(
                  category
                )}`}
              >
                {category}
              </span>
            ))}
            {problem.categories && problem.categories.length > 2 && (
              <span className="text-[10px] font-medium text-[var(--text-muted)]">
                +{problem.categories.length - 2}
              </span>
            )}
          </div>

          {/* Impact Meter Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
              impact >= 9
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
            }`}
            title={`Global Urgency & Impact Score: ${impact}/10`}
          >
            <Flame size={12} className={impact >= 9 ? 'text-rose-500' : 'text-amber-500'} />
            <span>Impact {impact}/10</span>
          </div>
        </div>

        {/* Problem Title */}
        <Link to={`/problems/${problem.id}`} className="block">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]  hover:text-[var(--brand-primary)]  transition-colors line-clamp-2 mb-1.5 leading-snug">
            {problem.title}
          </h3>
        </Link>

        {/* Truncated Description */}
        <p className="text-xs text-[var(--text-secondary)]  line-clamp-2 mb-3 leading-relaxed">
          {problem.description}
        </p>

        {/* Regions & Tags */}
        <div className="space-y-1.5 mb-2">
          {problem.regions && problem.regions.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] ">
              <Globe2 size={13} className="text-[var(--text-muted)] shrink-0" />
              <span className="truncate">
                Region: <strong className="text-[var(--text-secondary)]  font-medium">{problem.regions.join(', ')}</strong>
              </span>
            </div>
          )}

          {/* Tags Chips */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {problem.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-soft)]  text-[var(--text-secondary)]  border border-[var(--border-subtle)] "
                >
                  #{tag}
                </span>
              ))}
              {problem.tags.length > 3 && (
                <span className="text-[10px] text-[var(--text-muted)] font-medium self-center">
                  +{problem.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-[var(--border-subtle)]  flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1">
          {/* Save/Bookmark Button */}
          <button
            onClick={handleSave}
            disabled={saveLoading}
            aria-label={isSaved ? 'Remove from saved' : 'Save problem statement'}
            className={`p-1.5 rounded-md transition-colors ${
              isSaved
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/60'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] '
            }`}
            title={isSaved ? 'Saved to My Problems' : 'Save to My Problems'}
          >
            <Bookmark
              size={14}
              className={`${isSaved ? 'fill-amber-500 text-amber-500' : ''} ${
                saveLoading ? 'animate-spin' : ''
              }`}
            />
          </button>

          {/* Share Button */}
          {onShare && (
            <button
              onClick={() => onShare(problem)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors"
              title="Share Challenge"
            >
              <Share2 size={14} />
            </button>
          )}

          {/* Source Link */}
          {(problem.sourceUrl || problem.source_url) && (
            <a
              href={sanitizeExternalUrl(problem.sourceUrl || problem.source_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
              title="View Official UN / WHO / Global Citation Source"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={13} />
            </a>
          )}

          {/* Creator & Admin Management Controls */}
          {(user?.isAdmin || (user?.id && (user.id === (problem as any).authorId || user.id === (problem as any).userId || user.id === (problem as any).creatorId))) && (
            <div className="flex items-center gap-1 ml-1 border-l border-[var(--border-subtle)]  pl-1.5">
              {user?.isAdmin && (
                <Link
                  to={`/admin/problems/${problem.id}/edit`}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                  title="Edit Problem Statement (Admin)"
                >
                  <Edit size={13} />
                </Link>
              )}
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!window.confirm('Are you sure you want to delete this startup idea / problem statement?')) return;
                  if (onDelete) {
                    onDelete(problem.id);
                  } else {
                    try {
                      recordDeletedEntityId('PROBLEM', problem.id);
                      broadcastEntityDeleted('PROBLEM', problem.id);
                      await api.deleteProblem(problem.id);
                      window.location.reload();
                    } catch (err: any) {
                      alert(err.message || 'Failed to delete problem statement.');
                    }
                  }
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                title="Delete Problem Statement"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* View Details CTA */}
        <Link
          to={`/problems/${problem.id}`}
          className="btn-primary py-1 px-3 text-xs font-semibold inline-flex items-center gap-1"
        >
          <span>Explore</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};
