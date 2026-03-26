/* ==========================================================
   DeliEasy v2 — js/fab.js
   Floating Action Button + ミニメニュー（カスタマイズ対応）
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _isHidden = false;

  /* ---------- FABアクション定義（選択可能な全アクション） ---------- */
  var ALL_FAB_ACTIONS = [
    { id: 'earnInput',     icon: '✏️', label: '売上入力',    overlay: 'earnInput' },
    { id: 'expenseInput',  icon: '💸', label: '経費入力',    overlay: 'expenseInput' },
    { id: 'calendar',      icon: '📅', label: 'カレンダー',  overlay: 'calendar' },
    { id: 'stats',         icon: '📊', label: '統計',        overlay: 'stats' },
    { id: 'tax',           icon: '🧾', label: '税金',        overlay: 'tax' },
    { id: 'expenseManage', icon: '💰', label: '経費管理',    overlay: 'expenseManage' },
    { id: 'pfManage',      icon: '📦', label: 'PF管理',      overlay: 'pfManage' },
    { id: 'theme',         icon: '🎨', label: 'テーマ',      overlay: 'theme' },
    { id: 'settings',      icon: '⚙️', label: '設定',        overlay: 'settings' }
  ];

  var DEFAULT_FAB_CFG = {
    show: true,
    position: 'right',
    items: ['earnInput', 'expenseInput']
  };

  function getFabConfig() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset && preset.fab && preset.fab.items) return preset.fab;
    return S.g('fab_cfg', DEFAULT_FAB_CFG);
  }

  function saveFabConfig(cfg) {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset) {
      preset.fab = cfg;
      if (typeof savePreset === 'function') savePreset(preset);
    }
    S.s('fab_cfg', cfg);
  }

  function _getAllFabActions() {
    var actions = ALL_FAB_ACTIONS.slice();
    var custom = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];
    custom.forEach(function(co) {
      actions.push({
        id: 'custom_' + co.id,
        icon: co.icon,
        label: co.title,
        customOverlayId: co.id
      });
    });
    return actions;
  }

  /* ---------- Render ---------- */
  function renderFab() {
    var container = document.getElementById('fab-container');
    if (!container) return;

    var cfg = getFabConfig();
    if (cfg.show === false) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    var items = cfg.items || DEFAULT_FAB_CFG.items;
    var allActions = _getAllFabActions();

    var html = '';
    html += '<div class="fab-mini-group" id="fab-mini-group">';
    for (var i = items.length - 1; i >= 0; i--) {
      var itemId = items[i];
      var action = null;
      for (var j = 0; j < allActions.length; j++) {
        if (allActions[j].id === itemId) { action = allActions[j]; break; }
      }
      if (!action) continue;
      html += '<button class="fab-mini" data-fab-action="' + escHtml(action.id) + '">';
      html += '<span class="fab-mini-icon">' + action.icon + '</span>';
      html += '<span>' + escHtml(action.label) + '</span>';
      html += '</button>';
    }
    html += '</div>';
    html += '<button class="fab-main" id="fab-main" aria-label="メニューを開く">＋</button>';

    container.innerHTML = html;
    container.className = 'fab-container ' + (cfg.position || 'right');

    document.getElementById('fab-main').addEventListener('click', toggleFabMenu);

    container.querySelectorAll('.fab-mini').forEach(function(el) {
      el.addEventListener('click', function() {
        var actionId = el.getAttribute('data-fab-action');
        closeFabMenu();
        var allAct = _getAllFabActions();
        for (var k = 0; k < allAct.length; k++) {
          if (allAct[k].id === actionId) {
            if (allAct[k].customOverlayId) {
              openCustomOverlay(allAct[k].customOverlayId);
            } else if (allAct[k].overlay && typeof openOverlay === 'function') {
              openOverlay(allAct[k].overlay);
            }
            return;
          }
        }
      });
    });
  }

  /* ---------- FAB設定UI ---------- */
  function renderFabSettings() {
    var cfg = getFabConfig();
    var items = cfg.items || DEFAULT_FAB_CFG.items;
    var allActions = _getAllFabActions();

    var html = '<div id="fab-settings-container">';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">＋ FABメニュー設定</div>';

    html += '<div class="flex flex-between items-center mb12">';
    html += '<span class="fz-s">FABを表示</span>';
    html += '<label class="topbar-toggle">';
    html += '<input type="checkbox" ' + (cfg.show !== false ? 'checked' : '') + ' onchange="_fabToggleShow(this.checked)">';
    html += '<span class="topbar-toggle-slider"></span>';
    html += '</label>';
    html += '</div>';

    if (cfg.show !== false) {
      html += '<div class="flex flex-between items-center mb12">';
      html += '<span class="fz-s">位置</span>';
      html += '<div class="flex gap4">';
      html += '<button class="pill' + (cfg.position !== 'left' ? ' active' : '') + '" onclick="_fabSetPosition(\'right\')">右</button>';
      html += '<button class="pill' + (cfg.position === 'left' ? ' active' : '') + '" onclick="_fabSetPosition(\'left\')">左</button>';
      html += '</div></div>';

      html += '<div class="fz-xs fw6 c-secondary mb8">表示するアクション（タップで切替）</div>';
      allActions.forEach(function(action) {
        var isEnabled = items.indexOf(action.id) >= 0;
        html += '<div class="flex items-center gap8 mb4" style="padding:6px 8px;background:' + (isEnabled ? 'var(--c-primary-light,rgba(0,122,255,.1))' : 'var(--c-fill-quaternary)') + ';border-radius:var(--ds-radius-sm);cursor:pointer" onclick="_fabToggleAction(\'' + escJs(action.id) + '\')">';
        html += '<span style="font-size:1rem">' + action.icon + '</span>';
        html += '<span class="fz-s" style="flex:1">' + escHtml(action.label) + '</span>';
        html += '<span class="fz-xs ' + (isEnabled ? 'c-success fw6' : 'c-muted') + '">' + (isEnabled ? '✓ 表示' : '非表示') + '</span>';
        html += '</div>';
      });
    }

    html += '</div></div></div>';
    return html;
  }

  window._fabToggleShow = function(show) {
    var cfg = getFabConfig();
    cfg.show = show;
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  window._fabSetPosition = function(pos) {
    hp();
    var cfg = getFabConfig();
    cfg.position = pos;
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  window._fabToggleAction = function(actionId) {
    hp();
    var cfg = getFabConfig();
    if (!cfg.items) cfg.items = DEFAULT_FAB_CFG.items.slice();
    var idx = cfg.items.indexOf(actionId);
    if (idx >= 0) {
      cfg.items.splice(idx, 1);
    } else {
      cfg.items.push(actionId);
    }
    saveFabConfig(cfg);
    renderFab();
    _refreshFabSettingsUI();
  };

  function _refreshFabSettingsUI() {
    var container = document.getElementById('fab-settings-container');
    if (container) {
      container.outerHTML = renderFabSettings();
    }
  }

  /* ---------- Toggle mini menu ---------- */
  function toggleFabMenu() {
    hp();
    if (_isOpen) closeFabMenu();
    else openFabMenu();
  }

  function openFabMenu() {
    _isOpen = true;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.add('open');
    if (group) group.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeFabMenu() {
    _isOpen = false;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.remove('open');
    if (group) group.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  /* ---------- Show / Hide FAB ---------- */
  function showFab() {
    _isHidden = false;
    var container = document.getElementById('fab-container');
    if (container) container.classList.remove('hidden');
  }

  function hideFab() {
    _isHidden = true;
    closeFabMenu();
    var container = document.getElementById('fab-container');
    if (container) container.classList.add('hidden');
  }

  function isFabOpen() { return _isOpen; }

  /* ---------- Expose ---------- */
  window.renderFab = renderFab;
  window.renderFabSettings = renderFabSettings;
  window.getFabConfig = getFabConfig;
  window.saveFabConfig = saveFabConfig;
  window.ALL_FAB_ACTIONS = ALL_FAB_ACTIONS;
  window.toggleFabMenu = toggleFabMenu;
  window.openFabMenu = openFabMenu;
  window.closeFabMenu = closeFabMenu;
  window.showFab = showFab;
  window.hideFab = hideFab;
  window.isFabOpen = isFabOpen;

})();
