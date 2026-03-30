/* ==========================================================
   DeliEasy v2 — js/home.js
   ホーム画面描画 + グリッドベース編集UI（モバイル/デスクトップ個別管理版）
   差分更新対応版
   ========================================================== */
(function(){
  'use strict';

  var _editMode = false;
  var _homeEditCurrentMode = null; // null = 自動検出

  /* ========== 差分更新用の状態 ========== */
  var _lastSnapshot = null;
  var _lastPresetId = null;
  var _lastPresetName = null;
  var _lastPresetCount = 0;
  var _lastWidgetIds = null;
  var _domInitialized = false;

  /* ========== スナップショット生成 ========== */
  function _buildSnapshot(widgets) {
    var snap = {};
    widgets.forEach(function(w, i) {
      snap[i + '_' + w.id] = _getWidgetDataHash(w);
    });
    return snap;
  }

  function _getWidgetDataHash(w) {
    switch (w.id) {
      case 'clock':
        return 'clock';
      case 'todaySales':
        return 'ts_' + (typeof tdTot === 'function' ? tdTot() : 0);
      case 'todayCount':
        return 'tc_' + (typeof tdCnt === 'function' ? tdCnt() : 0);
      case 'todayUnit': {
        var tot = typeof tdTot === 'function' ? tdTot() : 0;
        var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
        return 'tu_' + tot + '_' + cnt;
      }
      case 'todayProfit': {
        var t = typeof tdTot === 'function' ? tdTot() : 0;
        var exps = S.g('exps', []);
        var expTot = 0;
        exps.forEach(function(e) { if (e.date === TD) expTot += (Number(e.amount) || 0); });
        return 'tp_' + t + '_' + expTot;
      }
      case 'todayExpense': {
        var ex = S.g('exps', []);
        var et = 0;
        ex.forEach(function(e) { if (e.date === TD) et += (Number(e.amount) || 0); });
        return 'te_' + et;
      }
      case 'todaySummary': {
        var ts2 = typeof tdTot === 'function' ? tdTot() : 0;
        var tc2 = typeof tdCnt === 'function' ? tdCnt() : 0;
        var ex2 = S.g('exps', []);
        var et2 = 0;
        ex2.forEach(function(e) { if (e.date === TD) et2 += (Number(e.amount) || 0); });
        return 'tsum_' + ts2 + '_' + tc2 + '_' + et2;
      }
      case 'weekSummary': {
        var wd = typeof wkData === 'function' ? wkData() : { tot: 0, cnt: 0, days: 0 };
        return 'ws_' + wd.tot + '_' + wd.cnt + '_' + wd.days;
      }
      case 'monthSummary': {
        var mt = typeof moTot === 'function' ? moTot() : 0;
        var mc = typeof moCnt === 'function' ? moCnt() : 0;
        var md = typeof moDays === 'function' ? moDays() : 0;
        return 'ms_' + mt + '_' + mc + '_' + md;
      }
      case 'todayPfBreakdown': {
        var records = typeof eByDate === 'function' ? eByDate(TD) : [];
        return 'pf_' + records.length + '_' + (typeof sumA === 'function' ? sumA(records) : 0);
      }
      case 'recentRecords': {
        var all = typeof getE === 'function' ? getE() : [];
        var last5 = all.slice(-5);
        return 'rr_' + last5.map(function(r) { return r.ts; }).join(',');
      }
      case 'miniCalendar': {
        var stateKey = 'miniCal_' + (w._instanceId || 'default');
        var st = window._miniCalState ? window._miniCalState[stateKey] : null;
        var ym = st ? st.year + '-' + st.month : 'current';
        var mk = st ? st.year + '-' + String(st.month + 1).padStart(2, '0') : MK;
        var me = typeof eByMonth === 'function' ? eByMonth(mk) : [];
        return 'mc_' + ym + '_' + me.length + '_' + (typeof sumA === 'function' ? sumA(me) : 0);
      }
      case 'taxSummary': {
        var earns = typeof getE === 'function' ? getE() : [];
        var yr = new Date().getFullYear();
        var from = yr + '-01-01';
        var to = yr + '-12-31';
        var rev = 0;
        earns.forEach(function(r) { if (r.d >= from && r.d <= to) rev += (Number(r.a) || 0); });
        var aexp = S.g('exps', []);
        var exp = 0;
        aexp.forEach(function(e) { if (e.date >= from && e.date <= to) exp += (Number(e.amount) || 0); });
        var deductions = typeof window.loadTaxDeductions === 'function' ? window.loadTaxDeductions() : {};
        var taxParams = S.g('taxCalcParams', null);
        return 'tax_' + rev + '_' + exp + '_' + JSON.stringify(deductions) + '_' + JSON.stringify(taxParams);
      }
      case 'furusatoLimit': {
        var earns2 = typeof getE === 'function' ? getE() : [];
        var yr2 = new Date().getFullYear();
        var from2 = yr2 + '-01-01';
        var to2 = yr2 + '-12-31';
        var rev2 = 0;
        earns2.forEach(function(r) { if (r.d >= from2 && r.d <= to2) rev2 += (Number(r.a) || 0); });
        var aexp2 = S.g('exps', []);
        var exp2 = 0;
        aexp2.forEach(function(e) { if (e.date >= from2 && e.date <= to2) exp2 += (Number(e.amount) || 0); });
        var deductions2 = typeof window.loadTaxDeductions === 'function' ? window.loadTaxDeductions() : {};
        var taxParams2 = S.g('taxCalcParams', null);
        return 'fl_' + rev2 + '_' + exp2 + '_' + JSON.stringify(deductions2) + '_' + JSON.stringify(taxParams2);
      }
      case 'quickMemo':
        return 'memo_' + (S.g('quickMemo', '') || '').length;
      case 'themeInfo':
        return 'theme_' + (typeof getThemeStyle === 'function' ? getThemeStyle() : '') + '_' + (typeof getThemeColor === 'function' ? getThemeColor() : '');
      default:
        return 'default_' + w.id + '_' + (w.size || '');
    }
  }

  /* ========== メイン描画（差分更新対応） ========== */
  function renderHome() {
    var main = document.getElementById('main-content');
    if (!main) return;

    var preset = getActivePreset();
    if (!preset) return;
    var presets = getPresets();

    /* === 構造変更の検出 === */
    var currentWidgetIds = JSON.stringify(preset.widgets.map(function(w) { return w.id + ':' + (w.size || ''); }));
    var structureChanged = !_domInitialized ||
        _lastPresetId !== preset.id ||
        _lastWidgetIds !== currentWidgetIds ||
        _lastPresetCount !== presets.length;

    if (structureChanged) {
      _fullRender(main, preset, presets);
      _lastPresetId = preset.id;
      _lastPresetName = preset.name;
      _lastPresetCount = presets.length;
      _lastWidgetIds = currentWidgetIds;
      _lastSnapshot = _buildSnapshot(preset.widgets);
      _domInitialized = true;
      return;
    }

    /* === データ差分更新 === */
    var newSnapshot = _buildSnapshot(preset.widgets);

    if (_lastPresetName !== preset.name) {
      _updatePresetBar(presets, preset);
      _lastPresetName = preset.name;
    }

    preset.widgets.forEach(function(w, i) {
      var key = i + '_' + w.id;
      var oldHash = _lastSnapshot ? _lastSnapshot[key] : null;
      var newHash = newSnapshot[key];
      if (oldHash !== newHash) {
        _updateSingleWidget(i, w);
      }
    });

    _lastSnapshot = newSnapshot;
  }

  /* ========== 全体再構築 ========== */
  function _fullRender(main, preset, presets) {
    var html = '';

    /* === プリセットバー === */
    if (presets.length > 1) {
      html += '<div class="preset-bar" id="home-preset-bar">';
      html += '<div class="preset-bar-scroll">';
      presets.forEach(function(p) {
        var isActive = preset.id === p.id;
        html += '<button class="preset-tab' + (isActive ? ' active' : '') + '" onclick="switchPreset(\'' + escJs(p.id) + '\')">' + escHtml(p.name) + '</button>';
      });
      html += '<button class="preset-tab preset-tab-add" onclick="openPresetMenu()">+</button>';
      html += '</div>';
      html += '</div>';
    }

    /* === ウィジェットグリッド === */
    html += '<div class="widget-grid" id="widget-grid">';
    preset.widgets.forEach(function(w, i) {
      html += _renderWidgetWithIndex(w, i, false);
    });
    html += '</div>';

    /* === ヒント === */
    if (presets.length <= 1) {
      html += '<div class="text-c fz-xs c-muted mt16 mb8" style="opacity:.5" id="home-hint">';
      html += 'ウィジェットを長押しでカスタマイズ';
      html += '</div>';
    }

    main.innerHTML = html;

    if (preset.widgets.some(function(w) { return w.id === 'clock'; })) {
      startWidgetClock();
    }

    _initLongPress();
  }

  /* ========== data-widget-index 付きウィジェット描画 ========== */
  function _renderWidgetWithIndex(w, index, editMode) {
    var def = WIDGET_DEFS[w.id];
    if (!def) return '';
    var sizeClass = 'widget-' + (w.size || def.size || 'full');
    var tappable = !editMode && def.tappable ? ' widget-tappable' : '';
    var tapAttr = '';
    if (!editMode && def.tappable && def.tapAction) {
      tapAttr = ' onclick="widgetTap(\'' + escJs(def.tapAction) + '\')"';
    }

    var html = '<div class="widget ' + sizeClass + tappable + '" data-widget-index="' + index + '"' + tapAttr + '>';
    html += '<div class="widget-title">';
    html += '<span>' + def.icon + ' ' + escHtml(def.name) + '</span>';
    html += '</div>';

    try {
      html += def.render(w);
    } catch (e) {
      html += '<div class="widget-empty">表示エラー</div>';
    }
    html += '</div>';
    return html;
  }

  /* ========== 単一ウィジェット更新 ========== */
  function _updateSingleWidget(index, w) {
    var grid = document.getElementById('widget-grid');
    if (!grid) return;

    var widgetEl = grid.querySelector('[data-widget-index="' + index + '"]');
    if (!widgetEl) return;

    var def = WIDGET_DEFS[w.id];
    if (!def) return;

    // 時計は setInterval で自己更新するのでスキップ
    if (w.id === 'clock') return;

    // quickMemo はユーザー入力中の可能性があるのでスキップ
    if (w.id === 'quickMemo') return;

    // タイトル以降のコンテンツを差し替え
    var titleEl = widgetEl.querySelector('.widget-title');
    if (!titleEl) return;

    while (titleEl.nextSibling) {
      titleEl.nextSibling.remove();
    }

    try {
      var newContent = def.render(w);
      var temp = document.createElement('div');
      temp.innerHTML = newContent;
      while (temp.firstChild) {
        widgetEl.appendChild(temp.firstChild);
      }
    } catch (e) {
      var errEl = document.createElement('div');
      errEl.className = 'widget-empty';
      errEl.textContent = '表示エラー';
      widgetEl.appendChild(errEl);
    }

    // ミニカレンダーのスワイプ再初期化
    if (w.id === 'miniCalendar') {
      var stateKey = 'miniCal_' + (w._instanceId || 'default');
      var swipeId = 'mini-cal-swipe-' + stateKey.replace(/[^a-zA-Z0-9]/g, '_');
      var swipeEl = document.getElementById(swipeId);
      if (swipeEl) swipeEl._mcSwipeInit = false;
      setTimeout(function() { _initMiniCalSwipe(swipeId, stateKey); }, 50);
    }
  }

  /* ========== プリセットバー更新 ========== */
  function _updatePresetBar(presets, activePreset) {
    var bar = document.getElementById('home-preset-bar');
    if (!bar) return;
    var scroll = bar.querySelector('.preset-bar-scroll');
    if (!scroll) return;

    var html = '';
    presets.forEach(function(p) {
      var isActive = activePreset.id === p.id;
      html += '<button class="preset-tab' + (isActive ? ' active' : '') + '" onclick="switchPreset(\'' + escJs(p.id) + '\')">' + escHtml(p.name) + '</button>';
    });
    html += '<button class="preset-tab preset-tab-add" onclick="openPresetMenu()">+</button>';
    scroll.innerHTML = html;
  }

  /* ========== 強制全体再描画 ========== */
  function forceFullRenderHome() {
    _domInitialized = false;
    _lastSnapshot = null;
    _lastPresetId = null;
    _lastWidgetIds = null;
    renderHome();
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
    initDragSort({
      listId: options.gridId,
      itemSelector: '.grid-editor-item',
      grid: true,
      addButtonSelector: '.widget-add',
      draggingClass: 'grid-editor-dragging',
      placeholderClass: 'grid-editor-placeholder',
      ignoreSelectors: ['.grid-editor-btn'],
      onReorder: function() {
        // DOM順からウィジェット配列を再構築
        var gridEl = document.getElementById(options.gridId);
        if (!gridEl) return;
        var oldWidgets = options.getWidgets();
        var newWidgets = [];
        Array.from(gridEl.querySelectorAll('.grid-editor-item')).forEach(function(el) {
          var idx = parseInt(el.getAttribute('data-widget-idx'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < oldWidgets.length) {
            newWidgets.push(oldWidgets[idx]);
          }
        });
        if (newWidgets.length === oldWidgets.length && typeof options.onReorder === 'function') {
          options.onReorder(newWidgets);
        }
      },
      onDragEnd: function() {
        if (typeof options.onDragEnd === 'function') options.onDragEnd();
      }
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
    forceFullRenderHome();
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

  /* ========== 長押し検知（リスナーリーク防止版） ========== */
  function _initLongPress() {
    var grid = document.getElementById('widget-grid');
    if (!grid) return;

    // 前回のリスナーがあればクリーンアップ
    if (grid._lpCleanup) {
      grid._lpCleanup();
    }

    var timer = null;
    var _lpActive = false;
    var _mouseAbort = null; // mousedown 内リスナー用 AbortController

    function onTouchStart(e) {
      var widget = e.target.closest('.widget');
      if (!widget) return;
      _lpActive = true;
      timer = setTimeout(function() {
        _lpActive = false;
        hp();
        enterEditMode();
      }, 500);
    }

    function onTouchEnd() {
      clearTimeout(timer);
      timer = null;
      _lpActive = false;
    }

    function onTouchMove() {
      if (_lpActive) {
        clearTimeout(timer);
        timer = null;
        _lpActive = false;
      }
    }

    grid.addEventListener('touchstart', onTouchStart, { passive: true });
    grid.addEventListener('touchend', onTouchEnd, { passive: true });
    grid.addEventListener('touchmove', onTouchMove, { passive: true });

    function onMouseDown(e) {
      if (e.button !== 0) return;
      var widget = e.target.closest('.widget');
      if (!widget) return;
      var startX = e.clientX;
      var startY = e.clientY;

      // 前回の mousedown 内リスナーをクリーンアップ
      if (_mouseAbort) _mouseAbort.abort();
      _mouseAbort = new AbortController();
      var signal = _mouseAbort.signal;

      timer = setTimeout(function() {
        hp();
        enterEditMode();
      }, 500);

      document.addEventListener('mouseup', function() {
        clearTimeout(timer);
        if (_mouseAbort) { _mouseAbort.abort(); _mouseAbort = null; }
      }, { signal: signal });
      document.addEventListener('mousemove', function(ev) {
        if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) {
          clearTimeout(timer);
        }
      }, { signal: signal });
    }

    grid.addEventListener('mousedown', onMouseDown);

    grid._lpCleanup = function() {
      grid.removeEventListener('touchstart', onTouchStart);
      grid.removeEventListener('touchend', onTouchEnd);
      grid.removeEventListener('touchmove', onTouchMove);
      grid.removeEventListener('mousedown', onMouseDown);
      if (_mouseAbort) { _mouseAbort.abort(); _mouseAbort = null; }
    };
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
  window.forceFullRenderHome = forceFullRenderHome;
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
