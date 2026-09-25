import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/messages/conversations
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: currentUserId },
          { participant2Id: currentUserId },
        ],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const otherUserIds = conversations.map((c) =>
      c.participant1Id === currentUserId ? c.participant2Id : c.participant1Id
    );

    const otherUsers = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        verificationBadge: true,
        profile: {
          select: { fullName: true, avatar: true, headline: true },
        },
      },
    });

    const userMap = new Map(otherUsers.map((u) => [u.id, u]));

    const unreadMessages = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        receiverId: currentUserId,
        isRead: false,
      },
      _count: true,
    });

    const unreadMap = new Map(unreadMessages.map((u) => [u.conversationId, u._count]));

    const formatted = conversations.map((c) => {
      const otherId = c.participant1Id === currentUserId ? c.participant2Id : c.participant1Id;
      return {
        id: c.id,
        participant: userMap.get(otherId) || null,
        lastMessage: c.lastMessage || c.messages?.[0]?.content || '',
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    return res.json({ conversations: formatted });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
});

// GET /api/messages/:conversationId
router.get('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.participant1Id !== req.user.id && conv.participant2Id !== req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// POST /api/messages
router.post('/', requireAuth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Recipient and message content are required.' });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself.' });
    }

    const [p1, p2] = [req.user.id, receiverId].sort();

    let conversation = await prisma.conversation.findUnique({
      where: {
        participant1Id_participant2Id: {
          participant1Id: p1,
          participant2Id: p2,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: p1,
          participant2Id: p2,
          lastMessage: content.trim(),
          lastMessageAt: new Date(),
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: content.trim(),
          lastMessageAt: new Date(),
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.user.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    const senderName = req.user.profile?.fullName || 'Someone';
    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: req.user.id,
        type: 'NEW_MESSAGE',
        title: `New message from ${senderName}`,
        message: content.trim().slice(0, 60),
        link: `/messages?conversationId=${conversation.id}`,
      },
    });

    return res.status(201).json({
      message: 'Message sent.',
      conversationId: conversation.id,
      data: message,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;
