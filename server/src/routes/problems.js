import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import {
  ProblemCreateSchema,
  ProblemUpdateSchema,
  SolutionSuggestionSchema,
  UserMatchSchema,
} from '../schemas/problemSchemas.js';
import {
  generateProblemSolutions,
  matchUserToProblem,
  categorizeProblemAI,
  discoverProblemsFromAI,
} from '../utils/aiClient.js';

const router = express.Router();

/**
 * Format raw Prisma problem entity into clean API response
 */
function formatProblem(prob, savedProblemIds = new Set()) {
  if (!prob) return null;
  return {
    id: prob.id,
    title: prob.title,
    description: prob.description,
    sourceUrl: prob.sourceUrl || null,
    source_url: prob.sourceUrl || null,
    impactLevel: prob.impactLevel !== null ? prob.impactLevel : 7,
    impact_level: prob.impactLevel !== null ? prob.impactLevel : 7,
    createdBy: prob.createdBy || null,
    createdAt: prob.createdAt ? prob.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: prob.updatedAt ? prob.updatedAt.toISOString() : new Date().toISOString(),
    categories: (prob.categories || []).map((c) => (c.category ? c.category.name : c.name || c)),
    regions: (prob.regions || []).map((r) => (r.region ? r.region.name : r.name || r)),
    tags: (prob.tags || []).map((t) => (t.tag ? t.tag.name : t.name || t)),
    categoryIds: (prob.categories || []).map((c) => (c.categoryId ? c.categoryId : c.id)),
    regionIds: (prob.regions || []).map((r) => (r.regionId ? r.regionId : r.id)),
    tagIds: (prob.tags || []).map((t) => (t.tagId ? t.tagId : t.id)),
    isSaved: savedProblemIds.has(prob.id),
    creator: prob.creator
      ? {
          id: prob.creator.id,
          email: prob.creator.email,
          fullName: prob.creator.profile?.fullName || 'Administrator',
          avatar: prob.creator.profile?.avatar || null,
        }
      : null,
  };
}

/**
 * GET /api/problems/meta
 * Returns all existing categories, regions, tags, and summary stats
 */
router.get('/meta', async (req, res) => {
  try {
    const [categories, regions, tags, totalProblems] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.region.findMany({ orderBy: { name: 'asc' } }),
      prisma.tag.findMany({ orderBy: { name: 'asc' } }),
      prisma.problem.count(),
    ]);

    res.json({
      categories,
      regions,
      tags,
      totalProblems,
    });
  } catch (error) {
    console.error('Failed to get problem metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve metadata.' });
  }
});

/**
 * POST /api/problems/categorize-ai
 * Suggests categories and tags using GenAI for a given title & description
 */
router.post('/categorize-ai', optionalAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters for AI classification.' });
    }

    const aiResult = await categorizeProblemAI(title || '', description);
    res.json(aiResult);
  } catch (error) {
    console.error('Categorize AI error:', error);
    res.status(500).json({ error: 'Failed to categorize problem via AI.' });
  }
});

