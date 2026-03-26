/* ==========================================================
   DeliEasy v2 — js/home.js
   ホーム画面描画 + 編集モード
   ========================================================== */
(function(){
  'use strict';

  var _editMode = false;
  var _dragFrom = -1;

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
      /* トップバーの表示状態を確認してクラスを付与 */
      var topbarCfg = typeof getTopbarConfig === 'function' ? getTopbarConfig() : { show: true };
      var noTopbarClass = topbarCfg.show === false ? ' no-topbar' : '';
      html += '<div class="edit-mode-header' + noTopbarClass + '">';
      html += '<button class="btn btn-ghost btn-sm" onclick="exitEditMode()">キャンセル</button>';
      html += '<span class="fw6 fz-s">ホーム編集</span>';
      html += '<button class="btn btn-primary btn-sm" onclick="exitEditMode()">完了</button>';
      html += '</div>';
    }

    /* === ウィジェットグリッド === */
    html += '<div class="widget-grid' + (_editMode ? ' widget-grid-editing' : '') + '" id="widget-grid">';
    preset.widgets.forEach(function(w, i) {
      html += renderWidgetWrapper(w, _editMode);
    });

    /* 編集モード時: 追加ボタン */
    if (_editMode) {
      html += '<div class="widget widget-full widget-add" onclick="openWidgetPicker()">';
      html += '<div class="widget-add-inner">＋ ウィジェットを追加</div>';
      html += '</div>';
    }
    html += '</div>';

    /* === 編集モード: 詳細設定（トップバー・ボトムバー・右パネル） === */
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

    /* === 編集モードでない時のヒント === */
    if (!_editMode && presets.length <= 1) {
      html += '<div class="text-c fz-xs c-muted mt16 mb8" style="opacity:.5">';
      html += 'ウィジェットを長押しでカスタマイズ';
      html += '</div>';
    }

    main.innerHTML = html;

    /* 時計ウィジェットがあれば開始 */
    if (preset.widgets.some(function(w) { return w.id === 'clock'; })) {
      startWidgetClock();
    }

    /* 編集モード時ドラッグ有効化 */
    if (_editMode) _initDrag();

    /* 長押し検知 */
    if (!_editMode) _initLongPress();
  }

  /* ========== プリセット切替 ========== */
  function switchPreset(id) {
    hp();
    setActivePreset(id);
    renderHome();
    /* プリセット切替時にトップバー・ボトムバーも再描画 */
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

    /* テンプレートから作成 */
    h += '<div class="fz-xs fw6 c-secondary mb8">テンプレートから作成</div>';
    PRESET_TEMPLATES.forEach(function(tpl, i) {
      h += '<button class="btn btn-secondary btn-sm btn-block mb8" onclick="createFromTemplate(' + i + ')">';
      h += escHtml(tpl.name) + ' <span class="fz-xs c-muted">- ' + escHtml(tpl.desc) + '</span>';
      h += '</button>';
    });

    /* 既存プリセット操作 */
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
    /* 編集完了時にトップバー・ボトムバーを最新の設定で再描画 */
    if (typeof renderTopbar === 'function') renderTopbar();
    if (typeof renderBottombar === 'function') renderBottombar();
  }

  function isEditMode() { return _editMode; }

  /* ウィジェット削除 */
  window.removeWidget = function(widgetId) {
    hp();
    removeWidgetFromPreset(widgetId);
    renderHome();
  };

  /* ウィジェットサイズ変更 */
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
    var h = '<div class="confirm-box" style="width:340px;max-height:80vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb12 text-c">ウィジェットを追加</h3>';

    WIDGET_CATEGORIES.forEach(function(cat) {
      var items = Object.values(WIDGET_DEFS).filter(function(w) { return w.category === cat.id; });
      if (items.length === 0) return;
      h += '<div class="fz-xs fw6 c-secondary mb8 mt8">' + cat.icon + ' ' + escHtml(cat.name) + '</div>';
      items.forEach(function(w) {
        var isAdded = currentWidgetIds.indexOf(w.id) >= 0;
        h += '<button class="btn btn-secondary btn-sm btn-block mb4" style="text-align:left;justify-content:flex-start" onclick="addWidgetFromPicker(\'' + w.id + '\')">';
        h += w.icon + ' ' + escHtml(w.name);
        if (isAdded) {
          h += ' <span class="fz-xxs" style="background:var(--c-success-light);color:var(--c-success);padding:1px 6px;border-radius:980px;margin-left:4px">追加済み</span>';
        }
        h += ' <span class="fz-xs c-muted">- ' + escHtml(w.desc) + '</span>';
        h += '</button>';
      });
    });

    h += '<button class="btn btn-ghost btn-block mt12" onclick="this.closest(\'.confirm-overlay\').remove()">閉じる</button>';
    h += '</div>';
    div.innerHTML = h;
    document.body.appendChild(div);
  }

  window.addWidgetFromPicker = function(widgetId) {
    addWidgetToPreset(widgetId);
    document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });
    toast('✅ ウィジェットを追加しました');
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

  /* ========== ドラッグ並び替え（タッチ） ========== */
  function _initDrag() {
    var grid = document.getElementById('widget-grid');
    if (!grid) return;
    var widgets = grid.querySelectorAll('.widget:not(.widget-add)');
    var dragEl = null, startY = 0, startIdx = -1;

    widgets.forEach(function(el, idx) {
      el.setAttribute('draggable', 'false');
      el.addEventListener('touchstart', function(e) {
        /* タイトル部分のみ */
        if (!e.target.closest('.widget-title')) return;
        dragEl = el;
        startY = e.touches[0].clientY;
        startIdx = idx;
        el.style.opacity = '0.6';
      }, { passive: true });
    });

    grid.addEventListener('touchmove', function(e) {
      if (!dragEl) return;
      var dy = e.touches[0].clientY - startY;
      dragEl.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });

    grid.addEventListener('touchend', function(e) {
      if (!dragEl) return;
      dragEl.style.opacity = '';
      dragEl.style.transform = '';
      /* 移動先を判定（上下で1つ分移動） */
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > 40) {
        var dir = dy > 0 ? 1 : -1;
        var toIdx = startIdx + dir;
        if (toIdx >= 0) {
          moveWidgetInPreset(startIdx, toIdx);
          renderHome();
        }
      }
      dragEl = null;
    }, { passive: true });
  }

  /* ========== refreshHome の上書き ========== */
  window.renderHome = renderHome;
  window.renderHomeWidgets = renderHome; /* app.js互換 */
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
    /* 詳細設定を自動で開く */
    setTimeout(function() {
      var advBody = document.getElementById('edit-advanced-body');
      var advHeader = advBody ? advBody.previousElementSibling : null;
      if (advBody && advBody.style.display === 'none') {
        advBody.style.display = '';
        if (advHeader) advHeader.classList.add('open');
      }
      /* 詳細設定までスクロール */
      if (advBody) {
        advBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  window.openEditAdvanced = openEditAdvanced;

})();
