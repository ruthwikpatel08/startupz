import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/mentors
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { industry, expertise, search, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (industry && industry !== 'ALL') where.industries = { contains: industry };
    if (expertise && expertise !== 'ALL') where.expertise = { contains: expertise };

    if (search) {
      const q = search.trim();
      where.OR = [
        { expertise: { contains: q } },
        { industries: { contains: q } },
        { mentoringTopics: { contains: q } },
        { about: { contains: q } },
        { user: { profile: { fullName: { contains: q } } } },
      ];
    }

    const [total, mentors] = await Promise.all([
      prisma.mentor.count({ where }),
      prisma.mentor.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { isVerified: 'desc' },
        include: {
          user: {
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
      }),
    ]);

    return res.json({
      mentors,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve mentors.' });
  }
});

// GET /api/mentors/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: {
        user: {
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

    if (!mentor) return res.status(404).json({ error: 'Mentor not found.' });
    return res.json(mentor);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch mentor.' });
  }
});

// POST /api/mentors
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      expertise,
      industries,
      yearsExperience = 5,
      availableHours = '2-4 hrs/month',
      mentoringTopics,
      about,
    } = req.body;

    if (!expertise || !industries || !mentoringTopics || !about) {
      return res.status(400).json({
        error: 'Please fill in expertise, industries, mentoring topics, and about.',
      });
    }

    const mentor = await prisma.mentor.upsert({
      where: { userId: req.user.id },
      update: {
        expertise,
        industries,
        yearsExperience: parseInt(yearsExperience, 10),
        availableHours,
        mentoringTopics,
        about,
      },
      create: {
        userId: req.user.id,
        expertise,
        industries,
        yearsExperience: parseInt(yearsExperience, 10),
        availableHours,
        mentoringTopics,
        about,
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'MENTOR' },
    });

    return res.json({ message: 'Mentor profile updated successfully!', mentor });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save mentor profile.' });
  }
});

// POST /api/mentors/:id/request
router.post('/:id/request', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { topic, message } = req.body;

    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!mentor) return res.status(404).json({ error: 'Mentor not found.' });
    if (mentor.userId === req.user.id) return res.status(400).json({ error: 'You cannot request mentorship from yourself.' });

    const request = await prisma.mentorshipRequest.create({
      data: {
        mentorId: mentor.id,
        mentorUserId: mentor.userId,
        founderId: req.user.id,
        topic: topic || 'Founder Mentorship & Strategy',
        message: message || 'I would love to learn from your experience and get strategic guidance.',
      },
    });

    const founderName = req.user.profile?.fullName || 'A Founder';
    await prisma.notification.create({
      data: {
        userId: mentor.userId,
        senderId: req.user.id,
        type: 'MENTORSHIP_REQUEST',
        title: 'New Mentorship Request 🎓',
        message: `${founderName} requested mentorship on "${topic || 'General Strategy'}".`,
        link: '/mentors',
      },
    });

    return res.status(201).json({ message: 'Mentorship request sent successfully!', request });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send mentorship request.' });
  }
});

// GET /api/mentors/my/requests
router.get('/my/requests', requireAuth, async (req, res) => {
  try {
    const [asFounder, asMentor] = await Promise.all([
      prisma.mentorshipRequest.findMany({
        where: { founderId: req.user.id },
        include: {
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, avatar: true, headline: true } },
                },
              },
            },
          },
        },
      }),
      prisma.mentorshipRequest.findMany({
        where: { mentorUserId: req.user.id },
        include: {
          founder: {
            select: {
              id: true,
              profile: { select: { fullName: true, avatar: true, headline: true } },
            },
          },
        },
      }),
    ]);

    return res.json({ asFounder, asMentor });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve mentorship requests.' });
  }
});

// PUT /api/mentors/requests/:requestId/status
router.put('/requests/:requestId/status', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    const request = await prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      include: { mentor: true },
    });

    if (!request || request.mentorUserId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to respond to this request.' });
    }

    const updated = await prisma.mentorshipRequest.update({
      where: { id: requestId },
      data: { status },
    });

    await prisma.notification.create({
      data: {
        userId: request.founderId,
        senderId: req.user.id,
        type: 'MENTORSHIP_REQUEST',
        title: `Mentorship Request ${status.toLowerCase()}!`,
        message: `Your mentorship request has been ${status.toLowerCase()}. You can now connect and collaborate.`,
        link: `/mentors`,
      },
    });

    return res.json({ message: `Request ${status.toLowerCase()}.`, request: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update request.' });
  }
});

export default router;
