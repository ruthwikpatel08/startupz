import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { fetchSupabaseProfile, supabaseAdmin } from '../supabase.js';

import { JWT_SECRET } from '../config/jwt.js';

// Revoked tokens store with TTL-based automated pruning (SEC-11)
const revokedTokens = new Map(); // token -> expiryMs

export function revokeToken(token) {
  if (!token || typeof token !== 'string') return;
  try {
    const decoded = jwt.decode(token);
    const expiryMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
    revokedTokens.set(token, expiryMs);
  } catch {
    revokedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
}

export function isTokenRevoked(token) {
  if (!token || typeof token !== 'string') return false;
  const expiryMs = revokedTokens.get(token);
  if (!expiryMs) return false;
  if (Date.now() > expiryMs) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

// Periodic cleanup of expired revoked tokens
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of revokedTokens.entries()) {
    if (now > exp) revokedTokens.delete(t);
  }
}, 15 * 60 * 1000);
pruneTimer.unref();

export function enrichAdminFlag(user) {
  if (!user) return user;
  // Explicit database role check (SEC-02)
  if (user.role === 'ADMIN' || user.isAdmin === true) {
    user.isAdmin = true;
    return user;
  }

  const defaultAdminEmails = [
    'ruthwikpatel08@gmail.com',
    'ruthwik9595@gmail.com',
    'gokulvamshi@hookz.in',
    'gokulvamshi@gmail.com',
  ];
  if (user.email && defaultAdminEmails.includes(user.email.toLowerCase().trim())) {
    user.isAdmin = true;
    return user;
  }

  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  if (user.id && ruthwikIds.includes(String(user.id).toLowerCase().trim())) {
    user.isAdmin = true;
    return user;
  }

  // Explicit environment variable allowlist (ADMIN_EMAILS=user1@domain.com,user2@domain.com)
  const adminEnv = process.env.ADMIN_EMAILS;
  if (adminEnv && user.email) {
    const allowlist = adminEnv
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (allowlist.includes(user.email.toLowerCase().trim())) {
      user.isAdmin = true;
      return user;
    }
  }

  user.isAdmin = false;
  return user;
}

export function isUserAdminCheck(user) {
  if (!user) return false;
  if (user.isAdmin || user.role === 'ADMIN') return true;
  const adminEmails = [
    'ruthwikpatel08@gmail.com',
    'ruthwik9595@gmail.com',
    'gokulvamshi@hookz.in',
    'gokulvamshi@gmail.com',
  ];
  if (user.email && adminEmails.includes(user.email.toLowerCase().trim())) return true;
  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  if (user.id && ruthwikIds.includes(String(user.id).toLowerCase().trim())) return true;

  const adminEnv = process.env.ADMIN_EMAILS;
  if (adminEnv && user.email) {
    const allowlist = adminEnv
      .toLowerCase()
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (allowlist.includes(user.email.toLowerCase().trim())) return true;
  }

  return false;
}

export function getUserCandidateIds(user) {
  if (!user) return [];
  const ids = new Set(
    [user.id, user.profile?.id, user.profile?.userId, user._id]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase())
  );
  const ruthwikIds = ['c3e1a001-8888-4444-9999-000000000001', 'b669157c-4d30-42f4-a8bf-4e27dc425e00', 'ruthwikpatel08'];
  const gokulIds = ['c3e1a001-8888-4444-9999-000000000002', '601c5fb3-a83e-4592-a74a-42a9b4fbe3ba', 'gokulvamshi'];

  const isExactRuthwik = Array.from(ids).some((id) => ruthwikIds.includes(id)) ||
    (user.email && ['ruthwikpatel08@gmail.com', 'ruthwik9595@gmail.com'].includes(user.email.toLowerCase().trim()));
  if (isExactRuthwik) {
    ruthwikIds.forEach((id) => ids.add(id));
  }

  const isExactGokul = Array.from(ids).some((id) => gokulIds.includes(id)) ||
    (user.email && ['gokulvamshi@hookz.in', 'gokulvamshi@gmail.com'].includes(user.email.toLowerCase().trim()));
  if (isExactGokul) {
    gokulIds.forEach((id) => ids.add(id));
  }

  return Array.from(ids);
}


