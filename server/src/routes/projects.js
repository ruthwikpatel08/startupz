import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { generateProjectScoutAnalysis } from '../utils/aiClient.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../../data/projects.json');
const MESSAGES_FILE = path.resolve(__dirname, '../../data/project_messages.json');

// Persistent JSON file helper for projects
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

// Persistent JSON file helper for project team group chat messages
export function readProjectMessages(projectId) {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return Array.isArray(parsed[projectId]) ? parsed[projectId] : [];
      }
    }
  } catch (err) {
    console.warn('Error reading project_messages.json:', err.message);
  }
  return [];
}

export function writeProjectMessage(projectId, message) {
  try {
    const dir = path.dirname(MESSAGES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let allMsgs = {};
    if (fs.existsSync(MESSAGES_FILE)) {
      try {
        allMsgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8')) || {};
      } catch {}
    }
    if (!Array.isArray(allMsgs[projectId])) {
      allMsgs[projectId] = [];
    }
    allMsgs[projectId].push(message);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(allMsgs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing project_messages.json:', err.message);
  }
}

// Helper functions for Supabase permanent persistence
export async function fetchProjectMessagesFromSupabase(projectId) {
  if (!supabaseAdmin || !projectId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        conversationId: row.conversation_id || `proj-group-${row.project_id}`,
        senderId: row.sender_id,
        content: row.content,
        sender: row.sender || {},
        isAiScout: Boolean(row.is_ai_scout),
        createdAt: row.created_at,
      }));
    }
  } catch (err) {
    console.warn('fetchProjectMessagesFromSupabase error:', err.message);
  }
  return null;
}

