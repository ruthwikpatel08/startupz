import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { fetchSupabaseProfile } from '../supabase.js';

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

async function resolveUserFromToken(token, req) {
  if (!token) return null;

  // 1. Try StartupZ internal JWT verification
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
    // Fall through to decode check
  }

  // 2. Try Supabase JWT decode
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      const userId = decoded.sub || decoded.userId;
      const userEmail = (decoded.email || '').toLowerCase().trim();

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
          const meta = decoded.user_metadata || {};
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
              verificationBadge: decoded.app_metadata?.provider === 'google' ? 'Verified via Google' : 'Verified Member',
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
    // Ignore decode error
  }

  // 3. Fallback header check (for seamless local/google quick sessions)
  const headerEmail = req.headers['x-user-email'] || req.headers['x-user-id'];
  if (headerEmail) {
    const clean = String(headerEmail).toLowerCase().trim();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: clean },
          { email: clean },
        ],
      },
      include: { profile: true },
    });

    if (!user && clean) {
      let supaProfile = null;
      try {
        supaProfile = await fetchSupabaseProfile(clean.includes('@') ? '' : clean, clean.includes('@') ? clean : undefined);
      } catch {}

      const userEmail = clean.includes('@') ? clean : (supaProfile?.email || `${clean}@startupz.network`);
      const fullName = supaProfile?.full_name || userEmail.split('@')[0];
      const role = (supaProfile?.preferred_role || 'FOUNDER').toUpperCase();

      user = await prisma.user.create({
        data: {
          id: clean.includes('@') ? undefined : clean,
          email: userEmail,
          password: 'SUPABASE_MANAGED_AUTH',
          role,
          isVerified: true,
          verificationBadge: 'Verified Member',
          profile: {
            create: {
              fullName,
              headline: supaProfile?.headline || `${role} | Startup Builder`,
              location: supaProfile?.location || 'Remote',
              avatar: supaProfile?.avatar || null,
              openTo: 'Co-Founder,Startup Team,Investment',
              profileCompletion: 80,
            },
          },
        },
        include: { profile: true },
      }).catch(async () => {
        return prisma.user.findFirst({
          where: { OR: [{ id: clean }, { email: userEmail }] },
          include: { profile: true },
        });
      });
    }

    if (user && !user.isSuspended) return enrichWithSupabaseProfile(user);
  }

  return null;
}

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    let user = token && token !== 'anon' ? await resolveUserFromToken(token, req) : null;

    // Fallback: check headers if token verification was empty or anon
    if (!user) {
      user = await resolveUserFromToken(null, req);
    }

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