/**
 * GET /api/problems
 * List problem statements with full-text search, multi-faceted filtering, and pagination
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      search,
      q,
      category,
      region,
      tag,
      impact,
      minImpact,
      page = 1,
      limit = 50,
    } = req.query;

    const searchTerm = (search || q || '').toString().trim();
    const categoryFilters = category
      ? String(category).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const regionFilters = region
      ? String(region).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const tagFilters = tag
      ? String(tag).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const minImpactNum = impact || minImpact ? parseInt(impact || minImpact, 10) : null;

    // Build Prisma query condition
    const where = {};

    if (minImpactNum && !isNaN(minImpactNum)) {
      where.impactLevel = { gte: minImpactNum };
    }

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm } },
        { description: { contains: searchTerm } },
        { tags: { some: { tag: { name: { contains: searchTerm } } } } },
        { categories: { some: { category: { name: { contains: searchTerm } } } } },
      ];
    }

    if (categoryFilters.length > 0) {
      where.categories = {
        some: {
          OR: [
            { category: { name: { in: categoryFilters } } },
            { categoryId: { in: categoryFilters } },
          ],
        },
      };
    }

    if (regionFilters.length > 0) {
      where.regions = {
        some: {
          OR: [
            { region: { name: { in: regionFilters } } },
            { regionId: { in: regionFilters } },
          ],
        },
      };
    }

    if (tagFilters.length > 0) {
      where.tags = {
        some: {
          OR: [
            { tag: { name: { in: tagFilters } } },
            { tagId: { in: tagFilters } },
          ],
        },
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const takeNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skipNum = (pageNum - 1) * takeNum;

    const [total, rawProblems] = await Promise.all([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          regions: { include: { region: true } },
          tags: { include: { tag: true } },
          creator: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatar: true } },
            },
          },
        },
        orderBy: [
          { impactLevel: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: skipNum,
        take: takeNum,
      }),
    ]);

    // Check saved state if authenticated
    let savedProblemIds = new Set();
    if (req.user) {
      const userSaved = await prisma.savedItem.findMany({
        where: {
          userId: req.user.id,
          itemType: 'PROBLEM',
        },
        select: { itemId: true },
      });
      savedProblemIds = new Set(userSaved.map((s) => s.itemId));
    }

    const formatted = rawProblems.map((p) => formatProblem(p, savedProblemIds));

    res.json({
      problems: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / takeNum),
      limit: takeNum,
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Failed to retrieve problem statements.' });
  }
});

/**
 * GET /api/problems/:id
 * Retrieve full details for a single problem statement
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        regions: { include: { region: true } },
        tags: { include: { tag: true } },
        creator: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem statement not found.' });
    }

    let isSaved = false;
    if (req.user) {
      const saved = await prisma.savedItem.findUnique({
        where: {
          userId_itemType_itemId: {
            userId: req.user.id,
            itemType: 'PROBLEM',
            itemId: id,
          },
        },
      });
      isSaved = !!saved;
    }

    const formatted = formatProblem(problem, new Set(isSaved ? [id] : []));
    res.json(formatted);
  } catch (error) {
    console.error('Error retrieving problem detail:', error);
    res.status(500).json({ error: 'Failed to retrieve problem details.' });
  }
});

/**
 * Helper to resolve or create categories, regions, tags
 */
async function resolveEntities(categoryInputs, regionInputs, tagInputs) {
  const categoryIds = [];
  const regionIds = [];
  const tagIds = [];

  if (categoryInputs && Array.isArray(categoryInputs)) {
    for (const item of categoryInputs) {
      if (!item || !item.trim()) continue;
      const clean = item.trim();
      let cat = await prisma.category.findFirst({
        where: { OR: [{ id: clean }, { name: clean }] },
      });
      if (!cat) {
        cat = await prisma.category.create({ data: { name: clean } });
      }
      categoryIds.push(cat.id);
    }
  }

  if (regionInputs && Array.isArray(regionInputs)) {
    for (const item of regionInputs) {
      if (!item || !item.trim()) continue;
      const clean = item.trim();
      let reg = await prisma.region.findFirst({
        where: { OR: [{ id: clean }, { name: clean }] },
      });
      if (!reg) {
        reg = await prisma.region.create({ data: { name: clean } });
      }
      regionIds.push(reg.id);
    }
  }

  if (tagInputs && Array.isArray(tagInputs)) {
    for (const item of tagInputs) {
      if (!item || !item.trim()) continue;
      const clean = item.trim();
      let tag = await prisma.tag.findFirst({
        where: { OR: [{ id: clean }, { name: clean }] },
      });
      if (!tag) {
        tag = await prisma.tag.create({ data: { name: clean } });
      }
      tagIds.push(tag.id);
    }
  }

  return { categoryIds, regionIds, tagIds };
}

/**
 * POST /api/problems
 * Create a new problem statement (Admin Only) with Zod validation
 */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const validation = ProblemCreateSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return res.status(400).json({
        error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed.',
        details: validation.error.format(),
      });
    }

    const {
      title,
      description,
      categories,
      categoryIds: reqCatIds,
      regions,
      regionIds: reqRegIds,
      tags,
      tagIds: reqTagIds,
      impactLevel,
      impact_level,
      sourceUrl,
      source_url,
    } = validation.data;

    const finalImpact = impactLevel || impact_level || 7;
    const finalSourceUrl = sourceUrl || source_url || null;

    const { categoryIds, regionIds, tagIds } = await resolveEntities(
      (categories && categories.length > 0) ? categories : reqCatIds,
      (regions && regions.length > 0) ? regions : reqRegIds,
      (tags && tags.length > 0) ? tags : reqTagIds
    );

    const newProblem = await prisma.problem.create({
      data: {
        title,
        description,
        sourceUrl: finalSourceUrl,
        impactLevel: finalImpact,
        createdBy: req.user.id,
        categories: {
          create: categoryIds.map((cid) => ({ categoryId: cid })),
        },
        regions: {
          create: regionIds.map((rid) => ({ regionId: rid })),
        },
        tags: {
          create: tagIds.map((tid) => ({ tagId: tid })),
        },
      },
      include: {
        categories: { include: { category: true } },
        regions: { include: { region: true } },
        tags: { include: { tag: true } },
        creator: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    res.status(201).json(formatProblem(newProblem));
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ error: 'Failed to create problem statement.' });
  }
});

