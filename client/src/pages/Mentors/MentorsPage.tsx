import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Mentor } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConnectModal } from '../../components/common/ConnectModal';
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
} from 'lucide-react';

export const MentorsPage: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (expertise !== 'ALL') params.append('expertise', expertise);
      if (industry !== 'ALL') params.append('industry', industry);

      const res = await api.getMentors(params.toString());
      setMentors(res.mentors || []);
    } catch (err) {
      console.error('Failed to load mentors:', err);
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

  const handleOpenRequest = (mentor: Mentor) => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <GraduationCap size={15} /> Startup Mentorship
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Learn from seasoned operators & serial founders.
          </h1>
          <p className="text-sm sm:text-base text-amber-100 leading-relaxed">
            Connect 1-on-1 with vetted mentors who have built, scaled, and exited startups. Get honest feedback on pitch decks, architecture, and go-to-market execution.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search size={17} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by mentor name, topic, or company..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-1/2 md:w-48">
            <select
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Industries</option>
              {industryOptions.filter((i) => i !== 'ALL').map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mentors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No mentors found"
          description="Try broadening your search query or reset your expertise and industry filters."
          actionText="Reset Filters"
          onAction={() => {
            setSearch('');
            setExpertise('ALL');
            setIndustry('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => {
            const mentorName = mentor.user?.profile?.fullName || 'Distinguished Mentor';
            const avatar = mentor.user?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${mentorName}`;
            const headline = mentor.user?.profile?.headline || `${mentor.yearsExperience}+ Years Startup Experience`;
            const topics = mentor.mentoringTopics ? mentor.mentoringTopics.split(',').map((t) => t.trim()) : [];
            const industries = mentor.industries ? mentor.industries.split(',').map((i) => i.trim()) : [];

            return (
              <div
                key={mentor.id}
                className="flex flex-col justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all group"
              >
                <div className="space-y-4">
                  {/* Top: Avatar, Name, Verification */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={mentorName}
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {mentorName}
                          </h3>
                          <VerificationBadge badge="Verified Mentor" isVerified={mentor.isVerified} size="sm" />
                          {mentor.website && (
                            <a
                              href={mentor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-amber-500 transition-colors p-0.5 rounded"
                              title="Official Advisory Portal / Website"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{headline}</p>
                      </div>
                    </div>
                  </div>

                  {/* About snippet */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {mentor.about}
                  </p>

                  {/* Highlights: Available Hours & Experience */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-500" />
                      <span>{mentor.availableHours || '2-4 hrs/mo'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award size={14} className="text-brand-500" />
                      <span>{mentor.yearsExperience} yrs exp</span>
                    </div>
                  </div>

                  {/* Expertise Topics */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Mentoring Focus
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {topics.slice(0, 3).map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-medium border border-amber-200 dark:border-amber-800/60"
                        >
                          {topic}
                        </span>
                      ))}
                      {topics.length > 3 && (
                        <span className="text-[11px] text-slate-400 font-medium self-center">
                          +{topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenRequest(mentor)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5"
                  >
                    <BookOpen size={14} />
                    <span>Request Mentorship</span>
                  </button>

                  <button
                    onClick={() => setConnectUser(mentor.user || { id: mentor.userId, profile: { fullName: mentorName, avatar, headline } })}
                    title="Send Connection"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mentorship Request Modal */}
      {selectedMentor && (
        <Modal
          isOpen={!!selectedMentor}
          onClose={() => setSelectedMentor(null)}
          title={`Request Mentorship with ${selectedMentor.user?.profile?.fullName || 'Mentor'}`}
          maxWidth="lg"
        >
          {requestSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mentorship Request Sent!</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                The mentor has been notified. You will receive an alert once they accept your session request.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                💡 Mentors donate their time to support founders. Be specific about your current roadblocks and challenges.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Select Mentoring Topic *
                </label>
                <select
                  value={requestTopic}
                  onChange={(e) => setRequestTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Context & What You Need Help With *
                </label>
                <textarea
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce your startup, your current traction or phase, and the specific 1-2 questions you'd love guidance on..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {requestError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {requestError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
                >
                  <Send size={15} />
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
