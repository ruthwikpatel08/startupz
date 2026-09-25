import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

function computeProfileCompletion(profile) {
  let score = 20;
  if (profile.headline) score += 10;
  if (profile.bio && profile.bio.length > 30) score += 15;
  if (profile.location) score += 10;
  if (profile.skills && profile.skills.length > 5) score += 15;
  if (profile.industries) score += 10;
  if (profile.education) score += 5;
  if (profile.portfolioUrl || profile.githubUrl || profile.linkedinUrl) score += 10;
  if (profile.startupExperience) score += 5;
  return Math.min(100, score);
}

// GET /api/users - User Directory
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { role, skill, industry, availability, search, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { isSuspended: false };

    if (role && role !== 'ALL') {
      where.role = role.toUpperCase();
    }

    const profileConditions = [];

    if (search) {
      const q = search.trim();
      profileConditions.push({
        OR: [
          { fullName: { contains: q } },
          { headline: { contains: q } },
          { bio: { contains: q } },
          { location: { contains: q } },
          { skills: { contains: q } },
          { industries: { contains: q } },
        ],
      });
    }

    if (skill) {
      profileConditions.push({ skills: { contains: skill } });
    }

    if (industry) {
      profileConditions.push({ industries: { contains: industry } });
    }

    if (availability) {
      profileConditions.push({ availability: { contains: availability } });
    }

    if (profileConditions.length > 0) {
      where.profile = { AND: profileConditions };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          verificationBadge: true,
          createdAt: true,
          profile: true,
          startups: {
            select: { id: true, name: true, stage: true, industry: true, logo: true },
          },
        },
      }),
    ]);

    let userConnections = new Map();
    if (req.user) {
      const connections = await prisma.connection.findMany({
        where: {
          OR: [
            { senderId: req.user.id },
            { receiverId: req.user.id },
          ],
        },
      });

      connections.forEach((c) => {
        const otherId = c.senderId === req.user.id ? c.receiverId : c.senderId;
        userConnections.set(otherId, { status: c.status, isSender: c.senderId === req.user.id, connectionId: c.id });
      });
    }

    const formattedUsers = users.map((u) => ({
      ...u,
      connectionStatus: userConnections.get(u.id) || null,
    }));

    return res.json({
      users: formattedUsers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// GET /api/users/matching/cofounders - Co-Founder Matching Engine
router.get('/matching/cofounders', requireAuth, async (req, res) => {
  try {
    const { targetRole, industry, availability } = req.query;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        startups: true,
      },
    });

    const myProfile = currentUser.profile || {};
    const mySkills = (myProfile.skills || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    const myIndustries = (myProfile.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

    const candidates = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        isSuspended: false,
        profile: {
          openTo: { contains: 'Co-Founder' },
        },
      },
      include: {
        profile: true,
        startups: {
          select: { id: true, name: true, stage: true, industry: true },
        },
      },
      take: 40,
    });

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id },
        ],
      },
    });

    const connMap = new Map();
    connections.forEach((c) => {
      const otherId = c.senderId === req.user.id ? c.receiverId : c.senderId;
      connMap.set(otherId, { status: c.status, isSender: c.senderId === req.user.id, connectionId: c.id });
    });

    const scoredCandidates = candidates.map((cand) => {
      const p = cand.profile || {};
      const theirSkills = (p.skills || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      const theirIndustries = (p.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      const theirRole = p.preferredRole || cand.role;

      let score = 55;
      let matchReasons = [];

      if (targetRole && targetRole !== 'ALL') {
        if (theirRole.toLowerCase().includes(targetRole.toLowerCase())) {
          score += 20;
          matchReasons.push(`Matches requested ${targetRole} role`);
        }
      } else {
        const isMeTech = mySkills.some((s) => ['react', 'node', 'python', 'ai', 'engineer', 'developer', 'full stack'].includes(s));
        const isThemTech = theirSkills.some((s) => ['react', 'node', 'python', 'ai', 'engineer', 'developer', 'full stack'].includes(s));
        const isThemBiz = theirSkills.some((s) => ['marketing', 'sales', 'growth', 'finance', 'operations', 'product'].includes(s));

        if (isMeTech && isThemBiz) {
          score += 18;
          matchReasons.push('Technical + Business complementarity');
        } else if (!isMeTech && isThemTech) {
          score += 20;
          matchReasons.push('Strong technical execution synergy');
        }
      }

      const commonIndustries = myIndustries.filter((ind) => theirIndustries.includes(ind));
      if (commonIndustries.length > 0) {
        score += Math.min(20, commonIndustries.length * 10);
        matchReasons.push(`Shared focus in ${commonIndustries.slice(0, 2).map((i) => i.toUpperCase()).join(' & ')}`);
      }

      if (myProfile.availability && p.availability) {
        if (myProfile.availability === p.availability) {
          score += 10;
          matchReasons.push(`Aligned availability (${p.availability})`);
        }
      }

      if (p.location && myProfile.location) {
        if (p.location.toLowerCase().includes('remote') || myProfile.location.toLowerCase().includes('remote')) {
          score += 5;
          matchReasons.push('Remote synergy');
        } else if (p.location.toLowerCase() === myProfile.location.toLowerCase()) {
          score += 8;
          matchReasons.push(`Same metropolitan area (${p.location})`);
        }
      }

      const finalMatchPercentage = Math.min(98, Math.max(68, score));
      if (matchReasons.length === 0) {
        matchReasons.push('Overlapping founder readiness & startup ecosystem ambition');
      }

      return {
        ...cand,
        matchPercentage: finalMatchPercentage,
        matchExplanation: matchReasons.join(' • '),
        connectionStatus: connMap.get(cand.id) || null,
      };
    });

    scoredCandidates.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.json({
      matches: scoredCandidates,
      total: scoredCandidates.length,
    });
  } catch (error) {
    console.error('Co-founder matching error:', error);
    return res.status(500).json({ error: 'Failed to compute co-founder matches.' });
  }
});

