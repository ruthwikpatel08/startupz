/**
 * Curated & Open Educational Opportunities Adapter
 * Provides verified baseline records for sources operating under manual curation terms.
 */

import { INITIAL_WORLDWIDE_OPPORTUNITIES } from '../initialOpportunities.js';

export async function fetchCuratedEvents(source) {
  // Returns verified active opportunities associated with this source id
  const matches = INITIAL_WORLDWIDE_OPPORTUNITIES.filter(o => o.source_id === source.id);
  return matches;
}

