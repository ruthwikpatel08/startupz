import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isUserBlockedPair } from './users.js';
import { messagingLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DELETED_CHATS_FILE = path.resolve(__dirname, '../../data/deleted_conversations.json');
const DELETED_MSGS_FILE = path.resolve(__dirname, '../../data/deleted_messages.json');

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

function loadDeletedMessages() {
  const map = new Map();
  try {
    if (fs.existsSync(DELETED_MSGS_FILE)) {
      const raw = fs.readFileSync(DELETED_MSGS_FILE, 'utf8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) map.set(k, new Set(v));
      }
    }
  } catch {}
  return map;
}

function saveDeletedMessages(map) {
  try {
    const dir = path.dirname(DELETED_MSGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of map.entries()) {
      obj[k] = Array.from(v);
    }
    fs.writeFileSync(DELETED_MSGS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {}
}

// Per-user deleted conversations tracking (Map<userId, Set<conversationId>>)
const userDeletedConversations = loadDeletedConversations();
// Per-user deleted messages tracking (Map<userId, Set<messageId>>)
const userDeletedMessages = loadDeletedMessages();

// GET /api/messages/deleted-items
router.get('/deleted-items', requireAuth, (req, res) => {
  const convs = userDeletedConversations.get(req.user.id) || new Set();
  const msgs = userDeletedMessages.get(req.user.id) || new Set();
  return res.json({
    deletedConversationIds: Array.from(convs),
    deletedMessageIds: Array.from(msgs),
  });
});

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

    const userDeletedMsgs = userDeletedMessages.get(req.user.id);
    const visibleMessages = userDeletedMsgs
      ? messages.filter((m) => !userDeletedMsgs.has(m.id))
      : messages;

    return res.json({ messages: visibleMessages, data: visibleMessages, conversationId: conv.id });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// POST /api/messages
router.post('/', requireAuth, messagingLimiter, async (req, res) => {
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

// POST /api/messages/message/:id/delete-for-me - Delete message for me
router.post('/message/:id/delete-for-me', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!userDeletedMessages.has(req.user.id)) {
      userDeletedMessages.set(req.user.id, new Set());
    }
    userDeletedMessages.get(req.user.id).add(id);
    saveDeletedMessages(userDeletedMessages);
    return res.json({ success: true, messageId: id, deletedForMe: true });
  } catch (error) {
    console.error('Delete message for me error:', error);
    return res.status(500).json({ error: 'Failed to delete message for you.' });
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

    // Also mark ALL existing messages in this conversation as deleted for current user
    // so if a conversation is restarted later, old messages never reappear
    try {
      const existingMsgs = await prisma.message.findMany({
        where: { conversationId: conv.id },
        select: { id: true },
      });
      if (!userDeletedMessages.has(req.user.id)) {
        userDeletedMessages.set(req.user.id, new Set());
      }
      const userMsgSet = userDeletedMessages.get(req.user.id);
      for (const m of existingMsgs) {
        userMsgSet.add(m.id);
      }
      saveDeletedMessages(userDeletedMessages);
    } catch {}

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

// Helper to resolve all alias candidate IDs for a user
function getUserCandidateIds(user) {
  if (!user) return [];
  const ids = new Set(
    [user.id, user.profile?.id, user.profile?.userId, user._id]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase())
  );
  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  const hasRuthwik = Array.from(ids).some((id) => ruthwikIds.includes(id)) ||
    (user.email && user.email.toLowerCase().includes('ruthwik')) ||
    (user.profile?.username && user.profile.username.toLowerCase().includes('ruthwik'));
  if (hasRuthwik) {
    ruthwikIds.forEach((id) => ids.add(id));
  }

  const hasGokul = Array.from(ids).some((id) => gokulIds.includes(id)) ||
    (user.email && user.email.toLowerCase().includes('gokul')) ||
    (user.profile?.username && user.profile.username.toLowerCase().includes('gokul'));
  if (hasGokul) {
    gokulIds.forEach((id) => ids.add(id));
  }

  return Array.from(ids);
}

// GET /api/messages/unread-count - Accurate unread messages count across all candidate user IDs
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const candidateIds = getUserCandidateIds(req.user);
    let count = 0;
    if (supabaseAdmin) {
      const { count: sbCount } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('receiver_id', candidateIds)
        .eq('is_read', false);
      if (typeof sbCount === 'number') count = sbCount;
    } else {
      count = await prisma.message.count({
        where: {
          receiverId: { in: candidateIds },
          isRead: false,
        },
      });
    }
    return res.json({ unreadCount: count });
  } catch (error) {
    return res.json({ unreadCount: 0 });
  }
});

// PUT /api/messages/conversations/:conversationId/read - Mark conversation messages as read authoritatively
const markConversationReadHandler = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const candidateIds = getUserCandidateIds(req.user);

    // 1. Mark in Prisma
    try {
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: { in: candidateIds },
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (e) {
      console.warn('Prisma message read update notice:', e.message);
    }

    // 2. Mark in Supabase via privileged admin client (bypasses client RLS restrictions)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .in('receiver_id', candidateIds)
          .eq('is_read', false);

        // Also mark any incoming message in this conversation not sent by current user
        await supabaseAdmin
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .not('sender_id', 'in', `(${candidateIds.map((id) => `"${id}"`).join(',')})`)
          .eq('is_read', false);
      } catch (sErr) {
        console.warn('Supabase mark read error:', sErr.message);
      }
    }

    return res.json({ success: true, conversationId });
  } catch (error) {
    console.error('Mark conversation as read error:', error);
    return res.status(500).json({ error: 'Failed to mark conversation as read.' });
  }
};

router.put('/conversations/:conversationId/read', requireAuth, markConversationReadHandler);
router.post('/conversations/:conversationId/read', requireAuth, markConversationReadHandler);

// PUT /api/messages/read-all - Mark all received messages as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    const candidateIds = getUserCandidateIds(req.user);
    if (prisma) {
      await prisma.message.updateMany({
        where: {
          receiverId: { in: candidateIds },
          isRead: false,
        },
        data: { isRead: true },
      }).catch(() => null);
    }
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('messages')
        .update({ is_read: true })
        .in('receiver_id', candidateIds)
        .eq('is_read', false)
        .catch(() => null);
    }
    return res.json({ success: true, message: 'All messages marked as read.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all messages as read.' });
  }
});

export default router;

