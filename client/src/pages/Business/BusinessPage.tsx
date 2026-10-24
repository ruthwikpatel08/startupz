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
  LayoutDashboard,
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
  const [ruthwikProfile, setRuthwikProfile] = useState<any>(null);
  const [gokulProfile, setGokulProfile] = useState<any>(null);

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
        let startupList: Startup[] = [];
        try {
          const res = await api.getStartups('limit=6');
          if (res?.startups && Array.isArray(res.startups) && res.startups.length > 0) {
            startupList = res.startups;
          }
        } catch (apiErr) {
          console.warn('Backend API getStartups failed, loading from Supabase:', apiErr);
        }

        // Direct Supabase fallback if backend API is offline, sleeping, or empty
        if (startupList.length === 0) {
          const { data: supaStartups, error } = await supabase
            .from('startups')
            .select('*')
            .eq('visibility', 'PUBLIC')
            .order('created_at', { ascending: false })
            .limit(6);

          if (!error && supaStartups && supaStartups.length > 0) {
            startupList = supaStartups.map((s: any) => ({
              id: s.id,
              founderId: s.founder_id,
              name: s.name,
              logo: s.logo,
              oneLineDescription: s.one_line_description,
              problem: s.problem,
              solution: s.solution,
              targetCustomers: s.target_customers,
              industry: s.industry,
              businessModel: s.business_model,
              stage: s.stage,
              location: s.location,
              requiredSkills: s.required_skills,
              fundingStatus: s.funding_status,
              fundingRequired: s.funding_required,
              currentTraction: s.current_traction,
              website: s.website,
              demoLink: s.demo_link,
              pitchDeckUrl: s.pitch_deck_url,
              images: s.images,
              visibility: s.visibility,
              isConfidential: s.is_confidential,
              isVerified: s.is_verified,
              likesCount: s.likes_count || 0,
              viewsCount: s.views_count || 0,
              createdAt: s.created_at,
              updatedAt: s.updated_at,
            }));
          }
        }
        setStartups(startupList);
      } catch (err) {
        console.error('Failed to load startups:', err);
      } finally {
        setLoadingStartups(false);
      }
    };
    loadStartups();

    // Realtime sync for newly added startups
    const startupsChannel = supabase
      .channel('business-page-startups-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'startups' }, () => {
        loadStartups();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(startupsChannel);
    };
  }, []);

  useEffect(() => {
    const loadFounders = async () => {
      setLoadingFounders(true);
      try {
        // Fetch Ruthwik & Gokul leadership profiles from Supabase
        const { data: leadProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, headline, one_line_bio, avatar, location, skills, preferred_role, bio, email')
          .or('username.ilike.ruthwikpatel08,username.ilike.gokulvamshi,email.ilike.%ruthwik9595%,email.ilike.%gokulvamshi%');

        if (leadProfiles && Array.isArray(leadProfiles)) {
          const rp = leadProfiles.find(
            (p: any) =>
              p.username?.toLowerCase() === 'ruthwikpatel08' ||
              p.email?.toLowerCase().includes('ruthwik') ||
              p.user_id === 'b669157c-4d30-42f4-a8bf-4e27dc425e00'
          );
          if (rp) setRuthwikProfile(rp);

          const gv = leadProfiles.find(
            (p: any) =>
              p.username?.toLowerCase() === 'gokulvamshi' ||
              p.email?.toLowerCase().includes('gokul') ||
              p.user_id === '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba'
          );
          if (gv) setGokulProfile(gv);
        }

        const { data: supaProfiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, headline, one_line_bio, avatar, location, skills, preferred_role, bio')
          .or('preferred_role.ilike.%founder%,headline.ilike.%founder%')
          .limit(8);

        const mappedFounders = (supaProfiles || [])
          .filter((f: any) => {
            const pref = (f.preferred_role || '').trim().toUpperCase();
            if (pref && !pref.includes('FOUNDER')) return false;
            return true;
          })
          .map((f: any) => ({
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
      if (activeTab === 'network') loadFounders();
    };
    window.addEventListener('connections_updated', handleConnEvt);
    window.addEventListener('profile_updated', handleConnEvt);

    const channel = supabase
      .channel('business-founders-conns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        if (activeTab === 'network') loadFounders();
      })
      .subscribe();

    return () => {
      window.removeEventListener('connections_updated', handleConnEvt);
      window.removeEventListener('profile_updated', handleConnEvt);
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
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-w-0 overflow-x-hidden">
      <SEO
        title="Business & Innovation Opportunities | HookZ"
        description="Explore enterprise collaboration, pilot opportunities, venture partnerships, and talent directories on HookZ."
        canonicalPath="/business"
        breadcrumbs={[{ name: 'Business', path: '/business' }]}
      />
      <h1 className="sr-only">Business & Innovation Opportunities | HookZ</h1>
      
      {/* 3 Core Business Pillars Header (Fixed on mobile view, no sliding) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
        {/* 1. Startups Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('startups')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'startups'
              ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Compass size={15} className={`shrink-0 ${activeTab === 'startups' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            Startups
          </span>
        </button>

        {/* 2. Founders & Network Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('network')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'network'
              ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Users size={15} className={`shrink-0 ${activeTab === 'network' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            <span className="sm:hidden">Network</span>
            <span className="hidden sm:inline">Founders & Network</span>
          </span>
        </button>

        {/* 3. Graveyard Pillar */}
        <button
          type="button"
          onClick={() => handleTabChange('graveyard')}
          className={`py-2 px-2.5 sm:py-2.5 sm:px-3.5 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'graveyard'
              ? 'bg-rose-50/80 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60 shadow-xs font-semibold'
              : 'bg-white dark:bg-[#0F1624] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/[0.08] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium'
          }`}
        >
          <Skull size={15} className={`shrink-0 ${activeTab === 'graveyard' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
          <span className="text-xs sm:text-[13px] truncate">
            Graveyard
          </span>
        </button>
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
                className="border border-[#34a1eb] text-[#34a1eb] bg-transparent hover:bg-[#34a1eb]/10 rounded-lg text-xs sm:text-sm py-2 px-3.5 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
              <Link to="/startups/create" className="border border-[#34a1eb] text-[#34a1eb] bg-transparent hover:bg-[#34a1eb]/10 rounded-lg text-xs sm:text-sm py-2 px-4 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer">
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
              {(() => {
                const rp = ruthwikProfile || {
                  id: 'b669157c-4d30-42f4-a8bf-4e27dc425e00',
                  user_id: 'b669157c-4d30-42f4-a8bf-4e27dc425e00',
                  full_name: 'Ruthwik patel',
                  username: 'ruthwikpatel08',
                  headline: 'Founder of Hookz',
                  location: 'Hyderabad, Telangana, India',
                  bio: 'Started',
                  one_line_bio: 'Started',
                  avatar: '',
                  skills: '',
                  email: 'ruthwik9595@gmail.com',
                };
                const rpDisplayName = rp.full_name || 'Ruthwik patel';
                const rpUsername = rp.username || 'ruthwikpatel08';
                const rpHeadline = rp.headline || 'Founder of Hookz';
                const rpLocation = rp.location || 'Hyderabad, Telangana, India';
                const rpBio = rp.bio || rp.one_line_bio || '';
                const rpSkills = (rp.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                const rpConnStatus = connectionStatusMap.get(rp.user_id || rp.id);
                const rpTargetUserObj = {
                  id: rp.user_id || rp.id,
                  email: rp.email || '',
                  profile: {
                    fullName: rpDisplayName,
                    username: rpUsername,
                    avatar: rp.avatar || '',
                    headline: rpHeadline,
                  },
                };

                return (
                  <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3.5">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={rp.avatar || ''}
                            name={rpDisplayName}
                            size="lg"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to={`/profile/${rpUsername}`}
                                className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                              >
                                {rpDisplayName}
                              </Link>
                              <Link
                                to={`/profile/${rpUsername}`}
                                className="text-xs text-brand-600 dark:text-brand-400 font-mono hover:underline"
                              >
                                @{rpUsername}
                              </Link>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                              {rpHeadline}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin size={12} /> {rpLocation}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> Full-time Founder
                              </span>
                            </div>
                          </div>
                        </div>
                        <GoldenBadge label="HookZ Founder" size="sm" />
                      </div>

                      {rpBio && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {rpBio}
                        </p>
                      )}

                      {rpSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rpSkills.map((skill: string) => (
                            <span
                              key={skill}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                        <Briefcase size={13} className="text-brand-600" /> Platform Founder
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${rpUsername}`}
                          className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>View Profile</span>
                          <ArrowRight size={12} />
                        </Link>
                        {user?.id && user.id !== (rp.user_id || rp.id) && (
                          rpConnStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                              <Check size={12} /> Connected
                            </span>
                          ) : rpConnStatus === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnectClick(rpTargetUserObj)}
                              className="btn-secondary !text-xs !py-1.5 !px-2.5 flex items-center gap-1"
                            >
                              <UserPlus size={12} /> Connect
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Gokul Vamshi */}
              {(() => {
                const gv = gokulProfile || {
                  id: '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba',
                  user_id: '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba',
                  full_name: 'Gokul Vamshi',
                  username: 'gokulvamshi',
                  headline: 'Student | Technical Builder',
                  location: 'Kolhapur',
                  bio: '',
                  one_line_bio: 'Student | Technical Builder',
                  avatar: '',
                  skills: 'React, Node.js',
                  email: 'gokulvamshi.workspace@gmail.com',
                };
                const gvDisplayName = gv.full_name || 'Gokul Vamshi';
                const gvUsername = gv.username || 'gokulvamshi';
                const gvHeadline = gv.headline || 'Student | Technical Builder';
                const gvLocation = gv.location || 'Kolhapur';
                const gvBio = gv.bio || gv.one_line_bio || '';
                const gvSkills = (gv.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                const gvConnStatus = connectionStatusMap.get(gv.user_id || gv.id);
                const gvTargetUserObj = {
                  id: gv.user_id || gv.id,
                  email: gv.email || '',
                  profile: {
                    fullName: gvDisplayName,
                    username: gvUsername,
                    avatar: gv.avatar || '',
                    headline: gvHeadline,
                  },
                };

                return (
                  <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3.5">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={gv.avatar || ''}
                            name={gvDisplayName}
                            size="lg"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to={`/profile/${gvUsername}`}
                                className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
                              >
                                {gvDisplayName}
                              </Link>
                              <Link
                                to={`/profile/${gvUsername}`}
                                className="text-xs text-brand-600 dark:text-brand-400 font-mono hover:underline"
                              >
                                @{gvUsername}
                              </Link>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 mt-0.5">
                              {gvHeadline}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin size={12} /> {gvLocation}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> Full-time Founder
                              </span>
                            </div>
                          </div>
                        </div>
                        <GoldenBadge label="HookZ Co-Founder" size="sm" />
                      </div>

                      {gvBio && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {gvBio}
                        </p>
                      )}

                      {gvSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {gvSkills.map((skill: string) => (
                            <span
                              key={skill}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                        <Briefcase size={13} className="text-brand-600" /> Platform Co-Founder
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${gvUsername}`}
                          className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1 shadow-xs"
                        >
                          <span>View Profile</span>
                          <ArrowRight size={12} />
                        </Link>
                        {user?.id && user.id !== (gv.user_id || gv.id) && (
                          gvConnStatus === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                              <Check size={12} /> Connected
                            </span>
                          ) : gvConnStatus === 'PENDING' ? (
                            <span className="px-2.5 py-1 rounded text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnectClick(gvTargetUserObj)}
                              className="btn-secondary !text-xs !py-1.5 !px-2.5 flex items-center gap-1"
                            >
                              <UserPlus size={12} /> Connect
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
              if (f.username?.toLowerCase() === 'ruthwikpatel08' || f.username?.toLowerCase() === 'gokulvamshi') return false;
              if (f.user_id === 'b669157c-4d30-42f4-a8bf-4e27dc425e00' || f.user_id === '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba') return false;
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
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                          >
                            Profile
                          </Link>

                          {/* Pitch Button */}
                          <button
                            onClick={() => handlePitchClick(targetUserObj)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
                            title="Propose Co-Founding or Synergy"
                          >
                            Pitch
                          </button>

                          {/* Connection Button */}
                          {connStatus === 'ACCEPTED' ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900">
                                <Check size={12} /> Connected
                              </span>
                              <Link
                                to={`/messages?user=${f.user_id}`}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-xs font-semibold transition-colors"
                              >
                                Chat
                              </Link>
                            </div>
                          ) : connStatus === 'PENDING' ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
                              Pending
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnectClick(targetUserObj)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#34a1eb] hover:bg-[#2892d7] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              + Connect
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

      {/* CTA BANNER: Ready to find collaborators and build your venture? */}
      <section className="py-10">
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
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                >
                  <span>Sign In</span>
                </Link>

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
