/* ==========================================================
   DeliEasy v2 — js/tax-view.js
   税金計算オーバーレイ（Phase 6）
   既存 tax.js の renderTax() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  function renderOverlay_tax(body) {
    if (!body) return;

    /* tax.js は #pg3 にレンダリングする */
    body.innerHTML = '<div id="pg3" style="min-height:200px"></div>';

    if (typeof renderTax === 'function') renderTax();
  }

  /* Expose */
  window.renderOverlay_tax = renderOverlay_tax;

})();
