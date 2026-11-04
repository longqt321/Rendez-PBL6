// Probe: capture failed requests + console + page state on /discover.
import { Browser } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const browser = await Browser.launch();
const page = await browser.newPage({ width: 1440, height: 900 });
await page.send('Runtime.enable', {});
await page.send('Network.enable', {});
const logs = [];
const failed = [];
page.browser.on(page.sessionId, 'Runtime.consoleAPICalled', (p) => {
  const args = (p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ');
  logs.push(args.slice(0, 300));
});
page.browser.on(page.sessionId, 'Network.responseReceived', (p) => {
  const r = p.response;
  if (r.status >= 400) failed.push(r.status + ' ' + r.url.slice(0, 120));
});
await page.goto('http://127.0.0.1:5199/discover', { timeoutMs: 30000, settleMs: 6000 });
const info = await page.eval(`(() => {
  const body = document.body.innerText;
  return {
    hasServerError: body.includes("Máy chủ hiện không phản hồi"),
    mockImgs: [...document.images].filter(i => i.src.includes("/mock/")).length,
    cards: document.querySelectorAll("article").length,
    excerpt: body.slice(0, 300),
  };
})()`);
console.log('INFO:', JSON.stringify(info, null, 2));
console.log('FAILED REQUESTS:', failed.slice(0, 20).join('\n') || '(none)');
console.log('CONSOLE:', logs.slice(0, 10).join('\n') || '(none)');
await browser.close();
