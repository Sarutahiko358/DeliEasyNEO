/* ==========================================================
   DeliEasy v2 — js/overlay.js
   オーバーレイシステム — 編集モード＋基本操作対応
   ========================================================== */
(function(){
  'use strict';

  /* ---------- Overlay registry ---------- */
  var OVERLAYS = {
    earnInput:     { title: '✏️ 売上入力' },
    expenseInput:  { title: '💸 経費入力' },
    calendar:      { title: '📅 カレンダー' },
    stats:         { title: '📊 統計' },
    tax:           { title: '🧾 税金' },
    expenseManage: { title: '💰 経費管理' },
    pfManage:      { title: '📦 PF・カテゴリ管理' },
    theme:         { title: '🎨 テーマ' },
    settings:      { title: '⚙️ 設定' },
    help:          { title: '❓ ヘルプ' }
  };

  /* ---------- State ---------- */
  var _stack = [];

  /* ---------- Pull-to-refresh 制御 ---------- */
  function _disablePullToRefresh() {
    document.body.style.overscrollBehavior = 'none';
  }
  function _enablePullToRefresh() {
    document.body.style.overscrollBehavior = '';
  }

  /* ---------- Container refs ---------- */
  function _getContainer() { return document.getElementById('overlay-container'); }
  function _getBackdrop() { return document.getElementById('overlay-backdrop'); }

  /* ---------- Open ---------- */
  function openOverlay(id) {
    var def = OVERLAYS[id];
    if (!def) { console.warn('[Overlay] Unknown:', id); return; }

    var container = _getContainer();
    var backdrop = _getBackdrop();
    if (!container) return;

    var level = _stack.length + 1;
    if (level > 2) { _closeTopSheet(); level = _stack.length + 1; }

    var sheet = document.createElement('div');
    sheet.className = 'overlay-sheet';
    sheet.id = 'overlay-sheet-' + id;
    sheet.setAttribute('data-level', level);
    sheet.setAttribute('data-id', id);

    var customizable = ['calendar', 'stats', 'tax', 'expenseManage'];
    var actionsHtml = '';
    if (customizable.indexOf(id) >= 0) {
      actionsHtml = '<button class="overlay-back" onclick="openOverlayCustomizer(\'' + id + '\', function(){ var b=document.getElementById(\'overlay-body-' + id + '\'); if(b && typeof window[\'renderOverlay_' + id + '\']===\'function\') window[\'renderOverlay_' + id + '\'](b); })" style="font-size:.8rem" title="カスタマイズ">⚙️</button>';
    }

    sheet.innerHTML =
      '<div class="overlay-handle"></div>' +
      '<div class="overlay-header">' +
        '<button class="overlay-back" onclick="closeOverlay()">←</button>' +
        '<span class="overlay-title">' + escHtml(def.title) + '</span>' +
        '<div class="overlay-actions">' + actionsHtml + '</div>' +
      '</div>' +
      '<div class="overlay-body" id="overlay-body-' + id + '">' +
        '<div class="text-c c-muted fz-s" style="padding:60px 0">読み込み中...</div>' +
      '</div>';

    container.appendChild(sheet);
    container.classList.add('has-overlay');
    if (backdrop) backdrop.classList.add('visible');

    /* pull-to-refresh を無効化 */
    _disablePullToRefresh();

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { sheet.classList.add('open'); });
    });

    _stack.push({ id: id, level: level });
    _initInteractiveSwipe(sheet);
    _renderOverlayContent(id);

    if (typeof window.hideFab === 'function') window.hideFab();
  }

  /* ---------- Close ---------- */
  function closeOverlay() {
    if (_stack.length === 0) return;
    _closeTopSheet();
    if (_stack.length === 0) {
      var container = _getContainer();
      var backdrop = _getBackdrop();
      if (container) container.classList.remove('has-overlay');
      if (backdrop) { backdrop.classList.remove('visible'); backdrop.style.opacity = ''; }
      if (typeof window.showFab === 'function') window.showFab();
      /* pull-to-refresh を復活 */
      _enablePullToRefresh();
    }
  }

  function _closeTopSheet() {
    if (_stack.length === 0) return;
    var top = _stack.pop();
    var sheet = document.getElementById('overlay-sheet-' + top.id);
    if (sheet) {
      sheet.classList.remove('open');
      setTimeout(function() { sheet.remove(); }, 350);
    }
  }

  function closeAllOverlays() {
    while (_stack.length > 0) { _closeTopSheet(); }
    var container = _getContainer();
    var backdrop = _getBackdrop();
    if (container) container.classList.remove('has-overlay');
    if (backdrop) { backdrop.classList.remove('visible'); backdrop.style.opacity = ''; }
    if (typeof window.showFab === 'function') window.showFab();
    _enablePullToRefresh();
  }

  function isOverlayOpen() { return _stack.length > 0; }
  function getTopOverlayId() { return _stack.length > 0 ? _stack[_stack.length - 1].id : null; }

  /* ---------- Interactive swipe down to close ---------- */
  function _initInteractiveSwipe(sheet) {
    var body = sheet.querySelector('.overlay-body');
    var handle = sheet.querySelector('.overlay-handle');
    var header = sheet.querySelector('.overlay-header');
    var startY = 0;
    var currentY = 0;
    var isDragging = false;
    var canDrag = false;
    var sheetHeight = 0;
    var CLOSE_THRESHOLD = 0.2;
    var VELOCITY_THRESHOLD = 0.4;
    var startTime = 0;

    function isOnHandleOrHeader(target) {
      return target === handle || target === header ||
             handle.contains(target) || header.contains(target);
    }

    function onTouchStart(e) {
      var target = e.touches[0].target || e.target;
      /* ハンドル/ヘッダーからは常にドラッグ可能 */
      if (isOnHandleOrHeader(target)) {
        canDrag = true;
      } else {
        /* body内からはスクロール上端の時のみ */
        canDrag = body && body.scrollTop <= 2;
      }
      if (!canDrag) return;
      isDragging = false;
      startY = e.touches[0].clientY;
      currentY = startY;
      startTime = Date.now();
      sheetHeight = sheet.offsetHeight;
    }

    function onTouchMove(e) {
      if (!canDrag) return;
      currentY = e.touches[0].clientY;
      var dy = currentY - startY;

      /* 上方向は無視 */
      if (dy <= 0) {
        if (isDragging) {
          /* ドラッグ中に上に戻った場合はリセット */
          sheet.style.transform = '';
          var backdrop = _getBackdrop();
          if (backdrop) backdrop.style.opacity = '';
        }
        isDragging = false;
        return;
      }

      /* 5px以上動いたらドラッグ開始 */
      if (!isDragging && dy > 5) {
        /* ドラッグ開始時にbodyがスクロール途中ならキャンセル */
        if (body && body.scrollTop > 2 && !isOnHandleOrHeader(e.touches[0].target || e.target)) {
          canDrag = false;
          return;
        }
        isDragging = true;
        sheet.style.transition = 'none';
      }

      if (!isDragging) return;

      /* ブラウザのpull-to-refreshとスクロールを完全に止める */
      e.preventDefault();

      /* シートを追従移動 */
      sheet.style.transform = 'translateX(-50%) translateY(' + dy + 'px)';

      /* バックドロップの透明度も追従 */
      var backdrop = _getBackdrop();
      if (backdrop) {
        var progress = Math.min(dy / (sheetHeight * 0.5), 1);
        backdrop.style.opacity = 1 - progress * 0.7;
      }
    }

    function onTouchEnd() {
      if (!isDragging) {
        canDrag = false;
        return;
      }
      isDragging = false;
      canDrag = false;

      var dy = currentY - startY;
      var elapsed = Date.now() - startTime;
      var velocity = elapsed > 0 ? dy / elapsed : 0;

      var backdrop = _getBackdrop();

      if (dy > sheetHeight * CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        /* 閉じる */
        sheet.style.transition = 'transform .3s cubic-bezier(.28,.11,.32,1)';
        sheet.style.transform = 'translateX(-50%) translateY(100%)';
        if (backdrop) {
          backdrop.style.transition = 'opacity .3s';
          backdrop.style.opacity = '0';
        }
        setTimeout(function() {
          sheet.style.transition = '';
          sheet.style.transform = '';
          if (backdrop) { backdrop.style.transition = ''; backdrop.style.opacity = ''; }
          closeOverlay();
        }, 300);
      } else {
        /* 元に戻す */
        sheet.style.transition = 'transform .3s cubic-bezier(.28,.11,.32,1)';
        sheet.style.transform = '';
        if (backdrop) {
          backdrop.style.transition = 'opacity .3s';
          backdrop.style.opacity = '';
        }
        setTimeout(function() {
          sheet.style.transition = '';
          if (backdrop) backdrop.style.transition = '';
        }, 300);
      }
    }

    /* touchmove は passive: false にして preventDefault を呼べるようにする */
    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  /* ---------- Render content ---------- */
  function _renderOverlayContent(id) {
    var body = document.getElementById('overlay-body-' + id);
    if (!body) return;

    var fnName = 'renderOverlay_' + id;
    if (typeof window[fnName] === 'function') { window[fnName](body); return; }

    switch (id) {
      case 'theme':    _renderThemeOverlay(body); return;
    }

    body.innerHTML =
      '<div class="text-c" style="padding:60px 20px">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">🚧</div>' +
        '<div class="fz-s c-muted">このセクションは準備中です</div>' +
        '<div class="fz-xs c-muted mt8">' + escHtml(id) + '</div>' +
      '</div>';
  }

  /* ==========================================================
     テーマオーバーレイ
     ========================================================== */
  function _renderThemeOverlay(body) {
    var currentStyle = typeof getThemeStyle === 'function' ? getThemeStyle() : 'minimal';
    var currentColor = typeof getThemeColor === 'function' ? getThemeColor() : 'blue-light';

    var styles = [
      { id: 'minimal', name: 'ミニマル',   emoji: '✨', desc: 'Apple風・フロストガラス・大きな角丸' },
      { id: 'flat',    name: 'フラット',   emoji: '📐', desc: 'ボーダーで区切るクリーンなデザイン' },
      { id: 'soft',    name: 'ソフト',     emoji: '☁️', desc: 'ニューモーフィズム風の柔らかい立体感' },
      { id: 'cyber',   name: 'サイバー',   emoji: '🔮', desc: 'ネオン発光・シャープなSFデザイン' },
      { id: 'pop',     name: 'ポップ',     emoji: '🎈', desc: 'グラデーション・丸い形・元気で明るい' },
      { id: 'wabi',    name: '和モダン',   emoji: '🍵', desc: '余白重視・繊細な線・日本的な落ち着き' },
      { id: 'brutal',  name: 'ブルータル', emoji: '🔨', desc: '太いボーダー・大胆なフォント・インパクト' },
      { id: 'glass',   name: 'グラス',     emoji: '🪟', desc: '全面フロストガラス・透け感とブラー' },
      { id: 'classic', name: 'クラシック', emoji: '📖', desc: '伝統的なWebデザイン・読みやすさ重視' },
      { id: 'compact', name: 'コンパクト', emoji: '📱', desc: '情報密度最大・一画面に多く表示' }
    ];

    var lightColors = [
      { id: 'blue-light',   name: 'ブルー',     dot: '#007aff' },
      { id: 'green-light',  name: 'グリーン',   dot: '#34c759' },
      { id: 'pink-light',   name: 'ピンク',     dot: '#ff2d55' },
      { id: 'orange-light', name: 'オレンジ',   dot: '#ff9500' },
      { id: 'purple-light', name: 'パープル',   dot: '#af52de' },
      { id: 'teal-light',   name: 'ティール',   dot: '#00c7be' },
      { id: 'red-light',    name: 'レッド',     dot: '#ff3b30' },
      { id: 'gold-light',   name: 'ゴールド',   dot: '#c8a04a' },
      { id: 'sakura-light', name: 'サクラ',     dot: '#d4627b' },
      { id: 'matcha-light', name: '抹茶',       dot: '#5a8c51' },
      { id: 'ai-light',     name: '藍',         dot: '#3a5f8a' },
      { id: 'shu-light',    name: '朱',         dot: '#c8503c' }
    ];

    var darkColors = [
      { id: 'blue-dark',    name: 'ダークブルー',   dot: '#0a84ff' },
      { id: 'green-dark',   name: 'ダークグリーン', dot: '#30d158' },
      { id: 'pink-dark',    name: 'ダークピンク',   dot: '#ff375f' },
      { id: 'orange-dark',  name: 'ダークオレンジ', dot: '#ff9f0a' },
      { id: 'purple-dark',  name: 'ダークパープル', dot: '#bf5af2' },
      { id: 'midnight',     name: 'ミッドナイト',   dot: '#5e5ce6' },
      { id: 'sumi-dark',    name: '墨',             dot: '#c8a86c' },
      { id: 'charcoal',     name: 'チャコール',     dot: '#8e8e93' }
    ];

    var html = '';

    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 デザインスタイル</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    styles.forEach(function(s) {
      var isA = s.id === currentStyle;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:14px 8px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeStyle(\'' + s.id + '\');_refreshThemeOverlay()">';
      html += '<span style="font-size:1.5rem">' + s.emoji + '</span>';
      html += '<span style="font-size:.8125rem;font-weight:' + (isA ? '700' : '500') + '">' + escHtml(s.name) + '</span>';
      html += '<span style="font-size:.6rem;color:var(--c-tx-muted);line-height:1.3;text-align:center">' + escHtml(s.desc) + '</span>';
      html += '</button>';
    });
    html += '</div></div></div>';

    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">🎨 カラーパレット</div>';

    html += '<div class="fz-xs fw6 c-secondary mb8">☀️ ライト（12色）</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">';
    lightColors.forEach(function(c) {
      var isA = c.id === currentColor;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:10px 4px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()">';
      html += '<span style="display:block;width:28px;height:28px;border-radius:50%;background:' + c.dot + ';';
      html += 'border:3px solid ' + (isA ? '#fff' : 'rgba(0,0,0,.08)') + ';';
      html += 'box-shadow:' + (isA ? '0 0 0 2px var(--c-primary)' : 'none') + '"></span>';
      html += '<span style="font-size:.625rem;font-weight:' + (isA ? '700' : '400') + ';white-space:nowrap">' + escHtml(c.name) + '</span>';
      html += '</button>';
    });
    html += '</div>';

    html += '<div class="fz-xs fw6 c-secondary mb8">🌙 ダーク（8色）</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px">';
    darkColors.forEach(function(c) {
      var isA = c.id === currentColor;
      html += '<button style="display:flex;flex-direction:column;align-items:center;gap:4px;';
      html += 'padding:10px 4px;border-radius:var(--ds-radius-sm);cursor:pointer;';
      html += 'border:2px solid ' + (isA ? 'var(--c-primary)' : 'transparent') + ';';
      html += 'background:' + (isA ? 'var(--c-primary-light)' : 'var(--c-fill-quaternary)') + ';';
      html += 'color:var(--c-tx);transition:all .15s;-webkit-tap-highlight-color:transparent"';
      html += ' onclick="setThemeColor(\'' + c.id + '\');_refreshThemeOverlay()">';
      html += '<span style="display:block;width:28px;height:28px;border-radius:50%;background:' + c.dot + ';';
      html += 'border:3px solid rgba(255,255,255,' + (isA ? '.9' : '.15') + ');';
      html += 'box-shadow:' + (isA ? '0 0 0 2px var(--c-primary)' : 'none') + '"></span>';
      html += '<span style="font-size:.625rem;font-weight:' + (isA ? '700' : '400') + ';white-space:nowrap">' + escHtml(c.name) + '</span>';
      html += '</button>';
    });
    html += '</div></div></div>';

    html += '<div class="card mb12"><div class="card-body text-c">';
    html += '<div class="fz-xs c-muted">現在のテーマ</div>';
    var activeStyleName = currentStyle;
    styles.forEach(function(s) { if (s.id === currentStyle) activeStyleName = s.emoji + ' ' + s.name; });
    var activeColorName = currentColor;
    lightColors.concat(darkColors).forEach(function(c) { if (c.id === currentColor) activeColorName = c.name; });
    html += '<div class="fz-m fw7 mt4" style="color:var(--c-primary)">' + escHtml(activeStyleName) + ' × ' + escHtml(activeColorName) + '</div>';
    html += '<div class="fz-xs c-muted mt8">10スタイル × 20カラー = 200通りの組み合わせ</div>';
    html += '</div></div>';

    body.innerHTML = html;
  }

  window._refreshThemeOverlay = function() {
    var body = document.getElementById('overlay-body-theme');
    if (body) _renderThemeOverlay(body);
  };

  /* ===== Overlay Manager (Widget-style editing) ===== */
  function openOverlayManager() {
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.id = 'overlay-manager-dialog';
    div.style.zIndex = '9500';

    var customOverlays = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];

    var h = '<div class="confirm-box" style="max-width:380px;max-height:85vh;overflow-y:auto;text-align:left">';
    h += '<h3 class="fz-s fw6 mb4 text-c">📐 オーバーレイ管理</h3>';
    h += '<div class="fz-xs c-muted mb12 text-c">ホーム画面のウィジェット編集のように、オーバーレイを管理できます</div>';

    /* Built-in overlays — open/customize */
    h += '<div class="fz-xs fw6 c-secondary mb8">組み込みオーバーレイ</div>';
    var builtinIds = ['calendar', 'stats', 'tax', 'expenseManage', 'pfManage'];
    var customizableIds = ['calendar', 'stats', 'tax', 'expenseManage'];
    builtinIds.forEach(function(oid) {
      var def = OVERLAYS[oid];
      if (!def) return;
      var canCustomize = customizableIds.indexOf(oid) >= 0;
      h += '<div class="overlay-mgr-item">';
      h += '<span class="fz-s" style="flex:1">' + escHtml(def.title) + '</span>';
      h += '<button class="btn btn-primary btn-xs" onclick="document.getElementById(\'overlay-manager-dialog\').remove();openOverlay(\'' + oid + '\')">開く</button>';
      if (canCustomize) {
        h += '<button class="btn btn-secondary btn-xs" onclick="document.getElementById(\'overlay-manager-dialog\').remove();openOverlay(\'' + oid + '\');setTimeout(function(){openOverlayCustomizer(\'' + oid + '\',function(){var b=document.getElementById(\'overlay-body-' + oid + '\');if(b&&typeof window[\'renderOverlay_' + oid + '\']===\'function\')window[\'renderOverlay_' + oid + '\'](b);})},400)">⚙️ カスタマイズ</button>';
      }
      h += '</div>';
    });

    /* Custom overlays — reorder, edit, delete */
    h += '<div class="fz-xs fw6 c-secondary mb8 mt12">カスタムオーバーレイ</div>';
    if (customOverlays.length === 0) {
      h += '<div class="fz-xs c-muted mb8" style="padding:8px">カスタムオーバーレイはまだありません</div>';
    } else {
      h += '<div id="overlay-mgr-custom-list">';
      customOverlays.forEach(function(co, idx) {
        h += '<div class="overlay-mgr-item overlay-mgr-wobble" data-co-idx="' + idx + '">';
        h += '<span style="font-size:1rem;flex-shrink:0">' + escHtml(co.icon) + '</span>';
        h += '<span class="fz-s" style="flex:1">' + escHtml(co.title) + '</span>';
        /* Move buttons */
        if (idx > 0) h += '<button class="btn btn-ghost btn-xs" onclick="_ovmMoveCustom(' + idx + ',-1)" style="padding:2px 6px">▲</button>';
        if (idx < customOverlays.length - 1) h += '<button class="btn btn-ghost btn-xs" onclick="_ovmMoveCustom(' + idx + ',1)" style="padding:2px 6px">▼</button>';
        h += '<button class="btn btn-primary btn-xs" onclick="document.getElementById(\'overlay-manager-dialog\').remove();openCustomOverlay(\'' + escJs(co.id) + '\')">開く</button>';
        h += '<button class="btn btn-secondary btn-xs" onclick="document.getElementById(\'overlay-manager-dialog\').remove();_editCustomOverlaySettings(\'' + escJs(co.id) + '\')">⚙️</button>';
        h += '<button class="btn btn-danger btn-xs" onclick="_ovmDeleteCustom(\'' + escJs(co.id) + '\')">✕</button>';
        h += '</div>';
      });
      h += '</div>';
    }

    /* Add new */
    h += '<button class="btn btn-primary btn-sm btn-block mt8" onclick="document.getElementById(\'overlay-manager-dialog\').remove();openCreateCustomOverlayDialog()">＋ 新しいオーバーレイを追加</button>';

    h += '<button class="btn btn-ghost btn-block mt12" onclick="this.closest(\'.confirm-overlay\').remove()">閉じる</button>';
    h += '</div>';

    div.innerHTML = h;
    document.body.appendChild(div);
  }

  /* Manager helpers */
  window._ovmMoveCustom = function(idx, dir) {
    hp();
    var list = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    var tmp = list[newIdx];
    list[newIdx] = list[idx];
    list[idx] = tmp;
    if (typeof saveCustomOverlays === 'function') saveCustomOverlays(list);
    /* Refresh dialog */
    var existing = document.getElementById('overlay-manager-dialog');
    if (existing) existing.remove();
    openOverlayManager();
  };

  window._ovmDeleteCustom = function(coId) {
    customConfirm('このカスタムオーバーレイを削除しますか？', function() {
      if (typeof deleteCustomOverlay === 'function') deleteCustomOverlay(coId);
      toast('🗑 削除しました');
      var existing = document.getElementById('overlay-manager-dialog');
      if (existing) existing.remove();
      openOverlayManager();
    });
  };

  /* ---------- Expose ---------- */
  window.OVERLAYS = OVERLAYS;
  window.openOverlay = openOverlay;
  window.closeOverlay = closeOverlay;
  window.closeAllOverlays = closeAllOverlays;
  window.isOverlayOpen = isOverlayOpen;
  window.getTopOverlayId = getTopOverlayId;
  window.openOverlayManager = openOverlayManager;

})();
