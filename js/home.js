/* ==========================================================
   DeliEasy v2 — js/home.js
   ホーム画面描画 + グリッドベース編集UI（モバイル/デスクトップ個別管理版）
   ========================================================== */
(function(){
  'use strict';

  var _editMode = false;
  var _homeEditCurrentMode = null; // null = 自動検出

  /* ========== メイン描画 ========== */
  function renderHome() {
    var main = document.getElementById('main-content');
    if (!main) return;

    var preset = getActivePreset();
    if (!preset) return;
    var presets = getPresets();
    var html = '';

    /* === プリセットバー === */
    if (presets.length > 1) {
      html += '<div class="preset-bar">';
      html += '<div class="preset-bar-scroll">';
      presets.forEach(function(p) {
        var isActive = preset.id === p.id;
        html += '<button class="preset-tab' + (isActive ? ' active' : '') + '" onclick="switchPreset(\'' + escJs(p.id) + '\')">' + escHtml(p.name) + '</button>';
      });
      html += '<button class="preset-tab preset-tab-add" onclick="openPresetMenu()">+</button>';
      html += '</div>';
      html += '</div>';
    }

    /* === 通常モード: ウィジェットグリッド === */
    html += '<div class="widget-grid" id="widget-grid">';
    preset.widgets.forEach(function(w) {
      html += renderWidgetWrapper(w, false);
    });
    html += '</div>';

    /* === ヒント === */
    if (presets.length <= 1) {
      html += '<div class="text-c fz-xs c-muted mt16 mb8" style="opacity:.5">';
      html += 'ウィジェットを長押しでカスタマイズ';
      html += '</div>';
    }

    main.innerHTML = html;

    if (preset.widgets.some(function(w) { return w.id === 'clock'; })) {
      startWidgetClock();
    }

    _initLongPress();
  }

  /* ========== 編集操作（グリッドベース） ========== */
  window._gridEditorRemove = function(idx) {
    hp();
    var rawPreset = getActivePresetRaw();
    var editMode = _getDeviceMode();
    var modeData = getPresetModeData(rawPreset, editMode);
    if (!modeData || !modeData.widgets[idx]) return;
    modeData.widgets.splice(idx, 1);
    savePresetModeData(rawPreset, editMode, modeData);
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
    renderHome();
  };

  window._gridEditorCycleSize = function(idx) {
    hp();
    var rawPreset = getActivePresetRaw();
    var editMode = _getDeviceMode();
    var modeData = getPresetModeData(rawPreset, editMode);
    if (!modeData || !modeData.widgets[idx]) return;
    var w = modeData.widgets[idx];
    var def = WIDGET_DEFS[w.id];
    if (!def || !def.sizeOptions || def.sizeOptions.length < 2) return;

    var options = def.sizeOptions;
    if (editMode === 'mobile') {
      options = options.filter(function(s) { return s !== 'wide'; });
    }
    if (options.length < 2) return;

    var curIdx = options.indexOf(w.size || def.size);
    var nextIdx = (curIdx + 1) % options.length;
    modeData.widgets[idx].size = options[nextIdx];
    savePresetModeData(rawPreset, editMode, modeData);
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
    renderHome();
  };

  window._homeEditCurrentMode = null;

  /* ========== グリッドエディタのドラッグ&ドロップ ========== */
  function _initGridEditorDrag(options) {
    var grid = document.getElementById(options.gridId);
    if (!grid) return;

    var scrollContainer = grid.closest('.overlay-body');
    var LONG_PRESS_MS = 400;
    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0, startX = 0;
    var offsetX = 0, offsetY = 0;
    var isDragging = false;
    var isMouseDown = false;

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

    function getItems() {
      return Array.from(grid.querySelectorAll('.grid-editor-item'));
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e, isMouse) {
      if (e.target.closest('.grid-editor-btn')) return;
      var item = e.target.closest('.grid-editor-item');
      if (!item) return;
      if (isMouse && e.button !== 0) return;

      var pos = _getXY(e);
      startX = pos.x;
      startY = pos.y;
      if (isMouse) isMouseDown = true;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragItem = item;
        window.__widgetDragActive = true;

        if (scrollContainer) scrollContainer.style.overflowY = 'hidden';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        var rect = dragItem.getBoundingClientRect();
        _txOff = _getFixedOffset(dragItem);
        offsetX = startX - rect.left;
        offsetY = startY - rect.top;

        placeholder = document.createElement('div');
        placeholder.className = 'grid-editor-placeholder ' + dragItem.className.replace('grid-editor-item', '').replace('grid-editor-dragging', '').trim();
        placeholder.style.height = rect.height + 'px';
        grid.insertBefore(placeholder, dragItem);

        dragItem.classList.add('grid-editor-dragging');
        dragItem.style.position = 'fixed';
        dragItem.style.left = (rect.left - _txOff.x) + 'px';
        dragItem.style.top = (rect.top - _txOff.y) + 'px';
        dragItem.style.width = rect.width + 'px';
        dragItem.style.height = rect.height + 'px';
        dragItem.style.zIndex = '10000';
        dragItem.style.pointerEvents = 'none';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
      var pos = _getXY(e);
      if (!isDragging && longPressTimer) {
        if (Math.abs(pos.x - startX) > 8 || Math.abs(pos.y - startY) > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragItem) return;
      if (e.preventDefault) e.preventDefault();

      dragItem.style.left = (pos.x - offsetX - _txOff.x) + 'px';
      dragItem.style.top = (pos.y - offsetY - _txOff.y) + 'px';

      var items = getItems().filter(function(el) { return el !== dragItem; });
      var addBtn = grid.querySelector('.widget-add');
      var inserted = false;

      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var centerX = r.left + r.width / 2;
        var centerY = r.top + r.height / 2;

        if (pos.y < centerY && pos.x < centerX + r.width) {
          grid.insertBefore(placeholder, items[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        if (addBtn) grid.insertBefore(placeholder, addBtn);
      }
    }

    function onPointerEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (!isDragging || !dragItem) {
        isDragging = false;
        window.__widgetDragActive = false;
        return;
      }

      dragItem.classList.remove('grid-editor-dragging');
      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.height = '';
      dragItem.style.zIndex = '';
      dragItem.style.pointerEvents = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragItem, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      if (scrollContainer) scrollContainer.style.overflowY = '';

      /* DOMの順序からウィジェット配列を再構築 */
      if (typeof options.onReorder === 'function') {
        var oldWidgets = options.getWidgets();
        var newWidgets = [];
        getItems().forEach(function(el) {
          var idx = parseInt(el.getAttribute('data-widget-idx'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < oldWidgets.length) {
            newWidgets.push(oldWidgets[idx]);
          }
        });
        if (newWidgets.length === oldWidgets.length) {
          options.onReorder(newWidgets);
        }
      }

      dragItem = null;
      isDragging = false;
      window.__widgetDragActive = false;

      if (typeof options.onDragEnd === 'function') options.onDragEnd();
    }

    function onPointerCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      if (dragItem) {
        dragItem.classList.remove('grid-editor-dragging');
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.height = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        if (placeholder) placeholder.remove();
      }
      dragItem = null;
      placeholder = null;
      isDragging = false;
      window.__widgetDragActive = false;
      if (scrollContainer) scrollContainer.style.overflowY = '';
    }

    grid.addEventListener('touchstart', function(e) { onPointerDown(e, false); }, { passive: true });
    grid.addEventListener('touchmove', function(e) { onPointerMove(e); }, { passive: false });
    grid.addEventListener('touchend', function() { onPointerEnd(); }, { passive: true });
    grid.addEventListener('touchcancel', function() { onPointerCancel(); }, { passive: true });

    grid.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', function(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    });
    document.addEventListener('mouseup', function() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    });
    grid.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });
  }
  window._initGridEditorDrag = _initGridEditorDrag;

  /* ========== プリセット切替 ========== */
  function switchPreset(id) {
    hp();
    setActivePreset(id);
    renderHome();
    if (typeof renderTopbar === 'function') renderTopbar();
    if (typeof renderBottombar === 'function') renderBottombar();
  }

  /* ========== プリセットメニュー ========== */
  function openPresetMenu() {
    hp();
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    var h = '<div class="confirm-box" style="width:320px;text-align:left">';
    h += '<h3 class="fz-s fw6 mb12 text-c">プリセット管理</h3>';

    h += '<div class="fz-xs fw6 c-secondary mb8">テンプレートから作成</div>';
    PRESET_TEMPLATES.forEach(function(tpl, i) {
      h += '<button class="btn btn-secondary btn-sm btn-block mb8" onclick="createFromTemplate(' + i + ')">';
      h += escHtml(tpl.name) + ' <span class="fz-xs c-muted">- ' + escHtml(tpl.desc) + '</span>';
      h += '</button>';
    });

    var presets = getPresets();
    if (presets.length > 0) {
      h += '<div class="fz-xs fw6 c-secondary mb8 mt12">既存プリセット</div>';
      presets.forEach(function(p) {
        h += '<div class="flex flex-between mb8">';
        h += '<span class="fz-s">' + escHtml(p.name) + '</span>';
        h += '<div class="flex gap4">';
        h += '<button class="btn btn-secondary btn-xs" onclick="renamePresetDialog(\'' + escJs(p.id) + '\')">名前</button>';
        h += '<button class="btn btn-secondary btn-xs" onclick="dupPreset(\'' + escJs(p.id) + '\')">複製</button>';
        if (presets.length > 1) {
          h += '<button class="btn btn-danger btn-xs" onclick="delPreset(\'' + escJs(p.id) + '\')">削除</button>';
        }
        h += '</div></div>';
      });
    }

    h += '<button class="btn btn-ghost btn-block mt12" onclick="this.closest(\'.confirm-overlay\').remove()">閉じる</button>';
    h += '</div>';
    div.innerHTML = h;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });
  }

  window.createFromTemplate = function(i) {
    var p = createPresetFromTemplate(i);
    if (p) {
      setActivePreset(p.id);
      toast('✅ プリセット「' + p.name + '」を作成しました');
    }
    document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
    renderHome();
  };

  window.renamePresetDialog = function(id) {
    var presets = getPresets();
    var p = presets.find(function(x) { return x.id === id; });
    if (!p) return;
    document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
    customPrompt('プリセット名を入力', p.name, function(val) {
      if (val && val.trim()) {
        p.name = val.trim();
        savePreset(p);
        renderHome();
      }
    });
  };

  window.dupPreset = function(id) {
    var p = duplicatePreset(id);
    if (p) toast('✅ コピーしました');
    document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
    renderHome();
  };

  window.delPreset = function(id) {
    document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
    customConfirm('このプリセットを削除しますか？', function() {
      deletePreset(id);
      toast('🗑 削除しました');
      renderHome();
    });
  };

  /* ========== 編集モード ========== */
  function enterEditMode() {
    if (typeof openOverlay === 'function') {
      openOverlay('homeEdit');
    }
  }

  function exitEditMode() {
    if (typeof closeOverlay === 'function') {
      closeOverlay();
    }
    _homeEditCurrentMode = null;
    renderHome();
    if (typeof renderTopbar === 'function') renderTopbar();
    if (typeof renderBottombar === 'function') renderBottombar();
  }

  function isEditMode() {
    return typeof getTopOverlayId === 'function' && getTopOverlayId() === 'homeEdit';
  }

  window.removeWidget = function(widgetId) {
    hp();
    removeWidgetFromPreset(widgetId);
    renderHome();
  };

  window.cycleWidgetSize = function(widgetId) {
    hp();
    cycleWidgetSizeInPreset(widgetId);
    renderHome();
  };

  /* ========== ウィジェット追加ピッカー ========== */
  function openWidgetPicker() {
    hp();
    var rawPreset = getActivePresetRaw();
    var editMode = _getDeviceMode();
    var modeData = getPresetModeData(rawPreset, editMode);
    var currentWidgetIds = modeData && modeData.widgets ? modeData.widgets.map(function(w) { return w.id; }) : [];
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'widget-picker-dialog';

    _renderWidgetPickerContent(div, currentWidgetIds);
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) {
        div.remove();
        var body = document.getElementById('overlay-body-homeEdit');
        if (body) renderOverlay_homeEdit(body);
        renderHome();
      }
    });
  }

  function _renderWidgetPickerContent(container, currentWidgetIds) {
    if (!currentWidgetIds) {
      var rawPreset = getActivePresetRaw();
      var editMode = _getDeviceMode();
      var modeData = getPresetModeData(rawPreset, editMode);
      currentWidgetIds = modeData && modeData.widgets ? modeData.widgets.map(function(w) { return w.id; }) : [];
    }

    var h = '<div class="confirm-box" style="width:340px;max-height:80vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb8 text-c">ウィジェットを追加</h3>';
    h += '<div class="fz-xs c-muted mb12 text-c">タップで追加。続けて複数追加できます。</div>';

    WIDGET_CATEGORIES.forEach(function(cat) {
      var items = Object.values(WIDGET_DEFS).filter(function(w) { return w.category === cat.id; });
      if (items.length === 0) return;
      h += '<div class="fz-xs fw6 c-secondary mb8 mt8">' + cat.icon + ' ' + escHtml(cat.name) + '</div>';
      items.forEach(function(w) {
        var count = 0;
        currentWidgetIds.forEach(function(id) { if (id === w.id) count++; });
        var badge = '';
        if (count > 0) {
          badge = ' <span class="fz-xxs" style="background:var(--c-success-light);color:var(--c-success);padding:1px 6px;border-radius:980px;margin-left:4px">追加済み' + (count > 1 ? ' ×' + count : '') + '</span>';
        }
        h += '<button class="btn btn-secondary btn-sm btn-block mb4" style="text-align:left;justify-content:flex-start" onclick="_widgetPickerAdd(\'' + escJs(w.id) + '\')">';
        h += w.icon + ' ' + escHtml(w.name) + badge;
        h += ' <span class="fz-xs c-muted">- ' + escHtml(w.desc) + '</span>';
        h += '</button>';
      });
    });

    h += '<button class="btn btn-primary btn-block mt12" onclick="_widgetPickerClose()">完了</button>';
    h += '</div>';

    container.innerHTML = h;
  }

  window._widgetPickerAdd = function(widgetId) {
    hp();
    addWidgetToPreset(widgetId);
    toast('✅ 追加しました');
    var dialog = document.getElementById('widget-picker-dialog');
    if (dialog) {
      _renderWidgetPickerContent(dialog);
    }
  };

  window._widgetPickerClose = function() {
    var dialog = document.getElementById('widget-picker-dialog');
    if (dialog) dialog.remove();
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
    renderHome();
  };

  /* ========== 長押し検知 ========== */
  function _initLongPress() {
    var grid = document.getElementById('widget-grid');
    if (!grid) return;
    var timer = null;
    var _lpActive = false;

    grid.addEventListener('touchstart', function(e) {
      var widget = e.target.closest('.widget');
      if (!widget) return;
      _lpActive = true;
      timer = setTimeout(function() {
        _lpActive = false;
        hp();
        enterEditMode();
      }, 500);
    }, { passive: true });
    grid.addEventListener('touchend', function(e) {
      clearTimeout(timer);
      timer = null;
      _lpActive = false;
    }, { passive: true });
    grid.addEventListener('touchmove', function(e) {
      if (_lpActive) {
        clearTimeout(timer);
        timer = null;
        _lpActive = false;
      }
    }, { passive: true });
    grid.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      var widget = e.target.closest('.widget');
      if (!widget) return;
      var startX = e.clientX;
      var startY = e.clientY;
      timer = setTimeout(function() {
        hp();
        enterEditMode();
      }, 500);
      grid.addEventListener('mouseup', function clearMouse() {
        clearTimeout(timer);
        grid.removeEventListener('mouseup', clearMouse);
        grid.removeEventListener('mousemove', moveMouse);
        grid.removeEventListener('mouseleave', clearMouse);
      });
      function moveMouse(ev) {
        if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) {
          clearTimeout(timer);
        }
      }
      grid.addEventListener('mousemove', moveMouse);
      grid.addEventListener('mouseleave', function clearMouse() {
        clearTimeout(timer);
        grid.removeEventListener('mouseleave', clearMouse);
        grid.removeEventListener('mousemove', moveMouse);
      });
    });
  }

  /* ========== ホーム編集オーバーレイ（グリッドベース） ========== */
  function renderOverlay_homeEdit(body) {
    if (!body) return;
    var rawPreset = getActivePresetRaw();
    if (!rawPreset) { body.innerHTML = '<div class="text-c c-muted fz-s" style="padding:60px">プリセットがありません</div>'; return; }

    var mode = _getDeviceMode();
    var presets = getPresets();
    var html = '';

    /* プリセット切替バー */
    if (presets.length > 1) {
      html += '<div class="preset-bar"><div class="preset-bar-scroll">';
      presets.forEach(function(p) {
        var isActive = rawPreset.id === p.id;
        html += '<button class="preset-tab' + (isActive ? ' active' : '') + '" onclick="_homeEditSwitchPreset(\'' + escJs(p.id) + '\')">' + escHtml(p.name) + '</button>';
      });
      html += '<button class="preset-tab preset-tab-add" onclick="openPresetMenu()">+</button>';
      html += '</div></div>';
    }

    var editMode = mode;
    var modeData = getPresetModeData(rawPreset, editMode);
    if (!modeData) modeData = { widgets: [] };
    var widgets = modeData.widgets || [];

    var columns = editMode === 'desktop' ? 4 : 2;

    /* グリッドベース編集UI */
    html += '<div class="grid-editor widget-grid' + (editMode === 'desktop' ? ' grid-editor-desktop' : '') + ' widget-grid-editing" ';
    html += 'id="grid-editor" data-columns="' + columns + '" data-mode="' + editMode + '">';

    widgets.forEach(function(w, i) {
      var def = WIDGET_DEFS[w.id];
      if (!def) return;
      var size = w.size || def.size || 'full';
      var sizeClass = 'widget-' + size;

      html += '<div class="widget ' + sizeClass + ' grid-editor-item" data-widget-idx="' + i + '" data-widget-size="' + size + '">';

      html += '<div class="grid-editor-controls">';
      html += '<button class="grid-editor-btn grid-editor-btn-del" onclick="event.stopPropagation();_gridEditorRemove(' + i + ')" title="削除">✕</button>';
      var _effectiveOptions = def.sizeOptions ? def.sizeOptions.slice() : [];
      if (editMode === 'mobile') {
        _effectiveOptions = _effectiveOptions.filter(function(s) { return s !== 'wide'; });
      }
      if (_effectiveOptions.length > 1) {
        html += '<button class="grid-editor-btn grid-editor-btn-size" onclick="event.stopPropagation();_gridEditorCycleSize(' + i + ')" title="サイズ変更">↔</button>';
      }
      html += '</div>';

      var sizeLabel = size === 'full' ? 'FULL' : (size === 'wide' ? 'WIDE' : 'HALF');
      html += '<div class="grid-editor-size-label">' + sizeLabel + '</div>';

      html += '<div class="widget-title"><span>' + def.icon + ' ' + escHtml(def.name) + '</span></div>';
      html += '<div class="grid-editor-preview">';
      try { html += def.render(w); } catch(e) { html += '<div class="widget-empty">プレビュー</div>'; }
      html += '</div>';

      html += '</div>';
    });

    /* 追加ボタン */
    html += '<div class="widget widget-add widget-full" onclick="openWidgetPicker()">';
    html += '<div class="widget-add-inner"><span style="font-size:1.2rem">＋</span> ウィジェットを追加</div>';
    html += '</div>';

    html += '</div>';

    /* 詳細設定 */
    html += '<div class="card mb12">';
    html += '<div class="card-header" onclick="this.classList.toggle(\'open\');var b=document.getElementById(\'edit-advanced-body\');b.style.display=b.style.display===\'none\'?\'\':\'none\';if(b.style.display!==\'none\'){if(typeof _initSidebarSortDrag===\'function\')setTimeout(_initSidebarSortDrag,100)}">';
    html += '<span>⚙️ 詳細設定</span><span class="card-arrow">▼</span>';
    html += '</div>';
    html += '<div class="card-body" id="edit-advanced-body" style="display:none">';
    if (typeof renderSidebarSettings === 'function') html += renderSidebarSettings();
    if (typeof renderTopbarSettings === 'function') html += renderTopbarSettings();
    if (typeof renderBottombarSettings === 'function') html += renderBottombarSettings();
    if (typeof renderRightPanelSettings === 'function') html += renderRightPanelSettings();
    if (typeof renderFabSettings === 'function') html += renderFabSettings();
    html += '</div></div>';

    body.innerHTML = html;

    /* ドラッグ初期化 */
    _initGridEditorDrag({
      gridId: 'grid-editor',
      getWidgets: function() {
        var rp = getActivePresetRaw();
        var em = _getDeviceMode();
        var md = getPresetModeData(rp, em);
        return md && md.widgets ? md.widgets.slice() : [];
      },
      onReorder: function(newWidgets) {
        var rp = getActivePresetRaw();
        var em = _getDeviceMode();
        var md = getPresetModeData(rp, em);
        if (md) {
          md.widgets = newWidgets;
          savePresetModeData(rp, em, md);
        }
      },
      onDragEnd: function() {
        var b = document.getElementById('overlay-body-homeEdit');
        if (b) renderOverlay_homeEdit(b);
        renderHome();
      }
    });

    if (widgets.some(function(w) { return w.id === 'clock'; })) {
      startWidgetClock();
    }
  }
  window.renderOverlay_homeEdit = renderOverlay_homeEdit;

  window._homeEditSwitchPreset = function(id) {
    hp();
    setActivePreset(id);
    _homeEditCurrentMode = null;
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
    renderHome();
    if (typeof renderTopbar === 'function') renderTopbar();
    if (typeof renderBottombar === 'function') renderBottombar();
  };

  /* ========== Expose ========== */
  window.renderHome = renderHome;
  window.renderHomeWidgets = renderHome;
  window.refreshHome = renderHome;
  window.enterEditMode = enterEditMode;
  window.exitEditMode = exitEditMode;
  window.isEditMode = isEditMode;
  window.switchPreset = switchPreset;
  window.openPresetMenu = openPresetMenu;
  window.openWidgetPicker = openWidgetPicker;

  function openEditAdvanced() {
    if (typeof openOverlay === 'function') {
      openOverlay('detailSettings');
    }
  }

  function renderOverlay_detailSettings(body) {
    if (!body) return;
    var html = '';
    html += '<div style="margin-bottom:16px">';
    if (typeof renderSidebarSettings === 'function') html += renderSidebarSettings();
    if (typeof renderTopbarSettings === 'function') html += renderTopbarSettings();
    if (typeof renderBottombarSettings === 'function') html += renderBottombarSettings();
    if (typeof renderRightPanelSettings === 'function') html += renderRightPanelSettings();
    if (typeof renderFabSettings === 'function') html += renderFabSettings();
    html += '</div>';
    body.innerHTML = html;

    requestAnimationFrame(function() {
      if (typeof _initSidebarSortDrag === 'function') _initSidebarSortDrag();
    });
  }
  window.renderOverlay_detailSettings = renderOverlay_detailSettings;

  window.openEditAdvanced = openEditAdvanced;

})();
