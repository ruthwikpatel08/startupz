import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Share2,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Compass,
  Users,
  Skull,
  BriefcaseBusiness,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { prefetchRouteData } from '../../utils/prefetch';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [businessExpanded, setBusinessExpanded] = useState(
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/startups') ||
    location.pathname.startsWith('/cofounders') ||
    location.pathname.startsWith('/failed-startups')
  );
  const [opportunitiesExpanded, setOpportunitiesExpanded] = useState(
    location.pathname.startsWith('/opportunities')
  );

  // Hide on auth or meeting pages
  const isAuthOrMeetingPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/meeting');

  if (isAuthOrMeetingPage) {
    return null;
  }

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const isHomeActive = location.pathname === '/' || (location.pathname === '/dashboard' && !location.pathname.includes('/projects'));
  const isFeedActive = location.pathname.startsWith('/feed');
  const isBusinessActive =
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/startups') ||
    location.pathname.startsWith('/cofounders') ||
    location.pathname.startsWith('/failed-startups');
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isOpportunitiesActive = location.pathname.startsWith('/opportunities');

  return (
    <aside className="hidden lg:flex flex-col w-56 xl:w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 sticky top-14 h-[calc(100vh-3.5rem)] py-4 px-3 select-none z-30 transition-colors">
      
      {/* Primary 5 Tools Vertical Nav */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Core Platform Tools
        </div>

        {/* 1) Home */}
        <Link
          to="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isHomeActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <Home size={16} className={isHomeActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Home</span>
        </Link>

        {/* 2) Feed */}
        <Link
          to="/feed"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isFeedActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <Share2 size={16} className={isFeedActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Feed</span>
        </Link>

        {/* 3) Business */}
        <div>
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isBusinessActive
                ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Link to="/business" className="flex items-center gap-2.5 flex-1">
              <Briefcase size={16} className={isBusinessActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
              <span>Business</span>
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBusinessExpanded(!businessExpanded);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Toggle Business sublinks"
            >
              {businessExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          </div>

          {/* Business Sub-Links */}
          {businessExpanded && (
            <div className="pl-7 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
              <Link
                to="/startups"
                onMouseEnter={() => prefetchRouteData('startups')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  location.pathname.startsWith('/startups')
                    ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/50 dark:bg-brand-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-850'
                }`}
              >
                <Compass size={13} className="text-slate-400 shrink-0" />
                <span>Startups</span>
              </Link>

              <Link
                to="/cofounders"
                onMouseEnter={() => prefetchRouteData('cofounders')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  location.pathname.startsWith('/cofounders')
                    ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/50 dark:bg-brand-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-850'
                }`}
              >
                <Users size={13} className="text-slate-400 shrink-0" />
                <span>Founders & Network</span>
              </Link>

              <Link
                to="/failed-startups"
                onMouseEnter={() => prefetchRouteData('failed-startups')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  location.pathname.startsWith('/failed-startups')
                    ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50/50 dark:bg-rose-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-850'
                }`}
              >
                <Skull size={13} className="text-slate-400 shrink-0" />
                <span>Graveyard</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4) Projects */}
        <Link
          to="/projects"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isProjectsActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <FolderKanban size={16} className={isProjectsActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span className="flex-1">Projects</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
            Builder
          </span>
        </Link>

        {/* 5) Opportunities */}
        <div>
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isOpportunitiesActive
                ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Link to="/opportunities" className="flex items-center gap-2.5 flex-1">
              <GraduationCap size={16} className={isOpportunitiesActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
              <span>Opportunities</span>
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpportunitiesExpanded(!opportunitiesExpanded);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Toggle Opportunities sublinks"
            >
              {opportunitiesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          </div>

          {/* Opportunities Sub-Links */}
          {opportunitiesExpanded && (
            <div className="pl-7 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
              <Link
                to="/opportunities?type=internships"
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  location.search.includes('type=internships')
                    ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/50 dark:bg-brand-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-850'
                }`}
              >
                <GraduationCap size={13} className="text-slate-400 shrink-0" />
                <span>Internships</span>
              </Link>

              <Link
                to="/opportunities?type=jobs"
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  location.search.includes('type=jobs')
                    ? 'text-brand-600 dark:text-brand-400 font-semibold bg-brand-50/50 dark:bg-brand-950/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-850'
                }`}
              >
                <BriefcaseBusiness size={13} className="text-slate-400 shrink-0" />
                <span>Jobs</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Builder CTA */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-dark-800 space-y-2">
        <Link
          to="/projects"
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-subtle flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={14} />
          <span>New Builder Project</span>
        </Link>
      </div>

    </aside>
  );
};
