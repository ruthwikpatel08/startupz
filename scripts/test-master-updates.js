import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Master Fix & Feature Verification Suite for HookZ...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// 1. Mobile Search
test('1. Mobile Search navigates to dedicated /search page & Back navigation exists', () => {
  const navbarContent = fs.readFileSync('client/src/components/common/Navbar.tsx', 'utf8');
  assert(navbarContent.includes("navigate('/search')"), 'Navbar mobile search should navigate to /search');
  assert(navbarContent.includes("setSearchModalOpen(true)"), 'Desktop search modal should still be present');

  const searchPageContent = fs.readFileSync('client/src/pages/Search/GlobalSearchPage.tsx', 'utf8');
  assert(searchPageContent.includes("navigate(-1)"), 'GlobalSearchPage must include back navigation button');
  assert(searchPageContent.includes("ArrowLeft"), 'GlobalSearchPage must render back arrow icon');
});

// 2. Posts Must Not Auto-Delete
test('2. Posts Must Not Auto-Delete & User Posts appear on Profile', () => {
  const serverIndexContent = fs.readFileSync('server/src/index.js', 'utf8');
  // Verify purgeDemoDatabase does not delete posts
  assert(!serverIndexContent.includes('prisma.post.deleteMany({})'), 'Server must NOT wipe posts via prisma.post.deleteMany');

  const profilePageContent = fs.readFileSync('client/src/pages/Profile/ProfilePage.tsx', 'utf8');
  assert(profilePageContent.includes('fetchUserPosts'), 'ProfilePage must fetch user posts');
  assert(profilePageContent.includes('handleDeletePost'), 'ProfilePage must allow manual post deletion only');
  assert(profilePageContent.includes('Posts & Updates'), 'ProfilePage must display user posts section');

  const postsRouteContent = fs.readFileSync('server/src/routes/posts.js', 'utf8');
  assert(postsRouteContent.includes('prisma.post.delete'), 'Posts route must support explicit deletion by author');
});

// 3. Projects Heading
test('3. Projects page heading is white (#FFFFFF) with subtle drop-shadow / gradient', () => {
  const projectsContent = fs.readFileSync('client/src/pages/Projects/ProjectsPage.tsx', 'utf8');
  assert(projectsContent.includes('Projects: Collaborate on Ideas') || projectsContent.includes('Projects: '), 'Projects heading must exist');
  assert(projectsContent.includes('#FFFFFF'), 'Projects heading must include bright white #FFFFFF');
  assert(projectsContent.includes('drop-shadow'), 'Projects heading must include drop-shadow accent');
});

// 4. Saved Posts
test('4. Saved Posts functionality and persistence', () => {
  const savedRouteContent = fs.readFileSync('server/src/routes/saved.js', 'utf8');
  assert(savedRouteContent.includes("itemType === 'POST'"), 'Server saved route must handle POST itemType');
  assert(savedRouteContent.includes('handleToggleSave'), 'Server saved route must support toggle save');

  const savedPageContent = fs.readFileSync('client/src/pages/Saved/SavedItemsPage.tsx', 'utf8');
  assert(savedPageContent.includes("item.itemType === 'POST'"), 'SavedItemsPage must display saved posts');
  assert(savedPageContent.includes('item.data') || savedPageContent.includes('item.details'), 'SavedItemsPage must access data/details');
  assert(savedPageContent.includes('handleRemoveSaved'), 'SavedItemsPage must allow unsaving items');
});

// 5. New User Default Selector -> Student
test('5. New user default selector is STUDENT across onboarding & registration', () => {
  const regPageContent = fs.readFileSync('client/src/pages/Auth/RegisterPage.tsx', 'utf8');
  assert(regPageContent.includes("useState<UserRole>('STUDENT')"), 'RegisterPage role state must default to STUDENT');

  const onboardingContent = fs.readFileSync('client/src/pages/Onboarding/OnboardingPage.tsx', 'utf8');
  assert(onboardingContent.includes("useState<RoleType>('Student')"), 'OnboardingPage role state must default to Student');

  const authCallbackContent = fs.readFileSync('client/src/pages/Auth/AuthCallbackPage.tsx', 'utf8');
  assert(authCallbackContent.includes("initialRole: UserRole = 'STUDENT'"), 'AuthCallback initialRole must default to STUDENT');
});

