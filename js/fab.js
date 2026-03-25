/* ==========================================================
   DeliEasy v2 — js/fab.js
   Floating Action Button + ミニメニュー
   ========================================================== */
(function(){
  'use strict';

  var _isOpen = false;
  var _isHidden = false;

  /* ---------- Actions ---------- */
  var FAB_ACTIONS = [
    { id: 'earnInput',    icon: '✏️', label: '売上入力',  overlay: 'earnInput' },
    { id: 'expenseInput', icon: '💸', label: '経費入力',  overlay: 'expenseInput' }
  ];

  /* ---------- Render ---------- */
  function renderFab() {
    var container = document.getElementById('fab-container');
    if (!container) return;

    var html = '';

    /* Mini buttons */
    html += '<div class="fab-mini-group" id="fab-mini-group">';
    /* Render in reverse so top item appears furthest from FAB */
    for (var i = FAB_ACTIONS.length - 1; i >= 0; i--) {
      var action = FAB_ACTIONS[i];
      html += '<button class="fab-mini" data-overlay="' + action.overlay + '">';
      html += '<span class="fab-mini-icon">' + action.icon + '</span>';
      html += '<span>' + escHtml(action.label) + '</span>';
      html += '</button>';
    }
    html += '</div>';

    /* Main FAB */
    html += '<button class="fab-main" id="fab-main" aria-label="メニューを開く">＋</button>';

    container.innerHTML = html;
    container.classList.add('right');

    /* Bind events */
    document.getElementById('fab-main').addEventListener('click', toggleFabMenu);

    var minis = container.querySelectorAll('.fab-mini');
    minis.forEach(function(el) {
      el.addEventListener('click', function() {
        var overlayId = el.getAttribute('data-overlay');
        closeFabMenu();
        if (overlayId && typeof window.openOverlay === 'function') {
          window.openOverlay(overlayId);
        }
      });
    });
  }

  /* ---------- Toggle mini menu ---------- */
  function toggleFabMenu() {
    hp();
    if (_isOpen) closeFabMenu();
    else openFabMenu();
  }

  function openFabMenu() {
    _isOpen = true;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.add('open');
    if (group) group.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeFabMenu() {
    _isOpen = false;
    var main = document.getElementById('fab-main');
    var group = document.getElementById('fab-mini-group');
    var backdrop = document.getElementById('fab-backdrop');
    if (main) main.classList.remove('open');
    if (group) group.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  /* ---------- Show / Hide FAB ---------- */
  function showFab() {
    _isHidden = false;
    var container = document.getElementById('fab-container');
    if (container) container.classList.remove('hidden');
  }

  function hideFab() {
    _isHidden = true;
    closeFabMenu();
    var container = document.getElementById('fab-container');
    if (container) container.classList.add('hidden');
  }

  function isFabOpen() { return _isOpen; }

  /* ---------- Expose ---------- */
  window.renderFab = renderFab;
  window.toggleFabMenu = toggleFabMenu;
  window.openFabMenu = openFabMenu;
  window.closeFabMenu = closeFabMenu;
  window.showFab = showFab;
  window.hideFab = hideFab;
  window.isFabOpen = isFabOpen;

})();
