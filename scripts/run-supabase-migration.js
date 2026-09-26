import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.resolve(__dirname, '../server/.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
const seedDir = path.resolve(__dirname, '../supabase/seed');

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 StartupZ: Supabase Cloud PostgreSQL Migration Runner');
  console.log('====================================================\n');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📄 Found ${migrationFiles.length} migration file(s) in: ${migrationsDir}`);

  let combinedSql = '';
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`   - Loaded: ${file} (${Math.round(content.length / 1024)} KB)`);
    combinedSql += `\n-- Migration: ${file}\n` + content + '\n';
  }

  // Also include problems_seed.sql if available
  const problemsSeedPath = path.join(seedDir, 'problems_seed.sql');
  if (fs.existsSync(problemsSeedPath)) {
    const seedContent = fs.readFileSync(problemsSeedPath, 'utf8');
    console.log(`   - Loaded Seed: problems_seed.sql (${Math.round(seedContent.length / 1024)} KB)`);
    combinedSql += '\n-- Seed: problems_seed.sql\n' + seedContent + '\n';
  }

  const sql = combinedSql;

  const connectionString =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (connectionString && connectionString.startsWith('postgres')) {
    console.log(`🔌 Connecting to Supabase Cloud PostgreSQL via Connection Pooler / Direct URI...`);
    const client = new pg.Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await client.connect();
      console.log('✅ Connected to Supabase PostgreSQL database successfully!\n');

      console.log('⏳ Executing migration script (tables, indexes, RLS policies, and seed data)...');
      await client.query(sql);

      console.log('\n🎉 Migration applied successfully!\n');

      // Verify created tables
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      console.log('📋 Verified Tables in Public Schema:');
      res.rows.forEach((r, idx) => {
        console.log(`   ${idx + 1}. ${r.table_name}`);
      });

      // Verify seed record counts
      const counts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM profiles) as profiles_count,
          (SELECT COUNT(*) FROM startups) as startups_count,
          (SELECT COUNT(*) FROM startup_opportunities) as opportunities_count,
          (SELECT COUNT(*) FROM posts) as posts_count,
          (SELECT COUNT(*) FROM investors) as investors_count,
          (SELECT COUNT(*) FROM mentors) as mentors_count;
      `);

      console.log('\n📊 Seed Records Summary:');
      console.log(counts.rows[0]);

      await client.end();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Migration execution failed:', err.message);
      if (client) await client.end();
      process.exit(1);
    }
  } else if (supabaseUrl && serviceRoleKey) {
    console.log(`🌐 Supabase REST API credentials detected:`);
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Service Role Key: ${serviceRoleKey.slice(0, 12)}...`);

    // Execute via Supabase SQL endpoint if supported or inform user
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (response.ok) {
        console.log('✅ Migration applied via Supabase REST RPC!');
      } else {
        console.log('ℹ️  Tip: In Supabase Cloud, run the SQL script in your Supabase Dashboard:');
        console.log('   1. Open: https://app.supabase.com/project/_/sql');
        console.log(`   2. Copy contents from: supabase/migrations/001_initial_schema.sql`);
        console.log('   3. Click "Run" to initialize all tables, RLS policies, and seed data.');
        console.log('\nOr set SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" to run via CLI.');
      }
    } catch (err) {
      console.log('ℹ️  Supabase URL provided. Please provide SUPABASE_DB_URL (direct postgres connection URI) or paste 001_initial_schema.sql in the Supabase SQL editor.');
    }
  } else {
    console.log('ℹ️  No SUPABASE_DB_URL or DATABASE_URL provided in .env');
    console.log('\nTo run migrations automatically on Supabase Cloud:');
    console.log('1. Set in your .env file:');
    console.log('   SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"');
    console.log('2. Then run:');
    console.log('   npm run migrate:supabase');
    console.log('\nAlternatively:');
    console.log('Open your Supabase Cloud Dashboard -> SQL Editor, and paste:');
    console.log('   supabase/migrations/001_initial_schema.sql');
    console.log('It will create all 17 tables, enable RLS, and populate realistic seed data in 1 click!');
  }
}

runMigration().catch(console.error);
