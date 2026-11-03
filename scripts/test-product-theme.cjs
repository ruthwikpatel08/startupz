// Populated, authenticated visual regression checks. Fixtures never reach a live backend.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const output=process.argv.includes('--feed') ? 'docs/feed-overhaul/screenshots' : process.argv.includes('--cards') ? 'docs/discovery-card/screenshots' : 'docs/phase2-recovery/screenshots';
fs.mkdirSync(output,{recursive:true});
const id='00000000-0000-4000-8000-000000000001';
const people=['Aanya Shah','Rohan Mehta','Maya Chen'].map((full_name,i)=>({id:`00000000-0000-4000-8000-00000000000${i+2}`,user_id:`00000000-0000-4000-8000-00000000000${i+2}`,full_name,username:full_name.split(' ')[0].toLowerCase(),preferred_role:'STUDENT',headline:['Frontend developer','Product designer','ML engineer'][i],skills:['React, TypeScript','Figma, Design systems','Python, Machine learning'][i],location:['Bengaluru','Hyderabad','Pune'][i],bio:'Building useful things with curious people. Looking for a team for the next campus hackathon.',onboarding_completed:true,created_at:'2026-10-28T08:00:00Z'}));
if(process.argv.includes('--cards')) {
 people[0].bio='I turn ambitious ideas into useful campus tools, and love building thoughtful interfaces with a curious team. '.repeat(4);
 people[0].location='Remote';
 people[1].full_name='Rohan Mehta With An Exceptionally Long Family Name';
 people[1].skills=['', 'Design systems and accessible interfaces with a very long skill label', 'Figma'];
 people[2].skills='';people[2].bio='';people[2].headline='Frontend';
}
const profile={id,user_id:id,email:'visual@example.test',full_name:'Alex Builder',username:'alex_builder',preferred_role:'STUDENT',headline:'Frontend developer · Student',skills:'React, TypeScript',education:'Test University',bio:'Making campus life a little better, one project at a time.',onboarding_completed:true};
const authUser={id,email:profile.email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{onboarding_completed:true},created_at:'2026-10-28T08:00:00Z'};
const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'test-signature'].join('.');
const project={id:'theme-project',title:'Campus Compass',tagline:'Step-free routes for everyone on campus',ideaSummary:'Step-free routes for everyone on campus',problemSolved:'Students need reliable accessibility information between buildings.',solutionApproach:'Build a community-maintained map with verified accessible paths.',stage:'Prototyping',visibility:'PUBLIC',creator:{userId:id,fullName:profile.full_name,role:'Student'},roles:[{id:'frontend',roleName:'Frontend Developer',iconType:'code',status:'OPEN'},{id:'designer',roleName:'UI/UX Designer',iconType:'design',status:'ASSIGNED',assignedTo:{userId:people[0].user_id,fullName:people[0].full_name}}],tags:['React','Accessibility'],createdAt:'Oct 28, 2026'};
const post={id:'theme-post',authorId:people[0].user_id,author:{id:people[0].user_id,role:'STUDENT',profile:{fullName:people[0].full_name,headline:people[0].headline}},content:'We shipped our first accessible campus map! Looking for a designer to help test the next version with students.',postType:'EXECUTION',createdAt:'2026-10-28T08:00:00Z',likesCount:4,commentsCount:0,comments:[],tags:['Campus','Accessibility']};
const feedPosts=[
 {...post,id:'feed-idea',postType:'IDEA',title:'What if finding a hackathon team took minutes?',content:'A campus-first matching tool that pairs students by skills and the problems they want to solve. Would you use it before your next hackathon? I would love feedback on what should matter most in a match.',createdAt:'2026-11-03T10:00:00Z',upvotesCount:12,downvotesCount:2,likesCount:10},
 {...post,id:'feed-private',visibility:'CONNECTIONS',title:'Private draft',createdAt:'2026-11-03T11:00:00Z'},
 {...post,id:'feed-prototype',postType:'PROTOTYPE',title:'Campus Compass — our first working demo',content:JSON.stringify({isPrototype:true,description:'We built a better way to find step-free routes across campus. Try a route and tell us what we missed.',websiteUrl:'https://example.com/campus',mediaUrl:'https://fixture.hookz.test/demo.svg'}),createdAt:'2026-11-03T09:00:00Z'},
 {...post,title:'Small win: our first 20 student testers',createdAt:'2026-11-03T08:00:00Z'}
];
const startup={id:'theme-startup',name:'Campus Collective',oneLineDescription:'Student teams building accessible tools for everyday campus life.',industry:'EdTech',stage:'Idea',location:'Bengaluru',founderId:id,founder:{id,profile:{fullName:profile.full_name}},teamSize:3};
(async()=>{
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5181'],{cwd:'client',windowsHide:true,stdio:'pipe'});
 await new Promise((resolve,reject)=>{vite.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve();});vite.once('error',reject);vite.once('exit',code=>reject(new Error(`Vite exited ${code}`)));});
 let browser;
 const results=[];
 try {
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const width of (process.argv.includes('--feed') ? [1440,375,320] : process.argv.includes('--cards') ? [1440,768,375,320] : process.argv.includes('--mobile') ? [375] : [1440,375])) for(const theme of ['light','dark']) {
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
   await page.route('**/api/**',route=>route.fulfill({json:{users:[],matches:[],posts:process.argv.includes('--feed')?feedPosts:[post],projects:[project],startups:[startup],conversations:[],notifications:[],connections:[],results:[],items:[],total:0,problems:[{title:'Accessible campus navigation',description:'Help students find step-free routes across campus.',tags:['Accessibility'],sourceUrl:'javascript:alert(1)'}],user:{...authUser,profile:{id,userId:id,fullName:profile.full_name}}}}));
   const snap=async name=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${name} overflow ${width}/${theme}`);await page.screenshot({path:`${output}/${name}-${width}-${theme}.png`,fullPage:true});};
   if(process.argv.includes('--feed')) {
    const published=[];
    await page.route('https://fixture.hookz.test/demo.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="900" height="440" viewBox="0 0 900 440"><rect width="900" height="440" fill="#f0ebff"/><path d="M0 300L250 80 430 330 660 100 900 210" fill="none" stroke="#d3c5f6" stroke-width="50"/><path d="M100 360L300 220 520 250 720 90" fill="none" stroke="#7047eb" stroke-width="10" stroke-dasharray="15 12"/><circle cx="300" cy="220" r="20" fill="#7047eb"/><circle cx="720" cy="90" r="20" fill="#7047eb"/><rect x="45" y="35" width="325" height="82" rx="16" fill="white"/><text x="68" y="71" font-family="sans-serif" font-size="24" font-weight="700" fill="#201d32">Campus Compass</text><text x="68" y="96" font-family="sans-serif" font-size="15" fill="#716c83">A more accessible way around campus</text></svg>'}));
    await page.route('**/api/posts',async route=>{
     if(route.request().method()!=='POST')return route.fallback();
     const payload=route.request().postDataJSON();published.push(payload);
     return route.fulfill({json:{post:{...post,...payload,id:'published-'+published.length,authorId:id,createdAt:new Date().toISOString()}}});
    });
    await page.goto('http://127.0.0.1:5181/feed?pillar=IDEAS',{waitUntil:'networkidle'});
    const feed=page.locator('.hookz-feed');
    assert.deepEqual(await feed.locator('[id^="post-"]').evaluateAll(els=>els.map(el=>el.id)),['post-feed-idea','post-feed-prototype','post-theme-post']);
    assert.doesNotMatch(await feed.innerText(),/Describes|My Shares|Drawbacks|Product Launch|Experience|Private draft/i);
    assert.equal(await feed.getByRole('button',{name:/Upvote idea/}).count(),1);
    assert.equal(await feed.getByRole('button',{name:/Downvote idea/}).count(),1);
    assert.equal(await feed.getByRole('link',{name:/Explore Live Website/}).getAttribute('href'),'https://example.com/campus');
    for(const card of await feed.locator('[id^="post-"]').all())assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Post contents fit');
    const format=feed.getByRole('combobox',{name:'Filter feed by format'});
    for(const [value,ids] of [['IDEA',['post-feed-idea']],['PROTOTYPE',['post-feed-prototype']],['UPDATE',['post-theme-post']]]) {
     await format.selectOption(value);
     assert.deepEqual(await feed.locator('[id^="post-"]').evaluateAll(els=>els.map(el=>el.id)),ids);
    }
    await format.selectOption('ALL');
    await snap('feed');
    await page.screenshot({path:output+'/preview-'+width+'-'+theme+'.png'});
    const idea=feed.locator('#post-feed-idea');
    await idea.getByRole('button',{name:'Read more',exact:true}).click();
    assert.equal(await idea.locator('p.whitespace-pre-line').evaluate(el=>getComputedStyle(el).webkitLineClamp),'none');
    await idea.getByRole('button',{name:'Show less',exact:true}).click();
    await feed.getByRole('button',{name:'Test an idea',exact:true}).click();
    assert.equal(await feed.getByRole('button',{name:'Idea',exact:true}).getAttribute('aria-pressed'),'true');
    await feed.getByRole('textbox',{name:'Post content',exact:true}).fill('An idea to test publishing without changing feeds.');
    await feed.getByRole('button',{name:'Publish',exact:true}).click();
    await page.getByText('Post published successfully!',{exact:true}).waitFor();
    assert.equal(published[0].postType,'IDEA');
    await feed.getByRole('button',{name:'Share an update',exact:true}).click();
    await feed.getByRole('textbox',{name:'Post content',exact:true}).fill('A private progress update.');
    await feed.getByRole('button',{name:'Connections Only',exact:true}).click();
    await feed.getByRole('button',{name:'Publish',exact:true}).click();
    await feed.locator('#post-published-2').waitFor();
    assert.equal(published[1].postType,'EXECUTION');assert.equal(published[1].visibility,'CONNECTIONS');
    await feed.getByRole('button',{name:'Show a prototype',exact:true}).click();
    await page.getByRole('dialog',{name:'Share a Working Prototype / Sample'}).waitFor();
    await page.keyboard.press('Escape');
    const update=feed.locator('#post-theme-post');
    await update.getByRole('button',{name:'Like post',exact:true}).click();
    assert.equal(await update.getByRole('button',{name:'Unlike post',exact:true}).getAttribute('aria-pressed'),'true');
    await update.getByRole('button',{name:'Save post',exact:true}).click();
    await update.getByRole('button',{name:'Unsave post',exact:true}).waitFor();
    await update.getByRole('button',{name:'Unsave post',exact:true}).click();
    await update.getByRole('button',{name:'Save post',exact:true}).waitFor();
    await update.getByTitle('Share post with connections',{exact:true}).click();
    await page.getByRole('heading',{name:'Share with Connections',exact:true}).waitFor();
    await page.getByRole('button',{name:'Close modal',exact:true}).click();
    await update.getByRole('button',{name:'Comments',exact:true}).click();
    await update.getByText('No comments yet. Start the conversation!',{exact:true}).waitFor();
    await feed.locator('#post-feed-idea').getByRole('button',{name:/Upvote idea/}).click();
    await feed.locator('#post-feed-idea').getByRole('button',{name:'Upvote idea (13 upvotes)',exact:true}).waitFor();
    await idea.getByRole('button',{name:/Downvote idea/}).click();
    await page.getByRole('button',{name:'Needs clearer problem / solution',exact:true}).click();
    await page.getByRole('button',{name:'Submit Downvote',exact:true}).click();
    await idea.getByRole('button',{name:'Downvote idea (3 downvotes)',exact:true}).waitFor();
    await page.goto('http://127.0.0.1:5181/feed?pillar=PROTOTYPES&postId=feed-prototype#post-feed-prototype',{waitUntil:'networkidle'});
    assert.equal(await feed.locator('#post-feed-idea').count(),1);
    assert.equal(await feed.locator('#post-feed-prototype').count(),1);
    const scout=page.getByTitle('AI People Finder Bot',{exact:true});
    await scout.hover();
    assert.equal(await scout.evaluate(el=>getComputedStyle(el).transform),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ai-scout-trigger')).backgroundPosition==='100% 50%');
    await scout.screenshot({path:output+'/scout-hover-'+width+'-'+theme+'.png'});
    await scout.click();
    await page.getByRole('dialog',{name:'AI Scout — Advanced Talent & Institution Matcher'}).waitFor();
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    console.log('PASS mixed timeline, chronological order, audience, legacy links, publishing formats, both votes, likes, saves, share, comments, expansion, prototype modal and Scout motion: '+width+'px '+theme);
    await page.close();continue;
   }
   if(process.argv.includes('--cards')) {
    await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle'});
    const cards=page.locator('.discovery-profile-card');
    assert.equal(await cards.count(),3);
    assert.doesNotMatch(await cards.allTextContents().then(x=>x.join(' ')),/Active Builder|Remote|Frontend/);
    assert.equal((await cards.first().locator('.discovery-profile-skill').innerText()).replace(/\s+/g,' '),'Top skill: React');
    assert.match(await cards.nth(1).locator('.discovery-profile-skill').innerText(),/Design systems/);
    assert.equal(await cards.nth(2).locator('.discovery-profile-skill').count(),0);
    assert.equal(await cards.nth(2).locator('.discovery-profile-bio').innerText(),'No bio added yet.');
    assert.equal(await cards.first().locator('.discovery-profile-bio').evaluate(el=>el.scrollHeight>el.clientHeight),true,'Long bio clamps');
    assert.equal(await cards.getByRole('button',{name:'Collaborate',exact:true}).count(),3);
    assert.equal(await cards.getByRole('link',{name:'See Profile',exact:true}).count(),3);
    for(const card of await cards.all())assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Card contents fit');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await cards.first().getByRole('button',{name:'Collaborate',exact:true}).click();
    await page.getByRole('dialog',{name:'Propose Startup Collaboration'}).waitFor();
    await page.keyboard.press('Escape');
    await cards.first().getByRole('button',{name:'+ Connect',exact:true}).click();
    await page.getByRole('dialog',{name:'Connect with Aanya Shah'}).waitFor();
    await page.keyboard.press('Escape');
    await cards.first().getByRole('link',{name:'See Profile',exact:true}).focus();
    assert.notEqual(await cards.first().getByRole('link',{name:'See Profile',exact:true}).evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await page.locator('.product-home h2').first().click();
    await cards.first().hover();
    assert.equal(await cards.first().evaluate(el=>getComputedStyle(el).transform),'none','Reduced motion disables lift');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.discovery-profile-card')).transform==='matrix(1, 0, 0, 1, 0, -4)');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.mouse.move(0,0);
    await cards.first().screenshot({path:output+'/card-'+width+'-'+theme+'.png'});
    if(width===1440)await cards.first().locator('..').screenshot({path:output+'/cards-'+width+'-'+theme+'.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS card hierarchy, skill formats, absent fields, clamping, action wiring, focus and fit: '+width+'px '+theme);
    await page.close();continue;
   }
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
     assert.equal(await page.locator('.discovery-profile-card').count(),3,'Populated Home cards');
     const card=await page.locator('.discovery-profile-card').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor}));
     assert.deepEqual(card,{radius:'16px',bg:theme==='light'?'rgb(255, 255, 255)':'rgb(27, 24, 37)',border:theme==='light'?'rgb(228, 225, 237)':'rgb(54, 48, 68)'});
     const button=await page.locator('.discovery-profile-card .btn-primary').first().evaluate(el=>({radius:getComputedStyle(el).borderRadius,background:getComputedStyle(el).backgroundImage}));
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
  if(!process.argv.includes('--feed')&&!process.argv.includes('--controls')&&!process.argv.includes('--cards'))fs.writeFileSync('docs/phase2-recovery/theme-checks.json',JSON.stringify(results,null,2));
 }finally{await browser?.close();vite.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
