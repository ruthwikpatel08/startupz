import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ConnectModal } from '../common/ConnectModal';
import { StartupConnectionModal } from '../common/StartupConnectionModal';
import { ScheduleMeetingModal } from '../common/ScheduleMeetingModal';
import {
  Sparkles,
  Bot,
  Search,
  UserPlus,
  Rocket,
  Video,
  ExternalLink,
  ArrowRight,
  CheckCircle,
  Tag,
  Briefcase,
  MapPin,
  Flame,
  X,
} from 'lucide-react';

interface AIScoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIScoutModal: React.FC<AIScoutModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sub-modals for 1-click actions
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [proposalUser, setProposalUser] = useState<any | null>(null);
  const [meetingUser, setMeetingUser] = useState<any | null>(null);

  const samplePrompts = [
    'Technical co-founder with React and AI experience in Bangalore',
    'Founding designer who knows Figma and branding for B2B SaaS',
    'Fintech product manager with payments and growth marketing background',
    'AI engineer specializing in LLMs and Python backend systems',
  ];

  const handleSearch = async (promptText?: string) => {
    const q = promptText || query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await api.aiFindPeople(q.trim());
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'AI Scout could not process your query.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="AI Scout — Talent & Co-Founder Matcher"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Header Description */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shrink-0 border border-brand-200/60 dark:border-brand-900/60">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                Describe desired skills, role, or background in natural language
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                AI Scout scans member profiles, endorsements, startup interests, and availability to locate compatible collaborators.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Next.js dev, AI co-founder, FinTech PM in Bangalore..."
                className="w-full pl-10 pr-40 sm:pr-44 py-2.5 text-xs sm:text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20"
              />
              <Search
                size={16}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <div className="absolute right-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loading ? (
                    <span className="text-xs animate-spin">⏳</span>
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{loading ? 'Searching...' : 'Find Matches'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close AI Scout"
                  aria-label="Close AI Scout"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Quick Inspiration Prompts */}
            {!results && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Quick Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(p);
                        handleSearch(p);
                      }}
                      className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-600 hover:text-brand-600 dark:hover:border-brand-500 border border-slate-200 dark:border-slate-800 transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* AI Understanding Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    Match filters:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold text-[11px] border border-brand-200 dark:border-brand-900">
                    {results.interpretation?.detectedRole || 'Startup Talent'}
                  </span>
                  {results.interpretation?.detectedSkills?.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-normal"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <span className="text-slate-500 text-[11px]">
                  {results.results?.length || 0} candidate(s) found
                </span>
              </div>

              {/* Candidate Cards */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {results.results?.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      No exact match found for these requirements.
                    </p>
                    <button
                      onClick={() => navigate('/cofounders')}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Browse full Talent Directory →
                    </button>
                  </div>
                ) : (
                  results.results.map((candidate: any) => {
                    const profile = candidate.profile || {};
                    const name = profile.fullName || candidate.email?.split('@')[0] || 'Anonymous';
                    const avatar =
                      profile.avatar ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=2457d6`;
                    const skillsList = profile.skills
                      ? profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [];

                    return (
                      <div
                        key={candidate.id}
                        className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={avatar}
                              alt={name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4
                                  onClick={() => {
                                    onClose();
                                    navigate(`/profile/${candidate.id}`);
                                  }}
                                  className="text-xs font-semibold text-slate-900 dark:text-white hover:text-brand-600 cursor-pointer"
                                >
                                  {name}
                                </h4>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                                  {candidate.matchScore || 92}% Match
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1">
                                {profile.headline || 'Startup Enthusiast & Builder'}
                              </p>
                              {profile.location && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <MapPin size={11} /> {profile.location}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                            <button
                              onClick={() => setConnectUser(candidate)}
                              className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              title="Connect"
                            >
                              <UserPlus size={12} />
                              <span>Connect</span>
                            </button>
                            <button
                              onClick={() => setProposalUser(candidate)}
                              className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              title="Pitch Co-Founding"
                            >
                              <Rocket size={12} />
                              <span>Pitch</span>
                            </button>
                            <button
                              onClick={() => setMeetingUser(candidate)}
                              className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              title="Schedule Meeting"
                            >
                              <Video size={12} />
                              <span>Call</span>
                            </button>
                          </div>
                        </div>

                        {/* AI Match Reason */}
                        {candidate.reason && (
                          <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                            <Sparkles size={13} className="shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
                            <span>
                              <strong>Match rationale:</strong> {candidate.reason}
                            </span>
                          </div>
                        )}

                        {/* Skills Chips */}
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skillsList.slice(0, 6).map((sk: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Sub Modals */}
      {connectUser && (
        <ConnectModal
          isOpen={!!connectUser}
          onClose={() => setConnectUser(null)}
          targetUser={connectUser}
        />
      )}

      {proposalUser && (
        <StartupConnectionModal
          isOpen={!!proposalUser}
          onClose={() => setProposalUser(null)}
          targetUser={proposalUser}
        />
      )}

      {meetingUser && (
        <ScheduleMeetingModal
          isOpen={!!meetingUser}
          onClose={() => setMeetingUser(null)}
          targetUser={meetingUser}
        />
      )}
    </>
  );
};
