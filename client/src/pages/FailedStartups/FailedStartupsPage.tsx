import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FailedStartup, RaisedSolution } from '../../types';
import { RaiseSolutionModal } from '../../components/common/RaiseSolutionModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import {
  Skull,
  Lightbulb,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
  BookOpen,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  UserPlus,
  Rocket,
  ShieldAlert,
} from 'lucide-react';

export const FailedStartupsPage: React.FC = () => {
  const [startups, setStartups] = useState<FailedStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('ALL');

  // Selected startup for raising a solution
  const [selectedForSolution, setSelectedForSolution] = useState<FailedStartup | null>(null);

  // User connection modal
  const [connectUser, setConnectUser] = useState<any | null>(null);

  // Expanded solutions accordion for startups
  const [expandedStartupId, setExpandedStartupId] = useState<string | null>(null);

  // Optimistic upvotes
  const [upvotedSolutions, setUpvotedSolutions] = useState<Record<string, boolean>>({});

  const fetchFailedStartups = async () => {
    setLoading(true);
    try {
      const data = await api.getFailedStartups({
        search: search.trim() || undefined,
        industry: industryFilter !== 'ALL' ? industryFilter : undefined,
      });
      setStartups(Array.isArray(data) ? data : (data as any)?.failedStartups || (data as any)?.startups || []);
    } catch (err) {
      console.error('Failed to load startup post-mortems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFailedStartups();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, industryFilter]);

  const handleUpvote = async (solutionId: string) => {
    if (upvotedSolutions[solutionId]) return;
    try {
      setUpvotedSolutions((prev) => ({ ...prev, [solutionId]: true }));
      const res = await api.upvoteSolution(solutionId);
      // update count locally in state
      setStartups((prev) =>
        prev.map((s) => ({
          ...s,
          solutions: s.solutions?.map((sol) =>
            sol.id === solutionId ? { ...sol, upvotesCount: res.upvotesCount } : sol
          ),
        }))
      );
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  const handleSolutionCreated = (newSolution: RaisedSolution) => {
    if (!selectedForSolution) return;
    setStartups((prev) =>
      prev.map((s) =>
        s.id === selectedForSolution.id
          ? {
              ...s,
              solutionsCount: s.solutionsCount + 1,
              solutions: [newSolution, ...(s.solutions || [])],
            }
          : s
      )
    );
    setExpandedStartupId(selectedForSolution.id);
  };

  const industries = [
    'ALL',
    'Media & Entertainment',
    'Fintech & Payments',
    'FoodTech & Robotics',
    'E-Commerce',
    'Healthcare',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
            <Skull size={14} /> The Startup Graveyard & Post-Mortems
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Learn Why They Failed. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-400 to-cyan-400">
              Raise The Winning Solution.
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Over $100B in venture capital has funded ideas with real consumer demand but flawed execution.
            Explore deep post-mortems of high-profile startup failures, identify the market gap left behind,
            and click <strong>"Raise Solution"</strong> to pitch your blueprint and find co-founders to build it right.
          </p>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search failed startups or industries..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(ind)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                industryFilter === ind
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* 3. FAILED STARTUPS DIRECTORY */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : startups.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <Skull size={40} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No post-mortems match your search
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search keywords or clear industry filters.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {startups.map((item) => {
            const lessons = item.lessonsLearned
              ? item.lessonsLearned.split(';').map((l) => l.trim()).filter(Boolean)
              : [];
            const isExpanded = expandedStartupId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header Strip */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xl border border-rose-500/20">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.industry}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.summary}</p>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
                        <TrendingDown size={14} />
                        <span>{item.peakFunding} Peak Capital</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl font-medium">
                        <Calendar size={14} />
                        <span>{item.yearsActive}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Body */}
                <div className="p-6 space-y-6">
                  {/* Why it Failed */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                      <AlertTriangle size={15} /> The Fatal Flaw & Why It Failed:
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-rose-50/40 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                      {item.whyItFailed}
                    </p>
                  </div>

                  {/* Lessons Learned Chips */}
                  {lessons.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <BookOpen size={14} /> Key Takeaways for Founders:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {lessons.map((lesson, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            • {lesson}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* THE UNSOLVED PROBLEM CALLOUT (Gold Box) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                      <Lightbulb size={16} className="text-amber-500" />
                      <span>The Real Market Gap Left Behind:</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                      "{item.unsolvedProblem}"
                    </p>
                  </div>

                  {/* BOTTOM ACTION BAR: RAISE SOLUTION + SOLUTIONS TOGGLE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() =>
                        setExpandedStartupId(isExpanded ? null : item.id)
                      }
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className="text-brand-500" />
                      <span>
                        {item.solutionsCount || 0} Community Solution(s) Proposed
                      </span>
                      <span className="text-[10px] text-brand-600 underline ml-1">
                        {isExpanded ? 'Hide' : 'View solutions'}
                      </span>
                    </button>

                    {/* THE PROMINENT "RAISE SOLUTION" BUTTON */}
                    <button
                      onClick={() => setSelectedForSolution(item)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all hover:scale-105"
                    >
                      <Lightbulb size={15} />
                      <span>💡 Raise Solution for {item.name}</span>
                    </button>
                  </div>

                  {/* COMMUNITY RAISED SOLUTIONS DRAWER */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Proposed Blueprints & Fixes ({item.solutions?.length || 0}):
                      </h4>
                      {(!item.solutions || item.solutions.length === 0) ? (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                          <p className="text-xs text-slate-400">
                            No one has raised a solution for {item.name} yet. Be the first to propose how to fix it!
                          </p>
                          <button
                            onClick={() => setSelectedForSolution(item)}
                            className="text-xs font-bold text-amber-600 hover:underline"
                          >
                            + Raise First Solution
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.solutions.map((sol) => {
                            const authorName =
                              sol.author?.profile?.fullName ||
                              sol.author?.email?.split('@')[0] ||
                              'Innovator';
                            const authorAvatar =
                              sol.author?.profile?.avatar ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;
                            const isUpvoted = upvotedSolutions[sol.id];

                            return (
                              <div
                                key={sol.id}
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2.5 flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                      {sol.title}
                                    </h5>
                                    <button
                                      onClick={() => handleUpvote(sol.id)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                        isUpvoted
                                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 shadow-xs'
                                      }`}
                                      title="Upvote solution"
                                    >
                                      <ThumbsUp size={11} />
                                      <span>{sol.upvotesCount}</span>
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                                    {sol.description}
                                  </p>
                                  {sol.differentiation && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      <strong>Moat:</strong> {sol.differentiation}
                                    </div>
                                  )}
                                </div>

                                {/* Author footer & Connect */}
                                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <img
                                      src={authorAvatar}
                                      alt={authorName}
                                      className="w-5 h-5 rounded-full object-cover"
                                    />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                      {authorName}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => setConnectUser(sol.author)}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/60 transition-colors flex items-center gap-1"
                                  >
                                    <UserPlus size={10} />
                                    <span>Team Up</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raise Solution Modal */}
      {selectedForSolution && (
        <RaiseSolutionModal
          isOpen={!!selectedForSolution}
          onClose={() => setSelectedForSolution(null)}
          failedStartup={selectedForSolution}
          onSuccess={handleSolutionCreated}
        />
      )}

      {/* Connect with Solution Author Modal */}
      {connectUser && (
        <ConnectModal
          isOpen={!!connectUser}
          onClose={() => setConnectUser(null)}
          targetUser={connectUser}
        />
      )}
    </div>
  );
};
