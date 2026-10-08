import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Globe,
  Lock,
  LayoutDashboard,
  MessageSquare,
  Network,
  UserPlus,
  Check,
  MapPin,
  Clock,
} from 'lucide-react';
import { GoogleAccountChooserModal } from '../components/auth/GoogleAccountChooserModal';
import { QuickLoginModal } from '../components/auth/QuickLoginModal';
import { ConnectModal } from '../components/common/ConnectModal';
import { StartupConnectionModal } from '../components/common/StartupConnectionModal';
import { Avatar } from '../components/common/Avatar';
import { RoleBadge, VerificationBadge } from '../components/common/Badge';
import { supabase, fetchUserConnections } from '../lib/supabase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/common/SEO';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [myConnectionCount, setMyConnectionCount] = useState<number>(0);
  const [recentConnections, setRecentConnections] = useState<any[]>([]);
  const [otherProfiles, setOtherProfiles] = useState<any[]>([]);
  const [otherProfilesLoading, setOtherProfilesLoading] = useState<boolean>(true);
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [startupConnectUser, setStartupConnectUser] = useState<any | null>(null);
  const [connectionStatusMap, setConnectionStatusMap] = useState<Map<string, string>>(new Map());

  // Fetch profiles of students and members who selected 'other' / custom roles
  useEffect(() => {
    let isMounted = true;
    const fetchOtherAndStudentMembers = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        let filtered: any[] = [];
        if (data && data.length > 0) {
          filtered = data.filter((p: any) => {
            const role = (p.preferred_role || '').toLowerCase();
            const headline = (p.headline || '').toLowerCase();
            return (
              role.includes('student') ||
              role === 'student' ||
              role.includes('other') ||
              role === 'other' ||
              role.startsWith('other:') ||
              role.includes('sales') ||
              headline.includes('student') ||
              headline.includes('operator') ||
              headline.includes('specialist') ||
              (!role.includes('founder') && !role.includes('investor') && !role.includes('mentor'))
            );
          });
        }

        // Format raw profiles to extract clean role label from real profiles only
        const mappedFiltered = filtered.map((p) => {
          let roleLabel = 'Others';
          const pref = p.preferred_role || '';
          if (pref.toLowerCase().includes('student') || (p.headline && p.headline.toLowerCase().includes('student'))) {
            roleLabel = 'Student';
          } else if (pref.toLowerCase().startsWith('other:')) {
            roleLabel = pref.substring(6).trim();
          } else if (pref.toLowerCase() === 'other' || pref.toLowerCase() === 'others') {
            roleLabel = 'Others';
          } else if (pref) {
            roleLabel = pref;
          }
          return {
            ...p,
            role_label: roleLabel,
            oneLineBio: p.one_line_bio || p.headline || '',
          };
        });

        const unique = Array.from(new Map(mappedFiltered.map((item) => [item.full_name || item.id, item])).values());
        if (isMounted) {
          setOtherProfiles(unique.slice(0, 8));
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setOtherProfilesLoading(false);
      }
    };

    fetchOtherAndStudentMembers();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleGoogleClick = async () => {
    try {
      try {
        localStorage.setItem('startupz_oauth_intent', 'signup');
      } catch {}

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error || !data?.url) {
        setGoogleChooserOpen(true);
        return;
      }

      try {
        const probe = await fetch(data.url, { redirect: 'manual' });
        if (probe.status === 400) {
          setGoogleChooserOpen(true);
          return;
        }
      } catch {
        // If opaque redirect, provider is active
      }

      window.location.href = data.url;
    } catch {
      setGoogleChooserOpen(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
      <SEO
        title="HookZ — Startup Networking Platform"
        description="HookZ is a startup networking platform where founders, co-founders, mentors and investors connect, discover opportunities and build startups together."
        canonicalPath="/"
      />
      {/* 1. ECOSYSTEM DIRECTORY & COMMUNITY */}
      <section className="relative pt-6 pb-16 lg:pt-8 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Community Profiles: Students, Operators, Specialists & Community Members */}
          <div className="max-w-5xl mx-auto mb-10">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 text-xs font-semibold border border-brand-200/60 dark:border-brand-900/60 mb-1.5">
                <Sparkles size={12} /> Community Talent Showcase
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Students, Specialists & Community Members
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Discover ambitious students, operators, specialists & emerging innovators across the ecosystem
              </p>
            </div>

            {otherProfilesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (() => {
              const visibleProfiles = otherProfiles.filter((p) => {
                if (user?.id && (p.user_id === user.id || p.id === user.id || p.userId === user.id)) return false;
                if (user?.email && p.email && p.email.toLowerCase() === user.email.toLowerCase()) return false;
                const pIds = [p.user_id, p.id, p.userId].filter(Boolean);
                const isConnected = pIds.some(
                  (id) => connectionStatusMap.get(id) === 'ACCEPTED' || connectionStatusMap.get(id) === 'CONNECTED'
                ) || p.connectionStatus === 'ACCEPTED' || p.connectionStatus === 'CONNECTED';
                if (isConnected) return false;
                return true;
              });

              if (visibleProfiles.length === 0) {
                return (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      You are connected with all featured talent. Explore more peers in the directory!
                    </p>
                    <Link
                      to="/cofounders"
                      className="inline-block mt-3 text-xs font-semibold text-brand-600 hover:text-brand-500"
                    >
                      Browse Talent Directory &rarr;
                    </Link>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleProfiles.map((p) => {
                    const displayName = p.full_name || 'Community Member';
                    const displayRole = p.role_label || 'Other';
                    const username = p.username || displayName.toLowerCase().replace(/\s+/g, '_');
                    const profileUrl = p.user_id ? `/profile/${p.user_id}` : '/cofounders';
                    const connStatus = p.user_id ? connectionStatusMap.get(p.user_id) : undefined;
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
                      <div
                        key={p.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={p.avatar}
                                name={displayName}
                                size="lg"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Link
                                    to={profileUrl}
                                    className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                                  >
                                    {displayName}
                                  </Link>
                                  <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                                    @{username}
                                  </span>
                                  <VerificationBadge badge="Active Builder" isVerified={true} size="sm" />
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.headline}</p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <MapPin size={11} /> {p.location || 'Remote'}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} /> Full-time
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* One-Line Bio (Normal with bold letters, no quotes, instead of skills) */}
                          {(p.one_line_bio || p.oneLineBio) && (
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 pt-0.5">
                              {p.one_line_bio || p.oneLineBio}
                            </p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Active Builder
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Link
                              to={profileUrl}
                              className="btn-tertiary !text-xs !py-1 !px-2"
                            >
                              View Profile
                            </Link>

                            {/* Startup Connection (Pitch) Button */}
                            <button
                              onClick={() => handlePitchClick(targetUserObj)}
                              className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              title="Propose Co-Founding a Startup"
                            >
                              <Rocket size={12} /> Pitch
                            </button>

                            {/* User Connection Button */}
                            {connStatus === 'ACCEPTED' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                                  <Check size={12} /> Connected
                                </span>
                                <Link
                                  to={`/messages?user=${p.user_id}`}
                                  className="btn-primary !text-xs !py-1 !px-2 flex items-center gap-1"
                                >
                                  <MessageSquare size={12} /> Chat
                                </Link>
                              </div>
                            ) : connStatus === 'PENDING' ? (
                              <span className="px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                                Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConnectClick(targetUserObj)}
                                className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                              >
                                <UserPlus size={12} /> Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* My Network Quick Panel — only shown when logged in */}
          {user && (
            <div className="mb-8 max-w-2xl mx-auto p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-brand-600 dark:text-brand-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">My Network</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/60">
                    {myConnectionCount} connections
                  </span>
                </div>
                <Link
                  to="/network"
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Manage <ArrowRight size={11} />
                </Link>
              </div>

              {recentConnections.length > 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {recentConnections.map((conn) => (
                    <Link
                      key={conn.userId}
                      to={`/messages?user=${conn.userId}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700 transition-colors group"
                    >
                      {conn.avatar ? (
                        <img src={conn.avatar} alt={conn.fullName} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {conn.fullName.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {conn.fullName.split(' ')[0]}
                      </span>
                      <MessageSquare size={11} className="text-slate-400 group-hover:text-brand-500" />
                    </Link>
                  ))}
                  <Link
                    to="/cofounders"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400 hover:text-brand-600 hover:border-brand-400 transition-colors"
                  >
                    <span>+ Connect more</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">No connections yet. Start building your network!</p>
                  <Link
                    to="/cofounders"
                    className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5"
                  >
                    <Users size={12} />
                    <span>Find Co-Founders</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Community Profiles section remains clean without the garbage Ecosystem Directory container */}
        </div>
      </section>

      {/* 1.5 LATEST PLATFORM UPDATES SECTION */}
      <section className="py-14 bg-slate-50/80 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-800 mb-1.5">
                <Sparkles size={12} className="text-brand-600" />
                <span>Platform Highlights</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                What's New on HookZ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                HookZ is a platform built for students. Connect with other students for hackathons, build project teams, make friends, and showcase your achievements. If you're serious about a startup idea, you can share it here too.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Verified Architecture
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Nav Slidebar */}
            <Link
              to="/startups"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <Globe size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Mobile & Desktop Category Bar →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Horizontal slidebar navigation from AI-Scout through Problem Statements, optimized for rapid filtering.
              </p>
            </Link>

            {/* 2. Search & AI Scout */}
            <Link
              to="/search"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <Zap size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                AI Scout Candidate Matcher →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Find students, builders, and teammates with complementary skills for your next hackathon or project.
              </p>
            </Link>

            {/* 3. Profiles */}
            <Link
              to="/cofounders?category=cofounders"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Student & Builder Profiles →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
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
            <span className="text-[11px] font-semibold tracking-wider uppercase text-brand-600 dark:text-brand-400">
              Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              How HookZ Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Connect with fellow students, form hackathon teams, collaborate on projects, and showcase your achievements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/profile/me"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">01</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Create Your Profile →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Showcase your skills, year, college, and interests.
              </p>
            </Link>

            <Link
              to="/cofounders"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">02</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Find Teammates →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Discover students with complementary skills for your next hackathon.
              </p>
            </Link>

            <Link
              to="/projects"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">03</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Build Together →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Create a project workspace to collaborate on ideas, files, and tasks.
              </p>
            </Link>

            <Link
              to="/feed"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">04</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Launch & Share →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Post your wins, projects, and (if ambitious) your startup idea.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURE SPOTLIGHTS */}
      <section className="py-16 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Spotlight 1: Co-Founder Matching */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-800">
                <Users size={13} className="text-brand-600" /> Co-Founder Discovery
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Find compatible co-founders with complementary skills
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Co-founder relationships require complementary technical capabilities, aligned availability, and shared domain commitment. HookZ evaluates:
              </p>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-brand-600 shrink-0" />
                  <span>Technical and business complementary skill scores</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-brand-600 shrink-0" />
                  <span>Sector experience and venture stage targets</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-brand-600 shrink-0" />
                  <span>Current availability (Full-time vs. nights and weekends)</span>
                </li>
              </ul>
              <Link
                to="/cofounders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline pt-1"
              >
                <span>Browse Co-Founders Directory</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <Link
              to="/cofounders?category=cofounders"
              className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-3 block cursor-pointer group"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500">Compatibility Preview</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  96% Compatibility
                </span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">Marcus Brody</h4>
                  <p className="text-[11px] text-slate-500">Staff Full-Stack & Systems Engineer • Seattle, WA</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                "Your skills in product and GTM complement their cloud and systems engineering background. Both targeting Seed-stage climate ventures."
              </p>
            </Link>
          </div>

          {/* Spotlight 2: Idea Discovery & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <Link
              to="/startups"
              className="order-2 lg:order-1 p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-2.5 block cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">AgTech MVP</span>
                <span className="text-xs text-slate-400">Austin, TX</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">FarmConnect</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Agronomic advisory platform delivering real-time crop disease detection & yield forecasting.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Python
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Computer Vision
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  Seeking $250k
                </span>
              </div>
            </Link>

            <div className="order-1 lg:order-2 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-800">
                <Compass size={13} className="text-brand-600" /> Venture Directory
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Discover early ventures and open opportunities
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Explore hundreds of vetted early ventures actively looking for engineers, designers, marketers, and advisors.
              </p>
              <div className="pt-1 flex items-center gap-2.5">
                <Link
                  to="/startups"
                  className="btn-primary !text-xs !py-1.5 !px-3.5"
                >
                  Explore Startups
                </Link>
                <Link
                  to="/opportunities"
                  className="btn-secondary !text-xs !py-1.5 !px-3.5"
                >
                  Open Roles
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SUCCESS STORIES & TESTIMONIALS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Community Testimonials
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              Startups Built on HookZ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4">
                "HookZ was born out of the direct need for founders, developers, and investors to cut through noise, find genuine co-founders, and build lasting ventures together."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-xs">
                  RP
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Ruthwik Patel</h4>
                  <p className="text-[11px] text-slate-500">Founder @ HookZ</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4">
                "Finding a co-founder with aligned vision and complementary technical skills used to take months. On HookZ, connecting directly with real builders changes everything."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold text-xs">
                  LP
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Legacy</h4>
                  <p className="text-[11px] text-slate-500">Tech Co-Founder</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4">
                "HookZ's direct proposal and co-founder connection system provides clean, genuine startup signals without the spam. Highly recommended for early builders."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-xs">
                  LY
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Lavan Yadav</h4>
                  <p className="text-[11px] text-slate-500">Investor & Ecosystem Partner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-2xl bg-brand-50/60 dark:bg-slate-900 text-slate-900 dark:text-white border border-brand-100 dark:border-slate-800 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to find collaborators and build your venture?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Join founders, engineers, designers, mentors, and investors building tomorrow's startup ecosystem.
            </p>

            {user ? (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/feed"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                >
                  <LayoutDashboard size={14} />
                  <span>Go to Feed</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to={`/profile/${user.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
                >
                  <span>My Startup Profile</span>
                </Link>
              </div>
            ) : (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickLoginOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Lock size={13} />
                  <span>Sign In (Password)</span>
                </button>

                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  <span>Get Started Free</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Login Modal (Gmail, Username, Email + Password) */}
      <QuickLoginModal
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        onOpenGoogleChooser={() => setGoogleChooserOpen(true)}
      />

      {/* Google Account Selector Modal */}
      <GoogleAccountChooserModal
        isOpen={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
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
