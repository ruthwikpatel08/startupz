// Run with the Vite dev server: node scripts/test-phase1-ui.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const output = path.resolve(process.argv.includes('--recovery') ? 'docs/phase2-recovery/regression' : 'docs/phase1/screenshots');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5179'], { cwd: path.resolve('client'), windowsHide: true, stdio: 'pipe' });
  await new Promise((resolve, reject) => { vite.stdout.on('data', data => { if (String(data).includes('Local:')) resolve(); }); vite.once('error', reject); vite.once('exit', code => reject(new Error(`Vite exited ${code}`))); });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [1440, 768, 375]) {
      for (const theme of ['light', 'dark']) {
        const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(theme => {
          localStorage.setItem('startupz_theme', theme);
          localStorage.setItem('hookz_cookie_consent', JSON.stringify({ essential: true, analytics: false, marketing: false, version: '1.0' }));
        }, theme);
        await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' });
        await page.getByRole('heading', { level: 1 }).waitFor();
        assert.match(await page.locator('h1').innerText(), /Find your people/);
        await page.getByRole('button', { name: 'Designers', exact: true }).click();
        assert.equal(await page.locator('.preview-card').count(), 1);
        await page.getByRole('button', { name: 'All builders', exact: true }).click();
        assert.equal(await page.locator('.preview-card').count(), 3);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow: ${width}/${theme}`);
        await page.screenshot({ path: path.join(output, `landing-${width}-${theme}.png`), fullPage: true });
        for (const route of ['/login', '/register']) {
          await page.goto(`http://127.0.0.1:5179${route}`, { waitUntil: 'networkidle' });
          await page.locator('h1').waitFor();
          assert.equal(await page.locator('aside').count(), 0);
          assert.equal(await page.getByLabel('Full Name', { exact: true }).count(), 0);
          if (route === '/register') {
            assert.equal(await page.locator('input:not([type=checkbox])').count(), 3);
            await page.getByLabel('Email', { exact: true }).fill('ui-check@example.com');
            await page.getByLabel('Password', { exact: true }).fill('example-password');
            await page.getByLabel('Confirm password', { exact: true }).fill('different-password');
            await page.getByRole('checkbox').check();
            await page.getByRole('button', { name: 'Create Account', exact: true }).click();
            await page.getByRole('alert').filter({ hasText: 'Passwords do not match' }).waitFor();
          }
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow: ${route}/${width}/${theme}`);
          await page.screenshot({ path: path.join(output, `${route.slice(1)}-${width}-${theme}.png`), fullPage: true });
        }
        assert.deepEqual(errors, [], `runtime errors: ${width}/${theme}`);
        console.log(`PASS landing filters, auth rendering, no overflow: ${width}px ${theme}`);
        await page.close();
      }
    }
    for (const role of ['Student', 'Investor', 'Other']) {
      const page = await browser.newPage({ viewport: { width: role === 'Student' ? 1440 : 375, height: 1000 }, reducedMotion: 'reduce' });
      const id = '00000000-0000-4000-8000-000000000001';
      const authUser = { id, email: 'test@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { onboarding_completed: false }, created_at: new Date().toISOString() };
      let profile = { id, user_id: id, full_name: '', email: authUser.email, preferred_role: 'STUDENT', onboarding_completed: false };
      let saves = 0;
      let failedOnce = false;
      let submitted;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-signature'].join('.');
      await page.addInitScript(({ authUser, token, role }) => {
        localStorage.setItem('sb-aqbnylhmsawdagoyggrf-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test-refresh', expires_at: Math.floor(Date.now()/1000) + 3600, expires_in: 3600, token_type: 'bearer', user: authUser }));
        localStorage.setItem('hookz_cookie_consent', JSON.stringify({ essential: true, analytics: false, marketing: false, version: '1.0' }));
        localStorage.setItem('startupz_theme', role === 'Investor' ? 'dark' : 'light');
      }, { authUser, token, role });
      await page.route('**/*.supabase.co/**', async route => {
        const url = route.request().url();
        if (url.includes('/rpc/complete_onboarding')) {
          saves++;
          submitted = route.request().postDataJSON();
          if (role === 'Student' && !failedOnce) { failedOnce = true; return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated save failure' }) }); }
          profile = { ...profile, full_name: submitted.p_answers.fullName, preferred_role: role.toUpperCase(), onboarding_completed: true, onboarding_answers: submitted.p_answers };
          return route.fulfill({ json: profile });
        }
        if (url.includes('/rest/v1/profiles')) return route.fulfill({ json: [profile] });
        if (url.includes('/auth/v1/user')) return route.fulfill({ json: authUser });
        return route.fulfill({ json: [] });
      });
      await page.route('**/api/**', route => route.fulfill({ json: { users: [], matches: [], posts: [], projects: [], conversations: [], notifications: [], startups: [], opportunities: [], investors: [], mentors: [], problems: [], connections: [], results: [], items: [], total: 0, token, user: { ...authUser, onboarding_completed: profile.onboarding_completed, profile: { id, userId: id, fullName: profile.full_name } } } }));
      await page.goto('http://127.0.0.1:5179/onboarding');
      await page.getByRole('heading', { name: 'I am joining HookZ as a…' }).waitFor();
      assert.equal(await page.locator('aside, nav, header').count(), 0);
      await page.getByRole('radio', { name: new RegExp(`^${role}`) }).check();
      if (role === 'Other') await page.getByLabel('Tell us what you do.', { exact: true }).fill('Community organizer');
      if (role === 'Student') {
        await page.getByRole('radio', { name: /^Student/ }).focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.getByRole('radio', { name: /^Investor/ }).isChecked(), true);
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.getByRole('radio', { name: /^Student/ }).isChecked(), true);
      }
      await page.screenshot({ path: path.join(output, `onboarding-${role}-role.png`), fullPage: true });
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByLabel("What's your full name?", { exact: true }).fill('Test Builder');
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      assert.equal(await page.getByLabel("What's your full name?", { exact: true }).inputValue(), 'Test Builder');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      for (let i = 0; i < 12 && !(await page.getByRole('heading', { name: "You're all set!" }).count()); i++) {
        const input = page.locator('#question-input');
        const radio = page.getByRole('radio');
        const skill = page.locator('#skill-search');
        if (await skill.count()) {
          await skill.fill('React');
          await page.getByRole('checkbox', { name: /React/ }).check();
          await skill.fill('Creative coding');
          await page.getByRole('button', { name: 'Add “Creative coding”' }).click();
        } else if (await input.count()) {
          if (await input.evaluate(el => el.tagName) === 'TEXTAREA') await input.fill('Building things with good people.');
          else if (!(await input.inputValue())) await input.fill('Test University');
        } else if (await radio.count()) await radio.first().check();
        else await page.getByRole('checkbox').first().check();
        assert.equal(saves, 0, 'No writes before final submission');
        await page.getByRole('button', { name: /^(Continue|Skip for now)$/ }).click();
      }
      await page.getByRole('heading', { name: "You're all set!" }).waitFor();
      await page.getByRole('button', { name: 'Enter HookZ' }).click();
      assert.equal(saves, 0, 'Consent required');
      await page.getByRole('checkbox').nth(0).check();
      await page.getByRole('checkbox').nth(1).check();
      await page.screenshot({ path: path.join(output, `onboarding-${role}-preview.png`), fullPage: true });
      await page.getByRole('button', { name: 'Enter HookZ' }).click();
      if (role === 'Student') {
        await page.getByRole('alert').filter({ hasText: /couldn.t save/i }).waitFor();
        assert.equal(await page.getByRole('heading', { name: "You're all set!" }).count(), 1);
        await page.getByRole('button', { name: 'Enter HookZ' }).click();
      }
      await page.waitForURL('http://127.0.0.1:5179/');
      assert.equal(saves, role === 'Student' ? 2 : 1);
      assert.equal(submitted.p_answers.role, role);
      await page.goto('http://127.0.0.1:5179/onboarding');
      await page.waitForURL('http://127.0.0.1:5179/');
      assert.equal(await page.getByRole('heading', { name: 'I am joining HookZ as a…' }).count(), 0);
      if (role === 'Student') {
        await page.goto(`http://127.0.0.1:5179/profile/${id}?edit=true`);
        const dialog = page.getByRole('dialog', { name: 'Edit Profile Details' });
        await dialog.waitFor();
        await page.getByRole('switch', { name: 'Dark theme' }).click();
        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
        assert.equal(await page.evaluate(() => localStorage.getItem('startupz_theme')), 'dark');
        await page.screenshot({ path: path.join(output, 'settings-dark.png') });
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${role}: questions, keyboard/back, no interim writes, consent, final save, completed-user redirect`);
      await page.close();
    }
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: theme === 'light' ? 1280 : 375, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(theme => {
        localStorage.setItem('startupz_theme', theme);
        localStorage.setItem('hookz_cookie_consent', JSON.stringify({ essential: true, analytics: false, marketing: false, version: '1.0' }));
      }, theme);
      await page.route('**/*.supabase.co/**', route => route.fulfill({ json: [] }));
      await page.route('**/api/**', route => route.fulfill({ json: { users: [], matches: [], posts: [], projects: [], startups: [], opportunities: [], investors: [], mentors: [], problems: [], results: [], items: [], total: 0 } }));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const route of ['/cofounders', '/projects', '/feed', '/business', '/opportunities', '/investors', '/mentors', '/problems', '/startups', '/failed-startups', '/search', '/memberships', '/privacy', '/terms', '/dsar', '/forgot-password', '/reset-password', '/page-not-found']) {
        await page.goto(`http://127.0.0.1:5179${route}`, { waitUntil: 'networkidle' });
        if (route === '/opportunities') {
          await page.getByRole('heading', { name: 'Problem Statements', exact: true }).waitFor();
          assert.doesNotMatch(await page.locator('main').innerText(), /Apply Now|Post Opportunity|Internships|How Founders Hire/);
          await page.route('**/api/problems/discover-ai', r => r.fulfill({ json: { problems: [{ title: 'Accessible campus navigation', description: 'Help students find step-free routes across campus.', tags: ['Accessibility'], sourceUrl: 'javascript:alert(1)' }] } }));
          await page.getByRole('button', { name: 'Generate statements' }).click();
          await page.getByRole('heading', { name: 'Accessible campus navigation' }).waitFor();
          await page.getByText('View statement', { exact: true }).click();
          assert.equal(await page.getByRole('link', { name: 'Read source' }).count(), 0);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow: ${route}/${theme}`);
        assert.ok((await page.locator('main').innerText()).length > 30, `empty route: ${route}`);
        assert.equal(await page.getByText('Something went wrong', { exact: true }).count(), 0, `error boundary: ${route}`);
        await page.screenshot({ path: path.join(output, `route-${route.slice(1)}-${theme}.png`) });
      }
      assert.deepEqual(errors, []);
      console.log(`PASS 18 route smoke checks: ${theme}`);
      await page.close();
    }
  } finally { await browser.close(); vite.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
