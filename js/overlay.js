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

  /* ---------- State: stack of open overlays ---------- */
  var _stack = []; /* array of { id, level } */

  /* ---------- Container refs ---------- */
  function _getContainer() { return document.getElementById('overlay-container'); }
  function _getBackdrop() { return document.getElementById('overlay-backdrop'); }

  /* ---------- Open ---------- */
  function openOverlay(id) {
    var def = OVERLAYS[id];
    if (!def) {
      console.warn('[Overlay] Unknown overlay:', id);
      return;
    }

    var container = _getContainer();
    var backdrop = _getBackdrop();
    if (!container) return;

    /* Determine level */
    var level = _stack.length + 1;
    if (level > 2) {
      /* Close first one before opening a third */
      _closeTopSheet();
      level = _stack.length + 1;
    }

    /* Create sheet */
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

    /* Animate in */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        sheet.classList.add('open');
      });
    });

    /* Push to stack */
    _stack.push({ id: id, level: level });

    /* Init swipe-down-to-close on the sheet */
    _initSheetSwipe(sheet);

    /* Render content */
    _renderOverlayContent(id);

    /* Hide FAB */
    if (typeof window.hideFab === 'function') window.hideFab();
  }

  /* ---------- Close top overlay ---------- */
  function closeOverlay() {
    if (_stack.length === 0) return;
    _closeTopSheet();
    if (_stack.length === 0) {
      var container = _getContainer();
      var backdrop = _getBackdrop();
      if (container) container.classList.remove('has-overlay');
      if (backdrop) backdrop.classList.remove('visible');
      /* Show FAB again */
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

  /* Close all overlays */
  function closeAllOverlays() {
    while (_stack.length > 0) {
      _closeTopSheet();
    }
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
      startY = e.touches[0].clientX !== undefined ? e.touches[0].clientY : 0;
    }, { passive: true });

    sheet.addEventListener('touchend', function(e) {
      /* Only close if body is scrolled to top */
      if (body && body.scrollTop > 5) return;
      var dy = e.changedTouches[0].clientY - startY;
      if (dy > 100) {
        closeOverlay();
      }
    }, { passive: true });
  }

  /* ---------- Render content ---------- */
  function _renderOverlayContent(id) {
    var body = document.getElementById('overlay-body-' + id);
    if (!body) return;

    /* Check if a dedicated render function exists */
    var fnName = 'renderOverlay_' + id;
    if (typeof window[fnName] === 'function') {
      window[fnName](body);
      return;
    }

    /* Built-in renderers */
    switch (id) {
      case 'theme':
        _renderThemeOverlay(body);
        return;
      case 'settings':
        _renderSettingsOverlay(body);
        return;
    }

    /* Fallback: empty state */
    body.innerHTML =
      '<div class="text-c" style="padding:60px 20px">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">🚧</div>' +
        '<div class="fz-s c-muted">このセクションは Phase 5-6 で実装予定です</div>' +
        '<div class="fz-xs c-muted mt8">' + escHtml(id) + '</div>' +
      '</div>';
  }

  /* ---------- Theme Overlay (Phase 1 簡易版) ---------- */
  function _renderThemeOverlay(body) {
    var currentStyle = typeof getThemeStyle === 'function' ? getThemeStyle() : 'minimal';
    var currentColor = typeof getThemeColor === 'function' ? getThemeColor() : 'blue-light';

    var styles = [
      { id: 'minimal', name: 'ミニマル', desc: 'Apple HIG準拠・フロストガラス' },
      { id: 'flat',    name: 'フラット', desc: 'ボーダーで区切るクリーンなデザイン' }
    ];

    var colors = [
      { id: 'blue-light', name: 'ブルー',   type: 'light', dot: '#007aff' },
      { id: 'blue-dark',  name: 'ダークブルー', type: 'dark', dot: '#0a84ff' }
    ];

    var html = '';

    /* Design Style */
    html += '<div class="card mb12">';
    html += '<div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 デザインスタイル</div>';
    styles.forEach(function(s) {
      var isActive = s.id === currentStyle;
      html += '<button class="' + (isActive ? 'btn btn-primary' : 'btn btn-secondary') + ' btn-block mb8" ';
      html += 'onclick="setThemeStyle(\'' + s.id + '\');_refreshThemeOverlay()" ';
      html += 'style="text-align:left;justify-content:flex-start;gap:12px">';
      html += '<span style="font-size:1.2rem">' + (isActive ? '✓' : '○') + '</span>';
      html += '<span>';
      html += '<span class="fw6">' + escHtml(s.name) + '</span>';
      html += '<br><span class="fz-xs" style="opacity:.7">' + escHtml(s.desc) + '</span>';
      html += '</span>';
      html += '</button>';
    });
    html += '</div></div>';

    /* Color Palette */
    html += '<div class="card mb12">';
    html += '<div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 カラーパレット</div>';

    /* Light */
    html += '<div class="fz-xs c-secondary mb8">☀️ ライト</div>';
    html += '<div class="flex flex-wrap gap8 mb12">';
    colors.filter(function(c) { return c.type === 'light'; }).forEach(function(c) {
      var isActive = c.id === currentColor;
      html += '<button class="' + (isActive ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm') + '" ';
      html += 'onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()" ';
      html += 'style="gap:6px">';
      html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + c.dot + ';border:2px solid ' + (isActive ? '#fff' : 'var(--c-border)') + '"></span>';
      html += escHtml(c.name);
      html += '</button>';
    });
    html += '</div>';

    /* Dark */
    html += '<div class="fz-xs c-secondary mb8">🌙 ダーク</div>';
    html += '<div class="flex flex-wrap gap8 mb12">';
    colors.filter(function(c) { return c.type === 'dark'; }).forEach(function(c) {
      var isActive = c.id === currentColor;
      html += '<button class="' + (isActive ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm') + '" ';
      html += 'onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()" ';
      html += 'style="gap:6px">';
      html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + c.dot + ';border:2px solid ' + (isActive ? '#fff' : 'rgba(255,255,255,.2)') + '"></span>';
      html += escHtml(c.name);
      html += '</button>';
    });
    html += '</div>';

    html += '</div></div>';

    /* Current info */
    html += '<div class="card mb12"><div class="card-body text-c">';
    html += '<div class="fz-xs c-muted">現在のテーマ</div>';
    html += '<div class="fz-s fw6 mt4">' + escHtml(currentStyle) + ' × ' + escHtml(currentColor) + '</div>';
    html += '<div class="fz-xs c-muted mt8">Phase 2 で10スタイル×20カラーに拡張予定</div>';
    html += '</div></div>';

    body.innerHTML = html;
  }

  /* Theme overlay refresh (called after style/color change) */
  window._refreshThemeOverlay = function() {
    var body = document.getElementById('overlay-body-theme');
    if (body) _renderThemeOverlay(body);
  };

  /* ---------- Settings Overlay (Phase 1 簡易版) ---------- */
  function _renderSettingsOverlay(body) {
    var html = '';

    /* Sync section */
    html += '<div class="card mb12">';
    html += '<div class="card-body">';
    html += '<div class="fz-s fw6 mb12">☁️ クラウド同期</div>';

    if (typeof firebaseIsSignedIn === 'function' && firebaseIsSignedIn()) {
      var name = typeof firebaseGetUserName === 'function' ? firebaseGetUserName() : '';
      var email = typeof firebaseGetUserEmail === 'function' ? firebaseGetUserEmail() : '';
      var syncInfo = typeof firebaseGetSyncInfo === 'function' ? firebaseGetSyncInfo() : {};

      html += '<div class="flex items-center gap8 mb12">';
      var photo = typeof firebaseGetUserPhoto === 'function' ? firebaseGetUserPhoto() : '';
      if (photo) {
        html += '<img src="' + escHtml(photo) + '" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--c-primary)">';
      }
      html += '<div>';
      html += '<div class="fz-s fw6">' + escHtml(name) + '</div>';
      html += '<div class="fz-xs c-muted">' + escHtml(email) + '</div>';
      html += '</div>';
      html += '</div>';

      if (syncInfo.lastSyncTs) {
        var d = new Date(syncInfo.lastSyncTs);
        html += '<div class="fz-xs c-muted mb8">最終同期: ' + d.toLocaleString('ja-JP') + '</div>';
      }

      html += '<div class="flex flex-wrap gap8">';
      html += '<button class="btn btn-primary btn-sm" onclick="firebaseManualSync()">☁️ 同期</button>';
      html += '<button class="btn btn-secondary btn-sm" onclick="firebaseManualDownload()">⬇️ ダウンロード</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="firebaseSignOut().then(function(){_refreshSettingsOverlay()})">ログアウト</button>';
      html += '</div>';
    } else {
      html += '<p class="fz-s c-muted mb12">Googleアカウントでログインすると、複数の端末でデータを同期できます。</p>';
      html += '<button class="btn btn-primary btn-block" onclick="firebaseSignInNow()">🔐 Googleでログイン</button>';
    }

    html += '</div></div>';

    /* Data section */
    html += '<div class="card mb12">';
    html += '<div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📦 データ管理</div>';

    if (typeof estimateDpStorageBytes === 'function') {
      var bytes = estimateDpStorageBytes();
      var mb = (bytes / 1024 / 1024).toFixed(2);
      html += '<div class="fz-xs c-muted mb8">ストレージ使用量: ' + mb + ' MB</div>';
    }

    html += '<div class="flex flex-wrap gap8">';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportBackupJSON===\'function\')exportBackupJSON()">💾 バックアップ</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportRecCSV===\'function\')exportRecCSV()">📊 売上CSV</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportExpCSV===\'function\')exportExpCSV()">💸 経費CSV</button>';
    html += '</div>';
    html += '</div></div>';

    /* Theme shortcut */
    html += '<div class="card mb12">';
    html += '<div class="card-body">';
    html += '<div class="fz-s fw6 mb8">🎨 テーマ</div>';
    var currentStyle = typeof getThemeStyle === 'function' ? getThemeStyle() : 'minimal';
    var currentColor = typeof getThemeColor === 'function' ? getThemeColor() : 'blue-light';
    html += '<div class="fz-xs c-muted mb8">現在: ' + escHtml(currentStyle) + ' × ' + escHtml(currentColor) + '</div>';
    html += '<button class="btn btn-secondary btn-block btn-sm" onclick="closeOverlay();setTimeout(function(){openOverlay(\'theme\')},200)">テーマを変更</button>';
    html += '</div></div>';

    /* Version info */
    html += '<div class="text-c c-muted fz-xs mt16 mb16">';
    html += 'DeliEasy v2.0 — Phase 1<br>';
    html += 'Device ID: ' + (typeof S !== 'undefined' ? escHtml(S.g('deviceId', 'N/A')) : 'N/A');
    html += '</div>';

    body.innerHTML = html;
  }

  window._refreshSettingsOverlay = function() {
    var body = document.getElementById('overlay-body-settings');
    if (body) _renderSettingsOverlay(body);
  };

  /* ---------- Expose ---------- */
  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
  window.closeAllOverlays = closeAllOverlays;
  window.isOverlayOpen = isOverlayOpen;
  window.getTopOverlayId = getTopOverlayId;

})();
