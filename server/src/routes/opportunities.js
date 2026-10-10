import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

// GET /api/opportunities
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { role, workplaceType, commitment, compensation, search, type, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { status: 'OPEN' };

    const orConditions = [];

    if (type && type !== 'ALL') {
      const tLower = type.toLowerCase();
      if (tLower === 'internships' || tLower === 'internship') {
        orConditions.push(
          { commitment: { contains: 'Intern' } },
          { role: { contains: 'Intern' } },
          { description: { contains: 'intern' } },
        );
      } else if (tLower === 'jobs' || tLower === 'job') {
        orConditions.push(
          { description: { contains: '[Job Opening]' } },
          { commitment: 'Full-time' },
          { commitment: 'Part-time' },
          { role: { contains: 'Engineer' } },
          { role: { contains: 'Lead' } },
          { role: { contains: 'Architect' } },
          { role: { contains: 'Scientist' } },
          { role: { contains: 'Specialist' } },
          { role: { contains: 'Researcher' } },
        );
      }
    }

    if (role && role !== 'ALL') {
      const rLower = role.toLowerCase();
      if (rLower.includes('grant') || rLower.includes('fellowship')) {
        orConditions.push(
          { role: { contains: 'Grant' } },
          { role: { contains: 'Fellowship' } },
          { role: { contains: 'Scheme' } },
          { role: { contains: 'Challenge' } },
        );
      } else if (rLower.includes('accelerator') || rLower.includes('program')) {
        orConditions.push(
          { role: { contains: 'Accelerator' } },
          { role: { contains: 'Batch' } },
          { role: { contains: 'Program' } },
        );
      } else if (rLower.includes('engineer') || rLower.includes('developer')) {
        orConditions.push(
          { role: { contains: 'Engineer' } },
          { role: { contains: 'Developer' } },
          { role: { contains: 'Architect' } },
        );
      } else if (rLower.includes('research') || rLower.includes('scientist')) {
        orConditions.push(
          { role: { contains: 'Scientist' } },
          { role: { contains: 'Researcher' } },
          { role: { contains: 'Research' } },
        );
      } else {
        where.role = { contains: role };
      }
    }

    if (workplaceType && workplaceType !== 'ALL') where.workplaceType = workplaceType;
    if (commitment && commitment !== 'ALL') where.commitment = commitment;
    if (compensation && compensation !== 'ALL') where.compensation = { contains: compensation };

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    if (search) {
      const q = search.trim();
      const searchConditions = [
        { role: { contains: q } },
        { requiredSkills: { contains: q } },
        { description: { contains: q } },
        { startup: { name: { contains: q } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [total, opportunities] = await Promise.all([
      prisma.startupOpportunity.count({ where }),
      prisma.startupOpportunity.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              logo: true,
              stage: true,
              industry: true,
              location: true,
              founder: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          },
          _count: { select: { applications: true } },
        },
      }),
    ]);

    let applicationsMap = new Map();
    let savedOppIds = new Set();

    if (req.user) {
      const [applications, saves] = await Promise.all([
        prisma.opportunityApplication.findMany({
          where: { applicantId: req.user.id },
          select: { opportunityId: true, status: true, createdAt: true },
        }),
        prisma.savedItem.findMany({
          where: { userId: req.user.id, itemType: 'OPPORTUNITY' },
          select: { itemId: true },
        }),
      ]);

      applications.forEach((a) => applicationsMap.set(a.opportunityId, { status: a.status, createdAt: a.createdAt }));
      saves.forEach((s) => savedOppIds.add(s.itemId));
    }

    const formatted = opportunities.map((opp) => {
      const app = applicationsMap.get(opp.id);
      return {
        ...opp,
        hasApplied: Boolean(app),
        applicationStatus: app ? app.status : null,
        appliedAt: app ? app.createdAt : null,
        isSaved: savedOppIds.has(opp.id),
      };
    });

    return res.json({
      opportunities: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve opportunities.' });
  }
});

// POST /api/opportunities
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      startupId,
      role,
      requiredSkills,
      commitment = 'Part-time',
      compensation = 'Equity only',
      location = 'Remote',
      workplaceType = 'Remote',
      description,
    } = req.body;

    if (!startupId || !role || !requiredSkills || !description) {
      return res.status(400).json({ error: 'Please provide startup, role title, required skills, and description.' });
    }

    const startup = await prisma.startup.findUnique({ where: { id: startupId } });
    if (!startup || startup.founderId !== req.user.id) {
      return res.status(403).json({ error: 'You can only post opportunities for your own startups.' });
    }

    const opportunity = await prisma.startupOpportunity.create({
      data: {
        startupId,
        role: role.trim(),
        requiredSkills: requiredSkills.trim(),
        commitment,
        compensation,
        location,
        workplaceType,
        description: description.trim(),
      },
    });

    await prisma.post.create({
      data: {
        authorId: req.user.id,
        startupId,
        postType: 'HIRING',
        title: `We're looking for a ${role} at ${startup.name}!`,
        content: `${startup.name} is seeking a passionate ${role} (${commitment}, ${compensation}, ${workplaceType}).\n\nSkills: ${requiredSkills}\n\nApply directly through HookZ Opportunities!`,
      },
    });

    return res.status(201).json({ message: 'Opportunity published successfully!', opportunity });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create opportunity.' });
  }
});

