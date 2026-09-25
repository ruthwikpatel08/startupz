import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalStartups,
      totalOpportunities,
      totalInvestors,
      totalMentors,
      totalConnections,
      totalPosts,
      pendingReports,
      pendingVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.startup.count(),
      prisma.startupOpportunity.count(),
      prisma.investor.count(),
      prisma.mentor.count(),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.post.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.verificationRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalStartups,
        totalOpportunities,
        totalInvestors,
        totalMentors,
        totalConnections,
        totalPosts,
        pendingReports,
        pendingVerifications,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve admin statistics.' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (role && role !== 'ALL') where.role = role.toUpperCase();
    if (search) {
      const q = search.trim();
      where.OR = [
        { email: { contains: q } },
        { profile: { fullName: { contains: q } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isAdmin: true,
          isVerified: true,
          verificationBadge: true,
          isSuspended: true,
          createdAt: true,
          profile: true,
        },
      }),
    ]);

    return res.json({ users, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspended } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isSuspended: Boolean(isSuspended) },
    });

    return res.json({ message: `User account ${user.isSuspended ? 'suspended' : 're-activated'}.`, user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user suspension status.' });
  }
});

// PUT /api/admin/users/:id/verify
router.put('/users/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, verificationBadge } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: Boolean(isVerified),
        verificationBadge: isVerified ? verificationBadge || 'Verified Member' : null,
      },
    });

    return res.json({ message: 'User verification updated.', user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user verification.' });
  }
});

// GET /api/admin/startups
router.get('/startups', async (req, res) => {
  try {
    const startups = await prisma.startup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        founder: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    });
    return res.json({ startups });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve startups.' });
  }
});

// PUT /api/admin/startups/:id/verify
router.put('/startups/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const startup = await prisma.startup.update({
      where: { id },
      data: { isVerified: Boolean(isVerified) },
    });

    return res.json({ message: `Startup ${isVerified ? 'verified' : 'unverified'}.`, startup });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify startup.' });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    });
    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// PUT /api/admin/reports/:id
router.put('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: { status },
    });

    return res.json({ message: `Report marked as ${status.toLowerCase()}.`, report });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update report.' });
  }
});

// GET /api/admin/verifications
router.get('/verifications', async (req, res) => {
  try {
    const verifications = await prisma.verificationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, role: true, profile: { select: { fullName: true } } } },
        startup: { select: { id: true, name: true, stage: true } },
      },
    });
    return res.json({ verifications });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve verification requests.' });
  }
});

// PUT /api/admin/verifications/:id
router.put('/verifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const verification = await prisma.verificationRequest.findUnique({
      where: { id },
      include: { user: true, startup: true },
    });

    if (!verification) return res.status(404).json({ error: 'Verification request not found.' });

    const updated = await prisma.verificationRequest.update({
      where: { id },
      data: { status, adminNotes },
    });

    if (status === 'APPROVED') {
      if (verification.type === 'STARTUP' && verification.startupId) {
        await prisma.startup.update({
          where: { id: verification.startupId },
          data: { isVerified: true },
        });
      } else {
        const badgeMap = {
          FOUNDER: 'Verified Founder',
          INVESTOR: 'Verified Investor',
          MENTOR: 'Verified Mentor',
        };
        await prisma.user.update({
          where: { id: verification.userId },
          data: {
            isVerified: true,
            verificationBadge: badgeMap[verification.type] || 'Verified Member',
          },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: verification.userId,
        type: 'SYSTEM',
        title: `Verification Request ${status.toLowerCase()}!`,
        message: status === 'APPROVED' 
          ? `Congratulations! Your ${verification.type} verification badge is now active.`
          : `Your verification request was rejected. Notes: ${adminNotes || 'Insufficient documentation.'}`,
      },
    });

    return res.json({ message: `Verification request ${status.toLowerCase()}.`, verification: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to review verification.' });
  }
});

export default router;
