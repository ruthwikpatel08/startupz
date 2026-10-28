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

  const isHomeActive = location.pathname === '/';
  const isFeedActive = location.pathname.startsWith('/feed');
  const isBusinessActive =
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/startups') ||
    location.pathname.startsWith('/cofounders') ||
    location.pathname.startsWith('/failed-startups');
  const isProjectsActive = location.pathname.startsWith('/projects');
  const isOpportunitiesActive = location.pathname.startsWith('/opportunities');

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] fixed left-0 top-14 bottom-0 h-[calc(100vh-3.5rem)] py-4 px-3 select-none z-30 transition-colors overflow-y-auto">
      
      {/* Primary 5 Tools Vertical Nav */}
      <div className="space-y-1.5">
        <div className="px-3.5 pb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Your workspace
        </div>

        {/* 1) Home */}
        <Link
          to="/"
          aria-current={isHomeActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isHomeActive
              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
          }`}
        >
          <Home size={18} className={isHomeActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'} />
          <span>Home</span>
        </Link>

        {/* 2) Feed */}
        <Link
          to="/feed"
          aria-current={isFeedActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isFeedActive
              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
          }`}
        >
          <Share2 size={18} className={isFeedActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'} />
          <span>Feed</span>
        </Link>

        {/* 3) Projects */}
        <Link
          to="/projects"
          aria-current={isProjectsActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isProjectsActive
              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
          }`}
        >
          <FolderKanban size={18} className={isProjectsActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'} />
          <span className="flex-1">Projects</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-soft)] text-[var(--brand-primary)]">
            Builder
          </span>
        </Link>

        {/* 4) Business */}
        <Link
          to="/business"
          aria-current={isBusinessActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isBusinessActive
              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
          }`}
        >
          <Briefcase size={18} className={isBusinessActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'} />
          <span>Business</span>
        </Link>

        {/* 5) Opportunities */}
        <Link
          to="/opportunities"
          aria-current={isOpportunitiesActive ? 'page' : undefined}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isOpportunitiesActive
              ? 'bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
          }`}
        >
          <GraduationCap size={18} className={isOpportunitiesActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'} />
          <span>Opportunities</span>
        </Link>
      </div>

      {/* Quick Builder CTA */}
      <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] space-y-2">
        <Link
          to="/projects"
          className="w-full py-2.5 px-3.5 rounded-lg text-sm font-semibold text-[var(--brand-primary)] bg-transparent hover:bg-[var(--brand-soft)] border border-[var(--brand-primary)] shadow-subtle flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={15} />
          <span>New Builder Project</span>
        </Link>
      </div>

    </aside>
  );
};
