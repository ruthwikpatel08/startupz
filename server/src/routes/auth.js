import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { requireAuth, revokeToken } from '../middleware/auth.js';
import { JWT_SECRET } from '../config/jwt.js';
import { supabaseAdmin } from '../supabase.js';
import {
  authLoginLimiter,
  authRegisterLimiter,
  authPasswordResetLimiter,
  authSyncLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();

const ALLOWED_USER_ROLES = new Set([
  'FOUNDER',
  'COFOUNDER',
  'INVESTOR',
  'MENTOR',
  'DEVELOPER',
  'DESIGNER',
  'MARKETER',
  'STUDENT',
]);

function sanitizeUserRole(role) {
  const upper = String(role || '').toUpperCase().trim();
  return ALLOWED_USER_ROLES.has(upper) ? upper : 'FOUNDER';
}

// POST /api/auth/register
router.post('/register', authRegisterLimiter, async (req, res) => {
  try {
    const { fullName, email, password, role = 'FOUNDER', headline, location } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Please provide full name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initialAvatar = null;
    const safeRole = sanitizeUserRole(role);

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        password: hashedPassword,
        role: safeRole,
        profile: {
          create: {
            fullName: fullName.trim(),
            headline: headline || `${safeRole.charAt(0).toUpperCase() + safeRole.slice(1).toLowerCase()} | Startup Enthusiast`,
            location: location || 'Global / Remote',
            avatar: initialAvatar,
            openTo: role.toUpperCase() === 'FOUNDER' 
              ? 'Co-Founder,Startup Team,Investment,Mentorship'
              : 'Co-Founder,Startup Team,Collaboration',
            profileCompletion: 45,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Welcome to HookZ! 🚀',
        message: 'Complete your profile to unlock high-accuracy co-founder and startup matches.',
        link: '/profile',
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({
      message: 'Registration successful!',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Something went wrong during registration. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', authLoginLimiter, async (req, res) => {
  try {
    const { email, identifier: rawId, password } = req.body;
    let identifier = (email || rawId || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email, Gmail, or username and password are required.' });
    }

    // Strict validation against PostgREST filter injection & syntax corruption (SEC-08)
    if (!/^[a-zA-Z0-9_.@+-]{1,100}$/.test(identifier)) {
      return res.status(401).json({ error: 'Invalid email, username, or password.' });
    }

    if (identifier.endsWith('@gmail')) {
      identifier = `${identifier}.com`;
    }

    const cleanUsername = identifier.replace(/^@/, '');

    // 1. Try finding by direct email, gmail handle, or username
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { email: identifier.includes('@') ? identifier : `${identifier}@gmail.com` },
          { profile: { username: cleanUsername } },
        ],
      },
      include: { profile: true },
    });

    // 2. Fallback to Supabase profiles to resolve email if not directly found
    if (!user && supabaseAdmin) {
      try {
        const safeIdentifier = identifier.replace(/[^a-zA-Z0-9_.@+-]/g, '');
        const safeUsername = cleanUsername.replace(/[^a-zA-Z0-9_]/g, '');

        const orFilters = [
          `email.ilike.${safeIdentifier}`,
          `email.ilike.${safeIdentifier}@gmail.com`,
        ];
        if (safeUsername) {
          orFilters.push(`username.ilike.${safeUsername}`);
        }

        const { data: matchedProfiles } = await supabaseAdmin
          .from('profiles')
          .select('email, username')
          .or(orFilters.join(','))
          .limit(1);

        if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
          user = await prisma.user.findUnique({
            where: { email: matchedProfiles[0].email.toLowerCase() },
            include: { profile: true },
          });
        }
      } catch (sbErr) {
        console.warn('Supabase profile login lookup notice:', sbErr.message);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email, username, or password.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email, username, or password.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      message: 'Login successful!',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Something went wrong during login. Please try again.' });
  }
});

// POST /api/auth/google - Authenticate using verified Google or Supabase token (SEC-07)
router.post('/google', authLoginLimiter, async (req, res) => {
  try {
    const { idToken, credential, supabaseToken, accessToken, email, fullName, name, avatar } = req.body;
    let verifiedEmail = null;
    let verifiedName = fullName || name || null;
    let verifiedAvatar = avatar || null;

    // 1. Verify Google ID token if provided (SEC-07: Mandatory Audience, Issuer, Expiry, and Signature Validation)
    const tokenToVerify = idToken || credential;
    if (tokenToVerify && typeof tokenToVerify === 'string') {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        console.error('SEC-07: GOOGLE_CLIENT_ID environment variable is missing.');
        return res.status(500).json({ error: 'Server configuration error: GOOGLE_CLIENT_ID is not configured.' });
      }

      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenToVerify)}`);
        if (!googleRes.ok) {
          return res.status(401).json({ error: 'Invalid or forged Google authentication token.' });
        }

        const gData = await googleRes.json();
        
        // Audience validation is strictly mandatory (SEC-07)
        if (gData.aud !== googleClientId) {
          return res.status(401).json({ error: 'Google authentication failed: Token audience does not match this application.' });
        }

        // Issuer verification
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!validIssuers.includes(gData.iss)) {
          return res.status(401).json({ error: 'Google authentication failed: Invalid token issuer.' });
        }

        // Expiration check
        const nowSec = Math.floor(Date.now() / 1000);
        if (!gData.exp || Number(gData.exp) < nowSec) {
          return res.status(401).json({ error: 'Google authentication token has expired.' });
        }

        // Verified identity check
        if ((gData.email_verified !== 'true' && gData.email_verified !== true) || !gData.email) {
          return res.status(401).json({ error: 'Google account email is not verified.' });
        }

        verifiedEmail = gData.email.toLowerCase().trim();
        if (gData.name) verifiedName = gData.name;
        if (gData.picture) verifiedAvatar = gData.picture;
      } catch (gErr) {
        console.error('Google token verification error:', gErr.message);
        return res.status(401).json({ error: 'Failed to verify Google authentication token.' });
      }
    }

    // 2. Fallback: Verify Supabase Auth token if Google OAuth was completed via Supabase client
    const supaToken = supabaseToken || accessToken;
    if (!verifiedEmail && supaToken && supabaseAdmin) {
      try {
        const { data: supaAuth, error: supaErr } = await supabaseAdmin.auth.getUser(supaToken);
        if (!supaErr && supaAuth?.user?.email) {
          verifiedEmail = supaAuth.user.email.toLowerCase().trim();
          verifiedName = supaAuth.user.user_metadata?.full_name || supaAuth.user.user_metadata?.name || verifiedName;
          verifiedAvatar = supaAuth.user.user_metadata?.avatar_url || supaAuth.user.user_metadata?.picture || verifiedAvatar;
        }
      } catch (sErr) {
        console.warn('Supabase token verification error:', sErr.message);
      }
    }

    // Cryptographic validation failure: reject unverified requests (SEC-07)
    if (!verifiedEmail) {
      return res.status(401).json({
        error: 'Invalid or missing Google authentication token. Please complete authentication through Google.',
      });
    }

    const displayName = verifiedName || verifiedEmail.split('@')[0];

    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
      include: { profile: true },
    });

    if (!user) {
      const generatedPassword = await bcrypt.hash(`GoogleAuth_${Math.random()}_2026!`, 10);
      const userAvatar = avatar || null;

      user = await prisma.user.create({
        data: {
          email: verifiedEmail,
          password: generatedPassword,
          role: 'FOUNDER',
          isVerified: true,
          verificationBadge: 'Verified User',
          profile: {
            create: {
              fullName: displayName,
              headline: 'Founder & Builder | HookZ Network',
              location: 'Global / Remote',
              avatar: userAvatar,
              openTo: 'Co-Founder,Startup Team,Investment,Mentorship',
              profileCompletion: 65,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          title: 'Welcome via Google! 🚀',
          message: 'Your Google account has been connected. Start discovering co-founders and startups.',
          link: '/profile',
        },
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      message: 'Google authentication successful!',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Failed to process Google sign-in. Please try again.' });
  }
});

// POST /api/auth/sync - Ensure any logged-in real user is saved in DB and receives a valid token
router.post('/sync', authSyncLimiter, async (req, res) => {
  try {
    const { id, email, fullName, role = 'FOUNDER', headline, location, bio, avatar, skills, username } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email is required for synchronization.' });
    }

    const cleanName = fullName || cleanEmail.split('@')[0];
    const safeRole = sanitizeUserRole(role); // Prevent privilege escalation to ADMIN (SEC-02)

    // Authenticate the caller to prevent unauthorized account takeover/synchronization
    let callerUserId = null;
    let callerEmail = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.userId) {
          callerUserId = decoded.userId;
        }
      } catch {
        // Not a HookZ token; check if it is a valid Supabase access token
        if (supabaseAdmin) {
          try {
            const { data: { user: supaUser }, error } = await supabaseAdmin.auth.getUser(token);
            if (supaUser && !error) {
              callerUserId = supaUser.id;
              callerEmail = (supaUser.email || '').toLowerCase().trim();
            }
          } catch {
            // Ignore token verification errors
          }
        }
      }
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(id ? [{ id }] : []),
          { email: cleanEmail },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      // If caller is authenticated under a different email, prevent spoofing
      if (callerEmail && callerEmail !== cleanEmail) {
        return res.status(403).json({ error: 'Authenticated email does not match sync request email.' });
      }

      const generatedPassword = await bcrypt.hash(`AuthSync_${Date.now()}_${Math.random().toString(36)}!`, 10);
      user = await prisma.user.create({
        data: {
          id: id || undefined,
          email: cleanEmail,
          password: generatedPassword,
          role: safeRole,
          isVerified: true,
          verificationBadge: 'Verified Member',
          profile: {
            create: {
              fullName: cleanName,
              username: username || cleanEmail.split('@')[0],
              headline: headline || `${safeRole.charAt(0) + safeRole.slice(1).toLowerCase()} | Startup Builder`,
              location: location || 'Remote',
              bio: bio || null,
              skills: skills || null,
              avatar: avatar || null,
              openTo: 'Co-Founder,Startup Team,Investment',
              profileCompletion: 85,
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // Existing user: caller MUST be authenticated as this user to modify their profile or get a token
      const isOwner = (callerUserId && (callerUserId === user.id || callerUserId === user.profile?.userId)) ||
                      (callerEmail && callerEmail === user.email);

      if (!isOwner) {
        return res.status(401).json({ error: 'Authentication required to synchronize an existing account.' });
      }

      // Only update role if valid non-admin role and user is not currently an admin
      if (user.role !== safeRole && safeRole !== 'ADMIN' && user.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: safeRole },
        }).catch(() => null);
      }

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          fullName: cleanName,
          username: username || user.profile?.username || cleanEmail.split('@')[0],
          headline: headline || user.profile?.headline || `${safeRole} | Startup Builder`,
          location: location || user.profile?.location || 'Remote',
          bio: bio || null,
          skills: skills || null,
          avatar: avatar || user.profile?.avatar || null,
          openTo: 'Co-Founder,Startup Team,Investment',
          profileCompletion: 85,
        },
        update: {
          fullName: cleanName || undefined,
          username: username || undefined,
          headline: headline || undefined,
          location: location || undefined,
          bio: bio || undefined,
          skills: skills || undefined,
          avatar: avatar || undefined,
        },
      });
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      message: 'User synchronized successfully',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return res.status(500).json({ error: 'Failed to synchronize user session.' });
  }
});


// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        startups: {
          select: { id: true, name: true, logo: true, stage: true, industry: true },
        },
        investorProfile: true,
        mentorProfile: true,
      },
    });

    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    const pendingConnectionsCount = await prisma.connection.count({
      where: { receiverId: req.user.id, status: 'PENDING' },
    });

    const unreadMessagesCount = await prisma.message.count({
      where: { receiverId: req.user.id, isRead: false },
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      user: userWithoutPassword,
      unreadNotificationsCount,
      pendingConnectionsCount,
      unreadMessagesCount,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authPasswordResetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid registered email address.' });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Token is bound to current password state: once changed, token becomes permanently invalid (SEC-09)
  const passHash = user && user.password ? user.password.slice(-10) : 'initial';
  const resetToken = user
    ? jwt.sign({ email: user.email, purpose: 'password_reset', passHash }, JWT_SECRET, { expiresIn: '15m' })
    : null;

  // Never leak resetToken in production response. Only exposed if explicitly requested in isolated local dev test
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  return res.json({
    message: 'If an account exists with this email, password reset instructions have been generated.',
    ...(isDev && process.env.EXPOSE_RESET_TOKEN_IN_DEV === 'true' ? { resetToken } : {}),
  });
});

// POST /api/auth/reset-password - Single-use token validation & session revocation (SEC-09)
router.post('/reset-password', authPasswordResetLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid request or password too short (min 6 characters).' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.purpose !== 'password_reset' || !decoded.email || !decoded.passHash) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    const user = await prisma.user.findUnique({ where: { email: decoded.email.trim().toLowerCase() } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    // Verify token has not already been used (state check) (SEC-09)
    const currentPassHash = user.password ? user.password.slice(-10) : 'initial';
    if (decoded.passHash !== currentPassHash) {
      return res.status(400).json({ error: 'This password reset link has already been used. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate reset token immediately (SEC-09)
    revokeToken(token);

    return res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or expired password reset link.' });
  }
});

// POST /api/auth/logout - Revokes current session token on the server (SEC-11)
router.post('/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    revokeToken(token);
  }
  return res.json({ message: 'Logged out successfully and session revoked.' });
});

// POST /api/auth/verify-email
router.post('/verify-email', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { isVerified: true },
  });

  return res.json({ message: 'Email address successfully verified!' });
});

// POST /api/auth/set-password (sets or updates password for Google/OAuth/new users)
router.post('/set-password', requireAuth, authPasswordResetLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return res.json({ message: 'Password set successfully! You can now log in using your password.' });
  } catch (err) {
    console.error('Set password error:', err);
    return res.status(500).json({ error: 'Failed to set password.' });
  }
});

export default router;
