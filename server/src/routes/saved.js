import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/saved
router.get('/', requireAuth, async (req, res) => {
  try {
    const { itemType } = req.query;

    const where = { userId: req.user.id };
    if (itemType && itemType !== 'ALL') {
      where.itemType = itemType.toUpperCase();
    }

    const savedItems = await prisma.savedItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const startupIds = savedItems.filter((s) => s.itemType === 'STARTUP').map((s) => s.itemId);
    const userIds = savedItems.filter((s) => s.itemType === 'USER').map((s) => s.itemId);
    const investorIds = savedItems.filter((s) => s.itemType === 'INVESTOR').map((s) => s.itemId);
    const opportunityIds = savedItems.filter((s) => s.itemType === 'OPPORTUNITY').map((s) => s.itemId);
    const postIds = savedItems.filter((s) => s.itemType === 'POST').map((s) => s.itemId);
    const problemIds = savedItems.filter((s) => s.itemType === 'PROBLEM').map((s) => s.itemId);

    const [startups, users, investors, opportunities, posts, problems] = await Promise.all([
      prisma.startup.findMany({
        where: { id: { in: startupIds } },
        include: { founder: { select: { profile: { select: { fullName: true, avatar: true } } } } },
      }),
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, role: true, isVerified: true, profile: true },
      }),
      prisma.investor.findMany({
        where: { id: { in: investorIds } },
        include: { user: { select: { profile: { select: { fullName: true, avatar: true } } } } },
      }),
      prisma.startupOpportunity.findMany({
        where: { id: { in: opportunityIds } },
        include: { startup: { select: { id: true, name: true, logo: true, stage: true } } },
      }),
      prisma.post.findMany({
        where: { id: { in: postIds } },
        include: { author: { select: { profile: { select: { fullName: true, avatar: true } } } } },
      }),
      prisma.problem.findMany({
        where: { id: { in: problemIds } },
        include: {
          categories: { include: { category: true } },
          regions: { include: { region: true } },
          tags: { include: { tag: true } },
        },
      }),
    ]);

    const startupMap = new Map(startups.map((s) => [s.id, s]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const investorMap = new Map(investors.map((i) => [i.id, i]));
    const oppMap = new Map(opportunities.map((o) => [o.id, o]));
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const problemMap = new Map(problems.map((p) => [p.id, p]));

    const populatedItems = savedItems.map((item) => {
      let data = null;
      if (item.itemType === 'STARTUP') data = startupMap.get(item.itemId);
      if (item.itemType === 'USER') data = userMap.get(item.itemId);
      if (item.itemType === 'INVESTOR') data = investorMap.get(item.itemId);
      if (item.itemType === 'OPPORTUNITY') data = oppMap.get(item.itemId);
      if (item.itemType === 'POST') data = postMap.get(item.itemId);
      if (item.itemType === 'PROBLEM') {
        const prob = problemMap.get(item.itemId);
        if (prob) {
          data = {
            ...prob,
            categories: prob.categories.map((c) => c.category.name),
            regions: prob.regions.map((r) => r.region.name),
            tags: prob.tags.map((t) => t.tag.name),
          };
        }
      }

      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        savedAt: item.createdAt,
        data,
      };
    }).filter((item) => item.data !== null);

    return res.json({ savedItems: populatedItems });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve saved items.' });
  }
});

// Helper for toggle save
async function handleToggleSave(req, res) {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'Item type and item ID are required.' });
    }

    const normalizedType = itemType.toUpperCase();

    const existing = await prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: req.user.id,
          itemType: normalizedType,
          itemId,
        },
      },
    });

    if (existing) {
      await prisma.savedItem.delete({ where: { id: existing.id } });
      return res.json({ saved: false, message: 'Item removed from saved.' });
    } else {
      const saved = await prisma.savedItem.create({
        data: {
          userId: req.user.id,
          itemType: normalizedType,
          itemId,
        },
      });
      return res.json({ saved: true, message: 'Item saved successfully!', item: saved });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update saved item.' });
  }
}

// POST /api/saved
router.post('/', requireAuth, handleToggleSave);

// POST /api/saved/toggle
router.post('/toggle', requireAuth, handleToggleSave);

export default router;
