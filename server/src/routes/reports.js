import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/reports
router.post('/', requireAuth, async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Please provide target type, target ID, and reason for report.' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        targetType: targetType.toUpperCase(),
        targetId,
        reason,
        description,
      },
    });

    return res.status(201).json({
      message: 'Report submitted. Our moderation team will investigate promptly.',
      reportId: report.id,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit report.' });
  }
});

export default router;
