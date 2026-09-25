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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

app.listen(PORT, () => {
  console.log(`🚀 StartupZ Server running on http://localhost:${PORT}`);
});
