/* ==========================================================
   DeliEasy v2 — js/expense-input.js
   経費入力オーバーレイ（Phase 5）
   ========================================================== */
(function(){
  'use strict';

  /* @depends: utils.js, storage.js
     @provides: renderOverlay_expenseInput */

  /* ---------- 状態 ---------- */
  var _inputMode = 'numpad'; // 'numpad' | 'direct'
  var _npVal = '';
  var _selectedDate = null;
  var _selectedCat = '';
  var _memo = '';

  /* ---------- デフォルトカテゴリ ---------- */
  var DEFAULT_CATS = ['ガソリン','バイク維持費','スマホ通信費','配達バッグ','雨具','駐輪場','食費','保険','その他'];

  function _getCats() {
    var custom = S.g('expCats', []);
    return DEFAULT_CATS.concat(custom);
  }

  /* ---------- 初期化 ---------- */
  function _init() {
    _inputMode = S.g('expInputMode', 'numpad');
    _npVal = '';
    _selectedDate = TD;
    _memo = '';
    var recentExps = S.g('exps', []);
    var lastCat = null;
    for (var i = recentExps.length - 1; i >= 0; i--) {
      if (recentExps[i].cat) { lastCat = recentExps[i].cat; break; }
    }
    _selectedCat = lastCat || DEFAULT_CATS[0];
  }

  /* ---------- オーバーレイ描画 ---------- */
  function renderOverlay_expenseInput(body) {
    _init();
    _render(body);
  }

  function _render(body) {
    if (!body) body = document.getElementById('overlay-body-expenseInput');
    if (!body) return;

    var cats = _getCats();

    /* 最近使用したカテゴリ順にソート */
    var allExps = S.g('exps', []);
    var recentCatOrder = [];
    allExps.slice().sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); }).forEach(function(e) {
      if (e.cat && recentCatOrder.indexOf(e.cat) < 0) recentCatOrder.push(e.cat);
    });
    if (recentCatOrder.length > 0) {
      var sortedCats = [];
      recentCatOrder.forEach(function(c) {
        if (cats.indexOf(c) >= 0 && sortedCats.indexOf(c) < 0) sortedCats.push(c);
      });
      cats.forEach(function(c) {
        if (sortedCats.indexOf(c) < 0) sortedCats.push(c);
      });
      cats = sortedCats;
    }
    var html = '';

    /* ===== カテゴリ選択 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">カテゴリ</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    cats.forEach(function(cat) {
      var isActive = _selectedCat === cat;
      html += '<button class="pill' + (isActive ? ' active' : '') + '" ';
      html += 'onclick="_expSelectCat(\'' + escJs(cat) + '\')">';
      html += escHtml(cat);
      html += '</button>';
    });
    html += '</div>';
    /* カテゴリ追加ボタン */
    html += '<button class="btn btn-ghost btn-xs mt8" onclick="_expAddCatDialog()" style="font-size:.7rem">+ カテゴリ追加</button>';
    html += '</div></div>';

    /* ===== 日付 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">日付</div>';
    html += '<div style="display:flex;gap:6px;align-items:center">';
    html += '<input type="date" class="input" id="exp-date" value="' + escHtml(_selectedDate) + '" onchange="_expSetDate(this.value)" style="flex:1">';
    var isToday = _selectedDate === TD;
    html += '<button class="pill' + (isToday ? ' active' : '') + '" onclick="_expSetDate(\'' + TD + '\')">今日</button>';
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var ydKey = dateKey(yesterday);
    var isYesterday = _selectedDate === ydKey;
    html += '<button class="pill' + (isYesterday ? ' active' : '') + '" onclick="_expSetDate(\'' + ydKey + '\')">昨日</button>';
    html += '</div>';
    html += '</div></div>';

    /* ===== メモ ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">メモ（任意）</div>';
    html += '<input type="text" class="input" id="exp-memo" placeholder="メモを入力" value="' + escHtml(_memo) + '" oninput="_expSetMemo(this.value)">';
    html += '</div></div>';

    /* ===== 金額入力 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div class="fz-xs fw6 c-secondary">金額</div>';
    html += '<button class="input-mode-toggle" onclick="_expToggleMode()">';
    html += _inputMode === 'numpad' ? '⌨️ 直接入力に切替' : '🔢 テンキーに切替';
    html += '</button>';
    html += '</div>';

    if (_inputMode === 'direct') {
      html += '<input type="number" class="direct-amount-input" id="exp-amount-direct" ';
      html += 'value="' + (_npVal || '') + '" placeholder="金額を入力" inputmode="numeric" ';
      html += 'oninput="_expDirectInput(this.value)" autofocus>';
    } else {
      html += '<div class="numpad-display" id="exp-np-display">' + (_npVal ? fmt(Number(_npVal)) : '0') + '</div>';

      /* クイック金額 */
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">';
      [100, 200, 500, 1000, 1500, 2000, 3000, 5000].forEach(function(amt) {
        html += '<button class="btn btn-secondary btn-xs" onclick="_expQuickAmount(' + amt + ')" style="font-size:.7rem;padding:8px 4px">¥' + fmt(amt) + '</button>';
      });
      html += '</div>';

      html += '<div class="numpad">';
      ['7','8','9','4','5','6','1','2','3','00','0'].forEach(function(k) {
        html += '<button class="numpad-key" onclick="_expNpKey(\'' + k + '\')">' + k + '</button>';
      });
      html += '<button class="numpad-key numpad-key-del" onclick="_expNpKey(\'del\')">⌫</button>';
      html += '</div>';
    }
    html += '</div></div>';

    /* ===== アクションボタン ===== */
    html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
    html += '<button class="btn btn-secondary btn-block" onclick="_expClear()">クリア</button>';
    html += '<button class="btn btn-primary btn-block" onclick="_expSubmit()" style="flex:2">💸 経費を記録</button>';
    html += '</div>';

    /* ===== 今日の経費一覧 ===== */
    html += _renderTodayExpensesList();

    body.innerHTML = html;

    if (_inputMode === 'direct') {
      var directEl = document.getElementById('exp-amount-direct');
      if (directEl) setTimeout(function() { directEl.focus(); }, 100);
    }
  }

  /* ---------- 今日の経費一覧 ---------- */
  function _renderTodayExpensesList() {
    var allExps = S.g('exps', []);
    var dayExps = allExps.filter(function(e) { return e.date === _selectedDate; });
    if (dayExps.length === 0) return '';

    var total = dayExps.reduce(function(s, e) { return s + (Number(e.amount) || 0); }, 0);

    var html = '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">' + escHtml(_selectedDate) + ' の経費 (' + dayExps.length + '件 / ¥' + fmt(total) + ')</div>';

    dayExps.slice().sort(function(a,b) { return b.ts - a.ts; }).forEach(function(e) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:.5px solid var(--c-divider)">';
      html += '<div style="flex:1;min-width:0">';
      html += '<span class="fz-s fw5">' + escHtml(e.cat || 'その他') + '</span>';
      if (e.memo) html += ' <span class="fz-xs c-muted">' + escHtml(e.memo) + '</span>';
      html += '</div>';
      html += '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">';
      html += '<span class="fz-s fw6 c-danger" style="font-variant-numeric:tabular-nums">-¥' + fmt(e.amount) + '</span>';
      html += '<button class="btn btn-danger btn-xs" onclick="_expDeleteRecord(' + e.ts + ')">削除</button>';
      html += '</div></div>';
    });
    html += '</div></div>';
    return html;
  }

  /* ---------- カテゴリ選択 ---------- */
  window._expSelectCat = function(cat) {
    hp();
    _selectedCat = cat;
    _render();
  };

  /* ---------- カテゴリ追加 ---------- */
  window._expAddCatDialog = function() {
    customPrompt('新しいカテゴリ名を入力', '', function(val) {
      if (!val || !val.trim()) return;
      var cats = S.g('expCats', []);
      if (cats.indexOf(val.trim()) < 0 && DEFAULT_CATS.indexOf(val.trim()) < 0) {
        cats.push(val.trim());
        S.s('expCats', cats);
        _selectedCat = val.trim();
        toast('✅ カテゴリ「' + val.trim() + '」を追加しました');
      } else {
        _selectedCat = val.trim();
        toast('既存のカテゴリを選択しました');
      }
      _render();
    });
  };

  /* ---------- 日付設定 ---------- */
  window._expSetDate = function(d) {
    hp();
    _selectedDate = d;
    _render();
  };

  /* ---------- メモ ---------- */
  window._expSetMemo = function(val) {
    _memo = val;
  };

  /* ---------- 入力モード切替 ---------- */
  window._expToggleMode = function() {
    hp();
    _inputMode = _inputMode === 'numpad' ? 'direct' : 'numpad';
    S.si('expInputMode', _inputMode);
    _render();
  };

  /* ---------- テンキー ---------- */
  window._expNpKey = function(k) {
    hp();
    if (k === 'del') {
      _npVal = _npVal.slice(0, -1);
    } else {
      _npVal += k;
    }
    var el = document.getElementById('exp-np-display');
    if (el) el.textContent = _npVal ? fmt(Number(_npVal)) : '0';
  };

  /* ---------- クイック金額 ---------- */
  window._expQuickAmount = function(amt) {
    hp();
    _npVal = String(amt);
    var el = document.getElementById('exp-np-display');
    if (el) el.textContent = fmt(amt);
  };

  /* ---------- 直接入力 ---------- */
  window._expDirectInput = function(val) {
    _npVal = val;
  };

  /* ---------- クリア ---------- */
  window._expClear = function() {
    hp();
    _npVal = '';
    _memo = '';
    _render();
  };

  /* ---------- 記録実行 ---------- */
  window._expSubmit = function() {
    var amount = Number(_npVal);
    if (!amount || amount <= 0) {
      toast('金額を入力してください');
      return;
    }

    hp();

    var exps = S.g('exps', []);
    exps.push({
      date: _selectedDate,
      cat: _selectedCat || 'その他',
      amount: amount,
      memo: _memo,
      ts: Date.now()
    });
    S.s('exps', exps);

    toast('💸 経費 ¥' + fmt(amount) + ' を記録しました');

    /* 入力をリセット（カテゴリと日付は維持） */
    _npVal = '';
    _memo = '';

    /* ホーム画面を更新 */
    if (typeof refreshHome === 'function') refreshHome();

    /* 再描画（経費一覧を更新） */
    _render();
  };

  /* ---------- 経費削除 ---------- */
  window._expDeleteRecord = function(ts) {
    customConfirm('この経費を削除しますか？', function() {
      var exps = S.g('exps', []).filter(function(e) { return e.ts !== ts; });
      S.s('exps', exps);
      toast('🗑 削除しました');
      _render();
      if (typeof refreshHome === 'function') refreshHome();
    });
  };

  /* ---------- Expose ---------- */
  window.renderOverlay_expenseInput = renderOverlay_expenseInput;

})();
