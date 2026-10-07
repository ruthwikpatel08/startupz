import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../../data/projects.json');

// Persistent JSON file helper
function readProjects() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading projects.json:', err.message);
  }
  return [];
}

function writeProjects(projects) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing projects.json:', err.message);
  }
}

// In-memory cache synced with disk
let cachedProjects = readProjects();

// Export helper for other routes (e.g. saved.js)
export function getAllProjectsList() {
  if (cachedProjects.length === 0) {
    cachedProjects = readProjects();
  }
  return cachedProjects;
}

// GET /api/projects - List public projects and user's private projects
router.get('/', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const all = getAllProjectsList();

    const filtered = all.filter((p) => {
      if (p.visibility === 'PUBLIC') return true;
      if (currentUserId && p.creator?.userId === currentUserId) return true;
      return false;
    });

    return res.json({ projects: filtered });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.visibility === 'PRIVATE' && (!req.user || req.user.id !== project.creator?.userId)) {
      return res.status(403).json({ error: 'This project is private.' });
    }

    return res.json({ project });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// POST /api/projects - Create a new project
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      ideaSummary,
      tagline,
      problemSolved,
      solutionApproach,
      detailedDescription,
      stage = 'Ideation',
      visibility = 'PUBLIC',
      roles = [],
      tags = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const creatorName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'Builder';
    const newProject = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      ideaSummary: (ideaSummary || tagline || '').trim(),
      tagline: (tagline || ideaSummary || '').trim(),
      problemSolved: (problemSolved || '').trim(),
      solutionApproach: (solutionApproach || '').trim(),
      detailedDescription: (detailedDescription || '').trim(),
      stage,
      visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      creator: {
        userId: req.user.id,
        fullName: creatorName,
        avatar: req.user.profile?.avatar || null,
        role: req.user.profile?.headline || 'Project Lead',
      },
      roles: Array.isArray(roles) && roles.length > 0 ? roles : [
        {
          id: `r-creator-${Date.now()}`,
          roleName: 'Project Lead',
          iconType: 'product',
          status: 'ASSIGNED',
          assignedTo: {
            userId: req.user.id,
            fullName: creatorName,
            avatar: req.user.profile?.avatar || null,
          },
        },
      ],
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedProjects = [newProject, ...cachedProjects];
    writeProjects(cachedProjects);

    return res.status(201).json({
      message: 'Project created successfully!',
      project: newProject,
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ error: 'Failed to create project.' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const all = getAllProjectsList();
    const idx = all.findIndex((p) => p.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const existing = all[idx];
    if (existing.creator.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the project creator can edit this project.' });
    }

    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      creator: existing.creator,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    cachedProjects = all;
    writeProjects(all);

    return res.json({ message: 'Project updated.', project: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.creator.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the project creator can delete this project.' });
    }

    cachedProjects = all.filter((p) => p.id !== id);
    writeProjects(cachedProjects);

    return res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/roles/:roleId/apply - External user applies for open role
router.post('/:id/roles/:roleId/apply', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (role.status === 'ASSIGNED') {
      return res.status(400).json({ error: 'This role is already filled.' });
    }

    const applicantName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'Builder';
    const applicantHeadline = req.user.profile?.headline || 'Team Collaborator';

    // If creator applies to their own role, directly assign
    if (project.creator.userId === req.user.id) {
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: req.user.id,
        fullName: applicantName,
        avatar: req.user.profile?.avatar || null,
      };
      role.pendingApplicant = null;
      role.invitedUser = null;
    } else {
      // Normal application: mark as PENDING and notify team lead
      role.status = 'PENDING';
      role.pendingApplicant = {
        userId: req.user.id,
        fullName: applicantName,
        avatar: req.user.profile?.avatar || null,
        roleDescription: applicantHeadline,
        appliedAt: new Date().toISOString(),
      };

      // Notify project creator
      await prisma.notification.create({
        data: {
          userId: project.creator.userId,
          senderId: req.user.id,
          type: 'PROJECT_APPLICATION',
          title: `Role Application: ${role.roleName}`,
          message: `${applicantName} applied for the "${role.roleName}" role on "${project.title}". Review and accept to add them to your team.`,
          link: `/projects`,
        },
      }).catch(() => null);
    }

    writeProjects(all);
    return res.json({ message: 'Application submitted successfully!', project });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to apply for role.' });
  }
});

// POST /api/projects/:id/roles/:roleId/invite - Team lead invites connection to role
router.post('/:id/roles/:roleId/invite', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target connection user ID is required.' });
    }

    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.creator.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the project lead can invite connections to roles.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (role.status === 'ASSIGNED') {
      return res.status(400).json({ error: 'This role is already assigned.' });
    }

    // Fetch invited user details
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    const targetName = targetUser?.profile?.fullName || 'Connection';
    const leadName = req.user.profile?.fullName || 'Team Lead';

    // Set role to INVITED state (pending acceptance from user)
    role.status = 'INVITED';
    role.invitedUser = {
      userId: targetUserId,
      fullName: targetName,
      avatar: targetUser?.profile?.avatar || null,
      invitedAt: new Date().toISOString(),
    };
    role.pendingApplicant = null;

    // Send notification to invited user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        senderId: req.user.id,
        type: 'PROJECT_INVITE',
        title: `Role Invitation: ${role.roleName} 🚀`,
        message: `${leadName} invited you to join "${project.title}" as ${role.roleName}. Accept to join the team!`,
        link: `/projects`,
      },
    }).catch(() => null);

    writeProjects(all);

    return res.json({
      message: `Role invitation sent to ${targetName}! Once they accept, the role will be filled.`,
      project,
    });
  } catch (error) {
    console.error('Invite connection error:', error);
    return res.status(500).json({ error: 'Failed to send role invitation.' });
  }
});

