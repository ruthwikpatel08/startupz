import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

// GET /api/startups - Explore Startups / Ideas
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      industry,
      stage,
      fundingStatus,
      skill,
      location,
      search,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (!req.user) {
      where.visibility = 'PUBLIC';
    } else {
      where.OR = [
        { visibility: 'PUBLIC' },
        { founderId: req.user.id },
      ];
    }

    if (industry && industry !== 'ALL') {
      const indLower = industry.toLowerCase();
      if (indLower.includes('agri') || indLower.includes('agtech')) {
        where.industry = { in: ['AgriTech', 'AgTech', 'Agriculture'] };
      } else if (indLower.includes('clean') || indLower.includes('climate')) {
        where.industry = { in: ['CleanTech', 'ClimateTech', 'Energy', 'Sustainability'] };
      } else if (indLower.includes('health') || indLower.includes('med')) {
        where.industry = { in: ['HealthTech', 'MedTech', 'Healthcare', 'Biotechnology'] };
      } else if (indLower.includes('fin')) {
        where.industry = { in: ['FinTech', 'Financial Services'] };
      } else if (indLower.includes('ed')) {
        where.industry = { in: ['EdTech', 'Education'] };
      } else if (indLower.includes('cyber')) {
        where.industry = { in: ['CyberSecurity', 'Cybersecurity', 'Security'] };
      } else {
        where.industry = { contains: industry };
      }
    }

    if (stage && stage !== 'ALL') {
      where.stage = stage;
    }

    if (fundingStatus && fundingStatus !== 'ALL') {
      where.fundingStatus = fundingStatus;
    }

    if (skill) {
      where.requiredSkills = { contains: skill };
    }

    if (location) {
      where.location = { contains: location };
    }

    if (search) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q } },
            { oneLineDescription: { contains: q } },
            { problem: { contains: q } },
            { solution: { contains: q } },
            { industry: { contains: q } },
            { requiredSkills: { contains: q } },
          ],
        },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sort === 'popular') {
      orderBy = { likesCount: 'desc' };
    }

    // Always ensure startups from Supabase are synchronized into Prisma
    if (supabaseAdmin) {
      try {
        const { data: supaList } = await supabaseAdmin
          .from('startups')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (Array.isArray(supaList) && supaList.length > 0) {
          for (const ss of supaList) {
            await ensureStartupInPrisma(ss);
          }
        }
      } catch (sbErr) {
        console.warn('Supabase startup sync warning:', sbErr.message);
      }
    }

    const [total, startups] = await Promise.all([
      prisma.startup.count({ where }),
      prisma.startup.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          founder: {
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              profile: {
                select: { fullName: true, avatar: true, headline: true, location: true },
              },
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          },
          opportunities: {
            where: { status: 'OPEN' },
            select: { id: true, role: true, commitment: true, compensation: true },
          },
        },
      }),
    ]);

    let userLikes = new Set();
    let userSaves = new Set();

    if (req.user) {
      const [likes, saves] = await Promise.all([
        prisma.like.findMany({
          where: { userId: req.user.id, startupId: { not: null } },
          select: { startupId: true },
        }),
        prisma.savedItem.findMany({
          where: { userId: req.user.id, itemType: 'STARTUP' },
          select: { itemId: true },
        }),
      ]);

      likes.forEach((l) => userLikes.add(l.startupId));
      saves.forEach((s) => userSaves.add(s.itemId));
    }

    const formattedStartups = startups.map((s) => ({
      ...s,
      isLiked: userLikes.has(s.id),
      isSaved: userSaves.has(s.id),
      teamSize: (s.members?.length || 0) + 1,
    }));

    return res.json({
      startups: formattedStartups,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('List startups error:', error);
    return res.status(500).json({ error: 'Failed to retrieve startups.' });
  }
});

