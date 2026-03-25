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
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var isDark = (color || '').indexOf('dark') >= 0;
      meta.content = isDark ? '#000000' : '#f2f2f7';
    }
  }

  function getThemeStyle() { return S.g('style', DEFAULT_STYLE); }
  function getThemeColor() { return S.g('color', DEFAULT_COLOR); }

  function setThemeStyle(style) {
    S.s('style', style);
    applyTheme(style, getThemeColor());
  }
  function setThemeColor(color) {
    S.s('color', color);
    applyTheme(getThemeStyle(), color);
  }

  /* ---------- Compatibility shims ---------- */
  window.refreshSettingsModalIfOpen = function() {
    if (typeof getTopOverlayId === 'function' && getTopOverlayId() === 'settings') {
      if (typeof window._refreshSettingsOverlay === 'function') {
        window._refreshSettingsOverlay();
      }
    }
    updateSyncIndicator();
  };

  window.openStatDetail = window.openStatDetail || function() {};
  window.openEditEarn = window.openEditEarn || function(ts) {
    toast('売上編集は次のバージョンで実装予定です');
  };
  window.openEditExpense = window.openEditExpense || function(ts) {
    toast('経費編集は次のバージョンで実装予定です');
  };
  window.curPage = -1;

  /* refreshHome — delegates to home.js renderHome if available */
  window.refreshHome = function() {
    if (typeof renderHome === 'function') renderHome();
  };
  /* renderHomeWidgets is also used by home.js as an alias */
  window.renderHomeWidgets = function() {
    if (typeof renderHome === 'function') renderHome();
  };

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
    applyTheme(getThemeStyle(), getThemeColor());

    if (typeof initEarnsDB === 'function') {
      initEarnsDB().then(function() {
        if (typeof initFirebaseAuth === 'function') initFirebaseAuth();

        /* Render home (via home.js) */
        if (typeof renderHome === 'function') renderHome();

        if (typeof renderFab === 'function') renderFab();
        if (typeof initSidebarGestures === 'function') initSidebarGestures();

        updateSyncIndicator();
        if (typeof onFirebaseSyncStatusChange === 'function') {
          onFirebaseSyncStatusChange(function() { updateSyncIndicator(); });
        }
        if (typeof maybeWarnStoragePressure === 'function') maybeWarnStoragePressure();

      }).catch(function(e) {
        console.warn('[App] Init error:', e);
        if (typeof renderHome === 'function') renderHome();
        if (typeof renderFab === 'function') renderFab();
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(function(reg) {
        console.log('SW:', reg.scope);
      }).catch(function(e) {
        console.warn('SW fail:', e);
      });
    }

    _initExitGuard();

    var fabBd = document.getElementById('fab-backdrop');
    if (fabBd) {
      fabBd.addEventListener('click', function() {
        if (typeof closeFabMenu === 'function') closeFabMenu();
      });
    }
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
        if (typeof isOverlayOpen === 'function' && isOverlayOpen()) { closeOverlay(); return; }
        if (typeof isSidebarOpen === 'function' && isSidebarOpen()) { closeSidebar(); return; }
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
  window.updateSyncIndicator = updateSyncIndicator;

  document.addEventListener('DOMContentLoaded', initApp);

})();
