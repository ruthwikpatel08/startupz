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