// GET /api/startups/recommendations
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });

    const myProfile = user.profile || {};
    const mySkills = (myProfile.skills || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    const myIndustries = (myProfile.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

    const startups = await prisma.startup.findMany({
      where: {
        founderId: { not: req.user.id },
        visibility: 'PUBLIC',
      },
      include: {
        founder: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
      take: 6,
    });

    const recommendations = startups.map((startup) => {
      const startupSkills = (startup.requiredSkills || '').toLowerCase().split(',').map((s) => s.trim());
      const overlappingSkills = mySkills.filter((sk) => startupSkills.some((ss) => ss.includes(sk)));
      const isIndustryMatch = myIndustries.some((ind) => startup.industry.toLowerCase().includes(ind));

      let reason = `Fast-growing ${startup.stage} stage venture in ${startup.industry}`;
      if (overlappingSkills.length > 0) {
        reason = `Looking for your skills in ${overlappingSkills.slice(0, 2).join(', ').toUpperCase()}`;
      } else if (isIndustryMatch) {
        reason = `Aligned with your interest in ${startup.industry}`;
      }

      return {
        ...startup,
        recommendationReason: reason,
      };
    });

    return res.json({ recommendations });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

// POST /api/startups/ai-feedback - AI Structured Feedback
router.post('/ai-feedback', requireAuth, async (req, res) => {
  try {
    const { problem, solution, targetCustomer, industry } = req.body;

    if (!problem || !solution) {
      return res.status(400).json({ error: 'Please provide both problem and solution statements.' });
    }

    const probLength = problem.trim().length;
    const solLength = solution.trim().length;
    const custLength = (targetCustomer || '').trim().length;

    const problemClarityScore = Math.min(95, Math.max(65, 65 + Math.floor(probLength / 5)));
    const solutionClarityScore = Math.min(95, Math.max(68, 68 + Math.floor(solLength / 5)));
    const marketFitScore = Math.min(92, Math.max(60, 60 + Math.floor(custLength / 4)));

    const analysis = {
      overallScore: Math.round((problemClarityScore + solutionClarityScore + marketFitScore) / 3),
      problemClarity: {
        score: problemClarityScore,
        status: problemClarityScore > 80 ? 'Strong Pain Point' : 'Moderate Pain Point',
        feedback: problemClarityScore > 80 
          ? 'The problem is well-articulated and highlights a genuine, acute pain point in the market.'
          : 'Consider quantifying the monetary loss or hours wasted by your prospective buyers.',
      },
      targetCustomerClarity: {
        score: marketFitScore,
        status: marketFitScore > 75 ? 'Targeted Niche' : 'Broad Segment',
        feedback: custLength > 15
          ? `Target segment identified (${targetCustomer}). Focused beachhead enables low-CAC customer acquisition.`
          : 'Narrow down the initial beachhead persona (exact job title, company size, or demographic).',
      },
      solutionClarity: {
        score: solutionClarityScore,
        status: solutionClarityScore > 80 ? 'High Leverage' : 'Iterating',
        feedback: 'The core value proposition addresses the friction points with clear differentiation.',
      },
      potentialRisks: [
        'Customer Acquisition Cost (CAC) vs Lifetime Value (LTV) validation required early.',
        'Incumbent or platform dependency risk — establish a defensible proprietary workflow.',
        'Adoption inertia: users default to existing workarounds unless the product is 10x faster or cheaper.',
      ],
      validationQuestions: [
        `How many target customers experiencing "${problem.slice(0, 45)}..." have you interviewed this month?`,
        'What is the smallest usable version (MVP) you can ship in under 3 weeks?',
        'Will customers pay upfront, subscription, or take rate for this solution?',
      ],
      disclaimer: 'AI insights are strategic suggestions designed for ideation and customer validation, not legal or investment guarantees.',
    };

    return res.json({ analysis });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate AI feedback.' });
  }
});

// GET /api/startups/:id - Single Startup Profile
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await ensureStartupInPrisma(id);

    const startup = await prisma.startup.findUnique({
      where: { id },
      include: {
        founder: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            verificationBadge: true,
            profile: {
              select: {
                fullName: true,
                avatar: true,
                headline: true,
                location: true,
                bio: true,
                linkedinUrl: true,
                githubUrl: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { fullName: true, avatar: true, headline: true } },
              },
            },
          },
        },
        opportunities: {
          where: { status: 'OPEN' },
        },
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true, likes: true } },
          },
        },
      },
    });

    if (!startup) {
      return res.status(404).json({ error: 'Startup venture not found.' });
    }

    prisma.startup.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    }).catch(() => {});

    let isLiked = false;
    let isSaved = false;
    let isFollowed = false;

    if (req.user) {
      const [like, save, follow] = await Promise.all([
        prisma.like.findFirst({ where: { userId: req.user.id, startupId: id } }),
        prisma.savedItem.findFirst({ where: { userId: req.user.id, itemType: 'STARTUP', itemId: id } }),
        prisma.startupFollow.findUnique({ where: { startupId_userId: { startupId: id, userId: req.user.id } } }),
      ]);

      isLiked = !!like;
      isSaved = !!save;
      isFollowed = !!follow;
    }

    return res.json({
      ...startup,
      isLiked,
      isSaved,
      isFollowed,
      teamSize: (startup.members?.length || 0) + 1,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch startup details.' });
  }
});

