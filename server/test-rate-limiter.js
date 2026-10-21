import assert from 'node:assert';
import { createRateLimiter } from './src/middleware/rateLimiter.js';

async function testRateLimiter() {
  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 2,
    message: 'Too many requests',
    keyGenerator: () => 'test-ip',
  });

  const mockReq = { ip: '127.0.0.1' };
  
  let nextCalled = 0;
  let statusSet = null;
  let jsonSent = null;
  const headers = {};

  const makeRes = () => ({
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      statusSet = code;
      return {
        json: (data) => { jsonSent = data; },
      };
    },
  });

  const next = () => { nextCalled++; };

  // Attempt 1: Should pass
  limiter(mockReq, makeRes(), next);
  assert.strictEqual(nextCalled, 1, 'Attempt 1 should pass');
  assert.strictEqual(headers['X-RateLimit-Remaining'], 1, 'Remaining should be 1');

  // Attempt 2: Should pass
  limiter(mockReq, makeRes(), next);
  assert.strictEqual(nextCalled, 2, 'Attempt 2 should pass');
  assert.strictEqual(headers['X-RateLimit-Remaining'], 0, 'Remaining should be 0');

  // Attempt 3: Should block with 429
  limiter(mockReq, makeRes(), next);
  assert.strictEqual(nextCalled, 2, 'Attempt 3 must NOT call next()');
  assert.strictEqual(statusSet, 429, 'Attempt 3 must return HTTP 429');
  assert.strictEqual(jsonSent.error, 'Too many requests', 'Error message matches');
  assert(headers['Retry-After'] !== undefined, 'Must provide Retry-After header');

  console.log('✅ Rate limiter self-check passed successfully!');
}

testRateLimiter();
