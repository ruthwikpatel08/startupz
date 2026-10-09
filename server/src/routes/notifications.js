import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            verificationBadge: true,
            profile: {
              select: {
                fullName: true,
                avatar: true,
                headline: true,
                location: true,
                preferredRole: true,
              },
            },
          },
        },
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    return res.json({ notifications, unreadCount, data: notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, senderId } = req.body || {};
    const updateData = { isRead: true };
    if (type) updateData.type = type;
    if (title) updateData.title = title;

    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: updateData,
    });

    if (senderId) {
      await prisma.notification.updateMany({
        where: {
          userId: req.user.id,
          senderId,
          type: 'CONNECTION_REQUEST',
        },
        data: {
          isRead: true,
          type: type || 'CONNECTION_ACCEPTED',
          title: title || 'Connected 🤝',
        },
      }).catch(() => null);
    }
    return res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.deleteMany({
      where: { id, userId: req.user.id },
    });
    return res.json({ message: 'Notification dismissed.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to dismiss notification.' });
  }
});

export default router;
