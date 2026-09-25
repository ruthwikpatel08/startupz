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
    const { receiverId, note } = req.body;

    if (!receiverId) return res.status(400).json({ error: 'Receiver user ID is required.' });
    if (receiverId === req.user.id) return res.status(400).json({ error: 'You cannot connect with yourself.' });

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: req.user.id, receiverId },
          { senderId: receiverId, receiverId: req.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'You are already connected with this user.' });
      }
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'A connection request is already pending.' });
      }
      const updated = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          senderId: req.user.id,
          receiverId,
          status: 'PENDING',
          note,
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

    const senderName = req.user.profile?.fullName || 'A startup builder';
    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: req.user.id,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        message: `${senderName} wants to connect with you.${note ? ` Note: "${note}"` : ''}`,
        link: '/network',
      },
    });

    return res.status(201).json({ message: 'Connection request sent!', connection });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send connection request.' });
  }
});

// PUT /api/connections/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    if (status === 'ACCEPTED') {
      await prisma.notification.create({
        data: {
          userId: conn.senderId,
          senderId: req.user.id,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted! 🤝',
          message: `${req.user.profile?.fullName || 'Your connection'} accepted your connection request.`,
          link: `/profile/${req.user.id}`,
        },
      });
    }

    return res.json({ message: `Connection request ${status.toLowerCase()}!`, connection: updated });
  } catch (error) {
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
    const { receiverId, ideaTitle, pitchDescription, proposedRole, proposedEquity } = req.body;

    if (!receiverId || !ideaTitle || !pitchDescription) {
      return res.status(400).json({ error: 'Please provide receiver, startup idea title, and proposal details.' });
    }

    if (receiverId === req.user.id) {
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

    await prisma.notification.create({
      data: {
        userId: receiverId,
        senderId: req.user.id,
        type: 'STARTUP_PROPOSAL',
        title: '🚀 Venture Co-Founder Proposal!',
        message: `${req.user.profile?.fullName || 'A founder'} invited you to co-found "${ideaTitle}"!`,
        link: '/network',
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
    const { status } = req.body; // ACCEPTED or DECLINED

    const proposal = await prisma.startupProposal.findUnique({ where: { id } });
    if (!proposal || proposal.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this proposal.' });
    }

    const updated = await prisma.startupProposal.update({
      where: { id },
      data: { status },
    });

    if (status === 'ACCEPTED') {
      // Automatically establish mutual connection if not connected
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

      await prisma.notification.create({
        data: {
          userId: proposal.senderId,
          senderId: req.user.id,
          type: 'PROPOSAL_ACCEPTED',
          title: '🎉 Startup Proposal Accepted!',
          message: `${req.user.profile?.fullName || 'Your partner'} agreed to co-found "${proposal.ideaTitle}"!`,
          link: `/profile/${req.user.id}`,
        },
      });
    }

    return res.json({ message: `Venture proposal ${status.toLowerCase()}!`, proposal: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to respond to startup proposal.' });
  }
});

export default router;
