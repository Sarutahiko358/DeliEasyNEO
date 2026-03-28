/* ==========================================================
   DeliEasy v2 — js/overlay-customizer.js
   オーバーレイ内セクション — 表示/非表示 + 長押しドラッグ並び替え
   ========================================================== */
(function(){
  'use strict';

  var _overlayCustomDefs = {};

  function registerOverlaySections(overlayId, sections) {
    _overlayCustomDefs[overlayId] = sections;
  }

  function getOverlayCustomConfig(overlayId) {
    var key = 'overlayCustom_' + overlayId;
    var saved = S.g(key, null);
    if (saved) return saved;
    var defs = _overlayCustomDefs[overlayId] || [];
    var config = { visible: {}, order: [] };
    defs.forEach(function(sec) {
      config.visible[sec.id] = sec.defaultVisible !== false;
      config.order.push(sec.id);
    });
    return config;
  }

  function saveOverlayCustomConfig(overlayId, config) {
    S.s('overlayCustom_' + overlayId, config);
  }

  function isOverlaySectionVisible(overlayId, sectionId) {
    var cfg = getOverlayCustomConfig(overlayId);
    return cfg.visible[sectionId] !== false;
  }

  function getOverlaySectionOrder(overlayId) {
    var cfg = getOverlayCustomConfig(overlayId);
    var defs = _overlayCustomDefs[overlayId] || [];
    var order = (cfg.order || []).slice();
    defs.forEach(function(sec) {
      if (order.indexOf(sec.id) < 0) order.push(sec.id);
    });
    return order;
  }

  /* ========== Customizer Dialog ========== */
  function openOverlayCustomizer(overlayId, onSave) {
    var defs = _overlayCustomDefs[overlayId];
    if (!defs || defs.length === 0) {
      toast('カスタマイズ可能なセクションがありません');
      return;
    }

    /* Close existing dialog if any */
    document.querySelectorAll('.confirm-overlay').forEach(function(el) {
      if (el.querySelector('#ovc-drag-list')) el.remove();
    });

    var cfg = getOverlayCustomConfig(overlayId);
    var order = getOverlaySectionOrder(overlayId);

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.style.zIndex = '9500';

    var h = '<div class="confirm-box" style="max-width:360px;max-height:80vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb12 text-c">📐 表示カスタマイズ</h3>';
    h += '<div class="fz-xs c-muted mb12">表示/非表示の切替。長押しでドラッグして並び替えできます。</div>';

    h += '<div id="ovc-drag-list" data-overlay-id="' + escHtml(overlayId) + '">';
    order.forEach(function(secId) {
      var secDef = null;
      for (var i = 0; i < defs.length; i++) {
        if (defs[i].id === secId) { secDef = defs[i]; break; }
      }
      if (!secDef) return;
      var isVisible = cfg.visible[secId] !== false;
      h += '<div class="ovc-drag-item" data-sec-id="' + escHtml(secId) + '">';
      h += '<span class="ovc-drag-handle">☰</span>';
      h += '<label class="topbar-toggle" style="flex-shrink:0">';
      h += '<input type="checkbox" ' + (isVisible ? 'checked' : '') + ' onchange="_ovcToggle(\'' + escJs(overlayId) + '\',\'' + escJs(secId) + '\',this.checked)">';
      h += '<span class="topbar-toggle-slider"></span>';
      h += '</label>';
      h += '<span class="fz-s" style="flex:1">' + (secDef.icon || '') + ' ' + escHtml(secDef.name) + '</span>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div class="flex gap8 mt12">';
    h += '<button class="btn btn-primary btn-sm btn-block" id="ovc-done">完了</button>';
    h += '<button class="btn btn-secondary btn-sm" id="ovc-reset">初期化</button>';
    h += '</div>';
    h += '</div>';

    div.innerHTML = h;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });

    /* Init drag-and-drop for the list */
    _initOvcDrag(overlayId, onSave);

    document.getElementById('ovc-done').onclick = function() {
      div.remove();
      if (typeof onSave === 'function') onSave();
    };

    document.getElementById('ovc-reset').onclick = function() {
      var key = 'overlayCustom_' + overlayId;
      localStorage.removeItem('dp_' + key);
      toast('初期設定に戻しました');
      div.remove();
      if (typeof onSave === 'function') onSave();
    };
  }

  /* ========== Long-press drag logic ========== */
  function _initOvcDrag(overlayId, onSave) {
    var list = document.getElementById('ovc-drag-list');
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

    function getItems() {
      return Array.from(list.querySelectorAll('.ovc-drag-item'));
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e, isMouse) {
      var target = e.target.closest('.ovc-drag-item');
      if (!target) return;
      if (isMouse && e.button !== 0) return;

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

      /* Save new order */
      var newOrder = [];
      getItems().forEach(function(el) {
        var secId = el.getAttribute('data-sec-id');
        if (secId) newOrder.push(secId);
      });
      var cfg = getOverlayCustomConfig(overlayId);
      cfg.order = newOrder;
      saveOverlayCustomConfig(overlayId, cfg);
    }

    function onPointerCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
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

  /* Toggle visibility */
  window._ovcToggle = function(overlayId, secId, visible) {
    hp();
    var cfg = getOverlayCustomConfig(overlayId);
    cfg.visible[secId] = visible;
    saveOverlayCustomConfig(overlayId, cfg);
  };

  /* Expose */
  window.registerOverlaySections = registerOverlaySections;
  window.getOverlayCustomConfig = getOverlayCustomConfig;
  window.saveOverlayCustomConfig = saveOverlayCustomConfig;
  window.isOverlaySectionVisible = isOverlaySectionVisible;
  window.getOverlaySectionOrder = getOverlaySectionOrder;
  window.openOverlayCustomizer = openOverlayCustomizer;

})();
