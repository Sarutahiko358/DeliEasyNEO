/* ==========================================================
   DeliEasy v2 — js/calendar-view.js
   カレンダーオーバーレイ（Phase 6）
   既存 calendar.js の renderCalendar() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

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
