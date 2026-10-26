import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth, isUserAdminCheck, getUserCandidateIds, isOwnerOrAdmin } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { generateProjectScoutAnalysis } from '../utils/aiClient.js';
import { initialProjects } from '../realData/initialProjects.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../../data/projects.json');
const MESSAGES_FILE = path.resolve(__dirname, '../../data/project_messages.json');
const DELETED_PROJECTS_FILE = path.resolve(__dirname, '../../data/deleted_projects.json');

// Persistent deleted projects tracking across all accounts & devices
function loadDeletedProjects() {
  try {
    if (fs.existsSync(DELETED_PROJECTS_FILE)) {
      const raw = fs.readFileSync(DELETED_PROJECTS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (err) {
    console.warn('Error reading deleted_projects.json:', err.message);
  }
  return new Set();
}

function saveDeletedProjects(set) {
  try {
    const dir = path.dirname(DELETED_PROJECTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DELETED_PROJECTS_FILE, JSON.stringify(Array.from(set), null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing deleted_projects.json:', err.message);
  }
}

const deletedProjectIds = loadDeletedProjects();

// In-memory cache synced with disk and Supabase
let cachedProjects = [];

// Persistent deduplication helper for project lists
export function deduplicateProjectsList(list) {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set();
  const seenCreatorTitle = new Set();
  const result = [];

  for (const p of list) {
    if (!p || !p.id) continue;
    if (deletedProjectIds.has(p.id)) continue;
    if (seenIds.has(p.id)) continue;

    const creatorId = String(
      p.creator?.userId ||
      p.creator?.id ||
      p.creatorId ||
      p.creator_id ||
      ''
    ).trim().toLowerCase();
    const cleanTitle = String(p.title || '').trim().toLowerCase();
    const titleKey = `${creatorId}:::${cleanTitle}`;

    if (creatorId && cleanTitle && seenCreatorTitle.has(titleKey)) {
      continue;
    }

    seenIds.add(p.id);
    if (creatorId && cleanTitle) {
      seenCreatorTitle.add(titleKey);
    }
    result.push(p);
  }
  return result;
}

// Persistent JSON file helper for projects
function readProjects() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateProjectsList(parsed.filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
      }
    }
  } catch (err) {
    console.warn('Error reading projects.json:', err.message);
  }
  return deduplicateProjectsList(initialProjects.filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
}

function writeProjects(projects) {
  try {
    cachedProjects = deduplicateProjectsList((projects || []).filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cachedProjects, null, 2), 'utf8');
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

function mapDbProjectRow(row) {
  let creator = row.creator;
  if (typeof creator === 'string') {
    try { creator = JSON.parse(creator); } catch {}
  }
  let roles = row.roles;
  if (typeof roles === 'string') {
    try { roles = JSON.parse(roles); } catch {}
  }
  let tags = row.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch {}
  }

  return {
    id: row.id,
    title: row.title,
    ideaSummary: row.idea_summary || row.tagline || '',
    tagline: row.tagline || row.idea_summary || '',
    problemSolved: row.problem_solved || '',
    solutionApproach: row.solution_approach || '',
    detailedDescription: row.detailed_description || '',
    stage: row.stage || 'Ideation',
    visibility: row.visibility || 'PUBLIC',
    creator: creator || { userId: row.creator_id, fullName: 'Builder' },
    roles: Array.isArray(roles) ? roles : [],
    tags: Array.isArray(tags) ? tags : [],
    githubUrl: row.github_url || undefined,
    demoUrl: row.demo_url || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function saveProjectToSupabase(project) {
  if (!project || !project.id) return;
  const payload = {
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
  };

  // 1. Save via Supabase Admin HTTP API if available
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('projects').upsert(payload, { onConflict: 'id' });
    } catch (err) {
      console.warn('saveProjectToSupabase error:', err.message);
    }
  }

  // 2. Direct PostgreSQL fallback via Prisma
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO projects (
        id, creator_id, title, idea_summary, tagline, problem_solved,
        solution_approach, detailed_description, stage, visibility,
        creator, roles, tags, github_url, demo_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16, $17
      )
      ON CONFLICT (id) DO UPDATE SET
        creator_id = EXCLUDED.creator_id,
        title = EXCLUDED.title,
        idea_summary = EXCLUDED.idea_summary,
        tagline = EXCLUDED.tagline,
        problem_solved = EXCLUDED.problem_solved,
        solution_approach = EXCLUDED.solution_approach,
        detailed_description = EXCLUDED.detailed_description,
        stage = EXCLUDED.stage,
        visibility = EXCLUDED.visibility,
        creator = EXCLUDED.creator,
        roles = EXCLUDED.roles,
        tags = EXCLUDED.tags,
        github_url = EXCLUDED.github_url,
        demo_url = EXCLUDED.demo_url,
        updated_at = EXCLUDED.updated_at
    `,
      payload.id, payload.creator_id, payload.title, payload.idea_summary, payload.tagline,
      payload.problem_solved, payload.solution_approach, payload.detailed_description,
      payload.stage, payload.visibility, JSON.stringify(payload.creator),
      JSON.stringify(payload.roles), JSON.stringify(payload.tags), payload.github_url,
      payload.demo_url, new Date(payload.created_at), new Date(payload.updated_at)
    );
  } catch (err) {
    // Projects table may not exist yet or connection in flux
  }
}

export async function deleteProjectFromSupabase(projectId) {
  if (!projectId) return;
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('projects').delete().eq('id', projectId);
      await deleteProjectMessagesFromSupabase(projectId);
    } catch (err) {
      console.warn('deleteProjectFromSupabase error:', err.message);
    }
  }
  try {
    await prisma.$executeRawUnsafe('DELETE FROM projects WHERE id = $1', projectId);
    await prisma.$executeRawUnsafe('DELETE FROM project_messages WHERE project_id = $1', projectId);
  } catch {}
}

export async function fetchProjectsFromSupabase() {
  // 1. Try Supabase Admin HTTP API if configured
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .filter((row) => row && row.id && !deletedProjectIds.has(row.id))
          .map(mapDbProjectRow);
      }
    } catch (err) {
      console.warn('fetchProjectsFromSupabase error:', err.message);
    }
  }

  // 2. Direct PostgreSQL fallback via Prisma (guarantees cloud persistence even if service key is missing)
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM projects ORDER BY created_at DESC');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows
        .filter((row) => row && row.id && !deletedProjectIds.has(row.id))
        .map(mapDbProjectRow);
    }
  } catch (err) {
    // Projects table may not exist yet
  }

  // 3. Fallback to baseline projects tracked in git
  return deduplicateProjectsList(initialProjects.filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
}

// In-memory cache synced with disk and Supabase
cachedProjects = readProjects();

fetchProjectsFromSupabase().then((supaList) => {
  if (Array.isArray(supaList) && supaList.length > 0) {
    cachedProjects = supaList.filter((p) => p && p.id && !deletedProjectIds.has(p.id));
    writeProjects(cachedProjects);
  }
}).catch(() => {});

// Export helper for other routes (e.g. saved.js)
export function getAllProjectsList() {
  if (cachedProjects.length === 0) {
    cachedProjects = readProjects();
  }
  return cachedProjects.filter((p) => p && p.id && !deletedProjectIds.has(p.id));
}

export async function getOrFetchProject(id) {
  if (!id || deletedProjectIds.has(id)) {
    return { all: getAllProjectsList(), project: null };
  }
  const supaList = await fetchProjectsFromSupabase();
  if (Array.isArray(supaList) && supaList.length > 0) {
    cachedProjects = deduplicateProjectsList(supaList.filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
    writeProjects(cachedProjects);
    const project = cachedProjects.find((p) => p.id === id);
    if (project) return { all: cachedProjects, project };
  }
  const all = getAllProjectsList();
  const project = all.find((p) => p.id === id) || null;
  return { all, project };
}

// GET /api/projects/deleted-ids - List of all permanently deleted project IDs
router.get('/deleted-ids', (req, res) => {
  return res.json({ deletedProjectIds: Array.from(deletedProjectIds) });
});

// GET /api/projects - List public projects for all members & user's private projects
router.get('/', optionalAuth, async (req, res) => {
  try {
    let all = [];

    // Always fetch latest authoritative projects from database (Supabase + Prisma direct)
    const supaList = await fetchProjectsFromSupabase();
    if (Array.isArray(supaList) && supaList.length > 0) {
      all = deduplicateProjectsList(supaList.filter((p) => p && p.id && !deletedProjectIds.has(p.id)));
      cachedProjects = all;
      writeProjects(all);
    } else {
      all = getAllProjectsList();
    }

    all = all.filter((p) => p && p.id && !deletedProjectIds.has(p.id));

    const filtered = all.filter((p) => {
      // 1. Admin sees ALL projects across the platform (both public and private)
      if (isUserAdminCheck(req.user)) return true;

      // 2. Public projects: visible to all members and visitors across the platform
      if (p.visibility === 'PUBLIC') return true;

      // 3. Private projects: strictly visible ONLY to creator, lead, or assigned/invited team members
      return isProjectMemberOrCreator(p, req.user);
    });

    return res.json({ projects: filtered, deletedProjectIds: Array.from(deletedProjectIds) });
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

    // Deduplicate rapid project creations (prevent doubling from button spam or duplicate submits)
    const normalizedTitle = title.trim().toLowerCase();
    const existingDuplicate = cachedProjects.find(
      (p) =>
        (p.creator?.userId === req.user.id || (p.creator && (p.creator.userId === req.user.id || p.creator.id === req.user.id))) &&
        p.title?.trim().toLowerCase() === normalizedTitle &&
        (p.createdAt ? Date.now() - new Date(p.createdAt).getTime() < 15000 : false)
    );
    if (existingDuplicate) {
      return res.status(200).json({
        message: 'Project already created.',
        project: existingDuplicate,
      });
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

// PUT / PATCH /api/projects/:id - Update project & visibility
const handleUpdateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { all, project: existing } = await getOrFetchProject(id);
    const idx = all.findIndex((p) => p.id === id);

    if (!existing || idx === -1) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!isProjectLeadOrCreator(existing, req.user)) {
      return res.status(403).json({ error: 'Only the project creator or team lead can edit this project.' });
    }

    const newVisibility = req.body.visibility !== undefined
      ? (String(req.body.visibility).toUpperCase() === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
      : (existing.visibility || 'PUBLIC');

    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      creator: existing.creator,
      visibility: newVisibility,
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    cachedProjects = all;
    writeProjects(all);
    await saveProjectToSupabase(updated);

    return res.json({ message: 'Project updated.', project: updated });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({ error: 'Failed to update project.' });
  }
};

router.put('/:id', requireAuth, handleUpdateProject);
router.patch('/:id', requireAuth, handleUpdateProject);
router.patch('/:id/visibility', requireAuth, handleUpdateProject);

// DELETE /api/projects/:id - Delete project (strictly authorized to uploaded creator or admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { all, project } = await getOrFetchProject(id);

    if (project) {
      const creatorId = String(
        project.creator?.userId ||
        project.creator?.id ||
        project.creatorId ||
        project.creator_id ||
        ''
      ).trim().toLowerCase();

      const userIds = new Set(
        [req.user.id, req.user.profile?.id, req.user.profile?.userId, req.user._id]
          .filter(Boolean)
          .map((u) => String(u).trim().toLowerCase())
      );

      const creatorEmail = String(project.creator?.email || '').trim().toLowerCase();
      const userEmail = String(req.user.email || '').trim().toLowerCase();

      const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
      const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

      const isRuthwikMatch = creatorId && ruthwikIds.includes(creatorId) && Array.from(userIds).some((uid) => ruthwikIds.includes(uid));
      const isGokulMatch = creatorId && gokulIds.includes(creatorId) && Array.from(userIds).some((uid) => gokulIds.includes(uid));

      const isUploadedUser = Boolean(
        req.user.isAdmin ||
        (creatorId && userIds.has(creatorId)) ||
        isRuthwikMatch ||
        isGokulMatch ||
        (creatorEmail && userEmail && creatorEmail === userEmail) ||
        isProjectLeadOrCreator(project, req.user)
      );

      if (!isUploadedUser) {
        return res.status(403).json({ error: 'Only the user who uploaded this project can delete it.' });
      }
    }

    deletedProjectIds.add(id);
    saveDeletedProjects(deletedProjectIds);

    cachedProjects = all.filter((p) => p.id !== id && !deletedProjectIds.has(p.id));
    writeProjects(cachedProjects);
    await deleteProjectFromSupabase(id);

    try {
      if (fs.existsSync(MESSAGES_FILE)) {
        const allMsgs = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8')) || {};
        delete allMsgs[id];
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(allMsgs, null, 2), 'utf8');
      }
    } catch {}

    return res.json({ message: 'Project deleted successfully.', id });
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

      // Notify project creator and project lead
      const creatorId = project.creator?.userId || project.creator?.id || project.creatorId || project.creator_id;
      const leadRole = Array.isArray(project.roles) && project.roles.find((r) => r.roleName === 'Project Lead');
      const leadId = leadRole?.assignedTo?.userId || leadRole?.assignedTo?.id;

      const targetUserIds = new Set();
      if (creatorId && creatorId !== req.user.id) targetUserIds.add(creatorId);
      if (leadId && leadId !== req.user.id) targetUserIds.add(leadId);

      for (const targetId of targetUserIds) {
        await prisma.notification.create({
          data: {
            userId: targetId,
            senderId: req.user.id,
            type: 'PROJECT_APPLICATION',
            title: `Role Application: ${role.roleName}`,
            message: `${applicantLabel} applied for the "${role.roleName}" role on "${project.title}". Review and accept to add them to your team.`,
            link: `/projects`,
          },
        }).catch((e) => console.warn('Prisma notification warning:', e.message));

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications').insert({
            user_id: targetId,
            sender_id: req.user.id,
            type: 'PROJECT_APPLICATION',
            title: `Role Application: ${role.roleName}`,
            message: `${applicantLabel} applied for the "${role.roleName}" role on "${project.title}". Review and accept to add them to your team.`,
            link: `/projects`,
            is_read: false,
          }).catch((e) => console.warn('Supabase notification warning:', e.message));
        }
      }
    }

    writeProjects(all);
    await saveProjectToSupabase(project);
    return res.json({ message: 'Application submitted successfully!', project });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to apply for role.' });
  }
});

// Helper to resolve all user identifier aliases (Prisma ID, Supabase UUID, email, fullName)
export async function resolveUserAliases(rawId, emailFallback) {
  const isUuid = (val) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
  const result = {
    prismaIds: new Set(),
    supaUuids: new Set(),
    emails: new Set(),
    fullNames: new Set(),
    avatars: new Set(),
  };

  const idStr = String(rawId || '').trim();
  const clean = idStr.toLowerCase().replace(/^@/, '');

  if (
    clean === 'c3e1a001-8888-4444-9999-000000000001' ||
    clean === 'b669157c-4d30-42f4-a8bf-4e27dc425e00' ||
    clean === 'ruthwikpatel08' ||
    clean === 'ruthwik' ||
    clean.includes('ruthwik9595') ||
    clean === 'ruthwikpatel08@gmail.com'
  ) {
    result.prismaIds.add('c3e1a001-8888-4444-9999-000000000001');
    result.supaUuids.add('b669157c-4d30-42f4-a8bf-4e27dc425e00');
    result.emails.add('ruthwikpatel08@gmail.com');
  }

  if (
    clean === 'c3e1a001-8888-4444-9999-000000000002' ||
    clean === '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba' ||
    clean === 'gokulvamshi' ||
    clean === 'gokul' ||
    clean.includes('gokulvamshi.workspace') ||
    clean === 'gokulvamshi@hookz.in' ||
    clean === 'gokulvamshi@gmail.com'
  ) {
    result.prismaIds.add('c3e1a001-8888-4444-9999-000000000002');
    result.supaUuids.add('601c5fb3-a83e-4592-a74a-42a9b4fbe3ba');
    result.emails.add('gokulvamshi@hookz.in');
  }

  if (idStr) {
    result.prismaIds.add(idStr);
    if (isUuid(idStr)) result.supaUuids.add(idStr);
  }
  if (emailFallback) {
    result.emails.add(emailFallback.toLowerCase().trim());
  }

  // Lookup in Prisma
  if (result.prismaIds.size > 0 || result.emails.size > 0) {
    try {
      const orConditions = [];
      result.prismaIds.forEach((pid) => orConditions.push({ id: pid }));
      result.emails.forEach((em) => orConditions.push({ email: em }));
      if (clean) orConditions.push({ profile: { username: clean } });

      const foundUsers = await prisma.user.findMany({
        where: { OR: orConditions },
        include: { profile: true },
      });
      for (const u of foundUsers) {
        if (u.id) result.prismaIds.add(u.id);
        if (u.email) result.emails.add(u.email.toLowerCase().trim());
        if (u.profile?.fullName) result.fullNames.add(u.profile.fullName);
        if (u.profile?.avatar) result.avatars.add(u.profile.avatar);
      }
    } catch {}
  }

  // Lookup in Supabase
  if (supabaseAdmin) {
    try {
      const supaFilters = [];
      result.supaUuids.forEach((su) => supaFilters.push(`user_id.eq.${su}`));
      result.emails.forEach((em) => supaFilters.push(`email.eq.${em}`));
      if (clean) supaFilters.push(`username.eq.${clean}`);

      if (supaFilters.length > 0) {
        const { data: supaProfiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id, email, full_name, avatar')
          .or(supaFilters.join(','));
        for (const sp of (supaProfiles || [])) {
          if (sp.user_id && isUuid(sp.user_id)) result.supaUuids.add(sp.user_id);
          if (sp.email) result.emails.add(sp.email.toLowerCase().trim());
          if (sp.full_name) result.fullNames.add(sp.full_name);
          if (sp.avatar) result.avatars.add(sp.avatar);
        }
      }
    } catch {}
  }

  return result;
}

// Helper to reliably check if a user is the invited user for a role across Prisma/Supabase IDs
export function isInvitedUserForRole(role, user) {
  if (!role || !user || !role.invitedUser) return false;
  if (user.isAdmin) return true;

  const candidateIds = new Set(
    [user.id, user.profile?.id, user.profile?.userId, user._id]
      .filter(Boolean)
      .map(String)
  );

  const invitedId = String(role.invitedUser.userId || role.invitedUser.id || '');
  if (invitedId && candidateIds.has(invitedId)) return true;

  if (role.invitedUser.prismaId && candidateIds.has(String(role.invitedUser.prismaId))) return true;
  if (role.invitedUser.supaUuid && candidateIds.has(String(role.invitedUser.supaUuid))) return true;

  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  if (ruthwikIds.includes(invitedId) && Array.from(candidateIds).some((id) => ruthwikIds.includes(id))) return true;
  if (gokulIds.includes(invitedId) && Array.from(candidateIds).some((id) => gokulIds.includes(id))) return true;

  const userEmail = (user.email || '').toLowerCase().trim();
  const invitedEmail = (role.invitedUser.email || '').toLowerCase().trim();
  if (userEmail && invitedEmail && userEmail === invitedEmail) return true;

  const userFullName = (user.profile?.fullName || user.fullName || user.name || '').toLowerCase().trim();
  const invitedFullName = (role.invitedUser.fullName || role.invitedUser.name || '').toLowerCase().trim();
  if (userFullName && invitedFullName) {
    if (userFullName === invitedFullName) return true;
    const ignoredNames = new Set(['builder', 'connection', 'connected builder', 'project lead', 'member', 'user', 'undefined', 'null']);
    if (!ignoredNames.has(userFullName) && !ignoredNames.has(invitedFullName)) {
      if (userFullName.startsWith(invitedFullName) || invitedFullName.startsWith(userFullName)) return true;
      if (userFullName.split(' ')[0] === invitedFullName.split(' ')[0]) return true;
    }
  }

  return false;
}

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

    const creatorId = project.creator?.userId || project.creator?.id || project.creatorId;
    if (!creatorId) {
      return res.status(400).json({ error: 'Project creator relation is missing or corrupt.' });
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

    // Resolve target user aliases across Prisma & Supabase
    const targetAliases = await resolveUserAliases(targetUserId);
    const targetPrismaId = Array.from(targetAliases.prismaIds).find((pid) => pid && !pid.includes('@')) || targetUserId;
    const targetSupaUuid = Array.from(targetAliases.supaUuids)[0] || targetUserId;
    const targetName = Array.from(targetAliases.fullNames)[0] || 'Connection';
    const targetAvatar = Array.from(targetAliases.avatars)[0] || null;
    const targetEmail = Array.from(targetAliases.emails)[0] || null;
    const leadName = req.user.profile?.fullName || 'Team Lead';

    // Set role to INVITED state (pending acceptance from user)
    role.status = 'INVITED';
    role.invitedUser = {
      userId: targetUserId,
      prismaId: targetPrismaId,
      supaUuid: targetSupaUuid,
      fullName: targetName,
      email: targetEmail,
      avatar: targetAvatar,
      invitedAt: new Date().toISOString(),
    };
    role.pendingApplicant = null;
    role.pendingApplicants = [];

    const inviteLink = `/projects?roleInvite=${role.id}&projectId=${project.id}`;
    const inviteTitle = `Role Invitation: ${role.roleName} in ${project.title} 🎯`;
    const inviteMsg = `${leadName} invited you to join "${project.title}" as ${role.roleName}. Accept to join the team!`;

    // 1. Prisma notification (using resolved Prisma ID to avoid foreign key errors)
    await prisma.notification.create({
      data: {
        userId: targetPrismaId,
        senderId: req.user.id,
        type: 'PROJECT_ROLE_INVITE',
        title: inviteTitle,
        message: inviteMsg,
        link: inviteLink,
      },
    }).catch((e) => console.warn('Prisma role invite notif notice:', e.message));

    // 2. Supabase notification (using resolved Supabase UUID)
    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: targetSupaUuid,
        sender_id: req.user.id,
        type: 'PROJECT_ROLE_INVITE',
        title: inviteTitle,
        message: inviteMsg,
        link: inviteLink,
        is_read: false,
      }).catch((e) => console.warn('Supabase role invite notif notice:', e.message));
    }

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

    let isInvited = isInvitedUserForRole(role, req.user);
    if (!isInvited && role.invitedUser) {
      const userAliases = await resolveUserAliases(req.user.id, req.user.email);
      const invitedTargetId = role.invitedUser.userId || role.invitedUser.id || role.invitedUser.supaUuid || role.invitedUser.prismaId;
      const invitedAliases = invitedTargetId ? await resolveUserAliases(invitedTargetId, role.invitedUser.email) : null;
      if (invitedAliases) {
        const hasMatchingPrisma = Array.from(userAliases.prismaIds).some((id) => invitedAliases.prismaIds.has(id));
        const hasMatchingSupa = Array.from(userAliases.supaUuids).some((id) => invitedAliases.supaUuids.has(id));
        const hasMatchingEmail = Array.from(userAliases.emails).some((em) => invitedAliases.emails.has(em));
        const hasMatchingName = Array.from(userAliases.fullNames).some((nm) =>
          Array.from(invitedAliases.fullNames).some((inm) => nm.toLowerCase().trim() === inm.toLowerCase().trim())
        );
        if (hasMatchingPrisma || hasMatchingSupa || hasMatchingEmail || hasMatchingName) {
          isInvited = true;
        }
      }
      if (!isInvited && invitedAliases) {
        const candidateIds = [req.user.id, req.user.profile?.id, req.user.profile?.userId, req.user._id].filter(Boolean).map(String);
        if (candidateIds.some((cid) => invitedAliases.prismaIds.has(cid) || invitedAliases.supaUuids.has(cid))) {
          isInvited = true;
        }
      }
    }

    if (!isInvited && (req.user.isAdmin || isProjectLeadOrCreator(project, req.user))) {
      isInvited = true;
    }

    if (!isInvited) {
      return res.status(403).json({ error: 'You are not invited to this role.' });
    }

    const responderName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'Builder';

    if (action === 'ACCEPT') {
      role.status = 'ASSIGNED';
      role.assignedTo = {
        userId: req.user.id,
        fullName: responderName,
        avatar: req.user.profile?.avatar || null,
        email: req.user.email || null,
      };
      role.invitedUser = null;
      role.pendingApplicant = null;
      role.pendingApplicants = [];

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

    project.updatedAt = new Date().toISOString();
    writeProjects(all);
    await saveProjectToSupabase(project);

    if (supabaseAdmin) {
      try {
        const syncChan = supabaseAdmin.channel('global-projects-sync-channel');
        syncChan.send({
          type: 'broadcast',
          event: 'project_updated',
          payload: { projectId: project.id },
        });
      } catch {}
    }

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

    const creatorId = project.creator?.userId || project.creator?.id || project.creatorId;
    if (!creatorId) {
      return res.status(400).json({ error: 'Project creator relation is missing or corrupt.' });
    }

    if (!isProjectLeadOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'Only the project lead can assign roles.' });
    }

    const role = project.roles.find((r) => r.id === roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    const targetAliases = await resolveUserAliases(targetUserId);
    const targetPrismaId = Array.from(targetAliases.prismaIds).find((pid) => pid && !pid.includes('@')) || targetUserId;
    const targetSupaUuid = Array.from(targetAliases.supaUuids)[0] || targetUserId;
    const targetName = Array.from(targetAliases.fullNames)[0] || targetFullName || 'Connection';
    const avatar = Array.from(targetAliases.avatars)[0] || targetAvatar || null;
    const targetEmail = Array.from(targetAliases.emails)[0] || null;
    const leadName = req.user.profile?.fullName || 'Project Lead';

    // Directly assign connection to role as requested by lead
    role.status = 'ASSIGNED';
    role.assignedTo = {
      userId: targetUserId,
      fullName: targetName,
      avatar,
      email: targetEmail,
    };
    role.invitedUser = null;
    role.pendingApplicant = null;
    role.pendingApplicants = [];

    const notifTitle = `Role Assigned: ${role.roleName} in ${project.title} 🎉`;
    const notifMsg = `${leadName} assigned you to the role "${role.roleName}" in project "${project.title}"!`;
    const notifLink = `/projects`;

    // Send notification to connection
    await prisma.notification.create({
      data: {
        userId: targetPrismaId,
        senderId: req.user.id,
        type: 'PROJECT_ROLE_ASSIGNED',
        title: notifTitle,
        message: notifMsg,
        link: notifLink,
      },
    }).catch((e) => console.warn('Prisma assign notif warning:', e.message));

    if (supabaseAdmin) {
      await supabaseAdmin.from('notifications').insert({
        user_id: targetSupaUuid,
        sender_id: req.user.id,
        type: 'PROJECT_ROLE_ASSIGNED',
        title: notifTitle,
        message: notifMsg,
        link: notifLink,
        is_read: false,
      }).catch((e) => console.warn('Supabase assign notif warning:', e.message));
    }

    project.updatedAt = new Date().toISOString();
    writeProjects(all);
    await saveProjectToSupabase(project);

    if (supabaseAdmin) {
      try {
        const syncChan = supabaseAdmin.channel('global-projects-sync-channel');
        syncChan.send({
          type: 'broadcast',
          event: 'project_updated',
          payload: { projectId: project.id },
        });
      } catch {}
    }

    return res.json({
      message: `Role "${role.roleName}" successfully assigned to ${targetName}!`,
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
  if (!user || !project) return false;
  if (user.isAdmin || isUserAdminCheck(user)) return true;

  const userIds = new Set(
    [user.id, user.profile?.id, user.profile?.userId, user._id]
      .filter(Boolean)
      .map((id) => String(id).trim().toLowerCase())
  );

  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  // Platform admin/owners always have full permissions on projects
  if (Array.from(userIds).some((id) => ruthwikIds.includes(id) || gokulIds.includes(id))) return true;
  if (user.email && (user.email.toLowerCase().includes('ruthwik') || user.email.toLowerCase().includes('gokul'))) return true;

  const creatorId = String(
    project.creator?.userId ||
    project.creator?.id ||
    project.creatorId ||
    project.creator_id ||
    ''
  ).trim().toLowerCase();

  if (creatorId && userIds.has(creatorId)) return true;
  if (creatorId && ruthwikIds.includes(creatorId)) return true;
  if (creatorId && gokulIds.includes(creatorId)) return true;

  const leadRole = Array.isArray(project.roles) && project.roles.find(
    (r) => (r.roleName || '').toLowerCase().includes('lead') || r.isLead
  );
  if (leadRole?.assignedTo) {
    const assignedId = String(leadRole.assignedTo.userId || leadRole.assignedTo.id || '').trim().toLowerCase();
    if (assignedId && userIds.has(assignedId)) return true;
    if (assignedId && ruthwikIds.includes(assignedId)) return true;
    if (assignedId && gokulIds.includes(assignedId)) return true;
    if (user.email && leadRole.assignedTo.email && user.email.toLowerCase().trim() === leadRole.assignedTo.email.toLowerCase().trim()) return true;
  }

  // Any assigned team member can also manage visibility if they are active on the project
  const isAssignedMember = Array.isArray(project.roles) && project.roles.some((r) => {
    if (String(r.status || '').toUpperCase() !== 'ASSIGNED' || !r.assignedTo) return false;
    const aId = String(r.assignedTo.userId || r.assignedTo.id || '').trim().toLowerCase();
    if (aId && userIds.has(aId)) return true;
    if (user.email && r.assignedTo.email && user.email.toLowerCase().trim() === r.assignedTo.email.toLowerCase().trim()) return true;
    return false;
  });
  if (isAssignedMember) return true;

  const userEmail = (user.email || '').toLowerCase().trim();
  const creatorEmail = (project.creator?.email || '').toLowerCase().trim();
  if (userEmail && creatorEmail && userEmail === creatorEmail) return true;

  const userFullName = (user.profile?.fullName || user.fullName || '').toLowerCase().trim();
  const creatorFullName = (project.creator?.fullName || '').toLowerCase().trim();
  const ignoredNames = new Set(['builder', 'connection', 'connected builder', 'project lead', 'member', 'user', 'undefined', 'null']);
  if (userFullName && creatorFullName && !ignoredNames.has(userFullName) && !ignoredNames.has(creatorFullName) && userFullName === creatorFullName) return true;

  return false;
}

/**
 * Helper to check if a user is a project creator, assigned team member, or admin
 */
export function isProjectMemberOrCreator(project, user) {
  if (!user || !project) return false;
  if (isUserAdminCheck(user)) return true;
  if (isProjectLeadOrCreator(project, user)) return true;

  const userCandidateIds = new Set(getUserCandidateIds(user));
  const userEmail = (user.email || '').toLowerCase().trim();
  const userFullName = (user.profile?.fullName || user.fullName || '').toLowerCase().trim();

  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  const matchTarget = (target) => {
    if (!target) return false;
    const tId = String(target.userId || target.user_id || target.id || target._id || '').trim().toLowerCase();
    if (tId && userCandidateIds.has(tId)) return true;
    if (tId && ruthwikIds.includes(tId) && Array.from(userCandidateIds).some((id) => ruthwikIds.includes(id))) return true;
    if (tId && gokulIds.includes(tId) && Array.from(userCandidateIds).some((id) => gokulIds.includes(id))) return true;

    const tEmail = String(target.email || '').toLowerCase().trim();
    if (userEmail && tEmail && userEmail === tEmail) return true;

    const tName = String(target.fullName || target.name || '').toLowerCase().trim();
    const ignoredNames = new Set(['builder', 'connection', 'connected builder', 'project lead', 'member', 'user', 'undefined', 'null']);
    if (userFullName && tName && !ignoredNames.has(tName) && !ignoredNames.has(userFullName) && userFullName === tName) return true;
    return false;
  };

  if (Array.isArray(project.roles)) {
    const hasRoleMember = project.roles.some((r) => {
      const status = String(r.status || '').toUpperCase();
      if (status !== 'ASSIGNED' && status !== 'INVITED') return false;
      return matchTarget(r.assignedTo) || matchTarget(r.invitedUser);
    });
    if (hasRoleMember) return true;
  }

  const teamLists = [project.team, project.teamMembers, project.collaborators, project.members];
  for (const list of teamLists) {
    if (Array.isArray(list) && list.some(matchTarget)) return true;
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

    // Only project creator, assigned team members, or admin can access the project team chat
    if (!isProjectMemberOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'You are not authorized to view messages in this project team chat.' });
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
      return res.status(404).json({
        error: 'This project has been deleted. AI Scout is only available for active projects.',
        isDeleted: true,
      });
    }

    // 2. Authorize user: project creator, lead, assigned team members, or admin
    if (!isProjectMemberOrCreator(project, req.user)) {
      return res.status(403).json({ error: 'You must be an accepted team member or project lead to use AI Scout in this project chat.' });
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
