// Probe: log every fetch result on the discover page.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.send('Runtime.enable', {});
const logs = [];
page.browser.on(page.sessionId, 'Runtime.consoleAPICalled', (p) => {
  const args = (p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ');
  logs.push(args.slice(0, 200));
});
await page.goto('http://127.0.0.1:5199/discover?mock', { timeoutMs: 30000, settleMs: 6000 });
const info = await page.eval(() => document.body.innerText.slice(0, 400));
console.log('TEXT:', info);
console.log('CONSOLE:', logs.slice(0, 10).join('\n'));
await browser.close();
