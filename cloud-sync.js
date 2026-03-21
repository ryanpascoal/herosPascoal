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

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function persistLocalCache() {
    try {
      localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(deepClone(appData)));
    } catch (err) {
      console.warn('Falha ao persistir cache local:', err);
    }
  }

  function ensureDiaryMemoryMode() {
    if (typeof diaryDbAvailable !== 'undefined') diaryDbAvailable = false;
    if (!Array.isArray(appData.diaryEntries)) appData.diaryEntries = [];
    if (typeof diaryCache !== 'undefined') diaryCache = appData.diaryEntries;
    if (typeof diaryLoaded !== 'undefined') diaryLoaded = true;
  }

  function applyDataGuards() {
    if (typeof ensureDataIntegrity === 'function') {
      ensureDataIntegrity();
    } else {
      // Fallback if ensureDataIntegrity not yet defined
      if (typeof ensureCriticalDataShape === 'function') ensureCriticalDataShape();
      ensureCoreAttributes();
      ensureClasses();
      ensureStartingLevels();
      normalizeClassIds();
    }
    if (typeof populateFinanceMonthOptions === 'function') populateFinanceMonthOptions();
  }

  function buildSerializableData() {
    const payload = deepClone(appData);
    payload.diaryEntries = Array.isArray(diaryCache)
      ? deepClone(diaryCache)
      : deepClone(appData.diaryEntries || []);
    return payload;
  }

  function getDataHash(data) {
    try {
      return JSON.stringify(data || {});
    } catch (err) {
      return '';
    }
  }

  async function loadLegacyDiaryFromIndexedDBIfNeeded() {
    if (Array.isArray(appData.diaryEntries) && appData.diaryEntries.length > 0) return;
    if (typeof getAllDiaryEntriesFromDB !== 'function') return;
    try {
      const legacyEntries = await getAllDiaryEntriesFromDB();
      if (!Array.isArray(legacyEntries) || legacyEntries.length === 0) return;
      appData.diaryEntries = legacyEntries.slice();
      diaryCache = appData.diaryEntries;
      diaryLoaded = true;
      console.log('Diário legado migrado do IndexedDB para memória/nuvem');
    } catch (err) {
      console.warn('Falha ao ler diário legado do IndexedDB:', err);
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
    const status = document.getElementById('cloud-sync-status');
    if (status) {
      status.textContent = message;
      status.classList.remove('ok', 'warn', 'err', 'syncing');
      status.classList.add(kind || 'warn');
    }

    // Atualizar indicador no cabeçalho também
    updateHeaderSyncIndicator(message, kind);
  }

  function updateHeaderSyncIndicator(message, kind) {
    let indicator = document.getElementById('header-sync-indicator');
    if (!indicator) {
      // Criar indicador no cabeçalho se não existir
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
            // Se não está conectado, mostra o painel de login
            const panel = document.getElementById('cloud-auth-panel');
            if (panel) {
              panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
            }
          }
        });
      }
    }

    if (indicator) {
      // Mapear mensagens para ícones e cores
      let icon = '☁️';
      let bgColor = 'rgba(255,255,255,0.05)';
      let textColor = 'var(--gray-color)';

      if (kind === 'ok') {
        icon = '✅';
        bgColor = 'rgba(32, 217, 128, 0.2)';
        textColor = '#20D980';
      } else if (kind === 'err') {
        icon = '❌';
        bgColor = 'rgba(255, 77, 109, 0.2)';
        textColor = '#FF4D6D';
      } else if (message && message.toLowerCase().includes('sincronizando')) {
        icon = '🔄';
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
    const userLabel = document.getElementById('cloud-user-label');
    if (!userLabel) return;
    userLabel.textContent = text;
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
      '<span id="cloud-user-label">Não autenticado</span>' +
      '<span id="cloud-sync-status" class="warn">Modo local</span>';
    document.body.appendChild(panel);
  }

  function getProgressRef(uid) {
    return db.collection('users').doc(uid).collection('progress').doc('main');
  }

  function canRunCriticalResets() {
    return cloudReady && !!currentUser;
  }
  window.shouldRunCriticalResets = canRunCriticalResets;

  async function pushCloud(force) {
    if (!cloudReady || !currentUser) return;
    if (syncBlockedByConflict) {
      setSyncStatus('Sincronização pausada por conflito', 'warn');
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
      setSyncStatus(force ? 'Sincronizado (agora)' : 'Sincronizado', 'ok');
    } catch (err) {
      console.error('Erro ao salvar na nuvem:', err);
      setSyncStatus('Erro ao sincronizar', 'err');
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
      // Sem login: em modo cloud-only ignoramos saves automáticos silenciosamente.
      // O estado de conexão já é exibido via onAuthStateChanged.
      return;
    }
    // Push imediato para a nuvem (mais seguro)
    pushCloud(false);
  }
  window.queueCloudSave = queueCloudSave;

  // Função para verificar e notificar sobre modificações remotas
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

    // Obter última sincronização local
    const lastLocalSync = localStorage.getItem(LAST_SYNC_KEY);
    const lastSyncDate = lastLocalSync ? new Date(parseInt(lastLocalSync)) : null;

    // Se Há dados locais e a nuvem foi modificada mais recentemente
    if (lastSyncDate && remoteDate > lastSyncDate) {
      const diffMs = Date.now() - remoteDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      let timeAgo;
      if (diffMins < 1) timeAgo = 'Há poucos segundos';
      else if (diffMins < 60) timeAgo = `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      else if (diffHours < 24) timeAgo = `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      else timeAgo = remoteDate.toLocaleDateString('pt-BR');

      // Mostrar notificação
      showRemoteChangeNotification(timeAgo);
    }
  }

  // Mostrar notificação de alteração remota
  function showRemoteChangeNotification(timeAgo) {
    const notification = document.createElement('div');
    notification.id = 'remote-change-notification';
    notification.className = 'notification-banner info';
    notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px;">
                <span style="font-size: 1.5rem;">📱</span>
                <div style="flex: 1;">
                    <strong>Dados modificados em outro dispositivo</strong>
                    <p style="margin: 4px 0 0; font-size: 0.85rem; opacity: 0.9;">
                        Última alteração na nuvem: ${timeAgo}
                    </p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none; border: none; color: inherit; 
                    font-size: 1.2rem; cursor: pointer; opacity: 0.7;
                ">&times;</button>
            </div>
        `;

    // Inserir no topo da página
    document.body.insertBefore(notification, document.body.firstChild);

    // Auto-remover após 10 segundos
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

    Object.keys(appData).forEach((key) => delete appData[key]);
    Object.assign(appData, deepClone(remoteAppData));

    ensureDiaryMemoryMode();
    if (Array.isArray(remoteAppData.diaryEntries)) {
      appData.diaryEntries = remoteAppData.diaryEntries.slice();
      diaryCache = appData.diaryEntries;
      diaryLoaded = true;
    }

    applyDataGuards();
    persistLocalCache();
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    const remoteMs = getTimestampMs(remote.updatedAt);
    if (remoteMs > 0) lastAppliedRemoteMs = remoteMs;
    if (remoteHash) lastAppliedRemoteHash = remoteHash;
    hasUnsyncedLocalChanges = false;

    if (options.statusMessage) {
      setSyncStatus(options.statusMessage, options.statusKind || 'ok');
    }
    if (typeof updateUI === 'function') {
      const uiMode = options.uiMode || 'activity';
      const forceCalendar = options.forceCalendar === true;
      const forceNutrition = options.forceNutrition === true;
      applyingRemoteState = true;
      window.__suppressSave = true;
      try {
        updateUI({ mode: uiMode, forceCalendar, forceNutrition });
      } finally {
        window.__suppressSave = false;
        applyingRemoteState = false;
      }
    }
    return true;
  }

  async function askConflictKeepLocal() {
    const message =
      'Conflito detectado: dados mudaram em outro dispositivo enquanto havia alterações locais. Deseja manter a versão LOCAL e sobrescrever a nuvem?';
    if (typeof askConfirmation === 'function') {
      return await askConfirmation(message, {
        title: 'Conflito de sincronização',
        confirmText: 'Manter local',
        cancelText: 'Usar nuvem',
      });
    }
    return confirm(message);
  }

  async function resolveRemoteConflict(remote) {
    if (!remote || typeof remote !== 'object') return;
    conflictInProgress = true;
    syncBlockedByConflict = true;
    setSyncStatus('Conflito detectado. Escolha local ou nuvem.', 'warn');

    const keepLocal = await askConflictKeepLocal();
    if (keepLocal) {
      syncBlockedByConflict = false;
      conflictInProgress = false;
      setSyncStatus('Mantendo local. Enviando para nuvem...', 'syncing');
      hasUnsyncedLocalChanges = true;
      await pushCloud(true);
    } else {
      applyRemoteState(remote, {
        statusMessage: 'Conflito resolvido: versão da nuvem aplicada',
        statusKind: 'ok',
      });
      syncBlockedByConflict = false;
      conflictInProgress = false;
    }

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
        setSyncStatus('Falha na sincronização em tempo real', 'err');
      }
    );
    realtimeEnabled = true;
  }

  async function pullCloud(uid) {
    const snap = await getProgressRef(uid).get();
    if (!snap.exists) {
      await loadLegacyDiaryFromIndexedDBIfNeeded();
      updateServerMetaFromLocal();
      return { hasRemoteData: false };
    }

    const remote = snap.data() || {};

    // Verificar se houve modificação remota antes de sobrescrever
    const remoteTimestamp = remote.updatedAt;
    checkRemoteModification(remoteTimestamp);
    const applied = applyRemoteState(remote, {
      statusMessage: 'Dados carregados da nuvem',
      statusKind: 'ok',
      uiMode: 'full',
      forceCalendar: true,
      skipIfUnchanged: true,
    });
    if (!applied) return { hasRemoteData: true };
    return { hasRemoteData: true };
  }

  function overrideStorageFunctions() {
    window.loadFromLocalStorage = function () {
      const saved = parseJson(localStorage.getItem(CLOUD_CACHE_KEY), null);
      if (saved && typeof saved === 'object') mergeData(appData, saved);
      ensureDiaryMemoryMode();
      applyDataGuards();
      updateServerMetaFromLocal();
    };

    // Salva na nuvem quando autenticado; sem login, mantem cache local.
    window.saveToLocalStorage = function () {
      if (window.__suppressSave === true || applyingRemoteState) return;
      if (!cloudReady || !currentUser) {
        hasUnsyncedLocalChanges = true;
        persistLocalCache();
        return;
      }
      if (syncBlockedByConflict) {
        hasUnsyncedLocalChanges = true;
        persistLocalCache();
        setSyncStatus('Sincronização pausada até resolver conflito', 'warn');
        return;
      }
      hasUnsyncedLocalChanges = true;
      // Salvar na nuvem
      queueCloudSave();
    };

    window.initDiaryStorage = async function () {
      ensureDiaryMemoryMode();
    };

    window.saveDiaryEntryToStorage = async function (entry) {
      if (!Array.isArray(appData.diaryEntries)) appData.diaryEntries = [];
      appData.diaryEntries.push(entry);
      diaryCache = appData.diaryEntries;
      diaryLoaded = true;
      if (typeof queueSave === 'function') {
        queueSave();
      }
    };

    window.checkDailyReset = function () {
      const today = getLocalDateString();
      let lastReset = serverMeta.lastDailyReset || appData.serverMeta?.lastDailyReset || null;
      if (!Number.isFinite(appData.hero.maxLives) || appData.hero.maxLives <= 0)
        appData.hero.maxLives = 10;
      if (!Number.isFinite(appData.hero.lives) || appData.hero.lives < 0)
        appData.hero.lives = appData.hero.maxLives;

      if (!lastReset) {
        serverMeta.lastDailyReset = today;
        persistServerMetaToApp();
        saveToLocalStorage();
        return;
      }

      if (lastReset !== today) {
        const lastDate = parseLocalDateString(lastReset);
        const todayDate = parseLocalDateString(today);
        const cursor = new Date(lastDate);

        while (cursor < todayDate) {
          applyPenalties(getLocalDateString(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }

        appData.dailyWorkouts = [];
        appData.dailyStudies = [];
        cleanupOldDailyMissions();
        cleanupOldDailyWorks();
        generateDailyActivities();

        serverMeta.lastDailyReset = today;
        persistServerMetaToApp();
        saveToLocalStorage();
        if (typeof updateUI === 'function') updateUI({ mode: 'activity' });
      }
    };

    window.checkWeeklyReset = function () {
      const today = new Date();
      const thisWeekKey =
        typeof getWeekKey === 'function'
          ? getWeekKey(today)
          : `${today.getFullYear()}-W${getWeekNumber(today)}`;
      const lastWeeklyReset =
        serverMeta.lastWeeklyReset || appData.serverMeta?.lastWeeklyReset || null;
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
      if (!confirm('Tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito.'))
        return;
      const confirmationText = prompt(
        'Digite RESETAR para confirmar a exclusão total do progresso:'
      );
      if (confirmationText !== 'RESETAR') {
        alert('Reset cancelado.');
        return;
      }

      window.__suppressSave = true;
      localStorage.removeItem(CLOUD_CACHE_KEY);
      localStorage.removeItem(AUTH_CACHE_KEY);

      if (cloudReady && currentUser) {
        try {
          await getProgressRef(currentUser.uid).delete();
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
    const logoutBtn = document.getElementById('cloud-logout-btn');
    const syncNowBtn = document.getElementById('cloud-sync-now-btn');

    if (!emailEl || !passwordEl || !loginBtn || !registerBtn || !logoutBtn || !syncNowBtn) return;

    const savedAuth = parseJson(localStorage.getItem(AUTH_CACHE_KEY), {});
    if (savedAuth.email) emailEl.value = savedAuth.email;

    loginBtn.addEventListener('click', async function () {
      const email = (emailEl.value || '').trim();
      const password = passwordEl.value || '';
      if (!email || !password) {
        alert('Informe email e senha.');
        return;
      }
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (err) {
        alert('Erro no login: ' + (err.message || err.code || 'desconhecido'));
      }
    });

    registerBtn.addEventListener('click', async function () {
      const email = (emailEl.value || '').trim();
      const password = passwordEl.value || '';
      if (!email || !password) {
        alert('Informe email e senha.');
        return;
      }
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
      try {
        await auth.createUserWithEmailAndPassword(email, password);
      } catch (err) {
        alert('Erro ao criar conta: ' + (err.message || err.code || 'desconhecido'));
      }
    });

    logoutBtn.addEventListener('click', async function () {
      await auth.signOut();
    });

    syncNowBtn.addEventListener('click', async function () {
      if (!cloudReady || !currentUser) {
        alert('Faça login para sincronizar.');
        return;
      }
      await pushCloud(true);
    });
  }

  async function initFirebaseSync() {
    if (window.location && window.location.protocol === 'file:') {
      setSyncStatus('Modo local (abra via http:// para usar nuvem)', 'warn');
      return;
    }

    if (!window.firebase) {
      setSyncStatus('SDK Firebase não carregado', 'err');
      return;
    }

    if (!hasValidFirebaseConfig()) {
      setSyncStatus('Configure FIREBASE_CONFIG', 'warn');
      return;
    }

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();

    bindAuthActions();

    auth.onAuthStateChanged(async function (user) {
      currentUser = user;

      if (!user) {
        unsubscribeRealtime();
        cloudReady = false;
        syncBlockedByConflict = false;
        conflictInProgress = false;
        pendingRemoteConflict = null;
        hasUnsyncedLocalChanges = false;
        setUserLabel('Não autenticado');
        setSyncStatus('Modo local (sem login)', 'warn');
        return;
      }

      unsubscribeRealtime();
      cloudReady = false;
      syncBlockedByConflict = false;
      conflictInProgress = false;
      pendingRemoteConflict = null;
      setUserLabel('Usuario: ' + (user.email || user.uid));
      setSyncStatus('Conectado. Sincronizando...', 'warn');

      try {
        const result = await pullCloud(user.uid);
        cloudReady = true;
        startRealtimeSync(user.uid);
        if (result && result.hasRemoteData === false) {
          await pushCloud(true);
        }
        if (typeof checkDailyReset === 'function') checkDailyReset();
        if (typeof checkOverdueMissions === 'function')
          checkOverdueMissions({ isInitialCheck: true });
        if (typeof checkOverdueWorks === 'function') checkOverdueWorks({ isInitialCheck: true });
        if (typeof checkWeeklyReset === 'function') checkWeeklyReset();
        if (typeof updateStreaks === 'function') updateStreaks();
        if (typeof handleGameOverIfNeeded === 'function')
          handleGameOverIfNeeded({ isInitialCheck: true });
        if (typeof updateUI === 'function') updateUI({ mode: 'full', forceCalendar: true });
      } catch (err) {
        console.error('Erro ao carregar nuvem:', err);
        setSyncStatus('Falha ao carregar nuvem', 'err');
      }
    });
  }

  function init() {
    ensureDiaryMemoryMode();
    overrideStorageFunctions();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        ensureCloudUI();
        initFirebaseSync();
      });
      return;
    }

    ensureCloudUI();
    initFirebaseSync();
  }

  init();
})();
