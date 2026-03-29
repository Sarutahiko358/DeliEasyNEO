/* stats.js — DeliEasy Statistics (v2 CSS版) — グラフ強化版 */
(function(){
  'use strict';

  /* ===== State ===== */
  let _statPeriod = 'day';
  let _statSection = 'overview';
  let _statDateStr = null;

  /* ===== Swipe ===== */
  let _statSwStartX = 0;
  let _statSwStartY = 0;
  let _statSwiping = false;

  function initStatSwipe() {
    const el = document.getElementById('stat-swipe-area');
    if (!el || el._swipeInit) return;
    el._swipeInit = true;

    el.addEventListener('touchstart', (e) => {
      _statSwStartX = e.touches[0].clientX;
      _statSwStartY = e.touches[0].clientY;
      _statSwiping = false;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (_statSwiping) return;
      const dx = e.touches[0].clientX - _statSwStartX;
      const dy = e.touches[0].clientY - _statSwStartY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        _statSwiping = true;
        if (dx > 0) statPeriodPrev();
        else statPeriodNext();
      }
    }, { passive: true });
  }

  /* ===== Period Navigation ===== */
  function statPeriodPrev() {
    switch (_statPeriod) {
      case 'day': {
        const dk = _statDateStr || TD;
        const p = dk.split('-');
        const d = new Date(+p[0], +p[1] - 1, +p[2]);
        d.setDate(d.getDate() - 1);
        _statDateStr = dateKey(d);
        break;
      }
      case 'week': {
        const wr = _getStatWeekRange();
        const d = new Date(wr.fromDate);
        d.setDate(d.getDate() - 7);
        _statDateStr = dateKey(d);
        break;
      }
      case 'month': {
        const mk = _statDateStr || MK;
        const mp = (mk.length > 7 ? mk.substring(0, 7) : mk).split('-');
        const d = new Date(+mp[0], +mp[1] - 2, 1);
        _statDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        break;
      }
      case '3month': {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        _statDateStr = dateKey(now);
        break;
      }
      case 'year': {
        const yr = _statDateStr ? +_statDateStr.substring(0, 4) : new Date().getFullYear();
        _statDateStr = (yr - 1) + '-01-01';
        break;
      }
    }
    renderStats();
  }

  function statPeriodNext() {
    switch (_statPeriod) {
      case 'day': {
        const dk = _statDateStr || TD;
        const p = dk.split('-');
        const d = new Date(+p[0], +p[1] - 1, +p[2]);
        d.setDate(d.getDate() + 1);
        _statDateStr = dateKey(d);
        break;
      }
      case 'week': {
        const wr = _getStatWeekRange();
        const d = new Date(wr.fromDate);
        d.setDate(d.getDate() + 7);
        _statDateStr = dateKey(d);
        break;
      }
      case 'month': {
        const mk = _statDateStr || MK;
        const mp = (mk.length > 7 ? mk.substring(0, 7) : mk).split('-');
        const d = new Date(+mp[0], +mp[1], 1);
        _statDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        break;
      }
      case '3month': {
        const now = new Date();
        now.setMonth(now.getMonth() + 1);
        _statDateStr = dateKey(now);
        break;
      }
      case 'year': {
        const yr = _statDateStr ? +_statDateStr.substring(0, 4) : new Date().getFullYear();
        _statDateStr = (yr + 1) + '-01-01';
        break;
      }
    }
    renderStats();
  }

  function _getStatWeekRange() {
    let base;
    if (_statDateStr) {
      const p = _statDateStr.split('-');
      base = new Date(+p[0], +p[1] - 1, +p[2]);
    } else {
      base = new Date();
    }
    const dow = base.getDay();
    const mon = new Date(base);
    mon.setDate(base.getDate() - ((dow + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: dateKey(mon), to: dateKey(sun), fromDate: mon, toDate: sun };
  }

  /* ===== SVG Chart Helpers ===== */

  function svgDonut(data, opts) {
    const size = opts.size || 160;
    const cx = size / 2, cy = size / 2;
    const r = opts.radius || (size / 2 - 15);
    const ir = opts.innerRadius || (r * 0.6);
    const showLabel = opts.showLabel !== false;
    const showCenter = opts.showCenter !== false;
    const centerText = opts.centerText || '';
    const centerSub = opts.centerSub || '';

    let h = `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;display:block;margin:0 auto">`;

    if (data.length === 0) {
      h += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--c-border)" stroke-width="${r - ir}"/>`;
      h += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="var(--c-tx-muted)">No Data</text>`;
      h += '</svg>';
      return h;
    }

    const total = data.reduce((s, d) => s + d.value, 0);

    if (data.length === 1 || (data.filter(d => d.value > 0).length === 1)) {
      const item = data.find(d => d.value > 0) || data[0];
      h += `<circle cx="${cx}" cy="${cy}" r="${(r + ir) / 2}" fill="none" stroke="${item.color}" stroke-width="${r - ir}"/>`;
    } else {
      let startAngle = -90;
      data.forEach(item => {
        if (item.value <= 0) return;
        const pct = total > 0 ? item.value / total : 0;
        let angle = pct * 360;
        if (angle >= 359.99) angle = 359.99;
        if (angle < 0.5) return;

        const endAngle = startAngle + angle;
        const large = angle > 180 ? 1 : 0;
        const r1 = (startAngle * Math.PI) / 180;
        const r2 = (endAngle * Math.PI) / 180;

        const x1 = cx + r * Math.cos(r1), y1 = cy + r * Math.sin(r1);
        const x2 = cx + r * Math.cos(r2), y2 = cy + r * Math.sin(r2);
        const ix1 = cx + ir * Math.cos(r2), iy1 = cy + ir * Math.sin(r2);
        const ix2 = cx + ir * Math.cos(r1), iy2 = cy + ir * Math.sin(r1);

        h += `<path d="M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2} Z" fill="${item.color}" opacity="0.9">`;
        h += `<title>${escHtml(item.label)}: ¥${fmt(item.value)} (${total > 0 ? Math.round(item.value / total * 100) : 0}%)</title>`;
        h += `</path>`;

        if (showLabel && pct >= 0.08) {
          const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
          const labelR = (r + ir) / 2;
          const lx = cx + labelR * Math.cos(midAngle);
          const ly = cy + labelR * Math.sin(midAngle);
          h += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="8" fill="#fff" font-weight="700">${Math.round(pct * 100)}%</text>`;
        }

        startAngle = endAngle;
      });
    }

    if (showCenter) {
      h += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="var(--c-tx)" font-weight="700">${escHtml(centerText)}</text>`;
      if (centerSub) {
        h += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="central" font-size="7" fill="var(--c-tx-muted)">${escHtml(centerSub)}</text>`;
      }
    }

    h += '</svg>';
    return h;
  }

  function svgBarChart(data, opts) {
    const w = opts.width || 320;
    const h = opts.height || 160;
    const pad = { t: 10, r: 10, b: 30, l: 45 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.max(4, Math.min(24, (cw / data.length) * 0.7));
    const gap = cw / data.length;

    let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">`;

    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yy = pad.t + (ch / ySteps) * i;
      const val = maxVal - (maxVal / ySteps) * i;
      svg += `<line x1="${pad.l}" y1="${yy}" x2="${w - pad.r}" y2="${yy}" stroke="var(--c-border)" stroke-width="0.5"/>`;
      svg += `<text x="${pad.l - 4}" y="${yy + 3}" text-anchor="end" font-size="7" fill="var(--c-tx-muted)">${val >= 10000 ? Math.round(val / 1000) + 'k' : fmt(Math.round(val))}</text>`;
    }

    data.forEach((d, i) => {
      const bh = maxVal > 0 ? (d.value / maxVal) * ch : 0;
      const bx = pad.l + gap * i + (gap - barW) / 2;
      const by = pad.t + ch - bh;
      const color = d.color || 'var(--c-primary)';

      svg += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="2" fill="${color}" opacity="0.85">`;
      svg += `<title>${escHtml(d.label)}: ¥${fmt(d.value)}</title>`;
      svg += `</rect>`;

      if (d.shortLabel) {
        svg += `<text x="${bx + barW / 2}" y="${h - pad.b + 12}" text-anchor="middle" font-size="6.5" fill="var(--c-tx-muted)">${escHtml(d.shortLabel)}</text>`;
      }
    });

    svg += '</svg>';
    return svg;
  }

  function svgHBarChart(data, opts) {
    const barH = opts.barHeight || 22;
    const labelW = opts.labelWidth || 70;
    const valueW = opts.valueWidth || 75;
    const gap = opts.gap || 6;
    const w = opts.width || 320;
    const totalH = data.length * (barH + gap);
    const barAreaW = w - labelW - valueW - 10;

    const maxVal = Math.max(...data.map(d => d.value), 1);

    let svg = `<svg viewBox="0 0 ${w} ${totalH}" style="width:100%;height:auto;display:block">`;

    data.forEach((d, i) => {
      const y = i * (barH + gap);
      const bw = maxVal > 0 ? (d.value / maxVal) * barAreaW : 0;
      const color = d.color || 'var(--c-primary)';

      svg += `<text x="${labelW - 4}" y="${y + barH / 2 + 1}" text-anchor="end" dominant-baseline="central" font-size="8" fill="var(--c-tx)" font-weight="500">`;
      if (d.dot) {
        svg += `<tspan fill="${d.dot}" font-size="10">● </tspan>`;
      }
      svg += `${escHtml(d.label)}</text>`;

      svg += `<rect x="${labelW}" y="${y + 2}" width="${barAreaW}" height="${barH - 4}" rx="4" fill="var(--c-fill-quaternary)"/>`;

      if (bw > 0) {
        svg += `<rect x="${labelW}" y="${y + 2}" width="${bw}" height="${barH - 4}" rx="4" fill="${color}" opacity="0.8"/>`;
      }

      svg += `<text x="${labelW + barAreaW + 4}" y="${y + barH / 2 + 1}" dominant-baseline="central" font-size="7.5" fill="var(--c-tx)" font-weight="600">${escHtml(d.valueLabel || ('¥' + fmt(d.value)))}</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  function svgStackedBar(data, opts) {
    const w = opts.width || 300;
    const h = opts.height || 32;
    const total = data.reduce((s, d) => s + d.value, 0);

    let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block;border-radius:8px;overflow:hidden">`;

    if (total === 0) {
      svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="var(--c-fill-quaternary)"/>`;
      svg += `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="var(--c-tx-muted)">データなし</text>`;
    } else {
      let x = 0;
      data.forEach(d => {
        if (d.value <= 0) return;
        const bw = (d.value / total) * w;
        svg += `<rect x="${x}" y="0" width="${bw}" height="${h}" fill="${d.color || 'var(--c-primary)'}">`;
        svg += `<title>${escHtml(d.label)}: ¥${fmt(d.value)} (${Math.round(d.value / total * 100)}%)</title>`;
        svg += `</rect>`;
        if (bw > 35) {
          svg += `<text x="${x + bw / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" font-size="8" fill="#fff" font-weight="600">${Math.round(d.value / total * 100)}%</text>`;
        }
        x += bw;
      });
    }

    svg += '</svg>';
    return svg;
  }

  function svgLineChart(data, opts) {
    const w = opts.width || 320;
    const h = opts.height || 100;
    const pad = { t: 8, r: 8, b: 24, l: 40 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const stepX = data.length > 1 ? cw / (data.length - 1) : cw;

    let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block">`;

    for (let i = 0; i <= 3; i++) {
      const yy = pad.t + (ch / 3) * i;
      svg += `<line x1="${pad.l}" y1="${yy}" x2="${w - pad.r}" y2="${yy}" stroke="var(--c-border)" stroke-width="0.5"/>`;
      const val = maxVal - (maxVal / 3) * i;
      svg += `<text x="${pad.l - 4}" y="${yy + 3}" text-anchor="end" font-size="6.5" fill="var(--c-tx-muted)">${val >= 10000 ? Math.round(val / 1000) + 'k' : fmt(Math.round(val))}</text>`;
    }

    if (data.length > 0) {
      const points = data.map((d, i) => {
        const x = pad.l + stepX * i;
        const y = pad.t + ch - (maxVal > 0 ? (d.value / maxVal) * ch : 0);
        return { x, y };
      });

      const gradId = 'grad_' + Math.random().toString(36).substr(2, 5);
      svg += `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--c-primary)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--c-primary)" stop-opacity="0.02"/></linearGradient></defs>`;

      let areaPath = `M${points[0].x},${pad.t + ch}`;
      points.forEach(p => { areaPath += ` L${p.x},${p.y}`; });
      areaPath += ` L${points[points.length - 1].x},${pad.t + ch} Z`;
      svg += `<path d="${areaPath}" fill="url(#${gradId})"/>`;

      let linePath = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        linePath += ` L${points[i].x},${points[i].y}`;
      }
      svg += `<path d="${linePath}" fill="none" stroke="var(--c-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

      points.forEach((p, i) => {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--c-primary)" stroke="#fff" stroke-width="1.5">`;
        svg += `<title>${escHtml(data[i].label)}: ¥${fmt(data[i].value)}</title>`;
        svg += `</circle>`;
      });

      data.forEach((d, i) => {
        if (d.shortLabel && (data.length <= 10 || i % Math.ceil(data.length / 8) === 0)) {
          const x = pad.l + stepX * i;
          svg += `<text x="${x}" y="${h - 4}" text-anchor="middle" font-size="6" fill="var(--c-tx-muted)">${escHtml(d.shortLabel)}</text>`;
        }
      });
    }

    svg += '</svg>';
    return svg;
  }

  /* ===== Data Collection ===== */
  function getStatPeriodData() {
    const now = new Date();
    let earns, exps, label, from, to;

    switch (_statPeriod) {
      case 'day': {
        const dk = _statDateStr || TD;
        earns = eByDate(dk);
        exps = S.g('exps', []).filter(e => e.date === dk);
        const dp = dk.split('-');
        const dobj = new Date(+dp[0], +dp[1] - 1, +dp[2]);
        label = dp[0] + '年' + (+dp[1]) + '月' + (+dp[2]) + '日(' + DAYS[dobj.getDay()] + ')';
        from = dk; to = dk;
        break;
      }
      case 'week': {
        const wr = _getStatWeekRange();
        from = wr.from; to = wr.to;
        const allE = getE();
        earns = allE.filter(r => r.d >= from && r.d <= to);
        exps = S.g('exps', []).filter(e => e.date >= from && e.date <= to);
        const fp = from.split('-'), tp = to.split('-');
        label = (+fp[1]) + '/' + (+fp[2]) + ' ~ ' + (+tp[1]) + '/' + (+tp[2]);
        break;
      }
      case 'month': {
        let mk = _statDateStr || MK;
        if (mk.length > 7) mk = mk.substring(0, 7);
        earns = eByMonth(mk);
        exps = S.g('exps', []).filter(e => e.date && e.date.substring(0, 7) === mk);
        const mp = mk.split('-');
        label = mp[0] + '年' + (+mp[1]) + '月';
        from = mk + '-01';
        const ld = new Date(+mp[0], +mp[1], 0).getDate();
        to = mk + '-' + String(ld).padStart(2, '0');
        break;
      }
      case '3month': {
        const d3 = new Date(now); d3.setMonth(d3.getMonth() - 2, 1);
        from = dateKey(d3); to = TD;
        earns = getE().filter(r => r.d >= from && r.d <= to);
        exps = S.g('exps', []).filter(e => e.date >= from && e.date <= to);
        label = '直近3ヶ月';
        break;
      }
      case 'year': {
        const yr = _statDateStr ? +_statDateStr.substring(0, 4) : now.getFullYear();
        from = yr + '-01-01'; to = yr + '-12-31';
        earns = getE().filter(r => r.d >= from && r.d <= to);
        exps = S.g('exps', []).filter(e => e.date >= from && e.date <= to);
        label = yr + '年';
        break;
      }
      default:
        earns = []; exps = []; label = ''; from = ''; to = '';
    }

    const tot = sumA(earns);
    const cnt = sumC(earns);
    const avg = cnt ? Math.round(tot / cnt) : 0;
    const expTot = exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const profit = tot - expTot;
    const daysSet = new Set(); earns.forEach(r => daysSet.add(r.d));
    const daysCnt = daysSet.size;
    const dailyAvg = daysCnt ? Math.round(tot / daysCnt) : 0;

    const pfMap = {};
    earns.forEach(r => {
      const pf = extractPf(r.m) || 'その他';
      if (!pfMap[pf]) pfMap[pf] = { a: 0, c: 0 };
      pfMap[pf].a += Number(r.a) || 0;
      pfMap[pf].c += Number(r.c) || 0;
    });
    const pfArr = Object.keys(pfMap).map(pf => ({
      pf, a: pfMap[pf].a, c: pfMap[pf].c,
      u: pfMap[pf].c ? Math.round(pfMap[pf].a / pfMap[pf].c) : 0
    }));
    pfArr.sort((a, b) => b.a - a.a);

    const ecMap = {};
    exps.forEach(e => {
      const c = e.cat || 'その他';
      ecMap[c] = (ecMap[c] || 0) + (Number(e.amount) || 0);
    });
    const ecArr = Object.keys(ecMap).map(c => ({ cat: c, a: ecMap[c] }));
    ecArr.sort((a, b) => b.a - a.a);

    return {
      earns, exps, label, from, to,
      tot, cnt, avg, expTot, profit,
      daysSet, daysCnt, dailyAvg,
      pfArr, ecArr
    };
  }

  /* ===== Main Render ===== */
  function renderStats() {
    const pg = document.getElementById('pg2');
    if (!pg) return;

    const periods = [
      { id: 'day', label: '今日' },
      { id: 'week', label: '週間' },
      { id: 'month', label: '月間' },
      { id: '3month', label: '3ヶ月' },
      { id: 'year', label: '年間' }
    ];

    const sections = [
      { id: 'overview', label: '📊 概要' },
      { id: 'pf', label: '📦 PF分析' },
      { id: 'expense', label: '💸 経費' },
      { id: 'records', label: '📋 記録' }
    ];

    let html = '';

    /* Period tabs */
    html += '<div class="ds-period-bar">';
    periods.forEach(p => {
      html += `<button class="ds-ptab${_statPeriod === p.id ? ' on' : ''}" onclick="setStatPeriod('${p.id}')">${p.label}</button>`;
    });
    html += '</div>';

    /* Section tabs */
    html += '<div style="display:flex;gap:4px;padding:4px 0 8px;overflow-x:auto;border-bottom:1px solid var(--c-divider);margin-bottom:8px">';
    sections.forEach(s => {
      html += `<button class="ds-stab${_statSection === s.id ? ' on' : ''}" onclick="setStatSection('${s.id}')">${s.label}</button>`;
    });
    html += '</div>';

    const pd = getStatPeriodData();

    /* Period label + nav arrows */
    html += `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 8px">
      <button class="btn btn-secondary btn-sm" onclick="statPeriodPrev()" style="padding:4px 10px;font-size:.85rem">◀</button>
      <span style="font-size:.82rem;font-weight:600;color:var(--c-tx)">${escHtml(pd.label)}</span>
      <button class="btn btn-secondary btn-sm" onclick="statPeriodNext()" style="padding:4px 10px;font-size:.85rem">▶</button>
    </div>`;
    html += '<div style="text-align:center;font-size:.6rem;color:var(--c-tx-muted);margin-bottom:8px">← スワイプで期間移動 →</div>';

    html += '<div id="stat-swipe-area">';
    switch (_statSection) {
      case 'overview': html += _renderOverview(pd); break;
      case 'pf': html += _renderPF(pd); break;
      case 'expense': html += _renderExpense(pd); break;
      case 'records': html += _renderRecords(pd); break;
    }
    html += '</div>';

    pg.innerHTML = html;
    requestAnimationFrame(() => initStatSwipe());
  }

  /* ===== Previous Period Helper ===== */
  function _getPrevPeriodData() {
    let prevEarns = [], prevExps = [], prevLabel = '';
    switch (_statPeriod) {
      case 'day': {
        const dk = _statDateStr || TD;
        const dp = dk.split('-');
        const d = new Date(+dp[0], +dp[1] - 1, +dp[2]);
        d.setDate(d.getDate() - 1);
        const pdk = dateKey(d);
        prevEarns = eByDate(pdk);
        prevExps = S.g('exps', []).filter(e => e.date === pdk);
        prevLabel = '前日';
        break;
      }
      case 'week': {
        const wr = _getStatWeekRange();
        const fp = wr.from.split('-');
        const pFrom = new Date(+fp[0], +fp[1] - 1, +fp[2]);
        pFrom.setDate(pFrom.getDate() - 7);
        const pTo = new Date(pFrom);
        pTo.setDate(pFrom.getDate() + 6);
        const pf = dateKey(pFrom), pt = dateKey(pTo);
        prevEarns = getE().filter(r => r.d >= pf && r.d <= pt);
        prevExps = S.g('exps', []).filter(e => e.date >= pf && e.date <= pt);
        prevLabel = '前週';
        break;
      }
      case 'month': {
        let mk = _statDateStr || MK;
        if (mk.length > 7) mk = mk.substring(0, 7);
        const mp = mk.split('-');
        const pm = new Date(+mp[0], +mp[1] - 2, 1);
        const pmk = pm.getFullYear() + '-' + String(pm.getMonth() + 1).padStart(2, '0');
        prevEarns = eByMonth(pmk);
        prevExps = S.g('exps', []).filter(e => e.date && e.date.substring(0, 7) === pmk);
        prevLabel = '前月';
        break;
      }
      case '3month': {
        const now2 = new Date();
        const curFrom = new Date(now2); curFrom.setMonth(curFrom.getMonth() - 2, 1);
        const pTo = new Date(curFrom); pTo.setDate(pTo.getDate() - 1);
        const pFrom = new Date(curFrom); pFrom.setMonth(pFrom.getMonth() - 3, 1);
        const pf = dateKey(pFrom), pt = dateKey(pTo);
        prevEarns = getE().filter(r => r.d >= pf && r.d <= pt);
        prevExps = S.g('exps', []).filter(e => e.date >= pf && e.date <= pt);
        prevLabel = '前3ヶ月';
        break;
      }
      case 'year': {
        const yr = _statDateStr ? +_statDateStr.substring(0, 4) : new Date().getFullYear();
        const pyr = yr - 1;
        const pf = pyr + '-01-01', pt = pyr + '-12-31';
        prevEarns = getE().filter(r => r.d >= pf && r.d <= pt);
        prevExps = S.g('exps', []).filter(e => e.date >= pf && e.date <= pt);
        prevLabel = '前年';
        break;
      }
    }
    const prevTot = sumA(prevEarns);
    const prevCnt = sumC(prevEarns);
    const prevExpTot = prevExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const prevProfit = prevTot - prevExpTot;
    const prevDaysSet = new Set(); prevEarns.forEach(r => prevDaysSet.add(r.d));
    const pfMap = {};
    prevEarns.forEach(r => {
      const pf2 = extractPf(r.m) || 'その他';
      if (!pfMap[pf2]) pfMap[pf2] = { a: 0, c: 0 };
      pfMap[pf2].a += Number(r.a) || 0;
      pfMap[pf2].c += Number(r.c) || 0;
    });
    const ecMap = {};
    prevExps.forEach(e => {
      const c = e.cat || 'その他';
      ecMap[c] = (ecMap[c] || 0) + (Number(e.amount) || 0);
    });
    return {
      label: prevLabel, tot: prevTot, cnt: prevCnt,
      expTot: prevExpTot, profit: prevProfit,
      daysCnt: prevDaysSet.size, pfMap, ecMap
    };
  }

  function _diffBadge(cur, prev) {
    if (prev === 0 && cur === 0) return '';
    if (prev === 0) return cur > 0 ? '<span style="font-size:.6rem;color:var(--c-tx-secondary)">NEW</span>' : '';
    const diff = cur - prev;
    const pct = Math.round(Math.abs(diff) / prev * 100);
    if (diff === 0) return '<span style="font-size:.6rem;color:var(--c-tx-muted)">±0%</span>';
    const color = 'var(--c-tx-secondary)';
    const arrow = diff > 0 ? '↑' : '↓';
    return `<span style="font-size:.6rem;color:${color}">${arrow}${pct}%</span>`;
  }

  /* ===== Edit/Delete from stats ===== */
  function _statEditEarn(ts) {
    if (typeof window.openEditEarn === 'function') {
      window.openEditEarn(ts);
      const checkInterval = setInterval(() => {
        if (!document.querySelector('.confirm-overlay')) {
          clearInterval(checkInterval);
          renderStats();
        }
      }, 300);
    }
  }

  function _statDelEarn(ts) {
    customConfirm('この記録を削除しますか？', function() {
      if (typeof window.deleteE === 'function') {
        window.deleteE(ts).then(() => {
          toast('🗑 記録を削除しました');
          renderStats();
          if (typeof window.refreshHome === 'function') window.refreshHome();
        });
      }
    });
  }

  function _statEditExp(ts) {
    if (typeof window.openEditExpense === 'function') {
      window.openEditExpense(ts);
      const checkInterval = setInterval(() => {
        if (!document.querySelector('.confirm-overlay')) {
          clearInterval(checkInterval);
          renderStats();
        }
      }, 300);
    }
  }

  function _statDelExp(ts) {
    customConfirm('この経費を削除しますか？', function() {
      const exps = S.g('exps', []).filter(e => e.ts !== ts);
      S.s('exps', exps);
      toast('🗑 経費を削除しました');
      renderStats();
      if (typeof window.refreshHome === 'function') window.refreshHome();
    });
  }

  /* ===== Overview ===== */
  function _renderOverview(pd) {
    let h = '';

    let heroContent = '<div class="ds-hero">';
    heroContent += '<div class="ds-hero-val">¥' + fmt(pd.tot) + '</div>';
    heroContent += '<div class="ds-hero-sub">売上合計</div>';
    heroContent += '</div>';
    heroContent += '<div class="ds-grid">';
    heroContent += '<div class="ds-gbox"><div class="ds-gl">件数</div><div class="ds-gv">' + pd.cnt + '件</div></div>';
    heroContent += '<div class="ds-gbox"><div class="ds-gl">単価</div><div class="ds-gv">¥' + fmt(pd.avg) + '</div></div>';
    heroContent += '<div class="ds-gbox"><div class="ds-gl">稼働日</div><div class="ds-gv">' + pd.daysCnt + '日</div></div>';
    heroContent += '<div class="ds-gbox"><div class="ds-gl">日平均</div><div class="ds-gv">¥' + fmt(pd.dailyAvg) + '</div></div>';
    heroContent += '</div>';

    if (pd.pfArr.length > 0) {
      const stackData = pd.pfArr.map(p => ({
        label: p.pf, value: p.a, color: pfColor(p.pf)
      }));
      heroContent += '<div style="margin-top:8px">';
      heroContent += svgStackedBar(stackData, { height: 24 });
      heroContent += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;justify-content:center">';
      pd.pfArr.forEach(p => {
        const pct = pd.tot ? Math.round(p.a / pd.tot * 100) : 0;
        heroContent += `<span style="font-size:.65rem;display:flex;align-items:center;gap:3px"><span class="pf-dot" style="background:${pfColor(p.pf)}"></span>${escHtml(p.pf)} ${pct}%</span>`;
      });
      heroContent += '</div></div>';
    }

    h += foldCard('stat', 'hero', '📊 売上サマリー', heroContent);

    const profitColor = pd.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
    let profitC = '<div class="ds-grid3">';
    profitC += '<div class="ds-gbox"><div class="ds-gl">売上</div><div class="ds-gv" style="color:var(--c-primary)">¥' + fmt(pd.tot) + '</div></div>';
    profitC += '<div class="ds-gbox"><div class="ds-gl">経費</div><div class="ds-gv" style="color:var(--c-danger)">¥' + fmt(pd.expTot) + '</div></div>';
    profitC += '<div class="ds-gbox"><div class="ds-gl">利益</div><div class="ds-gv" style="color:' + profitColor + '">¥' + fmt(pd.profit) + '</div></div>';
    profitC += '</div>';
    if (pd.tot > 0 || pd.expTot > 0) {
      profitC += svgStackedBar([
        { label: '売上', value: pd.tot, color: 'var(--c-success)' },
        { label: '経費', value: pd.expTot, color: 'var(--c-danger)' }
      ], { height: 28 });
      if (pd.tot > 0) {
        const profitRate = Math.round(pd.profit / pd.tot * 100);
        profitC += '<div style="text-align:center;font-size:.72rem;color:var(--c-tx-muted);margin-top:6px">利益率: ' + profitRate + '%</div>';
      }
    }
    h += foldCard('stat', 'profit', '💰 収支', profitC);

    const prev = _getPrevPeriodData();
    if (prev.tot > 0 || pd.tot > 0) {
      let compC = '<div class="ds-grid">';
      compC += '<div class="ds-gbox"><div class="ds-gl">売上 ' + _diffBadge(pd.tot, prev.tot) + '</div><div class="ds-gv" style="color:var(--c-primary)">¥' + fmt(pd.tot) + '</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prev.label + ': ¥' + fmt(prev.tot) + '</div></div>';
      compC += '<div class="ds-gbox"><div class="ds-gl">件数 ' + _diffBadge(pd.cnt, prev.cnt) + '</div><div class="ds-gv">' + pd.cnt + '件</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prev.label + ': ' + prev.cnt + '件</div></div>';
      compC += '<div class="ds-gbox"><div class="ds-gl">経費 ' + _diffBadge(pd.expTot, prev.expTot) + '</div><div class="ds-gv" style="color:var(--c-danger)">¥' + fmt(pd.expTot) + '</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prev.label + ': ¥' + fmt(prev.expTot) + '</div></div>';
      compC += '<div class="ds-gbox"><div class="ds-gl">利益 ' + _diffBadge(pd.profit, prev.profit) + '</div><div class="ds-gv" style="color:' + (pd.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)') + '">¥' + fmt(pd.profit) + '</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prev.label + ': ¥' + fmt(prev.profit) + '</div></div>';
      compC += '</div>';
      h += foldCard('stat', 'compare', '🔄 ' + prev.label + '比較', compC);
    }

    if (pd.daysCnt > 1) {
      const dayArr = Array.from(pd.daysSet).sort();
      const lineData = dayArr.map(dk => {
        const dp = dk.split('-');
        return { label: (+dp[1]) + '/' + (+dp[2]), shortLabel: (+dp[2]) + '', value: sumA(eByDate(dk)) };
      });
      let trendC = svgLineChart(lineData, { height: 120 });
      const barData = dayArr.map(dk => {
        const dp = dk.split('-');
        const dobj = new Date(+dp[0], +dp[1] - 1, +dp[2]);
        const isWe = dobj.getDay() === 0 || dobj.getDay() === 6;
        return { label: (+dp[1]) + '/' + (+dp[2]) + '(' + DAYS[dobj.getDay()] + ')', shortLabel: (+dp[2]) + '', value: sumA(eByDate(dk)), color: isWe ? 'var(--c-danger)' : 'var(--c-primary)' };
      });
      trendC += '<div style="margin-top:12px">' + svgBarChart(barData, { height: 130 }) + '</div>';
      h += foldCard('stat', 'dailyTrend', '📈 日別売上トレンド', trendC);
    }

    if (pd.daysCnt > 1) {
      const dowData = [0, 1, 2, 3, 4, 5, 6].map(() => ({ tot: 0, cnt: 0, days: new Set() }));
      pd.earns.forEach(r => {
        const dp = r.d.split('-');
        const dow = new Date(+dp[0], +dp[1] - 1, +dp[2]).getDay();
        dowData[dow].tot += Number(r.a) || 0;
        dowData[dow].cnt += Number(r.c) || 0;
        dowData[dow].days.add(r.d);
      });
      const dowBarData = [1, 2, 3, 4, 5, 6, 0].filter(dow => dowData[dow].days.size > 0).map(dow => {
        const dd = dowData[dow];
        const avg = dd.days.size ? Math.round(dd.tot / dd.days.size) : 0;
        const isWe = dow === 0 || dow === 6;
        return { label: DAYS[dow] + ' (' + dd.days.size + '日)', value: avg, valueLabel: '¥' + fmt(avg) + '/日', color: isWe ? 'var(--c-danger)' : 'var(--c-primary)', dot: isWe ? 'var(--c-danger)' : 'var(--c-primary)' };
      });
      let dowC = svgHBarChart(dowBarData, { barHeight: 24, labelWidth: 75, valueWidth: 80 });
      h += foldCard('stat', 'dowPerf', '📅 曜日別パフォーマンス', dowC);
    }

    if (pd.pfArr.length > 0) {
      const pfBarData = pd.pfArr.slice(0, 6).map(p => ({
        label: p.pf, value: p.a, valueLabel: '¥' + fmt(p.a) + ' (' + (pd.tot ? Math.round(p.a / pd.tot * 100) : 0) + '%)', color: pfColor(p.pf), dot: pfColor(p.pf)
      }));
      let pfQC = svgHBarChart(pfBarData, { barHeight: 24, labelWidth: 70, valueWidth: 90 });
      h += foldCard('stat', 'pfQuick', '📦 PF別 <span style="font-size:.65rem;color:var(--c-primary);cursor:pointer" onclick="event.stopPropagation();setStatSection(\'pf\')">詳しく見る →</span>', pfQC);
    }

    if (pd.expTot > 0) {
      const ecBarData = pd.ecArr.slice(0, 5).map(ec => ({
        label: ec.cat, value: ec.a, valueLabel: '¥' + fmt(ec.a), color: 'var(--c-danger)'
      }));
      let expQC = svgHBarChart(ecBarData, { barHeight: 22, labelWidth: 80, valueWidth: 70 });
      h += foldCard('stat', 'expQuick', '💸 経費 <span style="font-size:.65rem;color:var(--c-primary);cursor:pointer" onclick="event.stopPropagation();setStatSection(\'expense\')">詳しく見る →</span>', expQC);
    }

    if (_statPeriod === '3month' || _statPeriod === 'year') {
      const fromP = pd.from.split('-');
      const toP = pd.to.split('-');
      const startM = new Date(+fromP[0], +fromP[1] - 1, 1);
      const endM = new Date(+toP[0], +toP[1] - 1, 1);
      const months = [];
      const curM = new Date(startM);
      while (curM <= endM) {
        const mmk = curM.getFullYear() + '-' + String(curM.getMonth() + 1).padStart(2, '0');
        const mEarns = eByMonth(mmk);
        months.push({ mk: mmk, tot: sumA(mEarns), cnt: sumC(mEarns) });
        curM.setMonth(curM.getMonth() + 1);
      }
      if (months.length > 1) {
        const lineData2 = months.map(m => { const mmp = m.mk.split('-'); return { label: (+mmp[1]) + '月', shortLabel: (+mmp[1]) + '月', value: m.tot }; });
        let trendC2 = svgLineChart(lineData2, { height: 120 });
        const barData2 = months.map(m => { const mmp = m.mk.split('-'); return { label: (+mmp[1]) + '月', shortLabel: (+mmp[1]) + '', value: m.tot, color: 'var(--c-primary)' }; });
        trendC2 += '<div style="margin-top:8px">' + svgBarChart(barData2, { height: 120 }) + '</div>';
        h += foldCard('stat', 'monthTrend', '📈 月別推移', trendC2);
      }
    }

    return h;
  }

  /* ===== PF Analysis ===== */
  function _renderPF(pd) {
    let h = '';
    if (pd.pfArr.length === 0) return '<div class="ds-empty">PFデータがありません</div>';

    const donutData = pd.pfArr.map(p => ({ label: p.pf, value: p.a, color: pfColor(p.pf) }));
    let donutC = '<div style="text-align:center">';
    donutC += svgDonut(donutData, { size: 180, radius: 75, innerRadius: 48, centerText: '¥' + (pd.tot >= 10000 ? Math.round(pd.tot / 1000) + 'k' : fmt(pd.tot)), centerSub: '合計' });
    donutC += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;justify-content:center">';
    pd.pfArr.forEach(p => {
      const pct = pd.tot ? Math.round(p.a / pd.tot * 100) : 0;
      donutC += `<span style="font-size:.72rem;display:flex;align-items:center;gap:4px"><span class="pf-dot" style="background:${pfColor(p.pf)}"></span>${escHtml(p.pf)} <b>¥${fmt(p.a)}</b> <span style="color:var(--c-tx-muted)">${pct}%</span></span>`;
    });
    donutC += '</div></div>';
    h += foldCard('stat', 'pfDonut', '🍩 PF構成比', donutC);

    const pfBarData = pd.pfArr.map(p => ({ label: p.pf, value: p.a, valueLabel: '¥' + fmt(p.a) + ' ' + p.c + '件', color: pfColor(p.pf), dot: pfColor(p.pf) }));
    h += foldCard('stat', 'pfBars', '📊 PF別売上', svgHBarChart(pfBarData, { barHeight: 28, labelWidth: 75, valueWidth: 95 }));

    let pfDetC = '';
    pd.pfArr.forEach(p => {
      const pctOf = pd.tot ? Math.round(p.a / pd.tot * 100) : 0;
      pfDetC += '<div class="ds-row">';
      pfDetC += '<div class="ds-rl"><span class="pf-dot" style="background:' + pfColor(p.pf) + '"></span>' + escHtml(p.pf) + '</div>';
      pfDetC += '<div class="ds-rv">¥' + fmt(p.a) + ' <span style="font-size:.65rem;color:var(--c-tx-muted)">' + p.c + '件 @¥' + fmt(p.u) + ' ' + pctOf + '%</span></div>';
      pfDetC += '</div>';
    });
    h += foldCard('stat', 'pfDetail', '📦 PF別詳細', pfDetC);

    const UNIT_BUCKETS = [
      { l: '~¥400', mn: 0, mx: 400, n: 0 },
      { l: '¥400~¥600', mn: 400, mx: 600, n: 0 },
      { l: '¥600~¥800', mn: 600, mx: 800, n: 0 },
      { l: '¥800~¥1,000', mn: 800, mx: 1000, n: 0 },
      { l: '¥1,000~¥1,500', mn: 1000, mx: 1500, n: 0 },
      { l: '¥1,500~¥2,000', mn: 1500, mx: 2000, n: 0 },
      { l: '¥2,000~', mn: 2000, mx: Infinity, n: 0 }
    ];
    pd.earns.forEach(r2 => {
      const u2 = r2.c > 0 ? r2.a / r2.c : r2.a;
      for (let i2 = 0; i2 < UNIT_BUCKETS.length; i2++) {
        if (u2 >= UNIT_BUCKETS[i2].mn && u2 < UNIT_BUCKETS[i2].mx) { UNIT_BUCKETS[i2].n++; break; }
      }
    });
    const unitBarData = UNIT_BUCKETS.map(b => ({ label: b.l, value: b.n, valueLabel: b.n + '件', color: b.n > 0 ? 'var(--c-primary)' : 'var(--c-border)' }));
    let unitC = svgHBarChart(unitBarData, { barHeight: 22, labelWidth: 90, valueWidth: 40 });
    if (pd.cnt > 0) {
      const allUnits = pd.earns.map(r => r.c > 0 ? Math.round(r.a / r.c) : r.a).sort((a, b) => a - b);
      const median = allUnits[Math.floor(allUnits.length / 2)] || 0;
      const min = allUnits[0] || 0;
      const max = allUnits[allUnits.length - 1] || 0;
      unitC += '<div class="ds-grid" style="margin-top:10px">';
      unitC += '<div class="ds-gbox"><div class="ds-gl">平均</div><div class="ds-gv">¥' + fmt(pd.avg) + '</div></div>';
      unitC += '<div class="ds-gbox"><div class="ds-gl">中央値</div><div class="ds-gv">¥' + fmt(median) + '</div></div>';
      unitC += '<div class="ds-gbox"><div class="ds-gl">最低</div><div class="ds-gv" style="color:var(--c-danger)">¥' + fmt(min) + '</div></div>';
      unitC += '<div class="ds-gbox"><div class="ds-gl">最高</div><div class="ds-gv" style="color:var(--c-success)">¥' + fmt(max) + '</div></div>';
      unitC += '</div>';
    }
    h += foldCard('stat', 'unitDist', '💵 単価分布', unitC);

    const prevPd = _getPrevPeriodData();
    if (Object.keys(prevPd.pfMap).length > 0) {
      let pfCompC = '<div style="font-size:.7rem;color:var(--c-tx-muted);margin-bottom:8px">' + prevPd.label + 'との比較</div>';
      pd.pfArr.forEach(p => {
        const prevA = prevPd.pfMap[p.pf] ? prevPd.pfMap[p.pf].a : 0;
        const prevC = prevPd.pfMap[p.pf] ? prevPd.pfMap[p.pf].c : 0;
        pfCompC += '<div class="ds-row">';
        pfCompC += '<div class="ds-rl"><span class="pf-dot" style="background:' + pfColor(p.pf) + '"></span>' + escHtml(p.pf) + '</div>';
        pfCompC += '<div class="ds-rv">¥' + fmt(p.a) + ' ' + _diffBadge(p.a, prevA) + '<div style="font-size:.6rem;color:var(--c-tx-muted)">' + prevPd.label + ': ¥' + fmt(prevA) + ' (' + prevC + '件)</div></div>';
        pfCompC += '</div>';
      });
      h += foldCard('stat', 'pfComp', '🔄 PF ' + prevPd.label + '比較', pfCompC);
    }

    return h;
  }

  /* ===== Expense ===== */
  function _renderExpense(pd) {
    let h = '';
    if (pd.expTot === 0) return '<div class="ds-empty">経費データがありません</div>';

    let expHC = '<div class="ds-hero">';
    expHC += '<div class="ds-hero-val" style="color:var(--c-danger)">¥' + fmt(pd.expTot) + '</div>';
    expHC += '<div class="ds-hero-sub">経費合計</div>';
    expHC += '</div>';
    expHC += '<div class="ds-grid">';
    expHC += '<div class="ds-gbox"><div class="ds-gl">売上</div><div class="ds-gv">¥' + fmt(pd.tot) + '</div></div>';
    expHC += '<div class="ds-gbox"><div class="ds-gl">利益</div><div class="ds-gv" style="color:' + (pd.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)') + '">¥' + fmt(pd.profit) + '</div></div>';
    expHC += '</div>';
    h += foldCard('stat', 'expHero', '💸 経費合計', expHC);

    if (pd.ecArr.length > 0) {
      const ecColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#64748b'];
      const ecDonutData = pd.ecArr.map((ec, i) => ({ label: ec.cat, value: ec.a, color: ecColors[i % ecColors.length] }));
      let ecDonutC = '<div style="text-align:center">';
      ecDonutC += svgDonut(ecDonutData, { size: 160, radius: 65, innerRadius: 40, centerText: '¥' + (pd.expTot >= 10000 ? Math.round(pd.expTot / 1000) + 'k' : fmt(pd.expTot)), centerSub: '経費合計' });
      ecDonutC += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center">';
      pd.ecArr.forEach((ec, i) => {
        const pct = pd.expTot ? Math.round(ec.a / pd.expTot * 100) : 0;
        ecDonutC += `<span style="font-size:.68rem;display:flex;align-items:center;gap:3px"><span class="pf-dot" style="background:${ecColors[i % ecColors.length]}"></span>${escHtml(ec.cat)} ${pct}%</span>`;
      });
      ecDonutC += '</div></div>';
      h += foldCard('stat', 'expDonut', '🍩 経費構成比', ecDonutC);
    }

    const ecBarData = pd.ecArr.map(ec => ({ label: ec.cat, value: ec.a, valueLabel: '¥' + fmt(ec.a) + ' (' + (pd.expTot ? Math.round(ec.a / pd.expTot * 100) : 0) + '%)', color: 'var(--c-danger)' }));
    h += foldCard('stat', 'expCat', '🏷 カテゴリ別', svgHBarChart(ecBarData, { barHeight: 24, labelWidth: 80, valueWidth: 90 }));

    const prevPd = _getPrevPeriodData();
    if (prevPd.expTot > 0 || pd.expTot > 0) {
      let expCompC = '<div class="ds-grid">';
      expCompC += '<div class="ds-gbox"><div class="ds-gl">経費合計 ' + _diffBadge(pd.expTot, prevPd.expTot) + '</div><div class="ds-gv" style="color:var(--c-danger)">¥' + fmt(pd.expTot) + '</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prevPd.label + ': ¥' + fmt(prevPd.expTot) + '</div></div>';
      expCompC += '<div class="ds-gbox"><div class="ds-gl">利益 ' + _diffBadge(pd.profit, prevPd.profit) + '</div><div class="ds-gv" style="color:' + (pd.profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)') + '">¥' + fmt(pd.profit) + '</div><div style="font-size:.6rem;color:var(--c-tx-muted)">' + prevPd.label + ': ¥' + fmt(prevPd.profit) + '</div></div>';
      expCompC += '</div>';
      if (pd.ecArr.length > 0) {
        pd.ecArr.forEach(ec => {
          const prevCatA = prevPd.ecMap[ec.cat] || 0;
          expCompC += '<div class="ds-row"><div class="ds-rl">' + escHtml(ec.cat) + '</div>';
          expCompC += '<div class="ds-rv">¥' + fmt(ec.a) + ' ' + _diffBadge(ec.a, prevCatA) + '<div style="font-size:.6rem;color:var(--c-tx-muted)">' + prevPd.label + ': ¥' + fmt(prevCatA) + '</div></div></div>';
        });
      }
      h += foldCard('stat', 'expComp', '🔄 経費 ' + prevPd.label + '比較', expCompC);
    }

    let elC = '';
    const sorted2 = pd.exps.slice().sort((a, b) => b.ts - a.ts);
    sorted2.slice(0, 30).forEach(e => {
      elC += '<div class="ds-rec" style="flex-wrap:wrap">';
      elC += '<div class="ds-rec-l" style="flex:1;min-width:0">' + escHtml(e.cat || 'その他');
      if (e.memo) elC += ' <span style="font-size:.65rem;color:var(--c-tx-muted)">' + escHtml(e.memo) + '</span>';
      if (e.date) elC += ' <span style="font-size:.6rem;color:var(--c-tx-muted)">' + e.date + '</span>';
      elC += '</div>';
      elC += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">';
      elC += '<span style="color:var(--c-danger);font-weight:700;font-size:.82rem">-¥' + fmt(e.amount) + '</span>';
      elC += '<button class="btn btn-secondary btn-xs" onclick="statEditExp(' + e.ts + ')">編集</button>';
      elC += '<button class="btn btn-danger btn-xs" onclick="statDelExp(' + e.ts + ')">削除</button>';
      elC += '</div></div>';
    });
    if (sorted2.length > 30) elC += '<div style="text-align:center;font-size:.7rem;color:var(--c-tx-muted);padding:8px">他 ' + (sorted2.length - 30) + '件...</div>';
    h += foldCard('stat', 'expList', '📋 経費明細', elC);

    return h;
  }

  /* ===== Records ===== */
  function _renderRecords(pd) {
    let h = '';
    if (pd.earns.length === 0) return '<div class="ds-empty">配達記録がありません</div>';

    let recC = '<div class="ds-grid3" style="margin-bottom:12px">';
    recC += '<div class="ds-gbox"><div class="ds-gl">合計</div><div class="ds-gv" style="color:var(--c-primary)">¥' + fmt(pd.tot) + '</div></div>';
    recC += '<div class="ds-gbox"><div class="ds-gl">件数</div><div class="ds-gv">' + pd.cnt + '件</div></div>';
    recC += '<div class="ds-gbox"><div class="ds-gl">単価</div><div class="ds-gv">¥' + fmt(pd.avg) + '</div></div>';
    recC += '</div>';

    const sorted3 = pd.earns.slice().sort((a, b) => b.ts - a.ts);
    let lastDate = '';
    sorted3.slice(0, 50).forEach(r3 => {
      if (r3.d !== lastDate) {
        lastDate = r3.d;
        const rp = r3.d.split('-');
        const robj = new Date(+rp[0], +rp[1] - 1, +rp[2]);
        recC += '<div style="font-size:.7rem;font-weight:600;color:var(--c-tx-muted);margin-top:10px;margin-bottom:4px">' + (+rp[1]) + '/' + (+rp[2]) + '(' + DAYS[robj.getDay()] + ')</div>';
      }
      const pf3 = extractPf(r3.m) || '';
      recC += '<div class="ds-rec" style="flex-wrap:wrap">';
      recC += '<div class="ds-rec-l" style="flex:1;min-width:0">' + (pf3 ? '<span class="pf-dot" style="background:' + pfColor(pf3) + '"></span>' + escHtml(pf3) : 'ー') + '</div>';
      recC += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">';
      recC += '<div class="ds-rec-r"><div class="ds-rec-amt">¥' + fmt(r3.a) + '</div><div class="ds-rec-cnt">' + r3.c + '件</div></div>';
      recC += '<button class="btn btn-secondary btn-xs" onclick="statEditEarn(' + r3.ts + ')">編集</button>';
      recC += '<button class="btn btn-danger btn-xs" onclick="statDelEarn(' + r3.ts + ')">削除</button>';
      recC += '</div></div>';
    });
    if (sorted3.length > 50) recC += '<div style="text-align:center;font-size:.7rem;color:var(--c-tx-muted);padding:8px">他 ' + (sorted3.length - 50) + '件...</div>';
    h += foldCard('stat', 'records', '📋 配達記録 (' + pd.earns.length + '件)', recC);

    if (pd.daysCnt > 1) {
      const allDays = Array.from(pd.daysSet).sort().reverse();
      const dayBarData = allDays.map(dk => {
        const dp = dk.split('-');
        const dobj = new Date(+dp[0], +dp[1] - 1, +dp[2]);
        const dv = sumA(eByDate(dk));
        const dc = sumC(eByDate(dk));
        const unit = dc > 0 ? Math.round(dv / dc) : 0;
        return { label: (+dp[1]) + '/' + (+dp[2]) + '(' + DAYS[dobj.getDay()] + ')', value: dv, valueLabel: '¥' + fmt(dv) + ' ' + dc + '件 @¥' + fmt(unit), color: (dobj.getDay() === 0 || dobj.getDay() === 6) ? 'var(--c-danger)' : 'var(--c-primary)', dot: (dobj.getDay() === 0 || dobj.getDay() === 6) ? 'var(--c-danger)' : 'var(--c-primary)' };
      });
      h += foldCard('stat', 'daySum', '📊 日別集計 (' + allDays.length + '日)', svgHBarChart(dayBarData, { barHeight: 22, labelWidth: 75, valueWidth: 115 }));
    }

    return h;
  }

  /* ===== Setters ===== */
  function setStatPeriod(p) { hp(); _statPeriod = p; _statDateStr = null; renderStats(); }
  function setStatSection(s) { hp(); _statSection = s; renderStats(); }

  /* ===== Expose ===== */
  window.renderStats = renderStats;
  window.setStatPeriod = setStatPeriod;
  window.setStatSection = setStatSection;
  window.statPeriodPrev = statPeriodPrev;
  window.statPeriodNext = statPeriodNext;
  window.statEditEarn = _statEditEarn;
  window.statDelEarn = _statDelEarn;
  window.statEditExp = _statEditExp;
  window.statDelExp = _statDelExp;
  window._svgDonut = svgDonut;
  window._svgBarChart = svgBarChart;
  window._svgHBarChart = svgHBarChart;
  window._svgStackedBar = svgStackedBar;
  window._svgLineChart = svgLineChart;

  window.openStatDetail = function(type, context, dateStr) {
    hp();
    if (context === 'today' || context === 'calDay') window._dashPeriod = 'day';
    else if (context === 'week') window._dashPeriod = 'week';
    else if (context === 'month' || context === 'calMonth') window._dashPeriod = 'month';
    else window._dashPeriod = 'month';
    window._dashDateStr = dateStr || null;
    window._dashSection = 'overview';
    if (type === 'expense') window._dashSection = 'expense';
    else if (type === 'pf' || type === 'count' || type === 'unit') window._dashSection = 'pf';
    else if (type === 'records') window._dashSection = 'records';
    if (typeof window.renderDashOverlay === 'function') window.renderDashOverlay();
  };
})();
