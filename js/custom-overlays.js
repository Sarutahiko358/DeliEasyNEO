/* ==========================================================
   DeliEasy v2 — js/custom-overlays.js
   ユーザー定義カスタムオーバーレイ
   ========================================================== */
(function(){
  'use strict';

  var CUSTOM_OVERLAY_TYPES = [
    {
      id: 'memo',
      name: 'メモ帳',
      icon: '📝',
      desc: '自由にメモを書ける画面',
      render: _renderMemoOverlay
    },
    {
      id: 'checklist',
      name: 'チェックリスト',
      icon: '✅',
      desc: 'タスク管理用チェックリスト',
      render: _renderChecklistOverlay
    },
    {
      id: 'links',
      name: 'リンク集',
      icon: '🔗',
      desc: 'よく使うURLをまとめる',
      render: _renderLinksOverlay
    }
  ];

  function getCustomOverlays() {
    return S.g('customOverlays', []);
  }

  function saveCustomOverlays(list) {
    S.s('customOverlays', list);
  }

  function createCustomOverlay(type, title, icon) {
    var list = getCustomOverlays();
    var id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    var overlay = {
      id: id,
      type: type,
      title: title || 'カスタム',
      icon: icon || '📄',
      data: {}
    };
    list.push(overlay);
    saveCustomOverlays(list);
    return overlay;
  }

  function deleteCustomOverlay(id) {
    var list = getCustomOverlays().filter(function(o) { return o.id !== id; });
    saveCustomOverlays(list);
  }

  function openCustomOverlay(id) {
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { overlay = list[i]; break; }
    }
    if (!overlay) { toast('オーバーレイが見つかりません'); return; }

    var container = document.getElementById('overlay-container');
    var backdrop = document.getElementById('overlay-backdrop');
    if (!container) return;

    var sheet = document.createElement('div');
    sheet.className = 'overlay-sheet';
    sheet.id = 'overlay-sheet-' + id;
    sheet.setAttribute('data-level', '1');
    sheet.setAttribute('data-id', id);

    sheet.innerHTML =
      '<div class="overlay-handle"></div>' +
      '<div class="overlay-header">' +
        '<button class="overlay-back" onclick="closeOverlay()">←</button>' +
        '<span class="overlay-title">' + escHtml(overlay.icon + ' ' + overlay.title) + '</span>' +
        '<div class="overlay-actions">' +
          '<button class="overlay-back" onclick="_editCustomOverlaySettings(\'' + escJs(id) + '\')" style="font-size:.8rem">⚙️</button>' +
        '</div>' +
      '</div>' +
      '<div class="overlay-body" id="overlay-body-' + id + '"></div>';

    container.appendChild(sheet);
    container.classList.add('has-overlay');
    if (backdrop) backdrop.classList.add('visible');

    document.body.style.overscrollBehavior = 'none';

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { sheet.classList.add('open'); });
    });

    var body = document.getElementById('overlay-body-' + id);
    var typeDef = null;
    for (var j = 0; j < CUSTOM_OVERLAY_TYPES.length; j++) {
      if (CUSTOM_OVERLAY_TYPES[j].id === overlay.type) { typeDef = CUSTOM_OVERLAY_TYPES[j]; break; }
    }
    if (typeDef && typeof typeDef.render === 'function') {
      typeDef.render(body, overlay);
    } else {
      body.innerHTML = '<div class="text-c c-muted fz-s" style="padding:40px">不明なタイプ: ' + escHtml(overlay.type) + '</div>';
    }

    if (typeof hideFab === 'function') hideFab();
  }

  /* --- メモ帳レンダラー --- */
  function _renderMemoOverlay(body, overlay) {
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<textarea class="input" id="custom-memo-text" placeholder="メモを入力..." style="min-height:200px;resize:vertical">' + escHtml(overlay.data.text || '') + '</textarea>';
    html += '<button class="btn btn-primary btn-sm btn-block mt8" onclick="_saveCustomMemo(\'' + escJs(overlay.id) + '\')">保存</button>';
    html += '</div></div>';
    body.innerHTML = html;
  }

  window._saveCustomMemo = function(id) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        var el = document.getElementById('custom-memo-text');
        list[i].data.text = el ? el.value : '';
        break;
      }
    }
    saveCustomOverlays(list);
    toast('✅ メモを保存しました');
  };

  /* --- チェックリストレンダラー --- */
  function _renderChecklistOverlay(body, overlay) {
    var items = overlay.data.items || [];
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="flex gap8 mb12">';
    html += '<input type="text" class="input" id="custom-cl-input" placeholder="新しいタスク" style="flex:1">';
    html += '<button class="btn btn-primary btn-sm" onclick="_addChecklistItem(\'' + escJs(overlay.id) + '\')">追加</button>';
    html += '</div>';
    items.forEach(function(item, idx) {
      html += '<div class="flex items-center gap8 mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">';
      html += '<input type="checkbox" ' + (item.done ? 'checked' : '') + ' onchange="_toggleChecklistItem(\'' + escJs(overlay.id) + '\',' + idx + ',this.checked)">';
      html += '<span class="fz-s" style="flex:1;' + (item.done ? 'text-decoration:line-through;opacity:.5' : '') + '">' + escHtml(item.text) + '</span>';
      html += '<button class="btn btn-danger btn-xs" onclick="_deleteChecklistItem(\'' + escJs(overlay.id) + '\',' + idx + ')">✕</button>';
      html += '</div>';
    });
    html += '</div></div>';
    body.innerHTML = html;
  }

  window._addChecklistItem = function(id) {
    var input = document.getElementById('custom-cl-input');
    if (!input || !input.value.trim()) return;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (!list[i].data.items) list[i].data.items = [];
        list[i].data.items.push({ text: input.value.trim(), done: false });
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  window._toggleChecklistItem = function(id, idx, done) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.items && list[i].data.items[idx]) {
        list[i].data.items[idx].done = done;
        saveCustomOverlays(list);
        return;
      }
    }
  };

  window._deleteChecklistItem = function(id, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.items) {
        list[i].data.items.splice(idx, 1);
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderChecklistOverlay(body, list[i]);
        return;
      }
    }
  };

  /* --- リンク集レンダラー --- */
  function _renderLinksOverlay(body, overlay) {
    var links = overlay.data.links || [];
    var html = '';
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="flex gap8 mb8">';
    html += '<input type="text" class="input" id="custom-link-name" placeholder="名前" style="flex:1">';
    html += '</div>';
    html += '<div class="flex gap8 mb12">';
    html += '<input type="url" class="input" id="custom-link-url" placeholder="https://..." style="flex:1">';
    html += '<button class="btn btn-primary btn-sm" onclick="_addLink(\'' + escJs(overlay.id) + '\')">追加</button>';
    html += '</div>';
    links.forEach(function(link, idx) {
      html += '<div class="flex items-center gap8 mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">';
      html += '<a href="' + escHtml(link.url) + '" target="_blank" rel="noopener" class="fz-s c-primary" style="flex:1;text-decoration:none">' + escHtml(link.name || link.url) + '</a>';
      html += '<button class="btn btn-danger btn-xs" onclick="_deleteLink(\'' + escJs(overlay.id) + '\',' + idx + ')">✕</button>';
      html += '</div>';
    });
    html += '</div></div>';
    body.innerHTML = html;
  }

  window._addLink = function(id) {
    var nameEl = document.getElementById('custom-link-name');
    var urlEl = document.getElementById('custom-link-url');
    if (!urlEl || !urlEl.value.trim()) return;
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        if (!list[i].data.links) list[i].data.links = [];
        list[i].data.links.push({ name: nameEl ? nameEl.value.trim() : '', url: urlEl.value.trim() });
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderLinksOverlay(body, list[i]);
        return;
      }
    }
  };

  window._deleteLink = function(id, idx) {
    var list = getCustomOverlays();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id && list[i].data.links) {
        list[i].data.links.splice(idx, 1);
        saveCustomOverlays(list);
        var body = document.getElementById('overlay-body-' + id);
        if (body) _renderLinksOverlay(body, list[i]);
        return;
      }
    }
  };

  /* --- カスタムオーバーレイ設定編集 --- */
  window._editCustomOverlaySettings = function(id) {
    var list = getCustomOverlays();
    var overlay = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { overlay = list[i]; break; }
    }
    if (!overlay) return;

    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.style.zIndex = '9500';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:320px;text-align:left">' +
        '<h3 class="fz-s fw6 mb12 text-c">オーバーレイ設定</h3>' +
        '<div class="input-group"><label class="input-label">タイトル</label>' +
          '<input type="text" class="input" id="co-edit-title" value="' + escHtml(overlay.title) + '"></div>' +
        '<div class="input-group"><label class="input-label">アイコン（絵文字）</label>' +
          '<input type="text" class="input" id="co-edit-icon" value="' + escHtml(overlay.icon) + '" maxlength="2"></div>' +
        '<div class="flex gap8 mt12">' +
          '<button class="btn btn-primary btn-sm" id="co-edit-save">保存</button>' +
          '<button class="btn btn-secondary btn-sm" id="co-edit-cancel">閉じる</button>' +
          '<button class="btn btn-danger btn-sm" id="co-edit-delete">削除</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);

    document.getElementById('co-edit-save').onclick = function() {
      overlay.title = document.getElementById('co-edit-title').value.trim() || 'カスタム';
      overlay.icon = document.getElementById('co-edit-icon').value.trim() || '📄';
      saveCustomOverlays(list);
      div.remove();
      toast('✅ 設定を保存しました');
      var titleEl = document.querySelector('#overlay-sheet-' + id + ' .overlay-title');
      if (titleEl) titleEl.textContent = overlay.icon + ' ' + overlay.title;
    };
    document.getElementById('co-edit-cancel').onclick = function() { div.remove(); };
    document.getElementById('co-edit-delete').onclick = function() {
      customConfirm('このオーバーレイを削除しますか？', function() {
        deleteCustomOverlay(id);
        div.remove();
        closeOverlay();
        toast('🗑 削除しました');
      });
    };
  };

  /* --- カスタムオーバーレイ作成ダイアログ --- */
  function openCreateCustomOverlayDialog(onCreated) {
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    var h = '<div class="confirm-box" style="max-width:340px;text-align:left">';
    h += '<h3 class="fz-s fw6 mb12 text-c">新しいオーバーレイを作成</h3>';
    h += '<div class="input-group"><label class="input-label">タイトル</label>';
    h += '<input type="text" class="input" id="co-new-title" placeholder="例: メモ帳"></div>';
    h += '<div class="input-group"><label class="input-label">アイコン（絵文字）</label>';
    h += '<input type="text" class="input" id="co-new-icon" placeholder="📝" maxlength="2"></div>';
    h += '<div class="input-group"><label class="input-label">種類</label>';
    h += '<select class="input" id="co-new-type">';
    CUSTOM_OVERLAY_TYPES.forEach(function(t) {
      h += '<option value="' + escHtml(t.id) + '">' + t.icon + ' ' + escHtml(t.name) + ' - ' + escHtml(t.desc) + '</option>';
    });
    h += '</select></div>';
    h += '<div class="flex gap8">';
    h += '<button class="btn btn-primary btn-sm btn-block" id="co-new-ok">作成</button>';
    h += '<button class="btn btn-secondary btn-sm" id="co-new-cancel">キャンセル</button>';
    h += '</div></div>';
    div.innerHTML = h;
    document.body.appendChild(div);

    document.getElementById('co-new-ok').onclick = function() {
      var title = document.getElementById('co-new-title').value.trim();
      var icon = document.getElementById('co-new-icon').value.trim() || '📄';
      var type = document.getElementById('co-new-type').value;
      if (!title) { toast('タイトルを入力してください'); return; }
      var ov = createCustomOverlay(type, title, icon);
      div.remove();
      toast('✅ 「' + title + '」を作成しました');
      if (typeof onCreated === 'function') onCreated(ov);
    };
    document.getElementById('co-new-cancel').onclick = function() { div.remove(); };
  }

  /* Expose */
  window.CUSTOM_OVERLAY_TYPES = CUSTOM_OVERLAY_TYPES;
  window.getCustomOverlays = getCustomOverlays;
  window.saveCustomOverlays = saveCustomOverlays;
  window.createCustomOverlay = createCustomOverlay;
  window.deleteCustomOverlay = deleteCustomOverlay;
  window.openCustomOverlay = openCustomOverlay;
  window.openCreateCustomOverlayDialog = openCreateCustomOverlayDialog;

})();
