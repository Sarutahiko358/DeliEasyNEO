/* ==========================================================
   DeliEasy v2 — js/app.js
   アプリ初期化・テーマ管理・グローバル制御
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
    /* 旧 data-theme 属性を削除（main.css の [data-theme="dark"] と競合防止） */
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
  window.curPage = -1;

  /* refreshHome — delegates to home.js renderHome if available */
  window.refreshHome = function() {
    if (typeof renderHome === 'function') renderHome();
  };
  /* renderHomeWidgets is also used by home.js as an alias */
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

    /* PF選択のデフォルト値設定 */
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
          /* カレンダーやstatsが開いていれば再描画 */
          var topId = typeof getTopOverlayId === 'function' ? getTopOverlayId() : null;
          if (topId === 'calendar' && typeof renderCalendar === 'function') renderCalendar();
          if (topId === 'stats' && typeof renderStats === 'function') renderStats();
        });
      }
    };
  }

  /* openEditEarn / openEditExpense グローバル関数 */
  window.openEditEarn = function(ts) {
    _openEarnEditDialog(ts);
  };

  /* expense.js の openEditExpense を退避（expense.js は app.js より前にロードされる） */
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

        /* ホーム画面を先に表示（Firebase不要） */
        if (typeof renderHome === 'function') renderHome();
        if (typeof renderFab === 'function') renderFab();
        if (typeof initSidebarGestures === 'function') initSidebarGestures();
        if (typeof renderTopbar === 'function') renderTopbar();
        if (typeof renderBottombar === 'function') renderBottombar();
        if (typeof initRightPanelGestures === 'function') initRightPanelGestures();
        if (typeof startTopbarUpdater === 'function') startTopbarUpdater();

        /* デスクトップ対応初期化 — モバイル修正のため一旦無効化 */
        // if (typeof _initDesktopSidebar === 'function') _initDesktopSidebar();
        // if (typeof _applyDesktopRightPanel === 'function') _applyDesktopRightPanel();

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
          /* 既に読み込み済み */
          initFirebase();
        } else {
          /* まだ読み込み中 → コールバック登録 */
          window._onFirebaseSDKReady = function() {
            console.log('[App] Firebase SDK ready, initializing auth...');
            initFirebase();
          };
          /* 10秒でタイムアウト（オフライン対策） */
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

    /* Escape key handler for closing overlays/sidebars/panels/FAB */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        /* Priority order: confirm dialog > FAB menu > overlay > right panel > sidebar */

        /* 1. Confirm dialog */
        var confirmOverlay = document.querySelector('.confirm-overlay');
        if (confirmOverlay) {
          var cancelBtn = confirmOverlay.querySelector('#v2-cc-no') ||
                          confirmOverlay.querySelector('#v2-cp-cancel') ||
                          confirmOverlay.querySelector('[id$="-cancel"]');
          if (cancelBtn) cancelBtn.click();
          else confirmOverlay.remove();
          return;
        }

        /* 2. FAB menu */
        if (typeof isFabOpen === 'function' && isFabOpen()) {
          closeFabMenu();
          return;
        }

        /* 3. Overlay */
        if (typeof isOverlayOpen === 'function' && isOverlayOpen()) {
          closeOverlay();
          return;
        }

        /* 4. Right panel */
        if (typeof isRightPanelOpen === 'function' && isRightPanelOpen()) {
          closeRightPanel();
          return;
        }

        /* 5. Sidebar */
        if (typeof isSidebarOpen === 'function' && isSidebarOpen()) {
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
        if (typeof isSidebarOpen === 'function' && isSidebarOpen()) { closeSidebar(); return; }
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

  /* ---------- デスクトップ↔モバイル切替時のプリセット再適用 ---------- */
  var _lastIsDesktop = window.innerWidth >= 1024;
  window.addEventListener('resize', function() {
    var nowDesktop = window.innerWidth >= 1024;
    if (nowDesktop !== _lastIsDesktop) {
      _lastIsDesktop = nowDesktop;
      if (typeof renderHome === 'function') renderHome();
      if (typeof renderTopbar === 'function') renderTopbar();
      if (typeof renderBottombar === 'function') renderBottombar();
      if (typeof renderFab === 'function') renderFab();
    }
  });

  document.addEventListener('DOMContentLoaded', initApp);

})();
