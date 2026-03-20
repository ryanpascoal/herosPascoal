function openDiaryDB() {
  if (diaryDbPromise) return diaryDbPromise;
  diaryDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DIARY_DB_NAME, DIARY_DB_VERSION);
    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DIARY_STORE)) {
        const store = db.createObjectStore(DIARY_STORE, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return diaryDbPromise;
}

function getAllDiaryEntriesFromDB() {
  return openDiaryDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readonly');
        const store = tx.objectStore(DIARY_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      })
  );
}

function saveDiaryEntryToDB(entry) {
  return openDiaryDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readwrite');
        const store = tx.objectStore(DIARY_STORE);
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function replaceDiaryEntriesInDB(entries) {
  return openDiaryDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readwrite');
        const store = tx.objectStore(DIARY_STORE);
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error);
        clearReq.onsuccess = () => {
          entries.forEach((entry) => store.put(entry));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

async function refreshDiaryCache() {
  if (!diaryDbAvailable) {
    diaryCache = Array.isArray(appData.diaryEntries) ? appData.diaryEntries : [];
    diaryLoaded = true;
    return;
  }
  const entries = await getAllDiaryEntriesFromDB();
  diaryCache = entries;
  diaryLoaded = true;
}

async function migrateDiaryEntriesToDBIfNeeded() {
  if (!diaryDbAvailable) return;
  if (!Array.isArray(appData.diaryEntries) || appData.diaryEntries.length === 0) return;
  const entries = appData.diaryEntries.slice();
  appData.diaryEntries = [];
  saveToLocalStorage();
  await replaceDiaryEntriesInDB(entries);
}

async function initDiaryStorage() {
  if (!('indexedDB' in window)) {
    diaryDbAvailable = false;
    diaryLoaded = true;
    return;
  }
  try {
    await openDiaryDB();
    await migrateDiaryEntriesToDBIfNeeded();
    await refreshDiaryCache();
  } catch (e) {
    console.warn('IndexedDB indisponível. Usando localStorage para diário.', e);
    diaryDbAvailable = false;
    diaryLoaded = true;
  }
}

async function saveDiaryEntryToStorage(entry) {
  if (!diaryDbAvailable) {
    if (!Array.isArray(appData.diaryEntries)) appData.diaryEntries = [];
    appData.diaryEntries.push(entry);
    diaryCache = appData.diaryEntries;
    diaryLoaded = true;
    return;
  }
  await saveDiaryEntryToDB(entry);
  diaryCache.push(entry);
  diaryLoaded = true;
}

async function replaceDiaryEntriesInStorage(entries) {
  const safeEntries = Array.isArray(entries) ? entries.slice() : [];
  if (!diaryDbAvailable) {
    appData.diaryEntries = safeEntries;
    diaryCache = appData.diaryEntries;
    diaryLoaded = true;
    return;
  }
  await replaceDiaryEntriesInDB(safeEntries);
  diaryCache = safeEntries;
  diaryLoaded = true;
}

// Inicialização principal do aplicativo
function startApp() {
  if (window.__appStarted) return;
  window.__appStarted = true;

  // 1. Primeiro: carregar dados salvos
  loadFromLocalStorage();
  normalizeActivityDays();
  const canRunCriticalResets =
    typeof window.shouldRunCriticalResets === 'function' ? window.shouldRunCriticalResets() : true;

  if (canRunCriticalResets) {
    checkDailyReset();

    // 2. Verificar e recriar missões diárias para HOJE (coloque AQUI!)
    recreateDailyMissionsForToday();
    recreateDailyWorksForToday();

    cleanupOldDailyMissions();
    cleanupOldDailyWorks();

    // 3. Depois: verificar outras coisas
    checkOverdueMissions({ isInitialCheck: true });
    checkOverdueWorks({ isInitialCheck: true });
    checkWeeklyReset();

    // 4. Gerar atividades do dia
    generateDailyActivities();
  }

  // 5. Resto da inicialização...
  updateStreaks();
  initUI();
  initEvents();
  initHydrationUI();
  initDiaryStorage().then(() => {
    updateDiaryEntries();
  });
  updateUI();
  updateMidnightCountdown();
  setInterval(updateMidnightCountdown, 1000);
  updateCurrentDate();
  setInterval(checkDailyReset, 60000);
  setInterval(checkWeeklyReset, 60000);
  setInterval(updateStreaks, 60000);
  if (canRunCriticalResets) {
    handleGameOverIfNeeded({ isInitialCheck: true });
  }
}

// Carregar dados - agora delega para a nuvem quando disponível
function loadFromLocalStorage() {
  const delegatedLoader = window.loadFromLocalStorage;
  // Delegar para a função do cloud-sync se estiver disponível (ela é definida após autenticação)
  // A função cloud-sync carrega os dados da nuvem quando o usuário está logado
  if (typeof delegatedLoader === 'function' && delegatedLoader !== loadFromLocalStorage) {
    // Chamar a função global (pode ser do cloud-sync ou fallback)
    delegatedLoader();
  } else {
    // Fallback: apenas para desenvolvimento offline sem Firebase
    const savedData = localStorage.getItem('heroJourneyData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        mergeData(appData, parsedData);
        ensureDataIntegrity();
        console.log('Dados carregados do localStorage (modo offline)');
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
      }
    }
  }
}

function ensureCoreAttributes() {
  if (!Array.isArray(appData.attributes)) appData.attributes = [];
  const hasRiqueza = appData.attributes.some((a) => a.id === 14);
  if (!hasRiqueza) {
    appData.attributes.push({ id: 14, name: 'Riqueza', emoji: '💎', xp: 0, maxXp: 100, level: 0 });
  }
}

function ensureClasses() {
  if (!Array.isArray(appData.classes)) appData.classes = [];
  if (appData.classes.length === 0) {
    const legacyClassName = appData.hero?.class;
    const baseName = legacyClassName || 'Classe';
    appData.classes.push({ id: 1, name: baseName, emoji: '💼', xp: 0, maxXp: 100, level: 0 });
  }
  if (appData.hero && Object.prototype.hasOwnProperty.call(appData.hero, 'class')) {
    delete appData.hero.class;
  }
  let nextId = 1;
  appData.classes.forEach((cls) => {
    if (!Number.isFinite(cls.id)) cls.id = nextId;
    nextId = Math.max(nextId, cls.id + 1);
    if (!cls.name) cls.name = 'Classe';
    if (!cls.emoji) cls.emoji = '💼';
    if (!Number.isFinite(cls.xp) || cls.xp < 0) cls.xp = 0;
    if (!Number.isFinite(cls.maxXp) || cls.maxXp <= 0) cls.maxXp = 100;
    if (!Number.isFinite(cls.level) || cls.level < 0) cls.level = 0;
  });
  if (!appData.hero) appData.hero = {};
  if (!Number.isFinite(appData.hero.primaryClassId)) {
    appData.hero.primaryClassId = appData.classes[0]?.id || null;
  }
  if (
    appData.hero.primaryClassId &&
    !appData.classes.some((c) => c.id === appData.hero.primaryClassId)
  ) {
    appData.hero.primaryClassId = appData.classes[0]?.id || null;
  }
}

function ensureStartingLevels() {
  if (!Array.isArray(appData.attributes)) appData.attributes = [];
  appData.attributes.forEach((attr) => {
    if (!Number.isFinite(attr.level) || attr.level < 0) attr.level = 0;
    if (!Number.isFinite(attr.xp) || attr.xp < 0) attr.xp = 0;
    if (!Number.isFinite(attr.maxXp) || attr.maxXp <= 0) attr.maxXp = 100;
  });
  if (!Array.isArray(appData.classes)) appData.classes = [];
  appData.classes.forEach((cls) => {
    if (!Number.isFinite(cls.level) || cls.level < 0) cls.level = 0;
    if (!Number.isFinite(cls.xp) || cls.xp < 0) cls.xp = 0;
    if (!Number.isFinite(cls.maxXp) || cls.maxXp <= 0) cls.maxXp = 100;
  });
  if (!Array.isArray(appData.workouts)) appData.workouts = [];
  appData.workouts.forEach((workout) => {
    if (!Number.isFinite(workout.level) || workout.level < 0) workout.level = 0;
    if (!Number.isFinite(workout.xp) || workout.xp < 0) workout.xp = 0;
  });
  if (!Array.isArray(appData.studies)) appData.studies = [];
  appData.studies.forEach((study) => {
    if (!Number.isFinite(study.level) || study.level < 0) study.level = 0;
    if (!Number.isFinite(study.xp) || study.xp < 0) study.xp = 0;
  });
}

function ensureCriticalDataShape() {
  if (!appData.hero || typeof appData.hero !== 'object') appData.hero = {};
  if (!Number.isFinite(appData.hero.maxXp) || appData.hero.maxXp <= 0) {
    appData.hero.maxXp = 100;
  }
  if (!Number.isFinite(appData.hero.xp) || appData.hero.xp < 0) {
    appData.hero.xp = 0;
  }

  if (!appData.hero.protection || typeof appData.hero.protection !== 'object') {
    appData.hero.protection = { shield: false };
  }
  appData.hero.protection.shield = appData.hero.protection.shield === true;

  if (!appData.hero.streak || typeof appData.hero.streak !== 'object') {
    appData.hero.streak = {};
  }
  if (!Number.isFinite(appData.hero.streak.general)) appData.hero.streak.general = 0;
  if (!Number.isFinite(appData.hero.streak.physical)) appData.hero.streak.physical = 0;
  if (!Number.isFinite(appData.hero.streak.mental)) appData.hero.streak.mental = 0;
  if (!appData.hero.streak.lastGeneralCheck) appData.hero.streak.lastGeneralCheck = null;
  if (!appData.hero.streak.lastPhysicalCheck) appData.hero.streak.lastPhysicalCheck = null;
  if (!appData.hero.streak.lastMentalCheck) appData.hero.streak.lastMentalCheck = null;

  if (!appData.statistics || typeof appData.statistics !== 'object') appData.statistics = {};
  const statsDefaults = {
    workoutsDone: 0,
    workoutsIgnored: 0,
    studiesDone: 0,
    studiesIgnored: 0,
    worksDone: 0,
    worksFailed: 0,
    worksIgnored: 0,
    booksRead: 0,
    missionsDone: 0,
    missionsFailed: 0,
    deaths: 0,
    justiceDone: 0,
    maxStreakGeneral: 0,
    maxStreakPhysical: 0,
    maxStreakMental: 0,
    workoutDetails: {},
    studyDetails: {},
    productiveDays: {},
    deathDates: [],
  };
  Object.keys(statsDefaults).forEach((key) => {
    if (appData.statistics[key] === undefined || appData.statistics[key] === null) {
      appData.statistics[key] = statsDefaults[key];
    }
  });

  if (!Array.isArray(appData.financeEntries)) appData.financeEntries = [];
  if (!Array.isArray(appData.financeBudgets)) appData.financeBudgets = [];
  if (!Array.isArray(appData.financeRecurring)) appData.financeRecurring = [];
  if (!Array.isArray(appData.financeRecurringSkips)) appData.financeRecurringSkips = [];
  if (!Array.isArray(appData.restDays)) appData.restDays = [];
  if (!Array.isArray(appData.workOffDays)) appData.workOffDays = [];
  if (!Array.isArray(appData.shopItems)) appData.shopItems = [];
  if (!Array.isArray(appData.inventory)) appData.inventory = [];
  const hasSkipItem = appData.shopItems.some((item) => item && item.effect === 'skip');
  if (!hasSkipItem) {
    appData.shopItems.push({
      id: createUniqueId(appData.shopItems),
      name: 'Pulo',
      emoji: '⏭️',
      cost: SKIP_ACTIVITY_COST,
      level: 0,
      description: 'Permite pular 1 atividade sem penalidade',
      effect: 'skip',
    });
  }
  normalizeEntityIds(appData.shopItems);
  if (!appData.statisticsGoals || typeof appData.statisticsGoals !== 'object') {
    appData.statisticsGoals = {};
  }
  appData.statisticsGoals.missions =
    Number.isFinite(Number(appData.statisticsGoals.missions)) &&
    Number(appData.statisticsGoals.missions) > 0
      ? Math.floor(Number(appData.statisticsGoals.missions))
      : 60;
  appData.statisticsGoals.workouts =
    Number.isFinite(Number(appData.statisticsGoals.workouts)) &&
    Number(appData.statisticsGoals.workouts) > 0
      ? Math.floor(Number(appData.statisticsGoals.workouts))
      : 20;
  appData.statisticsGoals.studies =
    Number.isFinite(Number(appData.statisticsGoals.studies)) &&
    Number(appData.statisticsGoals.studies) > 0
      ? Math.floor(Number(appData.statisticsGoals.studies))
      : 20;
  appData.statisticsGoals.works =
    Number.isFinite(Number(appData.statisticsGoals.works)) &&
    Number(appData.statisticsGoals.works) > 0
      ? Math.floor(Number(appData.statisticsGoals.works))
      : 30;

  // Migracao de metas legadas para o novo padrao solicitado.
  if (
    appData.statisticsGoals.missions === 14 &&
    appData.statisticsGoals.workouts === 5 &&
    appData.statisticsGoals.studies === 7 &&
    appData.statisticsGoals.works === 5
  ) {
    appData.statisticsGoals = { missions: 60, workouts: 20, studies: 20, works: 30 };
  }

  appData.financeBudgets = appData.financeBudgets
    .filter((b) => b && typeof b === 'object')
    .map((b) => ({
      id: Number.isFinite(Number(b.id)) ? Number(b.id) : createUniqueId(appData.financeBudgets),
      month:
        typeof b.month === 'string' && /^\d{4}-\d{2}$/.test(b.month)
          ? b.month
          : getLocalDateString().slice(0, 7),
      category: String(b.category || '').trim(),
      limit: Number.isFinite(Number(b.limit)) && Number(b.limit) > 0 ? Number(b.limit) : 0,
    }))
    .filter((b) => b.category && b.limit > 0);
  normalizeEntityIds(appData.financeBudgets);

  appData.financeRecurring = appData.financeRecurring
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({
      id: Number.isFinite(Number(r.id)) ? Number(r.id) : createUniqueId(appData.financeRecurring),
      type: r.type === 'income' ? 'income' : 'expense',
      amount: Number.isFinite(Number(r.amount)) && Number(r.amount) > 0 ? Number(r.amount) : 0,
      category: String(r.category || '').trim(),
      description: String(r.description || '').trim(),
      dayOfMonth: Math.min(31, Math.max(1, parseInt(r.dayOfMonth, 10) || 1)),
      startDate: typeof r.startDate === 'string' ? r.startDate : getLocalDateString(),
      endDate: r.endDate ? String(r.endDate) : '',
      active: r.active !== false,
    }))
    .filter((r) => r.amount > 0);
  normalizeEntityIds(appData.financeRecurring);

  appData.financeRecurringSkips = appData.financeRecurringSkips
    .map((s) => String(s || '').trim())
    .filter((s) => /^\d+\|\d{4}-\d{2}$/.test(s));

  if (!Array.isArray(appData.foodItems)) appData.foodItems = [];
  if (!Array.isArray(appData.nutritionEntries)) appData.nutritionEntries = [];
  if (!appData.nutritionGoals || typeof appData.nutritionGoals !== 'object') {
    appData.nutritionGoals = {};
  }
  if (!appData.nutritionStats || typeof appData.nutritionStats !== 'object') {
    appData.nutritionStats = {};
  }

  const nutritionGoalDefaults = {
    kcal: 2200,
    protein: 140,
    carbs: 240,
    fat: 70,
    fiber: 30,
  };
  Object.keys(nutritionGoalDefaults).forEach((key) => {
    const parsed = Number(appData.nutritionGoals[key]);
    appData.nutritionGoals[key] =
      Number.isFinite(parsed) && parsed > 0 ? parsed : nutritionGoalDefaults[key];
  });

  appData.foodItems = appData.foodItems
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: Number.isFinite(Number(item.id)) ? Number(item.id) : createUniqueId(appData.foodItems),
      name: String(item.name || '').trim(),
      brand: String(item.brand || '').trim(),
      portionGrams:
        Number.isFinite(Number(item.portionGrams)) && Number(item.portionGrams) > 0
          ? Number(item.portionGrams)
          : 100,
      kcal: Number.isFinite(Number(item.kcal)) && Number(item.kcal) >= 0 ? Number(item.kcal) : 0,
      protein:
        Number.isFinite(Number(item.protein)) && Number(item.protein) >= 0
          ? Number(item.protein)
          : 0,
      carbs:
        Number.isFinite(Number(item.carbs)) && Number(item.carbs) >= 0 ? Number(item.carbs) : 0,
      fat: Number.isFinite(Number(item.fat)) && Number(item.fat) >= 0 ? Number(item.fat) : 0,
      fiber:
        Number.isFinite(Number(item.fiber)) && Number(item.fiber) >= 0 ? Number(item.fiber) : 0,
    }))
    .filter((item) => item.name);
  normalizeEntityIds(appData.foodItems);

  appData.nutritionEntries = appData.nutritionEntries
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: Number.isFinite(Number(entry.id))
        ? Number(entry.id)
        : createUniqueId(appData.nutritionEntries),
      date:
        typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
          ? entry.date
          : getLocalDateString(),
      meal: Object.prototype.hasOwnProperty.call(NUTRITION_MEALS, entry.meal)
        ? entry.meal
        : 'lanche',
      foodId: entry.foodId !== undefined && entry.foodId !== null ? Number(entry.foodId) : null,
      foodName: String(entry.foodName || '').trim(),
      quantity:
        Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) > 0
          ? Number(entry.quantity)
          : 1,
      grams:
        Number.isFinite(Number(entry.grams)) && Number(entry.grams) > 0 ? Number(entry.grams) : 0,
      kcal: Number.isFinite(Number(entry.kcal)) && Number(entry.kcal) >= 0 ? Number(entry.kcal) : 0,
      protein:
        Number.isFinite(Number(entry.protein)) && Number(entry.protein) >= 0
          ? Number(entry.protein)
          : 0,
      carbs:
        Number.isFinite(Number(entry.carbs)) && Number(entry.carbs) >= 0 ? Number(entry.carbs) : 0,
      fat: Number.isFinite(Number(entry.fat)) && Number(entry.fat) >= 0 ? Number(entry.fat) : 0,
      fiber:
        Number.isFinite(Number(entry.fiber)) && Number(entry.fiber) >= 0 ? Number(entry.fiber) : 0,
      notes: String(entry.notes || '').trim(),
    }))
    .filter((entry) => entry.foodName);
  normalizeEntityIds(appData.nutritionEntries);

  if (!Array.isArray(appData.nutritionStats.logDates)) appData.nutritionStats.logDates = [];
  if (!Array.isArray(appData.nutritionStats.goalHitDates)) appData.nutritionStats.goalHitDates = [];
  if (!Array.isArray(appData.nutritionStats.rewardedGoalDates))
    appData.nutritionStats.rewardedGoalDates = [];
  if (!Array.isArray(appData.nutritionStats.rewardedMealKeys))
    appData.nutritionStats.rewardedMealKeys = [];
  appData.nutritionStats.logDates = appData.nutritionStats.logDates
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
  appData.nutritionStats.goalHitDates = appData.nutritionStats.goalHitDates
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
  appData.nutritionStats.rewardedGoalDates = appData.nutritionStats.rewardedGoalDates
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
  appData.nutritionStats.rewardedMealKeys = appData.nutritionStats.rewardedMealKeys
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}\|(cafe|almoco|jantar|lanche)$/.test(v));

  if (!appData.hydration || typeof appData.hydration !== 'object') {
    appData.hydration = {
      glasses: 0,
      goal: 8,
      lastDate: null,
      currentStreak: 0,
      bestStreak: 0,
      startDate: null,
      logDates: [],
      goalHitDates: [],
    };
  }
  if (!Number.isFinite(appData.hydration.glasses) || appData.hydration.glasses < 0)
    appData.hydration.glasses = 0;
  if (!Number.isFinite(appData.hydration.goal) || appData.hydration.goal <= 0)
    appData.hydration.goal = 8;
  if (!Array.isArray(appData.hydration.logDates)) appData.hydration.logDates = [];
  if (!Array.isArray(appData.hydration.goalHitDates)) appData.hydration.goalHitDates = [];
  if (!appData.hydration.startDate) appData.hydration.startDate = getLocalDateString();
  appData.hydration.logDates = appData.hydration.logDates
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
  appData.hydration.goalHitDates = appData.hydration.goalHitDates
    .map((v) => String(v || '').trim())
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v));
}

