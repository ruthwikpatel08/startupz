import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { deleteSupabaseUserCompletely, upsertSupabaseProfile } from '../supabase.js';

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
      where.OR = [
        { email: { contains: q } },
        { profile: { fullName: { contains: q } } },
        { profile: { headline: { contains: q } } },
        { profile: { bio: { contains: q } } },
        { profile: { location: { contains: q } } },
        { profile: { skills: { contains: q } } },
        { profile: { industries: { contains: q } } },
        { profile: { preferredRole: { contains: q } } },
      ];
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
      if (where.profile) {
        where.profile = { AND: [...profileConditions] };
      } else {
        where.profile = { AND: profileConditions };
      }
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

const cofounderCache = new Map();
const COFOUNDER_CACHE_TTL = 60000;

// GET /api/users/matching/cofounders - Co-Founder & Category Matching Engine
router.get('/matching/cofounders', optionalAuth, async (req, res) => {
  try {
    const { targetRole, industry, availability, category } = req.query;

    const isDefaultFilter =
      !req.user &&
      (!targetRole || targetRole === 'ALL') &&
      (!industry || industry === 'ALL') &&
      (!availability || availability === 'ALL');

    const cacheKey = (category || 'all').toLowerCase();
    if (isDefaultFilter) {
      const cached = cofounderCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        return res.json(cached.data);
      }
    }

    let currentUser = null;
    if (req.user) {
      currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          profile: true,
          startups: true,
        },
      });
    }

    const myProfile = currentUser?.profile || {};
    const mySkills = (myProfile.skills || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    const myIndustries = (myProfile.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

    const where = {
      isSuspended: false,
      NOT: [
        { role: 'STARTUP' },
        { email: { startsWith: 'contact@' } },
        { email: { startsWith: 'advisory@' } },
        { email: { contains: 'demo' } },
        { email: { contains: '@startupz.com' } },
      ],
    };
    if (req.user) {
      where.id = { not: req.user.id };
      if (req.user.email) {
        where.email = { not: req.user.email };
      }
    }

    if (category && category !== 'ALL') {
      const catLower = category.toLowerCase();
      if (catLower === 'founders' || catLower === 'founder') {
        where.OR = [
          { role: 'FOUNDER' },
          { profile: { preferredRole: { in: ['FOUNDER', 'Founders', 'Founder'] } } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['COFOUNDER', 'INVESTOR', 'MENTOR', 'STUDENT', 'MARKETER', 'OTHER', 'DEVELOPER'] } },
          { profile: { preferredRole: { contains: 'Co-Founder' } } },
          { profile: { preferredRole: { contains: 'cofounder' } } },
        ];
      } else if (catLower === 'cofounders' || catLower === 'cofounder') {
        where.OR = [
          { role: 'COFOUNDER' },
          { profile: { preferredRole: { in: ['COFOUNDER', 'Co-Founders', 'Co-Founder', 'cofounder'] } } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'INVESTOR', 'MENTOR', 'STUDENT', 'MARKETER', 'OTHER', 'DEVELOPER'] } },
        ];
      } else if (catLower === 'marketers' || catLower === 'marketer') {
        where.OR = [
          { role: 'MARKETER' },
          { profile: { preferredRole: { in: ['MARKETER', 'Marketer', 'Marketers'] } } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'COFOUNDER', 'INVESTOR', 'MENTOR', 'STUDENT'] } },
        ];
      } else if (catLower === 'investors' || catLower === 'investor') {
        where.OR = [
          { role: 'INVESTOR' },
          { profile: { preferredRole: { in: ['INVESTOR', 'Investor', 'Investors'] } } },
          { investorProfile: { isNot: null } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'COFOUNDER', 'MENTOR', 'STUDENT', 'MARKETER', 'OTHER', 'DEVELOPER'] } },
        ];
      } else if (catLower === 'mentors' || catLower === 'mentor') {
        where.OR = [
          { role: 'MENTOR' },
          { profile: { preferredRole: { in: ['MENTOR', 'Mentor', 'Mentors', 'Advisor'] } } },
          { mentorProfile: { isNot: null } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'COFOUNDER', 'INVESTOR', 'STUDENT', 'MARKETER', 'OTHER', 'DEVELOPER'] } },
        ];
      } else if (catLower === 'students' || catLower === 'student') {
        where.OR = [
          { role: 'STUDENT' },
          { profile: { preferredRole: { in: ['Student', 'STUDENT', 'student', 'Students'] } } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'COFOUNDER', 'INVESTOR', 'MENTOR', 'MARKETER'] } },
        ];
      } else if (catLower === 'other' || catLower === 'others') {
        where.OR = [
          { role: { in: ['OTHER', 'OTHERS', 'DEVELOPER', 'DESIGNER', 'ADMIN'] } },
          { profile: { preferredRole: { in: ['Other', 'Others', 'OTHER', 'OTHERS', 'Developer', 'Designer'] } } },
        ];
        where.NOT = [
          ...(where.NOT || []),
          { role: { in: ['FOUNDER', 'COFOUNDER', 'INVESTOR', 'MENTOR', 'STUDENT', 'MARKETER'] } },
        ];
      }
    } else {
      where.OR = [
        { profile: { isNot: null } },
        { role: { in: ['STUDENT', 'OTHER', 'OTHERS', 'FOUNDER', 'COFOUNDER', 'DEVELOPER', 'MARKETER', 'DESIGNER', 'INVESTOR', 'MENTOR', 'ADMIN'] } },
      ];
    }

    const candidates = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        startups: {
          select: { id: true, name: true, stage: true, industry: true },
        },
        investorProfile: true,
      },
      take: 60,
    });

    const connMap = new Map();
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
        connMap.set(otherId, { status: c.status, isSender: c.senderId === req.user.id, connectionId: c.id });
      });
    }

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

    const responseData = {
      matches: scoredCandidates,
      total: scoredCandidates.length,
    };

    if (isDefaultFilter) {
      cofounderCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + COFOUNDER_CACHE_TTL });
    }

    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    return res.json(responseData);
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
    const cleanId = (id || '').trim().toLowerCase().replace(/^@/, '');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { profile: { username: cleanId } },
          { email: cleanId },
          { email: { startsWith: `${cleanId}@` } },
        ],
      },
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

    const connectionsCount = await prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: user.id },
          { receiverId: user.id },
        ],
      },
    });

    const { password: _, ...userSafe } = user;
    return res.json({
      ...userSafe,
      connectionsCount,
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
      oneLineBio,
      location,
      bio,
      avatar,
      coverImage,
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
      isCategorySelected,
    } = req.body;

    if (headline !== undefined && typeof headline === 'string') {
      const cleanHeadline = headline.trim();
      const wordCount = cleanHeadline.split(/\s+/).filter(Boolean).length;
      if (wordCount > 50) {
        return res.status(400).json({ error: 'Headline cannot exceed 50 words.' });
      }
      if (cleanHeadline.length > 0 && cleanHeadline.length < 3) {
        return res.status(400).json({ error: 'Headline must be at least 3 characters.' });
      }
    }

    if (oneLineBio !== undefined && typeof oneLineBio === 'string') {
      const cleanBio = oneLineBio.trim();
      if (cleanBio.length > 160) {
        return res.status(400).json({ error: 'One-line bio cannot exceed 160 characters.' });
      }
      if (cleanBio.length > 0 && cleanBio.length < 3) {
        return res.status(400).json({ error: 'One-line bio must be at least 3 characters.' });
      }
    }

    const updatedProfile = {
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      headline: headline !== undefined ? headline : (oneLineBio !== undefined ? oneLineBio : undefined),
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

    // Remove undefined values
    Object.keys(updatedProfile).forEach((key) => {
      if (updatedProfile[key] === undefined) delete updatedProfile[key];
    });

    const existing = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // Handle username update with 30-day restriction and uniqueness validation
    if (req.body.username !== undefined && req.body.username) {
      const cleanUsername = String(req.body.username).trim().toLowerCase().replace(/^@/, '');
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        return res.status(400).json({
          error: 'Username must be between 3 and 30 characters and can only contain letters, numbers, and underscores.',
        });
      }

      const existingUsername = (existing?.username || existingUser?.username || '').trim().toLowerCase();
      if (existingUsername && cleanUsername !== existingUsername) {
        // Check 30-day restriction
        const lastChanged = existing?.usernameChangedAt;
        if (lastChanged) {
          const diffMs = Date.now() - new Date(lastChanged).getTime();
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          if (diffMs < thirtyDaysMs) {
            const daysRemaining = Math.ceil((thirtyDaysMs - diffMs) / (24 * 60 * 60 * 1000));
            return res.status(400).json({
              error: `You can only change your username once every 30 days. You can change it again in ${daysRemaining} day(s).`,
            });
          }
        }

        // Check if username is taken in SQLite
        const takenPrisma = await prisma.profile.findFirst({
          where: {
            username: cleanUsername,
            userId: { not: req.user.id },
          },
        });
        if (takenPrisma) {
          return res.status(400).json({
            error: 'This username is already taken. Please choose another username.',
          });
        }

        // Check if username is taken in Supabase
        if (supabaseAdmin) {
          try {
            const { data: takenSupa } = await supabaseAdmin
              .from('profiles')
              .select('id, user_id')
              .ilike('username', cleanUsername)
              .neq('user_id', req.user.id)
              .maybeSingle();
            if (takenSupa) {
              return res.status(400).json({
                error: 'This username is already taken. Please choose another username.',
              });
            }
          } catch {}
        }

        updatedProfile.username = cleanUsername;
        updatedProfile.usernameChangedAt = new Date();
      } else if (!existingUsername) {
        updatedProfile.username = cleanUsername;
      }
    }

    const currentRole = (existing?.preferredRole || existingUser?.role || '').trim().toUpperCase();
    let currentRoleChangeCount = existing?.roleChangeCount || 0;

    if (preferredRole) {
      const newRole = String(preferredRole).trim().toUpperCase();
      if (currentRole && newRole && currentRole !== newRole) {
        if (currentRoleChangeCount >= 3) {
          return res.status(400).json({
            error: 'You have reached the maximum limit of 3 role changes. Your role is permanently locked.',
          });
        }
        currentRoleChangeCount += 1;
        updatedProfile.roleChangeCount = currentRoleChangeCount;
      }
    }

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

    if (preferredRole) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { role: String(preferredRole).toUpperCase() },
      }).catch(() => null);
    }

    // Authoritatively sync profile updates to Supabase PostgreSQL table (public.profiles) using service-role privileges
    try {
      const targetUserId = req.body?.id || req.user.id;
      const targetEmail = (req.body?.email || req.user.email || '').trim().toLowerCase();
      await upsertSupabaseProfile(targetUserId, targetEmail, {
        ...req.body,
        ...updatedProfile,
        username: updatedProfile.username,
        usernameChangedAt: updatedProfile.usernameChangedAt,
        roleChangeCount: currentRoleChangeCount,
        profileCompletion: updatedProfile.profileCompletion,
      });
    } catch (sbSyncErr) {
      console.warn('Backend Supabase profile sync warning:', sbSyncErr?.message);
    }

    // Purge in-memory matching cache so updated details appear immediately to everyone
    cofounderCache.clear();

    // Fetch full user record including updated profile and relations
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        startups: true,
      },
    });

    return res.json({
      message: 'Profile updated successfully!',
      user: fullUser,
      profile: savedProfile,
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// DELETE /api/users/me - Permanently delete account and all associated data
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.body?.email || req.user.email || '').toLowerCase().trim();

    console.log(`[Backend Delete] Starting permanent account deletion for User ID: ${userId}, Email: ${userEmail}`);

    // 1. Delete all Supabase Auth identities and Supabase PostgreSQL data (profiles, users, conversations, etc.)
    try {
      await deleteSupabaseUserCompletely(userId, userEmail);
    } catch (sbErr) {
      console.warn('[Backend Delete] Supabase deletion warning:', sbErr?.message);
    }

    // 2. Discover all matching user records in Prisma SQLite/DB by ID or Email
    const matchingPrismaUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: userId },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    const targetUserIds = Array.from(new Set([userId, ...matchingPrismaUsers.map((u) => u.id)]));

    // 3. Delete all related entities in Prisma safely
    for (const pId of targetUserIds) {
      const safeDelete = async (fn) => {
        try { await fn(); } catch (e) { /* ignore cascade/missing record errors */ }
      };

      await safeDelete(() => prisma.connection.deleteMany({ where: { OR: [{ senderId: pId }, { receiverId: pId }] } }));
      await safeDelete(() => prisma.startupProposal.deleteMany({ where: { OR: [{ senderId: pId }, { receiverId: pId }] } }));
      await safeDelete(() => prisma.message.deleteMany({ where: { OR: [{ senderId: pId }, { receiverId: pId }] } }));
      await safeDelete(() => prisma.conversation.deleteMany({ where: { OR: [{ participant1Id: pId }, { participant2Id: pId }] } }));
      await safeDelete(() => prisma.notification.deleteMany({ where: { OR: [{ userId: pId }, { senderId: pId }] } }));
      await safeDelete(() => prisma.like.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.comment.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.savedItem.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.startupFollow.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.opportunityApplication.deleteMany({ where: { applicantId: pId } }));
      await safeDelete(() => prisma.mentorshipRequest.deleteMany({ where: { OR: [{ founderId: pId }, { mentorUserId: pId }] } }));
      await safeDelete(() => prisma.investor.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.mentor.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.videoMeeting.deleteMany({ where: { OR: [{ hostId: pId }, { guestId: pId }] } }));
      await safeDelete(() => prisma.report.deleteMany({ where: { reporterId: pId } }));
      await safeDelete(() => prisma.verificationRequest.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.raisedSolution.deleteMany({ where: { authorId: pId } }));
      await safeDelete(() => prisma.startupMember.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.problem.deleteMany({ where: { createdBy: pId } }));
      await safeDelete(() => prisma.post.deleteMany({ where: { authorId: pId } }));
      await safeDelete(() => prisma.startup.deleteMany({ where: { founderId: pId } }));
      await safeDelete(() => prisma.profile.deleteMany({ where: { userId: pId } }));
      await safeDelete(() => prisma.user.deleteMany({ where: { id: pId } }));
    }

    if (userEmail) {
      try {
        await prisma.user.deleteMany({ where: { email: userEmail } });
      } catch (e) {}
    }

    // Clear matching cache so deleted user instantly disappears from cofounder searches
    try {
      cofounderCache.clear();
    } catch (e) {}

    return res.json({ success: true, message: 'Account permanently deleted from all services.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to permanently delete account.' });
  }
});

