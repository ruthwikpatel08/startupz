import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { Startup, User } from '../../types';
import {
  Compass,
  Users,
  Skull,
  Rocket,
  TrendingUp,
  Megaphone,
  GraduationCap,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Plus,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar';

export const BusinessPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'startups' | 'network' | 'graveyard'>('all');
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(true);
  const [failedCount, setFailedCount] = useState<number>(18);

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const res = await api.getStartups('limit=6');
        setStartups(res.startups || []);
      } catch (err) {
        console.error('Failed to load startups:', err);
      } finally {
        setLoadingStartups(false);
      }
    };
    loadBusinessData();
  }, []);

  const networkCategories = [
    {
      title: 'Founders',
      desc: 'Active venture creators building the next generation of breakout companies.',
      href: '/cofounders?category=founders',
      icon: Rocket,
      badge: 'Visionaries',
      color: 'text-brand-600 bg-brand-50 dark:bg-brand-950/60 border-brand-200 dark:border-brand-900',
    },
    {
      title: 'Co-Founders',
      desc: 'Technical & product architects seeking equity partnerships & synergy.',
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950 text-white overflow-hidden shadow-modal border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-600/30 text-brand-300 text-xs font-semibold border border-brand-500/30">
            <Briefcase size={13} /> Business & Venture Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            The StartupZ Business Suite
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Centralized hub for ventures, cross-discipline founders, investors, growth marketers, mentors, and failure post-mortems in the graveyard.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
            <Link
              to="/startups"
              className="btn-primary !py-2 !px-4 inline-flex items-center gap-1.5"
            >
              <Compass size={14} />
              <span>Explore Startups</span>
            </Link>
            <Link
              to="/cofounders"
              className="px-4 py-2 rounded-md font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-colors inline-flex items-center gap-1.5"
            >
              <Users size={14} />
              <span>Find Co-Founders & Network</span>
            </Link>
            <Link
              to="/failed-startups"
              className="px-4 py-2 rounded-md font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Skull size={14} className="text-rose-400" />
              <span>Graveyard Post-Mortems</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Core Business Pillars Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Pillar 1: Startups */}
        <div className="card-base p-5 flex flex-col justify-between hover:border-brand-400 dark:hover:border-brand-600 transition-all group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/50 dark:border-brand-900/50">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                1. Startups Directory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Discover registered startups, MVP launches, target customer demographics, and pitch decks across emerging industries.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
            <Link
              to="/startups"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 group-hover:underline"
            >
              <span>Explore Startups</span>
              <ArrowRight size={13} />
            </Link>
            <Link
              to="/startups/create"
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              + Post Startup
            </Link>
          </div>
        </div>

        {/* Pillar 2: Founders, Co-Founders, Investors, Marketers & Mentors */}
        <div className="card-base p-5 flex flex-col justify-between hover:border-brand-400 dark:hover:border-brand-600 transition-all group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-900/50">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                2. Founders & Network
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Connect with active founders, synergy co-founders, angel investors, growth marketers, and seasoned mentors.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
            <Link
              to="/cofounders"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 inline-flex items-center gap-1 group-hover:underline"
            >
              <span>Browse Network</span>
              <ArrowRight size={13} />
            </Link>
            <span className="text-[11px] text-slate-400">
              5 Ecosystem Roles
            </span>
          </div>
        </div>

        {/* Pillar 3: Graveyard */}
        <div className="card-base p-5 flex flex-col justify-between hover:border-rose-400 dark:hover:border-rose-600 transition-all group">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-900/50">
              <Skull size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                3. Startup Graveyard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Post-mortems of failed ventures, critical lessons learned, and unsolved friction points ready for new founders to solve.
              </p>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
            <Link
              to="/failed-startups"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 group-hover:underline"
            >
              <span>Explore Graveyard</span>
              <ArrowRight size={13} />
            </Link>
            <span className="text-[11px] text-slate-400">
              Post-Mortems
            </span>
          </div>
        </div>
      </div>

      {/* Network Roles Grid: Founders, Co-Founders, Investors, Marketers, Mentors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-brand-600" />
              Founders, Co-Founders, Investors, Marketers & Mentors
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Targeted matchmaking categories for every startup growth stage
            </p>
          </div>
          <Link
            to="/cofounders?category=all"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            <span>All Members</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {networkCategories.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={item.href}
                className="p-4 rounded-xl card-base hover:border-brand-400 dark:hover:border-dark-700 transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`p-2 rounded-lg border ${item.color}`}>
                      <Icon size={16} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-400">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span>Browse Directory</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Startups Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass size={18} className="text-brand-600" />
              Verified Startups
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active ventures building solutions across artificial intelligence, fintech, and climate tech
            </p>
          </div>
          <Link
            to="/startups"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Explore All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loadingStartups ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-xl bg-slate-100 dark:bg-dark-850 animate-pulse border border-slate-200 dark:border-dark-800" />
            ))}
          </div>
        ) : startups.length === 0 ? (
          <div className="p-8 text-center card-base space-y-3">
            <Compass size={28} className="mx-auto text-slate-400" />
            <p className="text-xs text-slate-500">No startups listed yet. Be the first to launch!</p>
            <Link to="/startups/create" className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1">
              <Plus size={12} /> Post Startup
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {startups.slice(0, 6).map((startup) => (
              <Link
                key={startup.id}
                to={`/startups/${startup.id}`}
                className="card-base p-4 hover:border-brand-400 dark:hover:border-dark-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    {startup.logo ? (
                      <img src={startup.logo} alt={startup.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm border border-brand-200/50 dark:border-brand-900/50">
                        {startup.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {startup.name}
                        </h4>
                        {startup.isVerified && <ShieldCheck size={14} className="text-brand-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {startup.industry} • {startup.stage}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {startup.oneLineDescription || startup.solution}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] truncate">
                    {startup.location || 'Remote'}
                  </span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center gap-0.5">
                    View Startup →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Startup Graveyard Banner Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border border-rose-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Skull size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">
              Learn from the Fallen in Startup Graveyard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Read transparent post-mortems of failed ventures, why they collapsed, and solve their unfinished problems.
            </p>
          </div>
        </div>
        <Link
          to="/failed-startups"
          className="btn-primary !bg-rose-600 hover:!bg-rose-700 !text-xs !py-2 !px-4 whitespace-nowrap shrink-0"
        >
          Explore Graveyard →
        </Link>
      </div>

    </div>
  );
};
