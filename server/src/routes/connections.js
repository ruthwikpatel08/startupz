import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/connections - List all accepted connections
router.get('/', requireAuth, async (req, res) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { senderId: req.user.id, status: 'ACCEPTED' },
          { receiverId: req.user.id, status: 'ACCEPTED' },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            verificationBadge: true,
            profile: true,
          },
        },
        receiver: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            verificationBadge: true,
            profile: true,
          },
        },
      },
    });

    const formatted = connections.map((c) => {
      const isSender = c.senderId === req.user.id;
      const targetUser = isSender ? c.receiver : c.sender;
      return {
        connectionId: c.id,
        connectedAt: c.updatedAt,
        user: targetUser,
      };
    });

    return res.json({ connections: formatted });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve connections.' });
  }
});

// GET /api/connections/pending
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const [received, sent] = await Promise.all([
      prisma.connection.findMany({
        where: { receiverId: req.user.id, status: 'PENDING' },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.connection.findMany({
        where: { senderId: req.user.id, status: 'PENDING' },
        include: {
          receiver: {
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              profile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({ received, sent });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve connection requests.' });
  }
});

// POST /api/connections
router.post('/', requireAuth, async (req, res) => {
  try {
    let { receiverId, note, receiverEmail, receiverName, receiverRole } = req.body;

    if (!receiverId) return res.status(400).json({ error: 'Receiver user ID is required.' });

    // 1. First look up target user by id
    let targetUser = await prisma.user.findUnique({ where: { id: receiverId }, include: { profile: true } });

    // 2. If not found and email is provided, look up by email
    if (!targetUser && receiverEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: receiverEmail.toLowerCase().trim() },
        include: { profile: true },
      });
    }

    // 3. Look up by profile, investor, or mentor
    if (!targetUser) {
      const p = await prisma.profile.findFirst({
        where: { OR: [{ id: receiverId }, { userId: receiverId }] },
        include: { user: { include: { profile: true } } },
      });
      if (p) targetUser = p.user;
      else {
        const inv = await prisma.investor.findFirst({
          where: { OR: [{ id: receiverId }, { userId: receiverId }] },
          include: { user: { include: { profile: true } } },
        });
        if (inv) targetUser = inv.user;
        else {
          const m = await prisma.mentor.findFirst({
            where: { OR: [{ id: receiverId }, { userId: receiverId }] },
            include: { user: { include: { profile: true } } },
          });
          if (m) targetUser = m.user;
        }
      }
    }

    // 4. If targetUser is still not in Prisma (e.g. registered in Supabase), AUTO-PROVISION in Prisma
    if (!targetUser) {
      const email = receiverEmail ? receiverEmail.toLowerCase().trim() : `${receiverId}@synced.user`;
      const name = receiverName || email.split('@')[0];
      try {
        targetUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            id: receiverId,
            email,
            password: 'SUPABASE_SYNCED_USER',
            role: receiverRole || 'FOUNDER',
            isVerified: true,
            verificationBadge: 'Verified Member',
            profile: {
              create: {
                fullName: name,
                headline: 'Startup Builder',
                profileCompletion: 80,
              },
            },
          },
          include: { profile: true },
        });
      } catch (upsertErr) {
        targetUser = await prisma.user.findFirst({
          where: { OR: [{ id: receiverId }, { email }] },
          include: { profile: true },
        });
      }
    }

    if (targetUser) {
      receiverId = targetUser.id;
    }

    // Check if user is attempting to connect with themselves
    if (receiverId === req.user.id || (targetUser && targetUser.email.toLowerCase() === req.user.email.toLowerCase())) {
      return res.status(400).json({ error: 'You cannot connect with your own profile.' });
    }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });

    const senderName = req.user.profile?.fullName || 'A startup builder';

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.json({ message: 'You are already connected with this user.', connection: existing, alreadyConnected: true });
      }
      
      const updated = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          senderId: req.user.id,
          receiverId,
          status: 'PENDING',
          note: note !== undefined ? note : existing.note,
        },
      });

      // Send/Re-send notification to receiver — delete existing one first to prevent duplicates
      await prisma.notification.deleteMany({
        where: {
          userId: receiverId,
          senderId: req.user.id,
          type: 'CONNECTION_REQUEST',
        },
      });
      await prisma.notification.create({
        data: {
          userId: receiverId,
          senderId: req.user.id,
          type: 'CONNECTION_REQUEST',
          title: 'New Connection Request 🤝',
          message: `${senderName} wants to connect with you.${note ? ` Note: "${note}"` : ''}`,
          link: '/network?tab=PENDING',
        },
      });

      return res.json({ message: 'Connection request sent!', connection: updated });
    }

    const connection = await prisma.connection.create({
      data: {
        senderId: req.user.id,
        receiverId,
        status: 'PENDING',
        note,
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: req.user.id,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request 🤝',
        message: `${senderName} wants to connect with you.${note ? ` Note: "${note}"` : ''}`,
        link: '/network?tab=PENDING',
      },
    });

    return res.status(201).json({ message: 'Connection request sent!', connection });
  } catch (error) {
    console.error('Send connection error:', error);
    return res.status(500).json({ error: 'Failed to send connection request.' });
  }
});

