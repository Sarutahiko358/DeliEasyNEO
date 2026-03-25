/* earns-db.js — DeliEasy IndexedDB Earns Manager v2 (同期対応版) */
(function(){
  'use strict';

  const DB_NAME = 'DeliProDB';
  const DB_VER = 2;
  const STORE = 'earns';
  let _db = null;
  let _earnsCache = [];
  let _idbAvailable = false;

  function openDB(){
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      try {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: 'ts' });
            store.createIndex('by_date', 'd', { unique: false });
          } else {
            const tx = e.target.transaction;
            const store = tx.objectStore(STORE);
            if (!store.indexNames.contains('by_date')) {
              store.createIndex('by_date', 'd', { unique: false });
            }
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

  function _idbClearAndPutAll(arr) {
    return new Promise((resolve, reject) => {
      openDB().then(db => {
        // まずclearトランザクション
        const clearTx = db.transaction(STORE, 'readwrite');
        clearTx.objectStore(STORE).clear();
        clearTx.oncomplete = () => {
          // バッチごとに書き込み
          const BATCH_SIZE = 500;
          let index = 0;

          function writeBatch() {
            if (index >= arr.length) {
              _earnsCache = arr.slice();
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
              // 次のバッチは非同期で（メインスレッドに制御を戻す）
              setTimeout(writeBatch, 0);
            };
            tx.onerror = () => {
              // エラーでも残りのデータはキャッシュに反映
              _earnsCache = arr.slice();
              reject(tx.error);
            };
          }

          writeBatch();
        };
        clearTx.onerror = () => reject(clearTx.error);
      }).catch(reject);
    });
  }

  /* IDBに直接Put（キャッシュも更新）— リモート同期用 */
  async function _idbPutDirect(rec) {
    if (!rec || !rec.ts) return;
    const idx = _earnsCache.findIndex(r => r.ts === rec.ts);
    if (idx >= 0) {
      _earnsCache[idx] = rec;
    } else {
      _earnsCache.push(rec);
    }
    if (_idbAvailable) {
      try {
        await idbPut(rec);
      } catch(e) {
        console.error('[EarnsDB] idbPutDirect fail:', e);
        lsFallbackSave();
      }
    } else {
      lsFallbackSave();
    }
  }

  /* fallback to localStorage */
  let _lsFallbackWarningShown = false;

  function lsFallbackSave(){
    try {
      const data = JSON.stringify(_earnsCache);
      // 保存前にサイズチェック（おおよそ）
      const sizeBytes = data.length * 2; // UTF-16
      if (sizeBytes > 4 * 1024 * 1024) { // 4MB警告ライン
        if (!_lsFallbackWarningShown) {
          _lsFallbackWarningShown = true;
          if (typeof window.toast === 'function') {
            window.toast('⚠️ データ量が多くなっています。クラウド同期の利用を推奨します。', 5000);
          }
        }
      }
      localStorage.setItem('dp_earns', data);
    } catch(e) {
      console.error('earns localStorage fallback save failed:', e);
      if (typeof window.toast === 'function') {
        window.toast('⚠️ データの保存に失敗しました。ストレージ容量が不足しています。設定からデータをエクスポートしてください。', 6000);
      }
    }
  }
  function lsFallbackLoad(){
    try {
      const v = localStorage.getItem('dp_earns');
      return v ? JSON.parse(v) : [];
    } catch(e) { return []; }
  }

  /* migration from localStorage to IDB */
  async function migrateFromLS() {
    const lsData = lsFallbackLoad();
    if (lsData.length > 0 && _idbAvailable) {
      const existing = await idbGetAll();
      if (existing.length === 0) {
        await _idbClearAndPutAll(lsData);
      }
    }
  }

  /* Public API */
  function getE() { return _earnsCache; }

  function eByDate(d) {
    return _earnsCache.filter(r => r.d === d);
  }

  function eByMonth(mk) {
    return _earnsCache.filter(r => r.d && r.d.substring(0,7) === mk);
  }

  function sumA(arr) {
    return arr.reduce((s, r) => s + (Number(r.a) || 0), 0);
  }

  function sumC(arr) {
    return arr.reduce((s, r) => s + (Number(r.c) || 0), 0);
  }

  function tdTot() { return sumA(eByDate(window.TD)); }
  function tdCnt() { return sumC(eByDate(window.TD)); }
  function moTot() { return sumA(eByMonth(window.MK)); }
  function moCnt() { return sumC(eByMonth(window.MK)); }

  function moDays() {
    const days = new Set();
    eByMonth(window.MK).forEach(r => days.add(r.d));
    return days.size;
  }

  function wkData() {
    const now = new Date();
    const dow = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((dow + 6) % 7));
    const result = { tot: 0, cnt: 0, days: 0 };
    const daySet = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dk = window.dateKey(d);
      const recs = eByDate(dk);
      if (recs.length) {
        result.tot += sumA(recs);
        result.cnt += sumC(recs);
        daySet.add(dk);
      }
    }
    result.days = daySet.size;
    return result;
  }

  async function addE(d, a, c, m, det, notify, timeOverride) {
    const now = Date.now();
    const rec = {
      d: d,
      a: Number(a) || 0,
      c: Number(c) || 1,
      m: m || '',
      det: det || null,
      time: timeOverride || null,
      timeFrom: null,
      timeTo: null,
      ts: now,
      _updatedAt: now
    };
    if (det && det.timeFrom) rec.timeFrom = det.timeFrom;
    if (det && det.timeTo) rec.timeTo = det.timeTo;

    _earnsCache.push(rec);

    if (_idbAvailable) {
      try {
        await idbPut(rec);
      } catch(e) {
        console.error('IDB put fail:', e);
        lsFallbackSave();
      }
    } else {
      lsFallbackSave();
    }

    if (typeof window.setLocalSyncDirty === 'function') {
      window.setLocalSyncDirty(true);
    }

    if (notify !== false && typeof window.toast === 'function') {
      window.toast('✅ ¥' + window.fmt(rec.a) + ' を記録しました');
    }
    if (typeof window.refreshHome === 'function') {
      window.refreshHome();
    }
  }

  async function deleteE(ts) {
    _earnsCache = _earnsCache.filter(r => r.ts !== ts);
    if (_idbAvailable) {
      try { await idbDelete(ts); } catch(e) { lsFallbackSave(); }
    } else {
      lsFallbackSave();
    }
    if (typeof window.setLocalSyncDirty === 'function') {
      window.setLocalSyncDirty(true);
    }
  }

  async function updateE(ts, updates) {
    const idx = _earnsCache.findIndex(r => r.ts === ts);
    if (idx < 0) return false;
    Object.keys(updates).forEach(k => {
      _earnsCache[idx][k] = updates[k];
    });
    _earnsCache[idx]._updatedAt = Date.now();
    if (_idbAvailable) {
      try {
        await idbPut(_earnsCache[idx]);
      } catch(e) {
        console.error('IDB update fail:', e);
        lsFallbackSave();
      }
    } else {
      lsFallbackSave();
    }
    if (typeof window.setLocalSyncDirty === 'function') {
      window.setLocalSyncDirty(true);
    }
    return true;
  }

  async function initEarnsDB() {
    try {
      await openDB();
      _idbAvailable = true;
      await migrateFromLS();
      _earnsCache = await idbGetAll();
    } catch(e) {
      console.warn('IndexedDB not available, using localStorage fallback');
      _idbAvailable = false;
      _earnsCache = lsFallbackLoad();
    }
  }

  /* expose */
  window.getE = getE;
  window.eByDate = eByDate;
  window.eByMonth = eByMonth;
  window.sumA = sumA;
  window.sumC = sumC;
  window.tdTot = tdTot;
  window.tdCnt = tdCnt;
  window.moTot = moTot;
  window.moCnt = moCnt;
  window.moDays = moDays;
  window.wkData = wkData;
  window.addE = addE;
  window.deleteE = deleteE;
  window.updateE = updateE;
  window.initEarnsDB = initEarnsDB;
  window._idbClearAndPutAll = _idbClearAndPutAll;
  window._idbPutDirect = _idbPutDirect;
  window._getEarnsCache = () => _earnsCache;
})();
