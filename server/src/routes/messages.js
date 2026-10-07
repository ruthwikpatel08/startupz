import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isUserBlockedPair } from './users.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DELETED_CHATS_FILE = path.resolve(__dirname, '../../data/deleted_conversations.json');

function loadDeletedConversations() {
  const map = new Map();
  try {
    if (fs.existsSync(DELETED_CHATS_FILE)) {
      const raw = fs.readFileSync(DELETED_CHATS_FILE, 'utf8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) map.set(k, new Set(v));
      }
    }
  } catch {}
  return map;
}

function saveDeletedConversations(map) {
  try {
    const dir = path.dirname(DELETED_CHATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of map.entries()) {
      obj[k] = Array.from(v);
    }
    fs.writeFileSync(DELETED_CHATS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {}
}

// Per-user deleted conversations tracking (Map<userId, Set<conversationId>>)
const userDeletedConversations = loadDeletedConversations();

// GET /api/messages/conversations
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const userDeletedSet = userDeletedConversations.get(currentUserId) || new Set();

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

    // Filter out conversations deleted for current user
    const visibleConversations = conversations.filter((c) => !userDeletedSet.has(c.id));

    const otherUserIds = visibleConversations.map((c) =>
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

    const formatted = visibleConversations.map((c) => {
      const otherId = c.participant1Id === currentUserId ? c.participant2Id : c.participant1Id;
      return {
        id: c.id,
        participant: userMap.get(otherId) || null,
        participant1Id: c.participant1Id,
        participant2Id: c.participant2Id,
        lastMessage: c.lastMessage || c.messages?.[0]?.content || '',
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    return res.json({ conversations: formatted, data: formatted });
  } catch (error) {
    console.error('Get conversations error:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
});

// GET /api/messages/:conversationId
router.get('/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    let conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    
    // Fallback: If conversationId is actually another user's ID
    if (!conv) {
      const [p1, p2] = [req.user.id, conversationId].sort();
      conv = await prisma.conversation.findUnique({
        where: {
          participant1Id_participant2Id: {
            participant1Id: p1,
            participant2Id: p2,
          },
        },
      });
    }

    if (!conv) {
      return res.json({ messages: [], data: [] });
    }

    if (conv.participant1Id !== req.user.id && conv.participant2Id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    await prisma.message.updateMany({
      where: {
        conversationId: conv.id,
        receiverId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ messages, data: messages, conversationId: conv.id });
  } catch (error) {
    console.error('Get messages error:', error);
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

    // Safety check: verify neither party has blocked the other
    if (isUserBlockedPair(req.user.id, receiverId)) {
      return res.status(403).json({ error: 'Cannot send messages to a blocked user.' });
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

    // Unhide conversation for participants if it was previously hidden/deleted
    if (userDeletedConversations.has(receiverId)) {
      userDeletedConversations.get(receiverId).delete(conversation.id);
    }
    if (userDeletedConversations.has(req.user.id)) {
      userDeletedConversations.get(req.user.id).delete(conversation.id);
    }
    saveDeletedConversations(userDeletedConversations);

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
            email: true,
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
        message: content.trim().slice(0, 80),
        link: `/messages?conversationId=${conversation.id}&user=${req.user.id}`,
      },
    });

    return res.status(201).json({
      message: 'Message sent.',
      data: message,
      messageObject: message,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

// DELETE /api/messages/message/:id - Unsend message (like Instagram)
router.delete('/message/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    if (msg.senderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to unsend this message.' });
    }
    await prisma.message.delete({ where: { id } });
    return res.json({ success: true, message: 'Message unsent successfully.', messageId: id });
  } catch (error) {
    console.error('Unsend message error:', error);
    return res.status(500).json({ error: 'Failed to unsend message.' });
  }
});

// PUT /api/messages/message/:id - Edit message (like Instagram)
router.put('/message/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Updated message content is required.' });
    }
    const msg = await prisma.message.findUnique({ where: { id } });
    if (!msg) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    if (msg.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Only the sender can edit this message.' });
    }
    const updated = await prisma.message.update({
      where: { id },
      data: { content: content.trim() },
    });
    return res.json({ success: true, message: 'Message updated.', data: updated });
  } catch (error) {
    console.error('Edit message error:', error);
    return res.status(500).json({ error: 'Failed to edit message.' });
  }
});

// DELETE /api/messages/conversations/:conversationId - "Delete chat for me"
const deleteConversationHandler = async (req, res) => {
  try {
    const { conversationId } = req.params;

    let conv = await prisma.conversation.findUnique({ where: { id: conversationId } });

    if (!conv) {
      const [p1, p2] = [req.user.id, conversationId].sort();
      conv = await prisma.conversation.findUnique({
        where: {
          participant1Id_participant2Id: {
            participant1Id: p1,
            participant2Id: p2,
          },
        },
      });
    }

    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (conv.participant1Id !== req.user.id && conv.participant2Id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this conversation.' });
    }

    // Mark conversation as deleted for current user permanently
    if (!userDeletedConversations.has(req.user.id)) {
      userDeletedConversations.set(req.user.id, new Set());
    }
    userDeletedConversations.get(req.user.id).add(conv.id);
    saveDeletedConversations(userDeletedConversations);

    const otherId = conv.participant1Id === req.user.id ? conv.participant2Id : conv.participant1Id;

    // If the other participant has also deleted this conversation, purge completely
    if (userDeletedConversations.get(otherId)?.has(conv.id)) {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => null);
    }

    return res.json({
      message: 'Conversation deleted from your account permanently.',
      conversationId: conv.id,
      deletedForMe: true,
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({ error: 'Failed to delete conversation.' });
  }
};

router.delete('/conversations/:conversationId', requireAuth, deleteConversationHandler);
router.delete('/:conversationId', requireAuth, deleteConversationHandler);

export default router;

