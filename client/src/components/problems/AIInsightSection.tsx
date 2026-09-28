import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Problem, AISolutionsResult, AIMatchResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  Rocket,
  Users,
  Brain,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AIInsightSectionProps {
  problem: Problem;
}

export const AIInsightSection: React.FC<AIInsightSectionProps> = ({ problem }) => {
  const { user } = useAuth();

  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [solutionsData, setSolutionsData] = useState<AISolutionsResult | null>(null);
  const [matchData, setMatchData] = useState<AIMatchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateSolutions = async () => {
    setSolutionsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.analyzeProblem(problem.id, 'solutions');
      setSolutionsData(res);
    } catch (err: any) {
      console.error('AI solutions generation error:', err);
      setErrorMsg(err.message || 'Failed to generate startup solutions from AI.');
    } finally {
      setSolutionsLoading(false);
    }
  };

  const handleCalculateMatch = async () => {
    if (!user) {
      alert('Please log in to calculate personalized alignment with your profile.');
      return;
    }

    setMatchLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.analyzeProblem(problem.id, 'match');
      setMatchData(res);
    } catch (err: any) {
      console.error('AI match calculation error:', err);
      setErrorMsg(err.message || 'Failed to calculate profile alignment.');
    } finally {
      setMatchLoading(false);
    }
  };

  return (
    <div className="card-base p-6 sm:p-8 space-y-6">
      
      {/* AI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/40 mb-2">
            <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
            <span>GenAI Analysis</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            AI Startup Opportunities & Founder Fit
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Leverage Gemini reasoning to transform this global challenge into venture-backable startup concepts and verify alignment with your technical skills.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleGenerateSolutions}
            disabled={solutionsLoading}
            className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-3.5 disabled:opacity-50"
          >
            <Lightbulb size={14} />
            <span>{solutionsLoading ? 'Analyzing Challenge...' : 'Suggest Startup Ideas'}</span>
          </button>

          <button
            onClick={handleCalculateMatch}
            disabled={matchLoading}
            className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5 disabled:opacity-50"
          >
            <Brain size={14} className="text-brand-600 dark:text-brand-400" />
            <span>{matchLoading ? 'Evaluating Profile...' : 'Check My Match Score'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
          <AlertCircle size={15} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* User Match Result Box */}
      {matchData && (
        <div className="rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                <TrendingUp size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Founder–Problem Synergy Score
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluated against your background, indicated skills, and preferred venture roles.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {matchData.matchScore}%
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Alignment
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-dark-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(10, matchData.matchScore))}%` }}
            />
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-900 rounded-md p-3 border border-slate-200 dark:border-dark-700 leading-relaxed">
            {matchData.reason}
          </p>
        </div>
      )}

      {/* Suggested Startup Ideas Grid */}
      {solutionsData && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Rocket size={14} className="text-brand-600 dark:text-brand-400" />
            <span>AI Suggested Startup Ventures to Address this Problem</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {solutionsData.ideas.map((idea, idx) => (
              <div
                key={idx}
                className="card-base p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
              >
                <div>
                  <div className="w-7 h-7 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center mb-3 border border-brand-100 dark:border-brand-900/40">
                    0{idx + 1}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5 leading-snug">
                    {idea.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {idea.description}
                  </p>
                </div>

                <Link
                  to={`/startups/create?problemTitle=${encodeURIComponent(
                    problem.title
                  )}&suggestedTitle=${encodeURIComponent(idea.title)}&suggestedDescription=${encodeURIComponent(
                    idea.description
                  )}`}
                  className="btn-primary inline-flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold"
                >
                  <Rocket size={13} />
                  <span>Build This Startup</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Needed Skills Breakdown */}
          {solutionsData.needed_skills && solutionsData.needed_skills.length > 0 && (
            <div className="rounded-lg bg-slate-50 dark:bg-dark-800/60 border border-slate-200 dark:border-dark-700 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Users size={14} className="text-brand-600 dark:text-brand-400" />
                <span>Recommended Team Skill Roles Needed:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {solutionsData.needed_skills.map((skill, idx) => (
                  <Link
                    key={idx}
                    to={`/cofounders?skill=${encodeURIComponent(skill)}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-750 hover:border-brand-500 transition-colors"
                    title={`Find co-founders with ${skill}`}
                  >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>{skill}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skeletons while loading */}
      {(solutionsLoading || matchLoading) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 rounded-lg bg-slate-100 dark:bg-dark-800 animate-pulse" />
          <div className="h-32 rounded-lg bg-slate-100 dark:bg-dark-800 animate-pulse" />
        </div>
      )}
    </div>
  );
};
