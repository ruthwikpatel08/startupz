import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Calendar,
  MapPin,
  ExternalLink,
  Award,
  Globe,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Filter,
  X,
  Share2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  RefreshCw,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react';
import { api, WorldwideOpportunity } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import { useAuth } from '../../context/AuthContext';

const POPULAR_CATEGORIES = [
  'ALL',
  'Hackathon',
  'Google Developer Event',
  'Microsoft Event',
  'AWS Workshop',
  'AI & Machine Learning Event',
  'Coding Competition',
  'Startup Competition',
  'Certificate Programme',
  'Technical Workshop',
  'Student Developer Programme',
  'Internship & Learning Opportunity',
];

type Statement = { title: string; description: string; tags?: string[]; sourceUrl?: string };

export const OpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const hasAdminAccess = Boolean(user?.isAdmin || isLocalDev);

  // Top navigation: Opportunities vs Problem Statements
  const [activeMainTab, setActiveMainTab] = useState<'opportunities' | 'problems'>('opportunities');

  // Worldwide Opportunities state
  const [opportunities, setOpportunities] = useState<WorldwideOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMode, setSelectedMode] = useState('ALL');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedPrice, setSelectedPrice] = useState('ALL');
  const [sortBy, setSortBy] = useState<'upcoming' | 'deadline' | 'newest'>('upcoming');

  // Modal detail view
  const [selectedOpportunity, setSelectedOpportunity] = useState<WorldwideOpportunity | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalActive: 0,
    totalOnline: 0,
    totalFree: 0,
    countriesCount: 0,
  });

  // Problem Statements section state
  const [problemDomain, setProblemDomain] = useState('Education');
  const [problemStatements, setProblemStatements] = useState<Statement[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [loadedProblems, setLoadedProblems] = useState(false);

  const generateProblemStatements = async () => {
    setLoadingProblems(true);
    setProblemError('');
    try {
      const result = await api.discoverAIProblems(`${problemDomain}: accessible real-world problems for student hackathons and collaborative projects`);
      if (!Array.isArray(result.problems)) throw new Error('Invalid problem response');
      setProblemStatements(result.problems.filter((p) => typeof p.title === 'string' && typeof p.description === 'string'));
      setLoadedProblems(true);
    } catch {
      setProblemError('Problem statements could not be loaded. Please try again.');
    } finally {
      setLoadingProblems(false);
    }
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getWorldwideOpportunities({
        search: searchQuery || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        mode: selectedMode !== 'ALL' ? selectedMode : undefined,
        country: selectedCountry !== 'ALL' ? selectedCountry : undefined,
        price: selectedPrice !== 'ALL' ? selectedPrice : undefined,
        sort: sortBy,
        limit: 50,
      });

      if (res && Array.isArray(res.opportunities)) {
        setOpportunities(res.opportunities);
        if (res.metrics) {
          setMetrics({
            totalActive: res.metrics.totalActive || res.opportunities.length,
            totalOnline: res.metrics.totalOnline || 0,
            totalFree: res.metrics.totalFree || 0,
            countriesCount: res.metrics.countriesCount || 0,
          });
        }
      } else {
        setOpportunities([]);
      }
    } catch (err: any) {
      console.error('Failed to load worldwide opportunities:', err);
      setError('Could not load opportunities at this moment. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [selectedCategory, selectedMode, selectedCountry, selectedPrice, sortBy]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOpportunities();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Distinct countries from currently loaded items
  const distinctCountries = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      if (o.country && o.country !== 'Worldwide') set.add(o.country);
    });
    return Array.from(set).sort();
  }, [opportunities]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedMode('ALL');
    setSelectedCountry('ALL');
    setSelectedPrice('ALL');
    setSortBy('upcoming');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'ALL' ||
    selectedMode !== 'ALL' ||
    selectedCountry !== 'ALL' ||
    selectedPrice !== 'ALL';

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBA';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate days remaining helper
  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - Date.now();
    if (diff <= 0) return 'Deadline passed';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 1) return 'Closes today';
    if (days <= 7) return `Closes in ${days} days`;
    return `Deadline: ${formatDate(deadlineStr)}`;
  };

  const handleShare = (opp: WorldwideOpportunity) => {
    if (navigator.share) {
      navigator.share({
        title: opp.title,
        text: `Check out ${opp.title} on HookZ Opportunities!`,
        url: opp.registration_url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(opp.registration_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Opportunities & Problem Statements | HookZ"
        description="Discover worldwide hackathons, developer programmes, and real-world problem statements for student builders."
      />

      {/* Main Mode Switcher: Opportunities vs Problem Statements */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="inline-flex p-1 rounded-2xl bg-[var(--card-hover)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold shadow-inner">
          <button
            onClick={() => setActiveMainTab('opportunities')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-2 ${
              activeMainTab === 'opportunities'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Worldwide Opportunities & Events</span>
          </button>

          <button
            onClick={() => setActiveMainTab('problems')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl transition-all duration-150 inline-flex items-center gap-2 ${
              activeMainTab === 'problems'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Problem Statements</span>
          </button>
        </div>

        {hasAdminAccess && (
          <Link
            to="/admin?tab=opportunities"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin: Verify & Manage Opportunities &rarr;</span>
          </Link>
        )}
      </div>

      {/* TAB 1: WORLDWIDE OPPORTUNITIES & EVENTS */}
      {activeMainTab === 'opportunities' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/10 via-sky-600/10 to-indigo-600/10 border border-[var(--border-subtle)] p-6 sm:p-10 backdrop-blur-sm">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Globe className="w-3.5 h-3.5" />
                <span>GLOBAL STUDENT & FOUNDER DISCOVERY</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Worldwide Opportunities & Events
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
                Discover verified global hackathons, Google Developer summits, Microsoft Reactor series, AWS workshops, AI competitions, and certificate programmes across India, North America, Europe, and worldwide.
              </p>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]/60">
                <div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {metrics.totalActive || opportunities.length}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Active Opportunities</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                    {metrics.totalOnline || opportunities.filter((o) => o.participation_mode === 'ONLINE').length}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Online & Virtual</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {metrics.totalFree || opportunities.filter((o) => o.price_type === 'FREE').length}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">100% Free Access</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {metrics.countriesCount || distinctCountries.length || 'Worldwide'}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">Global Regions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Secondary Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search hackathons, Google events, AWS, AI, skills, cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mode Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                >
                  <option value="ALL">All Modes</option>
                  <option value="ONLINE">Online / Virtual</option>
                  <option value="OFFLINE">In-Person</option>
                  <option value="HYBRID">Hybrid</option>
                </select>

                {/* Country Dropdown */}
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                >
                  <option value="ALL">All Countries</option>
                  <option value="Worldwide">Worldwide / Global</option>
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  {distinctCountries
                    .filter((c) => !['Worldwide', 'India', 'United States', 'United Kingdom', 'Germany', 'Singapore', 'Canada', 'Australia'].includes(c))
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>

                {/* Price Dropdown */}
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                >
                  <option value="ALL">Any Price</option>
                  <option value="FREE">Free Only</option>
                  <option value="PAID">Paid / Sponsored</option>
                </select>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                >
                  <option value="upcoming">Sort: Earliest Start Date</option>
                  <option value="deadline">Sort: Registration Deadline</option>
                  <option value="newest">Sort: Recently Added</option>
                </select>
              </div>
            </div>

            {/* Category Pills Slider */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
              {POPULAR_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-emerald-500/40 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Opportunities' : cat}
                  </button>
                );
              })}
            </div>

            {/* Filter Summary & Reset */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
                <span>
                  Showing {opportunities.length} filtered opportunities
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-emerald-600 hover:text-emerald-500 font-medium hover:underline inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={fetchOpportunities}
                className="px-3 py-1 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 space-y-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-24 h-5 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="w-16 h-5 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div className="w-3/4 h-6 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="w-1/2 h-4 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="space-y-2 pt-2">
                    <div className="w-full h-3 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="w-5/6 h-3 rounded bg-gray-200 dark:bg-gray-800" />
                  </div>
                  <div className="w-full h-9 rounded bg-gray-200 dark:bg-gray-800 pt-4" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && opportunities.length === 0 && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-12 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                No opportunities matched your criteria
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Try adjusting your search query, switching back to "All Categories", or clearing specific filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition shadow-sm"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Opportunities Grid */}
          {!loading && opportunities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) => {
                const deadlineInfo = getDaysRemaining(opp.registration_deadline);
                const isOnline = opp.participation_mode === 'ONLINE';

                return (
                  <div
                    key={opp.id}
                    className="group flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] hover:border-emerald-500/40 hover:shadow-lg transition-all duration-200 p-6 relative overflow-hidden"
                  >
                    {/* Top Badges */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {opp.category}
                        </span>

                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isOnline
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : opp.participation_mode === 'HYBRID'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {opp.participation_mode === 'ONLINE'
                            ? '🌐 Online'
                            : opp.participation_mode === 'HYBRID'
                            ? '⚡ Hybrid'
                            : '📍 In-Person'}
                        </span>
                      </div>

                      {/* Organizer & Logo */}
                      <div className="flex items-center gap-3 pt-1">
                        {opp.organizer_logo_url && opp.logo_permission_status === 'VERIFIED_PERMITTED' ? (
                          <img
                            src={opp.organizer_logo_url}
                            alt={opp.organizer_name}
                            className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 border border-[var(--border-subtle)]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {opp.organizer_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-1">
                            <span>{opp.organizer_name}</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{opp.location || opp.country}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <h3
                        onClick={() => setSelectedOpportunity(opp)}
                        className="text-lg font-bold text-[var(--text-primary)] hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer line-clamp-2 pt-1"
                      >
                        {opp.title}
                      </h3>

                      {/* Description snippet */}
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {opp.description_summary}
                      </p>

                      {/* Dates & Deadline Info */}
                      <div className="space-y-1.5 pt-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)]/60">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>
                            {formatDate(opp.start_date)}
                            {opp.end_date && opp.end_date !== opp.start_date ? ` – ${formatDate(opp.end_date)}` : ''}
                          </span>
                        </div>

                        {deadlineInfo && (
                          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{deadlineInfo}</span>
                          </div>
                        )}
                      </div>

                      {/* Skills Pills */}
                      {Array.isArray(opp.skills_required) && opp.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {opp.skills_required.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="text-[10px] px-2 py-0.5 rounded bg-[var(--card-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                            >
                              {skill}
                            </span>
                          ))}
                          {opp.skills_required.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-[var(--text-muted)]">
                              +{opp.skills_required.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Card Footer */}
                    <div className="pt-5 mt-4 border-t border-[var(--border-subtle)] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {opp.price_type === 'FREE' ? 'FREE' : `${opp.currency} ${opp.price_amount}`}
                        </span>

                        {opp.certificate_available && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            <Award className="w-3.5 h-3.5" />
                            Certificate
                          </span>
                        )}
                      </div>

                      {/* Buttons Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedOpportunity(opp)}
                          className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--card-hover)] text-[var(--text-primary)] text-xs font-semibold transition text-center"
                        >
                          View Details
                        </button>

                        <a
                          href={opp.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>Register</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROBLEM STATEMENTS & CHALLENGES */}
      {activeMainTab === 'problems' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600/10 via-indigo-600/10 to-purple-600/10 border border-[var(--border-subtle)] p-6 sm:p-10 backdrop-blur-sm">
            <div className="max-w-3xl space-y-4">
              <span className="text-xs font-semibold tracking-widest text-[var(--brand-primary)]">
                BUILD SOMETHING THAT MATTERS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                Hackathon Problem Statements & Challenges
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Find a real-world crisis worth solving. Explore AI-curated hackathon challenge statements and research themes for student developers, founders, and co-founders.
              </p>

              {/* Generator Controls */}
              <div className="flex flex-wrap items-end gap-3 pt-4">
                <div>
                  <label htmlFor="problem-domain" className="block text-xs font-semibold mb-1.5 text-[var(--text-primary)]">
                    Domain / Sector
                  </label>
                  <select
                    id="problem-domain"
                    className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={problemDomain}
                    onChange={(e) => setProblemDomain(e.target.value)}
                    disabled={loadingProblems}
                  >
                    {['Education', 'Accessibility', 'Climate & Sustainability', 'Healthcare', 'Agriculture & Food', 'Campus Life & Student Tech', 'FinTech & Web3'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition inline-flex items-center gap-2 shadow-sm disabled:opacity-60"
                  onClick={generateProblemStatements}
                  disabled={loadingProblems}
                >
                  {loadingProblems ? (
                    <RefreshCw className="animate-spin w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {loadingProblems ? 'Generating challenges…' : loadedProblems ? 'Refresh Statements' : 'Generate Statements'}
                </button>

                <Link
                  to="/problems"
                  className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-xs font-semibold text-[var(--text-primary)] transition inline-flex items-center gap-1.5 ml-auto"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                  <span>Browse Full UN/SDG Problem Library &rarr;</span>
                </Link>
              </div>
            </div>
          </div>

          {problemError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm">
              {problemError}
            </div>
          )}

          {loadingProblems && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-12 text-center space-y-3">
              <RefreshCw className="animate-spin w-6 h-6 mx-auto text-emerald-500" />
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Finding accessible hackathon challenges your team can tackle…
              </p>
            </div>
          )}

          {!loadingProblems && !problemStatements.length && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-12 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)]">
                {loadedProblems ? 'No statements found for this sector' : 'Your next project starts with a real-world question.'}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Select an impact domain above and click "Generate Statements" to discover actionable problem briefs.
              </p>
            </div>
          )}

          {!loadingProblems && problemStatements.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {problemStatements.map((p, i) => {
                let source = '';
                try {
                  const url = new URL(p.sourceUrl || '');
                  if (['https:', 'http:'].includes(url.protocol)) source = url.href;
                } catch {}

                return (
                  <article
                    key={`${p.title}-${i}`}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6 flex flex-col justify-between gap-4 hover:border-sky-500/40 hover:shadow-lg transition duration-200"
                  >
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">
                        CHALLENGE {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] leading-snug">
                        {p.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-4">
                        {p.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string') : [])
                          .slice(0, 4)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[var(--brand-primary)] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </div>

                    <details className="text-xs mt-auto pt-3 border-t border-[var(--border-subtle)] group">
                      <summary className="font-semibold text-[var(--brand-primary)] cursor-pointer hover:underline list-none flex items-center justify-between">
                        <span>Read complete statement</span>
                        <span className="text-[10px] text-[var(--text-muted)] group-open:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="mt-3 space-y-3 text-[var(--text-secondary)]">
                        <p className="leading-relaxed whitespace-pre-line">{p.description}</p>
                        {source && (
                          <a
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex gap-1.5 items-center text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                          >
                            <span>Read source brief</span>
                            <ArrowUpRight size={13} />
                          </a>
                        )}
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    {selectedOpportunity.category}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400">
                    {selectedOpportunity.participation_mode}
                  </span>
                  {selectedOpportunity.certificate_available && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Certificate Provided
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                  {selectedOpportunity.title}
                </h2>

                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedOpportunity.organizer_name}
                  </span>
                  <span>•</span>
                  <span>{selectedOpportunity.location || selectedOpportunity.country}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOpportunity(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dates & Timeline Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--card-hover)] border border-[var(--border-subtle)] text-xs">
              <div className="space-y-1">
                <span className="text-[var(--text-muted)]">Event Dates:</span>
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  {formatDate(selectedOpportunity.start_date)}
                  {selectedOpportunity.end_date ? ` – ${formatDate(selectedOpportunity.end_date)}` : ''}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[var(--text-muted)]">Registration Deadline:</span>
                <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(selectedOpportunity.registration_deadline)}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                About this Opportunity
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {selectedOpportunity.description_summary}
              </p>
            </div>

            {/* Eligibility */}
            {selectedOpportunity.eligibility && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Eligibility & Requirements
                </h4>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {selectedOpportunity.eligibility}
                </p>
              </div>
            )}

            {/* Skills & Technologies */}
            {Array.isArray(selectedOpportunity.skills_required) && selectedOpportunity.skills_required.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Relevant Topics & Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedOpportunity.skills_required.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-1 rounded-md bg-[var(--card-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attribution Notice */}
            <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-500/15 text-xs text-[var(--text-secondary)] space-y-1">
              <div className="font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Direct Redirection Notice</span>
              </div>
              <p>
                HookZ directly redirects students and founders to the original organizer's official portal. No fake internal forms or fees are applied.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => handleShare(selectedOpportunity)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--card-hover)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center gap-2 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? 'Link Copied!' : 'Share Opportunity'}
              </button>

              <a
                href={selectedOpportunity.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-md"
              >
                <span>Register on Organizer Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
