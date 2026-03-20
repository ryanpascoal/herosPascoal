/**
 * Save Manager - Centraliza todos os saves com debounce e error recovery
 * Step 2 do plano de revisão do sistema de salvamento
 */

let saveTimeout = null;
let isSaving = false;
let pendingSave = false;
const DEBOUNCE_MS = 1000;
const DATA_VERSION = 2; // Incrementar em mudanças estruturais

// Adiciona versão e serverMeta ao appData se não existirem
function ensureDataVersion() {
    if (!appData.dataVersion) {
        appData.dataVersion = DATA_VERSION;
    }
    if (appData.dataVersion < DATA_VERSION) {
        console.warn('Migrando dados para versão', DATA_VERSION);
        // Aqui futuras migrações estruturais
        appData.dataVersion = DATA_VERSION;
    }
    
    if (!appData.serverMeta) {
        appData.serverMeta = {
            lastDailyReset: null,
            lastWeeklyReset: null
        };
    }
}

// Serialização segura com versão
function serializeAppData() {
    ensureDataVersion();
    return JSON.stringify(appData);
}

// Wrapper com error recovery
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.error('Erro ao salvar localStorage:', e);
        showFeedback('Erro ao salvar dados localmente. Verifique espaço do navegador.', 'error');
        return false;
    }
}

function safeLocalStorageGet(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        if (!value) return fallback;
        const parsed = JSON.parse(value);
        if (!parsed.dataVersion || parsed.dataVersion < DATA_VERSION) {
            console.warn(`Dados desatualizados (v${parsed?.dataVersion || 0}), migrando para v${DATA_VERSION}`);
            // Auto-migração aqui se necessário
        }
        return parsed;
    } catch (e) {
        console.error('Erro ao carregar localStorage:', e);
        // Recovery automático com defaults
        showFeedback('Dados corrompidos restaurados com configurações padrão.', 'warn');
        return fallback || APP_DEFAULTS;
    }
}

// Função centralizada de save - apenas na nuvem
window.queueSave = function() {
    // Salvar apenas na nuvem
    if (typeof window.queueCloudSave === 'function') {
        window.queueCloudSave();
    }
};

function performSave() {
    // Salvar apenas na nuvem
    if (typeof window.queueCloudSave === 'function') {
        window.queueCloudSave();
    }
    // Não salva mais localmente
}

// Substitui funções originais para compatibilidade
window.saveToLocalStorage = window.queueSave;
window.loadFromLocalStorage = function() {
    // Se estiver logado na nuvem, a função do cloud-sync será usada automaticamente
    // (cloud-sync.js sobrescreve esta função após a autenticação)
    // Aqui é apenas um fallback para modo offline total
    
    // Verificar se existe dados locais (fallback)
    const saved = safeLocalStorageGet('heroJourneyData', null);
    if (saved && typeof saved === 'object') {
        mergeData(appData, saved);
    }
    ensureDataIntegrity();
    
    // Migrar resets antigos
    const oldDailyReset = localStorage.getItem('lastDailyReset');
    const oldWeeklyReset = localStorage.getItem('lastWeeklyReset');
    if (oldDailyReset && !appData.serverMeta.lastDailyReset) {
        appData.serverMeta.lastDailyReset = oldDailyReset;
        localStorage.removeItem('lastDailyReset');
        console.log('Migrado lastDailyReset para appData.serverMeta');
    }
    if (oldWeeklyReset && !appData.serverMeta.lastWeeklyReset) {
        appData.serverMeta.lastWeeklyReset = oldWeeklyReset;
        localStorage.removeItem('lastWeeklyReset');
        console.log('Migrado lastWeeklyReset para appData.serverMeta');
    }
    
    console.log('✅ Dados carregados (v' + (appData.dataVersion || 1) + ')');
};

// Auto-save periódico otimizado (a cada 30s se mudou algo)
let lastSaveHash = '';
setInterval(() => {
    try {
        const jsonStr = JSON.stringify(appData);
        // Usar encodeURIComponent para lidar com caracteres unicode (acentos)
        const dataHash = btoa(unescape(encodeURIComponent(jsonStr))).slice(0, 20);
        if (dataHash !== lastSaveHash) {
            // Salvar apenas na nuvem
            if (typeof window.queueCloudSave === 'function') {
                window.queueCloudSave();
            }
            lastSaveHash = dataHash;
        }
    } catch (e) {
        // Se falhar, tente salvar na nuvem
        if (typeof window.queueCloudSave === 'function') {
            window.queueCloudSave();
        }
    }
}, 30000);

// Cleanup na unload - salva apenas na nuvem
window.addEventListener('beforeunload', () => {
    if (typeof window.queueCloudSave === 'function') {
        window.queueCloudSave();
    }
});

console.log('🔧 SaveManager v1.0 carregado - Saves apenas na nuvem');

