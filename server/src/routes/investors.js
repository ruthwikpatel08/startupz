import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/investors
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { industry, stage, investorType, search, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (investorType && investorType !== 'ALL') where.investorType = investorType;
    if (industry && industry !== 'ALL') where.industries = { contains: industry };
    if (stage && stage !== 'ALL') where.preferredStages = { contains: stage };

    if (search) {
      const q = search.trim();
      where.OR = [
        { organization: { contains: q } },
        { industries: { contains: q } },
        { location: { contains: q } },
        { about: { contains: q } },
        { user: { profile: { fullName: { contains: q } } } },
      ];
    }

    const [total, investors] = await Promise.all([
      prisma.investor.count({ where }),
      prisma.investor.findMany({
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

    let savedInvestorIds = new Set();
    if (req.user) {
      const saves = await prisma.savedItem.findMany({
        where: { userId: req.user.id, itemType: 'INVESTOR' },
        select: { itemId: true },
      });
      saves.forEach((s) => savedInvestorIds.add(s.itemId));
    }

    const formatted = investors.map((inv) => ({
      ...inv,
      isSaved: savedInvestorIds.has(inv.id),
    }));

    return res.json({
      investors: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve investors.' });
  }
});

// GET /api/investors/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const investor = await prisma.investor.findUnique({
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

    if (!investor) return res.status(404).json({ error: 'Investor profile not found.' });

    let isSaved = false;
    if (req.user) {
      const save = await prisma.savedItem.findFirst({
        where: { userId: req.user.id, itemType: 'INVESTOR', itemId: id },
      });
      isSaved = !!save;
    }

    return res.json({ ...investor, isSaved });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch investor.' });
  }
});

// POST /api/investors
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      organization,
      investorType = 'Angel',
      industries,
      preferredStages,
      minCheckSize,
      maxCheckSize,
      location,
      website,
      portfolio,
      about,
    } = req.body;

    if (!organization || !industries || !preferredStages || !about) {
      return res.status(400).json({
        error: 'Please fill in organization, industries, preferred stages, and about summary.',
      });
    }

    const investor = await prisma.investor.upsert({
      where: { userId: req.user.id },
      update: {
        organization,
        investorType,
        industries,
        preferredStages,
        minCheckSize,
        maxCheckSize,
        location: location || req.user.profile?.location || 'Remote',
        website,
        portfolio,
        about,
      },
      create: {
        userId: req.user.id,
        organization,
        investorType,
        industries,
        preferredStages,
        minCheckSize,
        maxCheckSize,
        location: location || req.user.profile?.location || 'Remote',
        website,
        portfolio,
        about,
      },
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'INVESTOR' },
    });

    return res.json({ message: 'Investor profile saved successfully!', investor });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save investor profile.' });
  }
});

// POST /api/investors/:id/pitch
router.post('/:id/pitch', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startupId, pitchNote, deckUrl } = req.body;

    const investor = await prisma.investor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!investor) return res.status(404).json({ error: 'Investor not found.' });

    let startupName = 'their startup';
    if (startupId) {
      const s = await prisma.startup.findUnique({ where: { id: startupId } });
      if (s) startupName = s.name;
    }

    const senderName = req.user.profile?.fullName || 'A Founder';
    await prisma.notification.create({
      data: {
        userId: investor.userId,
        senderId: req.user.id,
        type: 'PITCH_RECEIVED',
        title: `Pitch received for ${startupName} 💡`,
        message: `${senderName} submitted a pitch presentation: "${pitchNote || 'Review our deck and traction'}"`,
        link: startupId ? `/startups/${startupId}` : `/profile/${req.user.id}`,
      },
    });

    return res.json({
      message: `Pitch successfully submitted to ${investor.organization}!`,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send pitch.' });
  }
});

export default router;
