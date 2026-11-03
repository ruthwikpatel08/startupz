import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '../node_modules/.hookz-validation/node_modules/@electric-sql/pglite/dist/index.js';
import { privatePost, postAudienceAuthors } from '../server/src/utils/postAudience.js';
const owner = '00000000-0000-4000-8000-000000000001';
const peer = '00000000-0000-4000-8000-000000000002';
const stranger = '00000000-0000-4000-8000-000000000003';
assert.equal(privatePost({title:'[Connections Only]'}),true);
assert.equal(privatePost({title:'A normal update'}),false);
const prisma = {connection:{findMany:async()=>[{senderId:owner,receiverId:peer,status:'ACCEPTED'}]}};
assert.deepEqual([...await postAudienceAuthors([owner],prisma,null)],[owner,peer]);
const supabase = {from:()=>({select:()=>({or:async()=>({data:[{sender_id:owner,receiver_id:peer,status:'REJECTED'}]})})})};
assert.deepEqual([...await postAudienceAuthors([owner],prisma,supabase)],[owner]);
assert.deepEqual([...await postAudienceAuthors([],prisma,null)],[]);
const db = new PGlite();
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE TABLE posts(id uuid primary key,author_id uuid,title text);
 CREATE TABLE connections(sender_id uuid,receiver_id uuid,status text);
 CREATE TABLE comments(post_id uuid); CREATE TABLE likes(post_id uuid);
 GRANT USAGE ON SCHEMA auth TO anon,authenticated;
 GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon,authenticated;
 ALTER TABLE posts ENABLE ROW LEVEL SECURITY; ALTER TABLE comments ENABLE ROW LEVEL SECURITY; ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
 CREATE POLICY existing_posts ON posts FOR SELECT USING(true);
 CREATE POLICY existing_comments ON comments FOR SELECT USING(true);
 CREATE POLICY existing_likes ON likes FOR SELECT USING(true);
 INSERT INTO posts VALUES ('${owner}','${owner}','[Connections Only] Secret'),('${peer}','${owner}','Public');
 INSERT INTO comments VALUES ('${owner}'); INSERT INTO likes VALUES ('${owner}');`);
 const sql=fs.readFileSync('supabase/migrations/018_post_audience.sql','utf8');
 await db.exec(sql); await db.exec(sql);
 async function visible(user,expected){
  await db.exec(`SET ROLE authenticated; SET test.uid='${user}';`);
  assert.equal((await db.query('SELECT * FROM posts')).rows.length,expected);
  assert.equal((await db.query('SELECT * FROM comments')).rows.length,expected-1);
  assert.equal((await db.query('SELECT * FROM likes')).rows.length,expected-1);
  await db.exec('RESET ROLE');
 }
 await visible(owner,2); await visible(peer,1); await visible(stranger,1); await visible('',1);
 for (const [sender,receiver] of [[owner,peer],[peer,owner]]) {
  await db.exec(`TRUNCATE connections; INSERT INTO connections VALUES ('${sender}','${receiver}','PENDING');`);
  await visible(peer,1);
  await db.exec("UPDATE connections SET status='ACCEPTED'"); await visible(peer,2);
  await db.exec("UPDATE connections SET status='REJECTED'"); await visible(peer,1);
 }
 console.log('PASS audience: owner, both connection directions, pending/rejected, stranger, anonymous, comments/likes, backend-only relationships and migration idempotency');
} finally { await db.close(); }
