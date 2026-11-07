/**
 * HookZ Worldwide Opportunities Storage & Persistence Engine
 * Provides dual persistence across Supabase Cloud tables, PostgreSQL, and resilient JSON storage.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../../db.js';
import { supabaseAdmin } from '../../supabase.js';
import { INITIAL_SOURCE_REGISTRY } from './registry.js';
import { INITIAL_WORLDWIDE_OPPORTUNITIES } from './initialOpportunities.js';
import { OPPORTUNITY_STATUS, normalizeOpportunity } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const OPPS_FILE = path.join(DATA_DIR, 'worldwide_opportunities.json');
const SOURCES_FILE = path.join(DATA_DIR, 'opportunity_sources.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

let cachedOpportunities = [];
let cachedSources = [];
let isInitialized = false;

// Helpers for reading/writing local files safely
function readJsonFile(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`[OpportunitiesStorage] Error reading ${path.basename(filePath)}:`, err.message);
  }
  return fallback;
}

function writeJsonFile(filePath, data) {
  try {
    const tmp = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    console.warn(`[OpportunitiesStorage] Error writing ${path.basename(filePath)}:`, err.message);
  }
}

/**
 * Initializes database tables in PostgreSQL if connected.
 */
export async function syncDatabaseTables() {
  if (!prisma) return;
  try {
    // 1. Create opportunity_sources table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS opportunity_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        website TEXT NOT NULL,
        endpoint TEXT,
        collection_method TEXT NOT NULL,
        requires_api_key BOOLEAN DEFAULT FALSE,
        permission_status TEXT NOT NULL,
        attribution TEXT,
        sync_frequency_minutes INTEGER DEFAULT 360,
        status TEXT DEFAULT 'ACTIVE',
        last_successful_sync TIMESTAMPTZ,
        last_sync_error TEXT,
        total_collected INTEGER DEFAULT 0,
        supports_cancellation BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Create worldwide_opportunities table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS worldwide_opportunities (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        external_event_id TEXT NOT NULL,
        title TEXT NOT NULL,
        organizer_name TEXT NOT NULL,
        organizer_logo_url TEXT,
        logo_source_url TEXT,
        logo_permission_status TEXT DEFAULT 'TEXT_FALLBACK',
        description_summary TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        country TEXT DEFAULT 'Worldwide',
        city TEXT,
        location TEXT,
        participation_mode TEXT DEFAULT 'ONLINE',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        registration_open_date TIMESTAMPTZ,
        registration_deadline TIMESTAMPTZ,
        registration_url TEXT NOT NULL,
        original_source_url TEXT NOT NULL,
        price_type TEXT DEFAULT 'FREE',
        price_amount NUMERIC DEFAULT 0,
        currency TEXT DEFAULT 'FREE',
        certificate_available BOOLEAN DEFAULT FALSE,
        eligibility TEXT,
        skills_required JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'APPROVED',
        last_verified_at TIMESTAMPTZ DEFAULT NOW(),
        last_source_update_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ww_opps_status ON worldwide_opportunities(status)`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ww_opps_category ON worldwide_opportunities(category)`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_ww_opps_source ON worldwide_opportunities(source_id)`).catch(() => {});
  } catch (err) {
    // Database pooler might be in test mode or unready; fails gracefully
  }
}

/**
 * Initializes in-memory cache and loads records from Supabase / DB / JSON disk.
 */
export async function initStorage() {
  if (isInitialized) return;

  await syncDatabaseTables();

  // Load sources
  let sources = readJsonFile(SOURCES_FILE, []);
  if (sources.length === 0) {
    sources = [...INITIAL_SOURCE_REGISTRY];
    writeJsonFile(SOURCES_FILE, sources);
  }
  cachedSources = sources;

  // Load opportunities
  let opps = readJsonFile(OPPS_FILE, []);
  if (opps.length === 0) {
    opps = [...INITIAL_WORLDWIDE_OPPORTUNITIES];
    writeJsonFile(OPPS_FILE, opps);
  }
  cachedOpportunities = opps.map(o => normalizeOpportunity(o) || o);

  // Sync with Supabase if available
  if (supabaseAdmin) {
    try {
      const { data: supaOpps } = await supabaseAdmin
        .from('worldwide_opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (Array.isArray(supaOpps) && supaOpps.length > 0) {
        // Merge Supabase opportunities with local cache
        const map = new Map();
        cachedOpportunities.forEach(o => map.set(o.id, o));
        supaOpps.forEach(row => {
          const norm = normalizeOpportunity({
            ...row,
            skills_required: row.skills_required ? (typeof row.skills_required === 'string' ? JSON.parse(row.skills_required) : row.skills_required) : [],
          });
          if (norm) map.set(norm.id, norm);
        });
        cachedOpportunities = Array.from(map.values());
        writeJsonFile(OPPS_FILE, cachedOpportunities);
      }
    } catch (err) {
      // Supabase table may not exist yet or offline
    }
  }

  // Run initial expiry check
  markExpiredOpportunities();

  isInitialized = true;
}

/**
 * Returns all opportunities (including expired/cancelled for admin/filtering).
 */
export function getAllOpportunities() {
  if (!isInitialized) {
    initStorage().catch(() => {});
  }
  return cachedOpportunities;
}

/**
 * Returns active opportunities suitable for public discovery.
 */
export function getActivePublicOpportunities() {
  const all = getAllOpportunities();
  const now = Date.now();
  return all.filter(o => {
    if (o.status !== OPPORTUNITY_STATUS.APPROVED) return false;
    // Check if end_date has passed
    if (o.end_date && new Date(o.end_date).getTime() < now) return false;
    return true;
  });
}

/**
 * Returns single opportunity by ID.
 */
export function getOpportunityById(id) {
  const all = getAllOpportunities();
  return all.find(o => o.id === id) || null;
}

/**
 * Saves or updates a single opportunity record in local cache, disk, and Supabase.
 */
export async function saveOpportunity(opp) {
  const normalized = normalizeOpportunity(opp);
  if (!normalized) return null;

  const idx = cachedOpportunities.findIndex(o => o.id === normalized.id);
  if (idx !== -1) {
    cachedOpportunities[idx] = { ...cachedOpportunities[idx], ...normalized, updated_at: new Date().toISOString() };
  } else {
    cachedOpportunities.unshift(normalized);
  }

  writeJsonFile(OPPS_FILE, cachedOpportunities);

  // Sync to Supabase
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('worldwide_opportunities').upsert(normalized, { onConflict: 'id' });
    } catch (err) {
      console.warn('[Storage] Supabase save error:', err.message);
    }
  }

  // Sync to PostgreSQL
  if (prisma) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO worldwide_opportunities (
          id, source_id, external_event_id, title, organizer_name,
          organizer_logo_url, logo_source_url, logo_permission_status,
          description_summary, category, subcategory, country, city,
          location, participation_mode, start_date, end_date,
          registration_open_date, registration_deadline, registration_url,
          original_source_url, price_type, price_amount, currency,
          certificate_available, eligibility, skills_required, status,
          last_verified_at, last_source_update_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27::jsonb, $28,
          $29, $30, $31, $32
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          organizer_name = EXCLUDED.organizer_name,
          description_summary = EXCLUDED.description_summary,
          category = EXCLUDED.category,
          country = EXCLUDED.country,
          city = EXCLUDED.city,
          location = EXCLUDED.location,
          participation_mode = EXCLUDED.participation_mode,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          registration_deadline = EXCLUDED.registration_deadline,
          registration_url = EXCLUDED.registration_url,
          original_source_url = EXCLUDED.original_source_url,
          status = EXCLUDED.status,
          last_verified_at = EXCLUDED.last_verified_at,
          last_source_update_at = EXCLUDED.last_source_update_at,
          updated_at = EXCLUDED.updated_at
      `,
        normalized.id, normalized.source_id, normalized.external_event_id, normalized.title, normalized.organizer_name,
        normalized.organizer_logo_url, normalized.logo_source_url, normalized.logo_permission_status,
        normalized.description_summary, normalized.category, normalized.subcategory, normalized.country, normalized.city,
        normalized.location, normalized.participation_mode,
        normalized.start_date ? new Date(normalized.start_date) : null,
        normalized.end_date ? new Date(normalized.end_date) : null,
        normalized.registration_open_date ? new Date(normalized.registration_open_date) : null,
        normalized.registration_deadline ? new Date(normalized.registration_deadline) : null,
        normalized.registration_url, normalized.original_source_url, normalized.price_type,
        normalized.price_amount, normalized.currency, normalized.certificate_available,
        normalized.eligibility, JSON.stringify(normalized.skills_required), normalized.status,
        new Date(normalized.last_verified_at), new Date(normalized.last_source_update_at),
        new Date(normalized.created_at), new Date(normalized.updated_at)
      );
    } catch {}
  }

  return normalized;
}