export async function saveProjectMessageToSupabase(projectId, message) {
  if (!supabaseAdmin || !projectId || !message) return;
  try {
    await supabaseAdmin.from('project_messages').upsert({
      id: message.id,
      project_id: projectId,
      conversation_id: message.conversationId || `proj-group-${projectId}`,
      sender_id: message.senderId,
      content: message.content,
      sender: message.sender || {},
      is_ai_scout: Boolean(message.isAiScout),
      created_at: message.createdAt && !isNaN(Date.parse(message.createdAt)) ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('saveProjectMessageToSupabase error:', err.message);
  }
}

export async function deleteProjectMessagesFromSupabase(projectId) {
  if (!supabaseAdmin || !projectId) return;
  try {
    await supabaseAdmin.from('project_messages').delete().eq('project_id', projectId);
  } catch (err) {
    console.warn('deleteProjectMessagesFromSupabase error:', err.message);
  }
}

export async function saveProjectToSupabase(project) {
  if (!supabaseAdmin || !project || !project.id) return;
  try {
    await supabaseAdmin.from('projects').upsert({
      id: project.id,
      creator_id: project.creator?.userId || project.creatorId || 'unknown',
      title: project.title,
      idea_summary: project.ideaSummary || project.tagline || '',
      tagline: project.tagline || project.ideaSummary || '',
      problem_solved: project.problemSolved || '',
      solution_approach: project.solutionApproach || '',
      detailed_description: project.detailedDescription || '',
      stage: project.stage || 'Ideation',
      visibility: project.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      creator: project.creator || {},
      roles: Array.isArray(project.roles) ? project.roles : [],
      tags: Array.isArray(project.tags) ? project.tags : [],
      github_url: project.githubUrl || null,
      demo_url: project.demoUrl || null,
      created_at: project.createdAt && !isNaN(Date.parse(project.createdAt)) ? new Date(project.createdAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('saveProjectToSupabase error:', err.message);
  }
}

export async function deleteProjectFromSupabase(projectId) {
  if (!supabaseAdmin || !projectId) return;
  try {
    await supabaseAdmin.from('projects').delete().eq('id', projectId);
    await deleteProjectMessagesFromSupabase(projectId);
  } catch (err) {
    console.warn('deleteProjectFromSupabase error:', err.message);
  }
}

export async function fetchProjectsFromSupabase() {
  if (!supabaseAdmin) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        ideaSummary: row.idea_summary || row.tagline || '',
        tagline: row.tagline || row.idea_summary || '',
        problemSolved: row.problem_solved || '',
        solutionApproach: row.solution_approach || '',
        detailedDescription: row.detailed_description || '',
        stage: row.stage || 'Ideation',
        visibility: row.visibility || 'PUBLIC',
        creator: row.creator || { userId: row.creator_id, fullName: 'Builder' },
        roles: Array.isArray(row.roles) ? row.roles : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        githubUrl: row.github_url || undefined,
        demoUrl: row.demo_url || undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('fetchProjectsFromSupabase error:', err.message);
  }
  return [];
}

// In-memory cache synced with disk and Supabase
let cachedProjects = readProjects();

if (supabaseAdmin) {
  fetchProjectsFromSupabase().then((supaList) => {
    if (Array.isArray(supaList) && supaList.length > 0) {
      cachedProjects = supaList;
      writeProjects(supaList);
    }
  }).catch(() => {});
}

// Export helper for other routes (e.g. saved.js)
export function getAllProjectsList() {
  if (cachedProjects.length === 0) {
    cachedProjects = readProjects();
  }
  return cachedProjects;
}

export async function getOrFetchProject(id) {
  let all = getAllProjectsList();
  let project = all.find((p) => p.id === id);
  if (supabaseAdmin) {
    const supaList = await fetchProjectsFromSupabase();
    if (Array.isArray(supaList) && supaList.length > 0) {
      cachedProjects = supaList;
      writeProjects(supaList);
      all = supaList;
      project = all.find((p) => p.id === id) || project;
    }
  }
  return { all, project };
}

// GET /api/projects - List public projects for all members & user's private projects
router.get('/', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    let all = [];

    // Always fetch latest authoritative projects from Supabase
    if (supabaseAdmin) {
      all = await fetchProjectsFromSupabase();
      cachedProjects = all;
      writeProjects(all);
    } else {
      all = getAllProjectsList();
    }

    const filtered = all.filter((p) => {
      // Public projects: visible to all members and visitors across the platform
      if (p.visibility === 'PUBLIC') return true;

      // Private projects: strictly visible ONLY to creator, assigned team members, or platform admin
      return isProjectMemberOrCreator(p, req.user);
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
    const { project } = await getOrFetchProject(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.visibility === 'PRIVATE' && !isProjectMemberOrCreator(project, req.user)) {
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
    await saveProjectToSupabase(newProject);

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
    const { all, project: existing } = await getOrFetchProject(id);
    const idx = all.findIndex((p) => p.id === id);

    if (!existing || idx === -1) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const creatorId = existing.creator?.userId || existing.creatorId;
    if (creatorId !== req.user.id && !req.user.isAdmin) {
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
    await saveProjectToSupabase(updated);

    return res.json({ message: 'Project updated.', project: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { all, project } = await getOrFetchProject(id);

    if (project && !isProjectLeadOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'Only the project creator or team lead can delete this project.' });
    }

    cachedProjects = all.filter((p) => p.id !== id);
    writeProjects(cachedProjects);
    await deleteProjectFromSupabase(id);

    return res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// POST /api/projects/:id/roles/:roleId/apply - External user applies for open role (allows any number of applicants)
router.post('/:id/roles/:roleId/apply', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const { all, project } = await getOrFetchProject(id);

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
    const applicantUsername = req.user.profile?.username ? `@${req.user.profile.username}` : '';
    const applicantLabel = applicantUsername ? `${applicantName} (${applicantUsername})` : applicantName;
    const applicantHeadline = req.user.profile?.headline || 'Team Collaborator';
    // If creator or project lead applies to their own role, directly assign
    if (isProjectLeadOrCreator(project, req.user)) {
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: req.user.id,
        fullName: applicantName,
        username: req.user.profile?.username || '',
        avatar: req.user.profile?.avatar || null,
      };
      role.pendingApplicant = null;
      role.pendingApplicants = [];
      role.invitedUser = null;
    } else {
      // Normal application: allow any number of people to apply for this role
      if (!Array.isArray(role.pendingApplicants)) {
        role.pendingApplicants = role.pendingApplicant ? [role.pendingApplicant] : [];
      }

      const alreadyApplied = role.pendingApplicants.some((a) => a.userId === req.user.id);
      if (alreadyApplied) {
        return res.status(400).json({ error: 'You have already applied for this role.' });
      }

      const newApplicant = {
        userId: req.user.id,
        fullName: applicantName,
        username: req.user.profile?.username || '',
        avatar: req.user.profile?.avatar || null,
        roleDescription: applicantHeadline,
        appliedAt: new Date().toISOString(),
      };

      if (Array.isArray(role.declinedApplicantIds)) {
        role.declinedApplicantIds = role.declinedApplicantIds.filter((id) => id !== req.user.id);
      }

      role.pendingApplicants.push(newApplicant);
      role.pendingApplicant = role.pendingApplicants[0]; // backward compatibility
      // Role remains open so other people can also apply
      role.status = 'OPEN';

      // Notify project creator
      await prisma.notification.create({
        data: {
          userId: creatorId,
          senderId: req.user.id,
          type: 'PROJECT_APPLICATION',
          title: `Role Application: ${role.roleName}`,
          message: `${applicantLabel} applied for the "${role.roleName}" role on "${project.title}". Review and accept to add them to your team.`,
          link: `/projects`,
        },
      }).catch(() => null);

      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert({
          user_id: creatorId,
          sender_id: req.user.id,
          type: 'PROJECT_APPLICATION',
          title: `Role Application: ${role.roleName}`,
          message: `${applicantLabel} applied for the "${role.roleName}" role on "${project.title}". Review and accept to add them to your team.`,
          link: `/projects`,
          is_read: false,
        }).catch(() => null);
      }
    }

    writeProjects(all);
    await saveProjectToSupabase(project);
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

    const { all, project } = await getOrFetchProject(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!isProjectLeadOrCreator(project, req.user)) {
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
    await saveProjectToSupabase(project);

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

    const { all, project } = await getOrFetchProject(id);

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
      const creatorId = project.creator?.userId || project.creatorId;
      if (creatorId) {
        await prisma.notification.create({
          data: {
            userId: creatorId,
            senderId: req.user.id,
            type: 'PROJECT_INVITE_ACCEPTED',
            title: `Role Invitation Accepted! 🎉`,
            message: `${responderName} accepted your invitation to join "${project.title}" as ${role.roleName}!`,
            link: `/projects`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications').insert({
            user_id: creatorId,
            sender_id: req.user.id,
            type: 'PROJECT_INVITE_ACCEPTED',
            title: `Role Invitation Accepted! 🎉`,
            message: `${responderName} accepted your invitation to join "${project.title}" as ${role.roleName}!`,
            link: `/projects`,
            is_read: false,
          }).catch(() => null);
        }
      }
    } else {
      role.status = 'OPEN';
      role.invitedUser = null;

      const creatorId = project.creator?.userId || project.creatorId;
      if (creatorId) {
        await prisma.notification.create({
          data: {
            userId: creatorId,
            senderId: req.user.id,
            type: 'PROJECT_INVITE_DECLINED',
            title: `Role Invitation Declined`,
            message: `${responderName} declined your invitation to join "${project.title}" as ${role.roleName}.`,
            link: `/projects`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications').insert({
            user_id: creatorId,
            sender_id: req.user.id,
            type: 'PROJECT_INVITE_DECLINED',
            title: `Role Invitation Declined`,
            message: `${responderName} declined your invitation to join "${project.title}" as ${role.roleName}.`,
            link: `/projects`,
            is_read: false,
          }).catch(() => null);
        }
      }
    }

    writeProjects(all);
    await saveProjectToSupabase(project);

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
    const { action, applicantUserId } = req.body; // 'ACCEPT' or 'DECLINE'

    const { all, project } = await getOrFetchProject(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!isProjectLeadOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'Only the project lead can accept or decline applicants.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (!Array.isArray(role.pendingApplicants)) {
      role.pendingApplicants = role.pendingApplicant ? [role.pendingApplicant] : [];
    }

    const applicant = applicantUserId
      ? role.pendingApplicants.find((a) => a.userId === applicantUserId) || role.pendingApplicant
      : role.pendingApplicants[0] || role.pendingApplicant;

    if (!applicant) {
      return res.status(400).json({ error: 'No pending applicant for this role.' });
    }

    if (action === 'ACCEPT') {
      // Role is filled by this single person! Remaining applicants cleared
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: applicant.userId,
        fullName: applicant.fullName,
        avatar: applicant.avatar || null,
      };
      role.pendingApplicant = null;
      role.pendingApplicants = [];
      role.invitedUser = null;
      if (Array.isArray(role.declinedApplicantIds)) {
        role.declinedApplicantIds = role.declinedApplicantIds.filter((id) => id !== applicant.userId);
      }

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

      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert({
          user_id: applicant.userId,
          sender_id: req.user.id,
          type: 'PROJECT_APPLICATION_ACCEPTED',
          title: `Application Accepted! 🎉`,
          message: `Congratulations! You have been accepted as ${role.roleName} on "${project.title}".`,
          link: `/projects`,
          is_read: false,
        }).catch(() => null);
      }
    } else {
      // Decline: record declined user ID and remove only this applicant from pending list
      if (!Array.isArray(role.declinedApplicantIds)) {
        role.declinedApplicantIds = [];
      }
      const targetUid = applicantUserId || applicant.userId;
      if (targetUid && !role.declinedApplicantIds.includes(targetUid)) {
        role.declinedApplicantIds.push(targetUid);
      }

      role.pendingApplicants = role.pendingApplicants.filter((a) => a.userId !== targetUid);
      role.pendingApplicant = role.pendingApplicants[0] || null;
      if (role.pendingApplicants.length === 0) {
        role.status = 'OPEN';
      }

      if (targetUid) {
        await prisma.notification.create({
          data: {
            userId: targetUid,
            senderId: req.user.id,
            type: 'PROJECT_APPLICATION_DECLINED',
            title: `Application Update`,
            message: `Your application for ${role.roleName} on "${project.title}" was declined by the project lead.`,
            link: `/projects`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications').insert({
            user_id: targetUid,
            sender_id: req.user.id,
            type: 'PROJECT_APPLICATION_DECLINED',
            title: `Application Update`,
            message: `Your application for ${role.roleName} on "${project.title}" was declined by the project lead.`,
            link: `/projects`,
            is_read: false,
          }).catch(() => null);
        }
      }
    }

    writeProjects(all);
    await saveProjectToSupabase(project);

    return res.json({
      message: action === 'ACCEPT' ? 'Applicant accepted! Role filled.' : 'Applicant declined.',
      project,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to respond to applicant.' });
  }
});

// POST /api/projects/:id/roles/:roleId/assign - Lead directly assigns connection to role
router.post('/:id/roles/:roleId/assign', requireAuth, async (req, res) => {
  try {
    const { id, roleId } = req.params;
    const { targetUserId, targetFullName, targetAvatar } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required.' });
    }

    const { all, project } = await getOrFetchProject(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!isProjectLeadOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'Only the project lead can assign roles.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    }).catch(() => null);

    const targetName = targetUser?.profile?.fullName || targetUser?.email?.split('@')[0] || targetFullName || 'Connection';
    const avatar = targetUser?.profile?.avatar || targetAvatar || null;

    // Do NOT auto-assign: Put in INVITED state pending user's accept or decline
    role.status = 'INVITED';
    role.invitedUser = {
      userId: targetUserId,
      fullName: targetName,
      avatar,
      invitedAt: new Date().toISOString(),
    };
    role.assignedTo = null;
    role.pendingApplicant = null;
    role.pendingApplicants = [];

    // Send notification to connection with Accept / Decline invitation
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        senderId: req.user.id,
        type: 'PROJECT_ROLE_INVITE',
        title: `Role Assignment: ${role.roleName} in ${project.title} 🎯`,
        message: `${req.user.profile?.fullName || 'Project Lead'} assigned you the role "${role.roleName}" in project "${project.title}". Accept or decline to join the team!`,
        link: `/projects?roleInvite=${role.id}&projectId=${project.id}`,
      },
    }).catch(() => null);

    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: targetUserId,
        sender_id: req.user.id,
        type: 'PROJECT_ROLE_INVITE',
        title: `Role Assignment: ${role.roleName} in ${project.title} 🎯`,
        message: `${req.user.profile?.fullName || 'Project Lead'} assigned you the role "${role.roleName}" in project "${project.title}". Accept or decline to join the team!`,
        link: `/projects?roleInvite=${role.id}&projectId=${project.id}`,
        is_read: false,
      }).catch(() => null);
    }

    writeProjects(all);
    await saveProjectToSupabase(project);
    return res.json({
      message: `Role assignment sent to ${targetName}! Once they accept, the role will be filled.`,
      project,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to assign role.' });
  }
});

/**
 * Helper to check if a user is a project creator, assigned project lead, or admin
 */
export function isProjectLeadOrCreator(project, user) {
  if (!user || !user.id || !project) return false;
  if (user.isAdmin) return true;
  const creatorId = project.creator?.userId || project.creator?.id || project.creatorId || project.creator_id;
  if (creatorId && creatorId === user.id) return true;
  const leadRole = Array.isArray(project.roles) && project.roles.find((r) => r.roleName === 'Project Lead');
  if (leadRole && (leadRole.assignedTo?.userId === user.id || leadRole.assignedTo?.id === user.id)) {
    return true;
  }
  return false;
}

/**
 * Helper to check if a user is a project creator, assigned team member, or admin
 */
export function isProjectMemberOrCreator(project, user) {
  if (!user || !user.id || !project) return false;
  if (user.isAdmin) return true;
  if (isProjectLeadOrCreator(project, user)) return true;
  if (Array.isArray(project.roles) && project.roles.some((r) => r.assignedTo?.userId === user.id || r.assignedTo?.id === user.id)) {
    return true;
  }
  return false;
}

/**
 * Helper to sanitize message sender objects (strips email and private account fields)
 */
function sanitizeProjectMessage(m) {
  if (!m || typeof m !== 'object') return m;
  const sanitized = { ...m };
  if (sanitized.sender && typeof sanitized.sender === 'object') {
    const { email, password, isAdmin, isSuspended, ...safeSender } = sanitized.sender;
    sanitized.sender = safeSender;
  }
  return sanitized;
}

// GET /api/projects/:id/messages - Retrieve all messages for project group chat
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { project } = await getOrFetchProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Private projects strictly allow only creator, assigned team members, or admin
    if (project.visibility === 'PRIVATE' && !isProjectMemberOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to view messages in this private project.' });
    }

    let msgs = await fetchProjectMessagesFromSupabase(id);
    if (msgs === null || msgs.length === 0) {
      msgs = readProjectMessages(id);
    }
    return res.json({ messages: msgs.map(sanitizeProjectMessage) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve project messages.' });
  }
});

