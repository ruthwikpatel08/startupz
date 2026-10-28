import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
import problemsRoutes, { checkAndRefreshWeeklyProblems } from './routes/problems.js';
import projectsRoutes from './routes/projects.js';
import consentRoutes from './routes/consent.js';
import dsarRoutes from './routes/dsar.js';

import { execSync } from 'child_process';
import { prisma, checkTablesExist } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust immediate reverse proxy (Render load balancer) for safe req.ip resolution
app.set('trust proxy', 1);

// Disable technology fingerprinting
app.disable('x-powered-by');

// Baseline security headers (anti-clickjacking, MIME sniffing protection, XSS filter)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Enforce HTTPS & HSTS when running in production behind reverse proxies (Render, Vercel, Cloudflare)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      const rawHost = req.headers.host || '';
      const safeHostPattern = /^[a-zA-Z0-9.\-]+(:\d+)?$/;
      const safeHost = safeHostPattern.test(rawHost) ? rawHost : (process.env.PUBLIC_DOMAIN || 'hookz.in');
      return res.redirect(301, `https://${safeHost}${req.originalUrl || req.url}`);
    }
  }

  next();
});

// CORS Configuration with strict allowlist (SEC-05)
const explicitAllowedOrigins = new Set([
  'https://hookz.in',
  'https://www.hookz.in',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((s) => s.trim().replace(/\/+$/, '')) : []),
].filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow non-browser requests (same-origin, curl, server-to-server)
  const normalized = origin.trim().replace(/\/+$/, '');
  if (explicitAllowedOrigins.has(normalized)) return true;
  try {
    const url = new URL(normalized);
    // Allow Vercel preview environments specifically for HookZ / StartupZ projects
    if (url.hostname.endsWith('.vercel.app') && (url.hostname.includes('hookz') || url.hostname.includes('startupz'))) {
      return true;
    }
  } catch {}
  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-user-id',
    'x-user-email',
    'x-admin-maintenance-secret',
    'x-admin-secret',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve uploads with strict sandboxing and content-type isolation (SEC-04)
const uploadStaticOptions = {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  },
};
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads'), uploadStaticOptions));
app.use('/uploads', express.static(path.resolve('public/uploads'), uploadStaticOptions));

// Health Check / Keep-Alive (Optimized for cron pings & minimal response size)
app.all(['/api/health', '/health'], (req, res) => {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  res.status(200).json({ status: 'ok' });
});

// Database Health Check & Diagnostic
app.get('/api/health/db', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    const tablesReady = await checkTablesExist(['User', 'Startup']);

    if (!tablesReady) {
      return res.json({
        status: 'initializing',
        database: 'connected',
        tablesReady: false,
      });
    }

    if (isAuthorizedMaintenanceRequest(req)) {
      const userCount = await prisma.user.count().catch(() => 0);
      const startupCount = await prisma.startup.count().catch(() => 0);
      const failedStartupCount = prisma.failedStartup ? await prisma.failedStartup.count().catch(() => 0) : 0;
      const problemCount = prisma.problem ? await prisma.problem.count().catch(() => 0) : 0;
      return res.json({
        status: 'ok',
        database: 'connected',
        tablesReady: true,
        userCount,
        startupCount,
        failedStartupCount,
        problemCount,
        provider: process.env.DATABASE_URL ? (process.env.DATABASE_URL.startsWith('postgres') ? 'postgresql' : 'sqlite') : 'sqlite',
      });
    }

    return res.json({
      status: 'ok',
      database: 'connected',
      tablesReady: true,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database check failed',
    });
  }
});

