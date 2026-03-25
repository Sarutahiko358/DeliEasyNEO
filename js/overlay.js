/* ==========================================================
   DeliEasy v2 — js/overlay.js
   オーバーレイシステム（フルスクリーン・スタック対応）
   ========================================================== */
(function(){
  'use strict';

  /* ---------- Overlay registry ---------- */
  var OVERLAYS = {
    earnInput:     { title: '✏️ 売上入力' },
    expenseInput:  { title: '💸 経費入力' },
    calendar:      { title: '📅 カレンダー' },
    stats:         { title: '📊 統計' },
    tax:           { title: '🧾 税金' },
    expenseManage: { title: '💰 経費管理' },
    pfManage:      { title: '📦 PF・カテゴリ管理' },
    theme:         { title: '🎨 テーマ' },
    settings:      { title: '⚙️ 設定' },
    help:          { title: '❓ ヘルプ' }
  };

  /* ---------- State ---------- */
  var _stack = [];

  /* ---------- Container refs ---------- */
  function _getContainer() { return document.getElementById('overlay-container'); }
  function _getBackdrop() { return document.getElementById('overlay-backdrop'); }

  /* ---------- Open ---------- */
  function openOverlay(id) {
    var def = OVERLAYS[id];
    if (!def) { console.warn('[Overlay] Unknown:', id); return; }

    var container = _getContainer();
    var backdrop = _getBackdrop();
    if (!container) return;

    var level = _stack.length + 1;
    if (level > 2) { _closeTopSheet(); level = _stack.length + 1; }

    var sheet = document.createElement('div');
    sheet.className = 'overlay-sheet';
    sheet.id = 'overlay-sheet-' + id;
    sheet.setAttribute('data-level', level);
    sheet.setAttribute('data-id', id);

    sheet.innerHTML =
      '<div class="overlay-handle"></div>' +
      '<div class="overlay-header">' +
        '<button class="overlay-back" onclick="closeOverlay()">←</button>' +
        '<span class="overlay-title">' + escHtml(def.title) + '</span>' +
        '<div class="overlay-actions"></div>' +
      '</div>' +
      '<div class="overlay-body" id="overlay-body-' + id + '">' +
        '<div class="text-c c-muted fz-s" style="padding:60px 0">読み込み中...</div>' +
      '</div>';

    container.appendChild(sheet);
    container.classList.add('has-overlay');
    if (backdrop) backdrop.classList.add('visible');

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { sheet.classList.add('open'); });
    });

    _stack.push({ id: id, level: level });
    _initSheetSwipe(sheet);
    _renderOverlayContent(id);

    if (typeof window.hideFab === 'function') window.hideFab();
  }

  /* ---------- Close ---------- */
  function closeOverlay() {
    if (_stack.length === 0) return;
    _closeTopSheet();
    if (_stack.length === 0) {
      var container = _getContainer();
      var backdrop = _getBackdrop();
      if (container) container.classList.remove('has-overlay');
      if (backdrop) backdrop.classList.remove('visible');
      if (typeof window.showFab === 'function') window.showFab();
    }
  }

  function _closeTopSheet() {
    if (_stack.length === 0) return;
    var top = _stack.pop();
    var sheet = document.getElementById('overlay-sheet-' + top.id);
    if (sheet) {
      sheet.classList.remove('open');
      setTimeout(function() { sheet.remove(); }, 350);
    }
  }

  function closeAllOverlays() {
    while (_stack.length > 0) { _closeTopSheet(); }
    var container = _getContainer();
    var backdrop = _getBackdrop();
    if (container) container.classList.remove('has-overlay');
    if (backdrop) backdrop.classList.remove('visible');
    if (typeof window.showFab === 'function') window.showFab();
  }

  function isOverlayOpen() { return _stack.length > 0; }
  function getTopOverlayId() { return _stack.length > 0 ? _stack[_stack.length - 1].id : null; }

  /* ---------- Swipe down to close ---------- */
  function _initSheetSwipe(sheet) {
    var startY = 0;
    var body = sheet.querySelector('.overlay-body');
    sheet.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchend', function(e) {
      if (body && body.scrollTop > 5) return;
      if (e.changedTouches[0].clientY - startY > 100) closeOverlay();
    }, { passive: true });
  }

  /* ---------- Render content ---------- */
  function _renderOverlayContent(id) {
    var body = document.getElementById('overlay-body-' + id);
    if (!body) return;

    /* Phase 6+: 外部ファイルで renderOverlay_xxx が定義されていればそちらを使用 */
    var fnName = 'renderOverlay_' + id;
    if (typeof window[fnName] === 'function') { window[fnName](body); return; }

    /* 内蔵レンダラー（theme のみ残す） */
    switch (id) {
      case 'theme':    _renderThemeOverlay(body); return;
    }

    /* フォールバック: 未実装オーバーレイ */
    body.innerHTML =
      '<div class="text-c" style="padding:60px 20px">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">🚧</div>' +
        '<div class="fz-s c-muted">このセクションは準備中です</div>' +
        '<div class="fz-xs c-muted mt8">' + escHtml(id) + '</div>' +
      '</div>';
  }

  /* ==========================================================
     テーマオーバーレイ（Phase 2 完全版）
     ========================================================== */
  function _renderThemeOverlay(body) {
    var currentStyle = typeof getThemeStyle === 'function' ? getThemeStyle() : 'minimal';
    var currentColor = typeof getThemeColor === 'function' ? getThemeColor() : 'blue-light';

    var styles = [
      { id: 'minimal', name: 'ミニマル',   emoji: '✨', desc: 'Apple風・フロストガラス・大きな角丸' },
      { id: 'flat',    name: 'フラット',   emoji: '📐', desc: 'ボーダーで区切るクリーンなデザイン' },
      { id: 'soft',    name: 'ソフト',     emoji: '☁️', desc: 'ニューモーフィズム風の柔らかい立体感' },
      { id: 'cyber',   name: 'サイバー',   emoji: '🔮', desc: 'ネオン発光・シャープなSFデザイン' },
      { id: 'pop',     name: 'ポップ',     emoji: '🎈', desc: 'グラデーション・丸い形・元気で明るい' },
      { id: 'wabi',    name: '和モダン',   emoji: '🍵', desc: '余白重視・繊細な線・日本的な落ち着き' },
      { id: 'brutal',  name: 'ブルータル', emoji: '🔨', desc: '太いボーダー・大胆なフォント・インパクト' },
      { id: 'glass',   name: 'グラス',     emoji: '🪟', desc: '全面フロストガラス・透け感とブラー' },
      { id: 'classic', name: 'クラシック', emoji: '📖', desc: '伝統的なWebデザイン・読みやすさ重視' },
      { id: 'compact', name: 'コンパクト', emoji: '📱', desc: '情報密度最大・一画面に多く表示' }
    ];

    var lightColors = [
      { id: 'blue-light',   name: 'ブルー',     dot: '#007aff' },
      { id: 'green-light',  name: 'グリーン',   dot: '#34c759' },
      { id: 'pink-light',   name: 'ピンク',     dot: '#ff2d55' },
      { id: 'orange-light', name: 'オレンジ',   dot: '#ff9500' },
      { id: 'purple-light', name: 'パープル',   dot: '#af52de' },
      { id: 'teal-light',   name: 'ティール',   dot: '#00c7be' },
      { id: 'red-light',    name: 'レッド',     dot: '#ff3b30' },
      { id: 'gold-light',   name: 'ゴールド',   dot: '#c8a04a' },
      { id: 'sakura-light', name: 'サクラ',     dot: '#d4627b' },
      { id: 'matcha-light', name: '抹茶',       dot: '#5a8c51' },
      { id: 'ai-light',     name: '藍',         dot: '#3a5f8a' },
      { id: 'shu-light',    name: '朱',         dot: '#c8503c' }
    ];

    var darkColors = [
      { id: 'blue-dark',    name: 'ダークブルー',   dot: '#0a84ff' },
      { id: 'green-dark',   name: 'ダークグリーン', dot: '#30d158' },
      { id: 'pink-dark',    name: 'ダークピンク',   dot: '#ff375f' },
      { id: 'orange-dark',  name: 'ダークオレンジ', dot: '#ff9f0a' },
      { id: 'purple-dark',  name: 'ダークパープル', dot: '#bf5af2' },
      { id: 'midnight',     name: 'ミッドナイト',   dot: '#5e5ce6' },
      { id: 'sumi-dark',    name: '墨',             dot: '#c8a86c' },
      { id: 'charcoal',     name: 'チャコール',     dot: '#8e8e93' }
    ];

    var html = '';

    /* ===== デザインスタイル ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 デザインスタイル</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    styles.forEach(function(s) {
      var isA = s.id === currentStyle;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:14px 8px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeStyle(\'' + s.id + '\');_refreshThemeOverlay()">';
      html += '<span style="font-size:1.5rem">' + s.emoji + '</span>';
      html += '<span style="font-size:.8125rem;font-weight:' + (isA ? '700' : '500') + '">' + escHtml(s.name) + '</span>';
      html += '<span style="font-size:.6rem;color:var(--c-tx-muted);line-height:1.3;text-align:center">' + escHtml(s.desc) + '</span>';
      html += '</button>';
    });
    html += '</div></div></div>';

    /* ===== カラーパレット ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 カラーパレット</div>';

    /* ライト */
    html += '<div class="fz-xs fw6 c-secondary mb8">☀️ ライト（12色）</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">';
    lightColors.forEach(function(c) {
      var isA = c.id === currentColor;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:10px 4px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()">';
      html += '<span style="display:block;width:28px;height:28px;border-radius:50%;background:' + c.dot + ';';
      html += 'border:3px solid ' + (isA ? '#fff' : 'rgba(0,0,0,.08)') + ';';
      html += 'box-shadow:' + (isA ? '0 0 0 2px var(--c-primary)' : 'none') + '"></span>';
      html += '<span style="font-size:.625rem;font-weight:' + (isA ? '700' : '400') + ';white-space:nowrap">' + escHtml(c.name) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    /* ダーク */
    html += '<div class="fz-xs fw6 c-secondary mb8">🌙 ダーク（8色）</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px">';
    darkColors.forEach(function(c) {
      var isA = c.id === currentColor;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:10px 4px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()">';
      html += '<span style="display:block;width:28px;height:28px;border-radius:50%;background:' + c.dot + ';';
      html += 'border:3px solid rgba(255,255,255,' + (isA ? '.9' : '.15') + ');';
      html += 'box-shadow:' + (isA ? '0 0 0 2px var(--c-primary)' : 'none') + '"></span>';
      html += '<span style="font-size:.625rem;font-weight:' + (isA ? '700' : '400') + ';white-space:nowrap">' + escHtml(c.name) + '</span>';
      html += '</button>';
    });
    html += '</div></div></div>';

    /* ===== 現在のテーマ ===== */
    html += '<div class="card mb12"><div class="card-body text-c">';
    html += '<div class="fz-xs c-muted">現在のテーマ</div>';
    var activeStyleName = currentStyle;
    styles.forEach(function(s) { if (s.id === currentStyle) activeStyleName = s.emoji + ' ' + s.name; });
    var activeColorName = currentColor;
    lightColors.concat(darkColors).forEach(function(c) { if (c.id === currentColor) activeColorName = c.name; });
    html += '<div class="fz-m fw7 mt4" style="color:var(--c-primary)">' + escHtml(activeStyleName) + ' × ' + escHtml(activeColorName) + '</div>';
    html += '<div class="fz-xs c-muted mt8">10スタイル × 20カラー = 200通りの組み合わせ</div>';
    html += '</div></div>';

    body.innerHTML = html;
  }

  window._refreshThemeOverlay = function() {
    var body = document.getElementById('overlay-body-theme');
    if (body) _renderThemeOverlay(body);
  };

  /* ---------- Expose ---------- */
  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
  window.closeAllOverlays = closeAllOverlays;
  window.isOverlayOpen = isOverlayOpen;
  window.getTopOverlayId = getTopOverlayId;

})();
