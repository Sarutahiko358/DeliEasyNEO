/* ==========================================================
   DeliEasy v2 — js/sidebar.js
   左サイドバー — 感度改善版 + 設定対応
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _touchStartX = 0;
  var _touchStartY = 0;
  var _panelTouchStartX = 0;
  var _panelTouchStartY = 0;
  var _panelTracking = false;
  var _panelTranslateX = 0;

  /* ---------- デフォルト感度設定 ---------- */
  var DEFAULT_GESTURE_CFG = {
    edgeWidth: 45,
    openThreshold: 40,
    closeThreshold: 50,
    rightEdgeWidth: 25,
    rightOpenThreshold: 60,
    rightCloseThreshold: 50
  };

  /* ---------- 感度設定の取得/保存 ---------- */
  function getGestureConfig() {
    var saved = S.g('gesture_cfg', null);
    if (saved && typeof saved === 'object') {
      /* 既存保存データにrightCloseThresholdがない場合のマイグレーション */
      if (saved.rightCloseThreshold === undefined) {
        saved.rightCloseThreshold = DEFAULT_GESTURE_CFG.rightCloseThreshold;
      }
      return saved;
    }
    return JSON.parse(JSON.stringify(DEFAULT_GESTURE_CFG));
  }

  function saveGestureConfig(cfg) {
    S.s('gesture_cfg', cfg);
  }

  function _gc(key) {
    var cfg = getGestureConfig();
    return cfg[key] !== undefined ? cfg[key] : DEFAULT_GESTURE_CFG[key];
  }

  /* ---------- Menu definition ---------- */
  var MENU = [
    { type: 'divider' },
    { id: 'earn-input',    icon: '✏️', label: '売上入力',     overlay: 'earnInput' },
    { id: 'expense-input', icon: '💸', label: '経費入力',     overlay: 'expenseInput' },
    { type: 'divider' },
    { id: 'calendar',      icon: '📅', label: 'カレンダー',   overlay: 'calendar' },
    { id: 'stats',         icon: '📊', label: '統計',         overlay: 'stats' },
    { id: 'tax',           icon: '🧾', label: '税金',         overlay: 'tax' },
    { id: 'expense-mgmt',  icon: '💰', label: '経費管理',     overlay: 'expenseManage' },
    { type: 'divider' },
    { id: 'pf-manage',     icon: '📦', label: 'PF・カテゴリ', overlay: 'pfManage' },
    { id: 'theme',         icon: '🎨', label: 'テーマ',       overlay: 'theme' },
    { id: 'home-edit',     icon: '🏠', label: 'ホーム編集',   action: 'enterEditMode' },
    { id: 'settings',      icon: '⚙️', label: '設定',         overlay: 'settings' },
    { id: 'help',          icon: '❓', label: 'ヘルプ',       overlay: 'help' }
  ];

  /* ---------- Render ---------- */
  function renderSidebar() {
    var panel = document.getElementById('sidebar');
    if (!panel) return;

    var html = '';

    /* User info */
    html += '<div class="sidebar-user">';
    if (typeof firebaseIsSignedIn === 'function' && firebaseIsSignedIn()) {
      var photo = typeof firebaseGetUserPhoto === 'function' ? firebaseGetUserPhoto() : '';
      var name = typeof firebaseGetUserName === 'function' ? firebaseGetUserName() : '';
      var email = typeof firebaseGetUserEmail === 'function' ? firebaseGetUserEmail() : '';
      if (photo) {
        html += '<img class="sidebar-user-avatar" src="' + escHtml(photo) + '" alt="">';
      }
      html += '<div class="sidebar-user-name">' + escHtml(name) + '</div>';
      html += '<div class="sidebar-user-email">' + escHtml(email) + '</div>';
    } else {
      html += '<div class="sidebar-user-login">☁️ 同期するにはログイン</div>';
    }
    html += '</div>';

    /* Menu items */
    html += '<div class="sidebar-section">';
    MENU.forEach(function(item) {
      if (item.type === 'divider') {
        html += '<hr class="sidebar-divider">';
        return;
      }
      html += '<button class="sidebar-item" data-overlay="' + (item.overlay || '') + '" data-action="' + (item.action || '') + '">';
      html += '<span class="sidebar-item-icon">' + item.icon + '</span>';
      html += '<span class="sidebar-item-label">' + escHtml(item.label) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    /* Footer */
    html += '<div class="sidebar-footer">DeliEasy v2.0</div>';

    panel.innerHTML = html;

    /* Bind click handlers */
    var items = panel.querySelectorAll('.sidebar-item');
    items.forEach(function(el) {
      el.addEventListener('click', function() {
        var overlayId = el.getAttribute('data-overlay');
        var actionId = el.getAttribute('data-action');
        closeSidebar();
        if (overlayId && typeof window.openOverlay === 'function') {
          setTimeout(function() {
            window.openOverlay(overlayId);
          }, 150);
        } else if (actionId === 'enterEditMode') {
          setTimeout(function() {
            if (typeof window.enterEditMode === 'function') window.enterEditMode();
          }, 150);
        }
      });
    });

    /* サイドバー内スワイプで閉じる */
    _initPanelSwipeToClose(panel);
  }

  /* ---------- パネル内スワイプで閉じる ---------- */
  function _initPanelSwipeToClose(panel) {
    if (panel._swipeCloseInit) return;
    panel._swipeCloseInit = true;

    panel.addEventListener('touchstart', function(e) {
      if (!_isOpen) return;
      _panelTouchStartX = e.touches[0].clientX;
      _panelTouchStartY = e.touches[0].clientY;
      _panelTracking = true;
      _panelTranslateX = 0;
      panel.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', function(e) {
      if (!_panelTracking) return;
      var dx = e.touches[0].clientX - _panelTouchStartX;
      var dy = Math.abs(e.touches[0].clientY - _panelTouchStartY);

      /* 縦スクロールが主なら追跡をやめる */
      if (dy > Math.abs(dx) * 2 && Math.abs(dx) < 20) {
        _panelTracking = false;
        panel.style.transition = '';
        panel.style.transform = '';
        return;
      }

      /* 左方向のみ（負の値） */
      if (dx < 0) {
        _panelTranslateX = dx;
        panel.style.transform = 'translateX(' + dx + 'px)';
        var overlay = document.getElementById('sidebar-overlay');
        if (overlay) {
          var progress = Math.min(Math.abs(dx) / 180, 1);
          overlay.style.opacity = 1 - progress;
        }
      }
    }, { passive: true });

    panel.addEventListener('touchend', function() {
      if (!_panelTracking) return;
      _panelTracking = false;
      panel.style.transition = '';

      var overlay = document.getElementById('sidebar-overlay');
      if (overlay) overlay.style.opacity = '';

      if (_panelTranslateX < -_gc('closeThreshold')) {
        closeSidebar();
      } else {
        panel.style.transform = '';
      }
      _panelTranslateX = 0;
    }, { passive: true });
  }

  /* ---------- Open / Close ---------- */
  function openSidebar() {
    if (_isOpen) return;
    _isOpen = true;
    hp();
    renderSidebar();
    var overlay = document.getElementById('sidebar-overlay');
    var panel = document.getElementById('sidebar');
    if (overlay) { overlay.classList.add('open'); overlay.style.opacity = ''; }
    if (panel) { panel.classList.add('open'); panel.style.transform = ''; }
  }

  function closeSidebar() {
    if (!_isOpen) return;
    _isOpen = false;
    var overlay = document.getElementById('sidebar-overlay');
    var panel = document.getElementById('sidebar');
    if (overlay) { overlay.classList.remove('open'); overlay.style.opacity = ''; }
    if (panel) { panel.classList.remove('open'); panel.style.transform = ''; }
  }

  function toggleSidebar() {
    if (_isOpen) closeSidebar();
    else openSidebar();
  }

  function isSidebarOpen() { return _isOpen; }

  /* ---------- Edge swipe to open ---------- */
  function initSidebarGestures() {
    var _edgeTracking = false;

    document.addEventListener('touchstart', function(e) {
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
      _edgeTracking = (_touchStartX <= _gc('edgeWidth')) && !_isOpen;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!_edgeTracking || _isOpen) return;
      var dx = e.touches[0].clientX - _touchStartX;
      var dy = Math.abs(e.touches[0].clientY - _touchStartY);
      /* 水平方向が優勢で、しきい値を超えたら開く */
      if (dx > _gc('openThreshold') && dx > dy * 1.2) {
        _edgeTracking = false;
        openSidebar();
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      _edgeTracking = false;
    }, { passive: true });
  }

  /* ---------- ジェスチャー設定UI ---------- */
  function renderGestureSettings() {
    var cfg = getGestureConfig();
    var html = '';

    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">👆 ジェスチャー設定</div>';
    html += '<div class="fz-xs c-muted mb12">画面端からのスワイプでサイドバーや右パネルを開く操作を調整します。<br>端末のOS戻るジェスチャーと競合する場合は、検出幅を広めに設定してください。</div>';

    /* --- 左サイドバー --- */
    html += '<div class="fz-xs fw6 mb8" style="color:var(--c-primary)">◀ 左サイドバー</div>';

    /* 検出幅 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">検出幅: <span id="gesture-edge-val">' + cfg.edgeWidth + '</span>px</div>';
    html += '<input type="range" class="input-range" min="20" max="80" step="5" value="' + cfg.edgeWidth + '" ';
    html += 'oninput="document.getElementById(\'gesture-edge-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'edgeWidth\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>20px（狭い）</span><span>80px（広い）</span></div>';
    html += '</div>';

    /* 開く距離 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">開く距離: <span id="gesture-open-val">' + cfg.openThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="20" max="80" step="5" value="' + cfg.openThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-open-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'openThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>20px（敏感）</span><span>80px（鈍い）</span></div>';
    html += '</div>';

    /* 閉じる距離 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">閉じる距離: <span id="gesture-close-val">' + cfg.closeThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.closeThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-close-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'closeThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

    /* --- 右パネル --- */
    html += '<div style="margin-top:16px;padding-top:12px;border-top:.5px solid var(--c-divider)"></div>';
    html += '<div class="fz-xs fw6 mb8" style="color:var(--c-primary)">▶ 右パネル</div>';

    /* 検出幅 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">検出幅: <span id="gesture-redge-val">' + cfg.rightEdgeWidth + '</span>px</div>';
    html += '<input type="range" class="input-range" min="15" max="60" step="5" value="' + cfg.rightEdgeWidth + '" ';
    html += 'oninput="document.getElementById(\'gesture-redge-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightEdgeWidth\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>15px（狭い）</span><span>60px（広い）</span></div>';
    html += '</div>';

    /* 開く距離 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">開く距離: <span id="gesture-ropen-val">' + cfg.rightOpenThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.rightOpenThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-ropen-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightOpenThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

    /* 閉じる距離 */
    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">閉じる距離: <span id="gesture-rclose-val">' + cfg.rightCloseThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.rightCloseThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-rclose-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightCloseThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

    /* リセットボタン */
    html += '<button class="btn btn-secondary btn-sm btn-block" onclick="_gestureReset()">初期値に戻す</button>';

    html += '</div></div>';
    return html;
  }

  /* ---------- 設定変更操作 ---------- */
  window._gestureSet = function(key, val) {
    hp();
    var cfg = getGestureConfig();
    cfg[key] = val;
    saveGestureConfig(cfg);
  };

  window._gestureReset = function() {
    hp();
    saveGestureConfig(JSON.parse(JSON.stringify(DEFAULT_GESTURE_CFG)));
    toast('👆 ジェスチャー設定を初期値に戻しました');
    /* 設定画面を再描画 */
    if (typeof window._refreshSettingsOverlay === 'function') {
      window._refreshSettingsOverlay();
    }
  };

  /* ---------- Expose ---------- */
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleSidebar = toggleSidebar;
  window.isSidebarOpen = isSidebarOpen;
  window.renderSidebar = renderSidebar;
  window.initSidebarGestures = initSidebarGestures;
  window.getGestureConfig = getGestureConfig;
  window.saveGestureConfig = saveGestureConfig;
  window.renderGestureSettings = renderGestureSettings;

})();