function normalizeWeekdayValue(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  const byName = {
    dom: 0,
    domingo: 0,
    seg: 1,
    segunda: 1,
    'segunda-feira': 1,
    ter: 2,
    terca: 2,
    terça: 2,
    'terça-feira': 2,
    qua: 3,
    quarta: 3,
    'quarta-feira': 3,
    qui: 4,
    quinta: 4,
    'quinta-feira': 4,
    sex: 5,
    sexta: 5,
    'sexta-feira': 5,
    sab: 6,
    sabado: 6,
    sábado: 6,
  };
  if (Object.prototype.hasOwnProperty.call(byName, text)) return byName[text];

  const asNumber = Number(text);
  if (Number.isFinite(asNumber)) {
    if (asNumber === 7) return 0;
    if (asNumber >= 0 && asNumber <= 6) return asNumber;
    if (asNumber >= 1 && asNumber <= 7) return asNumber % 7;
  }

  return null;
}

function normalizeActivityDays() {
  const normalizeListDays = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (!item) return;
      const sourceDays = Array.isArray(item.days) ? item.days : [];
      const normalized = Array.from(
        new Set(
          sourceDays
            .map(normalizeWeekdayValue)
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        )
      );
      item.days = normalized.length > 0 ? normalized : [1, 2, 3, 4, 5];
    });
  };

  normalizeListDays(appData.workouts);
  normalizeListDays(appData.studies);
  normalizeListDays(appData.missions);
  normalizeListDays(appData.works);
}

