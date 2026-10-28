import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'node:fs';
dotenv.config({ quiet: true });
dotenv.config({ path: 'server/.env', quiet: true });
const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url?.startsWith('postgres')) { console.log('No PostgreSQL connection configured; live RPC deployment cannot be verified.'); process.exit(0); }
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
try { await client.connect();
  if (process.argv.includes('--apply')) await client.query(fs.readFileSync('supabase/migrations/015_onboarding_completion.sql', 'utf8'));
  if (process.argv.includes('--repair-consent')) await client.query(fs.readFileSync('supabase/migrations/016_onboarding_consent_dependency.sql', 'utf8'));
  const result = await client.query("select to_regprocedure('public.complete_onboarding(jsonb,boolean,boolean)') is not null as rpc_exists, to_regclass('public.consent_logs') is not null as consent_table_exists"); console.log(result.rows[0]);
  if (!result.rows[0].rpc_exists || !result.rows[0].consent_table_exists) process.exitCode = 1;
  if (process.argv.includes('--apply')) await client.query("NOTIFY pgrst, 'reload schema'");
}
catch (e) { console.log('Database check failed:', e.code || e.name); process.exitCode = 1; }
finally { await client.end(); }
