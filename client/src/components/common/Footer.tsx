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
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors w-full">
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
              <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Hook<span className="text-[var(--brand-primary)]">Z</span>
              </span>
            </Link>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm">
              Find your hackathon teammates, build something together, and share work you're proud of. Made for student builders.
            </p>
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[var(--brand-primary)] transition-colors" aria-label="Twitter"><Globe size={15} /></a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[var(--brand-primary)] transition-colors" aria-label="GitHub"><ExternalLink size={15} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-[var(--brand-primary)] transition-colors" aria-label="LinkedIn"><Share2 size={15} /></a>
            </div>
          </div>

          {/* Platform Nav */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li><Link to="/startups" className="hover:text-[var(--brand-primary)] transition-colors">Discover Startups</Link></li>
              <li><Link to="/cofounders" className="hover:text-[var(--brand-primary)] transition-colors">Find Co-Founders</Link></li>
              <li><Link to="/opportunities" className="hover:text-[var(--brand-primary)] transition-colors">Startup Opportunities</Link></li>
              <li><Link to="/investors" className="hover:text-[var(--brand-primary)] transition-colors">Investor Directory</Link></li>
              <li><Link to="/mentors" className="hover:text-[var(--brand-primary)] transition-colors">Startup Mentorship</Link></li>
              <li><Link to="/feed" className="hover:text-[var(--brand-primary)] transition-colors">Community Feed</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance (DPDP Act 2023) */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
              <Shield size={13} className="text-[var(--brand-primary)]" />
              Legal &amp; Data Protection
            </h4>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              <li><Link to="/privacy" className="hover:text-[var(--brand-primary)] transition-colors">Privacy Notice (DPDP)</Link></li>
              <li><Link to="/terms" className="hover:text-[var(--brand-primary)] transition-colors">Terms of Service</Link></li>
              <li><Link to="/dsar" className="hover:text-[var(--brand-primary)] transition-colors">Data Subject Rights (DSAR)</Link></li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer text-left"
                >
                  Cookie Preferences
                </button>
              </li>
              <li><Link to="/privacy#grievance-redressal" className="hover:text-[var(--brand-primary)] transition-colors">Grievance Mechanism</Link></li>
            </ul>
          </div>

          {/* Grievance Officer & Statutory Notice */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Grievance Redressal (DPDP 2023)
            </h4>
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1.5">
              <div><strong>Grievance Officer:</strong> Ruthwik Patel</div>
              <div><strong>Email:</strong> <a href="mailto:grievance@hookz.in" className="text-[var(--brand-primary)] hover:underline">grievance@hookz.in</a></div>
              <div><strong>Address:</strong> Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India</div>
              <div className="text-[10px] text-[var(--text-muted)] pt-0.5">Response SLA: 48h acknowledgment, 30 days resolution.</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} HookZ Technologies Inc. All rights reserved.</span>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy Notice</Link>
            <span>•</span>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link to="/dsar" className="hover:underline">Data Subject Rights</Link>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span>Compliant with DPDP Act, 2023 (India)</span>
            <Heart size={12} className="text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
