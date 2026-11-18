// 小柯機器人棋類大全：總選單
(function () {
  'use strict';
  var SHARED = 'xks.shared';
  var GKEY = { chess: 'xkc.settings', checkers: 'xkj.settings', go: 'xkg.settings' };
  var GDB = { chess: 'xiaoke-chess', checkers: 'xiaoke-checkers', go: 'xiaoke-go' };
  var SITE = 'https://achir1015.github.io/xiaoke-boardgames/';
  var ios = window.XiaokeIOS || null;

  function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function get(k) { try { return parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 空間不足 */ } }
  function $(s) { return document.querySelector(s); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'on') Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); });
      else if (k === 'html') e.innerHTML = attrs.html;
      else if (k === 'text') e.textContent = attrs.text;
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function openUrl(u) {
    try { if (ios && window.webkit && window.webkit.messageHandlers.xks) { window.webkit.messageHandlers.xks.postMessage({ cmd: 'open_url', args: [u] }); return; } } catch (e) { /* 改用瀏覽器 */ }
    window.open(u, '_blank');
  }

  // ---------- 共用設定（第一次打開時從已經玩過的棋帶進來） ----------
  function shared() {
    var s = get(SHARED);
    if (!s) {
      s = {};
      ['chess', 'checkers', 'go'].forEach(function (id) {
        var g = get(GKEY[id]);
        if (!g) return;
        if (g.playerName && !s.playerName) s.playerName = g.playerName;
        if (g.music && !s.music) s.music = { volume: g.music.volume, enabled: g.music.enabled };
        if ('sfx' in g && !('sfx' in s)) s.sfx = g.sfx;
      });
      put(SHARED, s);
    }
    return s;
  }
  function saveShared(p) {
    var s = Object.assign(shared(), p);
    put(SHARED, s);
    // 還沒打開過的棋也先寫進去，進去就是同一個暱稱
    ['chess', 'checkers', 'go'].forEach(function (id) {
      var g = get(GKEY[id]) || {};
      if ('playerName' in p) g.playerName = p.playerName;
      if ('sfx' in p) g.sfx = p.sfx;
      if (p.music) g.music = Object.assign({}, g.music || {}, p.music);
      put(GKEY[id], g);
    });
    return s;
  }

  // ---------- 三種棋 ----------
  var GAMES = [
    { id: 'chess', name: '象棋', full: '小柯機器人象棋', color: '#c0392b',
      tag: '楚河漢界，將帥對決',
      feats: ['整盤與半盤（暗棋）', 'AI 五種難度、會從棋譜學習', '60 位英雄佳人頭像、軍師代打'] },
    { id: 'checkers', name: '跳棋', full: '小柯機器人跳棋', color: '#2f8f4f',
      tag: '六角星彈珠，一口氣連跳',
      feats: ['2～3 人，紅綠藍三色', '空位由 AI 代下、可觀棋', '玻璃彈珠 3D 棋盤'] },
    { id: 'go', name: '圍棋', full: '小柯機器人圍棋', color: '#2c3e70',
      tag: '黑白圍地，即時勝率',
      feats: ['9、13、19 路棋盤', '即時勝率、目差與形勢判斷', '讓子、中國／日韓規則'] },
  ];

  function art(id) {
    if (id === 'chess') {
      var l = '';
      for (var r = 0; r < 10; r++) l += '<line x1="12" y1="' + (12 + r * 14) + '" x2="124" y2="' + (12 + r * 14) + '"/>';
      for (var c = 0; c < 9; c++) {
        l += '<line x1="' + (12 + c * 14) + '" y1="12" x2="' + (12 + c * 14) + '" y2="75"/>';
        l += '<line x1="' + (12 + c * 14) + '" y1="89" x2="' + (12 + c * 14) + '" y2="138"/>';
      }
      l += '<line x1="12" y1="75" x2="12" y2="89"/><line x1="124" y1="75" x2="124" y2="89"/>';
      l += '<path d="M54 12 L82 40 M82 12 L54 40 M54 110 L82 138 M82 110 L54 138"/>';
      var pc = function (x, y, ch, red) {
        return '<g transform="translate(' + x + ',' + y + ')"><circle r="10.5" fill="#f3dcae" stroke="' + (red ? '#b3261e' : '#222') + '" stroke-width="1.6"/>' +
          '<circle r="8" fill="none" stroke="' + (red ? '#b3261e' : '#222') + '" stroke-width=".7"/>' +
          '<text y="4.2" font-size="11.5" font-weight="700" text-anchor="middle" fill="' + (red ? '#b3261e' : '#222') + '">' + ch + '</text></g>';
      };
      return '<svg viewBox="0 0 136 150" class="art"><rect x="2" y="2" width="132" height="146" rx="8" fill="#e7c48c"/>' +
        '<g stroke="#6b4423" stroke-width="1">' + l + '</g>' +
        '<text x="40" y="86" font-size="9" fill="#6b4423">楚 河</text><text x="80" y="86" font-size="9" fill="#6b4423">漢 界</text>' +
        pc(68, 138, '帥', 1) + pc(40, 138, '相', 1) + pc(12, 138, '車', 1) + pc(26, 110, '炮', 1) + pc(54, 96, '兵', 1) +
        pc(68, 12, '將', 0) + pc(96, 12, '象', 0) + pc(110, 40, '馬', 0) + pc(82, 54, '卒', 0) + '</svg>';
    }
    if (id === 'checkers') {
      var cx = 68, cy = 75, U = 9.2, holes = '', marb = '';
      var red = { '-4,8': 1, '-3,7': 1, '-2,6': 1, '-1,5': 1, '-3,8': 1, '-2,7': 1, '-1,6': 1, '-2,8': 1, '-1,7': 1, '-1,8': 1 };
      for (var x = -8; x <= 8; x++) for (var z = -8; z <= 8; z++) {
        var y = -x - z;
        var inStar = (Math.abs(x) <= 4 && Math.abs(y) <= 4 && Math.abs(z) <= 4) ||
          (x >= -4 && y >= -4 && z >= -4 && x + y + z === 0 && Math.max(x, y, z) <= 8 && Math.min(x, y, z) >= -4) ||
          (x <= 4 && y <= 4 && z <= 4 && Math.min(x, y, z) >= -8 && Math.max(x, y, z) <= 4);
        if (!inStar) continue;
        var px = cx + (x + z / 2) * U, py = cy + z * U * 0.866;
        var col = null;
        if (z >= 5) col = '#e53935'; else if (z <= -5) col = null;
        if (x >= 5) col = '#1f6fe0'; if (y >= 5) col = '#2fa84f';
        if (col && (x * 7 + z * 3 + 50) % 4 !== 0) marb += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.9" fill="' + col + '" stroke="rgba(0,0,0,.35)" stroke-width=".6"/><circle cx="' + (px - 1.2).toFixed(1) + '" cy="' + (py - 1.3).toFixed(1) + '" r="1.2" fill="rgba(255,255,255,.75)"/>';
        else holes += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="1.8"/>';
      }
      void red;
      var st = [];
      for (var k = 0; k < 12; k++) { var a = -Math.PI / 2 + k * Math.PI / 6, rr = k % 2 ? 46 : 80; st.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
      return '<svg viewBox="0 0 136 150" class="art"><rect x="2" y="2" width="132" height="146" rx="8" fill="#d9b07a"/>' +
        '<polygon points="' + st.join(' ') + '" fill="#f6eedd" stroke="#a87b4a" stroke-width="1.2"/>' +
        '<g fill="#6b4423">' + holes + '</g>' + marb + '</svg>';
    }
    var g = '', s = '', N = 9, P = 14, O = 12;
    for (var i = 0; i < N; i++) {
      g += '<line x1="' + O + '" y1="' + (O + i * P) + '" x2="' + (O + 8 * P) + '" y2="' + (O + i * P) + '"/>';
      g += '<line x1="' + (O + i * P) + '" y1="' + O + '" x2="' + (O + i * P) + '" y2="' + (O + 8 * P) + '"/>';
    }
    [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]].forEach(function (p) { g += '<circle cx="' + (O + p[0] * P) + '" cy="' + (O + p[1] * P) + '" r="1.6" fill="#3a2a18"/>'; });
    var stones = [[2, 2, 1], [3, 2, 0], [3, 3, 1], [4, 3, 0], [2, 4, 1], [4, 4, 1], [5, 4, 0], [6, 2, 0], [5, 5, 0], [3, 5, 1], [6, 6, 1], [4, 6, 0], [2, 6, 1]];
    stones.forEach(function (p) {
      var x = O + p[0] * P, y = O + p[1] * P;
      s += p[2] ? '<circle cx="' + x + '" cy="' + y + '" r="6.4" fill="#1d1d1f"/><circle cx="' + (x - 2) + '" cy="' + (y - 2.2) + '" r="1.8" fill="rgba(255,255,255,.28)"/>'
        : '<circle cx="' + x + '" cy="' + y + '" r="6.4" fill="#f7f5ef" stroke="#999" stroke-width=".6"/>';
    });
    return '<svg viewBox="0 0 136 150" class="art"><rect x="2" y="2" width="132" height="146" rx="8" fill="#e3b873"/>' +
      '<g transform="translate(0,9)"><g stroke="#3a2a18" stroke-width=".9">' + g + '</g>' + s + '</g></svg>';
  }

  function play(id, what) {
    try { if (what) sessionStorage.setItem('xks.open', what); else sessionStorage.removeItem('xks.open'); } catch (e) { /* 無 */ }
    saveShared({ last: id });
    location.href = id + '/index.html';
  }

  function count(id) {
    // 只讀已經存在的資料庫（不能先建空的，否則遊戲之後建不出資料表）
    return new Promise(function (ok) {
      try {
        if (!indexedDB.databases) return ok(0);
        indexedDB.databases().then(function (list) {
          if (!list.some(function (d) { return d.name === GDB[id]; })) return ok(0);
          var r = indexedDB.open(GDB[id]);
          r.onsuccess = function () {
            var db = r.result;
            if (!db.objectStoreNames.contains('games')) { db.close(); return ok(0); }
            var q = db.transaction('games').objectStore('games').count();
            q.onsuccess = function () { db.close(); ok(q.result || 0); };
            q.onerror = function () { db.close(); ok(0); };
          };
          r.onerror = function () { ok(0); };
        }, function () { ok(0); });
      } catch (e) { ok(0); }
    });
  }

  function render() {
    var s = shared();
    $('#helloName').textContent = s.playerName || '棋友';
    var last = s.last && GAMES.filter(function (g) { return g.id === s.last; })[0];
    $('#helloText').textContent = last ? '上次下的是' + last.name + '，今天想下哪一種棋？' : '我是小柯機器人，今天想下哪一種棋？';
    var box = $('#cards');
    box.innerHTML = '';
    GAMES.forEach(function (g) {
      var stat = h('span', { class: 'stat', text: '' });
      var card = h('article', { class: 'card' + (s.last === g.id ? ' last' : ''), 'data-game': g.id, style: '--gc:' + g.color }, [
        h('div', { class: 'art-wrap', html: art(g.id), on: { click: function () { play(g.id); } } }),
        h('div', { class: 'info' }, [
          h('h2', {}, [g.name, s.last === g.id ? h('span', { class: 'badge', text: '上次' }) : null]),
          h('p', { class: 'tag', text: g.tag }),
          h('ul', { class: 'feats' }, g.feats.concat(['和 AI 對賽、與朋友連線對戰、語音聊天']).map(function (f) { return h('li', { text: f }); })),
          stat,
          h('div', { class: 'btns' }, [
            h('button', { class: 'primary', type: 'button', 'data-play': g.id, on: { click: function () { play(g.id); } } }, ['開始下' + g.name]),
            h('button', { class: 'ghost', type: 'button', 'data-guide': g.id, on: { click: function () { play(g.id, 'guide'); } } }, ['📖 學下' + g.name]),
          ]),
        ]),
      ]);
      box.appendChild(card);
      count(g.id).then(function (n) { stat.textContent = n ? '已收錄 ' + n + ' 盤棋譜' : '還沒下過，來一盤吧'; });
    });
  }

  // ---------- 對話框 ----------
  function modal(title, body, buttons) {
    var back = h('div', { class: 'modal-back' });
    var close = function () { back.remove(); };
    var box = h('div', { class: 'modal', role: 'dialog' }, [h('h3', { text: title }), body,
      h('div', { class: 'modal-btns' }, buttons.map(function (b) {
        return h('button', { type: 'button', class: b.primary ? 'primary' : 'ghost', on: { click: function () { if (b.click && b.click() === false) return; close(); } } }, [b.label]);
      }))]);
    back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.body.appendChild(back);
    return back;
  }

  function settings() {
    var s = shared();
    var music = s.music || { volume: 0.45, enabled: true };
    var name = h('input', { id: 'setName', type: 'text', maxlength: '12', value: s.playerName || '' });
    var mOn = h('input', { id: 'setMusic', type: 'checkbox' }); mOn.checked = music.enabled !== false;
    var vol = h('input', { id: 'setVol', type: 'range', min: '0', max: '1', step: '0.05', value: String(music.volume == null ? 0.45 : music.volume) });
    var sfx = h('input', { id: 'setSfx', type: 'checkbox' }); sfx.checked = s.sfx !== false;
    var body = h('div', { class: 'form' }, [
      h('label', {}, ['棋友暱稱（三種棋共用，連線對戰時朋友看到的名字）', name]),
      h('label', { class: 'row' }, [mOn, '背景音樂']),
      h('label', {}, ['音樂音量', vol]),
      h('label', { class: 'row' }, [sfx, '落子音效']),
      h('p', { class: 'muted', text: '每種棋裡面的其他設定（難度、視角、AI 軍師金鑰⋯）在各自的「設定」裡調整；暱稱、音樂、音效、軍師金鑰在三種棋之間會自動同步。' }),
    ]);
    modal('設定', body, [
      { label: '取消' },
      { label: '儲存', primary: true, click: function () {
        var n = name.value.trim().slice(0, 12);
        saveShared({ playerName: n || '棋友', sfx: sfx.checked, music: { enabled: mOn.checked, volume: Number(vol.value) } });
        render();
      } },
    ]);
  }

  function about() {
    var gv = window.XKS_GAMES || {};
    var link = function (label, u) { return h('a', { href: '#', on: { click: function (e) { e.preventDefault(); openUrl(u); } } }, [label]); };
    var body = h('div', { class: 'about' }, [
      h('img', { src: 'img/icon.png', class: 'about-icon', alt: '' }),
      h('p', {}, [h('b', { text: '小柯機器人棋類大全' }), '　版本 ' + (window.XKS_VERSION || '')]),
      h('p', { class: 'muted', text: '象棋 ' + ((gv.chess || {}).version || '') + '・跳棋 ' + ((gv.checkers || {}).version || '') + '・圍棋 ' + ((gv.go || {}).version || '') }),
      h('p', { text: '一個 App 收錄三種棋：和 AI 對賽（不用網路）、用房號邀請朋友連線對戰與語音聊天、AI 軍師解說、小柯機器人語音動畫教學。' }),
      h('p', { class: 'upd', text: ios && ios.store ? '新版本由 App Store 自動更新。' : '' }),
      h('p', {}, [link('技術支援', SITE + 'support.html'), '　', link('隱私權政策', SITE + 'privacy.html')]),
      h('p', { text: '沒有廣告、不用註冊、不收集任何資料。' }),
      h('p', { class: 'credit', text: '系統開發：吳玉柱 先生 與 Claude AI Opus 5.5' }),
    ]);
    modal('關於', body, [{ label: '關閉', primary: true }]);
  }

  // ---------- 啟動 ----------
  var cls = document.documentElement.classList;
  var narrow = function () { cls.toggle('narrow', innerWidth < 760); };
  if (ios) cls.add('app');
  if (ios && ios.mac) cls.add('mac');
  narrow();
  addEventListener('resize', narrow);
  $('#btnSettings').addEventListener('click', settings);
  $('#btnAbout').addEventListener('click', about);
  render();
  addEventListener('pageshow', function (e) { if (e.persisted) render(); });
  window.__xks = { render: render, shared: shared, play: play };
})();
