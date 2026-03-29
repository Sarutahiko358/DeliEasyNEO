/* ==========================================================
   DeliEasy v2 — js/sidebar.js
   左サイドバー — 並び替え・表示/非表示対応版
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

  /* ---------- デスクトップ判定ヘルパー ---------- */
  function _isSidebarDesktop() {
    return typeof window._isDesktop === 'function' && window._isDesktop();
  }

  /* ---------- メニュー項目マスター定義 ---------- */
  var SIDEBAR_MENU_ITEMS = [
    { id: 'earn-input',    icon: '\u270F\uFE0F', label: '売上入力',       overlay: 'earnInput',       group: 'quick' },
    { id: 'expense-input', icon: '\uD83D\uDCB8', label: '経費入力',       overlay: 'expenseInput',    group: 'quick' },
    { id: 'calendar',      icon: '\uD83D\uDCC5', label: 'カレンダー',     overlay: 'calendar',        group: 'main' },
    { id: 'stats',         icon: '\uD83D\uDCCA', label: '統計',           overlay: 'stats',           group: 'main' },
    { id: 'tax',           icon: '\uD83E\uDDFE', label: '税金',           overlay: 'tax',             group: 'main' },
    { id: 'expense-mgmt',  icon: '\uD83D\uDCB0', label: '経費管理',       overlay: 'expenseManage',   group: 'main' },
    { id: 'spreadsheet',   icon: '\uD83D\uDCCA', label: 'スプレッドシート', action: 'openSpreadsheetMain', group: 'main' },
    { id: 'pf-manage',     icon: '\uD83D\uDCE6', label: 'PF・カテゴリ',   overlay: 'pfManage',        group: 'manage' },
    { id: 'theme',         icon: '\uD83C\uDFA8', label: 'テーマ',         overlay: 'theme',           group: 'manage' },
    { id: 'overlay-mgr',   icon: '\uD83D\uDCD0', label: 'オーバーレイ管理', action: 'openOverlayManager', group: 'manage' },
    { id: 'home-edit',     icon: '\uD83C\uDFE0', label: 'ホーム編集',     action: 'enterEditMode',    group: 'manage' },
    { id: 'edit-advanced', icon: '\uD83D\uDD27', label: '詳細設定',       overlay: 'detailSettings',  group: 'manage' },
    { id: 'settings',      icon: '\u2699\uFE0F', label: '設定',           overlay: 'settings',        group: 'system' },
    { id: 'help',          icon: '\u2753',        label: 'ヘルプ',         overlay: 'help',            group: 'system' }
  ];

  /* ---------- サイドバー設定データ ---------- */
  var DEFAULT_SIDEBAR_CFG = {
    order: ['earn-input','expense-input','calendar','stats','tax','expense-mgmt','spreadsheet','pf-manage','theme','overlay-mgr','home-edit','edit-advanced','settings','help'],
    hidden: {}
  };

  function getSidebarConfig() {
    var saved = S.g('sidebar_cfg', null);
    if (!saved || typeof saved !== 'object') {
      saved = JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_CFG));
    }
    var masterIds = SIDEBAR_MENU_ITEMS.map(function(m) { return m.id; });
    /* マスターに新項目が追加された場合、orderの末尾に自動追加 */
    masterIds.forEach(function(id) {
      if (saved.order.indexOf(id) < 0) saved.order.push(id);
    });
    /* マスターから削除された項目はorderから除去 */
    saved.order = saved.order.filter(function(id) {
      return masterIds.indexOf(id) >= 0;
    });
    if (!saved.hidden) saved.hidden = {};
    return saved;
  }

  function saveSidebarConfig(cfg) {
    S.s('sidebar_cfg', cfg);
  }

  function _findMenuItem(id) {
    for (var i = 0; i < SIDEBAR_MENU_ITEMS.length; i++) {
      if (SIDEBAR_MENU_ITEMS[i].id === id) return SIDEBAR_MENU_ITEMS[i];
    }
    return null;
  }

  /* ---------- Render ---------- */
  function renderSidebar() {
    var panel = document.getElementById('sidebar');
    if (!panel) return;

    var cfg = getSidebarConfig();
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
      html += '<div class="sidebar-user-login">\u2601\uFE0F 同期するにはログイン</div>';
    }
    html += '</div>';

    /* Menu items — order順に描画、hiddenはスキップ、グループ変更時にdivider */
    html += '<div class="sidebar-section">';
    var lastGroup = null;
    cfg.order.forEach(function(id) {
      if (cfg.hidden[id]) return;
      var item = _findMenuItem(id);
      if (!item) return;
      if (lastGroup !== null && item.group !== lastGroup) {
        html += '<hr class="sidebar-divider">';
      }
      lastGroup = item.group;
      html += '<button class="sidebar-item" data-overlay="' + (item.overlay || '') + '" data-action="' + (item.action || '') + '">';
      html += '<span class="sidebar-item-icon">' + item.icon + '</span>';
      html += '<span class="sidebar-item-label">' + escHtml(item.label) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    /* カスタムオーバーレイ */
    var customOverlays = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];
    if (customOverlays.length > 0) {
      html += '<hr class="sidebar-divider">';
      customOverlays.forEach(function(co) {
        html += '<button class="sidebar-item" data-custom-overlay="' + escHtml(co.id) + '">';
        html += '<span class="sidebar-item-icon">' + escHtml(co.icon) + '</span>';
        html += '<span class="sidebar-item-label">' + escHtml(co.title) + '</span>';
        html += '</button>';
      });
    }
    /* オーバーレイ追加ボタン */
    html += '<button class="sidebar-item" id="sidebar-add-overlay">';
    html += '<span class="sidebar-item-icon">\uFF0B</span>';
    html += '<span class="sidebar-item-label" style="color:var(--c-primary)">オーバーレイ追加</span>';
    html += '</button>';

    /* Footer */
    html += '<div class="sidebar-footer">DeliEasyNEO v3.0</div>';

    panel.innerHTML = html;

    /* Bind click handlers */
    var items = panel.querySelectorAll('.sidebar-item');
    items.forEach(function(el) {
      el.addEventListener('click', function() {
        var overlayId = el.getAttribute('data-overlay');
        var actionId = el.getAttribute('data-action');

        /* デスクトップではサイドバーを閉じない（常時表示のため） */
        if (!_isSidebarDesktop()) {
          closeSidebar();
        }

        if (overlayId && typeof window.openOverlay === 'function') {
          setTimeout(function() {
            window.openOverlay(overlayId);
          }, _isSidebarDesktop() ? 0 : 150);
        } else if (actionId === 'openOverlayManager') {
          setTimeout(function() {
            if (typeof window.openOverlayManager === 'function') window.openOverlayManager();
          }, _isSidebarDesktop() ? 0 : 150);
        } else if (actionId === 'enterEditMode') {
          setTimeout(function() {
            if (typeof window.enterEditMode === 'function') window.enterEditMode();
          }, _isSidebarDesktop() ? 0 : 150);
        } else if (actionId === 'openEditAdvanced') {
          setTimeout(function() {
            if (typeof window.openEditAdvanced === 'function') window.openEditAdvanced();
          }, _isSidebarDesktop() ? 0 : 150);
        } else if (actionId === 'openSpreadsheetMain') {
          setTimeout(function() {
            if (typeof window.openSpreadsheetMain === 'function') window.openSpreadsheetMain();
          }, _isSidebarDesktop() ? 0 : 150);
        }
      });
    });

    /* カスタムオーバーレイのクリック */
    panel.querySelectorAll('.sidebar-item[data-custom-overlay]').forEach(function(el) {
      el.addEventListener('click', function() {
        var coId = el.getAttribute('data-custom-overlay');
        if (!_isSidebarDesktop()) {
          closeSidebar();
        }
        setTimeout(function() { openCustomOverlay(coId); }, _isSidebarDesktop() ? 0 : 150);
      });
    });

    /* オーバーレイ追加ボタン */
    var addBtn = document.getElementById('sidebar-add-overlay');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        if (!_isSidebarDesktop()) {
          closeSidebar();
        }
        setTimeout(function() { openCreateCustomOverlayDialog(); }, _isSidebarDesktop() ? 0 : 200);
      });
    }

    /* サイドバー内スワイプで閉じる（モバイルのみ） */
    if (!_isSidebarDesktop()) {
      _initPanelSwipeToClose(panel);
    }
  }

  /* ---------- サイドバー設定UI ---------- */
  function renderSidebarSettings() {
    var cfg = getSidebarConfig();
    var html = '';
    html += '<div id="sidebar-settings-container">';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">\u2630 サイドバー設定</div>';
    html += '<div class="fz-xs c-muted mb12">表示/非表示の切替。長押しでドラッグして並び替えできます。</div>';

    html += '<div id="sidebar-sort-list">';
    cfg.order.forEach(function(id) {
      var item = _findMenuItem(id);
      if (!item) return;
      var isHidden = !!cfg.hidden[id];
      var style = isHidden ? ' style="opacity:.4;text-decoration:line-through"' : '';
      html += '<div class="ovc-drag-item" data-sidebar-id="' + escHtml(id) + '"' + style + '>';
      html += '<span class="ovc-drag-handle">\u2630</span>';
      html += '<label class="topbar-toggle" style="flex-shrink:0">';
      html += '<input type="checkbox" ' + (isHidden ? '' : 'checked') + ' onchange="_sidebarToggleItem(\'' + escJs(id) + '\',!this.checked)">';
      html += '<span class="topbar-toggle-slider"></span>';
      html += '</label>';
      html += '<span class="fz-s">' + item.icon + ' ' + escHtml(item.label) + '</span>';
      html += '<span class="fz-xxs c-muted" style="margin-left:auto">' + escHtml(item.group) + '</span>';
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn btn-secondary btn-sm btn-block mt12" onclick="_sidebarResetOrder()">初期設定に戻す</button>';
    html += '</div></div>';
    html += '</div>';
    return html;
  }

  /* ---------- サイドバー並び替えドラッグ ---------- */
  function _initSidebarSortDrag() {
    var list = document.getElementById('sidebar-sort-list');
    if (!list) return;

    function _getFixedOffset(el) {
      var p = el.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        var cs = window.getComputedStyle(p);
        if (cs.transform && cs.transform !== 'none') {
          var r = p.getBoundingClientRect();
          return { x: r.left, y: r.top };
        }
        p = p.parentElement;
      }
      return { x: 0, y: 0 };
    }
    var _txOff = { x: 0, y: 0 };

    var LONG_PRESS_MS = 400;
    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0;
    var startX = 0;
    var offsetY = 0;
    var isDragging = false;
    var isMouseDown = false;
    var _scrollContainer = null;
    var _prevOverflow = '';

    function getItems() {
      return Array.from(list.querySelectorAll('.ovc-drag-item'));
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function _findScrollParent(el) {
      var p = el.parentElement;
      while (p && p !== document.body) {
        var cs = window.getComputedStyle(p);
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return p;
        p = p.parentElement;
      }
      return null;
    }

    function onPointerDown(e, isMouse) {
      var target = e.target.closest('.ovc-drag-item');
      if (!target) return;
      if (isMouse && e.button !== 0) return;
      /* トグルクリック時はドラッグ開始しない */
      if (e.target.closest('.topbar-toggle')) return;

      var pos = _getXY(e);
      startY = pos.y;
      startX = pos.x;
      if (isMouse) isMouseDown = true;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragItem = target;
        var rect = dragItem.getBoundingClientRect();
        _txOff = _getFixedOffset(dragItem);
        offsetY = startY - rect.top;

        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        _scrollContainer = _findScrollParent(list);
        if (_scrollContainer) {
          _prevOverflow = _scrollContainer.style.overflowY;
          _scrollContainer.style.overflowY = 'hidden';
        }

        placeholder = document.createElement('div');
        placeholder.className = 'ovc-drag-placeholder';
        placeholder.style.height = rect.height + 'px';
        dragItem.parentNode.insertBefore(placeholder, dragItem);

        dragItem.classList.add('ovc-dragging');
        dragItem.style.position = 'fixed';
        dragItem.style.left = (rect.left - _txOff.x) + 'px';
        dragItem.style.top = (rect.top - _txOff.y) + 'px';
        dragItem.style.width = rect.width + 'px';
        dragItem.style.zIndex = '10000';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
      var pos = _getXY(e);
      if (!isDragging && longPressTimer) {
        if (Math.abs(pos.y - startY) > 8 || Math.abs(pos.x - startX) > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragItem) return;
      if (e.preventDefault) e.preventDefault();

      dragItem.style.top = (pos.y - offsetY - _txOff.y) + 'px';

      var currentItems = getItems().filter(function(el) { return el !== dragItem; });
      var inserted = false;
      for (var i = 0; i < currentItems.length; i++) {
        var r = currentItems[i].getBoundingClientRect();
        if (pos.y < r.top + r.height / 2) {
          list.insertBefore(placeholder, currentItems[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) list.appendChild(placeholder);
    }

    function onPointerEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (_scrollContainer) {
        _scrollContainer.style.overflowY = _prevOverflow;
        _scrollContainer = null;
      }

      if (!isDragging || !dragItem) return;

      dragItem.classList.remove('ovc-dragging');
      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.zIndex = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragItem, placeholder);
        placeholder.remove();
      }
      placeholder = null;
      dragItem = null;
      isDragging = false;

      /* 新しい順序を保存 */
      var newOrder = [];
      getItems().forEach(function(el) {
        var sid = el.getAttribute('data-sidebar-id');
        if (sid) newOrder.push(sid);
      });
      var cfg = getSidebarConfig();
      cfg.order = newOrder;
      saveSidebarConfig(cfg);
      renderSidebar();
    }

    function onPointerCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      if (_scrollContainer) {
        _scrollContainer.style.overflowY = _prevOverflow;
        _scrollContainer = null;
      }
      if (dragItem) {
        dragItem.classList.remove('ovc-dragging');
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.zIndex = '';
        if (placeholder) placeholder.remove();
        dragItem = null;
        placeholder = null;
      }
      isDragging = false;
    }

    /* Touch */
    list.addEventListener('touchstart', function(e) { onPointerDown(e, false); }, { passive: true });
    list.addEventListener('touchmove', function(e) { onPointerMove(e); }, { passive: false });
    list.addEventListener('touchend', function() { onPointerEnd(); }, { passive: true });
    list.addEventListener('touchcancel', function() { onPointerCancel(); }, { passive: true });

    /* Mouse */
    list.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', function(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    });
    document.addEventListener('mouseup', function() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    });
    list.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });
  }

  /* ---------- サイドバー項目トグル ---------- */
  window._sidebarToggleItem = function(itemId, hide) {
    hp();
    var cfg = getSidebarConfig();
    if (hide) {
      cfg.hidden[itemId] = true;
    } else {
      delete cfg.hidden[itemId];
    }
    saveSidebarConfig(cfg);
    renderSidebar();
    /* 設定UIを再描画 */
    var container = document.getElementById('sidebar-settings-container');
    if (container) {
      container.outerHTML = renderSidebarSettings();
      setTimeout(function() { _initSidebarSortDrag(); }, 50);
    }
  };

  /* ---------- サイドバー順序リセット ---------- */
  window._sidebarResetOrder = function() {
    hp();
    saveSidebarConfig(JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_CFG)));
    toast('\u2630 サイドバー設定を初期値に戻しました');
    renderSidebar();
    var container = document.getElementById('sidebar-settings-container');
    if (container) {
      container.outerHTML = renderSidebarSettings();
      setTimeout(function() { _initSidebarSortDrag(); }, 50);
    }
  };

  /* ---------- パネル内スワイプで閉じる ---------- */
  function _initPanelSwipeToClose(panel) {
    if (panel._swipeCloseInit) return;
    panel._swipeCloseInit = true;

    panel.addEventListener('touchstart', function(e) {
      if (_isSidebarDesktop()) return;
      if (!_isOpen) return;
      _panelTouchStartX = e.touches[0].clientX;
      _panelTouchStartY = e.touches[0].clientY;
      _panelTracking = true;
      _panelTranslateX = 0;
      panel.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', function(e) {
      if (_isSidebarDesktop()) return;
      if (!_panelTracking) return;
      var dx = e.touches[0].clientX - _panelTouchStartX;
      var dy = Math.abs(e.touches[0].clientY - _panelTouchStartY);

      if (dy > Math.abs(dx) * 2 && Math.abs(dx) < 20) {
        _panelTracking = false;
        panel.style.transition = '';
        panel.style.transform = '';
        return;
      }

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
      if (_isSidebarDesktop()) return;
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
    /* デスクトップでは常時表示のためno-op */
    if (_isSidebarDesktop()) return;
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
    /* デスクトップでは常時表示のためno-op */
    if (_isSidebarDesktop()) return;
    if (!_isOpen) return;
    _isOpen = false;
    var overlay = document.getElementById('sidebar-overlay');
    var panel = document.getElementById('sidebar');
    if (overlay) { overlay.classList.remove('open'); overlay.style.opacity = ''; }
    if (panel) { panel.classList.remove('open'); panel.style.transform = ''; }
  }

  function toggleSidebar() {
    /* デスクトップでは何もしない */
    if (_isSidebarDesktop()) return;
    if (_isOpen) closeSidebar();
    else openSidebar();
  }

  function isSidebarOpen() {
    /* デスクトップでは常にtrue扱い */
    if (_isSidebarDesktop()) return true;
    return _isOpen;
  }

  /* ---------- Edge swipe to open ---------- */
  function initSidebarGestures() {
    var _edgeTracking = false;

    document.addEventListener('touchstart', function(e) {
      /* デスクトップではエッジスワイプ無効 */
      if (_isSidebarDesktop()) return;
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
      _edgeTracking = (_touchStartX <= _gc('edgeWidth')) && !_isOpen;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      /* デスクトップではエッジスワイプ無効 */
      if (_isSidebarDesktop()) return;
      if (!_edgeTracking || _isOpen) return;
      var dx = e.touches[0].clientX - _touchStartX;
      var dy = Math.abs(e.touches[0].clientY - _touchStartY);
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
    html += '<div class="fz-s fw6 mb12">\uD83D\uDC46 ジェスチャー設定</div>';
    html += '<div class="fz-xs c-muted mb12">画面端からのスワイプでサイドバーや右パネルを開く操作を調整します。<br>端末のOS戻るジェスチャーと競合する場合は、検出幅を広めに設定してください。</div>';

    html += '<div class="fz-xs fw6 mb8" style="color:var(--c-primary)">\u25C0 左サイドバー</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">検出幅: <span id="gesture-edge-val">' + cfg.edgeWidth + '</span>px</div>';
    html += '<input type="range" class="input-range" min="20" max="80" step="5" value="' + cfg.edgeWidth + '" ';
    html += 'oninput="document.getElementById(\'gesture-edge-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'edgeWidth\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>20px（狭い）</span><span>80px（広い）</span></div>';
    html += '</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">開く距離: <span id="gesture-open-val">' + cfg.openThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="20" max="80" step="5" value="' + cfg.openThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-open-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'openThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>20px（敏感）</span><span>80px（鈍い）</span></div>';
    html += '</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">閉じる距離: <span id="gesture-close-val">' + cfg.closeThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.closeThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-close-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'closeThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

    html += '<div style="margin-top:16px;padding-top:12px;border-top:.5px solid var(--c-divider)"></div>';
    html += '<div class="fz-xs fw6 mb8" style="color:var(--c-primary)">\u25B6 右パネル</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">検出幅: <span id="gesture-redge-val">' + cfg.rightEdgeWidth + '</span>px</div>';
    html += '<input type="range" class="input-range" min="15" max="60" step="5" value="' + cfg.rightEdgeWidth + '" ';
    html += 'oninput="document.getElementById(\'gesture-redge-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightEdgeWidth\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>15px（狭い）</span><span>60px（広い）</span></div>';
    html += '</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">開く距離: <span id="gesture-ropen-val">' + cfg.rightOpenThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.rightOpenThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-ropen-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightOpenThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

    html += '<div class="mb12">';
    html += '<div class="fz-xs fw6 c-secondary mb4">閉じる距離: <span id="gesture-rclose-val">' + cfg.rightCloseThreshold + '</span>px</div>';
    html += '<input type="range" class="input-range" min="30" max="100" step="5" value="' + cfg.rightCloseThreshold + '" ';
    html += 'oninput="document.getElementById(\'gesture-rclose-val\').textContent=this.value" ';
    html += 'onchange="_gestureSet(\'rightCloseThreshold\',Number(this.value))">';
    html += '<div class="flex flex-between fz-xxs c-muted"><span>30px（敏感）</span><span>100px（鈍い）</span></div>';
    html += '</div>';

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
    toast('\uD83D\uDC46 ジェスチャー設定を初期値に戻しました');
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
  window.renderSidebarSettings = renderSidebarSettings;
  window.getSidebarConfig = getSidebarConfig;
  window.saveSidebarConfig = saveSidebarConfig;
  window.SIDEBAR_MENU_ITEMS = SIDEBAR_MENU_ITEMS;
  window._initSidebarSortDrag = _initSidebarSortDrag;

})();