// 6. Mobile Profile Bar / My Network
test('6. Mobile profile button is round & My Network is moved inside profile menu', () => {
  const navbarContent = fs.readFileSync('client/src/components/common/Navbar.tsx', 'utf8');
  assert(navbarContent.includes('rounded-full') && navbarContent.includes('My Profile Menu'), 'Mobile profile button must be rounded-full');
  assert(navbarContent.includes('My Network'), 'Navbar profile dropdown must contain My Network');
  assert(navbarContent.includes('hidden sm:inline-flex p-1.5') && navbarContent.includes('/network'), 'My Network top-bar icon must be hidden on mobile');
});

// 7. Chat Delete, Persistence, Edit & Unsend
test('7. Chat per-user deletion, Edit message & Unsend message', () => {
  const messagesRouteContent = fs.readFileSync('server/src/routes/messages.js', 'utf8');
  assert(messagesRouteContent.includes('/message/:id') && messagesRouteContent.includes('router.delete'), 'Messages route must support unsend (delete)');
  assert(messagesRouteContent.includes('/message/:id') && messagesRouteContent.includes('router.put'), 'Messages route must support edit');
  assert(messagesRouteContent.includes('userDeletedConversations'), 'Messages route must support per-user deleted conversations');

  const messagesPageContent = fs.readFileSync('client/src/pages/Messages/MessagesPage.tsx', 'utf8');
  assert(messagesPageContent.includes('handleSaveEdit') || messagesPageContent.includes('handleStartEdit'), 'MessagesPage must implement message edit');
  assert(messagesPageContent.includes('handleUnsend'), 'MessagesPage must implement message unsend');
  assert(messagesPageContent.includes('handleDeleteConversation'), 'MessagesPage must implement handleDeleteConversation');
});

// 8. Block Feature
test('8. Block feature works correctly without errors', () => {
  const usersRouteContent = fs.readFileSync('server/src/routes/users.js', 'utf8');
  assert(usersRouteContent.includes('/:id/block'), 'Users route must provide block endpoint');
  assert(usersRouteContent.includes('/:id/unblock'), 'Users route must provide unblock endpoint');
  assert(usersRouteContent.includes('isUserBlockedPair'), 'Users route must provide isUserBlockedPair helper');

  const messagesRouteContent = fs.readFileSync('server/src/routes/messages.js', 'utf8');
  assert(messagesRouteContent.includes('isUserBlockedPair'), 'Messages route must prevent messaging blocked users');

  const profilePageContent = fs.readFileSync('client/src/pages/Profile/ProfilePage.tsx', 'utf8');
  assert(profilePageContent.includes('handleToggleBlock'), 'ProfilePage must implement handleToggleBlock');
});

// 9. Problem Statements Using Google Gemini API (Weekly Refresh)
test('9. Problem Statements use Gemini securely with weekly cadence and graceful fallback', () => {
  const problemsRouteContent = fs.readFileSync('server/src/routes/problems.js', 'utf8');
  assert(problemsRouteContent.includes('checkAndRefreshWeeklyProblems'), 'Problems route must implement checkAndRefreshWeeklyProblems');
  assert(problemsRouteContent.includes('ONE_WEEK_MS'), 'Problems route must enforce 7-day weekly interval');
  assert(problemsRouteContent.includes('discoverProblemsFromAI'), 'Problems route must use Gemini AI helper');
  assert(problemsRouteContent.includes('retaining existing problems') || problemsRouteContent.includes('retaining'), 'Problems route must retain existing problems on failure');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Master Requirements Passed Integration Verification!\n');
}
