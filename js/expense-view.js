/* ==========================================================
   DeliEasy v2 — js/expense-view.js
   経費管理オーバーレイ（Phase 6）
   既存 expense.js の renderExpense() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  function renderOverlay_expenseManage(body) {
    if (!body) return;

    /* expense.js は #pg4 にレンダリングする */
    body.innerHTML = '<div id="pg4" style="min-height:200px"></div>';

    if (typeof initExpense === 'function') initExpense();
    if (typeof renderExpense === 'function') renderExpense();
  }

  /* Expose */
  window.renderOverlay_expenseManage = renderOverlay_expenseManage;

})();
