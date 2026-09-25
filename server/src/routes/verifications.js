import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/verifications
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type = 'FOUNDER', startupId, businessDetails, website, documentUrl } = req.body;

    if (!businessDetails) {
      return res.status(400).json({ error: 'Please provide business details or supporting context.' });
    }

    const verification = await prisma.verificationRequest.create({
      data: {
        userId: req.user.id,
        startupId: startupId || null,
        type: type.toUpperCase(),
        businessDetails,
        website,
        documentUrl,
      },
    });

    return res.status(201).json({
      message: 'Verification request submitted. Our team will review your credentials.',
      verification,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit verification request.' });
  }
});

// GET /api/verifications/my
router.get('/my', requireAuth, async (req, res) => {
  try {
    const requests = await prisma.verificationRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        startup: { select: { name: true, stage: true } },
      },
    });

    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve verification requests.' });
  }
});

export default router;
