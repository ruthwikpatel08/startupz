import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Share2,
  FolderKanban,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

export const MobileBottomBar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Hide on auth or meeting rooms or when logged out
  const isAuthOrMeeting =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/meeting');

  if (!user || isAuthOrMeeting) {
    return null;
  }

  const isHome = location.pathname === '/';
  const isFeed = location.pathname.startsWith('/feed');
  const isProjects = location.pathname.startsWith('/projects');
  const isBusiness =
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/startups') ||
    location.pathname.startsWith('/cofounders') ||
    location.pathname.startsWith('/failed-startups');
  const isOpportunities = location.pathname.startsWith('/opportunities');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1 shadow-modal select-none">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        
        {/* 1) Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors ${
            isHome
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home size={19} className={isHome ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 leading-none">Home</span>
        </Link>

        {/* 2) Feed */}
        <Link
          to="/feed"
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors ${
            isFeed
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Share2 size={19} className={isFeed ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 leading-none">Feed</span>
        </Link>

        {/* 3) Projects (IN THE MIDDLE - Prominently highlighted & elevated) */}
        <Link
          to="/projects"
          className="flex flex-col items-center justify-center -mt-4 px-2 min-w-[62px] group"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${
              isProjects
                ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950'
                : 'bg-brand-600 text-white group-hover:bg-brand-700'
            }`}
          >
            <FolderKanban size={22} className="stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] mt-1 font-bold leading-none ${
              isProjects
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Projects
          </span>
        </Link>

        {/* 4) Business */}
        <Link
          to="/business"
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors ${
            isBusiness
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase size={19} className={isBusiness ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 leading-none">Business</span>
        </Link>

        {/* 5) Opportunities */}
        <Link
          to="/opportunities"
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] transition-colors ${
            isOpportunities
              ? 'text-brand-600 dark:text-brand-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap size={19} className={isOpportunities ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] mt-0.5 leading-none">Opportunities</span>
        </Link>

      </div>
    </nav>
  );
};
