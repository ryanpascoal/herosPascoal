// InicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o principal do aplicativo
function getGlobalHook(name, fallback) {
  const hook = window[name];
  return typeof hook === 'function' ? hook : fallback;
}

function runDailyResetHook() {
  if (window.__cloudSyncBootstrapPending === true) return false;
  getGlobalHook('checkDailyReset', checkDailyReset)();
  return true;
}

function runWeeklyResetHook() {
  if (window.__cloudSyncBootstrapPending === true) return false;
  getGlobalHook('checkWeeklyReset', checkWeeklyReset)();
  return true;
}

function runDeferredStartupResets() {
  if (window.__startupCriticalTasksRan === true) return true;
  if (window.__cloudSyncBootstrapPending === true) return false;

  const canRunCriticalResets =
    typeof window.shouldRunCriticalResets === 'function' ? window.shouldRunCriticalResets() : true;
  if (!canRunCriticalResets) return false;

  if (typeof prepareStartupFailureReviews === 'function') {
    prepareStartupFailureReviews();
  }
  runDailyResetHook();
  recreateDailyMissionsForToday();
  recreateDailyWorksForToday();
  cleanupOldDailyMissions();
  cleanupOldDailyWorks();
  checkOverdueMissions({ isInitialCheck: true });
  checkOverdueWorks({ isInitialCheck: true });
  runWeeklyResetHook();
  generateDailyActivities();

  window.__startupCriticalTasksRan = true;

  if (window.__startupUiReady !== true) return true;
  if (typeof updateStreaks === 'function') updateStreaks();
  if (typeof updateUI === 'function') {
    updateUI({ mode: 'full', forceCalendar: true, forceNutrition: true });
  }
  return true;
}

window.runDeferredStartupResets = runDeferredStartupResets;

function startApp() {
  if (window.__appStarted) return;
  window.__appStarted = true;

  // 1. Primeiro: carregar dados salvos
  if (typeof window.loadFromLocalStorage === 'function') {
    window.loadFromLocalStorage();
  }
  runDeferredStartupResets();

    // 2. Verificar e recriar missÃƒÆ’Ã‚Âµes diÃƒÆ’Ã‚Â¡rias para HOJE (coloque AQUI!)




  // 5. Resto da inicializaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o...
  updateStreaks();
  initUI();
  initEvents();
  initHydrationUI();
  window.__startupUiReady = true;
  updateUI();
  if (typeof switchTab === 'function') {
    const activeTab = document.querySelector('.tab-content.active')?.id || 'atividades';
    switchTab(activeTab);
  }
  updateMidnightCountdown();
  setInterval(updateMidnightCountdown, 1000);
  updateCurrentDate();
  setInterval(runDailyResetHook, 60000);
  setInterval(runWeeklyResetHook, 60000);
  setInterval(updateStreaks, 60000);
  window.setTimeout(() => {
    if (typeof processPendingFailureReviews === 'function') {
      processPendingFailureReviews();
    }
  }, 0);
}

