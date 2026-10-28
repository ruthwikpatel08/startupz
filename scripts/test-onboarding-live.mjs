// Opt-in integration check: temporary confirmed test account, real Auth/PostgREST,
// actual browser questions, persisted row assertions, scoped cleanup in finally.
import dotenv from 'dotenv';
import pg from 'pg';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
dotenv.config({ quiet:true });
dotenv.config({ path:'server/.env', quiet:true });
const env = dotenv.parse(fs.readFileSync('client/.env','utf8'));
const url = env.VITE_SUPABASE_URL.trim();
assert.equal(new URL(url).host,new URL(process.env.SUPABASE_URL).host,'Client and server must use the same Supabase project');
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.VITE_SUPABASE_ANON_KEY.trim();
const email = `hookz-recovery-${randomUUID()}@example.test`;
const password = `${randomUUID()}Aa1!`;
const db = new pg.Client({connectionString:process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL});
const output = 'docs/phase2-recovery';
fs.mkdirSync(output,{recursive:true});
let id, browser, vite;
const evidence = {};
try {
  await db.connect();
  const created = await fetch(`${url}/auth/v1/admin/users`,{method:'POST',headers:{apikey:adminKey,Authorization:`Bearer ${adminKey}`,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true,user_metadata:{onboarding_completed:false}})});
  const account = await created.json();
  assert.equal(created.status,200,`Test account creation: ${account.msg || account.message || created.status}`);
  id = account.id;
  const login = await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const session = await login.json();
  assert.equal(login.status,200);
  assert.equal(session.user.id,id);
  evidence.auth = { signedIn:true,accessTokenPresent:Boolean(session.access_token),clientServerProjectMatch:true };
  vite = spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5180'],{cwd:'client',windowsHide:true,stdio:'pipe'});
  await new Promise((resolve,reject) => {vite.stdout.on('data',d => {if(String(d).includes('Local:')) resolve();});vite.once('error',reject);vite.once('exit',code => reject(new Error(`Vite exited ${code}`)));});
  browser = await chromium.launch({headless:true,channel:'msedge'});
  const page = await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(({session,key}) => {
    localStorage.setItem(key,JSON.stringify({...session,expires_at:Math.floor(Date.now()/1000)+session.expires_in}));
    localStorage.setItem('hookz_cookie_consent',JSON.stringify({essential:true,analytics:false,marketing:false,version:'1.0'}));
  },{session,key:`sb-${new URL(url).hostname.split('.')[0]}-auth-token`});
  // Unrelated Express content is isolated; Auth, profile reads and final RPC are real.
  await page.route('**/api/**',route => route.fulfill({json:{users:[],matches:[],posts:[],projects:[],conversations:[],notifications:[],connections:[],items:[],total:0}}));
  await page.route('**/rest/v1/profiles?*',route => route.request().url().includes(id) ? route.continue() : route.fulfill({json:[]}));
  await page.goto('http://127.0.0.1:5180/onboarding');
  await page.getByRole('heading',{name:'I am joining HookZ as a…'}).waitFor();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel("What's your full name?",{exact:true}).fill('Recovery Browser Test');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  for(let i=0;i<12 && !(await page.getByRole('heading',{name:"You're all set!"}).count());i++) {
    const input=page.locator('#question-input');
    if(await page.locator('#skill-search').count()) {await page.locator('#skill-search').fill('React');await page.getByRole('checkbox',{name:/React/}).check();}
    else if(await input.count()) await input.fill('Test University');
    else if(await page.getByRole('radio').count()) await page.getByRole('radio').first().check();
    else await page.getByRole('checkbox').first().check();
    await page.getByRole('button',{name:/^(Continue|Skip for now)$/}).click();
  }
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  let requests=0;
  page.on('request',request => {if(request.url().includes('/rpc/complete_onboarding')) requests++;});
  const responsePromise=page.waitForResponse(r => r.url().includes('/rpc/complete_onboarding'));
  await page.getByRole('button',{name:'Enter HookZ'}).click();
  const response=await responsePromise;
  const result=await response.json();
  evidence.request={endpoint:'/rest/v1/rpc/complete_onboarding',payload:response.request().postDataJSON()};
  evidence.response={status:response.status(),onboarding_completed:result.onboarding_completed,error:result.message,code:result.code};
  assert.equal(response.status(),200,JSON.stringify(evidence.response));
  await page.waitForURL('http://127.0.0.1:5180/');
  assert.equal(requests,1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('startupz_user')).onboarding_completed),true);
  const saved=(await db.query('SELECT full_name,onboarding_completed,onboarding_answers FROM public.profiles WHERE user_id=$1',[id])).rows[0];
  assert.equal(saved.full_name,'Recovery Browser Test');
  assert.equal(saved.onboarding_completed,true);
  assert.deepEqual(saved.onboarding_answers,evidence.request.payload.p_answers);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.consent_logs WHERE user_id=$1',[id])).rows[0].n,2);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(new URL(page.url()).pathname,'/');
  await page.goto('http://127.0.0.1:5180/onboarding');
  await page.waitForURL('http://127.0.0.1:5180/');
  await page.screenshot({path:`${output}/onboarding-live-success.png`,fullPage:true});
  evidence.verification={singleSubmit:true,databaseRowMatches:true,twoConsents:true,localStoreComplete:true,homeRedirect:true,refreshStaysHome:true,onboardingRevisitRedirects:true};
  console.log('PASS real Auth + browser + PostgREST 200 + database profile/consents + refresh');
} finally {
  await browser?.close();vite?.kill();
  if(id) {
    // Only the generated account is eligible for cleanup; never touch existing users.
    await db.query('DELETE FROM public.consent_logs WHERE user_id=$1 AND user_email=$2',[id,email]);
    await db.query('DELETE FROM public.users WHERE id=$1 AND email=$2',[id,email]);
    const removed=await fetch(`${url}/auth/v1/admin/users/${id}`,{method:'DELETE',headers:{apikey:adminKey,Authorization:`Bearer ${adminKey}`}});
    assert.ok(removed.ok,'Temporary auth account cleanup failed');
    evidence.temporaryAccountRemoved=true;
  }
  await db.end();
  fs.writeFileSync(`${output}/onboarding-live.json`,JSON.stringify(evidence,null,2));
}
