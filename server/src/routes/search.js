import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/search?q=query&type=all|people|startups|investors|opportunities|posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q = '', type = 'all', limit = 10 } = req.query;
    const query = q.trim();
    const limitNum = parseInt(limit, 10);

    if (!query) {
      return res.json({
        people: [],
        startups: [],
        investors: [],
        opportunities: [],
        posts: [],
        counts: { people: 0, startups: 0, investors: 0, opportunities: 0, posts: 0 },
      });
    }

    const shouldSearch = (targetType) => type === 'all' || type === targetType;

    const [people, startups, investors, opportunities, posts] = await Promise.all([
      shouldSearch('people')
        ? prisma.user.findMany({
            where: {
              isSuspended: false,
              OR: [
                { profile: { fullName: { contains: query } } },
                { profile: { headline: { contains: query } } },
                { profile: { skills: { contains: query } } },
                { profile: { industries: { contains: query } } },
                { profile: { location: { contains: query } } },
              ],
            },
            take: limitNum,
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              verificationBadge: true,
              profile: true,
            },
          })
        : [],

      shouldSearch('startups')
        ? prisma.startup.findMany({
            where: {
              visibility: 'PUBLIC',
              OR: [
                { name: { contains: query } },
                { oneLineDescription: { contains: query } },
                { problem: { contains: query } },
                { solution: { contains: query } },
                { industry: { contains: query } },
                { requiredSkills: { contains: query } },
              ],
            },
            take: limitNum,
            include: {
              founder: {
                select: {
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          })
        : [],

      shouldSearch('investors')
        ? prisma.investor.findMany({
            where: {
              OR: [
                { organization: { contains: query } },
                { industries: { contains: query } },
                { about: { contains: query } },
                { location: { contains: query } },
              ],
            },
            take: limitNum,
            include: {
              user: {
                select: {
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          })
        : [],

      shouldSearch('opportunities')
        ? prisma.startupOpportunity.findMany({
            where: {
              status: 'OPEN',
              OR: [
                { role: { contains: query } },
                { requiredSkills: { contains: query } },
                { description: { contains: query } },
                { startup: { name: { contains: query } } },
              ],
            },
            take: limitNum,
            include: {
              startup: {
                select: { id: true, name: true, logo: true, stage: true },
              },
            },
          })
        : [],

      shouldSearch('posts')
        ? prisma.post.findMany({
            where: {
              OR: [
                { title: { contains: query } },
                { content: { contains: query } },
              ],
            },
            take: limitNum,
            include: {
              author: {
                select: {
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          })
        : [],
    ]);

    return res.json({
      people,
      startups,
      investors,
      opportunities,
      posts,
      counts: {
        people: people.length,
        startups: startups.length,
        investors: investors.length,
        opportunities: opportunities.length,
        posts: posts.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Search operation failed.' });
  }
});

export default router;
