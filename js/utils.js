/* ==========================================================
   DeliEasy v2 — js/utils.js
   共通ユーティリティ（グローバル公開）
   ========================================================== */
(function(){
  'use strict';

  /* ---------- DOM helpers ---------- */
  function $(s) { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }

  /* ---------- Formatting ---------- */
  function fmt(n) { return Number(n || 0).toLocaleString('ja-JP'); }

  function escHtml(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escJs(s) {
    if (!s && s !== 0) return '';
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /* ---------- Date helpers ---------- */
  var DAYS = ['日','月','火','水','木','金','土'];

  function dateKey(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  var _now = new Date();
  var TD = dateKey(_now);
  var MK = TD.substring(0, 7);

  /* ---------- Toast ---------- */
  function toast(msg, ms) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    var area = document.getElementById('toast-area');
    if (area) {
      area.appendChild(el);
      setTimeout(function() { el.remove(); }, ms || 2500);
    }
  }

  /* ---------- Haptic ---------- */
  function hp() {
    try { navigator.vibrate(10); } catch(e) {}
  }

  /* ---------- Custom Confirm ---------- */
  function customConfirm(message, onYes, onNo) {
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box">' +
        '<p class="fz-s mb12" style="line-height:1.6;white-space:pre-wrap">' + escHtml(message) + '</p>' +
        '<div class="flex justify-center gap8">' +
          '<button class="btn btn-primary btn-sm" id="v2-cc-yes">OK</button>' +
          '<button class="btn btn-secondary btn-sm" id="v2-cc-no">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    document.getElementById('v2-cc-yes').onclick = function() { div.remove(); if (onYes) onYes(); };
    document.getElementById('v2-cc-no').onclick = function() { div.remove(); if (onNo) onNo(); };
  }

  /* ---------- Custom Prompt ---------- */
  function customPrompt(message, defaultVal, onSubmit, onCancel) {
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box">' +
        '<p class="fz-s mb12" style="line-height:1.6">' + escHtml(message) + '</p>' +
        '<input type="text" class="input mb12" id="v2-cp-input" value="' + escHtml(defaultVal || '') + '">' +
        '<div class="flex justify-center gap8">' +
          '<button class="btn btn-primary btn-sm" id="v2-cp-ok">OK</button>' +
          '<button class="btn btn-secondary btn-sm" id="v2-cp-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    var input = document.getElementById('v2-cp-input');
    input.focus();
    input.select();
    document.getElementById('v2-cp-ok').onclick = function() {
      var val = input.value;
      div.remove();
      if (onSubmit) onSubmit(val);
    };
    document.getElementById('v2-cp-cancel').onclick = function() {
      div.remove();
      if (onCancel) onCancel();
    };
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('v2-cp-ok').click();
    });
  }

  /* ---------- PF (Platform) helpers ---------- */
  /* These are needed by calendar.js, stats.js, expense.js */

  var DEFAULT_PFS = [
    { name: 'Uber Eats', color: '#00b14f', active: true, default: true },
    { name: '出前館',    color: '#e60012', active: true, default: true },
    { name: 'Wolt',      color: '#00c2e8', active: true, default: true },
    { name: 'menu',      color: '#ff6600', active: true, default: true }
  ];

  function getAllPFs() {
    var saved = S.g('pfItems', null);
    if (saved && Array.isArray(saved)) return saved;
    return DEFAULT_PFS.slice();
  }

  function pfColor(name) {
    if (!name) return '#888';
    var pfs = getAllPFs();
    for (var i = 0; i < pfs.length; i++) {
      if (pfs[i].name === name) return pfs[i].color || '#888';
    }
    /* Hash-based fallback color */
    var hash = 0;
    for (var j = 0; j < name.length; j++) {
      hash = name.charCodeAt(j) + ((hash << 5) - hash);
    }
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ',55%,50%)';
  }

  function extractPf(memo) {
    if (!memo) return '';
    var m = memo.match(/^\/([^\s(]+)/);
    return m ? m[1] : '';
  }

  function pfOpts() {
    var pfs = getAllPFs();
    return pfs.filter(function(p) { return p.active !== false; })
      .map(function(p) { return '<option value="' + escHtml(p.name) + '">' + escHtml(p.name) + '</option>'; })
      .join('');
  }

  /* ---------- Fold card helper (used by stats.js) ---------- */
  var _foldState = {};

  function foldCard(ns, key, title, content) {
    var fk = ns + '_' + key;
    if (_foldState[fk] === undefined) _foldState[fk] = true; /* default open */
    var isOpen = _foldState[fk];
    return '<div class="card mb12">' +
      '<div class="card-header ' + (isOpen ? 'open' : '') + '" onclick="toggleFold(\'' + escJs(fk) + '\')">' +
        '<span>' + title + '</span>' +
        '<span class="card-arrow">▼</span>' +
      '</div>' +
      '<div class="card-body" style="' + (isOpen ? '' : 'display:none') + '" id="fold-' + fk + '">' +
        content +
      '</div>' +
    '</div>';
  }

  function toggleFold(fk) {
    _foldState[fk] = !_foldState[fk];
    var body = document.getElementById('fold-' + fk);
    if (body) {
      body.style.display = _foldState[fk] ? '' : 'none';
    }
    /* Toggle the header class */
    var card = body ? body.parentElement : null;
    if (card) {
      var hdr = card.querySelector('.card-header');
      if (hdr) hdr.classList.toggle('open', _foldState[fk]);
    }
  }

  /* ---------- Firebase sync compat shims ---------- */
  /* firebase-sync.js calls openMo('settings') and closeMo() in its sync choice dialog */
  window.openMo = window.openMo || function(id) {
    if (id === 'settings' && typeof openOverlay === 'function') {
      openOverlay('settings');
    } else if (id === 'addExpCat') {
      /* Quick expense category add */
      customPrompt('新しいカテゴリ名を入力', '', function(val) {
        if (!val || !val.trim()) return;
        var cats = S.g('expCats', []);
        if (cats.indexOf(val.trim()) < 0) {
          cats.push(val.trim());
          S.s('expCats', cats);
          toast('✅ カテゴリ「' + val.trim() + '」を追加しました');
        } else {
          toast('既に存在するカテゴリです');
        }
      });
    }
  };

  window.closeMo = window.closeMo || function() {
    /* Close overlay if it's the settings one */
    if (typeof closeAllOverlays === 'function') closeAllOverlays();
  };

  /* updateSyncStatusUI — called by firebase-sync.js directly */
  window.updateSyncStatusUI = window.updateSyncStatusUI || function() {
    if (typeof window.updateSyncIndicator === 'function') {
      window.updateSyncIndicator();
    }
  };

  /* ---------- Expose to global ---------- */
  window.$ = $;
  window.$$ = $$;
  window.fmt = fmt;
  window.escHtml = escHtml;
  window.escJs = escJs;
  window.DAYS = DAYS;
  window.dateKey = dateKey;
  window.TD = TD;
  window.MK = MK;
  window.toast = toast;
  window.hp = hp;
  window.customConfirm = customConfirm;
  window.customPrompt = customPrompt;

  window.getAllPFs = getAllPFs;
  window.pfColor = pfColor;
  window.extractPf = extractPf;
  window.pfOpts = pfOpts;

  window.foldCard = foldCard;
  window.toggleFold = toggleFold;

})();
