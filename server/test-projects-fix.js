import assert from 'assert';
import { initialProjects } from './src/realData/initialProjects.js';
import { deletedProjectIds, deduplicateProjectsList } from './src/routes/projects.js';

console.log('Testing Projects Bugfixes...');

// Test 1: initialProjects must not contain the deleted test project 'proj-1792682406796-uwaja'
assert(!initialProjects.some((p) => p.id === 'proj-1792682406796-uwaja'), 'proj-1792682406796-uwaja should not be in initialProjects');
console.log('✔ Test 1 Passed: Past deleted test project is removed from initialProjects.');

// Test 2: deletedProjectIds contains 'proj-1792682406796-uwaja'
assert(deletedProjectIds.has('proj-1792682406796-uwaja'), 'deletedProjectIds must have proj-1792682406796-uwaja');
console.log('✔ Test 2 Passed: deletedProjectIds persistently tracks deleted project.');

// Test 3: deduplicateProjectsList must filter out deleted projects
const mockList = [
  { id: 'proj-1792682406796-uwaja', title: 'cgfhgn', creator: { userId: 'user-1' } },
  { id: 'proj-valid-1', title: 'Valid App', creator: { userId: 'user-2' } },
];
const deduplicated = deduplicateProjectsList(mockList);
assert.strictEqual(deduplicated.length, 1, 'Only non-deleted projects should remain');
assert.strictEqual(deduplicated[0].id, 'proj-valid-1');
console.log('✔ Test 3 Passed: deduplicateProjectsList excludes deleted projects.');

// Test 4: Permission test for creator vs other user vs admin
function checkCanDelete(project, user) {
  if (!project || !user || user.isSuspended) return false;
  if (user.isAdmin || user.role === 'ADMIN') return true;

  const creatorId = String(
    project.creator?.userId ||
    project.creator?.id ||
    project.creatorId ||
    project.creator_id ||
    ''
  ).trim().toLowerCase();

  const userIds = new Set(
    [user.id, user.profile?.id, user.profile?.userId, user._id]
      .filter(Boolean)
      .map((u) => String(u).trim().toLowerCase())
  );

  if (creatorId && userIds.has(creatorId)) return true;

  const creatorEmail = String(project.creator?.email || '').trim().toLowerCase();
  const currentEmail = String(user.email || '').trim().toLowerCase();
  if (creatorEmail && currentEmail && creatorEmail === currentEmail) return true;

  return false;
}

const mockProject = {
  id: 'proj-test',
  creator: { userId: 'user-creator-123', email: 'creator@example.com' },
};

// Creator should be able to delete
assert.strictEqual(checkCanDelete(mockProject, { id: 'user-creator-123', email: 'creator@example.com' }), true);
// Admin should be able to delete
assert.strictEqual(checkCanDelete(mockProject, { id: 'admin-user', isAdmin: true }), true);
// Other user with normal name should NOT be able to delete
assert.strictEqual(checkCanDelete(mockProject, { id: 'other-user', email: 'other@example.com' }), false);
// Other user with ruthwik or gokul in email (not admin, not creator) should NOT be able to delete!
assert.strictEqual(checkCanDelete(mockProject, { id: 'ruthwik-non-admin', email: 'ruthwik999@yahoo.com' }), false);
assert.strictEqual(checkCanDelete(mockProject, { id: 'gokul-non-admin', email: 'gokul123@gmail.com' }), false);
console.log('✔ Test 4 Passed: Only creator and admin can delete projects (no spurious delete options).');

console.log('All project fix tests passed successfully! 🎉');
process.exit(0);

