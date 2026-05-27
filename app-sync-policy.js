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

  function resolvePreferredSyncAction(options = {}) {
    const {
      localData = null,
      remoteData = null,
      defaultData = null,
      localSavedAt = null,
      remoteUpdatedAt = null,
      timeToleranceMs = 1000,
    } = options;
    const localHash = getStateHash(localData);
    const remoteHash = getStateHash(remoteData);
    const defaultHash = getStateHash(defaultData);

    if (!remoteData || typeof remoteData !== 'object') {
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

    const safeToleranceMs =
      Number.isFinite(Number(timeToleranceMs)) && Number(timeToleranceMs) >= 0
        ? Number(timeToleranceMs)
        : 1000;
    const localMs = getTimestampMs(localSavedAt);
    const remoteMs = getTimestampMs(remoteUpdatedAt);

    if (localMs > 0 && remoteMs > 0) {
      if (localMs > remoteMs + safeToleranceMs) {
        return {
          action: 'push_local',
          reason: 'local_newer',
          localHash,
          remoteHash,
        };
      }

      if (remoteMs > localMs + safeToleranceMs) {
        return {
          action: 'apply_remote',
          reason: 'remote_newer',
          localHash,
          remoteHash,
        };
      }
    }

    if (localMs > 0 && remoteMs === 0) {
      return {
        action: 'push_local',
        reason: 'local_newer',
        localHash,
        remoteHash,
      };
    }

    if (remoteMs > 0) {
      return {
        action: 'apply_remote',
        reason: 'remote_preferred',
        localHash,
        remoteHash,
      };
    }

    return {
      action: 'push_local',
      reason: 'local_priority_fallback',
      localHash,
      remoteHash,
    };
  }

  const AppSyncPolicy = {
    getStateHash,
    getTimestampMs,
    resolvePreferredSyncAction,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppSyncPolicy;
  }

  if (globalScope) {
    globalScope.AppSyncPolicy = AppSyncPolicy;
  }
})(typeof window !== 'undefined' ? window : globalThis);
