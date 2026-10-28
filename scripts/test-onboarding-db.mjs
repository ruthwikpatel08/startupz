// Isolated PostgreSQL checks, never uses a live database or credentials.
// One-time test runtime: npm install --prefix node_modules/.hookz-validation --no-save --package-lock=false @electric-sql/pglite
import { PGlite } from '../node_modules/.hookz-validation/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
try {
  const initial = fs.readFileSync('supabase/migrations/001_initial_schema.sql', 'utf8');
  await db.exec(`CREATE SCHEMA auth;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    ${initial.match(/CREATE TABLE users \([\s\S]*?\n\);/)[0]}
    ${initial.match(/CREATE TABLE profiles \([\s\S]*?\n\);/)[0]}
    ALTER TABLE profiles ADD COLUMN email text;`);
  const ids = Array.from({ length: 5 }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);
  for (const [index, id] of ids.entries()) {
    await db.query('INSERT INTO auth.users VALUES ($1, $2)', [id, index === 0 ? {} : { onboarding_completed: false }]);
    await db.query("INSERT INTO users(id,email,password) VALUES ($1,$2,'')", [id, `builder${index}@example.test`]);
    await db.query("INSERT INTO profiles(user_id,full_name,email) VALUES ($1,'Before setup',$2)", [id, `builder${index}@example.test`]);
  }
  const migration = fs.readFileSync('supabase/migrations/015_onboarding_completion.sql', 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Idempotent deployment.
  assert.equal((await db.query('SELECT onboarding_completed FROM profiles WHERE user_id=$1', [ids[0]])).rows[0].onboarding_completed, true);
  assert.equal((await db.query('SELECT onboarding_completed FROM profiles WHERE user_id=$1', [ids[1]])).rows[0].onboarding_completed, false);
  const cases = [
    { role: 'Student', fullName: ' Aanya Shah ', college: 'Test University', year: 'Postgrad', major: 'CS', primaryRole: 'Frontend', skills: ['React', 'Figma'], hackathons: '0', lookingFor: ['Hackathon teammates'], bio: '' },
    { role: 'Investor', fullName: 'Maya Chen', organization: '', stages: ['Idea', 'Seed'], sectors: ['AI/ML'], checkSize: '$10k-$50k', mentoring: 'Yes', bio: '' },
    { role: 'Other', fullName: 'Rohan Mehta', otherRole: 'Community organizer', skills: ['Mentoring'], lookingFor: ['Mentoring students'], location: 'Remote', bio: '' },
  ];
  const submit = (answers, consent = true) => db.query('SELECT complete_onboarding($1,$2,true) AS profile', [answers, consent]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids[1]]);
  await assert.rejects(submit(cases[0]), /consent_logs.*does not exist/);
  assert.equal((await db.query('SELECT onboarding_completed FROM profiles WHERE user_id=$1', [ids[1]])).rows[0].onboarding_completed, false);
  const repair = fs.readFileSync('supabase/migrations/016_onboarding_consent_dependency.sql', 'utf8');
  await db.exec(repair);
  await db.exec(repair);
  await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(submit(cases[0]), /Sign in/);
  for (const [index, answers] of cases.entries()) {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids[index + 1]]);
    await assert.rejects(submit(answers, false), /consent/);
    await assert.rejects(submit({ ...answers, fullName: ' ' }), /Missing answer/);
    await assert.rejects(submit({ ...answers, role: 'ADMIN' }), /Choose Student/);
    await assert.rejects(submit({ ...answers, bio: 'a'.repeat(161) }), /oversized/);
    if (index === 0) {
      await assert.rejects(submit({ ...answers, year: 'invalid' }), /student selection/);
      await assert.rejects(submit({ ...answers, skills: ['React', 12] }), /Invalid selection/);
      await db.exec("ALTER TABLE consent_logs ADD CONSTRAINT simulated_failure CHECK (purpose = 'never');");
      await assert.rejects(submit(answers), /simulated_failure/);
      assert.equal((await db.query('SELECT onboarding_completed FROM profiles WHERE user_id=$1', [ids[1]])).rows[0].onboarding_completed, false);
      await db.exec('ALTER TABLE consent_logs DROP CONSTRAINT simulated_failure');
    }
    const result = (await submit({ ...answers, is_admin: true, user_id: ids[0], ignored: 'old branch' })).rows[0].profile;
    assert.equal(result.onboarding_completed, true);
    assert.equal(result.full_name, answers.fullName.trim());
    assert.equal(result.user_id, ids[index + 1]);
    assert.equal(result.onboarding_answers.ignored, undefined);
    assert.equal(result.onboarding_answers.is_admin, undefined);
    await submit(answers); // Retry cannot duplicate consent or rewrite completed data.
    assert.equal((await db.query('SELECT count(*)::int AS n FROM consent_logs WHERE user_id=$1', [ids[index + 1]])).rows[0].n, 2);
  }
  await db.exec('SET ROLE anon');
  await assert.rejects(submit(cases[0]), /permission denied/);
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids[4]]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await submit(cases[0])).rows[0].profile.onboarding_completed, true);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT full_name FROM profiles WHERE user_id=$1', [ids[0]])).rows[0].full_name, 'Before setup');
  console.log('PASS PostgreSQL: migration rerun, legacy preservation, 3 branches, input rejection, atomic rollback, retry idempotence, authenticated-only execution, owner isolation');
} catch (error) { console.error(error.message, error.detail || '', error.where || '', error.position, error.internalPosition, error.internalQuery); process.exitCode = 1; }
finally { await db.close(); }
