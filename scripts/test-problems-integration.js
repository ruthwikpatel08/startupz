const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Full-Spectrum Integration Tests for World-wide Problem Statements...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      failed++;
    }
  }

  // 1. Health Check
  console.log('1. Health Check & Diagnostics');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  assert(health.status === 'ok', 'Server health is ok');

  // 2. Metadata
  console.log('\n2. Problem Metadata');
  const metaRes = await fetch(`${BASE_URL}/problems/meta`);
  const meta = await metaRes.json();
  assert(Array.isArray(meta.categories) && meta.categories.length >= 10, `Found ${meta.categories?.length} categories`);
  assert(Array.isArray(meta.regions) && meta.regions.length >= 9, `Found ${meta.regions?.length} regions`);
  assert(meta.totalProblems >= 10, `Found ${meta.totalProblems} total seeded problems`);

  // 3. Problem Listing & Search
  console.log('\n3. Problem Listing & Full-Text Search');
  const listRes = await fetch(`${BASE_URL}/problems`);
  const listData = await listRes.json();
  assert(listData.problems.length >= 10, `Listing returned ${listData.problems.length} problems`);

  const firstProblem = listData.problems[0];
  assert(firstProblem.id && firstProblem.title && firstProblem.description, 'First problem has id, title, and description');
  assert(Array.isArray(firstProblem.categories) && firstProblem.categories.length > 0, 'Problem has categories');
  assert(firstProblem.impactLevel >= 1 && firstProblem.impactLevel <= 10, `Valid impact level: ${firstProblem.impactLevel}`);

  // Test Search Filter
  const searchRes = await fetch(`${BASE_URL}/problems?search=water`);
  const searchData = await searchRes.json();
  assert(searchData.problems.some(p => p.title.toLowerCase().includes('water') || p.description.toLowerCase().includes('water')), 'Search by "water" returned matching problems');

  // Test Category Filter
  const catRes = await fetch(`${BASE_URL}/problems?category=Environment/Climate`);
  const catData = await catRes.json();
  assert(catData.problems.every(p => p.categories.includes('Environment/Climate')), 'Category filter returns only matching problems');

  // 4. Problem Details
  console.log('\n4. Problem Detail by ID');
  const detailRes = await fetch(`${BASE_URL}/problems/${firstProblem.id}`);
  const detail = await detailRes.json();
  assert(detail.id === firstProblem.id, `Detail ID matches: ${detail.id}`);
  assert(detail.sourceUrl && detail.sourceUrl.startsWith('http'), `Has official citation source URL: ${detail.sourceUrl}`);
  assert(detail.creator && detail.creator.email, `Problem has creator info: ${detail.creator.email}`);

  // 5. AI Solutions Generation
  console.log('\n5. Server-Side AI Solutions Generation');
  const aiSolRes = await fetch(`${BASE_URL}/problems/${firstProblem.id}/analyze?type=solutions`, { method: 'POST' });
  const aiSol = await aiSolRes.json();
  assert(Array.isArray(aiSol.ideas) && aiSol.ideas.length >= 2, `AI generated ${aiSol.ideas?.length} startup ideas`);
  assert(aiSol.ideas[0].title && aiSol.ideas[0].description, 'AI idea has title and description');
  assert(Array.isArray(aiSol.needed_skills) && aiSol.needed_skills.length > 0, `AI identified required skill roles: ${aiSol.needed_skills?.join(', ')}`);

  // 6. AI Auto-Categorize & Tag
  console.log('\n6. AI Auto-Categorize & Tag Helper');
  const catAiRes = await fetch(`${BASE_URL}/problems/categorize-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Ocean Plastic Cleanup System',
      description: 'Microplastics and ocean plastics are accumulating in marine gyres and coastal waterways, destroying aquatic ecosystems.',
    }),
  });
  const catAi = await catAiRes.json();
  assert(Array.isArray(catAi.categories) && catAi.categories.length > 0, `AI detected categories: ${catAi.categories?.join(', ')}`);
  assert(Array.isArray(catAi.tags) && catAi.tags.length > 0, `AI suggested tags: ${catAi.tags?.join(', ')}`);

  // 7. Authentication & Admin Authorization
  console.log('\n7. Auth & Admin Access Control');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@startupz.com',
      password: 'Password123!',
    }),
  });
  const adminAuth = await adminLoginRes.json();
  assert(adminAuth.token && adminAuth.user?.isAdmin, 'Admin logged in successfully with admin privileges');
  const adminToken = adminAuth.token;

  // Non-admin login
  const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah.chen@aiagri.io',
      password: 'Password123!',
    }),
  });
  const userAuth = await userLoginRes.json();
  assert(userAuth.token && !userAuth.user?.isAdmin, 'Regular user logged in (non-admin)');
  const userToken = userAuth.token;

  // 8. AI Profile Matching with Auth
  console.log('\n8. AI User-Problem Profile Match');
  const matchRes = await fetch(`${BASE_URL}/problems/${firstProblem.id}/analyze?type=match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const matchData = await matchRes.json();
  assert(typeof matchData.matchScore === 'number' && matchData.matchScore >= 0 && matchData.matchScore <= 100, `Match score calculated: ${matchData.matchScore}%`);
  assert(typeof matchData.reason === 'string' && matchData.reason.length > 10, `AI reasoning: ${matchData.reason.slice(0, 60)}...`);

  // 9. Save / Bookmark Integration
  console.log('\n9. Save & Bookmark Problem Statement');
  const saveRes = await fetch(`${BASE_URL}/saved/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      itemType: 'PROBLEM',
      itemId: firstProblem.id,
    }),
  });
  const saveData = await saveRes.json();
  assert(saveData.saved === true, 'Problem bookmarked successfully');

  // Verify in GET /api/saved
  const getSavedRes = await fetch(`${BASE_URL}/saved?itemType=PROBLEM`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const savedList = await getSavedRes.json();
  assert(savedList.savedItems?.some(s => s.itemId === firstProblem.id && s.itemType === 'PROBLEM'), 'Saved problem statement appears in user saved items');

  // Untoggle save
  const unsaveRes = await fetch(`${BASE_URL}/saved/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      itemType: 'PROBLEM',
      itemId: firstProblem.id,
    }),
  });
  const unsaveData = await unsaveRes.json();
  assert(unsaveData.saved === false, 'Problem unbookmarked successfully');

  // 10. Admin CRUD Operations & Security Enforcement
  console.log('\n10. Admin CRUD & Security Validation');

  // Non-admin attempting to create a problem statement -> MUST BE 403
  const forbiddenCreate = await fetch(`${BASE_URL}/problems`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      title: 'Hacked Problem Statement',
      description: 'Non-admin trying to post without administrative privileges.',
      categories: ['Technology & Innovation'],
    }),
  });
  assert(forbiddenCreate.status === 403, `Non-admin blocked with HTTP ${forbiddenCreate.status} (Forbidden)`);

  // Admin creating a new problem
  const adminCreate = await fetch(`${BASE_URL}/problems`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Combat Marine Plastic Waste in Coastal Regions',
      description: 'Over 14 million tons of plastic enter oceans every year, harming marine life and contaminating food chains with microplastics. Decentralized enzymatic recycling and biodegradable packaging alternatives are needed.',
      categories: ['Environment/Climate', 'Technology & Innovation'],
      regions: ['Global', 'Southeast Asia'],
      tags: ['Ocean Plastic', 'Recycling', 'Marine Life', 'SDG 14'],
      impactLevel: 9,
      sourceUrl: 'https://www.unep.org/plastic-pollution',
    }),
  });
  assert(adminCreate.status === 201, `Admin successfully created problem (HTTP 201)`);
  const createdProblem = await adminCreate.json();
  assert(createdProblem.title === 'Combat Marine Plastic Waste in Coastal Regions', 'Created problem has correct title');

  // Admin updating the problem
  const adminUpdate = await fetch(`${BASE_URL}/problems/${createdProblem.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Combat Marine Plastic Waste & Microplastics in Oceans',
      impactLevel: 10,
    }),
  });
  assert(adminUpdate.status === 200, `Admin successfully updated problem (HTTP 200)`);
  const updatedProblem = await adminUpdate.json();
  assert(updatedProblem.impactLevel === 10, 'Updated impact level verified');

  // Admin deleting the problem
  const adminDelete = await fetch(`${BASE_URL}/problems/${createdProblem.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDelete.status === 200, `Admin successfully deleted problem (HTTP 200)`);

  // Verify it no longer exists
  const checkDeleted = await fetch(`${BASE_URL}/problems/${createdProblem.id}`);
  assert(checkDeleted.status === 404, 'Verified problem was removed from database (HTTP 404)');

  console.log(`\n========================================`);
  console.log(`🎉 ALL TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
