// App Store 截圖：總選單（新拍）＋三種棋各兩張（沿用各遊戲 App Store 版的截圖）
// 用法：node scripts/build-web.mjs && node e2e/shots.mjs ["E:/Apple Developer app/小柯棋類大全_截圖"]
// 尺寸：iPhone 6.3 吋 1206×2622（直）、iPad 13 吋 2752×2064（橫）、Mac 2880×1800
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] || 'E:/Apple Developer app/小柯棋類大全_截圖';
const SHOTS = 'E:/Apple Developer app';
const WWW = path.resolve('web');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const PORT = 8853;
const server = http.createServer((req, res) => {
  const p = path.join(WWW, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(WWW) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT);

const DEVICES = {
  iphone: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, shim: { store: true, suite: true },
    from: { chess: ['小柯象棋_截圖/iPhone_1206x2622', ['03-full-game', '05-half-game']], checkers: ['小柯跳棋_截圖/iphone', ['02-game-3p', '04-guide-chain']], go: ['小柯圍棋_截圖/iphone', ['02-game', '04-advisor']] } },
  ipad: { viewport: { width: 1376, height: 1032 }, deviceScaleFactor: 2, hasTouch: true, shim: { store: true, suite: true },
    from: { chess: ['小柯象棋_截圖/iPad_2752x2064', ['03-full-game', '05-half-game']], checkers: ['小柯跳棋_截圖/ipad', ['02-game-3p', '04-guide-chain']], go: ['小柯圍棋_截圖/ipad', ['02-game', '04-advisor']] } },
  mac: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, shim: { store: true, suite: true, mac: true },
    from: { chess: ['小柯象棋_截圖/Mac_2880x1800', ['03-full-game', '05-half-game']], checkers: ['小柯跳棋_截圖/mac', ['02-game-3p', '04-guide-chain']], go: ['小柯圍棋_截圖/mac', ['02-game', '04-advisor']] } },
};

const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, dev] of Object.entries(DEVICES)) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { shim, from, ...opts } = dev;
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((sh) => {
    window.XiaokeIOS = sh;
    const m = { postMessage: () => Promise.resolve({ status: 'ok' }) };
    window.webkit = { messageHandlers: { xks: m, xkc: m, xkj: m, xkg: m } };
  }, shim);
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.evaluate(() => localStorage.setItem('xks.shared', JSON.stringify({ playerName: '小明' })));
  await page.reload();
  await page.waitForSelector('.card');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(dir, '01-棋類大全.png') });
  let n = 1;
  for (const [gid, [folder, files]] of Object.entries(from)) {
    for (const f of files) {
      n++;
      fs.copyFileSync(path.join(SHOTS, folder, f + '.png'), path.join(dir, `${String(n).padStart(2, '0')}-${{ chess: '象棋', checkers: '跳棋', go: '圍棋' }[gid]}-${f}.png`));
    }
  }
  console.log(`✔ ${name}：${n} 張 → ${dir}`);
  await ctx.close();
}
await browser.close();
server.close();
