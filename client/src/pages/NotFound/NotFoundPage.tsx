import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import {
  Compass,
  Home,
  Rocket,
  Users,
  Lightbulb,
  ArrowLeft,
  Search,
} from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="404 — Page Not Found | HookZ"
        description="The page you requested does not exist or has been moved. Explore active ventures, find co-founders, or browse problem statements on HookZ."
        noindex={true}
      />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center">
        {/* Error Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 mb-6">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          HTTP 404 — Resource Not Found
        </div>

        {/* 404 Illustration / Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-brand-50 to-indigo-100 dark:from-dark-800 dark:to-dark-850 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-dark-700 shadow-sm">
          <Compass size={44} className="stroke-[1.75]" />
        </div>

        {/* Heading & Explanation */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          We couldn't find that page
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
          The link you followed may be expired, mistyped, or the page may have been moved.
          Use the quick links below to navigate back to HookZ directories.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary inline-flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <Link
            to="/"
            className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-4"
          >
            <Home size={16} /> Return to Homepage
          </Link>
        </div>

        {/* Helpful Directory Jump Cards */}
        <div className="text-left border-t border-slate-200/80 dark:border-dark-800 pt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 text-center sm:text-left">
            Popular Directories on HookZ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/startups"
              className="card-base p-4 hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Rocket size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    Explore Startups
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Discover active ventures
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/cofounders"
              className="card-base p-4 hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    Find Co-Founders
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Connect with peer builders
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/problems"
              className="card-base p-4 hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lightbulb size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    Problem Statements
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Validated market friction
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