// User safety: Block / Unblock in-memory & persistent map
export const blockedUsersMap = new Map();

export function isUserBlockedPair(u1, u2) {
  if (!u1 || !u2) return false;
  const set1 = blockedUsersMap.get(u1);
  if (set1 && set1.has(u2)) return true;
  const set2 = blockedUsersMap.get(u2);
  if (set2 && set2.has(u1)) return true;
  return false;
}

// POST /api/users/:id/block
router.post('/:id/block', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself.' });
    }
    if (!blockedUsersMap.has(req.user.id)) {
      blockedUsersMap.set(req.user.id, new Set());
    }
    blockedUsersMap.get(req.user.id).add(targetId);
    return res.json({ success: true, blocked: true, message: 'User blocked successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to block user.' });
  }
});

// POST /api/users/:id/unblock
router.post('/:id/unblock', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (blockedUsersMap.has(req.user.id)) {
      blockedUsersMap.get(req.user.id).delete(targetId);
    }
    return res.json({ success: true, blocked: false, message: 'User unblocked successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unblock user.' });
  }
});

// GET /api/users/blocked/list
router.get('/blocked/list', requireAuth, async (req, res) => {
  try {
    const list = Array.from(blockedUsersMap.get(req.user.id) || []);
    return res.json({ blockedUserIds: list });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get blocked list.' });
  }
});

export default router;
