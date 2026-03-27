/* ==========================================================
   DeliEasy v2 — js/custom-overlays.js
   ユーザー定義カスタムオーバーレイ（閉じる/戻る修正 + ダッシュボード型追加）
   ========================================================== */
(function(){
  'use strict';

  var CUSTOM_OVERLAY_TYPES = [
    {
      id: 'dashboard',
      name: 'ダッシュボード',
      icon: '📊',
      desc: 'ウィジェットを自由に配置',
      render: _renderDashboardOverlay
    },
    {
      id: 'memo',
      name: 'メモ帳',
      icon: '📝',
      desc: '自由にメモを書ける',
      render: _renderMemoOverlay
    },
    {
      id: 'checklist',
      name: 'チェックリスト',
      icon: '✅',
      desc: 'タスク管理用リスト',
      render: _renderChecklistOverlay
    },
    {
      id: 'links',
      name: 'リンク集',
      icon: '🔗',
      desc: 'よく使うURLをまとめる',
      render: _renderLinksOverlay
    }
  ];

  /* プリセット絵文字リスト */
  var PRESET_EMOJIS = [
    '📊', '📝', '✅', '🔗', '📅', '💰', '🚴', '⭐',
    '🎯', '📦', '🔥', '💡', '🏠', '📋', '🎨', '⚡',
    '🌟', '📈', '🛒', '🎁', '🔔', '📌', '🗂', '💼',
    '🧾', '🍕', '☕', '🏃', '🎮', '📱', '💪', '🌈'
  ];

  function getCustomOverlays() {
    return S.g('customOverlays', []);
  }

  function saveCustomOverlays(list) {
    S.s('customOverlays', list);
  }

  function createCustomOverlay(type, title, icon) {
    var list = getCustomOverlays();
    var id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    var overlay = {
      id: id,
      type: type,
      title: title || 'カスタム',
      icon: icon || '📄',
      data: {}
    };
    /* Dashboard type: initialize with empty widgets array */
    if (type === 'dashboard') {
      overlay.data.widgets = [];
    }
    list.push(overlay);
    saveCustomOverlays(list);
    return overlay;
  }

  function deleteCustomOverlay(id) {
    var list = getCustomOverlays().filter(function(o) { return o.id !== id; });
    saveCustomOverlays(list);

    /* Clean up dynamic OVERLAYS entry and render function */
    if (window.OVERLAYS) delete window.OVERLAYS[id];
    delete window['renderOverlay_' + id];

    /* ダッシュボード編集モードのクリーンアップ */
    if (_dashEditMode[id]) delete _dashEditMode[id];

    /* もしこのオーバーレイが現在スタックで開いているなら閉じる */
    if (typeof getTopOverlayId === 'function' && getTopOverlayId() === id) {
      if (typeof closeOverlay === 'function') closeOverlay();
    }

    /* オーバーレイのDOM要素が残っていれば除去 */
    var sheet = document.getElementById('overlay-sheet-' + id);
    if (sheet) sheet.remove();

    /* サイドバーのカスタムオーバーレイ一覧を更新 */
    if (typeof renderSidebar === 'function') {
      try { renderSidebar(); } catch(e) {}
    }
  }

  /* ============================================================
     openCustomOverlay — NOW uses overlay.js stack properly
     ============================================================ */
  function openCustomOverlay(id) {
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { overlay = list[i]; break; }
    }
    if (!overlay) {
      toast('オーバーレイが見つかりません');
      /* 既にOVERLAYSに登録されていたら掃除する */
      if (window.OVERLAYS && window.OVERLAYS[id]) {
        delete window.OVERLAYS[id];
      }
      delete window['renderOverlay_' + id];
      return;
    }

    /* Step 1: Register in OVERLAYS so overlay.js recognizes it */
    if (window.OVERLAYS) {
      window.OVERLAYS[id] = { title: overlay.icon + ' ' + overlay.title };
    }

    /* Step 2: Register render function so overlay.js calls it */
    window['renderOverlay_' + id] = function(body) {
      _renderCustomOverlayBody(body, overlay);
    };

    /* Step 3: Open via the standard overlay system (uses _stack properly) */
    if (typeof openOverlay === 'function') {
      openOverlay(id);
    }

    /* Step 4: After opening, add the settings gear button to the header */
    setTimeout(function() {
      var sheet = document.getElementById('overlay-sheet-' + id);
      if (sheet) {
        var actions = sheet.querySelector('.overlay-actions');
        if (actions && !actions.querySelector('.co-settings-btn')) {
          var btn = document.createElement('button');
          btn.className = 'overlay-back co-settings-btn';
          btn.style.fontSize = '.8rem';
          btn.title = 'カスタマイズ';
          btn.textContent = '⚙️';
          btn.onclick = function() { _editCustomOverlaySettings(id); };
          actions.appendChild(btn);
        }
      }
    }, 100);
  }

  /* Dispatch to the correct renderer based on overlay type */
  function _renderCustomOverlayBody(body, overlay) {
    var typeDef = null;
    for (var j = 0; j < CUSTOM_OVERLAY_TYPES.length; j++) {
      if (CUSTOM_OVERLAY_TYPES[j].id === overlay.type) { typeDef = CUSTOM_OVERLAY_TYPES[j]; break; }
    }
    if (typeDef && typeof typeDef.render === 'function') {
      typeDef.render(body, overlay);
    } else {
      body.innerHTML = '<div class="text-c c-muted fz-s" style="padding:40px">不明なタイプ: ' + escHtml(overlay.type) + '</div>';
    }
  }

  /* ============================================================
     Dashboard overlay — widget-based custom screen
     ============================================================ */
  var _dashEditMode = {};

  function _renderDashboardOverlay(body, overlay) {
    if (!overlay.data.widgets) overlay.data.widgets = [];
    var widgets = overlay.data.widgets;
    var isEditing = !!_dashEditMode[overlay.id];

    var html = '';

    /* Edit mode toggle bar */
    if (isEditing) {
      html += '<div class="edit-mode-header" style="margin-bottom:12px;top:0">';
      html += '<button class="btn btn-ghost btn-sm" onclick="_dashExitEdit(\'' + escJs(overlay.id) + '\')">キャンセル</button>';
      html += '<span class="fw6 fz-s">ウィジェット編集</span>';
      html += '<button class="btn btn-primary btn-sm" onclick="_dashExitEdit(\'' + escJs(overlay.id) + '\')">完了</button>';
      html += '</div>';
    }

    if (isEditing) {
      /* === 編集モード: リッチリスト === */
      html += '<div class="home-edit-list" id="dash-edit-list-' + escHtml(overlay.id) + '">';

      var i = 0;
      while (i < widgets.length) {
        var w = widgets[i];
        var def = window.WIDGET_DEFS ? window.WIDGET_DEFS[w.id] : null;
        if (!def) { i++; continue; }
        var size = w.size || def.size || 'full';

        if (size === 'half' || size === 'compact') {
          var nextW = (i + 1 < widgets.length) ? widgets[i + 1] : null;
          var nextDef = nextW ? (window.WIDGET_DEFS ? window.WIDGET_DEFS[nextW.id] : null) : null;
          var nextSize = nextW && nextDef ? (nextW.size || nextDef.size || 'full') : 'full';

          if (nextW && (nextSize === 'half' || nextSize === 'compact')) {
            html += '<div class="home-edit-row home-edit-row-pair" data-row-start="' + i + '" data-row-count="2">';
            html += _renderDashEditItem(overlay.id, w, def, i, size);
            html += _renderDashEditItem(overlay.id, nextW, nextDef, i + 1, nextSize);
            html += '</div>';
            i += 2;
          } else {
            html += '<div class="home-edit-row home-edit-row-single-half" data-row-start="' + i + '" data-row-count="1">';
            html += _renderDashEditItem(overlay.id, w, def, i, size);
            html += '</div>';
            i += 1;
          }
        } else {
          html += '<div class="home-edit-row home-edit-row-full" data-row-start="' + i + '" data-row-count="1">';
          html += _renderDashEditItem(overlay.id, w, def, i, size);
          html += '</div>';
          i += 1;
        }
      }

      html += '<div class="home-edit-add" onclick="_dashOpenWidgetPicker(\'' + escJs(overlay.id) + '\')">';
      html += '<span style="font-size:1.2rem">＋</span> ウィジェットを追加';
      html += '</div>';
      html += '</div>';

    } else {
      /* === 通常モード: ウィジェットグリッド === */
      html += '<div class="widget-grid" id="dash-widget-grid-' + escHtml(overlay.id) + '">';

      if (widgets.length === 0) {
        html += '<div class="widget widget-full">';
        html += '<div class="widget-empty" style="padding:40px">';
        html += '<div style="font-size:2rem;margin-bottom:8px">📊</div>';
        html += '<div class="fz-s c-muted mb8">ウィジェットがまだありません</div>';
        html += '<button class="btn btn-primary btn-sm" onclick="_dashEnterEdit(\'' + escJs(overlay.id) + '\')">ウィジェットを追加</button>';
        html += '</div></div>';
      } else {
        widgets.forEach(function(w) {
          var wDef = window.WIDGET_DEFS ? window.WIDGET_DEFS[w.id] : null;
          if (!wDef) return;
          var sizeClass = 'widget-' + (w.size || wDef.size || 'full');
          var tappable = wDef.tappable ? ' widget-tappable' : '';
          var tapAttr = '';
          if (wDef.tappable && wDef.tapAction) {
            tapAttr = ' onclick="widgetTap(\'' + wDef.tapAction + '\')"';
          }
          html += '<div class="widget ' + sizeClass + tappable + '"' + tapAttr + '>';
          html += '<div class="widget-title"><span>' + wDef.icon + ' ' + escHtml(wDef.name) + '</span></div>';
          try { html += wDef.render(w); } catch (e) { html += '<div class="widget-empty">表示エラー</div>'; }
          html += '</div>';
        });
      }
      html += '</div>';
    }

    /* Long-press hint */
    if (!isEditing && widgets.length > 0) {
      html += '<div class="text-c fz-xs c-muted mt16 mb8" style="opacity:.5">';
      html += 'ウィジェットを長押しで編集モード';
      html += '</div>';
    }

    body.innerHTML = html;

    if (!isEditing && widgets.length > 0) {
      _initDashLongPress(overlay.id);
    }
    if (isEditing) {
      _initDashEditDrag(overlay.id);
    }

    if (widgets.some(function(w) { return w.id === 'clock'; })) {
      if (typeof startWidgetClock === 'function') startWidgetClock();
    }
  }

  /* --- Dashboard edit item renderer --- */
  function _renderDashEditItem(coId, w, def, index, size) {
    var sizeLabel = size === 'full' ? 'FULL' : (size === 'compact' ? 'SM' : 'HALF');
    var sizeColor = size === 'full' ? 'var(--c-primary)' : 'var(--c-info)';

    var html = '<div class="home-edit-item" data-widget-idx="' + index + '">';
    html += '<span class="home-edit-handle">☰</span>';
    html += '<span class="home-edit-icon">' + def.icon + '</span>';
    html += '<span class="home-edit-name">' + escHtml(def.name) + '</span>';
    html += '<span class="home-edit-size" style="color:' + sizeColor + '">' + sizeLabel + '</span>';

    if (def.sizeOptions && def.sizeOptions.length > 1) {
      html += '<button class="home-edit-btn" onclick="event.stopPropagation();_dashCycleSize(\'' + escJs(coId) + '\',' + index + ')" title="サイズ変更">↔</button>';
    }
    html += '<button class="home-edit-btn home-edit-btn-del" onclick="event.stopPropagation();_dashRemoveWidget(\'' + escJs(coId) + '\',' + index + ')" title="削除">✕</button>';
    html += '</div>';
    return html;
  }

  /* --- Dashboard edit drag (reuses home-edit-list CSS) --- */
  function _initDashEditDrag(coId) {
    var list = document.getElementById('dash-edit-list-' + coId);
    if (!list) return;

    var scrollContainer = list.closest('.overlay-body');

    var LONG_PRESS_MS = 350;
    var longPressTimer = null;
    var dragRow = null;
    var placeholder = null;
    var startY = 0;
    var startX = 0;
    var offsetY = 0;
    var isDragging = false;

    function getRows() {
      return Array.from(list.querySelectorAll('.home-edit-row'));
    }

    function onTouchStart(e) {
      if (e.target.closest('.home-edit-btn')) return;
      var row = e.target.closest('.home-edit-row');
      if (!row) return;

      var touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragRow = row;

        window.__widgetDragActive = true;

        if (scrollContainer) {
          scrollContainer.style.overflowY = 'hidden';
        }

        var rect = dragRow.getBoundingClientRect();
        offsetY = startY - rect.top;

        placeholder = document.createElement('div');
        placeholder.className = 'home-edit-placeholder';
        placeholder.style.height = rect.height + 'px';
        dragRow.parentNode.insertBefore(placeholder, dragRow);

        dragRow.classList.add('home-edit-dragging');
        dragRow.style.position = 'fixed';
        dragRow.style.left = rect.left + 'px';
        dragRow.style.top = rect.top + 'px';
        dragRow.style.width = rect.width + 'px';
        dragRow.style.zIndex = '10000';
        dragRow.style.pointerEvents = 'none';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      if (!isDragging && longPressTimer) {
        var touch = e.touches[0];
        var dy = Math.abs(touch.clientY - startY);
        var dx = Math.abs(touch.clientX - startX);
        if (dy > 8 || dx > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }

      if (!isDragging || !dragRow) return;
      e.preventDefault();
      e.stopPropagation();

      var touch = e.touches[0];
      var newTop = touch.clientY - offsetY;
      dragRow.style.top = newTop + 'px';

      var rows = getRows().filter(function(r) { return r !== dragRow; });
      var inserted = false;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        var midY = r.top + r.height / 2;
        if (touch.clientY < midY) {
          list.insertBefore(placeholder, rows[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        var addBtn = list.querySelector('.home-edit-add');
        if (addBtn) list.insertBefore(placeholder, addBtn);
        else list.appendChild(placeholder);
      }
    }

    function cleanupDrag() {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (dragRow) {
        dragRow.classList.remove('home-edit-dragging');
        dragRow.style.position = '';
        dragRow.style.left = '';
        dragRow.style.top = '';
        dragRow.style.width = '';
        dragRow.style.zIndex = '';
        dragRow.style.pointerEvents = '';
      }
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }
      placeholder = null;

      window.__widgetDragActive = false;

      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }
    }

    function onTouchEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (!isDragging || !dragRow) {
        window.__widgetDragActive = false;
        return;
      }

      dragRow.classList.remove('home-edit-dragging');
      dragRow.style.position = '';
      dragRow.style.left = '';
      dragRow.style.top = '';
      dragRow.style.width = '';
      dragRow.style.zIndex = '';
      dragRow.style.pointerEvents = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragRow, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }

      var overlayList = getCustomOverlays();
      for (var oi = 0; oi < overlayList.length; oi++) {
        if (overlayList[oi].id === coId) {
          var oldWidgets = overlayList[oi].data.widgets.slice();
          var newWidgets = [];
          var currentRows = list.querySelectorAll('.home-edit-row');
          currentRows.forEach(function(row) {
            var items = row.querySelectorAll('.home-edit-item');
            items.forEach(function(item) {
              var idx = parseInt(item.getAttribute('data-widget-idx'), 10);
              if (!isNaN(idx) && idx >= 0 && idx < oldWidgets.length) {
                newWidgets.push(oldWidgets[idx]);
              }
            });
          });
          if (newWidgets.length === oldWidgets.length) {
            overlayList[oi].data.widgets = newWidgets;
            saveCustomOverlays(overlayList);
          }
          break;
        }
      }

      var finishedCoId = coId;
      dragRow = null;
      isDragging = false;
      window.__widgetDragActive = false;

      _refreshDashboard(finishedCoId);
    }

    function onTouchCancel() {
      var wasDragging = isDragging;
      cleanupDrag();
      dragRow = null;
      isDragging = false;
      if (wasDragging) {
        _refreshDashboard(coId);
      }
    }

    list.addEventListener('touchstart', onTouchStart, { passive: true });
    list.addEventListener('touchmove', onTouchMove, { passive: false });
    list.addEventListener('touchend', onTouchEnd, { passive: true });
    list.addEventListener('touchcancel', onTouchCancel, { passive: true });
  }

  /* --- Dashboard edit mode --- */
  window._dashEnterEdit = function(coId) {
    hp();
    _dashEditMode[coId] = true;
    _refreshDashboard(coId);
  };

  window._dashExitEdit = function(coId) {
    _dashEditMode[coId] = false;
    _refreshDashboard(coId);
  };

  window._dashRemoveWidget = function(coId, idx) {
    hp();
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === coId) {
        if (list[i].data.widgets) {
          list[i].data.widgets.splice(idx, 1);
          saveCustomOverlays(list);
        }
        _refreshDashboard(coId);
        return;
      }
    }
  };

  window._dashCycleSize = function(coId, idx) {
    hp();
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === coId && list[i].data.widgets) {
        var w = list[i].data.widgets[idx];
        var def = window.WIDGET_DEFS ? window.WIDGET_DEFS[w.id] : null;
        if (!def || !def.sizeOptions || def.sizeOptions.length < 2) return;
        var curIdx = def.sizeOptions.indexOf(w.size || def.size);
        var nextIdx = (curIdx + 1) % def.sizeOptions.length;
        w.size = def.sizeOptions[nextIdx];
        saveCustomOverlays(list);
        _refreshDashboard(coId);
        return;
      }
    }
  };

  /* --- Dashboard widget picker (stays open) --- */
  window._dashOpenWidgetPicker = function(coId) {
    hp();
    var cats = window.WIDGET_CATEGORIES || [];
    var defs = window.WIDGET_DEFS || {};

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'dash-picker-' + coId;

    _renderDashPickerContent(div, coId, cats, defs);
    document.body.appendChild(div);
  };

  function _renderDashPickerContent(container, coId, cats, defs) {
    /* 現在のウィジェットIDリストを取得 */
    var overlayList = getCustomOverlays();
    var currentIds = [];
    for (var i = 0; i < overlayList.length; i++) {
      if (overlayList[i].id === coId && overlayList[i].data.widgets) {
        currentIds = overlayList[i].data.widgets.map(function(w) { return w.id; });
        break;
      }
    }

    var h = '<div class="confirm-box" style="width:340px;max-height:80vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb8 text-c">ウィジェットを追加</h3>';
    h += '<div class="fz-xs c-muted mb12 text-c">タップで追加。続けて複数追加できます。</div>';

    cats.forEach(function(cat) {
      var items = Object.values(defs).filter(function(w) { return w.category === cat.id; });
      if (items.length === 0) return;
      h += '<div class="fz-xs fw6 c-secondary mb8 mt8">' + cat.icon + ' ' + escHtml(cat.name) + '</div>';
      items.forEach(function(w) {
        var count = 0;
        currentIds.forEach(function(id) { if (id === w.id) count++; });
        var badge = '';
        if (count > 0) {
          badge = ' <span class="fz-xxs" style="background:var(--c-success-light);color:var(--c-success);padding:1px 6px;border-radius:980px;margin-left:4px">追加済み' + (count > 1 ? ' ×' + count : '') + '</span>';
        }
        h += '<button class="btn btn-secondary btn-sm btn-block mb4" style="text-align:left;justify-content:flex-start" onclick="_dashPickerAdd(\'' + escJs(coId) + '\',\'' + escJs(w.id) + '\')">';
        h += w.icon + ' ' + escHtml(w.name) + badge;
        h += ' <span class="fz-xs c-muted">- ' + escHtml(w.desc) + '</span>';
        h += '</button>';
      });
    });

    h += '<button class="btn btn-primary btn-block mt12" onclick="_dashPickerClose(\'' + escJs(coId) + '\')">完了</button>';
    h += '</div>';

    container.innerHTML = h;
  }

  window._dashPickerAdd = function(coId, widgetId) {
    var def = window.WIDGET_DEFS ? window.WIDGET_DEFS[widgetId] : null;
    if (!def) return;
    hp();

    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === coId) {
        if (!list[i].data.widgets) list[i].data.widgets = [];
        list[i].data.widgets.push({ id: widgetId, size: def.size });
        saveCustomOverlays(list);
        toast('✅ ' + def.name + 'を追加しました');

        /* ピッカーの内容を更新 */
        var container = document.getElementById('dash-picker-' + coId);
        if (container) {
          var cats = window.WIDGET_CATEGORIES || [];
          var defs = window.WIDGET_DEFS || {};
          _renderDashPickerContent(container, coId, cats, defs);
        }
        return;
      }
    }
  };

  window._dashPickerClose = function(coId) {
    var container = document.getElementById('dash-picker-' + coId);
    if (container) container.remove();
    _refreshDashboard(coId);
  };

  /* --- Dashboard long-press to enter edit --- */
  function _initDashLongPress(coId) {
    var grid = document.getElementById('dash-widget-grid-' + coId);
    if (!grid) return;
    var timer = null;
    grid.addEventListener('touchstart', function(e) {
      var widget = e.target.closest('.widget');
      if (!widget) return;
      timer = setTimeout(function() {
        hp();
        _dashEditMode[coId] = true;
        _refreshDashboard(coId);
      }, 600);
    }, { passive: true });
    grid.addEventListener('touchend', function() { clearTimeout(timer); }, { passive: true });
    grid.addEventListener('touchmove', function() { clearTimeout(timer); }, { passive: true });
  }

  /* --- Refresh dashboard content --- */
  function _refreshDashboard(coId) {
    var body = document.getElementById('overlay-body-' + coId);
    if (!body) return;
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === coId) { overlay = list[i]; break; }
    }
    if (overlay) _renderDashboardOverlay(body, overlay);
  }

  /* ============================================================
     Memo overlay renderer — 複数メモ対応版
     ============================================================ */
  var _activeMemoId = {};

  function _renderMemoOverlay(body, overlay) {
    /* 旧フォーマットからの移行 */
    if (!overlay.data.memos) {
      if (overlay.data.text) {
        overlay.data.memos = [{ id: 'memo_' + Date.now(), title: 'メモ 1', text: overlay.data.text, createdAt: Date.now(), updatedAt: Date.now() }];
        delete overlay.data.text;
        delete overlay.data.memoSavedAt;
        saveCustomOverlays(getCustomOverlays());
      } else {
        overlay.data.memos = [];
      }
    }

    var memos = overlay.data.memos;
    var activeId = _activeMemoId[overlay.id];
    var activeMemo = null;
    if (activeId) {
      for (var i = 0; i < memos.length; i++) {
        if (memos[i].id === activeId) { activeMemo = memos[i]; break; }
      }
    }

    var html = '';

    if (activeMemo) {
      /* === 個別メモ編集画面 === */
      html += '<div class="co-section">';

      /* 戻るバー */
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
      html += '<button class="btn btn-ghost btn-xs" onclick="_memoBack(\'' + escJs(overlay.id) + '\')" style="font-size:1rem;padding:4px 8px">←</button>';
      html += '<span class="fz-s fw6" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(activeMemo.title) + '</span>';
      html += '<button class="btn btn-ghost btn-xs" onclick="_memoCopyOne(\'' + escJs(overlay.id) + '\',\'' + escJs(activeMemo.id) + '\')" title="コピー">📋</button>';
      html += '</div>';

      /* テキストエリア */
      html += '<div class="co-memo-wrap">';
      html += '<textarea class="co-memo-textarea" id="custom-memo-text" placeholder="ここにメモを入力…"';
      html += ' oninput="_memoAutoUpdate(\'' + escJs(overlay.id) + '\',this)"';
      html += '>' + escHtml(activeMemo.text || '') + '</textarea>';
      html += '</div>';

      /* フッター */
      var charCount = (activeMemo.text || '').length;
      var lineCount = activeMemo.text ? activeMemo.text.split('\n').length : 0;
      html += '<div class="co-memo-footer">';
      html += '<span class="co-memo-stats" id="co-memo-stats">' + charCount + '文字 / ' + lineCount + '行</span>';
      html += '<div class="co-memo-actions">';
      html += '<button class="btn btn-ghost btn-xs" onclick="_memoDeleteOne(\'' + escJs(overlay.id) + '\',\'' + escJs(activeMemo.id) + '\')" title="削除">🗑</button>';
      html += '<button class="btn btn-primary btn-sm" onclick="_memoSaveOne(\'' + escJs(overlay.id) + '\',\'' + escJs(activeMemo.id) + '\')">💾 保存</button>';
      html += '</div>';
      html += '</div>';

      html += '</div>';
    } else {
      /* === メモ一覧画面 === */
      html += '<div class="co-section">';
      html += '<div class="co-section-header">';
      html += '<span class="co-section-icon">📝</span>';
      html += '<span class="co-section-title">メモ帳</span>';
      html += '<span class="co-section-badge">' + memos.length + '件</span>';
      html += '</div>';

      if (memos.length === 0) {
        html += '<div class="co-empty">';
        html += '<div class="co-empty-icon">📝</div>';
        html += '<div class="co-empty-text">メモがありません</div>';
        html += '<div class="co-empty-hint">下のボタンから新しいメモを作成しましょう</div>';
        html += '</div>';
      } else {
        html += '<div class="co-memo-list" id="co-memo-overlay-list-' + escHtml(overlay.id) + '">';
        memos.forEach(function(memo, idx) {
          var preview = (memo.text || '').substring(0, 60).replace(/\n/g, ' ') || '(空のメモ)';
          var dateStr = memo.updatedAt ? _formatMemoDate(memo.updatedAt) : '';
          html += '<div class="co-memo-card co-manage-item" data-memo-idx="' + idx + '" onclick="_memoOpen(\'' + escJs(overlay.id) + '\',\'' + escJs(memo.id) + '\')">'; 
          html += '<span class="co-manage-handle" onclick="event.stopPropagation()" style="cursor:grab;opacity:.3;margin-right:6px;font-size:.75rem">☰</span>';
          html += '<div style="flex:1;min-width:0">';
          html += '<div class="co-memo-card-title">' + escHtml(memo.title || '無題のメモ') + '</div>';
          html += '<div class="co-memo-card-preview">' + escHtml(preview) + '</div>';
          if (dateStr) html += '<div class="co-memo-card-date">' + escHtml(dateStr) + '</div>';
          html += '</div>';
        });
        html += '</div>';
      }

      html += '<button class="btn btn-primary btn-sm btn-block mt12" onclick="_memoAddFromOverlay(\'' + escJs(overlay.id) + '\')">＋ 新しいメモを追加</button>';
      html += '</div>';
    }

    body.innerHTML = html;

    /* メモ一覧の並び替え初期化 */
    if (!activeMemo && memos.length > 1) {
      requestAnimationFrame(function() {
        _initOverlayListDrag(overlay.id, 'memo');
      });
    }

    /* テキストエリア自動リサイズ */
    if (activeMemo) {
      var ta = document.getElementById('custom-memo-text');
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.max(200, ta.scrollHeight) + 'px';
      }
    }
  }

  function _formatMemoDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* メモ一覧に戻る */
  window._memoBack = function(overlayId) {
    hp();
    _activeMemoId[overlayId] = null;
    var body = document.getElementById('overlay-body-' + overlayId);
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId) { _renderMemoOverlay(body, list[i]); return; }
    }
  };

  /* メモを開く */
  window._memoOpen = function(overlayId, memoId) {
    hp();
    _activeMemoId[overlayId] = memoId;
    var body = document.getElementById('overlay-body-' + overlayId);
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId) { _renderMemoOverlay(body, list[i]); return; }
    }
  };

  /* オーバーレイ内から新しいメモを追加 */
  window._memoAddFromOverlay = function(overlayId) {
    hp();
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId) {
        if (!list[i].data.memos) list[i].data.memos = [];
        var newMemo = { id: 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), title: 'メモ ' + (list[i].data.memos.length + 1), text: '', createdAt: Date.now(), updatedAt: Date.now() };
        list[i].data.memos.push(newMemo);
        saveCustomOverlays(list);
        _activeMemoId[overlayId] = newMemo.id;
        var body = document.getElementById('overlay-body-' + overlayId);
        if (body) _renderMemoOverlay(body, list[i]);
        return;
      }
    }
  };

  /* メモ自動保存（入力中に文字数更新） */
  window._memoAutoUpdate = function(overlayId, el) {
    var stats = document.getElementById('co-memo-stats');
    if (stats) {
      var charCount = el.value.length;
      var lineCount = el.value ? el.value.split('\n').length : 0;
      stats.textContent = charCount + '文字 / ' + lineCount + '行';
    }
    el.style.height = 'auto';
    el.style.height = Math.max(200, el.scrollHeight) + 'px';
  };

  /* 個別メモ保存 */
  window._memoSaveOne = function(overlayId, memoId) {
    var el = document.getElementById('custom-memo-text');
    if (!el) return;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.memos) {
        for (var j = 0; j < list[i].data.memos.length; j++) {
          if (list[i].data.memos[j].id === memoId) {
            list[i].data.memos[j].text = el.value;
            list[i].data.memos[j].updatedAt = Date.now();
            saveCustomOverlays(list);
            toast('✅ メモを保存しました');
            return;
          }
        }
      }
    }
  };

  /* 個別メモ削除 */
  window._memoDeleteOne = function(overlayId, memoId) {
    customConfirm('このメモを削除しますか？', function() {
      var list = getCustomOverlays();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === overlayId && list[i].data.memos) {
          list[i].data.memos = list[i].data.memos.filter(function(m) { return m.id !== memoId; });
          saveCustomOverlays(list);
          _activeMemoId[overlayId] = null;
          var body = document.getElementById('overlay-body-' + overlayId);
          if (body) _renderMemoOverlay(body, list[i]);
          toast('🗑 メモを削除しました');
          return;
        }
      }
    });
  };

  /* メモをコピー */
  window._memoCopyOne = function(overlayId, memoId) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.memos) {
        for (var j = 0; j < list[i].data.memos.length; j++) {
          if (list[i].data.memos[j].id === memoId) {
            _copyToClipboard(list[i].data.memos[j].text || '');
            toast('📋 メモをコピーしました');
            return;
          }
        }
      }
    }
  };

  /* 管理タブからのメモ操作 */
  window._coMemoAdd = function(overlayId) {
    hp();
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId) {
        if (!list[i].data.memos) list[i].data.memos = [];
        list[i].data.memos.push({ id: 'memo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), title: 'メモ ' + (list[i].data.memos.length + 1), text: '', createdAt: Date.now(), updatedAt: Date.now() });
        saveCustomOverlays(list);
        toast('✅ メモを追加しました');
        /* 設定ダイアログを更新 */
        _refreshManageDialog(overlayId);
        /* オーバーレイも更新 */
        var body = document.getElementById('overlay-body-' + overlayId);
        if (body) _renderMemoOverlay(body, list[i]);
        return;
      }
    }
  };

  window._coMemoRename = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.memos && list[i].data.memos[idx]) {
        customPrompt('メモの名前', list[i].data.memos[idx].title || '', function(val) {
          if (val && val.trim()) {
            list[i].data.memos[idx].title = val.trim();
            saveCustomOverlays(list);
            _refreshManageDialog(overlayId);
            var body = document.getElementById('overlay-body-' + overlayId);
            if (body) _renderMemoOverlay(body, list[i]);
          }
        });
        return;
      }
    }
  };

  window._coMemoCopy = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.memos && list[i].data.memos[idx]) {
        _copyToClipboard(list[i].data.memos[idx].text || '');
        toast('📋 メモをコピーしました');
        return;
      }
    }
  };

  window._coMemoDelete = function(overlayId, idx) {
    customConfirm('このメモを削除しますか？', function() {
      var list = getCustomOverlays();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === overlayId && list[i].data.memos) {
          list[i].data.memos.splice(idx, 1);
          saveCustomOverlays(list);
          toast('🗑 削除しました');
          _refreshManageDialog(overlayId);
          var body = document.getElementById('overlay-body-' + overlayId);
          if (body) _renderMemoOverlay(body, list[i]);
          return;
        }
      }
    });
  };

  /* ============================================================
     Checklist overlay renderer — リッチ版
     ============================================================ */
  function _renderChecklistOverlay(body, overlay) {
    var items = overlay.data.items || [];
    var doneCount = items.filter(function(it) { return it.done; }).length;
    var totalCount = items.length;
    var pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

    var html = '';

    /* ヘッダー: 進捗バー付き */
    html += '<div class="co-section">';
    html += '<div class="co-section-header">';
    html += '<span class="co-section-icon">✅</span>';
    html += '<span class="co-section-title">チェックリスト</span>';
    html += '<span class="co-section-badge">' + doneCount + '/' + totalCount + '</span>';
    html += '</div>';

    if (totalCount > 0) {
      html += '<div class="co-progress">';
      html += '<div class="co-progress-bar" style="width:' + pct + '%"></div>';
      html += '</div>';
      html += '<div class="co-progress-label">' + pct + '% 完了</div>';
    }

    /* 入力フォーム */
    html += '<div class="co-cl-input-wrap">';
    html += '<input type="text" class="co-cl-input" id="custom-cl-input" placeholder="＋ 新しいタスクを追加…"';
    html += ' onkeydown="if(event.key===\'Enter\'){_addChecklistItem(\'' + escJs(overlay.id) + '\');}">';
    html += '<button class="co-cl-add-btn" onclick="_addChecklistItem(\'' + escJs(overlay.id) + '\')" title="追加">＋</button>';
    html += '</div>';

    /* タスクリスト */
    if (items.length === 0) {
      html += '<div class="co-empty">';
      html += '<div class="co-empty-icon">📋</div>';
      html += '<div class="co-empty-text">タスクがありません</div>';
      html += '<div class="co-empty-hint">上のフォームからタスクを追加しましょう</div>';
      html += '</div>';
    } else {
      /* 未完了タスク */
      var pending = [];
      var done = [];
      items.forEach(function(item, idx) {
        if (item.done) done.push({ item: item, idx: idx });
        else pending.push({ item: item, idx: idx });
      });

      html += '<div id="co-cl-overlay-list-' + escHtml(overlay.id) + '">';
      pending.forEach(function(entry) {
        html += _renderCheckItem(overlay.id, entry.item, entry.idx, false);
      });
      html += '</div>';

      /* 完了済み（折り畳み可能） */
      if (done.length > 0) {
        html += '<div class="co-cl-done-divider" onclick="this.classList.toggle(\'collapsed\');var s=this.nextElementSibling;s.style.display=s.style.display===\'none\'?\'\':\'none\'">';
        html += '<span>完了済み (' + done.length + '件)</span>';
        html += '<span class="co-cl-done-arrow">▼</span>';
        html += '</div>';
        html += '<div class="co-cl-done-list">';
        done.forEach(function(entry) {
          html += _renderCheckItem(overlay.id, entry.item, entry.idx, true);
        });
        html += '</div>';
      }

      /* 一括操作 */
      if (done.length > 0) {
        html += '<div class="co-cl-bulk-actions">';
        html += '<button class="btn btn-ghost btn-xs" onclick="_clearDoneItems(\'' + escJs(overlay.id) + '\')">🗑 完了済みを削除</button>';
        html += '</div>';
      }
    }

    html += '</div>'; /* co-section */

    body.innerHTML = html;

    /* 未完了タスクの並び替え初期化 */
    if (items.length > 1) {
      requestAnimationFrame(function() {
        _initOverlayListDrag(overlay.id, 'checklist');
      });
    }
  }

  function _renderCheckItem(overlayId, item, idx, isDone) {
    var h = '<div class="co-cl-item co-manage-item' + (isDone ? ' co-cl-item-done' : '') + '" data-cl-idx="' + idx + '">';
    h += '<label class="co-cl-checkbox-wrap">';
    h += '<input type="checkbox" class="co-cl-checkbox" ' + (isDone ? 'checked' : '') + ' onchange="_toggleChecklistItem(\'' + escJs(overlayId) + '\',' + idx + ',this.checked)">';
    h += '<span class="co-cl-checkmark"></span>';
    h += '</label>';
    h += '<span class="co-cl-text">' + escHtml(item.text) + '</span>';
    h += '<button class="co-cl-del" onclick="_coClItemCopy(\'' + escJs(overlayId) + '\',' + idx + ')" title="コピー" style="opacity:.3;color:var(--c-tx-muted)">📋</button>';
    h += '<button class="co-cl-del" onclick="_deleteChecklistItem(\'' + escJs(overlayId) + '\',' + idx + ')" title="削除">✕</button>';
    h += '</div>';
    return h;
  }

  /* インラインコピー */
  window._coClItemCopy = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.items && list[i].data.items[idx]) {
        _copyToClipboard(list[i].data.items[idx].text);
        toast('📋 コピーしました');
        return;
      }
    }
  };

  /* 完了済み一括削除 */
  window._clearDoneItems = function(id) {
    customConfirm('完了済みタスクを全て削除しますか？', function() {
      var list = getCustomOverlays();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id && list[i].data.items) {
          list[i].data.items = list[i].data.items.filter(function(it) { return !it.done; });
          saveCustomOverlays(list);
          var b = document.getElementById('overlay-body-' + id);
          if (b) _renderChecklistOverlay(b, list[i]);
          toast('🗑 完了済みタスクを削除しました');
          return;
        }
      }
    });
  };

  window._addChecklistItem = function(id) {
    var input = document.getElementById('custom-cl-input');
    if (!input || !input.value.trim()) return;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (!list[i].data.items) list[i].data.items = [];
        list[i].data.items.push({ text: input.value.trim(), done: false });
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  window._toggleChecklistItem = function(id, idx, done) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.items && list[i].data.items[idx]) {
        list[i].data.items[idx].done = done;
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  window._deleteChecklistItem = function(id, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.items) {
        list[i].data.items.splice(idx, 1);
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  /* ============================================================
     Links overlay renderer — リッチ版
     ============================================================ */
  function _renderLinksOverlay(body, overlay) {
    var links = overlay.data.links || [];

    var html = '';

    html += '<div class="co-section">';
    html += '<div class="co-section-header">';
    html += '<span class="co-section-icon">🔗</span>';
    html += '<span class="co-section-title">リンク集</span>';
    html += '<span class="co-section-badge">' + links.length + '件</span>';
    html += '</div>';

    /* 入力フォーム */
    html += '<div class="co-link-form">';
    html += '<input type="text" class="co-link-input" id="custom-link-name" placeholder="リンク名（例: Uber管理画面）">';
    html += '<div class="co-link-url-row">';
    html += '<input type="url" class="co-link-input" id="custom-link-url" placeholder="https://…" onkeydown="if(event.key===\'Enter\'){_addLink(\'' + escJs(overlay.id) + '\');}">';
    html += '<button class="co-link-add-btn" onclick="_addLink(\'' + escJs(overlay.id) + '\')" title="追加">＋</button>';
    html += '</div>';
    html += '</div>';

    /* リンクリスト */
    if (links.length === 0) {
      html += '<div class="co-empty">';
      html += '<div class="co-empty-icon">🌐</div>';
      html += '<div class="co-empty-text">リンクがありません</div>';
      html += '<div class="co-empty-hint">よく使うURLを追加してすぐアクセス</div>';
      html += '</div>';
    } else {
      html += '<div class="co-link-list" id="co-link-overlay-list-' + escHtml(overlay.id) + '">';
      links.forEach(function(link, idx) {
        var displayName = link.name || _extractDomain(link.url);
        var favicon = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(_extractDomain(link.url)) + '&sz=32';

        html += '<div class="co-link-item co-manage-item" data-link-idx="' + idx + '">';
        html += '<a href="' + escHtml(link.url) + '" target="_blank" rel="noopener" class="co-link-anchor">';
        html += '<img class="co-link-favicon" src="' + escHtml(favicon) + '" alt="" onerror="this.style.display=\'none\'">';
        html += '<div class="co-link-info">';
        html += '<div class="co-link-name">' + escHtml(displayName) + '</div>';
        html += '<div class="co-link-url-preview">' + escHtml(link.url.replace(/^https?:\/\//, '').substring(0, 40)) + '</div>';
        html += '</div>';
        html += '</a>';
        html += '<button class="co-link-del" onclick="event.preventDefault();event.stopPropagation();_deleteLink(\'' + escJs(overlay.id) + '\',' + idx + ')" title="削除">✕</button>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>'; /* co-section */

    body.innerHTML = html;

    /* リンクの並び替え初期化 */
    if (links.length > 1) {
      requestAnimationFrame(function() {
        _initOverlayListDrag(overlay.id, 'links');
      });
    }
  }

  /* ドメイン抽出ヘルパー */
  function _extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url.replace(/^https?:\/\//, '').split('/')[0] || url;
    }
  }

  window._addLink = function(id) {
    var nameEl = document.getElementById('custom-link-name');
    var urlEl = document.getElementById('custom-link-url');
    if (!urlEl || !urlEl.value.trim()) return;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (!list[i].data.links) list[i].data.links = [];
        list[i].data.links.push({ name: nameEl ? nameEl.value.trim() : '', url: urlEl.value.trim() });
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderLinksOverlay(body, list[i]);
        return;
      }
    }
  };

  window._deleteLink = function(id, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.links) {
        list[i].data.links.splice(idx, 1);
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderLinksOverlay(body, list[i]);
        return;
      }
    }
  };

  /* ============================================================
     クリップボードコピーヘルパー
     ============================================================ */
  function _copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() { _fallbackCopy(text); });
    } else {
      _fallbackCopy(text);
    }
  }

  function _fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    ta.remove();
  }

  /* チェックリスト: 個別タスクコピー */
  window._coClCopy = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.items && list[i].data.items[idx]) {
        _copyToClipboard(list[i].data.items[idx].text);
        toast('📋 タスクをコピーしました');
        return;
      }
    }
  };

  /* チェックリスト: 管理タブからの削除 */
  window._coClDelete = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.items) {
        list[i].data.items.splice(idx, 1);
        saveCustomOverlays(list);
        toast('🗑 削除しました');
        _refreshManageDialog(overlayId);
        var body = document.getElementById('overlay-body-' + overlayId);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  /* チェックリスト: 全タスクをテキストとしてコピー */
  window._coClCopyAll = function(overlayId) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.items) {
        var text = list[i].data.items.map(function(item) {
          return (item.done ? '✅ ' : '☐ ') + item.text;
        }).join('\n');
        _copyToClipboard(text);
        toast('📋 タスクリストをコピーしました');
        return;
      }
    }
  };

  /* リンク: URLコピー */
  window._coLinkCopy = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.links && list[i].data.links[idx]) {
        _copyToClipboard(list[i].data.links[idx].url);
        toast('📋 URLをコピーしました');
        return;
      }
    }
  };

  /* リンク: 管理タブからの削除 */
  window._coLinkDelete = function(overlayId, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === overlayId && list[i].data.links) {
        list[i].data.links.splice(idx, 1);
        saveCustomOverlays(list);
        toast('🗑 削除しました');
        _refreshManageDialog(overlayId);
        var body = document.getElementById('overlay-body-' + overlayId);
        if (body) _renderLinksOverlay(body, list[i]);
        return;
      }
    }
  };

  /* ============================================================
     Custom overlay settings editor — 管理画面統合版
     背景タップで閉じる + 種類別の管理タブ
     ============================================================ */
  window._editCustomOverlaySettings = function(id) {
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { overlay = list[i]; break; }
    }
    if (!overlay) return;

    var _settingsTab = 'manage';

    /* 既存の設定ダイアログがあれば閉じる */
    var existingDialog = document.getElementById('co-settings-dialog-' + id);
    if (existingDialog) existingDialog.remove();

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'co-settings-dialog-' + id;
    div.style.zIndex = '9500';

    function _renderSettingsDialog() {
      var h = '<div class="confirm-box" style="max-width:360px;max-height:85vh;overflow-y:auto;text-align:left;padding:20px 16px">';

      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
      h += '<h3 style="font-size:.9375rem;font-weight:700;margin:0">' + escHtml(overlay.icon) + ' ' + escHtml(overlay.title) + '</h3>';
      h += '<button class="btn btn-ghost btn-xs" id="co-settings-close" style="font-size:1rem;padding:4px 8px">✕</button>';
      h += '</div>';

      h += '<div class="segmented mb12">';
      h += '<button class="segmented-item' + (_settingsTab === 'manage' ? ' active' : '') + '" id="co-stab-manage">管理</button>';
      h += '<button class="segmented-item' + (_settingsTab === 'info' ? ' active' : '') + '" id="co-stab-info">設定</button>';
      h += '</div>';

      if (_settingsTab === 'manage') {
        h += _renderManageTab(overlay);
      } else {
        h += _renderInfoTab(overlay);
      }

      h += '</div>';
      div.innerHTML = h;

      /* confirm-box内のクリックが背景に伝搬しないようにする */
      var box = div.querySelector('.confirm-box');
      if (box) {
        box.addEventListener('click', function(e) { e.stopPropagation(); });
      }

      /* イベントバインド */
      var closeBtn = div.querySelector('#co-settings-close');
      if (closeBtn) closeBtn.onclick = function(e) { e.stopPropagation(); div.remove(); };

      var tabManage = div.querySelector('#co-stab-manage');
      var tabInfo = div.querySelector('#co-stab-info');
      if (tabManage) tabManage.onclick = function(e) { e.stopPropagation(); hp(); _settingsTab = 'manage'; _renderSettingsDialog(); };
      if (tabInfo) tabInfo.onclick = function(e) { e.stopPropagation(); hp(); _settingsTab = 'info'; _renderSettingsDialog(); };

      if (_settingsTab === 'info') {
        var saveBtn = div.querySelector('#co-edit-save');
        var delBtn = div.querySelector('#co-edit-delete');
        if (saveBtn) saveBtn.onclick = function(e) {
          e.stopPropagation();
          /* listを再取得（他の操作で変更されている可能性があるため） */
          var freshList = getCustomOverlays();
          var freshOverlay = null;
          for (var fi = 0; fi < freshList.length; fi++) {
            if (freshList[fi].id === id) { freshOverlay = freshList[fi]; break; }
          }
          if (!freshOverlay) return;
          freshOverlay.title = div.querySelector('#co-edit-title').value.trim() || 'カスタム';
          freshOverlay.icon = div.querySelector('#co-edit-icon').value.trim() || '📄';
          overlay = freshOverlay; /* ローカル参照も更新 */
          saveCustomOverlays(freshList);
          toast('✅ 設定を保存しました');
          if (window.OVERLAYS) window.OVERLAYS[id] = { title: freshOverlay.icon + ' ' + freshOverlay.title };
          var sheet = document.getElementById('overlay-sheet-' + id);
          if (sheet) {
            var titleEl = sheet.querySelector('.overlay-title');
            if (titleEl) titleEl.textContent = freshOverlay.icon + ' ' + freshOverlay.title;
          }
          if (typeof renderSidebar === 'function') try { renderSidebar(); } catch(e2) {}
          _renderSettingsDialog();
        };
        if (delBtn) delBtn.onclick = function(e) {
          e.stopPropagation();
          div.remove();
          customConfirm('このオーバーレイを削除しますか？', function() {
            if (typeof closeOverlay === 'function') closeOverlay();
            setTimeout(function() {
              document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
              deleteCustomOverlay(id);
              toast('🗑 オーバーレイを削除しました');
              if (typeof refreshHome === 'function') refreshHome();
              if (typeof renderSidebar === 'function') try { renderSidebar(); } catch(e3) {}
            }, 150);
          }, function() {
            /* キャンセル時: 設定ダイアログを再表示 */
            _editCustomOverlaySettings(id);
          });
        };
      }

      /* 管理タブのドラッグ並び替え初期化 */
      if (_settingsTab === 'manage') {
        requestAnimationFrame(function() {
          _initManageListDrag(id, overlay.type, function() {
            /* ドラッグ完了後、overlayデータを再取得して再描画 */
            var freshList2 = getCustomOverlays();
            for (var fi2 = 0; fi2 < freshList2.length; fi2++) {
              if (freshList2[fi2].id === id) { overlay = freshList2[fi2]; break; }
            }
            _renderSettingsDialog();
            /* オーバーレイ本体も更新 */
            var body = document.getElementById('overlay-body-' + id);
            if (body) _renderCustomOverlayBody(body, overlay);
          });
        });
      }
    }

    /* 背景タップで閉じる */
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });

    document.body.appendChild(div);
    _renderSettingsDialog();
  };

  /* --- 管理タブ: 種類別の管理UI --- */
  function _renderManageTab(overlay) {
    switch (overlay.type) {
      case 'memo': return _renderMemoManageTab(overlay);
      case 'checklist': return _renderChecklistManageTab(overlay);
      case 'links': return _renderLinksManageTab(overlay);
      case 'dashboard': return _renderDashboardManageTab(overlay);
      default: return '<div class="co-empty"><div class="co-empty-text">管理項目はありません</div></div>';
    }
  }

  /* --- 設定タブ: タイトル・アイコン・削除 --- */
  function _renderInfoTab(overlay) {
    var h = '';
    h += '<div class="input-group"><label class="input-label">タイトル</label>';
    h += '<input type="text" class="input" id="co-edit-title" value="' + escHtml(overlay.title) + '"></div>';
    h += '<div class="input-group"><label class="input-label">アイコン（絵文字）</label>';
    h += '<input type="text" class="input" id="co-edit-icon" value="' + escHtml(overlay.icon) + '" maxlength="2"></div>';

    /* プリセット絵文字 */
    h += '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:16px">';
    PRESET_EMOJIS.forEach(function(emoji) {
      var isSelected = overlay.icon === emoji;
      h += '<button class="co-emoji-btn' + (isSelected ? ' co-emoji-btn-active' : '') + '" onclick="document.getElementById(\'co-edit-icon\').value=\'' + escJs(emoji) + '\'">' + emoji + '</button>';
    });
    h += '</div>';

    h += '<div style="display:flex;gap:8px">';
    h += '<button class="btn btn-primary btn-sm" id="co-edit-save" style="flex:1">保存</button>';
    h += '<button class="btn btn-danger btn-sm" id="co-edit-delete">削除</button>';
    h += '</div>';
    return h;
  }

  /* --- メモ管理タブ --- */
  function _renderMemoManageTab(overlay) {
    if (!overlay.data.memos) {
      /* 旧フォーマットからの移行 */
      if (overlay.data.text) {
        overlay.data.memos = [{ id: 'memo_' + Date.now(), title: 'メモ 1', text: overlay.data.text, createdAt: Date.now(), updatedAt: Date.now() }];
        delete overlay.data.text;
        delete overlay.data.memoSavedAt;
        saveCustomOverlays(getCustomOverlays());
      } else {
        overlay.data.memos = [];
      }
    }
    var memos = overlay.data.memos;
    var h = '';

    h += '<div class="fz-xs c-muted mb8">' + memos.length + '件のメモ</div>';

    if (memos.length === 0) {
      h += '<div class="co-empty" style="padding:24px 0"><div class="co-empty-icon">📝</div><div class="co-empty-text">メモがありません</div></div>';
    } else {
      h += '<div id="co-memo-manage-list">';
      memos.forEach(function(memo, idx) {
        var preview = (memo.text || '').substring(0, 40).replace(/\n/g, ' ') || '(空のメモ)';
        h += '<div class="co-manage-item" data-memo-idx="' + idx + '">';
        h += '<span class="co-manage-handle">☰</span>';
        h += '<div class="co-manage-info" style="flex:1;min-width:0">';
        h += '<div class="co-manage-title">' + escHtml(memo.title || 'メモ ' + (idx + 1)) + '</div>';
        h += '<div class="co-manage-preview">' + escHtml(preview) + '</div>';
        h += '</div>';
        h += '<button class="co-manage-btn" onclick="_coMemoRename(\'' + escJs(overlay.id) + '\',' + idx + ')" title="名前変更">✏️</button>';
        h += '<button class="co-manage-btn" onclick="_coMemoCopy(\'' + escJs(overlay.id) + '\',' + idx + ')" title="コピー">📋</button>';
        h += '<button class="co-manage-btn co-manage-btn-del" onclick="_coMemoDelete(\'' + escJs(overlay.id) + '\',' + idx + ')" title="削除">✕</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<button class="btn btn-primary btn-sm btn-block mt12" onclick="_coMemoAdd(\'' + escJs(overlay.id) + '\')">＋ 新しいメモを追加</button>';
    return h;
  }

  /* --- チェックリスト管理タブ --- */
  function _renderChecklistManageTab(overlay) {
    var items = overlay.data.items || [];
    var doneCount = items.filter(function(it) { return it.done; }).length;
    var h = '';
    h += '<div class="fz-xs c-muted mb8">' + items.length + '件（完了: ' + doneCount + '件）</div>';

    if (items.length > 0) {
      h += '<div id="co-cl-manage-list">';
      items.forEach(function(item, idx) {
        h += '<div class="co-manage-item" data-cl-idx="' + idx + '">';
        h += '<span class="co-manage-handle">☰</span>';
        h += '<div class="co-manage-info" style="flex:1;min-width:0">';
        h += '<div class="co-manage-title' + (item.done ? ' co-manage-done' : '') + '">' + escHtml(item.text) + '</div>';
        h += '</div>';
        h += '<button class="co-manage-btn" onclick="_coClCopy(\'' + escJs(overlay.id) + '\',' + idx + ')" title="コピー">📋</button>';
        h += '<button class="co-manage-btn co-manage-btn-del" onclick="_coClDelete(\'' + escJs(overlay.id) + '\',' + idx + ')" title="削除">✕</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    if (doneCount > 0) {
      h += '<button class="btn btn-ghost btn-xs btn-block mt8" onclick="_clearDoneItems(\'' + escJs(overlay.id) + '\');setTimeout(function(){_refreshManageDialog(\'' + escJs(overlay.id) + '\')},200)">🗑 完了済みを一括削除</button>';
    }
    h += '<button class="btn btn-ghost btn-xs btn-block mt4" onclick="_coClCopyAll(\'' + escJs(overlay.id) + '\')">📋 全タスクをコピー</button>';
    return h;
  }

  /* --- リンク管理タブ --- */
  function _renderLinksManageTab(overlay) {
    var links = overlay.data.links || [];
    var h = '';
    h += '<div class="fz-xs c-muted mb8">' + links.length + '件のリンク</div>';

    if (links.length > 0) {
      h += '<div id="co-link-manage-list">';
      links.forEach(function(link, idx) {
        var displayName = link.name || _extractDomain(link.url);
        h += '<div class="co-manage-item" data-link-idx="' + idx + '">';
        h += '<span class="co-manage-handle">☰</span>';
        h += '<div class="co-manage-info" style="flex:1;min-width:0">';
        h += '<div class="co-manage-title">' + escHtml(displayName) + '</div>';
        h += '<div class="co-manage-preview">' + escHtml(link.url.replace(/^https?:\/\//, '').substring(0, 40)) + '</div>';
        h += '</div>';
        h += '<button class="co-manage-btn" onclick="_coLinkCopy(\'' + escJs(overlay.id) + '\',' + idx + ')" title="URLコピー">📋</button>';
        h += '<button class="co-manage-btn co-manage-btn-del" onclick="_coLinkDelete(\'' + escJs(overlay.id) + '\',' + idx + ')" title="削除">✕</button>';
        h += '</div>';
      });
      h += '</div>';
    }
    return h;
  }

  /* ============================================================
     オーバーレイ本体内のドラッグ並び替え（メモ・チェックリスト・リンク）
     ============================================================ */
  function _initOverlayListDrag(overlayId, overlayType) {
    var listId = null;
    var dataAttr = null;
    var dataKey = null;

    switch (overlayType) {
      case 'memo':
        listId = 'co-memo-overlay-list-' + overlayId;
        dataAttr = 'data-memo-idx';
        dataKey = 'memos';
        break;
      case 'checklist':
        listId = 'co-cl-overlay-list-' + overlayId;
        dataAttr = 'data-cl-idx';
        dataKey = 'items';
        break;
      case 'links':
        listId = 'co-link-overlay-list-' + overlayId;
        dataAttr = 'data-link-idx';
        dataKey = 'links';
        break;
      default:
        return;
    }

    var listEl = document.getElementById(listId);
    if (!listEl) return;

    var scrollContainer = listEl.closest('.overlay-body');

    var LONG_PRESS_MS = 400;
    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0;
    var startX = 0;
    var offsetY = 0;
    var isDragging = false;

    function getItems() {
      return Array.from(listEl.querySelectorAll('.co-manage-item'));
    }

    function onTouchStart(e) {
      /* ハンドル以外からの開始でも長押しで反応（ただしボタンは除外） */
      if (e.target.closest('.co-manage-btn') || e.target.closest('.co-cl-del') || e.target.closest('.co-link-del')) return;
      var item = e.target.closest('.co-manage-item');
      if (!item) return;

      var touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragItem = item;
        var rect = dragItem.getBoundingClientRect();
        offsetY = startY - rect.top;

        if (scrollContainer) scrollContainer.style.overflowY = 'hidden';

        placeholder = document.createElement('div');
        placeholder.style.height = rect.height + 'px';
        placeholder.style.background = 'var(--c-fill-quaternary)';
        placeholder.style.borderRadius = '8px';
        placeholder.style.margin = '2px 0';
        dragItem.parentNode.insertBefore(placeholder, dragItem);

        dragItem.style.position = 'fixed';
        dragItem.style.left = rect.left + 'px';
        dragItem.style.top = rect.top + 'px';
        dragItem.style.width = rect.width + 'px';
        dragItem.style.zIndex = '10001';
        dragItem.style.pointerEvents = 'none';
        dragItem.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
        dragItem.style.opacity = '0.92';
        dragItem.style.transition = 'none';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      if (!isDragging && longPressTimer) {
        var dx = Math.abs(e.touches[0].clientX - startX);
        var dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 8 || dy > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragItem) return;
      e.preventDefault();
      e.stopPropagation();

      var touch = e.touches[0];
      dragItem.style.top = (touch.clientY - offsetY) + 'px';

      var items = getItems().filter(function(el) { return el !== dragItem; });
      var inserted = false;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        if (touch.clientY < r.top + r.height / 2) {
          listEl.insertBefore(placeholder, items[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) listEl.appendChild(placeholder);
    }

    function onTouchEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (!isDragging || !dragItem) { isDragging = false; return; }

      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.zIndex = '';
      dragItem.style.pointerEvents = '';
      dragItem.style.boxShadow = '';
      dragItem.style.opacity = '';
      dragItem.style.transition = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragItem, placeholder);
        placeholder.remove();
      }
      placeholder = null;
      if (scrollContainer) scrollContainer.style.overflowY = '';

      /* データ再構築 */
      var freshList = getCustomOverlays();
      var freshOverlay = null;
      for (var oi = 0; oi < freshList.length; oi++) {
        if (freshList[oi].id === overlayId) { freshOverlay = freshList[oi]; break; }
      }
      if (freshOverlay && freshOverlay.data[dataKey]) {
        var oldData = freshOverlay.data[dataKey].slice();
        var newData = [];
        getItems().forEach(function(el) {
          var idx = parseInt(el.getAttribute(dataAttr), 10);
          if (!isNaN(idx) && idx >= 0 && idx < oldData.length) {
            newData.push(oldData[idx]);
          }
        });
        if (newData.length === oldData.length) {
          freshOverlay.data[dataKey] = newData;
          saveCustomOverlays(freshList);
          toast('✅ 並び替えを保存しました');
        }
      }

      var savedOverlayId = overlayId;
      dragItem = null;
      isDragging = false;

      /* オーバーレイ本体を再描画 */
      var body = document.getElementById('overlay-body-' + savedOverlayId);
      if (body) {
        var updatedList = getCustomOverlays();
        for (var ri = 0; ri < updatedList.length; ri++) {
          if (updatedList[ri].id === savedOverlayId) {
            _renderCustomOverlayBody(body, updatedList[ri]);
            break;
          }
        }
      }
    }

    function onTouchCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (dragItem) {
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        dragItem.style.boxShadow = '';
        dragItem.style.opacity = '';
        dragItem.style.transition = '';
        if (placeholder) placeholder.remove();
      }
      dragItem = null;
      placeholder = null;
      isDragging = false;
      if (scrollContainer) scrollContainer.style.overflowY = '';
    }

    listEl.addEventListener('touchstart', onTouchStart, { passive: true });
    listEl.addEventListener('touchmove', onTouchMove, { passive: false });
    listEl.addEventListener('touchend', onTouchEnd, { passive: true });
    listEl.addEventListener('touchcancel', onTouchCancel, { passive: true });
  }

  /* ============================================================
     管理タブのドラッグ並び替え（メモ・チェックリスト・リンク共通）
     ============================================================ */
  function _initManageListDrag(overlayId, overlayType, onReorder) {
    var listId = null;
    var dataAttr = null;
    var dataKey = null;

    switch (overlayType) {
      case 'memo':
        listId = 'co-memo-manage-list';
        dataAttr = 'data-memo-idx';
        dataKey = 'memos';
        break;
      case 'checklist':
        listId = 'co-cl-manage-list';
        dataAttr = 'data-cl-idx';
        dataKey = 'items';
        break;
      case 'links':
        listId = 'co-link-manage-list';
        dataAttr = 'data-link-idx';
        dataKey = 'links';
        break;
      default:
        return;
    }

    var listEl = document.getElementById(listId);
    if (!listEl) return;

    /* スクロールコンテナを特定（confirm-box or overlay-body） */
    var scrollContainer = listEl.closest('.confirm-box') || listEl.closest('.overlay-body');

    var LONG_PRESS_MS = 400;
    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0;
    var startX = 0;
    var offsetY = 0;
    var isDragging = false;

    function getItems() {
      return Array.from(listEl.querySelectorAll('.co-manage-item'));
    }

    function onTouchStart(e) {
      if (e.target.closest('.co-manage-btn')) return;
      var item = e.target.closest('.co-manage-item');
      if (!item) return;

      var touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragItem = item;
        var rect = dragItem.getBoundingClientRect();
        offsetY = startY - rect.top;

        /* スクロールを停止 */
        if (scrollContainer) {
          scrollContainer.style.overflowY = 'hidden';
        }

        placeholder = document.createElement('div');
        placeholder.className = 'co-manage-placeholder';
        placeholder.style.height = rect.height + 'px';
        placeholder.style.background = 'var(--c-fill-quaternary)';
        placeholder.style.borderRadius = '8px';
        placeholder.style.margin = '2px 0';
        dragItem.parentNode.insertBefore(placeholder, dragItem);

        dragItem.classList.add('co-manage-dragging');
        dragItem.style.position = 'fixed';
        dragItem.style.left = rect.left + 'px';
        dragItem.style.top = rect.top + 'px';
        dragItem.style.width = rect.width + 'px';
        dragItem.style.zIndex = '10001';
        dragItem.style.pointerEvents = 'none';
        dragItem.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
        dragItem.style.opacity = '0.92';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      if (!isDragging && longPressTimer) {
        var dx = Math.abs(e.touches[0].clientX - startX);
        var dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 8 || dy > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragItem) return;
      e.preventDefault();
      e.stopPropagation();

      var touch = e.touches[0];
      dragItem.style.top = (touch.clientY - offsetY) + 'px';

      var items = getItems().filter(function(el) { return el !== dragItem; });
      var inserted = false;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        if (touch.clientY < r.top + r.height / 2) {
          listEl.insertBefore(placeholder, items[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        listEl.appendChild(placeholder);
      }
    }

    function cleanupDrag() {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (dragItem) {
        dragItem.classList.remove('co-manage-dragging');
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        dragItem.style.boxShadow = '';
        dragItem.style.opacity = '';
      }
      if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }
      placeholder = null;
      isDragging = false;

      /* スクロールを復元 */
      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }
    }

    function onTouchEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (!isDragging || !dragItem) {
        isDragging = false;
        return;
      }

      dragItem.classList.remove('co-manage-dragging');
      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.zIndex = '';
      dragItem.style.pointerEvents = '';
      dragItem.style.boxShadow = '';
      dragItem.style.opacity = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragItem, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      /* スクロールを復元 */
      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }

      /* DOMの順序からデータを再構築 */
      var freshList = getCustomOverlays();
      var freshOverlay = null;
      for (var oi = 0; oi < freshList.length; oi++) {
        if (freshList[oi].id === overlayId) { freshOverlay = freshList[oi]; break; }
      }
      if (freshOverlay && freshOverlay.data[dataKey]) {
        var oldData = freshOverlay.data[dataKey].slice();
        var newData = [];
        getItems().forEach(function(el) {
          var idx = parseInt(el.getAttribute(dataAttr), 10);
          if (!isNaN(idx) && idx >= 0 && idx < oldData.length) {
            newData.push(oldData[idx]);
          }
        });
        if (newData.length === oldData.length) {
          freshOverlay.data[dataKey] = newData;
          saveCustomOverlays(freshList);
        }
      }

      dragItem = null;
      isDragging = false;

      if (typeof onReorder === 'function') onReorder();
    }

    function onTouchCancel() {
      cleanupDrag();
      dragItem = null;
    }

    listEl.addEventListener('touchstart', onTouchStart, { passive: true });
    listEl.addEventListener('touchmove', onTouchMove, { passive: false });
    listEl.addEventListener('touchend', onTouchEnd, { passive: true });
    listEl.addEventListener('touchcancel', onTouchCancel, { passive: true });
  }

  /* 管理タブの再描画（設定ダイアログを閉じずに中身だけ更新） */
  function _refreshManageDialog(overlayId) {
    /* 設定ダイアログが開いていれば再表示 */
    var dialog = document.getElementById('co-settings-dialog-' + overlayId);
    if (dialog) {
      /* ダイアログを一度消して再作成 */
      dialog.remove();
    }
    _editCustomOverlaySettings(overlayId);
  }

  /* --- ダッシュボード管理タブ --- */
  function _renderDashboardManageTab(overlay) {
    var widgets = overlay.data.widgets || [];
    var h = '';
    h += '<div class="fz-xs c-muted mb8">' + widgets.length + '個のウィジェット</div>';
    h += '<button class="btn btn-primary btn-sm btn-block" onclick="_dashManageEdit(\'' + escJs(overlay.id) + '\')">ウィジェットを編集</button>';
    return h;
  }

  /* ============================================================
     Create custom overlay dialog — 完全リニューアル版
     - アイコン: プリセット絵文字グリッド + カスタム入力
     - 種類: select廃止 → カード型UI
     - 作成後そのまま編集画面に遷移
     ============================================================ */
  function openCreateCustomOverlayDialog(onCreated) {
    /* 内部状態 */
    var _newIcon = '';
    var _newType = '';
    var _newTitle = '';

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'co-create-dialog';

    _renderCreateDialog(div);
    document.body.appendChild(div);

    function _renderCreateDialog(container) {
      var h = '<div class="confirm-box" style="max-width:360px;max-height:88vh;overflow-y:auto;text-align:left;padding:20px 16px">';

      h += '<h3 style="font-size:.9375rem;font-weight:700;text-align:center;margin-bottom:16px">新しいオーバーレイを作成</h3>';

      /* ===== タイトル ===== */
      h += '<div class="input-group">';
      h += '<label class="input-label">タイトル</label>';
      h += '<input type="text" class="input" id="co-new-title" placeholder="例: マイダッシュボード" value="' + escHtml(_newTitle) + '">';
      h += '</div>';

      /* ===== アイコン選択 ===== */
      h += '<div class="input-group">';
      h += '<label class="input-label">アイコン</label>';

      /* 選択済みアイコンのプレビュー or 未選択表示 */
      if (_newIcon) {
        h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
        h += '<span style="font-size:2rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--c-primary-light);border-radius:var(--ds-radius-sm);border:2px solid var(--c-primary)">' + escHtml(_newIcon) + '</span>';
        h += '<span class="fz-xs c-success fw6">選択済み</span>';
        h += '</div>';
      } else {
        h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
        h += '<span style="font-size:1.2rem;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm);border:2px dashed var(--c-border);color:var(--c-tx-muted)">?</span>';
        h += '<span class="fz-xs c-muted">下から選んでください</span>';
        h += '</div>';
      }

      /* プリセット絵文字グリッド */
      h += '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:8px">';
      PRESET_EMOJIS.forEach(function(emoji) {
        var isSelected = _newIcon === emoji;
        h += '<button style="width:100%;aspect-ratio:1;border:2px solid ' + (isSelected ? 'var(--c-primary)' : 'transparent') + ';';
        h += 'background:' + (isSelected ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
        h += 'border-radius:var(--ds-radius-sm);font-size:1.15rem;cursor:pointer;display:flex;align-items:center;justify-content:center;';
        h += 'transition:all .1s;-webkit-tap-highlight-color:transparent"';
        h += ' onclick="_coCreateSelectIcon(\'' + escJs(emoji) + '\')">' + emoji + '</button>';
      });
      h += '</div>';

      /* カスタム入力 */
      h += '<div style="display:flex;gap:6px;align-items:center">';
      h += '<input type="text" class="input" id="co-new-icon-custom" placeholder="他の絵文字を直接入力" maxlength="2" style="flex:1;font-size:.8125rem" value="">';
      h += '<button class="btn btn-secondary btn-xs" onclick="_coCreateApplyCustomIcon()" style="white-space:nowrap">決定</button>';
      h += '</div>';
      h += '</div>';

      /* ===== 種類選択（カード型） ===== */
      h += '<div class="input-group">';
      h += '<label class="input-label">種類</label>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      CUSTOM_OVERLAY_TYPES.forEach(function(t) {
        var isSelected = _newType === t.id;
        h += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
        h += 'padding:14px 8px;border-radius:var(--ds-radius-sm);cursor:pointer;';
        h += 'border:2px solid ' + (isSelected ? 'var(--c-primary)' : 'transparent') + ';';
        h += 'background:' + (isSelected ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
        h += 'color:var(--c-tx);transition:all .12s;-webkit-tap-highlight-color:transparent;text-align:center"';
        h += ' onclick="_coCreateSelectType(\'' + escJs(t.id) + '\')">';
        h += '<span style="font-size:1.4rem">' + t.icon + '</span>';
        h += '<span style="font-size:.75rem;font-weight:' + (isSelected ? '700' : '500') + ';line-height:1.2">' + escHtml(t.name) + '</span>';
        h += '<span style="font-size:.6rem;color:var(--c-tx-muted);line-height:1.3">' + escHtml(t.desc) + '</span>';
        h += '</button>';
      });
      h += '</div>';

      if (!_newType) {
        h += '<div class="fz-xxs c-muted mt4" style="text-align:center">種類を選択してください</div>';
      }
      h += '</div>';

      /* ===== バリデーションメッセージ ===== */
      var canCreate = _newTitle.trim() && _newIcon && _newType;

      /* ===== ボタン ===== */
      h += '<div style="display:flex;gap:8px;margin-top:16px">';
      if (canCreate) {
        h += '<button class="btn btn-primary btn-sm btn-block" id="co-new-ok">作成して編集</button>';
      } else {
        h += '<button class="btn btn-primary btn-sm btn-block" disabled style="opacity:.35;cursor:not-allowed">作成して編集</button>';
      }
      h += '<button class="btn btn-secondary btn-sm" id="co-new-cancel" style="min-width:80px">キャンセル</button>';
      h += '</div>';

      /* 未入力のヒント */
      if (!canCreate) {
        var missing = [];
        if (!_newTitle.trim()) missing.push('タイトル');
        if (!_newIcon) missing.push('アイコン');
        if (!_newType) missing.push('種類');
        h += '<div class="fz-xxs c-warning mt8 text-c">' + missing.join('・') + 'を入力してください</div>';
      }

      h += '</div>';
      container.innerHTML = h;

      /* イベントバインド */
      var cancelBtn = container.querySelector('#co-new-cancel');
      if (cancelBtn) cancelBtn.onclick = function() { container.remove(); };

      var okBtn = container.querySelector('#co-new-ok');
      if (okBtn) {
        okBtn.onclick = function() {
          var title = _newTitle.trim();
          if (!title) { toast('タイトルを入力してください'); return; }
          if (!_newIcon) { toast('アイコンを選択してください'); return; }
          if (!_newType) { toast('種類を選択してください'); return; }

          var ov = createCustomOverlay(_newType, title, _newIcon);
          container.remove();
          toast('✅ 「' + title + '」を作成しました');

          /* サイドバーを更新 */
          if (typeof renderSidebar === 'function') {
            try { renderSidebar(); } catch(e) {}
          }

          /* onCreated コールバック */
          if (typeof onCreated === 'function') onCreated(ov);

          /* 作成後すぐにオーバーレイを開く（編集可能状態に） */
          setTimeout(function() {
            openCustomOverlay(ov.id);
          }, 200);
        };
      }

      /* タイトル入力のリアルタイム追跡 */
      var titleInput = container.querySelector('#co-new-title');
      if (titleInput) {
        titleInput.oninput = function() {
          _newTitle = titleInput.value;
          /* 全部揃っているかチェックして、ボタンの状態のみ更新 */
          _updateCreateButtonState(container);
        };
      }
    }

    /* アイコン選択 */
    window._coCreateSelectIcon = function(emoji) {
      hp();
      _newIcon = emoji;
      var titleInput = div.querySelector('#co-new-title');
      if (titleInput) _newTitle = titleInput.value;
      _renderCreateDialog(div);
    };

    /* カスタムアイコン適用 */
    window._coCreateApplyCustomIcon = function() {
      var input = document.getElementById('co-new-icon-custom');
      if (!input || !input.value.trim()) { toast('絵文字を入力してください'); return; }
      hp();
      _newIcon = input.value.trim().substring(0, 2);
      var titleInput = div.querySelector('#co-new-title');
      if (titleInput) _newTitle = titleInput.value;
      _renderCreateDialog(div);
    };

    /* 種類選択 */
    window._coCreateSelectType = function(typeId) {
      hp();
      _newType = typeId;
      var titleInput = div.querySelector('#co-new-title');
      if (titleInput) _newTitle = titleInput.value;
      _renderCreateDialog(div);
    };

    /* ボタン状態の更新（再描画なし） */
    function _updateCreateButtonState(container) {
      /* フルリレンダリングせずにボタンの disabled だけ変える */
      var canCreate = _newTitle.trim() && _newIcon && _newType;
      var okBtn = container.querySelector('#co-new-ok');
      if (okBtn) {
        if (canCreate) {
          okBtn.disabled = false;
          okBtn.style.opacity = '';
          okBtn.style.cursor = '';
        } else {
          okBtn.disabled = true;
          okBtn.style.opacity = '.35';
          okBtn.style.cursor = 'not-allowed';
        }
      }
    }
  }

  window._dashManageEdit = function(coId) {
    /* 設定ダイアログ（z-index:9500のconfirm-overlay）を閉じてから編集モードに入る */
    var dialogs = document.querySelectorAll('.confirm-overlay');
    dialogs.forEach(function(el) {
      if (el.style.zIndex === '9500') el.remove();
    });
    _dashEditMode[coId] = true;
    _refreshDashboard(coId);
  };

  /* Expose */
  window.CUSTOM_OVERLAY_TYPES = CUSTOM_OVERLAY_TYPES;
  window.getCustomOverlays = getCustomOverlays;
  window.saveCustomOverlays = saveCustomOverlays;
  window.createCustomOverlay = createCustomOverlay;
  window.deleteCustomOverlay = deleteCustomOverlay;
  window.openCustomOverlay = openCustomOverlay;
  window.openCreateCustomOverlayDialog = openCreateCustomOverlayDialog;
  window._refreshManageDialog = _refreshManageDialog;

})();
