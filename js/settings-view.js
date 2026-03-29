/* ==========================================================
   DeliEasy v2 — js/settings-view.js
   設定オーバーレイ（v2.3 再設計版）
   一般ユーザー向けにわかりやすいUI構成
   ========================================================== */
(function(){
  'use strict';

  /* ---------- 折りたたみ状態 ---------- */
  var _syncTroubleOpen = false;
  var _dataDeleteOpen = false;

  function renderOverlay_settings(body) {
    if (!body) return;
    _render(body);
  }

  function _render(body) {
    if (!body) body = document.getElementById('overlay-body-settings');
    if (!body) return;

    var syncStatus = typeof firebaseGetSyncStatus === 'function' ? firebaseGetSyncStatus() : 'idle';
    var isSyncing = syncStatus === 'syncing';
    var isSignedIn = typeof firebaseIsSignedIn === 'function' && firebaseIsSignedIn();

    var html = '';

    /* ===== クラウド同期セクション ===== */
    html += _renderSyncSection(isSignedIn, isSyncing, syncStatus);

    /* ===== データ管理セクション ===== */
    html += _renderDataSection(isSignedIn, isSyncing);

    /* ===== ジェスチャー設定 ===== */
    if (typeof renderGestureSettings === 'function') {
      html += renderGestureSettings();
    }

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

    /* ===== カスタムオーバーレイ管理 ===== */
    html += '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb8">📄 カスタムオーバーレイ</div>';
    var customOverlays = typeof getCustomOverlays === 'function' ? getCustomOverlays() : [];
    if (customOverlays.length > 0) {
      customOverlays.forEach(function(co) {
        html += '<div class="flex items-center gap8 mb8" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">';
        html += '<span>' + escHtml(co.icon) + '</span>';
        html += '<span class="fz-s" style="flex:1">' + escHtml(co.title) + '</span>';
        html += '<button class="btn btn-danger btn-xs" onclick="_settingsDeleteCustomOverlay(\'' + escJs(co.id) + '\')">削除</button>';
        html += '</div>';
      });
    }
    html += '<button class="btn btn-secondary btn-sm btn-block" onclick="openCreateCustomOverlayDialog(function(){_settingsRefresh()})">＋ 新規作成</button>';
    html += '</div></div>';

    /* ===== バージョン情報 ===== */
    html += '<div class="text-c c-muted fz-xs mt16 mb16">';
    html += 'DeliEasyNEO v3.0<br>';
    html += 'Device ID: ' + escHtml(S.g('deviceId', 'N/A'));
    html += '</div>';

    body.innerHTML = html;
  }

  /* ============================================================
     クラウド同期セクション
     ============================================================ */
  function _renderSyncSection(isSignedIn, isSyncing, syncStatus) {
    var html = '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">☁️ クラウド同期</div>';

    if (isSignedIn) {
      var name = typeof firebaseGetUserName === 'function' ? firebaseGetUserName() : '';
      var email = typeof firebaseGetUserEmail === 'function' ? firebaseGetUserEmail() : '';
      var syncInfo = typeof firebaseGetSyncInfo === 'function' ? firebaseGetSyncInfo() : {};
      var photo = typeof firebaseGetUserPhoto === 'function' ? firebaseGetUserPhoto() : '';

      /* ユーザー情報 */
      html += '<div class="flex items-center gap8 mb12">';
      if (photo) html += '<img src="' + escHtml(photo) + '" style="width:36px;height:36px;border-radius:50%;border:2px solid var(--c-primary)">';
      html += '<div>';
      html += '<div class="fz-s fw6">' + escHtml(name) + '</div>';
      html += '<div class="fz-xs c-muted">' + escHtml(email) + '</div>';
      html += '</div></div>';

      /* 同期ステータス */
      var statusLabel = { idle: '待機中', syncing: '同期中...', synced: '同期済み', error: 'エラー', offline: 'オフライン' };
      var statusColor = { idle: 'c-muted', syncing: 'c-warning', synced: 'c-success', error: 'c-danger', offline: 'c-muted' };
      html += '<div class="fz-xs mb4">ステータス: <span class="fw6 ' + (statusColor[syncStatus] || 'c-muted') + '">' + (statusLabel[syncStatus] || syncStatus) + '</span></div>';

      if (syncInfo.lastSyncTs) {
        html += '<div class="fz-xs c-muted mb8">最終同期: ' + new Date(syncInfo.lastSyncTs).toLocaleString('ja-JP') + '</div>';
      }
      if (syncInfo.hasPendingChanges) {
        html += '<div class="fz-xs c-warning mb8">⚡ 未同期の変更があります</div>';
      }

      /* 同期中 */
      if (isSyncing) {
        html += '<div class="flex items-center gap8" style="padding:14px;background:var(--c-warning-light);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
        html += '<span style="font-size:1.2rem">🔄</span>';
        html += '<span class="fz-s fw5">同期中です。しばらくお待ちください...</span>';
        html += '</div>';
      } else {
        /* ログアウトボタン */
        html += '<button class="btn btn-secondary btn-sm" onclick="_settingsSignOut()">ログアウト</button>';

        /* 同期トラブルシューティング */
        html += '<div style="margin-top:16px;border-top:.5px solid var(--c-divider);padding-top:12px">';
        html += '<div class="card-header' + (_syncTroubleOpen ? ' open' : '') + '" onclick="_settingsToggleSyncTrouble()" style="padding:8px 0;border-bottom:none;cursor:pointer">';
        html += '<span class="fz-xs c-muted">🔧 同期がおかしい場合</span>';
        html += '<span class="card-arrow fz-xs">▼</span>';
        html += '</div>';
        html += '<div id="sync-trouble-body" style="display:' + (_syncTroubleOpen ? 'block' : 'none') + '">';
        html += _renderSyncTroubleContent();
        html += '</div>';
        html += '</div>';
      }

    } else {
      /* 未ログイン */
      html += '<p class="fz-s c-muted mb8">Googleアカウントでログインすると、複数の端末でデータを同期できます。</p>';
      html += '<div class="fz-xxs c-muted mb12" style="line-height:1.5">データはGoogleアカウントに紐づいてクラウドに保存されます。<br>端末を変えても、同じアカウントでログインすればデータを引き継げます。</div>';
      html += '<button class="btn btn-primary btn-block" onclick="firebaseSignInNow()">🔐 Googleでログイン</button>';
    }

    html += '</div></div>';
    return html;
  }

  /* ---------- 同期トラブルシューティング ---------- */
  function _renderSyncTroubleContent() {
    var html = '';

    html += '<div class="fz-xxs c-muted mb12" style="line-height:1.6">通常は自動で同期されるため、手動操作は不要です。<br>データがおかしい場合のみお使いください。</div>';

    /* 端末の件数情報 */
    var earnCount = typeof getE === 'function' ? getE().length : 0;
    var expCount = S.g('exps', []).length;
    html += '<div class="fz-xxs c-muted mb12" style="padding:8px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm)">📱 この端末のデータ: 売上 ' + earnCount + '件 / 経費 ' + expCount + '件</div>';

    /* 端末のデータを優先 */
    html += '<div style="padding:10px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
    html += '<div class="fz-xs fw6 mb4">📱 端末のデータを優先する</div>';
    html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">クラウドのデータを、この端末のデータで置き換えます。<br>他の端末で記録したデータがクラウドにある場合、そのデータは失われます。</div>';
    html += '<button class="btn btn-secondary btn-xs" onclick="_settingsManualUpload()">実行する</button>';
    html += '</div>';

    /* クラウドのデータを優先 */
    html += '<div style="padding:10px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
    html += '<div class="fz-xs fw6 mb4">☁️ クラウドのデータを優先する</div>';
    html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">この端末のデータを、クラウドのデータで置き換えます。<br>この端末で記録した未同期のデータがある場合、そのデータは失われます。</div>';
    html += '<button class="btn btn-secondary btn-xs" onclick="_settingsManualDownload()">実行する</button>';
    html += '</div>';

    /* 両方のデータを統合 */
    html += '<div style="padding:10px;background:var(--c-fill-quaternary);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
    html += '<div class="fz-xs fw6 mb4">🔀 両方のデータを統合する</div>';
    html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">端末とクラウド両方のデータを合わせます。<br>同じ日時の記録がある場合は、端末側のデータが優先されます。</div>';
    html += '<button class="btn btn-secondary btn-xs" onclick="_settingsMerge()">実行する</button>';
    html += '</div>';

    return html;
  }

  /* ============================================================
     データ管理セクション
     ============================================================ */
  function _renderDataSection(isSignedIn, isSyncing) {
    var html = '<div class="card mb12"><div class="card-body">';
    html += '<div class="fz-s fw6 mb12">📦 データ管理</div>';

    /* ストレージ使用量 */
    if (typeof estimateDpStorageBytes === 'function') {
      var bytes = estimateDpStorageBytes();
      var mb = (bytes / 1024 / 1024).toFixed(2);
      html += '<div class="fz-xs c-muted mb4">ストレージ使用量: ' + mb + ' MB</div>';
    }

    var earnCount = typeof getE === 'function' ? getE().length : 0;
    var expCount = S.g('exps', []).length;
    html += '<div class="fz-xs c-muted mb12">売上記録: ' + earnCount + '件 / 経費記録: ' + expCount + '件</div>';

    /* バックアップ・エクスポート */
    html += '<div class="fz-xs fw6 c-secondary mb8">バックアップ・エクスポート</div>';
    html += '<div class="flex flex-wrap gap8 mb12">';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportBackupJSON===\'function\')exportBackupJSON()">💾 バックアップ</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportRecCSV===\'function\')exportRecCSV()">📊 売上CSV</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="if(typeof exportExpCSV===\'function\')exportExpCSV()">💸 経費CSV</button>';
    html += '</div>';

    /* データ復元 */
    html += '<div class="fz-xs fw6 c-secondary mb4">データ復元</div>';
    html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">バックアップファイル（JSON）からデータを復元します。<br>現在のデータは上書きされます。</div>';
    html += '<input type="file" id="settings-import-file" accept=".json" style="display:none" onchange="_settingsImportJSON(this)">';
    html += '<button class="btn btn-secondary btn-sm btn-block mb12" onclick="document.getElementById(\'settings-import-file\').click()">📂 JSONファイルから復元</button>';

    /* データの削除（折りたたみ） */
    html += '<div style="border-top:.5px solid var(--c-divider);padding-top:12px">';
    html += '<div class="card-header' + (_dataDeleteOpen ? ' open' : '') + '" onclick="_settingsToggleDataDelete()" style="padding:8px 0;border-bottom:none;cursor:pointer">';
    html += '<span class="fz-xs" style="color:var(--c-danger)">🗑 データの削除</span>';
    html += '<span class="card-arrow fz-xs">▼</span>';
    html += '</div>';
    html += '<div id="data-delete-body" style="display:' + (_dataDeleteOpen ? 'block' : 'none') + '">';
    html += _renderDeleteContent(isSignedIn, isSyncing);
    html += '</div>';
    html += '</div>';

    html += '</div></div>';
    return html;
  }

  /* ---------- 削除セクション ---------- */
  function _renderDeleteContent(isSignedIn, isSyncing) {
    var html = '';

    html += '<div class="fz-xxs c-muted mb12" style="line-height:1.6">⚠️ 削除したデータは元に戻せません。<br>事前にバックアップを取ることを強くお勧めします。</div>';

    if (isSignedIn) {
      /* ---- ログイン中 ---- */

      /* クラウドのデータを削除してログアウト */
      html += '<div style="padding:10px;background:var(--c-danger-light);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
      html += '<div class="fz-xs fw6 mb4" style="color:var(--c-danger)">☁️ クラウドのデータを削除してログアウト</div>';
      html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">クラウドの同期データを削除し、ログアウトします。<br>この端末のデータはそのまま残ります。</div>';
      if (isSyncing) {
        html += '<button class="btn btn-danger btn-xs" disabled style="opacity:.4;cursor:not-allowed">同期中は操作できません</button>';
      } else {
        html += '<button class="btn btn-danger btn-xs" onclick="_settingsDeleteCloudAndLogout()">実行する</button>';
      }
      html += '</div>';

      /* アプリを初期化する（ログイン中） */
      html += '<div style="padding:10px;border:2px solid var(--c-danger);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
      html += '<div class="fz-xs fw6 mb4" style="color:var(--c-danger)">⚠️ アプリを初期化する</div>';
      html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">端末とクラウド両方のデータを全て削除し、<br>ログアウトして初期状態に戻します。<br>この操作は取り消せません。</div>';
      if (isSyncing) {
        html += '<button class="btn btn-danger btn-xs" disabled style="opacity:.4;cursor:not-allowed">同期中は操作できません</button>';
      } else {
        html += '<button class="btn btn-danger btn-xs" onclick="_settingsResetApp_loggedIn()">アプリを初期化する</button>';
      }
      html += '</div>';

    } else {
      /* ---- 未ログイン ---- */

      /* 端末のデータを削除する */
      html += '<div style="padding:10px;background:var(--c-danger-light);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
      html += '<div class="fz-xs fw6 mb4" style="color:var(--c-danger)">📱 この端末のデータを削除する</div>';
      html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">この端末の売上・経費・設定データを全て削除します。</div>';
      html += '<button class="btn btn-danger btn-xs" onclick="_settingsClearLocalOnly()">端末のデータを削除</button>';
      html += '</div>';

      /* アプリを初期化する（未ログイン） */
      html += '<div style="padding:10px;border:2px solid var(--c-danger);border-radius:var(--ds-radius-sm);margin-bottom:8px">';
      html += '<div class="fz-xs fw6 mb4" style="color:var(--c-danger)">⚠️ アプリを初期化する</div>';
      html += '<div class="fz-xxs c-muted mb8" style="line-height:1.5">この端末のデータを全て削除し、初期状態に戻します。<br>この操作は取り消せません。</div>';
      html += '<button class="btn btn-danger btn-xs" onclick="_settingsResetApp_loggedOut()">アプリを初期化する</button>';
      html += '</div>';
    }

    return html;
  }

  /* ============================================================
     操作ハンドラ
     ============================================================ */

  /* ---------- 折りたたみ ---------- */
  window._settingsToggleSyncTrouble = function() {
    _syncTroubleOpen = !_syncTroubleOpen;
    var el = document.getElementById('sync-trouble-body');
    var hdr = el ? el.previousElementSibling : null;
    if (el) el.style.display = _syncTroubleOpen ? 'block' : 'none';
    if (hdr) hdr.classList.toggle('open', _syncTroubleOpen);
  };

  window._settingsToggleDataDelete = function() {
    _dataDeleteOpen = !_dataDeleteOpen;
    var el = document.getElementById('data-delete-body');
    var hdr = el ? el.previousElementSibling : null;
    if (el) el.style.display = _dataDeleteOpen ? 'block' : 'none';
    if (hdr) hdr.classList.toggle('open', _dataDeleteOpen);
  };

  /* ---------- ログアウト ---------- */
  window._settingsSignOut = function() {
    customConfirm('ログアウトしますか？\n端末のデータはそのまま残ります。', function() {
      if (typeof firebaseSignOut === 'function') {
        firebaseSignOut().then(function() {
          _settingsRefresh();
        });
      }
    });
  };

  /* ---------- 同期トラブル: 端末を優先 ---------- */
  window._settingsManualUpload = function() {
    customConfirm('クラウドのデータを、この端末のデータで置き換えます。\nクラウド上の他のデータは失われます。\n\nよろしいですか？', function() {
      if (typeof firebaseManualSync === 'function') {
        firebaseManualSync();
        toast('📱 端末のデータをクラウドに送信しています...');
      }
    });
  };

  /* ---------- 同期トラブル: クラウドを優先 ---------- */
  window._settingsManualDownload = function() {
    customConfirm('この端末のデータを、クラウドのデータで置き換えます。\nこの端末の未同期データは失われます。\n\nよろしいですか？', function() {
      if (typeof firebaseManualDownload === 'function') {
        firebaseManualDownload();
        toast('☁️ クラウドのデータを端末に取り込んでいます...');
      }
    });
  };

  /* ---------- 同期トラブル: 統合 ---------- */
  window._settingsMerge = function() {
    customConfirm('端末とクラウド両方のデータを統合します。\n同じ日時の記録は端末側が優先されます。\n\nよろしいですか？', function() {
      if (typeof mergeFromCloudFirebase === 'function') {
        mergeFromCloudFirebase();
        toast('🔀 データを統合しています...');
      }
    });
  };

  /* ---------- クラウドデータ削除+ログアウト ---------- */
  window._settingsDeleteCloudAndLogout = function() {
    /* 選択肢ダイアログ */
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:340px;text-align:left">' +
        '<h3 class="fz-s fw6 mb8 text-c">☁️ クラウドデータの削除</h3>' +
        '<p class="fz-xs c-muted mb12" style="line-height:1.6">クラウドの同期データを削除してログアウトします。<br>この端末のデータはそのまま残ります。</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<button class="btn btn-danger btn-sm" id="sdc-delete-logout">クラウドのデータを削除してログアウト</button>' +
          '<button class="btn btn-danger btn-sm" id="sdc-delete-logout-account" style="font-size:.72rem">クラウドのデータを削除 + アカウント連携も解除</button>' +
          '<button class="btn btn-secondary btn-sm" id="sdc-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);

    div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });

    document.getElementById('sdc-cancel').onclick = function() { div.remove(); };

    document.getElementById('sdc-delete-logout').onclick = function() {
      div.remove();
      _execDeleteCloudAndLogout(false);
    };

    document.getElementById('sdc-delete-logout-account').onclick = function() {
      div.remove();
      _execDeleteCloudAndLogout(true);
    };
  };

  function _execDeleteCloudAndLogout(deleteAccount) {
    var label = deleteAccount ? 'クラウドデータ削除 + アカウント連携解除' : 'クラウドデータ削除 + ログアウト';
    customConfirm(label + ' を実行しますか？\nこの操作は取り消せません。', function() {
      _doDeleteCloudAndLogout(deleteAccount);
    });
  }

  async function _doDeleteCloudAndLogout(deleteAccount) {
    try {
      /* 1. クラウドデータ削除 */
      if (typeof deleteCloudData === 'function') {
        await deleteCloudData();
      }

      /* 2. アカウント連携解除（オプション） */
      if (deleteAccount) {
        try {
          var user = firebase.auth().currentUser;
          if (user) {
            await user.delete();
          }
        } catch(authErr) {
          if (authErr.code === 'auth/requires-recent-login') {
            toast('アカウント連携の解除には再ログインが必要です。データ削除とログアウトは完了しました。');
          } else {
            console.warn('[Settings] Account delete error:', authErr);
            toast('アカウント連携の解除に失敗しました。データ削除とログアウトは完了しました。');
          }
          /* アカウント削除が失敗してもログアウトは実行 */
          if (typeof firebaseSignOut === 'function') {
            await firebaseSignOut();
          }
          _settingsRefresh();
          return;
        }
        /* user.delete()が成功した場合、onAuthStateChangedが自動発火するのでfirebaseSignOutは不要 */
        toast('☁️ クラウドデータを削除し、アカウント連携を解除しました');
      } else {
        /* 3. ログアウト */
        if (typeof firebaseSignOut === 'function') {
          await firebaseSignOut();
        }
        toast('☁️ クラウドデータを削除してログアウトしました');
      }

      _settingsRefresh();
    } catch(e) {
      console.error('[Settings] Delete cloud error:', e);
      toast('エラーが発生しました: ' + e.message);
      _settingsRefresh();
    }
  }

  /* ---------- アプリ初期化（ログイン中） ---------- */
  window._settingsResetApp_loggedIn = function() {
    customConfirm('アプリを初期化しますか？\n\n端末とクラウドの両方のデータが全て削除されます。\nログアウトも同時に行います。\n\n事前にバックアップを取ることを強くお勧めします。', function() {
      customConfirm('本当に初期化しますか？\nこの操作は取り消せません。', function() {
        _doResetApp_loggedIn();
      });
    });
  };

  async function _doResetApp_loggedIn() {
    try {
      /* 1. クラウドデータ削除 */
      if (typeof deleteCloudData === 'function') {
        await deleteCloudData();
      }
      /* 2. ログアウト */
      if (typeof firebaseSignOut === 'function') {
        await firebaseSignOut();
      }
      /* 3. ローカルデータ削除 */
      _clearLocalData();

      toast('🗑 アプリを初期化しました');
      if (typeof refreshHome === 'function') refreshHome();
      _settingsRefresh();
    } catch(e) {
      console.error('[Settings] Reset app error:', e);
      toast('エラーが発生しました: ' + e.message);
    }
  }

  /* ---------- アプリ初期化（未ログイン） ---------- */
  window._settingsResetApp_loggedOut = function() {
    /* 3択ダイアログ */
    var div = document.createElement('div');
    div.className = 'confirm-overlay';
    div.innerHTML =
      '<div class="confirm-box" style="max-width:340px;text-align:left">' +
        '<h3 class="fz-s fw6 mb8 text-c">⚠️ アプリを初期化</h3>' +
        '<p class="fz-xs c-muted mb8" style="line-height:1.6">この端末のデータを全て削除し、初期状態に戻します。</p>' +
        '<p class="fz-xs mb12" style="line-height:1.6;color:var(--c-warning)">以前ログインしていた場合、クラウドにデータが残っている可能性があります。<br>クラウドのデータも削除しますか？</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<button class="btn btn-danger btn-sm" id="srlo-local">端末だけ初期化する</button>' +
          '<button class="btn btn-danger btn-sm" id="srlo-cloud" style="font-size:.72rem">クラウドも削除する（ログインが必要）</button>' +
          '<button class="btn btn-secondary btn-sm" id="srlo-cancel">キャンセル</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);

    div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });

    document.getElementById('srlo-cancel').onclick = function() { div.remove(); };

    document.getElementById('srlo-local').onclick = function() {
      div.remove();
      customConfirm('端末のデータを全て削除して初期化しますか？\nこの操作は取り消せません。', function() {
        _clearLocalData();
        toast('🗑 端末のデータを削除しました');
        if (typeof refreshHome === 'function') refreshHome();
        _settingsRefresh();
      });
    };

    document.getElementById('srlo-cloud').onclick = function() {
      div.remove();
      _doResetApp_loggedOut_withCloud();
    };
  };

  async function _doResetApp_loggedOut_withCloud() {
    /* ログインさせる */
    toast('クラウドのデータを削除するにはログインが必要です');
    try {
      var signedIn = false;
      if (typeof firebaseSignInNow === 'function') {
        signedIn = await firebaseSignInNow();
      }
      if (!signedIn) {
        toast('ログインがキャンセルされました');
        return;
      }

      /* firebase-sync.js の同期選択ダイアログが出たら自動除去（最大5秒待機） */
      await _waitAndRemoveSyncDialog(5000);

      /* クラウドデータ削除 */
      if (typeof deleteCloudData === 'function') {
        await deleteCloudData();
      }
      /* ログアウト */
      if (typeof firebaseSignOut === 'function') {
        await firebaseSignOut();
      }
      /* ローカルデータ削除 */
      _clearLocalData();

      toast('🗑 端末とクラウドのデータを全て削除しました');
      if (typeof refreshHome === 'function') refreshHome();
      _settingsRefresh();
    } catch(e) {
      console.error('[Settings] Reset with cloud error:', e);
      toast('エラーが発生しました: ' + e.message);
    }
  }

  /* ---------- 端末データのみ削除（未ログイン時） ---------- */
  window._settingsClearLocalOnly = function() {
    customConfirm('この端末のデータを全て削除しますか？', function() {
      customConfirm('本当に削除しますか？\n売上・経費・設定データが全て失われます。', function() {
        _clearLocalData();
        toast('🗑 端末のデータを削除しました');
        if (typeof refreshHome === 'function') refreshHome();
        _settingsRefresh();
      });
    });
  };

  /* ---------- ローカルデータ削除の実体 ---------- */
  function _clearLocalData() {
    /* IndexedDB クリア */
    if (typeof window._idbClearAndPutAll === 'function') {
      window._idbClearAndPutAll([]);
    }
    /* localStorage クリア（Firebase認証情報とデバイスIDは保持） */
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith('dp_') && k !== 'dp_fb_uid' && k !== 'dp_fb_profile' && k !== 'dp_deviceId') {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
  }

  /* ---------- JSONインポート ---------- */
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
          _settingsRefresh();
        });
      } catch(err) {
        toast('JSONファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    input.value = '';
  };

  /* ---------- ユーティリティ ---------- */

  /* ---------- 同期選択ダイアログの出現を監視して除去 ---------- */
  function _waitAndRemoveSyncDialog(timeoutMs) {
    return new Promise(function(resolve) {
      /* 既に表示されていれば即除去 */
      var existing = document.querySelectorAll('.exit-cf');
      if (existing.length > 0) {
        existing.forEach(function(el) { el.remove(); });
        resolve(true);
        return;
      }

      var observer = new MutationObserver(function() {
        var dialogs = document.querySelectorAll('.exit-cf');
        if (dialogs.length > 0) {
          dialogs.forEach(function(el) { el.remove(); });
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      /* タイムアウト: ダイアログが出なかった場合（クラウドにデータがない等） */
      setTimeout(function() {
        observer.disconnect();
        var dialogs = document.querySelectorAll('.exit-cf');
        dialogs.forEach(function(el) { el.remove(); });
        resolve(dialogs.length > 0);
      }, timeoutMs || 5000);
    });
  }

  function _settingsRefresh() {
    var body = document.getElementById('overlay-body-settings');
    if (body) _render(body);
  }

  window._settingsDeleteCustomOverlay = function(coId) {
    customConfirm('このカスタムオーバーレイを削除しますか？', function() {
      /* 1. データ削除 */
      if (typeof deleteCustomOverlay === 'function') deleteCustomOverlay(coId);

      /* 2. フィードバック */
      toast('🗑 オーバーレイを削除しました');

      /* 3. confirm-overlay の残骸を除去してからUI更新（順序を保証） */
      setTimeout(function() {
        document.querySelectorAll('.confirm-overlay').forEach(function(el) { el.remove(); });

        /* 4. 設定画面を更新 */
        _settingsRefresh();

        /* 5. サイドバーも更新 */
        if (typeof renderSidebar === 'function') {
          try { renderSidebar(); } catch(e) {}
        }
      }, 100);
    });
  };

  /* refreshSettingsModalIfOpen の上書き */
  window._refreshSettingsOverlay = _settingsRefresh;
  window._settingsRefresh = _settingsRefresh;

  /* Expose */
  window.renderOverlay_settings = renderOverlay_settings;

})();
