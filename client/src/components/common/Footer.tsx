import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, ShieldCheck, Heart, Sparkles, Globe, Share2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white">
                <Rocket size={16} />
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                StartupZ
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Find the right people. Build the right startup. The dedicated professional network connecting founders, talent, mentors, and investors.
            </p>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-brand-500 transition-colors"><Globe size={16} /></a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-brand-500 transition-colors"><ExternalLink size={16} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-brand-500 transition-colors"><Share2 size={16} /></a>
            </div>
          </div>

          {/* Platform Nav */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to="/startups" className="hover:text-brand-500 transition-colors">Discover Startups</Link></li>
              <li><Link to="/cofounders" className="hover:text-brand-500 transition-colors">Find Co-Founders</Link></li>
              <li><Link to="/opportunities" className="hover:text-brand-500 transition-colors">Startup Opportunities</Link></li>
              <li><Link to="/investors" className="hover:text-brand-500 transition-colors">Investor Directory</Link></li>
              <li><Link to="/mentors" className="hover:text-brand-500 transition-colors">Startup Mentorship</Link></li>
              <li><Link to="/feed" className="hover:text-brand-500 transition-colors">Community Feed</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Community & Safety
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><span className="text-slate-500">Confidentiality Guidelines</span></li>
              <li><span className="text-slate-500">Verification Process</span></li>
              <li><span className="text-slate-500">Co-founder Compatibility Engine</span></li>
              <li><span className="text-slate-500">Founder Pitch Standards</span></li>
              <li><span className="text-slate-500">Reporting & Moderation</span></li>
            </ul>
          </div>

          {/* Legal & IP Notice */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Idea Protection & Privacy
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              StartupZ empowers transparent discovery. To protect proprietary trade secrets or patented algorithms, never share confidential technical blueprints publicly. Use our Confidential Idea visibility controls.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} StartupZ Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span>Built with passion for founders globally</span>
            <Heart size={13} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
