/* ==========================================================
   DeliEasy v2 — js/fab.js
   FAB + ミニメニュー — 長押し自由配置対応
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _isHidden = false;
  var _fabSortCleanup = null;

  /* ---------- FABアクション定義 ---------- */
  var ALL_FAB_ACTIONS = [
    { id: 'earnInput',     icon: '✏️', label: '売上入力',    overlay: 'earnInput' },
    { id: 'expenseInput',  icon: '💸', label: '経費入力',    overlay: 'expenseInput' },
    { id: 'calendar',      icon: '📅', label: 'カレンダー',  overlay: 'calendar' },
    { id: 'stats',         icon: '📊', label: '統計',        overlay: 'stats' },
    { id: 'tax',           icon: '🧾', label: '税金',        overlay: 'tax' },
    { id: 'expenseManage', icon: '💰', label: '経費管理',    overlay: 'expenseManage' },
    { id: 'pfManage',      icon: '📦', label: 'PF管理',      overlay: 'pfManage' },
    { id: 'theme',         icon: '🎨', label: 'テーマ',      overlay: 'theme' },
    { id: 'settings',      icon: '⚙️', label: '設定',        overlay: 'settings' },
    { id: 'editAdvanced', icon: '🔧', label: '詳細設定',    overlay: 'detailSettings' }
  ];

  var DEFAULT_FAB_CFG = {
    show: true,
    position: 'right',       /* legacy: 'right'|'left' */
    posX: null,               /* px from left edge — null = use position */
    posY: null,               /* px from top edge — null = use default bottom */
    items: ['earnInput', 'expenseInput'],
    order: null               /* null = デフォルト順を使用 */
  };

  function getFabConfig() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset && preset.fab && preset.fab.items) return preset.fab;
    return S.g('fab_cfg', DEFAULT_FAB_CFG);
  }

  function saveFabConfig(cfg) {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset) {
      preset.fab = cfg;
      if (typeof savePreset === 'function') savePreset(preset);
    }
    S.s('fab_cfg', cfg);
  }

  function _getAllFabActions() {
    var actions = ALL_FAB_ACTIONS.slice();
    var custom = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];
    custom.forEach(function(co) {
      actions.push({
        id: 'custom_' + co.id,
        icon: co.icon,
        label: co.title,
        customOverlayId: co.id
      });
    });
    return actions;
  }

  /* ---------- 並び順解決ヘルパー ---------- */
  function _getResolvedOrder(cfg) {
    var allActions = _getAllFabActions();
    var allIds = allActions.map(function(a) { return a.id; });

    if (!cfg.order || !Array.isArray(cfg.order) || cfg.order.length === 0) {
      return allIds;
    }

    var order = cfg.order.slice();

    /* allActionsに存在するがorderに含まれないもの → 末尾に追加 */
    allIds.forEach(function(id) {
      if (order.indexOf(id) < 0) order.push(id);
    });

    /* orderに存在するがallActionsに含まれないもの → 除去 */
    order = order.filter(function(id) {
      return allIds.indexOf(id) >= 0;
    });

    return order;
  }

  /* ---------- Position helper ---------- */
  function _applyPosition(container) {
    var cfg = getFabConfig();
    if (cfg.posX !== null && cfg.posX !== undefined &&
        cfg.posY !== null && cfg.posY !== undefined) {
      /* Free position mode */
      container.style.left = cfg.posX + 'px';
      container.style.top = cfg.posY + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
    } else {
      /* Legacy right/left mode */
      container.style.top = '';
      container.style.left = '';
      container.style.right = '';
      container.style.bottom = '';
      if (cfg.position === 'left') {
        container.style.left = '20px';
        container.style.right = 'auto';
        container.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 24px)';
      } else {
        container.style.right = '20px';
        container.style.left = 'auto';
        container.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 24px)';
      }
    }
  }

  /* ---------- Render ---------- */
  function renderFab() {
    var container = document.getElementById('fab-container');
    if (!container) return;

    var cfg = getFabConfig();
    if (cfg.show === false) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    var items = cfg.items || DEFAULT_FAB_CFG.items;
    var allActions = _getAllFabActions();
    var order = _getResolvedOrder(cfg);

    /* orderの順序で、itemsに含まれるものだけを描画 */
    var orderedItems = [];
    order.forEach(function(id) {
      if (items.indexOf(id) >= 0) orderedItems.push(id);
    });

    var html = '';
    html += '<div class="fab-mini-group" id="fab-mini-group">';
    for (var i = orderedItems.length - 1; i >= 0; i--) {
      var itemId = orderedItems[i];
      var action = null;
      for (var j = 0; j < allActions.length; j++) {
        if (allActions[j].id === itemId) { action = allActions[j]; break; }
      }
      if (!action) continue;
      html += '<button class="fab-mini" data-fab-action="' + escHtml(action.id) + '">';
      html += '<span class="fab-mini-icon">' + action.icon + '</span>';
      html += '<span>' + escHtml(action.label) + '</span>';
      html += '</button>';
    }
    html += '</div>';
    html += '<button class="fab-main" id="fab-main" aria-label="メニューを開く">＋</button>';

    container.innerHTML = html;
    container.className = 'fab-container';

    _applyPosition(container);

    document.getElementById('fab-main').addEventListener('click', toggleFabMenu);

    container.querySelectorAll('.fab-mini').forEach(function(el) {
      el.addEventListener('click', function() {
        var actionId = el.getAttribute('data-fab-action');
        closeFabMenu();
        var allAct = _getAllFabActions();
        for (var k = 0; k < allAct.length; k++) {
          if (allAct[k].id === actionId) {
            if (allAct[k].customOverlayId) {
              openCustomOverlay(allAct[k].customOverlayId);
            } else if (allAct[k].overlay && typeof openOverlay === 'function') {
              openOverlay(allAct[k].overlay);
            }
            return;
          }
        }
      });
    });

    /* Init long-press drag */
    _initFabDrag(container);
  }

  /* ---------- Long-press drag ---------- */
  function _initFabDrag(container) {
    var fabMain = container.querySelector('.fab-main');
    if (!fabMain) return;

    var LONG_PRESS_MS = 500;
    var longPressTimer = null;
    var isDragging = false;
    var startTouchX = 0, startTouchY = 0;
    var startElemX = 0, startElemY = 0;
    var hint = null;
    var isMouseDown = false;

    function getContainerPos() {
      var rect = container.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    function showHint() {
      hint = document.createElement('div');
      hint.className = 'fab-drag-hint';
      hint.textContent = 'ドラッグで移動 — 離すと配置';
      document.body.appendChild(hint);
    }

    function removeHint() {
      if (hint) { hint.remove(); hint = null; }
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e, isMouse) {
      if (_isOpen) return;
      if (isMouse && e.button !== 0) return;

      var pos = _getXY(e);
      startTouchX = pos.x;
      startTouchY = pos.y;
      var cpos = getContainerPos();
      startElemX = cpos.x;
      startElemY = cpos.y;

      if (isMouse) isMouseDown = true;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        hp();
        container.classList.add('fab-dragging');

        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        showHint();
        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
      var pos = _getXY(e);
      var dx = pos.x - startTouchX;
      var dy = pos.y - startTouchY;

      if (!isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        clearTimeout(longPressTimer);
        return;
      }

      if (!isDragging) return;
      if (e.preventDefault) e.preventDefault();

      var newX = startElemX + dx;
      var newY = startElemY + dy;

      var vw = window.innerWidth;
      var vh = window.innerHeight;
      newX = Math.max(0, Math.min(newX, vw - 56));
      newY = Math.max(0, Math.min(newY, vh - 56));

      container.style.left = newX + 'px';
      container.style.top = newY + 'px';
      container.style.right = 'auto';
      container.style.bottom = 'auto';
    }

    function onPointerEnd() {
      clearTimeout(longPressTimer);
      isMouseDown = false;

      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (isDragging) {
        isDragging = false;
        container.classList.remove('fab-dragging');
        removeHint();

        var rect = container.getBoundingClientRect();
        var cfg = getFabConfig();
        cfg.posX = Math.round(rect.left);
        cfg.posY = Math.round(rect.top);
        saveFabConfig(cfg);

        if (typeof toast === 'function') toast('📌 FABの位置を保存しました');
      }
    }

    function onPointerCancel() {
      clearTimeout(longPressTimer);
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      if (isDragging) {
        isDragging = false;
        container.classList.remove('fab-dragging');
        removeHint();
      }
    }

    /* Touch */
    fabMain.addEventListener('touchstart', function(e) { onPointerDown(e, false); }, { passive: true });
    fabMain.addEventListener('touchmove', function(e) { onPointerMove(e); }, { passive: false });
    fabMain.addEventListener('touchend', function() { onPointerEnd(); }, { passive: true });
    fabMain.addEventListener('touchcancel', function() { onPointerCancel(); }, { passive: true });

    /* Mouse */
    fabMain.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', function(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    });
    document.addEventListener('mouseup', function() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    });
    fabMain.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });
  }

  /* ---------- FAB設定UI ---------- */
  function renderFabSettings() {
    var cfg = getFabConfig();
    var items = cfg.items || DEFAULT_FAB_CFG.items;
    var allActions = _getAllFabActions();

    var html = '<div id="fab-settings-container">';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">＋ FABメニュー設定</div>';

    html += '<div class="flex flex-between items-center mb12">';
    html += '<span class="fz-s">FABを表示</span>';
    html += '<label class="topbar-toggle">';
    html += '<input type="checkbox" ' + (cfg.show !== false ? 'checked' : '') + ' onchange="_fabToggleShow(this.checked)">';
    html += '<span class="topbar-toggle-slider"></span>';
    html += '</label>';
    html += '</div>';

    if (cfg.show !== false) {
      /* Position reset button */
      html += '<div class="flex flex-between items-center mb12">';
      html += '<span class="fz-s">位置</span>';
      html += '<div class="flex gap4">';
      html += '<button class="pill' + (!cfg.posX && cfg.position !== 'left' ? ' active' : '') + '" onclick="_fabSetPosition(\'right\')">右下</button>';
      html += '<button class="pill' + (!cfg.posX && cfg.position === 'left' ? ' active' : '') + '" onclick="_fabSetPosition(\'left\')">左下</button>';
      html += '</div></div>';

      if (cfg.posX !== null && cfg.posX !== undefined) {
        html += '<div class="fz-xs c-muted mb8">📌 カスタム位置に配置中 — <a href="#" style="color:var(--c-primary)" onclick="event.preventDefault();_fabResetPosition()">デフォルトに戻す</a></div>';
      } else {
        html += '<div class="fz-xs c-muted mb8">💡 FABボタンを長押しすると自由に移動できます</div>';
      }

      html += '<div class="fz-xs fw6 c-secondary mb8">表示するアクション</div>';
      html += '<div class="fz-xs c-muted mb8">長押しでドラッグして並び替えできます。</div>';

      html += '<div id="fab-sort-list">';
      var sortOrder = _getResolvedOrder(cfg);
      sortOrder.forEach(function(actionId) {
        var action = null;
        for (var j = 0; j < allActions.length; j++) {
          if (allActions[j].id === actionId) { action = allActions[j]; break; }
        }
        if (!action) return;
        var isEnabled = items.indexOf(actionId) >= 0;
        var style = isEnabled ? '' : ' style="opacity:.4"';

        html += '<div class="ovc-drag-item" data-fab-action-id="' + escHtml(actionId) + '"' + style + '>';
        html += '<span class="ovc-drag-handle">☰</span>';
        html += '<label class="topbar-toggle" style="flex-shrink:0">';
        html += '<input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="_fabToggleAction(\'' + escJs(actionId) + '\')">';
        html += '<span class="topbar-toggle-slider"></span>';
        html += '</label>';
        html += '<span style="font-size:1rem;flex-shrink:0">' + action.icon + '</span>';
        html += '<span class="fz-s" style="flex:1">' + escHtml(action.label) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div></div></div>';
    setTimeout(function() { _initFabSortDrag(); }, 50);
    return html;
  }

  /* ---------- FAB並べ替えドラッグ ---------- */
  function _initFabSortDrag() {
    if (_fabSortCleanup) {
      _fabSortCleanup();
      _fabSortCleanup = null;
    }

    var list = document.getElementById('fab-sort-list');
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
        var actionId = el.getAttribute('data-fab-action-id');
        if (actionId) newOrder.push(actionId);
      });
      var cfg = getFabConfig();
      cfg.order = newOrder;
      saveFabConfig(cfg);
      renderFab();
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
    function onDocMouseMove(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    }
    function onDocMouseUp() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    }

    list.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    list.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });

    _fabSortCleanup = function() {
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);
    };
  }

  window._fabToggleShow = function(show) {
    var cfg = getFabConfig();
    cfg.show = show;
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  window._fabSetPosition = function(pos) {
    hp();
    var cfg = getFabConfig();
    cfg.position = pos;
    cfg.posX = null;
    cfg.posY = null;
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  window._fabResetPosition = function() {
    hp();
    var cfg = getFabConfig();
    cfg.posX = null;
    cfg.posY = null;
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
    toast('FABをデフォルト位置に戻しました');
  };

  window._fabToggleAction = function(actionId) {
    hp();
    var cfg = getFabConfig();
    if (!cfg.items) cfg.items = DEFAULT_FAB_CFG.items.slice();

    /* orderが未設定なら現在の解決済み順序をセット */
    if (!cfg.order) {
      cfg.order = _getResolvedOrder(cfg);
    }

    var idx = cfg.items.indexOf(actionId);
    if (idx >= 0) {
      cfg.items.splice(idx, 1);
    } else {
      cfg.items.push(actionId);
    }
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  function _refreshFabSettingsUI() {
    var container = document.getElementById('fab-settings-container');
    if (container) {
      container.outerHTML = renderFabSettings();
    }
  }

  /* ---------- Toggle mini menu ---------- */
  function toggleFabMenu() {
    hp();
    if (_isOpen) closeFabMenu();
    else openFabMenu();
  }

  function openFabMenu() {
    _isOpen = true;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.add('open');
    if (group) group.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeFabMenu() {
    _isOpen = false;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.remove('open');
    if (group) group.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  /* ---------- Show / Hide ---------- */
  function showFab() {
    _isHidden = false;
    var container = document.getElementById('fab-container');
    if (container) container.classList.remove('hidden');
  }

  function hideFab() {
    _isHidden = true;
    closeFabMenu();
    var container = document.getElementById('fab-container');
    if (container) container.classList.add('hidden');
  }

  function isFabOpen() { return _isOpen; }

  /* ---------- Expose ---------- */
  window.renderFab = renderFab;
  window.renderFabSettings = renderFabSettings;
  window.getFabConfig = getFabConfig;
  window.saveFabConfig = saveFabConfig;
  window.ALL_FAB_ACTIONS = ALL_FAB_ACTIONS;
  window.toggleFabMenu = toggleFabMenu;
  window.openFabMenu = openFabMenu;
  window.closeFabMenu = closeFabMenu;
  window.showFab = showFab;
  window.hideFab = hideFab;
  window.isFabOpen = isFabOpen;

})();
