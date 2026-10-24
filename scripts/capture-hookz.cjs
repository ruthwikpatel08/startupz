/**
 * capture-hookz.js
 * Captures https://hookz.in with Playwright, extracts liftable layers,
 * saves PNGs + manifest JSON to client/public/cinematic-assets/.
 *
 * Usage: node scripts/capture-hookz.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../client/public/cinematic-assets');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Elements to lift, identified by CSS selector
const LIFT_SELECTORS = [
  // Hero section elements
  { id: 'hero_badge',        sel: 'section:first-of-type [style*="eef2ff"], section:first-of-type .inline-flex, section:first-of-type [class*="badge"], section:first-of-type [class*="chip"]', label: 'Hero badge chip' },
  { id: 'hero_cta',          sel: 'section:first-of-type a[href="/register"], section a[href*="register"]:first-of-type', label: 'Hero CTA button' },
  { id: 'hero_heading',      sel: 'h1', label: 'Hero heading' },
  // Feature tiles
  { id: 'feature_tile_0',    sel: 'section:nth-of-type(2) > div:nth-child(1), [class*="feature"]:first-child, main section:nth-child(2) div:first-child', label: 'Feature tile 0' },
  { id: 'feature_tile_1',    sel: 'section:nth-of-type(2) > div:nth-child(2)', label: 'Feature tile 1' },
  { id: 'feature_tile_2',    sel: 'section:nth-of-type(2) > div:nth-child(3)', label: 'Feature tile 2' },
  { id: 'feature_tile_3',    sel: 'section:nth-of-type(2) > div:nth-child(4)', label: 'Feature tile 3' },
  // Footer CTA
  { id: 'footer_cta',        sel: 'footer a[href="/register"], footer a[href*="register"]', label: 'Footer CTA' },
];

async function main() {
  console.log('Launching Chromium…');
  const browser = await chromium.launch({
    args: [
      '--use-angle=d3d11',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('Navigating to https://hookz.in …');
  await page.goto('https://hookz.in', { waitUntil: 'networkidle', timeout: 60000 });

  // Scroll to bottom so lazy images / scroll animations fire
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const step = 300;
      const id = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(id);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
  await page.waitForTimeout(1500);

  // Full-page screenshot (page background only, elements visible)
  console.log('Capturing full-page screenshot…');
  const fullBuf = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, 'page-full.png'), fullBuf);

  // Get full page dimensions
  const pageDims = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight,
  }));
  console.log('Page dims:', pageDims);

  const manifest = {
    pageWidth: pageDims.width,
    pageHeight: pageDims.height,
    deviceScaleFactor: 2,
    capturedAt: new Date().toISOString(),
    layers: [],
  };

  // Capture each liftable layer
  for (const spec of LIFT_SELECTORS) {
    try {
      const el = await page.$(spec.sel);
      if (!el) {
        console.warn(`  SKIP ${spec.id}: selector not found`);
        continue;
      }

      const box = await el.boundingBox();
      if (!box) {
        console.warn(`  SKIP ${spec.id}: no bounding box`);
        continue;
      }

      // Screenshot element with padding
      const pad = 28;
      const clip = {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };

      const elBuf = await page.screenshot({ clip, fullPage: false });
      const fname = `layer-${spec.id}.png`;
      fs.writeFileSync(path.join(OUT_DIR, fname), elBuf);

      manifest.layers.push({
        id: spec.id,
        label: spec.label,
        file: fname,
        // page-space coords (CSS pixels, before deviceScaleFactor)
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        padX: pad,
        padY: pad,
      });

      console.log(`  OK  ${spec.id} @ (${Math.round(box.x)},${Math.round(box.y)}) ${Math.round(box.width)}×${Math.round(box.height)}`);
    } catch (e) {
      console.warn(`  ERR ${spec.id}:`, e.message);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone. Manifest written to cinematic-assets/manifest.json');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
