import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FailedStartup, RaisedSolution } from '../../types';
import { RaiseSolutionModal } from '../../components/common/RaiseSolutionModal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { SEO } from '../../components/common/SEO';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Skull,
  Lightbulb,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Compass,
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const data = await api.getFailedStartups({
        search: search.trim() || undefined,
        industry: industryFilter !== 'ALL' ? industryFilter : undefined,
      });
      setStartups(Array.isArray(data) ? data : (data as any)?.failedStartups || (data as any)?.startups || []);
    } catch (err: any) {
      console.error('Failed to load startup post-mortems:', err);
      setError(err?.message || 'Unable to connect to the failed startups archive server.');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = Boolean(search.trim() || industryFilter !== 'ALL');

  const handleResetFilters = () => {
    setSearch('');
    setIndustryFilter('ALL');
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <Skull className="text-[var(--text-secondary)]" size={24} /> The Startup Graveyard & Post-Mortems
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
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
          <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {industries.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustryFilter(ind)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                industryFilter === ind
                  ? 'bg-brand-600 text-white'
                  : 'bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] border border-[var(--border-subtle)]'
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
          <div className="h-56 card-base bg-[var(--bg-soft)]" />
          <div className="h-56 card-base bg-[var(--bg-soft)]" />
        </div>
      ) : error ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Unable to Load Post-Mortems
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-1">
            <button
              onClick={fetchFailedStartups}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        </div>
      ) : startups.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={Search}
            title="No post-mortems match your search"
            description="No archived case studies matched your current keywords or industry filter. Try clearing filters."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="card-base p-8 sm:p-10 text-center space-y-4 border-dashed border-2 border-[var(--border-subtle)] bg-[var(--bg-primary)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--bg-soft)] text-[var(--text-secondary)] flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
              <Skull size={22} />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Startup Graveyard Archive Open for Submissions
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                There are currently no public post-mortems in the archive. Founders and operators can document honest retrospectives of past ventures to highlight unresolved customer pain points, unit-economic traps, and lessons learned. Builders can study these insights to design better solutions.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/startups"
                className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <Rocket size={14} /> Explore Active Ventures
              </Link>
              <button
                onClick={fetchFailedStartups}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <RefreshCw size={13} /> Check Again
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              New startup failure case studies appear here once submitted. Check back regularly.
            </p>
          </div>
        )
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
                className="card-base overflow-hidden hover:border-[var(--border-subtle)] transition-colors"
              >
                {/* Header Strip */}
                <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base border border-rose-200/60 dark:border-rose-900/60">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-[var(--text-primary)]">
                            {item.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-soft)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {item.industry}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.summary}</p>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200/60 dark:border-rose-900/60">
                        <TrendingDown size={13} />
                        <span>{item.peakFunding} Peak Capital</span>
                      </div>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)] bg-[var(--bg-soft)] px-2.5 py-1 rounded-md font-medium border border-[var(--border-subtle)]">
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
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal bg-rose-50/40 dark:bg-rose-950/20 p-3 rounded-md border border-rose-100 dark:border-rose-900/30">
                      {item.whyItFailed}
                    </p>
                  </div>

                  {/* Lessons Learned Chips */}
                  {lessons.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                        <BookOpen size={13} /> Key Takeaways for Founders:
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {lessons.map((lesson, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-md text-xs bg-[var(--bg-soft)] text-[var(--text-secondary)] font-normal border border-[var(--border-subtle)]"
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
                    <p className="text-xs text-[var(--text-primary)] font-normal leading-relaxed">
                      "{item.unsolvedProblem}"
                    </p>
                  </div>

                  {/* BOTTOM ACTION BAR: RAISE SOLUTION + SOLUTIONS TOGGLE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() =>
                        setExpandedStartupId(isExpanded ? null : item.id)
                      }
                      className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] inline-flex items-center gap-1.5"
                    >
                      <Sparkles size={13} className="text-[var(--brand-primary)]" />
                      <span>
                        {item.solutionsCount || 0} Community Solution(s) Proposed
                      </span>
                      <span className="text-[11px] text-[var(--brand-primary)] underline ml-1">
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
                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                      <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                        Proposed Blueprints & Fixes ({item.solutions?.length || 0}):
                      </h4>
                      {(!item.solutions || item.solutions.length === 0) ? (
                        <div className="p-3.5 rounded-lg bg-[var(--bg-primary)] text-center space-y-1.5 border border-[var(--border-subtle)]">
                          <p className="text-xs text-[var(--text-muted)]">
                            No one has raised a solution for {item.name} yet. Be the first to propose how to fix it.
                          </p>
                          <button
                            onClick={() => setSelectedForSolution(item)}
                            className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                          >
                            + Raise First Solution
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.solutions.map((sol) => {
                            const isMe = Boolean(user && sol.author && (
                              String(user.id).toLowerCase() === String(sol.author.id).toLowerCase() ||
                              (user.email && sol.author.email && user.email.toLowerCase() === sol.author.email.toLowerCase())
                            ));
                            const authorName =
                              (isMe && user?.profile?.fullName) ||
                              sol.author?.profile?.fullName ||
                              sol.author?.email?.split('@')[0] ||
                              'Innovator';
                            const authorAvatar = (isMe && user?.profile?.avatar !== undefined) ? user.profile.avatar : sol.author?.profile?.avatar;
                            const isUpvoted = upvotedSolutions[sol.id];

                            return (
                              <div
                                key={sol.id}
                                className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 flex flex-col justify-between"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h5 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
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
                                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                    {sol.description}
                                  </p>
                                  {sol.differentiation && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      <strong>Moat:</strong> {sol.differentiation}
                                    </div>
                                  )}
                                </div>

                                {/* Author footer & Connect */}
                                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar
                                      src={authorAvatar}
                                      name={authorName}
                                      size="xs"
                                      className="w-4 h-4"
                                    />
                                    <span className="font-medium text-[var(--text-secondary)] truncate">
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

      {/* Permanent Educational Guide & Post-Mortem Pillars */}
      <section className="pt-8 border-t border-[var(--border-subtle)] space-y-6">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Learning from Startup Post-Mortems &amp; Market Lessons
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Study historical venture failures to avoid known unit-economic traps, execution bottlenecks, and distribution pitfalls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Why Analyze Startup Failures */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
                <ShieldAlert size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Why Study Startup Failures?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Most startups fail due to unit-economic imbalances (CAC exceeding LTV), premature scaling, co-founder misalignment, or lack of genuine market need. Documenting these failure modes prevents new founders from repeating avoidable missteps.
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                Key Topics: Unit Economics, PMF, Go-To-Market
              </span>
            </div>
          </div>

          {/* Pillar 2: Validating Enduring Problems */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
                <Compass size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Validating Unsolved Market Gaps
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Many defunct ventures successfully proved strong consumer or enterprise demand, even if the specific company collapsed due to timing or unit economics. Unsolved customer problems remain open territory for modern builders.
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <Link
                to="/problems"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
              >
                Browse Global Problems <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Pillar 3: Raising Modern Solutions */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center border border-[var(--border-subtle)]">
                <Lightbulb size={18} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Proposing Modernized Solutions
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                HookZ allows builders to raise proposed solutions against archived failures. Outline how modern AI primitives, leaner infrastructure, or alternative business models can solve the friction that defeated previous teams.
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <Link
                to="/startups"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
              >
                Explore Startups <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* 3-Step Analysis Framework */}
        <div className="card-base p-5 sm:p-6 space-y-4 bg-[var(--bg-primary)]">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            The Post-Mortem Learning Framework
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-primary)] block">Analyze Root Failure Causes</span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Isolate whether the demise was driven by distribution, burn rate, regulatory headwinds, or product friction.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-primary)] block">Identify Enduring Friction</span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Extract the unresolved core need that customers still struggle with today.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-[var(--text-primary)] block">Architect Resilient Ventures</span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Formulate a new venture premise that circumvents the fatal structural flaw of the predecessor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
