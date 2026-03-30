/* ==========================================================
   DeliEasy v2 — js/widgets.js
   ウィジェット定義 + 描画エンジン（v2.5 — ショートカット拡充 + 税金ウィジェット + ミニカレンダー文字拡大）
   ========================================================== */
(function(){
  'use strict';

  /* ========== カテゴリ ========== */
  var WIDGET_CATEGORIES = [
    { id: 'time',    icon: '🕐', name: '時間' },
    { id: 'today',   icon: '📅', name: '今日' },
    { id: 'summary', icon: '📊', name: '集計' },
    { id: 'detail',  icon: '📋', name: '詳細' },
    { id: 'tax',     icon: '🧾', name: '税金' },
    { id: 'other',   icon: '⚙️', name: 'その他' }
  ];

  /* ========== ウィジェット定義 ========== */
  var WIDGET_DEFS = {
    clock: {
      id: 'clock', name: '時計', icon: '🕐', category: 'time',
      size: 'full', sizeOptions: ['full','wide','half'],
      desc: '現在時刻と日付',
      render: function(w) {
        var now = new Date();
        var h = String(now.getHours()).padStart(2,'0');
        var m = String(now.getMinutes()).padStart(2,'0');
        var s = String(now.getSeconds()).padStart(2,'0');
        var dateStr = now.getFullYear() + '/' + (now.getMonth()+1) + '/' + now.getDate();
        var dayNames = ['日','月','火','水','木','金','土'];
        dateStr += ' (' + dayNames[now.getDay()] + ')';
        var fontSize = w.size === 'half' ? '1.6rem' : '2.4rem';
        var dateFz = w.size === 'half' ? '.65rem' : '.75rem';
        var clockId = 'widget-clock-time-' + Math.random().toString(36).substr(2, 6);
        return '<div class="widget-clock">' +
          '<div class="widget-clock-time" id="' + clockId + '" data-clock="true" style="font-size:' + fontSize + '">' + h + ':' + m + '<span style="opacity:.4;font-size:.7em">:' + s + '</span></div>' +
          '<div class="widget-clock-date" style="font-size:' + dateFz + '">' + dateStr + '</div>' +
        '</div>';
      }
    },

    todaySales: {
      id: 'todaySales', name: '今日の売上', icon: '💰', category: 'today',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '今日の合計売上',
      tappable: true, tapAction: 'earnInput',
      render: function(w) {
        var tot = typeof tdTot === 'function' ? tdTot() : 0;
        return _statBox('今日の売上', '¥' + fmt(tot), null, w);
      }
    },
    todayCount: {
      id: 'todayCount', name: '今日の件数', icon: '📦', category: 'today',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '今日の配達件数',
      tappable: true, tapAction: 'earnInput',
      render: function(w) {
        var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
        return _statBox('今日の件数', cnt + '件', null, w);
      }
    },
    todayUnit: {
      id: 'todayUnit', name: '今日の単価', icon: '📈', category: 'today',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '今日の平均単価',
      tappable: true, tapAction: 'stats',
      render: function(w) {
        var tot = typeof tdTot === 'function' ? tdTot() : 0;
        var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
        var unit = cnt > 0 ? Math.round(tot / cnt) : 0;
        return _statBox('平均単価', '¥' + fmt(unit), null, w);
      }
    },
    todayProfit: {
      id: 'todayProfit', name: '今日の利益', icon: '✨', category: 'today',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '売上 − 経費の概算',
      tappable: true, tapAction: 'stats',
      render: function(w) {
        var tot = typeof tdTot === 'function' ? tdTot() : 0;
        var exps = S.g('exps', []);
        var expTot = 0;
        exps.forEach(function(e) { if (e.date === TD) expTot += (Number(e.amount) || 0); });
        var profit = tot - expTot;
        var cls = profit >= 0 ? '' : ' c-danger';
        return _statBox('今日の利益', '<span class="' + cls + '">¥' + fmt(profit) + '</span>', null, w);
      }
    },
    todayExpense: {
      id: 'todayExpense', name: '今日の経費', icon: '💸', category: 'today',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '今日の経費合計',
      tappable: true, tapAction: 'expenseInput',
      render: function(w) {
        var exps = S.g('exps', []);
        var expTot = 0;
        exps.forEach(function(e) { if (e.date === TD) expTot += (Number(e.amount) || 0); });
        return _statBox('今日の経費', '<span class="c-danger">¥' + fmt(expTot) + '</span>', null, w);
      }
    },

    todaySummary: {
      id: 'todaySummary', name: '今日のまとめ', icon: '📋', category: 'summary',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '売上・件数・単価・利益を一覧',
      tappable: true, tapAction: 'stats',
      render: function() {
        var tot = typeof tdTot === 'function' ? tdTot() : 0;
        var cnt = typeof tdCnt === 'function' ? tdCnt() : 0;
        var unit = cnt > 0 ? Math.round(tot / cnt) : 0;
        var exps = S.g('exps', []);
        var expTot = 0;
        exps.forEach(function(e) { if (e.date === TD) expTot += (Number(e.amount) || 0); });
        var profit = tot - expTot;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('売上', '¥' + fmt(tot)) +
          _miniStat('件数', cnt + '件') +
          _miniStat('単価', '¥' + fmt(unit)) +
          _miniStat('利益', '¥' + fmt(profit), profit < 0 ? 'c-danger' : '') +
          '</div></div>';
      }
    },
    weekSummary: {
      id: 'weekSummary', name: '今週のまとめ', icon: '📆', category: 'summary',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '今週（月〜日）の合計',
      tappable: true, tapAction: 'stats',
      render: function() {
        var data = typeof wkData === 'function' ? wkData() : { tot: 0, cnt: 0, days: 0 };
        var unit = data.cnt > 0 ? Math.round(data.tot / data.cnt) : 0;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('週売上', '¥' + fmt(data.tot)) +
          _miniStat('週件数', data.cnt + '件') +
          _miniStat('週単価', '¥' + fmt(unit)) +
          _miniStat('稼働日', data.days + '日') +
          '</div></div>';
      }
    },
    monthSummary: {
      id: 'monthSummary', name: '今月のまとめ', icon: '📊', category: 'summary',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '今月の合計',
      tappable: true, tapAction: 'stats',
      render: function() {
        var tot = typeof moTot === 'function' ? moTot() : 0;
        var cnt = typeof moCnt === 'function' ? moCnt() : 0;
        var days = typeof moDays === 'function' ? moDays() : 0;
        var unit = cnt > 0 ? Math.round(tot / cnt) : 0;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('月売上', '¥' + fmt(tot)) +
          _miniStat('月件数', cnt + '件') +
          _miniStat('月単価', '¥' + fmt(unit)) +
          _miniStat('稼働日', days + '日') +
          '</div></div>';
      }
    },
    todayPfBreakdown: {
      id: 'todayPfBreakdown', name: 'PF別内訳', icon: '🍕', category: 'detail',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '今日のプラットフォーム別内訳',
      tappable: true, tapAction: 'stats',
      render: function() {
        var records = typeof eByDate === 'function' ? eByDate(TD) : [];
        var pfMap = {};
        var total = 0;
        records.forEach(function(r) {
          var pf = (typeof extractPf === 'function' ? extractPf(r.m) : '') || '不明';
          if (!pfMap[pf]) pfMap[pf] = { sales: 0, count: 0 };
          pfMap[pf].sales += (Number(r.a) || 0);
          pfMap[pf].count += (Number(r.c) || 1);
          total += (Number(r.a) || 0);
        });
        var keys = Object.keys(pfMap).sort(function(a,b) { return pfMap[b].sales - pfMap[a].sales; });
        if (keys.length === 0) return '<div class="widget-empty">今日のデータなし</div>';
        var html = '<div class="widget-inner">';
        keys.forEach(function(pf) {
          var d = pfMap[pf];
          var pct = total > 0 ? Math.round(d.sales / total * 100) : 0;
          var color = typeof pfColor === 'function' ? pfColor(pf) : 'var(--c-primary)';
          html += '<div class="widget-pf-row">' +
            '<span class="widget-pf-name">' + escHtml(pf) + '</span>' +
            '<div class="widget-pf-bar"><div class="widget-pf-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
            '<span class="widget-pf-val">¥' + fmt(d.sales) + '</span>' +
            '<span class="widget-pf-pct">' + pct + '%</span>' +
          '</div>';
        });
        html += '</div>';
        return html;
      }
    },

    recentRecords: {
      id: 'recentRecords', name: '最近の記録', icon: '📝', category: 'detail',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '直近5件の売上記録',
      tappable: true, tapAction: 'earnInput',
      render: function() {
        var all = typeof getE === 'function' ? getE() : [];
        var recent = all.slice(-5).reverse();
        if (recent.length === 0) return '<div class="widget-empty">記録なし</div>';
        var html = '<div class="widget-records">';
        recent.forEach(function(r) {
          var pf = typeof extractPf === 'function' ? extractPf(r.m) : '';
          var pfCol = pf && typeof pfColor === 'function' ? pfColor(pf) : '';
          html += '<div class="widget-rec-row">';
          html += '<span class="widget-rec-date">' + escHtml((r.d || '').substring(5)) + '</span>';
          if (pfCol) html += '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + pfCol + ';flex-shrink:0"></span>';
          html += '<span class="widget-rec-pf">' + escHtml(pf || '—') + '</span>';
          html += '<span class="widget-rec-amt">¥' + fmt(r.a) + '</span>';
          html += '<span class="widget-rec-cnt">' + r.c + '件</span>';
          html += '</div>';
        });
        html += '</div>';
        return html;
      }
    },
    miniCalendar: {
      id: 'miniCalendar', name: 'ミニカレンダー', icon: '📅', category: 'detail',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '月間売上ヒートマップ（スワイプで月移動）',
      render: function(w) {
        if (!window._miniCalState) window._miniCalState = {};
        var stateKey = 'miniCal_' + (w._instanceId || 'default');
        if (!window._miniCalState[stateKey]) {
          var now = new Date();
          window._miniCalState[stateKey] = { year: now.getFullYear(), month: now.getMonth() };
        }
        var st = window._miniCalState[stateKey];
        var year = st.year;
        var month = st.month;

        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var now = new Date();
        var todayDate = now.getDate();
        var todayMonth = now.getMonth();
        var todayYear = now.getFullYear();
        var isCurrentMonth = (year === todayYear && month === todayMonth);
        var mk = year + '-' + String(month + 1).padStart(2, '0');

        var dayData = {};
        var monthEarns = typeof eByMonth === 'function' ? eByMonth(mk) : [];
        monthEarns.forEach(function(r) {
          var parts = r.d.split('-');
          var day = parseInt(parts[2], 10);
          dayData[day] = (dayData[day] || 0) + (Number(r.a) || 0);
        });

        var monthTotal = 0;
        Object.keys(dayData).forEach(function(k) { monthTotal += dayData[k]; });

        var workDays = Object.keys(dayData).length;

        var swipeId = 'mini-cal-swipe-' + stateKey.replace(/[^a-zA-Z0-9]/g, '_');

        var html = '<div class="widget-mini-cal" id="' + swipeId + '">';

        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
        html += '<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();_miniCalPrev(\'' + escJs(stateKey) + '\')" style="padding:2px 8px;font-size:.9rem">◀</button>';
        html += '<div style="text-align:center">';
        html += '<div class="widget-cal-hdr" style="margin-bottom:2px">' + year + '年' + (month + 1) + '月</div>';
        html += '<div style="font-size:.7rem;font-weight:700;color:var(--c-primary);font-variant-numeric:tabular-nums">¥' + fmt(monthTotal);
        if (workDays > 0) html += ' <span style="font-weight:400;color:var(--c-tx-muted);font-size:.6rem">(' + workDays + '日)</span>';
        html += '</div>';
        html += '</div>';
        html += '<button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();_miniCalNext(\'' + escJs(stateKey) + '\')" style="padding:2px 8px;font-size:.9rem">▶</button>';
        html += '</div>';

        html += '<div class="widget-cal-week"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>';
        html += '<div class="widget-cal-grid">';

        for (var e = 0; e < firstDay; e++) {
          html += '<div class="widget-cal-empty"></div>';
        }
        for (var d = 1; d <= daysInMonth; d++) {
          var sales = dayData[d] || 0;
          var lv = 0;
          if (sales > 0) {
            if (sales >= 20000) lv = 5;
            else if (sales >= 15000) lv = 4;
            else if (sales >= 10000) lv = 3;
            else if (sales >= 5000) lv = 2;
            else lv = 1;
          }
          var isToday = isCurrentMonth && d === todayDate;
          var dk = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
          var dayOfWeek = (firstDay + d - 1) % 7;
          var isHoliday = typeof isJapaneseHoliday === 'function' && isJapaneseHoliday(year, month + 1, d);
          var holidayName = typeof getJapaneseHolidayName === 'function' ? getJapaneseHolidayName(year, month + 1, d) : null;
          var dayClasses = 'widget-cal-day';
          if (isToday) dayClasses += ' widget-cal-today';
          if (dayOfWeek === 0) dayClasses += ' widget-cal-sun';
          if (dayOfWeek === 6) dayClasses += ' widget-cal-sat';
          if (isHoliday && dayOfWeek !== 0) dayClasses += ' widget-cal-holiday';

          html += '<div class="' + dayClasses + '"' +
            (lv > 0 ? ' data-lv="' + lv + '"' : '') +
            (holidayName ? ' title="' + escHtml(holidayName) + '"' : '') +
            ' onclick="event.stopPropagation();openCalendarAtDate(\'' + dk + '\')" style="cursor:pointer;position:relative">';
          html += '<span>' + d + '</span>';
          if (holidayName) {
            var showHolidayText = true; // 将来的に sales > 0 の場合に false にすることも可能
            if (showHolidayText) {
              html += '<span class="widget-cal-holiday-name">' + escHtml(holidayName.length > 3 ? holidayName.substring(0, 3) : holidayName) + '</span>';
            }
          }
          if (sales > 0) {
            var displayAmt = sales >= 10000 ? Math.round(sales / 1000) + 'k' : (sales >= 1000 ? (sales / 1000).toFixed(1) + 'k' : sales);
            var amtFz = w.size === 'wide' ? '.5rem' : '.55rem';
            html += '<span class="widget-cal-day-amount" style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);font-size:' + amtFz + ';font-weight:700;line-height:1;white-space:nowrap;color:' + (isToday ? 'rgba(255,255,255,.9)' : 'var(--c-tx-secondary)') + ';font-variant-numeric:tabular-nums">' + displayAmt + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';

        html += '<div style="text-align:center;font-size:.5rem;color:var(--c-tx-muted);margin-top:4px;opacity:.5">← スワイプで月移動 →</div>';

        html += '</div>';

        setTimeout(function() { _initMiniCalSwipe(swipeId, stateKey); }, 50);

        return html;
      }
    },

    /* ========== 税金ウィジェット ========== */
    taxSummary: {
      id: 'taxSummary', name: '税金概算', icon: '🧾', category: 'tax',
      size: 'full', sizeOptions: ['full','wide'],
      desc: '年間の所得税・住民税・国保の概算',
      tappable: true, tapAction: 'tax',
      render: function() {
        /* 年間データを集計 */
        var now = new Date();
        var yr = now.getFullYear();
        var from = yr + '-01-01';
        var to = yr + '-12-31';
        var earns = typeof getE === 'function' ? getE() : [];
        var yEarns = earns.filter(function(r) { return r.d >= from && r.d <= to; });
        var revenue = 0;
        yEarns.forEach(function(r) { revenue += (Number(r.a) || 0); });

        var allExps = S.g('exps', []);
        var yExps = allExps.filter(function(e) { return e.date >= from && e.date <= to; });
        var expense = 0;
        yExps.forEach(function(e) { expense += (Number(e.amount) || 0); });

        var blueDeduction = 650000; /* デフォルト: 65万円 */
        var income = Math.max(0, revenue - expense - blueDeduction);
        var taxableIncome = Math.max(0, income - 480000); /* 基礎控除 */

        /* 簡易税額計算 */
        var BRACKETS = [
          { limit: 1950000, rate: 0.05, deduction: 0 },
          { limit: 3300000, rate: 0.10, deduction: 97500 },
          { limit: 6950000, rate: 0.20, deduction: 427500 },
          { limit: 9000000, rate: 0.23, deduction: 636000 },
          { limit: 18000000, rate: 0.33, deduction: 1536000 },
          { limit: 40000000, rate: 0.40, deduction: 2796000 },
          { limit: Infinity, rate: 0.45, deduction: 4796000 }
        ];
        var incomeTax = 0;
        for (var i = 0; i < BRACKETS.length; i++) {
          if (taxableIncome <= BRACKETS[i].limit) {
            incomeTax = Math.floor(taxableIncome * BRACKETS[i].rate - BRACKETS[i].deduction);
            break;
          }
        }
        incomeTax = Math.max(0, incomeTax);
        var reconstructionTax = Math.floor(incomeTax * 0.021);
        var residentTax = Math.floor(taxableIncome * 0.10);
        var healthIns = Math.floor(taxableIncome * 0.10);
        var totalTax = incomeTax + reconstructionTax + residentTax + healthIns;
        var takeHome = revenue - expense - totalTax;

        var html = '<div class="widget-inner">';
        html += '<div class="fz-xs c-muted mb4 text-c">' + yr + '年（青色65万円控除・簡易計算）</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        html += _miniStat('年間売上', '¥' + fmt(revenue));
        html += _miniStat('年間経費', '¥' + fmt(expense));
        html += _miniStat('所得税+復興税', '¥' + fmt(incomeTax + reconstructionTax));
        html += _miniStat('住民税', '¥' + fmt(residentTax));
        html += _miniStat('国保概算', '¥' + fmt(healthIns));
        html += _miniStat('税金合計', '<span class="c-danger">¥' + fmt(totalTax) + '</span>');
        html += '</div>';
        html += '<div style="text-align:center;margin-top:8px;padding-top:8px;border-top:.5px solid var(--c-divider)">';
        html += '<div class="fz-xs c-muted">手取り概算</div>';
        html += '<div class="fw7 fz-l' + (takeHome < 0 ? ' c-danger' : ' c-success') + '" style="font-variant-numeric:tabular-nums">¥' + fmt(takeHome) + '</div>';
        html += '</div>';
        html += '</div>';
        return html;
      }
    },

    furusatoLimit: {
      id: 'furusatoLimit', name: 'ふるさと納税上限', icon: '🎁', category: 'tax',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: 'ふるさと納税の上限目安',
      tappable: true, tapAction: 'tax',
      render: function(w) {
        var now = new Date();
        var yr = now.getFullYear();
        var from = yr + '-01-01';
        var to = yr + '-12-31';
        var earns = typeof getE === 'function' ? getE() : [];
        var yEarns = earns.filter(function(r) { return r.d >= from && r.d <= to; });
        var revenue = 0;
        yEarns.forEach(function(r) { revenue += (Number(r.a) || 0); });

        var allExps = S.g('exps', []);
        var yExps = allExps.filter(function(e) { return e.date >= from && e.date <= to; });
        var expense = 0;
        yExps.forEach(function(e) { expense += (Number(e.amount) || 0); });

        var income = Math.max(0, revenue - expense - 650000);
        var taxable = Math.max(0, income - 480000);
        var residentIncomeRate = taxable * 0.10;
        var limit = Math.floor(residentIncomeRate * 0.20) + 2000;

        return _statBox('ふるさと納税上限', '¥' + fmt(Math.max(0, limit)), null, w);
      }
    },

    themeInfo: {
      id: 'themeInfo', name: 'テーマ情報', icon: '🎨', category: 'other',
      size: 'half', sizeOptions: ['half','wide','full'],
      desc: '現在のテーマ設定',
      tappable: true, tapAction: 'theme',
      render: function(w) {
        var style = typeof getThemeStyle === 'function' ? getThemeStyle() : '?';
        var color = typeof getThemeColor === 'function' ? getThemeColor() : '?';
        return _statBox('テーマ', style + ' / ' + color, null, w);
      }
    },
    quickMemo: {
      id: 'quickMemo', name: 'メモ', icon: '📝', category: 'other',
      size: 'full', sizeOptions: ['full','wide','half'],
      desc: 'ちょっとしたメモ',
      render: function() {
        var memo = S.g('quickMemo', '');
        return '<div class="widget-inner">' +
          '<textarea class="widget-memo-textarea" placeholder="タップしてメモ…" ' +
          'oninput="S.s(\'quickMemo\',this.value)" style="width:100%;min-height:60px;border:none;' +
          'background:transparent;font-size:.8125rem;color:var(--c-tx);resize:vertical;outline:none;' +
          'font-family:inherit">' + escHtml(memo) + '</textarea></div>';
      }
    },

  };

  /* ========== ヘルパー ========== */
  function _statBox(label, value, extraClass, w) {
    var cls = extraClass ? ' ' + extraClass : '';
    return '<div class="widget-inner' + cls + '">' +
      '<div class="stat-box-value fz-l fw7 text-c" style="font-variant-numeric:tabular-nums">' + value + '</div>' +
    '</div>';
  }

  function _miniStat(label, value, cls) {
    return '<div style="text-align:center">' +
      '<div class="fz-xs c-muted">' + label + '</div>' +
      '<div class="fw7 fz-s' + (cls ? ' ' + cls : '') + '" style="font-variant-numeric:tabular-nums">' + value + '</div>' +
    '</div>';
  }

  /* ========== ウィジェットラッパー描画 ========== */
  function renderWidgetWrapper(w, editMode) {
    var def = WIDGET_DEFS[w.id];
    if (!def) return '';
    var sizeClass = 'widget-' + (w.size || def.size || 'full');
    var tappable = !editMode && def.tappable ? ' widget-tappable' : '';
    var tapAttr = '';
    if (!editMode && def.tappable && def.tapAction) {
      tapAttr = ' onclick="widgetTap(\'' + escJs(def.tapAction) + '\')"';
    }
    var html = '<div class="widget ' + sizeClass + tappable + '"' + tapAttr + '>';

    html += '<div class="widget-title">';
    html += '<span>' + def.icon + ' ' + escHtml(def.name) + '</span>';
    if (editMode) {
      html += '<div class="widget-edit-controls">';
      if (def.sizeOptions && def.sizeOptions.length > 1) {
        html += '<button class="widget-edit-btn" onclick="event.stopPropagation();cycleWidgetSize(\'' + w.id + '\')" title="サイズ変更">↔</button>';
      }
      html += '<button class="widget-edit-btn widget-edit-del" onclick="event.stopPropagation();removeWidget(\'' + w.id + '\')" title="削除">✕</button>';
      html += '</div>';
    }
    html += '</div>';

    try {
      html += def.render(w);
    } catch (e) {
      html += '<div class="widget-empty">表示エラー</div>';
      console.warn('[Widget] render error:', w.id, e);
    }
    html += '</div>';
    return html;
  }

  /* ========== 時計更新 ========== */
  var _clockTimer = null;
  function startWidgetClock() {
    if (_clockTimer !== null) {
      clearInterval(_clockTimer);
      _clockTimer = null;
    }
    _clockTimer = setInterval(function() {
      var els = document.querySelectorAll('[data-clock="true"]');
      if (!els || els.length === 0) {
        if (_clockTimer !== null) {
          clearInterval(_clockTimer);
          _clockTimer = null;
        }
        return;
      }
      var now = new Date();
      var h = String(now.getHours()).padStart(2,'0');
      var m = String(now.getMinutes()).padStart(2,'0');
      var s = String(now.getSeconds()).padStart(2,'0');
      var content = h + ':' + m + '<span style="opacity:.4;font-size:.7em">:' + s + '</span>';
      els.forEach(function(el) { el.innerHTML = content; });
    }, 1000);
  }

  /* ========== ウィジェットタップ ========== */
  function widgetTap(action) {
    if (typeof hp === 'function') hp();
    switch (action) {
      case 'earnInput':
        if (typeof openOverlay === 'function') openOverlay('earnInput');
        break;
      case 'expenseInput':
        if (typeof openOverlay === 'function') openOverlay('expenseInput');
        break;
      case 'stats':
        if (typeof openOverlay === 'function') openOverlay('stats');
        break;
      case 'calendar':
        if (typeof openOverlay === 'function') openOverlay('calendar');
        break;
      case 'tax':
        if (typeof openOverlay === 'function') openOverlay('tax');
        break;
      case 'theme':
        if (typeof openOverlay === 'function') openOverlay('theme');
        break;
      /* 旧互換 */
      case 'earn':
        if (typeof openOverlay === 'function') openOverlay('earnInput');
        break;
      default:
        if (typeof openOverlay === 'function') openOverlay(action);
        break;
    }
  }

  /* ========== Expose ========== */
  function openCalendarAtDate(dk) {
    if (typeof hp === 'function') hp();
    if (typeof window.initCalendar === 'function') window.initCalendar();
    if (typeof openOverlay === 'function') {
      openOverlay('calendar');
      /* calendar.js の遅延ロード完了を待ってから日付選択 */
      var attempts = 0;
      var trySelect = function() {
        if (typeof window.calSel === 'function') {
          window.calSel(dk);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(trySelect, 100);
        }
      };
      setTimeout(trySelect, 150);
    }
  }

  window.openCalendarAtDate = openCalendarAtDate;

  window.WIDGET_DEFS = WIDGET_DEFS;
  window.WIDGET_CATEGORIES = WIDGET_CATEGORIES;
  window.renderWidgetWrapper = renderWidgetWrapper;
  window.startWidgetClock = startWidgetClock;
  window.widgetTap = widgetTap;
  /* ========== ミニカレンダー月移動 ========== */
  window._miniCalPrev = function(stateKey) {
    if (!window._miniCalState || !window._miniCalState[stateKey]) return;
    var st = window._miniCalState[stateKey];
    st.month--;
    if (st.month < 0) { st.month = 11; st.year--; }
    hp();
    if (typeof renderHome === 'function') renderHome();
  };

  window._miniCalNext = function(stateKey) {
    if (!window._miniCalState || !window._miniCalState[stateKey]) return;
    var st = window._miniCalState[stateKey];
    st.month++;
    if (st.month > 11) { st.month = 0; st.year++; }
    hp();
    if (typeof renderHome === 'function') renderHome();
  };

  /* ========== ミニカレンダースワイプ ========== */
  function _initMiniCalSwipe(elementId, stateKey) {
    var el = document.getElementById(elementId);
    if (!el || el._mcSwipeInit) return;
    el._mcSwipeInit = true;

    var startX = 0;
    var startY = 0;
    var swiping = false;

    el.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
    }, { passive: true });

    el.addEventListener('touchmove', function(e) {
      if (swiping) return;
      var dx = e.touches[0].clientX - startX;
      var dy = Math.abs(e.touches[0].clientY - startY);
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy * 1.5) {
        swiping = true;
        if (dx > 0) {
          window._miniCalPrev(stateKey);
        } else {
          window._miniCalNext(stateKey);
        }
      }
    }, { passive: false });
  }

})();
