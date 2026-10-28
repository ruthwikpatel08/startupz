import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Rocket,
  Users,
  Compass,
  Briefcase,
  TrendingUp,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Zap,
  MessageSquare,
  Network,
  UserPlus,
} from 'lucide-react';
import { AIScoutModal } from '../components/ai/AIScoutModal';
import { ConnectModal } from '../components/common/ConnectModal';
import { StartupConnectionModal } from '../components/common/StartupConnectionModal';
import { DiscoveryProfileCard } from '../components/common/DiscoveryProfileCard';

import { supabase, fetchUserConnections } from '../lib/supabase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/common/SEO';

export function getProfileRoleAndCategory(profile: any): {
  role: string;
  category: 'students' | 'founders' | 'cofounders' | 'others';
} {
  const pref = (profile.preferred_role || profile.preferredRole || profile.role || '').toString().trim();
  const prefUpper = pref.toUpperCase();
  const headline = (profile.headline || '').toLowerCase();
  const bio = (profile.bio || profile.one_line_bio || profile.oneLineBio || '').toLowerCase();

  // 1. Explicit role check
  if (prefUpper.includes('STUDENT')) {
    return { role: 'Student', category: 'students' };
  }
  if (prefUpper.includes('COFOUNDER') || prefUpper.includes('CO-FOUNDER')) {
    return { role: 'Co-Founder', category: 'cofounders' };
  }
  if (prefUpper.includes('FOUNDER')) {
    return { role: 'Founder', category: 'founders' };
  }
  if (prefUpper.includes('INVESTOR') || prefUpper.includes('INVESTING') || profile.investorProfile) {
    return { role: 'Investor', category: 'others' };
  }
  if (prefUpper.includes('MENTOR') || prefUpper.includes('ADVISOR') || profile.mentorProfile) {
    return { role: 'Mentor', category: 'others' };
  }
  if (prefUpper.includes('MARKETER') || prefUpper.includes('MARKETING') || prefUpper.includes('GROWTH')) {
    return { role: 'Marketer', category: 'others' };
  }
  if (prefUpper.includes('DEVELOPER') || prefUpper.includes('ENGINEER')) {
    return { role: 'Developer', category: 'others' };
  }
  if (prefUpper.includes('DESIGNER')) {
    return { role: 'Designer', category: 'others' };
  }
  if (prefUpper.includes('PROFESSIONAL')) {
    return { role: 'Professional', category: 'others' };
  }
  if (prefUpper.includes('OPERATOR')) {
    return { role: 'Operator', category: 'others' };
  }
  if (prefUpper.startsWith('OTHER:')) {
    const customRole = pref.substring(6).trim();
    return { role: customRole || 'Other', category: 'others' };
  }
  if (prefUpper === 'OTHER' || prefUpper === 'OTHERS') {
    return { role: 'Others', category: 'others' };
  }

  // 2. Fallback based on headline/bio if role is generic or empty
  if (headline.includes('student') || bio.includes('student')) {
    return { role: 'Student', category: 'students' };
  }
  if (headline.includes('co-founder') || headline.includes('cofounder')) {
    return { role: 'Co-Founder', category: 'cofounders' };
  }
  if (headline.includes('founder')) {
    return { role: 'Founder', category: 'founders' };
  }
  if (headline.includes('developer') || headline.includes('engineer')) {
    return { role: 'Developer', category: 'others' };
  }
  if (headline.includes('designer')) {
    return { role: 'Designer', category: 'others' };
  }

  return { role: pref || 'Student', category: 'students' };
}

