import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Problem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getCategoryColor } from '../../components/problems/ProblemCard';
import { AIInsightSection } from '../../components/problems/AIInsightSection';
import { ShareProblemModal } from '../../components/problems/ShareProblemModal';
import { SEO } from '../../components/common/SEO';
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
          document.title = `${data.title} — HookZ World Challenges`;
        }
      })
      .catch((err) => {
        console.error('Failed to load problem statement:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      document.title = 'HookZ — Find the right people. Build the right startup.';
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
        <div className="h-5 w-32 bg-slate-200 dark:bg-dark-800 rounded" />
        <div className="h-9 w-3/4 bg-slate-200 dark:bg-dark-800 rounded-lg" />
        <div className="h-64 card-base bg-slate-50 dark:bg-dark-900" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <SEO title="Problem Statement Not Found | HookZ" noindex={true} />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Problem Statement Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested global challenge may have been updated or removed.
        </p>
        <Link
          to="/problems"
          className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-4"
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
    <div className="min-h-screen py-8 sm:py-10 space-y-8">
      <SEO
        title={`${problem.title} | HookZ World Challenges`}
        description={problem.description ? problem.description.slice(0, 155) : `Explore ${problem.title} on HookZ.`}
        canonicalPath={`/problems/${id}`}
        breadcrumbs={[
          { name: 'Problems', path: '/problems' },
          { name: problem.title, path: `/problems/${id}` },
        ]}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/problems"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Problem Statements</span>
          </Link>

          {/* Creator & Admin Controls */}
          {(user?.isAdmin || (user?.id && (user.id === (problem as any).authorId || user.id === (problem as any).userId || user.id === (problem as any).creatorId))) && (
            <div className="flex items-center gap-2">
              {user?.isAdmin && (
                <Link
                  to={`/admin/problems/${problem.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 transition-colors border border-brand-200/60 dark:border-brand-900/40"
                >
                  <Edit size={13} />
                  <span>Edit</span>
                </Link>
              )}
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors border border-rose-200/60 dark:border-rose-900/40"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Header Hero Card */}
        <div className="card-base p-6 sm:p-8 space-y-6">
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {problem.categories?.map((cat, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${getCategoryColor(
                    cat
                  )}`}
                >
                  {cat}
                </span>
              ))}

              {problem.regions && problem.regions.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-350 border border-slate-200/60 dark:border-dark-700">
                  <Globe2 size={12} className="text-brand-600 dark:text-brand-400" />
                  <span>{problem.regions.join(', ')}</span>
                </span>
              )}
            </div>

            {/* Impact Metric */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${
                impact >= 9
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40'
              }`}
              title="Urgency on 1-10 Global Priority Scale"
            >
              <Flame size={14} className={impact >= 9 ? 'text-rose-600' : 'text-amber-600'} />
              <span>Urgency & Impact: {impact}/10</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
            {problem.title}
          </h1>

          {/* Date & Citation */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              <span>
                Added {new Date(problem.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            {source && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
              >
                <span>Official Global Citation</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-dark-800">
            <button
              onClick={handleToggleSave}
              disabled={saveLoading}
              className={`btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5 ${
                isSaved
                  ? 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                  : ''
              }`}
            >
              <Bookmark
                size={14}
                className={isSaved ? 'fill-amber-500 text-amber-500' : ''}
              />
              <span>{isSaved ? 'Saved to My Challenges' : 'Save this Problem'}</span>
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5"
            >
              <Share2 size={14} />
              <span>Share</span>
            </button>

            <Link
              to={`/startups/create?problemTitle=${encodeURIComponent(
                problem.title
              )}&problemDescription=${encodeURIComponent(problem.description)}`}
              className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4 ml-auto"
            >
              <Rocket size={14} />
              <span>Launch Startup Solving This</span>
            </Link>
          </div>
        </div>

        {/* Detailed Problem Description Section */}
        <div className="card-base p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Challenge Overview & Market Friction</span>
          </h2>

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-4">
            <p className="whitespace-pre-line">{problem.description}</p>
          </div>

          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-dark-800 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Thematic Keywords & Subtopics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((tag, idx) => (
                  <Link
                    key={idx}
                    to={`/problems?tag=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700 hover:border-brand-500 dark:hover:border-dark-600 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Official Reference Citation Card */}
          {source && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Authoritative Research & Data Source
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md mt-0.5">
                    {source}
                  </p>
                </div>
              </div>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 shrink-0"
              >
                <span>Read Full Report</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* AI Insight & Startup Solutions Section */}
        <AIInsightSection problem={problem} />

        {/* Collaboration & Team Formation Section */}
        <div className="card-base p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-brand-600 dark:text-brand-400" />
                <span>Ecosystem Collaboration & Team Formation</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Great startups start with great co-founders. Connect with builders, engineers, and mentors committed to this challenge.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/cofounders"
                className="btn-secondary inline-flex items-center text-xs py-2 px-3.5"
              >
                <span>Browse Talent</span>
              </Link>

              <Link
                to={`/feed`}
                className="btn-primary inline-flex items-center text-xs py-2 px-3.5"
              >
                <span>Discuss on Feed</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 space-y-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">1. Formulate Solution</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Use AI suggestions above or your own market domain insights to draft a startup concept.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 space-y-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">2. Recruit Co-Founders</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Match with developers, operators, or researchers possessing the recommended complementary skills.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 space-y-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">3. Connect With Capital</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
