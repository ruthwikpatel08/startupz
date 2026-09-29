import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { GoogleAccountChooserModal } from '../components/auth/GoogleAccountChooserModal';
import { QuickLoginModal } from '../components/auth/QuickLoginModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);
  const [myConnectionCount, setMyConnectionCount] = useState<number>(0);
  const [recentConnections, setRecentConnections] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchMyConnections = async () => {
      try {
        const { data: conns } = await supabase
          .from('connections')
          .select('id, sender_id, receiver_id, updated_at')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('status', 'ACCEPTED')
          .order('updated_at', { ascending: false })
          .limit(3);

        if (!conns) return;
        setMyConnectionCount(conns.length);

        const otherIds = conns.map((c) => (c.sender_id === user.id ? c.receiver_id : c.sender_id));
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar, headline')
            .in('user_id', otherIds);
          const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));
          setRecentConnections(
            conns.map((c) => {
              const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
              const p = profMap.get(otherId);
              return { userId: otherId, fullName: p?.full_name || 'Member', avatar: p?.avatar, headline: p?.headline };
            })
          );
        }
      } catch {}
    };
    fetchMyConnections();
  }, [user?.id]);

  const handleGoogleClick = async () => {
    try {
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
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium shadow-subtle">
              <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
              <span>Startup ecosystem platform for builders and backers</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Build your startup team.{' '}
              <span className="text-brand-600 dark:text-brand-400">Discover opportunities.</span>{' '}
              Grow together.
            </h1>

            {/* Subtext */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              StartupZ connects founders, co-founders, developers, designers, mentors, and investors in one structured, professional network.
            </p>

            {/* CTA Buttons */}
            {user ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 flex-wrap">
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <LayoutDashboard size={15} />
                  <span>Go to Dashboard</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to={`/profile/${user.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-subtle transition-colors"
                >
                  <span>My Startup Profile</span>
                </Link>
                <Link
                  to="/startups"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-subtle transition-colors"
                >
                  <Compass size={14} className="text-slate-400" />
                  <span>Explore Startups</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-subtle transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-subtle transition-colors cursor-pointer"
                >
                  <Lock size={14} className="text-slate-400 shrink-0" />
                  <span>Sign In (Password)</span>
                </button>

                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-subtle"
                >
                  <span>Join StartupZ</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/startups"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-subtle transition-colors"
                >
                  <Compass size={14} className="text-slate-400" />
                  <span>Explore Startups</span>
                </Link>
              </div>
            )}

            {/* Trust metrics */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Co-Founder Synergy Engine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Verified Founders & Investors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Curated Ecosystem Network</span>
              </div>
            </div>
          </div>

          {/* My Network Quick Panel — only shown when logged in */}
          {user && (
            <div className="mt-8 max-w-2xl mx-auto p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
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

          {/* Interactive Startup Network Graph Visual */}
          <div className="mt-12 relative max-w-4xl mx-auto p-5 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">StartupZ Ecosystem Directory</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                LIVE DIRECTORY
              </span>
            </div>

            {/* Network Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Founder Node */}
              <Link
                to="/cofounders?category=founders"
                className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2.5 border border-brand-200/50 dark:border-brand-900/50">
                  <Rocket size={16} />
                </div>
                <div className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-0.5">Founders</div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs">FarmConnect</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">Seeking Founding CTO & GTM Partner</p>
                <div className="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>96% Match score →</span>
                </div>
              </Link>

              {/* Developer Node */}
              <Link
                to="/cofounders?category=cofounders"
                className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2.5 border border-slate-200 dark:border-slate-700">
                  <Cpu size={16} />
                </div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Developers</div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Marcus Brody</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">Staff Backend & Systems Engineer</p>
                <div className="mt-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Open to Equity →
                </div>
              </Link>

              {/* Investor Node */}
              <Link
                to="/cofounders?category=investors"
                className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 border border-emerald-200/50 dark:border-emerald-900/50">
                  <TrendingUp size={16} />
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Investors</div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs">Apex Ventures</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">$250k - $1.5M Pre-Seed Checks</p>
                <div className="mt-2.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  Pitch Ingestion Active →
                </div>
              </Link>

              {/* Mentor Node */}
              <Link
                to="/mentors"
                className="p-3.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 border border-amber-200/50 dark:border-amber-900/50">
                  <GraduationCap size={16} />
                </div>
                <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-0.5">Mentors</div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs">James Sterling</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">2x Exited Founder (Ex-YC W16)</p>
                <div className="mt-2.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Advisory Open →
                </div>
              </Link>

            </div>
          </div>
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
                What's New on StartupZ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Directory tools, co-founder discovery algorithms, and pitch ingestion pipelines.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Verified Architecture
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
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

            {/* 2. Click Dropdowns */}
            <Link
              to="/cofounders"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <Users size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Ecosystem Directories →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Categorized access to technical co-founders, verified angel investors, and venture mentors.
              </p>
            </Link>

            {/* 3. Search & AI Scout */}
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
                Natural-language discovery of builders, operators, and advisors with compatible availability.
              </p>
            </Link>

            {/* 4. Profiles */}
            <Link
              to="/cofounders?category=cofounders"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Verified Founder Profiles →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Identity badges, role indicators, startup affiliations, and verified work history.
              </p>
            </Link>

            {/* 5. Memberships */}
            <Link
              to="/memberships"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <Rocket size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Tiered Ecosystem Access →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Standard and Pro membership options for enhanced outreach, investor pitch slots, and advisory hours.
              </p>
            </Link>

            {/* 6. Community Feed */}
            <Link
              to="/feed"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3 group-hover:text-brand-600 transition-colors border border-slate-200 dark:border-slate-700">
                <Layers size={16} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Founder Activity Feed →
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Real-time updates, hiring calls, launch announcements, and community discussions.
              </p>
            </Link>

          </div>
        </div>
      </section>

      {/* 2. HOW STARTUPZ WORKS */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-brand-600 dark:text-brand-400">
              Lifecycle
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              How StartupZ Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              From zero-to-one validation to co-founder matchmaking, team hiring, and capital discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/startups"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">01</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Publish & Validate →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Post your startup idea with problem statement, target audience, stage, and required talent.
              </p>
            </Link>

            <Link
              to="/cofounders"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">02</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Match Co-Founders →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Discover technical, business, and design co-founders based on overlapping skills and shared vision.
              </p>
            </Link>

            <Link
              to="/opportunities"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">03</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Assemble Teammates →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Publish equity or paid opportunities to attract engineers, UI/UX designers, and growth leads.
              </p>
            </Link>

            <Link
              to="/investors"
              className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group block cursor-pointer"
            >
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700 mb-1 block">04</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors">Pitch & Scale →</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect with angel investors and venture funds aligned with your stage and market sector.
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
                Co-founder relationships require complementary technical capabilities, aligned availability, and shared domain commitment. StartupZ evaluates:
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
              Startups Built on StartupZ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4">
                "StartupZ was born out of the direct need for founders, developers, and investors to cut through noise, find genuine co-founders, and build lasting ventures together."
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-xs">
                  RP
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Ruthwik Patel</h4>
                  <p className="text-[11px] text-slate-500">Founder @ StartupZ</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-4">
                "Finding a co-founder with aligned vision and complementary technical skills used to take months. On StartupZ, connecting directly with real builders changes everything."
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
                "StartupZ's direct proposal and co-founder connection system provides clean, genuine startup signals without the spam. Highly recommended for early builders."
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
          <div className="p-8 sm:p-10 rounded-xl bg-slate-900 text-white border border-slate-850 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to find collaborators and build your venture?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Join founders, engineers, designers, mentors, and investors building tomorrow's startup ecosystem.
            </p>

            {user ? (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-subtle cursor-pointer"
                >
                  <LayoutDashboard size={14} />
                  <span>Go to Your Dashboard</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to={`/profile/${user.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
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

    </div>
  );
};