// POST /api/startups/:id/follow - Follow/Unfollow Startup Company
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.startupFollow.findUnique({
      where: { startupId_userId: { startupId: id, userId: req.user.id } },
    });

    if (existing) {
      await prisma.startupFollow.delete({ where: { id: existing.id } });
      const updated = await prisma.startup.update({
        where: { id },
        data: { followersCount: { decrement: 1 } },
      });
      return res.json({ followed: false, following: false, followersCount: Math.max(0, updated.followersCount) });
    } else {
      await prisma.startupFollow.create({
        data: { startupId: id, userId: req.user.id },
      });
      const updated = await prisma.startup.update({
        where: { id },
        data: { followersCount: { increment: 1 } },
      });

      const startup = await prisma.startup.findUnique({ where: { id } });
      if (startup && startup.founderId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: startup.founderId,
            senderId: req.user.id,
            type: 'STARTUP_FOLLOW',
            title: 'New Startup Follower!',
            message: `${req.user.profile?.fullName || 'Someone'} started following ${startup.name}.`,
            link: `/startups/${startup.id}`,
          },
        });
      }

      return res.json({ followed: true, following: true, followersCount: updated.followersCount });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update follow status.' });
  }
});

// POST /api/startups - Create Startup
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      logo,
      oneLineDescription,
      problem,
      solution,
      targetCustomers,
      industry,
      businessModel,
      stage = 'Idea',
      location,
      requiredSkills,
      fundingStatus = 'Bootstrapped',
      fundingRequired,
      currentTraction,
      website,
      demoLink,
      pitchDeckUrl,
      images,
      visibility = 'PUBLIC',
      isConfidential = false,
      // Opportunity / Hiring fields linked to startup
      hiringType,
      opportunityRole,
      opportunityWorkplaceType,
      opportunityCompensation,
      opportunityDescription,
      internshipData,
      jobData,
    } = req.body;

    if (!name || !oneLineDescription || !problem || !solution || !industry) {
      return res.status(400).json({
        error: 'Please fill in Startup Name, One-line description, Problem, Solution, and Industry.',
      });
    }

    const startup = await prisma.startup.create({
      data: {
        founderId: req.user.id,
        name: name.trim(),
        logo: logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        oneLineDescription: oneLineDescription.trim(),
        problem: problem.trim(),
        solution: solution.trim(),
        targetCustomers,
        industry,
        businessModel,
        stage,
        location: location || req.user.profile?.location || 'Remote',
        requiredSkills,
        fundingStatus,
        fundingRequired,
        currentTraction,
        website,
        demoLink,
        pitchDeckUrl,
        images,
        visibility,
        isConfidential: Boolean(isConfidential),
      },
    });

    // Mirror startup to Supabase for permanent persistence across restarts
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('startups').upsert({
          id: startup.id,
          founder_id: req.user.id,
          name: startup.name,
          logo: startup.logo || null,
          one_line_description: startup.oneLineDescription,
          problem: startup.problem,
          solution: startup.solution,
          target_customers: startup.targetCustomers || null,
          industry: startup.industry,
          business_model: startup.businessModel || null,
          stage: startup.stage || 'Idea',
          location: startup.location || null,
          required_skills: startup.requiredSkills || null,
          funding_status: startup.fundingStatus || 'Bootstrapped',
          funding_required: startup.fundingRequired || null,
          current_traction: startup.currentTraction || null,
          website: startup.website || null,
          demo_link: startup.demoLink || null,
          pitch_deck_url: startup.pitchDeckUrl || null,
          images: startup.images || null,
          visibility: startup.visibility || 'PUBLIC',
          is_confidential: Boolean(startup.isConfidential),
          is_verified: Boolean(startup.isVerified),
          likes_count: startup.likesCount || 0,
          views_count: startup.viewsCount || 0,
        }, { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('Supabase startup mirror notice:', sbErr.message);
      }
    }

    // 1. Create Launch Post in Prisma
    await prisma.post.create({
      data: {
        authorId: req.user.id,
        startupId: startup.id,
        postType: 'LAUNCH',
        title: `Announcing ${startup.name} on HookZ! 🚀`,
        content: `Excited to unveil ${startup.name} (${startup.stage} Stage): ${startup.oneLineDescription}\n\nProblem: "${startup.problem.slice(0, 140)}..."\n\nLooking for: ${startup.requiredSkills || 'Passionate collaborators'}. Connect or check out our startup profile!`,
      },
    }).catch((e) => console.warn('Prisma launch post notice:', e.message));

    // 2. Separate Internship Form Creation
    if (internshipData && internshipData.enabled) {
      const durStr = internshipData.durationType === 'Permanent' 
        ? 'Permanent' 
        : `${internshipData.customDays || 60} Days`;
      const internRole = (internshipData.role || `${startup.name} Intern`).trim();
      const internComp = (internshipData.compensation || 'Paid Stipend').trim();
      const internWorkplace = internshipData.workplaceType || 'Remote';
      const internDesc = (internshipData.description || `Internship opportunity at ${startup.name} (${startup.industry}). Allotted Stipend: ${internComp}. Duration: ${durStr}. Work on building real products.`).trim();

      await prisma.startupOpportunity.create({
        data: {
          startupId: startup.id,
          role: internRole.toLowerCase().includes('intern') ? internRole : `${internRole} (Internship)`,
          requiredSkills: requiredSkills || 'Problem Solving, Teamwork',
          commitment: `Internship (${durStr})`,
          compensation: internComp,
          location: startup.location || 'Remote',
          workplaceType: internWorkplace,
          description: internDesc,
        },
      }).catch((e) => console.warn('Prisma internship creation notice:', e.message));
    }

    // 3. Separate Job Opening Form Creation
    if (jobData && jobData.enabled) {
      const durStr = jobData.durationType === 'Permanent' 
        ? 'Permanent' 
        : `${jobData.customDays || 180} Days`;
      const jobRoleTitle = (jobData.role || `${startup.name} Team Member`).trim();
      const jobComp = (jobData.compensation || 'Competitive Salary').trim();
      const jobWorkplace = jobData.workplaceType || 'Remote';
      const jobDesc = (jobData.description || `Job opening at ${startup.name} (${startup.industry}). Allotted Compensation: ${jobComp}. Commitment: ${durStr}. Join as a key team member.`).trim();

      await prisma.startupOpportunity.create({
        data: {
          startupId: startup.id,
          role: jobRoleTitle,
          requiredSkills: requiredSkills || 'Full-Stack, Product Strategy',
          commitment: `Job (${durStr})`,
          compensation: jobComp,
          location: startup.location || 'Remote',
          workplaceType: jobWorkplace,
          description: jobDesc,
        },
      }).catch((e) => console.warn('Prisma job creation notice:', e.message));
    }

    // 4. Backwards compatibility for single hiringType if separate forms were not passed
    if (!internshipData && !jobData && hiringType && hiringType !== 'NONE') {
      const oppRoleName = (opportunityRole || requiredSkills?.split(',')[0] || 'Software Engineer').trim();
      const oppDesc = (opportunityDescription || `${startup.name} is looking for talent to join our ${startup.stage} stage venture in ${startup.industry}. We are building: ${startup.oneLineDescription}`).trim();
      const oppWorkplace = opportunityWorkplaceType || 'Remote';
      const oppComp = opportunityCompensation || (fundingStatus === 'Funded' ? 'Competitive Salary' : 'Equity + Stipend');

      if (hiringType === 'INTERNSHIP' || hiringType === 'BOTH') {
        const internTitle = oppRoleName.toLowerCase().includes('intern') ? oppRoleName : `${oppRoleName} (Internship)`;
        await prisma.startupOpportunity.create({
          data: {
            startupId: startup.id,
            role: internTitle,
            requiredSkills: requiredSkills || 'Problem Solving, Teamwork',
            commitment: 'Internship',
            compensation: oppComp.toLowerCase().includes('stipend') ? oppComp : 'Paid Stipend',
            location: startup.location || 'Remote',
            workplaceType: oppWorkplace,
            description: `[Internship Wanted] ${oppDesc}`,
          },
        }).catch((e) => console.warn('Prisma auto internship opportunity notice:', e.message));
      }

      if (hiringType === 'JOB' || hiringType === 'BOTH') {
        const jobTitle = oppRoleName.replace(/\bintern(ship)?\b/gi, '').trim() || `${startup.name} Team Lead`;
        await prisma.startupOpportunity.create({
          data: {
            startupId: startup.id,
            role: jobTitle,
            requiredSkills: requiredSkills || 'Full-Stack, Product Strategy',
            commitment: 'Full-time',
            compensation: oppComp,
            location: startup.location || 'Remote',
            workplaceType: oppWorkplace,
            description: `[Job Opening] ${oppDesc}`,
          },
        }).catch((e) => console.warn('Prisma auto job opportunity notice:', e.message));
      }
    }

    return res.status(201).json({
      message: 'Startup published successfully!',
      startup,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create startup venture.' });
  }
});

