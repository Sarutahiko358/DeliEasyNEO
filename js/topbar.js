/* ==========================================================
   DeliEasy v2 — js/topbar.js
   トップバーのスロットカスタマイズ
   ========================================================== */
(function(){
  'use strict';

  /* ---------- スロット定義 ---------- */
  var TOPBAR_SLOT_OPTIONS = {
    leftCustom: [
      { id: 'appName',         label: 'アプリ名',     render: _renderAppName },
      { id: 'todaySales',      label: '今日の売上',   render: _renderTodaySales },
      { id: 'todaySalesCount', label: '売上/件数',    render: _renderTodaySalesCount },
      { id: 'todayProfit',     label: '今日の利益',   render: _renderTodayProfit },
      { id: 'date',            label: '日付',         render: _renderDate },
      { id: 'dateTime',        label: '日時',         render: _renderDateTime },
      { id: 'monthSales',      label: '今月の売上',   render: _renderMonthSales },
      { id: 'none',            label: '非表示',       render: function(){ return ''; } }
    ],
    center: [
      { id: 'none',            label: '非表示',       render: function(){ return ''; } },
      { id: 'date',            label: '日付',         render: _renderDate },
      { id: 'todaySales',      label: '今日の売上',   render: _renderTodaySales },
      { id: 'appName',         label: 'アプリ名',     render: _renderAppName },
      { id: 'presetName',      label: 'プリセット名', render: _renderPresetName }
    ],
    rightCustom: [
      { id: 'none',            label: '非表示',       render: function(){ return ''; } },
      { id: 'settingsIcon',    label: '設定',         render: _renderSettingsIcon },
      { id: 'themeIcon',       label: 'テーマ',       render: _renderThemeIcon },
      { id: 'todaySales',      label: '今日の売上',   render: _renderTodaySalesCompact },
      { id: 'todayCount',      label: '今日の件数',   render: _renderTodayCountCompact },
      { id: 'editAdvanced', label: '詳細設定',   render: _renderEditAdvancedIcon }
    ]
  };

  /* ---------- デフォルト設定 ---------- */
  var DEFAULT_TOPBAR_CFG = {
    show: true,
    leftCustom: 'appName',
    center: 'none',
    rightCustom: 'none'
  };

  /* ---------- 設定取得/保存 ---------- */
  function getTopbarConfig() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset && preset.topBar) return preset.topBar;
    return S.g('topbar_cfg', DEFAULT_TOPBAR_CFG);
  }

  function saveTopbarConfig(cfg) {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset) {
      preset.topBar = cfg;
      if (typeof savePreset === 'function') savePreset(preset);
    }
    S.s('topbar_cfg', cfg);
  }

  /* ---------- トップバー描画 ---------- */
  function renderTopbar() {
    var topbar = document.getElementById('topbar');
    if (!topbar) return;

    var cfg = getTopbarConfig();

    if (cfg.show === false) {
      topbar.style.display = 'none';
      _showFloatingHamburger(true);
      return;
    }

    topbar.style.display = '';
    _showFloatingHamburger(false);

    var leftHtml = '<div class="topbar-left">';
    leftHtml += '<button class="topbar-btn" onclick="toggleSidebar()" title="メニュー" aria-label="メニューを開く">☰</button>';

    /* 左カスタムスロット */
    var leftContent = _renderSlot('leftCustom', cfg.leftCustom || 'appName');
    if (leftContent) {
      leftHtml += '<span class="topbar-slot topbar-slot-left">' + leftContent + '</span>';
    }
    leftHtml += '</div>';

    /* 中央スロット */
    var centerHtml = '';
    var centerContent = _renderSlot('center', cfg.center || 'none');
    if (centerContent) {
      centerHtml = '<span class="topbar-slot topbar-slot-center">' + centerContent + '</span>';
    }

    /* 右側 */
    var rightHtml = '<div class="topbar-right">';

    /* 右カスタムスロット */
    var rightContent = _renderSlot('rightCustom', cfg.rightCustom || 'none');
    if (rightContent) {
      rightHtml += '<span class="topbar-slot topbar-slot-right">' + rightContent + '</span>';
    }

    /* 同期アイコン（固定） */
    rightHtml += '<button class="topbar-btn topbar-sync sync-off" id="sync-status-indicator" onclick="showSyncPopup()" title="同期">';
    rightHtml += '<span class="sync-icon">☁️</span>';
    rightHtml += '</button>';
    rightHtml += '</div>';

    topbar.innerHTML = leftHtml + centerHtml + rightHtml;

    /* 同期ステータス更新 */
    if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
  }

  /* ---------- スロット描画 ---------- */
  function _renderSlot(slotName, optionId) {
    var options = TOPBAR_SLOT_OPTIONS[slotName];
    if (!options) return '';
    for (var i = 0; i < options.length; i++) {
      if (options[i].id === optionId) {
        return options[i].render();
      }
    }
    return '';
  }

  /* ---------- スロットレンダラー ---------- */
  function _renderAppName() {
    return '<span class="topbar-title">DeliEasyNEO</span>';
  }

  function _renderTodaySales() {
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    return '<span class="topbar-data topbar-data-primary">¥' + fmt(tot) + '</span>';
  }

  function _renderTodaySalesCount() {
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
    return '<span class="topbar-data">¥' + fmt(tot) + ' / ' + cnt + '件</span>';
  }

  function _renderTodayProfit() {
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    var exps = S.g('exps', []);
    var todayExps = exps.filter(function(e) { return e.date === TD; });
    var expTot = todayExps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);
    var profit = tot - expTot;
    var cls = profit >= 0 ? 'topbar-data-success' : 'topbar-data-danger';
    return '<span class="topbar-data ' + cls + '">利益 ¥' + fmt(profit) + '</span>';
  }

  function _renderDate() {
    var now = new Date();
    var dayNames = ['日','月','火','水','木','金','土'];
    return '<span class="topbar-data">' + (now.getMonth()+1) + '/' + now.getDate() + '(' + dayNames[now.getDay()] + ')</span>';
  }

  function _renderDateTime() {
    var now = new Date();
    var dayNames = ['日','月','火','水','木','金','土'];
    var h = String(now.getHours()).padStart(2,'0');
    var m = String(now.getMinutes()).padStart(2,'0');
    return '<span class="topbar-data">' + (now.getMonth()+1) + '/' + now.getDate() + '(' + dayNames[now.getDay()] + ') ' + h + ':' + m + '</span>';
  }

  function _renderMonthSales() {
    var tot = typeof moTot === 'function' ? moTot() : 0;
    return '<span class="topbar-data">今月 ¥' + fmt(tot) + '</span>';
  }

  function _renderPresetName() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (!preset) return '';
    return '<span class="topbar-data">' + escHtml(preset.name) + '</span>';
  }

  function _renderSettingsIcon() {
    return '<button class="topbar-btn" onclick="openOverlay(\'settings\')" title="設定">⚙️</button>';
  }

  function _renderThemeIcon() {
    return '<button class="topbar-btn" onclick="openOverlay(\'theme\')" title="テーマ">🎨</button>';
  }

  function _renderEditAdvancedIcon() {
    return '<button class="topbar-btn" onclick="if(typeof openOverlay===\'function\')openOverlay(\'detailSettings\')" title="詳細設定">🔧</button>';
  }

  function _renderTodaySalesCompact() {
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    return '<span class="topbar-data-compact">¥' + fmt(tot) + '</span>';
  }

  function _renderTodayCountCompact() {
    var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
    return '<span class="topbar-data-compact">' + cnt + '件</span>';
  }

  /* ---------- フローティングハンバーガー ---------- */
  function _showFloatingHamburger(show) {
    var existing = document.getElementById('floating-hamburger');
    if (show) {
      if (!existing) {
        var btn = document.createElement('button');
        btn.id = 'floating-hamburger';
        btn.className = 'floating-hamburger';
        btn.setAttribute('aria-label', 'メニューを開く');
        btn.textContent = '☰';
        btn.onclick = function() { if (typeof toggleSidebar === 'function') toggleSidebar(); };
        document.getElementById('app').appendChild(btn);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  /* ---------- トップバー設定UI（編集モード用） ---------- */
  function renderTopbarSettings() {
    var cfg = getTopbarConfig();
    var html = '';

    html += '<div id="topbar-settings-container">';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📐 トップバー設定</div>';

    /* 表示/非表示 */
    html += '<div class="flex flex-between items-center mb12">';
    html += '<span class="fz-s">トップバーを表示</span>';
    html += '<label class="topbar-toggle">';
    html += '<input type="checkbox" ' + (cfg.show !== false ? 'checked' : '') + ' onchange="toggleTopbarVisibility(this.checked)">';
    html += '<span class="topbar-toggle-slider"></span>';
    html += '</label>';
    html += '</div>';

    if (cfg.show !== false) {
      /* 左スロット */
      html += _renderSlotPicker('leftCustom', '左側の表示', cfg.leftCustom || 'appName');
      /* 中央スロット */
      html += _renderSlotPicker('center', '中央の表示', cfg.center || 'none');
      /* 右スロット */
      html += _renderSlotPicker('rightCustom', '右側の表示', cfg.rightCustom || 'none');
    }

    html += '</div></div>';
    html += '</div>';
    return html;
  }

  function _renderSlotPicker(slotName, label, currentId) {
    var options = TOPBAR_SLOT_OPTIONS[slotName];
    if (!options) return '';
    var html = '<div class="mb12">';
    html += '<div class="fz-xs c-muted mb4">' + escHtml(label) + '</div>';
    html += '<div class="flex flex-wrap gap4">';
    options.forEach(function(opt) {
      var isActive = opt.id === currentId;
      html += '<button class="pill' + (isActive ? ' active' : '') + '" ';
      html += 'onclick="setTopbarSlot(\'' + escJs(slotName) + '\',\'' + escJs(opt.id) + '\')">';
      html += escHtml(opt.label);
      html += '</button>';
    });
    html += '</div></div>';
    return html;
  }

  /* ---------- 設定変更 ---------- */
  function toggleTopbarVisibility(show) {
    var cfg = getTopbarConfig();
    cfg.show = show;
    saveTopbarConfig(cfg);
    renderTopbar();
    _refreshTopbarSettingsUI();
  }

  function setTopbarSlot(slotName, optionId) {
    hp();
    var cfg = getTopbarConfig();
    cfg[slotName] = optionId;
    saveTopbarConfig(cfg);
    renderTopbar();
    _refreshTopbarSettingsUI();
  }

  function _refreshTopbarSettingsUI() {
    var container = document.getElementById('topbar-settings-container');
    if (container) {
      container.outerHTML = renderTopbarSettings();
    }
  }

  /* ---------- トップバー定期更新（時計表示時） ---------- */
  var _topbarTimer = null;

  function startTopbarUpdater() {
    stopTopbarUpdater();
    _topbarTimer = setInterval(function() {
      var cfg = getTopbarConfig();
      var needsUpdate = (cfg.leftCustom === 'dateTime' || cfg.center === 'dateTime' ||
                         cfg.leftCustom === 'todaySales' || cfg.leftCustom === 'todaySalesCount' ||
                         cfg.leftCustom === 'todayProfit' || cfg.center === 'todaySales');
      if (needsUpdate) renderTopbar();
    }, 60000); /* 1分ごと */
  }

  function stopTopbarUpdater() {
    if (_topbarTimer) {
      clearInterval(_topbarTimer);
      _topbarTimer = null;
    }
  }

  /* ---------- Expose ---------- */
  window.renderTopbar = renderTopbar;
  window.renderTopbarSettings = renderTopbarSettings;
  window.getTopbarConfig = getTopbarConfig;
  window.saveTopbarConfig = saveTopbarConfig;
  window.toggleTopbarVisibility = toggleTopbarVisibility;
  window.setTopbarSlot = setTopbarSlot;
  window.startTopbarUpdater = startTopbarUpdater;
  window.stopTopbarUpdater = stopTopbarUpdater;
  window.TOPBAR_SLOT_OPTIONS = TOPBAR_SLOT_OPTIONS;

})();