export function getPrimarySkill(profile: any): string | null {
  const raw = profile?.skills || profile?.profile?.skills;
  if (!raw) return null;

  if (Array.isArray(raw)) {
    const valid = raw.find((s) => typeof s === 'string' && s.trim().length > 0);
    return valid ? valid.trim() : null;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const valid = parsed.find((s) => typeof s === 'string' && s.trim().length > 0);
          if (valid) return valid.trim();
        }
      } catch {}
    }

    const first = trimmed.split(',')[0]?.trim().replace(/^["'\[]+|["'\]]+$/g, '');
    return first && first.length > 0 ? first : null;
  }

  return null;
}

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aiScoutOpen, setAiScoutOpen] = useState(
    searchParams.get('scout') === 'open' || searchParams.get('scout') === 'true'
  );

  const handleCloseAiScout = () => {
    setAiScoutOpen(false);
    if (searchParams.get('scout')) {
      const p = new URLSearchParams(searchParams);
      p.delete('scout');
      setSearchParams(p, { replace: true });
    }
  };
  const [myConnectionCount, setMyConnectionCount] = useState<number>(0);
  const [recentConnections, setRecentConnections] = useState<any[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<any[]>([]);
  const [otherProfilesLoading, setOtherProfilesLoading] = useState<boolean>(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'others'>('all');
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [startupConnectUser, setStartupConnectUser] = useState<any | null>(null);
  const [connectionStatusMap, setConnectionStatusMap] = useState<Map<string, string>>(new Map());

  // Fetch all community profiles (students and other talent) excluding current user and founders/co-founders
  useEffect(() => {
    let isMounted = true;
    const fetchCommunityProfiles = async () => {
      try {
        const [supaRes, apiRes] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),
          api.getCofounderMatches('category=all').catch(() => null),
        ]);

        let rawList: any[] = [];
        if (supaRes.status === 'fulfilled' && supaRes.value?.data) {
          rawList = [...rawList, ...supaRes.value.data];
        }
        if (apiRes.status === 'fulfilled' && apiRes.value?.matches) {
          const apiMatches = (apiRes.value.matches || []).map((m: any) => ({
            id: m.id || m.profile?.userId,
            user_id: m.id || m.profile?.userId,
            email: m.email,
            full_name: m.profile?.fullName || m.fullName,
            username: m.profile?.username || m.username,
            avatar: m.profile?.avatar || m.avatar,
            headline: m.profile?.headline || m.headline,
            preferred_role: m.profile?.preferredRole || m.role,
            skills: m.profile?.skills || m.skills,
            location: m.profile?.location || m.location,
            bio: m.profile?.bio || m.bio,
            one_line_bio: m.profile?.oneLineBio || m.oneLineBio || m.profile?.headline,
            created_at: m.createdAt,
          }));
          rawList = [...rawList, ...apiMatches];
        }

        // Deduplicate profiles, excluding current user and founder/co-founder roles from community showcase
        const profMap = new Map<string, any>();
        for (const p of rawList) {
          const key = (p.user_id || p.id || p.userId || p.email || '').toString().toLowerCase();
          if (!key || profMap.has(key)) continue;

          // Never display the logged-in user's own profile on home; only all other users
          const isCurrentUser = Boolean(
            user && (
              (p.user_id && p.user_id === user.id) ||
              (p.id && p.id === user.id) ||
              (p.userId && p.userId === user.id) ||
              (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase())
            )
          );
          if (isCurrentUser) continue;

          const { role, category } = getProfileRoleAndCategory(p);

          // Exclude founders and co-founders from home talent showcase (they belong in cofounders directory)
          if (category === 'founders' || category === 'cofounders') continue;
          if (category !== 'students' && category !== 'others') {
            const roleUpper = role.toUpperCase();
            const prefUpper = (p.preferred_role || p.role || '').toString().toUpperCase();
            if (roleUpper.includes('FOUNDER') || prefUpper.includes('FOUNDER')) {
              continue;
            }
          }

          profMap.set(key, {
            ...p,
            role_label: role,
            category: category,
            oneLineBio: p.one_line_bio || p.headline || '',
          });
        }

        if (isMounted) {
          setOtherProfiles(Array.from(profMap.values()));
        }
      } catch (err) {
        console.warn('Failed to load community profiles:', err);
      } finally {
        if (isMounted) setOtherProfilesLoading(false);
      }
    };

    fetchCommunityProfiles();

    // Listen for realtime database changes on profiles table
    const profilesChannel = supabase
      .channel('landing-page-profiles-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchCommunityProfiles();
      })
      .subscribe();

    // Listen for client-side profile save event and window focus to refresh immediately
    const handleProfileEvt = () => fetchCommunityProfiles();
    window.addEventListener('profile_updated', handleProfileEvt);
    window.addEventListener('focus', handleProfileEvt);

    // Periodic sync every 15s to guarantee fresh display when new students register
    const pollInterval = setInterval(() => {
      fetchCommunityProfiles();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(profilesChannel);
      window.removeEventListener('profile_updated', handleProfileEvt);
      window.removeEventListener('focus', handleProfileEvt);
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchMyConnections = async () => {
      try {
        const connData = await fetchUserConnections(user.id).catch(() => null);
        if (!connData) return;
        setMyConnectionCount(connData.count);
        setConnectionStatusMap(connData.statusMap);

        const acceptedConns = connData.connections
          .filter((c: any) => c.status === 'ACCEPTED')
          .slice(0, 3);

        if (acceptedConns.length > 0) {
          const otherIds = acceptedConns.map((c: any) => (c.sender_id === user.id ? c.receiver_id : c.sender_id));
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar, headline')
            .in('user_id', otherIds);
          const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          setRecentConnections(
            acceptedConns.map((c: any) => {
              const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
              const p = profMap.get(otherId);
              return { userId: otherId, fullName: p?.full_name || 'Member', avatar: p?.avatar, headline: p?.headline };
            })
          );
        } else {
          setRecentConnections([]);
        }
      } catch (err) {
        console.warn('LandingPage connections error:', err);
      }
    };
    fetchMyConnections();

    // Subscribe to realtime changes so homepage updates immediately
    const channel = supabase
      .channel('landing-page-conns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        fetchMyConnections();
      })
      .subscribe();

    // Also listen for broadcast events from NotificationsDropdown
    const broadcastChannel = supabase
      .channel('landing-global-connections-broadcast')
      .on('broadcast', { event: 'connection_changed' }, () => {
        fetchMyConnections();
      })
      .subscribe();

    const handleConnEvt = () => fetchMyConnections();
    window.addEventListener('connections_updated', handleConnEvt);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
      window.removeEventListener('connections_updated', handleConnEvt);
    };
  }, [user?.id]);

  const handleConnectClick = (target: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setConnectUser(target);
  };

  const handlePitchClick = (target: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setStartupConnectUser(target);
  };

  const isProfileConnected = (profile: any): boolean => {
    if (!connectionStatusMap || connectionStatusMap.size === 0) return false;
    const candidateIds = [
      profile.user_id,
      profile.id,
      profile.userId,
      profile.profile?.userId,
      profile.profile?.id,
    ].filter(Boolean).map(String);

    return candidateIds.some((id) => {
      const status =
        connectionStatusMap.get(id) ||
        connectionStatusMap.get(id.toLowerCase());
      return status === 'ACCEPTED';
    });
  };

  const unconnectedProfiles = useMemo(() => {
    return otherProfiles.filter((p) => !isProfileConnected(p));
  }, [otherProfiles, connectionStatusMap]);

  return (
    <div className="product-home flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
      <SEO
        title="HookZ — Startup Networking Platform"
        description="HookZ is a startup networking platform where founders, co-founders, mentors and investors connect, discover opportunities and build startups together."
        canonicalPath="/"
      />
      {/* 1. ECOSYSTEM DIRECTORY & COMMUNITY */}
      <section className="relative pt-6 pb-16 lg:pt-8 lg:pb-24">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          {/* Community Profiles: Students, Operators, Specialists & Community Members */}
          <div className="w-full mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                  Students, Specialists & Community Talent
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Discover ambitious students, engineers, designers & builders across the ecosystem
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-soft)] rounded-lg self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('students')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    roleFilter === 'students'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Students
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('others')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    roleFilter === 'others'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Others
                </button>
              </div>
            </div>

            {(() => {
              const displayedProfiles = unconnectedProfiles.filter((p) => {
                if (roleFilter === 'students') return p.category === 'students';
                if (roleFilter === 'others') return p.category === 'others';
                return true;
              });

              if (otherProfilesLoading) {
                return (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                );
              }

              if (displayedProfiles.length === 0) {
                return (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <p className="text-sm text-[var(--text-muted)]">
                      No profiles found in this category.
                    </p>
                    <Link
                      to="/cofounders"
                      className="inline-block mt-3 text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                    >
                      Browse Talent Directory &rarr;
                    </Link>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayedProfiles.map((p) => {
                    const displayName = p.full_name || 'Community Member';
                    const displayRole = p.role_label || 'Other';
                    const username = p.username || (p.email ? p.email.split('@')[0] : displayName.toLowerCase().replace(/\s+/g, '_'));
                    const profileUrl = p.user_id ? `/profile/${p.user_id}` : (p.id ? `/profile/${p.id}` : '/cofounders');
                    const connStatus = p.user_id ? connectionStatusMap.get(p.user_id) : (p.id ? connectionStatusMap.get(p.id) : undefined);
                    const primarySkill = getPrimarySkill(p);
                    const targetUserObj = {
                      id: p.user_id || p.id,
                      email: p.email || '',
                      profile: {
                        fullName: displayName,
                        username: username,
                        avatar: p.avatar,
                        headline: p.headline,
                      },
                    };

                    return (
                      <DiscoveryProfileCard
                        key={p.user_id || p.id || p.email}
                        name={displayName}
                        username={username}
                        avatar={p.avatar}
                        role={displayRole}
                        topSkill={primarySkill}
                        bio={[p.bio, p.one_line_bio].find(value => typeof value === 'string' && value.trim())?.trim() || ''}
                        profileUrl={profileUrl}
                        connectionStatus={connStatus}
                        onCollaborate={() => handlePitchClick(targetUserObj)}
                        onConnect={() => handleConnectClick(targetUserObj)}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Community Profiles section remains clean without the garbage Ecosystem Directory container */}
        </div>
      </section>

      {/* 1.5 LATEST PLATFORM UPDATES SECTION */}
      <section className="py-14 bg-[var(--bg-primary)] border-y border-[var(--border-subtle)]">
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-medium border border-[var(--border-subtle)] mb-1.5">
                <Sparkles size={12} className="text-[var(--brand-primary)]" />
                <span>Platform Highlights</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                What's New on HookZ
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                HookZ is a platform built for students. Connect with other students for hackathons, build project teams, make friends, and showcase your achievements. If you're serious about a startup idea, you can share it here too.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Verified Architecture
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Search & AI Scout */}
            <button
              type="button"
              onClick={() => setAiScoutOpen(true)}
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer text-left w-full"
            >
              <div className="w-8 h-8 rounded-md bg-[var(--bg-soft)] text-[var(--text-secondary)] flex items-center justify-center mb-3 group-hover:text-[var(--brand-primary)] transition-colors border border-[var(--border-subtle)]">
                <Zap size={16} />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] text-xs mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
                AI Scout Candidate Matcher →
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Find students, builders, and teammates with complementary skills for your next hackathon or project.
              </p>
            </button>

            {/* 2. Profiles */}
            <Link
              to="/cofounders?category=students"
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-[var(--bg-soft)] text-[var(--text-secondary)] flex items-center justify-center mb-3 group-hover:text-[var(--brand-primary)] transition-colors border border-[var(--border-subtle)]">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] text-xs mb-1 group-hover:text-[var(--brand-primary)] transition-colors">
                Student & Builder Profiles →
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Identity badges, role indicators, project showcases, and verified student profiles.
              </p>
            </Link>

          </div>
        </div>
      </section>

      {/* 2. HOW HOOKZ WORKS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--brand-primary)]">
              Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">
              How HookZ Works
            </h2>
            <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">
              Connect with fellow students, form hackathon teams, collaborate on projects, and showcase your achievements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/profile/me"
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">01</span>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">Create Your Profile →</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Showcase your skills, year, college, and interests.
              </p>
            </Link>

            <Link
              to="/cofounders"
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">02</span>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">Find Teammates →</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Discover students with complementary skills for your next hackathon.
              </p>
            </Link>

            <Link
              to="/projects"
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">03</span>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">Build Together →</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Create a project workspace to collaborate on ideas, files, and tasks.
              </p>
            </Link>

            <Link
              to="/feed"
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)] transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">04</span>
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--brand-primary)] transition-colors">Launch & Share →</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Post your wins, projects, and (if ambitious) your startup idea.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Scout Modal */}
      <AIScoutModal
        isOpen={aiScoutOpen}
        onClose={handleCloseAiScout}
      />

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />

      {/* Startup Proposal Connection (Pitch) Modal */}
      <StartupConnectionModal
        isOpen={!!startupConnectUser}
        onClose={() => setStartupConnectUser(null)}
        targetUser={startupConnectUser}
      />

    </div>
  );
};
