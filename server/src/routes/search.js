import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/search?q=query&type=all|people|startups|investors|mentors|opportunities|problems|posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q = '', type = 'all', limit = 10 } = req.query;
    const query = q.trim();
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if (!query) {
      const emptyPayload = {
        users: [],
        people: [],
        startups: [],
        investors: [],
        mentors: [],
        opportunities: [],
        problems: [],
        posts: [],
        counts: { users: 0, people: 0, startups: 0, investors: 0, mentors: 0, opportunities: 0, problems: 0, posts: 0 },
      };
      return res.json({
        ...emptyPayload,
        results: emptyPayload,
      });
    }

    const normalizedType = String(type).trim().toLowerCase();
    const shouldSearch = (targetType) => normalizedType === 'all' || normalizedType === targetType || normalizedType === `${targetType}s`;

    const [people, startups, investors, mentors, opportunities, problems, posts] = await Promise.all([
      shouldSearch('people') || shouldSearch('user')
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

      shouldSearch('startup')
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

      shouldSearch('investor')
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

      shouldSearch('mentor')
        ? prisma.mentor.findMany({
            where: {
              OR: [
                { expertise: { contains: query } },
                { industries: { contains: query } },
                { mentoringTopics: { contains: query } },
                { about: { contains: query } },
                { user: { profile: { fullName: { contains: query } } } },
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

      shouldSearch('opportunit')
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

      shouldSearch('problem')
        ? prisma.problem.findMany({
            where: {
              OR: [
                { title: { contains: query } },
                { description: { contains: query } },
                { tags: { some: { tag: { name: { contains: query } } } } },
                { categories: { some: { category: { name: { contains: query } } } } },
              ],
            },
            take: limitNum,
            include: {
              categories: { include: { category: true } },
              regions: { include: { region: true } },
            },
          })
        : [],

      shouldSearch('post')
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

    const formattedProblems = problems.map((prob) => ({
      id: prob.id,
      title: prob.title,
      description: prob.description,
      sourceUrl: prob.sourceUrl,
      impactLevel: prob.impactLevel,
      categories: (prob.categories || []).map((c) => c.category?.name).filter(Boolean),
      regions: (prob.regions || []).map((r) => r.region?.name).filter(Boolean),
    }));

    const searchResults = {
      users: people,
      people,
      startups,
      investors,
      mentors,
      opportunities,
      problems: formattedProblems,
      posts,
      counts: {
        users: people.length,
        people: people.length,
        startups: startups.length,
        investors: investors.length,
        mentors: mentors.length,
        opportunities: opportunities.length,
        problems: formattedProblems.length,
        posts: posts.length,
      },
    };

    return res.json({
      ...searchResults,
      results: searchResults,
    });
  } catch (error) {
    console.error('Search operation failed:', error);
    return res.status(500).json({ error: 'Search operation failed.' });
  }
});

export default router;
