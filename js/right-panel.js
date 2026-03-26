/* ==========================================================
   DeliEasy v2 — js/right-panel.js
   右サイドバー（情報パネル）— スワイプで閉じる対応 + 感度設定対応
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _touchStartX = 0;
  var _touchStartY = 0;
  var _touchCurrentX = 0;
  var _tracking = false;

  /* パネル内スワイプ用 */
  var _panelTouchStartX = 0;
  var _panelTouchStartY = 0;
  var _panelTracking = false;
  var _panelTranslateX = 0;

  /* ---------- ジェスチャー設定参照ヘルパー ---------- */
  function _gc(key) {
    if (typeof getGestureConfig === 'function') {
      var cfg = getGestureConfig();
      if (cfg[key] !== undefined) return cfg[key];
    }
    /* フォールバック */
    var defaults = { rightEdgeWidth: 25, rightOpenThreshold: 60, rightCloseThreshold: 50, closeThreshold: 50 };
    return defaults[key] || 50;
  }

  /* ---------- セクション定義 ---------- */
  var RIGHT_PANEL_SECTIONS = [
    { id: 'todaySummary',   name: '今日のサマリー',   icon: '📊', render: _renderTodaySummary },
    { id: 'recentRecords',  name: '直近の記録',       icon: '📋', render: _renderRecentRecords },
    { id: 'weekSummary',    name: '今週のまとめ',     icon: '📅', render: _renderWeekSummary },
    { id: 'monthSummary',   name: '今月のまとめ',     icon: '📆', render: _renderMonthSummary },
    { id: 'goalProgress',   name: '目標進捗',         icon: '🎯', render: _renderGoalProgress },
    { id: 'pfBreakdown',    name: 'PF別（今日）',     icon: '📦', render: _renderPfBreakdown },
    { id: 'streak',         name: '連続稼働日数',     icon: '🔥', render: _renderStreak },
    { id: 'todayExpenses',  name: '今日の経費',       icon: '💸', render: _renderTodayExpenses },
    { id: 'quickStats',     name: 'クイック統計',     icon: '📈', render: _renderQuickStats }
  ];

  /* ---------- デフォルト設定 ---------- */
  var DEFAULT_RIGHT_PANEL_CFG = {
    sections: ['todaySummary', 'recentRecords', 'weekSummary']
  };

  /* ---------- 設定取得/保存 ---------- */
  function getRightPanelConfig() {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset && preset.rightSidebar) return preset.rightSidebar;
    return S.g('right_panel', DEFAULT_RIGHT_PANEL_CFG);
  }

  function saveRightPanelConfig(cfg) {
    var preset = typeof getActivePreset === 'function' ? getActivePreset() : null;
    if (preset) {
      preset.rightSidebar = cfg;
      if (typeof savePreset === 'function') savePreset(preset);
    }
    S.s('right_panel', cfg);
  }

  /* ---------- 右パネル描画 ---------- */
  function renderRightPanel() {
    var panel = document.getElementById('right-panel');
    if (!panel) return;

    var cfg = getRightPanelConfig();
    var sections = cfg.sections || DEFAULT_RIGHT_PANEL_CFG.sections;

    var html = '';
    html += '<div class="right-panel-header">';
    html += '<span class="fz-s fw6">📊 情報パネル</span>';
    html += '<button class="btn btn-icon" onclick="closeRightPanel()" aria-label="閉じる">✕</button>';
    html += '</div>';

    html += '<div class="right-panel-body">';
    sections.forEach(function(secId) {
      var secDef = _findSection(secId);
      if (!secDef) return;
      html += '<div class="right-panel-section">';
      html += '<div class="right-panel-section-title">' + secDef.icon + ' ' + escHtml(secDef.name) + '</div>';
      html += '<div class="right-panel-section-body">';
      try {
        html += secDef.render();
      } catch(e) {
        html += '<span class="fz-xs c-muted">表示エラー</span>';
      }
      html += '</div></div>';
    });
    html += '</div>';

    panel.innerHTML = html;

    /* パネル内スワイプで閉じる */
    _initPanelSwipeToClose(panel);
  }

  function _findSection(id) {
    for (var i = 0; i < RIGHT_PANEL_SECTIONS.length; i++) {
      if (RIGHT_PANEL_SECTIONS[i].id === id) return RIGHT_PANEL_SECTIONS[i];
    }
    return null;
  }

  /* ---------- パネル内スワイプで閉じる ---------- */
  function _initPanelSwipeToClose(panel) {
    if (panel._swipeCloseInit) return;
    panel._swipeCloseInit = true;

    panel.addEventListener('touchstart', function(e) {
      if (!_isOpen) return;
      _panelTouchStartX = e.touches[0].clientX;
      _panelTouchStartY = e.touches[0].clientY;
      _panelTracking = true;
      _panelTranslateX = 0;
      panel.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', function(e) {
      if (!_panelTracking) return;
      var dx = e.touches[0].clientX - _panelTouchStartX;
      var dy = Math.abs(e.touches[0].clientY - _panelTouchStartY);

      /* 縦スクロールが主なら追跡をやめる */
      if (dy > Math.abs(dx) * 2 && Math.abs(dx) < 20) {
        _panelTracking = false;
        panel.style.transition = '';
        panel.style.transform = '';
        return;
      }

      /* 右方向のみ（正の値） */
      if (dx > 0) {
        _panelTranslateX = dx;
        panel.style.transform = 'translateX(' + dx + 'px)';
        /* オーバーレイの透明度も追従 */
        var overlay = document.getElementById('right-panel-overlay');
        if (overlay) {
          var progress = Math.min(dx / 200, 1);
          overlay.style.opacity = 1 - progress;
        }
      }
    }, { passive: true });

    panel.addEventListener('touchend', function() {
      if (!_panelTracking) return;
      _panelTracking = false;
      panel.style.transition = '';

      var overlay = document.getElementById('right-panel-overlay');
      if (overlay) overlay.style.opacity = '';

      if (_panelTranslateX > _gc('rightCloseThreshold')) {
        /* 十分にスワイプした → 閉じる */
        closeRightPanel();
      } else {
        /* 戻す */
        panel.style.transform = '';
      }
      _panelTranslateX = 0;
    }, { passive: true });
  }

  /* ---------- セクションレンダラー ---------- */
  function _renderTodaySummary() {
    var tot = typeof tdTot === 'function' ? tdTot() : 0;
    var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
    var avg = cnt > 0 ? Math.round(tot / cnt) : 0;
    var exps = S.g('exps', []).filter(function(e) { return e.date === TD; });
    var expTot = exps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);
    var profit = tot - expTot;

    return '<div class="rp-stat-grid">' +
      '<div class="rp-stat"><span class="rp-stat-label">売上</span><span class="rp-stat-value c-primary">¥' + fmt(tot) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">件数</span><span class="rp-stat-value">' + cnt + '件</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">単価</span><span class="rp-stat-value">¥' + fmt(avg) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">経費</span><span class="rp-stat-value c-danger">¥' + fmt(expTot) + '</span></div>' +
      '<div class="rp-stat rp-stat-full"><span class="rp-stat-label">利益</span><span class="rp-stat-value ' + (profit >= 0 ? 'c-success' : 'c-danger') + '">¥' + fmt(profit) + '</span></div>' +
    '</div>';
  }

  function _renderRecentRecords() {
    var all = typeof getE === 'function' ? getE() : [];
    var recent = all.slice(-5).reverse();
    if (recent.length === 0) return '<div class="fz-xs c-muted">記録なし</div>';
    var html = '';
    recent.forEach(function(r) {
      var pf = typeof extractPf === 'function' ? extractPf(r.m) : '';
      var pfCol = pf && typeof pfColor === 'function' ? pfColor(pf) : '';
      html += '<div class="rp-record">';
      if (pfCol) html += '<span class="rp-record-dot" style="background:' + pfCol + '"></span>';
      html += '<span class="rp-record-pf">' + escHtml(pf || '—') + '</span>';
      html += '<span class="rp-record-amt">¥' + fmt(r.a) + '</span>';
      html += '<span class="rp-record-cnt">' + r.c + '件</span>';
      html += '</div>';
    });
    return html;
  }

  function _renderWeekSummary() {
    var data = typeof wkData === 'function' ? wkData() : { tot: 0, cnt: 0, days: 0 };
    var avg = data.cnt > 0 ? Math.round(data.tot / data.cnt) : 0;
    return '<div class="rp-stat-grid">' +
      '<div class="rp-stat"><span class="rp-stat-label">売上</span><span class="rp-stat-value">¥' + fmt(data.tot) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">件数</span><span class="rp-stat-value">' + data.cnt + '件</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">単価</span><span class="rp-stat-value">¥' + fmt(avg) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">稼働日</span><span class="rp-stat-value">' + data.days + '日</span></div>' +
    '</div>';
  }

  function _renderMonthSummary() {
    var tot = typeof moTot === 'function' ? moTot() : 0;
    var cnt = typeof moCnt === 'function' ? moCnt() : 0;
    var days = typeof moDays === 'function' ? moDays() : 0;
    var avg = cnt > 0 ? Math.round(tot / cnt) : 0;
    return '<div class="rp-stat-grid">' +
      '<div class="rp-stat"><span class="rp-stat-label">売上</span><span class="rp-stat-value">¥' + fmt(tot) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">件数</span><span class="rp-stat-value">' + cnt + '件</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">単価</span><span class="rp-stat-value">¥' + fmt(avg) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">稼働日</span><span class="rp-stat-value">' + days + '日</span></div>' +
    '</div>';
  }

  function _renderGoalProgress() {
    var goal = S.g('monthlyGoal', 0);
    var tot = typeof moTot === 'function' ? moTot() : 0;
    if (!goal || goal <= 0) return '<div class="fz-xs c-muted">目標未設定</div>';
    var pct = Math.min(Math.round(tot / goal * 100), 100);
    return '<div class="rp-goal">' +
      '<div class="rp-goal-text">¥' + fmt(tot) + ' / ¥' + fmt(goal) + '</div>' +
      '<div class="rp-goal-bar"><div class="rp-goal-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="rp-goal-pct">' + pct + '% 達成</div>' +
    '</div>';
  }

  function _renderPfBreakdown() {
    var records = typeof eByDate === 'function' ? eByDate(TD) : [];
    if (records.length === 0) return '<div class="fz-xs c-muted">今日のデータなし</div>';
    var pfMap = {};
    var total = 0;
    records.forEach(function(r) {
      var pf = typeof extractPf === 'function' ? extractPf(r.m) : '不明';
      if (!pf) pf = '不明';
      if (!pfMap[pf]) pfMap[pf] = 0;
      pfMap[pf] += Number(r.a) || 0;
      total += Number(r.a) || 0;
    });
    var html = '';
    Object.keys(pfMap).sort(function(a,b) { return pfMap[b] - pfMap[a]; }).forEach(function(pf) {
      var amt = pfMap[pf];
      var pct = total > 0 ? Math.round(amt / total * 100) : 0;
      var color = typeof pfColor === 'function' ? pfColor(pf) : 'var(--c-primary)';
      html += '<div class="rp-pf-row">';
      html += '<span class="rp-pf-dot" style="background:' + color + '"></span>';
      html += '<span class="rp-pf-name">' + escHtml(pf) + '</span>';
      html += '<span class="rp-pf-val">¥' + fmt(amt) + '</span>';
      html += '<span class="rp-pf-pct">' + pct + '%</span>';
      html += '</div>';
    });
    return html;
  }

  function _renderStreak() {
    var all = typeof getE === 'function' ? getE() : [];
    var daysSet = {};
    all.forEach(function(r) { daysSet[r.d] = true; });
    var streak = 0;
    var d = new Date();
    if (!daysSet[dateKey(d)]) d.setDate(d.getDate() - 1);
    while (daysSet[dateKey(d)]) { streak++; d.setDate(d.getDate() - 1); }
    return '<div class="rp-streak">🔥 <span class="rp-streak-num">' + streak + '</span>日連続稼働</div>';
  }

  function _renderTodayExpenses() {
    var exps = S.g('exps', []).filter(function(e) { return e.date === TD; });
    if (exps.length === 0) return '<div class="fz-xs c-muted">今日の経費なし</div>';
    var html = '';
    exps.forEach(function(e) {
      html += '<div class="rp-exp-row">';
      html += '<span class="rp-exp-cat">' + escHtml(e.cat || 'その他') + '</span>';
      html += '<span class="rp-exp-amt c-danger">-¥' + fmt(e.amount) + '</span>';
      html += '</div>';
    });
    return html;
  }

  function _renderQuickStats() {
    var tot = typeof moTot === 'function' ? moTot() : 0;
    var days = typeof moDays === 'function' ? moDays() : 0;
    var dailyAvg = days > 0 ? Math.round(tot / days) : 0;
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var pace = days > 0 ? Math.round(tot / days * daysInMonth) : 0;
    return '<div class="rp-stat-grid">' +
      '<div class="rp-stat"><span class="rp-stat-label">日平均</span><span class="rp-stat-value">¥' + fmt(dailyAvg) + '</span></div>' +
      '<div class="rp-stat"><span class="rp-stat-label">月末予測</span><span class="rp-stat-value">¥' + fmt(pace) + '</span></div>' +
    '</div>';
  }

  /* ---------- 開閉 ---------- */
  function openRightPanel() {
    if (_isOpen) return;
    _isOpen = true;
    hp();
    renderRightPanel();
    var overlay = document.getElementById('right-panel-overlay');
    var panel = document.getElementById('right-panel');
    if (overlay) { overlay.classList.add('open'); overlay.style.opacity = ''; }
    if (panel) { panel.classList.add('open'); panel.style.transform = ''; }
  }

  function closeRightPanel() {
    if (!_isOpen) return;
    _isOpen = false;
    var overlay = document.getElementById('right-panel-overlay');
    var panel = document.getElementById('right-panel');
    if (overlay) { overlay.classList.remove('open'); overlay.style.opacity = ''; }
    if (panel) { panel.classList.remove('open'); panel.style.transform = ''; }
  }

  function isRightPanelOpen() { return _isOpen; }

  /* ---------- 右端スワイプで開く ---------- */
  function initRightPanelGestures() {
    document.addEventListener('touchstart', function(e) {
      var screenW = window.innerWidth;
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
      /* 画面右端から検出幅以内のスワイプを検知 */
      _tracking = (_touchStartX > screenW - _gc('rightEdgeWidth')) && !_isOpen;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!_tracking) return;
      _touchCurrentX = e.touches[0].clientX;
      var dx = _touchStartX - _touchCurrentX;
      var dy = Math.abs(e.touches[0].clientY - _touchStartY);
      if (dx > _gc('rightOpenThreshold') && dx > dy * 1.5) {
        _tracking = false;
        openRightPanel();
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      _tracking = false;
    }, { passive: true });
  }

  /* ---------- 設定UI ---------- */
  function renderRightPanelSettings() {
    var cfg = getRightPanelConfig();
    var activeSections = cfg.sections || DEFAULT_RIGHT_PANEL_CFG.sections;

    var html = '';
    html += '<div id="right-panel-settings-container">';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📊 右パネル設定</div>';
    html += '<div class="fz-xs c-muted mb8">表示するセクションを選択してください。</div>';

    RIGHT_PANEL_SECTIONS.forEach(function(sec) {
      var isActive = activeSections.indexOf(sec.id) >= 0;
      html += '<div class="flex flex-between items-center mb8">';
      html += '<span class="fz-s">' + sec.icon + ' ' + escHtml(sec.name) + '</span>';
      html += '<label class="topbar-toggle">';
      html += '<input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="toggleRightPanelSection(\'' + escJs(sec.id) + '\',this.checked)">';
      html += '<span class="topbar-toggle-slider"></span>';
      html += '</label>';
      html += '</div>';
    });

    html += '</div></div>';
    html += '</div>';
    return html;
  }

  function toggleRightPanelSection(secId, show) {
    hp();
    var cfg = getRightPanelConfig();
    var sections = cfg.sections || DEFAULT_RIGHT_PANEL_CFG.sections.slice();
    if (show) {
      if (sections.indexOf(secId) < 0) sections.push(secId);
    } else {
      sections = sections.filter(function(s) { return s !== secId; });
    }
    cfg.sections = sections;
    saveRightPanelConfig(cfg);
    _refreshRightPanelSettingsUI();
  }

  function _refreshRightPanelSettingsUI() {
    var container = document.getElementById('right-panel-settings-container');
    if (container) {
      container.outerHTML = renderRightPanelSettings();
    }
  }

  /* ---------- Expose ---------- */
  window.openRightPanel = openRightPanel;
  window.closeRightPanel = closeRightPanel;
  window.isRightPanelOpen = isRightPanelOpen;
  window.renderRightPanel = renderRightPanel;
  window.renderRightPanelSettings = renderRightPanelSettings;
  window.initRightPanelGestures = initRightPanelGestures;
  window.getRightPanelConfig = getRightPanelConfig;
  window.saveRightPanelConfig = saveRightPanelConfig;
  window.toggleRightPanelSection = toggleRightPanelSection;
  window.RIGHT_PANEL_SECTIONS = RIGHT_PANEL_SECTIONS;

})();
