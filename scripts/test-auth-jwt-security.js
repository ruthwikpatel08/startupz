process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import jwt from '../server/node_modules/jsonwebtoken/index.js';
import { requireAuth, optionalAuth, resolveUserFromToken } from '../server/src/middleware/auth.js';
import { isAuthorizedMaintenanceRequest } from '../server/src/index.js';
import { prisma } from '../server/src/db.js';

console.log('🧪 Running JWT Authentication Security Automated Tests...');

const JWT_SECRET = process.env.JWT_SECRET || 'startupz_super_secret_jwt_key_2026_modern_startup_network';
const ATTACKER_SECRET = 'malicious_untrusted_secret_key_999';

// Helper to mock Express req, res, next
function createMockReqRes({ authHeader = null, headers = {} } = {}) {
  const req = {
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
      ...headers,
    },
    user: null,
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
  };

  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getResult: () => ({ statusCode, jsonResponse, nextCalled }) };
}

async function runTests() {
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

  // Find an existing active user ID in the test/seed database for realistic claim tests
  const sampleUser = await prisma.user.findFirst({
    where: { isSuspended: false },
    select: { id: true, email: true },
  });

  const targetUserId = sampleUser ? sampleUser.id : '00000000-0000-0000-0000-000000000001';

  console.log('\n--- Test Suite 1: Malformed Tokens ---');
  {
    // 1.1 Malformed string in resolveUserFromToken
    const user = await resolveUserFromToken('malformed.token.format');
    testAssert(user === null, 'resolveUserFromToken returns null for malformed token string');

    // 1.2 Malformed token in requireAuth
    const { req, res, next, getResult } = createMockReqRes({ authHeader: 'Bearer not-a-valid-jwt' });
    await requireAuth(req, res, next);
    const result = getResult();
    testAssert(result.statusCode === 401 && !result.nextCalled, 'requireAuth returns 401 for malformed token');
  }

  console.log('\n--- Test Suite 2: Expired Token with Real-Looking User Claims ---');
  {
    // Generate an expired internal token signed with the real secret
    const expiredToken = jwt.sign(
      { userId: targetUserId, iat: Math.floor(Date.now() / 1000) - 7200 },
      JWT_SECRET,
      { expiresIn: '1s' }
    );

    // Verify that jwt.decode DOES extract claims, but resolveUserFromToken rejects it
    const decodedClaims = jwt.decode(expiredToken);
    testAssert(decodedClaims && decodedClaims.userId === targetUserId, 'Expired token decodes successfully via jwt.decode');

    const user = await resolveUserFromToken(expiredToken);
    testAssert(user === null, 'resolveUserFromToken strictly rejects expired token despite valid decoded claims');

    const { req, res, next, getResult } = createMockReqRes({ authHeader: `Bearer ${expiredToken}` });
    await requireAuth(req, res, next);
    const result = getResult();
    testAssert(result.statusCode === 401 && !result.nextCalled, 'requireAuth returns 401 for expired token');
  }

  console.log('\n--- Test Suite 3: Forged Token with Invalid Signature (Attacker Secret) ---');
  {
    // Generate a token signed with an untrusted attacker secret
    const forgedToken = jwt.sign(
      { userId: targetUserId },
      ATTACKER_SECRET,
      { expiresIn: '7d' }
    );

    const decodedClaims = jwt.decode(forgedToken);
    testAssert(decodedClaims && decodedClaims.userId === targetUserId, 'Forged token decodes claims containing target user ID');

    const user = await resolveUserFromToken(forgedToken);
    testAssert(user === null, 'resolveUserFromToken rejects token signed with invalid secret');

    const { req, res, next, getResult } = createMockReqRes({ authHeader: `Bearer ${forgedToken}` });
    await requireAuth(req, res, next);
    const result = getResult();
    testAssert(result.statusCode === 401 && !result.nextCalled, 'requireAuth returns 401 for invalid signature token');
  }

  console.log('\n--- Test Suite 4: Forged Token with alg: "none" ---');
  {
    // Construct an unsigned alg: none token (header.payload.)
    const headerBase64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify({ userId: targetUserId })).toString('base64url');
    const unsignedToken = `${headerBase64}.${payloadBase64}.`;

    const decodedClaims = jwt.decode(unsignedToken);
    testAssert(decodedClaims && decodedClaims.userId === targetUserId, 'Unsigned token decodes claims via jwt.decode');

    const user = await resolveUserFromToken(unsignedToken);
    testAssert(user === null, 'resolveUserFromToken strictly rejects alg: none unsigned token');

    const { req, res, next, getResult } = createMockReqRes({ authHeader: `Bearer ${unsignedToken}` });
    await requireAuth(req, res, next);
    const result = getResult();
    testAssert(result.statusCode === 401 && !result.nextCalled, 'requireAuth returns 401 for alg: none unsigned token');
  }

  console.log('\n--- Test Suite 5: Header Spoofing Bypass Prevention ---');
  {
    // Attempting to authenticate using x-user-id or x-user-email without valid token
    const { req: req1, res: res1, next: next1, getResult: getResult1 } = createMockReqRes({
      headers: { 'x-user-id': targetUserId },
    });
    await requireAuth(req1, res1, next1);
    const result1 = getResult1();
    testAssert(result1.statusCode === 401 && !result1.nextCalled, 'requireAuth rejects request with spoofed x-user-id header and no token');

    const { req: req2, res: res2, next: next2, getResult: getResult2 } = createMockReqRes({
      headers: { 'x-user-email': 'admin@startupz.com' },
    });
    await requireAuth(req2, res2, next2);
    const result2 = getResult2();
    testAssert(result2.statusCode === 401 && !result2.nextCalled, 'requireAuth rejects request with spoofed x-user-email header and no token');

    // Attempting to bypass with invalid token plus spoofed headers
    const { req: req3, res: res3, next: next3, getResult: getResult3 } = createMockReqRes({
      authHeader: 'Bearer invalid-token',
      headers: { 'x-user-id': targetUserId, 'x-user-email': 'admin@startupz.com' },
    });
    await requireAuth(req3, res3, next3);
    const result3 = getResult3();
    testAssert(result3.statusCode === 401 && !result3.nextCalled, 'requireAuth rejects invalid token even when spoofed headers are present');
  }

  console.log('\n--- Test Suite 6: Valid Token Authentication ---');
  {
    if (sampleUser) {
      const validToken = jwt.sign(
        { userId: sampleUser.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const user = await resolveUserFromToken(validToken);
      testAssert(user && user.id === sampleUser.id, 'resolveUserFromToken authenticates valid internal token');

      const { req, res, next, getResult } = createMockReqRes({ authHeader: `Bearer ${validToken}` });
      await requireAuth(req, res, next);
      const result = getResult();
      testAssert(result.nextCalled && req.user && req.user.id === sampleUser.id, 'requireAuth grants access and populates req.user for valid token');
    } else {
      console.log('  ⚠️ Skipping live user check in Suite 6 (no user in local database).');
    }
  }

  console.log('\n--- Test Suite 7: optionalAuth Behavior ---');
  {
    // 7.1 No header: user is null, next called
    const { req: req1, res: res1, next: next1, getResult: getResult1 } = createMockReqRes();
    await optionalAuth(req1, res1, next1);
    const result1 = getResult1();
    testAssert(result1.nextCalled && req1.user === null, 'optionalAuth passes through with req.user = null when no header present');

    // 7.2 Invalid token: user is null, next called
    const { req: req2, res: res2, next: next2, getResult: getResult2 } = createMockReqRes({ authHeader: 'Bearer invalid-token' });
    await optionalAuth(req2, res2, next2);
    const result2 = getResult2();
    testAssert(result2.nextCalled && req2.user === null, 'optionalAuth passes through with req.user = null when token is invalid');

    // 7.3 Anon token: user is null, next called
    const { req: req3, res: res3, next: next3, getResult: getResult3 } = createMockReqRes({ authHeader: 'Bearer anon' });
    await optionalAuth(req3, res3, next3);
    const result3 = getResult3();
    testAssert(result3.nextCalled && req3.user === null, 'optionalAuth passes through with req.user = null when token is anon');
  }

  console.log('\n--- Test Suite 8: Admin Maintenance Endpoint Security (/api/health/purge-demo-data) ---');
  {
    const originalSecret = process.env.ADMIN_MAINTENANCE_SECRET;
    const TEST_VALID_SECRET = 'valid_test_admin_maintenance_secret_32_chars_long!';

    // 8.1 Missing configuration: fail closed
    delete process.env.ADMIN_MAINTENANCE_SECRET;
    const resNoConfig = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-maintenance-secret': TEST_VALID_SECRET },
    });
    testAssert(resNoConfig === false, 'isAuthorizedMaintenanceRequest fails closed when secret is not configured in env');

    // 8.2 Inadequate length configuration (< 32 chars): fail closed
    process.env.ADMIN_MAINTENANCE_SECRET = 'short_insecure_secret_12345';
    const resShortConfig = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-maintenance-secret': 'short_insecure_secret_12345' },
    });
    testAssert(resShortConfig === false, 'isAuthorizedMaintenanceRequest fails closed when configured secret is under 32 characters');

    // Configure adequate test secret for remaining checks
    process.env.ADMIN_MAINTENANCE_SECRET = TEST_VALID_SECRET;

    // 8.3 Missing credential in request
    const resNoHeader = isAuthorizedMaintenanceRequest({ headers: {} });
    testAssert(resNoHeader === false, 'isAuthorizedMaintenanceRequest rejects request when maintenance header is missing');

    // 8.4 Incorrect credential provided
    const resWrongSecret = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-maintenance-secret': 'wrong_invalid_admin_maintenance_secret_32_chars!' },
    });
    testAssert(resWrongSecret === false, 'isAuthorizedMaintenanceRequest rejects request with incorrect secret');

    // 8.5 Incompatible length credential (timing-safe check without throwing)
    const resDiffLength = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-maintenance-secret': 'wrong_short' },
    });
    testAssert(resDiffLength === false, 'isAuthorizedMaintenanceRequest rejects credential of differing byte length safely');

    // 8.6 Query-string credential strictly rejected
    const resQuerySecret = isAuthorizedMaintenanceRequest({
      headers: {},
      query: { secret: TEST_VALID_SECRET },
    });
    testAssert(resQuerySecret === false, 'isAuthorizedMaintenanceRequest strictly rejects credentials passed in query parameters');

    // 8.7 Query-string credential ignored even if wrong header provided
    const resQueryOverride = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-secret': 'wrong_header_value' },
      query: { secret: TEST_VALID_SECRET },
    });
    testAssert(resQueryOverride === false, 'isAuthorizedMaintenanceRequest ignores query parameter even if header is wrong');

    // 8.8 Correct credential via x-admin-maintenance-secret header
    const resValidNewHeader = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-maintenance-secret': TEST_VALID_SECRET },
    });
    testAssert(resValidNewHeader === true, 'isAuthorizedMaintenanceRequest accepts valid secret via x-admin-maintenance-secret');

    // 8.9 Correct credential via legacy x-admin-secret header
    const resValidLegacyHeader = isAuthorizedMaintenanceRequest({
      headers: { 'x-admin-secret': TEST_VALID_SECRET },
    });
    testAssert(resValidLegacyHeader === true, 'isAuthorizedMaintenanceRequest accepts valid secret via legacy x-admin-secret header');

    // 8.10 Route protection behavior simulation (preserves database: never runs actual purge)
    let purgeInvoked = false;
    const mockRouteHandler = (req, res) => {
      if (!isAuthorizedMaintenanceRequest(req)) {
        return res.status(403).json({ error: 'Unauthorized maintenance operation.' });
      }
      purgeInvoked = true;
      return res.json({ status: 'ok' });
    };

    const mockRes403 = {
      statusCode: 200,
      jsonBody: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonBody = data; return this; },
    };
    mockRouteHandler({ headers: {} }, mockRes403);
    testAssert(mockRes403.statusCode === 403 && !purgeInvoked, 'Maintenance route responds with 403 and never invokes purge on unauthorized request');

    // Restore environment
    if (originalSecret) {
      process.env.ADMIN_MAINTENANCE_SECRET = originalSecret;
    } else {
      delete process.env.ADMIN_MAINTENANCE_SECRET;
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  await prisma.$disconnect().catch(() => {});

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
