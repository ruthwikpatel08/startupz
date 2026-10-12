import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { fetchSupabaseProfile, supabaseAdmin } from '../supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'startupz_super_secret_jwt_key_2026_modern_startup_network';

function enrichAdminFlag(user) {
  if (!user) return user;
  const email = (user.email || '').toLowerCase().trim();
  if (['ruthwikpatel08@gmail.com', 'gokulvamshi@hookz.in', 'gokulvamshi@gmail.com', 'admin@startupz.com'].includes(email)) {
    user.isAdmin = true;
  }
  return user;
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
