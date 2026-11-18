// 棋類大全測試：Chrome 模擬 App Store 版的 iPhone／iPad／Mac 外殼（XiaokeIOS = { store, suite[, mac] }）
// 用法：node scripts/build-web.mjs && node e2e/suite.mjs
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const WWW = path.resolve('web');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.png': 'image/png', '.wasm': 'application/wasm' };
const PORT = 8851;
const server = http.createServer((req, res) => {
  const p = path.join(WWW, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(WWW) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(PORT);

const DEVICES = {
  iPhone: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, shim: { store: true, suite: true }, layout: 'mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  iPad: { viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2, hasTouch: true, shim: { store: true, suite: true }, layout: 'touch',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' },
  Mac: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, shim: { store: true, suite: true, mac: true }, layout: 'mac',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' },
};
const PROFILE = { avatar: 'm01', advisor: 'am01' };
const STATE = { chess: '__xkc', checkers: '__xkc', go: '__xkg' };

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log('✔', name); } else { fail++; console.log('✘', name, extra); } };
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
fs.mkdirSync('e2e/out', { recursive: true });
for (const [name, dev] of Object.entries(DEVICES)) {
  const { shim, layout, ...opts } = dev;
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((sh) => {
    window.XiaokeIOS = sh;
    window.__opened = [];
    const mk = (bridge) => ({ postMessage: (m) => {
      if (m.cmd === 'open_url') window.__opened.push(m.args[0]);
      if (m.cmd === 'app_info') return Promise.resolve({ status: 'ok', name: bridge, version: '1.0.0', platform: 'ios' });
      return Promise.resolve({ status: 'ok' });
    } });
    window.webkit = { messageHandlers: { xks: mk('xks'), xkc: mk('xkc'), xkj: mk('xkj'), xkg: mk('xkg') } };
  }, shim);
  const page = await ctx.newPage();
  const github = [];
  page.on('request', (r) => { if (/api\.github\.com|releases/.test(r.url())) github.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errors.push(name + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push(name + ' [pageerror] ' + e.message));
  const waitFor = async (fn, arg, ms = 30000) => {
    const t = Date.now();
    for (;;) {
      const v = await page.evaluate(fn, arg).catch(() => false);
      if (v) return v;
      if (Date.now() - t > ms) throw new Error(name + ' 等待逾時：' + fn);
      await new Promise((r) => setTimeout(r, 150));
    }
  };
  const atSuite = () => waitFor(() => location.pathname.endsWith('/index.html') && !/\/(chess|checkers|go)\//.test(location.pathname) && document.querySelectorAll('.card').length === 3);
  const gameReady = (id) => waitFor((g) => location.pathname.includes('/' + g + '/') && window[g === 'go' ? '__xkg' : '__xkc'] && document.querySelector('#scr-home.on'), id);
  try {
    await page.goto(`http://localhost:${PORT}/index.html`);
    await atSuite();
    // 象棋、圍棋第一次要選頭像：測試先替它選好，省得對話框擋住
    await page.evaluate((pr) => {
      localStorage.setItem('xkc.settings', JSON.stringify({ profile: pr, music: { autoplay: false } }));
      localStorage.setItem('xkg.settings', JSON.stringify({ profile: pr, music: { autoplay: false } }));
      localStorage.setItem('xkj.settings', JSON.stringify({ music: { autoplay: false } }));
    }, PROFILE);
    await page.reload();
    await atSuite();
    check(`${name}：總選單有象棋、跳棋、圍棋三張卡片`, (await page.evaluate(() => [...document.querySelectorAll('.card h2')].map((e) => e.textContent).join(','))) === '象棋,跳棋,圍棋');
    const narrow = await page.evaluate(() => document.documentElement.classList.contains('narrow'));
    check(`${name}：版面（${layout === 'mobile' ? '直放一張一列' : '橫放三張一排'}）`, narrow === (layout === 'mobile'));
    check(`${name}：卡片都在畫面內（沒有橫向捲動）`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `e2e/out/suite-${name}-home.png` });

    // 設定暱稱 → 三種棋共用
    await page.click('#btnSettings');
    await page.fill('#setName', '小明');
    await page.click('.modal-btns .primary');
    check(`${name}：總選單顯示新暱稱`, (await page.textContent('#helloName')) === '小明');

    for (const id of ['chess', 'checkers', 'go']) {
      await page.click(`[data-play="${id}"]`);
      await gameReady(id);
      const st = STATE[id];
      // 跳棋裡改成「阿德」之後才進圍棋
      const want = id === 'go' ? '阿德' : '小明';
      const nm = await waitFor((a) => window[a[0]].settings && window[a[0]].settings.playerName === a[1] && a[1], [st, want], 8000).catch(() => page.evaluate((k) => window[k].settings && window[k].settings.playerName, st));
      check(`${name}：進入${id}，暱稱是${want}`, nm === want, nm);
      check(`${name}：${id} 是手機／觸控／Mac 版面`, await page.evaluate((l) => document.documentElement.classList.contains(l), layout));
      await waitFor(() => document.documentElement.classList.contains('xks-home'), null, 8000).catch(() => false);
      check(`${name}：${id} 首頁有「‹ 棋類大全」`, await page.evaluate(() => { const b = document.querySelector('#xksHome'); return !!b && getComputedStyle(b).display !== 'none'; }));
      // 按鈕不能蓋住遊戲首頁上方的按鈕
      const overlap = await page.evaluate(() => {
        const b = document.querySelector('#xksHome').getBoundingClientRect();
        return [...document.querySelectorAll('#scr-home button, #scr-home a, #scr-home h1, #scr-home h2, #scr-home img, #scr-home input')].filter((e) => {
          if (e.id === 'xksHome' || e.closest('#xksHome')) return false;
          const r = e.getBoundingClientRect();
          return r.width && r.height && !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom);
        }).map((e) => e.textContent.trim().slice(0, 12));
      });
      check(`${name}：${id}「棋類大全」沒有蓋住標題、圖示或按鈕`, overlap.length === 0, overlap.join('|'));
      await page.screenshot({ path: `e2e/out/suite-${name}-${id}.png` });
      if (id === 'checkers') await page.evaluate(async () => { window.__xkc.settings = await window.xk.settings.set({ playerName: '阿德' }); });
      await page.click('#xksHome');
      await atSuite();
    }
    check(`${name}：在跳棋改的暱稱，回總選單也變了`, (await page.textContent('#helloName')) === '阿德');
    check(`${name}：總選單記得上次下的是圍棋`, /上次下的是圍棋/.test(await page.textContent('#helloText')) && await page.evaluate(() => document.querySelector('.card.last').dataset.game === 'go'));
    await page.click('[data-play="chess"]');
    await gameReady('chess');
    check(`${name}：象棋也跟著變成阿德`, (await page.evaluate(() => window.__xkc.settings.playerName)) === '阿德');
    await page.click('#xksHome');
    await atSuite();

    // 「學下圍棋」直接打開遊戲說明
    await page.click('[data-guide="go"]');
    await waitFor(() => location.pathname.includes('/go/') && document.querySelector('#scr-guide.on'), null, 30000).catch(() => false);
    check(`${name}：「📖 學下圍棋」直接打開圍棋的遊戲說明`, await page.evaluate(() => !!document.querySelector('#scr-guide.on')));
    await page.screenshot({ path: `e2e/out/suite-${name}-go-guide.png` });
    await page.evaluate(() => { location.href = '../index.html'; });
    await atSuite();

    // 關於
    await page.click('#btnAbout');
    const about = await page.textContent('.modal');
    check(`${name}：關於寫明 App Store 更新、三種棋版本、開發者`, /App Store/.test(about) && /象棋 1\.\d+\.\d+/.test(about) && /吳玉柱/.test(about));
    await page.click('.about a:has-text("隱私權政策")');
    check(`${name}：隱私權政策用外部瀏覽器開`, (await page.evaluate(() => window.__opened.join(' '))).includes('xiaoke-boardgames/privacy.html'));
    await page.click('.modal-btns .primary');

    // 卡片顯示棋譜數（遊戲存一盤棋譜後）
    await page.click('[data-play="checkers"]');
    await gameReady('checkers');
    await page.evaluate(() => window.xk.games.save({ id: 'test-' + Date.now(), date: new Date().toISOString(), moves: [] }).catch(() => null));
    await page.click('#xksHome');
    await atSuite();
    await waitFor(() => /已收錄 1 盤/.test(document.querySelector('[data-game="checkers"] .stat').textContent), null, 5000).catch(() => false);
    check(`${name}：跳棋卡片顯示「已收錄 1 盤棋譜」`, /已收錄 1 盤/.test(await page.textContent('[data-game="checkers"] .stat')), await page.textContent('[data-game="checkers"] .stat'));
    check(`${name}：沒有連 GitHub 檢查更新`, github.length === 0, github.join(' '));
  } catch (e) {
    fail++;
    console.log(`✘ ${name} 例外：`, e.message);
    await page.screenshot({ path: `e2e/out/suite-${name}-fail.png` }).catch(() => {});
  }
  await ctx.close();
}
check('沒有網頁錯誤', errors.length === 0, errors.slice(0, 8).join(' | '));
console.log(`\n結果：${pass} 通過，${fail} 失敗`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
