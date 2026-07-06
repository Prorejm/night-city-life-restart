import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

const server = createServer((req, res) => {
  let filePath = join(projectRoot, 'view', req.url === '/' ? 'index.html' : req.url);
  if (!existsSync(filePath)) filePath = join(projectRoot, 'view', 'index.html');
  try {
    const content = readFileSync(filePath);
    const ext = filePath.split('.').pop();
    const ct = { html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(content);
  } catch { res.writeHead(404); res.end(); }
});

await new Promise(r => server.listen(8765, r));
console.log('Server on http://localhost:8765');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:8765');
await page.waitForSelector('#menu', { timeout: 10000 });

// Screenshot menu
await page.screenshot({ path: join(projectRoot, 'screenshot-menu.png') });
console.log('Menu screenshot saved');

// Start game and advance a few turns to get exp
await page.click('#start-btn');
await page.waitForTimeout(800);
await page.click('#next-btn');
await page.waitForTimeout(600);
await page.click('#next-btn');
await page.waitForTimeout(600);
await page.click('#next-btn');
await page.waitForTimeout(600);

await page.screenshot({ path: join(projectRoot, 'screenshot-gameplay.png') });
console.log('Gameplay screenshot saved');

await browser.close();
server.close();
console.log('Done');
