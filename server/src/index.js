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

import { execSync } from 'child_process';
import { prisma } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
}));
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
    res.json({
      status: 'ok',
      database: 'connected',
      userCount,
      startupCount,
      failedStartupCount,
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
    res.json({
      status: 'ok',
      message: 'Database schema pushed and seeded successfully.',
      userCount,
      startupCount,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
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

async function ensureDatabaseReady() {
  try {
    await prisma.user.count();
    console.log('✅ Database connected and verified.');
  } catch (err) {
    console.log('⚠️ Database uninitialized. Running prisma db push...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema pushed successfully.');
    } catch (pushErr) {
      console.error('Failed to run prisma db push automatically:', pushErr.message);
    }
  }

  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Seeding initial accounts and startup data...');
      try {
        const { main: seedDatabase } = await import('./seed.js');
        if (seedDatabase) {
          await seedDatabase();
        }
      } catch (seedErr) {
        console.error('Auto-seed error:', seedErr.message);
      }
    }
  } catch (e) {
    console.warn('Seed verification check:', e.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 StartupZ Server running on http://localhost:${PORT}`);
  await ensureDatabaseReady();
});
