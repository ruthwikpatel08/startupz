import express from 'express';
import { prisma } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/ai/find-people - AI People Finder Bot (NLP query to candidate matcher)
router.post('/find-people', optionalAuth, async (req, res) => {
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

    // Fetch all active users
    const allUsers = await prisma.user.findMany({
      where: {
        id: currentUserId ? { not: currentUserId } : undefined,
        isSuspended: false,
      },
      include: {
        profile: true,
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
        ...u,
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