// PUT /api/startups/:id - Update Startup
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.startup.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Startup not found.' });

    if (existing.founderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to modify this startup.' });
    }

    const allowed = [
      'name',
      'logo',
      'oneLineDescription',
      'problem',
      'solution',
      'targetCustomers',
      'industry',
      'businessModel',
      'stage',
      'location',
      'requiredSkills',
      'fundingStatus',
      'fundingRequired',
      'currentTraction',
      'website',
      'demoLink',
      'pitchDeckUrl',
      'images',
      'visibility',
      'isConfidential',
    ];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    const updated = await prisma.startup.update({
      where: { id },
      data: updateData,
      include: {
        founder: {
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

    if (supabaseAdmin) {
      try {
        const supaUpdate = {};
        if (updateData.name !== undefined) supaUpdate.name = updateData.name;
        if (updateData.logo !== undefined) supaUpdate.logo = updateData.logo;
        if (updateData.oneLineDescription !== undefined) supaUpdate.one_line_description = updateData.oneLineDescription;
        if (updateData.problem !== undefined) supaUpdate.problem = updateData.problem;
        if (updateData.solution !== undefined) supaUpdate.solution = updateData.solution;
        if (updateData.targetCustomers !== undefined) supaUpdate.target_customers = updateData.targetCustomers;
        if (updateData.industry !== undefined) supaUpdate.industry = updateData.industry;
        if (updateData.businessModel !== undefined) supaUpdate.business_model = updateData.businessModel;
        if (updateData.stage !== undefined) supaUpdate.stage = updateData.stage;
        if (updateData.location !== undefined) supaUpdate.location = updateData.location;
        if (updateData.requiredSkills !== undefined) supaUpdate.required_skills = updateData.requiredSkills;
        if (updateData.fundingStatus !== undefined) supaUpdate.funding_status = updateData.fundingStatus;
        if (updateData.fundingRequired !== undefined) supaUpdate.funding_required = updateData.fundingRequired;
        if (updateData.currentTraction !== undefined) supaUpdate.current_traction = updateData.currentTraction;
        if (updateData.website !== undefined) supaUpdate.website = updateData.website;
        if (updateData.demoLink !== undefined) supaUpdate.demo_link = updateData.demoLink;
        if (updateData.pitchDeckUrl !== undefined) supaUpdate.pitch_deck_url = updateData.pitchDeckUrl;
        if (updateData.images !== undefined) supaUpdate.images = updateData.images;
        if (updateData.visibility !== undefined) supaUpdate.visibility = updateData.visibility;
        if (updateData.isConfidential !== undefined) supaUpdate.is_confidential = Boolean(updateData.isConfidential);
        if (updateData.isVerified !== undefined) supaUpdate.is_verified = Boolean(updateData.isVerified);
        supaUpdate.updated_at = new Date().toISOString();

        if (Object.keys(supaUpdate).length > 0) {
          await supabaseAdmin.from('startups').update(supaUpdate).eq('id', id);
        }
      } catch (sbErr) {
        console.warn('Supabase startup update notice:', sbErr.message);
      }
    }

    return res.json({ message: 'Startup updated successfully!', startup: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update startup.' });
  }
});

// DELETE /api/startups/:id - Delete Startup
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.startup.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Startup not found.' });

    if (existing.founderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this startup.' });
    }

    // 1. Clean up only posts directly linked to this startup ID
    await prisma.post.deleteMany({
      where: { startupId: id },
    }).catch((e) => console.warn('Prisma post cleanup warning:', e.message));

    // 2. Clean up from Supabase posts and startups if available
    try {
      if (supabaseAdmin) {
        await supabaseAdmin.from('posts').delete().eq('startup_id', id);
        await supabaseAdmin.from('startups').delete().eq('id', id);
      }
    } catch (sbErr) {
      console.warn('Supabase post cleanup warning:', sbErr.message);
    }

    // 3. Delete startup opportunities & related applications
    await prisma.opportunityApplication.deleteMany({
      where: { opportunity: { startupId: id } },
    }).catch(() => {});
    await prisma.startupOpportunity.deleteMany({ where: { startupId: id } }).catch(() => {});

    // 4. Finally delete the startup
    await prisma.startup.delete({ where: { id } });
    return res.json({ message: 'Startup successfully deleted.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete startup.' });
  }
});