/**
 * Saves a batch of opportunities efficiently.
 */
export async function saveOpportunitiesBatch(opps) {
  if (!Array.isArray(opps) || opps.length === 0) return [];
  const saved = [];
  for (const o of opps) {
    const res = await saveOpportunity(o);
    if (res) saved.push(res);
  }
  return saved;
}

/**
 * Performs automated expiry check on all opportunities:
 * - If end_date < now, marks status as EXPIRED (if currently APPROVED or PENDING_REVIEW)
 * - Preserves complete historical record in database without deletion!
 */
export function markExpiredOpportunities() {
  const now = Date.now();
  let changed = false;

  cachedOpportunities.forEach(o => {
    if (o.status === OPPORTUNITY_STATUS.APPROVED || o.status === OPPORTUNITY_STATUS.PENDING_REVIEW) {
      if (o.end_date && new Date(o.end_date).getTime() < now) {
        o.status = OPPORTUNITY_STATUS.EXPIRED;
        o.updated_at = new Date().toISOString();
        changed = true;
      }
    }
  });

  if (changed) {
    writeJsonFile(OPPS_FILE, cachedOpportunities);
  }
}

/**
 * Returns all registered sources.
 */
export function getAllSources() {
  if (!isInitialized) {
    initStorage().catch(() => {});
  }
  return cachedSources;
}

/**
 * Returns a registered source by ID.
 */
export function getSourceById(id) {
  const all = getAllSources();
  return all.find(s => s.id === id) || null;
}

/**
 * Updates a source's metadata and execution history.
 */
export async function saveSource(source) {
  if (!source || !source.id) return null;
  const idx = cachedSources.findIndex(s => s.id === source.id);
  if (idx !== -1) {
    cachedSources[idx] = { ...cachedSources[idx], ...source };
  } else {
    cachedSources.push(source);
  }

  writeJsonFile(SOURCES_FILE, cachedSources);

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('opportunity_sources').upsert(source, { onConflict: 'id' });
    } catch {}
  }

  return cachedSources[idx !== -1 ? idx : cachedSources.length - 1];
}

