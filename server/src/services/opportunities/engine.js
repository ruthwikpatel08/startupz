/**
 * HookZ Worldwide Opportunities Automatic Collection Engine
 * Coordinates source sync, validation, deduplication, change detection, and persistence.
 */

import { getAllSources, saveSource, getAllOpportunities, saveOpportunity, markExpiredOpportunities } from './storage.js';
import { executeSourceAdapter } from './adapters/index.js';
import { normalizeOpportunity, OPPORTUNITY_STATUS } from './schema.js';
import { findDuplicate, detectChanges } from './deduplicator.js';

let isSyncInProgress = false;

export function isSyncing() {
  return isSyncInProgress;
}

/**
 * Synchronizes a single source by ID.
 */
export async function syncSource(sourceId) {
  const sources = getAllSources();
  const source = sources.find(s => s.id === sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const result = {
    sourceId: source.id,
    sourceName: source.name,
    discovered: 0,
    created: 0,
    updated: 0,
    cancelled: 0,
    errors: [],
  };

  try {
    const rawEvents = await executeSourceAdapter(source);
    result.discovered = rawEvents.length;

    const existingOpps = getAllOpportunities();

    for (const raw of rawEvents) {
      const normalized = normalizeOpportunity(raw, source);
      if (!normalized) continue;

      const dupMatch = findDuplicate(existingOpps, normalized);

      if (dupMatch) {
        const changes = detectChanges(dupMatch, normalized);

        // Check for cancellation
        if (normalized.status === OPPORTUNITY_STATUS.CANCELLED && dupMatch.status !== OPPORTUNITY_STATUS.CANCELLED) {
          dupMatch.status = OPPORTUNITY_STATUS.CANCELLED;
          dupMatch.updated_at = new Date().toISOString();
          await saveOpportunity(dupMatch);
          result.cancelled++;
        } else if (changes.hasChanges) {
          // Update changed fields
          const updated = {
            ...dupMatch,
            ...changes.changes,
            last_source_update_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await saveOpportunity(updated);
          result.updated++;
        } else {
          // No major changes, just update verification timestamp
          dupMatch.last_verified_at = new Date().toISOString();
          await saveOpportunity(dupMatch);
        }
      } else {
        // Brand new opportunity
        // If source requires review, mark PENDING_REVIEW; else APPROVED
        if (source.permission_status === 'REQUIRES_WRITTEN_PERMISSION') {
          normalized.status = OPPORTUNITY_STATUS.PENDING_REVIEW;
        }
        await saveOpportunity(normalized);
        result.created++;
      }
    }

    // Update source success metrics
    source.last_successful_sync = new Date().toISOString();
    source.last_sync_error = null;
    source.total_collected = (source.total_collected || 0) + result.created;
    await saveSource(source);

  } catch (err) {
    source.last_sync_error = err.message;
    await saveSource(source);
    result.errors.push(err.message);
  }

  return result;
}

/**
 * Synchronizes all active sources.
 */
export async function syncAllSources(force = false) {
  if (isSyncInProgress) {
    return { status: 'already_running', message: 'Sync cycle already in progress.' };
  }

  isSyncInProgress = true;
  const startedAt = new Date().toISOString();
  const summary = {
    startedAt,
    completedAt: null,
    totalSources: 0,
    successfulSources: 0,
    failedSources: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalCancelled: 0,
    details: [],
  };

  try {
    // 1. Run automatic expiry check first
    markExpiredOpportunities();

    const sources = getAllSources().filter(s => s.status === 'ACTIVE');
    summary.totalSources = sources.length;

    for (const source of sources) {
      // Check if sync frequency elapsed unless forced
      if (!force && source.last_successful_sync) {
        const lastSync = new Date(source.last_successful_sync).getTime();
        const intervalMs = (source.sync_frequency_minutes || 360) * 60 * 1000;
        if (Date.now() - lastSync < intervalMs) {
          continue; // Skip, not due yet
        }
      }

      const res = await syncSource(source.id);
      summary.details.push(res);
      if (res.errors.length > 0) {
        summary.failedSources++;
      } else {
        summary.successfulSources++;
      }
      summary.totalCreated += res.created;
      summary.totalUpdated += res.updated;
      summary.totalCancelled += res.cancelled;
    }

    // 2. Run post-sync expiry check
    markExpiredOpportunities();

    summary.completedAt = new Date().toISOString();
    return { status: 'success', summary };
  } finally {
    isSyncInProgress = false;
  }
}