// POST /api/projects/:id/roles/:roleId/respond-invite - Invited user accepts or declines
router.post('/:id/roles/:roleId/respond-invite', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'DECLINE'

    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (!role.invitedUser || role.invitedUser.userId !== req.user.id) {
      return res.status(403).json({ error: 'You are not invited to this role.' });
    }

    const responderName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'Builder';

    if (action === 'ACCEPT') {
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: req.user.id,
        fullName: responderName,
        avatar: req.user.profile?.avatar || null,
      };
      role.invitedUser = null;

      // Notify project lead
      await prisma.notification.create({
        data: {
          userId: project.creator.userId,
          senderId: req.user.id,
          type: 'PROJECT_INVITE_ACCEPTED',
          title: `Role Invitation Accepted! 🎉`,
          message: `${responderName} accepted your invitation to join "${project.title}" as ${role.roleName}!`,
          link: `/projects`,
        },
      }).catch(() => null);
    } else {
      role.status = 'OPEN';
      role.invitedUser = null;
    }

    writeProjects(all);

    return res.json({
      message: action === 'ACCEPT' ? 'Role accepted! You are now part of the team.' : 'Invitation declined.',
      project,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to respond to role invitation.' });
  }
});

// POST /api/projects/:id/roles/:roleId/respond-applicant - Lead accepts or declines applicant
router.post('/:id/roles/:roleId/respond-applicant', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'DECLINE'

    const all = getAllProjectsList();
    const project = all.find((p) => p.id === id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.creator.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the project lead can accept applicants.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (!role.pendingApplicant) {
      return res.status(400).json({ error: 'No pending applicant for this role.' });
    }

    const applicant = role.pendingApplicant;

    if (action === 'ACCEPT') {
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: applicant.userId,
        fullName: applicant.fullName,
        avatar: applicant.avatar || null,
      };
      role.pendingApplicant = null;

      // Notify applicant
      await prisma.notification.create({
        data: {
          userId: applicant.userId,
          senderId: req.user.id,
          type: 'PROJECT_APPLICATION_ACCEPTED',
          title: `Application Accepted! 🎉`,
          message: `Congratulations! You have been accepted as ${role.roleName} on "${project.title}".`,
          link: `/projects`,
        },
      }).catch(() => null);
    } else {
      role.status = 'OPEN';
      role.pendingApplicant = null;
    }

    writeProjects(all);

    return res.json({
      message: action === 'ACCEPT' ? 'Applicant accepted! Role filled.' : 'Applicant declined. Role reopened.',
      project,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to respond to applicant.' });
  }
});

export default router;