function normalizeClassIds() {
  const validClassIds = new Set((appData.classes || []).map((c) => Number(c.id)));
  const normalizeList = (list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (item && Object.prototype.hasOwnProperty.call(item, 'classId')) {
        const normalized = Number(item.classId);
        item.classId =
          Number.isFinite(normalized) && validClassIds.has(normalized) ? normalized : null;
      }
    });
  };

  normalizeList(appData.works);
  normalizeList(appData.completedWorks);
}

// Função helper para consolidar validação de dados (elimina duplicação)
function ensureDataIntegrity() {
  ensureCriticalDataShape();
  ensureCoreAttributes();
  ensureClasses();
  ensureStartingLevels();
  normalizeClassIds();
}

// Função para mesclar dados
function mergeData(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (Array.isArray(sourceValue)) {
        // Arrays devem ser copiados (não mesclados recursivamente)
        target[key] = sourceValue.slice();
        continue;
      }

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        typeof targetValue === 'object' &&
        targetValue !== null
      ) {
        mergeData(targetValue, sourceValue);
      } else {
        target[key] = sourceValue;
      }
    }
  }
}

/* saveToLocalStorage() substituída por saveManager.js */

// Verificar reset diário - usa apenas serverMeta (salvo na nuvem)
function checkDailyReset() {
  const today = getLocalDateString();
  // Agora usa apenas serverMeta.lastDailyReset (que é salvo na nuvem)
  let lastReset = appData.serverMeta?.lastDailyReset;
  if (!Number.isFinite(appData.hero.maxLives) || appData.hero.maxLives <= 0)
    appData.hero.maxLives = 10;
  if (!Number.isFinite(appData.hero.lives) || appData.hero.lives < 0)
    appData.hero.lives = appData.hero.maxLives;

  if (!lastReset) {
    // Primeira vez: inicializar serverMeta e salvar na nuvem
    if (!appData.serverMeta) appData.serverMeta = {};
    appData.serverMeta.lastDailyReset = today;
    queueSave();
    return;
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

    // Atualizar missões/trabalhos diários e limpar antigos
    cleanupOldDailyMissions();
    cleanupOldDailyWorks();

    // OBS: checkOverdueMissions/Works NÃO são chamados aqui porque
    // applyPenalties já lida com falhas de atividades semanais.
    // Chamá-los causaria penalidades duplicadas.

    // Gerar novas atividades do dia
    generateDailyActivities();

    appData.serverMeta.lastDailyReset = today;
    queueSave();
    updateUI({ mode: 'activity' });
    console.log('Reset diário aplicado');
  }
}

