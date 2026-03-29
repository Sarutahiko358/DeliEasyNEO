/* calendar.js — DeliEasy Calendar (v2 CSS版 / Accordion + Swipe / レイアウト対応) */
(function(){
  'use strict';

  let calYear, calMonth, calSelDate = null;

  const accState = {
    addInput: true,
    summaryDay: true,
    summaryWeek: false,
    summaryMonth: false,
    pfBreakdown: true,
    deliveryDetail: false,
    expenseDetail: false
  };

  let calInputTab = 'earn';
  let calInputMode = S.g('calInputMode', 'numpad');
  let calNpVal = '';

  function initCalendar() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    calSelDate = TD;
  }

  function calClose() {
    calSelDate = null;
    renderCalendar();
  }

  function toggleCalAcc(key) {
    accState[key] = !accState[key];
    const el = document.getElementById('cal-acc-' + key);
    if (el) {
      el.classList.toggle('cal-acc-open', accState[key]);
      const body = el.querySelector('.cal-acc-body');
      if (body) {
        if (accState[key]) {
          body.style.maxHeight = body.scrollHeight + 'px';
          setTimeout(() => { body.style.maxHeight = '2000px'; }, 350);
        } else {
          body.style.maxHeight = body.scrollHeight + 'px';
          requestAnimationFrame(() => { body.style.maxHeight = '0'; });
        }
      }
    }
  }

  function setCalInputTab(tab) {
    hp();
    calInputTab = tab;
    calNpVal = '';
    renderCalendar();
  }

  function setCalInputMode(mode) {
    hp();
    calInputMode = mode;
    S.s('calInputMode', mode);
    renderCalendar();
  }

  function calNpKey(k) {
    hp();
    if (k === 'C') calNpVal = '';
    else if (k === 'del') calNpVal = calNpVal.slice(0, -1);
    else calNpVal += k;
    var el = document.getElementById('cal-np-display');
    if (el) el.textContent = calNpVal ? fmt(Number(calNpVal)) : '0';
  }

  /* ===== 日付スワイプ ===== */
  let _detTouchStartX = 0;
  let _detTouchStartY = 0;
  let _detSwiping = false;

  function initDetailSwipe() {
    const detEl = document.getElementById('cal-det-swipe');
    if (!detEl || detEl._swipeInit) return;
    detEl._swipeInit = true;

    detEl.addEventListener('touchstart', (e) => {
      _detTouchStartX = e.touches[0].clientX;
      _detTouchStartY = e.touches[0].clientY;
      _detSwiping = false;
    }, { passive: true });

    detEl.addEventListener('touchmove', (e) => {
      if (_detSwiping) return;
      const dx = e.touches[0].clientX - _detTouchStartX;
      const dy = e.touches[0].clientY - _detTouchStartY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        _detSwiping = true;
        const detWrap = document.getElementById('cal-det-swipe');
        if (detWrap) {
          detWrap.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
          detWrap.style.transform = dx > 0 ? 'translateX(60px)' : 'translateX(-60px)';
          detWrap.style.opacity = '0.3';
        }
        setTimeout(() => {
          if (dx > 0) {
            calSelDayPrev();
          } else {
            calSelDayNext();
          }
        }, 220);
      }
    }, { passive: true });
  }

  function calSelDayPrev() {
    if (!calSelDate) return;
    const parts = calSelDate.split('-');
    const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() - 1);
    calSelDate = dateKey(d);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
    renderCalendar();
    hp();
  }

  function calSelDayNext() {
    if (!calSelDate) return;
    const parts = calSelDate.split('-');
    const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    d.setDate(d.getDate() + 1);
    calSelDate = dateKey(d);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
    renderCalendar();
    hp();
  }

  function _calLayoutVisible(sectionId) {
    return typeof window.isLayoutVisible === 'function'
      ? window.isLayoutVisible('calendar', sectionId)
      : true;
  }

  function _calLayoutOrder() {
    if (typeof window.getLayout === 'function') {
      return window.getLayout('calendar');
    }
    return null;
  }

  /* ===== メインカレンダー描画 ===== */
  function renderCalendar() {
    const pg = document.getElementById('pg1');
    if (!pg) return;

    const mk = calYear + '-' + String(calMonth + 1).padStart(2, '0');
    const monthEarns = eByMonth(mk);
    const mTot = sumA(monthEarns);
    const mCnt = sumC(monthEarns);
    const daysSet = new Set(); monthEarns.forEach(r => daysSet.add(r.d));
    const mDays = daysSet.size;

    const allExps = S.g('exps', []);
    const mExps = allExps.filter(e => e.date && e.date.substring(0, 7) === mk);
    const mExpTot = mExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const expDates = new Set(mExps.map(e => e.date));
    const mProfit = mTot - mExpTot;

    const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

    const detailDate = calSelDate || TD;

    const sectionRenderers = {
      calHeader: () => {
        let h = `<div class="cal-hdr">
          <div class="cal-nav">
            <button onclick="calPrev()">◀</button>
            <span>${calYear}年 ${MONTHS[calMonth]}</span>
            <button onclick="calNext()">▶</button>
          </div>
          <div class="cal-sum-row">
            <span class="cal-sum-item" style="cursor:pointer" onclick="openStatDetail('sales','calMonth','${mk}')">売上<br><b>¥${fmt(mTot)}</b></span>
            <span class="cal-sum-item" style="cursor:pointer" onclick="openStatDetail('expense','calMonth','${mk}')">経費<br><b>¥${fmt(mExpTot)}</b></span>
            <span class="cal-sum-item" style="cursor:pointer" onclick="openStatDetail('profit','calMonth','${mk}')">収支<br><b>¥${fmt(mProfit)}</b></span>
            <button class="cal-today-btn2" onclick="calToday()">今日</button>
          </div>
        </div>`;
        return h;
      },

      calGrid: () => {
        let h = `<div class="cal-body"><div class="cal-wk">`;
        DAYS.forEach(d => { h += `<span>${d}</span>`; });
        h += `</div>`;
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
        h += `<div class="cal-g">`;
        for (let i = 0; i < firstDay; i++) h += `<div class="cal-c empty"></div>`;
        for (let d = 1; d <= lastDate; d++) {
          const dk = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
          const dayRecs = eByDate(dk);
          const dayTot = sumA(dayRecs);
          const isSel = calSelDate === dk;
          const isToday = dk === TD;
          const hasExp = expDates.has(dk);
          const dow = (firstDay + d - 1) % 7;
          let dowClass = dow === 0 ? 'cal-sun' : dow === 6 ? 'cal-sat' : '';
          const isHoliday = typeof isJapaneseHoliday === 'function' && isJapaneseHoliday(calYear, calMonth + 1, d);
          if (isHoliday && dow !== 0) dowClass += ' cal-holiday';
          const holidayName = typeof getJapaneseHolidayName === 'function' ? getJapaneseHolidayName(calYear, calMonth + 1, d) : null;
          let lvClass = '';
          if (dayTot > 0) {
            if (dayTot >= 20000) lvClass = 'lv5';
            else if (dayTot >= 15000) lvClass = 'lv4';
            else if (dayTot >= 10000) lvClass = 'lv3';
            else if (dayTot >= 5000) lvClass = 'lv2';
            else lvClass = 'lv1';
          }
          h += `<div class="cal-c ${dowClass} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}"${holidayName ? ' title="' + escHtml(holidayName) + '"' : ''} onclick="calSel('${dk}')">
            <span class="cal-da">${d}</span>
            ${holidayName ? `<span class="cal-holiday-name">${escHtml(holidayName)}</span>` : ''}
            ${dayTot > 0 ? `<span class="cal-am ${lvClass}">¥${dayTot >= 10000 ? Math.round(dayTot/1000)+'k' : fmt(dayTot)}</span>` : ''}
            ${hasExp ? `<span class="cal-tag">💸</span>` : ''}
          </div>`;
        }
        h += `</div></div>`;
        return h;
      },

      calLegend: () => {
        return `<div class="cal-legend mt8">
          <span><div class="dot" style="background:#fef9c3"></div>~¥5k</span>
          <span><div class="dot" style="background:#ffedd5"></div>~¥10k</span>
          <span><div class="dot" style="background:#fee2e2"></div>~¥15k</span>
          <span><div class="dot" style="background:#fce7f3"></div>~¥20k</span>
          <span><div class="dot" style="background:#f3e8ff"></div>¥20k~</span>
          <span><div class="dot" style="border:2px solid var(--c-success);width:8px;height:8px"></div>今日</span>
          <span>💸経費</span>
          <span><div class="dot" style="background:var(--c-danger);width:4px;height:4px;border-radius:50%;margin:2px 3px"></div>祝日</span>
        </div>`;
      },

      calDateNav: () => {
        return _renderCalDateNav(detailDate);
      },

      calInput: () => {
        return _renderCalInput(detailDate);
      },

      calSummaryDay: () => {
        return _renderCalSummaryDay(detailDate);
      },

      calSummaryWeek: () => {
        return _renderCalSummaryWeek(detailDate);
      },

      calSummaryMonth: () => {
        return _renderCalSummaryMonth(detailDate);
      },

      calPfBreakdown: () => {
        return _renderCalPfBreakdown(detailDate);
      },

      calDeliveryDetail: () => {
        return _renderCalDeliveryDetail(detailDate);
      },

      calExpenseDetail: () => {
        return _renderCalExpenseDetail(detailDate);
      }
    };

    const layout = _calLayoutOrder();
    let html = `<div class="cal-wrap">`;

    const detailSections = ['calDateNav','calInput','calSummaryDay','calSummaryWeek','calSummaryMonth','calPfBreakdown','calDeliveryDetail','calExpenseDetail'];
    const nonDetailSections = ['calHeader','calGrid','calLegend'];

    let detailHtml = '';
    let hasAnyDetail = false;

    if (layout && Array.isArray(layout)) {
      layout.forEach(item => {
        if (item.show === false) return;
        const renderer = sectionRenderers[item.id];
        if (!renderer) return;

        if (detailSections.indexOf(item.id) >= 0) {
          const content = renderer();
          if (content) {
            detailHtml += content;
            hasAnyDetail = true;
          }
        } else {
          html += renderer();
        }
      });
    } else {
      html += sectionRenderers.calHeader();
      html += sectionRenderers.calGrid();
      html += sectionRenderers.calLegend();
      detailHtml += _renderCalDateNav(detailDate);
      detailHtml += _renderCalInput(detailDate);
      detailHtml += _renderCalSummaryDay(detailDate);
      detailHtml += _renderCalSummaryWeek(detailDate);
      detailHtml += _renderCalSummaryMonth(detailDate);
      detailHtml += _renderCalPfBreakdown(detailDate);
      detailHtml += _renderCalDeliveryDetail(detailDate);
      detailHtml += _renderCalExpenseDetail(detailDate);
      hasAnyDetail = true;
    }

    if (hasAnyDetail) {
      html += `<div class="cal-det" id="cal-det-swipe" style="margin-top:12px">`;
      html += detailHtml;
      html += `</div>`;
    }

    html += `</div>`;
    pg.innerHTML = html;

    requestAnimationFrame(() => initDetailSwipe());
  }

  /* ===== 個別セクション描画関数 ===== */

  function _renderCalDateNav(dk) {
    const parts = dk.split('-');
    const dObj = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const dayLabel = `${+parts[1]}/${+parts[2]}(${DAYS[dObj.getDay()]})`;
    const holidayName = typeof getJapaneseHolidayName === 'function' ? getJapaneseHolidayName(+parts[0], +parts[1], +parts[2]) : null;

    let html = '';
    html += `<div class="cal-det-hdr" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px 4px;background:var(--c-card);border-radius:12px 12px 0 0">
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="btn btn-secondary btn-sm" onclick="calSelDayPrev()" style="padding:4px 10px;font-size:.85rem">◀</button>
        <div>
          <span style="font-size:1.05rem;font-weight:700">${dayLabel}</span>
          ${holidayName ? `<span class="cal-det-holiday-badge">${escHtml(holidayName)}</span>` : ''}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="calSelDayNext()" style="padding:4px 10px;font-size:.85rem">▶</button>
      </div>
      ${dk !== TD ? '<button class="btn btn-secondary btn-sm" onclick="calToday()" style="padding:4px 10px;font-size:.78rem">📅 今日</button>' : '<span style="font-size:.7rem;color:var(--c-tx-muted)">今日</span>'}
    </div>`;
    html += `<div style="text-align:center;padding:2px 0 6px;font-size:.65rem;color:var(--c-tx-muted)">← スワイプで日移動 →</div>`;
    return html;
  }

  function _renderCalInput(dk) {
    const isEarn = calInputTab === 'earn';
    let inputContent = '';

    inputContent += `<div class="home-input-toggle" style="margin:-0px -16px 12px;border-radius:0">
      <button class="home-toggle-btn${isEarn ? ' active' : ''}" onclick="setCalInputTab('earn')"><span class="home-toggle-icon">💰</span> 売上</button>
      <button class="home-toggle-btn${!isEarn ? ' active' : ''}" onclick="setCalInputTab('expense')"><span class="home-toggle-icon">💸</span> 経費</button>
    </div>`;

    inputContent += `<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button class="input-mode-toggle" onclick="setCalInputMode('${calInputMode === 'numpad' ? 'direct' : 'numpad'}')">${calInputMode === 'numpad' ? '⌨️ 直接入力に切替' : '🔢 テンキーに切替'}</button></div>`;

    if (isEarn) {
      inputContent += `<div class="flex items-center mb8" style="gap:8px">
        <select class="input" id="cal-epf" style="flex:1;height:44px">${pfOpts()}</select>
      </div>
      <div class="flex items-center mb8">
        <input type="text" class="input" id="cal-em" placeholder="メモ" style="flex:1;height:44px">
      </div>`;
      if (calInputMode === 'direct') {
        inputContent += `<div class="input-group"><input type="number" class="direct-amount-input" id="cal-ea" value="${calNpVal||''}" placeholder="金額を入力" inputmode="numeric" oninput="window._calSetNpVal&&window._calSetNpVal(this.value)" style="font-size:1.5rem;font-weight:700;text-align:right;height:60px"></div>`;
      } else {
        inputContent += `<div class="numpad-display" id="cal-np-display">${calNpVal ? fmt(Number(calNpVal)) : '0'}</div>`;
        inputContent += `<div class="numpad"><button class="numpad-key" onclick="calNpKey('7')">7</button><button class="numpad-key" onclick="calNpKey('8')">8</button><button class="numpad-key" onclick="calNpKey('9')">9</button><button class="numpad-key" onclick="calNpKey('4')">4</button><button class="numpad-key" onclick="calNpKey('5')">5</button><button class="numpad-key" onclick="calNpKey('6')">6</button><button class="numpad-key" onclick="calNpKey('1')">1</button><button class="numpad-key" onclick="calNpKey('2')">2</button><button class="numpad-key" onclick="calNpKey('3')">3</button><button class="numpad-key" onclick="calNpKey('00')">00</button><button class="numpad-key" onclick="calNpKey('0')">0</button><button class="numpad-key numpad-key-del" onclick="calNpKey('del')">⌫</button></div>`;
      }
      inputContent += `<div class="flex items-center mt8" style="gap:6px"><button class="btn btn-secondary btn-sm btn-block" onclick="${calInputMode==='direct'?"calNpKey('C');var e=document.getElementById('cal-ea');if(e)e.value=''":"calNpKey('C')"}">クリア</button><button class="btn btn-primary btn-sm btn-block cal-acc-btn-primary" onclick="calAddEarn('${dk}')">記録</button></div>`;
    } else {
      inputContent += `<div class="flex items-center mb8">
        <select class="input" id="cal-xcat" style="flex:1">${expCatOpts()}</select>
      </div>
      <input type="text" class="input mb8" id="cal-xm" placeholder="メモ">`;
      if (calInputMode === 'direct') {
        inputContent += `<div class="input-group"><input type="number" class="direct-amount-input" id="cal-xa" value="${calNpVal||''}" placeholder="金額を入力" inputmode="numeric" oninput="window._calSetNpVal&&window._calSetNpVal(this.value)" style="font-size:1.5rem;font-weight:700;text-align:right;height:60px"></div>`;
      } else {
        inputContent += `<div class="numpad-display" id="cal-np-display">${calNpVal ? fmt(Number(calNpVal)) : '0'}</div>`;
        inputContent += `<div class="numpad"><button class="numpad-key" onclick="calNpKey('7')">7</button><button class="numpad-key" onclick="calNpKey('8')">8</button><button class="numpad-key" onclick="calNpKey('9')">9</button><button class="numpad-key" onclick="calNpKey('4')">4</button><button class="numpad-key" onclick="calNpKey('5')">5</button><button class="numpad-key" onclick="calNpKey('6')">6</button><button class="numpad-key" onclick="calNpKey('1')">1</button><button class="numpad-key" onclick="calNpKey('2')">2</button><button class="numpad-key" onclick="calNpKey('3')">3</button><button class="numpad-key" onclick="calNpKey('00')">00</button><button class="numpad-key" onclick="calNpKey('0')">0</button><button class="numpad-key numpad-key-del" onclick="calNpKey('del')">⌫</button></div>`;
      }
      inputContent += `<div class="flex items-center mt8" style="gap:6px"><button class="btn btn-secondary btn-sm btn-block" onclick="${calInputMode==='direct'?"calNpKey('C');var e=document.getElementById('cal-xa');if(e)e.value=''":"calNpKey('C')"}">クリア</button><button class="btn btn-secondary btn-sm btn-block cal-acc-btn-secondary" onclick="calAddExp('${dk}')">経費を記録</button></div>`;
    }

    return buildAccordion('addInput', (isEarn ? '➕ 売上を追加' : '💸 経費を追加'), inputContent);
  }

  function _renderCalSummaryDay(dk) {
    const recs = eByDate(dk);
    const tot = sumA(recs);
    const cnt = sumC(recs);
    const avg = cnt ? Math.round(tot / cnt) : 0;
    const allExps = S.g('exps', []);
    const dayExps = allExps.filter(e => e.date === dk);
    const expTot = dayExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const profit = tot - expTot;

    return buildAccordion('summaryDay', '📊 この日', `
      <div class="stat-grid stat-grid-3">
        <div class="stat-box accent-primary tappable" onclick="openStatDetail('sales','calDay','${dk}')"><div class="stat-box-label">売上</div><div class="stat-box-value">¥${fmt(tot)}</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('count','calDay','${dk}')"><div class="stat-box-label">件数</div><div class="stat-box-value">${cnt}件</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('unit','calDay','${dk}')"><div class="stat-box-label">単価</div><div class="stat-box-value">¥${fmt(avg)}</div></div>
      </div>
      <div class="stat-grid stat-grid-2">
        <div class="stat-box accent-danger tappable" onclick="openStatDetail('expense','calDay','${dk}')"><div class="stat-box-label">経費</div><div class="stat-box-value">-¥${fmt(expTot)}</div></div>
        <div class="stat-box ${profit >= 0 ? 'accent-success' : 'accent-danger'} tappable" onclick="openStatDetail('profit','calDay','${dk}')"><div class="stat-box-label">利益</div><div class="stat-box-value">¥${fmt(profit)}</div></div>
      </div>
    `);
  }

  function _renderCalSummaryWeek(dk) {
    const parts = dk.split('-');
    const allExps = S.g('exps', []);
    const wkMon = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const wkDow = wkMon.getDay();
    const monDate = new Date(wkMon);
    monDate.setDate(wkMon.getDate() - ((wkDow + 6) % 7));
    let wkTot = 0, wkCnt = 0, wkExpTot = 0;
    for (let wi = 0; wi < 7; wi++) {
      const wd = new Date(monDate);
      wd.setDate(monDate.getDate() + wi);
      const wdk = dateKey(wd);
      const wRecs = eByDate(wdk);
      wkTot += sumA(wRecs);
      wkCnt += sumC(wRecs);
      wkExpTot += allExps.filter(e => e.date === wdk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }
    const wkAvg = wkCnt ? Math.round(wkTot / wkCnt) : 0;
    const wkProfit = wkTot - wkExpTot;

    return buildAccordion('summaryWeek', '📅 この週', `
      <div class="stat-grid stat-grid-3">
        <div class="stat-box accent-primary tappable" onclick="openStatDetail('sales','week')"><div class="stat-box-label">売上</div><div class="stat-box-value">¥${fmt(wkTot)}</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('count','week')"><div class="stat-box-label">件数</div><div class="stat-box-value">${wkCnt}件</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('unit','week')"><div class="stat-box-label">単価</div><div class="stat-box-value">¥${fmt(wkAvg)}</div></div>
      </div>
      <div class="stat-grid stat-grid-2">
        <div class="stat-box accent-danger tappable" onclick="openStatDetail('expense','week')"><div class="stat-box-label">経費</div><div class="stat-box-value">-¥${fmt(wkExpTot)}</div></div>
        <div class="stat-box ${wkProfit >= 0 ? 'accent-success' : 'accent-danger'} tappable" onclick="openStatDetail('profit','week')"><div class="stat-box-label">利益</div><div class="stat-box-value">¥${fmt(wkProfit)}</div></div>
      </div>
    `);
  }

  function _renderCalSummaryMonth(dk) {
    const parts = dk.split('-');
    const allExps = S.g('exps', []);
    const moMk = parts[0] + '-' + parts[1];
    const moEarns = eByMonth(moMk);
    const moTotVal = sumA(moEarns);
    const moCntVal = sumC(moEarns);
    const moAvg = moCntVal ? Math.round(moTotVal / moCntVal) : 0;
    const moExpTotVal = allExps.filter(e => e.date && e.date.substring(0, 7) === moMk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const moProfitVal = moTotVal - moExpTotVal;

    return buildAccordion('summaryMonth', '📆 この月', `
      <div class="stat-grid stat-grid-3">
        <div class="stat-box accent-primary tappable" onclick="openStatDetail('sales','calMonth','${moMk}')"><div class="stat-box-label">売上</div><div class="stat-box-value">¥${fmt(moTotVal)}</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('count','calMonth','${moMk}')"><div class="stat-box-label">件数</div><div class="stat-box-value">${moCntVal}件</div></div>
        <div class="stat-box accent-info tappable" onclick="openStatDetail('unit','calMonth','${moMk}')"><div class="stat-box-label">単価</div><div class="stat-box-value">¥${fmt(moAvg)}</div></div>
      </div>
      <div class="stat-grid stat-grid-2">
        <div class="stat-box accent-danger tappable" onclick="openStatDetail('expense','calMonth','${moMk}')"><div class="stat-box-label">経費</div><div class="stat-box-value">-¥${fmt(moExpTotVal)}</div></div>
        <div class="stat-box ${moProfitVal >= 0 ? 'accent-success' : 'accent-danger'} tappable" onclick="openStatDetail('profit','calMonth','${moMk}')"><div class="stat-box-label">利益</div><div class="stat-box-value">¥${fmt(moProfitVal)}</div></div>
      </div>
    `);
  }

  function _renderCalPfBreakdown(dk) {
    const recs = eByDate(dk);
    const tot = sumA(recs);
    const pfMap = {};
    recs.forEach(r => {
      const pf = extractPf(r.m) || 'その他';
      if (!pfMap[pf]) pfMap[pf] = { a: 0, c: 0 };
      pfMap[pf].a += Number(r.a) || 0;
      pfMap[pf].c += Number(r.c) || 0;
    });

    if (Object.keys(pfMap).length === 0) return '';

    let pfHtml = '';
    Object.entries(pfMap).sort((a,b) => b[1].a - a[1].a).forEach(([pf, v]) => {
      const pct = tot ? Math.round(v.a / tot * 100) : 0;
      pfHtml += `<div class="cal-earn-bar">
        <span class="pf-dot" style="background:${pfColor(pf)}"></span>
        <span class="fz-s" style="min-width:60px">${escHtml(pf)}</span>
        <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${pfColor(pf)}"></div></div>
        <span class="fz-s fw6">¥${fmt(v.a)}</span>
        <span class="fz-xs c-muted">${pct}%</span>
      </div>`;
    });
    return buildAccordion('pfBreakdown', '📋 PF別内訳', pfHtml);
  }

  function _renderCalDeliveryDetail(dk) {
    const recs = eByDate(dk);
    if (recs.length === 0) return '';

    let recHtml = '';
    recs.forEach(r => {
      const pf = extractPf(r.m) || '';
      recHtml += `<div class="flex items-center mb8 cal-acc-list-item">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
          ${pf ? `<span class="pf-dot" style="background:${pfColor(pf)};flex-shrink:0"></span>` : ''}
          <span class="fz-s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(pf || 'その他')}</span>
        </div>
        <div class="flex items-center gap8" style="flex-shrink:0">
          <span class="fz-s fw6">¥${fmt(r.a)}</span>
          <span class="fz-xs c-muted">${r.c}件</span>
          <button class="btn btn-secondary btn-xs cal-acc-btn-mini" onclick="openEditEarn(${r.ts})">編集</button>
          <button class="btn btn-danger btn-xs cal-acc-btn-mini" onclick="calDelEarn(${r.ts})">削除</button>
        </div>
      </div>`;
    });
    return buildAccordion('deliveryDetail', `🚴 配達明細 (${recs.length}件)`, recHtml);
  }

  function _renderCalExpenseDetail(dk) {
    const allExps = S.g('exps', []);
    const dayExps = allExps.filter(e => e.date === dk);
    if (dayExps.length === 0) return '';

    let expHtml = '';
    dayExps.forEach((ex, i) => {
      expHtml += `<div class="flex items-center mb8 cal-acc-list-item">
        <div style="flex:1;min-width:0">
          <span class="fz-s">${escHtml(ex.cat || 'その他')}</span>
          ${ex.memo ? `<span class="fz-xs c-muted" style="margin-left:6px">${escHtml(ex.memo)}</span>` : ''}
        </div>
        <div class="flex items-center gap8" style="flex-shrink:0">
          <span class="fz-s fw6 c-danger">-¥${fmt(ex.amount)}</span>
          <button class="btn btn-secondary btn-xs cal-acc-btn-mini" onclick="openEditExpense(${ex.ts})">編集</button>
          <button class="btn btn-danger btn-xs cal-acc-btn-mini" onclick="calDelExp('${dk}',${i})">削除</button>
        </div>
      </div>`;
    });
    return buildAccordion('expenseDetail', `💰 経費明細 (${dayExps.length}件)`, expHtml);
  }

  /* ===== アコーディオンビルダー ===== */
  function buildAccordion(key, title, content) {
    const isOpen = accState[key];
    return `<div class="cal-acc ${isOpen ? 'cal-acc-open' : ''}" id="cal-acc-${key}">
      <div class="cal-acc-header" onclick="toggleCalAcc('${key}')">
        <span class="cal-acc-title">${title}</span>
        <span class="cal-acc-arrow">▼</span>
      </div>
      <div class="cal-acc-body" style="${isOpen ? 'max-height:2000px' : 'max-height:0'}">
        <div class="cal-acc-content">${content}</div>
      </div>
    </div>`;
  }

  function expCatOpts() {
    const cats = ['ガソリン','バイク維持費','スマホ通信費','配達バッグ','雨具','駐輪場','食費','保険','その他'];
    const custom = S.g('expCats', []);
    return [...cats, ...custom].map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  }

  /* ===== カレンダー操作 ===== */
  function calPrev() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    calSelDate = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-01';
    renderCalendar();
  }
  function calNext() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    calSelDate = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-01';
    renderCalendar();
  }
  function calToday() { const now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); calSelDate = TD; renderCalendar(); }
  function calSel(dk) {
    hp();
    calSelDate = dk;
    var parts = dk.split('-');
    calYear = +parts[0];
    calMonth = +parts[1] - 1;
    renderCalendar();
  }

  /* ===== データ操作 ===== */
  function calAddEarn(dk) {
    let a;
    if (calInputMode === 'direct') {
      var directEl = document.getElementById('cal-ea');
      a = Number(directEl ? directEl.value : 0);
    } else {
      a = Number(calNpVal);
    }
    const pf = $('#cal-epf')?.value || '';
    const memo_text = $('#cal-em')?.value || '';
    if (!a || a <= 0) { toast('金額を入力してください'); return; }
    let memo = pf ? '/' + pf : '';
    if (memo_text) memo += ' ' + memo_text;
    addE(dk, a, 1, memo, null, true, null); calNpVal = ''; renderCalendar();
  }
  function calDelEarn(ts) { customConfirm('この記録を削除しますか？', function() { deleteE(ts).then(() => renderCalendar()); }); }
  function calAddExp(dk) {
    let amount;
    if (calInputMode === 'direct') {
      var directEl = document.getElementById('cal-xa');
      amount = Number(directEl ? directEl.value : 0);
    } else {
      amount = Number(calNpVal);
    }
    const cat = $('#cal-xcat')?.value || 'その他'; const memo = $('#cal-xm')?.value || '';
    if (!amount || amount <= 0) { toast('金額を入力してください'); return; }
    const exps = S.g('exps', []); exps.push({ date: dk, cat, amount, memo, ts: Date.now() }); S.s('exps', exps);
    toast('💸 経費を記録しました'); calNpVal = ''; renderCalendar();
  }
  function calDelExp(dk, idx) {
    customConfirm('この経費を削除しますか？', function() {
      const exps = S.g('exps', []); const dayExps = exps.filter(e => e.date === dk);
      if (dayExps[idx]) { const ts = dayExps[idx].ts; S.s('exps', exps.filter(e => e.ts !== ts)); renderCalendar(); }
    });
  }

  /* ===== expose ===== */
  window.initCalendar = initCalendar;
  window.renderCalendar = renderCalendar;
  window.calPrev = calPrev; window.calNext = calNext; window.calToday = calToday;
  window.calSel = calSel; window.calClose = calClose;
  window.calAddEarn = calAddEarn; window.calDelEarn = calDelEarn;
  window.calAddExp = calAddExp; window.calDelExp = calDelExp;
  window.toggleCalAcc = toggleCalAcc;
  window.calSelDayPrev = calSelDayPrev;
  window.calSelDayNext = calSelDayNext;
  window.setCalInputTab = setCalInputTab;
  window.setCalInputMode = setCalInputMode;
  window.calNpKey = calNpKey;
  window._calSetNpVal = function(v) { calNpVal = v; };
})();
