/**
 * HookZ Worldwide Opportunities Periodic Background Scheduler
 * Runs periodic sync cycles and auto-expiry checks without blocking server operations.
 */

import { syncAllSources } from './engine.js';
import { markExpiredOpportunities } from './storage.js';

let intervalTimer = null;
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function startOpportunitiesScheduler() {
  if (intervalTimer) return;

  console.log('[OpportunitiesScheduler] Background worker initialized. Sync interval: 6h.');

  // Run initial expiry check immediately
  try {
    markExpiredOpportunities();
  } catch (err) {
    console.warn('[OpportunitiesScheduler] Initial expiry check warning:', err.message);
  }

  // Periodic recurring sync
  intervalTimer = setInterval(async () => {
    try {
      console.log('[OpportunitiesScheduler] Running scheduled collection cycle...');
      const result = await syncAllSources(false);
      console.log('[OpportunitiesScheduler] Cycle completed:', result.status);
    } catch (err) {
      console.error('[OpportunitiesScheduler] Scheduled sync error:', err.message);
    }
  }, SYNC_INTERVAL_MS);

  // Don't prevent process exit if server is shutting down
  if (intervalTimer.unref) {
    intervalTimer.unref();
  }
}

export function stopOpportunitiesScheduler() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

