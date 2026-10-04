import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Startup } from '../../types';
import {
  Compass,
  Users,
  Skull,
  Rocket,
  TrendingUp,
  Megaphone,
  GraduationCap,
  Plus,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

export const BusinessPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'startups' | 'network' | 'graveyard'>('all');
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(true);

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 3 Core Business Pillars Header (Matching Feed Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Startups */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'startups' ? 'all' : 'startups')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'startups'
              ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Compass size={16} className="text-brand-600 dark:text-brand-400" />
              Startups
            </span>
            {activeTab === 'startups' && (
              <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            explore innovative ventures and products
          </p>
        </button>

        {/* 2. Network */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'network' ? 'all' : 'network')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'network'
              ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
              Founders & Network
            </span>
            {activeTab === 'network' && (
              <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            founders, cofounders, investors, marketers & mentors
          </p>
        </button>

        {/* 3. Graveyard */}
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'graveyard' ? 'all' : 'graveyard')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'graveyard'
              ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:border-slate-300 dark:hover:border-dark-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Skull size={16} className="text-rose-600 dark:text-rose-400" />
              Graveyard
            </span>
            {activeTab === 'graveyard' && (
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            startup post-mortems and key learnings
          </p>
        </button>
      </div>

      {/* Featured Startups Section */}
      {(activeTab === 'all' || activeTab === 'startups') && (
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
            <div className="flex items-center gap-2">
              <Link
                to="/startups/create"
                className="btn-primary !text-xs !py-1.5 !px-3 inline-flex items-center gap-1"
              >
                <Plus size={12} /> Post Startup
              </Link>
              <Link
                to="/startups"
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1"
              >
                Explore All
              </Link>
            </div>
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
                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                      View Startup
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Network Roles Grid: Founders, Co-Founders, Investors, Marketers, Mentors */}
      {(activeTab === 'all' || activeTab === 'network') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                Founders & Network Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect with active founders, synergy co-founders, angel investors, growth marketers, and seasoned mentors
              </p>
            </div>
            <Link
              to="/cofounders?category=all"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1"
            >
              All Members
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
                    <span>Browse Category</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Startup Graveyard Banner Callout */}
      {(activeTab === 'all' || activeTab === 'graveyard') && (
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
            Explore Graveyard
          </Link>
        </div>
      )}

    </div>
  );
};