// POST /api/startups/:id/like - Toggle Like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.like.findFirst({
      where: { userId: req.user.id, startupId: id },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      const updated = await prisma.startup.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });
      return res.json({ liked: false, likesCount: updated.likesCount });
    } else {
      await prisma.like.create({
        data: { userId: req.user.id, startupId: id },
      });
      const updated = await prisma.startup.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      const startup = await prisma.startup.findUnique({ where: { id } });
      if (startup && startup.founderId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: startup.founderId,
            senderId: req.user.id,
            type: 'POST_LIKE',
            title: 'New Like on your Startup!',
            message: `${req.user.profile?.fullName || 'Someone'} liked ${startup.name}.`,
            link: `/startups/${startup.id}`,
          },
        });
      }

      return res.json({ liked: true, likesCount: updated.likesCount });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update like.' });
  }
});

// POST /api/startups/validate-ai - AI Idea Evaluation & Validation Feedback
router.post('/validate-ai', optionalAuth, async (req, res) => {
  try {
    const { problem, solution, targetCustomers, industry } = req.body;

    if (!problem || !solution) {
      return res.status(400).json({ error: 'Problem and solution statements are required for AI evaluation.' });
    }

    // Algorithmic evaluation engine based on heuristic clarity, length, target customers, and industry scope
    const probWords = problem.trim().split(/\s+/).length;
    const solWords = solution.trim().split(/\s+/).length;

    let score = 70;
    if (probWords >= 8 && probWords <= 40) score += 10;
    if (solWords >= 8 && solWords <= 40) score += 10;
    if (targetCustomers && targetCustomers.length > 5) score += 5;
    if (industry) score += 4;

    const feedback = {
      overallScore: Math.min(96, Math.max(74, score)),
      problemClarity: probWords > 5
        ? `Articulates an urgent operational pain point (${problem.slice(0, 70)}...).`
        : 'The problem is succinct; consider adding real-world metrics or who suffers most.',
      solutionClarity: solWords > 5
        ? `Offers a direct mechanism (${solution.slice(0, 70)}...) with clear value creation.`
        : 'Solution needs more technical granularity or specific MVP workflow details.',
      targetCustomerClarity: targetCustomers
        ? `Targeting ${targetCustomers} provides focused initial beachhead market.`
        : 'Specify whether target buyer is B2B enterprise, SMB, or prosumer.',
      strengths: [
        'Direct problem-solution linkage suitable for fast MVP prototyping',
        `High growth tailwinds in the ${industry || 'technology'} vertical`,
        'Strong candidate for co-founder matchmaking and early angel interest',
      ],
      potentialRisks: [
        'Customer onboarding friction if switching costs from legacy tooling are high',
        'Distribution moat must be built early to prevent fast-follower feature copycats',
      ],
      validationQuestions: [
        'What is the prospective customer’s current monthly expenditure solving this manually?',
        'How many customer discovery interviews have validated this exact bottleneck?',
        'What is the simplest version of this product that delivers 80% of the value?',
      ],
    };

    return res.json({ feedback });
  } catch (error) {
    console.error('AI validation error:', error);
    return res.status(500).json({ error: 'Failed to evaluate startup concept.' });
  }
});