// GET /api/users/recommendations
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });

    const myProfile = user.profile || {};
    const myIndustries = (myProfile.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

    const recommendedUsers = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        isSuspended: false,
      },
      include: {
        profile: true,
        startups: { select: { id: true, name: true, stage: true } },
      },
      take: 6,
    });

    const recommendations = recommendedUsers.map((u) => {
      const p = u.profile || {};
      const theirIndustries = (p.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      const common = myIndustries.filter((i) => theirIndustries.includes(i));
      
      let explanation = 'Active builder in the startup network';
      if (common.length > 0) {
        explanation = `You both are interested in ${common[0].toUpperCase()} and startup collaboration`;
      } else if (p.preferredRole) {
        explanation = `Looking for ${p.preferredRole} collaboration`;
      }

      return {
        ...u,
        recommendationReason: explanation,
      };
    });

    return res.json({ recommendations });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

// GET /api/users/:id - Single User Profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        startups: {
          where: { visibility: 'PUBLIC' },
          select: {
            id: true,
            name: true,
            logo: true,
            stage: true,
            industry: true,
            oneLineDescription: true,
            fundingStatus: true,
            likesCount: true,
          },
        },
        investorProfile: true,
        mentorProfile: true,
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true, likes: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    let connectionStatus = null;
    if (req.user && req.user.id !== user.id) {
      const conn = await prisma.connection.findFirst({
        where: {
          OR: [
            { senderId: req.user.id, receiverId: user.id },
            { senderId: user.id, receiverId: req.user.id },
          ],
        },
      });

      if (conn) {
        connectionStatus = {
          status: conn.status,
          isSender: conn.senderId === req.user.id,
          connectionId: conn.id,
        };
      }
    }

    const { password: _, ...userSafe } = user;
    return res.json({
      ...userSafe,
      connectionStatus,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// PUT /api/users/profile - Update Profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const {
      fullName,
      headline,
      location,
      bio,
      avatar,
      education,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      websiteUrl,
      skills,
      startupInterests,
      industries,
      preferredRole,
      availability,
      startupExperience,
      achievements,
      openTo,
    } = req.body;

    const updatedProfile = {
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      headline,
      location,
      bio,
      avatar,
      education,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      websiteUrl,
      skills,
      startupInterests,
      industries,
      preferredRole,
      availability,
      startupExperience,
      achievements,
      openTo: Array.isArray(openTo) ? openTo.join(',') : openTo,
    };

    const existing = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });

    const merged = { ...existing, ...updatedProfile };
    updatedProfile.profileCompletion = computeProfileCompletion(merged);

    const savedProfile = await prisma.profile.upsert({
      where: { userId: req.user.id },
      update: updatedProfile,
      create: {
        userId: req.user.id,
        fullName: fullName || req.user.email.split('@')[0],
        ...updatedProfile,
      },
    });

    return res.json({
      message: 'Profile updated successfully!',
      profile: savedProfile,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
