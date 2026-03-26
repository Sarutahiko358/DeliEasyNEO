/* ==========================================================
   DeliEasy v2 — js/sidebar.js
   左サイドバー — 感度改善版
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

  /* ---------- 感度設定 ---------- */
  var EDGE_WIDTH = 30;         /* 端からの検出幅 px */
  var OPEN_THRESHOLD = 40;     /* 開くのに必要なスワイプ距離 px */
  var CLOSE_THRESHOLD = 50;    /* 閉じるのに必要なスワイプ距離 px */

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

      if (_panelTranslateX < -CLOSE_THRESHOLD) {
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
      _edgeTracking = (_touchStartX <= EDGE_WIDTH) && !_isOpen;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!_edgeTracking || _isOpen) return;
      var dx = e.touches[0].clientX - _touchStartX;
      var dy = Math.abs(e.touches[0].clientY - _touchStartY);
      /* 水平方向が優勢で、しきい値を超えたら開く */
      if (dx > OPEN_THRESHOLD && dx > dy * 1.2) {
        _edgeTracking = false;
        openSidebar();
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      _edgeTracking = false;
    }, { passive: true });
  }

  /* ---------- Expose ---------- */
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleSidebar = toggleSidebar;
  window.isSidebarOpen = isSidebarOpen;
  window.renderSidebar = renderSidebar;
  window.initSidebarGestures = initSidebarGestures;

})();
