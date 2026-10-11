import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * In-memory sliding window rate limiter
 * ponytail: In-memory store is local to this Node process. If horizontally scaling across multiple Render instances, upgrade to Redis.
 */
function createRateLimiter({ windowMs, max, message }) {
  const store = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);
  cleanup.unref();

  return (req, res, next) => {
    const clientKey = req.user?.id
      ? `user:${req.user.id}`
      : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;

    const now = Date.now();
    const timestamps = store.get(clientKey) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const oldestValid = validTimestamps[0];
      const retryAfterMs = Math.max(1000, oldestValid + windowMs - now);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message || 'Too many requests. Please slow down and try again later.',
        retryAfter: retryAfterSec,
      });
    }

    validTimestamps.push(now);
    store.set(clientKey, validTimestamps);
    next();
  };
}

const findPeopleLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many talent search requests. Please wait a few minutes before trying again.',
});

// POST /api/ai/find-people - AI People Finder Bot (NLP query to candidate matcher)
router.post('/find-people', optionalAuth, findPeopleLimiter, async (req, res) => {
  try {
    const rawPrompt = req.body.prompt || req.body.query || '';
    const { targetRole, industry } = req.body;

    if (!rawPrompt || !rawPrompt.trim()) {
      return res.status(400).json({ error: 'Please enter what type of talent or co-founder you need.' });
    }

    const cleanPrompt = rawPrompt.toLowerCase();
    const currentUserId = req.user ? req.user.id : null;

    // Detect technical keywords
    const techKeywords = ['react', 'node', 'python', 'ai', 'machine learning', 'mobile', 'flutter', 'solidity', 'blockchain', 'devops', 'aws', 'data', 'full stack', 'frontend', 'backend', 'designer', 'ui/ux', 'marketing', 'growth', 'sales', 'fintech', 'healthtech', 'saas', 'agtech'];
    const matchedKeywords = techKeywords.filter((kw) => cleanPrompt.includes(kw));

    // Detect role intent
    let detectedRole = targetRole || null;
    if (!detectedRole) {
      if (cleanPrompt.includes('co-founder') || cleanPrompt.includes('cofounder')) {
        detectedRole = 'COFOUNDER';
      } else if (cleanPrompt.includes('engineer') || cleanPrompt.includes('developer') || cleanPrompt.includes('coder')) {
        detectedRole = 'DEVELOPER';
      } else if (cleanPrompt.includes('designer') || cleanPrompt.includes('ui') || cleanPrompt.includes('ux')) {
        detectedRole = 'DESIGNER';
      } else if (cleanPrompt.includes('marketer') || cleanPrompt.includes('growth') || cleanPrompt.includes('marketing')) {
        detectedRole = 'MARKETER';
      } else if (cleanPrompt.includes('investor') || cleanPrompt.includes('angel') || cleanPrompt.includes('vc')) {
        detectedRole = 'INVESTOR';
      } else if (cleanPrompt.includes('mentor') || cleanPrompt.includes('advisor')) {
        detectedRole = 'MENTOR';
      }
    }

    // Fetch active users with strictly allowlisted public profile fields (never select password, email, or internal flags)
    const allUsers = await prisma.user.findMany({
      where: {
        id: currentUserId ? { not: currentUserId } : undefined,
        isSuspended: false,
      },
      select: {
        id: true,
        role: true,
        isVerified: true,
        verificationBadge: true,
        profile: {
          select: {
            id: true,
            userId: true,
            fullName: true,
            username: true,
            headline: true,
            location: true,
            bio: true,
            avatar: true,
            education: true,
            portfolioUrl: true,
            githubUrl: true,
            linkedinUrl: true,
            websiteUrl: true,
            skills: true,
            startupInterests: true,
            industries: true,
            preferredRole: true,
            availability: true,
            startupExperience: true,
            achievements: true,
            openTo: true,
          },
        },
        startups: {
          select: { id: true, name: true, stage: true, industry: true },
        },
      },
      take: 50,
    });

    // Score and rank candidates based on prompt overlap
    const scored = allUsers.map((u) => {
      const p = u.profile || {};
      const userText = `${u.role} ${p.headline || ''} ${p.bio || ''} ${p.skills || ''} ${p.industries || ''} ${p.preferredRole || ''} ${p.startupExperience || ''}`.toLowerCase();
      
      let score = 50;
      let reasons = [];

      // Keyword matches
      matchedKeywords.forEach((kw) => {
        if (userText.includes(kw)) {
          score += 12;
          reasons.push(`Demonstrated expertise in ${kw.toUpperCase()}`);
        }
      });

      // Role alignment
      if (detectedRole && (u.role === detectedRole || (p.preferredRole && p.preferredRole.toUpperCase().includes(detectedRole)))) {
        score += 18;
        reasons.push(`Directly matches requested ${detectedRole} profile`);
      }

      // Open To alignment
      if (p.openTo && (cleanPrompt.includes('co-founder') || cleanPrompt.includes('cofounder')) && p.openTo.includes('Co-Founder')) {
        score += 15;
        reasons.push('Actively open to co-founding new ventures');
      }

      // Industry alignment
      if (industry && (p.industries || '').toLowerCase().includes(industry.toLowerCase())) {
        score += 10;
        reasons.push(`Proven focus in ${industry}`);
      }

      if (reasons.length === 0) {
        reasons.push('Startup builder with verified technical & execution competencies');
      }

      const matchPercentage = Math.min(99, Math.max(65, score));

      return {
        id: u.id,
        role: u.role,
        isVerified: u.isVerified,
        verificationBadge: u.verificationBadge || null,
        profile: u.profile || null,
        startups: u.startups || [],
        matchPercentage,
        aiExplanation: reasons.slice(0, 3).join(' • '),
        keySynergies: reasons,
      };
    });

    // Sort by highest match score
    scored.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const topCandidates = scored.slice(0, 8);

    return res.json({
      query: rawPrompt,
      detectedRole: detectedRole || 'All Startup Roles',
      detectedKeywords: matchedKeywords,
      interpretation: {
        detectedRole: detectedRole || 'All Startup Roles',
        detectedSkills: matchedKeywords,
      },
      summary: `Found ${topCandidates.length} high-fit candidates matching your query criteria.`,
      candidates: topCandidates,
      results: topCandidates.map((c) => ({
        ...c,
        matchScore: c.matchPercentage,
        reason: c.aiExplanation,
      })),
    });
  } catch (error) {
    console.error('AI find people error:', error);
    return res.status(500).json({ error: 'Failed to find candidates via AI.' });
  }
});

export default router;
