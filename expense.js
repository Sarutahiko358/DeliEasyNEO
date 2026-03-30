/* expense.js — DeliEasy Expense Manager (v2 CSS版) */
(function(){
  'use strict';

  const DEFAULT_CATS = ['ガソリン','バイク維持費','スマホ通信費','配達バッグ','雨具','駐輪場','食費','保険','その他'];
  let expMonth, expYear, expMode = 'month';
  let expYearStart = 1;
  let expCatFilter = '';

  function initExpense() {
    const now = new Date();
    expMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    expYear = now.getFullYear();
    expYearStart = S.g('expYearStart', 1);
  }

  function getCats() {
    const custom = S.g('expCats', []);
    return [...DEFAULT_CATS, ...custom];
  }

  function getAllExpCatsIncludingData(exps) {
    const baseCats = getCats();
    const dataCats = new Set();
    exps.forEach(e => {
      if (e.cat && !baseCats.includes(e.cat)) {
        dataCats.add(e.cat);
      }
    });
    return [...baseCats, ...Array.from(dataCats)];
  }

  function renderExpense() {
    const pg = document.getElementById('pg4');
    if (!pg) return;
    if (!expMonth) initExpense();

    const allExps = S.g('exps', []);
    let html = '';

    /* Input form */
    html += `<div class="card"><div class="card-header open" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('hidden')">
      <span>💸 経費入力</span><span class="card-arrow">▼</span></div>
      <div class="card-body">
        <div class="input-group"><label class="input-label">カテゴリ</label>
          <select class="input" id="exp-cat">${getCats().map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}</select>
        </div>
        <div class="input-group"><label class="input-label">日付</label><input type="date" class="input" id="exp-date" value="${TD}"></div>
        <div class="input-group"><label class="input-label">金額</label><input type="number" class="input" id="exp-amount" placeholder="金額"></div>
        <div class="input-group"><label class="input-label">メモ</label><input type="text" class="input" id="exp-memo" placeholder="メモ"></div>
        <button class="btn btn-primary btn-block" onclick="addExpense()">経費を記録</button>
        <div class="mt8">
          <button class="btn btn-secondary btn-sm" onclick="openMo('addExpCat')">+ カテゴリ追加</button>
        </div>
      </div>
    </div>`;

    /* Period switch */
    html += `<div class="segmented mb12">
      <button class="segmented-item ${expMode==='month'?'active':''}" onclick="setExpMode('month')">月次</button>
      <button class="segmented-item ${expMode==='year'?'active':''}" onclick="setExpMode('year')">年度</button>
    </div>`;

    if (expMode === 'month') {
      html += renderExpMonth(allExps);
    } else {
      html += renderExpYear(allExps);
    }

    /* Export */
    html += `<div class="flex items-center mt12" style="justify-content:center;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="exportExpCSV()">経費CSV</button>
      <button class="btn btn-secondary btn-sm" onclick="exportRecCSV()">売上CSV</button>
      <button class="btn btn-secondary btn-sm" onclick="exportBackupJSON()">バックアップJSON</button>
    </div>`;

    pg.innerHTML = html;
  }

  function renderExpMonth(allExps) {
    const parts = expMonth.split('-');
    const y = +parts[0], m = +parts[1];
    const mk = expMonth;
    const mExps = allExps.filter(e => e.date && e.date.substring(0, 7) === mk);
    const total = mExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const catMap = {};
    mExps.forEach(e => {
      const c = e.cat || 'その他';
      catMap[c] = (catMap[c] || 0) + (Number(e.amount) || 0);
    });
    const catArr = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const maxCat = catArr.length > 0 ? catArr[0][1] : 1;

    let html = '';

    /* nav */
    html += `<div class="card"><div class="card-body">
      <div class="flex items-center" style="justify-content:space-between">
        <button class="btn btn-secondary btn-sm" onclick="expMonthPrev()">◀</button>
        <span class="fw6">${y}年${m}月</span>
        <button class="btn btn-secondary btn-sm" onclick="expMonthNext()">▶</button>
      </div>
      <div class="text-c mt8"><span class="fw6 c-primary" style="font-size:1.5rem">¥${fmt(total)}</span></div>
    </div></div>`;

    /* category bars */
    if (catArr.length > 0) {
      html += `<div class="card"><div class="card-header open"><span>カテゴリ別内訳</span></div><div class="card-body">`;
      catArr.forEach(([cat, amt]) => {
        const pct = Math.round(amt / maxCat * 100);
        html += `<div class="flex items-center mb8" style="gap:8px">
          <span class="fz-s" style="min-width:85px">${escHtml(cat)}</span>
          <div style="flex:1;background:var(--c-fill-quaternary);border-radius:4px;height:16px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--c-primary);border-radius:4px"></div>
          </div>
          <span class="fz-s fw6" style="min-width:65px;text-align:right">¥${fmt(amt)}</span>
        </div>`;
      });
      html += `</div></div>`;
    }

    /* expense list */
    html += renderExpList(mExps, allExps);
    return html;
  }

  function renderExpYear(allExps) {
    const startM = expYearStart;
    const fromDate = expYear + '-' + String(startM).padStart(2, '0') + '-01';
    const endYear = startM > 1 ? expYear + 1 : expYear;
    const endMonth = startM > 1 ? startM - 1 : 12;
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    const toDate = endYear + '-' + String(endMonth).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

    const yExps = allExps.filter(e => e.date >= fromDate && e.date <= toDate);
    const total = yExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const catMap = {};
    yExps.forEach(e => {
      const c = e.cat || 'その他';
      catMap[c] = (catMap[c] || 0) + (Number(e.amount) || 0);
    });
    const catArr = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const maxCat = catArr.length > 0 ? catArr[0][1] : 1;

    let html = `<div class="card"><div class="card-body">
      <div class="flex items-center" style="justify-content:space-between">
        <button class="btn btn-secondary btn-sm" onclick="expYear--;renderExpense()">◀</button>
        <span class="fw6">${expYear}年度 (${startM}月始)</span>
        <button class="btn btn-secondary btn-sm" onclick="expYear++;renderExpense()">▶</button>
      </div>
      <div class="flex items-center mt8" style="justify-content:center;gap:8px">
        <button class="pill ${expYearStart===1?'active':''}" onclick="expYearStart=1;S.s('expYearStart',1);renderExpense()">1月始</button>
        <button class="pill ${expYearStart===4?'active':''}" onclick="expYearStart=4;S.s('expYearStart',4);renderExpense()">4月始</button>
      </div>
      <div class="text-c mt8"><span class="fw6 c-primary" style="font-size:1.5rem">¥${fmt(total)}</span></div>
    </div></div>`;

    if (catArr.length > 0) {
      html += `<div class="card"><div class="card-header open"><span>カテゴリ別内訳</span></div><div class="card-body">`;
      catArr.forEach(([cat, amt]) => {
        const pct = Math.round(amt / maxCat * 100);
        html += `<div class="flex items-center mb8" style="gap:8px">
          <span class="fz-s" style="min-width:85px">${escHtml(cat)}</span>
          <div style="flex:1;background:var(--c-fill-quaternary);border-radius:4px;height:16px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--c-primary);border-radius:4px"></div>
          </div>
          <span class="fz-s fw6" style="min-width:65px;text-align:right">¥${fmt(amt)}</span>
        </div>`;
      });
      html += `</div></div>`;
    }

    html += renderExpList(yExps, allExps);
    return html;
  }

  function renderExpList(exps, allExps) {
    let filtered = exps.slice();
    if (expCatFilter) filtered = filtered.filter(e => e.cat === expCatFilter);
    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.ts - a.ts);

    const displayCats = getAllExpCatsIncludingData(allExps || exps);

    let html = `<div class="flex items-center mb8" style="gap:6px;flex-wrap:wrap">
      <button class="pill ${!expCatFilter?'active':''}" onclick="setExpCatFilter('')">全て</button>
      ${displayCats.map(c => {
        const isOrphan = !getCats().includes(c);
        return `<button class="pill ${expCatFilter===c?'active':''}" style="${isOrphan?'font-style:italic;opacity:.7':''}" onclick="setExpCatFilter('${escJs(c)}')">${escHtml(c)}${isOrphan?' (削除済)':''}</button>`;
      }).join('')}
    </div>`;

    if (filtered.length === 0) {
      html += '<p class="fz-s c-muted text-c">経費がありません</p>';
      return html;
    }

    /* Group by date */
    const groups = {};
    filtered.forEach(e => {
      const d = e.date || '不明';
      if (!groups[d]) groups[d] = [];
      groups[d].push(e);
    });

    Object.entries(groups).forEach(([date, items]) => {
      html += `<div class="fz-xs fw6 c-muted mt8 mb8">${date}</div>`;
      items.forEach(e => {
        html += `<div class="flex items-center mb8" style="justify-content:space-between;padding:8px;background:var(--c-card);border-radius:8px;border:1px solid var(--c-border)">
          <div>
            <div class="fz-s fw6">${escHtml(e.cat || 'その他')}</div>
            ${e.memo ? `<div class="fz-xs c-muted">${escHtml(e.memo)}</div>` : ''}
          </div>
          <div class="flex items-center gap8">
            <span class="fz-s fw6 c-danger">-¥${fmt(e.amount)}</span>
            <button class="btn btn-secondary btn-xs" onclick="openEditExpense(${e.ts})">編集</button>
            <button class="btn btn-danger btn-xs" onclick="delExpense(${e.ts})">削除</button>
          </div>
        </div>`;
      });
    });
    return html;
  }

  /* 経費編集ダイアログ */
  function openEditExpense(ts) {
    const exps = S.g('exps', []);
    const exp = exps.find(e => e.ts === ts);
    if (!exp) { toast('データが見つかりません'); return; }

    const cats = getCats();
    const catOptions = cats.map(c =>
      `<option value="${escHtml(c)}" ${exp.cat === c ? 'selected' : ''}>${escHtml(c)}</option>`
    ).join('');
    const extraOpt = !cats.includes(exp.cat) ?
      `<option value="${escHtml(exp.cat)}" selected>${escHtml(exp.cat)} (削除済)</option>` : '';

    const div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML = `
      <div class="confirm-box" style="max-width:340px;text-align:left">
        <h3 style="margin-bottom:12px;text-align:center">経費を編集</h3>
        <div class="input-group"><label class="input-label">カテゴリ</label>
          <select class="input" id="edit-exp-cat">${catOptions}${extraOpt}</select>
        </div>
        <div class="input-group"><label class="input-label">日付</label>
          <input type="date" class="input" id="edit-exp-date" value="${exp.date || TD}">
        </div>
        <div class="input-group"><label class="input-label">金額</label>
          <input type="number" class="input" id="edit-exp-amount" value="${exp.amount || 0}">
        </div>
        <div class="input-group"><label class="input-label">メモ</label>
          <input type="text" class="input" id="edit-exp-memo" value="${escHtml(exp.memo || '')}">
        </div>
        <div class="flex justify-center gap8 mt12">
          <button class="btn btn-primary btn-sm" id="edit-exp-save">保存</button>
          <button class="btn btn-secondary btn-sm" id="edit-exp-cancel">キャンセル</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', function(e) {
      if (e.target === div) div.remove();
    });

    document.getElementById('edit-exp-cancel').onclick = () => div.remove();
    document.getElementById('edit-exp-save').onclick = () => {
      const newCat = document.getElementById('edit-exp-cat').value;
      const newDate = document.getElementById('edit-exp-date').value;
      const newAmount = Number(document.getElementById('edit-exp-amount').value);
      const newMemo = document.getElementById('edit-exp-memo').value;

      if (!newAmount || newAmount <= 0) { toast('金額を入力してください'); return; }

      const allExps = S.g('exps', []);
      const idx = allExps.findIndex(e => e.ts === ts);
      if (idx >= 0) {
        allExps[idx].cat = newCat;
        allExps[idx].date = newDate;
        allExps[idx].amount = newAmount;
        allExps[idx].memo = newMemo;
        S.s('exps', allExps);
        toast('✅ 経費を更新しました');
      }
      div.remove();
      renderExpense();
    };
  }

  function addExpense() {
    const cat = $('#exp-cat')?.value || 'その他';
    const date = $('#exp-date')?.value || TD;
    const amount = Number($('#exp-amount')?.value);
    const memo = $('#exp-memo')?.value || '';
    if (!amount || amount <= 0) { toast('金額を入力してください'); return; }
    const exps = S.g('exps', []);
    exps.push({ cat, date, amount, memo, ts: Date.now() + Math.floor(Math.random() * 1000) });
    S.s('exps', exps);
    toast('💸 経費を記録しました');
    if ($('#exp-amount')) $('#exp-amount').value = '';
    if ($('#exp-memo')) $('#exp-memo').value = '';
    renderExpense();
    hp();
  }

  function delExpense(ts) {
    customConfirm('この経費を削除しますか？', function() {
      const exps = S.g('exps', []).filter(e => e.ts !== ts);
      S.s('exps', exps);
      renderExpense();
    });
  }

  function setExpMode(mode) { expMode = mode; renderExpense(); }
  function expMonthPrev() {
    const parts = expMonth.split('-');
    let y = +parts[0], m = +parts[1] - 1;
    if (m < 1) { m = 12; y--; }
    expMonth = y + '-' + String(m).padStart(2, '0');
    renderExpense();
  }
  function expMonthNext() {
    const parts = expMonth.split('-');
    let y = +parts[0], m = +parts[1] + 1;
    if (m > 12) { m = 1; y++; }
    expMonth = y + '-' + String(m).padStart(2, '0');
    renderExpense();
  }

  function exportExpCSV() {
    const exps = S.g('exps', []);
    let csv = '日付,カテゴリ,金額,メモ\n';
    exps.forEach(e => {
      csv += `${e.date},${e.cat},${e.amount},"${(e.memo||'').replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'delieasy_expense.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportRecCSV() {
    const earns = window.getE ? window.getE() : [];
    if (earns.length === 0) { toast('売上データがありません'); return; }
    let csv = '日付,PF,金額,件数,メモ\n';
    earns.slice().sort((a, b) => (a.d || '').localeCompare(b.d || '')).forEach(r => {
      const pf = r.m ? r.m.replace(/^\/([^\s(]+).*/, '$1') : '';
      const memo = r.m ? r.m.replace(/^\/[^\s(]+\s*/, '') : '';
      csv += `${r.d},${pf},${r.a},${r.c},"${(memo||'').replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'delieasy_earns.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('売上CSVを保存しました');
  }

  function exportBackupJSON() {
    const data = {
      earns: window.getE ? window.getE() : [],
      expenses: S.g('exps', []),
      memos: S.g('memos', []),
      checklists: S.g('checklists', null),
      settings: {}
    };
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dp_')) data.settings[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'delieasy_backup.json'; a.click();
    URL.revokeObjectURL(url);
    toast('バックアップを保存しました');
  }

  function setExpCatFilter(val) {
    expCatFilter = val;
    renderExpense();
  }

  /* expose */
  window.initExpense = initExpense;
  window.renderExpense = renderExpense;
  window.addExpense = addExpense;
  window.delExpense = delExpense;
  window.setExpMode = setExpMode;
  window.setExpCatFilter = setExpCatFilter;
  window.expMonthPrev = expMonthPrev;
  window.expMonthNext = expMonthNext;
  window.exportExpCSV = exportExpCSV;
  window.exportRecCSV = exportRecCSV;
  window.exportBackupJSON = exportBackupJSON;
  window.openEditExpense = openEditExpense;
})();
