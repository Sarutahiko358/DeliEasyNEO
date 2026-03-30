/* ==========================================================
   DeliEasy v2 — js/app.js
   アプリ初期化・テーマ管理・グローバル制御（デスクトップ対応修正版）
   ========================================================== */
(function(){
  'use strict';

  /* ---------- Theme Management ---------- */
  var DEFAULT_STYLE = 'minimal';
  var DEFAULT_COLOR = 'blue-light';

  var DARK_PALETTES = [
    'blue-dark','green-dark','pink-dark','orange-dark',
    'purple-dark','midnight','sumi-dark','charcoal'
  ];

  function isDarkPalette(color) {
    return DARK_PALETTES.indexOf(color) >= 0;
  }

  function applyTheme(style, color) {
    var s = style || DEFAULT_STYLE;
    var c = color || DEFAULT_COLOR;
    document.documentElement.setAttribute('data-style', s);
    document.documentElement.setAttribute('data-color', c);
    document.documentElement.removeAttribute('data-theme');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = isDarkPalette(c) ? '#000000' : '#f2f2f7';
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

  /* ---------- ビューポート高さ即時設定（非PWA対策）---------- */
  /* initApp() を待たず script 読み込み時点で即座に実行。
     CSSが --app-height を参照する前に値を確定させる。 */
  function _updateViewportHeight() {
    var vh = window.innerHeight;
    document.documentElement.style.setProperty('--app-height', vh + 'px');
    document.documentElement.style.setProperty('--real-vh', (vh * 0.01) + 'px');
  }
  _updateViewportHeight();
  window.addEventListener('resize', _updateViewportHeight);
  window.addEventListener('orientationchange', function() {
    setTimeout(_updateViewportHeight, 100);
  });

  /* ---------- PWAモード即時検出 ---------- */
  var _isPWA = window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
  document.documentElement.setAttribute('data-display-mode', _isPWA ? 'standalone' : 'browser');

  /* ---------- デスクトップ判定 ---------- */
  function _isDesktop() {
    return window.innerWidth >= 1024;
  }

  /* ---------- デスクトップサイドバー初期化 ---------- */
  function _initDesktopSidebar() {
    if (!_isDesktop()) return;
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    /* デスクトップでは常時表示（CSSで制御） */
    if (typeof renderSidebar === 'function') renderSidebar();

    /* サイドバーを開いた状態にする（CSSのtransformが上書きされるため） */
    sidebar.classList.add('open');
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

  window.openStatDetail = window.openStatDetail || function(type, context, dateStr) {
    /* stats.js が遅延ロード前の場合のshim:
       パラメータをwindowに保存し、statsオーバーレイを開く。
       stats.js ロード後にこの関数は上書きされる */
    if (context === 'today' || context === 'calDay') window._dashPeriod = 'day';
    else if (context === 'week') window._dashPeriod = 'week';
    else if (context === 'month' || context === 'calMonth') window._dashPeriod = 'month';
    else window._dashPeriod = 'month';
    window._dashDateStr = dateStr || null;
    window._dashSection = 'overview';
    if (type === 'expense') window._dashSection = 'expense';
    else if (type === 'pf' || type === 'count' || type === 'unit') window._dashSection = 'pf';
    else if (type === 'records') window._dashSection = 'records';
    if (typeof openOverlay === 'function') openOverlay('stats');
  };
  window.curPage = -1;

  window.refreshHome = function() {
    if (typeof renderHome === 'function') renderHome();
  };
  window.renderHomeWidgets = function() {
    if (typeof renderHome === 'function') renderHome();
  };

  /* ---------- 売上編集ダイアログ ---------- */
  function _openEarnEditDialog(ts) {
    var earns = typeof getE === 'function' ? getE() : [];
    var rec = null;
    for (var i = 0; i < earns.length; i++) {
      if (earns[i].ts === ts) { rec = earns[i]; break; }
    }
    if (!rec) { toast('データが見つかりません'); return; }

    var pf = typeof extractPf === 'function' ? extractPf(rec.m) : '';
    var memo = rec.m ? rec.m.replace(/^\/[^\s(]+\s*/, '') : '';

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:340px;text-align:left">' +
        '<h3 style="margin-bottom:12px;text-align:center">売上を編集</h3>' +
        '<div class="input-group"><label class="input-label">日付</label>' +
          '<input type="date" class="input" id="edit-earn-date" value="' + escHtml(rec.d) + '"></div>' +
        '<div class="input-group"><label class="input-label">金額</label>' +
          '<input type="number" class="input" id="edit-earn-amount" value="' + (rec.a || 0) + '"></div>' +
        '<div class="input-group"><label class="input-label">件数</label>' +
          '<input type="number" class="input" id="edit-earn-count" value="' + (rec.c || 1) + '" min="1"></div>' +
        '<div class="input-group"><label class="input-label">PF</label>' +
          '<select class="input" id="edit-earn-pf"><option value="">指定なし</option>' + pfOpts() + '</select></div>' +
        '<div class="input-group"><label class="input-label">メモ</label>' +
          '<input type="text" class="input" id="edit-earn-memo" value="' + escHtml(memo) + '"></div>' +
        '<div class="flex justify-center gap8 mt12">' +
          '<button class="btn btn-primary btn-sm" id="edit-earn-save">保存</button>' +
          '<button class="btn btn-secondary btn-sm" id="edit-earn-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });

    var pfSelect = document.getElementById('edit-earn-pf');
    if (pfSelect && pf) {
      for (var j = 0; j < pfSelect.options.length; j++) {
        if (pfSelect.options[j].value === pf) {
          pfSelect.selectedIndex = j;
          break;
        }
      }
    }

    document.getElementById('edit-earn-cancel').onclick = function() { div.remove(); };
    document.getElementById('edit-earn-save').onclick = function() {
      var newDate = document.getElementById('edit-earn-date').value;
      var newAmount = Number(document.getElementById('edit-earn-amount').value);
      var newCount = Number(document.getElementById('edit-earn-count').value) || 1;
      var newPf = document.getElementById('edit-earn-pf').value;
      var newMemo = document.getElementById('edit-earn-memo').value;

      if (!newAmount || newAmount <= 0) { toast('金額を入力してください'); return; }

      var memoStr = newPf ? '/' + newPf : '';
      if (newMemo) memoStr += (memoStr ? ' ' : '') + newMemo;

      if (typeof updateE === 'function') {
        updateE(ts, { d: newDate, a: newAmount, c: newCount, m: memoStr }).then(function() {
          toast('✅ 更新しました');
          div.remove();
          if (typeof refreshHome === 'function') refreshHome();
          var topId = typeof getTopOverlayId === 'function' ? getTopOverlayId() : null;
          if (topId === 'calendar' && typeof renderCalendar === 'function') renderCalendar();
          if (topId === 'stats' && typeof renderStats === 'function') renderStats();
        }).catch(function(e) { console.error('[App] updateE fail:', e); toast('⚠️ 更新に失敗しました'); });
      }
    };
  }

  window.openEditEarn = function(ts) {
    _openEarnEditDialog(ts);
  };

  var _expenseEditFn = window.openEditExpense;
  window.openEditExpense = function(ts) {
    if (typeof _expenseEditFn === 'function') {
      _expenseEditFn(ts);
    } else {
      toast('経費編集はデータを読み込んでからお試しください');
    }
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
        if (typeof initExpensesDB === 'function') {
          return initExpensesDB();
        }
      }).then(function() {

        if (typeof renderHome === 'function') renderHome();
        if (typeof renderFab === 'function') renderFab();
        if (typeof initSidebarGestures === 'function') initSidebarGestures();
        if (typeof renderTopbar === 'function') renderTopbar();
        if (typeof renderBottombar === 'function') renderBottombar();
        if (typeof initRightPanelGestures === 'function') initRightPanelGestures();
        if (typeof startTopbarUpdater === 'function') startTopbarUpdater();

        /* デスクトップ対応初期化（有効化） */
        _initDesktopSidebar();
        if (typeof _applyDesktopRightPanel === 'function') _applyDesktopRightPanel();

        /* オンボーディング（初回ガイド）の表示チェック */
        if (typeof checkAndShowOnboarding === 'function') {
          setTimeout(function() { checkAndShowOnboarding(); }, 800);
        }

        /* Firebase SDK の読み込み完了を待ってから同期を初期化 */
        function initFirebase() {
          if (typeof initFirebaseAuth === 'function') initFirebaseAuth();
          updateSyncIndicator();
          if (typeof onFirebaseSyncStatusChange === 'function') {
            onFirebaseSyncStatusChange(function() {
              updateSyncIndicator();
              if (typeof window._refreshSettingsOverlay === 'function') {
                window._refreshSettingsOverlay();
              }
            });
          }
        }

        if (window._firebaseSDKReady) {
          initFirebase();
        } else {
          window._onFirebaseSDKReady = function() {
            console.log('[App] Firebase SDK ready, initializing auth...');
            initFirebase();
          };
          setTimeout(function() {
            if (!window._firebaseSDKReady) {
              console.warn('[App] Firebase SDK load timeout, skipping sync init');
              updateSyncIndicator();
            }
          }, 10000);
        }

        if (typeof maybeWarnStoragePressure === 'function') maybeWarnStoragePressure();

      }).catch(function(e) {
        console.warn('[App] Init error:', e);
        if (typeof renderHome === 'function') renderHome();
        if (typeof renderFab === 'function') renderFab();
        if (typeof renderTopbar === 'function') renderTopbar();
        if (typeof renderBottombar === 'function') renderBottombar();
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

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var confirmOverlay = document.querySelector('.confirm-overlay');
        if (confirmOverlay) {
          var cancelBtn = confirmOverlay.querySelector('#v2-cc-no') ||
                          confirmOverlay.querySelector('#v2-cp-cancel') ||
                          confirmOverlay.querySelector('[id$="-cancel"]');
          if (cancelBtn) cancelBtn.click();
          else confirmOverlay.remove();
          return;
        }
        if (typeof isFabOpen === 'function' && isFabOpen()) {
          closeFabMenu();
          return;
        }
        if (typeof isOverlayOpen === 'function' && isOverlayOpen()) {
          closeOverlay();
          return;
        }
        if (typeof isRightPanelOpen === 'function' && isRightPanelOpen()) {
          closeRightPanel();
          return;
        }
        /* デスクトップではサイドバーはEscapeで閉じない（常時表示のため） */
        if (!_isDesktop() && typeof isSidebarOpen === 'function' && isSidebarOpen()) {
          closeSidebar();
          return;
        }
      }
    });

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
        if (!_isDesktop() && typeof isSidebarOpen === 'function' && isSidebarOpen()) { closeSidebar(); return; }
        if (typeof isRightPanelOpen === 'function' && isRightPanelOpen()) { closeRightPanel(); return; }
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
  window.isDarkPalette = isDarkPalette;
  window.updateSyncIndicator = updateSyncIndicator;
  window._isDesktop = _isDesktop;
  window._initDesktopSidebar = _initDesktopSidebar;

  /* ---------- デスクトップ↔モバイル切替時の再適用 ---------- */
  var _lastIsDesktop = window.innerWidth >= 1024;
  window.addEventListener('resize', function() {
    var nowDesktop = window.innerWidth >= 1024;
    if (nowDesktop !== _lastIsDesktop) {
      _lastIsDesktop = nowDesktop;
      if (nowDesktop) {
        _initDesktopSidebar();
        if (typeof _applyDesktopRightPanel === 'function') _applyDesktopRightPanel();
      } else {
        /* モバイルに戻った時、サイドバーを閉じる */
        var sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      }
      if (typeof renderHome === 'function') renderHome();
      if (typeof renderTopbar === 'function') renderTopbar();
      if (typeof renderBottombar === 'function') renderBottombar();
      if (typeof renderFab === 'function') renderFab();
    }

    /* FAB位置クランプ（ビューポート外にはみ出していたら補正） */
    var fabCfg = typeof getFabConfig === 'function' ? getFabConfig() : null;
    if (fabCfg && fabCfg.posX !== null && fabCfg.posX !== undefined) {
      var vw = window.innerWidth;
      var vh = window.innerHeight; /* innerHeight はブラウザUIを除いた高さ */
      var fabSize = 56;
      var fabChanged = false;

      if (fabCfg.posX + fabSize > vw) { fabCfg.posX = vw - fabSize - 8; fabChanged = true; }
      if (fabCfg.posX < 0) { fabCfg.posX = 8; fabChanged = true; }
      if (fabCfg.posY + fabSize > vh) { fabCfg.posY = vh - fabSize - 8; fabChanged = true; }
      if (fabCfg.posY < 0) { fabCfg.posY = 8; fabChanged = true; }

      if (fabChanged) {
        if (typeof saveFabConfig === 'function') saveFabConfig(fabCfg);
        if (typeof renderFab === 'function') renderFab();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', initApp);

})();
