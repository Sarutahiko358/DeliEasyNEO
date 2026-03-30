/* ==========================================================
   DeliEasy v2 — js/spreadsheet.js
   スプレッドシート形式の売上・経費管理ビュー
   ========================================================== */
(function(){
  'use strict';

  /* @depends: utils.js, storage.js, earns-db.js, overlay.js
     @provides: openSpreadsheetMain, closeSpreadsheetMain */

  /* ===== プリセットレイアウト ===== */
  var LAYOUT_PRESETS = {
    simple: {
      name: 'シンプル',
      desc: '売上と利益だけ確認',
      columns: ['date','dow','total','count','unit','expTotal','profit']
    },
    detailed: {
      name: '詳細',
      desc: 'PF別・経費別・時間も全部見る',
      columns: ['date','dow','pf_uber','pf_demae','pf_wolt','pf_menu','total','count','unit','exp_gas','exp_other','expTotal','profit','memo']
    },
    profitFocus: {
      name: '収支重視',
      desc: '経費と利益にフォーカス',
      columns: ['date','dow','total','count','exp_gas','exp_bike','exp_phone','exp_other','expTotal','profit']
    }
  };

  /* ===== 状態管理 ===== */
  var _mainOverlayDefs = {};
  var _state = {};
  // _state[overlayId] = { tab, year, month, editingCell }

  function _getState(oId) {
    if (!_state[oId]) {
      var now = new Date();
      _state[oId] = {
        tab: 'monthly',
        year: now.getFullYear(),
        month: now.getMonth(),
        annualYear: now.getFullYear(),
        editingCell: null
      };
    }
    return _state[oId];
  }

  /* ===== データアクセス ===== */
  function _getLayout(oId) {
    var raw = S.g('ss_layout_' + oId, null);
    if (raw && raw.columns) return raw;
    return _generateDefaultLayout(oId);
  }

  function _saveLayout(oId, layout) {
    S.s('ss_layout_' + oId, layout);
  }

  function _getExtra(oId) {
    return S.g('ss_extra_' + oId, {});
  }

  function _saveExtra(oId, data) {
    S.s('ss_extra_' + oId, data);
  }

  function _generateDefaultLayout() {
    var pfs = getAllPFs().filter(function(p) { return p.active !== false; });
    var columns = [
      { id: 'date', name: '日付', type: 'auto', width: 70, visible: true, locked: true },
      { id: 'dow', name: '曜日', type: 'auto', width: 36, visible: true, locked: true }
    ];
    pfs.forEach(function(pf) {
      columns.push({
        id: 'pf_' + pf.name.replace(/\s+/g, '_').toLowerCase(),
        name: pf.name,
        type: 'pf',
        width: 80,
        visible: true,
        pfName: pf.name
      });
    });
    columns.push(
      { id: 'total', name: '合計売上', type: 'auto', width: 90, visible: true },
      { id: 'count', name: '件数', type: 'auto', width: 50, visible: true },
      { id: 'unit', name: '単価', type: 'auto', width: 70, visible: true },
      { id: 'exp_gas', name: 'ガソリン', type: 'expense', width: 70, visible: true, expCat: 'ガソリン' },
      { id: 'exp_bike', name: 'バイク維持', type: 'expense', width: 70, visible: false, expCat: 'バイク維持費' },
      { id: 'exp_phone', name: '通信費', type: 'expense', width: 70, visible: false, expCat: 'スマホ通信費' },
      { id: 'exp_other', name: 'その他経費', type: 'expense', width: 70, visible: true, expCat: '__other__' },
      { id: 'expTotal', name: '経費計', type: 'auto', width: 70, visible: true },
      { id: 'profit', name: '利益', type: 'auto', width: 80, visible: true },
      { id: 'memo', name: '備考', type: 'input', width: 120, visible: true }
    );
    return { columns: columns, savedLayouts: [] };
  }

  /* ===== 日別データ集計 ===== */
  function _getDayData(dk, layout) {
    var earns = typeof eByDate === 'function' ? eByDate(dk) : [];
    var allExps = S.g('exps', []);
    var dayExps = allExps.filter(function(e) { return e.date === dk; });

    // PF別売上集計
    var pfSales = {};
    var pfCounts = {};
    earns.forEach(function(r) {
      var pf = extractPf(r.m) || '不明';
      pfSales[pf] = (pfSales[pf] || 0) + (Number(r.a) || 0);
      pfCounts[pf] = (pfCounts[pf] || 0) + (Number(r.c) || 0);
    });

    // 経費カテゴリ別集計
    var expenses = {};
    dayExps.forEach(function(e) {
      var cat = e.cat || 'その他';
      expenses[cat] = (expenses[cat] || 0) + (Number(e.amount) || 0);
    });

    // 個別カテゴリ列のカテゴリ名を収集（__other__計算用）
    var knownExpCats = [];
    if (layout && layout.columns) {
      layout.columns.forEach(function(col) {
        if (col.type === 'expense' && col.expCat && col.expCat !== '__other__') {
          knownExpCats.push(col.expCat);
        }
      });
    }
    var otherExpTotal = 0;
    Object.keys(expenses).forEach(function(cat) {
      if (knownExpCats.indexOf(cat) === -1) {
        otherExpTotal += expenses[cat];
      }
    });

    var totalSales = sumA(earns);
    var totalCount = sumC(earns);
    var expTotal = dayExps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);

    return {
      earns: earns,
      pfSales: pfSales,
      pfCounts: pfCounts,
      totalSales: totalSales,
      totalCount: totalCount,
      expenses: expenses,
      otherExpTotal: otherExpTotal,
      expTotal: expTotal,
      profit: totalSales - expTotal
    };
  }

  /* ===== 月サマリー計算 ===== */
  function _calcMonthSummary(year, month) {
    var mk = year + '-' + String(month + 1).padStart(2, '0');
    var earns = typeof eByMonth === 'function' ? eByMonth(mk) : [];
    var allExps = S.g('exps', []);
    var monthExps = allExps.filter(function(e) {
      return e.date && e.date.substring(0, 7) === mk;
    });
    var totalSales = sumA(earns);
    var totalCount = sumC(earns);
    var totalExpense = monthExps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);
    var workDays = 0;
    var daySet = {};
    earns.forEach(function(r) { daySet[r.d] = true; });
    workDays = Object.keys(daySet).length;

    return {
      totalSales: totalSales,
      totalCount: totalCount,
      totalExpense: totalExpense,
      profit: totalSales - totalExpense,
      workDays: workDays,
      avgUnit: totalCount > 0 ? Math.round(totalSales / totalCount) : 0,
      avgDaily: workDays > 0 ? Math.round(totalSales / workDays) : 0
    };
  }

  /* ===== メインレンダリング ===== */
  function renderSpreadsheet(body, overlay) {
    var oId = overlay.id;
    var st = _getState(oId);

    var html = '<div class="ss-container" id="ss-root-' + escHtml(oId) + '">';

    // タブバー
    html += '<div class="ss-tabs">';
    html += '<button class="ss-tab' + (st.tab === 'monthly' ? ' active' : '') + '" onclick="window._ssTabSwitch(\'' + escJs(oId) + '\',\'monthly\')">📅 月次入力</button>';
    html += '<button class="ss-tab' + (st.tab === 'annual' ? ' active' : '') + '" onclick="window._ssTabSwitch(\'' + escJs(oId) + '\',\'annual\')">📊 月次集計</button>';
    html += '<button class="ss-tab' + (st.tab === 'settings' ? ' active' : '') + '" onclick="window._ssTabSwitch(\'' + escJs(oId) + '\',\'settings\')">⚙ 設定</button>';
    html += '</div>';

    // タブ内容
    html += '<div id="ss-tab-content-' + escHtml(oId) + '">';
    if (st.tab === 'monthly') {
      html += _renderMonthlyTab(overlay);
    } else if (st.tab === 'annual') {
      html += _renderAnnualTab(overlay);
    } else if (st.tab === 'settings') {
      html += _renderSettingsTab(overlay);
    }
    html += '</div>';

    html += '</div>';
    body.innerHTML = html;

    // 設定タブのドラッグ初期化
    if (st.tab === 'settings') {
      setTimeout(function() { _initColDrag(oId); }, 50);
    }
  }

  /* ===== タブ切替 ===== */
  function _ssTabSwitch(oId, tab) {
    hp();
    var st = _getState(oId);
    st.tab = tab;
    st.editingCell = null;
    _refreshSS(oId);
  }

  /* ===== リフレッシュ ===== */
  function _refreshSS(oId) {
    var overlay = null;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === oId) { overlay = list[i]; break; }
    }
    if (!overlay && _mainOverlayDefs[oId]) overlay = _mainOverlayDefs[oId];
    if (!overlay) return;
    var body = document.getElementById('overlay-body-' + oId);
    if (!body) return;
    renderSpreadsheet(body, overlay);
  }

  /* ===== 月次入力タブ ===== */
  function _renderMonthlyTab(overlay) {
    var oId = overlay.id;
    var st = _getState(oId);
    var year = st.year;
    var month = st.month;
    var summary = _calcMonthSummary(year, month);

    var html = '';

    // 月ナビ
    html += '<div class="ss-month-nav">';
    html += '<button class="ss-month-nav-btn" onclick="window._ssMonthNav(\'' + escJs(oId) + '\',-1)">◀</button>';
    html += '<span class="ss-month-label">' + year + '年' + (month + 1) + '月</span>';
    html += '<button class="ss-month-nav-btn" onclick="window._ssMonthNav(\'' + escJs(oId) + '\',1)">▶</button>';
    html += '<button class="ss-today-btn" onclick="window._ssGoToday(\'' + escJs(oId) + '\')">今月</button>';
    html += '</div>';

    // サマリーバー
    html += '<div class="ss-summary-bar">';
    html += '<div class="ss-summary-item"><div class="ss-summary-label">売上</div><div class="ss-summary-value">¥' + fmt(summary.totalSales) + '</div></div>';
    html += '<div class="ss-summary-item"><div class="ss-summary-label">件数</div><div class="ss-summary-value">' + fmt(summary.totalCount) + '件</div></div>';
    html += '<div class="ss-summary-item"><div class="ss-summary-label">経費</div><div class="ss-summary-value">¥' + fmt(summary.totalExpense) + '</div></div>';
    html += '<div class="ss-summary-item"><div class="ss-summary-label">利益</div><div class="ss-summary-value' + (summary.profit >= 0 ? ' ss-cell-profit-positive' : ' ss-cell-profit-negative') + '">¥' + fmt(summary.profit) + '</div></div>';
    html += '</div>';

    // テーブル
    html += _renderTable(overlay, year, month);

    return html;
  }

  /* ===== 月ナビ ===== */
  function _ssMonthNav(oId, delta) {
    hp();
    var st = _getState(oId);
    st.month += delta;
    if (st.month < 0) { st.month = 11; st.year--; }
    if (st.month > 11) { st.month = 0; st.year++; }
    st.editingCell = null;
    _refreshSS(oId);
  }

  function _ssGoToday(oId) {
    hp();
    var now = new Date();
    var st = _getState(oId);
    st.year = now.getFullYear();
    st.month = now.getMonth();
    st.editingCell = null;
    _refreshSS(oId);
  }

  /* ===== テーブル描画 ===== */
  function _renderTable(overlay, year, month) {
    var oId = overlay.id;
    var layout = _getLayout(oId);
    var visCols = layout.columns.filter(function(c) { return c.visible; });
    var extra = _getExtra(oId);
    var mk = year + '-' + String(month + 1).padStart(2, '0');
    var extraMonth = (extra && extra[mk]) ? extra[mk] : {};

    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var todayKey = window.TD || '';

    // 日付列のleft offset計算
    var dateW = 70, dowW = 36;
    for (var ci = 0; ci < visCols.length; ci++) {
      if (visCols[ci].id === 'date') dateW = visCols[ci].width || 70;
      if (visCols[ci].id === 'dow') dowW = visCols[ci].width || 36;
    }

    var html = '<div class="ss-table-wrap">';
    html += '<table class="ss-table">';

    // ヘッダー
    html += '<thead><tr>';
    var leftOffset = 0;
    visCols.forEach(function(col) {
      var cls = '';
      var styleExtra = '';
      if (col.id === 'date') {
        cls = ' class="ss-col-date"';
        styleExtra = 'left:0;';
      } else if (col.id === 'dow') {
        cls = ' class="ss-col-dow"';
        styleExtra = 'left:' + dateW + 'px;';
      }
      var pfDot = '';
      if (col.type === 'pf' && col.pfName) {
        var pc = pfColor(col.pfName);
        pfDot = '<span class="ss-pf-dot" style="background:' + pc + '"></span>';
      }
      html += '<th' + cls + ' style="width:' + (col.width || 70) + 'px;min-width:' + (col.width || 70) + 'px;' + styleExtra + '">' + pfDot + escHtml(col.name) + '</th>';
    });
    html += '</tr></thead>';

    html += '<tbody>';

    // 週小計用累積
    var weekTotals = _createWeekTotals(visCols, layout);
    var weekStarted = false;

    for (var d = 1; d <= daysInMonth; d++) {
      var dk = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var dateObj = new Date(year, month, d);
      var dow = dateObj.getDay();
      var dayData = _getDayData(dk, layout);
      var dayExtra = extraMonth[dk] || {};
      var isToday = dk === todayKey;
      var isHoliday = isJapaneseHoliday(year, month + 1, d);
      var holidayName = isHoliday ? getJapaneseHolidayName(year, month + 1, d) : '';

      // 月曜で週小計リセット（前の週があれば週小計行を挿入）
      if (dow === 1 && weekStarted) {
        html += _renderWeekTotalRow(visCols, weekTotals, layout, dateW);
        weekTotals = _createWeekTotals(visCols, layout);
      }
      weekStarted = true;

      // 行クラス
      var rowCls = '';
      if (isToday) rowCls = ' ss-row-today';

      html += '<tr class="' + rowCls + '">';

      visCols.forEach(function(col) {
        var val = _getCellValue(col, dk, dayData, dayExtra, layout, extraMonth);
        var cellCls = '';
        var cellStyle = '';
        var tdCls = '';

        if (col.id === 'date') {
          tdCls = ' class="ss-col-date"';
          cellStyle = 'left:0;text-align:center;';
        } else if (col.id === 'dow') {
          tdCls = ' class="ss-col-dow"';
          cellStyle = 'left:' + dateW + 'px;text-align:center;';
        }

        var isEditable = col.type === 'pf' || col.type === 'expense' || col.type === 'input';
        if (isEditable) {
          cellCls = 'ss-cell-editable';
        } else {
          cellCls = 'ss-cell-auto';
        }

        // 特殊セルスタイル
        if (col.id === 'profit') {
          if (val > 0) cellCls += ' ss-cell-profit-positive';
          else if (val < 0) cellCls += ' ss-cell-profit-negative';
        }
        if (col.id === 'dow') {
          if (dow === 6) cellCls += ' ss-dow-sat';
          else if (dow === 0) cellCls += ' ss-dow-sun';
          if (isHoliday && dow !== 0) cellCls += ' ss-dow-holiday';
        }

        var displayVal = _formatCellValue(col, val, dk, dow, d, isHoliday, holidayName);

        // 編集中セル
        var st = _getState(oId);
        if (st.editingCell && st.editingCell.date === dk && st.editingCell.colId === col.id) {
          var inputType = col.type === 'input' && col.id === 'memo' ? 'text' : 'number';
          html += '<td' + tdCls + ' class="ss-cell-editing" style="' + cellStyle + '">';
          html += '<input type="' + inputType + '" id="ss-edit-input" value="' + escHtml(String(val || '')) + '" ';
          html += 'onblur="window._ssCellCommit(\'' + escJs(oId) + '\',\'' + escJs(dk) + '\',\'' + escJs(col.id) + '\',\'' + escJs(col.type) + '\',this.value)" ';
          html += 'onkeydown="if(event.key===\'Enter\'){this.blur();}" ';
          html += 'style="width:' + ((col.width || 70) - 12) + 'px" autofocus>';
          html += '</td>';
        } else if (isEditable) {
          html += '<td' + tdCls + ' class="' + cellCls + '" style="' + cellStyle + '" onclick="window._ssCellTap(\'' + escJs(oId) + '\',\'' + escJs(dk) + '\',\'' + escJs(col.id) + '\',\'' + escJs(col.type) + '\')">';
          if (val === 0 || val === '' || val === null || val === undefined) {
            html += '<span class="ss-cell-empty">-</span>';
          } else {
            html += displayVal;
          }
          html += '</td>';
        } else {
          html += '<td' + tdCls + ' class="' + cellCls + '" style="' + cellStyle + '">';
          if ((val === 0 || val === '' || val === null || val === undefined) && col.id !== 'date' && col.id !== 'dow' && col.id !== 'count') {
            html += '<span class="ss-cell-empty">-</span>';
          } else {
            html += displayVal;
          }
          html += '</td>';
        }

        // 週小計累積
        _accumulateWeekTotal(weekTotals, col, dayData, dayExtra, layout, extraMonth, dk);
      });

      html += '</tr>';

      // 日曜（月末最終日）の後に週小計挿入
      if (dow === 0 && d < daysInMonth) {
        html += _renderWeekTotalRow(visCols, weekTotals, layout, dateW);
        weekTotals = _createWeekTotals(visCols, layout);
        weekStarted = false;
      }
    }

    // 最後の週の小計
    if (weekStarted) {
      html += _renderWeekTotalRow(visCols, weekTotals, layout, dateW);
    }

    html += '</tbody>';

    // 月合計行
    html += '<tfoot>';
    html += _renderMonthTotalRow(overlay, visCols, year, month, layout, dateW);
    html += '</tfoot>';

    html += '</table></div>';
    return html;
  }

  /* ===== セル値取得 ===== */
  function _getCellValue(col, dk, dayData, dayExtra, layout, extraMonth) {
    switch (col.id) {
      case 'date': return dk;
      case 'dow': return dk;
      case 'total': return dayData.totalSales;
      case 'count': return dayData.totalCount;
      case 'unit': return dayData.totalCount > 0 ? Math.round(dayData.totalSales / dayData.totalCount) : 0;
      case 'expTotal': return dayData.expTotal;
      case 'profit': return dayData.profit;
      case 'memo': return dayExtra.memo || '';
      default:
        break;
    }
    if (col.type === 'pf' && col.pfName) {
      return dayData.pfSales[col.pfName] || 0;
    }
    if (col.type === 'expense') {
      if (col.expCat === '__other__') return dayData.otherExpTotal;
      return dayData.expenses[col.expCat] || 0;
    }
    return '';
  }

  /* ===== セル表示フォーマット ===== */
  function _formatCellValue(col, val, dk, dow, dayNum, isHoliday, holidayName) {
    if (col.id === 'date') {
      return (new Date(dk).getMonth() + 1) + '/' + dayNum;
    }
    if (col.id === 'dow') {
      var dayName = window.DAYS[dow];
      if (isHoliday && holidayName) {
        return '<span title="' + escHtml(holidayName) + '">' + dayName + '</span>';
      }
      return dayName;
    }
    if (col.id === 'count') return val;
    if (col.id === 'memo') return escHtml(String(val || ''));
    if (typeof val === 'number' && val !== 0) return fmt(val);
    if (val === 0) return '0';
    return escHtml(String(val || ''));
  }

  /* ===== 週小計 ===== */
  function _createWeekTotals(visCols) {
    var t = {};
    visCols.forEach(function(col) {
      t[col.id] = 0;
    });
    t._days = 0;
    t._salesDays = 0;
    return t;
  }

  function _accumulateWeekTotal(weekTotals, col, dayData, dayExtra, layout, extraMonth, dk) {
    // 1日あたり1回だけカウント（最初の列でカウント）
    if (col.id === 'date') {
      weekTotals._days++;
      if (dayData.totalSales > 0 || dayData.totalCount > 0) weekTotals._salesDays++;
    }
    if (col.type === 'pf' && col.pfName) {
      weekTotals[col.id] += (dayData.pfSales[col.pfName] || 0);
    } else if (col.id === 'total') {
      weekTotals[col.id] += dayData.totalSales;
    } else if (col.id === 'count') {
      weekTotals[col.id] += dayData.totalCount;
    } else if (col.id === 'expTotal') {
      weekTotals[col.id] += dayData.expTotal;
    } else if (col.id === 'profit') {
      weekTotals[col.id] += dayData.profit;
    } else if (col.type === 'expense') {
      if (col.expCat === '__other__') {
        weekTotals[col.id] += dayData.otherExpTotal;
      } else {
        weekTotals[col.id] += (dayData.expenses[col.expCat] || 0);
      }
    } else if (col.id === 'memo') {
      // memo は小計なし
    }
  }

  function _renderWeekTotalRow(visCols, weekTotals, layout, dateW) {
    var html = '<tr class="ss-row-week-total">';
    visCols.forEach(function(col) {
      var tdCls = '';
      var style = '';
      if (col.id === 'date') { tdCls = ' class="ss-col-date"'; style = 'left:0;text-align:center;'; }
      else if (col.id === 'dow') { tdCls = ' class="ss-col-dow"'; style = 'left:' + dateW + 'px;text-align:center;'; }

      var val = '';
      if (col.id === 'date') { val = '週計'; }
      else if (col.id === 'dow') { val = ''; }
      else if (col.id === 'unit') {
        val = weekTotals['count'] > 0 ? fmt(Math.round(weekTotals['total'] / weekTotals['count'])) : '';
      } else if (col.id === 'memo') {
        val = '';
      } else if (weekTotals[col.id] && typeof weekTotals[col.id] === 'number') {
        val = fmt(weekTotals[col.id]);
      }

      html += '<td' + tdCls + ' style="' + style + '">' + val + '</td>';
    });
    html += '</tr>';
    return html;
  }

  function _renderMonthTotalRow(overlay, visCols, year, month, layout, dateW) {
    var oId = overlay.id;
    var mk = year + '-' + String(month + 1).padStart(2, '0');
    var extra = _getExtra(oId);
    var extraMonth = (extra && extra[mk]) ? extra[mk] : {};
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // 月全体の累積
    var totals = _createWeekTotals(visCols, layout);
    for (var d = 1; d <= daysInMonth; d++) {
      var dk = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var dayData = _getDayData(dk, layout);
      var dayExtra = extraMonth[dk] || {};
      visCols.forEach(function(col) {
        _accumulateWeekTotal(totals, col, dayData, dayExtra, layout, extraMonth, dk);
      });
    }

    var html = '<tr class="ss-row-month-total">';
    visCols.forEach(function(col) {
      var tdCls = '';
      var style = '';
      if (col.id === 'date') { tdCls = ' class="ss-col-date"'; style = 'left:0;text-align:center;'; }
      else if (col.id === 'dow') { tdCls = ' class="ss-col-dow"'; style = 'left:' + dateW + 'px;text-align:center;'; }

      var val = '';
      if (col.id === 'date') { val = '月計'; }
      else if (col.id === 'dow') { val = ''; }
      else if (col.id === 'unit') {
        val = totals['count'] > 0 ? fmt(Math.round(totals['total'] / totals['count'])) : '';
      } else if (col.id === 'memo') {
        val = '';
      } else if (totals[col.id] && typeof totals[col.id] === 'number') {
        val = fmt(totals[col.id]);
      }

      html += '<td' + tdCls + ' style="' + style + '">' + val + '</td>';
    });
    html += '</tr>';
    return html;
  }

  /* ===== セル編集 ===== */
  function _ssCellTap(oId, dk, colId, colType) {
    hp();
    var st = _getState(oId);
    st.editingCell = { date: dk, colId: colId };
    _refreshSS(oId);
    // オートフォーカス
    setTimeout(function() {
      var input = document.getElementById('ss-edit-input');
      if (input) { input.focus(); input.select(); }
    }, 50);
  }

  function _ssCellCommit(oId, dk, colId, colType, rawValue) {
    var st = _getState(oId);
    st.editingCell = null;
    var value = rawValue;

    if (colType === 'pf') {
      _commitPfCell(oId, dk, colId, value);
    } else if (colType === 'expense') {
      _commitExpenseCell(oId, dk, colId, value);
    } else if (colType === 'input') {
      _commitInputCell(oId, dk, colId, value);
    }

    _refreshSS(oId);
  }

  function _commitPfCell(oId, dk, colId, value) {
    var layout = _getLayout(oId);
    var col = null;
    for (var i = 0; i < layout.columns.length; i++) {
      if (layout.columns[i].id === colId) { col = layout.columns[i]; break; }
    }
    if (!col || !col.pfName) return;

    var amount = Number(value) || 0;
    var pfName = col.pfName;

    // 既存のその日のそのPFのレコードを検索
    var earns = typeof eByDate === 'function' ? eByDate(dk) : [];
    var existing = null;
    for (var j = 0; j < earns.length; j++) {
      var recPf = extractPf(earns[j].m);
      if (recPf === pfName) {
        existing = earns[j];
        break;
      }
    }

    if (amount === 0) {
      // 金額0なら既存レコード削除
      if (existing) {
        deleteE(existing.ts).catch(function(e) { console.error('[Spreadsheet] deleteE fail:', e); });
      }
    } else if (existing) {
      // 既存レコード更新
      updateE(existing.ts, { a: amount }).catch(function(e) { console.error('[Spreadsheet] updateE fail:', e); });
    } else {
      // 新規追加（notify=false でトースト抑制）
      addE(dk, amount, 1, '/' + pfName, null, false, null).catch(function(e) { console.error('[Spreadsheet] addE fail:', e); });
    }
  }

  function _commitExpenseCell(oId, dk, colId, value) {
    var layout = _getLayout(oId);
    var col = null;
    for (var i = 0; i < layout.columns.length; i++) {
      if (layout.columns[i].id === colId) { col = layout.columns[i]; break; }
    }
    if (!col) return;

    var amount = Number(value) || 0;
    var expCat = col.expCat;
    if (expCat === '__other__') return; // その他経費は直接編集不可

    var allExps = S.g('exps', []);
    // その日のそのカテゴリの既存経費を検索
    var existingIdx = -1;
    for (var j = 0; j < allExps.length; j++) {
      if (allExps[j].date === dk && allExps[j].cat === expCat) {
        existingIdx = j;
        break;
      }
    }

    if (amount === 0) {
      if (existingIdx >= 0) {
        allExps.splice(existingIdx, 1);
      }
    } else if (existingIdx >= 0) {
      allExps[existingIdx].amount = amount;
    } else {
      allExps.push({
        date: dk,
        cat: expCat,
        amount: amount,
        memo: '',
        ts: Date.now()
      });
    }
    S.s('exps', allExps);
  }

  function _commitInputCell(oId, dk, colId, value) {
    var layout = _getLayout(oId);
    var mk = dk.substring(0, 7);
    var extra = _getExtra(oId);
    if (!extra[mk]) extra[mk] = {};
    if (!extra[mk][dk]) extra[mk][dk] = {};

    if (colId === 'memo') {
      extra[mk][dk].memo = String(value || '');
      if (!extra[mk][dk].memo) delete extra[mk][dk].memo;
    }

    // 空オブジェクトなら削除
    if (Object.keys(extra[mk][dk]).length === 0) delete extra[mk][dk];
    if (Object.keys(extra[mk]).length === 0) delete extra[mk];

    _saveExtra(oId, extra);
  }

  /* ===== 月次集計タブ（年間12ヶ月推移） ===== */
  function _renderAnnualTab(overlay) {
    var oId = overlay.id;
    var st = _getState(oId);
    var year = st.annualYear;
    var nowMonth = new Date().getMonth();
    var nowYear = new Date().getFullYear();

    var html = '';

    // 年ナビ
    html += '<div class="ss-year-nav">';
    html += '<button class="ss-month-nav-btn" onclick="window._ssYearNav(\'' + escJs(oId) + '\',-1)">◀</button>';
    html += '<span class="ss-month-label">' + year + '年</span>';
    html += '<button class="ss-month-nav-btn" onclick="window._ssYearNav(\'' + escJs(oId) + '\',1)">▶</button>';
    html += '</div>';

    // テーブル
    html += '<div class="ss-annual-table-wrap">';
    html += '<table class="ss-annual-table">';
    html += '<thead><tr>';
    html += '<th>月</th><th>売上</th><th>件数</th><th>単価</th><th>経費</th><th>利益</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    var yearTotals = { sales: 0, count: 0, expense: 0, profit: 0, workDays: 0 };

    for (var m = 0; m < 12; m++) {
      var summary = _calcMonthSummary(year, m);
      yearTotals.sales += summary.totalSales;
      yearTotals.count += summary.totalCount;
      yearTotals.expense += summary.totalExpense;
      yearTotals.profit += summary.profit;
      yearTotals.workDays += summary.workDays;

      var isCurrent = (year === nowYear && m === nowMonth);
      var rowCls = isCurrent ? ' class="ss-annual-row-current"' : '';

      html += '<tr' + rowCls + '>';
      html += '<td class="ss-col-month">' + (m + 1) + '月</td>';
      html += '<td>¥' + fmt(summary.totalSales) + '</td>';
      html += '<td>' + fmt(summary.totalCount) + '件</td>';
      html += '<td>¥' + fmt(summary.avgUnit) + '</td>';
      html += '<td>¥' + fmt(summary.totalExpense) + '</td>';
      html += '<td class="' + (summary.profit >= 0 ? 'ss-cell-profit-positive' : 'ss-cell-profit-negative') + '">¥' + fmt(summary.profit) + '</td>';
      html += '</tr>';
    }

    // 年計行
    html += '<tr class="ss-annual-row-total">';
    html += '<td class="ss-col-month">年計</td>';
    html += '<td>¥' + fmt(yearTotals.sales) + '</td>';
    html += '<td>' + fmt(yearTotals.count) + '件</td>';
    html += '<td>¥' + fmt(yearTotals.count > 0 ? Math.round(yearTotals.sales / yearTotals.count) : 0) + '</td>';
    html += '<td>¥' + fmt(yearTotals.expense) + '</td>';
    html += '<td class="' + (yearTotals.profit >= 0 ? 'ss-cell-profit-positive' : 'ss-cell-profit-negative') + '">¥' + fmt(yearTotals.profit) + '</td>';
    html += '</tr>';

    html += '</tbody></table></div>';
    return html;
  }

  function _ssYearNav(oId, delta) {
    hp();
    var st = _getState(oId);
    st.annualYear += delta;
    _refreshSS(oId);
  }

  /* ===== 設定タブ ===== */
  function _renderSettingsTab(overlay) {
    var oId = overlay.id;
    var layout = _getLayout(oId);

    var html = '<div class="ss-settings">';

    // 列の表示/非表示・並び替え
    html += '<div class="ss-settings-section">';
    html += '<div class="ss-settings-title">📐 列の表示/非表示・並び替え</div>';
    html += '<ul class="ss-col-list" id="ss-col-list-' + escHtml(oId) + '">';

    layout.columns.forEach(function(col, idx) {
      html += '<li class="ss-col-item" data-col-idx="' + idx + '" draggable="true">';
      html += '<span class="ss-col-drag-handle">☰</span>';
      if (col.locked) {
        html += '<input type="checkbox" class="ss-col-check" checked disabled>';
      } else {
        html += '<input type="checkbox" class="ss-col-check" ' + (col.visible ? 'checked' : '') + ' onchange="window._ssToggleCol(\'' + escJs(oId) + '\',' + idx + ',this.checked)">';
      }
      html += '<span class="ss-col-name">' + escHtml(col.name) + '</span>';
      if (col.locked) {
        html += '<span class="ss-col-locked">固定</span>';
      } else {
        html += '<input type="number" class="ss-col-width-input" value="' + (col.width || 70) + '" min="30" max="200" onchange="window._ssColWidth(\'' + escJs(oId) + '\',' + idx + ',this.value)" title="幅(px)">';
      }
      html += '</li>';
    });

    html += '</ul>';

    // PF列・経費列追加ボタン
    html += '<button class="ss-add-col-btn" onclick="window._ssAddPfCol(\'' + escJs(oId) + '\')">＋ PF列を追加</button>';
    html += '<button class="ss-add-col-btn" onclick="window._ssAddExpCol(\'' + escJs(oId) + '\')">＋ 経費列を追加</button>';
    html += '</div>';

    // レイアウト保存・復元
    html += '<div class="ss-settings-section">';
    html += '<div class="ss-settings-title">📂 レイアウトの保存・復元</div>';

    // プリセット
    html += '<div class="ss-preset-grid">';
    Object.keys(LAYOUT_PRESETS).forEach(function(key) {
      var p = LAYOUT_PRESETS[key];
      html += '<button class="ss-preset-btn" onclick="window._ssApplyPreset(\'' + escJs(oId) + '\',\'' + escJs(key) + '\')">';
      html += '<span class="ss-preset-btn-name">' + escHtml(p.name) + '</span>';
      html += '<span class="ss-preset-btn-desc">' + escHtml(p.desc) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    // 保存済みレイアウト
    if (layout.savedLayouts && layout.savedLayouts.length > 0) {
      layout.savedLayouts.forEach(function(sl, idx) {
        html += '<div class="ss-saved-layout-item">';
        html += '<span class="ss-saved-layout-name">' + escHtml(sl.name) + '</span>';
        html += '<button class="ss-saved-layout-btn" onclick="window._ssLoadLayout(\'' + escJs(oId) + '\',' + idx + ')">適用</button>';
        html += '<button class="ss-saved-layout-btn ss-saved-layout-btn-del" onclick="window._ssDeleteLayout(\'' + escJs(oId) + '\',' + idx + ')">削除</button>';
        html += '</div>';
      });
    }

    // 保存・リセットボタン
    html += '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">';
    html += '<button class="btn btn-secondary btn-sm" onclick="window._ssSaveLayout(\'' + escJs(oId) + '\')">💾 現在のレイアウトを保存</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="window._ssResetLayout(\'' + escJs(oId) + '\')">🔄 初期レイアウトに戻す</button>';
    html += '</div>';

    html += '</div>';
    html += '</div>';
    return html;
  }

  /* ===== 設定操作 ===== */
  function _ssToggleCol(oId, idx, checked) {
    var layout = _getLayout(oId);
    if (layout.columns[idx] && !layout.columns[idx].locked) {
      layout.columns[idx].visible = checked;
      _saveLayout(oId, layout);
      _refreshSS(oId);
    }
  }

  function _ssColWidth(oId, idx, val) {
    var layout = _getLayout(oId);
    var w = Number(val) || 70;
    if (w < 30) w = 30;
    if (w > 200) w = 200;
    if (layout.columns[idx]) {
      layout.columns[idx].width = w;
      _saveLayout(oId, layout);
    }
  }

  function _ssApplyPreset(oId, presetId) {
    hp();
    var preset = LAYOUT_PRESETS[presetId];
    if (!preset) return;

    var layout = _getLayout(oId);
    var fullDefault = _generateDefaultLayout();

    // プリセットの列IDセット
    var presetSet = {};
    preset.columns.forEach(function(cid) { presetSet[cid] = true; });

    // 全列のvisibleをプリセットに合わせる
    layout.columns.forEach(function(col) {
      if (!col.locked) {
        col.visible = !!presetSet[col.id];
      }
    });

    // プリセットにあるが現在のlayoutにないPF/経費列は追加
    preset.columns.forEach(function(cid) {
      var found = false;
      for (var i = 0; i < layout.columns.length; i++) {
        if (layout.columns[i].id === cid) { found = true; break; }
      }
      if (!found) {
        // デフォルトから探す
        for (var j = 0; j < fullDefault.columns.length; j++) {
          if (fullDefault.columns[j].id === cid) {
            var newCol = JSON.parse(JSON.stringify(fullDefault.columns[j]));
            newCol.visible = true;
            layout.columns.push(newCol);
            break;
          }
        }
      }
    });

    _saveLayout(oId, layout);
    toast(preset.name + 'レイアウトを適用しました');
    _refreshSS(oId);
  }

  function _ssSaveLayout(oId) {
    customPrompt('レイアウト名を入力', '', function(name) {
      if (!name || !name.trim()) return;
      var layout = _getLayout(oId);
      if (!layout.savedLayouts) layout.savedLayouts = [];
      layout.savedLayouts.push({
        name: name.trim(),
        columns: JSON.parse(JSON.stringify(layout.columns))
      });
      _saveLayout(oId, layout);
      toast('レイアウト「' + name.trim() + '」を保存しました');
      _refreshSS(oId);
    });
  }

  function _ssLoadLayout(oId, idx) {
    hp();
    var layout = _getLayout(oId);
    if (layout.savedLayouts && layout.savedLayouts[idx]) {
      layout.columns = JSON.parse(JSON.stringify(layout.savedLayouts[idx].columns));
      _saveLayout(oId, layout);
      toast('レイアウトを適用しました');
      _refreshSS(oId);
    }
  }

  function _ssDeleteLayout(oId, idx) {
    customConfirm('このレイアウトを削除しますか？', function() {
      var layout = _getLayout(oId);
      if (layout.savedLayouts) {
        layout.savedLayouts.splice(idx, 1);
        _saveLayout(oId, layout);
        _refreshSS(oId);
      }
    });
  }

  function _ssResetLayout(oId) {
    customConfirm('レイアウトを初期状態に戻しますか？', function() {
      var layout = _generateDefaultLayout();
      // 保存済みレイアウトは保持
      var current = _getLayout(oId);
      if (current.savedLayouts) layout.savedLayouts = current.savedLayouts;
      _saveLayout(oId, layout);
      toast('初期レイアウトに戻しました');
      _refreshSS(oId);
    });
  }

  /* ===== PF列追加 ===== */
  function _ssAddPfCol(oId) {
    var pfs = getAllPFs().filter(function(p) { return p.active !== false; });
    var layout = _getLayout(oId);
    var existingPfs = {};
    layout.columns.forEach(function(c) {
      if (c.type === 'pf' && c.pfName) existingPfs[c.pfName] = true;
    });

    var available = pfs.filter(function(p) { return !existingPfs[p.name]; });
    if (available.length === 0) {
      toast('追加できるPFがありません');
      return;
    }

    // 簡易選択ダイアログ
    var opts = available.map(function(p) { return p.name; });
    _showSelectDialog('PF列を追加', opts, function(name) {
      var colId = 'pf_' + name.replace(/\s+/g, '_').toLowerCase();
      // 重複チェック
      for (var i = 0; i < layout.columns.length; i++) {
        if (layout.columns[i].id === colId) {
          layout.columns[i].visible = true;
          _saveLayout(oId, layout);
          _refreshSS(oId);
          return;
        }
      }
      // total列の前に挿入
      var insertIdx = layout.columns.length;
      for (var j = 0; j < layout.columns.length; j++) {
        if (layout.columns[j].id === 'total') { insertIdx = j; break; }
      }
      layout.columns.splice(insertIdx, 0, {
        id: colId,
        name: name,
        type: 'pf',
        width: 80,
        visible: true,
        pfName: name
      });
      _saveLayout(oId, layout);
      toast(name + '列を追加しました');
      _refreshSS(oId);
    });
  }

  /* ===== 経費列追加 ===== */
  function _ssAddExpCol(oId) {
    var allExps = S.g('exps', []);
    var cats = {};
    allExps.forEach(function(e) {
      if (e.cat) cats[e.cat] = true;
    });

    var layout = _getLayout(oId);
    var existingCats = {};
    layout.columns.forEach(function(c) {
      if (c.type === 'expense' && c.expCat && c.expCat !== '__other__') existingCats[c.expCat] = true;
    });

    var available = Object.keys(cats).filter(function(c) { return !existingCats[c]; });
    // 定義済みだけど未使用のカテゴリも追加候補に
    ['ガソリン', 'バイク維持費', 'スマホ通信費', '食事', '駐車場', '備品'].forEach(function(c) {
      if (!existingCats[c] && available.indexOf(c) === -1) available.push(c);
    });

    if (available.length === 0) {
      toast('追加できる経費カテゴリがありません');
      return;
    }

    _showSelectDialog('経費列を追加', available, function(cat) {
      var colId = 'exp_' + cat.replace(/\s+/g, '_').toLowerCase();
      // 重複チェック
      for (var i = 0; i < layout.columns.length; i++) {
        if (layout.columns[i].expCat === cat) {
          layout.columns[i].visible = true;
          _saveLayout(oId, layout);
          _refreshSS(oId);
          return;
        }
      }
      // expTotal列の前に挿入
      var insertIdx = layout.columns.length;
      for (var j = 0; j < layout.columns.length; j++) {
        if (layout.columns[j].id === 'expTotal') { insertIdx = j; break; }
      }
      layout.columns.splice(insertIdx, 0, {
        id: colId,
        name: cat,
        type: 'expense',
        width: 70,
        visible: true,
        expCat: cat
      });
      _saveLayout(oId, layout);
      toast(cat + '列を追加しました');
      _refreshSS(oId);
    });
  }

  /* ===== 選択ダイアログ ===== */
  function _showSelectDialog(title, options, onSelect) {
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.style.zIndex = '9500';

    var h = '<div class="confirm-box" style="max-width:320px;text-align:left;padding:16px">';
    h += '<h3 style="font-size:.875rem;font-weight:700;text-align:center;margin-bottom:12px">' + escHtml(title) + '</h3>';

    options.forEach(function(opt) {
      h += '<button class="btn btn-secondary btn-sm btn-block" style="margin-bottom:6px;text-align:left" data-ss-select="' + escHtml(opt) + '">' + escHtml(opt) + '</button>';
    });

    h += '<button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" data-ss-cancel>キャンセル</button>';
    h += '</div>';

    div.innerHTML = h;
    document.body.appendChild(div);

    div.addEventListener('click', function(e) {
      if (e.target === div || e.target.hasAttribute('data-ss-cancel')) {
        div.remove();
        return;
      }
      var sel = e.target.getAttribute('data-ss-select');
      if (sel) {
        div.remove();
        onSelect(sel);
      }
    });
  }

  /* ===== 列ドラッグ並び替え ===== */
  function _initColDrag(oId) {
    var list = document.getElementById('ss-col-list-' + oId);
    if (!list) return;

    var dragIdx = null;

    list.addEventListener('dragstart', function(e) {
      var item = e.target.closest('.ss-col-item');
      if (!item) return;
      dragIdx = Number(item.getAttribute('data-col-idx'));
      item.classList.add('ss-col-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragIdx));
    });

    list.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var item = e.target.closest('.ss-col-item');
      if (item) {
        // ハイライト
        list.querySelectorAll('.ss-col-drop-target').forEach(function(el) {
          el.classList.remove('ss-col-drop-target');
        });
        item.classList.add('ss-col-drop-target');
      }
    });

    list.addEventListener('dragleave', function(e) {
      var item = e.target.closest('.ss-col-item');
      if (item) item.classList.remove('ss-col-drop-target');
    });

    list.addEventListener('drop', function(e) {
      e.preventDefault();
      list.querySelectorAll('.ss-col-drop-target').forEach(function(el) {
        el.classList.remove('ss-col-drop-target');
      });
      list.querySelectorAll('.ss-col-dragging').forEach(function(el) {
        el.classList.remove('ss-col-dragging');
      });

      var item = e.target.closest('.ss-col-item');
      if (!item || dragIdx === null) return;
      var dropIdx = Number(item.getAttribute('data-col-idx'));
      if (dragIdx === dropIdx) return;

      var layout = _getLayout(oId);
      var moved = layout.columns.splice(dragIdx, 1)[0];
      layout.columns.splice(dropIdx, 0, moved);
      _saveLayout(oId, layout);
      _refreshSS(oId);
    });

    list.addEventListener('dragend', function() {
      list.querySelectorAll('.ss-col-dragging').forEach(function(el) {
        el.classList.remove('ss-col-dragging');
      });
      list.querySelectorAll('.ss-col-drop-target').forEach(function(el) {
        el.classList.remove('ss-col-drop-target');
      });
      dragIdx = null;
    });

    // タッチドラッグ対応
    var touchDragIdx = null;
    var touchClone = null;
    var touchStartY = 0;

    list.addEventListener('touchstart', function(e) {
      var item = e.target.closest('.ss-col-item');
      var handle = e.target.closest('.ss-col-drag-handle');
      if (!item || !handle) return;
      touchDragIdx = Number(item.getAttribute('data-col-idx'));
      touchStartY = e.touches[0].clientY;
      item.classList.add('ss-col-dragging');
    }, { passive: true });

    list.addEventListener('touchmove', function(e) {
      if (touchDragIdx === null) return;
      e.preventDefault();
      var touch = e.touches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        var item = el.closest('.ss-col-item');
        list.querySelectorAll('.ss-col-drop-target').forEach(function(it) {
          it.classList.remove('ss-col-drop-target');
        });
        if (item) item.classList.add('ss-col-drop-target');
      }
    }, { passive: false });

    list.addEventListener('touchend', function(e) {
      if (touchDragIdx === null) return;
      list.querySelectorAll('.ss-col-dragging').forEach(function(el) {
        el.classList.remove('ss-col-dragging');
      });

      var touch = e.changedTouches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        var item = el.closest('.ss-col-item');
        if (item) {
          var dropIdx = Number(item.getAttribute('data-col-idx'));
          if (touchDragIdx !== dropIdx) {
            var layout = _getLayout(oId);
            var moved = layout.columns.splice(touchDragIdx, 1)[0];
            layout.columns.splice(dropIdx, 0, moved);
            _saveLayout(oId, layout);
            _refreshSS(oId);
          }
        }
      }
      list.querySelectorAll('.ss-col-drop-target').forEach(function(it) {
        it.classList.remove('ss-col-drop-target');
      });
      touchDragIdx = null;
    });
  }

  /* ===== メインスプレッドシート起動 ===== */
  window.openSpreadsheetMain = function() {
    var ssOverlay = {
      id: 'spreadsheet-main',
      type: 'spreadsheet',
      title: 'スプレッドシート'
    };
    _mainOverlayDefs['spreadsheet-main'] = ssOverlay;

    if (window.OVERLAYS) {
      window.OVERLAYS['spreadsheet-main'] = { title: '📊 スプレッドシート' };
    }
    window['renderOverlay_spreadsheet-main'] = function(body) {
      renderSpreadsheet(body, ssOverlay);
    };

    if (typeof openOverlay === 'function') {
      openOverlay('spreadsheet-main');
    }
  };

  window.closeSpreadsheetMain = function() {
    if (typeof closeOverlay === 'function') {
      closeOverlay();
    }
  };

  /* ===== Expose ===== */
  window._renderSpreadsheetOverlay = renderSpreadsheet;
  window._ssTabSwitch = _ssTabSwitch;
  window._ssMonthNav = _ssMonthNav;
  window._ssGoToday = _ssGoToday;
  window._ssYearNav = _ssYearNav;
  window._ssCellTap = _ssCellTap;
  window._ssCellCommit = _ssCellCommit;
  window._ssToggleCol = _ssToggleCol;
  window._ssColWidth = _ssColWidth;
  window._ssApplyPreset = _ssApplyPreset;
  window._ssSaveLayout = _ssSaveLayout;
  window._ssLoadLayout = _ssLoadLayout;
  window._ssDeleteLayout = _ssDeleteLayout;
  window._ssResetLayout = _ssResetLayout;
  window._ssAddPfCol = _ssAddPfCol;
  window._ssAddExpCol = _ssAddExpCol;

})();
