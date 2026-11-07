/**
 * HookZ Worldwide Opportunities & Events API Routes
 * Supports discovery search, filtering, redirection, and administrator management.
 */

import express from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import {
  getAllOpportunities,
  getActivePublicOpportunities,
  getOpportunityById,
  saveOpportunity,
  getAllSources,
  getSourceById,
  saveSource,
  markExpiredOpportunities,
} from '../services/opportunities/storage.js';
import { syncAllSources, syncSource, isSyncing } from '../services/opportunities/engine.js';
import {
  OPPORTUNITY_CATEGORIES,
  PARTICIPATION_MODES,
  OPPORTUNITY_STATUS,
  normalizeOpportunity,
  isValidUrl,
} from '../services/opportunities/schema.js';

const router = express.Router();

/**
 * GET /api/opportunities/worldwide
 * Discovery query endpoint with multi-criteria filtering, search, sorting, and pagination.
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    markExpiredOpportunities();

    const {
      search,
      category,
      mode,
      country,
      price,
      certificate,
      status,
      sort = 'upcoming',
      page = 1,
      limit = 20,
    } = req.query;

    const isAdmin = Boolean(req.user && req.user.isAdmin);
    let allOpps = getAllOpportunities();

    // 1. Status Filter: Non-admins can only see APPROVED active opportunities
    if (!isAdmin) {
      const now = Date.now();
      allOpps = allOpps.filter(o => o.status === OPPORTUNITY_STATUS.APPROVED && (!o.end_date || new Date(o.end_date).getTime() >= now));
    } else if (status && status !== 'ALL') {
      allOpps = allOpps.filter(o => o.status === status);
    }

    // 2. Keyword Search (title, organizer, description, skills, location, country)
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      allOpps = allOpps.filter(o => {
        return (
          (o.title && o.title.toLowerCase().includes(q)) ||
          (o.organizer_name && o.organizer_name.toLowerCase().includes(q)) ||
          (o.description_summary && o.description_summary.toLowerCase().includes(q)) ||
          (o.location && o.location.toLowerCase().includes(q)) ||
          (o.country && o.country.toLowerCase().includes(q)) ||
          (o.city && o.city.toLowerCase().includes(q)) ||
          (Array.isArray(o.skills_required) && o.skills_required.some(s => s.toLowerCase().includes(q)))
        );
      });
    }

    // 3. Category Filter
    if (category && category !== 'ALL') {
      allOpps = allOpps.filter(o => o.category === category);
    }

    // 4. Participation Mode Filter (ONLINE, OFFLINE, HYBRID)
    if (mode && mode !== 'ALL') {
      allOpps = allOpps.filter(o => o.participation_mode === mode.toUpperCase());
    }

    // 5. Country Filter
    if (country && country !== 'ALL') {
      const cLower = country.toLowerCase().trim();
      allOpps = allOpps.filter(o => (o.country || '').toLowerCase().trim() === cLower);
    }

    // 6. Price Filter (FREE vs PAID)
    if (price && price !== 'ALL') {
      allOpps = allOpps.filter(o => o.price_type === price.toUpperCase());
    }

    // 7. Certificate filter
    if (certificate === 'true') {
      allOpps = allOpps.filter(o => o.certificate_available === true);
    }

    // 8. Sorting
    allOpps.sort((a, b) => {
      if (sort === 'deadline') {
        const da = a.registration_deadline ? new Date(a.registration_deadline).getTime() : Infinity;
        const db = b.registration_deadline ? new Date(b.registration_deadline).getTime() : Infinity;
        return da - db;
      }
      if (sort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // Default: 'upcoming' (start_date ascending)
      const sa = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const sb = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return sa - sb;
    });

    // 9. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const total = allOpps.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = allOpps.slice(startIndex, startIndex + limitNum);

    // Compute metrics from current public inventory
    const activePublic = getActivePublicOpportunities();
    const metrics = {
      totalActive: activePublic.length,
      totalOnline: activePublic.filter(o => o.participation_mode === 'ONLINE').length,
      totalFree: activePublic.filter(o => o.price_type === 'FREE').length,
      countriesCount: new Set(activePublic.map(o => o.country).filter(Boolean)).size,
      availableCategories: Object.values(OPPORTUNITY_CATEGORIES),
      availableModes: Object.values(PARTICIPATION_MODES),
    };

    res.json({
      opportunities: paginated,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
      metrics,
    });
  } catch (err) {
    console.error('[WorldwideOpps] Query error:', err);
    res.status(500).json({ error: 'Failed to retrieve opportunities.' });
  }
});

/**
 * GET /api/opportunities/worldwide/sources
 * Returns source registry with attribution information.
 */
