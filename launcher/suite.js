// 棋類大全的共用橋：放在每個遊戲的 index.html（在 js/xk-mobile.js 之前載入）
// 1. 共用設定：暱稱、背景音樂與音效、Claude 金鑰與同意、連線對戰須知、封鎖名單——在任一個棋改了，其他棋也跟著改
// 2. 遊戲首頁左上角加「‹ 棋類大全」回到總選單
// 3. 從總選單按「學下棋」進來時，自動打開該遊戲的「遊戲說明」
(function () {
  var m = /\/(chess|checkers|go)\//.exec(location.pathname);
  if (!m) return;
  var GAME = m[1];
  var KEY = { chess: 'xkc.settings', checkers: 'xkj.settings', go: 'xkg.settings' }[GAME];
  var SHARED = 'xks.shared';
  var FIELDS = ['playerName', 'sfx', 'netTermsOK', 'claudeConsent', 'blocked'];
  var setItem = Storage.prototype.setItem;
  function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function get(k) { try { return parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { setItem.call(localStorage, k, JSON.stringify(v)); } catch (e) { /* 空間不足 */ } }

  // 共用 → 這個棋（遊戲讀設定之前）
  var sh = get(SHARED);
  if (sh) {
    var g = get(KEY) || {};
    FIELDS.forEach(function (k) { if (k in sh) g[k] = sh[k]; });
    if (sh.music) g.music = Object.assign({}, g.music || {}, sh.music);
    if (sh.apiKey !== undefined) g.advisor = Object.assign({}, g.advisor || {}, { apiKey: sh.apiKey });
    put(KEY, g);
  }
  // 這個棋 → 共用（遊戲每次存設定時）
  function pushShared(g) {
    if (!g) return;
    var s = get(SHARED) || {};
    FIELDS.forEach(function (k) { if (k in g) s[k] = g[k]; });
    if (g.music) s.music = { volume: g.music.volume, enabled: g.music.enabled };
    if (g.advisor && 'apiKey' in g.advisor) s.apiKey = g.advisor.apiKey;
    s.last = GAME;
    put(SHARED, s);
  }
  Storage.prototype.setItem = function (k, v) {
    setItem.call(this, k, v);
    if (this === localStorage && k === KEY) pushShared(parse(v));
  };
  pushShared(get(KEY) || {});

  function goSuite() { location.href = '../index.html'; }
  window.XiaokeSuite = { game: GAME, home: goSuite };

  document.addEventListener('DOMContentLoaded', function () {
    var css = document.createElement('style');
    // 遊戲首頁最上面騰出一列放「‹ 棋類大全」（跟著首頁一起捲動，不蓋住遊戲的標題）
    css.textContent = 'html.xks-home #scr-home::before{content:"";display:block;height:calc(50px + env(safe-area-inset-top));flex:none}' +
      '#xksHome{position:absolute;z-index:50;left:calc(14px + env(safe-area-inset-left));top:calc(8px + env(safe-area-inset-top));' +
      'display:none;align-items:center;gap:6px;padding:8px 14px 8px 10px;border-radius:999px;border:1px solid rgba(240,200,140,.45);' +
      'background:rgba(40,28,18,.86);color:#f6e2c0;font:600 15px/1 system-ui,"PingFang TC","Microsoft JhengHei",sans-serif;cursor:pointer;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
      '#xksHome b{font-size:20px;line-height:14px;margin-top:-2px}#xksHome:active{transform:scale(.96)}' +
      'html.xks-home #xksHome{display:inline-flex}';
    document.head.appendChild(css);
    var b = document.createElement('button');
    b.id = 'xksHome';
    b.type = 'button';
    b.title = '回到棋類大全';
    b.innerHTML = '<b>‹</b>棋類大全';
    b.addEventListener('click', goSuite);
    // 只在遊戲首頁、沒有對話框時顯示
    var home = document.getElementById('scr-home');
    if (home && getComputedStyle(home).position === 'static') home.style.position = 'relative';
    function sync() {
      if (home && b.parentNode !== home) home.insertBefore(b, home.firstChild);   // 首頁重畫時放回去
      var on = !!home && home.classList.contains('on') && !document.querySelector('.modal-back, .modal');
      document.documentElement.classList.toggle('xks-home', on);
    }
    new MutationObserver(sync).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    sync();

    // 從總選單直接打開「遊戲說明」
    var open = null;
    try { open = sessionStorage.getItem('xks.open'); sessionStorage.removeItem('xks.open'); } catch (e) { /* 無 */ }
    if (open === 'guide') {
      var t0 = Date.now();
      (function tryOpen() {
        var btn = document.getElementById('btnGuide');
        if (btn && !document.querySelector('.modal') && btn.offsetParent !== null) { btn.click(); return; }
        if (Date.now() - t0 < 20000) setTimeout(tryOpen, 250);
      })();
    }
  });
})();
