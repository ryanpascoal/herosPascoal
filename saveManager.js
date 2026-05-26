/**
 * Save Manager - Centraliza todos os saves com debounce e error recovery
 * Step 2 do plano de revisão do sistema de salvamento
 */

const LOCAL_PROGRESS_KEY = 'heroJourneyData';
const LOCAL_SAVE_META_KEY = 'heroJourneyLocalSaveMeta';
let lastSerializedSnapshot = '';
let lastSaveHash = '';
let lastPersistedAt = null;

function ensureSaveShape() {
  if (!appData.serverMeta) {
    appData.serverMeta = {
      lastDailyReset: null,
      lastWeeklyReset: null,
    };
  }
}

function serializeAppData() {
  ensureSaveShape();
  const payload = typeof buildLocalCachePayload === 'function' ? buildLocalCachePayload() : appData;
  return JSON.stringify(payload);
}

function hashSerializedPayload(serialized) {
  const source = String(serialized || '');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function setLocalSaveMeta(meta) {
  const nextMeta = meta && typeof meta === 'object' ? { ...meta } : null;
  window.__localSaveMeta = nextMeta;
  return nextMeta;
}

function buildLocalSaveMeta(serialized, options = {}) {
  const savedAt = options.savedAt || new Date().toISOString();
  const hash = hashSerializedPayload(serialized);
  return {
    savedAt,
    source: options.source || 'manual',
    bytes: serialized.length,
    hash,
  };
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error('Erro ao salvar localStorage:', e);
    if (typeof showFeedback === 'function') {
      showFeedback('Erro ao salvar dados localmente. Verifique espaço do navegador.', 'error');
    }
    return false;
  }
}

function safeLocalStorageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (e) {
    console.error('Erro ao carregar localStorage:', e);
    if (typeof showFeedback === 'function') {
      showFeedback('Falha ao carregar dados salvos. O app iniciará com o estado padrão.', 'warn');
    }
    return fallback;
  }
}

function safeLocalStorageGetRaw(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (e) {
    console.error('Erro ao ler localStorage:', e);
    return fallback;
  }
}

function persistLocalSnapshot(serialized, options = {}) {
  const force = options.force === true;
  const source = options.source || 'manual';
  const payloadHash = hashSerializedPayload(serialized);

  if (!force && serialized === lastSerializedSnapshot) {
    const skippedMeta =
      window.__localSaveMeta ||
      buildLocalSaveMeta(serialized, {
        savedAt: lastPersistedAt || new Date().toISOString(),
        source,
      });
    return {
      saved: false,
      skipped: true,
      hash: payloadHash,
      meta: skippedMeta,
    };
  }

  if (!safeLocalStorageSet(LOCAL_PROGRESS_KEY, serialized)) {
    return {
      saved: false,
      skipped: false,
      hash: payloadHash,
      meta: window.__localSaveMeta || null,
    };
  }

  const meta = buildLocalSaveMeta(serialized, {
    savedAt: new Date().toISOString(),
    source,
  });
  safeLocalStorageSet(LOCAL_SAVE_META_KEY, JSON.stringify(meta));
  setLocalSaveMeta(meta);
  lastSerializedSnapshot = serialized;
  lastSaveHash = meta.hash;
  lastPersistedAt = meta.savedAt;

  return {
    saved: true,
    skipped: false,
    hash: payloadHash,
    meta,
  };
}

// Função centralizada de save - sempre salva localmente e tenta nuvem
window.queueSave = function (options = {}) {
  if (window.__suppressSave === true) return;

  const serialized = serializeAppData();
  const result = persistLocalSnapshot(serialized, options);

  // Tenta sincronizar na nuvem quando disponível
  if (!result?.skipped && typeof window.queueCloudSave === 'function') {
    window.queueCloudSave();
  }
  return result;
};

// Implementacao local padrao de persistencia
window.saveToLocalStorage = window.queueSave;
window.getLocalSaveMeta = function () {
  return window.__localSaveMeta ? { ...window.__localSaveMeta } : null;
};
window.loadFromLocalStorage = function () {
  // Se estiver logado na nuvem, a função do cloud-sync será usada automaticamente
  // (cloud-sync.js sobrescreve esta função após a autenticação)
  // Aqui é apenas um fallback para modo offline total

  const savedMeta = safeLocalStorageGet(LOCAL_SAVE_META_KEY, null);
  if (savedMeta && typeof savedMeta === 'object') {
    setLocalSaveMeta(savedMeta);
    lastSaveHash = savedMeta.hash || '';
    lastPersistedAt = savedMeta.savedAt || null;
  }

  // Verificar se existe dados locais (fallback)
  const savedRaw = safeLocalStorageGetRaw(LOCAL_PROGRESS_KEY, null);
  if (savedRaw) {
    lastSerializedSnapshot = savedRaw;
    if (!lastSaveHash) {
      lastSaveHash = hashSerializedPayload(savedRaw);
    }
  }

  const saved = safeLocalStorageGet(LOCAL_PROGRESS_KEY, null);
  if (saved && typeof saved === 'object') {
    replaceAppState(saved);
  }
  finalizeLoadedState();
  console.log('Dados carregados');
};

// Auto-save periódico otimizado (a cada 30s se mudou algo)
setInterval(() => {
  try {
    const serialized = serializeAppData();
    const dataHash = hashSerializedPayload(serialized);
    if (dataHash !== lastSaveHash) {
      window.queueSave({ source: 'autosave' });
    }
  } catch (e) {
    // Em erro de hash, tenta persistir estado mesmo assim
    window.queueSave({ source: 'autosave-fallback', force: true });
  }
}, 30000);

// Cleanup na unload - salva local e tenta nuvem
window.addEventListener('beforeunload', () => {
  if (window.__suppressSave === true) return;
  window.queueSave({ source: 'unload', force: true });
});

console.log('SaveManager v1.2 carregado - backup local com dedupe + sync nuvem');
