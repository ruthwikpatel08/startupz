import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Ensure required environment variables have fallback defaults
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'startupz_super_secret_jwt_key_2026_modern_startup_network';
}
if (!process.env.PORT) {
  process.env.PORT = '5000';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// 2. Ensure .env exists in server root directory so Prisma CLI and external processes can read DATABASE_URL
const envPath = path.join(__dirname, '.env');
try {
  if (!fs.existsSync(envPath)) {
    const envLines = [
      `PORT=${process.env.PORT}`,
      `DATABASE_URL="${process.env.DATABASE_URL}"`,
      `JWT_SECRET="${process.env.JWT_SECRET}"`,
      `NODE_ENV="${process.env.NODE_ENV}"`,
      process.env.GEMINI_API_KEY ? `GEMINI_API_KEY="${process.env.GEMINI_API_KEY}"` : '',
    ].filter(Boolean);
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf8');
    console.log('[HookZ Startup] Created fallback .env file with default DATABASE_URL.');
  }
} catch (e) {
  console.warn('[HookZ Startup] Notice: could not write fallback .env file:', e.message);
}

// 3. Start the Express API server
console.log('[HookZ Startup] Starting Express API server...');
await import('./src/index.js');

