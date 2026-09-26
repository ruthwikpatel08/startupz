import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const envPath = path.join(__dirname, '.env');
try {
  if (!fs.existsSync(envPath)) {
    const envLines = [
      `PORT=${process.env.PORT}`,
      `DATABASE_URL="${process.env.DATABASE_URL}"`,
      `JWT_SECRET="${process.env.JWT_SECRET}"`,
      `NODE_ENV="${process.env.NODE_ENV}"`,
    ];
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf8');
  }
} catch (e) {
  // Ignored
}

const execEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

try {
  console.log('[StartupZ Build] Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', env: execEnv, cwd: __dirname });
} catch (err) {
  console.warn('[StartupZ Build] Warning during prisma generate:', err.message);
}

try {
  console.log('[StartupZ Build] Syncing database schema with Prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: execEnv, cwd: __dirname });
  console.log('[StartupZ Build] Database schema synchronized.');
} catch (err) {
  console.warn('[StartupZ Build] Warning during prisma db push:', err.message);
}

console.log('[StartupZ Build] Build step completed.');