// GET /api/connections/count/:userId - Get public connection count for any user
router.get('/count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
    });
    return res.json({ count });
  } catch (err) {
    return res.json({ count: 0 });
  }
});

// PUT /api/connections/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let status = req.body.status || req.body.action;

    if (typeof status === 'string') {
      const upper = status.toUpperCase();
      if (upper === 'ACCEPT' || upper === 'ACCEPTED') status = 'ACCEPTED';
      else if (upper === 'REJECT' || upper === 'REJECTED' || upper === 'DECLINE' || upper === 'DECLINED') status = 'REJECTED';
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACCEPTED or REJECTED.' });
    }

    const conn = await prisma.connection.findUnique({ where: { id } });
    if (!conn || conn.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to respond to this request.' });
    }

    const updated = await prisma.connection.update({
      where: { id },
      data: { status },
    });

    let conversationId = null;

    if (status === 'ACCEPTED') {
      // 1. Send accepted notification to sender with direct chat link
      await prisma.notification.create({
        data: {
          userId: conn.senderId,
          senderId: req.user.id,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted! 🤝',
          message: `${req.user.profile?.fullName || 'Your connection'} accepted your connection request. You can now chat!`,
          link: `/messages?user=${req.user.id}`,
        },
      });

      // 2. Automatically establish Conversation between them so they can immediately chat
      const [p1, p2] = [conn.senderId, conn.receiverId].sort();
      let conv = await prisma.conversation.findUnique({
        where: {
          participant1Id_participant2Id: {
            participant1Id: p1,
            participant2Id: p2,
          },
        },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            participant1Id: p1,
            participant2Id: p2,
            lastMessage: 'Connected! Say hello and start collaborating.',
            lastMessageAt: new Date(),
          },
        });
      }
      conversationId = conv.id;
    }

    return res.json({
      message: `Connection request ${status.toLowerCase()}!`,
      connection: updated,
      conversationId,
    });
  } catch (error) {
    console.error('Update connection error:', error);
    return res.status(500).json({ error: 'Failed to update connection request.' });
  }
});

// DELETE /api/connections/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await prisma.connection.findUnique({ where: { id } });

    if (!conn || (conn.senderId !== req.user.id && conn.receiverId !== req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized to remove this connection.' });
    }

    await prisma.connection.delete({ where: { id } });
    return res.json({ message: 'Connection removed.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove connection.' });
  }
});

// POST /api/connections/startup-proposal - Propose Co-Founding a Startup
router.post('/startup-proposal', requireAuth, async (req, res) => {
  try {
    let { receiverId, ideaTitle, pitchDescription, proposedRole, proposedEquity } = req.body;

    if (!receiverId || !ideaTitle || !pitchDescription) {
      return res.status(400).json({ error: 'Please provide receiver, startup idea title, and proposal details.' });
    }

    // Resolve receiverId if it was passed as a Profile, Investor, or Mentor ID
    let targetUser = await prisma.user.findUnique({ where: { id: receiverId }, include: { profile: true } });
    if (!targetUser && req.body.receiverEmail) {
      targetUser = await prisma.user.findUnique({
        where: { email: req.body.receiverEmail.toLowerCase().trim() },
        include: { profile: true },
      });
    }

    if (!targetUser) {
      const p = await prisma.profile.findFirst({ where: { OR: [{ id: receiverId }, { userId: receiverId }] } });
      if (p) {
        receiverId = p.userId;
        targetUser = await prisma.user.findUnique({ where: { id: receiverId } });
      } else {
        const inv = await prisma.investor.findFirst({ where: { OR: [{ id: receiverId }, { userId: receiverId }] } });
        if (inv) {
          receiverId = inv.userId;
          targetUser = await prisma.user.findUnique({ where: { id: receiverId } });
        } else {
          const m = await prisma.mentor.findFirst({ where: { OR: [{ id: receiverId }, { userId: receiverId }] } });
          if (m) {
            receiverId = m.userId;
            targetUser = await prisma.user.findUnique({ where: { id: receiverId } });
          }
        }
      }
    }

    // Auto-provision if missing from Prisma
    if (!targetUser) {
      const email = req.body.receiverEmail ? req.body.receiverEmail.toLowerCase().trim() : `${receiverId}@synced.user`;
      const name = req.body.receiverName || email.split('@')[0];
      try {
        targetUser = await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            id: receiverId,
            email,
            password: 'SUPABASE_SYNCED_USER',
            role: proposedRole?.includes('Investor') ? 'INVESTOR' : 'FOUNDER',
            isVerified: true,
            verificationBadge: 'Verified Member',
            profile: {
              create: {
                fullName: name,
                headline: 'Startup Builder',
                profileCompletion: 80,
              },
            },
          },
          include: { profile: true },
        });
      } catch (e) {
        targetUser = await prisma.user.findFirst({
          where: { OR: [{ id: receiverId }, { email }] },
          include: { profile: true },
        });
      }
    }

    if (targetUser) {
      receiverId = targetUser.id;
    }

    if (receiverId === req.user.id || (targetUser && targetUser.email.toLowerCase() === req.user.email.toLowerCase())) {
      return res.status(400).json({ error: 'You cannot propose starting a company with yourself.' });
    }

    const proposal = await prisma.startupProposal.create({
      data: {
        senderId: req.user.id,
        receiverId,
        ideaTitle: ideaTitle.trim(),
        pitchDescription: pitchDescription.trim(),
        proposedRole: proposedRole || 'Technical Co-Founder',
        proposedEquity: proposedEquity || '50/50',
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    const senderName = req.user.profile?.fullName || 'A founder';
    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: req.user.id,
        type: 'STARTUP_PROPOSAL',
        title: '🚀 Venture Co-Founder Proposal!',
        message: `${senderName} invited you to co-found "${ideaTitle}"! Role: ${proposedRole || 'Technical Co-Founder'} • Equity: ${proposedEquity || '50/50'}.`,
        link: '/network?tab=PROPOSALS',
      },
    });

    return res.status(201).json({ message: 'Startup proposal submitted successfully!', proposal });
  } catch (error) {
    console.error('Startup proposal error:', error);
    return res.status(500).json({ error: 'Failed to submit startup proposal.' });
  }
});

