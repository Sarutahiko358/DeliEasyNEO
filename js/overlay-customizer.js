/* ==========================================================
   DeliEasy v2 — js/overlay-customizer.js
   オーバーレイ内セクションのカスタマイズ機能
   ========================================================== */
(function(){
  'use strict';

  var _overlayCustomDefs = {};

  function registerOverlaySections(overlayId, sections) {
    _overlayCustomDefs[overlayId] = sections;
  }

  function getOverlayCustomConfig(overlayId) {
    var key = 'overlayCustom_' + overlayId;
    var saved = S.g(key, null);
    if (saved) return saved;
    var defs = _overlayCustomDefs[overlayId] || [];
    var config = { visible: {}, order: [] };
    defs.forEach(function(sec) {
      config.visible[sec.id] = sec.defaultVisible !== false;
      config.order.push(sec.id);
    });
    return config;
  }

  function saveOverlayCustomConfig(overlayId, config) {
    S.s('overlayCustom_' + overlayId, config);
  }

  function isOverlaySectionVisible(overlayId, sectionId) {
    var cfg = getOverlayCustomConfig(overlayId);
    return cfg.visible[sectionId] !== false;
  }

  function getOverlaySectionOrder(overlayId) {
    var cfg = getOverlayCustomConfig(overlayId);
    var defs = _overlayCustomDefs[overlayId] || [];
    var order = (cfg.order || []).slice();
    defs.forEach(function(sec) {
      if (order.indexOf(sec.id) < 0) order.push(sec.id);
    });
    return order;
  }

  function openOverlayCustomizer(overlayId, onSave) {
    var defs = _overlayCustomDefs[overlayId];
    if (!defs || defs.length === 0) {
      toast('カスタマイズ可能なセクションがありません');
      return;
    }

    var cfg = getOverlayCustomConfig(overlayId);
    var order = getOverlaySectionOrder(overlayId);

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.style.zIndex = '9500';

    var h = '<div class="confirm-box" style="max-width:360px;max-height:80vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb12 text-c">📐 表示カスタマイズ</h3>';
    h += '<div class="fz-xs c-muted mb12">表示/非表示の切替と、上下ボタンで並び替えができます。</div>';

    h += '<div id="overlay-custom-list">';
    order.forEach(function(secId, idx) {
      var secDef = null;
      for (var i = 0; i < defs.length; i++) {
        if (defs[i].id === secId) { secDef = defs[i]; break; }
      }
      if (!secDef) return;
      var isVisible = cfg.visible[secId] !== false;
      h += '<div class="flex items-center mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm);gap:8px" data-sec-id="' + escHtml(secId) + '">';
      h += '<div style="display:flex;flex-direction:column;gap:2px">';
      if (idx > 0) h += '<button class="btn btn-ghost btn-xs" onclick="_ovcMove(\'' + escJs(overlayId) + '\',\'' + escJs(secId) + '\',-1)" style="padding:2px 6px;font-size:.6rem">▲</button>';
      if (idx < order.length - 1) h += '<button class="btn btn-ghost btn-xs" onclick="_ovcMove(\'' + escJs(overlayId) + '\',\'' + escJs(secId) + '\',1)" style="padding:2px 6px;font-size:.6rem">▼</button>';
      h += '</div>';
      h += '<label class="topbar-toggle" style="flex-shrink:0">';
      h += '<input type="checkbox" ' + (isVisible ? 'checked' : '') + ' onchange="_ovcToggle(\'' + escJs(overlayId) + '\',\'' + escJs(secId) + '\',this.checked)">';
      h += '<span class="topbar-toggle-slider"></span>';
      h += '</label>';
      h += '<span class="fz-s" style="flex:1">' + (secDef.icon || '') + ' ' + escHtml(secDef.name) + '</span>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div class="flex gap8 mt12">';
    h += '<button class="btn btn-primary btn-sm btn-block" id="ovc-done">完了</button>';
    h += '<button class="btn btn-secondary btn-sm" id="ovc-reset">初期化</button>';
    h += '</div>';
    h += '</div>';

    div.innerHTML = h;
    document.body.appendChild(div);

    document.getElementById('ovc-done').onclick = function() {
      div.remove();
      if (typeof onSave === 'function') onSave();
    };

    document.getElementById('ovc-reset').onclick = function() {
      var key = 'overlayCustom_' + overlayId;
      localStorage.removeItem('dp_' + key);
      toast('初期設定に戻しました');
      div.remove();
      if (typeof onSave === 'function') onSave();
    };
  }

  window._ovcToggle = function(overlayId, secId, visible) {
    hp();
    var cfg = getOverlayCustomConfig(overlayId);
    cfg.visible[secId] = visible;
    saveOverlayCustomConfig(overlayId, cfg);
  };

  window._ovcMove = function(overlayId, secId, dir) {
    hp();
    var cfg = getOverlayCustomConfig(overlayId);
    var order = getOverlaySectionOrder(overlayId);
    var idx = order.indexOf(secId);
    if (idx < 0) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    var tmp = order[newIdx];
    order[newIdx] = order[idx];
    order[idx] = tmp;
    cfg.order = order;
    saveOverlayCustomConfig(overlayId, cfg);
    /* ダイアログ再描画 */
    document.querySelectorAll('.confirm-overlay').forEach(function(el) {
      if (el.querySelector('#overlay-custom-list')) el.remove();
    });
    openOverlayCustomizer(overlayId);
  };

  /* Expose */
  window.registerOverlaySections = registerOverlaySections;
  window.getOverlayCustomConfig = getOverlayCustomConfig;
  window.saveOverlayCustomConfig = saveOverlayCustomConfig;
  window.isOverlaySectionVisible = isOverlaySectionVisible;
  window.getOverlaySectionOrder = getOverlaySectionOrder;
  window.openOverlayCustomizer = openOverlayCustomizer;

})();
