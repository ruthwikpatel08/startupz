import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Problem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getCategoryColor } from '../../components/problems/ProblemCard';
import { AIInsightSection } from '../../components/problems/AIInsightSection';
import { ShareProblemModal } from '../../components/problems/ShareProblemModal';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  ExternalLink,
  Flame,
  Globe2,
  Calendar,
  Rocket,
  Users,
  Edit,
  Trash2,
  ShieldCheck,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export const ProblemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getProblem(id)
      .then((data) => {
        setProblem(data);
        setIsSaved(!!data.isSaved);
        if (data.title) {
          document.title = `${data.title} — StartupZ World Challenges`;
        }
      })
      .catch((err) => {
        console.error('Failed to load problem statement:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      document.title = 'StartupZ — Find the right people. Build the right startup.';
    };
  }, [id]);

  const handleToggleSave = async () => {
    if (!user) {
      alert('Please log in to save problem statements to your profile.');
      return;
    }
    if (!problem) return;

    setSaveLoading(true);
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await api.toggleSave('PROBLEM', problem.id);
    } catch (err) {
      console.error('Failed to toggle save:', err);
      setIsSaved(!nextSaved);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!problem) return;
    if (!window.confirm(`Are you sure you want to delete "${problem.title}"?`)) return;

    try {
      await api.deleteProblem(problem.id);
      navigate('/problems');
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem statement.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-850 rounded-3xl" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Problem Statement Not Found
        </h2>
        <p className="text-xs text-slate-500">
          The requested global challenge may have been updated or removed.
        </p>
        <Link
          to="/problems"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500"
        >
          <ArrowLeft size={14} />
          <span>Back to All Problems</span>
        </Link>
      </div>
    );
  }

  const impact = problem.impactLevel || problem.impact_level || 7;
  const source = problem.sourceUrl || problem.source_url;

  return (
    <div className="min-h-screen py-8 sm:py-12 space-y-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/problems"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Problem Statements</span>
          </Link>

          {/* Admin Controls */}
          {user?.isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to={`/admin/problems/${problem.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors"
              >
                <Edit size={14} />
                <span>Edit (Admin)</span>
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Header Hero Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-10 shadow-sm space-y-6">
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {problem.categories?.map((cat, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(
                    cat
                  )}`}
                >
                  {cat}
                </span>
              ))}

              {problem.regions && problem.regions.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Globe2 size={13} className="text-brand-500" />
                  <span>{problem.regions.join(', ')}</span>
                </span>
              )}
            </div>

            {/* Impact Metric */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black ${
                impact >= 9
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
              }`}
              title="Urgency on 1-10 Global Priority Scale"
            >
              <Flame size={15} />
              <span>Urgency & Impact: {impact}/10</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
            {problem.title}
          </h1>

          {/* Date & Citation */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              <span>
                Added {new Date(problem.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            {source && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
              >
                <span>Official Global Citation</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleToggleSave}
              disabled={saveLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isSaved
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Bookmark
                size={16}
                className={isSaved ? 'fill-amber-500 text-amber-500' : ''}
              />
              <span>{isSaved ? 'Saved to My Challenges' : 'Save this Problem'}</span>
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>

            <Link
              to={`/startups/create?problemTitle=${encodeURIComponent(
                problem.title
              )}&problemDescription=${encodeURIComponent(problem.description)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105 ml-auto"
            >
              <Rocket size={15} />
              <span>Launch Startup Solving This</span>
            </Link>
          </div>
        </div>

        {/* Detailed Problem Description Section */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Challenge Overview & Market Friction</span>
          </h2>

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
            <p className="whitespace-pre-line">{problem.description}</p>
          </div>

          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Thematic Keywords & Subtopics
              </span>
              <div className="flex flex-wrap gap-2">
                {problem.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    to={`/problems?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/60 dark:hover:text-brand-400 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Official Reference Citation Card */}
          {source && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} className="text-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Authoritative Research & Data Source
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {source}
                  </p>
                </div>
              </div>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              >
                <span>Read Full Report</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>

        {/* AI Insight & Startup Solutions Section */}
        <AIInsightSection problem={problem} />

        {/* Collaboration & Team Formation Section */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-brand-500" />
                <span>Ecosystem Collaboration & Team Formation</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Great startups start with great co-founders. Connect with builders, engineers, and mentors committed to this challenge.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/cofounders"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                <span>Browse Talent</span>
              </Link>

              <Link
                to={`/feed`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 transition-colors"
              >
                <span>Discuss on Feed</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">1. Formulate Solution</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use AI suggestions above or your own market domain insights to draft a startup concept.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">2. Recruit Co-Founders</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Match with developers, operators, or researchers possessing the recommended complementary skills.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white">3. Connect With Capital</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pitch ESG, ClimateTech, and impact venture funds actively looking for founders solving this problem.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Share Modal */}
      <ShareProblemModal
        isOpen={shareModalOpen}
        problem={problem}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
};
