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

  // Hide on auth or meeting pages, or if not logged in
  const isAuthOrMeetingPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/meeting');

  // Only show main navigation tools when user is logged in
  if (!user || isAuthOrMeetingPage) {
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
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 fixed left-0 top-14 bottom-0 h-[calc(100vh-3.5rem)] py-4 px-3 select-none z-30 transition-colors overflow-y-auto">
      
      {/* Primary 5 Tools Vertical Nav */}
      <div className="space-y-1.5">
        <div className="px-3.5 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Core Platform Tools
        </div>

        {/* 1) Home */}
        <Link
          to="/"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isHomeActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <Home size={18} className={isHomeActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Home</span>
        </Link>

        {/* 2) Feed */}
        <Link
          to="/feed"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isFeedActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <Share2 size={18} className={isFeedActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Feed</span>
        </Link>

        {/* 3) Business — direct enter, no arrow accordion */}
        <Link
          to="/business"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isBusinessActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <Briefcase size={18} className={isBusinessActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Business</span>
        </Link>

        {/* 4) Projects */}
        <Link
          to="/projects"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isProjectsActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <FolderKanban size={18} className={isProjectsActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span className="flex-1">Projects</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
            Builder
          </span>
        </Link>

        {/* 5) Opportunities */}
        <Link
          to="/opportunities"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isOpportunitiesActive
              ? 'bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800'
          }`}
        >
          <GraduationCap size={18} className={isOpportunitiesActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
          <span>Opportunities</span>
        </Link>
      </div>

      {/* Quick Builder CTA */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-dark-800 space-y-2">
        <Link
          to="/projects"
          className="w-full py-2.5 px-3.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-subtle flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={15} />
          <span>New Builder Project</span>
        </Link>
      </div>

    </aside>
  );
};
