import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'startupz_super_secret_jwt_key_2026_modern_startup_network';

// POST /api/auth/register
router.post('/register', async (req, res) => {
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
    const initialAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

    const user = await prisma.user.create({
      data: {
        email: emailNormalized,
        password: hashedPassword,
        role: role.toUpperCase(),
        profile: {
          create: {
            fullName: fullName.trim(),
            headline: headline || `${role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()} | Startup Enthusiast`,
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
        title: 'Welcome to StartupZ! 🚀',
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please enter your registered email address.' });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  return res.json({
    message: 'If an account exists with this email, a password reset link has been dispatched.',
    resetToken: user ? Buffer.from(user.email).toString('base64') : null,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid request or password too short (min 6 characters).' });
  }

  try {
    const email = Buffer.from(token, 'base64').toString('utf-8');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset link.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (err) {
    return res.status(400).json({ error: 'Failed to reset password.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', requireAuth, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { isVerified: true },
  });

  return res.json({ message: 'Email address successfully verified!' });
});

export default router;