// Database Maintenance Endpoint: Requires authenticated maintenance secret (SEC-03)
app.get('/api/health/db/init', async (req, res) => {
  if (!isAuthorizedMaintenanceRequest(req)) {
    return res.status(403).json({ error: 'Unauthorized maintenance operation. Valid maintenance secret required.' });
  }

  try {
    await ensureDatabaseReady();
    const userCount = await prisma.user.count();
    const startupCount = await prisma.startup.count();
    const problemCount = prisma.problem ? await prisma.problem.count().catch(() => 0) : 0;
    res.json({
      status: 'ok',
      message: 'Database schema verified successfully.',
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


/**
 * Helper to safely authenticate admin maintenance requests in constant time.
 * Requires ADMIN_MAINTENANCE_SECRET (min 32 chars) and header-based authentication.
 * Rejects query-parameter credentials and fails closed if configuration is missing.
 */
export function isAuthorizedMaintenanceRequest(req) {
  const configuredSecret = process.env.ADMIN_MAINTENANCE_SECRET;
  if (!configuredSecret || typeof configuredSecret !== 'string' || configuredSecret.length < 32) {
    return false;
  }

  const providedSecret = req.headers?.['x-admin-maintenance-secret'] || req.headers?.['x-admin-secret'];
  if (!providedSecret || typeof providedSecret !== 'string') {
    return false;
  }

  const expectedBuf = Buffer.from(configuredSecret, 'utf8');
  const providedBuf = Buffer.from(providedSecret, 'utf8');

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// Maintenance Endpoint: Purge all demo data from database (admin protected)
app.post('/api/health/purge-demo-data', async (req, res) => {
  if (!isAuthorizedMaintenanceRequest(req)) {
    return res.status(403).json({ error: 'Unauthorized maintenance operation.' });
  }
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
app.use('/api/projects', projectsRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/dsar', dsarRoutes);

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

  // Delete all demo startups, opportunities, and interactions (preserving real user startups, posts, and connections)
  await prisma.opportunityApplication.deleteMany({});
  await prisma.startupOpportunity.deleteMany({});
  await prisma.startupMember.deleteMany({});
  await prisma.startupFollow.deleteMany({});
  await prisma.startup.deleteMany({
    where: {
      founder: {
        email: {
          notIn: realEmails,
          OR: [
            { contains: 'demo' },
            { startsWith: 'contact@' },
            { contains: '@startupz.com' },
          ],
        },
      },
    },
  });
  await prisma.investor.deleteMany({});
  await prisma.mentor.deleteMany({});
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
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (connErr) {
    console.warn('⚠️ Database connection check notice:', connErr.message);
    return false;
  }

  let tablesReady = await checkTablesExist(['User', 'Problem']);

  if (!tablesReady) {
    console.log('⚠️ Database uninitialized or schema tables missing. Attempting automated synchronization...');
    try {
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      execSync('npx prisma generate', { stdio: 'inherit' });
      tablesReady = await checkTablesExist(['User', 'Problem']);
      if (tablesReady) {
        console.log('✅ Database schema pushed and tables verified successfully.');
      } else {
        console.warn('Notice: Automated schema push completed but tables were not detected. Migration scripts may be required.');
      }
    } catch (pushErr) {
      console.warn('Notice: Automated prisma db push notice:', pushErr.message);
    }
  } else {
    console.log('✅ Database connected and verified.');
  }

  if (tablesReady) {
    try {
      const userCount = await prisma.user.count().catch(() => 0);
      const problemCount = prisma.problem ? await prisma.problem.count().catch(() => 0) : 0;
      if (userCount === 0 || problemCount === 0) {
        console.log('🌱 Database needs seed data (users or problems). Seeding initial accounts and problem statements...');
        try {
          const { main: seedDatabase } = await import('./seed.js');
          if (seedDatabase) {
            await seedDatabase();
          }
        } catch (seedErr) {
          console.warn('Auto-seed notice:', seedErr.message);
        }
      }
    } catch (e) {
      console.warn('Startup verification notice:', e.message);
    }
  }

  return tablesReady;
}

const isServerEntry = process.argv[1] && (
  process.argv[1].endsWith('start.js') ||
  process.argv[1].endsWith('src\\index.js') ||
  process.argv[1].endsWith('src/index.js') ||
  process.argv[1].endsWith('server\\index.js') ||
  process.argv[1].endsWith('server/index.js')
);

if (isServerEntry && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🚀 StartupZ Server running on http://localhost:${PORT}`);
    const isReady = await ensureDatabaseReady();
    if (isReady) {
      checkAndRefreshWeeklyProblems().catch(() => {});
    } else {
      console.log('ℹ️ [WeeklyProblems] Postponed weekly refresh check until schema tables are verified.');
    }
  });
}
