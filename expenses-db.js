/* expenses-db.js — DeliEasy IndexedDB Expenses Manager (S.g/S.sフック方式) */
(function(){
  'use strict';

  const DB_NAME = 'DeliProDB';
  const DB_VER = 3; // earns-db.js の v2 から上げる
  const STORE = 'expenses';
  let _db = null;
  let _expsCache = [];
  let _idbAvailable = false;
  let _initialized = false;

  /* ===== DB Open ===== */
  function openDB(){
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      try {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          // earns store (v2で作成済み — 存在確認のみ)
          if (!db.objectStoreNames.contains('earns')) {
            const earnStore = db.createObjectStore('earns', { keyPath: 'ts' });
            earnStore.createIndex('by_date', 'd', { unique: false });
          } else {
            const tx = e.target.transaction;
            const earnStore = tx.objectStore('earns');
            if (!earnStore.indexNames.contains('by_date')) {
              earnStore.createIndex('by_date', 'd', { unique: false });
            }
          }
          // expenses store (v3で新規作成)
          if (!db.objectStoreNames.contains(STORE)) {
            const expStore = db.createObjectStore(STORE, { keyPath: 'ts' });
            expStore.createIndex('by_date', 'date', { unique: false });
          }
        };
        req.onsuccess = e => {
          _db = e.target.result;
          _idbAvailable = true;
          resolve(_db);
        };
        req.onerror = () => {
          _idbAvailable = false;
          reject(req.error);
        };
      } catch(e) {
        _idbAvailable = false;
        reject(e);
      }
    });
  }

  /* ===== IDB CRUD ===== */
  function idbGetAll(){
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const tx = db.transaction(STORE, 'readonly');
        const st = tx.objectStore(STORE);
        const req = st.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }).catch(reject);
    });
  }

  function idbPut(rec){
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        st.put(rec);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch(reject);
    });
  }

  function idbDelete(ts){
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const tx = db.transaction(STORE, 'readwrite');
        const st = tx.objectStore(STORE);
        st.delete(ts);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }).catch(reject);
    });
  }

  function idbClearAndPutAll(arr) {
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        const clearTx = db.transaction(STORE, 'readwrite');
        clearTx.objectStore(STORE).clear();
        clearTx.oncomplete = () => {
          const BATCH_SIZE = 500;
          let index = 0;

          function writeBatch() {
            if (index >= arr.length) {
              _expsCache = arr.slice();
              resolve();
              return;
            }
            const tx = db.transaction(STORE, 'readwrite');
            const st = tx.objectStore(STORE);
            const end = Math.min(index + BATCH_SIZE, arr.length);
            for (let i = index; i < end; i++) {
              st.put(arr[i]);
            }
            tx.oncomplete = () => {
              index = end;
              setTimeout(writeBatch, 0);
            };
            tx.onerror = () => {
              _expsCache = arr.slice();
              reject(tx.error);
            };
          }
          writeBatch();
        };
        clearTx.onerror = () => reject(clearTx.error);
      }).catch(reject);
    });
  }

  /* ===== localStorage fallback ===== */
  function lsFallbackSave(){
    try {
      localStorage.setItem('dp_exps', JSON.stringify(_expsCache));
    } catch(e) {
      console.error('expenses localStorage fallback save failed:', e);
      if (typeof window.toast === 'function') {
        window.toast('⚠️ 経費データの保存に失敗しました。', 4000);
      }
    }
  }

  function lsFallbackLoad(){
    try {
      const v = localStorage.getItem('dp_exps');
      return v ? JSON.parse(v) : [];
    } catch(e) { return []; }
  }

  /* ===== Migration from localStorage to IDB ===== */
  async function migrateFromLS() {
    const lsData = lsFallbackLoad();
    if (lsData.length > 0 && _idbAvailable) {
      const existing = await idbGetAll();
      if (existing.length === 0) {
        // tsが無いレコードにtsを付与（古いデータ対策）
        const migrated = lsData.map(e => {
          if (!e.ts) e.ts = Date.now() + Math.random();
          return e;
        });
        await idbClearAndPutAll(migrated);
        console.log('[ExpensesDB] Migrated', migrated.length, 'records from localStorage to IDB');
      }
    }
  }

  /* ===== Sync cache → localStorage (firebase-sync.js 互換) ===== */
  function syncCacheToLS() {
    try {
      localStorage.setItem('dp_exps', JSON.stringify(_expsCache));
    } catch(e) {
      // サイレントに失敗（IDBが主なので問題ない）
    }
  }

  /* ===== Init ===== */
  async function initExpensesDB() {
    try {
      await openDB();
      _idbAvailable = true;
      await migrateFromLS();
      _expsCache = await idbGetAll();
      console.log('[ExpensesDB] Loaded', _expsCache.length, 'expenses from IDB');
    } catch(e) {
      console.warn('[ExpensesDB] IndexedDB not available, using localStorage fallback');
      _idbAvailable = false;
      _expsCache = lsFallbackLoad();
    }
    _initialized = true;
    // firebase-sync.js 互換のためlocalStorageにも書き出し
    syncCacheToLS();
  }

  /* ===== S.g / S.s フック ===== */
  // storage.js を触らずに、exps キーだけ IDB に迂回させる
  function installHooks() {
    if (!window.S) {
      console.warn('[ExpensesDB] S not found, hooks not installed');
      return;
    }

    const _originalG = window.S.g.bind(window.S);
    const _originalS = window.S.s.bind(window.S);

    window.S.g = function(key, def) {
      if (key === 'exps') {
        if (!_initialized) {
          // 初期化前はlocalStorageから読む（フォールバック）
          return _originalG(key, def);
        }
        return _expsCache.slice(); // コピーを返す
      }
      return _originalG(key, def);
    };

    window.S.s = function(key, value) {
      if (key === 'exps') {
        if (!_initialized) {
          // 初期化前は従来通りlocalStorageに書く
          return _originalS(key, value);
        }
        _expsCache = Array.isArray(value) ? value.slice() : [];
        // IDBに非同期で保存
        if (_idbAvailable) {
          idbClearAndPutAll(_expsCache).catch(e => {
            console.error('[ExpensesDB] IDB save fail:', e);
            lsFallbackSave();
          });
        } else {
          lsFallbackSave();
        }
        // firebase-sync.js 互換: localStorageにも書く
        syncCacheToLS();
        // 同期トリガー（storage.js の元の処理を踏襲）
        if (typeof window.isCloudSyncTrackedKey === 'function' &&
            window.isCloudSyncTrackedKey('dp_exps')) {
          if (typeof window.setLocalSyncDirty === 'function') {
            window.setLocalSyncDirty(true);
          }
        }
        return true;
      }
      return _originalS(key, value);
    };

    console.log('[ExpensesDB] S.g/S.s hooks installed');
  }

  /* ===== earns-db.js の DB_VER 更新対応 ===== */
  // earns-db.js が先に DB_VER=2 で開いている場合、
  // expenses-db.js が DB_VER=3 で再オープンすると
  // earns-db.js の接続が versionchange で閉じられる。
  // そのため earns-db.js の _db を再取得する必要がある。
  // → initExpensesDB を earns の init 後に呼ぶことで解決。

  /* ===== Expose ===== */
  window.initExpensesDB = initExpensesDB;
  window._installExpensesHooks = installHooks;

  // フックは即座にインストール（S.g/S.sの上書き）
  // initExpensesDB が完了するまでは従来のlocalStorage動作
  installHooks();

})();
