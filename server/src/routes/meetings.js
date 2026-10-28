import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth, isUserAdminCheck } from '../middleware/auth.js';

const router = express.Router();

function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
}

// POST /api/meetings/schedule - Schedule a Video Meeting
router.post('/schedule', requireAuth, async (req, res) => {
  try {
    const { guestId, title, scheduledAt, durationMinutes = 30, notes } = req.body;

    if (!guestId || !title) {
      return res.status(400).json({ error: 'Please provide guest and meeting title.' });
    }

    if (guestId === req.user.id) {
      return res.status(400).json({ error: 'Cannot host a meeting with yourself.' });
    }

    const roomCode = generateRoomCode();

    const meeting = await prisma.videoMeeting.create({
      data: {
        hostId: req.user.id,
        guestId,
        title: title.trim(),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        roomCode,
        notes: notes ? notes.trim() : null,
      },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
        guest: {
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
        userId: guestId,
        senderId: req.user.id,
        type: 'VIDEO_MEETING',
        title: '📹 Video Meeting Invitation!',
        message: `${req.user.profile?.fullName || 'A founder'} scheduled a video meeting: "${title}".`,
        link: `/meeting/${roomCode}`,
      },
    });

    return res.status(201).json({ message: 'Meeting scheduled successfully!', meeting });
  } catch (error) {
    console.error('Schedule meeting error:', error);
    return res.status(500).json({ error: 'Failed to schedule video meeting.' });
  }
});

// GET /api/meetings - List My Video Meetings
router.get('/', requireAuth, async (req, res) => {
  try {
    const meetings = await prisma.videoMeeting.findMany({
      where: {
        OR: [
          { hostId: req.user.id },
          { guestId: req.user.id },
        ],
      },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
        guest: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return res.json({ meetings });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve video meetings.' });
  }
});

// GET /api/meetings/:roomCode - Get Video Room Details
router.get('/:roomCode', optionalAuth, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const meeting = await prisma.videoMeeting.findUnique({
      where: { roomCode },
      include: {
        host: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
        guest: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    if (!meeting) {
      // Allow impromptu instant room
      return res.json({
        meeting: {
          roomCode,
          title: `HookZ Instant Meeting Room (${roomCode})`,
          status: 'ACTIVE',
          scheduledAt: new Date(),
          durationMinutes: 45,
          host: req.user ? { profile: req.user.profile } : { email: 'Host' },
        },
      });
    }

    const isParticipant = req.user && (
      req.user.id === meeting.hostId ||
      req.user.id === meeting.guestId ||
      isUserAdminCheck(req.user)
    );

    const safeMeeting = {
      ...meeting,
      host: meeting.host ? {
        ...meeting.host,
        email: isParticipant ? meeting.host.email : undefined,
      } : null,
      guest: meeting.guest ? {
        ...meeting.guest,
        email: isParticipant ? meeting.guest.email : undefined,
      } : null,
    };

    return res.json({ meeting: safeMeeting });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get meeting room.' });
  }
});

// PUT /api/meetings/:id/status
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const meeting = await prisma.videoMeeting.findUnique({ where: { id } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    const isParticipant = meeting.hostId === req.user.id || meeting.guestId === req.user.id;
    const isAdmin = isUserAdminCheck(req.user);
    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to modify this meeting.' });
    }

    const allowedStatuses = new Set(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
    const upperStatus = String(status || '').toUpperCase().trim();
    if (!allowedStatuses.has(upperStatus)) {
      return res.status(400).json({ error: 'Invalid meeting status.' });
    }

    const updated = await prisma.videoMeeting.update({
      where: { id },
      data: { status: upperStatus },
    });

    return res.json({ meeting: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update meeting status.' });
  }
});

export default router;
