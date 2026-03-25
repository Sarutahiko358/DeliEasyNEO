/* ==========================================================
   DeliEasy v2 — js/settings-view.js
   設定オーバーレイ拡張（Phase 6）
   overlay.js の _renderSettingsOverlay を置き換える
   ========================================================== */
(function(){
  'use strict';

  function renderOverlay_settings(body) {
    if (!body) return;
    _render(body);
  }

  function _render(body) {
    if (!body) body = document.getElementById('overlay-body-settings');
    if (!body) return;

    var html = '';

    /* ===== 同期セクション ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">☁️ クラウド同期</div>';

    if (typeof firebaseIsSignedIn === 'function' && firebaseIsSignedIn()) {
      var name = typeof firebaseGetUserName === 'function' ? firebaseGetUserName() : '';
      var email = typeof firebaseGetUserEmail === 'function' ? firebaseGetUserEmail() : '';
      var syncInfo = typeof firebaseGetSyncInfo === 'function' ? firebaseGetSyncInfo() : {};
      var photo = typeof firebaseGetUserPhoto === 'function' ? firebaseGetUserPhoto() : '';

      html += '<div class="flex items-center gap8 mb12">';
      if (photo) html += '<img src="' + escHtml(photo) + '" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--c-primary)">';
      html += '<div>';
      html += '<div class="fz-s fw6">' + escHtml(name) + '</div>';
      html += '<div class="fz-xs c-muted">' + escHtml(email) + '</div>';
      html += '</div></div>';

      /* 同期ステータス */
      var status = typeof firebaseGetSyncStatus === 'function' ? firebaseGetSyncStatus() : 'idle';
      var statusLabel = { idle: '待機中', syncing: '同期中...', synced: '同期済み', error: 'エラー', offline: 'オフライン' };
      var statusColor = { idle: 'c-muted', syncing: 'c-warning', synced: 'c-success', error: 'c-danger', offline: 'c-muted' };
      html += '<div class="fz-xs mb8">ステータス: <span class="fw6 ' + (statusColor[status] || 'c-muted') + '">' + (statusLabel[status] || status) + '</span></div>';

      if (syncInfo.lastSyncTs) {
        html += '<div class="fz-xs c-muted mb8">最終同期: ' + new Date(syncInfo.lastSyncTs).toLocaleString('ja-JP') + '</div>';
      }
      if (syncInfo.hasPendingChanges) {
        html += '<div class="fz-xs c-warning mb8">⚡ 未同期の変更があります</div>';
      }

      html += '<div class="flex flex-wrap gap8">';
      html += '<button class="btn btn-primary btn-sm" onclick="firebaseManualSync()">☁️ アップロード</button>';
      html += '<button class="btn btn-secondary btn-sm" onclick="firebaseManualDownload()">⬇️ ダウンロード</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="_settingsSignOut()">ログアウト</button>';
      html += '</div>';

      /* クラウドデータ削除 */
      html += '<div style="margin-top:12px;padding-top:12px;border-top:.5px solid var(--c-divider)">';
      html += '<button class="btn btn-ghost btn-xs" onclick="_settingsDeleteCloud()" style="color:var(--c-danger);font-size:.7rem">⚠️ クラウドデータを削除</button>';
      html += '</div>';
    } else {
      html += '<p class="fz-s c-muted mb12">Googleアカウントでログインすると、複数の端末でデータを同期できます。</p>';
      html += '<button class="btn btn-primary btn-block" onclick="firebaseSignInNow()">🔐 Googleでログイン</button>';
    }
    html += '</div></div>';

    /* ===== データ管理 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📦 データ管理</div>';

    /* ストレージ使用量 */
    if (typeof estimateDpStorageBytes === 'function') {
      var bytes = estimateDpStorageBytes();
      var mb = (bytes / 1024 / 1024).toFixed(2);
      html += '<div class="fz-xs c-muted mb8">ストレージ使用量: ' + mb + ' MB</div>';
    }

    /* 売上件数 */
    var earnCount = typeof getE === 'function' ? getE().length : 0;
    var expCount = S.g('exps', []).length;
    html += '<div class="fz-xs c-muted mb12">売上記録: ' + earnCount + '件 / 経費記録: ' + expCount + '件</div>';

    html += '<div class="flex flex-wrap gap8 mb12">';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportBackupJSON===\'function\')exportBackupJSON()">💾 バックアップ</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportRecCSV===\'function\')exportRecCSV()">📊 売上CSV</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportExpCSV===\'function\')exportExpCSV()">💸 経費CSV</button>';
    html += '</div>';

    /* JSONインポート */
    html += '<div class="fz-xs fw6 c-secondary mb4">データ復元</div>';
    html += '<input type="file" id="settings-import-file" accept=".json" style="display:none" onchange="_settingsImportJSON(this)">';
    html += '<button class="btn btn-secondary btn-sm btn-block" onclick="document.getElementById(\'settings-import-file\').click()">📂 JSONファイルから復元</button>';

    /* 全データ削除 */
    html += '<div style="margin-top:16px;padding-top:12px;border-top:.5px solid var(--c-divider)">';
    html += '<button class="btn btn-danger btn-sm btn-block" onclick="_settingsClearAll()">🗑 全データを削除</button>';
    html += '</div>';

    html += '</div></div>';

    /* ===== テーマ ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">🎨 テーマ</div>';
    var cs = typeof getThemeStyle === 'function' ? getThemeStyle() : 'minimal';
    var cc = typeof getThemeColor === 'function' ? getThemeColor() : 'blue-light';
    html += '<div class="fz-xs c-muted mb8">現在: ' + escHtml(cs) + ' × ' + escHtml(cc) + '</div>';
    html += '<button class="btn btn-secondary btn-block btn-sm" onclick="closeOverlay();setTimeout(function(){openOverlay(\'theme\')},200)">テーマを変更</button>';
    html += '</div></div>';

    /* ===== PF・カテゴリ管理 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">📦 PF・カテゴリ</div>';
    html += '<button class="btn btn-secondary btn-block btn-sm" onclick="closeOverlay();setTimeout(function(){openOverlay(\'pfManage\')},200)">PF・カテゴリを管理</button>';
    html += '</div></div>';

    /* ===== ホームカスタマイズ ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">🏠 ホーム画面</div>';
    html += '<button class="btn btn-secondary btn-block btn-sm" onclick="closeOverlay();setTimeout(function(){if(typeof enterEditMode===\'function\')enterEditMode()},200)">ホーム画面を編集</button>';
    html += '</div></div>';

    /* ===== バージョン情報 ===== */
    html += '<div class="text-c c-muted fz-xs mt16 mb16">';
    html += 'DeliEasy v2.0<br>';
    html += 'Device ID: ' + escHtml(S.g('deviceId', 'N/A'));
    html += '</div>';

    body.innerHTML = html;
  }

  /* ---------- 操作 ---------- */
  window._settingsSignOut = function() {
    customConfirm('ログアウトしますか？', function() {
      if (typeof firebaseSignOut === 'function') {
        firebaseSignOut().then(function() {
          _render();
        });
      }
    });
  };

  window._settingsDeleteCloud = function() {
    customConfirm('クラウド上のデータを完全に削除しますか？\nこの操作は取り消せません。', function() {
      if (typeof deleteCloudData === 'function') {
        deleteCloudData().then(function() {
          toast('☁️ クラウドデータを削除しました');
          _render();
        }).catch(function(e) {
          toast('エラー: ' + e.message);
        });
      }
    });
  };

  window._settingsImportJSON = function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);

        customConfirm('このバックアップからデータを復元しますか？\n現在のデータは上書きされます。', function() {
          /* 売上データ */
          if (data.earns && Array.isArray(data.earns) && typeof window._idbClearAndPutAll === 'function') {
            window._idbClearAndPutAll(data.earns).then(function() {
              toast('売上データを復元しました (' + data.earns.length + '件)');
            });
          }
          /* 経費データ */
          if (data.expenses && Array.isArray(data.expenses)) {
            S.s('exps', data.expenses);
          }
          /* 設定 */
          if (data.settings && typeof data.settings === 'object') {
            Object.keys(data.settings).forEach(function(k) {
              if (k.startsWith('dp_')) {
                localStorage.setItem(k, data.settings[k]);
              }
            });
          }

          toast('✅ データを復元しました');
          if (typeof refreshHome === 'function') refreshHome();
          _render();
        });
      } catch(err) {
        toast('JSONファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    input.value = '';
  };

  window._settingsClearAll = function() {
    customConfirm('⚠️ 全てのデータを削除しますか？\nこの操作は取り消せません。\n\n事前にバックアップを取ることを強くお勧めします。', function() {
      customConfirm('本当に削除しますか？\n全ての売上・経費・設定データが失われます。', function() {
        /* IndexedDB クリア */
        if (typeof window._idbClearAndPutAll === 'function') {
          window._idbClearAndPutAll([]);
        }
        /* localStorage クリア（Firebase関連以外） */
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.startsWith('dp_') && k !== 'dp_fb_uid' && k !== 'dp_fb_profile' && k !== 'dp_deviceId') {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

        toast('🗑 全データを削除しました');
        if (typeof refreshHome === 'function') refreshHome();
        _render();
      });
    });
  };

  /* refreshSettingsModalIfOpen の上書き */
  window._refreshSettingsOverlay = function() {
    var body = document.getElementById('overlay-body-settings');
    if (body) _render(body);
  };

  /* Expose */
  window.renderOverlay_settings = renderOverlay_settings;

})();
