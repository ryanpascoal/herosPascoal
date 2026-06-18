(function () {
  'use strict';

  const CLOUD_CACHE_KEY = 'heroJourneyData';
  const AUTH_CACHE_KEY = 'heroJourneyAuth';
  const LAST_SYNC_KEY = 'heroJourneyLastSync';

  // Preencha com as credenciais do seu projeto Firebase.
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyBUBn0cCjAx4aWnfwZitbzTd32Fmh_1MYM',
    authDomain: 'lifesgame-8dbac.firebaseapp.com',
    projectId: 'lifesgame-8dbac',
    storageBucket: 'lifesgame-8dbac.firebasestorage.app',
    messagingSenderId: '1095990800485',
    appId: '1:1095990800485:web:8fc22935f72c7f0619168c',
    measurementId: 'G-D2VDF8TG35',
  };

  let auth = null;
  let db = null;
  let currentUser = null;
  let saveTimer = null;
  let saveInFlight = false;
  let saveQueued = false;
  let cloudReady = false;
  let progressUnsubscribe = null;
  let realtimeEnabled = false;
  let syncBlockedByConflict = false;
  let conflictInProgress = false;
  let pendingRemoteConflict = null;
  let hasUnsyncedLocalChanges = false;
  let lastAppliedRemoteMs = 0;
  let lastAppliedRemoteHash = '';
  let applyingRemoteState = false;
  let authResolved = false;
  let startupRemoteSyncFailed = false;
  const CLIENT_SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const serverMeta = {
    lastDailyReset: null,
    lastWeeklyReset: null,
  };

  function hasValidFirebaseConfig() {
    return (
      FIREBASE_CONFIG.apiKey !== 'COLOQUE_AQUI' &&
      FIREBASE_CONFIG.projectId !== 'COLOQUE_AQUI' &&
      FIREBASE_CONFIG.appId !== 'COLOQUE_AQUI'
    );
  }

  function parseJson(text, fallback) {
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('Falha ao parsear JSON:', err);
      return fallback;
    }
  }

  function safeStorageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ?? fallback;
    } catch (err) {
      console.warn('Falha ao ler localStorage:', err);
      return fallback;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn('Falha ao gravar localStorage:', err);
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn('Falha ao remover item do localStorage:', err);
      return false;
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getSyncPolicyApi() {
    return globalThis.AppSyncPolicy || {};
  }

  function getTimestampMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  function unsubscribeRealtime() {
    if (typeof progressUnsubscribe === 'function') {
      progressUnsubscribe();
    }
    progressUnsubscribe = null;
    realtimeEnabled = false;
  }

  function clearCloudRetryTimer() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  function scheduleCloudRetry(delayMs = 5000) {
    clearCloudRetryTimer();
    if (!currentUser || !cloudReady) return;
    saveTimer = window.setTimeout(() => {
      saveTimer = null;
      if (hasUnsyncedLocalChanges) {
        pushCloud(true);
      }
    }, delayMs);
  }

  function persistLocalCache() {
    try {
      const payload =
        typeof buildLocalCachePayload === 'function'
          ? buildLocalCachePayload()
          : deepClone(appData);
      safeStorageSet(CLOUD_CACHE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Falha ao persistir cache local:', err);
    }
  }

  function applyDataGuards() {
    if (typeof finalizeLoadedState === 'function') {
      finalizeLoadedState();
    } else if (typeof populateFinanceMonthOptions === 'function') {
      populateFinanceMonthOptions();
    }
  }

  function buildSerializableData() {
    const payload = deepClone(appData);
    return payload;
  }

  function getDataHash(data) {
    try {
      return JSON.stringify(data || {});
    } catch (err) {
      return '';
    }
  }

  function updateServerMetaFromLocal() {
    const meta = appData.serverMeta || {};
    serverMeta.lastDailyReset = meta.lastDailyReset || serverMeta.lastDailyReset;
    serverMeta.lastWeeklyReset = meta.lastWeeklyReset || serverMeta.lastWeeklyReset;
  }

  function persistServerMetaToApp() {
    if (!appData.serverMeta || typeof appData.serverMeta !== 'object') appData.serverMeta = {};
    appData.serverMeta.lastDailyReset = serverMeta.lastDailyReset || null;
    appData.serverMeta.lastWeeklyReset = serverMeta.lastWeeklyReset || null;
  }

  function setSyncStatus(message, kind) {
    ['cloud-sync-status', 'auth-sync-status'].forEach((id) => {
      const status = document.getElementById(id);
      if (!status) return;
      status.textContent = message;
      status.classList.remove('ok', 'warn', 'err', 'syncing');
      status.classList.add(kind || 'warn');
    });

    // Atualizar indicador no cabeÃƒÂ§alho tambÃƒÂ©m
    updateHeaderSyncIndicator(message, kind);
  }

  function updateHeaderSyncIndicator(message, kind) {
    let indicator = document.getElementById('header-sync-indicator');
    if (!indicator) {
      // Criar indicador no cabeÃƒÂ§alho se nÃƒÂ£o existir
      const headerStats = document.querySelector('.header-stats');
      if (headerStats) {
        indicator = document.createElement('div');
        indicator.id = 'header-sync-indicator';
        indicator.className = 'stats-item sync-indicator';
        indicator.style.cssText =
          'cursor: pointer; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem;';
        indicator.title = 'Clique para sincronizar';
        headerStats.appendChild(indicator);

        // Adicionar clique para sincronizar manualmente
        indicator.addEventListener('click', function () {
          if (cloudReady && currentUser) {
            pushCloud(true);
          } else {
            // Se nÃƒÂ£o estÃƒÂ¡ conectado, mostra o painel de login
            openCloudLoginPanel();
          }
        });
      }
    }

    if (indicator) {
      // Mapear mensagens para ÃƒÂ­cones e cores
      let icon = '[~]';
      let bgColor = 'rgba(255,255,255,0.05)';
      let textColor = 'var(--gray-color)';

      if (kind === 'ok') {
        icon = '[OK]';
        bgColor = 'rgba(32, 217, 128, 0.2)';
        textColor = '#20D980';
      } else if (kind === 'err') {
        icon = '[ERRO]';
        bgColor = 'rgba(255, 77, 109, 0.2)';
        textColor = '#FF4D6D';
      } else if (message && message.toLowerCase().includes('sincronizando')) {
        icon = '[...]';
        bgColor = 'rgba(16, 242, 255, 0.2)';
        textColor = '#10F2FF';
      }

      indicator.innerHTML = `<span style="margin-right:4px;">${icon}</span><span>${message || 'Nuvem'}</span>`;
      indicator.style.background = bgColor;
      indicator.style.color = textColor;
      indicator.style.border = `1px solid ${textColor}40`;
    }
  }

  function setUserLabel(text) {
    ['cloud-user-label', 'auth-user-label'].forEach((id) => {
      const userLabel = document.getElementById(id);
      if (!userLabel) return;
      userLabel.textContent = text;
    });
  }

  function setAuthEntryState(isAuthenticated, options = {}) {
    const body = document.body;
    const authScreen = document.getElementById('auth-screen');
    const titleEl = document.getElementById('auth-screen-title');
    const textEl = document.getElementById('auth-screen-text');

    if (body) {
      body.classList.toggle('app-authenticated', isAuthenticated === true);
      body.classList.toggle('app-auth-pending', isAuthenticated !== true);
    }

    if (authScreen) {
      authScreen.classList.toggle('active', isAuthenticated !== true);
    }

    if (titleEl && options.title) titleEl.textContent = options.title;
    if (textEl && options.text) textEl.textContent = options.text;
  }
  window.setAuthEntryState = setAuthEntryState;

  function openCloudLoginPanel() {
    setAuthEntryState(false, {
      title: 'Login',
      text: 'Entre para liberar o sistema e carregar seus dados da nuvem.',
    });
    setCloudAccessLock(false);

    const emailInput = document.getElementById('cloud-email');
    if (emailInput && typeof emailInput.focus === 'function') {
      window.setTimeout(() => emailInput.focus(), 120);
    }
  }
  window.openCloudLoginPanel = openCloudLoginPanel;

  function ensureCloudAccessLock() {
    let lock = document.getElementById('cloud-access-lock');
    if (lock) return lock;

    lock = document.createElement('div');
    lock.id = 'cloud-access-lock';
    lock.className = 'cloud-access-lock';
    lock.innerHTML = `
      <div class="cloud-access-lock-card">
        <div class="cloud-access-lock-badge">Sincronização obrigatória</div>
        <h3 id="cloud-access-lock-title">Faça login para usar o HEROSPASCOAL</h3>
        <p id="cloud-access-lock-text">
          O modo offline foi desativado para evitar conflitos. A nuvem é a fonte principal do progresso.
        </p>
        <button type="button" class="submit-btn" id="cloud-access-lock-action">Ir para login</button>
      </div>
    `;

    document.body.appendChild(lock);
    lock.querySelector('#cloud-access-lock-action')?.addEventListener('click', openCloudLoginPanel);
    return lock;
  }

  function setCloudAccessLock(active, options = {}) {
    const lock = ensureCloudAccessLock();
    const titleEl = lock.querySelector('#cloud-access-lock-title');
    const textEl = lock.querySelector('#cloud-access-lock-text');
    const actionEl = lock.querySelector('#cloud-access-lock-action');
    const title = options.title || 'Faça login para usar o HEROSPASCOAL';
    const text =
      options.text ||
      'O modo offline foi desativado para evitar conflitos. A nuvem é a fonte principal do progresso.';
    const actionLabel = options.actionLabel || 'Ir para login';
    const hideAction = options.hideAction === true;

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (actionEl) {
      actionEl.textContent = actionLabel;
      actionEl.hidden = hideAction;
    }

    if (!document.body?.classList.contains('app-authenticated')) {
      lock.classList.remove('active');
      return;
    }

    lock.classList.toggle('active', active === true);
  }

  function ensureCloudUI() {
    if (document.getElementById('cloud-email') && document.getElementById('cloud-login-btn')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'cloud-auth-panel';
    panel.innerHTML =
      '' +
      '<input id="cloud-email" type="email" placeholder="Email" />' +
      '<input id="cloud-password" type="password" placeholder="Senha" />' +
      '<button id="cloud-login-btn" type="button">Entrar</button>' +
      '<button id="cloud-register-btn" type="button">Criar conta</button>' +
      '<button id="cloud-logout-btn" type="button">Sair</button>' +
      '<button id="cloud-sync-now-btn" type="button">Sincronizar Agora</button>' +
      '<span id="cloud-user-label">N\u00e3o autenticado</span>' +
      '<span id="cloud-sync-status" class="warn">Login obrigatório</span>';
    document.body.appendChild(panel);
  }

  function getProgressRef(uid) {
    return db.collection('users').doc(uid).collection('progress').doc('main');
  }

  function releaseStartupGate() {
    window.__cloudSyncBootstrapPending = false;
    if (typeof window.runDeferredStartupResets === 'function') {
      window.runDeferredStartupResets();
    }
  }

  function canRunCriticalResets() {
    if (window.location && window.location.protocol === 'file:') return false;
    if (!hasValidFirebaseConfig()) return false;
    if (!window.firebase) return false;
    return authResolved && !!currentUser && cloudReady && !startupRemoteSyncFailed;
  }
  window.shouldRunCriticalResets = canRunCriticalResets;

  async function pushCloud(force) {
    if (!cloudReady || !currentUser) return;
    if (syncBlockedByConflict) {
      setSyncStatus('Sincroniza\u00e7\u00e3o pausada por conflito', 'warn');
      return;
    }
    if (saveInFlight) {
      saveQueued = true;
      return;
    }

    saveInFlight = true;
    persistServerMetaToApp();

    try {
      const payload = buildSerializableData();
      await getProgressRef(currentUser.uid).set(
        {
          appData: payload,
          serverMeta: { ...serverMeta },
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: currentUser.email || currentUser.uid,
          updatedBySession: CLIENT_SESSION_ID,
        },
        { merge: true }
      );

      hasUnsyncedLocalChanges = false;
      clearCloudRetryTimer();
      setSyncStatus(force ? 'Sincronizado (agora)' : 'Sincronizado', 'ok');
    } catch (err) {
      console.error('Erro ao salvar na nuvem:', err);
      hasUnsyncedLocalChanges = true;
      setSyncStatus('Erro ao sincronizar', 'err');
      scheduleCloudRetry();
    } finally {
      saveInFlight = false;
      if (saveQueued) {
        saveQueued = false;
        pushCloud(false);
      }
    }
  }

  // Salva apenas na nuvem (sem localStorage)
  function queueCloudSave() {
    if (!cloudReady || !currentUser) {
      // Sem login: em modo cloud-only ignoramos saves automÃƒÂ¡ticos silenciosamente.
      // O estado de conexÃƒÂ£o jÃƒÂ¡ ÃƒÂ© exibido via onAuthStateChanged.
      return;
    }
    // Push imediato para a nuvem (mais seguro)
    pushCloud(false);
  }
  window.queueCloudSave = queueCloudSave;

  // FunÃƒÂ§ÃƒÂ£o para verificar e notificar sobre modificaÃƒÂ§ÃƒÂµes remotas
  function checkRemoteModification(remoteTimestamp) {
    if (!remoteTimestamp) return;

    // Converter timestamp do Firebase para data
    let remoteDate;
    if (remoteTimestamp.toDate && typeof remoteTimestamp.toDate === 'function') {
      remoteDate = remoteTimestamp.toDate();
    } else if (remoteTimestamp instanceof Date) {
      remoteDate = remoteTimestamp;
    } else if (typeof remoteTimestamp === 'string') {
      remoteDate = new Date(remoteTimestamp);
    } else {
      return;
    }

    // Obter ÃƒÂºltima sincronizaÃƒÂ§ÃƒÂ£o local
    const lastLocalSync = safeStorageGet(LAST_SYNC_KEY, null);
    const lastSyncDate = lastLocalSync ? new Date(parseInt(lastLocalSync)) : null;

    // Se HÃƒÂ¡ dados locais e a nuvem foi modificada mais recentemente
    if (lastSyncDate && remoteDate > lastSyncDate) {
      const diffMs = Date.now() - remoteDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      let timeAgo;
      if (diffMins < 1) timeAgo = 'H\u00e1 poucos segundos';
      else if (diffMins < 60) timeAgo = 'H\u00e1 ' + diffMins + ' minuto' + (diffMins > 1 ? 's' : '');
      else if (diffHours < 24) timeAgo = 'H\u00e1 ' + diffHours + ' hora' + (diffHours > 1 ? 's' : '');
      else timeAgo = remoteDate.toLocaleDateString('pt-BR');

      // Mostrar notificaÃƒÂ§ÃƒÂ£o
      showRemoteChangeNotification(timeAgo);
    }
  }

  // Mostrar notificaÃƒÂ§ÃƒÂ£o de alteraÃƒÂ§ÃƒÂ£o remota
  function showRemoteChangeNotification(timeAgo) {
    const notification = document.createElement('div');
    notification.id = 'remote-change-notification';
    notification.className = 'notification-banner info';
    notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px;">
                <span style="font-size: 1.5rem;">[!]</span>
                <div style="flex: 1;">
                    <strong>Dados modificados em outro dispositivo</strong>
                    <p style="margin: 4px 0 0; font-size: 0.85rem; opacity: 0.9;">                        \u00daltima altera\u00e7\u00e3o na nuvem: ${timeAgo}
                    </p>
                </div>
                <button type="button" data-close-remote-change style="
                    background: none; border: none; color: inherit; 
                    font-size: 1.2rem; cursor: pointer; opacity: 0.7;
                ">&times;</button>
            </div>
        `;

    notification
      .querySelector('[data-close-remote-change]')
      ?.addEventListener('click', () => notification.remove());

    // Inserir no topo da pÃƒÂ¡gina
    document.body.insertBefore(notification, document.body.firstChild);

    // Auto-remover apÃƒÂ³s 10 segundos
    setTimeout(() => {
      if (notification.parentElement) notification.remove();
    }, 10000);
  }

  function applyRemoteState(remote, options = {}) {
    if (!remote || typeof remote !== 'object') return false;

    if (remote.serverMeta && typeof remote.serverMeta === 'object') {
      serverMeta.lastDailyReset = remote.serverMeta.lastDailyReset || null;
      serverMeta.lastWeeklyReset = remote.serverMeta.lastWeeklyReset || null;
    }

    const remoteAppData = remote.appData;
    if (!remoteAppData || typeof remoteAppData !== 'object') {
      return false;
    }

    const remoteHash = getDataHash(remoteAppData);
    if (options.skipIfUnchanged && remoteHash && remoteHash === lastAppliedRemoteHash) {
      const remoteMsSkip = getTimestampMs(remote.updatedAt);
      if (remoteMsSkip > 0) lastAppliedRemoteMs = Math.max(lastAppliedRemoteMs, remoteMsSkip);
      hasUnsyncedLocalChanges = false;
      return false;
    }

    if (typeof replaceAppState === 'function') {
      replaceAppState(remoteAppData);
    } else {
      Object.keys(appData).forEach((key) => delete appData[key]);
      Object.assign(appData, deepClone(remoteAppData));
    }

    applyDataGuards();
    persistLocalCache();
    safeStorageSet(LAST_SYNC_KEY, Date.now().toString());

    const remoteMs = getTimestampMs(remote.updatedAt);
    if (remoteMs > 0) lastAppliedRemoteMs = remoteMs;
    if (remoteHash) lastAppliedRemoteHash = remoteHash;
    hasUnsyncedLocalChanges = false;

    if (options.statusMessage) {
      setSyncStatus(options.statusMessage, options.statusKind || 'ok');
    }
    if (typeof updateUI === 'function') {
      const uiMode = options.uiMode || 'activity';
      const forceNutrition = options.forceNutrition === true;
      applyingRemoteState = true;
      window.__suppressSave = true;
      try {
        updateUI({ mode: uiMode, forceNutrition });
      } finally {
        window.__suppressSave = false;
        applyingRemoteState = false;
      }
    }
    return true;
  }

  async function resolveRemoteConflict(remote) {
    if (!remote || typeof remote !== 'object') return;
    conflictInProgress = true;
    syncBlockedByConflict = true;
    setSyncStatus('Conflito detectado. Aplicando versão da nuvem...', 'syncing');
    applyRemoteState(remote, {
      statusMessage: 'Versão da nuvem aplicada',
      statusKind: 'ok',
      uiMode: 'activity',
      skipIfUnchanged: true,
    });
    syncBlockedByConflict = false;
    conflictInProgress = false;

    if (pendingRemoteConflict) {
      const next = pendingRemoteConflict;
      pendingRemoteConflict = null;
      await resolveRemoteConflict(next);
    }
  }

  function handleRealtimeRemoteUpdate(remote) {
    if (!remote || typeof remote !== 'object' || !remote.appData) return;

    const remoteSession = remote.updatedBySession || '';
    const remoteMs = getTimestampMs(remote.updatedAt);

    if (remoteSession && remoteSession === CLIENT_SESSION_ID) {
      if (remoteMs > 0) lastAppliedRemoteMs = Math.max(lastAppliedRemoteMs, remoteMs);
      hasUnsyncedLocalChanges = false;
      return;
    }

    if (remoteMs > 0 && remoteMs <= lastAppliedRemoteMs) return;

    const incomingHash = getDataHash(remote.appData);
    if (incomingHash && incomingHash === lastAppliedRemoteHash) {
      if (remoteMs > 0) lastAppliedRemoteMs = Math.max(lastAppliedRemoteMs, remoteMs);
      return;
    }

    if (hasUnsyncedLocalChanges || syncBlockedByConflict) {
      if (conflictInProgress) {
        pendingRemoteConflict = remote;
        return;
      }
      resolveRemoteConflict(remote).catch(function (err) {
        console.error('Erro ao resolver conflito:', err);
        syncBlockedByConflict = false;
        conflictInProgress = false;
        setSyncStatus('Falha ao resolver conflito', 'err');
      });
      return;
    }

    applyRemoteState(remote, {
      statusMessage: 'Atualizado em tempo real (outro dispositivo)',
      statusKind: 'ok',
      uiMode: 'activity',
      skipIfUnchanged: true,
    });
  }

  function startRealtimeSync(uid) {
    if (!uid || !db) return;
    unsubscribeRealtime();
    progressUnsubscribe = getProgressRef(uid).onSnapshot(
      function (snap) {
        if (!snap.exists) return;
        const remote = snap.data() || {};
        handleRealtimeRemoteUpdate(remote);
      },
      function (err) {
        console.error('Erro no listener em tempo real:', err);
        setSyncStatus('Falha na sincronizacao em tempo real', 'err');
      }
    );
    realtimeEnabled = true;
  }

  async function pullCloud(uid) {
    const snap = await getProgressRef(uid).get();
    if (!snap.exists) {
      updateServerMetaFromLocal();
      return { hasRemoteData: false };
    }

    const remote = snap.data() || {};

    // Verificar se houve modificaÃƒÂ§ÃƒÂ£o remota antes de sobrescrever
    const remoteTimestamp = remote.updatedAt;
    checkRemoteModification(remoteTimestamp);
    const applied = applyRemoteState(remote, {
      statusMessage: 'Dados carregados da nuvem',
      statusKind: 'ok',
      uiMode: 'full',
      skipIfUnchanged: true,
    });
    if (!applied) return { hasRemoteData: true };
    return { hasRemoteData: true };
  }

  async function pullCloudAuthoritative(uid) {
    const snap = await getProgressRef(uid).get();
    if (!snap.exists) {
      const syncPolicyApi = getSyncPolicyApi();
      const localData = buildSerializableData();
      const decision =
        typeof syncPolicyApi.resolvePreferredSyncAction === 'function'
          ? syncPolicyApi.resolvePreferredSyncAction({
              localData,
              remoteData: null,
              defaultData:
                typeof cloneDefaultAppState === 'function' ? cloneDefaultAppState() : APP_DEFAULTS,
            })
          : { action: 'push_local', reason: 'remote_missing' };

      if (decision.action === 'start_fresh') {
        if (typeof replaceAppState === 'function') {
          replaceAppState(
            typeof cloneDefaultAppState === 'function' ? cloneDefaultAppState() : APP_DEFAULTS
          );
        }
        setSyncStatus('Nenhum progresso na nuvem. Iniciando estado novo...', 'warn');
      }

      updateServerMetaFromLocal();
      return { hasRemoteData: false, shouldPushLocal: true, decision };
    }

    const remote = snap.data() || {};
    const remoteAppData = remote.appData && typeof remote.appData === 'object' ? remote.appData : null;
    const syncPolicyApi = getSyncPolicyApi();
    const localSaveMeta =
      typeof globalThis.getLocalSaveMeta === 'function' ? globalThis.getLocalSaveMeta() : null;
    const decision =
      typeof syncPolicyApi.resolvePreferredSyncAction === 'function'
        ? syncPolicyApi.resolvePreferredSyncAction({
            localData: buildSerializableData(),
            remoteData: remoteAppData,
            defaultData: typeof cloneDefaultAppState === 'function' ? cloneDefaultAppState() : APP_DEFAULTS,
            localSavedAt: localSaveMeta?.savedAt || null,
            remoteUpdatedAt: remote.updatedAt || null,
          })
        : { action: 'apply_remote', reason: 'fallback' };

    if (decision.action === 'push_local') {
      updateServerMetaFromLocal();
      setSyncStatus('Primeira sincronização. Enviando dados locais para a nuvem...', 'syncing');
      return {
        hasRemoteData: true,
        shouldPushLocal: true,
        preferredSource: 'local-bootstrap',
        decision,
      };
    }

    if (decision.action === 'keep_local') {
      const remoteMs = getTimestampMs(remote.updatedAt);
      const remoteHash = getDataHash(remoteAppData);
      if (remoteMs > 0) lastAppliedRemoteMs = Math.max(lastAppliedRemoteMs, remoteMs);
      if (remoteHash) lastAppliedRemoteHash = remoteHash;
      hasUnsyncedLocalChanges = false;
      setSyncStatus('Sincronizado', 'ok');
      return {
        hasRemoteData: true,
        shouldPushLocal: false,
        preferredSource: 'unchanged',
        decision,
      };
    }

    const applied = applyRemoteState(remote, {
      statusMessage: 'Dados carregados da nuvem',
      statusKind: 'ok',
      uiMode: 'full',
      skipIfUnchanged: true,
    });
    if (!applied) {
      return { hasRemoteData: true, shouldPushLocal: false, preferredSource: 'cloud', decision };
    }
    return { hasRemoteData: true, shouldPushLocal: false, preferredSource: 'cloud', decision };
  }

  function overrideStorageFunctions() {
    window.loadFromLocalStorage = function () {
      const saved = parseJson(safeStorageGet(CLOUD_CACHE_KEY, null), null);
      if (saved && typeof saved === 'object') {
        if (typeof replaceAppState === 'function') {
          replaceAppState(saved);
        } else {
          Object.keys(appData).forEach((key) => delete appData[key]);
          Object.assign(appData, deepClone(saved));
        }
      }
      applyDataGuards();
      updateServerMetaFromLocal();
    };

    // Salva localmente e sincroniza automaticamente quando autenticado.
    window.saveToLocalStorage = function () {
      if (window.__suppressSave === true || applyingRemoteState) return;
      hasUnsyncedLocalChanges = true;
      if (typeof window.queueSave === 'function') {
        return window.queueSave({
          source: currentUser && cloudReady ? 'cloud-session' : 'auth-required',
        });
      }
      persistLocalCache();
      if (currentUser && cloudReady) {
        queueCloudSave();
      }
      return null;
    };

    window.checkDailyReset = function () {
      if (!currentUser || !cloudReady) return;
      const today = getLocalDateString();
      const lastReset = serverMeta.lastDailyReset;

      if (!lastReset) {
        serverMeta.lastDailyReset = today;
        persistServerMetaToApp();
        saveToLocalStorage();
        return;
      }

      if (lastReset !== today) {
        const todayDate = parseLocalDateString(today);
        const yesterday = new Date(todayDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);
        const missedDates =
          window.AppRules && typeof window.AppRules.getMissedDateKeys === 'function'
            ? window.AppRules.getMissedDateKeys(lastReset, today)
            : (() => {
                const keys = [];
                const lastDate = parseLocalDateString(lastReset);
                const cursor = new Date(lastDate);
                while (cursor < todayDate) {
                  keys.push(getLocalDateString(cursor));
                  cursor.setDate(cursor.getDate() + 1);
                }
                return keys;
              })();

        missedDates.forEach((dateKey) => {
          if (dateKey >= yesterdayStr) return;
          applyPenalties(dateKey);
        });

        if (typeof cleanupOldDailyWorkouts === 'function') {
          cleanupOldDailyWorkouts();
        }
        if (typeof cleanupOldDailyStudies === 'function') {
          cleanupOldDailyStudies();
        }
        cleanupOldDailyMissions();
        cleanupOldDailyWorks();
        if (typeof checkOverdueMissions === 'function') {
          checkOverdueMissions({ skipWeekly: true });
        }
        if (typeof checkOverdueWorks === 'function') {
          checkOverdueWorks({ skipWeekly: true });
        }
        generateDailyActivities();

        serverMeta.lastDailyReset = today;
        persistServerMetaToApp();
        saveToLocalStorage();
        if (typeof updateUI === 'function') updateUI({ mode: 'activity' });
      }
    };

    window.checkWeeklyReset = function () {
      if (!currentUser || !cloudReady) return;
      const today = new Date();
      const thisWeekKey =
        typeof getWeekKey === 'function'
          ? getWeekKey(today)
          : `${today.getFullYear()}-W${getWeekNumber(today)}`;
      const lastWeeklyReset = serverMeta.lastWeeklyReset;
      if (!lastWeeklyReset) {
        serverMeta.lastWeeklyReset = thisWeekKey;
        persistServerMetaToApp();
        saveToLocalStorage();
        return;
      }
      if (lastWeeklyReset !== thisWeekKey) {
        serverMeta.lastWeeklyReset = thisWeekKey;
        persistServerMetaToApp();
        saveToLocalStorage();
        if (typeof updateUI === 'function') updateUI({ mode: 'activity' });
      }
    };

    window.resetProgress = async function () {
      if (
        !confirm(
          'Tem certeza que deseja resetar o progresso? Seus alimentos cadastrados serao preservados. Isso nao pode ser desfeito.'
        )
      )
        return;
      const confirmationText = prompt(
        'Digite RESETAR para confirmar a exclusao total do progresso:'
      );
      if (confirmationText !== 'RESETAR') {
        alert('Reset cancelado.');
        return;
      }

      window.__suppressSave = true;
      safeStorageRemove(CLOUD_CACHE_KEY);
      safeStorageRemove(AUTH_CACHE_KEY);
      safeStorageRemove(LAST_SYNC_KEY);
      safeStorageRemove('heroJourneyLocalSaveMeta');

      if (cloudReady && currentUser) {
        try {
          const resetState =
            typeof cloneDefaultAppState === 'function'
              ? cloneDefaultAppState()
              : JSON.parse(JSON.stringify(APP_DEFAULTS));
          const preservedFoodItems = appData?.foodItems ? JSON.parse(JSON.stringify(appData.foodItems)) : [];
          resetState.foodItems = preservedFoodItems;
          const nowIso = new Date().toISOString();
          const payload = {
            appData: resetState,
            updatedAt:
              typeof firebase !== 'undefined' && firebase?.firestore?.FieldValue?.serverTimestamp
                ? firebase.firestore.FieldValue.serverTimestamp()
                : nowIso,
            updatedBy: currentUser.uid,
            updatedByEmail: currentUser.email || null,
            updatedBySession: CLIENT_SESSION_ID,
            serverMeta: resetState.serverMeta || { lastDailyReset: null, lastWeeklyReset: null },
          };
          await getProgressRef(currentUser.uid).set(payload, { merge: false });
        } catch (err) {
          console.error('Erro ao limpar progresso remoto:', err);
        }
      }

      window.__suppressSave = true;
      location.reload();
    };
  }

  function bindAuthActions() {
    const emailEl = document.getElementById('cloud-email');
    const passwordEl = document.getElementById('cloud-password');
    const loginBtn = document.getElementById('cloud-login-btn');
    const registerBtn = document.getElementById('cloud-register-btn');
    const logoutButtons = Array.from(
      document.querySelectorAll('#cloud-logout-btn, #cloud-profile-logout-btn')
    );
    const syncNowButtons = Array.from(
      document.querySelectorAll('#cloud-sync-now-btn, #cloud-profile-sync-now-btn')
    );

    if (!emailEl || !passwordEl || !loginBtn || !registerBtn) return;

    const savedAuth = parseJson(safeStorageGet(AUTH_CACHE_KEY, null), {});
    if (savedAuth.email) emailEl.value = savedAuth.email;

    const performLogin = async function () {
      const email = (emailEl.value || '').trim();
      const password = passwordEl.value || '';
      if (!email || !password) {
        alert('Informe email e senha.');
        return;
      }
      safeStorageSet(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        alert('Erro no login: ' + (err.message || err.code || 'desconhecido'));
      }
    };
    loginBtn.addEventListener('click', performLogin);
    passwordEl.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        performLogin();
      }
    });

    registerBtn.addEventListener('click', async function () {
      const email = (emailEl.value || '').trim();
      const password = passwordEl.value || '';
      if (!email || !password) {
        alert('Informe email e senha.');
        return;
      }
      safeStorageSet(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
      try {
        await auth.createUserWithEmailAndPassword(email, password);
      } catch (err) {
        alert('Erro ao criar conta: ' + (err.message || err.code || 'desconhecido'));
      }
    });

    logoutButtons.forEach((button) => {
      button.addEventListener('click', async function () {
        await auth.signOut();
      });
    });

    syncNowButtons.forEach((button) => {
      button.addEventListener('click', async function () {
        if (!cloudReady || !currentUser) {
          alert('Faca login para sincronizar.');
          return;
        }
        await pushCloud(true);
      });
    });
  }

  async function initFirebaseSync() {
    if (window.location && window.location.protocol === 'file:') {
      authResolved = true;
      setSyncStatus('Uso bloqueado: abra via http:// com nuvem ativa', 'err');
      setAuthEntryState(false, {
        title: 'Abra via http://',
        text: 'O HEROSPASCOAL só entra após login e sincronização. Abra o projeto via http:// para autenticar.',
      });
      setCloudAccessLock(true, {
        title: 'Uso offline bloqueado',
        text: 'Abra o aplicativo via http:// para autenticar e sincronizar. O modo offline foi desativado.',
        hideAction: true,
      });
      releaseStartupGate();
      return;
    }

    if (!window.firebase) {
      authResolved = true;
      startupRemoteSyncFailed = true;
      setSyncStatus('SDK Firebase nao carregado', 'err');
      setAuthEntryState(false, {
        title: 'Sincronização indisponível',
        text: 'O Firebase não carregou. Sem nuvem, o sistema não libera a entrada.',
      });
      setCloudAccessLock(true, {
        title: 'Sincronização indisponível',
        text: 'O Firebase não carregou. Sem nuvem, o uso do app fica bloqueado para evitar conflitos.',
        hideAction: true,
      });
      releaseStartupGate();
      return;
    }

    if (!hasValidFirebaseConfig()) {
      authResolved = true;
      setSyncStatus('Configure FIREBASE_CONFIG', 'err');
      setAuthEntryState(false, {
        title: 'Configuração incompleta',
        text: 'O Firebase ainda não está configurado. Sem isso, o login não libera o sistema.',
      });
      setCloudAccessLock(true, {
        title: 'Sincronização não configurada',
        text: 'A configuração do Firebase está incompleta. Sem nuvem, o uso do app fica bloqueado.',
        hideAction: true,
      });
      releaseStartupGate();
      return;
    }

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    authResolved = false;
    startupRemoteSyncFailed = false;

    bindAuthActions();

    auth.onAuthStateChanged(async function (user) {
      authResolved = true;
      currentUser = user;

      if (!user) {
        unsubscribeRealtime();
        clearCloudRetryTimer();
        cloudReady = false;
        startupRemoteSyncFailed = false;
        syncBlockedByConflict = false;
        conflictInProgress = false;
        pendingRemoteConflict = null;
        hasUnsyncedLocalChanges = false;
        setUserLabel('N\u00e3o autenticado');
        setSyncStatus('Login obrigatório para usar', 'warn');
        setAuthEntryState(false, {
          title: 'Login',
          text: 'Entre para liberar o HEROSPASCOAL e carregar seu progresso sincronizado.',
        });
        setCloudAccessLock(true, {
          title: 'Faça login para continuar',
          text: 'O modo offline foi desativado. Ao entrar, o progresso sincronizado da conta será a fonte principal.',
          actionLabel: 'Ir para login',
        });
        releaseStartupGate();
        return;
      }

      unsubscribeRealtime();
      clearCloudRetryTimer();
      cloudReady = false;
      startupRemoteSyncFailed = false;
      syncBlockedByConflict = false;
      conflictInProgress = false;
      pendingRemoteConflict = null;
      setUserLabel('Usuario: ' + (user.email || user.uid));
      setSyncStatus('Conectado. Sincronizando...', 'warn');
      setAuthEntryState(false, {
        title: 'Sincronizando seus dados',
        text: 'Aguarde enquanto a sessão valida o login e alinha seus dados com a nuvem.',
      });
      setCloudAccessLock(true, {
        title: 'Sincronizando seus dados',
        text: 'Aguarde enquanto carregamos o progresso sincronizado da sua conta.',
        hideAction: true,
      });

      try {
        const result = await pullCloudAuthoritative(user.uid);
        cloudReady = true;
        startRealtimeSync(user.uid);
        releaseStartupGate();
        if (result && result.shouldPushLocal === true) {
          hasUnsyncedLocalChanges = true;
          await pushCloud(true);
        }
        if (typeof updateStreaks === 'function') updateStreaks();
        if (typeof updateUI === 'function') updateUI({ mode: 'full' });
        setAuthEntryState(true);
        setCloudAccessLock(false);
      } catch (err) {
        console.error('Erro ao carregar nuvem:', err);
        startupRemoteSyncFailed = true;
        setSyncStatus('Falha ao carregar nuvem', 'err');
        setAuthEntryState(false, {
          title: 'Falha ao entrar',
          text: 'O login foi reconhecido, mas a sincronização inicial falhou. O sistema continua bloqueado até a nuvem responder.',
        });
        setCloudAccessLock(true, {
          title: 'Falha ao conectar com a nuvem',
          text: 'Sem sincronização ativa, o uso do app fica bloqueado para proteger seus dados locais.',
          hideAction: true,
        });
        releaseStartupGate();
      }
    });
  }

  function init() {
    overrideStorageFunctions();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        ensureCloudUI();
        setAuthEntryState(false, {
          title: 'Verificando autenticação',
          text: 'O sistema libera o painel principal apenas depois da autenticação e da sincronização inicial.',
        });
        setCloudAccessLock(true, {
          title: 'Verificando autenticação',
          text: 'O uso do HEROSPASCOAL fica disponível após conectar seus dados locais à nuvem.',
          hideAction: true,
        });
        initFirebaseSync();
      });
      return;
    }

    ensureCloudUI();
    setAuthEntryState(false, {
      title: 'Verificando autenticação',
      text: 'O sistema libera o painel principal apenas depois da autenticação e da sincronização inicial.',
    });
    setCloudAccessLock(true, {
      title: 'Verificando autenticação',
      text: 'O uso do HEROSPASCOAL fica disponível após conectar seus dados locais à nuvem.',
      hideAction: true,
    });
    initFirebaseSync();
  }

  init();
})();
