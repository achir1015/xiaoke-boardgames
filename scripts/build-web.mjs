// 組合「小柯機器人棋類大全」的網頁：首頁（launcher/）＋三個遊戲的手機版網頁（各專案的 mobile/www）
// 用法：node scripts/build-web.mjs            直接用各專案現有的 mobile/www
//       node scripts/build-web.mjs --rebuild  先在各專案執行 scripts/build-mobile.mjs 重新產生 mobile/www
// 產出：web/（index.html 首頁、suite.js 共用橋、chess/、checkers/、go/）
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web');
export const GAMES = [
  { id: 'chess', name: '象棋', dir: process.env.XK_CHESS || 'E:/AI Agent/Claude Code/xiaoke-chess' },
  { id: 'checkers', name: '跳棋', dir: process.env.XK_CHECKERS || 'E:/中國跳棋/xiaoke-checkers' },
  { id: 'go', name: '圍棋', dir: process.env.XK_GO || 'E:/AI 圍棋競賽/xiaoke-go' },
];

// Node 22 內建的目錄複製遇到中文路徑會當掉（存取違規），自己寫
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'launcher'), OUT);

const games = {};
for (const g of GAMES) {
  if (process.argv.includes('--rebuild')) {
    console.log(`… 重新產生 ${g.name}的手機版網頁`);
    execFileSync(process.execPath, ['scripts/build-mobile.mjs'], { cwd: g.dir, stdio: 'inherit' });
  }
  const www = path.join(g.dir, 'mobile', 'www');
  if (!fs.existsSync(path.join(www, 'index.html'))) throw new Error(`找不到 ${www}，請加 --rebuild`);
  const dest = path.join(OUT, g.id);
  copyDir(www, dest);
  // 線上版才用的檔案，App 裡不需要
  for (const f of ['manifest.webmanifest', 'version.json', 'sw.js']) fs.rmSync(path.join(dest, f), { force: true });
  // 在遊戲載入設定之前插入共用橋（同一個網站，CSP 的 'self' 允許）：共用暱稱與設定、首頁加「回棋類大全」
  const html = path.join(dest, 'index.html');
  let s = fs.readFileSync(html, 'utf8');
  const tag = '<script src="js/xk-mobile.js"></script>';
  if (s.split(tag).length !== 2) throw new Error(`${g.id}/index.html 找不到唯一的 xk-mobile.js`);
  s = s.replace(tag, '<script src="../suite.js"></script>\n' + tag);
  fs.writeFileSync(html, s);
  // 象棋手機版的頭像、音樂用 '../../assets/'（在網站根目錄時會被瀏覽器夾回 /assets/），放進子資料夾後要改成網頁旁邊的 assets/
  for (const f of ['js/portraits.js', 'js/xk-mobile.js']) {
    const p = path.join(dest, f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    if (t.includes("'../../assets/")) fs.writeFileSync(p, t.split("'../../assets/").join("'assets/"));
  }
  const left = [];
  (function scan(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'assets') scan(p); } else if (/\.(js|css|html)$/.test(e.name) && /['"`(]\.\.\/\.\.\/assets\//.test(fs.readFileSync(p, 'utf8')) && !/ASSETS = window\./.test(fs.readFileSync(p, 'utf8'))) left.push(path.relative(dest, p));
    }
  })(dest);
  if (left.length) throw new Error(`${g.id} 還有 '../../assets/' 路徑：${left.join(', ')}`);
  const ver = JSON.parse(fs.readFileSync(path.join(g.dir, 'package.json'), 'utf8')).version;
  games[g.id] = { name: g.name, version: ver };
  console.log(`✔ ${g.name} ${ver}`);
}
fs.writeFileSync(path.join(OUT, 'version.js'), `window.XKS_VERSION = ${JSON.stringify(pkg.version)};\nwindow.XKS_GAMES = ${JSON.stringify(games)};\n`);
let bytes = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } })(OUT);
console.log(`web/ 完成：棋類大全 ${pkg.version}，共 ${(bytes / 1048576).toFixed(0)} MB`);
