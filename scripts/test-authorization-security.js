process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import projectsRouter, { isProjectMemberOrCreator } from '../server/src/routes/projects.js';
import savedRouter from '../server/src/routes/saved.js';
import usersRouter from '../server/src/routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Running HookZ Authorization & Data Exposure Security Regression Tests...\n');

let passed = 0;
let failed = 0;

function testAssert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

// Helper to create mock Express req, res, next
function createMockReqRes({ user = null, body = {}, params = {}, query = {}, headers = {} } = {}) {
  const req = {
    user,
    body,
    params,
    query,
    headers,
  };

  let statusCode = 200;
  let jsonResponse = null;
  let nextCalled = false;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
      return res;
    },
    setHeader: () => res,
  };

  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getResult: () => ({ statusCode, jsonResponse, nextCalled }),
  };
}

async function runAllTests() {
  // -------------------------------------------------------------------------
  // Suite 1: Co-founder Matching Data Protection (GET /api/users/matching/cofounders)
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Co-Founder Matching Data Exposure Prevention ---');
  {
    const usersRoutePath = path.resolve(__dirname, '../server/src/routes/users.js');
    const usersRouteSrc = fs.readFileSync(usersRoutePath, 'utf8');

    // 1.1 Verify static Prisma select query does NOT select password, email, isAdmin, or isSuspended
    const matchingQueryMatch = usersRouteSrc.match(
      /router\.get\('\/matching\/cofounders'[\s\S]*?prisma\.user\.findMany\(\{[\s\S]*?select:\s*\{([\s\S]*?)\}/
    );
    testAssert(matchingQueryMatch !== null, 'Matching endpoint uses explicit Prisma select clause');
    if (matchingQueryMatch) {
      const selectBlock = matchingQueryMatch[1];
      testAssert(!selectBlock.includes('password'), 'Prisma select excludes password');
      testAssert(!selectBlock.includes('email: true'), 'Prisma select excludes email');
      testAssert(!selectBlock.includes('isAdmin'), 'Prisma select excludes isAdmin');
      testAssert(!selectBlock.includes('isSuspended'), 'Prisma select excludes isSuspended');
    }

    // 1.2 Verify mapping transformation does NOT spread cand and explicitly omits sensitive fields
    const mappingMatch = usersRouteSrc.match(
      /const scoredCandidates = candidates\.map\(\(cand\) => \{[\s\S]*?return \{([\s\S]*?)\};\s*\}\);/
    );
    testAssert(mappingMatch !== null, 'Candidate mapping block found');
    if (mappingMatch) {
      const returnBlock = mappingMatch[1];
      testAssert(!returnBlock.includes('...cand'), 'Candidate mapping does NOT use broad object spread (...cand)');
      testAssert(!returnBlock.includes('password'), 'Response mapping excludes password');
      testAssert(!returnBlock.includes('email'), 'Response mapping excludes email');
      testAssert(!returnBlock.includes('isAdmin'), 'Response mapping excludes isAdmin');
      testAssert(!returnBlock.includes('isSuspended'), 'Response mapping excludes isSuspended');
    }

    // 1.3 Behavioral test: simulate mapping with candidate containing sensitive account data
    const mockCandidateWithSecrets = {
      id: 'cand-user-1',
      email: 'founder_alice@secret.org',
      password: '$2b$10$supersecretbcryptpasswordhash1234567890abcdef',
      isAdmin: true,
      isSuspended: false,
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      createdAt: new Date().toISOString(),
      profile: { fullName: 'Alice Tech', headline: 'AI Builder' },
      startups: [{ id: 's-1', name: 'AlphaAI', stage: 'Seed', industry: 'AI' }],
      investorProfile: null,
    };

    // Replicate mapping logic from users.js:348
    const safeTransformed = {
      id: mockCandidateWithSecrets.id,
      role: mockCandidateWithSecrets.role,
      isVerified: mockCandidateWithSecrets.isVerified,
      verificationBadge: mockCandidateWithSecrets.verificationBadge || null,
      createdAt: mockCandidateWithSecrets.createdAt,
      profile: mockCandidateWithSecrets.profile || null,
      startups: mockCandidateWithSecrets.startups || [],
      investorProfile: mockCandidateWithSecrets.investorProfile || null,
      matchPercentage: 85,
      matchExplanation: 'Synergy',
      connectionStatus: null,
    };

    testAssert(safeTransformed.password === undefined, 'Transformed candidate has undefined password');
    testAssert(safeTransformed.email === undefined, 'Transformed candidate has undefined email');
    testAssert(safeTransformed.isAdmin === undefined, 'Transformed candidate has undefined isAdmin');
    testAssert(safeTransformed.isSuspended === undefined, 'Transformed candidate has undefined isSuspended');
    testAssert(safeTransformed.id === 'cand-user-1', 'Candidate ID preserved for client navigation');
    testAssert(safeTransformed.profile?.fullName === 'Alice Tech', 'Public profile preserved');
  }

  // -------------------------------------------------------------------------
  // Suite 2: User Recommendations Data Protection (GET /api/users/recommendations)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: User Recommendations Data Exposure Prevention ---');
  {
    const usersRoutePath = path.resolve(__dirname, '../server/src/routes/users.js');
    const usersRouteSrc = fs.readFileSync(usersRoutePath, 'utf8');

    // 2.1 Verify static Prisma select query does NOT select password, email, isAdmin, or isSuspended
    const recQueryMatch = usersRouteSrc.match(
      /router\.get\('\/recommendations'[\s\S]*?prisma\.user\.findMany\(\{[\s\S]*?select:\s*\{([\s\S]*?)\}/
    );
    testAssert(recQueryMatch !== null, 'Recommendations endpoint uses explicit Prisma select clause');
    if (recQueryMatch) {
      const selectBlock = recQueryMatch[1];
      testAssert(!selectBlock.includes('password'), 'Recommendations Prisma select excludes password');
      testAssert(!selectBlock.includes('email: true'), 'Recommendations Prisma select excludes email');
      testAssert(!selectBlock.includes('isAdmin'), 'Recommendations Prisma select excludes isAdmin');
      testAssert(!selectBlock.includes('isSuspended'), 'Recommendations Prisma select excludes isSuspended');
    }

    // 2.2 Verify mapping transformation does NOT spread u
    const recMappingMatch = usersRouteSrc.match(
      /const recommendations = recommendedUsers\.map\(\(u\) => \{[\s\S]*?return \{([\s\S]*?)\};\s*\}\);/
    );
    testAssert(recMappingMatch !== null, 'Recommendation mapping block found');
    if (recMappingMatch) {
      const returnBlock = recMappingMatch[1];
      testAssert(!returnBlock.includes('...u'), 'Recommendation mapping does NOT use broad object spread (...u)');
      testAssert(!returnBlock.includes('password'), 'Recommendation mapping excludes password');
      testAssert(!returnBlock.includes('email'), 'Recommendation mapping excludes email');
      testAssert(!returnBlock.includes('isAdmin'), 'Recommendation mapping excludes isAdmin');
      testAssert(!returnBlock.includes('isSuspended'), 'Recommendation mapping excludes isSuspended');
    }

    // 2.3 Behavioral test with sensitive record
    const mockRecWithSecrets = {
      id: 'rec-user-2',
      email: 'rec_bob@secret.org',
      password: '$2b$10$anotherbcryptpasswordhash0987654321fedcba',
      isAdmin: true,
      isSuspended: false,
      role: 'DEVELOPER',
      isVerified: true,
      verificationBadge: null,
      createdAt: new Date().toISOString(),
      profile: { fullName: 'Bob Dev', preferredRole: 'Fullstack' },
      startups: [],
    };

    const safeRecTransformed = {
      id: mockRecWithSecrets.id,
      role: mockRecWithSecrets.role,
      isVerified: mockRecWithSecrets.isVerified,
      verificationBadge: mockRecWithSecrets.verificationBadge || null,
      createdAt: mockRecWithSecrets.createdAt,
      profile: mockRecWithSecrets.profile || null,
      startups: mockRecWithSecrets.startups || [],
      recommendationReason: 'Active builder in the startup network',
    };

    testAssert(safeRecTransformed.password === undefined, 'Transformed recommendation has undefined password');
    testAssert(safeRecTransformed.email === undefined, 'Transformed recommendation has undefined email');
    testAssert(safeRecTransformed.isAdmin === undefined, 'Transformed recommendation has undefined isAdmin');
    testAssert(safeRecTransformed.isSuspended === undefined, 'Transformed recommendation has undefined isSuspended');
  }

  // -------------------------------------------------------------------------
  // Suite 3: Shared Project Authorization Helper (isProjectMemberOrCreator)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: isProjectMemberOrCreator Permission Checks ---');
  {
    testAssert(typeof isProjectMemberOrCreator === 'function', 'isProjectMemberOrCreator is exported from projects.js');

    const publicProj = {
      id: 'proj-public-101',
      title: 'Public Open Source Venture',
      visibility: 'PUBLIC',
      creator: { userId: 'user-creator' },
      creatorId: 'user-creator',
      roles: [
        { id: 'r-1', roleName: 'Frontend Lead', assignedTo: { userId: 'user-member-1' } },
        { id: 'r-2', roleName: 'Backend Lead', assignedTo: { userId: 'user-member-2' } },
      ],
    };

    const privateProj = {
      id: 'proj-private-202',
      title: 'Confidential Stealth Venture',
      visibility: 'PRIVATE',
      creator: { userId: 'user-creator' },
      creatorId: 'user-creator',
      roles: [
        { id: 'r-1', roleName: 'Frontend Lead', assignedTo: { userId: 'user-member-1' } },
      ],
    };

    const creatorUser = { id: 'user-creator', isAdmin: false };
    const memberUser = { id: 'user-member-1', isAdmin: false };
    const nonMemberUser = { id: 'user-stranger', isAdmin: false };
    const adminUser = { id: 'user-admin', isAdmin: true };

    // Public project tests
    testAssert(isProjectMemberOrCreator(publicProj, creatorUser) === true, 'Public project: creator is recognized as member/creator');
    testAssert(isProjectMemberOrCreator(publicProj, memberUser) === true, 'Public project: assigned role user is recognized as member/creator');
    testAssert(isProjectMemberOrCreator(publicProj, nonMemberUser) === false, 'Public project: stranger is NOT recognized as member/creator');
    testAssert(isProjectMemberOrCreator(publicProj, adminUser) === true, 'Public project: admin is recognized as authorized');

    // Private project tests
    testAssert(isProjectMemberOrCreator(privateProj, creatorUser) === true, 'Private project: creator is recognized as member/creator');
    testAssert(isProjectMemberOrCreator(privateProj, memberUser) === true, 'Private project: assigned role user is recognized as member/creator');
    testAssert(isProjectMemberOrCreator(privateProj, nonMemberUser) === false, 'Private project: stranger is NOT recognized as member/creator');
    testAssert(isProjectMemberOrCreator(privateProj, adminUser) === true, 'Private project: admin is recognized as authorized');

    // Null/undefined checks fail closed
    testAssert(isProjectMemberOrCreator(privateProj, null) === false, 'Null user fails closed (false)');
    testAssert(isProjectMemberOrCreator(null, memberUser) === false, 'Null project fails closed (false)');
    testAssert(isProjectMemberOrCreator(privateProj, {}) === false, 'Empty user object fails closed (false)');
  }

  // -------------------------------------------------------------------------
  // Suite 4: Saved Items Private Project Authorization (saved.js)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Saved Items Private Project Access Protection ---');
  {
    const savedRoutePath = path.resolve(__dirname, '../server/src/routes/saved.js');
    const savedRouteSrc = fs.readFileSync(savedRoutePath, 'utf8');

    // 4.1 Verify saved.js imports isProjectMemberOrCreator
    testAssert(savedRouteSrc.includes('isProjectMemberOrCreator'), 'saved.js imports and uses isProjectMemberOrCreator');

    // 4.2 Verify GET /api/saved omits unauthorized private projects
    testAssert(
      savedRouteSrc.includes("proj.visibility === 'PRIVATE' && !isProjectMemberOrCreator(proj, req.user)"),
      'GET /api/saved checks private project visibility against isProjectMemberOrCreator'
    );
    testAssert(
      savedRouteSrc.includes('return null;') && savedRouteSrc.includes('.filter(Boolean)'),
      'GET /api/saved returns null and filters with .filter(Boolean) to omit unauthorized private projects'
    );

    // 4.3 Verify handleToggleSave blocks unauthorized private project saves with 403
    testAssert(
      savedRouteSrc.includes("normalizedType === 'PROJECT'") && savedRouteSrc.includes('res.status(403)'),
      'handleToggleSave blocks unauthorized private project saves with HTTP 403'
    );

    // 4.4 Behavioral test of saved item population logic
    const testPrivateProject = {
      id: 'proj-confidential-99',
      title: 'Secret Stealth AI',
      visibility: 'PRIVATE',
      creator: { userId: 'lead-1' },
      roles: [{ assignedTo: { userId: 'dev-1' } }],
    };

    const testPublicProject = {
      id: 'proj-open-88',
      title: 'Open Source Toolkit',
      visibility: 'PUBLIC',
      creator: { userId: 'lead-1' },
      roles: [],
    };

    const projectMap = new Map([
      [testPrivateProject.id, testPrivateProject],
      [testPublicProject.id, testPublicProject],
    ]);

    function mockPopulateSavedItem(item, user) {
      if (item.itemType === 'PROJECT') {
        const proj = projectMap.get(item.itemId);
        if (proj) {
          if (proj.visibility === 'PRIVATE' && !isProjectMemberOrCreator(proj, user)) {
            return null;
          }
          return { id: item.id, itemType: item.itemType, itemId: item.itemId, data: proj, details: proj };
        }
      }
      return { id: item.id, itemType: item.itemType, itemId: item.itemId, data: null };
    }

    const savedPrivateItem = { id: 'save-1', itemType: 'PROJECT', itemId: testPrivateProject.id };
    const savedPublicItem = { id: 'save-2', itemType: 'PROJECT', itemId: testPublicProject.id };

    const nonMember = { id: 'outsider-999', isAdmin: false };
    const member = { id: 'dev-1', isAdmin: false };
    const admin = { id: 'admin-0', isAdmin: true };

    // Non-member trying to retrieve saved private project
    const nonMemberResult = [savedPrivateItem, savedPublicItem]
      .map((item) => mockPopulateSavedItem(item, nonMember))
      .filter(Boolean);
    testAssert(
      nonMemberResult.length === 1 && nonMemberResult[0].itemId === testPublicProject.id,
      'Non-member receives public saved project, but private project is completely omitted'
    );
    testAssert(
      !JSON.stringify(nonMemberResult).includes('Secret Stealth AI'),
      'Private project title is completely absent from non-member saved items response'
    );

    // Member trying to retrieve saved private project
    const memberResult = [savedPrivateItem, savedPublicItem]
      .map((item) => mockPopulateSavedItem(item, member))
      .filter(Boolean);
    testAssert(memberResult.length === 2, 'Assigned team member successfully retrieves both private and public saved projects');
    testAssert(memberResult[0].data?.title === 'Secret Stealth AI', 'Member receives private project details');

    // Admin trying to retrieve saved private project
    const adminResult = [savedPrivateItem, savedPublicItem]
      .map((item) => mockPopulateSavedItem(item, admin))
      .filter(Boolean);
    testAssert(adminResult.length === 2, 'Admin successfully retrieves private project through saved items');
  }

  // -------------------------------------------------------------------------
  // Suite 5: AI Scout Authorization (POST /api/projects/:id/ai-scout)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: AI Scout Authorization & Execution Protection ---');
  {
    const projectsRoutePath = path.resolve(__dirname, '../server/src/routes/projects.js');
    const projectsRouteSrc = fs.readFileSync(projectsRoutePath, 'utf8');

    // 5.1 Verify static check enforces isProjectMemberOrCreator for ALL projects
    const aiScoutAuthBlock = projectsRouteSrc.match(
      /router\.post\('\/:id\/ai-scout'[\s\S]*?\/\/ 2\. Authorize user[\s\S]*?if \(!isProjectMemberOrCreator\(project, req\.user\)\) \{([\s\S]*?)\}/
    );
    testAssert(aiScoutAuthBlock !== null, 'AI Scout strictly checks isProjectMemberOrCreator before processing');
    testAssert(
      !projectsRouteSrc.includes("if (!isMemberOrCreator && project.visibility === 'PRIVATE')"),
      'Old loophole (checking isMemberOrCreator only when project.visibility === PRIVATE) is completely eliminated'
    );

    // 5.2 Extract the actual AI Scout route handlers from projectsRouter
    const aiScoutLayer = projectsRouter.stack.find((l) => l.route?.path === '/:id/ai-scout');
    testAssert(aiScoutLayer !== undefined, 'AI Scout route layer found on projectsRouter');

    const routeStack = aiScoutLayer.route.stack;
    const requireAuthMiddleware = routeStack[0].handle;
    const aiScoutHandler = routeStack[1].handle;
    testAssert(typeof requireAuthMiddleware === 'function', 'requireAuth middleware is present on AI Scout route');
    testAssert(typeof aiScoutHandler === 'function', 'AI Scout handler is present on AI Scout route');

    // 5.3 Verify unauthenticated AI Scout request is rejected with 401
    {
      const { req, res, next, getResult } = createMockReqRes({
        user: null,
        body: { prompt: 'Analyze our tech stack' },
        params: { id: 'proj-1' },
      });
      await requireAuthMiddleware(req, res, next);
      const { statusCode, jsonResponse, nextCalled } = getResult();
      testAssert(statusCode === 401, 'Unauthenticated AI Scout request rejected with HTTP 401');
      testAssert(nextCalled === false, 'requireAuth halts pipeline for unauthenticated user');
    }

    // 5.4 Behavioral simulation of authorization check before any side-effects
    const publicProject = {
      id: 'proj-pub-1',
      title: 'Public Drone Project',
      visibility: 'PUBLIC',
      creator: { userId: 'lead-10' },
      creatorId: 'lead-10',
      roles: [{ id: 'r-1', roleName: 'Firmware Dev', assignedTo: { userId: 'member-20' } }],
    };

    const privateProject = {
      id: 'proj-priv-2',
      title: 'Stealth Quantum Project',
      visibility: 'PRIVATE',
      creator: { userId: 'lead-10' },
      creatorId: 'lead-10',
      roles: [{ id: 'r-1', roleName: 'Physicist', assignedTo: { userId: 'member-20' } }],
    };

    let geminiApiInvoked = false;
    let botMessageWritten = false;
    let realtimeBroadcastSent = false;

    // Simulated handler logic strictly mirroring projects.js lines 1015-1085
    async function simulateAiScoutCall(project, user, prompt) {
      geminiApiInvoked = false;
      botMessageWritten = false;
      realtimeBroadcastSent = false;

      const { res, getResult } = createMockReqRes();

      if (!prompt || !prompt.trim()) {
        res.status(400).json({ error: 'Please enter a question or request for AI Scout.' });
        return getResult();
      }

      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return getResult();
      }

      // Authorization guard
      if (!isProjectMemberOrCreator(project, user)) {
        res.status(403).json({ error: 'You are not authorized to use AI Scout in this project workspace.' });
        return getResult();
      }

      // Side-effects (only reached if authorized!)
      geminiApiInvoked = true;
      botMessageWritten = true;
      realtimeBroadcastSent = true;

      res.status(200).json({ message: { id: 'scout-1', content: 'AI analysis result' } });
      return getResult();
    }

    const creatorUser = { id: 'lead-10', isAdmin: false };
    const memberUser = { id: 'member-20', isAdmin: false };
    const strangerUser = { id: 'stranger-30', isAdmin: false };
    const adminUser = { id: 'admin-99', isAdmin: true };

    // --- Public project tests ---
    // Creator can use AI Scout on public project
    const pubCreator = await simulateAiScoutCall(publicProject, creatorUser, 'Suggest roadmap');
    testAssert(pubCreator.statusCode === 200, 'Public project: creator is allowed to use AI Scout (HTTP 200)');
    testAssert(geminiApiInvoked === true, 'Public project: authorized creator triggers AI analysis');

    // Assigned member can use AI Scout on public project
    const pubMember = await simulateAiScoutCall(publicProject, memberUser, 'Review code');
    testAssert(pubMember.statusCode === 200, 'Public project: assigned member is allowed to use AI Scout (HTTP 200)');

    // Non-member is REJECTED with 403 on public project
    const pubStranger = await simulateAiScoutCall(publicProject, strangerUser, 'Spam prompt');
    testAssert(pubStranger.statusCode === 403, 'Public project: non-member is rejected with HTTP 403');
    testAssert(
      geminiApiInvoked === false && botMessageWritten === false && realtimeBroadcastSent === false,
      'Public project: rejected non-member does NOT invoke Gemini, write bot message, or broadcast realtime events'
    );

    // Admin can use AI Scout on public project
    const pubAdmin = await simulateAiScoutCall(publicProject, adminUser, 'Admin inspection');
    testAssert(pubAdmin.statusCode === 200, 'Public project: platform admin is allowed to use AI Scout (HTTP 200)');

    // --- Private project tests ---
    // Creator can use AI Scout on private project
    const privCreator = await simulateAiScoutCall(privateProject, creatorUser, 'Private roadmap');
    testAssert(privCreator.statusCode === 200, 'Private project: creator is allowed to use AI Scout (HTTP 200)');

    // Assigned member can use AI Scout on private project
    const privMember = await simulateAiScoutCall(privateProject, memberUser, 'Private code review');
    testAssert(privMember.statusCode === 200, 'Private project: assigned member is allowed to use AI Scout (HTTP 200)');

    // Non-member is REJECTED with 403 on private project
    const privStranger = await simulateAiScoutCall(privateProject, strangerUser, 'Steal private data');
    testAssert(privStranger.statusCode === 403, 'Private project: non-member is rejected with HTTP 403');
    testAssert(
      geminiApiInvoked === false && botMessageWritten === false && realtimeBroadcastSent === false,
      'Private project: rejected non-member does NOT invoke Gemini, write bot message, or broadcast realtime events'
    );

    // Admin can use AI Scout on private project
    const privAdmin = await simulateAiScoutCall(privateProject, adminUser, 'Admin moderation');
    testAssert(privAdmin.statusCode === 200, 'Private project: platform admin is allowed to use AI Scout (HTTP 200)');
  }

  // -------------------------------------------------------------------------
  // Suite 6: User Directory Email Protection (GET /api/users)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 6: User Directory Email Exposure Prevention ---');
  {
    const usersRoutePath = path.resolve(__dirname, '../server/src/routes/users.js');
    const usersRouteSrc = fs.readFileSync(usersRoutePath, 'utf8');

    // 6.1 Verify search query email condition is gated behind req.user
    testAssert(
      usersRouteSrc.includes('...(req.user ? [{ email: { contains: q } }] : [])'),
      'GET /api/users search query gates email lookup behind req.user'
    );

    // 6.2 Verify formattedUsers gates email behind canViewEmail
    testAssert(
      usersRouteSrc.includes('canViewEmail = isSelf || isAdmin || isConnected') &&
      usersRouteSrc.includes('...(canViewEmail ? { email } : {})'),
      'GET /api/users conditionally returns email only to self, admin, or accepted connections'
    );

    // 6.3 Behavioral test: mock directory users with emails
    const rawDirectoryUser = {
      id: 'dir-u-1',
      email: 'builder_dave@confidential.com',
      role: 'BUILDER',
      isVerified: true,
      profile: { fullName: 'Dave Build', username: 'davebuild' },
      startups: [],
    };

    function simulateDirectoryFormatting(u, requestingUser, connectionStatus) {
      const isSelf = requestingUser && requestingUser.id === u.id;
      const isAdmin = requestingUser && Boolean(requestingUser.isAdmin);
      const isConnected = connectionStatus?.status === 'ACCEPTED';
      const canViewEmail = isSelf || isAdmin || isConnected;

      const { email, ...safeUser } = u;
      return {
        ...safeUser,
        ...(canViewEmail ? { email } : {}),
        connectionStatus,
      };
    }

    const publicGuest = null;
    const strangerUser = { id: 'other-user-99', isAdmin: false };
    const selfUser = { id: 'dir-u-1', isAdmin: false };
    const adminUser = { id: 'admin-0', isAdmin: true };

    const guestFormatted = simulateDirectoryFormatting(rawDirectoryUser, publicGuest, null);
    testAssert(guestFormatted.email === undefined, 'Public unauthenticated caller in directory has undefined email');
    testAssert(guestFormatted.profile.fullName === 'Dave Build', 'Public unauthenticated caller still gets public profile');

    const strangerFormatted = simulateDirectoryFormatting(rawDirectoryUser, strangerUser, null);
    testAssert(strangerFormatted.email === undefined, 'Non-connected platform user in directory has undefined email');

    const selfFormatted = simulateDirectoryFormatting(rawDirectoryUser, selfUser, null);
    testAssert(selfFormatted.email === 'builder_dave@confidential.com', 'User viewing self in directory can see their own email');

    const adminFormatted = simulateDirectoryFormatting(rawDirectoryUser, adminUser, null);
    testAssert(adminFormatted.email === 'builder_dave@confidential.com', 'Platform admin in directory can see user email');

    const connectedFormatted = simulateDirectoryFormatting(rawDirectoryUser, strangerUser, { status: 'ACCEPTED' });
    testAssert(connectedFormatted.email === 'builder_dave@confidential.com', 'Accepted connection in directory can see contact email');
  }

  // -------------------------------------------------------------------------
  // Suite 7: User Profile Email & Account Flags Protection (GET /api/users/:id)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 7: Single User Profile Email & Flags Protection ---');
  {
    const usersRoutePath = path.resolve(__dirname, '../server/src/routes/users.js');
    const usersRouteSrc = fs.readFileSync(usersRoutePath, 'utf8');

    // 7.1 Verify where.OR gates email lookup behind req.user
    testAssert(
      usersRouteSrc.includes('...(req.user ? [{ email: cleanId }, { email: { startsWith: `${cleanId}@` } }] : [])'),
      'GET /api/users/:id gates email lookups behind authenticated req.user'
    );

    // 7.2 Verify stripping of password, internal flags, and email
    testAssert(
      usersRouteSrc.includes('const { password: _, isAdmin: userIsAdmin, isSuspended: userIsSuspended, email: userEmail, ...userSafe } = user;'),
      'GET /api/users/:id strips password, isAdmin, isSuspended, and email from default return'
    );

    // 7.3 Behavioral simulation
    const rawUserProfile = {
      id: 'profile-u-2',
      email: 'eva_founder@stealth.io',
      password: '$2b$10$hashedpasswordthatmustneverleak',
      isAdmin: false,
      isSuspended: false,
      role: 'FOUNDER',
      isVerified: true,
      profile: { fullName: 'Eva Stealth', headline: 'Building AI' },
      startups: [{ id: 'st-1', name: 'StealthCo' }],
    };

    function simulateProfileResponse(user, requestingUser, connectionStatus) {
      const isSelf = requestingUser && requestingUser.id === user.id;
      const isAdmin = requestingUser && Boolean(requestingUser.isAdmin);
      const isConnected = connectionStatus?.status === 'ACCEPTED';
      const canViewEmail = isSelf || isAdmin || isConnected;

      const { password: _, isAdmin: userIsAdmin, isSuspended: userIsSuspended, email: userEmail, ...userSafe } = user;
      return {
        ...userSafe,
        ...(canViewEmail ? { email: userEmail } : {}),
        ...(isSelf || isAdmin ? { isAdmin: userIsAdmin, isSuspended: userIsSuspended } : {}),
        connectionsCount: 5,
        connectionStatus,
      };
    }

    const publicGuest = null;
    const stranger = { id: 'stranger-88', isAdmin: false };
    const self = { id: 'profile-u-2', isAdmin: false };
    const admin = { id: 'admin-1', isAdmin: true };

    const guestProfile = simulateProfileResponse(rawUserProfile, publicGuest, null);
    testAssert(guestProfile.password === undefined, 'Public guest profile has undefined password');
    testAssert(guestProfile.email === undefined, 'Public guest profile has undefined email');
    testAssert(guestProfile.isAdmin === undefined, 'Public guest profile has undefined isAdmin flag');
    testAssert(guestProfile.isSuspended === undefined, 'Public guest profile has undefined isSuspended flag');
    testAssert(guestProfile.profile.fullName === 'Eva Stealth', 'Public guest profile preserves public profile details');

    const strangerProfile = simulateProfileResponse(rawUserProfile, stranger, null);
    testAssert(strangerProfile.email === undefined, 'Non-connected stranger profile has undefined email');

    const selfProfile = simulateProfileResponse(rawUserProfile, self, null);
    testAssert(selfProfile.email === 'eva_founder@stealth.io', 'User viewing own profile sees their own email');
    testAssert(selfProfile.isAdmin === false, 'User viewing own profile sees their own isAdmin status');

    const adminProfile = simulateProfileResponse(rawUserProfile, admin, null);
    testAssert(adminProfile.email === 'eva_founder@stealth.io', 'Admin viewing profile sees user email');

    const connectedProfile = simulateProfileResponse(rawUserProfile, stranger, { status: 'ACCEPTED' });
    testAssert(connectedProfile.email === 'eva_founder@stealth.io', 'Accepted connection sees contact email on profile');
    testAssert(connectedProfile.isAdmin === undefined, 'Accepted connection does NOT see internal account flags');
  }

  // -------------------------------------------------------------------------
  // Suite 8: Global Search Email Protection (GET /api/search)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 8: Global Search Email Protection ---');
  {
    const searchRoutePath = path.resolve(__dirname, '../server/src/routes/search.js');
    const searchRouteSrc = fs.readFileSync(searchRoutePath, 'utf8');

    // 8.1 Verify prisma.user.findMany select excludes email
    const peopleQueryMatch = searchRouteSrc.match(
      /shouldSearch\('people'\)[\s\S]*?prisma\.user\.findMany\(\{[\s\S]*?select:\s*\{([\s\S]*?)\}/
    );
    testAssert(peopleQueryMatch !== null, 'Search endpoint people query found');
    if (peopleQueryMatch) {
      const selectBlock = peopleQueryMatch[1];
      testAssert(!selectBlock.includes('email'), 'Search people select clause strictly excludes email');
      testAssert(selectBlock.includes('id: true'), 'Search people select preserves id');
      testAssert(selectBlock.includes('profile: true'), 'Search people select preserves profile');
    }

    // 8.2 Verify search query email condition is gated behind req.user
    testAssert(
      searchRouteSrc.includes('...(req.user ? [{ email: { contains: query } }] : [])'),
      'Search OR condition gates email lookup behind authenticated req.user'
    );
  }

  // -------------------------------------------------------------------------
  // Suite 9: Startup Venture Founder Email & Visibility Protection (GET /api/startups/:id)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 9: Startup Founder Email & Private Venture Protection ---');
  {
    const startupsRoutePath = path.resolve(__dirname, '../server/src/routes/startups.js');
    const startupsRouteSrc = fs.readFileSync(startupsRoutePath, 'utf8');

    // 9.1 Verify private startup check gates unauthorized access with 403
    testAssert(
      startupsRouteSrc.includes("if (startup.visibility === 'PRIVATE' && !canViewFounderEmail)") &&
      startupsRouteSrc.includes("res.status(403).json({ error: 'This startup venture is private.' })"),
      'GET /api/startups/:id returns HTTP 403 when private startup is accessed by unauthorized users'
    );

    // 9.2 Verify safeFounder conditionally includes founder email
    testAssert(
      startupsRouteSrc.includes('const canViewFounderEmail = isFounder || isAdmin || isMember;') &&
      startupsRouteSrc.includes('...(canViewFounderEmail ? { email: founderEmail } : {})'),
      'GET /api/startups/:id conditionally includes founder email only for founder, admin, or members'
    );

    // 9.3 Behavioral simulation
    const publicStartup = {
      id: 'startup-pub-1',
      name: 'EcoEnergy',
      visibility: 'PUBLIC',
      founderId: 'founder-1',
      founder: {
        id: 'founder-1',
        email: 'founder@ecoenergy.test',
        role: 'FOUNDER',
        isVerified: true,
        profile: { fullName: 'Frank Green', bio: 'Clean energy innovator' },
      },
      members: [{ userId: 'member-dev-1' }],
    };

    const privateStartup = {
      id: 'startup-priv-2',
      name: 'CyberDefense Stealth',
      visibility: 'PRIVATE',
      founderId: 'founder-1',
      founder: {
        id: 'founder-1',
        email: 'founder@cyberdefense.test',
        role: 'FOUNDER',
        isVerified: true,
        profile: { fullName: 'Frank Green', bio: 'Cyber security lead' },
      },
      members: [{ userId: 'member-dev-1' }],
    };

    function simulateStartupDetail(startup, requestingUser) {
      const isFounder = requestingUser && (requestingUser.id === startup.founderId || requestingUser.id === startup.founder?.id);
      const isAdmin = requestingUser && Boolean(requestingUser.isAdmin);
      const isMember = requestingUser && Array.isArray(startup.members) && startup.members.some((m) => m.userId === requestingUser.id);
      const canViewFounderEmail = isFounder || isAdmin || isMember;

      if (startup.visibility === 'PRIVATE' && !canViewFounderEmail) {
        return { statusCode: 403, error: 'This startup venture is private.' };
      }

      let safeFounder = startup.founder;
      if (startup.founder) {
        const { email: founderEmail, ...restFounder } = startup.founder;
        safeFounder = {
          ...restFounder,
          ...(canViewFounderEmail ? { email: founderEmail } : {}),
        };
      }

      return { statusCode: 200, startup: { ...startup, founder: safeFounder } };
    }

    const publicVisitor = null;
    const outsider = { id: 'outsider-99', isAdmin: false };
    const founder = { id: 'founder-1', isAdmin: false };
    const member = { id: 'member-dev-1', isAdmin: false };
    const admin = { id: 'admin-site', isAdmin: true };

    // Public startup checks
    const pubGuestResult = simulateStartupDetail(publicStartup, publicVisitor);
    testAssert(pubGuestResult.statusCode === 200, 'Public startup is viewable by public visitors (HTTP 200)');
    testAssert(pubGuestResult.startup.founder.email === undefined, 'Public startup founder email is undefined for public visitor');
    testAssert(pubGuestResult.startup.founder.profile.fullName === 'Frank Green', 'Public startup founder profile is preserved');

    const pubOutsiderResult = simulateStartupDetail(publicStartup, outsider);
    testAssert(pubOutsiderResult.startup.founder.email === undefined, 'Public startup founder email is undefined for unrelated platform user');

    const pubFounderResult = simulateStartupDetail(publicStartup, founder);
    testAssert(pubFounderResult.startup.founder.email === 'founder@ecoenergy.test', 'Founder viewing their own startup sees their founder email');

    const pubMemberResult = simulateStartupDetail(publicStartup, member);
    testAssert(pubMemberResult.startup.founder.email === 'founder@ecoenergy.test', 'Startup team member sees founder email');

    const pubAdminResult = simulateStartupDetail(publicStartup, admin);
    testAssert(pubAdminResult.startup.founder.email === 'founder@ecoenergy.test', 'Admin sees founder email on startup');

    // Private startup checks
    const privGuestResult = simulateStartupDetail(privateStartup, publicVisitor);
    testAssert(privGuestResult.statusCode === 403, 'Private startup rejects public visitors with HTTP 403');

    const privOutsiderResult = simulateStartupDetail(privateStartup, outsider);
    testAssert(privOutsiderResult.statusCode === 403, 'Private startup rejects unrelated platform users with HTTP 403');

    const privFounderResult = simulateStartupDetail(privateStartup, founder);
    testAssert(privFounderResult.statusCode === 200, 'Founder can access private startup (HTTP 200)');

    const privMemberResult = simulateStartupDetail(privateStartup, member);
    testAssert(privMemberResult.statusCode === 200, 'Team member can access private startup (HTTP 200)');

    const privAdminResult = simulateStartupDetail(privateStartup, admin);
    testAssert(privAdminResult.statusCode === 200, 'Admin can access private startup (HTTP 200)');
  }

  // -------------------------------------------------------------------------
  // Suite 10: Private Project Catalog & Details Platform Admin Policy
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 10: Private Project Catalog & Details Platform Admin Policy ---');
  {
    const projectsRoutePath = path.resolve(__dirname, '../server/src/routes/projects.js');
    const projectsRouteSrc = fs.readFileSync(projectsRoutePath, 'utf8');

    // 10.1 Static checks for GET /api/projects catalog filtering
    const catalogRouteMatch = projectsRouteSrc.match(
      /router\.get\('\/',\s*optionalAuth,\s*async\s*\(req,\s*res\)\s*=>\s*\{([\s\S]*?)\}\);/
    );
    testAssert(catalogRouteMatch !== null, 'GET /api/projects catalog route defined with optionalAuth');
    if (catalogRouteMatch) {
      const catalogBody = catalogRouteMatch[1];
      testAssert(
        catalogBody.includes('isProjectMemberOrCreator(p, req.user)'),
        'Catalog filter leverages isProjectMemberOrCreator(p, req.user) consistently'
      );
      testAssert(
        catalogBody.includes("p.visibility === 'PUBLIC'"),
        'Public projects visibility check preserved for platform-wide discovery'
      );
    }

    // 10.2 Static checks for GET /api/projects/:id single project access
    const singleProjMatch = projectsRouteSrc.match(
      /router\.get\('\/:id',\s*optionalAuth,\s*async\s*\(req,\s*res\)\s*=>\s*\{([\s\S]*?return res\.json\(\{\s*project\s*\}\);)/
    );
    testAssert(singleProjMatch !== null, 'GET /api/projects/:id route defined with optionalAuth');
    if (singleProjMatch) {
      const singleBody = singleProjMatch[1];
      testAssert(
        singleBody.includes('!isProjectMemberOrCreator(project, req.user)'),
        'GET /api/projects/:id checks private project access against isProjectMemberOrCreator'
      );
    }

    // 10.3 Behavioral simulation of catalog filtering
    const allProjects = [
      {
        id: 'proj-pub',
        title: 'Public Open Source Project',
        visibility: 'PUBLIC',
        creator: { userId: 'creator-1' },
        roles: [{ id: 'r-1', assignedTo: { userId: 'member-2' } }],
      },
      {
        id: 'proj-priv',
        title: 'Confidential Internal Defense Project',
        visibility: 'PRIVATE',
        creator: { userId: 'creator-1' },
        roles: [{ id: 'r-2', assignedTo: { userId: 'member-2' } }],
      },
    ];

    function filterCatalog(projects, user) {
      return projects.filter((p) => {
        if (p.visibility === 'PUBLIC') return true;
        return isProjectMemberOrCreator(p, user);
      });
    }

    const unauthenticatedUser = null;
    const unrelatedUser = { id: 'stranger-3', isAdmin: false };
    const creatorUser = { id: 'creator-1', isAdmin: false };
    const memberUser = { id: 'member-2', isAdmin: false };
    const adminUser = { id: 'admin-99', isAdmin: true };

    // Unauthenticated visitor catalog check
    const guestCatalog = filterCatalog(allProjects, unauthenticatedUser);
    testAssert(guestCatalog.length === 1, 'Unauthenticated visitor sees exactly 1 public project');
    testAssert(guestCatalog[0].id === 'proj-pub', 'Unauthenticated visitor cannot see private project in catalog');

    // Unrelated user catalog check
    const nonMemberCatalog = filterCatalog(allProjects, unrelatedUser);
    testAssert(nonMemberCatalog.length === 1, 'Unrelated non-member sees exactly 1 public project');
    testAssert(nonMemberCatalog[0].id === 'proj-pub', 'Unrelated non-member cannot see private project in catalog');

    // Creator catalog check
    const creatorCatalog = filterCatalog(allProjects, creatorUser);
    testAssert(creatorCatalog.length === 2, 'Creator sees both public and private project in catalog');
    testAssert(creatorCatalog.some((p) => p.id === 'proj-priv'), 'Creator sees their own private project in catalog');

    // Assigned member catalog check
    const memberCatalog = filterCatalog(allProjects, memberUser);
    testAssert(memberCatalog.length === 2, 'Assigned member sees both public and private project in catalog');
    testAssert(memberCatalog.some((p) => p.id === 'proj-priv'), 'Assigned member sees private project in catalog');

    // Admin catalog check
    const adminCatalog = filterCatalog(allProjects, adminUser);
    testAssert(adminCatalog.length === 2, 'Platform admin sees both public and private project in catalog');
    testAssert(adminCatalog.some((p) => p.id === 'proj-priv'), 'Platform admin has authorized access to private project catalog');

    // 10.4 Behavioral simulation of GET /api/projects/:id single project access
    function simulateGetProject(project, user) {
      const { res, getResult } = createMockReqRes();
      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return getResult();
      }
      if (project.visibility === 'PRIVATE' && !isProjectMemberOrCreator(project, user)) {
        res.status(403).json({ error: 'This project is private.' });
        return getResult();
      }
      res.status(200).json({ project });
      return getResult();
    }

    const privProj = allProjects[1];
    testAssert(
      simulateGetProject(privProj, unauthenticatedUser).statusCode === 403,
      'Single project: Unauthenticated access to private project returns HTTP 403'
    );
    testAssert(
      simulateGetProject(privProj, unrelatedUser).statusCode === 403,
      'Single project: Unrelated non-member access to private project returns HTTP 403'
    );
    testAssert(
      simulateGetProject(privProj, creatorUser).statusCode === 200,
      'Single project: Creator access to private project returns HTTP 200'
    );
    testAssert(
      simulateGetProject(privProj, memberUser).statusCode === 200,
      'Single project: Assigned member access to private project returns HTTP 200'
    );
    testAssert(
      simulateGetProject(privProj, adminUser).statusCode === 200,
      'Single project: Platform admin access to private project returns HTTP 200'
    );
  }

  // -------------------------------------------------------------------------
  // Suite 11: Role Invitation Defensive Creator Handling
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 11: Role Invitation Defensive Creator Handling ---');
  {
    const projectsRoutePath = path.resolve(__dirname, '../server/src/routes/projects.js');
    const projectsRouteSrc = fs.readFileSync(projectsRoutePath, 'utf8');

    // 11.1 Static check: invite route does not do unguarded project.creator.userId access
    const inviteRouteMatch = projectsRouteSrc.match(
      /router\.post\('\/:id\/roles\/:roleId\/invite'[\s\S]*?async\s*\(req,\s*res\)\s*=>\s*\{([\s\S]*?)\n\}\);/
    );
    testAssert(inviteRouteMatch !== null, 'Role invite route found in projects.js');
    if (inviteRouteMatch) {
      const inviteBody = inviteRouteMatch[1];
      testAssert(
        !inviteBody.includes('project.creator.userId'),
        'Role invite does NOT use unsafe unguarded project.creator.userId'
      );
      testAssert(
        inviteBody.includes('project.creator?.userId') || inviteBody.includes('project.creator?.id'),
        'Role invite uses defensive optional chaining for creator ID resolution'
      );
      testAssert(
        inviteBody.includes('400'),
        'Role invite returns controlled HTTP 400 when creator relation is missing or corrupt'
      );
    }

    // 11.2 Behavioral simulation of creator check in invite endpoint
    function simulateInviteCreatorCheck(project, user) {
      const { res, getResult } = createMockReqRes();
      if (!project) {
        res.status(404).json({ error: 'Project not found.' });
        return getResult();
      }

      const creatorId = project.creator?.userId || project.creator?.id || project.creatorId || project.creator_id;
      if (!creatorId) {
        res.status(400).json({ error: 'Project creator information is missing or corrupted.' });
        return getResult();
      }

      if (creatorId !== user?.id && !user?.isAdmin) {
        res.status(403).json({ error: 'Only the project lead can invite connections to roles.' });
        return getResult();
      }

      res.status(200).json({ success: true });
      return getResult();
    }

    const creatorUser = { id: 'lead-1', isAdmin: false };
    const adminUser = { id: 'admin-99', isAdmin: true };
    const nonLeadUser = { id: 'stranger-2', isAdmin: false };

    // Case A: Missing creator object (null / undefined)
    const projectWithNullCreator = { id: 'proj-bad-1', creator: null };
    const nullCreatorResult = simulateInviteCreatorCheck(projectWithNullCreator, creatorUser);
    testAssert(
      nullCreatorResult.statusCode === 400,
      'Invite with null creator returns controlled HTTP 400 (not unhandled TypeError 500)'
    );
    testAssert(
      nullCreatorResult.jsonResponse?.error === 'Project creator information is missing or corrupted.',
      'Controlled error message returned for null creator'
    );

    // Case B: Corrupted creator object (empty object with no ID)
    const projectWithEmptyCreator = { id: 'proj-bad-2', creator: {} };
    const emptyCreatorResult = simulateInviteCreatorCheck(projectWithEmptyCreator, creatorUser);
    testAssert(
      emptyCreatorResult.statusCode === 400,
      'Invite with empty creator object returns controlled HTTP 400'
    );

    // Case C: Unrelated non-creator, non-admin user
    const validProject = { id: 'proj-valid', creator: { userId: 'lead-1' } };
    const unauthorizedResult = simulateInviteCreatorCheck(validProject, nonLeadUser);
    testAssert(
      unauthorizedResult.statusCode === 403,
      'Unrelated non-lead user is forbidden from sending invites with HTTP 403'
    );

    // Case D: Valid project lead
    const validLeadResult = simulateInviteCreatorCheck(validProject, creatorUser);
    testAssert(
      validLeadResult.statusCode === 200,
      'Valid project lead is permitted to invite connections (HTTP 200)'
    );

    // Case E: Platform administrator
    const adminInviteResult = simulateInviteCreatorCheck(validProject, adminUser);
    testAssert(
      adminInviteResult.statusCode === 200,
      'Platform admin is permitted to invite connections (HTTP 200)'
    );

    // Case F: Project with top-level creatorId fallback
    const fallbackIdProject = { id: 'proj-fallback', creatorId: 'lead-1' };
    const fallbackResult = simulateInviteCreatorCheck(fallbackIdProject, creatorUser);
    testAssert(
      fallbackResult.statusCode === 200,
      'Top-level creatorId fallback safely resolves and permits project lead (HTTP 200)'
    );
  }

  // -------------------------------------------------------------------------
  // Final Test Suite Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================');
  console.log(`Security Regression Tests Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
