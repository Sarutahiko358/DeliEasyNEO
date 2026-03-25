/* ==========================================================
   DeliEasy v2 — js/pf-manage.js
   PF（プラットフォーム）・経費カテゴリ管理オーバーレイ（Phase 6）
   ========================================================== */
(function(){
  'use strict';

  var _activeTab = 'pf'; /* 'pf' | 'expCat' */

  /* ---------- デフォルトPF ---------- */
  var DEFAULT_PFS = [
    { name: 'Uber Eats', color: '#00b14f', active: true, default: true },
    { name: '出前館',    color: '#e60012', active: true, default: true },
    { name: 'Wolt',      color: '#00c2e8', active: true, default: true },
    { name: 'menu',      color: '#ff6600', active: true, default: true }
  ];

  var DEFAULT_EXP_CATS = ['ガソリン','バイク維持費','スマホ通信費','配達バッグ','雨具','駐輪場','食費','保険','その他'];

  /* ---------- PF取得/保存 ---------- */
  function _getPFs() {
    var saved = S.g('pfItems', null);
    if (saved && Array.isArray(saved)) return saved;
    return DEFAULT_PFS.slice();
  }

  function _savePFs(pfs) {
    S.s('pfItems', pfs);
  }

  /* ---------- 経費カテゴリ取得/保存 ---------- */
  function _getExpCats() {
    var custom = S.g('expCats', []);
    return { defaults: DEFAULT_EXP_CATS, custom: custom };
  }

  function _saveExpCats(custom) {
    S.s('expCats', custom);
  }

  /* ---------- オーバーレイ描画 ---------- */
  function renderOverlay_pfManage(body) {
    if (!body) return;
    _render(body);
  }

  function _render(body) {
    if (!body) body = document.getElementById('overlay-body-pfManage');
    if (!body) return;

    var html = '';

    /* タブ切替 */
    html += '<div class="segmented mb12" style="margin:0 0 16px">';
    html += '<button class="segmented-item' + (_activeTab === 'pf' ? ' active' : '') + '" onclick="_pfSetTab(\'pf\')">📦 プラットフォーム</button>';
    html += '<button class="segmented-item' + (_activeTab === 'expCat' ? ' active' : '') + '" onclick="_pfSetTab(\'expCat\')">🏷 経費カテゴリ</button>';
    html += '</div>';

    if (_activeTab === 'pf') {
      html += _renderPfTab();
    } else {
      html += _renderExpCatTab();
    }

    body.innerHTML = html;
  }

  /* ---------- PFタブ ---------- */
  function _renderPfTab() {
    var pfs = _getPFs();
    var html = '';

    /* 追加フォーム */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">PFを追加</div>';
    html += '<div class="flex gap8 mb8">';
    html += '<input type="text" class="input" id="pf-add-name" placeholder="PF名" style="flex:1">';
    html += '<input type="color" id="pf-add-color" value="#ff6600" style="width:44px;height:44px;border:none;border-radius:var(--ds-radius-sm);cursor:pointer;padding:2px">';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm btn-block" onclick="_pfAdd()">追加</button>';
    html += '</div></div>';

    /* PF一覧 */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">PF一覧 (' + pfs.length + '件)</div>';

    pfs.forEach(function(pf, i) {
      var isDefault = pf.default === true;
      var isActive = pf.active !== false;
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid var(--c-divider)">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">';
      html += '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + (pf.color || '#888') + ';flex-shrink:0"></span>';
      html += '<span class="fz-s' + (!isActive ? ' c-muted' : '') + '" style="' + (!isActive ? 'text-decoration:line-through' : '') + '">' + escHtml(pf.name) + '</span>';
      if (isDefault) html += '<span class="badge badge-muted" style="font-size:.55rem">デフォルト</span>';
      html += '</div>';
      html += '<div style="display:flex;gap:4px;flex-shrink:0">';
      /* 有効/無効切替 */
      html += '<button class="btn btn-secondary btn-xs" onclick="_pfToggle(' + i + ')">' + (isActive ? '無効化' : '有効化') + '</button>';
      /* 名前変更 */
      html += '<button class="btn btn-secondary btn-xs" onclick="_pfRename(' + i + ')">名前</button>';
      /* 色変更 */
      html += '<button class="btn btn-secondary btn-xs" onclick="_pfColor(' + i + ')">色</button>';
      /* 削除（デフォルト以外） */
      if (!isDefault) {
        html += '<button class="btn btn-danger btn-xs" onclick="_pfDelete(' + i + ')">削除</button>';
      }
      html += '</div></div>';
    });

    html += '</div></div>';
    return html;
  }

  /* ---------- 経費カテゴリタブ ---------- */
  function _renderExpCatTab() {
    var data = _getExpCats();
    var html = '';

    /* 追加フォーム */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">カテゴリを追加</div>';
    html += '<div class="flex gap8">';
    html += '<input type="text" class="input" id="expcat-add-name" placeholder="カテゴリ名" style="flex:1">';
    html += '<button class="btn btn-primary btn-sm" onclick="_expCatAdd()">追加</button>';
    html += '</div>';
    html += '</div></div>';

    /* デフォルトカテゴリ */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-xs fw6 c-secondary mb8">デフォルトカテゴリ</div>';
    data.defaults.forEach(function(cat) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:.5px solid var(--c-divider)">';
      html += '<span class="fz-s">' + escHtml(cat) + '</span>';
      html += '<span class="badge badge-muted" style="font-size:.55rem">デフォルト</span>';
      html += '</div>';
    });
    html += '</div></div>';

    /* カスタムカテゴリ */
    if (data.custom.length > 0) {
      html += '<div class="card mb12"><div class="card-body">';
      html += '<div class="fz-xs fw6 c-secondary mb8">カスタムカテゴリ (' + data.custom.length + '件)</div>';
      data.custom.forEach(function(cat, i) {
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:.5px solid var(--c-divider)">';
        html += '<span class="fz-s">' + escHtml(cat) + '</span>';
        html += '<div style="display:flex;gap:4px">';
        html += '<button class="btn btn-secondary btn-xs" onclick="_expCatRename(' + i + ')">名前</button>';
        html += '<button class="btn btn-danger btn-xs" onclick="_expCatDelete(' + i + ')">削除</button>';
        html += '</div></div>';
      });
      html += '</div></div>';
    }

    return html;
  }

  /* ---------- PF操作 ---------- */
  window._pfSetTab = function(tab) {
    hp();
    _activeTab = tab;
    _render();
  };

  window._pfAdd = function() {
    var nameEl = document.getElementById('pf-add-name');
    var colorEl = document.getElementById('pf-add-color');
    var name = nameEl ? nameEl.value.trim() : '';
    var color = colorEl ? colorEl.value : '#ff6600';
    if (!name) { toast('PF名を入力してください'); return; }
    var pfs = _getPFs();
    /* 重複チェック */
    for (var i = 0; i < pfs.length; i++) {
      if (pfs[i].name === name) { toast('同名のPFが既に存在します'); return; }
    }
    pfs.push({ name: name, color: color, active: true, default: false });
    _savePFs(pfs);
    toast('✅ PF「' + name + '」を追加しました');
    _render();
  };

  window._pfToggle = function(idx) {
    hp();
    var pfs = _getPFs();
    if (pfs[idx]) {
      pfs[idx].active = pfs[idx].active === false ? true : false;
      _savePFs(pfs);
      _render();
    }
  };

  window._pfRename = function(idx) {
    var pfs = _getPFs();
    if (!pfs[idx]) return;
    customPrompt('新しいPF名', pfs[idx].name, function(val) {
      if (val && val.trim()) {
        pfs[idx].name = val.trim();
        _savePFs(pfs);
        toast('✅ 名前を変更しました');
        _render();
      }
    });
  };

  window._pfColor = function(idx) {
    var pfs = _getPFs();
    if (!pfs[idx]) return;
    /* シンプルなカラー入力ダイアログ */
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box">' +
        '<p class="fz-s mb12">「' + escHtml(pfs[idx].name) + '」の色を選択</p>' +
        '<input type="color" id="pf-color-picker" value="' + (pfs[idx].color || '#ff6600') + '" style="width:100%;height:60px;border:none;border-radius:var(--ds-radius-sm);cursor:pointer">' +
        '<div class="flex justify-center gap8 mt12">' +
          '<button class="btn btn-primary btn-sm" id="pf-color-ok">OK</button>' +
          '<button class="btn btn-secondary btn-sm" id="pf-color-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    document.getElementById('pf-color-ok').onclick = function() {
      var c = document.getElementById('pf-color-picker').value;
      pfs[idx].color = c;
      _savePFs(pfs);
      div.remove();
      toast('✅ 色を変更しました');
      _render();
    };
    document.getElementById('pf-color-cancel').onclick = function() { div.remove(); };
  };

  window._pfDelete = function(idx) {
    var pfs = _getPFs();
    if (!pfs[idx]) return;
    customConfirm('PF「' + pfs[idx].name + '」を削除しますか？', function() {
      pfs.splice(idx, 1);
      _savePFs(pfs);
      toast('🗑 削除しました');
      _render();
    });
  };

  /* ---------- 経費カテゴリ操作 ---------- */
  window._expCatAdd = function() {
    var nameEl = document.getElementById('expcat-add-name');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) { toast('カテゴリ名を入力してください'); return; }
    var data = _getExpCats();
    if (data.defaults.indexOf(name) >= 0 || data.custom.indexOf(name) >= 0) {
      toast('同名のカテゴリが既に存在します');
      return;
    }
    data.custom.push(name);
    _saveExpCats(data.custom);
    toast('✅ カテゴリ「' + name + '」を追加しました');
    _render();
  };

  window._expCatRename = function(idx) {
    var data = _getExpCats();
    if (!data.custom[idx]) return;
    customPrompt('新しいカテゴリ名', data.custom[idx], function(val) {
      if (val && val.trim()) {
        data.custom[idx] = val.trim();
        _saveExpCats(data.custom);
        toast('✅ 名前を変更しました');
        _render();
      }
    });
  };

  window._expCatDelete = function(idx) {
    var data = _getExpCats();
    if (!data.custom[idx]) return;
    customConfirm('カテゴリ「' + data.custom[idx] + '」を削除しますか？', function() {
      data.custom.splice(idx, 1);
      _saveExpCats(data.custom);
      toast('🗑 削除しました');
      _render();
    });
  };

  /* Expose */
  window.renderOverlay_pfManage = renderOverlay_pfManage;

})();