router.get('/sources', (req, res) => {
  try {
    const sources = getAllSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sources.' });
  }
});

/**
 * GET /api/opportunities/worldwide/:id
 * Retrieve a single opportunity by ID.
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const opp = getOpportunityById(req.params.id);
    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    const isAdmin = Boolean(req.user && req.user.isAdmin);
    if (!isAdmin && opp.status !== OPPORTUNITY_STATUS.APPROVED) {
      return res.status(404).json({ error: 'Opportunity is not publicly accessible.' });
    }

    res.json(opp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch opportunity.' });
  }
});

/**
 * POST /api/opportunities/worldwide/sync
 * Admin endpoint: Trigger on-demand sync cycle.
 */
router.post('/sync', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (isSyncing()) {
      return res.status(409).json({ message: 'A synchronization cycle is already in progress.' });
    }

    const { sourceId, force = true } = req.body;

    if (sourceId) {
      const result = await syncSource(sourceId);
      return res.json({ status: 'success', result });
    }

    const result = await syncAllSources(force);
    res.json(result);
  } catch (err) {
    console.error('[WorldwideOpps] Sync trigger error:', err);
    res.status(500).json({ error: err.message || 'Synchronization failed.' });
  }
});

/**
 * POST /api/opportunities/worldwide
 * Admin endpoint: Manually create a verified opportunity.
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const raw = req.body;
    if (!raw.title || !raw.registration_url) {
      return res.status(400).json({ error: 'Title and Registration URL are required.' });
    }

    if (!isValidUrl(raw.registration_url)) {
      return res.status(400).json({ error: 'A valid HTTP/HTTPS registration URL is required.' });
    }

    const normalized = normalizeOpportunity({
      ...raw,
      source_id: raw.source_id || 'manual-admin',
      status: raw.status || OPPORTUNITY_STATUS.APPROVED,
    });

    if (!normalized) {
      return res.status(400).json({ error: 'Opportunity data failed normalization.' });
    }

    const saved = await saveOpportunity(normalized);
    res.status(201).json(saved);
  } catch (err) {
    console.error('[WorldwideOpps] Create opportunity error:', err);
    res.status(500).json({ error: 'Failed to create opportunity.' });
  }
});

/**
 * PUT /api/opportunities/worldwide/:id
 * Admin endpoint: Update an existing opportunity (edit details, approve, reject, mark cancelled).
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = getOpportunityById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    const updates = req.body;
    if (updates.registration_url && !isValidUrl(updates.registration_url)) {
      return res.status(400).json({ error: 'Invalid registration URL.' });
    }

    const merged = {
      ...existing,
      ...updates,
      id: existing.id,
      source_id: existing.source_id,
      external_event_id: existing.external_event_id,
      updated_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    };

    const saved = await saveOpportunity(merged);
    res.json(saved);
  } catch (err) {
    console.error('[WorldwideOpps] Update opportunity error:', err);
    res.status(500).json({ error: 'Failed to update opportunity.' });
  }
});

/**
 * DELETE /api/opportunities/worldwide/:id
 * Admin endpoint: Soft-delete / Withdraw opportunity (preserves historical record and integrity).
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const existing = getOpportunityById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    // Perform soft withdrawal rather than permanent deletion
    existing.status = OPPORTUNITY_STATUS.WITHDRAWN;
    existing.updated_at = new Date().toISOString();
    await saveOpportunity(existing);

    res.json({ message: 'Opportunity marked as WITHDRAWN.', opportunity: existing });
  } catch (err) {
    console.error('[WorldwideOpps] Withdraw opportunity error:', err);
    res.status(500).json({ error: 'Failed to withdraw opportunity.' });
  }
});

/**
 * PUT /api/opportunities/worldwide/admin/sources/:id
 * Admin endpoint: Configure a source (e.g. toggle status, change sync frequency).
 */
router.put('/admin/sources/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const source = getSourceById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Source not found.' });
    }

    const { status, sync_frequency_minutes, permission_status, attribution } = req.body;
    if (status) source.status = status;
    if (typeof sync_frequency_minutes === 'number') source.sync_frequency_minutes = sync_frequency_minutes;
    if (permission_status) source.permission_status = permission_status;
    if (attribution) source.attribution = attribution;

    const saved = await saveSource(source);
    res.json(saved);
  } catch (err) {
    console.error('[WorldwideOpps] Update source error:', err);
    res.status(500).json({ error: 'Failed to update source.' });
  }
});

export default router;

