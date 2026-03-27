/* ==========================================================
   DeliEasy v2 — js/home.js
   ホーム画面描画 + 編集モード（リッチリスト並び替え版）
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
    if (presets.length > 1 || _editMode) {
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

    /* === 編集モードヘッダー === */
    if (_editMode) {
      var topbarCfg = typeof getTopbarConfig === 'function' ? getTopbarConfig() : { show: true };
      var noTopbarClass = topbarCfg.show === false ? ' no-topbar' : '';
      html += '<div class="edit-mode-header' + noTopbarClass + '">';
      html += '<button class="btn btn-ghost btn-sm" onclick="exitEditMode()">キャンセル</button>';
      html += '<span class="fw6 fz-s">ホーム編集</span>';
      html += '<button class="btn btn-primary btn-sm" onclick="exitEditMode()">完了</button>';
      html += '</div>';
    }

    if (_editMode) {
      /* === 編集モード: リッチリスト表示 === */
      html += _renderEditList(preset);
    } else {
      /* === 通常モード: ウィジェットグリッド === */
      html += '<div class="widget-grid" id="widget-grid">';
      preset.widgets.forEach(function(w) {
        html += renderWidgetWrapper(w, false);
      });
      html += '</div>';
    }

    /* === 編集モード: 詳細設定 === */
    if (_editMode) {
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
    }

    /* === ヒント === */
    if (!_editMode && presets.length <= 1) {
      html += '<div class="text-c fz-xs c-muted mt16 mb8" style="opacity:.5">';
      html += 'ウィジェットを長押しでカスタマイズ';
      html += '</div>';
    }

    main.innerHTML = html;

    if (preset.widgets.some(function(w) { return w.id === 'clock'; })) {
      startWidgetClock();
    }

    if (_editMode) _initEditDrag();
    if (!_editMode) _initLongPress();
  }

  /* ========== 編集モード: リッチリスト描画 ========== */
  function _renderEditList(preset) {
    var widgets = preset.widgets;
    var html = '<div class="home-edit-list" id="home-edit-list">';

    /* half同士をペアにしてグリッド風に表示 */
    var i = 0;
    while (i < widgets.length) {
      var w = widgets[i];
      var def = WIDGET_DEFS[w.id];
      if (!def) { i++; continue; }
      var size = w.size || def.size || 'full';

      if (size === 'half' || size === 'compact') {
        /* halfの場合、次もhalfなら横並びペア */
        var nextW = (i + 1 < widgets.length) ? widgets[i + 1] : null;
        var nextDef = nextW ? WIDGET_DEFS[nextW.id] : null;
        var nextSize = nextW && nextDef ? (nextW.size || nextDef.size || 'full') : 'full';

        if (nextW && (nextSize === 'half' || nextSize === 'compact')) {
          /* 横並びペア */
          html += '<div class="home-edit-row home-edit-row-pair" data-row-start="' + i + '" data-row-count="2">';
          html += _renderEditItem(w, def, i, size);
          html += _renderEditItem(nextW, nextDef, i + 1, nextSize);
          html += '</div>';
          i += 2;
        } else {
          /* halfだけど次がfullまたは無い → 単独行 */
          html += '<div class="home-edit-row home-edit-row-single-half" data-row-start="' + i + '" data-row-count="1">';
          html += _renderEditItem(w, def, i, size);
          html += '</div>';
          i += 1;
        }
      } else {
        /* full → 1行 */
        html += '<div class="home-edit-row home-edit-row-full" data-row-start="' + i + '" data-row-count="1">';
        html += _renderEditItem(w, def, i, size);
        html += '</div>';
        i += 1;
      }
    }

    /* 追加ボタン */
    html += '<div class="home-edit-add" onclick="openWidgetPicker()">';
    html += '<span style="font-size:1.2rem">＋</span> ウィジェットを追加';
    html += '</div>';

    html += '</div>';
    return html;
  }

  function _renderEditItem(w, def, index, size) {
    var sizeLabel = size === 'full' ? 'FULL' : (size === 'compact' ? 'SM' : 'HALF');
    var sizeColor = size === 'full' ? 'var(--c-primary)' : 'var(--c-info)';

    var html = '<div class="home-edit-item" data-widget-idx="' + index + '">';
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
    html += '</div>';
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
    renderHome();
  };

  window._homeEditRemove = function(idx) {
    hp();
    var preset = getActivePreset();
    if (!preset || !preset.widgets[idx]) return;
    preset.widgets.splice(idx, 1);
    savePreset(preset);
    renderHome();
  };

  /* ========== ドラッグ並び替え（行ベース） ========== */
  function _initEditDrag() {
    var list = document.getElementById('home-edit-list');
    if (!list) return;

    var scrollContainer = list.closest('.overlay-body') || document.getElementById('main-content');

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

      _rebuildWidgetOrderFromDOM();

      dragRow = null;
      isDragging = false;
      window.__widgetDragActive = false;

      renderHome();
    }

    function onTouchCancel() {
      clearTimeout(longPressTimer);
      longPressTimer = null;

      if (isDragging && dragRow) {
        dragRow.classList.remove('home-edit-dragging');
        dragRow.style.position = '';
        dragRow.style.left = '';
        dragRow.style.top = '';
        dragRow.style.width = '';
        dragRow.style.zIndex = '';
        dragRow.style.pointerEvents = '';
        if (placeholder) placeholder.remove();
        placeholder = null;
        dragRow = null;
      }
      isDragging = false;
      window.__widgetDragActive = false;

      if (scrollContainer) {
        scrollContainer.style.overflowY = '';
      }
    }

    list.addEventListener('touchstart', onTouchStart, { passive: true });
    list.addEventListener('touchmove', onTouchMove, { passive: false });
    list.addEventListener('touchend', onTouchEnd, { passive: true });
    list.addEventListener('touchcancel', onTouchCancel, { passive: true });
  }

  /* DOMの順序からウィジェット配列を再構築 */
  function _rebuildWidgetOrderFromDOM() {
    var list = document.getElementById('home-edit-list');
    if (!list) return;

    var preset = getActivePreset();
    if (!preset) return;

    var oldWidgets = preset.widgets.slice();
    var newWidgets = [];

    var rows = list.querySelectorAll('.home-edit-row');
    rows.forEach(function(row) {
      var items = row.querySelectorAll('.home-edit-item');
      items.forEach(function(item) {
        var idx = parseInt(item.getAttribute('data-widget-idx'), 10);
        if (!isNaN(idx) && oldWidgets[idx]) {
          newWidgets.push(oldWidgets[idx]);
        }
      });
    });

    /* 念のため漏れがないかチェック */
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
    _editMode = true;
    if (typeof hideFab === 'function') hideFab();
    if (typeof hideBottombar === 'function') hideBottombar();
    renderHome();
  }

  function exitEditMode() {
    _editMode = false;
    if (typeof showFab === 'function') showFab();
    if (typeof showBottombar === 'function') showBottombar();
    renderHome();
    if (typeof renderTopbar === 'function') renderTopbar();
    if (typeof renderBottombar === 'function') renderBottombar();
  }

  function isEditMode() { return _editMode; }

  /* 旧API互換 */
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

  /* ========== ウィジェット追加ピッカー（画面を離れない版） ========== */
  function openWidgetPicker() {
    hp();
    var preset = getActivePreset();
    var currentWidgetIds = preset ? preset.widgets.map(function(w) { return w.id; }) : [];
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'widget-picker-dialog';

    _renderWidgetPickerContent(div, currentWidgetIds);
    document.body.appendChild(div);
  }

  function _renderWidgetPickerContent(container, currentWidgetIds) {
    /* 最新のIDリストを取得 */
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

  /* ピッカー内で追加（ダイアログを閉じない） */
  window._widgetPickerAdd = function(widgetId) {
    hp();
    addWidgetToPreset(widgetId);
    toast('✅ 追加しました');

    /* ピッカーの中身だけ更新（追加済みバッジを反映） */
    var dialog = document.getElementById('widget-picker-dialog');
    if (dialog) {
      _renderWidgetPickerContent(dialog);
    }

    /* 編集モードのリストも裏で更新（見えてはいないがデータは最新に） */
  };

  /* ピッカーを閉じて編集画面を更新 */
  window._widgetPickerClose = function() {
    var dialog = document.getElementById('widget-picker-dialog');
    if (dialog) dialog.remove();
    renderHome();
  };

  /* ========== 長押し検知 ========== */
  function _initLongPress() {
    var grid = document.getElementById('widget-grid');
    if (!grid) return;
    var timer = null;
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
  }

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
    _editMode = true;
    if (typeof hideFab === 'function') hideFab();
    if (typeof hideBottombar === 'function') hideBottombar();
    renderHome();
    setTimeout(function() {
      var advBody = document.getElementById('edit-advanced-body');
      var advHeader = advBody ? advBody.previousElementSibling : null;
      if (advBody && advBody.style.display === 'none') {
        advBody.style.display = '';
        if (advHeader) advHeader.classList.add('open');
      }
      if (advBody) {
        advBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  window.openEditAdvanced = openEditAdvanced;

})();
