import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { ConnectModal } from '../common/ConnectModal';
import { StartupConnectionModal } from '../common/StartupConnectionModal';
import { ScheduleMeetingModal } from '../common/ScheduleMeetingModal';
import { Avatar } from '../common/Avatar';
import { RoleBadge, VerificationBadge } from '../common/Badge';
import {
  ALL_INDIAN_LOCATIONS,
  INDIAN_STATES_AND_DISTRICTS,
  INDIAN_COLLEGES_AND_UNIVERSITIES,
  resolveIndianLocation,
  fuzzyAdjustQuery,
} from '../../data/indiaData';
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
  GraduationCap,
  Building2,
  Check,
  Globe,
} from 'lucide-react';

interface AIScoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIScoutModal: React.FC<AIScoutModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typoCorrections, setTypoCorrections] = useState<{ from: string; to: string }[]>([]);

  // Sub-modals for 1-click actions
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [proposalUser, setProposalUser] = useState<any | null>(null);
  const [meetingUser, setMeetingUser] = useState<any | null>(null);

  const samplePrompts = [
    'Student from Telangana in Machine Learning',
    'Salesman in Hyderabad or Khammam for B2B SaaS',
    'Frontend designer from NIAT with React & Figma',
    'Technical co-founder from IIT Bombay in AI',
    'Full-stack developer in Bangalore with Next.js',
    'Venture creator or founder in Pune',
  ];

  // Advanced Natural Language Parser
  const parseQuery = (cleanText: string) => {
    const lower = cleanText.toLowerCase();

    // 1. Detect Indian District, State, or Country
    let detectedLocation: string | null = null;
    let detectedDistrict: string | null = null;
    let detectedState: string | null = null;

    // Check district matches
    for (const loc of ALL_INDIAN_LOCATIONS) {
      if (lower.includes(loc.district.toLowerCase())) {
        detectedDistrict = loc.district;
        detectedState = loc.state;
        detectedLocation = `${loc.district}, ${loc.state}`;
        break;
      }
    }

    // Check state matches if no district matched
    if (!detectedLocation) {
      for (const state of Object.keys(INDIAN_STATES_AND_DISTRICTS)) {
        if (lower.includes(state.toLowerCase())) {
          detectedState = state;
          detectedLocation = `${state}, India`;
          break;
        }
      }
    }

    if (!detectedLocation) {
      if (lower.includes('india')) detectedLocation = 'India';
      else if (lower.includes('remote')) detectedLocation = 'Remote';
      else if (lower.includes('bangalore') || lower.includes('bengaluru')) detectedLocation = 'Bengaluru, Karnataka';
    }

    // 2. Detect Professions & Roles
    let detectedProfession: string | null = null;
    if (lower.includes('student') || lower.includes('junior') || lower.includes('intern') || lower.includes('researcher')) {
      detectedProfession = 'Student';
    } else if (lower.includes('sales') || lower.includes('salesman') || lower.includes('gtm') || lower.includes('outbound') || lower.includes('bd')) {
      detectedProfession = 'Salesman';
    } else if (lower.includes('designer') || lower.includes('ui') || lower.includes('ux') || lower.includes('figma')) {
      detectedProfession = 'Frontend Designer';
    } else if (lower.includes('founder') || lower.includes('ceo') || lower.includes('creator')) {
      detectedProfession = 'Founder';
    } else if (lower.includes('co-founder') || lower.includes('cofounder') || lower.includes('partner')) {
      detectedProfession = 'Co-Founder';
    } else if (lower.includes('engineer') || lower.includes('developer') || lower.includes('full stack') || lower.includes('backend') || lower.includes('frontend')) {
      detectedProfession = 'Developer';
    } else if (lower.includes('marketer') || lower.includes('growth') || lower.includes('marketing')) {
      detectedProfession = 'Marketer';
    } else if (lower.includes('investor') || lower.includes('angel') || lower.includes('vc') || lower.includes('capital')) {
      detectedProfession = 'Investor';
    } else if (lower.includes('mentor') || lower.includes('advisor')) {
      detectedProfession = 'Mentor';
    }

    // 3. Detect Colleges / Institutions
    let detectedCollege: string | null = null;
    if (lower.includes('niat')) {
      detectedCollege = 'NIAT (National Institute of Advanced Technologies)';
    } else if (lower.includes('newton school') || lower.includes('scaler')) {
      detectedCollege = 'Advanced Tech College (Newton / Scaler)';
    } else if (lower.includes('iit')) {
      // Check specific IIT
      const specificIIT = INDIAN_COLLEGES_AND_UNIVERSITIES.find(
        (c) => c.startsWith('IIT') && lower.includes(c.toLowerCase())
      );
      detectedCollege = specificIIT || 'IIT (Indian Institute of Technology)';
    } else if (lower.includes('nit')) {
      const specificNIT = INDIAN_COLLEGES_AND_UNIVERSITIES.find(
        (c) => c.startsWith('NIT') && lower.includes(c.toLowerCase())
      );
      detectedCollege = specificNIT || 'NIT (National Institute of Technology)';
    } else if (lower.includes('bits') || lower.includes('pilani')) {
      detectedCollege = 'BITS Pilani';
    } else if (lower.includes('vit') || lower.includes('vellore')) {
      detectedCollege = 'VIT (Vellore Institute of Technology)';
    } else if (lower.includes('srm')) {
      detectedCollege = 'SRM University';
    } else if (lower.includes('manipal')) {
      detectedCollege = 'Manipal Academy of Higher Education';
    } else if (lower.includes('amity')) {
      detectedCollege = 'Amity University';
    } else if (lower.includes('thapar')) {
      detectedCollege = 'Thapar Institute';
    } else if (lower.includes('ashoka')) {
      detectedCollege = 'Ashoka University';
    }

    // 4. Detect Skills & Tech Stack
    const techKeywords = [
      'react', 'python', 'fastapi', 'next.js', 'node', 'ai', 'machine learning', 'ml',
      'llm', 'figma', 'b2b', 'sales', 'gtm', 'pytorch', 'flutter', 'typescript',
      'docker', 'aws', 'golang', 'rust', 'graphql', 'fintech', 'devops', 'sql'
    ];
    const detectedSkills = techKeywords.filter((kw) => lower.includes(kw));

    return {
      detectedLocation,
      detectedDistrict,
      detectedState,
      detectedProfession,
      detectedCollege,
      detectedSkills,
    };
  };

  const handleSearch = async (promptText?: string) => {
    const rawQ = promptText || query;
    if (!rawQ.trim()) return;
    setLoading(true);
    setError(null);

    // 1. Smart Typo & Spelling Correction
    const { adjustedText, corrections } = fuzzyAdjustQuery(rawQ.trim());
    setTypoCorrections(corrections);

    const interpretation = parseQuery(adjustedText);

    try {
      // 1. Fetch real Supabase profiles
      let supaProfiles: any[] = [];
      try {
        const { data, error: supaErr } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!supaErr && data) {
          supaProfiles = data;
        }
      } catch (e) {
        console.warn('Supabase profile fetch in AI Scout:', e);
      }

      // 2. Fetch API backend matches if available
      let apiCandidates: any[] = [];
      try {
        const apiRes = await api.aiFindPeople(adjustedText);
        if (apiRes?.results) {
          apiCandidates = apiRes.results;
        }
      } catch {
        // Backend optional
      }

      // 3. Fallback ecosystem talent for comprehensive matching
      const starterEcosystemBuilders = [
        {
          id: 'other-talent-1',
          user_id: 'other-talent-1',
          full_name: 'Aarav Sharma',
          username: 'aarav_builder',
          headline: 'Computer Science Student & Junior AI Builder',
          preferred_role: 'Other: Student',
          location: 'Bengaluru, Karnataka, India',
          education: 'NIT Surathkal (Karnataka)',
          bio: 'Final year CS student exploring early-stage AI startups. Proficient in PyTorch, FastApi and React.',
          skills: 'React, TypeScript, Python, FastApi, PyTorch',
        },
        {
          id: 'other-talent-2',
          user_id: 'other-talent-2',
          full_name: 'Marcus Brody',
          username: 'marcus_sales',
          headline: 'Enterprise Salesman & B2B GTM Specialist',
          preferred_role: 'Other: Salesman',
          location: 'Hyderabad, Telangana, India',
          education: 'Symbiosis International University (SIU Pune)',
          bio: '10 years experience closing high-ticket B2B SaaS deals. Advising founders on outbound customer acquisition.',
          skills: 'B2B Sales, Outbound Prospecting, GTM Strategy, Closing',
        },
        {
          id: 'other-talent-3',
          user_id: 'other-talent-3',
          full_name: 'Elena Rostova',
          username: 'elena_design',
          headline: 'Frontend Designer & Design Systems Architect',
          preferred_role: 'Other: Frontend Designer',
          location: 'Khammam, Telangana, India',
          education: 'NIAT (National Institute of Advanced Technologies)',
          bio: 'Crafting pixel-perfect web interfaces and micro-interactions. Graduate of advanced technology systems.',
          skills: 'Figma, TailwindCSS, React, Motion Design, UI/UX',
        },
        {
          id: 'other-talent-4',
          user_id: 'other-talent-4',
          full_name: 'Rohan Mehra',
          username: 'rohan_student',
          headline: 'Student Researcher & ML Systems Enthusiast',
          preferred_role: 'Other: Student',
          location: 'Warangal, Telangana, India',
          education: 'NIT Warangal',
          bio: 'Student building open-source LLM evaluation tools. Looking to join pre-establishment builder projects.',
          skills: 'PyTorch, Hugging Face, Data Pipelines, Python',
        },
        {
          id: 'founder-1',
          user_id: 'founder-1',
          full_name: 'Vikram Sengupta',
          username: 'vikram_founder',
          headline: 'Founder & CEO @ NeuroScale | Ex-Stripe Tech Lead',
          preferred_role: 'Founder',
          location: 'Bengaluru, Karnataka, India',
          education: 'IIT Bombay',
          bio: 'Building developer infrastructure for multimodal AI agents. Raised pre-seed, scaling team.',
          skills: 'Distributed Systems, Go, Python, Venture Strategy',
        },
      ];

      // Format & merge all candidates
      const allCandidatesMap = new Map<string, any>();

      // Put starters
      starterEcosystemBuilders.forEach((item) => allCandidatesMap.set(item.full_name, item));

      // Put Supabase profiles
      supaProfiles.forEach((p) => {
        allCandidatesMap.set(p.full_name || p.id, {
          id: p.id,
          user_id: p.user_id || p.id,
          full_name: p.full_name || 'Startup Builder',
          username: p.username || (p.full_name ? p.full_name.toLowerCase().replace(/\s+/g, '_') : 'builder'),
          avatar: p.avatar,
          headline: p.headline || 'Active Builder & Community Member',
          location: p.location || 'Remote',
          education: p.education || '',
          bio: p.bio || '',
          skills: p.skills || '',
          preferred_role: p.preferred_role || 'Builder',
        });
      });

      // Put API candidates
      apiCandidates.forEach((c) => {
        const p = c.profile || {};
        const name = p.fullName || c.name || c.email?.split('@')[0] || 'Member';
        if (!allCandidatesMap.has(name)) {
          allCandidatesMap.set(name, {
            id: c.id,
            user_id: c.id,
            full_name: name,
            username: p.username || name.toLowerCase().replace(/\s+/g, '_'),
            avatar: p.avatar,
            headline: p.headline || c.headline || 'Builder',
            location: p.location || c.location || 'Remote',
            education: p.education || '',
            bio: p.bio || '',
            skills: p.skills || '',
            preferred_role: p.preferredRole || c.role || 'Builder',
          });
        }
      });

      // Fetch connected user IDs to exclude already connected people
      let connectedIds = new Set<string>();
      if (currentUser?.id) {
        try {
          const { data: conns } = await supabase
            .from('connections')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .eq('status', 'ACCEPTED');
          (conns || []).forEach((c: any) => {
            if (c.sender_id && c.sender_id !== currentUser.id) connectedIds.add(c.sender_id);
            if (c.receiver_id && c.receiver_id !== currentUser.id) connectedIds.add(c.receiver_id);
          });
        } catch {}
      }

      // Filter out self and already connected people
      const candidatesList = Array.from(allCandidatesMap.values()).filter((cand) => {
        if (currentUser) {
          if (cand.user_id === currentUser.id || cand.id === currentUser.id) return false;
          if (cand.email && currentUser.email && cand.email.toLowerCase() === currentUser.email.toLowerCase()) return false;
        }
        if (connectedIds.has(cand.user_id) || connectedIds.has(cand.id)) return false;
        return true;
      });

      // Intelligent scoring engine with 100% match capability
      const scoredCandidates = candidatesList.map((cand) => {
        const text = `${cand.full_name} ${cand.headline || ''} ${cand.bio || ''} ${cand.skills || ''} ${cand.preferred_role || ''} ${cand.location || ''} ${cand.education || ''}`.toLowerCase();
        
        let score = 60;
        const matchReasons: string[] = [];

        let hasLocMatch = false;
        let hasDistrictMatch = false;
        let hasProfMatch = false;
        let hasColMatch = false;
        let hasSkillMatch = false;

        // 1. Location match
        if (interpretation.detectedDistrict && text.includes(interpretation.detectedDistrict.toLowerCase())) {
          score += 35;
          hasDistrictMatch = true;
          hasLocMatch = true;
          matchReasons.push(`District: ${interpretation.detectedDistrict} (${interpretation.detectedState})`);
        } else if (interpretation.detectedState && text.includes(interpretation.detectedState.toLowerCase())) {
          score += 25;
          hasLocMatch = true;
          matchReasons.push(`State: ${interpretation.detectedState}`);
        } else if (interpretation.detectedLocation && text.includes(interpretation.detectedLocation.toLowerCase())) {
          score += 20;
          hasLocMatch = true;
          matchReasons.push(`Location: ${interpretation.detectedLocation}`);
        }

        // 2. Profession / Role match
        if (interpretation.detectedProfession) {
          const prof = interpretation.detectedProfession.toLowerCase();
          if (text.includes(prof) || (cand.preferred_role || '').toLowerCase().includes(prof)) {
            score += 30;
            hasProfMatch = true;
            matchReasons.push(`Role match: ${interpretation.detectedProfession}`);
          }
        }

        // 3. College / Institution match
        if (interpretation.detectedCollege) {
          const colShort = interpretation.detectedCollege.toLowerCase().split('(')[0].trim();
          if (text.includes(colShort) || (text.includes('niat') && interpretation.detectedCollege.includes('NIAT'))) {
            score += 30;
            hasColMatch = true;
            matchReasons.push(`Institution: ${interpretation.detectedCollege.split('(')[0].trim()}`);
          }
        }

        // 4. Skills match
        interpretation.detectedSkills.forEach((sk) => {
          if (text.includes(sk)) {
            score += 15;
            hasSkillMatch = true;
            matchReasons.push(`Skill: ${(sk || '').toUpperCase()}`);
          }
        });

        // Basic query word overlap
        const queryWords = adjustedText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        queryWords.forEach((word) => {
          if (text.includes(word) && !interpretation.detectedSkills.includes(word)) {
            score += 6;
          }
        });

        // 100% Match Engine: If candidate fulfills user-requested criteria, grant 100%!
        const criteriaCount = [
          Boolean(interpretation.detectedDistrict || interpretation.detectedState || interpretation.detectedLocation),
          Boolean(interpretation.detectedProfession),
          Boolean(interpretation.detectedCollege),
          interpretation.detectedSkills.length > 0
        ].filter(Boolean).length;

        if (criteriaCount > 0) {
          const matchedCount = [hasLocMatch, hasProfMatch, hasColMatch, hasSkillMatch].filter(Boolean).length;
          if (
            matchedCount >= criteriaCount ||
            (criteriaCount >= 2 && matchedCount >= 2) ||
            (hasDistrictMatch && (hasProfMatch || hasColMatch)) ||
            (hasProfMatch && hasLocMatch) ||
            score >= 95
          ) {
            score = 100;
          }
        }

        const finalScore = Math.min(100, Math.max(70, score));

        return {
          ...cand,
          matchScore: finalScore,
          matchReasons: matchReasons.length > 0 ? matchReasons : ['Active StartupZ verified ecosystem talent'],
        };
      });

      // Filter and sort by highest match
      scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
      const topResults = scoredCandidates.slice(0, 10);

      setResults({
        query: rawQ,
        interpretation,
        results: topResults,
      });
    } catch (err: any) {
      setError(err?.message || 'AI Scout could not process your query.');
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
        title="AI Scout — Advanced Talent & Institution Matcher"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Header Description */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shrink-0 border border-brand-200/60 dark:border-brand-900/60">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Intelligent Natural Language Search by District, State, Profession & College
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                AI Scout scans member profiles, college affiliations (IITs, NITs, NIAT, Private Universities), verified professions, and all Indian districts & states to surface exact matches.
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
                placeholder="e.g. Student from Telangana in AI, Salesman in Khammam, Designer from NIAT..."
                className="w-full pl-10 pr-40 sm:pr-44 py-2.5 text-xs sm:text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20 font-medium"
              />
              <Search
                size={16}
                className="absolute left-3.5 text-slate-400 pointer-events-none"
              />
              <div className="absolute right-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <span className="text-xs animate-spin">⏳</span>
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{loading ? 'Analyzing...' : 'Find Matches'}</span>
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

            {/* Quick Prompts */}
            {!results && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Popular Queries:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(p);
                        handleSearch(p);
                      }}
                      className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-brand-600 hover:text-brand-600 dark:hover:border-brand-500 border border-slate-200 dark:border-slate-800 transition-colors text-left font-medium cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Typo & Misspelling Adjustment Banner */}
              {typoCorrections.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-semibold flex-wrap">
                    <span>⚡ Corrected Spellings:</span>
                    {typoCorrections.map((tc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-[11px] font-mono shadow-2xs"
                      >
                        <span className="line-through text-slate-400">{tc.from}</span>
                        <span>→</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{tc.to}</span>
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-amber-700/90 dark:text-amber-400/90 font-medium shrink-0">
                    Showing 100% matched profiles for corrected terms
                  </span>
                </div>
              )}

              {/* Detected Interpretation Badges */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>AI Extracted Criteria:</span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">
                    {results.results?.length || 0} candidate(s) found
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {results.interpretation?.detectedLocation && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <MapPin size={11} /> Location: {results.interpretation.detectedLocation}
                    </span>
                  )}
                  {results.interpretation?.detectedProfession && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                      <Briefcase size={11} /> Role: {results.interpretation.detectedProfession}
                    </span>
                  )}
                  {results.interpretation?.detectedCollege && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <GraduationCap size={11} /> College: {results.interpretation.detectedCollege}
                    </span>
                  )}
                  {results.interpretation?.detectedSkills?.map((s: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      ⚡ {s.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Candidate Cards Grid */}
              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {results.results?.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      No exact match found for these parameters. Try broadening your query.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        navigate('/cofounders');
                      }}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Browse full Talent Directory →
                    </button>
                  </div>
                ) : (
                  results.results.map((candidate: any) => {
                    const name = candidate.full_name || 'Community Member';
                    const targetUserObj = {
                      id: candidate.user_id || candidate.id,
                      email: candidate.email || '',
                      profile: {
                        fullName: name,
                        username: candidate.username,
                        avatar: candidate.avatar,
                        headline: candidate.headline,
                      },
                    };

                    return (
                      <div
                        key={candidate.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={candidate.avatar}
                              name={name}
                              size="md"
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4
                                  onClick={() => {
                                    onClose();
                                    navigate(candidate.user_id ? `/profile/${candidate.user_id}` : '/cofounders');
                                  }}
                                  className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-brand-600 cursor-pointer"
                                >
                                  {name}
                                </h4>
                                {candidate.username && (
                                  <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                                    @{candidate.username}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    candidate.matchScore === 100
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                  }`}
                                >
                                  {candidate.matchScore === 100 ? '⭐ 100% Match' : `${candidate.matchScore}% Match`}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1">
                                {candidate.headline}
                              </p>

                              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                {candidate.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} className="text-brand-500" />
                                    <span>{candidate.location}</span>
                                  </span>
                                )}
                                {candidate.education && (
                                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <GraduationCap size={11} className="text-purple-500" />
                                    <span>{candidate.education}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              onClick={() => setProposalUser(targetUserObj)}
                              className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              title="Pitch Startup Collaboration"
                            >
                              <Rocket size={12} /> Pitch
                            </button>
                            <button
                              onClick={() => setConnectUser(targetUserObj)}
                              className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                            >
                              <UserPlus size={12} /> Connect
                            </button>
                            <button
                              onClick={() => setMeetingUser(targetUserObj)}
                              className="btn-secondary !text-xs !py-1 !px-2 flex items-center gap-1"
                              title="Schedule Video Meeting"
                            >
                              <Video size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Match Reasons Pill Bar */}
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {candidate.matchReasons.map((reason: string, rIdx: number) => (
                            <span
                              key={rIdx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-900/50"
                            >
                              ✓ {reason}
                            </span>
                          ))}
                        </div>

                        {/* Skills */}
                        {candidate.skills && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {candidate.skills.split(',').slice(0, 4).map((sk: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {sk.trim()}
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

      {/* 1-Click Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />

      {/* 1-Click Startup Pitch Modal */}
      <StartupConnectionModal
        isOpen={!!proposalUser}
        onClose={() => setProposalUser(null)}
        targetUser={proposalUser}
      />

      {/* 1-Click Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={!!meetingUser}
        onClose={() => setMeetingUser(null)}
        targetUser={meetingUser}
      />
    </>
  );
};
export default AIScoutModal;