/**
 * PUT /api/problems/:id
 * Update an existing problem statement (Admin Only)
 */
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Problem statement not found.' });
    }

    const validation = ProblemUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return res.status(400).json({
        error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Validation failed.',
        details: validation.error.format(),
      });
    }

    const {
      title,
      description,
      categories,
      categoryIds: reqCatIds,
      regions,
      regionIds: reqRegIds,
      tags,
      tagIds: reqTagIds,
      impactLevel,
      impact_level,
      sourceUrl,
      source_url,
    } = validation.data;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (impactLevel !== undefined || impact_level !== undefined) {
      updateData.impactLevel = impactLevel || impact_level;
    }
    if (sourceUrl !== undefined || source_url !== undefined) {
      updateData.sourceUrl = (sourceUrl || source_url) || null;
    }

    // Handle relations if provided
    const catList = (categories && categories.length > 0) ? categories : reqCatIds;
    const regList = (regions && regions.length > 0) ? regions : reqRegIds;
    const tagList = (tags && tags.length > 0) ? tags : reqTagIds;

    if (catList !== undefined || regList !== undefined || tagList !== undefined) {
      const { categoryIds, regionIds, tagIds } = await resolveEntities(catList, regList, tagList);

      if (catList !== undefined) {
        await prisma.problemCategory.deleteMany({ where: { problemId: id } });
        updateData.categories = {
          create: categoryIds.map((cid) => ({ categoryId: cid })),
        };
      }

      if (regList !== undefined) {
        await prisma.problemRegion.deleteMany({ where: { problemId: id } });
        updateData.regions = {
          create: regionIds.map((rid) => ({ regionId: rid })),
        };
      }

      if (tagList !== undefined) {
        await prisma.problemTag.deleteMany({ where: { problemId: id } });
        updateData.tags = {
          create: tagIds.map((tid) => ({ tagId: tid })),
        };
      }
    }

    const updated = await prisma.problem.update({
      where: { id },
      data: updateData,
      include: {
        categories: { include: { category: true } },
        regions: { include: { region: true } },
        tags: { include: { tag: true } },
        creator: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true } },
          },
        },
      },
    });

    res.json(formatProblem(updated));
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Failed to update problem statement.' });
  }
});

/**
 * DELETE /api/problems/:id
 * Delete a problem statement (Admin Only)
 */
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Problem statement not found.' });
    }

    await prisma.problem.delete({ where: { id } });

    // Also remove any saved item references for this problem
    await prisma.savedItem.deleteMany({
      where: {
        itemType: 'PROBLEM',
        itemId: id,
      },
    });

    res.json({ success: true, message: 'Problem statement deleted successfully.', id });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ error: 'Failed to delete problem statement.' });
  }
});

/**
 * POST /api/problems/:id/analyze
 * AI-powered Problem Insights (Solutions or User Matching) using Gemini GenAI
 */
router.post('/:id/analyze', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || req.body.type || 'solutions';

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem statement not found.' });
    }

    if (type === 'solutions') {
      const result = await generateProblemSolutions(problem);
      // Validate schema
      const valid = SolutionSuggestionSchema.safeParse(result);
      if (!valid.success) {
        return res.status(500).json({ error: 'AI returned invalid format.' });
      }
      return res.json(valid.data);
    }

    if (type === 'match') {
      if (!req.user) {
        return res.status(401).json({
          error: 'Please log in to calculate personalized alignment with your profile skills.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true },
      });

      const result = await matchUserToProblem(problem, user);
      const valid = UserMatchSchema.safeParse(result);
      if (!valid.success) {
        return res.status(500).json({ error: 'AI returned invalid format.' });
      }
      return res.json(valid.data);
    }

    return res.status(400).json({ error: 'Invalid analysis type. Supported types: solutions, match.' });
  } catch (error) {
    console.error('Problem AI analysis error:', error);
    res.status(500).json({ error: 'Failed to generate AI insights for this problem.' });
  }
});

/**
 * POST /api/problems/discover-ai
 * Discover new authoritative problem statements using Google Gemini AI
 */
router.post('/discover-ai', optionalAuth, async (req, res) => {
  try {
    const { topic } = req.body;
    const problems = await discoverProblemsFromAI(topic || 'business, agriculture, and global challenges');
    res.json({ problems });
  } catch (error) {
    console.error('Discover AI problems error:', error);
    res.status(500).json({ error: 'Failed to discover problems using AI.' });
  }
});

export default router;
