/**
 * Save Manager - Centraliza todos os saves com debounce e error recovery
 * Step 2 do plano de revisão do sistema de salvamento
 */

const LOCAL_PROGRESS_KEY = 'heroJourneyData';

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

// Wrapper com error recovery
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
    // Recovery automático com defaults
    if (typeof showFeedback === 'function') {
      showFeedback('Dados corrompidos restaurados com configurações padrão.', 'warn');
    }
    return fallback || APP_DEFAULTS;
  }
}

// Função centralizada de save - sempre salva localmente e tenta nuvem
window.queueSave = function () {
  if (window.__suppressSave === true) return;

  const serialized = serializeAppData();
  safeLocalStorageSet(LOCAL_PROGRESS_KEY, serialized);

  // Tenta sincronizar na nuvem quando disponível
  if (typeof window.queueCloudSave === 'function') {
    window.queueCloudSave();
  }
};

// Implementacao local padrao de persistencia
window.saveToLocalStorage = window.queueSave;
window.loadFromLocalStorage = function () {
  // Se estiver logado na nuvem, a função do cloud-sync será usada automaticamente
  // (cloud-sync.js sobrescreve esta função após a autenticação)
  // Aqui é apenas um fallback para modo offline total

  // Verificar se existe dados locais (fallback)
  const saved = safeLocalStorageGet(LOCAL_PROGRESS_KEY, null);
  if (saved && typeof saved === 'object') {
    mergeData(appData, saved);
  }
  ensureDataIntegrity();
  console.log('Dados carregados');
};

// Auto-save periódico otimizado (a cada 30s se mudou algo)
let lastSaveHash = '';
setInterval(() => {
  try {
    const jsonStr = JSON.stringify(appData);
    // Usar encodeURIComponent para lidar com caracteres unicode (acentos)
    const dataHash = btoa(unescape(encodeURIComponent(jsonStr))).slice(0, 20);
    if (dataHash !== lastSaveHash) {
      window.queueSave();
      lastSaveHash = dataHash;
    }
  } catch (e) {
    // Em erro de hash, tenta persistir estado mesmo assim
    window.queueSave();
  }
}, 30000);

// Cleanup na unload - salva local e tenta nuvem
window.addEventListener('beforeunload', () => {
  if (window.__suppressSave === true) return;
  window.queueSave();
});

console.log('SaveManager v1.1 carregado - backup local + sync nuvem');
