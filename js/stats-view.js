/* ==========================================================
   DeliEasy v2 — js/stats-view.js
   統計オーバーレイ（Phase 6）
   既存 stats.js の renderStats() をオーバーレイ内で呼び出す
   ========================================================== */
(function(){
  'use strict';

  /* セクション登録 */
  if (typeof registerOverlaySections === 'function') {
    registerOverlaySections('stats', [
      { id: 'statsOverview', name: '概要', icon: '📊', defaultVisible: true },
      { id: 'statsPf', name: 'PF別', icon: '📦', defaultVisible: true },
      { id: 'statsExpense', name: '経費', icon: '💰', defaultVisible: true },
      { id: 'statsRecords', name: '記録一覧', icon: '📋', defaultVisible: true }
    ]);
  }

  function renderOverlay_stats(body) {
    if (!body) return;

    /* stats.js は #pg2 にレンダリングする */
    body.innerHTML = '<div id="pg2" style="min-height:200px"></div>';

    if (typeof renderStats === 'function') renderStats();
  }

  /* ダッシュボードオーバーレイ（openStatDetailから呼ばれる）*/
  function renderDashOverlay() {
    /* openStatDetailが呼ばれた時、statsオーバーレイを開く */
    if (typeof isOverlayOpen === 'function' && isOverlayOpen()) {
      var topId = typeof getTopOverlayId === 'function' ? getTopOverlayId() : null;
      if (topId === 'stats') {
        /* 既にstatsが開いている場合は再描画 */
        var body = document.getElementById('overlay-body-stats');
        if (body) renderOverlay_stats(body);
        return;
      }
    }
    if (typeof openOverlay === 'function') {
      openOverlay('stats');
    }
  }

  /* Expose */
  window.renderOverlay_stats = renderOverlay_stats;
  window.renderDashOverlay = renderDashOverlay;

})();
