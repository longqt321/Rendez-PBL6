// Capture the dev-server UI (mock mode) at multiple screens.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5199';
const OUT = process.env.OUT ?? '.taste-skill/redesign';
mkdirSync(OUT, { recursive: true });

const screens = JSON.parse(process.env.SHOOTS ?? '[]');
const browser = await Browser.launch();
for (const s of screens) {
  const page = await browser.newPage({ width: s.width, height: s.height, dsf: 1, mobile: s.width < 600 });
  if (s.dark) {
    await page.goto(BASE + '/', { timeoutMs: 30000, settleMs: 500 });
    await page.eval(`(() => { localStorage.setItem('rendez-theme', 'dark'); return localStorage.getItem('rendez-theme'); })()`);
  } else {
    // localStorage giữ lại theme của màn trước trong cùng context — ép sáng.
    await page.goto(BASE + '/', { timeoutMs: 30000, settleMs: 500 });
    await page.eval(`(() => { localStorage.setItem('rendez-theme', 'light'); return localStorage.getItem('rendez-theme'); })()`);
  }
  await page.goto(BASE + s.path, { timeoutMs: 30000, settleMs: s.settle ?? 4000 });
  // Chờ mọi <img> tải xong (lazy-load cần thời gian) trước khi bấm máy.
  await page.eval(`new Promise((resolve) => {
    const imgs = [...document.images];
    if (!imgs.length) return resolve('noimg');
    let left = imgs.length;
    const done = () => { left -= 1; if (left <= 0) resolve('ok'); };
    for (const img of imgs) {
      if (img.complete) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    }
    setTimeout(() => resolve('timeout'), 8000);
  })`);
  await page.screenshot({ path: `${OUT}/${s.name}.jpg`, quality: 82 });
  const words = await page.eval(() => document.body.innerText.trim().split(/\s+/).filter(Boolean).length);
  const theme = await page.eval(`document.documentElement.dataset.theme ?? 'light'`);
  console.log(`${s.name}: words=${words} theme=${theme}`);
  await page.close();
}
await browser.close();
