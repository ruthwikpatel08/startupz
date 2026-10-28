// Reads schema only; --probe uses synthetic records in an always-rolled-back transaction.
import dotenv from 'dotenv';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
dotenv.config({ quiet: true });
dotenv.config({ path: 'server/.env', quiet: true });
const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  const columns = await db.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('profiles','users','consent_logs') ORDER BY table_name,ordinal_position");
  console.log('Columns:', columns.rows.map(c => `${c.table_name}.${c.column_name}:${c.data_type}${c.is_nullable === 'NO' ? ' required' : ''}`));
  console.log((await db.query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('public.profiles'::regclass,'public.users'::regclass,to_regclass('public.consent_logs'))")).rows);
  console.log((await db.query("SELECT tgrelid::regclass::text AS table_name,tgname,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('auth.users'::regclass,'public.profiles'::regclass,'public.users'::regclass)")).rows);
  if (process.argv.includes('--probe')) {
    await db.query('BEGIN');
    const id = randomUUID();
    await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data,created_at) VALUES ($1,$2,$3,now())", [id, `hookz-probe-${id}@example.test`, { onboarding_completed: false }]);
    console.log('Synthetic signup profile:', (await db.query('SELECT onboarding_completed FROM public.profiles WHERE user_id=$1', [id])).rows);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id]);
    await db.query('SET LOCAL ROLE authenticated');
    const answers = { role:'Student',fullName:'Recovery Probe',college:'Test University',year:'1st Year',major:'CS',primaryRole:'Frontend',skills:['React'],hackathons:'0',lookingFor:['Hackathon teammates'],bio:'' };
    console.log('RPC payload:', { p_answers: answers, p_profile_consent:true, p_terms_consent:true });
    const result = await db.query('SELECT public.complete_onboarding($1,true,true) AS profile',[answers]);
    console.log('RPC result:', result.rows);
  }
} catch (error) { console.error(JSON.stringify({ code:error.code,message:error.message,detail:error.detail,where:error.where })); process.exitCode=1; }
finally { await db.query('ROLLBACK').catch(() => {}); await db.end(); }
