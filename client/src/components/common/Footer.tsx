import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rocket, ShieldCheck, Heart, Globe, Share2, ExternalLink, Shield, Mail, Scale, FileText } from 'lucide-react';
import { openCookiePreferences } from './CookieConsentBanner';

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
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/logo-icon.png"
                alt="HookZ"
                className="w-7 h-7 rounded-md object-contain shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Hook<span className="text-brand-600">Z</span>
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

          {/* Legal & Compliance (DPDP Act 2023) */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Shield size={13} className="text-brand-600" />
              Legal &amp; Data Protection
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <li><Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy Notice (DPDP)</Link></li>
              <li><Link to="/terms" className="hover:text-brand-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/dsar" className="hover:text-brand-600 transition-colors">Data Subject Rights (DSAR)</Link></li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="hover:text-brand-600 transition-colors cursor-pointer text-left"
                >
                  Cookie Preferences
                </button>
              </li>
              <li><Link to="/privacy#grievance-redressal" className="hover:text-brand-600 transition-colors">Grievance Mechanism</Link></li>
            </ul>
          </div>

          {/* Grievance Officer & Statutory Notice */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Grievance Redressal (DPDP 2023)
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <div><strong>Grievance Officer:</strong> Ruthwik Patel</div>
              <div><strong>Email:</strong> <a href="mailto:grievance@hookz.in" className="text-brand-600 hover:underline">grievance@hookz.in</a></div>
              <div><strong>Address:</strong> Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India</div>
              <div className="text-[10px] text-slate-400 pt-0.5">Response SLA: 48h acknowledgment, 30 days resolution.</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} HookZ Technologies Inc. All rights reserved.</span>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy Notice</Link>
            <span>•</span>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link to="/dsar" className="hover:underline">Data Subject Rights</Link>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Compliant with DPDP Act, 2023 (India)</span>
            <Heart size={12} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
