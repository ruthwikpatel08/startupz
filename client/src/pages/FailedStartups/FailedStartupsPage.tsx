import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FailedStartup, RaisedSolution } from '../../types';
import { RaiseSolutionModal } from '../../components/common/RaiseSolutionModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { SEO } from '../../components/common/SEO';
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
  const { user } = useAuth();
  const navigate = useNavigate();
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
    if (!user) {
      navigate('/login');
      return;
    }
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title="Failed Startups Archive & Post-Mortem Insights | HookZ"
        description="Learn from honest post-mortems of past startups. Discover unsolved market problems and raise next-generation solutions on HookZ."
        canonicalPath="/failed-startups"
        breadcrumbs={[{ name: 'Failed Startups', path: '/failed-startups' }]}
      />
      {/* 1. HERO BANNER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Skull className="text-slate-700 dark:text-slate-300" size={24} /> The Startup Graveyard & Post-Mortems
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Learn why past ventures with proven consumer demand failed due to unit economics, timing, or execution. Identify the market gap left behind and raise your solution.
        </p>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="card-base p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search failed startups or industries..."
            className="input-base pl-9 pr-3 py-1.5 text-xs"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(ind)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                industryFilter === ind
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-800 border border-slate-200/60 dark:border-dark-800'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* 3. FAILED STARTUPS DIRECTORY */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-56 card-base bg-slate-100 dark:bg-dark-850" />
          <div className="h-56 card-base bg-slate-100 dark:bg-dark-850" />
        </div>
      ) : startups.length === 0 ? (
        <div className="card-base p-8 text-center">
          <Skull size={32} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No post-mortems match your search
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Try adjusting your search keywords or clear industry filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {startups.map((item) => {
            const lessons = item.lessonsLearned
              ? item.lessonsLearned.split(';').map((l) => l.trim()).filter(Boolean)
              : [];
            const isExpanded = expandedStartupId === item.id;

            return (
              <div
                key={item.id}
                className="card-base overflow-hidden hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
              >
                {/* Header Strip */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-dark-800 bg-slate-50/50 dark:bg-dark-850/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base border border-rose-200/60 dark:border-rose-900/60">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-800">
                            {item.industry}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.summary}</p>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200/60 dark:border-rose-900/60">
                        <TrendingDown size={13} />
                        <span>{item.peakFunding} Peak Capital</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-dark-800 px-2.5 py-1 rounded-md font-medium border border-slate-200/60 dark:border-dark-800">
                        <Calendar size={13} />
                        <span>{item.yearsActive}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis Body */}
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Why it Failed */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> The Fatal Flaw & Why It Failed:
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-rose-50/40 dark:bg-rose-950/20 p-3 rounded-md border border-rose-100 dark:border-rose-900/30">
                      {item.whyItFailed}
                    </p>
                  </div>

                  {/* Lessons Learned Chips */}
                  {lessons.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <BookOpen size={13} /> Key Takeaways for Founders:
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {lessons.map((lesson, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 font-normal border border-slate-200/60 dark:border-dark-800"
                          >
                            • {lesson}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* THE UNSOLVED PROBLEM CALLOUT (Gold Box) */}
                  <div className="p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                      <Lightbulb size={14} className="text-amber-600" />
                      <span>The Real Market Gap Left Behind:</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                      "{item.unsolvedProblem}"
                    </p>
                  </div>

                  {/* BOTTOM ACTION BAR: RAISE SOLUTION + SOLUTIONS TOGGLE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-dark-800">
                    <button
                      onClick={() =>
                        setExpandedStartupId(isExpanded ? null : item.id)
                      }
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-brand-600 inline-flex items-center gap-1.5"
                    >
                      <Sparkles size={13} className="text-brand-600" />
                      <span>
                        {item.solutionsCount || 0} Community Solution(s) Proposed
                      </span>
                      <span className="text-[11px] text-brand-600 dark:text-brand-400 underline ml-1">
                        {isExpanded ? 'Hide' : 'View solutions'}
                      </span>
                    </button>

                    {/* THE PROMINENT "RAISE SOLUTION" BUTTON */}
                    <button
                      onClick={() => setSelectedForSolution(item)}
                      className="btn-primary w-full sm:w-auto py-1.5 px-3.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Lightbulb size={13} />
                      <span>Raise Solution for {item.name}</span>
                    </button>
                  </div>

                  {/* COMMUNITY RAISED SOLUTIONS DRAWER */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-dark-800 space-y-2.5">
                      <h4 className="text-xs font-semibold text-slate-400">
                        Proposed Blueprints & Fixes ({item.solutions?.length || 0}):
                      </h4>
                      {(!item.solutions || item.solutions.length === 0) ? (
                        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 text-center space-y-1.5 border border-slate-200/60 dark:border-dark-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No one has raised a solution for {item.name} yet. Be the first to propose how to fix it.
                          </p>
                          <button
                            onClick={() => setSelectedForSolution(item)}
                            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
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
                            const isUpvoted = upvotedSolutions[sol.id];

                            return (
                              <div
                                key={sol.id}
                                className="p-3.5 rounded-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                                      {sol.title}
                                    </h5>
                                    <button
                                      onClick={() => handleUpvote(sol.id)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                                        isUpvoted
                                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                          : 'btn-secondary'
                                      }`}
                                      title="Upvote solution"
                                    >
                                      <ThumbsUp size={10} />
                                      <span>{sol.upvotesCount}</span>
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {sol.description}
                                  </p>
                                  {sol.differentiation && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      <strong>Moat:</strong> {sol.differentiation}
                                    </div>
                                  )}
                                </div>

                                {/* Author footer & Connect */}
                                <div className="pt-2 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar
                                      src={sol.author?.profile?.avatar}
                                      name={authorName}
                                      size="xs"
                                      className="w-4 h-4"
                                    />
                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                      {authorName}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => setConnectUser(sol.author)}
                                    className="btn-secondary py-0.5 px-2 text-[10px] font-medium inline-flex items-center gap-1"
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
