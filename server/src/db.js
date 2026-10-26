import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

// Auto-append pgbouncer=true for Supabase pooler (port 6543) to prevent prepared statement conflicts
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes(':6543') && !process.env.DATABASE_URL.includes('pgbouncer=true')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}pgbouncer=true`;
}

import { JWT_SECRET } from './config/jwt.js';

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Gracefully checks whether the required database tables exist without triggering fatal Prisma model errors.
 * Compatible with Supabase PostgreSQL and SQLite.
 */
export async function checkTablesExist(tableNames = ['User', 'Problem']) {
  try {
    const isPostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
    const quoted = tableNames.map(t => `'${t}'`).join(', ');
    const sql = isPostgres
      ? `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${quoted})`
      : `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${quoted})`;

    const rows = await prisma.$queryRawUnsafe(sql);
    const found = new Set(rows.map(r => r.name || r.table_name));
    return tableNames.every(t => found.has(t));
  } catch (err) {
    console.warn('[Database] Table existence probe notice:', err.message);
    return false;
  }
}


