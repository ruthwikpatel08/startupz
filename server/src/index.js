import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import startupRoutes from './routes/startups.js';
import opportunityRoutes from './routes/opportunities.js';
import connectionRoutes from './routes/connections.js';
import investorRoutes from './routes/investors.js';
import mentorRoutes from './routes/mentors.js';
import postRoutes from './routes/posts.js';
import messageRoutes from './routes/messages.js';
import savedRoutes from './routes/saved.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import reportRoutes from './routes/reports.js';
import verificationRoutes from './routes/verifications.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import meetingRoutes from './routes/meetings.js';
import aiRoutes from './routes/ai.js';
import failedStartupRoutes from './routes/failedStartups.js';
import problemsRoutes from './routes/problems.js';

import { execSync } from 'child_process';
import { prisma } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'StartupZ API Server',
    tagline: 'Find the right people. Build the right startup.',
    time: new Date().toISOString(),
  });
});

// Database Health Check & Diagnostic
app.get('/api/health/db', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const startupCount = await prisma.startup.count();
    const failedStartupCount = await prisma.failedStartup.count();
    const problemCount = await prisma.problem.count().catch(() => 0);
    res.json({
      status: 'ok',
      database: 'connected',
      userCount,
      startupCount,
      failedStartupCount,
      problemCount,
      provider: process.env.DATABASE_URL ? (process.env.DATABASE_URL.startsWith('postgres') ? 'postgresql' : 'sqlite') : 'sqlite',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});

// Database Auto-Init & Seed Endpoint (can be called remotely to bootstrap database)
app.get('/api/health/db/init', async (req, res) => {
  try {
    await ensureDatabaseReady();
    const userCount = await prisma.user.count();
    const startupCount = await prisma.startup.count();
    const problemCount = await prisma.problem.count().catch(() => 0);
    res.json({
      status: 'ok',
      message: 'Database schema pushed and seeded successfully.',
      userCount,
      startupCount,
      problemCount,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});


// Maintenance Endpoint: Purge all demo data from database
app.all('/api/health/purge-demo-data', async (req, res) => {
  try {
    const result = await purgeDemoDatabase();
    res.json({
      status: 'ok',
      message: 'Demo data purged successfully.',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/failed-startups', failedStartupRoutes);
app.use('/api/problems', problemsRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  return res.status(500).json({ error: 'Internal server error occurred.' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} not found.` });
});

async function purgeDemoDatabase() {
  const realEmails = ['ruthwikpatel08@gmail.com', 'legacyplayer04@gmail.com', 'lavanyadav0206@gmail.com'];
  
  // 1. Delete all demo startups, opportunities, and interactions
  await prisma.opportunityApplication.deleteMany({});
  await prisma.startupOpportunity.deleteMany({});
  await prisma.startupMember.deleteMany({});
  await prisma.startupFollow.deleteMany({});
  await prisma.startup.deleteMany({});
  await prisma.investor.deleteMany({});
  await prisma.mentor.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.connection.deleteMany({});
  await prisma.startupProposal.deleteMany({});
  await prisma.videoMeeting.deleteMany({});

  // 2. Delete non-real / demo user accounts (including all 43 startup team accounts)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      NOT: {
        email: { in: realEmails },
      },
      OR: [
        { role: 'STARTUP' },
        { email: { startsWith: 'contact@' } },
        { email: { startsWith: 'advisory@' } },
        { email: { contains: 'demo' } },
        { email: { contains: 'sarah.chen' } },
        { email: { contains: 'marcus.dev' } },
        { email: { contains: 'david.kim' } },
        { email: { contains: 'codeflow' } },
        { email: { contains: 'aiagri' } },
        { email: { contains: 'hyperbuild' } },
        { email: { contains: 'pixelcraft' } },
        { email: { contains: 'marketscale' } },
        { email: { contains: 'apexventures' } },
        { email: { contains: 'healthventures' } },
        { email: { contains: 'dr.aravind' } },
        { email: { contains: 'admin@startupz.com' } },
        { email: { contains: '@startupz.com' } },
      ],
    },
  });

  const remainingUsers = await prisma.user.count();
  const remainingStartups = await prisma.startup.count();
  const remainingOpportunities = await prisma.startupOpportunity.count();

  return {
    deletedUsers: deletedUsers.count,
    remainingUsers,
    remainingStartups,
    remainingOpportunities,
  };
}

async function ensureDatabaseReady() {
  try {
    await prisma.user.count();
    await prisma.problem.count();
    console.log('✅ Database connected and verified.');
  } catch (err) {
    console.log('⚠️ Database uninitialized or schema update needed. Running prisma db push...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema pushed successfully.');
    } catch (pushErr) {
      console.error('Failed to run prisma db push automatically:', pushErr.message);
    }
  }

  try {
    const userCount = await prisma.user.count();
    const problemCount = await prisma.problem.count().catch(() => 0);
    if (userCount === 0 || problemCount === 0) {
      console.log('🌱 Database needs seed data (users or problems). Seeding initial accounts and problem statements...');
      try {
        const { main: seedDatabase } = await import('./seed.js');
        if (seedDatabase) {
          await seedDatabase();
        }
      } catch (seedErr) {
        console.error('Auto-seed error:', seedErr.message);
      }
    }

    // Always run demo purge to guarantee clean state
    await purgeDemoDatabase();
  } catch (e) {
    console.warn('Startup verification notice:', e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 StartupZ Server running on http://localhost:${PORT}`);
  await ensureDatabaseReady();
});
