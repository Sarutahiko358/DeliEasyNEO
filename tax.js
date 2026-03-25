/* tax.js — DeliEasy Tax Calculator */
(function(){
  'use strict';

  let taxTab = 'calc'; /* calc, breakdown, furusato, schedule, tips */
  let taxInputMode = 'manual'; /* manual, linked */
  let taxYear = new Date().getFullYear();
  let taxStartMonth = 1;
  let taxDeductionsOpen = false;

  /* 控除の保存値を復元 */
  function loadDeductions() {
    return S.g('taxDeductions', {
      social: 0, kokumin_nenkin: 0, shoukibo: 0, ideco: 0,
      seimei: 0, jishin: 0, iryo: 0,
      haigusha: 'none', fuyo_ippan: 0, fuyo_tokutei: 0, fuyo_roujin: 0,
      disability: 'none', single_parent: false, widow: false
    });
  }
  function saveDeductions(d) { S.s('taxDeductions', d); }

  const BRACKETS = [
    { limit: 1950000, rate: 0.05, deduction: 0 },
    { limit: 3300000, rate: 0.10, deduction: 97500 },
    { limit: 6950000, rate: 0.20, deduction: 427500 },
    { limit: 9000000, rate: 0.23, deduction: 636000 },
    { limit: 18000000, rate: 0.33, deduction: 1536000 },
    { limit: 40000000, rate: 0.40, deduction: 2796000 },
    { limit: Infinity, rate: 0.45, deduction: 4796000 }
  ];

  function renderTax() {
    const pg = document.getElementById('pg3');
    if (!pg) return;

    let html = `<div class="stat-tabs mb12">
      ${['calc','breakdown','furusato','schedule','tips'].map(t =>
        `<button class="${taxTab===t?'on':''}" onclick="setTaxTab('${t}')">${
          {calc:'計算',breakdown:'内訳',furusato:'ふるさと納税',schedule:'日程',tips:'節税'}[t]
        }</button>`
      ).join('')}
    </div>`;

    switch (taxTab) {
      case 'calc': html += renderTaxCalc(); break;
      case 'breakdown': html += renderTaxBreakdown(); break;
      case 'furusato': html += renderFurusato(); break;
      case 'schedule': html += renderTaxSchedule(); break;
      case 'tips': html += renderTaxTips(); break;
    }

    pg.innerHTML = html;
  }

  function getLinkedData() {
    const earns = window.getE ? window.getE() : [];
    const from = taxYear + '-' + String(taxStartMonth).padStart(2, '0') + '-01';
    const endY = taxStartMonth > 1 ? taxYear + 1 : taxYear;
    const endM = taxStartMonth > 1 ? taxStartMonth - 1 : 12;
    const lastDay = new Date(endY, endM, 0).getDate();
    const to = endY + '-' + String(endM).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

    const yEarns = earns.filter(r => r.d >= from && r.d <= to);
    const revenue = sumA(yEarns);

    const allExps = S.g('exps', []);
    const yExps = allExps.filter(e => e.date >= from && e.date <= to);
    const expense = yExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return { revenue, expense };
  }

  function calcDeductionTotal(d) {
    let total = 0;
    /* 社会保険料控除 (全額) */
    total += (Number(d.social) || 0) + (Number(d.kokumin_nenkin) || 0);
    /* 小規模企業共済等掛金控除 (全額) */
    total += (Number(d.shoukibo) || 0) + (Number(d.ideco) || 0);
    /* 生命保険料控除 */
    total += Number(d.seimei) || 0;
    /* 地震保険料控除 */
    total += Number(d.jishin) || 0;
    /* 医療費控除 (10万円超の部分、最大200万円) */
    const iryo = Number(d.iryo) || 0;
    if (iryo > 100000) total += Math.min(iryo - 100000, 2000000);
    /* 配偶者控除 */
    if (d.haigusha === 'special') total += 380000;
    else if (d.haigusha !== 'none') total += Number(d.haigusha) || 0;
    /* 扶養控除 */
    total += (Number(d.fuyo_ippan) || 0) * 380000;
    total += (Number(d.fuyo_tokutei) || 0) * 630000;
    total += (Number(d.fuyo_roujin) || 0) * 480000;
    /* 障害者控除 */
    if (d.disability !== 'none') total += Number(d.disability) || 0;
    /* ひとり親控除 */
    if (d.single_parent) total += 350000;
    /* 寡婦控除 */
    if (d.widow) total += 270000;
    return total;
  }

  function calcTaxResult(revenue, expense, blueDeduction, deductions) {
    const income = Math.max(0, revenue - expense - blueDeduction);
    const deductionTotal = calcDeductionTotal(deductions);
    /* 基礎控除 48万 + その他所得控除 */
    const taxableIncome = Math.max(0, income - 480000 - deductionTotal);

    /* 所得税 */
    let incomeTax = 0;
    for (const b of BRACKETS) {
      if (taxableIncome <= b.limit) {
        incomeTax = Math.floor(taxableIncome * b.rate - b.deduction);
        break;
      }
    }
    incomeTax = Math.max(0, incomeTax);
    const reconstructionTax = Math.floor(incomeTax * 0.021);
    const totalIncomeTax = incomeTax + reconstructionTax;

    /* 住民税 10% */
    const residentTax = Math.floor(taxableIncome * 0.10);

    /* 国保 10% 概算 */
    const healthInsurance = Math.floor(taxableIncome * 0.10);

    const totalTax = totalIncomeTax + residentTax + healthInsurance;
    const takeHome = revenue - expense - totalTax;
    const effectiveRate = revenue > 0 ? (totalTax / revenue * 100).toFixed(1) : 0;
    const monthlyTakeHome = Math.round(takeHome / 12);

    return {
      revenue, expense, blueDeduction, deductionTotal, income, taxableIncome,
      incomeTax, reconstructionTax, totalIncomeTax,
      residentTax, healthInsurance, totalTax,
      takeHome, effectiveRate, monthlyTakeHome
    };
  }

  let lastTaxResult = null;

  function renderTaxCalc() {
    let html = `<div class="cd mb12"><div class="cb">`;

    /* mode switch */
    html += `<div class="fr mb12" style="gap:8px">
      <button class="s-btn ${taxInputMode==='manual'?'on':''}" onclick="setTaxInputMode('manual')">手入力</button>
      <button class="s-btn ${taxInputMode==='linked'?'on':''}" onclick="setTaxInputMode('linked')">連動</button>
    </div>`;

    let revenue = 0, expense = 0;

    if (taxInputMode === 'linked') {
      html += `<div class="fr mb8" style="gap:8px">
        <div class="fg" style="flex:1"><label>対象年</label>
          <input type="number" class="fi" id="tax-year" value="${taxYear}" onchange="setTaxYear(this.value)">
        </div>
        <div class="fg" style="flex:1"><label>開始月</label>
          <select class="fi" id="tax-start" onchange="setTaxStartMonth(this.value)">
            <option value="1" ${taxStartMonth===1?'selected':''}>1月</option>
            <option value="4" ${taxStartMonth===4?'selected':''}>4月</option>
          </select>
        </div>
      </div>`;
      const linked = getLinkedData();
      revenue = linked.revenue;
      expense = linked.expense;
      html += `<div class="sb hl mb8"><div class="sl">年間売上（連動）</div><div class="sv">¥${fmt(revenue)}</div></div>`;
      html += `<div class="sb rl mb8"><div class="sl">年間経費（連動）</div><div class="sv">¥${fmt(expense)}</div></div>`;
    } else {
      html += `<div class="fg"><label>年間売上（円）</label><input type="number" class="fi" id="tax-rev" value="0"></div>`;
      html += `<div class="fg"><label>年間経費（円）</label><input type="number" class="fi" id="tax-exp" value="0"></div>`;
    }

    html += `<div class="fg"><label>青色申告控除</label>
      <select class="fi" id="tax-blue">
        <option value="650000">65万円（電子申告）</option>
        <option value="550000">55万円</option>
        <option value="100000">10万円</option>
        <option value="0">白色（0円）</option>
      </select>
    </div>`;

    /* 所得控除セクション */
    const d = loadDeductions();
    const dTotal = calcDeductionTotal(d);
    html += `<div class="ch${taxDeductionsOpen?' open':''}" onclick="toggleTaxDeductions()" style="padding:10px 0;border-top:1px solid var(--bd);margin-top:8px;cursor:pointer">
      <span>📋 所得控除の入力${dTotal > 0 ? ' <span class="fz-xs" style="background:var(--pl);color:var(--p);padding:2px 8px;border-radius:10px;margin-left:4px">¥' + fmt(dTotal) + '</span>' : ''}</span><span class="arr">▼</span>
    </div>`;
    html += `<div id="tax-deductions" class="${taxDeductionsOpen?'':'hide'}" style="padding-top:8px">`;

    html += `<div class="fz-xs c-mt mb8">※ 基礎控除（48万円）は自動適用されます。タップで開閉できます。</div>`;

    /* helper: カテゴリの入力済み合計 */
    function catBadge(val, color) {
      return val > 0 ? '<span class="fz-xs" style="margin-left:auto;color:' + color + '">¥' + fmt(val) + '</span>' : '';
    }

    /* 社会保険料系 */
    const socSum = (d.social||0) + (d.kokumin_nenkin||0);
    html += `<div style="border-left:3px solid var(--bl);margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(59,130,246,.06)">
      <span class="fz-xs fw6" style="color:var(--bl)">社会保険料控除</span>${catBadge(socSum,'var(--bl)')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>国民健康保険料（年額）</label><input type="number" class="fi" id="tax-d-social" value="${d.social}" placeholder="0"></div>`;
    html += `<div class="fg"><label>国民年金保険料（年額）</label><input type="number" class="fi" id="tax-d-nenkin" value="${d.kokumin_nenkin}" placeholder="約200,000"></div>`;
    html += `</div></div>`;

    /* 小規模企業共済・iDeCo */
    const kakSum = (d.shoukibo||0) + (d.ideco||0);
    html += `<div style="border-left:3px solid var(--gn);margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(34,197,94,.06)">
      <span class="fz-xs fw6" style="color:var(--gn)">小規模企業共済等掛金控除</span>${catBadge(kakSum,'var(--gn)')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>小規模企業共済（年額）</label><input type="number" class="fi" id="tax-d-shoukibo" value="${d.shoukibo}" placeholder="最大840,000"></div>`;
    html += `<div class="fg"><label>iDeCo掛金（年額）</label><input type="number" class="fi" id="tax-d-ideco" value="${d.ideco}" placeholder="最大816,000"></div>`;
    html += `</div></div>`;

    /* 保険料控除 */
    const hokSum = (Number(d.seimei)||0) + (Number(d.jishin)||0);
    html += `<div style="border-left:3px solid var(--pu);margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(168,85,247,.06)">
      <span class="fz-xs fw6" style="color:var(--pu)">保険料控除</span>${catBadge(hokSum,'var(--pu)')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>生命保険料控除額</label>
      <select class="fi" id="tax-d-seimei">
        <option value="0" ${d.seimei==0?'selected':''}>なし</option>
        <option value="40000" ${d.seimei==40000?'selected':''}>〜4万円（新制度各枠）</option>
        <option value="80000" ${d.seimei==80000?'selected':''}>〜8万円（2枠）</option>
        <option value="120000" ${d.seimei==120000?'selected':''}>最大12万円（3枠満額）</option>
      </select>
    </div>`;
    html += `<div class="fg"><label>地震保険料控除額</label>
      <select class="fi" id="tax-d-jishin">
        <option value="0" ${d.jishin==0?'selected':''}>なし</option>
        <option value="25000" ${d.jishin==25000?'selected':''}>〜25,000円</option>
        <option value="50000" ${d.jishin==50000?'selected':''}>最大50,000円</option>
      </select>
    </div>`;
    html += `</div></div>`;

    /* 医療費控除 */
    const iryoVal = Number(d.iryo)||0;
    const iryoDeduct = iryoVal > 100000 ? Math.min(iryoVal - 100000, 2000000) : 0;
    html += `<div style="border-left:3px solid #e74c3c;margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(231,76,60,.06)">
      <span class="fz-xs fw6" style="color:#e74c3c">医療費控除</span>${catBadge(iryoDeduct,'#e74c3c')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>年間医療費（自己負担合計）</label><input type="number" class="fi" id="tax-d-iryo" value="${d.iryo}" placeholder="10万円超の分が控除"></div>`;
    html += `</div></div>`;

    /* 人的控除 */
    let jinSum = 0;
    if (d.haigusha === 'special') jinSum += 380000;
    else if (d.haigusha !== 'none') jinSum += Number(d.haigusha)||0;
    jinSum += (d.fuyo_ippan||0)*380000 + (d.fuyo_tokutei||0)*630000 + (d.fuyo_roujin||0)*480000;
    html += `<div style="border-left:3px solid #f39c12;margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(243,156,18,.06)">
      <span class="fz-xs fw6" style="color:#f39c12">人的控除</span>${catBadge(jinSum,'#f39c12')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>配偶者控除</label>
      <select class="fi" id="tax-d-haigusha">
        <option value="none" ${d.haigusha==='none'?'selected':''}>なし</option>
        <option value="380000" ${d.haigusha==='380000'?'selected':''}>配偶者控除（38万円）</option>
        <option value="480000" ${d.haigusha==='480000'?'selected':''}>老人控除対象（48万円）</option>
        <option value="special" ${d.haigusha==='special'?'selected':''}>配偶者特別控除（段階的）</option>
      </select>
    </div>`;
    html += `<div class="fg"><label>扶養控除（一般 16歳以上）人数</label><input type="number" class="fi" id="tax-d-fuyo" value="${d.fuyo_ippan}" min="0" max="10"></div>`;
    html += `<div class="fg"><label>扶養控除（特定 19〜22歳）人数</label><input type="number" class="fi" id="tax-d-fuyo-t" value="${d.fuyo_tokutei}" min="0" max="10"></div>`;
    html += `<div class="fg"><label>扶養控除（老人 70歳以上）人数</label><input type="number" class="fi" id="tax-d-fuyo-r" value="${d.fuyo_roujin}" min="0" max="10"></div>`;
    html += `</div></div>`;

    /* その他 */
    let etcSum = 0;
    if (d.disability !== 'none') etcSum += Number(d.disability)||0;
    if (d.single_parent) etcSum += 350000;
    if (d.widow) etcSum += 270000;
    html += `<div style="border-left:3px solid #95a5a6;margin-bottom:8px;border-radius:0 8px 8px 0;overflow:hidden">`;
    html += `<div onclick="this.nextElementSibling.classList.toggle('hide');this.querySelector('.arr').classList.toggle('rot')" style="display:flex;align-items:center;gap:6px;padding:8px 10px;cursor:pointer;background:rgba(149,165,166,.06)">
      <span class="fz-xs fw6" style="color:#95a5a6">その他</span>${catBadge(etcSum,'#95a5a6')}<span class="arr fz-xs" style="margin-left:4px">▼</span>
    </div>`;
    html += `<div class="hide" style="padding:8px 10px">`;
    html += `<div class="fg"><label>障害者控除</label>
      <select class="fi" id="tax-d-disability">
        <option value="none" ${d.disability==='none'?'selected':''}>なし</option>
        <option value="270000" ${d.disability==='270000'?'selected':''}>一般（27万円）</option>
        <option value="400000" ${d.disability==='400000'?'selected':''}>特別（40万円）</option>
        <option value="750000" ${d.disability==='750000'?'selected':''}>同居特別（75万円）</option>
      </select>
    </div>`;
    html += `<div class="fg" style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="tax-d-single" ${d.single_parent?'checked':''}>
      <label for="tax-d-single" style="margin:0">ひとり親控除（35万円）</label>
    </div>`;
    html += `<div class="fg" style="display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="tax-d-widow" ${d.widow?'checked':''}>
      <label for="tax-d-widow" style="margin:0">寡婦控除（27万円）</label>
    </div>`;
    html += `</div></div>`;

    html += `</div>`; /* end #tax-deductions */

    html += `<button class="btn bp bbl" onclick="doTaxCalc()">計算</button>`;
    html += `</div></div>`;
    html += `<div id="tax-result">${lastTaxResult ? renderTaxResult(lastTaxResult) : ''}</div>`;

    return html;
  }

  function gatherDeductions() {
    return {
      social: Number($('#tax-d-social')?.value) || 0,
      kokumin_nenkin: Number($('#tax-d-nenkin')?.value) || 0,
      shoukibo: Number($('#tax-d-shoukibo')?.value) || 0,
      ideco: Number($('#tax-d-ideco')?.value) || 0,
      seimei: Number($('#tax-d-seimei')?.value) || 0,
      jishin: Number($('#tax-d-jishin')?.value) || 0,
      iryo: Number($('#tax-d-iryo')?.value) || 0,
      haigusha: $('#tax-d-haigusha')?.value || 'none',
      fuyo_ippan: Number($('#tax-d-fuyo')?.value) || 0,
      fuyo_tokutei: Number($('#tax-d-fuyo-t')?.value) || 0,
      fuyo_roujin: Number($('#tax-d-fuyo-r')?.value) || 0,
      disability: $('#tax-d-disability')?.value || 'none',
      single_parent: !!$('#tax-d-single')?.checked,
      widow: !!$('#tax-d-widow')?.checked
    };
  }

  function toggleTaxDeductions() {
    taxDeductionsOpen = !taxDeductionsOpen;
    renderTax();
  }

  function doTaxCalc() {
    let revenue, expense;
    if (taxInputMode === 'linked') {
      const linked = getLinkedData();
      revenue = linked.revenue;
      expense = linked.expense;
    } else {
      revenue = Number($('#tax-rev')?.value) || 0;
      expense = Number($('#tax-exp')?.value) || 0;
    }
    const blue = Number($('#tax-blue')?.value) || 0;
    const deductions = gatherDeductions();
    saveDeductions(deductions);
    lastTaxResult = calcTaxResult(revenue, expense, blue, deductions);
    document.getElementById('tax-result').innerHTML = renderTaxResult(lastTaxResult);
    hp();
  }

  function renderTaxResult(r) {
    return `
      <div class="cd mb12"><div class="ch open"><span>計算結果</span></div><div class="cb">
        <div class="sg mb12">
          <div class="sb hl"><div class="sl">課税所得</div><div class="sv">¥${fmt(r.taxableIncome)}</div></div>
          <div class="sb rl"><div class="sl">税金合計</div><div class="sv">¥${fmt(r.totalTax)}</div></div>
        </div>
        ${r.deductionTotal ? `<div class="sb mb8" style="background:var(--pl)"><div class="sl">所得控除合計（基礎控除除く）</div><div class="sv">¥${fmt(r.deductionTotal)}</div></div>` : ''}
        <div class="sg mb12">
          <div class="sb"><div class="sl">所得税</div><div class="sv">¥${fmt(r.totalIncomeTax)}</div></div>
          <div class="sb"><div class="sl">住民税</div><div class="sv">¥${fmt(r.residentTax)}</div></div>
          <div class="sb"><div class="sl">国保</div><div class="sv">¥${fmt(r.healthInsurance)}</div></div>
          <div class="sb gl"><div class="sl">手取り</div><div class="sv">¥${fmt(r.takeHome)}</div></div>
        </div>
        <div class="sg">
          <div class="sb"><div class="sl">実効税率</div><div class="sv">${r.effectiveRate}%</div></div>
          <div class="sb bl"><div class="sl">月平均手取り</div><div class="sv">¥${fmt(r.monthlyTakeHome)}</div></div>
        </div>
      </div></div>`;
  }

  function renderTaxBreakdown() {
    if (!lastTaxResult) return '<p class="fz-s c-mt text-c">先に「計算」タブで計算してください</p>';
    const r = lastTaxResult;
    const total = r.totalTax || 1;
    const items = [
      { name: '所得税', val: r.totalIncomeTax, color: 'var(--bl)' },
      { name: '住民税', val: r.residentTax, color: 'var(--gn)' },
      { name: '国保', val: r.healthInsurance, color: 'var(--pu)' }
    ];

    let html = `<div class="cd mb12"><div class="ch open"><span>税金構成比</span></div><div class="cb">`;
    /* stacked bar */
    html += `<div style="display:flex;height:32px;border-radius:8px;overflow:hidden;margin-bottom:12px">`;
    items.forEach(it => {
      const pct = Math.round(it.val / total * 100);
      if (pct > 0) html += `<div style="width:${pct}%;background:${it.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:.7rem;font-weight:600">${pct}%</div>`;
    });
    html += `</div>`;
    items.forEach(it => {
      html += `<div class="fr mb8" style="justify-content:space-between">
        <div class="fr"><span class="pf-d" style="background:${it.color}"></span><span class="fz-s">${it.name}</span></div>
        <span class="fz-s fw6">¥${fmt(it.val)}</span>
      </div>`;
    });
    html += `</div></div>`;

    /* Bracket table */
    html += `<div class="cd mb12"><div class="ch open"><span>税率ブラケット</span></div><div class="cb">
      <div class="rec-s"><table class="rtb">
        <tr><th>課税所得</th><th>税率</th><th>控除額</th></tr>`;
    BRACKETS.forEach(b => {
      const active = r.taxableIncome > 0 && r.taxableIncome <= b.limit && (BRACKETS.indexOf(b) === 0 || r.taxableIncome > BRACKETS[BRACKETS.indexOf(b)-1].limit);
      html += `<tr style="${active ? 'background:var(--pl);font-weight:600' : ''}">
        <td>${b.limit === Infinity ? '4,000万〜' : '〜' + fmt(b.limit)}</td>
        <td>${b.rate * 100}%</td>
        <td>¥${fmt(b.deduction)}</td>
      </tr>`;
    });
    html += `</table></div></div></div>`;
    return html;
  }

  function renderFurusato() {
    let html = `<div class="cd mb12"><div class="cb">
      <div class="fz-s fw6 mb8">ふるさと納税 上限目安計算</div>
      <div class="fg"><label>年間売上（円）</label>
        <div class="fr gap8">
          <input type="number" class="fi" id="fr-rev" value="0" style="flex:1">
          <button class="btn bs2 bsm" onclick="frAutoRev()">自動入力</button>
        </div>
      </div>
      <div class="fg"><label>年間経費（円）</label>
        <div class="fr gap8">
          <input type="number" class="fi" id="fr-exp" value="0" style="flex:1">
          <button class="btn bs2 bsm" onclick="frAutoExp()">自動入力</button>
        </div>
      </div>
      <div class="fg"><label>青色申告控除</label>
        <select class="fi" id="fr-blue">
          <option value="650000">65万円</option><option value="550000">55万円</option>
          <option value="100000">10万円</option><option value="0">0円</option>
        </select>
      </div>
      <div class="fg"><label>社会保険料控除（円）</label><input type="number" class="fi" id="fr-social" value="0"></div>
      <button class="btn bp bbl" onclick="doFurusato()">計算</button>
    </div></div>
    <div id="fr-result"></div>
    <div class="cd mt12"><div class="cb">
      <p class="fz-xs c-mt">※ この計算は簡易推計です。正確な金額は税理士にご相談ください。各自治体の計算方法により上限額は変動します。</p>
    </div></div>`;
    return html;
  }

  function frAutoRev() {
    const linked = getLinkedData();
    const el = $('#fr-rev');
    if (el) el.value = linked.revenue;
  }
  function frAutoExp() {
    const linked = getLinkedData();
    const el = $('#fr-exp');
    if (el) el.value = linked.expense;
  }

  function doFurusato() {
    const rev = Number($('#fr-rev')?.value) || 0;
    const exp = Number($('#fr-exp')?.value) || 0;
    const blue = Number($('#fr-blue')?.value) || 0;
    const social = Number($('#fr-social')?.value) || 0;

    const income = Math.max(0, rev - exp - blue);
    const taxable = Math.max(0, income - 480000 - social);

    /* 簡易計算: 住民税所得割額の約20% + 2000 */
    const residentIncomeRate = taxable * 0.10;
    const limit = Math.floor(residentIncomeRate * 0.20) + 2000;
    const giftValue = Math.floor(limit * 0.30);

    document.getElementById('fr-result').innerHTML = `
      <div class="cd mb12"><div class="cb">
        <div class="sg">
          <div class="sb hl"><div class="sl">上限目安</div><div class="sv">¥${fmt(Math.max(0, limit))}</div></div>
          <div class="sb gl"><div class="sl">返礼品相当額</div><div class="sv">¥${fmt(Math.max(0, giftValue))}</div></div>
        </div>
      </div></div>`;
    hp();
  }

  function renderTaxSchedule() {
    const events = [
      { month: '1月', title: '前年の帳簿を締める', desc: '12月31日までの収支を確定' },
      { month: '2月16日〜3月15日', title: '確定申告期間', desc: '所得税の確定申告書を提出' },
      { month: '3月15日', title: '所得税の納付期限', desc: '口座振替の場合は4月中旬' },
      { month: '6月', title: '住民税の通知', desc: '市区町村から住民税額の通知が届く' },
      { month: '6月〜翌1月', title: '住民税の納付', desc: '年4回に分けて納付' },
      { month: '11月', title: '年末の節税対策', desc: 'ふるさと納税・iDeCo等の駆け込み' }
    ];

    let html = `<div class="cd mb12"><div class="ch open"><span>確定申告スケジュール</span></div><div class="cb">`;
    events.forEach(ev => {
      html += `<div style="padding:10px 0;border-bottom:1px solid var(--bd)">
        <div class="fr" style="gap:12px">
          <span class="bdg bdg-up" style="min-width:90px;text-align:center">${ev.month}</span>
          <div>
            <div class="fz-s fw6">${ev.title}</div>
            <div class="fz-xs c-mt">${ev.desc}</div>
          </div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
    return html;
  }

  function renderTaxTips() {
    const tips = [
      { title: '青色申告特別控除', content: '開業届＋青色申告承認申請書を提出し、複式簿記で帳簿をつけると最大65万円（電子申告の場合）の控除を受けられます。節税効果は所得税率に応じて6.5万〜29万円程度です。' },
      { title: '小規模企業共済', content: '個人事業主の退職金制度。月1,000〜70,000円の掛金が全額所得控除になります。年間最大84万円の控除が可能です。' },
      { title: 'iDeCo（個人型確定拠出年金）', content: '自営業者は月68,000円（年81.6万円）まで掛金を拠出でき、全額所得控除になります。60歳まで引き出せない点に注意。' },
      { title: '経費を正しく計上', content: 'バイク・自転車の維持費、スマホ代（事業使用分）、配達バッグ、雨具、駐輪場代など、事業に関連する支出は経費として計上できます。按分が必要な場合は合理的な割合で計算しましょう。' },
      { title: 'ふるさと納税', content: '自己負担2,000円で各地の返礼品がもらえる制度。寄付金控除として所得税・住民税が減額されます。上限額は所得によって異なるので事前に計算しましょう。' }
    ];

    let html = '<div class="cd mb12"><div class="cb">';
    tips.forEach((tip, i) => {
      html += `<div class="mb12">
        <div class="ch" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('hide')" style="padding:8px 0;border-bottom:1px solid var(--bd)">
          <span>${i+1}. ${tip.title}</span><span class="arr">▼</span>
        </div>
        <div class="hide" style="padding:8px 0">
          <p class="fz-s" style="line-height:1.8">${tip.content}</p>
        </div>
      </div>`;
    });
    html += '</div></div>';
    return html;
  }

  function setTaxTab(t) { taxTab = t; renderTax(); }
  function setTaxInputMode(m) { taxInputMode = m; renderTax(); }
  function setTaxYear(v) { taxYear = +v; renderTax(); }
  function setTaxStartMonth(v) { taxStartMonth = +v; renderTax(); }

  /* expose */
  window.renderTax = renderTax;
  window.setTaxTab = setTaxTab;
  window.setTaxInputMode = setTaxInputMode;
  window.setTaxYear = setTaxYear;
  window.setTaxStartMonth = setTaxStartMonth;
  window.toggleTaxDeductions = toggleTaxDeductions;
  window.doTaxCalc = doTaxCalc;
  window.doFurusato = doFurusato;
  window.frAutoRev = frAutoRev;
  window.frAutoExp = frAutoExp;
})();