// POST /api/opportunities/:id/apply
router.post('/:id/apply', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { coverLetter, resumeUrl } = req.body;

    const opportunity = await prisma.startupOpportunity.findUnique({
      where: { id },
      include: { startup: true },
    });

    if (!opportunity || opportunity.status !== 'OPEN') {
      return res.status(404).json({ error: 'Opportunity is no longer accepting applications.' });
    }

    if (opportunity.startup.founderId === req.user.id) {
      return res.status(400).json({ error: 'You cannot apply to your own startup opportunity.' });
    }

    const existing = await prisma.opportunityApplication.findUnique({
      where: {
        opportunityId_applicantId: {
          opportunityId: id,
          applicantId: req.user.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already applied to this opportunity.' });
    }

    const application = await prisma.opportunityApplication.create({
      data: {
        opportunityId: id,
        applicantId: req.user.id,
        coverLetter: coverLetter || `Hi, I am interested in joining ${opportunity.startup.name} as a ${opportunity.role}.`,
        resumeUrl,
      },
    });

    const applicantDisplayName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'A candidate';
    const applicantUsername = req.user.profile?.username ? `@${req.user.profile.username}` : '';
    const applicantLabel = applicantUsername ? `${applicantDisplayName} (${applicantUsername})` : applicantDisplayName;

    await prisma.notification.create({
      data: {
        userId: opportunity.startup.founderId,
        senderId: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: `New Application for ${opportunity.role}`,
        message: `${applicantLabel} applied for ${opportunity.role} at ${opportunity.startup.name}.`,
        link: `/opportunities`,
      },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: opportunity.startup.founderId,
        sender_id: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: `New Application for ${opportunity.role}`,
        message: `${applicantLabel} applied for ${opportunity.role} at ${opportunity.startup.name}.`,
        link: `/opportunities`,
        is_read: false,
      }).catch(() => null);
    }

    return res.status(201).json({
      message: 'Application submitted successfully!',
      application,
      hasApplied: true,
      applicationStatus: 'PENDING',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// GET /api/opportunities/my-applications
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    const applications = await prisma.opportunityApplication.findMany({
      where: { applicantId: req.user.id },
      include: {
        opportunity: {
          include: {
            startup: {
              select: { id: true, name: true, logo: true, stage: true, industry: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ applications });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// GET /api/opportunities/:id/applications - Get all applicants for an opportunity (Founder/Creator only)
router.get('/:id/applications', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const opp = await prisma.startupOpportunity.findUnique({
      where: { id },
      include: {
        startup: {
          select: { id: true, name: true, founderId: true },
        },
      },
    });

    if (!opp) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }

    if (opp.startup.founderId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the startup founder can review applicants.' });
    }

    const applications = await prisma.opportunityApplication.findMany({
      where: { opportunityId: id },
      include: {
        applicant: {
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
      orderBy: { createdAt: 'desc' },
    });

    // Hydrate candidate profiles with fresh Supabase profiles data (avatars, username, etc.)
    if (supabaseAdmin && applications.length > 0) {
      const applicantIds = Array.from(new Set(applications.map((a) => a.applicantId).filter(Boolean)));
      if (applicantIds.length > 0) {
        try {
          const { data: supaProfiles } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('user_id', applicantIds);

          if (supaProfiles && supaProfiles.length > 0) {
            const pMap = new Map();
            supaProfiles.forEach((p) => {
              if (p.user_id) pMap.set(p.user_id, p);
              if (p.id) pMap.set(p.id, p);
            });

            applications.forEach((app) => {
              const sp = pMap.get(app.applicantId);
              if (sp && app.applicant) {
                if (!app.applicant.profile) app.applicant.profile = {};
                if (sp.full_name) app.applicant.profile.fullName = sp.full_name;
                if (sp.avatar) app.applicant.profile.avatar = sp.avatar;
                if (sp.username) app.applicant.profile.username = sp.username;
                if (sp.headline) app.applicant.profile.headline = sp.headline;
              }
            });
          }
        } catch (enrichErr) {
          console.warn('Applicant profiles hydration notice:', enrichErr?.message);
        }
      }
    }

    return res.json({ applications });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch applicants.' });
  }
});

// PUT /api/opportunities/applications/:applicationId/status
router.put('/applications/:applicationId/status', requireAuth, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const app = await prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: { include: { startup: true } } },
    });

    if (!app || app.opportunity.startup.founderId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to review this application.' });
    }

    const normalizedStatus = (status === 'REJECTED' || status === 'DECLINED') ? 'DENIED' : status;

    const updated = await prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status: normalizedStatus },
    });

    if (normalizedStatus === 'ACCEPTED') {
      await prisma.startupMember.upsert({
        where: {
          startupId_userId: {
            startupId: app.opportunity.startupId,
            userId: app.applicantId,
          },
        },
        update: { role: app.opportunity.role },
        create: {
          startupId: app.opportunity.startupId,
          userId: app.applicantId,
          role: app.opportunity.role,
        },
      });
    }

    const statusWord = normalizedStatus === 'DENIED' ? 'denied' : normalizedStatus.toLowerCase();
    const notifTitle = normalizedStatus === 'DENIED' ? 'Application Denied' : `Application ${statusWord}!`;
    const notifMsg = `Your application for ${app.opportunity.role} at ${app.opportunity.startup.name} was ${statusWord}.`;

    await prisma.notification.create({
      data: {
        userId: app.applicantId,
        senderId: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: notifTitle,
        message: notifMsg,
        link: `/opportunities`,
      },
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: app.applicantId,
        sender_id: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: notifTitle,
        message: notifMsg,
        link: `/opportunities`,
        is_read: false,
      }).catch(() => null);
    }

    return res.json({ message: `Application ${statusWord}.`, application: updated, status: normalizedStatus });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
});

export default router;

