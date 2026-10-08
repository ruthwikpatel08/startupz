import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { supabase, fetchUserConnections } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Startup } from '../../types';
import { Avatar } from '../../components/common/Avatar';
import { RoleBadge, VerificationBadge, GoldenBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { StartupConnectionModal } from '../../components/common/StartupConnectionModal';
import { SEO } from '../../components/common/SEO';
import {
  Compass,
  Users,
  Skull,
  Rocket,
  TrendingUp,
  Megaphone,
  GraduationCap,
  Plus,
  ShieldCheck,
  UserPlus,
  Check,
  MessageSquare,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Crown,
  Briefcase,
} from 'lucide-react';

export const BusinessPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Direct enter to startups by default (matching Feed directing to Achievements)
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'startups' | 'network' | 'graveyard'>(
    tabParam === 'network' || tabParam === 'graveyard' ? tabParam : 'startups'
  );

  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(true);

  // Founders data & loading state
  const [founders, setFounders] = useState<any[]>([]);
  const [loadingFounders, setLoadingFounders] = useState(false);

  // Modals for Pitch & Connect
  const [connectUser, setConnectUser] = useState<any | null>(null);
  const [startupConnectUser, setStartupConnectUser] = useState<any | null>(null);
  const [connectionStatusMap, setConnectionStatusMap] = useState<Map<string, string>>(new Map());

  // Handle Tab Switch
  const handleTabChange = (tab: 'startups' | 'network' | 'graveyard') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  useEffect(() => {
    const loadStartups = async () => {
      try {
        const res = await api.getStartups('limit=6');
        setStartups(res.startups || []);
      } catch (err) {
        console.error('Failed to load startups:', err);
      } finally {
        setLoadingStartups(false);
      }
    };
    loadStartups();
  }, []);

  useEffect(() => {
    const loadFounders = async () => {
      setLoadingFounders(true);
      try {
        const { data: supaProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, headline, one_line_bio, avatar, location, skills, preferred_role, bio')
          .or('preferred_role.ilike.%founder%,headline.ilike.%founder%')
          .limit(8);

        const mappedFounders = (supaProfiles || []).map((f: any) => ({
          ...f,
          oneLineBio: f.one_line_bio || f.headline || '',
        }));

        const unique = Array.from(new Map(mappedFounders.map((f: any) => [f.full_name || f.id, f])).values());
        setFounders(unique.slice(0, 6));

        // Fetch connection status if user logged in
        if (user?.id) {
          const connData = await fetchUserConnections(user.id).catch(() => null);
          if (connData?.statusMap) {
            setConnectionStatusMap(connData.statusMap);
          }
        }
      } catch (err) {
        console.error('Failed to load founders:', err);
      } finally {
        setLoadingFounders(false);
      }
    };

    if (activeTab === 'network') {
      loadFounders();
    }

    const handleConnEvt = () => {
      if (user?.id && activeTab === 'network') loadFounders();
    };
    window.addEventListener('connections_updated', handleConnEvt);

    const channel = supabase
      .channel('business-founders-conns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        if (user?.id && activeTab === 'network') loadFounders();
      })
      .subscribe();

    return () => {
      window.removeEventListener('connections_updated', handleConnEvt);
      supabase.removeChannel(channel);
    };
  }, [activeTab, user?.id]);

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

  const networkCategories = [
    {
      title: 'Founders',
      desc: 'Active venture creators building breakout companies.',
      href: '/cofounders?category=founders',
      icon: Rocket,
      badge: 'Visionaries',
      color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/60 border-brand-200 dark:border-brand-900',
    },
    {
      title: 'Co-Founders',
      desc: 'Technical & product architects seeking equity partnerships.',
      href: '/cofounders?category=cofounders',
      icon: Users,
      badge: 'Builders',
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900',
    },
    {
      title: 'Investors',
      desc: 'Angel syndicates, venture capitalists & pre-seed check-writers.',
      href: '/cofounders?category=investors',
      icon: TrendingUp,
      badge: 'Capital',
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: 'Marketers',
      desc: 'Growth hackers, demand generation leads & GTM traction strategists.',
      href: '/cofounders?category=marketers',
      icon: Megaphone,
      badge: 'Growth',
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900',
    },
    {
      title: 'Mentors',
      desc: 'Battle-tested operators offering strategic guidance and advisory.',
      href: '/mentors',
      icon: GraduationCap,
      badge: 'Advisors',
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title="Business & Innovation Opportunities | HookZ"
        description="Explore enterprise collaboration, pilot opportunities, venture partnerships, and talent directories on HookZ."
        canonicalPath="/business"
        breadcrumbs={[{ name: 'Business', path: '/business' }]}
      />
      <h1 className="sr-only">Business & Innovation Opportunities | HookZ</h1>
      
      {/* 3 Core Business Pillars Header (Fixed on mobile view, no sliding) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3.5 w-full">
        {/* 1. Startups Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('startups')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'startups'
              ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Compass size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            Startups
          </span>
          {activeTab === 'startups' && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0 hidden sm:block" />
          )}
        </button>

        {/* 2. Founders & Network Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('network')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'network'
              ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Users size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            <span className="sm:hidden">Network</span>
            <span className="hidden sm:inline">Founders & Network</span>
          </span>
          {activeTab === 'network' && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 hidden sm:block" />
          )}
        </button>

        {/* 3. Graveyard Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('graveyard')}
          className={`py-2.5 px-2 sm:py-3.5 sm:px-4 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'graveyard'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <Skull size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
            Graveyard
          </span>
          {activeTab === 'graveyard' && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 hidden sm:block" />
          )}
        </button>
      </div>

      {/* Active Category Header Banner (Displays category caption on the page at top) */}
      <div className="card-base p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-white dark:from-dark-900 dark:via-dark-900 dark:to-dark-850 border border-slate-200/80 dark:border-dark-800 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          {activeTab === 'startups' && <Compass size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />}
          {activeTab === 'network' && <Users size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />}
          {activeTab === 'graveyard' && <Skull size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />}
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {activeTab === 'startups' && 'Startups & Ventures'}
            {activeTab === 'network' && 'Founders & Professional Network'}
            {activeTab === 'graveyard' && 'Startup Graveyard & Post-Mortems'}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {activeTab === 'startups' && 'Explore innovative ventures, customer-backed initiatives, and disruptive products building in the ecosystem.'}
          {activeTab === 'network' && 'Verified founders, co-founders, advisors & tech talent available for collaborations, equity, and partnerships.'}
          {activeTab === 'graveyard' && 'Real startup post-mortems, honest post-mortem breakdowns, and key learnings to build resilient ventures.'}
        </p>
      </div>

      {/* 1. Featured Startups Section (Direct view when entering Business) */}
      {activeTab === 'startups' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-dark-800 pb-3.5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Compass size={22} className="text-brand-600" />
                Verified Startups
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Active ventures building solutions across artificial intelligence, fintech, and climate tech
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/startups/create"
                className="btn-primary !text-xs sm:!text-sm !py-2 !px-3.5 inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Post Startup
              </Link>
              <Link
                to="/startups"
                className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2.5 py-1.5"
              >
                Explore All Startups →
              </Link>
            </div>
          </div>

          {loadingStartups ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-48 rounded-xl bg-slate-100 dark:bg-dark-850 animate-pulse border border-slate-200 dark:border-dark-800" />
              ))}
            </div>
          ) : startups.length === 0 ? (
            <div className="p-10 text-center card-base space-y-3.5">
              <Compass size={32} className="mx-auto text-slate-400" />
              <p className="text-sm text-slate-500">No startups listed yet. Be the first to launch!</p>
              <Link to="/startups/create" className="btn-primary !text-xs sm:!text-sm !py-2 !px-4 inline-flex items-center gap-1.5">
                <Plus size={14} /> Post Startup
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {startups.slice(0, 6).map((startup) => (
                <Link
                  key={startup.id}
                  to={`/startups/${startup.id}`}
                  className="card-base p-4 sm:p-5 hover:border-brand-400 dark:hover:border-dark-700 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      {startup.logo ? (
                        <img src={startup.logo} alt={startup.name} className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-800" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base border border-brand-200/50 dark:border-brand-900/50">
                          {startup.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {startup.name}
                          </h4>
                          {startup.isVerified && <ShieldCheck size={15} className="text-brand-600 shrink-0" />}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {startup.industry} • {startup.stage}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {startup.oneLineDescription || startup.solution}
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 text-xs truncate">
                      {startup.location || 'Remote'}
                    </span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                      View Startup →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Founders & Network Section (Shows Founders only without 'All Members') */}
      {activeTab === 'network' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-dark-800 pb-3.5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 text-xs font-semibold border border-brand-200/60 dark:border-brand-900/60 mb-1.5">
                <Rocket size={12} /> Venture Creators
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Users size={22} className="text-purple-600" />
                Founders Directory
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Verified founders actively building and scaling ventures. Connect directly or pitch synergy.
              </p>
            </div>

            <Link
              to="/cofounders?category=founders"
              className="btn-primary !text-xs sm:!text-sm !py-2 !px-3.5 inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Explore All Founders</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* HookZ Leadership Spotlight */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Crown size={14} className="text-brand-600" /> HookZ Leadership
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Platform Architects</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ruthwik Patel */}
              <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3.5">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src="/images/founders/ruthwik-patel.png"
                        name="Ruthwik Patel"
                        size="lg"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            Ruthwik Patel
                          </h3>
                          <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                            @ruthwikpatel08
                          </span>
                          <VerificationBadge badge="Verified Founder" isVerified={true} size="sm" />
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                          Founder & Lead Architect
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> Bengaluru / Hyderabad, India
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Full-time Founder
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    Architected and founded HookZ with the vision to bridge ambitious student builders, technical co-founders, and early-stage capital. Full-stack systems and product engineering.
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {['Full-Stack Architecture', 'Product Strategy', 'AI Systems', 'Scaling'].map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                    <Briefcase size={13} className="text-brand-600" /> Platform Founder
                  </span>
                </div>
              </div>

              {/* Gokul Vamshi */}
              <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3.5">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src="/images/founders/gokul-vamshi.jpg"
                        name="Gokul Vamshi"
                        size="lg"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            Gokul Vamshi
                          </h3>
                          <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                            @gokulvamshi
                          </span>
                          <VerificationBadge badge="Verified Founder" isVerified={true} size="sm" />
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                          Co-Founder & Operations
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> Telangana / Hyderabad, India
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Full-time Founder
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    Co-founded HookZ to empower student innovators and entrepreneurial ecosystems. Drives operations, builder relations, and venture community growth.
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {['Operations', 'Partnerships', 'Community Growth', 'Product Ops'].map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                    <Briefcase size={13} className="text-brand-600" /> Platform Co-Founder
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Founder Profiles Grid */}
          {loadingFounders ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-44 rounded-xl bg-slate-100 dark:bg-dark-850 animate-pulse border border-slate-200 dark:border-dark-800" />
              ))}
            </div>
          ) : (() => {
            const visibleFounders = founders.filter((f) => {
              if (user?.id && (f.user_id === user.id || f.id === user.id || f.userId === user.id)) return false;
              if (user?.email && f.email && f.email.toLowerCase() === user.email.toLowerCase()) return false;
              const fIds = [f.user_id, f.id, f.userId].filter(Boolean);
              const isConnected = fIds.some(
                (id) => connectionStatusMap.get(id) === 'ACCEPTED' || connectionStatusMap.get(id) === 'CONNECTED'
              ) || f.connectionStatus === 'ACCEPTED' || f.connectionStatus === 'CONNECTED';
              if (isConnected) return false;
              return true;
            });

            if (visibleFounders.length === 0) {
              return (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    You are connected with all featured founders. Explore more founders in the Co-Founders Directory!
                  </p>
                  <Link
                    to="/cofounders?category=founders"
                    className="inline-block mt-3 text-xs font-semibold text-brand-600 hover:text-brand-500"
                  >
                    Browse Founders Directory &rarr;
                  </Link>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleFounders.map((f) => {
                  const displayName = f.full_name || 'Founder';
                  const username = f.username || displayName.toLowerCase().replace(/\s+/g, '_');
                  const profileUrl = f.user_id ? `/profile/${f.user_id}` : '/cofounders?category=founders';
                  const connStatus = f.user_id ? connectionStatusMap.get(f.user_id) : undefined;
                  const targetUserObj = {
                    id: f.user_id || f.id,
                    email: f.email || '',
                    profile: {
                      fullName: displayName,
                      username: username,
                      avatar: f.avatar,
                      headline: f.headline,
                    },
                  };

                  return (
                    <div
                      key={f.id}
                      className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3.5"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={f.avatar}
                              name={displayName}
                              size="lg"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  to={profileUrl}
                                  className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                                >
                                  {displayName}
                                </Link>
                                <span className="text-xs text-brand-600 dark:text-brand-400 font-mono">
                                  @{username}
                                </span>
                                <VerificationBadge badge="Active Builder" isVerified={true} size="sm" />
                              </div>
                              <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">{f.headline}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} /> {f.location || 'Remote'}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} /> Full-time Founder
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(f.oneLineBio || f.headline) && (
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                            {f.oneLineBio || f.headline}
                          </p>
                        )}

                        {f.skills && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {f.skills.split(',').slice(0, 4).map((sk: string, idx: number) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {sk.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-slate-400 font-medium">
                          Active Venture Creator
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            to={profileUrl}
                            className="btn-tertiary !text-xs sm:!text-sm !py-1.5 !px-2.5"
                          >
                            View Profile
                          </Link>

                          {/* Pitch Button */}
                          <button
                            onClick={() => handlePitchClick(targetUserObj)}
                            className="btn-secondary !text-xs sm:!text-sm !py-1.5 !px-3 flex items-center gap-1"
                            title="Propose Co-Founding or Synergy"
                          >
                            <Rocket size={13} /> Pitch
                          </button>

                          {/* Connection Button */}
                          {connStatus === 'ACCEPTED' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                                <Check size={12} /> Connected
                              </span>
                              <Link
                                to={`/messages?user=${f.user_id}`}
                                className="btn-primary !text-xs sm:!text-sm !py-1.5 !px-2.5 flex items-center gap-1"
                              >
                                <MessageSquare size={13} /> Chat
                              </Link>
                            </div>
                          ) : connStatus === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnectClick(targetUserObj)}
                              className="btn-primary !text-xs sm:!text-sm !py-1.5 !px-3 flex items-center gap-1"
                            >
                              <UserPlus size={13} /> Connect
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

          {/* Explore Other Specific Network Roles */}
          <div className="pt-4 border-t border-slate-200 dark:border-dark-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Explore Network Categories
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
              {networkCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.href}
                    className="p-3.5 rounded-xl card-base hover:border-brand-400 dark:hover:border-dark-700 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`p-1.5 rounded-lg border ${item.color}`}>
                          <Icon size={15} />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400">
                          {item.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-dark-800 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Explore →
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Startup Graveyard Section */}
      {activeTab === 'graveyard' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/40 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Skull size={28} />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Learn from the Fallen in Startup Graveyard
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-xl">
                  Read transparent post-mortems of failed ventures, understand root causes of failure, and solve their unfinished problem statements.
                </p>
              </div>
            </div>
            <Link
              to="/failed-startups"
              className="btn-primary !bg-rose-600 hover:!bg-rose-700 !text-xs sm:!text-sm !py-2.5 !px-5 whitespace-nowrap shrink-0 shadow-md"
            >
              Explore Graveyard →
            </Link>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />

      {/* Startup Pitch Modal */}
      <StartupConnectionModal
        isOpen={!!startupConnectUser}
        onClose={() => setStartupConnectUser(null)}
        targetUser={startupConnectUser}
      />

    </div>
  );
};
export default BusinessPage;
