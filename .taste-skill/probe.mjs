// Probe: load dist/index.html, dump console errors + DOM word count.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'frontend/dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== root && !f.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(url, { timeoutMs: 30000, settleMs: 4000 });
const info = await page.eval(() => ({
  words: document.body.innerText.trim().split(/\s+/).filter(Boolean).length,
  title: document.title,
  rootHtmlLen: document.getElementById('root')?.innerHTML.length ?? -1,
  firstText: document.body.innerText.trim().slice(0, 300),
}));
console.log(JSON.stringify(info, null, 2));
console.log('consoleErrors:', JSON.stringify(page.consoleErrors ?? 'none captured'));
await browser.close();
server.close();