// POST /api/projects/:id/messages - Send a message to project group chat
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const { all, project } = await getOrFetchProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Only project creator or assigned team members (or admin) can post to project chat
    if (!isProjectMemberOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to post in this project workspace.' });
    }

    const senderName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'Member';
    const newMsg = {
      id: `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: id,
      conversationId: `proj-group-${id}`,
      senderId: req.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      sender: {
        id: req.user.id,
        role: req.user.role || 'BUILDER',
        isVerified: req.user.isVerified || false,
        profile: {
          id: req.user.profile?.id || req.user.id,
          userId: req.user.id,
          fullName: senderName,
          avatar: req.user.profile?.avatar || null,
          headline: req.user.profile?.headline || 'Team Collaborator',
        },
      },
    };

    writeProjectMessage(id, newMsg);
    await saveProjectMessageToSupabase(id, newMsg);

    // Update project lastMessage
    const allProjects = getAllProjectsList();
    const proj = allProjects.find((p) => p.id === id);
    if (proj) {
      proj.lastMessage = `${senderName.split(' ')[0]}: ${content.trim()}`;
      proj.lastMessageAt = new Date().toISOString();
      writeProjects(allProjects);

      // Notify all other team members about the new project group message
      const memberIds = new Set();
      const creatorId = proj.creator?.userId || proj.creatorId;
      if (creatorId && creatorId !== req.user.id) {
        memberIds.add(creatorId);
      }
      if (Array.isArray(proj.roles)) {
        proj.roles.forEach((r) => {
          const uId = r.assignedTo?.userId;
          if (uId && uId !== req.user.id) {
            memberIds.add(uId);
          }
        });
      }

      for (const mId of memberIds) {
        // 1. Prisma notification
        await prisma.notification.create({
          data: {
            userId: mId,
            senderId: req.user.id,
            type: 'PROJECT_MESSAGE',
            title: `New message in ${proj.title}`,
            message: `${senderName}: ${content.trim().slice(0, 100)}`,
            link: `/messages?projectGroupId=${id}`,
          },
        }).catch((e) => console.warn('Prisma project message notif notice:', e.message));

        // 2. Supabase notification
        if (supabaseAdmin) {
          try {
            await supabaseAdmin.from('notifications').insert({
              user_id: mId,
              sender_id: req.user.id,
              type: 'PROJECT_MESSAGE',
              title: `New message in ${proj.title}`,
              message: `${senderName}: ${content.trim().slice(0, 100)}`,
              link: `/messages?projectGroupId=${id}`,
              is_read: false,
            });
          } catch (sbErr) {
            // Ignored if table schema variation exists
          }
        }
      }
    }

    return res.status(201).json({ message: 'Project message sent successfully!', data: sanitizeProjectMessage(newMsg) });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send project message.' });
  }
});

// POST /api/projects/:id/ai-scout - HookZ AI Scout Project Chat Assistant
router.post('/:id/ai-scout', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a question or request for AI Scout.' });
    }

    // 1. Verify project exists (if deleted, AI Scout must not be accessible)
    const { project } = await getOrFetchProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found or has been deleted.' });
    }

    // 2. Authorize user: only creator, assigned team members, or authorized platform administrators can use AI Scout
    if (!isProjectMemberOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to use AI Scout in this project workspace.' });
    }

    // 3. Gather relevant recent project chat messages (only from this project)
    let allMsgs = await fetchProjectMessagesFromSupabase(id);
    if (!allMsgs || allMsgs.length === 0) {
      allMsgs = readProjectMessages(id);
    }
    const recentMessages = allMsgs.slice(-25).map((m) => ({
      sender: m.sender?.profile?.fullName || (m.senderId === 'ai-scout' ? 'AI Scout' : 'Team Member'),
      role: m.sender?.role || '',
      content: m.content,
      time: m.createdAt,
    }));

    // 4. Generate AI Scout response using Gemini
    const cleanPrompt = prompt.replace(/@AI\s*Scout/i, '').trim() || prompt.trim();
    const scoutResponseText = await generateProjectScoutAnalysis({
      project,
      recentMessages,
      userQuery: cleanPrompt,
      askingUser: req.user,
    });

    // 5. Construct clearly identifiable AI Scout message
    const scoutMsg = {
      id: `scout-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: id,
      conversationId: `proj-group-${id}`,
      senderId: 'ai-scout',
      content: scoutResponseText,
      createdAt: new Date().toISOString(),
      isAiScout: true,
      sender: {
        id: 'ai-scout',
        email: 'scout@hookz.build',
        role: 'AI_SCOUT',
        isVerified: true,
        profile: {
          id: 'ai-scout',
          userId: 'ai-scout',
          fullName: 'AI Scout',
          avatar: null,
          headline: 'HookZ Project Chat Assistant',
        },
      },
    };

    // 6. Persist AI Scout response in project messages
    writeProjectMessage(id, scoutMsg);
    await saveProjectMessageToSupabase(id, scoutMsg);

    // 7. Realtime broadcast to all active project members
    if (supabaseAdmin) {
      try {
        const channel = supabaseAdmin.channel(`proj_room_${id}`);
        channel.send({
          type: 'broadcast',
          event: 'new_project_msg',
          payload: scoutMsg,
        });
      } catch (sbErr) {
        console.warn('Realtime Scout broadcast notice:', sbErr.message);
      }
    }

    return res.status(200).json({ message: scoutMsg });
  } catch (error) {
    console.error('AI Scout endpoint error:', error);
    return res.status(500).json({ error: 'Failed to process AI Scout analysis request.' });
  }
});

export default router;
