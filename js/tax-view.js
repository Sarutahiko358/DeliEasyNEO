/* ==========================================================
   DeliEasy v2 — js/tax-view.js
   税金計算オーバーレイ（Phase 6）
   既存 tax.js の renderTax() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  /* セクション登録 */
  if (typeof registerOverlaySections === 'function') {
    registerOverlaySections('tax', [
      { id: 'taxCalc', name: '税金計算', icon: '🧾', defaultVisible: true },
      { id: 'taxBreakdown', name: '内訳', icon: '📋', defaultVisible: true },
      { id: 'taxFurusato', name: 'ふるさと納税', icon: '🏠', defaultVisible: true },
      { id: 'taxSchedule', name: 'スケジュール', icon: '📅', defaultVisible: true },
      { id: 'taxTips', name: '節税ティップス', icon: '💡', defaultVisible: true }
    ]);
  }

  function renderOverlay_tax(body) {
    if (!body) return;

    /* tax.js は #pg3 にレンダリングする */
    body.innerHTML = '<div id="pg3" style="min-height:200px"></div>';

    if (typeof renderTax === 'function') renderTax();
  }

  /* Expose */
  window.renderOverlay_tax = renderOverlay_tax;

})();
