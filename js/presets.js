/* ==========================================================
   DeliEasy v2 — js/presets.js
   プリセット管理・テンプレート（モバイル/デスクトップ個別管理版）
   ========================================================== */
(function(){
  'use strict';

  /* @depends: utils.js, storage.js, widgets.js (WIDGET_DEFS)
     @provides: PRESET_TEMPLATES, getPresets, getActivePreset, getActivePresetRaw,
                getPresetModeData, savePresetModeData, setActivePreset, savePreset,
                deletePreset, createPresetFromTemplate, addWidgetToPreset,
                removeWidgetFromPreset, cycleWidgetSizeInPreset, _getDeviceMode */

  /* ========== デバイスモード判定 ========== */
  function _getDeviceMode() {
    return window.innerWidth >= 1024 ? 'desktop' : 'mobile';
  }

  /* ========== テンプレート（新構造: mobile/desktop個別） ========== */
  var PRESET_TEMPLATES = [
    {
      name: '🚴 メイン',
      desc: '基本のレイアウト',
      mobile: {
        widgets: [
          { id: 'clock', size: 'full' },
          { id: 'todaySales', size: 'half' },
          { id: 'todayCount', size: 'half' },
          { id: 'todayUnit', size: 'half' },
          { id: 'todayProfit', size: 'half' },
          { id: 'todayPfBreakdown', size: 'full' }
        ]
      },
      desktop: {
        widgets: [
          { id: 'clock', size: 'half' },
          { id: 'todaySales', size: 'half' },
          { id: 'todayCount', size: 'half' },
          { id: 'todayUnit', size: 'half' },
          { id: 'todayProfit', size: 'half' },
          { id: 'todayPfBreakdown', size: 'wide' },
          { id: 'miniCalendar', size: 'wide' }
        ]
      }
    },
    {
      name: '📊 振り返り',
      desc: '1日の終わりに振り返る',
      mobile: {
        widgets: [
          { id: 'todaySummary', size: 'full' },
          { id: 'todayPfBreakdown', size: 'full' },
          { id: 'recentRecords', size: 'full' }
        ]
      },
      desktop: {
        widgets: [
          { id: 'todaySummary', size: 'wide' },
          { id: 'todayPfBreakdown', size: 'wide' },
          { id: 'recentRecords', size: 'full' }
        ]
      }
    },
    {
      name: '📆 月次レポート',
      desc: '月単位の分析',
      mobile: {
        widgets: [
          { id: 'monthSummary', size: 'full' },
          { id: 'miniCalendar', size: 'full' }
        ]
      },
      desktop: {
        widgets: [
          { id: 'monthSummary', size: 'wide' },
          { id: 'miniCalendar', size: 'wide' }
        ]
      }
    },
    {
      name: '💰 収支管理',
      desc: 'お金の流れに特化',
      mobile: {
        widgets: [
          { id: 'todaySummary', size: 'full' },
          { id: 'weekSummary', size: 'full' }
        ]
      },
      desktop: {
        widgets: [
          { id: 'todaySummary', size: 'wide' },
          { id: 'weekSummary', size: 'wide' }
        ]
      }
    },
    {
      name: '⚡ シンプル',
      desc: '最小限の情報だけ',
      mobile: {
        widgets: [
          { id: 'todaySales', size: 'half' },
          { id: 'todayCount', size: 'half' },
          { id: 'todayProfit', size: 'half' }
        ]
      },
      desktop: {
        widgets: [
          { id: 'todaySales', size: 'half' },
          { id: 'todayCount', size: 'half' },
          { id: 'todayProfit', size: 'half' },
          { id: 'todayUnit', size: 'half' }
        ]
      }
    }
  ];

  /* ========== 旧構造→新構造マイグレーション ========== */
  function _migrateToDeviceMode(presets) {
    var changed = false;
    presets.forEach(function(p) {
      if (p.mobile && p.desktop) return;

      var mobileData = {
        widgets: JSON.parse(JSON.stringify(p.widgets || [])),
        topBar: JSON.parse(JSON.stringify(p.topBar || { show: true, leftCustom: 'appName', center: 'none', rightCustom: 'none' })),
        bottomBar: JSON.parse(JSON.stringify(p.bottomBar || { show: false, slotCount: 5, items: [] })),
        fab: JSON.parse(JSON.stringify(p.fab || { show: true, position: 'right', posX: null, posY: null, items: ['earnInput','expenseInput'] })),
        rightSidebar: JSON.parse(JSON.stringify(p.rightSidebar || { sections: ['todaySummary','recentRecords'] }))
      };

      var desktopData = JSON.parse(JSON.stringify(mobileData));

      p.mobile = mobileData;
      p.desktop = desktopData;

      delete p.widgets;
      delete p.topBar;
      delete p.bottomBar;
      delete p.fab;
      delete p.rightSidebar;

      changed = true;
    });
    return changed;
  }

  /* ========== getPresets ========== */
  function getPresets() {
    var saved = S.g('presets', null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      if (_migrateToDeviceMode(saved)) {
        S.s('presets', saved);
      }
      return saved;
    }
    var def = _createPresetFromTemplate(PRESET_TEMPLATES[0]);
    S.s('presets', [def]);
    S.si('activePreset', def.id);
    return [def];
  }

  /* ========== getActivePreset (デバイスモード自動展開) ========== */
  function getActivePreset() {
    var presets = getPresets();
    var activeId = S.g('activePreset', null);
    var preset = null;
    if (activeId) {
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === activeId) { preset = presets[i]; break; }
      }
    }
    if (!preset) preset = presets[0];
    if (!preset) return null;

    var mode = _getDeviceMode();

    if (preset.mobile && preset.desktop) {
      var modeData = preset[mode];
      return {
        id: preset.id,
        name: preset.name,
        _mode: mode,
        _raw: preset,
        widgets: modeData.widgets,
        topBar: modeData.topBar,
        bottomBar: modeData.bottomBar,
        fab: modeData.fab,
        rightSidebar: modeData.rightSidebar
      };
    }

    return preset;
  }

  /* ========== getActivePresetRaw (生データアクセス) ========== */
  function getActivePresetRaw() {
    var presets = getPresets();
    var activeId = S.g('activePreset', null);
    if (activeId) {
      for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === activeId) return presets[i];
      }
    }
    return presets[0] || null;
  }

  function getPresetModeData(preset, mode) {
    if (!preset) return null;
    if (preset.mobile && preset.desktop) return preset[mode];
    return { widgets: preset.widgets, topBar: preset.topBar, bottomBar: preset.bottomBar, fab: preset.fab, rightSidebar: preset.rightSidebar };
  }

  function savePresetModeData(preset, mode, data) {
    if (!preset) return;
    if (!preset.mobile) preset.mobile = {};
    if (!preset.desktop) preset.desktop = {};
    preset[mode] = data;
    savePreset(preset);
  }

  function setActivePreset(id) {
    S.si('activePreset', id);
  }

  /* ========== savePreset (展開済みオブジェクト対応) ========== */
  function savePreset(preset) {
    var presets = getPresets();

    if (preset._raw) {
      var raw = preset._raw;
      var mode = preset._mode;
      raw[mode] = {
        widgets: preset.widgets,
        topBar: preset.topBar,
        bottomBar: preset.bottomBar,
        fab: preset.fab,
        rightSidebar: preset.rightSidebar
      };
      preset = raw;
    }

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
      mobile: JSON.parse(JSON.stringify(tpl.mobile)),
      desktop: JSON.parse(JSON.stringify(tpl.desktop))
    };
  }

  function addWidgetToPreset(widgetId, size) {
    var rawPreset = getActivePresetRaw();
    if (!rawPreset) return;
    var editMode = (window._homeEditCurrentMode) || _getDeviceMode();
    var modeData = getPresetModeData(rawPreset, editMode);
    if (!modeData) return;
    var def = WIDGET_DEFS[widgetId];
    if (!def) return;
    if (!modeData.widgets) modeData.widgets = [];
    modeData.widgets.push({ id: widgetId, size: size || def.size });
    savePresetModeData(rawPreset, editMode, modeData);
  }

  function removeWidgetFromPreset(widgetId) {
    var preset = getActivePreset();
    if (!preset) return;
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
        var curIdx = def.sizeOptions.indexOf(curSize);
        var nextIdx = (curIdx + 1) % def.sizeOptions.length;
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

  window.PRESET_TEMPLATES = PRESET_TEMPLATES;
  window.getPresets = getPresets;
  window.getActivePreset = getActivePreset;
  window.getActivePresetRaw = getActivePresetRaw;
  window.getPresetModeData = getPresetModeData;
  window.savePresetModeData = savePresetModeData;
  window._getDeviceMode = _getDeviceMode;
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
