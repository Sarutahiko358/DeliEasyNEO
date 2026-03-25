/* firebase-sync.js — DeliEasy Firebase Cloud Sync v2 (完全同期対応版) */
(function(){
  'use strict';

  /* ===== 定数 ===== */
  const COLLECTION = 'delieasySync';
  const CHUNK_SIZE = 240 * 1024;
  const INLINE_LIMIT = 700 * 1024;
  const SUPPRESS_AFTER_REMOTE = 30000;   // リモート適用後の抑制期間 30秒
  const UPLOAD_DEBOUNCE = 3000;          // アップロードのデバウンス 3秒
  const RETRY_MAX = 5;
  const SYNC_VERSION = 2;                // 同期プロトコルバージョン

  /* ===== 内部状態 ===== */
  let _fbReady = false;
  let _fbUser = null;
  let _unsubSnapshot = null;
  let _unsubEarnsSnapshot = null;
  let _uploadTimer = null;
  let _uploadSuppressUntil = 0;
  let _lastRemoteApplyTs = 0;
  let _lastUploadTs = 0;
  let _retryCount = 0;
  let _syncStatus = 'idle';  // idle | syncing | synced | error | offline
  let _syncListeners = [];
  let _pendingWrites = 0;
  let _deviceId = null;
  let _persistenceEnabled = false;
  let _signInInProgress = false;
  let _syncLock = false;

  /* ===== デバイスID ===== */
  function getDeviceId() {
    if (_deviceId) return _deviceId;
    _deviceId = S.g('deviceId', null);
    if (!_deviceId) {
      _deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
      S.si('deviceId', _deviceId);
    }
    return _deviceId;
  }

  /* ===== プロファイルキー ===== */
  function getProfileKey() {
    return S.g('fb_profile', 'default');
  }

  function getDocId() {
    if (!_fbUser) return null;
    return 'u_' + _fbUser.uid + '__' + getProfileKey();
  }

  /* ===== 同期ステータス管理 ===== */
  function setSyncStatus(status) {
    _syncStatus = status;
    _syncListeners.forEach(fn => {
      try { fn(status); } catch(e) { console.warn('Sync listener error:', e); }
    });
    updateSyncStatusUI();
    // 設定モーダルが開いていれば同期セクションを最新化
    if (typeof window.refreshSettingsModalIfOpen === 'function') {
      window.refreshSettingsModalIfOpen();
    }
  }

  function onSyncStatusChange(fn) {
    _syncListeners.push(fn);
    return () => { _syncListeners = _syncListeners.filter(f => f !== fn); };
  }

  function getSyncStatus() { return _syncStatus; }

  function updateSyncStatusUI() {
    const el = document.getElementById('sync-status-indicator');
    if (!el) return;

    // アイコンは常に雲（☁️）のまま。色/クラスだけ変える
    el.innerHTML = '<span class="sync-icon">☁️</span>';

    // 全sync系クラスをリセット
    el.classList.remove('sync-off', 'sync-idle', 'sync-ok', 'sync-ing', 'sync-err');

    // 状態に応じたクラスを付与
    switch (_syncStatus) {
      case 'syncing':
        el.classList.add('sync-ing');
        el.title = '同期中...';
        break;
      case 'synced':
        el.classList.add('sync-ok');
        el.title = '同期済み';
        // 3秒後にidleに戻す（緑がずっと光り続けないように）
        setTimeout(() => {
          if (_syncStatus === 'synced') {
            el.classList.remove('sync-ok');
            el.classList.add('sync-idle');
          }
        }, 3000);
        break;
      case 'error':
        el.classList.add('sync-err');
        el.title = '同期エラー — タップして確認';
        break;
      case 'offline':
        el.classList.add('sync-off');
        el.title = 'オフライン';
        break;
      case 'idle':
      default:
        // 未ログインの場合はさらに暗く
        if (!_fbUser) {
          el.classList.add('sync-off');
          el.title = '未ログイン — タップして設定';
        } else {
          el.classList.add('sync-idle');
          el.title = '同期待機中';
        }
        break;
    }
  }

  /* ===== ネットワーク状態監視 ===== */
  function initNetworkListener() {
    window.addEventListener('online', () => {
      console.log('[Sync] Online detected');
      if (_fbUser && _fbReady) {
        setSyncStatus('idle');
        // オフライン中の変更をアップロード
        if (hasLocalSyncDirty()) {
          scheduleUpload('reconnect');
        }
        // リスナーが切れていれば再接続
        if (!_unsubSnapshot) {
          startRealtimeSync();
        }
      }
    });

    window.addEventListener('offline', () => {
      console.log('[Sync] Offline detected');
      setSyncStatus('offline');
    });
  }

  /* ===== Firebase初期化 ===== */
  async function ensureFirebaseReady(showErr, interactive) {
    if (_fbReady && _fbUser) return true;

    if (!window.__DELIPRO_FIREBASE_CFG) {
      if (showErr) toast('Firebase設定が見つかりません');
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.__DELIPRO_FIREBASE_CFG);
      }
      _fbReady = true;

      const user = firebase.auth().currentUser;
      if (user) {
        _fbUser = user;
        return true;
      }

      if (interactive) {
        return await signIn();
      }
      return false;
    } catch(e) {
      console.error('[Sync] Firebase init error:', e);
      if (showErr) toast('Firebase初期化エラー');
      setSyncStatus('error');
      return false;
    }
  }

  /* ===== 認証 ===== */
  async function signIn() {
    _signInInProgress = true;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      let result;
      try {
        result = await firebase.auth().signInWithPopup(provider);
      } catch(e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
          await firebase.auth().signInWithRedirect(provider);
          return false;
        }
        throw e;
      }
      if (result && result.user) {
        _fbUser = result.user;
        S.si('fb_uid', _fbUser.uid);
        toast('✅ ログインしました: ' + (_fbUser.displayName || _fbUser.email));
        // ログイン直後に設定モーダルを即座に更新
        if (typeof window.refreshSettingsModalIfOpen === 'function') {
          window.refreshSettingsModalIfOpen();
        }
        await handlePostLoginSync();
        return true;
      }
      return false;
    } catch(e) {
      console.error('[Sync] Sign-in error:', e);
      toast('ログインエラー: ' + e.message);
      setSyncStatus('error');
      _signInInProgress = false;
      return false;
    }
  }

  async function signOut() {
    try {
      stopRealtimeSync();
      await firebase.auth().signOut();
      _fbUser = null;
      S.si('fb_uid', null);
      setSyncStatus('idle');
      toast('ログアウトしました');
      // ログアウト後に設定モーダルを即座に更新
      if (typeof window.refreshSettingsModalIfOpen === 'function') {
        window.refreshSettingsModalIfOpen();
      }
    } catch(e) {
      toast('ログアウトエラー');
    }
  }

  /* ===== ログイン後の同期ガード ===== */
  async function handlePostLoginSync() {
    const docId = getDocId();
    if (!docId) return;

    setSyncStatus('syncing');

    try {
      const docRef = firebase.firestore().collection(COLLECTION).doc(docId);
      const doc = await docRef.get();

      if (doc.exists && doc.data() && doc.data().updatedAt) {
        const remoteTs = doc.data().updatedAt.toMillis ? doc.data().updatedAt.toMillis() : 0;
        const localTs = S.g('lastSyncTs', 0);

        // 初回接続 or リモートが新しい場合: ユーザーに選択させる
        openSyncChoiceDialog({
          remoteTs,
          localTs,
          onLocal: async () => {
            _signInInProgress = false;
            await uploadAll(false);
            startRealtimeSync();
          },
          onCloud: async () => {
            _signInInProgress = false;
            await downloadAll();
            startRealtimeSync();
          },
          onMerge: async () => {
            _signInInProgress = false;
            await mergeFromCloud();
            startRealtimeSync();
          }
        });
      } else {
        // クラウドにデータがない → アップロード
        _signInInProgress = false;
        await uploadAll(false);
        startRealtimeSync();
      }
    } catch(e) {
      console.error('[Sync] Post-login sync error:', e);
      setSyncStatus('error');
      _signInInProgress = false;
      // エラーでもリアルタイム同期は開始
      startRealtimeSync();
    }
  }

  /* ===== 同期選択ダイアログ ===== */
  function openSyncChoiceDialog(opts) {
    // ダイアログ表示前に設定モーダルが開いていれば閉じる
    if (typeof window.closeMo === 'function') {
      window.closeMo();
    }

    const div = document.createElement('div');
    div.className = 'exit-cf';

    const remoteDate = opts.remoteTs ? new Date(opts.remoteTs).toLocaleString('ja-JP') : '不明';
    const localDate = opts.localTs ? new Date(opts.localTs).toLocaleString('ja-JP') : '不明';
    const userName = _fbUser ? (_fbUser.displayName || _fbUser.email || '') : '';

    div.innerHTML = `
      <div class="exit-cf-box" style="max-width:380px">
        <h3 style="margin-bottom:4px">☁️ ログインしました</h3>
        <p style="font-size:.78rem;color:var(--p);margin-bottom:12px;font-weight:600">${escHtml(userName)}</p>
        <p style="font-size:.82rem;color:var(--sub);margin-bottom:8px">
          クラウドに既存データがあります。<br>端末のデータとどちらを使いますか？
        </p>
        <div style="font-size:.72rem;color:var(--mt);margin-bottom:16px;padding:8px;background:var(--sbBg);border-radius:8px">
          <div>📱 この端末: ${localDate}</div>
          <div>☁️ クラウド: ${remoteDate}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn bp bsm" id="sg-local" style="width:100%">📱 この端末のデータをクラウドに送る</button>
          <button class="btn bs2 bsm" id="sg-cloud" style="width:100%">☁️ クラウドのデータをこの端末に入れる</button>
          <button class="btn bs2 bsm" id="sg-merge" style="width:100%">🔀 両方のデータを統合する</button>
          <div style="border-top:1px solid var(--bd);margin-top:4px;padding-top:8px">
            <button class="btn bs2 bsm" id="sg-cancel" style="width:100%;color:var(--mt);font-size:.75rem">ログアウトしてローカルのまま使う</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);

    // 確認ダイアログ付きの実行関数
    function confirmAndExecute(title, message, callback) {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'exit-cf';
      confirmDiv.style.zIndex = '260';
      confirmDiv.innerHTML = `
        <div class="exit-cf-box" style="max-width:320px">
          <h3 style="margin-bottom:8px">${title}</h3>
          <p class="fz-s c-mt mb12" style="line-height:1.6">${message}</p>
          <div class="fr" style="justify-content:center;gap:8px">
            <button class="btn bp bsm" id="sg-confirm-yes">実行する</button>
            <button class="btn bs2 bsm" id="sg-confirm-no">戻る</button>
          </div>
        </div>`;
      document.body.appendChild(confirmDiv);

      document.getElementById('sg-confirm-yes').onclick = () => {
        confirmDiv.remove();
        div.remove();
        callback();
      };
      document.getElementById('sg-confirm-no').onclick = () => {
        confirmDiv.remove();
      };
    }

    document.getElementById('sg-local').onclick = () => {
      confirmAndExecute(
        '📱 端末 → クラウド',
        'この端末のデータでクラウドを<b>上書き</b>します。<br>クラウドにある別のデータは失われます。<br>よろしいですか？',
        () => { _signInInProgress = false; opts.onLocal(); }
      );
    };

    document.getElementById('sg-cloud').onclick = () => {
      confirmAndExecute(
        '☁️ クラウド → 端末',
        'クラウドのデータでこの端末を<b>上書き</b>します。<br>この端末にあるデータは失われます。<br>よろしいですか？',
        () => { _signInInProgress = false; opts.onCloud(); }
      );
    };

    document.getElementById('sg-merge').onclick = () => {
      confirmAndExecute(
        '🔀 データ統合',
        '両方のデータを統合（マージ）します。<br>同じ日時のデータは端末側が優先されます。<br>よろしいですか？',
        () => { _signInInProgress = false; opts.onMerge(); }
      );
    };

    document.getElementById('sg-cancel').onclick = async () => {
      div.remove();
      _signInInProgress = false;
      try {
        stopRealtimeSync();
        await firebase.auth().signOut();
        _fbUser = null;
        S.si('fb_uid', null);
        setSyncStatus('idle');
        toast('ローカルモードに戻しました。同期は設定からいつでも開始できます');
      } catch(e) {
        console.warn('[Sync] Cancel sign-out error:', e);
        setSyncStatus('idle');
      }
    };
  }

  /* ===== リアルタイム同期 ===== */
  function startRealtimeSync() {
    if (!_fbUser || !_fbReady) return;
    const docId = getDocId();
    if (!docId) return;

    // 設定スナップショットのリスナー
    if (!_unsubSnapshot) {
      try {
        _unsubSnapshot = firebase.firestore().collection(COLLECTION).doc(docId)
          .onSnapshot(
            { includeMetadataChanges: true },
            (snap) => {
              if (!snap.exists) return;

              // メタデータ変更のみ(ローカルキャッシュ)はスキップ
              if (snap.metadata.hasPendingWrites) return;

              const data = snap.data();
              if (!data || !data.updatedAt) return;

              // 自デバイスからの変更はスキップ
              if (data._sourceDevice === getDeviceId()) {
                // ただし同期完了ステータスは更新
                setSyncStatus('synced');
                return;
              }

              // 抑制期間中はスキップ
              if (Date.now() < _uploadSuppressUntil) return;

              console.log('[Sync] Remote change detected, applying...');
              _lastRemoteApplyTs = Date.now();
              applyRemoteData(data);
              setSyncStatus('synced');
            },
            (err) => {
              console.error('[Sync] Snapshot error:', err);
              setSyncStatus('error');
              reconnect();
            }
          );
        console.log('[Sync] Realtime listener started');
      } catch(e) {
        console.error('[Sync] Start realtime error:', e);
        setSyncStatus('error');
      }
    }

    // Earns サブコレクションのリスナー
    startEarnsRealtimeSync();
  }

  function startEarnsRealtimeSync() {
    if (_unsubEarnsSnapshot) return;
    const docId = getDocId();
    if (!docId) return;

    try {
      const earnsColRef = firebase.firestore()
        .collection(COLLECTION).doc(docId)
        .collection('earns');

      _unsubEarnsSnapshot = earnsColRef
        .onSnapshot(
          { includeMetadataChanges: true },
          (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;

            snapshot.docChanges().forEach(change => {
              const data = change.doc.data();

              // 自デバイスからの変更はスキップ
              if (data._sourceDevice === getDeviceId()) return;

              // 抑制期間中はスキップ
              if (Date.now() < _uploadSuppressUntil) return;

              if (change.type === 'added' || change.type === 'modified') {
                applyRemoteEarnRecord(data);
              } else if (change.type === 'removed') {
                removeLocalEarnRecord(data.ts);
              }
            });
          },
          (err) => {
            console.error('[Sync] Earns snapshot error:', err);
          }
        );
      console.log('[Sync] Earns realtime listener started');
    } catch(e) {
      console.error('[Sync] Start earns realtime error:', e);
    }
  }

  function stopRealtimeSync() {
    if (_unsubSnapshot) {
      _unsubSnapshot();
      _unsubSnapshot = null;
    }
    if (_unsubEarnsSnapshot) {
      _unsubEarnsSnapshot();
      _unsubEarnsSnapshot = null;
    }
    console.log('[Sync] Realtime listeners stopped');
  }

  function reconnect() {
    _retryCount++;
    if (_retryCount > RETRY_MAX) {
      console.warn('[Sync] Max retries reached');
      setSyncStatus('error');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, _retryCount), 30000);
    console.log(`[Sync] Reconnecting in ${delay}ms (attempt ${_retryCount})`);
    setTimeout(() => {
      stopRealtimeSync();
      startRealtimeSync();
    }, delay);
  }

  /* ===== リモートデータの適用 ===== */
  function applyRemoteData(data) {
    if (_syncLock) {
      console.log('[Sync] Remote apply skipped: sync lock active');
      return;
    }
    _syncLock = true;

    try {
      // 設定(localStorage)の適用
      if (data.snapshotInline) {
        const snap = JSON.parse(data.snapshotInline);
        applySnapshotToLocal(snap);
      }

      // Earns の適用 (インライン版)
      if (data.earnsInline && !data.earnsChunked) {
        const earns = JSON.parse(data.earnsInline);
        mergeEarnsToLocal(earns);
      }

      // 経費の適用
      if (data.expensesInline) {
        const expenses = JSON.parse(data.expensesInline);
        mergeExpensesToLocal(expenses);
      }

      // タイムスタンプ更新
      const ts = data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : Date.now();
      S.si('lastSyncTs', ts);

      // UI更新
      if (typeof window.refreshHome === 'function') window.refreshHome();
      if (typeof window.renderCalendar === 'function' && window.curPage === 1) window.renderCalendar();
      if (typeof window.renderStats === 'function' && window.curPage === 2) window.renderStats();

    } catch(e) {
      console.error('[Sync] Apply remote data error:', e);
    } finally {
      _syncLock = false;
    }
  }

  function applyRemoteEarnRecord(data) {
    if (!data || !data.ts) return;
    const cache = window._getEarnsCache ? window._getEarnsCache() : [];
    const existing = cache.find(r => r.ts === data.ts);

    const rec = {
      d: data.d,
      a: Number(data.a) || 0,
      c: Number(data.c) || 1,
      m: data.m || '',
      det: data.det || null,
      time: data.time || null,
      timeFrom: data.timeFrom || null,
      timeTo: data.timeTo || null,
      ts: data.ts
    };

    if (existing) {
      // 既存レコード → 更新（リモートが新しい場合のみ）
      if (data._updatedAt && existing._updatedAt && data._updatedAt <= existing._updatedAt) return;
      if (typeof window.updateE === 'function') {
        window.updateE(data.ts, rec);
      }
    } else {
      // 新規レコード → 追加（addEはtoastを出すので直接キャッシュに）
      cache.push(rec);
      // IDBにも保存
      if (typeof window._idbPutDirect === 'function') {
        window._idbPutDirect(rec);
      }
    }
  }

  function removeLocalEarnRecord(ts) {
    if (!ts) return;
    if (typeof window.deleteE === 'function') {
      window.deleteE(ts);
    }
  }

  function applySnapshotToLocal(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    Object.keys(snapshot).forEach(k => {
      if (k.startsWith('dp_') && isCloudSyncTrackedKey(k)) {
        localStorage.setItem(k, snapshot[k]);
      }
    });
  }

  function mergeEarnsToLocal(remoteEarns) {
    if (!Array.isArray(remoteEarns)) return;
    const localEarns = window._getEarnsCache ? window._getEarnsCache() : [];
    const localMap = new Map(localEarns.map(r => [r.ts, r]));
    let changed = false;

    remoteEarns.forEach(remote => {
      const local = localMap.get(remote.ts);
      if (!local) {
        // リモートにしかない → 追加
        localMap.set(remote.ts, remote);
        changed = true;
      } else {
        // 両方にある → _updatedAt が新しい方を採用
        if (remote._updatedAt && (!local._updatedAt || remote._updatedAt > local._updatedAt)) {
          localMap.set(remote.ts, remote);
          changed = true;
        }
      }
    });

    if (changed) {
      const merged = Array.from(localMap.values());
      if (window._idbClearAndPutAll) {
        window._idbClearAndPutAll(merged);
      }
    }
  }

  function mergeExpensesToLocal(remoteExps) {
    if (!Array.isArray(remoteExps)) return;
    const localExps = S.g('exps', []);
    const localMap = new Map(localExps.map(e => [e.ts, e]));
    let changed = false;

    remoteExps.forEach(remote => {
      const local = localMap.get(remote.ts);
      if (!local) {
        localMap.set(remote.ts, remote);
        changed = true;
      } else {
        if (remote._updatedAt && (!local._updatedAt || remote._updatedAt > local._updatedAt)) {
          localMap.set(remote.ts, remote);
          changed = true;
        }
      }
    });

    if (changed) {
      S.s('exps', Array.from(localMap.values()));
    }
  }

  /* ===== アップロード ===== */
  function scheduleUpload(reason) {
    if (!_fbUser || !_fbReady) return;
    if (!navigator.onLine) return;
    if (Date.now() < _uploadSuppressUntil) return;
    if (Date.now() - _lastRemoteApplyTs < SUPPRESS_AFTER_REMOTE) return;

    clearTimeout(_uploadTimer);
    _uploadTimer = setTimeout(() => {
      uploadAll(true);
    }, UPLOAD_DEBOUNCE);
  }

  async function uploadAll(isAuto) {
    const docId = getDocId();
    if (!docId) return;
    if (!navigator.onLine && !_persistenceEnabled) {
      if (!isAuto) toast('オフラインです。オンラインになったら同期します。');
      return;
    }

    // ロック取得
    if (_syncLock) {
      console.log('[Sync] Upload skipped: sync lock active');
      setTimeout(() => { if (!_syncLock) scheduleUpload('retryAfterLock'); }, 2000);
      return;
    }
    _syncLock = true;

    setSyncStatus('syncing');

    try {
      const db = firebase.firestore();
      const docRef = db.collection(COLLECTION).doc(docId);
      const now = Date.now();

      // ===== 設定スナップショット =====
      const snapshot = buildLocalSnapshot();
      const snapshotStr = JSON.stringify(snapshot);

      // ===== Earns =====
      const earnsArr = window.getE ? window.getE() : [];
      const earnsStr = JSON.stringify(earnsArr);

      // ===== 経費 =====
      const expsArr = S.g('exps', []);
      const expsStr = JSON.stringify(expsArr);

      const docData = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        _sourceDevice: getDeviceId(),
        _syncVersion: SYNC_VERSION,
        profileKey: getProfileKey(),
        earnsCount: earnsArr.length,
        expsCount: expsArr.length,
        _localTs: now
      };

      // スナップショット: インラインまたはチャンク
      if (snapshotStr.length < INLINE_LIMIT) {
        docData.snapshotInline = snapshotStr;
        docData.snapshotChunked = false;
      } else {
        docData.snapshotInline = null;
        docData.snapshotChunked = true;
        await writeChunks(docRef.collection('snapshotChunks'), snapshotStr);
      }

      // Earns: インラインまたはチャンク
      if (earnsStr.length < INLINE_LIMIT) {
        docData.earnsInline = earnsStr;
        docData.earnsChunked = false;
      } else {
        docData.earnsInline = null;
        docData.earnsChunked = true;
        await writeChunks(docRef.collection('earnsChunks'), earnsStr);
      }

      // 経費: インライン
      if (expsStr.length < INLINE_LIMIT) {
        docData.expensesInline = expsStr;
        docData.expensesChunked = false;
      } else {
        docData.expensesInline = null;
        docData.expensesChunked = true;
        await writeChunks(docRef.collection('expensesChunks'), expsStr);
      }

      // Earns をサブコレクションにも個別書き込み（リアルタイム同期用）
      await uploadEarnsToSubcollection(docRef, earnsArr);

      // メインドキュメントを書き込み
      await docRef.set(docData, { merge: true });

      // ローカルの同期フラグをクリア
      _lastUploadTs = now;
      _retryCount = 0;
      S.si('lastSyncTs', now);
      setLocalSyncDirty(false);

      setSyncStatus('synced');
      if (!isAuto) toast('☁️ クラウドに同期しました');

    } catch(e) {
      console.error('[Sync] Upload error:', e);
      setSyncStatus('error');
      if (!isAuto) toast('同期エラー: ' + e.message);
    } finally {
      _syncLock = false;
    }
  }

  async function uploadEarnsToSubcollection(docRef, earnsArr) {
    const earnsColRef = docRef.collection('earns');
    const deviceId = getDeviceId();

    const remoteSnap = await earnsColRef.get();
    const remoteTsSet = new Set();
    remoteSnap.forEach(doc => remoteTsSet.add(doc.id));

    const localTsSet = new Set(earnsArr.map(r => String(r.ts)));

    const db = firebase.firestore();
    const BATCH_LIMIT = 450;

    // ローカルにあるもの → 追加/更新（バッチ分割）
    let batch = db.batch();
    let batchCount = 0;

    for (const rec of earnsArr) {
      const docId = String(rec.ts);
      batch.set(earnsColRef.doc(docId), {
        ...rec,
        _sourceDevice: deviceId,
        _updatedAt: Date.now()
      }, { merge: true });
      batchCount++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // リモートにあるがローカルにないもの → 削除（バッチ分割）
    const toDelete = [];
    remoteSnap.forEach(doc => {
      if (!localTsSet.has(doc.id)) {
        toDelete.push(doc.ref);
      }
    });

    for (const ref of toDelete) {
      batch.delete(ref);
      batchCount++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    // 残りをコミット
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  /* ===== ダウンロード ===== */
  async function downloadAll() {
    const docId = getDocId();
    if (!docId) return;

    if (_syncLock) {
      console.log('[Sync] Download skipped: sync lock active');
      return;
    }
    _syncLock = true;

    setSyncStatus('syncing');

    try {
      const db = firebase.firestore();
      const docRef = db.collection(COLLECTION).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        toast('クラウドにデータがありません');
        setSyncStatus('idle');
        return;
      }
      const data = doc.data();

      // 設定の復元
      let snapshotStr;
      if (data.snapshotChunked) {
        snapshotStr = await readChunks(docRef.collection('snapshotChunks'));
      } else {
        snapshotStr = data.snapshotInline;
      }
      if (snapshotStr) {
        const snapshot = JSON.parse(snapshotStr);
        applySnapshotToLocal(snapshot);
      }

      // Earns の復元
      let earnsStr;
      if (data.earnsChunked) {
        earnsStr = await readChunks(docRef.collection('earnsChunks'));
      } else {
        earnsStr = data.earnsInline;
      }
      if (earnsStr) {
        const earns = JSON.parse(earnsStr);
        if (window._idbClearAndPutAll) await window._idbClearAndPutAll(earns);
      }

      // 経費の復元
      let expsStr;
      if (data.expensesChunked) {
        expsStr = await readChunks(docRef.collection('expensesChunks'));
      } else {
        expsStr = data.expensesInline;
      }
      if (expsStr) {
        S.s('exps', JSON.parse(expsStr));
      }

      // 同期タイムスタンプ更新
      _lastRemoteApplyTs = Date.now();
      _uploadSuppressUntil = Date.now() + SUPPRESS_AFTER_REMOTE;
      S.si('lastSyncTs', Date.now());
      setLocalSyncDirty(false);

      setSyncStatus('synced');
      toast('☁️ クラウドからデータを復元しました');

      // UI更新
      if (typeof window.refreshHome === 'function') window.refreshHome();
      if (typeof window.renderCalendar === 'function') window.renderCalendar();

    } catch(e) {
      console.error('[Sync] Download error:', e);
      setSyncStatus('error');
      toast('ダウンロードエラー: ' + e.message);
    } finally {
      _syncLock = false;
    }
  }

  /* ===== マージ（両方を統合） ===== */
  async function mergeFromCloud() {
    const docId = getDocId();
    if (!docId) return;

    if (_syncLock) {
      console.log('[Sync] Merge skipped: sync lock active');
      return;
    }
    _syncLock = true;

    setSyncStatus('syncing');

    try {
      const db = firebase.firestore();
      const docRef = db.collection(COLLECTION).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        // クラウドにデータなし → そのままアップロード
        await uploadAll(false);
        return;
      }
      const data = doc.data();

      // Earns のマージ
      let remoteEarnsStr;
      if (data.earnsChunked) {
        remoteEarnsStr = await readChunks(docRef.collection('earnsChunks'));
      } else {
        remoteEarnsStr = data.earnsInline;
      }

      if (remoteEarnsStr) {
        const remoteEarns = JSON.parse(remoteEarnsStr);
        const localEarns = window.getE ? window.getE() : [];

        // ts をキーにマージ
        const merged = new Map();
        localEarns.forEach(r => merged.set(r.ts, r));
        remoteEarns.forEach(r => {
          if (!merged.has(r.ts)) {
            merged.set(r.ts, r);
          }
          // 両方にある場合はローカル優先（新しいものを優先したい場合は _updatedAt で判定）
        });

        const mergedArr = Array.from(merged.values());
        if (window._idbClearAndPutAll) {
          await window._idbClearAndPutAll(mergedArr);
        }
      }

      // 経費のマージ
      let remoteExpsStr;
      if (data.expensesChunked) {
        remoteExpsStr = await readChunks(docRef.collection('expensesChunks'));
      } else {
        remoteExpsStr = data.expensesInline;
      }

      if (remoteExpsStr) {
        const remoteExps = JSON.parse(remoteExpsStr);
        const localExps = S.g('exps', []);
        const merged = new Map();
        localExps.forEach(e => merged.set(e.ts, e));
        remoteExps.forEach(e => {
          if (!merged.has(e.ts)) merged.set(e.ts, e);
        });
        S.s('exps', Array.from(merged.values()));
      }

      // 設定の適用（リモートで上書き）
      if (data.snapshotInline) {
        const snap = JSON.parse(data.snapshotInline);
        applySnapshotToLocal(snap);
      }

      // マージ結果をアップロード
      _uploadSuppressUntil = 0;
      _lastRemoteApplyTs = 0;
      _syncLock = false;  // uploadAll がロックを取得できるよう先に解放
      await uploadAll(false);

      toast('🔀 データを統合しました');
      setSyncStatus('synced');

      if (typeof window.refreshHome === 'function') window.refreshHome();

    } catch(e) {
      console.error('[Sync] Merge error:', e);
      setSyncStatus('error');
      toast('マージエラー: ' + e.message);
    } finally {
      _syncLock = false;
    }
  }

  /* ===== チャンク読み書き ===== */
  async function writeChunks(colRef, str) {
    const db = firebase.firestore();

    // 旧チャンクを削除
    const old = await colRef.get();
    if (old.size > 0) {
      const batch = db.batch();
      old.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // 新チャンクを書き込み
    const chunks = [];
    for (let i = 0; i < str.length; i += CHUNK_SIZE) {
      chunks.push(str.substring(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      await colRef.doc('chunk_' + String(i).padStart(4, '0')).set({
        data: chunks[i],
        idx: i
      });
    }
  }

  async function readChunks(colRef) {
    const snap = await colRef.orderBy('idx').get();
    let str = '';
    snap.forEach(d => { str += d.data().data; });
    return str;
  }

  /* ===== ローカルスナップショット構築 ===== */
  function buildLocalSnapshot() {
    const snap = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('dp_') && isCloudSyncTrackedKey(k)) {
        snap[k] = localStorage.getItem(k);
      }
    }
    return snap;
  }

  /* ===== 認証状態リスナー ===== */
  function initAuth() {
    if (!window.__DELIPRO_FIREBASE_CFG) return;

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.__DELIPRO_FIREBASE_CFG);
      }
      _fbReady = true;

      firebase.auth().onAuthStateChanged(user => {
        _fbUser = user;
        if (user) {
          console.log('[Sync] Auth: signed in as', user.displayName || user.email);
          // signIn() からの初回ログインフロー中は、handlePostLoginSync に任せる
          // （ダイアログでユーザーが選択するまで接続しない）
          if (!_signInInProgress) {
            startRealtimeSync();
            if (hasLocalSyncDirty()) {
              scheduleUpload('authRestore');
            }
          }
        } else {
          console.log('[Sync] Auth: signed out');
          stopRealtimeSync();
          setSyncStatus('idle');
        }
        // 認証状態が変わったら設定モーダルを更新
        if (typeof window.refreshSettingsModalIfOpen === 'function') {
          window.refreshSettingsModalIfOpen();
        }
      });

      // リダイレクト結果の処理
      firebase.auth().getRedirectResult().then(result => {
        if (result && result.user) {
          _fbUser = result.user;
          S.si('fb_uid', _fbUser.uid);
          toast('✅ ログインしました: ' + (_fbUser.displayName || _fbUser.email));
          handlePostLoginSync();
        }
      }).catch(e => {
        if (e.code !== 'auth/no-auth-event') {
          console.warn('[Sync] Redirect result error:', e);
        }
      });

    } catch(e) {
      console.warn('[Sync] Auth init error:', e);
    }

    // ネットワーク監視開始
    initNetworkListener();
  }

  /* ===== ユーティリティ ===== */
  function isSignedIn() { return !!_fbUser; }
  function getUserName() { return _fbUser ? (_fbUser.displayName || _fbUser.email) : ''; }
  function getUserEmail() { return _fbUser ? _fbUser.email : ''; }
  function getUserPhoto() { return _fbUser ? _fbUser.photoURL : ''; }

  /* ===== 手動同期ボタン用 ===== */
  async function manualSync() {
    if (!_fbUser) {
      toast('ログインしてください');
      return;
    }
    if (!navigator.onLine) {
      toast('オフラインです');
      return;
    }
    await uploadAll(false);
  }

  async function manualDownload() {
    if (!_fbUser) {
      toast('ログインしてください');
      return;
    }
    await downloadAll();
  }

  /* ===== 同期情報取得 ===== */
  function getSyncInfo() {
    return {
      status: _syncStatus,
      signedIn: !!_fbUser,
      userName: getUserName(),
      userEmail: getUserEmail(),
      userPhoto: getUserPhoto(),
      lastSyncTs: S.g('lastSyncTs', 0),
      deviceId: getDeviceId(),
      hasPendingChanges: hasLocalSyncDirty(),
      online: navigator.onLine
    };
  }

  /* ===== Sync Mini Popup ===== */
  let _syncPopupTimer = null;

  function showSyncPopup() {
    closeSyncPopup();

    const info = getSyncInfo();
    let icon, msg, sub;

    if (!info.signedIn) {
      icon = '☁️';
      msg = 'クラウド同期はオフです';
      sub = 'ログインすると複数端末でデータを共有できます';
    } else if (!info.online) {
      icon = '📡';
      msg = 'オフラインです';
      sub = 'ネットに繋がったら自動で同期しますよ';
    } else {
      switch (_syncStatus) {
        case 'syncing':
          icon = '🔄';
          msg = 'ただいま同期中…';
          sub = 'もうちょっとだけお待ちください';
          break;
        case 'synced':
          icon = '✅';
          msg = 'バッチリ同期済みです！';
          if (info.lastSyncTs) {
            const d = new Date(info.lastSyncTs);
            sub = '最終同期: ' + d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          } else {
            sub = 'データはクラウドと一致しています';
          }
          break;
        case 'error':
          icon = '😥';
          msg = '同期でちょっと問題が…';
          sub = '設定から手動で同期を試してみてください';
          break;
        default:
          icon = '☁️';
          msg = 'クラウド同期スタンバイ中';
          if (info.lastSyncTs) {
            const d = new Date(info.lastSyncTs);
            sub = '最終同期: ' + d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          } else {
            sub = '変更があれば自動で同期します';
          }
          if (info.hasPendingChanges) {
            sub += '\n⚡ 未同期の変更があります';
          }
          break;
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'sync-popup-overlay';
    overlay.id = 'sync-popup-overlay';
    overlay.addEventListener('click', closeSyncPopup);

    const popup = document.createElement('div');
    popup.className = 'sync-popup';
    popup.id = 'sync-popup';

    let html = '';
    html += '<div style="display:flex;align-items:flex-start">';
    html += '<span class="sync-popup-icon">' + icon + '</span>';
    html += '<div>';
    html += '<div class="sync-popup-msg">' + escHtml(msg) + '</div>';
    html += '<div class="sync-popup-sub">' + escHtml(sub).replace(/\n/g, '<br>') + '</div>';
    html += '<button class="sync-popup-link" onclick="closeSyncPopup();openMo(\'settings\')">' + escHtml('⚙️ 同期の設定はこちら') + '</button>';
    html += '</div>';
    html += '</div>';

    popup.innerHTML = html;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    _syncPopupTimer = setTimeout(closeSyncPopup, 5000);
  }

  function closeSyncPopup() {
    if (_syncPopupTimer) {
      clearTimeout(_syncPopupTimer);
      _syncPopupTimer = null;
    }
    const overlay = document.getElementById('sync-popup-overlay');
    const popup = document.getElementById('sync-popup');
    if (overlay) overlay.remove();
    if (popup) popup.remove();
  }

  /* ===== クラウドデータ削除 ===== */
  async function deleteCloudData() {
    const docId = getDocId();
    if (!docId) throw new Error('ログイン中ではありません');
    stopRealtimeSync();
    const db = firebase.firestore();
    const docRef = db.collection(COLLECTION).doc(docId);
    // サブコレクション削除
    const subs = ['earns', 'snapshotChunks', 'earnsChunks', 'expensesChunks'];
    for (const sub of subs) {
      const snap = await docRef.collection(sub).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await docRef.delete();
  }

  /* ===== Expose ===== */
  window.ensureFirebaseSyncReady = ensureFirebaseReady;
  window.firebaseSignInNow = signIn;
  window.firebaseSignOut = signOut;
  window.deleteCloudData = deleteCloudData;
  window.scheduleFirebaseRealtimeUpload = scheduleUpload;
  window.uploadAllDataToFirebase = uploadAll;
  window.downloadAllDataFromFirebase = downloadAll;
  window.mergeFromCloudFirebase = mergeFromCloud;
  window.startFirebaseRealtimeSync = startRealtimeSync;
  window.firebaseIsSignedIn = isSignedIn;
  window.firebaseGetUserName = getUserName;
  window.firebaseGetUserEmail = getUserEmail;
  window.firebaseGetUserPhoto = getUserPhoto;
  window.initFirebaseAuth = initAuth;
  window.firebaseManualSync = manualSync;
  window.firebaseManualDownload = manualDownload;
  window.firebaseGetSyncInfo = getSyncInfo;
  window.firebaseGetSyncStatus = getSyncStatus;
  window.onFirebaseSyncStatusChange = onSyncStatusChange;
  window.showSyncPopup = showSyncPopup;
  window.closeSyncPopup = closeSyncPopup;

})();