// GET /api/connections/startup-proposals - List Sent and Received Startup Proposals
router.get('/startup-proposals', requireAuth, async (req, res) => {
  try {
    const [received, sent] = await Promise.all([
      prisma.startupProposal.findMany({
        where: { receiverId: req.user.id },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatar: true, headline: true, location: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.startupProposal.findMany({
        where: { senderId: req.user.id },
        include: {
          receiver: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatar: true, headline: true, location: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({ received, sent });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve startup proposals.' });
  }
});

// PUT /api/connections/startup-proposals/:id - Accept or Decline Proposal
router.put('/startup-proposals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    let status = req.body.status || req.body.action;

    if (typeof status === 'string') {
      const upper = status.toUpperCase();
      if (upper === 'ACCEPT' || upper === 'ACCEPTED') status = 'ACCEPTED';
      else if (upper === 'DECLINE' || upper === 'DECLINED' || upper === 'REJECT' || upper === 'REJECTED') status = 'DECLINED';
    }

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACCEPTED or DECLINED.' });
    }

    const proposal = await prisma.startupProposal.findUnique({ where: { id } });
    if (!proposal || proposal.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this proposal.' });
    }

    const updated = await prisma.startupProposal.update({
      where: { id },
      data: { status },
    });

    let conversationId = null;

    if (status === 'ACCEPTED') {
      // 1. Automatically establish mutual connection if not connected
      await prisma.connection.upsert({
        where: {
          senderId_receiverId: {
            senderId: proposal.senderId,
            receiverId: proposal.receiverId,
          },
        },
        update: { status: 'ACCEPTED' },
        create: {
          senderId: proposal.senderId,
          receiverId: proposal.receiverId,
          status: 'ACCEPTED',
          note: `Co-founding partner on ${proposal.ideaTitle}`,
        },
      });

      // 2. Automatically establish Conversation between them so they can immediately chat
      const [p1, p2] = [proposal.senderId, proposal.receiverId].sort();
      let conv = await prisma.conversation.findUnique({
        where: {
          participant1Id_participant2Id: {
            participant1Id: p1,
            participant2Id: p2,
          },
        },
      });

      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            participant1Id: p1,
            participant2Id: p2,
            lastMessage: `Agreed to co-found "${proposal.ideaTitle}"! Let's build together.`,
            lastMessageAt: new Date(),
          },
        });
      } else {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            lastMessage: `Agreed to co-found "${proposal.ideaTitle}"! Let's build together.`,
            lastMessageAt: new Date(),
          },
        });
      }
      conversationId = conv.id;

      // 3. Send notification to the proposal sender
      await prisma.notification.create({
        data: {
          userId: proposal.senderId,
          senderId: req.user.id,
          type: 'PROPOSAL_ACCEPTED',
          title: '🎉 Startup Proposal Accepted!',
          message: `${req.user.profile?.fullName || 'Your partner'} agreed to co-found "${proposal.ideaTitle}"! You can now chat directly.`,
          link: `/messages?user=${req.user.id}`,
        },
      });
    } else if (status === 'DECLINED') {
      await prisma.notification.create({
        data: {
          userId: proposal.senderId,
          senderId: req.user.id,
          type: 'PROPOSAL_DECLINED',
          title: 'Startup Proposal Update',
          message: `${req.user.profile?.fullName || 'A builder'} declined the co-founder proposal for "${proposal.ideaTitle}".`,
          link: '/network?tab=PROPOSALS',
        },
      });
    }

    return res.json({
      message: `Venture proposal ${status.toLowerCase()}!`,
      proposal: updated,
      conversationId,
    });
  } catch (error) {
    console.error('Respond proposal error:', error);
    return res.status(500).json({ error: 'Failed to respond to startup proposal.' });
  }
});

export default router;
