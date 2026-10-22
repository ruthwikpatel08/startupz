import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

/**
 * POST /api/dsar
 * Submit a formal Data Subject Rights Request (DPDP Act 2023 Chapter III).
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      fullName,
      email,
      requestType,
      details,
      nominee,
      userId,
    } = req.body;

    if (!fullName || !email || !requestType) {
      return res.status(400).json({ error: 'Full name, email address, and request type are required.' });
    }

    const validTypes = ['ACCESS', 'CORRECTION', 'ERASURE', 'CONSENT_WITHDRAWAL', 'NOMINATION'];
    const cleanType = String(requestType).toUpperCase().trim();
    if (!validTypes.includes(cleanType)) {
      return res.status(400).json({ error: `Invalid request type. Must be one of: ${validTypes.join(', ')}` });
    }

    const cleanEmail = email.trim().toLowerCase();
    const effectiveUserId = req.user?.id || userId || null;

    let nomineeDetailsStr = null;
    if (nominee && typeof nominee === 'object') {
      nomineeDetailsStr = JSON.stringify(nominee);
    }

    const dsar = await prisma.dSARRequest.create({
      data: {
        userId: effectiveUserId,
        fullName: fullName.trim(),
        email: cleanEmail,
        requestType: cleanType,
        details: (details || `Request for ${cleanType}`).trim(),
        nomineeDetails: nomineeDetailsStr,
        status: 'PENDING',
      },
    });

    const referenceId = `DSAR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${dsar.id.slice(0, 6).toUpperCase()}`;

    // Mirror to Supabase if available
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('dsar_requests').insert({
          id: dsar.id,
          user_id: effectiveUserId,
          full_name: fullName.trim(),
          email: cleanEmail,
          request_type: cleanType,
          details: dsar.details,
          nominee_details: nomineeDetailsStr,
          status: 'PENDING',
        });
      } catch (e) {}
    }

    // Also notify admins of DSAR submission via internal notification
    try {
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { isAdmin: true },
            { email: { in: ['ruthwikpatel08@gmail.com', 'admin@startupz.com'] } },
          ],
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM',
            title: `New DPDP Rights Request (${cleanType})`,
            message: `User ${fullName} (${cleanEmail}) submitted a ${cleanType} request [Ref: ${referenceId}]. Statutory SLA: 30 days.`,
            link: '/admin',
          },
        }).catch(() => null);
      }
    } catch (notifErr) {}

    return res.status(201).json({
      success: true,
      message: 'Your Data Subject Rights Request has been officially registered.',
      referenceId,
      id: dsar.id,
      requestType: dsar.requestType,
      status: dsar.status,
      slaDays: 30,
      createdAt: dsar.createdAt,
    });
  } catch (error) {
    console.error('DSAR submission error:', error);
    return res.status(500).json({ error: 'Failed to submit rights request. Please try again or email grievance@hookz.in directly.' });
  }
});

/**
 * GET /api/dsar/export
 * Fulfill Right to Access (Section 11): Instant machine-readable export of all user personal data.
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve all linked entities for the user across the database
    const [
      userRecord,
      profileRecord,
      startups,
      applications,
      connectionsSent,
      connectionsReceived,
      proposalsSent,
      proposalsReceived,
      consentHistory,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          verificationBadge: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.profile.findUnique({
        where: { userId },
      }),
      prisma.startup.findMany({
        where: { founderId: userId },
        include: {
          opportunities: true,
        },
      }),
      prisma.opportunityApplication.findMany({
        where: { applicantId: userId },
        include: {
          opportunity: {
            select: { role: true, startup: { select: { name: true } } },
          },
        },
      }),
      prisma.connection.findMany({
        where: { senderId: userId },
        include: { receiver: { select: { email: true, role: true } } },
      }),
      prisma.connection.findMany({
        where: { receiverId: userId },
        include: { sender: { select: { email: true, role: true } } },
      }),
      prisma.startupProposal.findMany({
        where: { senderId: userId },
      }),
      prisma.startupProposal.findMany({
        where: { receiverId: userId },
      }),
      prisma.consentLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Also log this data access action in consent/audit logs
    await prisma.consentLog.create({
      data: {
        userId,
        userEmail: req.user.email,
        purpose: 'DATA_SUBJECT_ACCESS_REQUEST_EXPORT',
        status: 'GRANTED',
        details: 'Self-service instant personal data export executed under DPDP Section 11',
      },
    }).catch(() => null);

    const exportPayload = {
      exportMetadata: {
        platform: 'HookZ Technologies Inc. (hookz.in)',
        statutoryBasis: 'Digital Personal Data Protection Act, 2023 (Section 11 - Right to Access)',
        generatedAt: new Date().toISOString(),
        userId,
        accountEmail: req.user.email,
      },
      personalData: {
        account: userRecord,
        profile: profileRecord,
        startupsFounded: startups,
        opportunityApplications: applications,
        networkingConnections: {
          sent: connectionsSent,
          received: connectionsReceived,
        },
        proposals: {
          sent: proposalsSent,
          received: proposalsReceived,
        },
        consentLogs: consentHistory,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="hookz_data_export_${userId}.json"`);
    return res.status(200).json(exportPayload);
  } catch (error) {
    console.error('DSAR export error:', error);
    return res.status(500).json({ error: 'Failed to generate personal data export.' });
  }
});

/**
 * GET /api/dsar/my
 * View current user's submitted DSAR requests.
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || '').toLowerCase().trim();

    const requests = await prisma.dSARRequest.findMany({
      where: {
        OR: [
          { userId },
          ...(email ? [{ email }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching my DSAR requests:', error);
    return res.status(500).json({ error: 'Failed to retrieve DSAR requests.' });
  }
});

export default router;
