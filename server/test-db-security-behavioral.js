/**
 * HookZ — Live Database Security Behavioral Verification Runner
 * 
 * STRICT ISOLATION NOTICE:
 * This runner executes behavioral PostgREST/RLS tests EXCLUSIVELY against the
 * dedicated test database (hookz-security-test, ref: eotawvcqgfooobfoxbwv).
 * 
 * SAFETY GUARDS:
 * 1. Strictly refuses to run against any URL other than eotawvcqgfooobfoxbwv.supabase.co.
 * 2. Never accesses production (aqbnylhmsawdagoyggrf).
 * 3. Does NOT hardcode any secrets, keys, or passwords.
 * 4. Runs permission tests exclusively with least-privilege authenticated user tokens.
 * 5. Tagged test records are isolated by a unique run ID.
 * 6. Destructive cleanup is opt-in and isolated to this run's records.
 */

import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_TEST_REF = 'eotawvcqgfooobfoxbwv';
const TEST_RUN_ID = `sectest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

async function runBehavioralSecuritySuite() {
  console.log('🧪 HookZ Live Database Security Behavioral Verification Runner');
  console.log(`📋 Session Run ID: ${TEST_RUN_ID}\n`);

  // ============================================================================
  // STEP 1: Strict Target Verification & Environment Safety Guard
  // ============================================================================
  const supabaseUrl = process.env.TEST_SUPABASE_URL || '';
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl) {
    console.error('❌ CONFIGURATION ERROR: TEST_SUPABASE_URL is missing.');
    console.error('👉 Supply the test project URL via TEST_SUPABASE_URL.');
    console.error(`   Required target: https://${EXPECTED_TEST_REF}.supabase.co`);
    process.exit(1);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch (err) {
    console.error('❌ CONFIGURATION ERROR: Invalid TEST_SUPABASE_URL format:', err.message);
    process.exit(1);
  }

  // HARD DEFENSE: Enforce that the URL strictly matches the test project reference
  if (!parsedUrl.hostname.includes(EXPECTED_TEST_REF)) {
    console.error('🛑 ABORTED FOR SAFETY: TEST_SUPABASE_URL does not match the test project reference!');
    console.error(`   Configured Host: ${parsedUrl.hostname}`);
    console.error(`   Required Project Ref: ${EXPECTED_TEST_REF}`);
    console.error('   Running against production or unverified instances is strictly prevented.');
    process.exit(1);
  }

  if (parsedUrl.hostname.includes('aqbnylhmsawdagoyggrf')) {
    console.error('🛑 CRITICAL SAFETY ABORT: Production project reference detected! Refusing execution.');
    process.exit(1);
  }

  if (!anonKey) {
    console.error('❌ CONFIGURATION ERROR: TEST_SUPABASE_ANON_KEY is missing.');
    console.error('👉 Supply the anon public key for hookz-security-test via TEST_SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  console.log(`✅ [TARGET VERIFIED]: Connected to dedicated test project (${EXPECTED_TEST_REF})`);

  // ============================================================================
  // STEP 2: Authenticated Client Sessions (Least-Privilege Identities)
  // ============================================================================
  // Supports either pre-generated Bearer tokens or credentials for Test User A, B, and C
  const aliceToken = process.env.TEST_ALICE_ACCESS_TOKEN;
  const bobToken = process.env.TEST_BOB_ACCESS_TOKEN;
  const eveToken = process.env.TEST_EVE_ACCESS_TOKEN;

  const aliceEmail = process.env.TEST_ALICE_EMAIL;
  const alicePassword = process.env.TEST_ALICE_PASSWORD;
  const bobEmail = process.env.TEST_BOB_EMAIL;
  const bobPassword = process.env.TEST_BOB_PASSWORD;
  const eveEmail = process.env.TEST_EVE_EMAIL;
  const evePassword = process.env.TEST_EVE_PASSWORD;

  let clientAlice, clientBob, clientEve;
  let userAliceId, userBobId, userEveId;

  // Helper to initialize authenticated client
  async function resolveClient(name, token, email, password) {
    if (token) {
      const client = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) {
        throw new Error(`Failed to validate ${name} token: ${error?.message || 'User not found'}`);
      }
      return { client, userId: user.id };
    }

    if (email && password) {
      const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data?.user || !data?.session) {
        throw new Error(`Failed to sign in as ${name} (${email}): ${error?.message}`);
      }
      return { client, userId: data.user.id };
    }

    return null;
  }

  try {
    const alice = await resolveClient('Alice (Test User A)', aliceToken, aliceEmail, alicePassword);
    const bob = await resolveClient('Bob (Test User B)', bobToken, bobEmail, bobPassword);
    const eve = await resolveClient('Eve (Test User C / Stranger)', eveToken, eveEmail, evePassword);

    if (!alice || !bob) {
      console.log('\n📋 REQUIRED TEST IDENTITIES ARE MISSING:');
      console.log('   This runner requires 2 test accounts in hookz-security-test:');
      console.log('   - Test User A (Alice): Sender / Creator');
      console.log('   - Test User B (Bob): Recipient / Member');
      console.log('   - Test User C (Eve): Third-Party / Stranger (Optional but recommended)');
      console.log('\n👉 To supply them safely, set these environment variables before running:');
      console.log('   TEST_ALICE_EMAIL="sec_alice@test.local"');
      console.log('   TEST_ALICE_PASSWORD="test_password"');
      console.log('   TEST_BOB_EMAIL="sec_bob@test.local"');
      console.log('   TEST_BOB_PASSWORD="test_password"');
      console.log('   TEST_EVE_EMAIL="sec_eve@test.local"');
      console.log('   TEST_EVE_PASSWORD="test_password"');
      console.log('   (Or supply TEST_ALICE_ACCESS_TOKEN and TEST_BOB_ACCESS_TOKEN)\n');
      console.log('ℹ️  No accounts or records were created. Target verified safely.');
      process.exit(0);
    }

    clientAlice = alice.client;
    userAliceId = alice.userId;
    clientBob = bob.client;
    userBobId = bob.userId;
    if (eve) {
      clientEve = eve.client;
      userEveId = eve.userId;
    }

    console.log(`  👤 Test User A (Alice): ${userAliceId}`);
    console.log(`  👤 Test User B (Bob):   ${userBobId}`);
    if (userEveId) console.log(`  👤 Test User C (Eve):   ${userEveId}`);
    console.log('');
  } catch (err) {
    console.error('❌ Authentication setup error:', err.message);
    process.exit(1);
  }

  const createdRecordIds = {
    connectionId: null,
    conversationId: null,
    messageId: null,
    projectId: null,
    proposalId: null,
  };

  // Optional: Auto-sync public.users if TEST_SUPABASE_SERVICE_ROLE_KEY is provided
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      await adminClient.from('users').upsert([
        { id: userAliceId, email: aliceEmail || 'sec_test_alice@hookz-test.internal', password: 'TEST_ACCOUNT', role: 'FOUNDER' },
        { id: userBobId, email: bobEmail || 'sec_test_bob@hookz-test.internal', password: 'TEST_ACCOUNT', role: 'FOUNDER' },
      ], { onConflict: 'id' });
    } catch (syncErr) {
      console.warn('  ⚠️ Notice: Service-role public.users sync attempt skipped:', syncErr.message);
    }
  }

  try {
    // ============================================================================
    // TEST SUITE 1: Connection Requests State Machine & Immutability
    // ============================================================================
    console.log('--- TEST SUITE 1: Connection Requests State Machine & Immutability ---');

    // 1.1 Alice sends connection request to Bob
    const { data: connData, error: connErr } = await clientAlice
      .from('connections')
      .insert({
        sender_id: userAliceId,
        receiver_id: userBobId,
        status: 'PENDING',
        note: `[${TEST_RUN_ID}] Security test invitation`,
      })
      .select()
      .single();

    if (connErr && connErr.message.includes('foreign key constraint')) {
      console.error('\n❌ FOREIGN KEY PREREQUISITE ERROR:');
      console.error('   The connections table requires sender_id and receiver_id to exist in public.users.');
      console.error('   Run this SQL in hookz-security-test SQL Editor (or set TEST_SUPABASE_SERVICE_ROLE_KEY):');
      console.error(`   INSERT INTO public.users (id, email, password, role) VALUES ('${userAliceId}', 'sec_test_alice@hookz-test.internal', 'TEST', 'FOUNDER'), ('${userBobId}', 'sec_test_bob@hookz-test.internal', 'TEST', 'FOUNDER') ON CONFLICT (id) DO NOTHING;\n`);
    }

    assert(!connErr && connData?.id, `Alice failed to create connection request: ${connErr?.message}`);
    createdRecordIds.connectionId = connData.id;
    console.log('  ✅ [PASS] 1.1: Sender can create PENDING connection request.');

    // 1.2 Sender attempts self-acceptance (MUST BE BLOCKED)
    const { data: selfAcceptData, error: selfAcceptErr } = await clientAlice
      .from('connections')
      .update({ status: 'ACCEPTED' })
      .eq('id', connData.id)
      .select();

    assert(
      selfAcceptErr || !selfAcceptData || selfAcceptData.length === 0,
      'SECURITY VIOLATION: Sender was able to accept their own connection request!'
    );
    // Explicitly verify in the database that the row is STILL PENDING
    const { data: checkRow1 } = await clientAlice.from('connections').select('status').eq('id', connData.id).single();
    assert.strictEqual(checkRow1?.status, 'PENDING', 'Connection status must remain PENDING after blocked self-acceptance');
    console.log('  ✅ [PASS] 1.2: Sender self-acceptance is strictly blocked by RLS & trigger (status remains PENDING).');

    // 1.3 Sender attempts to transition status to REJECTED (MUST BE BLOCKED)
    const { data: senderRejectData, error: senderRejectErr } = await clientAlice
      .from('connections')
      .update({ status: 'REJECTED' })
      .eq('id', connData.id)
      .select();

    assert(
      senderRejectErr || !senderRejectData || senderRejectData.length === 0,
      'SECURITY VIOLATION: Sender was able to transition connection status to REJECTED!'
    );
    // Explicitly verify in the database that the row is STILL PENDING
    const { data: checkRow2 } = await clientAlice.from('connections').select('status').eq('id', connData.id).single();
    assert.strictEqual(checkRow2?.status, 'PENDING', 'Connection status must remain PENDING after blocked reject attempt');
    console.log('  ✅ [PASS] 1.3: Sender cannot transition connection status away from PENDING (status remains PENDING).');

    // 1.4 Sender attempts to mutate receiver_id (MUST BE BLOCKED BY TRIGGER)
    const dummyReceiverId = userEveId || '00000000-0000-0000-0000-000000000099';
    const { data: tamperData, error: tamperErr } = await clientAlice
      .from('connections')
      .update({ receiver_id: dummyReceiverId })
      .eq('id', connData.id)
      .select();

    assert(
      tamperErr || !tamperData || tamperData.length === 0,
      'SECURITY VIOLATION: Sender was able to alter receiver_id of an existing connection!'
    );
    console.log('  ✅ [PASS] 1.4: Connection participant IDs are strictly immutable.');

    // 1.5 Sender updating note while PENDING (ALLOWED)
    const { data: noteUpdateData, error: noteUpdateErr } = await clientAlice
      .from('connections')
      .update({ note: `[${TEST_RUN_ID}] Updated note by Alice` })
      .eq('id', connData.id)
      .select()
      .single();

    assert(!noteUpdateErr && noteUpdateData?.note.includes('Updated note'), `Sender should be allowed to update note while pending: ${noteUpdateErr?.message}`);
    console.log('  ✅ [PASS] 1.5: Sender can update request details while remaining PENDING.');

    // 1.6 Recipient accepting incoming request (ALLOWED)
    const { data: acceptData, error: acceptErr } = await clientBob
      .from('connections')
      .update({ status: 'ACCEPTED' })
      .eq('id', connData.id)
      .select()
      .single();

    assert(!acceptErr && acceptData?.status === 'ACCEPTED', `Recipient should be allowed to accept incoming request: ${acceptErr?.message}`);
    console.log('  ✅ [PASS] 1.6: Intended recipient can accept incoming connection request.');

    // 1.7 Reversing established connection (MUST BE BLOCKED)
    const { data: reverseData, error: reverseErr } = await clientBob
      .from('connections')
      .update({ status: 'REJECTED' })
      .eq('id', connData.id)
      .select();

    assert(
      reverseErr || !reverseData || reverseData.length === 0,
      'SECURITY VIOLATION: Established connection status was reversed!'
    );
    // Explicitly verify in database that status is still ACCEPTED
    const { data: checkRow3 } = await clientBob.from('connections').select('status').eq('id', connData.id).single();
    assert.strictEqual(checkRow3?.status, 'ACCEPTED', 'Established connection must remain ACCEPTED');
    console.log('  ✅ [PASS] 1.7: Established connection cannot be reversed or reopened (status remains ACCEPTED).');


    // ============================================================================
    // TEST SUITE 2: Private Direct Messages & Conversations
    // ============================================================================
    console.log('\n--- TEST SUITE 2: Private Direct Messages & Conversations ---');

    // 2.1 Alice creates conversation with Bob
    const { data: convData, error: convErr } = await clientAlice
      .from('conversations')
      .insert({
        participant1_id: userAliceId,
        participant2_id: userBobId,
        last_message: `[${TEST_RUN_ID}] Hello Bob`,
      })
      .select()
      .single();

    assert(!convErr && convData?.id, `Failed to create conversation: ${convErr?.message}`);
    createdRecordIds.conversationId = convData.id;

    // 2.2 Alice sends private message to Bob
    const { data: msgData, error: msgErr } = await clientAlice
      .from('messages')
      .insert({
        conversation_id: convData.id,
        sender_id: userAliceId,
        receiver_id: userBobId,
        content: `[${TEST_RUN_ID}] Confidential message for Bob`,
      })
      .select()
      .single();

    assert(!msgErr && msgData?.id, `Failed to send private message: ${msgErr?.message}`);
    createdRecordIds.messageId = msgData.id;
    console.log('  ✅ [PASS] 2.1: Conversation participants can exchange messages.');

    // 2.3 Unauthorized read test (Client Eve or Anonymous client)
    const unauthClient = clientEve || createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: unauthMsgs, error: unauthErr } = await unauthClient
      .from('messages')
      .select('*')
      .eq('conversation_id', convData.id);

    assert(
      !unauthErr && Array.isArray(unauthMsgs) && unauthMsgs.length === 0,
      'SECURITY VIOLATION: Unauthorized client was able to read private direct messages!'
    );
    console.log('  ✅ [PASS] 2.2: Unauthorized client cannot view private direct messages (returns empty array).');


    // ============================================================================
    // TEST SUITE 3: Private Project Chat & Former Member Removal
    // ============================================================================
    console.log('\n--- TEST SUITE 3: Private Project Chat & Former Member Removal ---');

    const testProjectId = `proj_${Date.now()}`;
    createdRecordIds.projectId = testProjectId;

    // 3.1 Alice creates a PRIVATE project with Bob assigned to a role
    const { data: projData, error: projErr } = await clientAlice
      .from('projects')
      .insert({
        id: testProjectId,
        creator_id: userAliceId,
        title: `[${TEST_RUN_ID}] Secret Project`,
        visibility: 'PRIVATE',
        creator: { userId: userAliceId, name: 'Alice' },
        roles: [
          {
            id: 'role-1',
            roleName: 'Engineer',
            status: 'ASSIGNED',
            assignedTo: { userId: userBobId, name: 'Bob' },
          },
        ],
      })
      .select()
      .single();

    assert(!projErr && projData?.id, `Failed to create private project: ${projErr?.message}`);

    // 3.2 Bob posts a message to the project chat
    const testMsgId = `pmsg_${Date.now()}`;
    const { data: pmsgData, error: pmsgErr } = await clientBob
      .from('project_messages')
      .insert({
        id: testMsgId,
        project_id: testProjectId,
        sender_id: userBobId,
        content: `[${TEST_RUN_ID}] Bob team message`,
      })
      .select()
      .single();

    assert(!pmsgErr && pmsgData?.id, `Assigned member should be able to post in project chat: ${pmsgErr?.message}`);
    console.log('  ✅ [PASS] 3.1: Active project member can participate in private project chat.');

    // 3.3 Alice removes Bob from project roles
    const { error: removeRoleErr } = await clientAlice
      .from('projects')
      .update({
        roles: [
          {
            id: 'role-1',
            roleName: 'Engineer',
            status: 'OPEN',
            assignedTo: null,
          },
        ],
      })
      .eq('id', testProjectId);

    assert(!removeRoleErr, `Failed to remove Bob from roles: ${removeRoleErr?.message}`);

    // 3.4 Bob attempts to read project messages after removal (MUST BE BLOCKED / RETURN EMPTY)
    // NOTE: This directly verifies the fix for Finding 1 (sender_id bypass eliminated)
    const { data: bobAfterRemoval, error: bobErr } = await clientBob
      .from('project_messages')
      .select('*')
      .eq('project_id', testProjectId);

    assert(
      !bobErr && Array.isArray(bobAfterRemoval) && bobAfterRemoval.length === 0,
      'SECURITY VIOLATION: Removed project member retains read access to private project messages!'
    );
    console.log('  ✅ [PASS] 3.2: Removed member loses read access to private project chat (no sender bypass).');


    // ============================================================================
    // TEST SUITE 4: Proposal Status Transitions
    // ============================================================================
    console.log('\n--- TEST SUITE 4: Proposal Status Transitions ---');

    // 4.1 Alice submits a prototype proposal to Bob
    const dummyProtoId = '00000000-0000-0000-0000-000000000001';
    const { data: propData, error: propErr } = await clientAlice
      .from('prototype_proposals')
      .insert({
        prototype_id: dummyProtoId,
        sender_id: userAliceId,
        receiver_id: userBobId,
        prototype_title: `[${TEST_RUN_ID}] AI Tool`,
        about_builder: 'Engineer',
        contribution: 'Backend logic',
        status: 'PENDING',
      })
      .select()
      .single();

    assert(!propErr && propData?.id, `Failed to create proposal: ${propErr?.message}`);
    createdRecordIds.proposalId = propData.id;

    // 4.2 Alice (Sender) attempts to accept own proposal (MUST BE BLOCKED)
    const { data: senderAcceptData, error: senderAcceptErr } = await clientAlice
      .from('prototype_proposals')
      .update({ status: 'ACCEPTED' })
      .eq('id', propData.id)
      .select();

    assert(
      senderAcceptErr || !senderAcceptData || senderAcceptData.length === 0,
      'SECURITY VIOLATION: Proposal sender was able to accept own proposal!'
    );
    // Explicitly verify in the database that the row is STILL PENDING
    const { data: checkProp1 } = await clientAlice.from('prototype_proposals').select('status').eq('id', propData.id).single();
    assert.strictEqual(checkProp1?.status, 'PENDING', 'Proposal status must remain PENDING after blocked self-acceptance');
    console.log('  ✅ [PASS] 4.1: Proposal sender cannot self-accept proposal (status remains PENDING).');

    // 4.3 Alice (Sender) attempts to decline own proposal (MUST BE BLOCKED; delete to withdraw)
    const { data: senderDeclineData, error: senderDeclineErr } = await clientAlice
      .from('prototype_proposals')
      .update({ status: 'DECLINED' })
      .eq('id', propData.id)
      .select();

    assert(
      senderDeclineErr || !senderDeclineData || senderDeclineData.length === 0,
      'SECURITY VIOLATION: Proposal sender was able to transition proposal status to DECLINED!'
    );
    // Explicitly verify in the database that the row is STILL PENDING
    const { data: checkProp2 } = await clientAlice.from('prototype_proposals').select('status').eq('id', propData.id).single();
    assert.strictEqual(checkProp2?.status, 'PENDING', 'Proposal status must remain PENDING after blocked decline attempt');
    console.log('  ✅ [PASS] 4.2: Proposal sender cannot transition status (withdraw by delete only, status remains PENDING).');

    // 4.4 Bob (Recipient) accepts proposal (ALLOWED)
    const { data: recipientAcceptData, error: recipientAcceptErr } = await clientBob
      .from('prototype_proposals')
      .update({ status: 'ACCEPTED' })
      .eq('id', propData.id)
      .select()
      .single();

    assert(!recipientAcceptErr && recipientAcceptData?.status === 'ACCEPTED', `Recipient should be allowed to accept proposal: ${recipientAcceptErr?.message}`);
    console.log('  ✅ [PASS] 4.3: Intended recipient can accept incoming proposal.');


    // ============================================================================
    // TEST SUITE 5: public.users Table Immunity & Self-Escalation
    // ============================================================================
    console.log('\n--- TEST SUITE 5: public.users Table Immunity & Self-Escalation ---');

    // 5.1 Alice attempts to escalate role to ADMIN directly via PostgREST
    const { data: escalateData, error: escalateErr } = await clientAlice
      .from('users')
      .update({ role: 'ADMIN', is_admin: true })
      .eq('id', userAliceId)
      .select();

    assert(
      escalateErr !== null,
      'SECURITY VIOLATION: Client was able to execute UPDATE on public.users directly!'
    );
    console.log('  ✅ [PASS] 5.1: Client role escalation via direct public.users mutation is denied.');

    // 5.2 Alice attempts to enumerate public.users table
    const { data: enumData, error: enumErr } = await clientAlice
      .from('users')
      .select('*');

    assert(
      enumErr !== null,
      'SECURITY VIOLATION: Client was able to enumerate public.users table directly!'
    );
    console.log('  ✅ [PASS] 5.2: Client table enumeration on public.users is denied.');


    console.log('\n🎉 ALL 5 LIVE BEHAVIORAL SECURITY SUITES PASSED ON TEST DATABASE!');
  } finally {
    // ============================================================================
    // OPTIONAL CLEANUP: Only executed if --cleanup flag is explicitly supplied
    // ============================================================================
    if (process.argv.includes('--cleanup')) {
      console.log('\n🧹 Performing targeted cleanup of this run\'s records...');
      if (createdRecordIds.connectionId) {
        await clientAlice.from('connections').delete().eq('id', createdRecordIds.connectionId);
      }
      if (createdRecordIds.messageId) {
        await clientAlice.from('messages').delete().eq('id', createdRecordIds.messageId);
      }
      if (createdRecordIds.conversationId) {
        await clientAlice.from('conversations').delete().eq('id', createdRecordIds.conversationId);
      }
      if (createdRecordIds.projectId) {
        await clientAlice.from('project_messages').delete().eq('project_id', createdRecordIds.projectId);
        await clientAlice.from('projects').delete().eq('id', createdRecordIds.projectId);
      }
      if (createdRecordIds.proposalId) {
        await clientAlice.from('prototype_proposals').delete().eq('id', createdRecordIds.proposalId);
      }
      console.log('  ✅ Targeted cleanup complete.');
    } else {
      console.log('\nℹ️  Cleanup skipped (run with --cleanup to purge created test records).');
    }
  }
}

runBehavioralSecuritySuite().catch((err) => {
  console.error('\n❌ Behavioral security test execution failed:', err);
  process.exit(1);
});
