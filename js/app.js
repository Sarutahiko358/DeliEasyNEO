/* ==========================================================
   DeliEasy v2 — js/app.js
   アプリ初期化・テーマ管理・グローバル制御
   ========================================================== */
(function(){
  'use strict';

  /* ---------- Theme Management ---------- */
  var DEFAULT_STYLE = 'minimal';
  var DEFAULT_COLOR = 'blue-light';

  function applyTheme(style, color) {
    document.documentElement.setAttribute('data-style', style || DEFAULT_STYLE);
    document.documentElement.setAttribute('data-color', color || DEFAULT_COLOR);

    /* Update meta theme-color for mobile browser chrome */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var isDark = (color || '').indexOf('dark') >= 0;
      meta.content = isDark ? '#000000' : '#f2f2f7';
    }
  }

  function getThemeStyle() {
    return S.g('style', DEFAULT_STYLE);
  }

  function getThemeColor() {
    return S.g('color', DEFAULT_COLOR);
  }

  function setThemeStyle(style) {
    S.s('style', style);
    applyTheme(style, getThemeColor());
  }

  function setThemeColor(color) {
    S.s('color', color);
    applyTheme(getThemeStyle(), color);
  }

  /* ---------- Compatibility shims ---------- */
  /* firebase-sync.js calls refreshSettingsModalIfOpen */
  window.refreshSettingsModalIfOpen = function() {
    /* If settings overlay is open, refresh it */
    if (typeof getTopOverlayId === 'function' && getTopOverlayId() === 'settings') {
      if (typeof window._refreshSettingsOverlay === 'function') {
        window._refreshSettingsOverlay();
      }
    }
    /* Also update sync indicator */
    updateSyncIndicator();
  };

  /* Stats.js and other old modules reference functions */
  window.openStatDetail = window.openStatDetail || function() {};
  window.openEditEarn = window.openEditEarn || function(ts) {
    /* Phase 5-6 で実装 */
    toast('売上編集は次のバージョンで実装予定です');
  };
  window.openEditExpense = window.openEditExpense || function(ts) {
    /* Phase 6 で実装 */
    toast('経費編集は次のバージョンで実装予定です');
  };

  /* curPage — old nav system compat. Set to -1 (no page) */
  window.curPage = -1;

  /* refreshHome — used by addE callback */
  window.refreshHome = function() {
    renderHomeWidgets();
  };

  /* ---------- Home widget rendering (placeholder) ---------- */
  function renderHomeWidgets() {
    var main = document.getElementById('main-content');
    if (!main) return;

    /* For Phase 1, render a simple placeholder dashboard */
    var html = '';

    /* Clock */
    html += '<div class="card mb12"><div class="card-body text-c">';
    html += '<div id="v2-clock" style="font-size:2.2rem;font-weight:700;font-variant-numeric:tabular-nums"></div>';
    html += '<div id="v2-clock-date" class="fz-s c-secondary"></div>';
    html += '</div></div>';

    /* Today summary */
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
    var avg = cnt ? Math.round(tot / cnt) : 0;

    var allExps = typeof S !== 'undefined' ? S.g('exps', []) : [];
    var todayExps = allExps.filter(function(e) { return e.date === TD; });
    var todayExpTot = todayExps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);
    var profit = tot - todayExpTot;

    html += '<div class="stat-grid stat-grid-2 mb12">';
    html += '<div class="stat-box accent-primary"><div class="stat-box-label">今日の売上</div><div class="stat-box-value">¥' + fmt(tot) + '</div></div>';
    html += '<div class="stat-box accent-info"><div class="stat-box-label">件数</div><div class="stat-box-value">' + cnt + '件</div></div>';
    html += '</div>';

    html += '<div class="stat-grid stat-grid-2 mb12">';
    html += '<div class="stat-box"><div class="stat-box-label">平均単価</div><div class="stat-box-value">¥' + fmt(avg) + '</div></div>';
    html += '<div class="stat-box ' + (profit >= 0 ? 'accent-success' : 'accent-danger') + '"><div class="stat-box-label">利益</div><div class="stat-box-value">¥' + fmt(profit) + '</div></div>';
    html += '</div>';

    /* Week summary */
    if (typeof wkData === 'function') {
      var wk = wkData();
      html += '<div class="card mb12"><div class="card-body">';
      html += '<div class="fz-s fw6 mb8">📅 今週</div>';
      html += '<div class="stat-grid stat-grid-3">';
      html += '<div class="stat-box"><div class="stat-box-label">売上</div><div class="stat-box-value" style="font-size:1rem">¥' + fmt(wk.tot) + '</div></div>';
      html += '<div class="stat-box"><div class="stat-box-label">件数</div><div class="stat-box-value" style="font-size:1rem">' + wk.cnt + '件</div></div>';
      html += '<div class="stat-box"><div class="stat-box-label">稼働日</div><div class="stat-box-value" style="font-size:1rem">' + wk.days + '日</div></div>';
      html += '</div>';
      html += '</div></div>';
    }

    /* Month summary */
    if (typeof moTot === 'function') {
      var mTot = moTot();
      var mCnt = typeof moCnt === 'function' ? moCnt() : 0;
      html += '<div class="card mb12"><div class="card-body">';
      html += '<div class="fz-s fw6 mb8">📆 今月</div>';
      html += '<div class="stat-grid stat-grid-2">';
      html += '<div class="stat-box accent-primary"><div class="stat-box-label">売上</div><div class="stat-box-value" style="font-size:1.1rem">¥' + fmt(mTot) + '</div></div>';
      html += '<div class="stat-box"><div class="stat-box-label">件数</div><div class="stat-box-value" style="font-size:1.1rem">' + mCnt + '件</div></div>';
      html += '</div>';
      html += '</div></div>';
    }

    /* Theme quick info */
    var curStyle = getThemeStyle();
    var curColor = getThemeColor();
    html += '<div class="text-c fz-xs c-muted mt16 mb8">';
    html += 'テーマ: ' + escHtml(curStyle) + ' × ' + escHtml(curColor);
    html += '</div>';

    main.innerHTML = html;

    /* Start clock */
    _startClock();
  }

  /* ---------- Clock ---------- */
  var _clockTimer = null;
  function _startClock() {
    if (_clockTimer) clearInterval(_clockTimer);
    function tick() {
      var n = new Date();
      var el = document.getElementById('v2-clock');
      var del = document.getElementById('v2-clock-date');
      if (el) el.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + ':' + String(n.getSeconds()).padStart(2, '0');
      if (del) del.textContent = n.getFullYear() + '年' + (n.getMonth() + 1) + '月' + n.getDate() + '日（' + DAYS[n.getDay()] + '）';
    }
    tick();
    _clockTimer = setInterval(tick, 1000);
  }

  /* ---------- Sync status indicator ---------- */
  function updateSyncIndicator() {
    var el = document.getElementById('sync-status-indicator');
    if (!el) return;
    el.innerHTML = '<span class="sync-icon">☁️</span>';
    var status = typeof firebaseGetSyncStatus === 'function' ? firebaseGetSyncStatus() : 'idle';
    var user = typeof firebaseIsSignedIn === 'function' && firebaseIsSignedIn();
    el.classList.remove('sync-off', 'sync-idle', 'sync-ok', 'sync-ing', 'sync-err');
    if (!user) el.classList.add('sync-off');
    else if (status === 'syncing') el.classList.add('sync-ing');
    else if (status === 'synced') {
      el.classList.add('sync-ok');
      setTimeout(function() {
        if (el.classList.contains('sync-ok')) {
          el.classList.remove('sync-ok');
          el.classList.add('sync-idle');
        }
      }, 3000);
    }
    else if (status === 'error') el.classList.add('sync-err');
    else if (status === 'offline') el.classList.add('sync-off');
    else el.classList.add('sync-idle');
  }

  /* ---------- Init ---------- */
  function initApp() {
    /* Apply saved theme */
    applyTheme(getThemeStyle(), getThemeColor());

    /* Init earns DB */
    if (typeof initEarnsDB === 'function') {
      initEarnsDB().then(function() {
        /* Init Firebase auth */
        if (typeof initFirebaseAuth === 'function') initFirebaseAuth();

        /* Render home */
        renderHomeWidgets();

        /* Render FAB */
        if (typeof renderFab === 'function') renderFab();

        /* Init sidebar gestures */
        if (typeof initSidebarGestures === 'function') initSidebarGestures();

        /* Update sync indicator */
        updateSyncIndicator();
        if (typeof onFirebaseSyncStatusChange === 'function') {
          onFirebaseSyncStatusChange(function() { updateSyncIndicator(); });
        }

        /* Storage pressure warning */
        if (typeof maybeWarnStoragePressure === 'function') maybeWarnStoragePressure();

      }).catch(function(e) {
        console.warn('[App] Init error:', e);
        renderHomeWidgets();
        if (typeof renderFab === 'function') renderFab();
      });
    }

    /* Service Worker */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('SW:', reg.scope);
      }).catch(function(e) {
        console.warn('SW fail:', e);
      });
    }

    /* Exit guard */
    _initExitGuard();

    /* FAB backdrop click */
    var fabBd = document.getElementById('fab-backdrop');
    if (fabBd) {
      fabBd.addEventListener('click', function() {
        if (typeof closeFabMenu === 'function') closeFabMenu();
      });
    }

    /* Overlay backdrop click */
    var ovBd = document.getElementById('overlay-backdrop');
    if (ovBd) {
      ovBd.addEventListener('click', function() {
        if (typeof closeOverlay === 'function') closeOverlay();
      });
    }
  }

  /* ---------- Exit guard ---------- */
  var _exitGuardActive = false;
  function _initExitGuard() {
    window.addEventListener('beforeunload', function(e) { e.preventDefault(); e.returnValue = ''; });
    function activate() {
      if (_exitGuardActive) return;
      _exitGuardActive = true;
      history.pushState(null, '', location.href);
    }
    window.addEventListener('popstate', function() {
      if (_exitGuardActive) {
        history.pushState(null, '', location.href);
        if (typeof isOverlayOpen === 'function' && isOverlayOpen()) {
          closeOverlay();
          return;
        }
        if (typeof isSidebarOpen === 'function' && isSidebarOpen()) {
          closeSidebar();
          return;
        }
        _showExitConfirm();
      }
    });
    document.addEventListener('click', function() { activate(); }, { once: true });
    document.addEventListener('touchstart', function() { activate(); }, { once: true });
  }

  function _showExitConfirm() {
    if (document.querySelector('.confirm-overlay')) return;
    customConfirm('アプリを終了しますか？', function() {
      _exitGuardActive = false;
      if (!window.close()) {
        history.back();
        setTimeout(function() { location.href = 'about:blank'; }, 300);
      }
    });
  }

  /* ---------- Expose ---------- */
  window.applyTheme = applyTheme;
  window.getThemeStyle = getThemeStyle;
  window.getThemeColor = getThemeColor;
  window.setThemeStyle = setThemeStyle;
  window.setThemeColor = setThemeColor;
  window.renderHomeWidgets = renderHomeWidgets;
  window.updateSyncIndicator = updateSyncIndicator;

  /* ---------- DOM ready ---------- */
  document.addEventListener('DOMContentLoaded', initApp);

})();