export function isOwnerOrAdmin(resourceOwnerId, user, resourceEmail) {
  if (!user) return false;
  if (isUserAdminCheck(user)) return true;
  const candidateIds = getUserCandidateIds(user);
  if (resourceOwnerId) {
    const normalizedOwner = String(resourceOwnerId).trim().toLowerCase();
    if (candidateIds.includes(normalizedOwner)) return true;
  }
  if (resourceEmail && user.email) {
    if (String(resourceEmail).trim().toLowerCase() === String(user.email).trim().toLowerCase()) return true;
  }
  return false;
}

async function enrichWithSupabaseProfile(user) {
  if (!user) return user;
  enrichAdminFlag(user);
  try {
    const supaProfile = await fetchSupabaseProfile(user.id, user.email);
    if (supaProfile) {
      if (!user.profile) user.profile = {};
      if (supaProfile.full_name) user.profile.fullName = supaProfile.full_name;
      if (supaProfile.avatar) user.profile.avatar = supaProfile.avatar;
      if (supaProfile.username) user.profile.username = supaProfile.username;
      if (supaProfile.headline) user.profile.headline = supaProfile.headline;
      if (supaProfile.location) user.profile.location = supaProfile.location;
      if (supaProfile.bio) user.profile.bio = supaProfile.bio;
      if (supaProfile.preferred_role) {
        user.profile.preferredRole = supaProfile.preferred_role;
        user.role = supaProfile.preferred_role;
      }
    }
  } catch {}
  return user;
}

/**
 * Resolves and authenticates a user from a cryptographically verified token.
 * Tokens MUST pass cryptographic signature verification:
 * 1. Internal StartupZ JWTs are verified with JWT_SECRET.
 * 2. Supabase Auth JWTs are verified with Supabase Auth service (via supabaseAdmin.auth.getUser).
 *
 * Under NO circumstances are unverified decoded claims (jwt.decode) or unauthenticated
 * request headers (x-user-email / x-user-id) trusted for user authentication.
 */
export async function resolveUserFromToken(token, req = null) {
  if (!token || typeof token !== 'string' || token === 'anon') return null;
  if (isTokenRevoked(token)) return null;

  // 1. Try StartupZ internal JWT verification (cryptographically verified with JWT_SECRET)
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true },
      });
      if (user && !user.isSuspended) return enrichWithSupabaseProfile(user);
    }
  } catch (err) {
    // If not a valid StartupZ token (e.g. invalid signature, expired, or issued by Supabase)
  }

  // 2. Try Supabase JWT verification (cryptographically verified via Supabase Auth service)
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        const supaUser = data.user;
        const userId = supaUser.id;
        const userEmail = (supaUser.email || '').toLowerCase().trim();

        if (userId || userEmail) {
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                ...(userId ? [{ id: userId }] : []),
                ...(userEmail ? [{ email: userEmail }] : []),
              ],
            },
            include: { profile: true },
          });

          // Auto-provision user in Prisma if authenticated via Supabase
          if (!user && userEmail) {
            const meta = supaUser.user_metadata || {};
            const fullName = meta.full_name || meta.name || userEmail.split('@')[0];
            const role = (meta.role || 'FOUNDER').toUpperCase();
            const avatar = meta.avatar_url || meta.picture || null;

            user = await prisma.user.create({
              data: {
                id: userId || undefined,
                email: userEmail,
                password: 'SUPABASE_MANAGED_AUTH',
                role,
                isVerified: true,
                verificationBadge: supaUser.app_metadata?.provider === 'google' ? 'Verified via Google' : 'Verified Member',
                profile: {
                  create: {
                    fullName,
                    headline: meta.headline || `${role} | Startup Builder`,
                    location: meta.location || 'Remote',
                    avatar,
                    openTo: 'Co-Founder,Startup Team,Investment',
                    profileCompletion: 80,
                  },
                },
              },
              include: { profile: true },
            });
          }

          if (user && !user.isSuspended) return enrichWithSupabaseProfile(user);
        }
      }
    } catch (err) {
      // Supabase verification error / network failure
    }
  }

  // Never fall back to unverified decode or unauthenticated headers
  return null;
}

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token || token === 'anon') {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const user = await resolveUserFromToken(token, req);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'anon') {
      req.user = null;
      return next();
    }

    const user = await resolveUserFromToken(token, req);
    req.user = user && !user.isSuspended ? user : null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};
