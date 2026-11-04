// Probe mock state precisely.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto('http://127.0.0.1:5199/discover', { timeoutMs: 30000, settleMs: 6000 });
const info = await page.eval(() => ({
  text: document.body.innerText.slice(0, 600),
  rootLen: document.getElementById('root')?.innerHTML.length,
}));
console.log(JSON.stringify(info, null, 2));
await browser.close();
