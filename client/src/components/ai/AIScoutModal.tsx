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
        title="🤖 AI Scout — Intelligent Startup Matcher"
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Header Description */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-600/10 via-purple-600/10 to-indigo-600/10 border border-brand-500/20 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shrink-0 shadow-md">
              <Bot size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Describe your dream team member or co-founder in natural language
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI Scout scans profiles, verified skill endorsements, startup interests, and availability to find the best match for your venture.
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
                placeholder="e.g. I need a technical co-founder skilled in Next.js and PyTorch to build a healthtech app..."
                className="w-full pl-10 pr-28 py-3 text-xs sm:text-sm rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
              />
              <Search
                size={18}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="absolute right-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? (
                  <span className="animate-spin text-xs">🌀</span>
                ) : (
                  <Sparkles size={14} />
                )}
                <span>{loading ? 'Scanning...' : 'Find Matches'}</span>
              </button>
            </div>

            {/* Quick Inspiration Prompts */}
            {!results && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
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
                      className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-4 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* AI Understanding Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    AI Match Summary:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                    {results.interpretation?.detectedRole || 'Startup Talent'}
                  </span>
                  {results.interpretation?.detectedSkills?.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <span className="text-slate-400 text-[11px]">
                  Found {results.results?.length || 0} top candidate(s)
                </span>
              </div>

              {/* Candidate Cards */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {results.results?.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      No exact match found for these requirements yet.
                    </p>
                    <button
                      onClick={() => navigate('/cofounders')}
                      className="text-xs font-bold text-brand-600 hover:underline"
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
                      `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
                    const skillsList = profile.skills
                      ? profile.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [];

                    return (
                      <div
                        key={candidate.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 shadow-sm transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={avatar}
                              alt={name}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4
                                  onClick={() => {
                                    onClose();
                                    navigate(`/profile/${candidate.id}`);
                                  }}
                                  className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-600 cursor-pointer"
                                >
                                  {name}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  {candidate.matchScore || 92}% Match
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1 font-medium">
                                {profile.headline || 'Startup Enthusiast & Builder'}
                              </p>
                              {profile.location && (
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <MapPin size={12} /> {profile.location}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() => setConnectUser(candidate)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors flex items-center gap-1"
                              title="Connect"
                            >
                              <UserPlus size={13} />
                              <span>Connect</span>
                            </button>
                            <button
                              onClick={() => setProposalUser(candidate)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 transition-colors flex items-center gap-1 shadow-sm"
                              title="Co-Found a Company"
                            >
                              <Rocket size={13} />
                              <span>Pitch</span>
                            </button>
                            <button
                              onClick={() => setMeetingUser(candidate)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 transition-colors flex items-center gap-1"
                              title="Video Call"
                            >
                              <Video size={13} />
                              <span>Call</span>
                            </button>
                          </div>
                        </div>

                        {/* AI Match Reason */}
                        {candidate.reason && (
                          <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-300 flex items-start gap-2">
                            <Sparkles size={14} className="shrink-0 text-purple-600 mt-0.5" />
                            <span>
                              <strong>Why they match:</strong> {candidate.reason}
                            </span>
                          </div>
                        )}

                        {/* Skills Chips */}
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {skillsList.slice(0, 6).map((sk: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
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