export async function ensureStartupInPrisma(startupInput) {
  try {
    const startupId = typeof startupInput === 'string' ? startupInput : startupInput?.id;
    if (!startupId) return null;

    let startup = await prisma.startup.findUnique({ where: { id: startupId } });
    if (startup) return startup;

    if (!supabaseAdmin) return null;

    let supaStartup = null;
    if (typeof startupInput === 'object' && startupInput !== null && startupInput.name) {
      supaStartup = startupInput;
    } else {
      const { data, error } = await supabaseAdmin
        .from('startups')
        .select('*')
        .eq('id', startupId)
        .maybeSingle();
      if (!error && data) supaStartup = data;
    }

    if (!supaStartup) return null;

    // Ensure founder user exists in Prisma
    const founderId = supaStartup.founder_id;
    let founder = await prisma.user.findUnique({ where: { id: founderId } });
    if (!founder) {
      let prof = null;
      try {
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or(`user_id.eq.${founderId},id.eq.${founderId}`)
          .maybeSingle();
        prof = data;
      } catch {}

      const fullName = prof?.full_name || `${supaStartup.name} Founder`;
      founder = await prisma.user.create({
        data: {
          id: founderId,
          email: prof?.email || `${founderId}@startupz.network`,
          password: 'SUPABASE_SYNCED',
          role: (prof?.preferred_role || 'FOUNDER').toUpperCase(),
          isVerified: true,
          verificationBadge: 'Verified Member',
          profile: {
            create: {
              fullName,
              headline: prof?.headline || `Founder @ ${supaStartup.name}`,
              location: prof?.location || supaStartup.location || 'Remote',
              avatar: prof?.avatar || null,
            },
          },
        },
      }).catch(async () => {
        return prisma.user.findFirst();
      });
    }

    if (!founder) return null;

    startup = await prisma.startup.create({
      data: {
        id: supaStartup.id,
        founderId: founder.id,
        name: supaStartup.name,
        logo: supaStartup.logo || null,
        oneLineDescription: supaStartup.one_line_description,
        problem: supaStartup.problem,
        solution: supaStartup.solution,
        targetCustomers: supaStartup.target_customers || null,
        industry: supaStartup.industry,
        businessModel: supaStartup.business_model || null,
        stage: supaStartup.stage || 'Idea',
        location: supaStartup.location || null,
        requiredSkills: supaStartup.required_skills || null,
        fundingStatus: supaStartup.funding_status || 'Bootstrapped',
        fundingRequired: supaStartup.funding_required || null,
        currentTraction: supaStartup.current_traction || null,
        website: supaStartup.website || null,
        demoLink: supaStartup.demo_link || null,
        pitchDeckUrl: supaStartup.pitch_deck_url || null,
        images: supaStartup.images || null,
        visibility: supaStartup.visibility || 'PUBLIC',
        isConfidential: Boolean(supaStartup.is_confidential),
        isVerified: Boolean(supaStartup.is_verified),
        likesCount: supaStartup.likes_count || 0,
        viewsCount: supaStartup.views_count || 0,
        createdAt: supaStartup.created_at ? new Date(supaStartup.created_at) : new Date(),
      },
    });

    return startup;
  } catch (err) {
    console.warn('ensureStartupInPrisma notice:', err?.message);
    return null;
  }
}

export default router;
