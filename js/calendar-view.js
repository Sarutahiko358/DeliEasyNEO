/* ==========================================================
   DeliEasy v2 — js/calendar-view.js
   カレンダーオーバーレイ（Phase 6）
   既存 calendar.js の renderCalendar() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  /* セクション登録 */
  if (typeof registerOverlaySections === 'function') {
    registerOverlaySections('calendar', [
      { id: 'calHeader', name: 'ヘッダー（ナビ+サマリー）', icon: '📅', defaultVisible: true },
      { id: 'calGrid', name: 'カレンダーグリッド', icon: '📆', defaultVisible: true },
      { id: 'calLegend', name: '凡例', icon: '🏷', defaultVisible: true },
      { id: 'calDateNav', name: '日付ナビゲーション', icon: '◀▶', defaultVisible: true },
      { id: 'calInput', name: '入力フォーム', icon: '✏️', defaultVisible: true },
      { id: 'calSummaryDay', name: 'この日のサマリー', icon: '📊', defaultVisible: true },
      { id: 'calSummaryWeek', name: 'この週のサマリー', icon: '📅', defaultVisible: false },
      { id: 'calSummaryMonth', name: 'この月のサマリー', icon: '📆', defaultVisible: false },
      { id: 'calPfBreakdown', name: 'PF別内訳', icon: '📋', defaultVisible: true },
      { id: 'calDeliveryDetail', name: '配達明細', icon: '🚴', defaultVisible: false },
      { id: 'calExpenseDetail', name: '経費明細', icon: '💰', defaultVisible: false }
    ]);
  }

  function renderOverlay_calendar(body) {
    if (!body) return;

    /* calendar.js は #pg1 にレンダリングするので、
       オーバーレイbody内に仮の #pg1 を作成 */
    body.innerHTML = '<div id="pg1" style="min-height:200px"></div>';

    /* calendar.js の初期化・描画を呼び出す */
    if (typeof initCalendar === 'function') initCalendar();
    if (typeof renderCalendar === 'function') renderCalendar();
  }

  /* Expose */
  window.renderOverlay_calendar = renderOverlay_calendar;

})();
