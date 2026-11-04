// Login to Rendez and capture authed screenshots of key app screens.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8080';
const OUT = '.taste-skill/before';
mkdirSync(OUT, { recursive: true });
const creds = JSON.parse(readFileSync('.local/admin-credentials.json', 'utf8'));

const browser = await Browser.launch();

async function shoot(path, name, { width, height, mobile = false, settle = 2500 } = {}) {
  const page = await browser.newPage({ width, height, dsf: 1, mobile });
  await page.goto(`${BASE}${path}`, { timeoutMs: 30000, settleMs: settle });
  await page.screenshot({ path: `${OUT}/${name}.jpg`, quality: 80 });
  const title = await page.eval(() => document.title);
  const words = await page.eval(() => document.body.innerText.trim().split(/\s+/).filter(Boolean).length);
  console.log(`${name}: title="${title}" words=${words}`);
  await page.close();
  return words;
}

// 1. Login via the form.
const login = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await login.goto(`${BASE}/login`, { timeoutMs: 30000, settleMs: 2000 });
await login.eval((c) => {
  const email = document.querySelector('#auth-email');
  const pass = document.querySelector('#auth-password');
  if (!email || !pass) throw new Error('login form not found');
  const setNative = (el, v) => {
    const proto = Object.getPrototypeOf(el);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  setNative(email, c.email);
  setNative(pass, c.password);
  document.querySelector('button[type="submit"]').click();
}, creds);
await new Promise((r) => setTimeout(r, 3000));
const afterLogin = await login.eval(() => location.pathname + location.search);
console.log('after login path:', afterLogin);
const cookies = await login.eval(() => document.cookie.split(';').map((c) => c.split('=')[0].trim()));
console.log('cookies:', cookies.join(', '));
await login.close();

// 2. Screenshot key screens with the session cookie (same browser profile shares cookies per page? use new pages).
const screens = [
  { path: '/', name: 'home-1440', width: 1440, height: 900 },
  { path: '/discover', name: 'discover-1440', width: 1440, height: 900 },
  { path: '/search', name: 'search-1440', width: 1440, height: 900 },
  { path: '/map', name: 'map-1440', width: 1440, height: 900 },
  { path: '/profile', name: 'profile-1440', width: 1440, height: 900 },
  { path: '/discover', name: 'discover-390', width: 390, height: 844, mobile: true },
  { path: '/', name: 'home-390', width: 390, height: 844, mobile: true },
];
for (const s of screens) {
  try {
    await shoot(s.path, s.name, s);
  } catch (e) {
    console.log(`${s.name}: FAILED ${String(e).slice(0, 200)}`);
  }
}
await browser.close();
