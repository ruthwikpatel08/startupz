import { api } from '../services/api';
import { supabase } from '../lib/supabase';

// Track what routes/data have been prefetched to avoid redundant requests
const prefetchedSet = new Set<string>();

/**
 * Intelligent instant prefetcher for tools & directory pages.
 * Preloads JS chunks and pre-warms API + Supabase responses when a user hovers or focuses on navigation links.
 */
export function prefetchRouteData(route: string): void {
  const normalized = route.toLowerCase().replace(/^\//, '').split('?')[0];
  if (prefetchedSet.has(normalized)) return;
  prefetchedSet.add(normalized);

  switch (normalized) {
    case 'cofounders':
    case 'founders':
    case 'all':
    case 'allmembers':
      // 1. Preload JS bundle chunk for FindCoFounderPage
      import('../pages/CoFounders/FindCoFounderPage').catch(() => {});
      // 2. Pre-warm API matching query
      api.getCofounderMatches('category=all').catch(() => {});
      // 3. Pre-warm Supabase profiles table
      Promise.resolve(supabase.from('profiles').select('*'))
        .then(({ data }) => {
          if (data && data.length > 0) {
            try {
              sessionStorage.setItem('startupz_cached_profiles', JSON.stringify(data));
            } catch {}
          }
        })
        .catch(() => {});
      break;

    case 'problems':
      // 1. Preload JS bundle chunk for ProblemsPage
      import('../pages/Problems/ProblemsPage').catch(() => {});
      // 2. Pre-warm problems listing & metadata
      api.getProblems().catch(() => {});
      api.getProblemMeta().catch(() => {});
      break;

    case 'startups':
      import('../pages/Startups/ExploreStartupsPage').catch(() => {});
      api.getStartups('').catch(() => {});
      break;

    case 'investors':
      import('../pages/Investors/InvestorsPage').catch(() => {});
      api.getInvestors('').catch(() => {});
      break;

    case 'opportunities':
      import('../pages/Opportunities/OpportunitiesPage').catch(() => {});
      api.getOpportunities('').catch(() => {});
      break;

    case 'mentors':
      import('../pages/Mentors/MentorsPage').catch(() => {});
      api.getMentors('').catch(() => {});
      break;

    default:
      break;
  }
}
