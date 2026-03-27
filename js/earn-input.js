/* ==========================================================
   DeliEasy v2 — js/earn-input.js
   売上入力オーバーレイ — PF追加対応 + 件数1件固定（詳細モードで変更可）
   ========================================================== */
(function(){
  'use strict';

  /* ---------- 状態 ---------- */
  var _inputMode = 'numpad';
  var _npVal = '';
  var _selectedDate = null;
  var _selectedPf = '';
  var _memo = '';
  var _count = 1;
  var _showAdvanced = false;

  /* ---------- 初期化 ---------- */
  function _init() {
    _inputMode = S.g('earnInputMode', 'numpad');
    _npVal = '';
    _selectedDate = TD;
    _selectedPf = '';
    _memo = '';
    _count = 1;
    _showAdvanced = false;
  }

  /* ---------- オーバーレイ描画 ---------- */
  function renderOverlay_earnInput(body) {
    _init();
    _render(body);
  }

  function _render(body) {
    if (!body) body = document.getElementById('overlay-body-earnInput');
    if (!body) return;

    var pfs = typeof getAllPFs === 'function' ? getAllPFs() : [];
    var activePfs = pfs.filter(function(p) { return p.active !== false; });

    var html = '';

    /* ===== PF選択 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">プラットフォーム</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
    activePfs.forEach(function(pf) {
      var isActive = _selectedPf === pf.name;
      html += '<button class="pill' + (isActive ? ' active' : '') + '" ';
      html += 'style="' + (isActive ? 'background:' + (pf.color || 'var(--c-primary)') + ';color:#fff;border-color:' + (pf.color || 'var(--c-primary)') : '') + '" ';
      html += 'onclick="_earnSelectPf(\'' + escJs(pf.name) + '\')">';
      html += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (pf.color || '#888') + ';margin-right:4px;vertical-align:middle' + (isActive ? ';border:1.5px solid rgba(255,255,255,.6)' : '') + '"></span>';
      html += escHtml(pf.name);
      html += '</button>';
    });
    /* PFなし選択肢 */
    var noPfActive = _selectedPf === '';
    html += '<button class="pill' + (noPfActive ? ' active' : '') + '" onclick="_earnSelectPf(\'\')">指定なし</button>';
    /* PF追加ボタン */
    html += '<button class="pill" onclick="_earnAddPfDialog()" style="border:1.5px dashed var(--c-border);color:var(--c-primary);font-weight:600">＋ 追加</button>';
    html += '</div>';
    html += '</div></div>';

    /* ===== 日付 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">日付</div>';
    html += '<div style="display:flex;gap:6px;align-items:center">';
    html += '<input type="date" class="input" id="earn-date" value="' + escHtml(_selectedDate) + '" onchange="_earnSetDate(this.value)" style="flex:1">';
    var isToday = _selectedDate === TD;
    html += '<button class="pill' + (isToday ? ' active' : '') + '" onclick="_earnSetDate(\'' + TD + '\')">今日</button>';
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var ydKey = dateKey(yesterday);
    var isYesterday = _selectedDate === ydKey;
    html += '<button class="pill' + (isYesterday ? ' active' : '') + '" onclick="_earnSetDate(\'' + ydKey + '\')">昨日</button>';
    html += '</div>';
    html += '</div></div>';

    /* ===== メモ ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">メモ（任意）</div>';
    html += '<input type="text" class="input" id="earn-memo" placeholder="メモを入力" value="' + escHtml(_memo) + '" oninput="_earnSetMemo(this.value)">';
    html += '</div></div>';

    /* ===== 詳細オプション（件数変更）===== */
    html += '<div style="text-align:center;margin-bottom:8px">';
    html += '<button class="btn btn-ghost btn-xs" onclick="_earnToggleAdvanced()" style="font-size:.7rem;color:var(--c-tx-muted)">';
    html += _showAdvanced ? '▲ 詳細を閉じる' : '▼ 件数を変更する（まとめ記録）';
    html += '</button>';
    html += '</div>';

    if (_showAdvanced) {
      html += '<div class="card mb12"><div class="card-body">';
      html += '<div class="fz-xs fw6 c-secondary mb8">件数（まとめ記録）</div>';
      html += '<div class="fz-xxs c-muted mb8">複数件をまとめて記録できます。単価の統計はおおよその値になります。</div>';
      html += '<div style="display:flex;align-items:center;gap:8px">';
      html += '<button class="btn btn-secondary btn-sm" onclick="_earnChangeCount(-1)" style="width:40px;font-size:1.2rem">−</button>';
      html += '<span class="fw7 fz-l" id="earn-count-display" style="min-width:40px;text-align:center;font-variant-numeric:tabular-nums">' + _count + '</span>';
      html += '<button class="btn btn-secondary btn-sm" onclick="_earnChangeCount(1)" style="width:40px;font-size:1.2rem">＋</button>';
      html += '<span class="fz-xs c-muted">件</span>';
      html += '</div>';
      html += '</div></div>';
    }

    /* ===== 金額入力 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    html += '<div class="fz-xs fw6 c-secondary">金額</div>';
    html += '<button class="input-mode-toggle" onclick="_earnToggleMode()">';
    html += _inputMode === 'numpad' ? '⌨️ 直接入力に切替' : '🔢 テンキーに切替';
    html += '</button>';
    html += '</div>';

    if (_inputMode === 'direct') {
      html += '<input type="number" class="direct-amount-input" id="earn-amount-direct" ';
      html += 'value="' + (_npVal || '') + '" placeholder="金額を入力" inputmode="numeric" ';
      html += 'oninput="_earnDirectInput(this.value)" autofocus>';
    } else {
      html += '<div class="numpad-display" id="earn-np-display">' + (_npVal ? fmt(Number(_npVal)) : '0') + '</div>';

      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">';
      [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000].forEach(function(amt) {
        html += '<button class="btn btn-secondary btn-xs" onclick="_earnQuickAmount(' + amt + ')" style="font-size:.7rem;padding:8px 4px">¥' + fmt(amt) + '</button>';
      });
      html += '</div>';

      html += '<div class="numpad">';
      ['7','8','9','4','5','6','1','2','3','00','0'].forEach(function(k) {
        html += '<button class="numpad-key" onclick="_earnNpKey(\'' + k + '\')">' + k + '</button>';
      });
      html += '<button class="numpad-key numpad-key-del" onclick="_earnNpKey(\'del\')">⌫</button>';
      html += '</div>';
    }

    html += '</div></div>';

    /* ===== アクションボタン ===== */
    html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
    html += '<button class="btn btn-secondary btn-block" onclick="_earnClear()">クリア</button>';
    html += '<button class="btn btn-primary btn-block" onclick="_earnSubmit()" style="flex:2">✏️ 記録する</button>';
    html += '</div>';

    /* ===== 今日の記録一覧 ===== */
    html += _renderTodayRecordsList();

    body.innerHTML = html;

    if (_inputMode === 'direct') {
      var directEl = document.getElementById('earn-amount-direct');
      if (directEl) setTimeout(function() { directEl.focus(); }, 100);
    }
  }

  /* ---------- 今日の記録一覧 ---------- */
  function _renderTodayRecordsList() {
    var records = typeof eByDate === 'function' ? eByDate(_selectedDate) : [];
    if (records.length === 0) return '';

    var totalA = typeof sumA === 'function' ? sumA(records) : 0;
    var totalC = typeof sumC === 'function' ? sumC(records) : 0;

    var html = '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">' + escHtml(_selectedDate) + ' の記録 (' + records.length + '件 / ¥' + fmt(totalA) + ' / ' + totalC + '配達)</div>';

    records.slice().sort(function(a,b) { return b.ts - a.ts; }).forEach(function(r) {
      var pf = typeof extractPf === 'function' ? extractPf(r.m) : '';
      var pfCol = pf && typeof pfColor === 'function' ? pfColor(pf) : '';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:.5px solid var(--c-divider)">';
      html += '<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">';
      if (pfCol) html += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + pfCol + ';flex-shrink:0"></span>';
      html += '<span class="fz-s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(pf || '—') + '</span>';
      html += '</div>';
      html += '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">';
      html += '<span class="fz-s fw6" style="font-variant-numeric:tabular-nums">¥' + fmt(r.a) + '</span>';
      html += '<span class="fz-xs c-muted">' + r.c + '件</span>';
      html += '<button class="btn btn-danger btn-xs" onclick="_earnDeleteRecord(' + r.ts + ')">削除</button>';
      html += '</div></div>';
    });
    html += '</div></div>';
    return html;
  }

  /* ---------- PF選択 ---------- */
  window._earnSelectPf = function(name) {
    hp();
    _selectedPf = name;
    _render();
  };

  /* ---------- PF追加ダイアログ ---------- */
  window._earnAddPfDialog = function() {
    hp();
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:320px;text-align:left">' +
        '<h3 class="fz-s fw6 mb12 text-c">新しいPFを追加</h3>' +
        '<div class="input-group"><label class="input-label">PF名</label>' +
          '<input type="text" class="input" id="earn-add-pf-name" placeholder="例: Wolt"></div>' +
        '<div class="input-group"><label class="input-label">色</label>' +
          '<input type="color" id="earn-add-pf-color" value="#ff6600" style="width:100%;height:44px;border:none;border-radius:var(--ds-radius-sm);cursor:pointer"></div>' +
        '<div class="flex justify-center gap8 mt12">' +
          '<button class="btn btn-primary btn-sm" id="earn-add-pf-ok">追加</button>' +
          '<button class="btn btn-secondary btn-sm" id="earn-add-pf-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });

    setTimeout(function() {
      var nameInput = document.getElementById('earn-add-pf-name');
      if (nameInput) nameInput.focus();
    }, 100);

    document.getElementById('earn-add-pf-ok').onclick = function() {
      var name = document.getElementById('earn-add-pf-name').value.trim();
      var color = document.getElementById('earn-add-pf-color').value;
      if (!name) { toast('PF名を入力してください'); return; }

      var pfs = typeof getAllPFs === 'function' ? getAllPFs() : [];
      for (var i = 0; i < pfs.length; i++) {
        if (pfs[i].name === name) { toast('同名のPFが既に存在します'); return; }
      }
      pfs.push({ name: name, color: color, active: true, default: false });
      S.s('pfItems', pfs);

      _selectedPf = name;
      toast('✅ PF「' + name + '」を追加しました');
      div.remove();
      _render();
    };
    document.getElementById('earn-add-pf-cancel').onclick = function() { div.remove(); };
  };

  /* ---------- 日付設定 ---------- */
  window._earnSetDate = function(d) {
    hp();
    _selectedDate = d;
    _render();
  };

  /* ---------- 詳細オプション切替 ---------- */
  window._earnToggleAdvanced = function() {
    hp();
    _showAdvanced = !_showAdvanced;
    if (!_showAdvanced) _count = 1; /* 閉じたら1件に戻す */
    _render();
  };

  /* ---------- 件数変更 ---------- */
  window._earnChangeCount = function(delta) {
    hp();
    _count = Math.max(1, _count + delta);
    var el = document.getElementById('earn-count-display');
    if (el) el.textContent = _count;
  };

  /* ---------- メモ ---------- */
  window._earnSetMemo = function(val) {
    _memo = val;
  };

  /* ---------- 入力モード切替 ---------- */
  window._earnToggleMode = function() {
    hp();
    _inputMode = _inputMode === 'numpad' ? 'direct' : 'numpad';
    S.si('earnInputMode', _inputMode);
    _render();
  };

  /* ---------- テンキー ---------- */
  window._earnNpKey = function(k) {
    hp();
    if (k === 'del') {
      _npVal = _npVal.slice(0, -1);
    } else {
      _npVal += k;
    }
    var el = document.getElementById('earn-np-display');
    if (el) el.textContent = _npVal ? fmt(Number(_npVal)) : '0';
  };

  /* ---------- クイック金額 ---------- */
  window._earnQuickAmount = function(amt) {
    hp();
    _npVal = String(amt);
    var el = document.getElementById('earn-np-display');
    if (el) el.textContent = fmt(amt);
  };

  /* ---------- 直接入力 ---------- */
  window._earnDirectInput = function(val) {
    _npVal = val;
  };

  /* ---------- クリア ---------- */
  window._earnClear = function() {
    hp();
    _npVal = '';
    _memo = '';
    _count = 1;
    _showAdvanced = false;
    _render();
  };

  /* ---------- 記録実行 ---------- */
  window._earnSubmit = function() {
    var amount = Number(_npVal);
    if (!amount || amount <= 0) {
      toast('金額を入力してください');
      return;
    }

    hp();

    var memoStr = '';
    if (_selectedPf) memoStr = '/' + _selectedPf;
    if (_memo) memoStr += (memoStr ? ' ' : '') + _memo;

    if (typeof addE === 'function') {
      addE(_selectedDate, amount, _count, memoStr, null, true, null);
    }

    _npVal = '';
    _memo = '';
    _count = 1;
    _showAdvanced = false;

    _render();
  };

  /* ---------- 記録削除 ---------- */
  window._earnDeleteRecord = function(ts) {
    customConfirm('この記録を削除しますか？', function() {
      if (typeof deleteE === 'function') {
        deleteE(ts).then(function() {
          toast('🗑 削除しました');
          _render();
          if (typeof refreshHome === 'function') refreshHome();
        });
      }
    });
  };

  /* ---------- Expose ---------- */
  window.renderOverlay_earnInput = renderOverlay_earnInput;

})();
