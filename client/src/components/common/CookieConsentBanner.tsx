import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, Shield, Check, X, Sliders, ChevronDown, ChevronUp, Lock } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const STORAGE_KEY = 'hookz_cookie_consent';
const CONSENT_VERSION = '1.0';

export const getStoredCookiePreferences = (): CookiePreferences | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const hasGivenCookieConsent = (): boolean => {
  return getStoredCookiePreferences() !== null;
};

// Global event to open preferences from anywhere (e.g. footer)
export const openCookiePreferences = () => {
  window.dispatchEvent(new CustomEvent('open_cookie_preferences'));
};

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Preference state
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = getStoredCookiePreferences();
    if (!saved) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
    }

    const handleOpen = () => {
      const current = getStoredCookiePreferences();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setShowPreferences(true);
      setIsVisible(true);
    };

    window.addEventListener('open_cookie_preferences', handleOpen);
    return () => window.removeEventListener('open_cookie_preferences', handleOpen);
  }, []);

  const savePreferences = (preferences: { essential: boolean; analytics: boolean; marketing: boolean }) => {
    const payload: CookiePreferences = {
      ...preferences,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: payload }));

      // Optionally sync to backend if user is logged in
      const token = localStorage.getItem('startupz_token');
      if (token) {
        fetch('/api/consent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            purpose: 'COOKIE_AND_TRACKING_PREFERENCES',
            consentVersion: CONSENT_VERSION,
            status: preferences.analytics || preferences.marketing ? 'PARTIAL_OR_FULL_GRANTED' : 'ESSENTIAL_ONLY',
            details: JSON.stringify(preferences),
          }),
        }).catch(() => null);
      }
    } catch (e) {
      console.warn('Could not save cookie preferences:', e);
    }
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    savePreferences({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    savePreferences({ essential: true, analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    savePreferences({ essential: true, analytics, marketing });
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Consent Banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-800 dark:text-slate-200 space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-900">
              <Cookie size={17} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                Privacy &amp; Cookie Preferences
              </h3>
              <span className="text-[10px] text-slate-400">DPDP Act 2023 Compliant</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRejectNonEssential}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Dismiss banner with essential cookies only"
          >
            <X size={15} />
          </button>
        </div>

        {/* Descriptive Body */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          We use essential storage to secure your session and deliver platform features. With your explicit opt-in consent, we also process non-essential analytics and performance data. Non-essential trackers remain strictly gated until you opt in.
        </p>

        {/* Granular Preferences Accordion */}
        {showPreferences && (
          <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Category 1: Strictly Necessary */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Lock size={12} className="text-emerald-500" />
                  <span>Essential / Authentication</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Required for login sessions, CSRF protection, and platform routing.</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-200 dark:bg-dark-700 px-2 py-0.5 rounded-sm shrink-0">
                Always Active
              </span>
            </div>

            {/* Category 2: Analytics & Performance */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700">
              <div className="space-y-0.5 pr-2">
                <div className="font-bold text-slate-900 dark:text-white">Analytics &amp; Performance</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Measures aggregate feature usage without cross-site tracking.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-300 dark:bg-dark-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Category 3: Communications & Marketing */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700">
              <div className="space-y-0.5 pr-2">
                <div className="font-bold text-slate-900 dark:text-white">Marketing &amp; Updates</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Provides relevant hackathon notices and ecosystem partner opportunities.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-300 dark:bg-dark-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Buttons / Actions */}
        <div className="space-y-2 pt-1">
          {showPreferences ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Save My Preferences
              </button>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="py-2 px-3 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Back
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer text-center"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="py-2 px-3 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center"
              >
                Reject Non-Essential
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              <Sliders size={11} />
              <span>{showPreferences ? 'Hide Options' : 'Customise Preferences'}</span>
            </button>
            <div className="flex items-center gap-2">
              <Link to="/privacy" className="hover:underline">Privacy Notice</Link>
              <span>•</span>
              <Link to="/terms" className="hover:underline">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
