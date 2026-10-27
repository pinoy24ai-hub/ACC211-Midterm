// Renders every step to build/frames/NN.png and writes its narration to build/narration/NN.txt.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { steps } from './slides.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'build');
mkdirSync(join(out, 'frames'), { recursive: true });
mkdirSync(join(out, 'narration'), { recursive: true });
const css = readFileSync(join(here, 'style.css'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [i, step] of steps.entries()) {
  const id = String(i + 1).padStart(2, '0');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${step.html}</body></html>`);
  await page.screenshot({ path: join(out, 'frames', `${id}.png`) });
  writeFileSync(join(out, 'narration', `${id}.txt`), step.say.replace(/\s+/g, ' ').trim() + '\n');
}
await browser.close();
console.log(`Rendered ${steps.length} steps`);
