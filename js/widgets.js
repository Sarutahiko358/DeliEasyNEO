/* ==========================================================
   DeliEasy v2 — js/widgets.js
   ウィジェット定義 + 描画エンジン
   ========================================================== */
(function(){
  'use strict';

  /* ========== カテゴリ ========== */
  var WIDGET_CATEGORIES = [
    { id: 'time',    icon: '🕐', name: '時間' },
    { id: 'today',   icon: '📅', name: '今日' },
    { id: 'summary', icon: '📊', name: '集計' },
    { id: 'goal',    icon: '🎯', name: '目標' },
    { id: 'detail',  icon: '📋', name: '詳細' },
    { id: 'other',   icon: '⚙️', name: 'その他' }
  ];

  /* ========== ウィジェット定義 ========== */
  var WIDGET_DEFS = {
    /* --- 時間系 --- */
    clock: {
      id: 'clock', name: '時計', icon: '🕐', category: 'time',
      size: 'full', sizeOptions: ['full','half'],
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
        return '<div class="widget-clock">' +
          '<div class="widget-clock-time" id="widget-clock-time" style="font-size:' + fontSize + '">' + h + ':' + m + '<span style="opacity:.4;font-size:.7em">:' + s + '</span></div>' +
          '<div class="widget-clock-date" style="font-size:' + dateFz + '">' + dateStr + '</div>' +
        '</div>';
      }
    },

    /* --- 今日系 --- */
    todaySales: {
      id: 'todaySales', name: '今日の売上', icon: '💰', category: 'today',
      size: 'half', sizeOptions: ['half','full'],
      desc: '今日の合計売上',
      tappable: true, tapAction: 'earn',
      render: function(w) {
        var data = _getTodayData();
        return _statBox('今日の売上', '¥' + fmt(data.sales), null, w);
      }
    },
    todayCount: {
      id: 'todayCount', name: '今日の件数', icon: '📦', category: 'today',
      size: 'half', sizeOptions: ['half','full'],
      desc: '今日の配達件数',
      tappable: true, tapAction: 'earn',
      render: function(w) {
        var data = _getTodayData();
        return _statBox('今日の件数', data.count + '件', null, w);
      }
    },
    todayUnit: {
      id: 'todayUnit', name: '今日の単価', icon: '📈', category: 'today',
      size: 'half', sizeOptions: ['half','full'],
      desc: '今日の平均単価',
      render: function(w) {
        var data = _getTodayData();
        var unit = data.count > 0 ? Math.round(data.sales / data.count) : 0;
        return _statBox('平均単価', '¥' + fmt(unit), null, w);
      }
    },
    todayProfit: {
      id: 'todayProfit', name: '今日の利益', icon: '✨', category: 'today',
      size: 'half', sizeOptions: ['half','full'],
      desc: '売上 − 経費の概算',
      render: function(w) {
        var data = _getTodayData();
        var exp = _getTodayExpense();
        var profit = data.sales - exp;
        var cls = profit >= 0 ? '' : ' c-danger';
        return _statBox('今日の利益', '<span class="' + cls + '">¥' + fmt(profit) + '</span>', null, w);
      }
    },

    /* --- 集計系 --- */
    todaySummary: {
      id: 'todaySummary', name: '今日のまとめ', icon: '📋', category: 'summary',
      size: 'full', sizeOptions: ['full'],
      desc: '売上・件数・単価・利益を一覧',
      tappable: true, tapAction: 'earn',
      render: function() {
        var data = _getTodayData();
        var exp = _getTodayExpense();
        var unit = data.count > 0 ? Math.round(data.sales / data.count) : 0;
        var profit = data.sales - exp;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('売上', '¥' + fmt(data.sales)) +
          _miniStat('件数', data.count + '件') +
          _miniStat('単価', '¥' + fmt(unit)) +
          _miniStat('利益', '¥' + fmt(profit), profit < 0 ? 'c-danger' : '') +
          '</div></div>';
      }
    },
    weekSummary: {
      id: 'weekSummary', name: '今週のまとめ', icon: '📆', category: 'summary',
      size: 'full', sizeOptions: ['full'],
      desc: '今週（月〜日）の合計',
      render: function() {
        var data = _getWeekData();
        var unit = data.count > 0 ? Math.round(data.sales / data.count) : 0;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('週売上', '¥' + fmt(data.sales)) +
          _miniStat('週件数', data.count + '件') +
          _miniStat('週単価', '¥' + fmt(unit)) +
          _miniStat('稼働日', data.days + '日') +
          '</div></div>';
      }
    },
    monthSummary: {
      id: 'monthSummary', name: '今月のまとめ', icon: '📊', category: 'summary',
      size: 'full', sizeOptions: ['full'],
      desc: '今月の合計',
      render: function() {
        var data = _getMonthData();
        var unit = data.count > 0 ? Math.round(data.sales / data.count) : 0;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('月売上', '¥' + fmt(data.sales)) +
          _miniStat('月件数', data.count + '件') +
          _miniStat('月単価', '¥' + fmt(unit)) +
          _miniStat('稼働日', data.days + '日') +
          '</div></div>';
      }
    },
    todayPfBreakdown: {
      id: 'todayPfBreakdown', name: 'PF別内訳', icon: '🍕', category: 'detail',
      size: 'full', sizeOptions: ['full'],
      desc: '今日のプラットフォーム別内訳',
      tappable: true, tapAction: 'earn',
      render: function() {
        var records = _getTodayRecords();
        var pfMap = {};
        var total = 0;
        records.forEach(function(r) {
          var pf = r.pf || '不明';
          if (!pfMap[pf]) pfMap[pf] = { sales: 0, count: 0 };
          pfMap[pf].sales += (r.amount || 0);
          pfMap[pf].count += (r.count || 1);
          total += (r.amount || 0);
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

    /* --- 目標系 --- */
    goalProgress: {
      id: 'goalProgress', name: '月間目標', icon: '🎯', category: 'goal',
      size: 'full', sizeOptions: ['full','half'],
      desc: '月間売上目標に対する進捗',
      render: function(w) {
        var goal = S.g('monthlyGoal', 0);
        var data = _getMonthData();
        if (!goal || goal <= 0) {
          return '<div class="widget-inner"><div class="widget-goal-value">目標未設定</div>' +
            '<div class="widget-progress-label" style="cursor:pointer" onclick="openGoalSetting()">タップして設定</div></div>';
        }
        var pct = Math.min(Math.round(data.sales / goal * 100), 100);
        return '<div class="widget-inner">' +
          '<div class="widget-goal-value">¥' + fmt(data.sales) + ' / ¥' + fmt(goal) + '</div>' +
          '<div class="widget-progress"><div class="widget-progress-bar" style="width:' + pct + '%"></div></div>' +
          '<div class="widget-progress-label">' + pct + '% 達成</div>' +
        '</div>';
      }
    },
    monthPace: {
      id: 'monthPace', name: '月間ペース', icon: '📐', category: 'goal',
      size: 'full', sizeOptions: ['full'],
      desc: '月末着地予測',
      render: function() {
        var now = new Date();
        var daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
        var dayOfMonth = now.getDate();
        var data = _getMonthData();
        var pace = data.days > 0 ? Math.round(data.sales / data.days * daysInMonth) : 0;
        var dailyAvg = data.days > 0 ? Math.round(data.sales / data.days) : 0;
        return '<div class="widget-inner">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          _miniStat('月末着地予測', '¥' + fmt(pace)) +
          _miniStat('日平均', '¥' + fmt(dailyAvg)) +
          _miniStat('経過日数', dayOfMonth + '/' + daysInMonth + '日') +
          _miniStat('稼働日数', data.days + '日') +
          '</div></div>';
      }
    },

    /* --- 詳細系 --- */
    recentRecords: {
      id: 'recentRecords', name: '最近の記録', icon: '📝', category: 'detail',
      size: 'full', sizeOptions: ['full'],
      desc: '直近5件の売上記録',
      tappable: true, tapAction: 'earn',
      render: function() {
        var all = typeof getEarns === 'function' ? getEarns() : [];
        var recent = all.slice(-5).reverse();
        if (recent.length === 0) return '<div class="widget-empty">記録なし</div>';
        var html = '<div class="widget-records">';
        recent.forEach(function(r) {
          var d = new Date(r.ts || r.timestamp);
          var dateStr = (d.getMonth()+1) + '/' + d.getDate();
          html += '<div class="widget-rec-row">' +
            '<span class="widget-rec-date">' + dateStr + '</span>' +
            '<span class="widget-rec-pf">' + escHtml(r.pf || '') + '</span>' +
            '<span class="widget-rec-amt">¥' + fmt(r.amount || 0) + '</span>' +
            '<span class="widget-rec-cnt">' + (r.count || 1) + '件</span>' +
          '</div>';
        });
        html += '</div>';
        return html;
      }
    },
    miniCalendar: {
      id: 'miniCalendar', name: 'ミニカレンダー', icon: '📅', category: 'detail',
      size: 'full', sizeOptions: ['full'],
      desc: '今月の稼働ヒートマップ',
      render: function() {
        var now = new Date();
        var year = now.getFullYear();
        var month = now.getMonth();
        var firstDay = new Date(year, month, 1).getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = now.getDate();

        /* 日別売上取得 */
        var dayData = {};
        var all = typeof getEarns === 'function' ? getEarns() : [];
        all.forEach(function(r) {
          var d = new Date(r.ts || r.timestamp);
          if (d.getFullYear() === year && d.getMonth() === month) {
            var day = d.getDate();
            dayData[day] = (dayData[day] || 0) + (r.amount || 0);
          }
        });

        /* 最大値算出 */
        var maxSales = 0;
        Object.keys(dayData).forEach(function(k) { if (dayData[k] > maxSales) maxSales = dayData[k]; });

        var html = '<div class="widget-mini-cal">';
        html += '<div class="widget-cal-hdr">' + year + '年' + (month+1) + '月</div>';
        html += '<div class="widget-cal-week"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>';
        html += '<div class="widget-cal-grid">';

        for (var e = 0; e < firstDay; e++) {
          html += '<div class="widget-cal-empty"></div>';
        }
        for (var d = 1; d <= daysInMonth; d++) {
          var lv = 0;
          if (dayData[d]) {
            var ratio = maxSales > 0 ? dayData[d] / maxSales : 0;
            lv = ratio > 0.8 ? 5 : ratio > 0.6 ? 4 : ratio > 0.4 ? 3 : ratio > 0.2 ? 2 : 1;
          }
          var isToday = d === today;
          html += '<div class="widget-cal-day' + (isToday ? ' widget-cal-today' : '') + '"' +
            (lv > 0 ? ' data-lv="' + lv + '"' : '') + '>' + d + '</div>';
        }
        html += '</div></div>';
        return html;
      }
    },

    /* --- その他 --- */
    hourlyRate: {
      id: 'hourlyRate', name: '時給換算', icon: '⏱', category: 'other',
      size: 'half', sizeOptions: ['half','full'],
      desc: '今日の稼働時間と時給',
      render: function(w) {
        var data = _getTodayData();
        var hours = S.g('todayHours', 0);
        var rate = hours > 0 ? Math.round(data.sales / hours) : 0;
        var label = hours > 0 ? '¥' + fmt(rate) + '/h' : '稼働時間未設定';
        return _statBox('時給換算', label, null, w);
      }
    },
    streakCounter: {
      id: 'streakCounter', name: '連続稼働', icon: '🔥', category: 'other',
      size: 'half', sizeOptions: ['half','full'],
      desc: '連続稼働日数',
      render: function(w) {
        var streak = _calcStreak();
        return _statBox('連続稼働', streak + '日', 'accent-warning', w);
      }
    },
    themeInfo: {
      id: 'themeInfo', name: 'テーマ情報', icon: '🎨', category: 'other',
      size: 'half', sizeOptions: ['half','full'],
      desc: '現在のテーマ設定',
      render: function(w) {
        var style = typeof getThemeStyle === 'function' ? getThemeStyle() : '?';
        var color = typeof getThemeColor === 'function' ? getThemeColor() : '?';
        return _statBox('テーマ', style + ' / ' + color, null, w);
      }
    },
    quickMemo: {
      id: 'quickMemo', name: 'メモ', icon: '📝', category: 'other',
      size: 'full', sizeOptions: ['full','half'],
      desc: 'ちょっとしたメモ',
      render: function() {
        var memo = S.g('quickMemo', '');
        return '<div class="widget-inner">' +
          '<textarea class="widget-memo-textarea" placeholder="タップしてメモ…" ' +
          'oninput="S.s(\'quickMemo\',this.value)" style="width:100%;min-height:60px;border:none;' +
          'background:transparent;font-size:.8125rem;color:var(--c-tx);resize:vertical;outline:none;' +
          'font-family:inherit">' + escHtml(memo) + '</textarea></div>';
      }
    }
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

  /* ---------- データ取得 ---------- */
  function _getTodayRecords() {
    var all = typeof getEarns === 'function' ? getEarns() : [];
    var today = dateKey(new Date());
    return all.filter(function(r) {
      return dateKey(new Date(r.ts || r.timestamp)) === today;
    });
  }

  function _getTodayData() {
    var records = _getTodayRecords();
    var sales = 0, count = 0;
    records.forEach(function(r) {
      sales += (r.amount || 0);
      count += (r.count || 1);
    });
    return { sales: sales, count: count, records: records };
  }

  function _getTodayExpense() {
    if (typeof getExpenses !== 'function') return 0;
    var all = getExpenses();
    var today = dateKey(new Date());
    var total = 0;
    all.forEach(function(e) {
      if (dateKey(new Date(e.ts || e.timestamp || e.date)) === today) {
        total += (e.amount || 0);
      }
    });
    return total;
  }

  function _getWeekData() {
    var now = new Date();
    var day = now.getDay();
    var mondayOffset = day === 0 ? -6 : 1 - day;
    var monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    monday.setHours(0,0,0,0);

    var all = typeof getEarns === 'function' ? getEarns() : [];
    var sales = 0, count = 0, daysSet = {};
    all.forEach(function(r) {
      var d = new Date(r.ts || r.timestamp);
      if (d >= monday && d <= now) {
        sales += (r.amount || 0);
        count += (r.count || 1);
        daysSet[dateKey(d)] = true;
      }
    });
    return { sales: sales, count: count, days: Object.keys(daysSet).length };
  }

  function _getMonthData() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var all = typeof getEarns === 'function' ? getEarns() : [];
    var sales = 0, count = 0, daysSet = {};
    all.forEach(function(r) {
      var d = new Date(r.ts || r.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        sales += (r.amount || 0);
        count += (r.count || 1);
        daysSet[dateKey(d)] = true;
      }
    });
    return { sales: sales, count: count, days: Object.keys(daysSet).length };
  }

  function _calcStreak() {
    var all = typeof getEarns === 'function' ? getEarns() : [];
    var daysSet = {};
    all.forEach(function(r) {
      daysSet[dateKey(new Date(r.ts || r.timestamp))] = true;
    });
    var streak = 0;
    var d = new Date();
    /* 今日データがなければ昨日から開始 */
    if (!daysSet[dateKey(d)]) {
      d.setDate(d.getDate() - 1);
    }
    while (daysSet[dateKey(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  /* ========== ウィジェットラッパー描画 ========== */
  function renderWidgetWrapper(w, editMode) {
    var def = WIDGET_DEFS[w.id];
    if (!def) return '';
    var sizeClass = 'widget-' + (w.size || def.size || 'full');
    var tappable = !editMode && def.tappable ? ' widget-tappable' : '';
    var tapAttr = '';
    if (!editMode && def.tappable && def.tapAction) {
      tapAttr = ' onclick="widgetTap(\'' + def.tapAction + '\')"';
    }
    var html = '<div class="widget ' + sizeClass + tappable + '"' + tapAttr + '>';

    /* タイトルバー */
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

    /* コンテンツ */
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
    if (_clockTimer) clearInterval(_clockTimer);
    _clockTimer = setInterval(function() {
      var el = document.getElementById('widget-clock-time');
      if (!el) { clearInterval(_clockTimer); _clockTimer = null; return; }
      var now = new Date();
      var h = String(now.getHours()).padStart(2,'0');
      var m = String(now.getMinutes()).padStart(2,'0');
      var s = String(now.getSeconds()).padStart(2,'0');
      el.innerHTML = h + ':' + m + '<span style="opacity:.4;font-size:.7em">:' + s + '</span>';
    }, 1000);
  }

  /* ========== ウィジェットタップ ========== */
  function widgetTap(action) {
    if (typeof hp === 'function') hp();
    if (action === 'earn') {
      if (typeof openOverlay === 'function') openOverlay('earn');
      else toast('売上入力は次のバージョンで実装予定です');
    }
  }

  /* ========== 目標設定 ========== */
  function openGoalSetting() {
    var current = S.g('monthlyGoal', 0);
    customPrompt('月間売上目標（円）', current ? String(current) : '', function(val) {
      var num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) {
        S.s('monthlyGoal', num);
        toast('🎯 目標を ¥' + fmt(num) + ' に設定しました');
        if (typeof renderHome === 'function') renderHome();
      }
    });
  }

  /* ========== Expose ========== */
  window.WIDGET_DEFS = WIDGET_DEFS;
  window.WIDGET_CATEGORIES = WIDGET_CATEGORIES;
  window.renderWidgetWrapper = renderWidgetWrapper;
  window.startWidgetClock = startWidgetClock;
  window.widgetTap = widgetTap;
  window.openGoalSetting = openGoalSetting;

})();
