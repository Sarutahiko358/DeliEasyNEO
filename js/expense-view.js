/* ==========================================================
   DeliEasy v2 — js/expense-view.js
   経費管理オーバーレイ（Phase 6）
   既存 expense.js の renderExpense() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  /* @depends: overlay.js, overlay-customizer.js, expense.js (lazy loaded)
     @provides: renderOverlay_expenseManage */

  /* セクション登録 */
  if (typeof registerOverlaySections === 'function') {
    registerOverlaySections('expenseManage', [
      { id: 'expInput', name: '入力フォーム', icon: '✏️', defaultVisible: true },
      { id: 'expCategory', name: 'カテゴリ別', icon: '📊', defaultVisible: true },
      { id: 'expList', name: '経費一覧', icon: '📋', defaultVisible: true }
    ]);
  }

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
