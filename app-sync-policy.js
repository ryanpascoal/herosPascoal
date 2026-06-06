(function (globalScope) {
  'use strict';

  function getStateHash(data) {
    try {
      return JSON.stringify(data || null);
    } catch (err) {
      return '';
    }
  }

  function getTimestampMs(value) {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  function isTruncatedLocalCache(data) {
    const meta = data?.localCacheMeta;
    if (!meta || typeof meta !== 'object') return false;
    const totalCounts = meta.totalCounts || {};
    const cachedCounts = meta.cachedCounts || {};
    return Object.keys(totalCounts).some((key) => {
      const total = Number(totalCounts[key] || 0);
      const cached = Number(cachedCounts[key] || 0);
      return Number.isFinite(total) && Number.isFinite(cached) && total > cached;
    });
  }

  function resolvePreferredSyncAction(options = {}) {
    const {
      localData = null,
      remoteData = null,
      defaultData = null,
    } = options;
    const localHash = getStateHash(localData);
    const remoteHash = getStateHash(remoteData);
    const defaultHash = getStateHash(defaultData);

    if (!remoteData || typeof remoteData !== 'object') {
      if (isTruncatedLocalCache(localData)) {
        return {
          action: 'start_fresh',
          reason: 'local_cache_truncated',
          localHash,
          remoteHash,
        };
      }
      return {
        action: 'push_local',
        reason: 'remote_missing',
        localHash,
        remoteHash,
      };
    }

    if (!localData || typeof localData !== 'object') {
      return {
        action: 'apply_remote',
        reason: 'local_missing',
        localHash,
        remoteHash,
      };
    }

    if (localHash && remoteHash && localHash === remoteHash) {
      return {
        action: 'keep_local',
        reason: 'already_synced',
        localHash,
        remoteHash,
      };
    }

    const hasMeaningfulLocalData = localHash && defaultHash ? localHash !== defaultHash : true;
    if (!hasMeaningfulLocalData) {
      return {
        action: 'apply_remote',
        reason: 'remote_preferred',
        localHash,
        remoteHash,
      };
    }

    // HEROSPASCOAL is online-first: when remote progress exists, Firestore is authoritative.
    return {
      action: 'apply_remote',
      reason: 'remote_authoritative',
      localHash,
      remoteHash,
    };
  }

  const AppSyncPolicy = {
    getStateHash,
    getTimestampMs,
    isTruncatedLocalCache,
    resolvePreferredSyncAction,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppSyncPolicy;
  }

  if (globalScope) {
    globalScope.AppSyncPolicy = AppSyncPolicy;
  }
})(typeof window !== 'undefined' ? window : globalThis);
