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

    var LONG_PRESS_MS = 300;
    var longPressTimer = null;
    var dragRow = null;
    var placeholder = null;
    var startY = 0;
    var offsetY = 0;
    var isDragging = false;

    function getRows() {
      return Array.from(list.querySelectorAll('.home-edit-row'));
    }

    function onTouchStart(e) {
      if (e.target.closest('.home-edit-btn')) return;
      var row = e.target.closest('.home-edit-row');
      if (!row) return;

      startY = e.touches[0].clientY;
      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragRow = row;
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

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onTouchMove(e) {
      if (!isDragging && longPressTimer) {
        if (Math.abs(e.touches[0].clientY - startY) > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragRow) return;
      e.preventDefault();

      var touch = e.touches[0];
      dragRow.style.top = (touch.clientY - offsetY) + 'px';

      var rows = getRows().filter(function(r) { return r !== dragRow; });
      var inserted = false;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        if (touch.clientY < r.top + r.height / 2) {
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

    function onTouchEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (!isDragging || !dragRow) return;

      dragRow.classList.remove('home-edit-dragging');
      dragRow.style.position = '';
      dragRow.style.left = '';
      dragRow.style.top = '';
      dragRow.style.width = '';
      dragRow.style.zIndex = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragRow, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      /* DOMからウィジェット順序を再構築 */
      var overlayList = getCustomOverlays();
      for (var oi = 0; oi < overlayList.length; oi++) {
        if (overlayList[oi].id === coId) {
          var oldWidgets = overlayList[oi].data.widgets.slice();
          var newWidgets = [];
          var rows = list.querySelectorAll('.home-edit-row');
          rows.forEach(function(row) {
            var items = row.querySelectorAll('.home-edit-item');
            items.forEach(function(item) {
              var idx = parseInt(item.getAttribute('data-widget-idx'), 10);
              if (!isNaN(idx) && oldWidgets[idx]) newWidgets.push(oldWidgets[idx]);
            });
          });
          if (newWidgets.length === oldWidgets.length) {
            overlayList[oi].data.widgets = newWidgets;
            saveCustomOverlays(overlayList);
          }
          break;
        }
      }

      dragRow = null;
      isDragging = false;
      _refreshDashboard(coId);
    }

    function onTouchCancel() {
      clearTimeout(longPressTimer);
      if (isDragging && dragRow) {
        dragRow.classList.remove('home-edit-dragging');
        dragRow.style.position = '';
        dragRow.style.left = '';
        dragRow.style.top = '';
        dragRow.style.width = '';
        dragRow.style.zIndex = '';
        if (placeholder) placeholder.remove();
        dragRow = null;
        placeholder = null;
      }
      isDragging = false;
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
     Memo overlay renderer
     ============================================================ */
  function _renderMemoOverlay(body, overlay) {
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<textarea class="input" id="custom-memo-text" placeholder="メモを入力..." style="min-height:200px;resize:vertical">' + escHtml(overlay.data.text || '') + '</textarea>';
    html += '<button class="btn btn-primary btn-sm btn-block mt8" onclick="_saveCustomMemo(\'' + escJs(overlay.id) + '\')">保存</button>';
    html += '</div></div>';
    body.innerHTML = html;
  }

  window._saveCustomMemo = function(id) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        var el = document.getElementById('custom-memo-text');
        list[i].data.text = el ? el.value : '';
        break;
      }
    }
    saveCustomOverlays(list);
    toast('✅ メモを保存しました');
  };

  /* ============================================================
     Checklist overlay renderer
     ============================================================ */
  function _renderChecklistOverlay(body, overlay) {
    var items = overlay.data.items || [];
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="flex gap8 mb12">';
    html += '<input type="text" class="input" id="custom-cl-input" placeholder="新しいタスク" style="flex:1">';
    html += '<button class="btn btn-primary btn-sm" onclick="_addChecklistItem(\'' + escJs(overlay.id) + '\')">追加</button>';
    html += '</div>';
    items.forEach(function(item, idx) {
      html += '<div class="flex items-center gap8 mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">';
      html += '<input type="checkbox" ' + (item.done ? 'checked' : '') + ' onchange="_toggleChecklistItem(\'' + escJs(overlay.id) + '\',' + idx + ',this.checked)">';
      html += '<span class="fz-s" style="flex:1;' + (item.done ? 'text-decoration:line-through;opacity:.5' : '') + '">' + escHtml(item.text) + '</span>';
      html += '<button class="btn btn-danger btn-xs" onclick="_deleteChecklistItem(\'' + escJs(overlay.id) + '\',' + idx + ')">✕</button>';
      html += '</div>';
    });
    html += '</div></div>';
    body.innerHTML = html;
  }

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
     Links overlay renderer
     ============================================================ */
  function _renderLinksOverlay(body, overlay) {
    var links = overlay.data.links || [];
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="flex gap8 mb8">';
    html += '<input type="text" class="input" id="custom-link-name" placeholder="名前" style="flex:1">';
    html += '</div>';
    html += '<div class="flex gap8 mb12">';
    html += '<input type="url" class="input" id="custom-link-url" placeholder="https://..." style="flex:1">';
    html += '<button class="btn btn-primary btn-sm" onclick="_addLink(\'' + escJs(overlay.id) + '\')">追加</button>';
    html += '</div>';
    links.forEach(function(link, idx) {
      html += '<div class="flex items-center gap8 mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">';
      html += '<a href="' + escHtml(link.url) + '" target="_blank" rel="noopener" class="fz-s c-primary" style="flex:1;text-decoration:none">' + escHtml(link.name || link.url) + '</a>';
      html += '<button class="btn btn-danger btn-xs" onclick="_deleteLink(\'' + escJs(overlay.id) + '\',' + idx + ')">✕</button>';
      html += '</div>';
    });
    html += '</div></div>';
    body.innerHTML = html;
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
     Custom overlay settings editor
     ============================================================ */
  window._editCustomOverlaySettings = function(id) {
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { overlay = list[i]; break; }
    }
    if (!overlay) return;

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.style.zIndex = '9500';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:320px;text-align:left">' +
        '<h3 class="fz-s fw6 mb12 text-c">オーバーレイ設定</h3>' +
        '<div class="input-group"><label class="input-label">タイトル</label>' +
          '<input type="text" class="input" id="co-edit-title" value="' + escHtml(overlay.title) + '"></div>' +
        '<div class="input-group"><label class="input-label">アイコン（絵文字）</label>' +
          '<input type="text" class="input" id="co-edit-icon" value="' + escHtml(overlay.icon) + '" maxlength="2"></div>' +
        '<div class="flex gap8 mt12">' +
          '<button class="btn btn-primary btn-sm" id="co-edit-save">保存</button>' +
          '<button class="btn btn-secondary btn-sm" id="co-edit-cancel">閉じる</button>' +
          '<button class="btn btn-danger btn-sm" id="co-edit-delete">削除</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);

    document.getElementById('co-edit-save').onclick = function() {
      overlay.title = document.getElementById('co-edit-title').value.trim() || 'カスタム';
      overlay.icon = document.getElementById('co-edit-icon').value.trim() || '📄';
      saveCustomOverlays(list);
      div.remove();
      toast('✅ 設定を保存しました');
      /* Update OVERLAYS registry and sheet title */
      if (window.OVERLAYS) {
        window.OVERLAYS[id] = { title: overlay.icon + ' ' + overlay.title };
      }
      var sheet = document.getElementById('overlay-sheet-' + id);
      if (sheet) {
        var titleEl = sheet.querySelector('.overlay-title');
        if (titleEl) titleEl.textContent = overlay.icon + ' ' + overlay.title;
      }
    };
    document.getElementById('co-edit-cancel').onclick = function() { div.remove(); };
    document.getElementById('co-edit-delete').onclick = function() {
      customConfirm('このオーバーレイを削除しますか？', function() {
        div.remove();
        /* まずオーバーレイを閉じる（closeOverlayはスタックからpopする） */
        if (typeof closeOverlay === 'function') closeOverlay();
        /* 少し遅延してからデータ削除（DOMの整合性を保つため） */
        setTimeout(function() {
          deleteCustomOverlay(id);
          toast('🗑 削除しました');
          /* ホーム画面を更新 */
          if (typeof refreshHome === 'function') refreshHome();
        }, 100);
      });
    };
  };

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

  /* Expose */
  window.CUSTOM_OVERLAY_TYPES = CUSTOM_OVERLAY_TYPES;
  window.getCustomOverlays = getCustomOverlays;
  window.saveCustomOverlays = saveCustomOverlays;
  window.createCustomOverlay = createCustomOverlay;
  window.deleteCustomOverlay = deleteCustomOverlay;
  window.openCustomOverlay = openCustomOverlay;
  window.openCreateCustomOverlayDialog = openCreateCustomOverlayDialog;

})();
