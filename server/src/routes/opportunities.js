import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/opportunities
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { role, workplaceType, commitment, compensation, search, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { status: 'OPEN' };

    const orConditions = [];

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

    let appliedOppIds = new Set();
    let savedOppIds = new Set();

    if (req.user) {
      const [applications, saves] = await Promise.all([
        prisma.opportunityApplication.findMany({
          where: { applicantId: req.user.id },
          select: { opportunityId: true },
        }),
        prisma.savedItem.findMany({
          where: { userId: req.user.id, itemType: 'OPPORTUNITY' },
          select: { itemId: true },
        }),
      ]);

      applications.forEach((a) => appliedOppIds.add(a.opportunityId));
      saves.forEach((s) => savedOppIds.add(s.itemId));
    }

    const formatted = opportunities.map((opp) => ({
      ...opp,
      hasApplied: appliedOppIds.has(opp.id),
      isSaved: savedOppIds.has(opp.id),
    }));

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
        content: `${startup.name} is seeking a passionate ${role} (${commitment}, ${compensation}, ${workplaceType}).\n\nSkills: ${requiredSkills}\n\nApply directly through StartupZ Opportunities!`,
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

    await prisma.notification.create({
      data: {
        userId: opportunity.startup.founderId,
        senderId: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: `New Application for ${opportunity.role}`,
        message: `${req.user.profile?.fullName || 'A candidate'} applied for ${opportunity.role} at ${opportunity.startup.name}.`,
        link: `/opportunities`,
      },
    });

    return res.status(201).json({ message: 'Application submitted successfully!', application });
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

    const updated = await prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    if (status === 'ACCEPTED') {
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

    await prisma.notification.create({
      data: {
        userId: app.applicantId,
        senderId: req.user.id,
        type: 'OPPORTUNITY_APPLICATION',
        title: `Application ${status.toLowerCase()}!`,
        message: `Your application for ${app.opportunity.role} at ${app.opportunity.startup.name} was ${status.toLowerCase()}.`,
        link: `/startups/${app.opportunity.startupId}`,
      },
    });

    return res.json({ message: `Application ${status.toLowerCase()}.`, application: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
});

export default router;
