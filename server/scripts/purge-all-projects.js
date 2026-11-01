import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/db.js';
import { supabaseAdmin } from '../src/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_DELETED_FILE = path.resolve(__dirname, '../src/realData/deletedProjects.json');
const DATA_DELETED_FILE = path.resolve(__dirname, '../data/deleted_projects.json');
const DATA_PROJECTS_FILE = path.resolve(__dirname, '../data/projects.json');
const DATA_MESSAGES_FILE = path.resolve(__dirname, '../data/project_messages.json');

async function purgeAllProjects() {
  console.log('🚀 Purging all existing projects from database, cloud, and disk...');

  // 1. Fetch all project IDs from database & Supabase
  const deletedIds = new Set();

  try {
    const dbProjects = await prisma.$queryRawUnsafe('SELECT id FROM projects');
    if (Array.isArray(dbProjects)) {
      dbProjects.forEach((p) => p && p.id && deletedIds.add(String(p.id)));
    }
  } catch (e) {
    console.warn('Notice querying DB projects:', e.message);
  }

  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.from('projects').select('id');
      if (Array.isArray(data)) {
        data.forEach((p) => p && p.id && deletedIds.add(String(p.id)));
      }
    } catch (e) {
      console.warn('Notice querying Supabase projects:', e.message);
    }
  }

  // Also include known previous project IDs
  deletedIds.add('proj-1792696679988-e26pw');
  deletedIds.add('proj-1792682406796-uwaja');
  deletedIds.add('proj-1791623161755-z23fk');
  deletedIds.add('proj-1');
  deletedIds.add('proj-2');
  deletedIds.add('proj-3');

  console.log(`Discovered ${deletedIds.size} project IDs to purge permanently:`, Array.from(deletedIds));

  // 2. Delete all records from Supabase
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('project_messages').delete().neq('id', 'keep_none_delete_all');
      await supabaseAdmin.from('projects').delete().neq('id', 'keep_none_delete_all');
      for (const id of deletedIds) {
        await supabaseAdmin.from('deleted_projects').upsert({ id }, { onConflict: 'id' });
      }
      console.log('✅ Supabase projects and messages cleared.');
    } catch (e) {
      console.warn('Supabase purge error:', e.message);
    }
  }

  // 3. Delete all records from PostgreSQL direct via Prisma
  try {
    await prisma.$executeRawUnsafe('DELETE FROM project_messages').catch(() => {});
    await prisma.$executeRawUnsafe('DELETE FROM projects').catch(() => {});
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS deleted_projects (
        id TEXT PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).catch(() => {});
    for (const id of deletedIds) {
      await prisma.$executeRawUnsafe('INSERT INTO deleted_projects (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', id).catch(() => {});
    }
    console.log('✅ PostgreSQL direct projects and messages deleted, deleted_projects populated.');
  } catch (e) {
    console.warn('PostgreSQL purge error:', e.message);
  }

  // 4. Update deletedProjects.json
  const deletedArr = Array.from(deletedIds);
  fs.writeFileSync(REAL_DELETED_FILE, JSON.stringify(deletedArr, null, 2), 'utf8');
  try {
    const dataDir = path.dirname(DATA_DELETED_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(DATA_DELETED_FILE, JSON.stringify(deletedArr, null, 2), 'utf8');
    fs.writeFileSync(DATA_PROJECTS_FILE, '[]\n', 'utf8');
    fs.writeFileSync(DATA_MESSAGES_FILE, '{}\n', 'utf8');
    console.log('✅ Local server/data project files emptied.');
  } catch (e) {
    console.warn('Error clearing data files:', e.message);
  }

  console.log('🎉 All projects successfully removed and deleted!');
  process.exit(0);
}

purgeAllProjects().catch((err) => {
  console.error('Purge script failed:', err);
  process.exit(1);
});
