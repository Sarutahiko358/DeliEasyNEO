/* ==========================================================
   DeliEasy v2 — js/presets.js
   プリセット管理・テンプレート
   ========================================================== */
(function(){
  'use strict';

  /* ========== テンプレート定義 ========== */
  var PRESET_TEMPLATES = [
    {
      name: '🚴 稼働中',
      desc: '配達中にサッと確認',
      widgets: [
        { id: 'clock', size: 'full' },
        { id: 'todaySales', size: 'wide' },
        { id: 'todayCount', size: 'half' },
        { id: 'todayUnit', size: 'half' },
        { id: 'todayProfit', size: 'half' },
        { id: 'todayPfBreakdown', size: 'full' }
      ]
    },
    {
      name: '📊 振り返り',
      desc: '1日の終わりに振り返る',
      widgets: [
        { id: 'todaySummary', size: 'full' },
        { id: 'todayPfBreakdown', size: 'full' },
        { id: 'recentRecords', size: 'full' }
      ]
    },
    {
      name: '📆 月次レポート',
      desc: '月単位の分析',
      widgets: [
        { id: 'monthSummary', size: 'full' },
        { id: 'monthPace', size: 'full' },
        { id: 'miniCalendar', size: 'full' },
        { id: 'goalProgress', size: 'full' }
      ]
    },
    {
      name: '💰 収支管理',
      desc: 'お金の流れに特化',
      widgets: [
        { id: 'todaySummary', size: 'full' },
        { id: 'weekSummary', size: 'full' },
        { id: 'monthPace', size: 'full' },
        { id: 'goalProgress', size: 'full' }
      ]
    },
    {
      name: '⚡ シンプル',
      desc: '最小限の情報だけ',
      widgets: [
        { id: 'todaySales', size: 'half' },
        { id: 'todayCount', size: 'half' },
        { id: 'todayProfit', size: 'half' }
      ]
    }
  ];

  /* ========== デバイス判定 ========== */
  function _isDesktop() {
    return window.innerWidth >= 1024;
  }

  /* ========== プリセット操作 ========== */
  function getPresets() {
    var saved = S.g('presets', null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    /* 初回: デフォルトプリセットを生成 */
    var def = _createPresetFromTemplate(PRESET_TEMPLATES[0]);
    S.s('presets', [def]);
    S.si('activePreset', def.id);
    return [def];
  }

  function getActivePreset() {
    var presets = getPresets();
    var key = _isDesktop() ? 'activePresetDesktop' : 'activePreset';
    var activeId = S.g(key, null);
    // フォールバック: デスクトップキーが未設定ならモバイルのを使う
    if (!activeId && _isDesktop()) {
      activeId = S.g('activePreset', null);
    }
    if (activeId) {
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === activeId) return presets[i];
      }
    }
    return presets[0] || null;
  }

  function setActivePreset(id) {
    var key = _isDesktop() ? 'activePresetDesktop' : 'activePreset';
    S.si(key, id);
  }

  function savePreset(preset) {
    var presets = getPresets();
    var idx = -1;
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].id === preset.id) { idx = i; break; }
    }
    if (idx >= 0) presets[idx] = preset;
    else presets.push(preset);
    S.s('presets', presets);
  }

  function deletePreset(id) {
    var presets = getPresets().filter(function(p) { return p.id !== id; });
    if (presets.length === 0) {
      presets.push(_createPresetFromTemplate(PRESET_TEMPLATES[0]));
    }
    S.s('presets', presets);
    /* アクティブが消えたら先頭に */
    var activeId = S.g('activePreset', null);
    if (activeId === id) S.si('activePreset', presets[0].id);
  }

  function createPresetFromTemplate(templateIndex) {
    var tpl = PRESET_TEMPLATES[templateIndex];
    if (!tpl) return null;
    var p = _createPresetFromTemplate(tpl);
    var presets = getPresets();
    presets.push(p);
    S.s('presets', presets);
    return p;
  }

  function duplicatePreset(id) {
    var src = null;
    getPresets().forEach(function(p) { if (p.id === id) src = p; });
    if (!src) return null;
    var dup = JSON.parse(JSON.stringify(src));
    dup.id = 'preset_' + Date.now();
    dup.name = src.name + ' (コピー)';
    var presets = getPresets();
    presets.push(dup);
    S.s('presets', presets);
    return dup;
  }

  function _createPresetFromTemplate(tpl) {
    return {
      id: 'preset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: tpl.name,
      widgets: JSON.parse(JSON.stringify(tpl.widgets))
    };
  }

  /* ========== ウィジェット操作（アクティブプリセットに対して） ========== */
  function addWidgetToPreset(widgetId, size) {
    var preset = getActivePreset();
    if (!preset) return;
    var def = WIDGET_DEFS[widgetId];
    if (!def) return;
    preset.widgets.push({ id: widgetId, size: size || def.size });
    savePreset(preset);
  }

  function removeWidgetFromPreset(widgetId) {
    var preset = getActivePreset();
    if (!preset) return;
    /* 最後に出現するものを削除 */
    for (var i = preset.widgets.length - 1; i >= 0; i--) {
      if (preset.widgets[i].id === widgetId) {
        preset.widgets.splice(i, 1);
        break;
      }
    }
    savePreset(preset);
  }

  function cycleWidgetSizeInPreset(widgetId) {
    var preset = getActivePreset();
    if (!preset) return;
    var def = WIDGET_DEFS[widgetId];
    if (!def || !def.sizeOptions || def.sizeOptions.length < 2) return;
    for (var i = preset.widgets.length - 1; i >= 0; i--) {
      if (preset.widgets[i].id === widgetId) {
        var curSize = preset.widgets[i].size || def.size;
        var idx = def.sizeOptions.indexOf(curSize);
        var nextIdx = (idx + 1) % def.sizeOptions.length;
        preset.widgets[i].size = def.sizeOptions[nextIdx];
        break;
      }
    }
    savePreset(preset);
  }

  function moveWidgetInPreset(fromIndex, toIndex) {
    var preset = getActivePreset();
    if (!preset) return;
    if (fromIndex < 0 || fromIndex >= preset.widgets.length) return;
    if (toIndex < 0 || toIndex >= preset.widgets.length) return;
    var item = preset.widgets.splice(fromIndex, 1)[0];
    preset.widgets.splice(toIndex, 0, item);
    savePreset(preset);
  }

  /* ========== Expose ========== */
  window.PRESET_TEMPLATES = PRESET_TEMPLATES;
  window.getPresets = getPresets;
  window.getActivePreset = getActivePreset;
  window.setActivePreset = setActivePreset;
  window.savePreset = savePreset;
  window.deletePreset = deletePreset;
  window.createPresetFromTemplate = createPresetFromTemplate;
  window.duplicatePreset = duplicatePreset;
  window.addWidgetToPreset = addWidgetToPreset;
  window.removeWidgetFromPreset = removeWidgetFromPreset;
  window.cycleWidgetSizeInPreset = cycleWidgetSizeInPreset;
  window.moveWidgetInPreset = moveWidgetInPreset;

})();
