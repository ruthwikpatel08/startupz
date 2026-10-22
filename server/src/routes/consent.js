import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

/**
 * POST /api/consent
 * Record an explicit, purpose-specific consent action (DPDP Act 2023 Sec 6).
 * Supported fields:
 * - purpose: e.g. "TERMS_AND_PRIVACY_NOTICE", "PROFILE_DISCOVERY", "MARKETING_COMMUNICATIONS", "COOKIE_AND_TRACKING_PREFERENCES"
 * - consentVersion: string (e.g. "1.0")
 * - status: "GRANTED" | "REVOKED" | "WITHDRAWN" | "ESSENTIAL_ONLY"
 * - userEmail: optional (if not signed in yet, e.g. during registration)
 * - details: optional JSON string or metadata
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      purpose,
      consentVersion = '1.0',
      status = 'GRANTED',
      userEmail,
      details,
    } = req.body;

    if (!purpose) {
      return res.status(400).json({ error: 'Consent purpose is required.' });
    }

    const userId = req.user?.id || null;
    const email = (userEmail || req.user?.email || '').trim().toLowerCase() || null;
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 100);
    const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 255);

    // 1. Log to Prisma
    const log = await prisma.consentLog.create({
      data: {
        userId,
        userEmail: email,
        purpose,
        consentVersion,
        status,
        ipAddress,
        userAgent,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });

    // 2. Mirror to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('consent_logs').insert({
          id: log.id,
          user_id: userId,
          user_email: email,
          purpose,
          consent_version: consentVersion,
          status,
          ip_address: ipAddress,
          user_agent: userAgent,
          details: typeof details === 'object' ? JSON.stringify(details) : details,
        });
      } catch (sbErr) {
        // Non-blocking fallback
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Consent recorded successfully.',
      consent: {
        id: log.id,
        purpose: log.purpose,
        status: log.status,
        consentVersion: log.consentVersion,
        timestamp: log.createdAt,
      },
    });
  } catch (error) {
    console.error('Consent recording error:', error);
    return res.status(500).json({ error: 'Failed to record consent.' });
  }
});

/**
 * GET /api/consent/my
 * Retrieve all active and historical consent records for the authenticated user.
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    const logs = await prisma.consentLog.findMany({
      where: {
        OR: [
          { userId },
          ...(userEmail ? [{ userEmail }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        purpose: l.purpose,
        status: l.status,
        consentVersion: l.consentVersion,
        timestamp: l.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching consent logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve consent records.' });
  }
});

/**
 * POST /api/consent/withdraw
 * Ease of withdrawal (DPDP Section 6(4)): Allows user to withdraw previously granted consent.
 */
router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    const { purpose } = req.body;
    if (!purpose) {
      return res.status(400).json({ error: 'Purpose to withdraw is required.' });
    }

    const userId = req.user.id;
    const email = (req.user.email || '').toLowerCase().trim();
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 100);
    const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 255);

    const log = await prisma.consentLog.create({
      data: {
        userId,
        userEmail: email,
        purpose,
        consentVersion: '1.0',
        status: 'WITHDRAWN',
        ipAddress,
        userAgent,
        details: 'User initiated consent withdrawal under DPDP Act Section 6(4)',
      },
    });

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('consent_logs').insert({
          id: log.id,
          user_id: userId,
          user_email: email,
          purpose,
          consent_version: '1.0',
          status: 'WITHDRAWN',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      } catch (e) {}
    }

    return res.json({
      success: true,
      message: `Consent for '${purpose}' has been successfully withdrawn.`,
      consent: {
        id: log.id,
        purpose: log.purpose,
        status: log.status,
        timestamp: log.createdAt,
      },
    });
  } catch (error) {
    console.error('Consent withdrawal error:', error);
    return res.status(500).json({ error: 'Failed to withdraw consent.' });
  }
});

export default router;
