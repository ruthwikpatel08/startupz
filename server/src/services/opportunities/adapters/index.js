/**
 * Opportunity Source Adapter Registry & Dispatcher
 */

import { fetchGDGEvents } from './gdgAdapter.js';
import { fetchSpaceAppsEvents } from './spaceAppsAdapter.js';
import { fetchETHGlobalEvents } from './ethGlobalAdapter.js';
import { fetchKaggleCompetitions } from './kaggleAdapter.js';
import { fetchMSReactorEvents } from './msReactorAdapter.js';
import { fetchCuratedEvents } from './curatedAdapter.js';

export async function executeSourceAdapter(source) {
  if (!source || source.status !== 'ACTIVE') {
    return [];
  }

  switch (source.id) {
    case 'src-gdg':
      return await fetchGDGEvents(source);
    case 'src-nasa-spaceapps':
      return await fetchSpaceAppsEvents(source);
    case 'src-ethglobal':
      return await fetchETHGlobalEvents(source);
    case 'src-kaggle':
      return await fetchKaggleCompetitions(source);
    case 'src-ms-reactor':
      return await fetchMSReactorEvents(source);
    case 'src-opengov-edu':
    case 'src-mlh':
    case 'src-devpost':
    case 'src-aws-immersion':
      return await fetchCuratedEvents(source);
    default:
      // Generic fallback for custom sources
      if (source.collection_method === 'MANUAL_ENTRY') {
        return await fetchCuratedEvents(source);
      }
      return [];
  }
}

