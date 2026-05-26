(function (globalScope) {
  'use strict';

  function getStateHash(data) {
    try {
      return JSON.stringify(data || null);
    } catch (err) {
      return '';
    }
  }

  function resolvePreferredSyncAction(options = {}) {
    const { localData = null, remoteData = null, defaultData = null } = options;
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
    if (hasMeaningfulLocalData) {
      return {
        action: 'push_local',
        reason: 'local_priority',
        localHash,
        remoteHash,
      };
    }

    return {
      action: 'apply_remote',
      reason: 'remote_preferred',
      localHash,
      remoteHash,
    };
  }

  const AppSyncPolicy = {
    getStateHash,
    resolvePreferredSyncAction,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppSyncPolicy;
  }

  if (globalScope) {
    globalScope.AppSyncPolicy = AppSyncPolicy;
  }
})(typeof window !== 'undefined' ? window : globalThis);
