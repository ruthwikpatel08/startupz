import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/failed-startups - List Failed Startups Post-Mortems
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { industry, search } = req.query;

    const where = {};
    if (industry && industry !== 'ALL') {
      where.industry = { contains: industry };
    }
    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { summary: { contains: q } },
        { whyItFailed: { contains: q } },
        { unsolvedProblem: { contains: q } },
      ];
    }

    const failedStartups = await prisma.failedStartup.findMany({
      where,
      orderBy: { solutionsCount: 'desc' },
      include: {
        _count: { select: { solutions: true } },
      },
    });

    return res.json({ failedStartups });
  } catch (error) {
    console.error('Failed to retrieve post-mortems:', error);
    return res.status(500).json({ error: 'Failed to retrieve startup post-mortems.' });
  }
});

// GET /api/failed-startups/:id - Get Details & Raised Solutions
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const failedStartup = await prisma.failedStartup.findUnique({
      where: { id },
      include: {
        solutions: {
          orderBy: { upvotesCount: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                role: true,
                verificationBadge: true,
                profile: { select: { fullName: true, avatar: true, headline: true } },
              },
            },
          },
        },
      },
    });

    if (!failedStartup) {
      return res.status(404).json({ error: 'Startup case study not found.' });
    }

    return res.json({ failedStartup });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch case study details.' });
  }
});

// POST /api/failed-startups/:id/solutions - Raise a Solution to a Failed Startup's Problem
router.post('/:id/solutions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, targetAudience, differentiation, startupId } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Please provide a solution title and detailed description.' });
    }

    const failedStartup = await prisma.failedStartup.findUnique({ where: { id } });
    if (!failedStartup) {
      return res.status(404).json({ error: 'Startup case study not found.' });
    }

    const solution = await prisma.raisedSolution.create({
      data: {
        failedStartupId: id,
        authorId: req.user.id,
        title: title.trim(),
        description: description.trim(),
        targetAudience: targetAudience ? targetAudience.trim() : null,
        differentiation: differentiation ? differentiation.trim() : null,
        startupId: startupId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    // Increment solutions count on failed startup
    await prisma.failedStartup.update({
      where: { id },
      data: { solutionsCount: { increment: 1 } },
    });

    // Also optionally generate a feed post so other builders can join forces
    await prisma.post.create({
      data: {
        authorId: req.user.id,
        postType: 'UPDATE',
        title: `Raised Solution for ${failedStartup.name}'s Unsolved Market Problem! 💡`,
        content: `I just raised a new solution for the unsolved problem left behind by ${failedStartup.name}: "${title}".\n\n${description}\n\nCheck out the full breakdown and collaborate with me on StartupZ!`,
      },
    });

    return res.status(201).json({ message: 'Solution raised successfully!', solution });
  } catch (error) {
    console.error('Raise solution error:', error);
    return res.status(500).json({ error: 'Failed to submit raised solution.' });
  }
});

// POST /api/failed-startups/solutions/:solutionId/upvote - Upvote a Raised Solution
router.post('/solutions/:solutionId/upvote', requireAuth, async (req, res) => {
  try {
    const { solutionId } = req.params;

    const updated = await prisma.raisedSolution.update({
      where: { id: solutionId },
      data: { upvotesCount: { increment: 1 } },
    });

    return res.json({ upvoted: true, upvotesCount: updated.upvotesCount });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upvote solution.' });
  }
});

export default router;
