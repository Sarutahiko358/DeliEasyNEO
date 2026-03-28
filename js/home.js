/* ==========================================================
   DeliEasy v2 — js/home.js
   ホーム画面描画 + 編集モード（リッチリスト並び替え版 — 修正版）
   ========================================================== */
(function(){
  'use strict';

  var _editMode = false;

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

  /* ========== 編集モード: リッチリスト描画 ========== */
  function _renderEditList(preset) {
    var widgets = preset.widgets;
    var html = '<div class="home-edit-list" id="home-edit-list">';

    /* ウィジェットを個別アイテムとしてフラットに表示（行グループ化はCSSで対応） */
    widgets.forEach(function(w, i) {
      var def = WIDGET_DEFS[w.id];
      if (!def) return;
      var size = w.size || def.size || 'full';
      html += '<div class="home-edit-item" data-widget-idx="' + i + '" data-widget-size="' + size + '">';
      html += _renderEditItemContent(w, def, i, size);
      html += '</div>';
    });

    /* 追加ボタン */
    html += '<div class="home-edit-add" onclick="openWidgetPicker()">';
    html += '<span style="font-size:1.2rem">＋</span> ウィジェットを追加';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function _renderEditItemContent(w, def, index, size) {
    var sizeLabel = size === 'full' ? 'FULL' : (size === 'compact' ? 'SM' : 'HALF');
    var sizeColor = size === 'full' ? 'var(--c-primary)' : 'var(--c-info)';

    var html = '';
    html += '<span class="home-edit-handle">☰</span>';
    html += '<span class="home-edit-icon">' + def.icon + '</span>';
    html += '<span class="home-edit-name">' + escHtml(def.name) + '</span>';
    html += '<span class="home-edit-size" style="color:' + sizeColor + '">' + sizeLabel + '</span>';

    /* サイズ変更ボタン */
    if (def.sizeOptions && def.sizeOptions.length > 1) {
      html += '<button class="home-edit-btn" onclick="event.stopPropagation();_homeEditCycleSize(' + index + ')" title="サイズ変更">↔</button>';
    }

    /* 削除ボタン */
    html += '<button class="home-edit-btn home-edit-btn-del" onclick="event.stopPropagation();_homeEditRemove(' + index + ')" title="削除">✕</button>';
    return html;
  }

  /* ========== 編集操作 ========== */
  window._homeEditCycleSize = function(idx) {
    hp();
    var preset = getActivePreset();
    if (!preset || !preset.widgets[idx]) return;
    var w = preset.widgets[idx];
    var def = WIDGET_DEFS[w.id];
    if (!def || !def.sizeOptions || def.sizeOptions.length < 2) return;
    var curSize = w.size || def.size;
    var curIdx = def.sizeOptions.indexOf(curSize);
    var nextIdx = (curIdx + 1) % def.sizeOptions.length;
    preset.widgets[idx].size = def.sizeOptions[nextIdx];
    savePreset(preset);
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
  };

  window._homeEditRemove = function(idx) {
    hp();
    var preset = getActivePreset();
    if (!preset || !preset.widgets[idx]) return;
    preset.widgets.splice(idx, 1);
    savePreset(preset);
    var body = document.getElementById('overlay-body-homeEdit');
    if (body) renderOverlay_homeEdit(body);
  };

  /* ========== ドラッグ並び替え（修正版：アイテム単位でドラッグ） ========== */
  function _initEditDrag() {
    var list = document.getElementById('home-edit-list');
    if (!list) return;

    var scrollContainer = list.closest('.overlay-body') || document.getElementById('main-content');

    var LONG_PRESS_MS = 350;
    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0;
    var startX = 0;
    var offsetY = 0;
    var isDragging = false;
    var isMouseDown = false;

    function getItems() {
      return Array.from(list.querySelectorAll('.home-edit-item'));
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e, isMouse) {
      /* ボタンクリックはドラッグ開始しない */
      if (e.target.closest('.home-edit-btn')) return;
      var item = e.target.closest('.home-edit-item');
      if (!item) return;
      /* itemがlistの直接の子であることを確認 */
      if (item.parentNode !== list) return;
      if (isMouse && e.button !== 0) return;

      var pos = _getXY(e);
      startY = pos.y;
      startX = pos.x;
      if (isMouse) isMouseDown = true;

      longPressTimer = setTimeout(function() {
        /* ドラッグ開始時に再度itemの存在確認 */
        if (!item.parentNode || item.parentNode !== list) {
          isMouseDown = false;
          return;
        }

        isDragging = true;
        dragItem = item;

        window.__widgetDragActive = true;

        if (scrollContainer) {
          scrollContainer.style.overflowY = 'hidden';
        }

        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        var rect = dragItem.getBoundingClientRect();
        offsetY = startY - rect.top;

        placeholder = document.createElement('div');
        placeholder.className = 'home-edit-placeholder';
        placeholder.style.height = rect.height + 'px';
        list.insertBefore(placeholder, dragItem);

        dragItem.classList.add('home-edit-dragging');
        dragItem.style.position = 'fixed';
        dragItem.style.left = rect.left + 'px';
        dragItem.style.top = rect.top + 'px';
        dragItem.style.width = rect.width + 'px';
        dragItem.style.zIndex = '10000';
        dragItem.style.pointerEvents = 'none';

        if (navigator.vibrate) navigator.vibrate(30);
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
      var pos = _getXY(e);

      if (!isDragging && longPressTimer) {
        var dy = Math.abs(pos.y - startY);
        var dx = Math.abs(pos.x - startX);
        if (dy > 8 || dx > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }

      if (!isDragging || !dragItem || !placeholder) return;
      if (e.preventDefault) e.preventDefault();

      dragItem.style.top = (pos.y - offsetY) + 'px';

      /* placeholderがlistの子であることを確認 */
      if (placeholder.parentNode !== list) return;

      var items = getItems().filter(function(el) { return el !== dragItem; });
      var inserted = false;
      for (var i = 0; i < items.length; i++) {
        /* items[i]がlistの子であることを確認 */
        if (items[i].parentNode !== list) continue;
        var r = items[i].getBoundingClientRect();
        if (pos.y < r.top + r.height / 2) {
          list.insertBefore(placeholder, items[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        var addBtn = list.querySelector('.home-edit-add');
        if (addBtn && addBtn.parentNode === list) {
          list.insertBefore(placeholder, addBtn);
        }
      }
    }

    function onPointerEnd() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;

      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (!isDragging || !dragItem) {
        window.__widgetDragActive = false;
        return;
      }

      dragItem.classList.remove('home-edit-dragging');
      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.zIndex = '';
      dragItem.style.pointerEvents = '';

      if (placeholder && placeholder.parentNode === list) {
        list.insertBefore(dragItem, placeholder);
        placeholder.remove();
      } else if (placeholder && placeholder.parentNode) {
        placeholder.remove();
      }
      placeholder = null;

      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }

      /* DOMの順序からウィジェット配列を再構築 */
      _rebuildWidgetOrderFromDOM();

      dragItem = null;
      isDragging = false;
      window.__widgetDragActive = false;

      /* 再描画 */
      var body = document.getElementById('overlay-body-homeEdit');
      if (body) renderOverlay_homeEdit(body);
    }

    function onPointerCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;

      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (isDragging && dragItem) {
        dragItem.classList.remove('home-edit-dragging');
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        if (placeholder && placeholder.parentNode) placeholder.remove();
        placeholder = null;
        dragItem = null;
      }
      isDragging = false;
      window.__widgetDragActive = false;

      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }
    }

    /* Touch events */
    list.addEventListener('touchstart', function(e) { onPointerDown(e, false); }, { passive: true });
    list.addEventListener('touchmove', function(e) { onPointerMove(e); }, { passive: false });
    list.addEventListener('touchend', function() { onPointerEnd(); }, { passive: true });
    list.addEventListener('touchcancel', function() { onPointerCancel(); }, { passive: true });

    /* Mouse events — documentに登録するため重複防止 */
    if (window.__homeEditMouseMove) {
      document.removeEventListener('mousemove', window.__homeEditMouseMove);
    }
    if (window.__homeEditMouseUp) {
      document.removeEventListener('mouseup', window.__homeEditMouseUp);
    }

    window.__homeEditMouseMove = function(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    };
    window.__homeEditMouseUp = function() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    };

    list.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', window.__homeEditMouseMove);
    document.addEventListener('mouseup', window.__homeEditMouseUp);
    list.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });
  }

  /* DOMの順序からウィジェット配列を再構築（修正版：アイテム単位） */
  function _rebuildWidgetOrderFromDOM() {
    var list = document.getElementById('home-edit-list');
    if (!list) return;

    var preset = getActivePreset();
    if (!preset) return;

    var oldWidgets = preset.widgets.slice();
    var newWidgets = [];

    /* フラットにアイテムを列挙 */
    var items = list.querySelectorAll('.home-edit-item');
    items.forEach(function(item) {
      var idx = parseInt(item.getAttribute('data-widget-idx'), 10);
      if (!isNaN(idx) && idx >= 0 && idx < oldWidgets.length) {
        newWidgets.push(oldWidgets[idx]);
      }
    });

    /* 漏れがないかチェック */
    if (newWidgets.length === oldWidgets.length) {
      preset.widgets = newWidgets;
      savePreset(preset);
    }
  }

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
    var preset = getActivePreset();
    var currentWidgetIds = preset ? preset.widgets.map(function(w) { return w.id; }) : [];
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'widget-picker-dialog';

    _renderWidgetPickerContent(div, currentWidgetIds);
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) {
        div.remove();
        /* 編集画面を更新 */
        var body = document.getElementById('overlay-body-homeEdit');
        if (body) renderOverlay_homeEdit(body);
        renderHome();
      }
    });
  }

  function _renderWidgetPickerContent(container, currentWidgetIds) {
    if (!currentWidgetIds) {
      var preset = getActivePreset();
      currentWidgetIds = preset ? preset.widgets.map(function(w) { return w.id; }) : [];
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
    var startX = 0, startY = 0;

    grid.addEventListener('touchstart', function(e) {
      var widget = e.target.closest('.widget');
      if (!widget) return;
      timer = setTimeout(function() {
        hp();
        enterEditMode();
      }, 600);
    }, { passive: true });
    grid.addEventListener('touchend', function() { clearTimeout(timer); }, { passive: true });
    grid.addEventListener('touchmove', function() { clearTimeout(timer); }, { passive: true });

    grid.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      var widget = e.target.closest('.widget');
      if (!widget) return;
      startX = e.clientX;
      startY = e.clientY;
      timer = setTimeout(function() {
        hp();
        enterEditMode();
      }, 600);
    });
    grid.addEventListener('mouseup', function() { clearTimeout(timer); });
    grid.addEventListener('mousemove', function(e) {
      if (timer) {
        var dx = Math.abs(e.clientX - startX);
        var dy = Math.abs(e.clientY - startY);
        if (dx > 5 || dy > 5) clearTimeout(timer);
      }
    });
    grid.addEventListener('mouseleave', function() { clearTimeout(timer); });
  }

  /* ========== ホーム編集オーバーレイ ========== */
  function renderOverlay_homeEdit(body) {
    if (!body) return;
    var preset = getActivePreset();
    if (!preset) { body.innerHTML = '<div class="text-c c-muted fz-s" style="padding:60px">プリセットがありません</div>'; return; }
    var presets = getPresets();
    var html = '';

    if (presets.length > 1) {
      html += '<div class="preset-bar">';
      html += '<div class="preset-bar-scroll">';
      presets.forEach(function(p) {
        var isActive = preset.id === p.id;
        html += '<button class="preset-tab' + (isActive ? ' active' : '') + '" onclick="_homeEditSwitchPreset(\'' + escJs(p.id) + '\')">' + escHtml(p.name) + '</button>';
      });
      html += '<button class="preset-tab preset-tab-add" onclick="openPresetMenu()">+</button>';
      html += '</div>';
      html += '</div>';
    }

    html += _renderEditList(preset);

    html += '<div class="card mb12">';
    html += '<div class="card-header" onclick="this.classList.toggle(\'open\');var b=document.getElementById(\'edit-advanced-body\');b.style.display=b.style.display===\'none\'?\'\':\'none\'">';
    html += '<span>⚙️ 詳細設定</span><span class="card-arrow">▼</span>';
    html += '</div>';
    html += '<div class="card-body" id="edit-advanced-body" style="display:none">';
    if (typeof renderTopbarSettings === 'function') html += renderTopbarSettings();
    if (typeof renderBottombarSettings === 'function') html += renderBottombarSettings();
    if (typeof renderRightPanelSettings === 'function') html += renderRightPanelSettings();
    if (typeof renderFabSettings === 'function') html += renderFabSettings();
    html += '</div></div>';

    body.innerHTML = html;
    _initEditDrag();
  }
  window.renderOverlay_homeEdit = renderOverlay_homeEdit;

  window._homeEditSwitchPreset = function(id) {
    hp();
    setActivePreset(id);
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
    if (typeof renderTopbarSettings === 'function') html += renderTopbarSettings();
    if (typeof renderBottombarSettings === 'function') html += renderBottombarSettings();
    if (typeof renderRightPanelSettings === 'function') html += renderRightPanelSettings();
    if (typeof renderFabSettings === 'function') html += renderFabSettings();
    html += '</div>';
    body.innerHTML = html;
  }
  window.renderOverlay_detailSettings = renderOverlay_detailSettings;

  window.openEditAdvanced = openEditAdvanced;

})();
