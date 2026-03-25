/* storage.js — DeliEasy Storage Manager */
(function(){
  'use strict';

  const PREFIX = 'dp_';
  const LOCAL_SYNC_DIRTY_KEY = 'dp_sync_dirty_local';
  const FIREBASE_EXCLUDE = ['dp_sync_dirty_local','dp_fb_cfg','dp_fb_uid','dp_fb_profile'];

  const S = {
    g(key, def) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        if (v === null) return def !== undefined ? def : null;
        return JSON.parse(v);
      } catch(e) {
        return def !== undefined ? def : null;
      }
    },
    s(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        if (isCloudSyncTrackedKey(PREFIX + key)) {
          setLocalSyncDirty(true);
        }
        return true;
      } catch(e) {
        notifyStorageSaveFailure(key, e);
        return false;
      }
    },
    si(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch(e) {
        notifyStorageSaveFailure(key, e);
        return false;
      }
    }
  };

  function isCloudSyncTrackedKey(fullKey) {
    return !FIREBASE_EXCLUDE.includes(fullKey);
  }

  function setLocalSyncDirty(flag) {
    try {
      localStorage.setItem(LOCAL_SYNC_DIRTY_KEY, flag ? '1' : '0');
    } catch(e) {}
    if (flag && typeof window.scheduleFirebaseRealtimeUpload === 'function') {
      window.scheduleFirebaseRealtimeUpload('localChange');
    }
  }

  function hasLocalSyncDirty() {
    return localStorage.getItem(LOCAL_SYNC_DIRTY_KEY) === '1';
  }

  function buildSnapshotSignature(snapshot) {
    try { return JSON.stringify(snapshot); } catch(e) { return ''; }
  }

  function estimateDpStorageBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        const v = localStorage.getItem(k) || '';
        total += (k.length + v.length) * 2;
      }
    }
    return total;
  }

  function maybeWarnStoragePressure() {
    const bytes = estimateDpStorageBytes();
    if (bytes > 4.5 * 1024 * 1024) {
      showCacheCleanupDialog();
    }
  }

  function showCacheCleanupDialog() {
    const bytes = estimateDpStorageBytes();
    const mb = (bytes / 1024 / 1024).toFixed(2);
    customConfirm('ストレージ使用量が ' + mb + 'MB に達しています。\n古いキャッシュデータを削除しますか？', function() {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX) && k.includes('cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (typeof toast === 'function') toast('キャッシュを削除しました');
    });
  }

  function showSaveFailPop(key) {
    if (typeof toast === 'function') {
      toast('⚠️ データ保存に失敗しました: ' + key, 4000);
    }
  }

  function notifyStorageSaveFailure(key, error) {
    console.error('Storage save failure:', key, error);
    showSaveFailPop(key);
  }

  /* expose */
  window.S = S;
  window.setLocalSyncDirty = setLocalSyncDirty;
  window.hasLocalSyncDirty = hasLocalSyncDirty;
  window.buildSnapshotSignature = buildSnapshotSignature;
  window.isCloudSyncTrackedKey = isCloudSyncTrackedKey;
  window.estimateDpStorageBytes = estimateDpStorageBytes;
  window.maybeWarnStoragePressure = maybeWarnStoragePressure;
})();
