import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { supabase, fetchUserConnections } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Mentor } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
import { SEO } from '../../components/common/SEO';
import {
  GraduationCap,
  Search,
  Filter,
  Clock,
  Briefcase,
  Sparkles,
  Send,
  CheckCircle,
  Award,
  BookOpen,
  UserPlus,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Compass,
} from 'lucide-react';

export const MentorsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expertise, setExpertise] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');

  // Request Mentorship Modal State
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Connect Modal State
  const [connectUser, setConnectUser] = useState<any | null>(null);

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (expertise !== 'ALL') params.append('expertise', expertise);
      if (industry !== 'ALL') params.append('industry', industry);

      const res = await api.getMentors(params.toString());

      let connectedIds = new Set<string>();
      if (user?.id) {
        const connData = await fetchUserConnections(user.id).catch(() => null);
        if (connData?.connectedIds) {
          connectedIds = connData.connectedIds;
        }
      }

      const clean = (res.mentors || []).filter((m: any) => {
        if (isDemoRecord(m)) return false;
        if (user) {
          if (m.userId === user.id || m.user?.id === user.id || m.id === user.id) return false;
          if (user.email && m.user?.email && m.user.email.toLowerCase() === user.email.toLowerCase()) return false;
          if (connectedIds.has(m.userId) || connectedIds.has(m.user?.id) || connectedIds.has(m.id)) return false;
          if (m.connectionStatus === 'CONNECTED' || m.connectionStatus === 'ACCEPTED') return false;
        }
        return true;
      });
      setMentors(clean);
    } catch (err: any) {
      console.error('Failed to load mentors:', err);
      setError(err?.message || 'Unable to connect to the mentorship directory server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMentors();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, expertise, industry]);

  const hasActiveFilters = Boolean(search.trim() || expertise !== 'ALL' || industry !== 'ALL');

  const handleResetFilters = () => {
    setSearch('');
    setExpertise('ALL');
    setIndustry('ALL');
  };

  const handleOpenRequest = (mentor: Mentor) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedMentor(mentor);
    const topics = mentor.mentoringTopics ? mentor.mentoringTopics.split(',').map((t) => t.trim()) : [];
    setRequestTopic(topics[0] || 'Fundraising Strategy');
    setRequestMessage('');
    setRequestError(null);
    setRequestSuccess(false);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;
    if (!requestMessage.trim()) {
      setRequestError('Please provide a message outlining what you need guidance on.');
      return;
    }

    setSubmittingRequest(true);
    setRequestError(null);
    try {
      await api.requestMentorship(selectedMentor.id, {
        topic: requestTopic,
        message: requestMessage.trim(),
      });
      setRequestSuccess(true);
      setTimeout(() => {
        setSelectedMentor(null);
        setRequestSuccess(false);
      }, 1800);
    } catch (err: any) {
      setRequestError(err.message || 'Failed to submit mentorship request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const expertiseOptions = [
    'ALL',
    'Fundraising & Pitching',
    'Product Strategy & MVP',
    'Go-To-Market & Growth',
    'Engineering & Tech Architecture',
    'AI & Machine Learning',
    'Hiring & Leadership',
  ];

  const industryOptions = [
    'ALL',
    'SaaS',
    'Artificial Intelligence',
    'Fintech',
    'Healthtech',
    'E-commerce',
    'ClimateTech',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title="Find Startup Mentors | HookZ"
        description="Connect 1-on-1 with vetted mentors who have built, scaled, and exited startups. Get actionable feedback on fundraising, architecture, and go-to-market."
        canonicalPath="/mentors"
        breadcrumbs={[{ name: 'Mentors', path: '/mentors' }]}
      />
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="text-brand-600 dark:text-brand-400" size={24} /> Startup Mentorship & Advisory
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Connect 1-on-1 with vetted mentors who have built, scaled, and exited startups. Get actionable feedback on fundraising, architecture, and go-to-market.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base p-3 flex flex-col md:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mentor name, topic, or company..."
            className="input-base pl-9 pr-3 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="w-1/2 md:w-48">
            <select
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="input-base py-1.5 px-2.5 text-xs"
            >
              <option value="ALL">All Expertise</option>
              {expertiseOptions.filter((e) => e !== 'ALL').map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="w-1/2 md:w-44">
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input-base py-1.5 px-2.5 text-xs"
            >
              <option value="ALL">All Industries</option>
              {industryOptions.filter((i) => i !== 'ALL').map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mentors Grid / Loading / Error / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-60 card-base animate-pulse bg-slate-100 dark:bg-dark-850" />
          ))}
        </div>
      ) : error ? (
        <div className="card-base p-8 text-center space-y-3 border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Unable to Load Mentors
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {error}
          </p>
          <div className="pt-1">
            <button
              onClick={fetchMentors}
              className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
            >
              <RefreshCw size={13} /> Retry Connection
            </button>
          </div>
        </div>
      ) : mentors.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            icon={Search}
            title="No matching mentors found"
            description="No registered mentors matched your current search and filter criteria. Try adjusting your search query, or select 'All Expertise' and 'All Industries'."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="card-base p-8 sm:p-10 text-center space-y-4 border-dashed border-2 border-slate-300 dark:border-dark-700 bg-slate-50/40 dark:bg-dark-850/40">
            <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-200/60 dark:border-brand-900/60">
              <GraduationCap size={22} />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Startup Mentorship Directory Open for Registration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                There are currently no public mentor profiles listed in the directory. If you are an experienced founder, technical leader, or operator interested in advising early-stage teams, you can register your mentorship profile to connect with founders across the HookZ network. Early-stage builders can check back regularly as verified advisors join.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/profile"
                className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <Award size={14} /> Register as a Mentor
              </Link>
              <button
                onClick={fetchMentors}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <RefreshCw size={13} /> Check Again
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              New mentor listings appear here automatically once approved. Check back regularly.
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((mentor) => {
            const mentorName = mentor.user?.profile?.fullName || 'Distinguished Mentor';
            const headline = mentor.user?.profile?.headline || `${mentor.yearsExperience}+ Years Startup Experience`;
            const topics = mentor.mentoringTopics ? mentor.mentoringTopics.split(',').map((t) => t.trim()) : [];
            const industries = mentor.industries ? mentor.industries.split(',').map((i) => i.trim()) : [];

            return (
              <div
                key={mentor.id}
                className="card-base p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top: Avatar, Name, Verification */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={mentor.user?.profile?.avatar}
                        name={mentorName}
                        size="md"
                        className="!w-11 !h-11 rounded-lg"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {mentorName}
                          </h3>
                          <VerificationBadge badge="Verified Mentor" isVerified={mentor.isVerified} size="sm" />
                          {mentor.website && (
                            <a
                              href={mentor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-brand-600 transition-colors p-0.5 rounded"
                              title="Official Advisory Portal / Website"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{headline}</p>
                      </div>
                    </div>
                  </div>

                  {/* About snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {mentor.about}
                  </p>

                  {/* Highlights: Available Hours & Experience */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>{mentor.availableHours || '2-4 hrs/mo'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={13} className="text-slate-400" />
                      <span>{mentor.yearsExperience} yrs exp</span>
                    </div>
                  </div>

                  {/* Expertise Topics */}
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 mb-1 block">
                      Mentoring Focus
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {topics.slice(0, 3).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 text-[10px] font-medium border border-slate-200/60 dark:border-dark-800"
                        >
                          {topic}
                        </span>
                      ))}
                      {topics.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-medium self-center">
                          +{topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenRequest(mentor)}
                    className="btn-primary flex-1 py-1.5 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <BookOpen size={13} />
                    <span>Request Mentorship</span>
                  </button>

                  <button
                    onClick={() => setConnectUser((mentor.user as any) || { id: mentor.userId, profile: { fullName: mentorName, avatar: (mentor.user as any)?.profile?.avatar, headline } })}
                    title="Send Connection"
                    className="btn-secondary p-1.5 text-xs font-medium"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent Directory Guide & Educational Pillars */}
      <section className="pt-8 border-t border-slate-200/80 dark:border-dark-800 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Startup Mentorship &amp; Advisory on HookZ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Learn how early-stage founders connect with seasoned advisors and how operators contribute to breakout ventures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Strategic Advisory Focus Areas */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-900/40">
                <Compass size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                What Startup Mentors Provide
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect for direct, 1-on-1 feedback on pitch narratives, technical architecture, product-market fit validation, and go-to-market execution. Gain perspective from operators who have navigated early-stage pivots and fundraising milestones.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Focus Areas: Fundraising, GTM, Product MVP, Architecture
              </span>
            </div>
          </div>

          {/* Pillar 2: How Founders Request Guidance */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                <BookOpen size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                How Founders Seek Guidance
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Browse advisors by domain expertise and industry. Review proven track records and submit structured mentorship requests outlining your venture's current stage, key bottlenecks, and the specific questions you want to discuss.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/startups"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Explore Ventures <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Pillar 3: How Experienced Operators Participate */}
          <div className="card-base p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40">
                <Award size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                How Operators Join as Mentors
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Founders, engineering leaders, and growth specialists can register as mentors, define their advisory availability, and select preferred industries. Mentor contributions help cultivate the next generation of student-led startups.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-dark-800">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Join as Mentor <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* 3-Step Mentorship Engagement Workflow */}
        <div className="card-base p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-dark-850/50">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            How Mentorship Engagement Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Identify Domain Specialists</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Filter advisors by specific startup needs, from technical architecture to pre-seed pitch review.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Submit Targeted Requests</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Provide crisp context on your product, traction, and the exact 1-2 hurdles where advisory input is critical.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div className="space-y-1">
                <span className="font-semibold text-slate-900 dark:text-white block">Collaborate Directly</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Connect 1-on-1, exchange structured feedback, and build ongoing advisor relationships without platform gatekeeping.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentorship Request Modal */}
      {selectedMentor && (
        <Modal
          isOpen={!!selectedMentor}
          onClose={() => setSelectedMentor(null)}
          title={`Request Mentorship with ${selectedMentor.user?.profile?.fullName || 'Mentor'}`}
          maxWidth="lg"
        >
          {requestSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Mentorship Request Sent!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The mentor has been notified. You will receive an alert once they accept your session request.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                Mentors volunteer their time to guide founders. Be specific about your current roadblocks and challenges.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Mentoring Topic *
                </label>
                <select
                  value={requestTopic}
                  onChange={(e) => setRequestTopic(e.target.value)}
                  className="input-base py-2 px-3 text-xs"
                >
                  {selectedMentor.mentoringTopics
                    ? selectedMentor.mentoringTopics.split(',').map((t, idx) => (
                        <option key={idx} value={t.trim()}>
                          {t.trim()}
                        </option>
                      ))
                    : <option value="Startup Strategy">Startup Strategy</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Context & What You Need Help With *
                </label>
                <textarea
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce your startup, your current traction or phase, and the specific 1-2 questions you'd love guidance on..."
                  rows={4}
                  className="input-base py-2 px-3 text-xs"
                />
              </div>

              {requestError && (
                <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900">
                  {requestError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="btn-secondary py-1.5 px-3 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="btn-primary py-1.5 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Send size={13} />
                  {submittingRequest ? 'Sending...' : 'Send Mentorship Request'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        user={connectUser}
      />
    </div>
  );
};
