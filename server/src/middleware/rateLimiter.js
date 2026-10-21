/**
 * Sliding window rate limiter with safe IP resolution and multi-instance readiness.
 * ponytail: In-memory store is local to this Node process. If horizontally scaling across multiple Render instances,
 * configure REDIS_URL to automatically switch to distributed rate-limiting.
 */

export function getClientIp(req) {
  // Use Express trusted proxy resolution (app.set('trust proxy', 1))
  let rawIp = req.ip || req.socket?.remoteAddress || 'unknown';
  if (typeof rawIp === 'string') {
    if (rawIp.startsWith('::ffff:')) {
      rawIp = rawIp.slice(7);
    }
    if (rawIp === '::1') {
      rawIp = '127.0.0.1';
    }
  }
  return rawIp;
}

export function createRateLimiter({ windowMs, max, message, keyGenerator }) {
  const store = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, 5 * 60 * 1000);
  cleanup.unref();

  return (req, res, next) => {
    const ip = getClientIp(req);
    const clientKey = keyGenerator
      ? keyGenerator(req)
      : (req.user?.id ? `user:${req.user.id}` : `ip:${ip}`);

    const now = Date.now();
    const timestamps = store.get(clientKey) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const oldestValid = validTimestamps[0];
      const retryAfterMs = Math.max(1000, oldestValid + windowMs - now);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: message || 'Too many requests. Please slow down and try again later.',
        retryAfter: retryAfterSec,
      });
    }

    validTimestamps.push(now);
    store.set(clientKey, validTimestamps);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - validTimestamps.length));
    next();
  };
}

// 10 login attempts per 15 minutes per IP
export const authLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP address. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => `auth:login:${getClientIp(req)}`,
});

// 5 new registrations per hour per IP
export const authRegisterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many account registrations from this IP address. Please try again in an hour.',
  keyGenerator: (req) => `auth:register:${getClientIp(req)}`,
});

// 5 password reset attempts per 15 minutes per IP
export const authPasswordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests from this IP address. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => `auth:reset:${getClientIp(req)}`,
});

// 30 session sync calls per 5 minutes per IP
export const authSyncLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many authentication sync requests. Please slow down.',
  keyGenerator: (req) => `auth:sync:${getClientIp(req)}`,
});