// Carregar dados - agora delega para a nuvem quando disponÃƒÆ’Ã‚Â­vel
function loadFromLocalStorage() {
  const delegatedLoader = window.loadFromLocalStorage;
  // Delegar para a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do cloud-sync se estiver disponÃƒÆ’Ã‚Â­vel (ela ÃƒÆ’Ã‚Â© definida apÃƒÆ’Ã‚Â³s autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o)
  // A funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o cloud-sync carrega os dados da nuvem quando o usuÃƒÆ’Ã‚Â¡rio estÃƒÆ’Ã‚Â¡ logado
  if (typeof delegatedLoader === 'function' && delegatedLoader !== loadFromLocalStorage) {
    // Chamar a funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o global (pode ser do cloud-sync ou fallback)
    delegatedLoader();
  } else {
    // Fallback: apenas para desenvolvimento offline sem Firebase
    try {
      const savedData = localStorage.getItem('heroJourneyData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        replaceAppState(parsedData);
        finalizeLoadedState();
        console.log('Dados carregados do localStorage (modo offline)');
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }
}

function normalizeWeekdayValue(value) {
  const asNumber = Number(value);
  return Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 6 ? asNumber : null;
}

function cloneDefaultAppState() {
  return JSON.parse(JSON.stringify(APP_DEFAULTS));
}

function replaceAppState(source) {
  const nextState =
    source && typeof source === 'object' ? JSON.parse(JSON.stringify(source)) : cloneDefaultAppState();
  Object.keys(appData).forEach((key) => delete appData[key]);
  Object.assign(appData, nextState);
}

function finalizeLoadedState() {
  if (typeof populateFinanceMonthOptions === 'function') {
    populateFinanceMonthOptions();
  }
}

const LOCAL_CACHE_HISTORY_LIMIT = 240;
const LOCAL_CACHE_HERO_LOG_LIMIT = 120;

function getRecentItemsForLocalCache(list, limit = LOCAL_CACHE_HISTORY_LIMIT) {
  if (!Array.isArray(list)) return [];
  if (!Number.isFinite(limit) || limit <= 0) return list.slice();
  return list.length > limit ? list.slice(-limit) : list.slice();
}

function buildLocalCachePayload() {
  const payload = JSON.parse(JSON.stringify(appData));

  payload.completedMissions = getRecentItemsForLocalCache(payload.completedMissions);
  payload.completedWorks = getRecentItemsForLocalCache(payload.completedWorks);
  payload.completedWorkouts = getRecentItemsForLocalCache(payload.completedWorkouts);
  payload.completedStudies = getRecentItemsForLocalCache(payload.completedStudies);
  payload.heroLogs = getRecentItemsForLocalCache(payload.heroLogs, LOCAL_CACHE_HERO_LOG_LIMIT);

  payload.localCacheMeta = {
    cachedAt: new Date().toISOString(),
    historyWindow: LOCAL_CACHE_HISTORY_LIMIT,
    heroLogsWindow: LOCAL_CACHE_HERO_LOG_LIMIT,
    totalCounts: {
      completedMissions: Array.isArray(appData.completedMissions)
        ? appData.completedMissions.length
        : 0,
      completedWorks: Array.isArray(appData.completedWorks) ? appData.completedWorks.length : 0,
      completedWorkouts: Array.isArray(appData.completedWorkouts)
        ? appData.completedWorkouts.length
        : 0,
      completedStudies: Array.isArray(appData.completedStudies)
        ? appData.completedStudies.length
        : 0,
      heroLogs: Array.isArray(appData.heroLogs) ? appData.heroLogs.length : 0,
    },
    cachedCounts: {
      completedMissions: payload.completedMissions.length,
      completedWorks: payload.completedWorks.length,
      completedWorkouts: payload.completedWorkouts.length,
      completedStudies: payload.completedStudies.length,
      heroLogs: payload.heroLogs.length,
    },
  };

  return payload;
}

// FunÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o para mesclar dados
/* saveToLocalStorage() substituÃƒÆ’Ã‚Â­da por saveManager.js */

// Verificar reset diÃƒÆ’Ã‚Â¡rio - usa apenas serverMeta (salvo na nuvem)
function checkDailyReset() {
  const today = getLocalDateString();
  // Agora usa apenas serverMeta.lastDailyReset (que ÃƒÆ’Ã‚Â© salvo na nuvem)
  let lastReset = appData.serverMeta?.lastDailyReset;
  if (!lastReset) {
    if (!appData.serverMeta) appData.serverMeta = {};
    const inferredLastReset =
      window.AppRules && typeof window.AppRules.inferLegacyLastDailyResetDate === 'function'
        ? window.AppRules.inferLegacyLastDailyResetDate(appData, today)
        : null;

    if (!inferredLastReset) {
      appData.serverMeta.lastDailyReset = today;
      queueSave();
      return;
    }

    lastReset = inferredLastReset;
  }

  const shouldRun =
    window.AppRules && typeof window.AppRules.shouldRunDailyReset === 'function'
      ? window.AppRules.shouldRunDailyReset(lastReset, today)
      : lastReset !== today;

  if (shouldRun) {
    const missedDates =
      window.AppRules && typeof window.AppRules.getMissedDateKeys === 'function'
        ? window.AppRules.getMissedDateKeys(lastReset, today)
        : (() => {
            const keys = [];
            const lastDate = parseLocalDateString(lastReset);
            const todayDate = parseLocalDateString(today);
            const cursor = new Date(lastDate);
            while (cursor < todayDate) {
              keys.push(getLocalDateString(cursor));
              cursor.setDate(cursor.getDate() + 1);
            }
            return keys;
          })();

    missedDates.forEach((dateKey) => applyPenalties(dateKey));

    // Limpar atividades do dia anterior
    appData.dailyWorkouts = [];
    appData.dailyStudies = [];

    // Atualizar missÃƒÆ’Ã‚Âµes/trabalhos diÃƒÆ’Ã‚Â¡rios e limpar antigos
    cleanupOldDailyMissions();
    cleanupOldDailyWorks();

    // Processar atrasos de itens com prazo (eventual/epica).
    // skipWeekly evita duplicidade com o pipeline de applyPenalties para semanais.
    if (typeof checkOverdueMissions === 'function') {
      checkOverdueMissions({ skipWeekly: true });
    }
    if (typeof checkOverdueWorks === 'function') {
      checkOverdueWorks({ skipWeekly: true });
    }

    // Gerar novas atividades do dia
    generateDailyActivities();

    appData.serverMeta.lastDailyReset = today;
    queueSave();
    updateUI({ mode: 'activity' });
    console.log('Reset diÃƒÆ’Ã‚Â¡rio aplicado');
  }
}

// Verificar reset semanal - usa apenas serverMeta (salvo na nuvem)
function checkWeeklyReset() {
  const today = getGameNow();
  const thisWeekKey = getWeekKey(today);
  // Agora usa apenas serverMeta.lastWeeklyReset (que ÃƒÆ’Ã‚Â© salvo na nuvem)
  let lastWeeklyReset = appData.serverMeta?.lastWeeklyReset;

  if (!lastWeeklyReset) {
    // Primeira vez: inicializar serverMeta e salvar na nuvem
    if (!appData.serverMeta) appData.serverMeta = {};
    appData.serverMeta.lastWeeklyReset = thisWeekKey;
    queueSave();
    return;
  }

  const shouldRun =
    window.AppRules && typeof window.AppRules.shouldRunWeeklyReset === 'function'
      ? window.AppRules.shouldRunWeeklyReset(lastWeeklyReset, today)
      : lastWeeklyReset !== thisWeekKey;

  if (shouldRun) {
    appData.serverMeta.lastWeeklyReset = thisWeekKey;
    queueSave();
    updateUI({ mode: 'activity' });
    console.log('Reset semanal aplicado');
  }
}

// Gerar nÃƒÆ’Ã‚Âºmero da semana
function getWeekNumber(date) {
  const key = getWeekKey(date);
  if (!key) return 0;
  const match = key.match(/-W(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function getWeekKey(date) {
  if (window.AppRules && typeof window.AppRules.getWeekKey === 'function') {
    return window.AppRules.getWeekKey(date);
  }
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const weekYear = d.getFullYear();
  const yearStart = new Date(weekYear, 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${weekYear}-W${weekNo}`;
}

function addHeroLog(type, title, content, meta = null) {
  if (!appData.heroLogs) appData.heroLogs = [];
  // Usar data local com horÃƒÆ’Ã‚Â¡rio correto
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  );
  const normalizedMeta =
    meta && typeof meta === 'object'
      ? {
          category: String(meta.category || '').trim(),
          sourceId: String(meta.sourceId || '').trim(),
          eventDateKey: String(meta.eventDateKey || '').trim(),
          status: String(meta.status || '').trim(),
        }
      : null;
  const logEntry = {
    id: createUniqueId(appData.heroLogs),
    type,
    title,
    content,
    date: localDate.toISOString(),
  };
  if (normalizedMeta && Object.values(normalizedMeta).some(Boolean)) {
    logEntry.meta = normalizedMeta;
  }
  appData.heroLogs.push(logEntry);
  // Manter logs sob controle
  if (appData.heroLogs.length > 200) {
    appData.heroLogs = appData.heroLogs.slice(-200);
  }
}

function getFxLayer() {
  let layer = document.getElementById('fx-layer');
  if (layer) return layer;

  layer = document.createElement('div');
  layer.id = 'fx-layer';
  layer.className = 'fx-layer';
  document.body.appendChild(layer);
  return layer;
}

function getToastContainer() {
  const layer = getFxLayer();
  let container = document.getElementById('fx-toast-container');
  if (container) return container;

  container = document.createElement('div');
  container.id = 'fx-toast-container';
  container.className = 'fx-toast-container';
  layer.appendChild(container);
  return container;
}

function showToast(message, type = 'info', duration = 2200) {
  if (!message) return;

  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `fx-toast fx-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 260);
  }, duration);
}

function showFeedback(message, type = 'info', duration = 2200) {
  showToast(message, type, duration);
}

function getDialogModal() {
  let modal = document.getElementById('fx-dialog-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'fx-dialog-modal';
  modal.className = 'modal';
  modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="fx-dialog-title">Confirma\u00e7\u00e3o</h3>
                <button type="button" class="close-modal" data-dialog-close>&times;</button>
            </div>
            <div class="modal-body" id="fx-dialog-body"></div>
        </div>
    `;
  document.body.appendChild(modal);
  return modal;
}

function closeDialogModal() {
  const modal = document.getElementById('fx-dialog-modal');
  if (!modal) return;
  modal.classList.remove('active');
}

function showDialog(options = {}) {
  const {
    title = 'Confirma\u00e7\u00e3o',
    message = '',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    requireInput = false,
    inputValue = '',
    inputPlaceholder = '',
    validate,
  } = options;

  return new Promise((resolve) => {
    const modal = getDialogModal();
    const titleEl = modal.querySelector('#fx-dialog-title');
    const bodyEl = modal.querySelector('#fx-dialog-body');
    if (!titleEl || !bodyEl) {
      resolve(null);
      return;
    }

    titleEl.textContent = title;
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    bodyEl.innerHTML = `
            <p>${safeMessage}</p>
            ${requireInput ? `<input type="text" id="fx-dialog-input" value="${escapeHtml(inputValue)}" placeholder="${escapeHtml(inputPlaceholder)}">` : ''}
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                <button type="button" class="action-btn" data-dialog-cancel>${cancelText}</button>
                <button type="button" class="submit-btn" data-dialog-confirm>${confirmText}</button>
            </div>
        `;

    const cancelBtn = bodyEl.querySelector('[data-dialog-cancel]');
    const confirmBtn = bodyEl.querySelector('[data-dialog-confirm]');
    const closeBtn = modal.querySelector('[data-dialog-close]');
    const input = requireInput ? bodyEl.querySelector('#fx-dialog-input') : null;
    let done = false;

    const finish = (value) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKeyDown);
      modal.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      if (confirmBtn) confirmBtn.onclick = null;
      closeDialogModal();
      resolve(value);
    };

    const onKeyDown = (event) => {
      if (!modal.classList.contains('active')) return;
      if (event.key === 'Escape') finish(null);
      if (event.key === 'Enter') {
        confirmBtn?.click();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    if (cancelBtn) cancelBtn.onclick = () => finish(null);
    if (closeBtn) closeBtn.onclick = () => finish(null);
    if (confirmBtn)
      confirmBtn.onclick = () => {
        if (!requireInput) {
          finish(true);
          return;
        }

        const rawValue = input?.value ?? '';
        if (typeof validate === 'function') {
          const validationMessage = validate(rawValue);
          if (validationMessage) {
            showFeedback(validationMessage, 'warn');
            return;
          }
        }
        finish(rawValue);
      };
    modal.onclick = (event) => {
      if (event.target !== modal) return;
      finish(null);
    };

    modal.classList.add('active');
    if (input) {
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    }
  });
}

async function askConfirmation(message, options = {}) {
  const result = await showDialog({
    title: options.title || 'Confirmar a\u00e7\u00e3o',
    message,
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
  });
  if (options.returnNullOnDismiss === true && result === null) {
    return null;
  }
  return result === true;
}

async function askInput(message, options = {}) {
  const result = await showDialog({
    title: options.title || 'Inserir valor',
    message,
    confirmText: options.confirmText || 'Salvar',
    cancelText: options.cancelText || 'Cancelar',
    requireInput: true,
    inputValue: options.defaultValue || '',
    inputPlaceholder: options.placeholder || '',
    validate: options.validate,
  });
  if (result === null) return null;
  return String(result);
}

function pulseElement(target, className = 'fx-pop') {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return;

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), 500);
}

function spawnFloatingReward(target, text, kind = 'xp') {
  const anchor = typeof target === 'string' ? document.querySelector(target) : target;
  if (!anchor || !text) return;

  const layer = getFxLayer();
  const rect = anchor.getBoundingClientRect();
  const badge = document.createElement('div');
  badge.className = `fx-float fx-${kind}`;
  badge.textContent = text;
  badge.style.left = `${Math.max(8, rect.left + rect.width / 2)}px`;
  badge.style.top = `${Math.max(8, rect.top - 4)}px`;

  layer.appendChild(badge);
  window.setTimeout(() => badge.remove(), 900);
}

function celebrateAction(options = {}) {
  const { containerSelector, target, xp = 0, coins = 0, message = '', type = 'success' } = options;

  if (containerSelector) pulseElement(containerSelector);

  const anchor =
    target || document.getElementById('current-xp') || document.querySelector('.profile-header');
  if (xp) spawnFloatingReward(anchor, `${xp > 0 ? '+' : ''}${xp} XP`, xp > 0 ? 'xp' : 'warn');
  if (coins) {
    const coinLabel = `${coins > 0 ? '+' : ''}${coins} moeda${Math.abs(coins) === 1 ? '' : 's'}`;
    spawnFloatingReward(anchor, coinLabel, coins >= 0 ? 'coin' : 'warn');
  }

  if (message) showToast(message, type);
}

function applyCoinPenalty(options = {}) {
  const {
    requestedAmount = 0,
    failMessage,
    failLogTitle,
    failLogContent,
  } = options;

  const penaltyAmount = Number.isFinite(Number(requestedAmount))
    ? Math.max(0, Math.floor(Number(requestedAmount)))
    : 0;
  const currentCoins = Number.isFinite(appData.hero?.coins) ? appData.hero.coins : 0;
  const coinsLost = Math.min(currentCoins, penaltyAmount);
  if (appData.hero) {
    appData.hero.coins = Math.max(0, currentCoins - coinsLost);
  }

  let feedbackMessage = failMessage || 'Penalidade aplicada.';
  if (coinsLost > 0) {
    feedbackMessage += ` -${coinsLost} moeda${coinsLost === 1 ? '' : 's'}.`;
  } else {
    feedbackMessage += ' Sem moedas para descontar.';
  }

  showFeedback(feedbackMessage, 'error');

  if (failLogTitle && failLogContent) {
    const logSuffix =
      coinsLost > 0
        ? `Penalidade: -${coinsLost} moeda${coinsLost === 1 ? '' : 's'}.`
        : 'Sem moedas suficientes para desconto.';
    addHeroLog('penalty', failLogTitle, `${failLogContent} ${logSuffix}`);
  }

  return {
    coinsLost,
    requestedAmount: penaltyAmount,
  };
}

function applyActivityPenalties(config) {
  const statsKey = config?.statsKey;
  const targetDateStr = config?.targetDateStr || getLocalDateString();
  const legacyTypeMap = {
    missionsFailed: 'mission',
    worksFailed: 'work',
    workoutsFailed: 'workout',
    studiesFailed: 'study',
  };
  const mappedType = legacyTypeMap[statsKey];
  if (!mappedType || typeof globalThis.applyPenalties !== 'function') {
    return;
  }

  // Legacy compatibility: route any old callers through the unified penalties flow.
  globalThis.applyPenalties(targetDateStr, { onlyTypes: [mappedType] });
}

// Gerar atividades do dia
function generateDailyActivities() {
  if (!Array.isArray(appData.dailyWorkouts)) appData.dailyWorkouts = [];
  if (!Array.isArray(appData.dailyStudies)) appData.dailyStudies = [];
  if (!Array.isArray(appData.workouts)) appData.workouts = [];
  if (!Array.isArray(appData.studies)) appData.studies = [];

  const today = getGameNow();
  const dayOfWeek = today.getDay();
  const todayStr = getLocalDateString(today);
  const hasScheduledDay = (days) =>
    Array.isArray(days) && days.some((day) => normalizeWeekdayValue(day) === dayOfWeek);
  const sameId = (a, b) => String(a) === String(b);

  // Gerar treinos do dia
  appData.workouts.forEach((workout) => {
    if (hasScheduledDay(workout.days)) {
      const alreadyExists = appData.dailyWorkouts.some(
        (dw) => sameId(dw.workoutId, workout.id) && dw.date === todayStr
      );

      if (!alreadyExists) {
        appData.dailyWorkouts.push({
          id: createUniqueId(appData.dailyWorkouts),
          workoutId: workout.id,
          date: todayStr,
          completed: false,
          series: [null, null, null],
          distance: null,
          time: null,
          feedback: '',
        });
      }
    }
  });

  // Gerar estudos do dia
  appData.studies.forEach((study) => {
    if (hasScheduledDay(study.days)) {
      const alreadyExists = appData.dailyStudies.some(
        (ds) => sameId(ds.studyId, study.id) && ds.date === todayStr
      );

      if (!alreadyExists) {
        appData.dailyStudies.push({
          id: createUniqueId(appData.dailyStudies),
          studyId: study.id,
          date: todayStr,
          completed: false,
          applied: false,
          feedback: '',
        });
      }
    }
  });
}

// Inicializar elementos da interface

// __appCoreBridge: exposes core APIs for legacy scripts during module migration
Object.assign(globalThis, {
  startApp,
  cloneDefaultAppState,
  replaceAppState,
  finalizeLoadedState,
  normalizeWeekdayValue,
  buildLocalCachePayload,
  checkDailyReset,
  checkWeeklyReset,
  getWeekNumber,
  getWeekKey,
  addHeroLog,
  getFxLayer,
  getToastContainer,
  showToast,
  showFeedback,
  getDialogModal,
  closeDialogModal,
  showDialog,
  askConfirmation,
  askInput,
  pulseElement,
  spawnFloatingReward,
  celebrateAction,
  applyCoinPenalty,
  applyActivityPenalties,
  generateDailyActivities,
});


