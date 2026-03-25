/* ==========================================================
   DeliEasy v2 — js/sidebar.js
   左サイドバー（操作系メニュー）
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _touchStartX = 0;

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
  }

  /* ---------- Open / Close ---------- */
  function openSidebar() {
    if (_isOpen) return;
    _isOpen = true;
    hp();
    renderSidebar();
    var overlay = document.getElementById('sidebar-overlay');
    var panel = document.getElementById('sidebar');
    if (overlay) overlay.classList.add('open');
    if (panel) panel.classList.add('open');
  }

  function closeSidebar() {
    if (!_isOpen) return;
    _isOpen = false;
    var overlay = document.getElementById('sidebar-overlay');
    var panel = document.getElementById('sidebar');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
  }

  function toggleSidebar() {
    if (_isOpen) closeSidebar();
    else openSidebar();
  }

  function isSidebarOpen() { return _isOpen; }

  /* ---------- Edge swipe to open ---------- */
  function initSidebarGestures() {
    document.addEventListener('touchstart', function(e) {
      _touchStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (_isOpen) return;
      /* Only trigger from left edge (first 25px) */
      if (_touchStartX > 25) return;
      var dx = e.touches[0].clientX - _touchStartX;
      if (dx > 60) {
        openSidebar();
      }
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
