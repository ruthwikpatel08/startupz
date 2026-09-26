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
    <div className="rounded-3xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/60 p-6 sm:p-8 shadow-sm space-y-6">
      
      {/* AI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 mb-2">
            <Sparkles size={14} className="text-purple-500 animate-spin" />
            <span>Google Gemini GenAI Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            AI Startup Opportunities & Founder Fit
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Leverage Gemini reasoning to transform this global challenge into venture-backable startup concepts and verify alignment with your technical skills.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleGenerateSolutions}
            disabled={solutionsLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 shadow-md shadow-purple-500/20 transition-all hover:scale-105 disabled:opacity-50"
          >
            <Lightbulb size={15} />
            <span>{solutionsLoading ? 'Analyzing Challenge...' : 'Suggest Startup Ideas'}</span>
          </button>

          <button
            onClick={handleCalculateMatch}
            disabled={matchLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 shadow-xs transition-all hover:scale-105 disabled:opacity-50"
          >
            <Brain size={15} className="text-indigo-500" />
            <span>{matchLoading ? 'Evaluating Profile...' : 'Check My Match Score'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* User Match Result Box */}
      {matchData && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Founder–Problem Synergy Score
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluated against your background, indicated skills, and preferred venture roles.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {matchData.matchScore}%
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Alignment
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, Math.max(10, matchData.matchScore))}%` }}
            />
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/40">
            {matchData.reason}
          </p>
        </div>
      )}

      {/* Suggested Startup Ideas Grid */}
      {solutionsData && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Rocket size={15} className="text-brand-500" />
            <span>AI Suggested Startup Ventures to Address this Problem</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {solutionsData.ideas.map((idea, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-brand-500 transition-all"
              >
                <div>
                  <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center mb-3">
                    0{idx + 1}
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                    {idea.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {idea.description}
                  </p>
                </div>

                <Link
                  to={`/startups/create?problemTitle=${encodeURIComponent(
                    problem.title
                  )}&suggestedTitle=${encodeURIComponent(idea.title)}&suggestedDescription=${encodeURIComponent(
                    idea.description
                  )}`}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition-all"
                >
                  <Rocket size={13} />
                  <span>Build This Startup</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Needed Skills Breakdown */}
          {solutionsData.needed_skills && solutionsData.needed_skills.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Users size={14} className="text-indigo-500" />
                <span>Recommended Team Skill Roles Needed:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {solutionsData.needed_skills.map((skill, idx) => (
                  <Link
                    key={idx}
                    to={`/cofounders?skill=${encodeURIComponent(skill)}`}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/60 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    title={`Find co-founders with ${skill}`}
                  >
                    <CheckCircle2 size={12} className="text-emerald-500" />
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
          <div className="h-32 rounded-2xl bg-white/70 dark:bg-slate-800/50 animate-pulse" />
          <div className="h-32 rounded-2xl bg-white/70 dark:bg-slate-800/50 animate-pulse" />
        </div>
      )}
    </div>
  );
};
