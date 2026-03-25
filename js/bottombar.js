/* ==========================================================
   DeliEasy v2 — js/bottombar.js
   ボトムバー（デフォルト非表示・有効化可能）
   ========================================================== */
(function(){
  'use strict';

  /* ---------- 割り当て可能なアクション ---------- */
  var BOTTOMBAR_ACTIONS = [
    { id: 'earnInput',    icon: '✏️', label: '売上入力',    action: function(){ openOverlay('earnInput'); } },
    { id: 'expenseInput', icon: '💸', label: '経費入力',    action: function(){ openOverlay('expenseInput'); } },
    { id: 'calendar',     icon: '📅', label: 'カレンダー',  action: function(){ openOverlay('calendar'); } },
    { id: 'stats',        icon: '📊', label: '統計',        action: function(){ openOverlay('stats'); } },
    { id: 'tax',          icon: '🧾', label: '税金',        action: function(){ openOverlay('tax'); } },
    { id: 'expense',      icon: '💰', label: '経費管理',    action: function(){ openOverlay('expenseManage'); } },
    { id: 'settings',     icon: '⚙️', label: '設定',        action: function(){ openOverlay('settings'); } },
    { id: 'theme',        icon: '🎨', label: 'テーマ',      action: function(){ openOverlay('theme'); } },
    { id: 'presetNext',   icon: '🔄', label: '次のプリセット', action: _nextPreset },
    { id: 'editMode',     icon: '✏️', label: '編集モード',  action: function(){ if (typeof enterEditMode === 'function') enterEditMode(); } },
    { id: 'none',         icon: '',   label: '空欄',        action: function(){} }
  ];

  /* ---------- デフォルト設定 ---------- */
  var DEFAULT_BOTTOMBAR_CFG = {
    show: false,
    items: ['earnInput', 'calendar', 'stats', 'expense', 'settings']
  };

  /* ---------- 設定取得/保存 ---------- */
  function getBottombarConfig() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset && preset.bottomBar) return preset.bottomBar;
    return S.g('bottombar_cfg', DEFAULT_BOTTOMBAR_CFG);
  }

  function saveBottombarConfig(cfg) {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset) {
      preset.bottomBar = cfg;
      if (typeof savePreset === 'function') savePreset(preset);
    }
    S.s('bottombar_cfg', cfg);
  }

  /* ---------- ボトムバー描画 ---------- */
  function renderBottombar() {
    var cfg = getBottombarConfig();

    /* 既存のボトムバーを削除 */
    var existing = document.getElementById('bottombar');
    if (existing) existing.remove();

    if (!cfg.show) {
      _adjustMainPadding(false);
      return;
    }

    var bar = document.createElement('div');
    bar.id = 'bottombar';
    bar.className = 'bottombar';

    var items = cfg.items || DEFAULT_BOTTOMBAR_CFG.items;
    var html = '';

    items.forEach(function(itemId, idx) {
      var actionDef = _findAction(itemId);
      if (!actionDef || actionDef.id === 'none') {
        html += '<button class="bottombar-item bottombar-item-empty"></button>';
        return;
      }
      html += '<button class="bottombar-item" data-action-idx="' + idx + '">';
      html += '<span class="bottombar-item-icon">' + actionDef.icon + '</span>';
      html += '<span class="bottombar-item-label">' + escHtml(actionDef.label) + '</span>';
      html += '</button>';
    });

    bar.innerHTML = html;
    document.getElementById('app').appendChild(bar);

    /* イベントバインド */
    var buttons = bar.querySelectorAll('.bottombar-item[data-action-idx]');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        hp();
        var idx = parseInt(btn.getAttribute('data-action-idx'), 10);
        var itemId = items[idx];
        var actionDef = _findAction(itemId);
        if (actionDef && typeof actionDef.action === 'function') {
          actionDef.action();
        }
      });
    });

    _adjustMainPadding(true);
  }

  function _findAction(id) {
    for (var i = 0; i < BOTTOMBAR_ACTIONS.length; i++) {
      if (BOTTOMBAR_ACTIONS[i].id === id) return BOTTOMBAR_ACTIONS[i];
    }
    return null;
  }

  function _nextPreset() {
    var presets = typeof getPresets === 'function' ? getPresets() : [];
    if (presets.length <= 1) return;
    var active = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (!active) return;
    var idx = -1;
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].id === active.id) { idx = i; break; }
    }
    var nextIdx = (idx + 1) % presets.length;
    if (typeof switchPreset === 'function') switchPreset(presets[nextIdx].id);
  }

  function _adjustMainPadding(hasBottombar) {
    var main = document.getElementById('main-content');
    if (!main) return;
    if (hasBottombar) {
      main.style.paddingBottom = '140px'; /* 84px bar + 56px extra */
    } else {
      main.style.paddingBottom = ''; /* CSSデフォルトに戻す */
    }
  }

  /* ---------- ボトムバー設定UI ---------- */
  function renderBottombarSettings() {
    var cfg = getBottombarConfig();
    var html = '';

    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📱 ボトムバー設定</div>';

    /* 有効/無効 */
    html += '<div class="flex flex-between items-center mb12">';
    html += '<span class="fz-s">ボトムバーを有効化</span>';
    html += '<label class="topbar-toggle">';
    html += '<input type="checkbox" ' + (cfg.show ? 'checked' : '') + ' onchange="toggleBottombarVisibility(this.checked)">';
    html += '<span class="topbar-toggle-slider"></span>';
    html += '</label>';
    html += '</div>';

    if (cfg.show) {
      var items = cfg.items || DEFAULT_BOTTOMBAR_CFG.items;
      html += '<div class="fz-xs c-muted mb8">最大5スロット。各スロットにアクションを割り当てます。</div>';

      for (var i = 0; i < 5; i++) {
        var currentId = items[i] || 'none';
        html += '<div class="mb8">';
        html += '<div class="fz-xs c-muted mb4">スロット ' + (i + 1) + '</div>';
        html += '<select class="input" onchange="setBottombarItem(' + i + ',this.value)" style="font-size:.8125rem">';
        BOTTOMBAR_ACTIONS.forEach(function(act) {
          var selected = act.id === currentId ? ' selected' : '';
          html += '<option value="' + escHtml(act.id) + '"' + selected + '>' + act.icon + ' ' + escHtml(act.label) + '</option>';
        });
        html += '</select></div>';
      }
    }

    html += '</div></div>';
    return html;
  }

  /* ---------- 設定変更 ---------- */
  function toggleBottombarVisibility(show) {
    var cfg = getBottombarConfig();
    cfg.show = show;
    if (!cfg.items || cfg.items.length === 0) {
      cfg.items = DEFAULT_BOTTOMBAR_CFG.items.slice();
    }
    saveBottombarConfig(cfg);
    renderBottombar();
    if (typeof isEditMode === 'function' && isEditMode()) {
      if (typeof renderHome === 'function') renderHome();
    }
  }

  function setBottombarItem(index, actionId) {
    hp();
    var cfg = getBottombarConfig();
    if (!cfg.items) cfg.items = DEFAULT_BOTTOMBAR_CFG.items.slice();
    while (cfg.items.length <= index) cfg.items.push('none');
    cfg.items[index] = actionId;
    saveBottombarConfig(cfg);
    renderBottombar();
  }

  /* ---------- 表示/非表示 ---------- */
  function showBottombar() {
    var bar = document.getElementById('bottombar');
    if (bar) bar.classList.remove('bottombar-hidden');
  }

  function hideBottombar() {
    var bar = document.getElementById('bottombar');
    if (bar) bar.classList.add('bottombar-hidden');
  }

  /* ---------- Expose ---------- */
  window.renderBottombar = renderBottombar;
  window.renderBottombarSettings = renderBottombarSettings;
  window.getBottombarConfig = getBottombarConfig;
  window.saveBottombarConfig = saveBottombarConfig;
  window.toggleBottombarVisibility = toggleBottombarVisibility;
  window.setBottombarItem = setBottombarItem;
  window.showBottombar = showBottombar;
  window.hideBottombar = hideBottombar;
  window.BOTTOMBAR_ACTIONS = BOTTOMBAR_ACTIONS;

})();
