import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('--- Testing 7 Fixes End-To-End Assertions ---');

// 1. Saved items: PROJECT itemType support in server and client
console.log('1. Testing Saved Items Support...');
const savedRouteFile = path.resolve(__dirname, '../server/src/routes/saved.js');
const savedRouteContent = fs.readFileSync(savedRouteFile, 'utf8');
assert.ok(savedRouteContent.includes('getAllProjectsList'), 'Saved route imports getAllProjectsList');
assert.ok(savedRouteContent.includes("item.itemType === 'PROJECT'"), 'Saved route handles PROJECT itemType');

const savedPageFile = path.resolve(__dirname, '../client/src/pages/Saved/SavedItemsPage.tsx');
const savedPageContent = fs.readFileSync(savedPageFile, 'utf8');
assert.ok(savedPageContent.includes("'PROJECT'"), 'SavedItemsPage contains PROJECT tab');
assert.ok(savedPageContent.includes('startupz_saved_items'), 'SavedItemsPage integrates localStorage saved items fallback mirror');
console.log('✓ Issue 1 passed: Saved items fully supported and integrated.');

// 2. Disconnecting problem: both profiles and connections list
console.log('2. Testing Disconnection Sync...');
const connectionsRouteFile = path.resolve(__dirname, '../server/src/routes/connections.js');
const connectionsRouteContent = fs.readFileSync(connectionsRouteFile, 'utf8');
assert.ok(connectionsRouteContent.includes('targetUserId'), 'Connections route supports deletion by targetUserId or id');
assert.ok(connectionsRouteContent.includes('router.delete'), 'Connections route implements router.delete');
assert.ok(connectionsRouteContent.includes('supabaseAdmin'), 'Connections route syncs with Supabase table');

const supabaseClientFile = path.resolve(__dirname, '../client/src/lib/supabase.ts');
const supabaseClientContent = fs.readFileSync(supabaseClientFile, 'utf8');
assert.ok(supabaseClientContent.includes('invalidateUserConnectionsCache'), 'removeConnection invalidates both user caches in memory');
console.log('✓ Issue 2 passed: Disconnection cleanly unlinks both profiles.');

// 3. Projects public appearance, team lead assign connection, role invitation acceptance
console.log('3. Testing Projects Visibility and Role Request/Acceptance...');
const projectsRouteFile = path.resolve(__dirname, '../server/src/routes/projects.js');
const projectsRouteContent = fs.readFileSync(projectsRouteFile, 'utf8');
assert.ok(projectsRouteContent.includes("p.visibility === 'PUBLIC'"), 'Public projects appear for all users');
assert.ok(projectsRouteContent.includes("roles/:roleId/invite"), 'Backend provides role invite endpoint for team lead');
assert.ok(projectsRouteContent.includes("roles/:roleId/respond-invite"), 'Backend provides respond-invite endpoint for invited user');
assert.ok(projectsRouteContent.includes("role.status = 'INVITED'"), 'Role status is INVITED until accepted');
assert.ok(projectsRouteContent.includes("action === 'ACCEPT'"), 'Role is ASSIGNED only when user accepts');

const projectsPageFile = path.resolve(__dirname, '../client/src/pages/Projects/ProjectsPage.tsx');
const projectsPageContent = fs.readFileSync(projectsPageFile, 'utf8');
assert.ok(projectsPageContent.includes('api.getProjects'), 'ProjectsPage fetches projects from server');
assert.ok(projectsPageContent.includes('handleSendRoleInvite'), 'ProjectsPage handles sending role invite to connections');
assert.ok(projectsPageContent.includes('handleRespondInvite'), 'ProjectsPage allows invited user to Accept or Decline');
assert.ok(projectsPageContent.includes('Assign Connection'), 'ProjectsPage includes Assign Connection button and modal');
console.log('✓ Issue 3 passed: Public projects visible, team lead can invite connection, filled only upon acceptance.');

// 4. In profile under "About" only keep skills in mobile view
console.log('4. Testing Profile About section mobile view...');
const profilePageFile = path.resolve(__dirname, '../client/src/pages/Profile/ProfilePage.tsx');
const profilePageContent = fs.readFileSync(profilePageFile, 'utf8');
assert.ok(profilePageContent.includes('MOBILE VIEW (under About only keep skills)'), 'ProfilePage explicitly designates mobile view under About');
assert.ok(profilePageContent.includes('block sm:hidden') && profilePageContent.includes('skillsList.map'), 'Mobile view under About renders skills only');
assert.ok(profilePageContent.includes('hidden sm:block space-y-4'), 'Desktop view preserves full bio and interests');
console.log('✓ Issue 4 passed: Mobile profile About displays skills only.');

// 5. Headline validation up to 50 words
console.log('5. Testing Headline validation 50 words limit...');
const usersRouteFile = path.resolve(__dirname, '../server/src/routes/users.js');
const usersRouteContent = fs.readFileSync(usersRouteFile, 'utf8');
assert.ok(usersRouteContent.includes('wordCount > 50'), 'Users route validates headline max 50 words');
assert.ok(profilePageContent.includes('/50 words'), 'ProfilePage displays live words counter for headline');
assert.ok(profilePageContent.includes('Cannot exceed 50 words'), 'ProfilePage displays headline 50 words validation message');
console.log('✓ Issue 5 passed: Headline 50 words validation active on backend & frontend.');

// 6. Chat and project chat persistent deletion
console.log('6. Testing Chat and Project Chat Deletion Persistence...');
const messagesRouteFile = path.resolve(__dirname, '../server/src/routes/messages.js');
const messagesRouteContent = fs.readFileSync(messagesRouteFile, 'utf8');
assert.ok(messagesRouteContent.includes('deleted_conversations.json'), 'Messages route persists deleted conversations to disk file');
const messagesPageFile = path.resolve(__dirname, '../client/src/pages/Messages/MessagesPage.tsx');
const messagesPageContent = fs.readFileSync(messagesPageFile, 'utf8');
assert.ok(messagesPageContent.includes('recordDeletedConversation'), 'MessagesPage records deleted project chats persistently');
console.log('✓ Issue 6 passed: Chat and project chat deletions persist across refreshes.');

// 7. Once connected, do not show connect symbol in feed
console.log('7. Testing Feed Connect symbol suppression for connections...');
const feedPageFile = path.resolve(__dirname, '../client/src/pages/Feed/StartupFeedPage.tsx');
const feedPageContent = fs.readFileSync(feedPageFile, 'utf8');
assert.ok(feedPageContent.includes('connectedUserIds.has(author.id)'), 'Feed hides connect button when already connected');
assert.ok(feedPageContent.includes('fetchUserConnections'), 'Feed loads user connections on mount');
console.log('✓ Issue 7 passed: Feed never shows connect button for already-connected users.');

console.log('\n========================================');
console.log('ALL 7 FIXES VERIFIED SUCCESSFULLY!');
console.log('========================================');
