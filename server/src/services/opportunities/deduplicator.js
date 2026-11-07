/**
 * HookZ Worldwide Opportunities Deduplication & Change Detection System
 * Prevents identical or duplicate opportunities across sync iterations and multi-source reporting.
 */

/**
 * Normalizes title string for high-precision cross-source similarity matching.
 * E.g., "HackMIT 2026: Innovate The Future!" -> "hackmit 2026"
 */
export function normalizeTitleKey(title) {
  if (!title) return '';
  return String(title)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes registration URL for canonical equality check.
 * Strips UTM parameters, trailing slashes, and hash fragments.
 */
export function normalizeCanonicalUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl.trim());
    // Strip common tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach(p => {
      u.searchParams.delete(p);
    });
    // Return protocol + host + pathname
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Finds an existing matching opportunity in the existing list.
 * Match criteria:
 * 1. Exact match on (source_id + external_event_id)
 * 2. Exact match on normalized canonical registration URL
 * 3. Exact match on (organizer_name + normalized_title)
 */
export function findMatchingOpportunity(newItem, existingList) {
  if (!newItem || !Array.isArray(existingList)) return null;

  const newExtId = newItem.external_event_id ? String(newItem.external_event_id).trim() : null;
  const newSourceId = newItem.source_id;
  const newCanonicalUrl = normalizeCanonicalUrl(newItem.registration_url);
  const newTitleKey = normalizeTitleKey(newItem.title);
  const newOrg = String(newItem.organizer_name || '').toLowerCase().trim();

  for (const existing of existingList) {
    if (!existing) continue;

    // 1. Direct source + external ID match (highest confidence)
    if (newExtId && existing.source_id === newSourceId && String(existing.external_event_id).trim() === newExtId) {
      return { match: existing, reason: 'EXACT_EXTERNAL_ID' };
    }

    // 2. Canonical registration URL match (cross-source duplicate protection)
    const existingCanonicalUrl = normalizeCanonicalUrl(existing.registration_url);
    if (newCanonicalUrl && existingCanonicalUrl && newCanonicalUrl === existingCanonicalUrl) {
      return { match: existing, reason: 'CANONICAL_URL_MATCH' };
    }

    // 3. Normalized Title + Organizer match
    const existingTitleKey = normalizeTitleKey(existing.title);
    const existingOrg = String(existing.organizer_name || '').toLowerCase().trim();
    if (newTitleKey && existingTitleKey && newTitleKey === existingTitleKey) {
      if (newOrg === existingOrg || !newOrg || !existingOrg) {
        return { match: existing, reason: 'ORGANIZER_TITLE_MATCH' };
      }
    }
  }

  return null;
}

/**
 * Detects whether the new incoming opportunity record has material updates
 * compared to the previously stored record.
 */
export function detectChanges(existing, incoming) {
  if (!existing || !incoming) return { hasChanges: false, changedFields: [], changes: {} };

  const changedFields = [];
  const changes = {};

  const compareField = (key) => {
    const extVal = existing[key] ?? null;
    const incVal = incoming[key] ?? null;
    if (incVal !== null && incVal !== undefined && incVal !== extVal) {
      changedFields.push(key);
      changes[key] = incVal;
    }
  };

  compareField('registration_deadline');
  compareField('start_date');
  compareField('end_date');
  compareField('registration_url');
  compareField('status');
  compareField('location');
  compareField('participation_mode');
  compareField('price_type');
  compareField('description_summary');

  // Check if title changed significantly
  if (incoming.title && existing.title && incoming.title.trim() !== existing.title.trim()) {
    changedFields.push('title');
    changes.title = incoming.title.trim();
  }

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    changes,
  };
}

/**
 * Convenience wrapper for finding duplicate opportunity.
 * Supports both argument orders: (existingList, newItem) or (newItem, existingList).
 */
export function findDuplicate(arg1, arg2) {
  if (Array.isArray(arg1)) {
    const res = findMatchingOpportunity(arg2, arg1);
    return res ? res.match : null;
  } else if (Array.isArray(arg2)) {
    const res = findMatchingOpportunity(arg1, arg2);
    return res ? res.match : null;
  }
  return null;
}
