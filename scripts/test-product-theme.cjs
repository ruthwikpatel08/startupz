// Populated, authenticated visual regression checks. Fixtures never reach a live backend.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const output='docs/phase2-recovery/screenshots';
fs.mkdirSync(output,{recursive:true});
const id='00000000-0000-4000-8000-000000000001';
const people=['Aanya Shah','Rohan Mehta','Maya Chen'].map((full_name,i)=>({id:`00000000-0000-4000-8000-00000000000${i+2}`,user_id:`00000000-0000-4000-8000-00000000000${i+2}`,full_name,username:full_name.split(' ')[0].toLowerCase(),preferred_role:'STUDENT',headline:['Frontend developer','Product designer','ML engineer'][i],skills:['React, TypeScript','Figma, Design systems','Python, Machine learning'][i],location:['Bengaluru','Hyderabad','Pune'][i],bio:'Building useful things with curious people. Looking for a team for the next campus hackathon.',onboarding_completed:true,created_at:'2026-10-28T08:00:00Z'}));
const profile={id,user_id:id,email:'visual@example.test',full_name:'Alex Builder',username:'alex_builder',preferred_role:'STUDENT',headline:'Frontend developer · Student',skills:'React, TypeScript',education:'Test University',bio:'Making campus life a little better, one project at a time.',onboarding_completed:true};
const authUser={id,email:profile.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{onboarding_completed:true},created_at:'2026-10-28T08:00:00Z'};
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'test-signature'].join('.');
const project={id:'theme-project',title:'Campus Compass',tagline:'Step-free routes for everyone on campus',ideaSummary:'Step-free routes for everyone on campus',problemSolved:'Students need reliable accessibility information between buildings.',solutionApproach:'Build a community-maintained map with verified accessible paths.',stage:'Prototyping',visibility:'PUBLIC',creator:{userId:id,fullName:profile.full_name,role:'Student'},roles:[{id:'frontend',roleName:'Frontend Developer',iconType:'code',status:'OPEN'},{id:'designer',roleName:'UI/UX Designer',iconType:'design',status:'ASSIGNED',assignedTo:{userId:people[0].user_id,fullName:people[0].full_name}}],tags:['React','Accessibility'],createdAt:'Oct 28, 2026'};
const post={id:'theme-post',authorId:people[0].user_id,author:{id:people[0].user_id,role:'STUDENT',profile:{fullName:people[0].full_name,headline:people[0].headline}},content:'We shipped our first accessible campus map! Looking for a designer to help test the next version with students.',postType:'EXECUTION',createdAt:'2026-10-28T08:00:00Z',likesCount:4,commentsCount:0,comments:[],tags:['Campus','Accessibility']};
const startup={id:'theme-startup',name:'Campus Collective',oneLineDescription:'Student teams building accessible tools for everyday campus life.',industry:'EdTech',stage:'Idea',location:'Bengaluru',founderId:id,founder:{id,profile:{fullName:profile.full_name}},teamSize:3};
(async()=>{
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181'],{cwd:'client',windowsHide:true,stdio:'pipe'});
 await new Promise((resolve,reject)=>{vite.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve();});vite.once('error',reject);vite.once('exit',code=>reject(new Error(`Vite exited ${code}`)));});
 let browser;
 const results=[];
 try {
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const width of (process.argv.includes('--mobile') ? [375] : [1440,375])) for(const theme of ['light','dark']) {
   const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({authUser,token,theme})=>{
    localStorage.setItem('sb-aqbnylhmsawdagoyggrf-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:authUser}));
    if(!localStorage.getItem('startupz_theme'))localStorage.setItem('startupz_theme',theme);
    localStorage.setItem('hookz_cookie_consent',JSON.stringify({essential:true,analytics:false,marketing:false,version:'1.0'}));
   },{authUser,token,theme});
   await page.route('**/*.supabase.co/**',route=>{
    const url=route.request().url();
    if(url.includes('/auth/v1/user'))return route.fulfill({json:authUser});
    if(url.includes('/rest/v1/profiles'))return route.fulfill({json:url.includes(id)?[profile]:url.includes('user_id=eq.')?[people[0]]:[profile,...people]});
    return route.fulfill({json:[]});
   });
   await page.route('**/api/**',route=>route.fulfill({json:{users:[],matches:[],posts:[post],projects:[project],startups:[startup],conversations:[],notifications:[],connections:[],results:[],items:[],total:0,problems:[{title:'Accessible campus navigation',description:'Help students find step-free routes across campus.',tags:['Accessibility'],sourceUrl:'javascript:alert(1)'}],user:{...authUser,profile:{id,userId:id,fullName:profile.full_name}}}}));
   const snap=async name=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow ${width}/${theme}`);await page.screenshot({path:`${output}/${name}-${width}-${theme}.png`,fullPage:true});};
   if(process.argv.includes('--controls')) {
    await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'My Profile Menu',exact:true}).click();
    await page.getByRole('link',{name:'Settings',exact:true}).waitFor();
    await snap('profile-menu');
    if(width<640)await page.locator('header .fixed.inset-0:visible').click({position:{x:10,y:300}});
    else await page.getByRole('button',{name:'My Profile Menu',exact:true}).click();
    await page.getByRole('button',{name:'View notifications',exact:true}).click();
    await snap('notifications');await page.keyboard.press('Escape');
    await page.getByTitle('AI People Finder Bot',{exact:true}).click();
    await page.getByRole('dialog',{name:'AI Scout — Advanced Talent & Institution Matcher'}).waitFor();
    await snap('ai-dialog');await page.keyboard.press('Escape');
    await page.goto('http://127.0.0.1:5181/projects',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Save',exact:true}).click();
    await page.getByText('Project "Campus Compass" saved!',{exact:true}).waitFor();
    await snap('project-toast');
    assert.deepEqual(errors,[]);console.log(`PASS dropdowns, AI dialog, saved toast: ${width}px ${theme}`);await page.close();continue;
   }
   for(const [name,route] of [['home','/'],['feed','/feed'],['projects','/projects'],['business','/business'],['opportunities','/opportunities'],['profile',`/profile/${id}`],['connections','/network'],['messages','/messages?projectGroupId=proj-group-theme-project']]) {
    await page.goto(`http://127.0.0.1:5181${route}`,{waitUntil:'networkidle'});
    await page.locator('.hookz-product').waitFor();
    if(name==='home') {
     assert.equal(await page.locator('.product-person').count(),3,'Populated Home cards');
     const card=await page.locator('.product-person').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor}));
     assert.deepEqual(card,{radius:'16px',bg:theme==='light'?'rgb(255, 255, 255)':'rgb(27, 24, 37)',border:theme==='light'?'rgb(228, 225, 237)':'rgb(54, 48, 68)'});
     const button=await page.locator('.product-person .btn-primary').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,background:getComputedStyle(el).backgroundImage}));
     assert.equal(button.radius,'16px');
     assert.equal(button.background,'linear-gradient(165deg, rgb(131, 89, 244), rgb(102, 56, 221))');
    }
    if(name==='projects') {
     await page.getByRole('heading',{name:'Campus Compass',exact:true}).waitFor();
     await page.getByRole('button',{name:'Create Project',exact:true}).click();
     const dialog=page.getByRole('dialog');await dialog.waitFor();
     assert.equal(await dialog.evaluate(el=>getComputedStyle(el).backgroundColor),theme==='light'?'rgb(255, 255, 255)':'rgb(27, 24, 37)');
     await snap('project-dialog');await page.keyboard.press('Escape');
    }
    if(name==='opportunities') {
     await page.getByRole('button',{name:'Generate statements',exact:true}).click();
     await page.getByRole('heading',{name:'Accessible campus navigation'}).waitFor();
     assert.doesNotMatch(await page.locator('main').innerText(),/Apply Now|Post Opportunity|Internships|How Founders Hire/);
     await page.getByText('View statement',{exact:true}).click();
     assert.equal(await page.getByRole('link',{name:/Read source/}).count(),0);
    }
    if(width===1440 && ['home','feed','projects','business','opportunities'].includes(name))assert.equal(await page.locator('aside [aria-current=page]').count(),1);
    const surface=await page.locator('.hookz-product > header').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(surface,theme==='light'?'rgb(255, 255, 255)':'rgb(27, 24, 37)');
    await snap(name);results.push(`${name}: ${width}px ${theme}`);
   }
   await page.goto(`http://127.0.0.1:5181/profile/${id}?edit=true`,{waitUntil:'networkidle'});
   const settings=page.getByRole('dialog',{name:'Edit Profile Details'});await settings.waitFor();
   await snap('settings');
   await settings.getByRole('switch',{name:'Dark theme'}).click();
   assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('dark')),theme==='light');
   await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog').count(),0);
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('dark')),theme==='light','User theme choice persists after refresh');
   assert.deepEqual(errors,[],`${width}/${theme} runtime errors`);
   console.log(`PASS populated product, dialogs, theme switch, logo, opportunities, overflow: ${width}px ${theme}`);
   await page.close();
  }
  assert.ok(fs.readFileSync('client/public/logo-icon.png').equals(fs.readFileSync('client/src/assets/logo-icon.png')),'Onboarding and landing share the approved logo');
  if(!process.argv.includes('--controls'))fs.writeFileSync('docs/phase2-recovery/theme-checks.json',JSON.stringify(results,null,2));
 }finally{await browser?.close();vite.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
