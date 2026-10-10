import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

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
                username: true,
              },
            },
          },
        },
      },
    });

    // Hydrate senders with latest Supabase profiles so edited logos and usernames always show
    if (supabaseAdmin && notifications.length > 0) {
      const senderIds = Array.from(
        new Set(
          notifications
            .map((n) => n.senderId || n.sender?.id)
            .filter((id) => Boolean(id) && typeof id === 'string')
        )
      );

      if (senderIds.length > 0) {
        try {
          const { data: supaProfiles } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('user_id', senderIds);

          if (supaProfiles && supaProfiles.length > 0) {
            const profileMap = new Map();
            supaProfiles.forEach((p) => {
              if (p.user_id) profileMap.set(p.user_id, p);
              if (p.id) profileMap.set(p.id, p);
              if (p.email) profileMap.set(p.email.toLowerCase(), p);
            });

            notifications.forEach((n) => {
              const sid = n.senderId || n.sender?.id;
              const sp = sid ? profileMap.get(sid) : null;
              if (sp) {
                if (!n.sender) {
                  n.sender = {
                    id: sid,
                    email: sp.email || '',
                    role: sp.preferred_role || 'STUDENT',
                    profile: {},
                  };
                }
                if (!n.sender.profile) n.sender.profile = {};
                if (sp.full_name) n.sender.profile.fullName = sp.full_name;
                if (sp.avatar) n.sender.profile.avatar = sp.avatar;
                if (sp.username) n.sender.profile.username = sp.username;
                if (sp.headline) n.sender.profile.headline = sp.headline;
              }
            });
          }
        } catch (enrichErr) {
          console.warn('Notifications profile enrichment notice:', enrichErr?.message);
        }
      }
    }

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