// Verificar reset semanal - usa apenas serverMeta (salvo na nuvem)
function checkWeeklyReset() {
  const today = getGameNow();
  const thisWeekKey = getWeekKey(today);
  // Agora usa apenas serverMeta.lastWeeklyReset (que é salvo na nuvem)
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

// Gerar número da semana
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

function addHeroLog(type, title, content) {
  if (!appData.heroLogs) appData.heroLogs = [];
  // Usar data local com horário correto
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  );
  appData.heroLogs.push({
    id: createUniqueId(appData.heroLogs),
    type,
    title,
    content,
    date: localDate.toISOString(),
  });
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
                <h3 id="fx-dialog-title">Confirmação</h3>
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
    title = 'Confirmação',
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
    title: options.title || 'Confirmar ação',
    message,
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
  });
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

function applyActivityPenalties(config) {
  const {
    targetDateStr,
    dailyList,
    itemList,
    completedList,
    idKey,
    nameFallback,
    emojiFallback,
    typeFallback,
    statsKey,
    streakKeys,
    alertFail,
    alertShield,
    logShieldTitle,
    logShieldContent,
    logFailTitle,
    logFailContent,
  } = config;

  const incompleteItems = dailyList.filter(
    (item) => item.date === targetDateStr && !item.completed && !item.skipped
  );

  if (incompleteItems.length === 0) {
    return;
  }

  incompleteItems.forEach((dayItem) => {
    dayItem.failed = true;
    const item = itemList.find((i) => i.id === dayItem[idKey]);
    const alreadyLogged = completedList.some(
      (entry) => entry[idKey] === dayItem[idKey] && entry.date === dayItem.date && entry.failed
    );
    if (!alreadyLogged) {
      completedList.push({
        id: createUniqueId(completedList),
        [idKey]: dayItem[idKey],
        name: item ? item.name : nameFallback,
        emoji: item ? item.emoji : emojiFallback,
        type: item ? item.type : typeFallback,
        date: dayItem.date,
        failedDate: targetDateStr,
        failed: true,
        reason: 'Não concluído',
      });
    }
  });

  let livesLost = 0;
  let shieldUsed = false;
  incompleteItems.forEach(() => {
    if (appData.hero.protection?.shield) {
      appData.hero.protection.shield = false;
      shieldUsed = true;
      return;
    }
    appData.hero.lives = Math.max(0, appData.hero.lives - 1);
    livesLost++;
  });

  if (livesLost > 0) {
    streakKeys.forEach((key) => {
      appData.hero.streak[key] = 0;
    });
    addAttributeXP(6, -1);
    appData.statistics[statsKey] = (appData.statistics[statsKey] || 0) + incompleteItems.length;
    showFeedback(alertFail, 'error');
    addHeroLog('penalty', logFailTitle, logFailContent);
    handleGameOverIfNeeded();
  } else if (shieldUsed) {
    showFeedback(alertShield, 'warn');
    addHeroLog('penalty', logShieldTitle, logShieldContent);
  }
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
  openDiaryDB,
  getAllDiaryEntriesFromDB,
  saveDiaryEntryToDB,
  replaceDiaryEntriesInDB,
  refreshDiaryCache,
  migrateDiaryEntriesToDBIfNeeded,
  initDiaryStorage,
  saveDiaryEntryToStorage,
  replaceDiaryEntriesInStorage,
  startApp,
  loadFromLocalStorage,
  ensureCoreAttributes,
  ensureClasses,
  ensureStartingLevels,
  ensureCriticalDataShape,
  normalizeWeekdayValue,
  normalizeActivityDays,
  normalizeClassIds,
  ensureDataIntegrity,
  mergeData,
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
  applyActivityPenalties,
  generateDailyActivities,
});
