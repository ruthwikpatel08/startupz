import React, { useState } from 'react';
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
} from 'lucide-react';
import { GoogleAccountChooserModal } from '../components/auth/GoogleAccountChooserModal';
import { supabase } from '../lib/supabase';

export const LandingPage: React.FC = () => {
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);

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
    <div className="flex flex-col min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-600/20 via-cyan-500/20 to-emerald-500/20 blur-[100px] -z-10 pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-wide shadow-sm animate-pulse-subtle">
              <Sparkles size={14} className="text-brand-500" />
              <span>StartupZ — Find the right people. Build the right startup.</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Build your startup team.{' '}
              <span className="startup-gradient-text">Discover opportunities.</span>{' '}
              Grow together.
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              StartupZ connects founders, co-founders, developers, designers, mentors, and investors in one dedicated startup-focused professional network.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={handleGoogleClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
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

              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-lg shadow-brand-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <span>Join StartupZ</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/startups"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-dark-850 hover:bg-slate-100 dark:hover:bg-dark-800 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Compass size={16} />
                <span>Explore Startups</span>
              </Link>
            </div>

            {/* Trust metrics */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Algorithmic Co-Founder Synergy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Verified Founders & VCs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Zero Spam Guarantee</span>
              </div>
            </div>
          </div>

          {/* Interactive Startup Network Graph Visual */}
          <div className="mt-14 relative max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-dark-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">StartupZ Ecosystem Graph</span>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                LIVE NETWORK
              </span>
            </div>

            {/* Network Nodes Grid */}
            {/* Network Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Founder Node */}
              <Link
                to="/cofounders?category=founders"
                className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-dark-850 dark:to-dark-900 border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Rocket size={18} />
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Founders</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">FarmConnect</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Seeking Founding CTO & GTM Partner</p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>96% Co-Founder Match →</span>
                </div>
              </Link>

              {/* Developer Node */}
              <Link
                to="/cofounders?category=cofounders"
                className="p-4 rounded-2xl bg-gradient-to-b from-cyan-50/50 to-white dark:from-dark-850 dark:to-dark-900 border border-cyan-100 dark:border-cyan-900/50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <Cpu size={18} />
                </div>
                <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">Developers</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Marcus Brody</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Staff Backend & Rust Engineer</p>
                <div className="mt-3 inline-block text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-dark-800 px-2 py-0.5 rounded-md">
                  Open to Founding Equity →
                </div>
              </Link>

              {/* Investor Node */}
              <Link
                to="/cofounders?category=investors"
                className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-white dark:from-dark-850 dark:to-dark-900 border border-emerald-100 dark:border-emerald-900/50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <TrendingUp size={18} />
                </div>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Investors</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Apex Ventures</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">$250k - $1.5M Pre-Seed Checks</p>
                <div className="mt-3 inline-block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                  Active Pitch Ingestion →
                </div>
              </Link>

              {/* Mentor Node */}
              <Link
                to="/mentors"
                className="p-4 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white dark:from-dark-850 dark:to-dark-900 border border-amber-100 dark:border-amber-900/50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <GraduationCap size={18} />
                </div>
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Mentors</div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">James Sterling</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">2x Exited Founder (Ex-YC W16)</p>
                <div className="mt-3 inline-block text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                  Founder Coaching Open →
                </div>
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* 1.5 LATEST PLATFORM UPDATES & CHANGELOG SECTION */}
      <section className="py-16 bg-gradient-to-r from-brand-900/10 via-indigo-900/10 to-teal-900/10 border-y border-brand-200/40 dark:border-brand-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={13} className="text-brand-500 animate-spin" />
                Latest Platform Upgrades
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                What's New on StartupZ
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                Explore recent UI enhancements, interactive navigation upgrades, and profile tools deployed across mobile and desktop.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
              <CheckCircle2 size={15} className="text-emerald-500" />
              Live & Verified Upgrades
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Nav Slidebar */}
            <Link
              to="/startups"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Globe size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Mobile & Desktop Nav Slidebar →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Horizontal slidebar navigation from AI-Scout through Problem Statements, optimized for seamless scrolling on both mobile phones and desktop displays.
              </p>
            </Link>

            {/* 2. Click Dropdowns */}
            <Link
              to="/cofounders"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Click-to-Toggle Submenus →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Co-Founders & Opportunities categories open reliably on click without layout clipping, cursor hover flickering, or unintended pop-up displacement.
              </p>
            </Link>

            {/* 3. Search & AI Scout */}
            <Link
              to="/search"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Instant Modal Search & Recommendations →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Search modal styled after AI Scout with 1-letter real-time word recommendations and new-tab search execution.
              </p>
            </Link>

            {/* 4. Royal Emerald Profile Cover */}
            <Link
              to="/cofounders?category=cofounders"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Royal Emerald Cover & Photos →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Custom avatar and cover photo upload settings on profile page, backed by a default Royal Emerald Green background header.
              </p>
            </Link>

            {/* 5. Memberships */}
            <Link
              to="/memberships"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Rocket size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Tiered Membership Plans →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Basic, Standard, and Premium subscription tiers integrated directly into user dashboard, profile menu, and navigation bar.
              </p>
            </Link>

            {/* 6. Community Feed & Network */}
            <Link
              to="/feed"
              className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Startup Network & Feed →
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dedicated founder connections management, saved opportunities, and real-time community feed for founder engagement.
              </p>
            </Link>

          </div>
        </div>
      </section>

      {/* 2. HOW STARTUPZ WORKS */}
      <section className="py-20 bg-slate-50/60 dark:bg-dark-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-wider uppercase text-brand-600 dark:text-brand-400">
              Complete Lifecycle
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              How StartupZ Accelerates Your Journey
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              From zero-to-one validation to co-founder matchmaking, team hiring, and capital discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Link
              to="/startups"
              className="relative p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <span className="text-3xl font-black text-brand-200 dark:text-brand-900 mb-2 block group-hover:text-brand-400 transition-colors">01</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Publish & Validate →</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Post your startup idea with Problem, Solution, Stage, and Required Skills. Run AI stress tests before writing code.
              </p>
            </Link>

            <Link
              to="/cofounders"
              className="relative p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <span className="text-3xl font-black text-cyan-200 dark:text-cyan-900 mb-2 block group-hover:text-cyan-400 transition-colors">02</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Match Co-Founders →</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Our algorithmic engine matches technical, business, and marketing co-founders based on overlapping skills and shared vision.
              </p>
            </Link>

            <Link
              to="/opportunities"
              className="relative p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <span className="text-3xl font-black text-emerald-200 dark:text-emerald-900 mb-2 block group-hover:text-emerald-400 transition-colors">03</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Assemble Teammates →</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Publish equity or paid opportunities. Attract passionate engineers, UI/UX designers, and growth hackers ready to ship.
              </p>
            </Link>

            <Link
              to="/investors"
              className="relative p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group block cursor-pointer"
            >
              <span className="text-3xl font-black text-purple-200 dark:text-purple-900 mb-2 block group-hover:text-purple-400 transition-colors">04</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Pitch & Scale →</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Discover active angel syndicates and VCs aligned with your stage and vertical. Send structured pitches with verifiable traction.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURE SPOTLIGHTS (Co-Founder Matching & Idea Discovery) */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* Spotlight 1: Co-Founder Matching */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <Users size={14} /> Algorithmic Synergy Engine
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Never settle on a Co-Founder. Find your exact match.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Most startup co-founder relationships fail due to mismatched commitment, redundant skills, or misaligned product vision. StartupZ evaluates:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  <span>Technical + Business complementary skill score</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  <span>Domain industry focus & shared venture interests</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  <span>Availability (Full-time vs Nights & Weekends)</span>
                </li>
              </ul>
              <Link
                to="/cofounders"
                className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 dark:text-brand-400 hover:gap-3 transition-all pt-2"
              >
                <span>Find Co-Founders Now</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <Link
              to="/cofounders?category=cofounders"
              className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 hover:shadow-2xl transition-all hover:scale-[1.01] block cursor-pointer group"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Match Preview →</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  96% Compatibility
                </span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">Marcus Brody</h4>
                  <p className="text-xs text-slate-500">Staff Full-Stack & Systems Engineer • Seattle, WA</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-dark-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                "Your skills in AgTech & GTM strongly complement their cloud/Rust background. Both targeting Seed-stage climate ventures."
              </p>
            </Link>
          </div>

          {/* Spotlight 2: Idea Discovery & Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Link
              to="/startups"
              className="order-2 lg:order-1 p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 hover:shadow-2xl transition-all hover:scale-[1.01] block cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">AGTECH MVP</span>
                <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600 transition-colors">Austin, TX →</span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">FarmConnect</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                AI-powered agronomic advisory platform delivering real-time crop disease detection & yield forecasting.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300">
                  Python
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300">
                  Computer Vision
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  Seeking $250k
                </span>
              </div>
            </Link>

            <div className="order-1 lg:order-2 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                <Compass size={14} /> Idea Discovery & Opportunities
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                Find high-potential ventures. Join as an early pillar.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Have world-class skills but looking for an idea with verified market demand? Browse hundreds of curated ventures looking for engineers, designers, marketers, and sales leaders.
              </p>
              <div className="pt-2 flex items-center gap-4">
                <Link
                  to="/startups"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all"
                >
                  Explore Startup Ideas
                </Link>
                <Link
                  to="/opportunities"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                >
                  View Roles & Equity
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SUCCESS STORIES & TESTIMONIALS */}
      <section className="py-20 bg-slate-50/60 dark:bg-dark-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
              Community Traction
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Real Startups Born on StartupZ
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-6">
                "I had the agronomy expertise and initial pilot farm connections, but zero deep-learning experience. Within 2 weeks on StartupZ, I connected with Marcus, and we shipped our v1 MVP together."
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sarah Chen</h4>
                  <p className="text-[11px] text-slate-500">Founder @ FarmConnect</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-6">
                "As an angel investor, filtering generic cold InMails on other platforms was overwhelming. StartupZ's structured problem/solution criteria and traction badges make deal discovery 10x more focused."
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=80&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Elena Rostova</h4>
                  <p className="text-[11px] text-slate-500">Partner @ Apex Ventures</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic mb-6">
                "I wanted to mentor early-stage builders without endless back-and-forth scheduling. StartupZ allows founders to submit focused topics like pitch deck audits, making every hour high-impact."
              </p>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80"
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">James Sterling</h4>
                  <p className="text-[11px] text-slate-500">2x Exited Founder & Mentor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 text-white shadow-2xl overflow-hidden text-center space-y-6">
            <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
            
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight relative z-10">
              Ready to find the right people and build your venture?
            </h2>
            <p className="text-sm sm:text-base text-brand-100 max-w-xl mx-auto relative z-10 leading-relaxed">
              Join thousands of founders, engineers, designers, mentors, and investors building tomorrow's breakout startups.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
              <button
                type="button"
                onClick={handleGoogleClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-xl transition-all hover:scale-105 cursor-pointer"
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

              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 transition-all hover:scale-105"
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-bold text-white bg-brand-700/60 hover:bg-brand-700/80 border border-white/20 transition-colors"
              >
                <span>Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Google Account Selector Modal */}
      <GoogleAccountChooserModal
        isOpen={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
      />

    </div>
  );
};
