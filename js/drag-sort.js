/* ==========================================================
   DeliEasy v2 — js/drag-sort.js
   汎用ドラッグ並び替えモジュール（長押し→ドラッグ→並び替え）
   ========================================================== */
(function(){
  'use strict';

  /**
   * initDragSort — 長押しドラッグ並び替えを初期化
   *
   * @param {Object} opts 設定オブジェクト
   * @param {string} opts.listId           — リストコンテナ要素のID
   * @param {string} opts.itemSelector     — 個々のアイテムセレクタ (デフォルト: '.drag-item')
   * @param {string} [opts.handleSelector] — ハンドルセレクタ（省略時はアイテム全体が掴める）
   * @param {string} [opts.dataAttr]       — 並び順を特定するdata属性名（例: 'data-sidebar-id'）
   * @param {number} [opts.longPressMs]    — 長押し判定ミリ秒（デフォルト: 400）
   * @param {string} [opts.draggingClass]  — ドラッグ中のCSSクラス（デフォルト: 'dragging'）
   * @param {string} [opts.placeholderClass] — プレースホルダーのCSSクラス（デフォルト: 'drag-placeholder'）
   * @param {Array<string>} [opts.ignoreSelectors] — これらにマッチする要素からのタッチは無視
   * @param {Function} [opts.onReorder]    — function(newOrder: string[]) 並び替え完了時コールバック
   * @param {Function} [opts.onDragStart]  — function(dragItem: Element) ドラッグ開始時コールバック
   * @param {Function} [opts.onDragEnd]    — function(dragItem: Element) ドラッグ終了時コールバック
   * @param {boolean}  [opts.grid]         — true の場合、2Dグリッド配置（左右方向も考慮）
   * @param {string}   [opts.addButtonSelector] — グリッド内の追加ボタンセレクタ（グリッドモード時、この要素の前に挿入）
   * @returns {Function|null} cleanup関数（イベントリスナーの解除）。listが見つからない場合はnull
   */
  function initDragSort(opts) {
    var list = document.getElementById(opts.listId);
    if (!list) return null;

    var LONG_PRESS_MS = opts.longPressMs || 400;
    var itemSel = opts.itemSelector || '.drag-item';
    var handleSel = opts.handleSelector || null;
    var draggingCls = opts.draggingClass || 'dragging';
    var placeholderCls = opts.placeholderClass || 'drag-placeholder';
    var ignoreSels = opts.ignoreSelectors || [];
    var isGrid = !!opts.grid;
    var addBtnSel = opts.addButtonSelector || null;

    var longPressTimer = null;
    var dragItem = null;
    var placeholder = null;
    var startY = 0, startX = 0;
    var offsetX = 0, offsetY = 0;
    var isDragging = false;
    var isMouseDown = false;
    var _txOff = { x: 0, y: 0 };
    var _scrollContainer = null;
    var _prevOverflow = '';

    /* === 内部ヘルパー === */

    function _getFixedOffset(el) {
      var p = el.parentElement;
      while (p && p !== document.body && p !== document.documentElement) {
        var cs = window.getComputedStyle(p);
        if (cs.transform && cs.transform !== 'none') {
          var r = p.getBoundingClientRect();
          return { x: r.left, y: r.top };
        }
        p = p.parentElement;
      }
      return { x: 0, y: 0 };
    }

    function _findScrollParent(el) {
      var p = el.parentElement;
      while (p && p !== document.body) {
        var cs = window.getComputedStyle(p);
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return p;
        p = p.parentElement;
      }
      return null;
    }

    function getItems() {
      return Array.from(list.querySelectorAll(itemSel));
    }

    function _getXY(e) {
      if (e.touches && e.touches.length > 0)
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function _shouldIgnore(target) {
      for (var i = 0; i < ignoreSels.length; i++) {
        if (target.closest && target.closest(ignoreSels[i])) return true;
      }
      return false;
    }

    /* === ポインターイベントハンドラ === */

    function onPointerDown(e, isMouse) {
      if (_shouldIgnore(e.target)) return;
      if (handleSel && !(e.target.closest && e.target.closest(handleSel))) return;
      var item = e.target.closest(itemSel);
      if (!item) return;
      if (isMouse && e.button !== 0) return;

      var pos = _getXY(e);
      startX = pos.x;
      startY = pos.y;
      if (isMouse) isMouseDown = true;

      longPressTimer = setTimeout(function() {
        isDragging = true;
        dragItem = item;

        // グローバルフラグ（overlay.jsのスワイプ干渉防止）
        if (typeof window !== 'undefined') window.__widgetDragActive = true;

        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        _scrollContainer = _findScrollParent(list);
        if (_scrollContainer) {
          _prevOverflow = _scrollContainer.style.overflowY;
          _scrollContainer.style.overflowY = 'hidden';
        }

        var rect = dragItem.getBoundingClientRect();
        _txOff = _getFixedOffset(dragItem);
        offsetX = startX - rect.left;
        offsetY = startY - rect.top;

        // プレースホルダー作成
        placeholder = document.createElement('div');
        placeholder.className = placeholderCls;
        placeholder.style.height = rect.height + 'px';
        if (isGrid) {
          // グリッドモードではサイズクラスをコピー
          var itemClasses = dragItem.className.split(' ').filter(function(c) {
            return c.indexOf('widget-') === 0 && c !== 'widget';
          });
          itemClasses.forEach(function(c) { placeholder.classList.add(c); });
        }
        list.insertBefore(placeholder, dragItem);

        // ドラッグアイテムをfixed配置
        dragItem.classList.add(draggingCls);
        dragItem.style.position = 'fixed';
        dragItem.style.left = (rect.left - _txOff.x) + 'px';
        dragItem.style.top = (rect.top - _txOff.y) + 'px';
        dragItem.style.width = rect.width + 'px';
        if (isGrid) dragItem.style.height = rect.height + 'px';
        dragItem.style.zIndex = '10000';
        dragItem.style.pointerEvents = 'none';

        if (navigator.vibrate) navigator.vibrate(30);
        if (typeof opts.onDragStart === 'function') opts.onDragStart(dragItem);
      }, LONG_PRESS_MS);
    }

    function onPointerMove(e) {
      var pos = _getXY(e);

      // ドラッグ開始前に一定距離移動したら長押しキャンセル
      if (!isDragging && longPressTimer) {
        if (Math.abs(pos.x - startX) > 8 || Math.abs(pos.y - startY) > 8) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !dragItem) return;
      if (e.preventDefault) e.preventDefault();

      // ドラッグアイテムの位置更新
      if (isGrid) {
        dragItem.style.left = (pos.x - offsetX - _txOff.x) + 'px';
      }
      dragItem.style.top = (pos.y - offsetY - _txOff.y) + 'px';

      // プレースホルダーの挿入位置を更新
      var items = getItems().filter(function(el) { return el !== dragItem; });
      var addBtn = addBtnSel ? list.querySelector(addBtnSel) : null;
      var inserted = false;

      if (isGrid) {
        // 2Dグリッド: 中心座標で判定
        for (var i = 0; i < items.length; i++) {
          var r = items[i].getBoundingClientRect();
          var centerX = r.left + r.width / 2;
          var centerY = r.top + r.height / 2;
          if (pos.y < centerY && pos.x < centerX + r.width) {
            list.insertBefore(placeholder, items[i]);
            inserted = true;
            break;
          }
        }
        if (!inserted && addBtn) {
          list.insertBefore(placeholder, addBtn);
        }
      } else {
        // 1Dリスト: Y座標のみで判定
        for (var j = 0; j < items.length; j++) {
          var r2 = items[j].getBoundingClientRect();
          if (pos.y < r2.top + r2.height / 2) {
            list.insertBefore(placeholder, items[j]);
            inserted = true;
            break;
          }
        }
        if (!inserted) list.appendChild(placeholder);
      }
    }

    function _cleanup() {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      isMouseDown = false;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      if (_scrollContainer) {
        _scrollContainer.style.overflowY = _prevOverflow;
        _scrollContainer = null;
      }

      if (typeof window !== 'undefined') window.__widgetDragActive = false;
    }

    function onPointerEnd() {
      _cleanup();

      if (!isDragging || !dragItem) { isDragging = false; return; }

      // ドラッグアイテムのスタイルをリセット
      dragItem.classList.remove(draggingCls);
      dragItem.style.position = '';
      dragItem.style.left = '';
      dragItem.style.top = '';
      dragItem.style.width = '';
      dragItem.style.height = '';
      dragItem.style.zIndex = '';
      dragItem.style.pointerEvents = '';

      // プレースホルダーの位置にアイテムを挿入
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(dragItem, placeholder);
        placeholder.remove();
      }
      placeholder = null;

      // 新しい順序をコールバックに通知
      if (typeof opts.onReorder === 'function' && opts.dataAttr) {
        var newOrder = [];
        getItems().forEach(function(el) {
          var val = el.getAttribute(opts.dataAttr);
          if (val !== null) newOrder.push(val);
        });
        opts.onReorder(newOrder);
      } else if (typeof opts.onReorder === 'function') {
        // dataAttrなしの場合はインデックス配列を返す
        opts.onReorder(getItems());
      }

      var savedDragItem = dragItem;
      dragItem = null;
      isDragging = false;

      if (typeof opts.onDragEnd === 'function') opts.onDragEnd(savedDragItem);
    }

    function onPointerCancel() {
      _cleanup();
      if (dragItem) {
        dragItem.classList.remove(draggingCls);
        dragItem.style.position = '';
        dragItem.style.left = '';
        dragItem.style.top = '';
        dragItem.style.width = '';
        dragItem.style.height = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        if (placeholder) placeholder.remove();
      }
      dragItem = null;
      placeholder = null;
      isDragging = false;
    }

    /* === イベントリスナー登録 === */

    // タッチ
    list.addEventListener('touchstart', function(e) { onPointerDown(e, false); }, { passive: true });
    list.addEventListener('touchmove', function(e) { onPointerMove(e); }, { passive: false });
    list.addEventListener('touchend', function() { onPointerEnd(); }, { passive: true });
    list.addEventListener('touchcancel', function() { onPointerCancel(); }, { passive: true });

    // マウス
    var onDocMouseMove = function(e) {
      if (!isMouseDown && !isDragging) return;
      onPointerMove(e);
    };
    var onDocMouseUp = function() {
      if (!isMouseDown && !isDragging) return;
      onPointerEnd();
    };
    list.addEventListener('mousedown', function(e) { onPointerDown(e, true); });
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    list.addEventListener('contextmenu', function(e) {
      if (isDragging) e.preventDefault();
    });

    // クリーンアップ関数を返す
    return function destroyDragSort() {
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);
    };
  }

  /* === グローバル公開 === */
  window.initDragSort = initDragSort;

})();
