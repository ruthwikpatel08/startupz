import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rocket, ShieldCheck, Heart, Globe, Share2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const location = useLocation();

  // Hide footer on full-screen interactive pages
  const isExcluded =
    location.pathname.startsWith('/meeting') ||
    location.pathname.startsWith('/messages');

  if (isExcluded) return null;

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 transition-colors w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Col */}
          <div className="space-y-3.5">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white">
                <Rocket size={15} />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Startup<span className="text-brand-600">Z</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              The dedicated professional network connecting founders, talent, mentors, and investors in one structured ecosystem.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-brand-600 transition-colors" aria-label="Twitter"><Globe size={15} /></a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-brand-600 transition-colors" aria-label="GitHub"><ExternalLink size={15} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-brand-600 transition-colors" aria-label="LinkedIn"><Share2 size={15} /></a>
            </div>
          </div>

          {/* Platform Nav */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li><Link to="/startups" className="hover:text-brand-600 transition-colors">Discover Startups</Link></li>
              <li><Link to="/cofounders" className="hover:text-brand-600 transition-colors">Find Co-Founders</Link></li>
              <li><Link to="/opportunities" className="hover:text-brand-600 transition-colors">Startup Opportunities</Link></li>
              <li><Link to="/investors" className="hover:text-brand-600 transition-colors">Investor Directory</Link></li>
              <li><Link to="/mentors" className="hover:text-brand-600 transition-colors">Startup Mentorship</Link></li>
              <li><Link to="/feed" className="hover:text-brand-600 transition-colors">Community Feed</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Platform & Safety
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li><span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Confidentiality Guidelines</span></li>
              <li><span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Verification Process</span></li>
              <li><span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Compatibility Engine</span></li>
              <li><span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Pitch Standards</span></li>
              <li><span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Reporting & Moderation</span></li>
            </ul>
          </div>

          {/* Legal & IP Notice */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Idea Protection & Privacy
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              StartupZ empowers transparent discovery. To protect proprietary trade secrets or patented algorithms, utilize our Confidential Idea visibility controls.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} StartupZ Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Built for the global startup ecosystem</span>
            <Heart size={12} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
