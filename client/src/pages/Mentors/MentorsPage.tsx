import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { supabase, fetchUserConnections } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Mentor } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
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
  const { user } = useAuth();
  const navigate = useNavigate();
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

      {/* Mentors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-60 card-base animate-pulse bg-slate-100 dark:bg-dark-850" />
          ))}
        </div>
      ) : mentors.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No mentors found"
          description="Try broadening your search query or reset your expertise and industry filters."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setExpertise('ALL');
            setIndustry('ALL');
          }}
        />
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
