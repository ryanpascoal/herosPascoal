// Dados iniciais do aplicativo
const appData = {
    hero: {
        name: "Ryan Pascoal",
        primaryClassId: 1,
        level: 1,
        xp: 0,
        maxXp: 100,
        lives: 5,
        maxLives: 5,
        coins: 0,
        protection: {
            shield: false
        },
        streak: {
            general: 0,
            physical: 0,
            mental: 0,
            lastGeneralCheck: null,
            lastPhysicalCheck: null,
            lastMentalCheck: null
        }
    },
    attributes: [
        { id: 1, name: "Força", emoji: "💪", xp: 0, maxXp: 100, level: 0 },
        { id: 2, name: "Vigor", emoji: "❤️", xp: 0, maxXp: 100, level: 0 },
        { id: 3, name: "Agilidade", emoji: "⚡", xp: 0, maxXp: 100, level: 0},
        { id: 4, name: "Habilidade", emoji: "🎯", xp: 0, maxXp: 100, level: 0 },
        { id: 5, name: "Criatividade", emoji: "🎨", xp: 0, maxXp: 100, level: 0 },
        { id: 6, name: "Disciplina", emoji: "📘", xp: 0, maxXp: 100, level: 0 },
        { id: 7, name: "Inteligência", emoji: "🧠", xp: 0, maxXp: 100, level: 0 },
        { id: 8, name: "Fé", emoji: "🙏", xp: 0, maxXp: 100, level: 0 },
        { id: 9, name: "Liderança", emoji: "👑", xp: 0, maxXp: 100, level: 0 },
        { id: 10, name: "Sociabilidade", emoji: "🗣️", xp: 0, maxXp: 100, level: 0 },
        { id: 11, name: "Justiça", emoji: "⚖️", xp: 0, maxXp: 100, level: 0 },
        { id: 12, name: "Conhecimento", emoji: "📚", xp: 0, maxXp: 100, level: 0 },
        { id: 13, name: "Casamento", emoji: "💍", xp: 0, maxXp: 100, level: 0 },
        { id: 14, name: "Riqueza", emoji: "💎", xp: 0, maxXp: 100, level: 0 }
    ],
    classes: [

    ],
    workouts: [    ],
    studies: [    ],
    works: [],
    books: [],
    shopItems: [
        { id: 1, name: "Poção", emoji: "🧪", cost: 50, level: 0, description: "Restaura 1 vida", effect: "heal" },
        { id: 2, name: "Escudo", emoji: "🛡️", cost: 100, level: 0, description: "Protege de 1 dano e de uma quebra de streak", effect: "shield" },
        { id: 3, name: "Bomba", emoji: "💣", cost: 100, level: 0, description: "Causa 50 de dano em 1 chefe à sua escolha", effect: "bomb" }
    ],
    inventory: [],
    missions: [],
    completedMissions: [],
    completedWorks: [],
    completedWorkouts: [],
    completedStudies: [],
    heroLogs: [],
    bosses: [
        { id: 1, name: "Físico", hp: 100, maxHp: 100, reset: "weekly", attributes: [1, 2, 3, 4], defeated: false, bonusActive: false },
        { id: 2, name: "Mental", hp: 100, maxHp: 100, reset: "weekly", attributes: [5, 6, 7, 12], defeated: false, bonusActive: false },
        { id: 3, name: "Social", hp: 100, maxHp: 100, reset: "weekly", attributes: [9, 10], defeated: false, bonusActive: false },
        { id: 4, name: "Espiritual", hp: 100, maxHp: 100, reset: "weekly", attributes: [8, 11, 13], defeated: false, bonusActive: false },
        { id: 5, name: "Trabalho", hp: 100, maxHp: 100, reset: "weekly", attributes: [14], defeated: false, bonusActive: false }
    ],
    statistics: {
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
        deathDates: []
    },
    diaryEntries: [],
    feedbacks: [],
    dailyWorkouts: [],
    dailyStudies: [],
    restDays: [],
    statisticsGoals: {
        missions: 14,
        workouts: 5,
        studies: 7,
        works: 5
    },
    financeEntries: [],
    financeBudgets: [],
    financeRecurring: [],
    financeRecurringSkips: []
};;
const APP_DEFAULTS = JSON.parse(JSON.stringify(appData));

// Estado do calendário (aba Calendários)
let calendarState = {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    selectedDate: null,
    detailsFilter: 'all'
};

const REST_DAYS_PER_MONTH_LIMIT = 2;
const SKIP_ACTIVITY_COST = 25;
const CATEGORY_COLORS = {
    mission: {
        solid: 'rgba(255, 99, 132, 0.7)',
        border: 'rgba(255, 99, 132, 1)',
        soft: 'rgba(255, 99, 132, 0.2)',
        goal: 'rgba(255, 99, 132, 0.65)'
    },
    work: {
        solid: 'rgba(153, 102, 255, 0.7)',
        border: 'rgba(153, 102, 255, 1)',
        soft: 'rgba(153, 102, 255, 0.2)',
        goal: 'rgba(153, 102, 255, 0.65)'
    },
    workout: {
        solid: 'rgba(54, 162, 235, 0.7)',
        border: 'rgba(54, 162, 235, 1)',
        soft: 'rgba(54, 162, 235, 0.2)',
        goal: 'rgba(54, 162, 235, 0.65)'
    },
    study: {
        solid: 'rgba(255, 206, 86, 0.7)',
        border: 'rgba(255, 206, 86, 1)',
        soft: 'rgba(255, 206, 86, 0.2)',
        goal: 'rgba(255, 206, 86, 0.65)'
    },
    book: {
        solid: 'rgba(75, 192, 192, 0.7)',
        border: 'rgba(75, 192, 192, 1)',
        soft: 'rgba(75, 192, 192, 0.2)'
    }
};

// Diário em IndexedDB (para evitar limite do localStorage)
const DIARY_DB_NAME = 'heroJourneyDB';
const DIARY_DB_VERSION = 1;
const DIARY_STORE = 'diaryEntries';
let diaryDbPromise = null;
let diaryCache = [];
let diaryLoaded = false;
let diaryDbAvailable = true;

function openDiaryDB() {
    if (diaryDbPromise) return diaryDbPromise;
    diaryDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DIARY_DB_NAME, DIARY_DB_VERSION);
        request.onupgradeneeded = function(event) {
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
    return openDiaryDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readonly');
        const store = tx.objectStore(DIARY_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function saveDiaryEntryToDB(entry) {
    return openDiaryDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readwrite');
        const store = tx.objectStore(DIARY_STORE);
        const req = store.put(entry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function replaceDiaryEntriesInDB(entries) {
    return openDiaryDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(DIARY_STORE, 'readwrite');
        const store = tx.objectStore(DIARY_STORE);
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error);
        clearReq.onsuccess = () => {
            entries.forEach(entry => store.put(entry));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
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


// Inicialização do aplicativo - VERSÃO CORRIGIDA
document.addEventListener('DOMContentLoaded', function() {
    // 1. Primeiro: carregar dados salvos
    loadFromLocalStorage();
    normalizeActivityDays();
    
    // 2. Verificar e recriar missões diárias para HOJE (coloque AQUI!)
    recreateDailyMissionsForToday();
    recreateDailyWorksForToday();
    
    cleanupOldDailyMissions();
    cleanupOldDailyWorks();

    // 3. Depois: verificar outras coisas
    checkOverdueMissions();
    checkOverdueWorks();
    checkDailyReset();
    checkWeeklyReset();
    
    // 4. Gerar atividades do dia
    generateDailyActivities();
    
    // 5. Resto da inicialização...
    updateStreaks();
    initUI();
    initEvents();
    initDiaryStorage().then(() => updateDiaryEntries());
    updateUI();
    updateMidnightCountdown();
    setInterval(updateMidnightCountdown, 1000);
    updateCurrentDate();
    setInterval(checkDailyReset, 60000);
    setInterval(checkWeeklyReset, 60000);
    setInterval(updateStreaks, 60000);
    handleGameOverIfNeeded();
});

// Carregar dados do localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('heroJourneyData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            mergeData(appData, parsedData);
            ensureCriticalDataShape();
            ensureCoreAttributes();
            ensureClasses();
            ensureStartingLevels();
            ensureWeeklyBossResets();
            normalizeClassIds();
            console.log('Dados carregados do localStorage');
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
        }
    }
}

function ensureCoreAttributes() {
    if (!Array.isArray(appData.attributes)) appData.attributes = [];
    const hasRiqueza = appData.attributes.some(a => a.id === 14);
    if (!hasRiqueza) {
        appData.attributes.push({ id: 14, name: "Riqueza", emoji: "💎", xp: 0, maxXp: 100, level: 0 });
    }
}

function ensureClasses() {
    if (!Array.isArray(appData.classes)) appData.classes = [];
    if (appData.classes.length === 0) {
        const legacyClassName = appData.hero?.class;
        const baseName = legacyClassName || 'Classe';
        appData.classes.push({ id: 1, name: baseName, emoji: "💼", xp: 0, maxXp: 100, level: 0 });
    }
    if (appData.hero && Object.prototype.hasOwnProperty.call(appData.hero, 'class')) {
        delete appData.hero.class;
    }
    let nextId = 1;
    appData.classes.forEach(cls => {
        if (!Number.isFinite(cls.id)) cls.id = nextId;
        nextId = Math.max(nextId, cls.id + 1);
        if (!cls.name) cls.name = 'Classe';
        if (!cls.emoji) cls.emoji = "💼";
        if (!Number.isFinite(cls.xp) || cls.xp < 0) cls.xp = 0;
        if (!Number.isFinite(cls.maxXp) || cls.maxXp <= 0) cls.maxXp = 100;
        if (!Number.isFinite(cls.level) || cls.level < 0) cls.level = 0;
    });
    if (!appData.hero) appData.hero = {};
    if (!Number.isFinite(appData.hero.primaryClassId)) {
        appData.hero.primaryClassId = appData.classes[0]?.id || null;
    }
    if (appData.hero.primaryClassId && !appData.classes.some(c => c.id === appData.hero.primaryClassId)) {
        appData.hero.primaryClassId = appData.classes[0]?.id || null;
    }
}

function ensureStartingLevels() {
    if (!Array.isArray(appData.attributes)) appData.attributes = [];
    appData.attributes.forEach(attr => {
        if (!Number.isFinite(attr.level) || attr.level < 0) attr.level = 0;
        if (!Number.isFinite(attr.xp) || attr.xp < 0) attr.xp = 0;
        if (!Number.isFinite(attr.maxXp) || attr.maxXp <= 0) attr.maxXp = 100;
    });
    if (!Array.isArray(appData.classes)) appData.classes = [];
    appData.classes.forEach(cls => {
        if (!Number.isFinite(cls.level) || cls.level < 0) cls.level = 0;
        if (!Number.isFinite(cls.xp) || cls.xp < 0) cls.xp = 0;
        if (!Number.isFinite(cls.maxXp) || cls.maxXp <= 0) cls.maxXp = 100;
    });
    if (!Array.isArray(appData.workouts)) appData.workouts = [];
    appData.workouts.forEach(workout => {
        if (!Number.isFinite(workout.level) || workout.level < 0) workout.level = 0;
        if (!Number.isFinite(workout.xp) || workout.xp < 0) workout.xp = 0;
    });
    if (!Array.isArray(appData.studies)) appData.studies = [];
    appData.studies.forEach(study => {
        if (!Number.isFinite(study.level) || study.level < 0) study.level = 0;
        if (!Number.isFinite(study.xp) || study.xp < 0) study.xp = 0;
    });
}

function ensureCriticalDataShape() {
    if (!appData.hero || typeof appData.hero !== 'object') appData.hero = {};

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
        deathDates: []
    };
    Object.keys(statsDefaults).forEach(key => {
        if (appData.statistics[key] === undefined || appData.statistics[key] === null) {
            appData.statistics[key] = statsDefaults[key];
        }
    });

    if (!Array.isArray(appData.financeEntries)) appData.financeEntries = [];
    if (!Array.isArray(appData.financeBudgets)) appData.financeBudgets = [];
    if (!Array.isArray(appData.financeRecurring)) appData.financeRecurring = [];
    if (!Array.isArray(appData.financeRecurringSkips)) appData.financeRecurringSkips = [];
    if (!appData.statisticsGoals || typeof appData.statisticsGoals !== 'object') {
        appData.statisticsGoals = {};
    }
    appData.statisticsGoals.missions = Number.isFinite(Number(appData.statisticsGoals.missions)) && Number(appData.statisticsGoals.missions) > 0
        ? Math.floor(Number(appData.statisticsGoals.missions))
        : 14;
    appData.statisticsGoals.workouts = Number.isFinite(Number(appData.statisticsGoals.workouts)) && Number(appData.statisticsGoals.workouts) > 0
        ? Math.floor(Number(appData.statisticsGoals.workouts))
        : 5;
    appData.statisticsGoals.studies = Number.isFinite(Number(appData.statisticsGoals.studies)) && Number(appData.statisticsGoals.studies) > 0
        ? Math.floor(Number(appData.statisticsGoals.studies))
        : 7;
    appData.statisticsGoals.works = Number.isFinite(Number(appData.statisticsGoals.works)) && Number(appData.statisticsGoals.works) > 0
        ? Math.floor(Number(appData.statisticsGoals.works))
        : 5;

    appData.financeBudgets = appData.financeBudgets
        .filter(b => b && typeof b === 'object')
        .map(b => ({
            id: Number.isFinite(Number(b.id)) ? Number(b.id) : Date.now() + Math.floor(Math.random() * 1000),
            month: typeof b.month === 'string' && /^\d{4}-\d{2}$/.test(b.month) ? b.month : getLocalDateString().slice(0, 7),
            category: String(b.category || '').trim(),
            limit: Number.isFinite(Number(b.limit)) && Number(b.limit) > 0 ? Number(b.limit) : 0
        }))
        .filter(b => b.category && b.limit > 0);

    appData.financeRecurring = appData.financeRecurring
        .filter(r => r && typeof r === 'object')
        .map(r => ({
            id: Number.isFinite(Number(r.id)) ? Number(r.id) : Date.now() + Math.floor(Math.random() * 1000),
            type: r.type === 'income' ? 'income' : 'expense',
            amount: Number.isFinite(Number(r.amount)) && Number(r.amount) > 0 ? Number(r.amount) : 0,
            category: String(r.category || '').trim(),
            description: String(r.description || '').trim(),
            dayOfMonth: Math.min(31, Math.max(1, parseInt(r.dayOfMonth, 10) || 1)),
            startDate: typeof r.startDate === 'string' ? r.startDate : getLocalDateString(),
            endDate: r.endDate ? String(r.endDate) : '',
            active: r.active !== false
        }))
        .filter(r => r.amount > 0);

    appData.financeRecurringSkips = appData.financeRecurringSkips
        .map(s => String(s || '').trim())
        .filter(s => /^\d+\|\d{4}-\d{2}$/.test(s));
}

function ensureWeeklyBossResets() {
    if (!Array.isArray(appData.bosses)) return;
    appData.bosses.forEach(boss => {
        if (!boss || typeof boss !== 'object') return;
        boss.reset = 'weekly';
    });
}

function normalizeWeekdayValue(value) {
    const text = String(value ?? '').trim().toLowerCase();
    const byName = {
        dom: 0,
        domingo: 0,
        seg: 1,
        segunda: 1,
        'segunda-feira': 1,
        ter: 2,
        terca: 2,
        'terça': 2,
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
        'sábado': 6
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
        list.forEach(item => {
            if (!item) return;
            const sourceDays = Array.isArray(item.days) ? item.days : [];
            const normalized = Array.from(new Set(
                sourceDays
                    .map(normalizeWeekdayValue)
                    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
            ));
            item.days = normalized.length > 0 ? normalized : [1, 2, 3, 4, 5];
        });
    };

    normalizeListDays(appData.workouts);
    normalizeListDays(appData.studies);
}

function normalizeClassIds() {
    const validClassIds = new Set((appData.classes || []).map(c => Number(c.id)));
    const normalizeList = list => {
        if (!Array.isArray(list)) return;
        list.forEach(item => {
            if (item && Object.prototype.hasOwnProperty.call(item, 'classId')) {
                const normalized = Number(item.classId);
                item.classId = Number.isFinite(normalized) && validClassIds.has(normalized) ? normalized : null;
            }
        });
    };

    normalizeList(appData.works);
    normalizeList(appData.completedWorks);
}

// Função para mesclar dados
function mergeData(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = target[key];
            
            if (Array.isArray(sourceValue)) {
                // Arrays devem ser substituídos por inteiro
                target[key] = sourceValue.slice();
                continue;
            }
            
            if (typeof sourceValue === 'object' && sourceValue !== null && 
                typeof targetValue === 'object' && targetValue !== null) {
                mergeData(targetValue, sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }
}

// Salvar dados no localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('heroJourneyData', JSON.stringify(appData));
        console.log('Dados salvos no localStorage');
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

// Verificar reset diário
function checkDailyReset() {
    const today = getLocalDateString();
    const lastReset = localStorage.getItem('lastDailyReset');
    
    if (lastReset !== today) {
        // Aplicar penalidades do dia anterior antes do reset
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        applyPenalties(getLocalDateString(yesterday));

        // Limpar atividades do dia anterior
        appData.dailyWorkouts = [];
        appData.dailyStudies = [];
        
        // Gerar novas atividades do dia
        generateDailyActivities();
        
        localStorage.setItem('lastDailyReset', today);
        console.log('Reset diário aplicado');
    }
}

// Verificar reset semanal
function checkWeeklyReset() {
    const today = new Date();
    const thisWeekKey = getWeekKey(today);
    const lastWeeklyReset = localStorage.getItem('lastWeeklyReset');

    if (!lastWeeklyReset) {
        localStorage.setItem('lastWeeklyReset', thisWeekKey);
        return;
    }

    if (lastWeeklyReset !== thisWeekKey) {
        // Resetar todos os chefões semanalmente
        resetBossGroup(["Físico", "Mental", "Social", "Espiritual", "Trabalho"]);
        
        localStorage.setItem('lastWeeklyReset', thisWeekKey);
        console.log('Reset semanal aplicado');
    }
}

// Gerar número da semana
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
}

function getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const weekYear = d.getFullYear();
    const yearStart = new Date(weekYear, 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${weekYear}-W${weekNo}`;
}

function resetBossGroup(names) {
    names.forEach(name => {
        const boss = appData.bosses.find(b => b.name === name);
        if (!boss) return;
        if (!boss.defeated) {
            boss.hp = boss.maxHp + 1;
        } else {
            boss.hp = boss.maxHp;
            boss.defeated = false;
        }
        boss.bonusActive = false;
    });
}

function addHeroLog(type, title, content) {
    if (!appData.heroLogs) appData.heroLogs = [];
    appData.heroLogs.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        title,
        content,
        date: new Date().toISOString()
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
    const {
        containerSelector,
        target,
        xp = 0,
        coins = 0,
        message = '',
        type = 'success'
    } = options;

    if (containerSelector) pulseElement(containerSelector);

    const anchor = target || document.getElementById('current-xp') || document.querySelector('.profile-header');
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
        logFailContent
    } = config;
    
    const incompleteItems = dailyList.filter(item => 
        item.date === targetDateStr && !item.completed && !item.skipped);
    
    if (incompleteItems.length === 0) {
        return;
    }
    
    incompleteItems.forEach(dayItem => {
        dayItem.failed = true;
        const item = itemList.find(i => i.id === dayItem[idKey]);
        const alreadyLogged = completedList.some(entry => 
            entry[idKey] === dayItem[idKey] && entry.date === dayItem.date && entry.failed
        );
        if (!alreadyLogged) {
            completedList.push({
                id: Date.now() + dayItem.id,
                [idKey]: dayItem[idKey],
                name: item ? item.name : nameFallback,
                emoji: item ? item.emoji : emojiFallback,
                type: item ? item.type : typeFallback,
                date: dayItem.date,
                failedDate: targetDateStr,
                failed: true,
                reason: 'Não concluído'
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

    if (shieldUsed) {
        alert(alertShield);
        addHeroLog('penalty', logShieldTitle, logShieldContent);
    }

    if (livesLost > 0) {
        streakKeys.forEach(key => {
            appData.hero.streak[key] = 0;
        });
        addAttributeXP(6, -1);
        appData.statistics[statsKey] = (appData.statistics[statsKey] || 0) + incompleteItems.length;
        alert(alertFail);
        addHeroLog('penalty', logFailTitle, logFailContent);
        handleGameOverIfNeeded();
    }
}

// Gerar atividades do dia
function generateDailyActivities() {
    if (!Array.isArray(appData.dailyWorkouts)) appData.dailyWorkouts = [];
    if (!Array.isArray(appData.dailyStudies)) appData.dailyStudies = [];
    if (!Array.isArray(appData.workouts)) appData.workouts = [];
    if (!Array.isArray(appData.studies)) appData.studies = [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = getLocalDateString(today);
    const hasScheduledDay = (days) => Array.isArray(days) && days.some(day => normalizeWeekdayValue(day) === dayOfWeek);
    const sameId = (a, b) => String(a) === String(b);
    
    // Gerar treinos do dia
    appData.workouts.forEach(workout => {
        if (hasScheduledDay(workout.days)) {
            const alreadyExists = appData.dailyWorkouts.some(dw =>
                sameId(dw.workoutId, workout.id) &&
                dw.date === todayStr &&
                !dw.completed &&
                !dw.skipped
            );
            
            if (!alreadyExists) {
                appData.dailyWorkouts.push({
                    id: Date.now() + workout.id,
                    workoutId: workout.id,
                    date: todayStr,
                    completed: false,
                    series: [null, null, null],
                    distance: null,
                    time: null,
                    feedback: ""
                });
            }
        }
    });
    
    // Gerar estudos do dia
    appData.studies.forEach(study => {
        if (hasScheduledDay(study.days)) {
            const alreadyExists = appData.dailyStudies.some(ds =>
                sameId(ds.studyId, study.id) &&
                ds.date === todayStr &&
                !ds.completed &&
                !ds.skipped
            );
            
            if (!alreadyExists) {
                appData.dailyStudies.push({
                    id: Date.now() + study.id,
                    studyId: study.id,
                    date: todayStr,
                    completed: false,
                    applied: false,
                    feedback: ""
                });
            }
        }
    });
}

// Inicializar elementos da interface
function initUI() {
    // Configurar a data atual
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const now = new Date();
        currentDateElement.textContent = now.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    const currentDateWorkElement = document.getElementById('current-date-work');
    if (currentDateWorkElement) {
        currentDateWorkElement.textContent = currentDateElement?.textContent || new Date().toLocaleDateString('pt-BR');
    }
    
    // Configurar a data do diário
    const diaryDateElement = document.getElementById('diary-date');
    if (diaryDateElement) {
        const now = new Date();
        diaryDateElement.textContent = now.toLocaleDateString('pt-BR');
    }
    
    // Inicializar os seletores de atributos
    initAttributesSelectors();
    initClassSelectors();

    // Inicializar opções do mês em Gestão
    populateFinanceMonthOptions();
    const financeMonth = document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7);
    const budgetMonthInput = document.getElementById('finance-budget-month');
    if (budgetMonthInput) budgetMonthInput.value = financeMonth === 'all' ? getLocalDateString().slice(0, 7) : financeMonth;
    const recurringStartInput = document.getElementById('finance-recurring-start');
    if (recurringStartInput && !recurringStartInput.value) recurringStartInput.value = getLocalDateString();
    
    
    // Inicializar gráficos
    if (typeof Chart !== 'undefined') {
        initCharts();
    }
}

// Inicializar eventos
function initEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (!tab) return;
            switchTab(tab);
            document.getElementById('mobile-more-menu')?.classList.remove('active');
        });
    });

    document.getElementById('nav-more-toggle')?.addEventListener('click', function(e) {
        e.preventDefault();
        const menu = document.getElementById('mobile-more-menu');
        if (menu) menu.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-more-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
            document.getElementById('mobile-more-menu')?.classList.remove('active');
        });
    });
    
    document.querySelectorAll('.sub-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const subtab = this.getAttribute('data-subtab');
            const parent = this.closest('.sub-nav').parentElement;
            switchSubTab(subtab, parent);
        });
    });

    
    // Botões de adicionar
    document.getElementById('add-book-btn')?.addEventListener('click', () => showBookModal());
    
    // Formulários
    document.getElementById('mission-form')?.addEventListener('submit', handleMissionSubmit);
    document.getElementById('work-form')?.addEventListener('submit', handleWorkSubmit);
    document.getElementById('workout-form')?.addEventListener('submit', handleWorkoutSubmit);
    document.getElementById('study-form')?.addEventListener('submit', handleStudySubmit);
    document.getElementById('class-form')?.addEventListener('submit', handleClassSubmit);
    document.getElementById('save-diary')?.addEventListener('click', saveDiaryEntry);
    document.getElementById('diary-search')?.addEventListener('input', updateDiaryEntries);
    document.getElementById('diary-filter-month')?.addEventListener('change', updateDiaryEntries);
    document.getElementById('diary-filter-date')?.addEventListener('change', updateDiaryEntries);
    document.getElementById('diary-filter-attribute')?.addEventListener('change', updateDiaryEntries);
    document.getElementById('diary-filter-xp')?.addEventListener('change', updateDiaryEntries);
    document.getElementById('save-stats-goals-btn')?.addEventListener('click', saveStatisticsGoals);
    document.getElementById('stats-chart-period')?.addEventListener('change', updateCharts);
    document.getElementById('finance-form')?.addEventListener('submit', handleFinanceSubmit);
    document.getElementById('finance-budget-form')?.addEventListener('submit', handleFinanceBudgetSubmit);
    document.getElementById('finance-recurring-form')?.addEventListener('submit', handleFinanceRecurringSubmit);
    document.getElementById('finance-month')?.addEventListener('change', function() {
        const budgetMonthInput = document.getElementById('finance-budget-month');
        if (budgetMonthInput) {
            budgetMonthInput.value = this.value === 'all' ? getLocalDateString().slice(0, 7) : this.value;
        }
        updateFinanceView();
    });
    document.getElementById('finance-filter-type')?.addEventListener('change', updateFinanceView);
    document.getElementById('finance-filter-category')?.addEventListener('input', updateFinanceView);
    
    // Configurações
    document.getElementById('reset-btn')?.addEventListener('click', resetProgress);
    document.getElementById('export-btn')?.addEventListener('click', exportData);
    document.getElementById('import-btn')?.addEventListener('click', importData);

    // Calendário
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
        calendarState.month -= 1;
        if (calendarState.month < 0) {
            calendarState.month = 11;
            calendarState.year -= 1;
        }
        renderMissionsCalendar();
    });
    document.getElementById('cal-next-month')?.addEventListener('click', () => {
        calendarState.month += 1;
        if (calendarState.month > 11) {
            calendarState.month = 0;
            calendarState.year += 1;
        }
        renderMissionsCalendar();
    });
    document.getElementById('cal-rest-toggle')?.addEventListener('click', () => {
        if (!calendarState.selectedDate) return;
        toggleRestDay(calendarState.selectedDate);
    });
    document.getElementById('cal-details-filter')?.addEventListener('change', function() {
        calendarState.detailsFilter = this.value || 'all';
        if (calendarState.selectedDate) {
            renderCalendarDetails(calendarState.selectedDate);
        } else {
            resetCalendarDetails();
        }
    });
    
    // Modal
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.getElementById('item-form')?.addEventListener('submit', handleItemFormSubmit);
    
    // Fechar modal ao clicar fora
    document.getElementById('item-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    // Mudança no tipo de missão
    document.getElementById('mission-type')?.addEventListener('change', function() {
        updateMissionForm(this.value);
    });
    document.getElementById('work-type')?.addEventListener('change', function() {
        updateWorkForm(this.value);
    });
    
    // Botões de conclusão de treinos do dia
    document.addEventListener('click', function(e) {
        const skipWorkoutBtn = e.target.closest('.skip-workout-btn');
        if (skipWorkoutBtn) {
            const workoutDayId = parseInt(skipWorkoutBtn.getAttribute('data-id'));
            skipDailyWorkout(workoutDayId);
            return;
        }

        const workoutBtn = e.target.closest('.complete-workout-btn');
        if (workoutBtn) {
            const workoutDayId = parseInt(workoutBtn.getAttribute('data-id'));
            showWorkoutCompletionModal(workoutDayId);
            return;
        }
        
        const skipStudyBtn = e.target.closest('.skip-study-btn');
        if (skipStudyBtn) {
            const studyDayId = parseInt(skipStudyBtn.getAttribute('data-id'));
            skipDailyStudy(studyDayId);
            return;
        }

        const studyBtn = e.target.closest('.complete-study-btn');
        if (studyBtn) {
            const studyDayId = parseInt(studyBtn.getAttribute('data-id'));
            showStudyCompletionModal(studyDayId);
            return;
        }
        
        const bookBtn = e.target.closest('.complete-book-btn');
        if (bookBtn) {
            const bookId = parseInt(bookBtn.getAttribute('data-id'));
            completeBook(bookId);
            return;
        }
        
        const applyCheckbox = e.target.closest('.apply-study-checkbox');
        if (applyCheckbox) {
            const studyDayId = parseInt(applyCheckbox.getAttribute('data-id'));
            const studyDay = appData.dailyStudies.find(ds => ds.id === studyDayId);
            if (studyDay) {
                studyDay.applied = applyCheckbox.checked;
                saveToLocalStorage();
            }
        }
    });
    
}

// Atualizar a interface (VERSÃO ÚNICA - remover duplicata)
function updateUI(options = {}) {
    const mode = options.mode || 'full';
    const isFull = mode === 'full';
    const isActivity = mode === 'activity';
    const isShop = mode === 'shop';
    const isFinance = mode === 'finance';
    
    const shouldUpdateActivity = isFull || isActivity;
    const shouldUpdateShop = isFull || isShop;
    const shouldUpdateDiary = isFull;
    const shouldUpdateFinance = isFull || isFinance;
    const shouldUpdateCalendar = (isFull || isActivity || options.forceCalendar) && isTabActive('calendarios');

    // Atualizar informações do herói
    const primaryClass = getPrimaryClass();
    const heroClassEl = document.getElementById('hero-class');
    if (heroClassEl) {
        heroClassEl.textContent = primaryClass ? primaryClass.name : 'Sem classe';
    }
    document.getElementById('level').textContent = appData.hero.level;
    document.getElementById('current-xp').textContent = appData.hero.xp;
    document.getElementById('max-xp').textContent = appData.hero.maxXp;
    document.getElementById('xp-fill').style.width = `${(appData.hero.xp / appData.hero.maxXp) * 100}%`;
    
    // Atualizar contadores
    document.getElementById('coin-count').textContent = appData.hero.coins;
    document.getElementById('streak-count').textContent = appData.hero.streak.general;
    document.getElementById('life-count').textContent = `${appData.hero.lives}/${appData.hero.maxLives}`;
    
    // Atualizar status do escudo
    const shieldStatus = document.getElementById('shield-status');
    if (shieldStatus) {
        const hasShield = appData.hero.protection?.shield === true;
        shieldStatus.classList.toggle('active', hasShield);
        shieldStatus.classList.toggle('inactive', !hasShield);
        const shieldText = shieldStatus.querySelector('.shield-text');
        if (shieldText) {
            shieldText.textContent = hasShield ? 'Escudo ativo' : 'Sem escudo';
        }
    }
    
    // Atualizar vidas integradas
    updateIntegratedHearts();
    
    // Atualizar streaks
    updateStreaksDisplay();
    
    // Atualizar atributos
    updateAttributes();
    updateClassesList();
    updateWorkClassOptions();
    
    if (shouldUpdateActivity) {
        // Garante que atividades do dia reflitam cadastros/edições feitos na sessão atual
        normalizeActivityDays();
        generateDailyActivities();

        // Atualizar treinos (visualização)
        updateWorkoutsDisplay();
        updateWorkouts();
        
        // Atualizar estudos (visualização)
        updateStudiesDisplay();
        updateStudies();
        
        // Atualizar missões
        updateMissions();
        updateWorks();
        
        // Atualizar chefões
        updateBosses();
        
        // Atualizar estatísticas
        updateStatistics();
        
        // Atualizar logs do herói
        generateHeroLogs();
        
        // Atualizar treinos do dia
        updateDailyWorkouts();
        
        // Atualizar estudos do dia
        updateDailyStudies();
        
        // Atualizar históricos de treinos e estudos
        updateWorkoutHistory();
        updateStudyHistory();
        
        // Atualizar livros
        updateBooks();
    }
    
    if (shouldUpdateShop) {
        // Atualizar loja
        updateShop();
        
        // Atualizar inventário
        updateInventory();
        
        // Atualizar lista de itens da loja para gerenciamento
        updateShopItemsList();
    }
    
    if (shouldUpdateDiary) {
        // Atualizar diário
        updateDiary();
    }
    
    if (shouldUpdateCalendar) {
        // Atualizar calendário de missões
        renderMissionsCalendar();
    }

    if (shouldUpdateFinance) {
        updateFinanceView();
    }
    
    // Salvar dados
    saveToLocalStorage();
}

// Atualizar vidas integradas
function updateIntegratedHearts() {
    const container = document.getElementById('hearts-container');
    const countText = document.getElementById('lives-count-text');
    
    if (!container) return;
    
    container.innerHTML = '';
    const maxHearts = appData.hero.maxLives;
    const currentHearts = appData.hero.lives;
    
    for (let i = 0; i < maxHearts; i++) {
        const heart = document.createElement('div');
        heart.className = `heart-integrated ${i < currentHearts ? 'full' : 'empty'}`;
        heart.innerHTML = '<i class="fas fa-heart"></i>';
        container.appendChild(heart);
    }
    
    if (countText) {
        countText.textContent = `${currentHearts}/${maxHearts}`;
    }
}

// Atualizar atributos
function updateAttributes() {
    const container = document.getElementById('attributes-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.attributes.forEach(attr => {
        const level = Math.floor(attr.xp / 100);
        const currentXp = attr.xp % 100;
        const percentage = (currentXp / 100) * 100;
        
        const attributeCard = document.createElement('div');
        attributeCard.className = 'attribute-card';
        attributeCard.innerHTML = `
            <div class="attribute-header">
                <div class="attribute-name">
                    <span>${attr.emoji}</span>
                    <span>${attr.name}</span>
                </div>
                <div class="attribute-meta">
                    <div class="attribute-level">Nível ${level}</div>
                    <div class="attribute-xp">${currentXp}/100 XP</div>
                </div>
            </div>
            <div class="attribute-bar">
                <div class="attribute-fill" style="width: ${percentage}%"></div>
            </div>
        `;
        
        container.appendChild(attributeCard);
    });
}

function getPrimaryClass() {
    const primaryId = appData.hero?.primaryClassId;
    if (primaryId) {
        const primary = appData.classes?.find(c => c.id === primaryId);
        if (primary) return primary;
    }
    return appData.classes?.[0] || null;
}

function getClassNameById(classId) {
    const cls = appData.classes?.find(c => c.id === classId);
    return cls ? cls.name : '';
}

function updateClassesList() {
    const container = document.getElementById('classes-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!Array.isArray(appData.classes) || appData.classes.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma classe cadastrada.</p>';
        return;
    }
    
    appData.classes.forEach(cls => {
        const level = Math.floor(cls.xp / 100);
        const currentXp = cls.xp % 100;
        const percentage = (currentXp / 100) * 100;
        const isPrimary = appData.hero?.primaryClassId === cls.id;
        
        const classCard = document.createElement('div');
        classCard.className = 'item-card';
        classCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${cls.emoji || '💼'}</span>
                <div>
                    <div class="item-name">${cls.name}${isPrimary ? ' (Principal)' : ''}</div>
                    <div class="item-level">Nível ${level} - ${currentXp}/100 XP</div>
                    <div class="item-type">Progresso: ${percentage.toFixed(0)}%</div>
                    <div class="attribute-bar">
                        <div class="attribute-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${cls.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${cls.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(classCard);
    });
    
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editClass(id);
        });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteClass(id);
        });
    });
}

function updateWorkClassOptions() {
    const select = document.getElementById('work-class');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Nenhuma</option>';
    
    if (Array.isArray(appData.classes)) {
        appData.classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = String(cls.id);
            option.textContent = `${cls.emoji || '💼'} ${cls.name}`;
            select.appendChild(option);
        });
    }
    
    if (currentValue) {
        select.value = currentValue;
    }
}


// Atualizar treinos
function updateWorkouts() {
    const container = document.getElementById('workouts-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.workouts.forEach(workout => {
        const level = Number.isFinite(workout.level) ? workout.level : Math.floor(workout.xp / 100);
        const percentage = (workout.xp % 100);
        
        const workoutCard = document.createElement('div');
        workoutCard.className = 'item-card';
        workoutCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${workout.emoji}</span>
                <div>
                    <div class="item-name">${workout.name}</div>
                    <div class="item-level">Nível ${level} - ${percentage}%</div>
                    <div class="item-type">Tipo: ${getWorkoutTypeName(workout.type)}</div>
                    ${workout.stats ? `<div class="item-stats">Recorde: ${getWorkoutStats(workout)}</div>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${workout.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${workout.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(workoutCard);
    });
    
    // Adicionar eventos aos botões
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editWorkout(id);
        });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteWorkout(id);
        });
    });
}

// Obter estatísticas do treino
function getWorkoutStats(workout) {
    if (workout.type === 'repeticao') {
        return `${workout.stats.bestReps || 0} repetições`;
    } else if (workout.type === 'distancia') {
        return `${workout.stats.bestDistance || 0} km`;
    } else if (workout.type === 'maior-tempo') {
        return `${workout.stats.bestTime || 0} min`;
    } else if (workout.type === 'menor-tempo') {
        return `${workout.stats.bestTime || 0} min`;
    }
    return '';
}

// Atualizar visualização de estudos (VERSÃO ÚNICA)
function updateStudiesDisplay() {
    const container = document.getElementById('studies-display');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.studies.forEach(study => {
        const level = Number.isFinite(study.level) ? study.level : Math.floor(study.xp / 100);
        const currentXp = study.xp % 100;
        const percentage = (currentXp / 100) * 100;
        
        // Converter números dos dias para nomes
        const dayNames = study.days.map(day => {
            const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return days[day];
        }).join(', ');
        
        const studyCard = document.createElement('div');
        studyCard.className = 'study-display-card';
        studyCard.innerHTML = `
            <div class="display-card-header">
                <div class="display-name">
                    <span class="display-emoji">${study.emoji}</span>
                    <span>${study.name}</span>
                </div>
                <div class="display-type">${study.type === 'logico' ? 'Lógico' : 'Criativo'}</div>
            </div>
            
            <div class="display-xp-bar">
                <div class="display-level">Nível ${level}</div>
                <div class="display-xp-progress">
                    <div class="display-xp-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="display-xp-text">${currentXp}/100 XP</div>
            </div>
            
            <div class="display-details">
                <div class="display-days">
                    <i class="fas fa-calendar"></i>
                    <span>${dayNames}</span>
                </div>
                ${study.stats ? `
                <div class="display-record">
                    <i class="fas fa-trophy"></i>
                    <span>Concluído: ${study.stats.completed || 0} vezes</span>
                </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(studyCard);
    });
}

// Atualizar estudos
function updateStudies() {
    const container = document.getElementById('studies-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.studies.forEach(study => {
        const level = Number.isFinite(study.level) ? study.level : Math.floor(study.xp / 100);
        const percentage = (study.xp % 100);
        
        const studyCard = document.createElement('div');
        studyCard.className = 'item-card';
        studyCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${study.emoji}</span>
                <div>
                    <div class="item-name">${study.name}</div>
                    <div class="item-level">Nível ${level} - ${percentage}%</div>
                    <div class="item-type">Tipo: ${study.type === 'logico' ? 'Lógico' : 'Criativo'}</div>
                    ${study.stats ? `<div class="item-stats">Concluído: ${study.stats.completed || 0} vezes</div>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${study.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${study.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(studyCard);
    });
    
    // Adicionar eventos aos botões
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editStudy(id);
        });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteStudy(id);
        });
    });
}

// Atualizar livros
function updateBooks() {
    const container = document.getElementById('books-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = `item-card ${book.completed ? 'completed' : ''}`;
        bookCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${book.emoji}</span>
                <div>
                    <div class="item-name">${book.name}</div>
                    ${book.author ? `<div class="item-author">${book.author}</div>` : ''}
                    ${book.completed ? `<div class="item-completed">Concluído em: ${formatDate(book.dateCompleted)}</div>` : ''}
                </div>
            </div>
            <div class="item-actions">
                ${!book.completed ? `<button class="action-btn complete-book-btn" data-id="${book.id}">Concluir</button>` : ''}
                <button class="action-btn delete-btn" data-id="${book.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(bookCard);
    });
}

// Atualizar visualização de treinos (VERSÃO ÚNICA)
function updateWorkoutsDisplay() {
    const container = document.getElementById('workouts-display');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.workouts.forEach(workout => {
        const level = Number.isFinite(workout.level) ? workout.level : Math.floor(workout.xp / 100);
        const currentXp = workout.xp % 100;
        const percentage = (currentXp / 100) * 100;
        
        // Converter números dos dias para nomes
        const dayNames = workout.days.map(day => {
            const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return days[day];
        }).join(', ');
        
        const workoutCard = document.createElement('div');
        workoutCard.className = 'workout-display-card';
        workoutCard.innerHTML = `
            <div class="display-card-header">
                <div class="display-name">
                    <span class="display-emoji">${workout.emoji}</span>
                    <span>${workout.name}</span>
                </div>
                <div class="display-type">${getWorkoutTypeName(workout.type)}</div>
            </div>
            
            <div class="display-xp-bar">
                <div class="display-level">Nível ${level}</div>
                <div class="display-xp-progress">
                    <div class="display-xp-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="display-xp-text">${currentXp}/100 XP</div>
            </div>
            
            <div class="display-details">
                <div class="display-days">
                    <i class="fas fa-calendar"></i>
                    <span>${dayNames}</span>
                </div>
                ${workout.stats ? `
                <div class="display-record">
                    <i class="fas fa-trophy"></i>
                    <span>Recorde: ${getWorkoutStats(workout)}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        container.appendChild(workoutCard);
    });
}

// Atualizar loja (VERSÃO ÚNICA)
function updateShop() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Filtrar itens que o jogador pode comprar (nível mínimo)
    const availableItems = appData.shopItems.filter(item => 
        item.level <= appData.hero.level
    );
    
    if (availableItems.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum item disponível para seu nível.</p>';
        return;
    }
    
    availableItems.forEach(item => {
        const canAfford = appData.hero.coins >= item.cost;
        
        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';
        shopItem.innerHTML = `
            <div class="shop-item-header">
                <div class="shop-item-name">
                    <span class="item-emoji">${item.emoji}</span>
                    <span>${item.name}</span>
                </div>
                <div class="shop-item-level">Nível ${item.level}+</div>
            </div>
            <div class="shop-item-body">
                <p class="shop-item-desc">${item.description}</p>
                <div class="shop-item-footer">
                    <div class="shop-item-cost">
                        <i class="fas fa-coins"></i>
                        <span>${item.cost}</span>
                    </div>
                    <button class="buy-btn" data-id="${item.id}" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'Comprar' : 'Moedas insuficientes'}
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(shopItem);
    });
    
    // Adicionar eventos aos botões de compra
    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            buyItem(id);
        });
    });
}

// Atualizar inventário (VERSÃO ÚNICA)
function updateInventory() {
    const container = document.getElementById('inventory-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (appData.inventory.length === 0) {
        container.innerHTML = '<p class="empty-message">Inventário vazio.</p>';
        return;
    }
    
    // Agrupar itens por tipo e contar quantidades
    const itemsByType = {};
    appData.inventory.forEach(item => {
        const shopItem = appData.shopItems.find(shopItem => shopItem.id === item.id);
        if (!shopItem) return;
        
        if (!itemsByType[item.id]) {
            itemsByType[item.id] = {
                ...shopItem,
                count: 0,
                instances: []
            };
        }
        itemsByType[item.id].count++;
        itemsByType[item.id].instances.push(item);
    });
    
    // Exibir itens agrupados
    Object.values(itemsByType).forEach(item => {
        const inventoryItem = document.createElement('div');
        inventoryItem.className = 'inventory-item';
        inventoryItem.innerHTML = `
            <div class="inventory-item-header">
                <div class="inventory-item-name">
                    <span class="item-emoji">${item.emoji}</span>
                    <span>${item.name}</span>
                </div>
                <div class="inventory-item-quantity">x${item.count}</div>
            </div>
            <div class="inventory-item-body">
                <p class="inventory-item-desc">${item.description}</p>
                <button class="use-btn" data-id="${item.id}">Usar</button>
            </div>
        `;
        
        container.appendChild(inventoryItem);
    });
    
    // Adicionar eventos aos botões de uso
    container.querySelectorAll('.use-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            useItem(id);
        });
    });
}

// Adicionar evento para o formulário de item da loja
document.getElementById('shop-item-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const emoji = document.getElementById('item-emoji').value;
    const price = parseInt(document.getElementById('item-price').value);
    const level = parseInt(document.getElementById('item-level').value);
    
    if (!name || !price) {
        alert('Por favor, preencha pelo menos nome e preço.');
        return;
    }
    
    const newItem = {
        id: appData.shopItems.length > 0 ? Math.max(...appData.shopItems.map(i => i.id)) + 1 : 1,
        name,
        emoji: emoji || '🎁',
        cost: price,
        level: level || 0,
        description: "Recompensa no mundo real",
        effect: "custom"
    };
    
    appData.shopItems.push(newItem);
    
    // Limpar formulário
    e.target.reset();
    
    // Atualizar UI
    updateUI();
    
    alert('Item cadastrado com sucesso!');
});

// Editar item da loja
function editShopItem(id) {
    const item = appData.shopItems.find(i => i.id === id);
    if (!item) return;
    
    const newName = prompt('Novo nome do item:', item.name);
    if (newName) item.name = newName;
    
    const newEmoji = prompt('Novo emoji (opcional):', item.emoji);
    if (newEmoji) item.emoji = newEmoji;
    
    const newPrice = prompt('Novo preço (moedas):', item.cost);
    if (newPrice) item.cost = parseInt(newPrice);
    
    const newLevel = prompt('Novo nível mínimo:', item.level);
    if (newLevel) item.level = parseInt(newLevel);
    
    updateUI({ mode: 'shop' });
}

// Excluir item da loja
function deleteShopItem(id) {
    if (confirm('Tem certeza que deseja excluir este item da loja?')) {
        const index = appData.shopItems.findIndex(i => i.id === id);
        if (index !== -1) {
            appData.shopItems.splice(index, 1);
            updateUI({ mode: 'shop' });
            alert('Item excluído com sucesso!');
        }
    }
}

// Função para verificar e atualizar streaks
function updateStreaks() {
    const today = getLocalDateString();
    const todayDate = new Date(today);
    const DAY_MS = 1000 * 60 * 60 * 24;
    
    // Inicializar se não existir
    if (!appData.hero.streak) {
        appData.hero.streak = {
            general: 0,
            physical: 0,
            mental: 0,
            lastGeneralCheck: null,
            lastPhysicalCheck: null,
            lastMentalCheck: null
        };
    }

    const updateStreakType = (streakKey, lastCheckKey, hasFailureFn, hasActivityFn) => {
        const lastCheckStr = appData.hero.streak[lastCheckKey];
        if (!lastCheckStr) {
            appData.hero.streak[lastCheckKey] = today;
            return;
        }

        const lastCheckDate = new Date(lastCheckStr);
        const diffDays = Math.floor((todayDate - lastCheckDate) / DAY_MS);

        if (diffDays > 1) {
            appData.hero.streak[streakKey] = 0;
        } else if (diffDays === 1) {
            const yesterday = new Date(todayDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterday);

            if (hasFailureFn(yesterdayStr)) {
                appData.hero.streak[streakKey] = 0;
            } else if (hasActivityFn(yesterdayStr)) {
                appData.hero.streak[streakKey]++;
            }
        }

        appData.hero.streak[lastCheckKey] = today;
    };

    updateStreakType('general', 'lastGeneralCheck', hasGeneralFailure, checkDailyActivity);
    updateStreakType('physical', 'lastPhysicalCheck', hasWorkoutFailure, checkWorkoutActivity);
    updateStreakType('mental', 'lastMentalCheck', hasStudyFailure, checkStudyActivity);
}

// Modificar checkWorkoutActivity() e checkStudyActivity() para verificar o dia anterior:
function checkWorkoutActivity(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    const hasCompletedHistory = appData.completedWorkouts.some(w =>
        w.completedDate === targetDateStr && !w.failed
    );
    const hasDailyEntry = appData.dailyWorkouts.some(dw =>
        dw.date === targetDateStr && dw.completed
    );
    return hasCompletedHistory || hasDailyEntry;
}

// Verificar se houve atividade no dia
function checkDailyActivity(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    
    // Verificar miss??es
    const hasMission = appData.completedMissions.some(m => 
        m.completedDate === targetDateStr
    );

    // Verificar trabalhos
    const hasWork = appData.completedWorks.some(w =>
        w.completedDate === targetDateStr && !w.failed
    );
    
    // Verificar treinos/estudos
    const hasWorkout = checkWorkoutActivity(targetDateStr);
    const hasStudy = checkStudyActivity(targetDateStr);
    
    return hasMission || hasWork || hasWorkout || hasStudy;
}

function hasWorkoutFailure(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    return appData.completedWorkouts.some(w => w.failed && w.failedDate === targetDateStr) ||
        appData.dailyWorkouts.some(dw => dw.date === targetDateStr && dw.failed);
}

function hasStudyFailure(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    return appData.completedStudies.some(s => s.failed && s.failedDate === targetDateStr) ||
        appData.dailyStudies.some(ds => ds.date === targetDateStr && ds.failed);
}

function hasGeneralFailure(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    const missionFailed = appData.completedMissions.some(m => m.failed && m.failedDate === targetDateStr);
    const workFailed = appData.completedWorks.some(w => w.failed && w.failedDate === targetDateStr);
    return missionFailed || workFailed || hasWorkoutFailure(targetDateStr) || hasStudyFailure(targetDateStr);
}



// Verificar se houve estudo no dia
function checkStudyActivity(dateStr) {
    const targetDateStr = dateStr || getLocalDateString();
    const hasCompletedHistory = appData.completedStudies.some(s =>
        s.completedDate === targetDateStr && !s.failed
    );
    const hasDailyEntry = appData.dailyStudies.some(ds =>
        ds.date === targetDateStr && ds.completed
    );
    return hasCompletedHistory || hasDailyEntry;
}

// Atualizar lista de itens da loja para gerenciamento (VERSÃO ÚNICA)
function updateShopItemsList() {
    const container = document.getElementById('shop-items-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (appData.shopItems.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum item cadastrado.</p>';
        return;
    }
    
    appData.shopItems.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${item.emoji}</span>
                <div>
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                        <div class="item-price"><i class="fas fa-coins"></i> ${item.cost}</div>
                        <div class="item-level">Nível mínimo: ${item.level}</div>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(itemCard);
    });
    
    // Adicionar eventos aos botões
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editShopItem(id);
        });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteShopItem(id);
        });
    });
}


// Função para falhar uma missão
function failMission(missionId, reason = '') {
    const missionIndex = appData.missions.findIndex(m => m.id === missionId);
    if (missionIndex === -1) return;
    
    const mission = appData.missions[missionIndex];
    
    // Marcar como falhada
    mission.failed = true;
    mission.failedDate = getLocalDateString();
    
    // Aplicar penalidades (escudo protege perda de vida e streak)
    const hadShield = appData.hero.protection?.shield === true;
    if (hadShield) {
        appData.hero.protection.shield = false;
    } else {
        appData.hero.lives = Math.max(0, appData.hero.lives - 1); // Perde 1 vida
        appData.hero.streak.general = 0; // Reseta streak geral
    }
    
    // Atualizar estatísticas
    appData.statistics.missionsFailed = (appData.statistics.missionsFailed || 0) + 1;
    
    // Mover para missões concluídas (com status de falha)
    appData.completedMissions.push({
        ...mission,
        completedDate: mission.failedDate,
        failed: true,
        reason: reason
    });
    
    // Remover da lista de missões ativas
    appData.missions.splice(missionIndex, 1);
    
    // Atualizar UI
    updateUI();
    if (!hadShield) {
        handleGameOverIfNeeded();
    }
    
    const penaltyText = hadShield
        ? 'Escudo consumido! Você evitou perder 1 vida e streak.'
        : 'Você perdeu 1 vida e resetou o streak geral.';
    addHeroLog(
        'mission',
        `Missão falhada: ${mission.name}`,
        hadShield ? 'Escudo consumido para evitar penalidade.' : 'Perdeu 1 vida e streak geral.'
    );
    alert(`Missão "${mission.name}" falhou! ${penaltyText}`);
}

// Atualizar missões
function trySpendSkipCoins(activityLabel) {
    if (appData.hero.coins < SKIP_ACTIVITY_COST) {
        alert(`Voce precisa de ${SKIP_ACTIVITY_COST} moedas para pular ${activityLabel}.`);
        return false;
    }
    const confirmed = confirm(`Pular ${activityLabel} custa ${SKIP_ACTIVITY_COST} moedas. Deseja continuar?`);
    if (!confirmed) return false;
    appData.hero.coins -= SKIP_ACTIVITY_COST;
    return true;
}

function skipMission(missionId) {
    const missionIndex = appData.missions.findIndex(m => m.id === missionId);
    if (missionIndex === -1) return;

    const mission = appData.missions[missionIndex];
    if (!trySpendSkipCoins(`a missao "${mission.name}"`)) return;

    const todayStr = getLocalDateString();
    appData.completedMissions.push({
        ...mission,
        completed: false,
        failed: false,
        skipped: true,
        skippedDate: todayStr,
        reason: `Atividade pulada (-${SKIP_ACTIVITY_COST} moedas)`
    });
    appData.missions.splice(missionIndex, 1);

    if (mission.type === 'diaria') {
        recreateDailyMissionForTomorrow(mission);
    }

    addHeroLog(
        'mission',
        `Missao pulada: ${mission.name}`,
        `-${SKIP_ACTIVITY_COST} moedas. Sem penalidade.`
    );

    updateUI({ mode: 'activity' });
    alert(`Missao "${mission.name}" pulada sem penalidade.`);
}

function failWork(workId, reason = '') {
    const workIndex = appData.works.findIndex(w => w.id === workId);
    if (workIndex === -1) return;

    const work = appData.works[workIndex];
    work.failed = true;
    work.failedDate = getLocalDateString();

    const hadShield = appData.hero.protection?.shield === true;
    if (hadShield) {
        appData.hero.protection.shield = false;
    } else {
        appData.hero.lives = Math.max(0, appData.hero.lives - 1);
        appData.hero.streak.general = 0;
    }

    appData.completedWorks.push({
        ...work,
        completedDate: work.failedDate,
        failed: true,
        reason
    });
    appData.statistics.worksFailed = (appData.statistics.worksFailed || 0) + 1;

    appData.works.splice(workIndex, 1);
    updateUI({ mode: 'activity' });
    if (!hadShield) {
        handleGameOverIfNeeded();
    }

    addHeroLog(
        'mission',
        `Trabalho falhado: ${work.name}`,
        hadShield ? 'Escudo consumido para evitar penalidade.' : 'Perdeu 1 vida e streak geral.'
    );
}

function skipWork(workId) {
    const workIndex = appData.works.findIndex(w => w.id === workId);
    if (workIndex === -1) return;

    const work = appData.works[workIndex];
    if (!trySpendSkipCoins(`o trabalho "${work.name}"`)) return;

    const todayStr = getLocalDateString();
    appData.completedWorks.push({
        ...work,
        completed: false,
        failed: false,
        skipped: true,
        skippedDate: todayStr,
        reason: `Atividade pulada (-${SKIP_ACTIVITY_COST} moedas)`
    });
    appData.statistics.worksIgnored = (appData.statistics.worksIgnored || 0) + 1;
    appData.works.splice(workIndex, 1);

    if (work.type === 'diaria') {
        recreateDailyWorkForTomorrow(work);
    }

    addHeroLog(
        'mission',
        `Trabalho pulado: ${work.name}`,
        `-${SKIP_ACTIVITY_COST} moedas. Sem penalidade.`
    );

    updateUI({ mode: 'activity' });
    alert(`Trabalho "${work.name}" pulado sem penalidade.`);
}

function skipDailyWorkout(workoutDayId) {
    const workoutDay = appData.dailyWorkouts.find(dw => dw.id === workoutDayId);
    if (!workoutDay || workoutDay.completed || workoutDay.skipped) return;

    const workout = appData.workouts.find(w => w.id === workoutDay.workoutId);
    if (!workout) return;
    if (!trySpendSkipCoins(`o treino "${workout.name}"`)) return;

    workoutDay.skipped = true;
    workoutDay.skippedDate = getLocalDateString();

    const workoutHistoryExists = appData.completedWorkouts.some(w =>
        w.workoutId === workoutDay.workoutId && w.date === workoutDay.date
    );
    if (!workoutHistoryExists) {
        appData.completedWorkouts.push({
            id: Date.now() + workoutDay.id,
            workoutId: workoutDay.workoutId,
            name: workout.name,
            emoji: workout.emoji,
            type: workout.type,
            date: workoutDay.date,
            skipped: true,
            skippedDate: workoutDay.skippedDate,
            failed: false,
            reason: `Atividade pulada (-${SKIP_ACTIVITY_COST} moedas)`
        });
    }

    addHeroLog(
        'workout',
        `Treino pulado: ${workout.name}`,
        `-${SKIP_ACTIVITY_COST} moedas. Sem penalidade.`
    );

    updateUI({ mode: 'activity' });
    alert(`Treino "${workout.name}" pulado sem penalidade.`);
}

function skipDailyStudy(studyDayId) {
    const studyDay = appData.dailyStudies.find(ds => ds.id === studyDayId);
    if (!studyDay || studyDay.completed || studyDay.skipped) return;

    const study = appData.studies.find(s => s.id === studyDay.studyId);
    if (!study) return;
    if (!trySpendSkipCoins(`o estudo "${study.name}"`)) return;

    studyDay.skipped = true;
    studyDay.skippedDate = getLocalDateString();

    const studyHistoryExists = appData.completedStudies.some(s =>
        s.studyId === studyDay.studyId && s.date === studyDay.date
    );
    if (!studyHistoryExists) {
        appData.completedStudies.push({
            id: Date.now() + studyDay.id,
            studyId: studyDay.studyId,
            name: study.name,
            emoji: study.emoji,
            type: study.type,
            date: studyDay.date,
            skipped: true,
            skippedDate: studyDay.skippedDate,
            failed: false,
            applied: !!studyDay.applied,
            reason: `Atividade pulada (-${SKIP_ACTIVITY_COST} moedas)`
        });
    }

    addHeroLog(
        'study',
        `Estudo pulado: ${study.name}`,
        `-${SKIP_ACTIVITY_COST} moedas. Sem penalidade.`
    );

    updateUI({ mode: 'activity' });
    alert(`Estudo "${study.name}" pulado sem penalidade.`);
}

function updateMissions() {
    updateDailyMissions();
    updateCompletedMissions();
    updateMissionsList();
}

function updateWorks() {
    updateDailyWorks();
    updateCompletedWorks();
    updateWorksList();
}

function updateDailyWorks() {
    const container = document.getElementById('daily-works');
    if (!container) return;

    container.innerHTML = '';

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = getLocalDateString();

    const dailyWorks = appData.works.filter(work => {
        if (work.completed || work.failed) return false;

        if (work.type === 'diaria') {
            if (work.availableDate) return work.availableDate <= todayStr;
            if (work.dateAdded) return work.dateAdded <= todayStr;
            return true;
        }

        if (work.type === 'semanal') return work.days && work.days.includes(dayOfWeek);

        if (work.type === 'eventual') {
            if (!work.date) return false;
            const workDateStr = getLocalDateString(parseLocalDateString(work.date));
            return workDateStr === todayStr;
        }

        if (work.type === 'epica') {
            if (!work.deadline) return false;
            const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
            return deadlineStr >= todayStr;
        }

        return false;
    });

    if (dailyWorks.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum trabalho para hoje. Adicione novos trabalhos na aba de gerenciamento.</p>';
        return;
    }

    dailyWorks.forEach(work => {
        const card = document.createElement('div');
        card.className = 'mission-card';

        const attributesText = work.attributes.map(attrId => {
            const attr = appData.attributes.find(a => a.id === attrId);
            return attr ? `${attr.emoji} ${attr.name}` : '';
        }).filter(Boolean).join(', ');
        const className = work.classId ? getClassNameById(work.classId) : '';
        const classLine = className ? `<p>Classe: ${className}</p>` : '';

        card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${work.emoji || '💼'}</span>
                    <span>${work.name}</span>
                </div>
                <span class="mission-type ${work.type}">${getMissionTypeName(work.type)}</span>
            </div>
            <div class="mission-details">
                ${work.type === 'epica' ? `<p>Prazo: ${formatDate(work.deadline)}</p>` : ''}
                ${work.type === 'eventual' ? `<p>Data: ${formatDate(work.date)}</p>` : ''}
                ${work.type === 'semanal' ? `<p>Dias: ${getDaysNames(work.days)}</p>` : ''}
                ${classLine}
            </div>
            <div class="mission-attributes">
                ${attributesText ? `<p>Atributos: ${attributesText}</p>` : ''}
            </div>
            <div class="mission-actions">
                <button class="complete-btn complete-work-btn" data-id="${work.id}">
                    <i class="fas fa-check"></i> Concluir
                </button>
                <button class="skip-btn skip-work-btn" data-id="${work.id}">
                    <i class="fas fa-forward"></i> Pular (-${SKIP_ACTIVITY_COST})
                </button>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.complete-work-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            showWorkCompletionModal(id);
        });
    });

    container.querySelectorAll('.skip-work-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            skipWork(id);
        });
    });
}

function updateCompletedWorks() {
    const container = document.getElementById('completed-works');
    if (!container) return;

    container.innerHTML = '';

    if (appData.completedWorks.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum trabalho concluído ainda.</p>';
        return;
    }

    const recentWorks = appData.completedWorks.slice(-10).reverse();
    recentWorks.forEach(work => {
        const card = document.createElement('div');
        card.className = `mission-card ${work.failed ? 'failed' : work.skipped ? 'skipped' : 'completed'}`;

        const statusText = work.failed ? 'FALHOU' : work.skipped ? 'PULADO' : 'CONCLUIDO';
        const statusClass = work.failed ? 'failed-status' : work.skipped ? 'skipped-status' : 'completed-status';
        const rewardText = work.failed
            ? 'Penalidade: -1 vida'
            : work.skipped
            ? `Custo: -${SKIP_ACTIVITY_COST} moedas`
            : work.type === 'epica'
            ? 'Recompensa: 1 XP + 1 moeda'
            : 'Recompensa: 1 XP + 1 moeda';
        const eventDateLabel = work.failed ? 'Falhou em' : work.skipped ? 'Pulado em' : 'Concluido em';
        const eventDateValue = work.completedDate || work.failedDate || work.skippedDate;
        const className = work.classId ? getClassNameById(work.classId) : '';
        const classLine = className ? `<p>Classe: ${className}</p>` : '';

        card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${work.emoji || '💼'}</span>
                    <span>${work.name}</span>
                </div>
                <span class="mission-status ${statusClass}">${statusText}</span>
                <span class="mission-type ${work.type}">${getMissionTypeName(work.type)}</span>
            </div>
            <div class="mission-details">
                <p>${eventDateLabel}: ${formatDate(eventDateValue)}</p>
                <p>${rewardText}</p>
                ${classLine}
                ${work.reason ? `<p class="mission-reason">Motivo: ${work.reason}</p>` : ''}
                ${work.feedback ? `<p class="mission-feedback">Feedback: ${work.feedback}</p>` : ''}
            </div>
        `;

        container.appendChild(card);
    });
}

function checkOverdueWorks() {
    const todayStr = getLocalDateString();
    const overdueToFail = [];

    appData.works.forEach(work => {
        if (work.type === 'eventual' && work.date) {
            const workDateStr = getLocalDateString(parseLocalDateString(work.date));
            if (workDateStr < todayStr && !work.completed && !work.failed) {
                overdueToFail.push({ id: work.id, reason: 'Data do trabalho já passou' });
            }
        }

        if (work.type === 'epica' && work.deadline) {
            const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
            if (deadlineStr < todayStr && !work.completed && !work.failed) {
                overdueToFail.push({ id: work.id, reason: 'Prazo expirado' });
            }
        }
    });

    overdueToFail.forEach(item => failWork(item.id, item.reason));
    recreateDailyWorksForToday();
}

function updateWorksList() {
    const container = document.getElementById('works-list');
    if (!container) return;

    container.innerHTML = '';

    if (appData.works.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum trabalho cadastrado.</p>';
        return;
    }

    appData.works.forEach(work => {
        const today = new Date();
        const isOverdue = work.type === 'epica' && work.deadline && parseLocalDateString(work.deadline) < today;
        const className = work.classId ? getClassNameById(work.classId) : '';
        const classInfo = className ? `<div class="item-type">Classe: ${className}</div>` : '';

        let deadlineInfo = '';
        if (work.type === 'epica' && work.deadline) {
            const deadline = parseLocalDateString(work.deadline);
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(work.deadline)} (${daysLeft} dias)</div>`;
        }

        const card = document.createElement('div');
        card.className = `item-card ${isOverdue ? 'overdue' : ''}`;
        card.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${work.emoji || '💼'}</span>
                <div>
                    <div class="item-name">${work.name}</div>
                    <div class="item-type">${getMissionTypeName(work.type)}</div>
                    ${classInfo}
                    ${deadlineInfo}
                    ${isOverdue ? '<div class="overdue-warning">ATRASADO!</div>' : ''}
                </div>
            </div>
            <div class="item-actions">
                ${isOverdue ? `<button class="action-btn fail-btn" data-id="${work.id}">Falhar</button>` : ''}
                <button class="action-btn edit-btn" data-id="${work.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${work.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            editWork(id);
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            deleteWork(id);
        });
    });

    container.querySelectorAll('.fail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'), 10);
            const reason = prompt('Digite o motivo da falha (opcional):');
            failWork(id, reason);
        });
    });
}


// Atualizar missões do dia (função ajustada)
function updateDailyMissions() {
    const container = document.getElementById('daily-missions');
    if (!container) return;
    
    container.innerHTML = '';
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = getLocalDateString();
    
    // Filtrar apenas missões não concluídas e relevantes para HOJE
    const dailyMissions = appData.missions.filter(mission => {
        if (mission.completed || mission.failed) return false;
        
        // Para missões diárias: verificar se estão disponíveis HOJE
        if (mission.type === 'diaria') {
            // Se tiver availableDate, verificar se é hoje ou antes
            if (mission.availableDate) {
                return mission.availableDate <= todayStr;
            }
            // Se não tiver availableDate, verificar se foi adicionada hoje ou antes
            if (mission.dateAdded) {
                return mission.dateAdded <= todayStr;
            }
            // Se não tiver data, mostrar sempre (compatibilidade)
            return true;
        }
        
        if (mission.type === 'semanal') {
            return mission.days && mission.days.includes(dayOfWeek);
        }
        
        if (mission.type === 'eventual') {
            if (!mission.date) return false;
            const missionDateStr = getLocalDateString(parseLocalDateString(mission.date));
            return missionDateStr === todayStr;
        }
        
        if (mission.type === 'epica') {
            if (!mission.deadline) return false;
            const deadline = parseLocalDateString(mission.deadline);
            const deadlineStr = getLocalDateString(deadline);
            return deadlineStr >= todayStr;
        }
        
        return false;
    });
    
    console.log(`Missões filtradas para hoje (${todayStr}): ${dailyMissions.length}`);
    
    if (dailyMissions.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma missão para hoje. Adicione novas missões na aba de gerenciamento.</p>';
        return;
    }
    
    dailyMissions.forEach(mission => {
        const missionCard = document.createElement('div');
        missionCard.className = 'mission-card';
        
        const attributesText = mission.attributes.map(attrId => {
            const attr = appData.attributes.find(a => a.id === attrId);
            return attr ? `${attr.emoji} ${attr.name}` : '';
        }).filter(text => text).join(', ');
        missionCard.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${mission.emoji || '🎯'}</span>
                    <span>${mission.name}</span>
                </div>
                <span class="mission-type ${mission.type}">${getMissionTypeName(mission.type)}</span>
            </div>
            <div class="mission-details">
                ${mission.type === 'epica' ? `<p>Prazo: ${formatDate(mission.deadline)}</p>` : ''}
                ${mission.type === 'eventual' ? `<p>Data: ${formatDate(mission.date)}</p>` : ''}
                ${mission.type === 'semanal' ? `<p>Dias: ${getDaysNames(mission.days)}</p>` : ''}
            </div>
            <div class="mission-attributes">
                ${attributesText ? `<p>Atributos: ${attributesText}</p>` : ''}
            </div>
            <div class="mission-actions">
                <button class="complete-btn" data-id="${mission.id}">
                    <i class="fas fa-check"></i> Concluir
                </button>
                <button class="skip-btn skip-mission-btn" data-id="${mission.id}">
                    <i class="fas fa-forward"></i> Pular (-${SKIP_ACTIVITY_COST})
                </button>
            </div>
        `;
        
        container.appendChild(missionCard);
    });
    
    // Adicionar eventos aos botões de conclusão
    container.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            showMissionCompletionModal(id);
        });
    });
    container.querySelectorAll('.skip-mission-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            skipMission(id);
        });
    });
}

function updateCompletedMissions() {
    const container = document.getElementById('completed-missions');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (appData.completedMissions.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma missão concluída ainda.</p>';
        return;
    }
    
    // Mostrar apenas as últimas 10 missões (concluídas ou falhadas)
    const recentMissions = appData.completedMissions.slice(-10).reverse();
    
    recentMissions.forEach(mission => {
        const missionCard = document.createElement('div');
        missionCard.className = `mission-card ${mission.failed ? 'failed' : mission.skipped ? 'skipped' : 'completed'}`;
        
        const statusText = mission.failed ? 'FALHOU' : mission.skipped ? 'PULADA' : 'CONCLUIDA';
        const statusClass = mission.failed ? 'failed-status' : mission.skipped ? 'skipped-status' : 'completed-status';
        const rewardText = mission.failed ? 'Penalidade: -1 vida' : 
                         mission.skipped ? `Custo: -${SKIP_ACTIVITY_COST} moedas` :
                         mission.type === 'epica' ? 'Recompensa: 20 XP + 10 moedas' : 
                         'Recompensa: 1 XP + 1 moeda';
        const eventDateLabel = mission.failed ? 'Falhou em' : mission.skipped ? 'Pulada em' : 'Concluida em';
        const eventDateValue = mission.completedDate || mission.failedDate || mission.skippedDate;
        missionCard.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${mission.emoji || '🎯'}</span>
                    <span>${mission.name}</span>
                </div>
                <span class="mission-status ${statusClass}">${statusText}</span>
                <span class="mission-type ${mission.type}">${getMissionTypeName(mission.type)}</span>
            </div>
            <div class="mission-details">
                <p>${eventDateLabel}: ${formatDate(eventDateValue)}</p>
                <p>${rewardText}</p>
                ${mission.reason ? `<p class="mission-reason">Motivo: ${mission.reason}</p>` : ''}
                ${mission.feedback ? `<p class="mission-feedback">Feedback: ${mission.feedback}</p>` : ''}
            </div>
        `;
        
        container.appendChild(missionCard);
    });
}


// Verificar missões atrasadas diariamente (função ajustada)
function checkOverdueMissions() {
    const today = new Date();
    const todayStr = getLocalDateString();
    const overdueToFail = [];
    
    // Verificar missões que já deveriam ter sido feitas
    appData.missions.forEach(mission => {
        // Verificar missões eventuais com data passada
        if (mission.type === 'eventual' && mission.date) {
            const missionDate = parseLocalDateString(mission.date);
            const missionDateStr = getLocalDateString(missionDate);
            
            // Se a data da missão é anterior a hoje e não foi concluída
            if (missionDateStr < todayStr && !mission.completed && !mission.failed) {
                // Missão eventual atrasada - falhar automaticamente
                overdueToFail.push({ id: mission.id, reason: 'Data da missão já passou' });
            }
        }
        
        // Verificar missões épicas com prazo expirado
        if (mission.type === 'epica' && mission.deadline) {
            const deadline = parseLocalDateString(mission.deadline);
            const deadlineStr = getLocalDateString(deadline);
            
            if (deadlineStr < todayStr && !mission.failed && !mission.completed) {
                // Missão épica atrasada - falhar automaticamente
                overdueToFail.push({ id: mission.id, reason: 'Prazo expirado' });
            }
        }
    });
    
    overdueToFail.forEach(item => failMission(item.id, item.reason));
    // Para missões diárias: remover as concluídas do dia anterior e recriar para hoje
    recreateDailyMissionsForToday();
}

// Atualizar lista de missões cadastradas
function updateMissionsList() {
    const container = document.getElementById('missions-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (appData.missions.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma missão cadastrada.</p>';
        return;
    }
    
    appData.missions.forEach(mission => {
        // Verificar se a missão está atrasada
        const today = new Date();
        const isOverdue = mission.type === 'epica' && 
                         mission.deadline && 
                         parseLocalDateString(mission.deadline) < today;
        const missionCard = document.createElement('div');
        missionCard.className = `item-card ${isOverdue ? 'overdue' : ''}`;
        
        let deadlineInfo = '';
        if (mission.type === 'epica' && mission.deadline) {
            const deadline = parseLocalDateString(mission.deadline);
            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(mission.deadline)} (${daysLeft} dias)</div>`;
        }
        
        missionCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${mission.emoji || '🎯'}</span>
                <div>
                    <div class="item-name">${mission.name}</div>
                    <div class="item-type">${getMissionTypeName(mission.type)}</div>
                    ${deadlineInfo}
                    ${isOverdue ? '<div class="overdue-warning">ATRASADA!</div>' : ''}
                </div>
            </div>
            <div class="item-actions">
                ${isOverdue ? `<button class="action-btn fail-btn" data-id="${mission.id}">Falhar</button>` : ''}
                <button class="action-btn edit-btn" data-id="${mission.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${mission.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(missionCard);
    });
    
    // Adicionar eventos aos botões
    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            editMission(id);
        });
    });
    
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            deleteMission(id);
        });
    });
    
    // Adicionar eventos aos botões de falhar
    container.querySelectorAll('.fail-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            const reason = prompt('Digite o motivo da falha (opcional):');
            failMission(id, reason);
        });
    });
}
// Atualizar chefões
function updateBosses() {
    appData.bosses.forEach(boss => {
        const bossKey = boss.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const hpElement = document.getElementById(`boss-${bossKey}-hp`);
        const barElement = document.getElementById(`boss-${bossKey}-bar`);
        
        if (hpElement) {
            hpElement.textContent = boss.hp;
        }
        
        if (barElement) {
            const percentage = (boss.hp / boss.maxHp) * 100;
            const clampedPercentage = Math.max(0, Math.min(100, percentage));
            barElement.style.width = `${clampedPercentage}%`;
            
            // Atualizar cor baseado na vida
            if (percentage > 50) {
                barElement.style.background = 'linear-gradient(to right, #4CAF50, #8BC34A)';
            } else if (percentage > 25) {
                barElement.style.background = 'linear-gradient(to right, #FF9800, #FFC107)';
            } else {
                barElement.style.background = 'linear-gradient(to right, #F44336, #FF5722)';
            }
        }
        
        // Atualizar status de derrotado
        if (boss.hp <= 0 && !boss.defeated) {
            boss.defeated = true;
            boss.bonusActive = true;
            alert(`Chefe ${boss.name} derrotado! Você ganha +1 XP de bônus em todas as atividades até a próxima restauração.`);
        }
    });
}

// Atualizar streaks display
function updateStreaksDisplay() {
    updateMaxStreaks();
    document.getElementById('streak-general').textContent = `${appData.hero.streak.general} dias`;
    document.getElementById('streak-physical').textContent = `${appData.hero.streak.physical} dias`;
    document.getElementById('streak-mental').textContent = `${appData.hero.streak.mental} dias`;

    const generalRecord = document.getElementById('streak-general-record');
    const physicalRecord = document.getElementById('streak-physical-record');
    const mentalRecord = document.getElementById('streak-mental-record');
    if (generalRecord) generalRecord.textContent = `Recorde: ${appData.statistics.maxStreakGeneral || 0} dias`;
    if (physicalRecord) physicalRecord.textContent = `Recorde: ${appData.statistics.maxStreakPhysical || 0} dias`;
    if (mentalRecord) mentalRecord.textContent = `Recorde: ${appData.statistics.maxStreakMental || 0} dias`;
}

function updateMaxStreaks() {
    if (!appData.statistics) appData.statistics = {};
    appData.statistics.maxStreakGeneral = Math.max(appData.statistics.maxStreakGeneral || 0, appData.hero.streak.general || 0);
    appData.statistics.maxStreakPhysical = Math.max(appData.statistics.maxStreakPhysical || 0, appData.hero.streak.physical || 0);
    appData.statistics.maxStreakMental = Math.max(appData.statistics.maxStreakMental || 0, appData.hero.streak.mental || 0);
}


// Atualizar estatísticas
function updateStatistics() {
    document.getElementById('stat-workouts-done').textContent = appData.statistics.workoutsDone || 0;
    document.getElementById('stat-workouts-ignored').textContent = appData.statistics.workoutsIgnored || 0;
    document.getElementById('stat-studies-done').textContent = appData.statistics.studiesDone || 0;
    document.getElementById('stat-studies-ignored').textContent = appData.statistics.studiesIgnored || 0;
    document.getElementById('stat-works-done').textContent = appData.statistics.worksDone || 0;
    document.getElementById('stat-works-failed').textContent = appData.statistics.worksFailed || 0;
    document.getElementById('stat-works-ignored').textContent = appData.statistics.worksIgnored || 0;
    document.getElementById('stat-books-read').textContent = appData.statistics.booksRead || 0;
    document.getElementById('stat-missions-done').textContent = appData.statistics.missionsDone || 0;
    document.getElementById('stat-missions-failed').textContent = appData.statistics.missionsFailed || 0;
    document.getElementById('stat-deaths').textContent = appData.statistics.deaths || 0;
    document.getElementById('stat-justice-done').textContent = appData.statistics.justiceDone || 0;
    
    // Atualizar tabela de detalhes de treinos
    updateWorkoutDetailsTable();
    
    // Atualizar records
    updateRecords();
    
    // Atualizar dias produtivos
    updateProductiveDays();
    updateAdvancedStatistics();
}

function updateAdvancedStatistics() {
    const weeklyCompareEl = document.getElementById('stat-weekly-compare');
    const monthlyCompareEl = document.getElementById('stat-monthly-compare');
    const adherenceEl = document.getElementById('stat-adherence');
    const goalsStatusEl = document.getElementById('stat-goals-status');

    const weeklyCurrent = getPeriodTotals(7, 0);
    const weeklyPrevious = getPeriodTotals(7, 7);
    if (weeklyCompareEl) {
        weeklyCompareEl.innerHTML = `
            <p>Missões: ${weeklyCurrent.missions} (${formatTrendHtml(weeklyCurrent.missions, weeklyPrevious.missions)})</p>
            <p>Falhas/Ignoradas Missões: ${weeklyCurrent.missionsMissed} (${formatTrendHtml(weeklyCurrent.missionsMissed, weeklyPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${weeklyCurrent.works} (${formatTrendHtml(weeklyCurrent.works, weeklyPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${weeklyCurrent.worksMissed} (${formatTrendHtml(weeklyCurrent.worksMissed, weeklyPrevious.worksMissed, true)})</p>
            <p>Treinos: ${weeklyCurrent.workouts} (${formatTrendHtml(weeklyCurrent.workouts, weeklyPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${weeklyCurrent.workoutsMissed} (${formatTrendHtml(weeklyCurrent.workoutsMissed, weeklyPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${weeklyCurrent.studies} (${formatTrendHtml(weeklyCurrent.studies, weeklyPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${weeklyCurrent.studiesMissed} (${formatTrendHtml(weeklyCurrent.studiesMissed, weeklyPrevious.studiesMissed, true)})</p>
            <p>XP: ${weeklyCurrent.totalXP} (${formatTrendHtml(weeklyCurrent.totalXP, weeklyPrevious.totalXP)})</p>
        `;
    }

    const monthCurrent = getMonthTotals(getLocalDateString().slice(0, 7));
    const monthPrevious = getMonthTotals(getPreviousMonthKey(getLocalDateString().slice(0, 7)));
    if (monthlyCompareEl) {
        monthlyCompareEl.innerHTML = `
            <p>Missões: ${monthCurrent.missions} (${formatTrendHtml(monthCurrent.missions, monthPrevious.missions)})</p>
            <p>Falhas/Ignoradas Missões: ${monthCurrent.missionsMissed} (${formatTrendHtml(monthCurrent.missionsMissed, monthPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${monthCurrent.works} (${formatTrendHtml(monthCurrent.works, monthPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${monthCurrent.worksMissed} (${formatTrendHtml(monthCurrent.worksMissed, monthPrevious.worksMissed, true)})</p>
            <p>Treinos: ${monthCurrent.workouts} (${formatTrendHtml(monthCurrent.workouts, monthPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${monthCurrent.workoutsMissed} (${formatTrendHtml(monthCurrent.workoutsMissed, monthPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${monthCurrent.studies} (${formatTrendHtml(monthCurrent.studies, monthPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${monthCurrent.studiesMissed} (${formatTrendHtml(monthCurrent.studiesMissed, monthPrevious.studiesMissed, true)})</p>
            <p>XP: ${monthCurrent.totalXP} (${formatTrendHtml(monthCurrent.totalXP, monthPrevious.totalXP)})</p>
        `;
    }

    const weekMissionsPlanned = weeklyCurrent.missions + weeklyCurrent.missionsMissed;
    const weekWorksPlanned = weeklyCurrent.works + weeklyCurrent.worksMissed;
    const weekWorkoutsPlanned = weeklyCurrent.workouts + weeklyCurrent.workoutsMissed;
    const weekStudiesPlanned = weeklyCurrent.studies + weeklyCurrent.studiesMissed;
    const monthMissionsPlanned = monthCurrent.missions + monthCurrent.missionsMissed;
    const monthWorksPlanned = monthCurrent.works + monthCurrent.worksMissed;
    const monthWorkoutsPlanned = monthCurrent.workouts + monthCurrent.workoutsMissed;
    const monthStudiesPlanned = monthCurrent.studies + monthCurrent.studiesMissed;
    if (adherenceEl) {
        adherenceEl.innerHTML = `
            <p>7 dias - Missões: ${formatRate(weeklyCurrent.missions, weekMissionsPlanned)}</p>
            <p>7 dias - Trabalhos: ${formatRate(weeklyCurrent.works, weekWorksPlanned)}</p>
            <p>7 dias - Treinos: ${formatRate(weeklyCurrent.workouts, weekWorkoutsPlanned)}</p>
            <p>7 dias - Estudos: ${formatRate(weeklyCurrent.studies, weekStudiesPlanned)}</p>
            <p>Mês - Missões: ${formatRate(monthCurrent.missions, monthMissionsPlanned)}</p>
            <p>Mês - Trabalhos: ${formatRate(monthCurrent.works, monthWorksPlanned)}</p>
            <p>Mês - Treinos: ${formatRate(monthCurrent.workouts, monthWorkoutsPlanned)}</p>
            <p>Mês - Estudos: ${formatRate(monthCurrent.studies, monthStudiesPlanned)}</p>
        `;
    }

    syncStatisticsGoalsInputs();
    if (goalsStatusEl) {
        const goals = appData.statisticsGoals || { missions: 14, workouts: 5, studies: 7, works: 5 };
        goalsStatusEl.innerHTML = `
            <p class="${getGoalStatusClass(weeklyCurrent.missions, goals.missions)}">Missões: ${weeklyCurrent.missions}/${goals.missions}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.works, goals.works)}">Trabalhos: ${weeklyCurrent.works}/${goals.works}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.workouts, goals.workouts)}">Treinos: ${weeklyCurrent.workouts}/${goals.workouts}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.studies, goals.studies)}">Estudos: ${weeklyCurrent.studies}/${goals.studies}</p>
        `;
    }
}

function getPeriodTotals(days, offsetDays) {
    const keys = getPeriodDateKeys(days, offsetDays);
    return getTotalsFromDateKeys(keys);
}

function getMonthTotals(monthKey) {
    const keys = new Set();
    const source = appData.statistics.productiveDays || {};
    Object.keys(source).forEach(dateKey => {
        if (dateKey && dateKey.slice(0, 7) === monthKey) keys.add(dateKey);
    });
    (appData.completedMissions || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (key && key.slice(0, 7) === monthKey) keys.add(key);
    });
    (appData.completedWorks || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (key && key.slice(0, 7) === monthKey) keys.add(key);
    });
    (appData.completedWorkouts || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (key && key.slice(0, 7) === monthKey) keys.add(key);
    });
    (appData.completedStudies || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (key && key.slice(0, 7) === monthKey) keys.add(key);
    });
    return getTotalsFromDateKeys(keys);
}

function formatDeltaWithPercent(current, previous) {
    const delta = current - previous;
    const percent = calculatePercentChange(current, previous);
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta} / ${percent.toFixed(1).replace('.', ',')}%`;
}

function formatTrendHtml(current, previous, lowerIsBetter = false) {
    const delta = current - previous;
    const sign = delta > 0 ? '+' : '';
    let text = '';
    let trendClass = 'trend-flat';
    let trendArrow = '→';

    if (!Number.isFinite(previous) || previous === 0) {
        if (!Number.isFinite(current) || current === 0) {
            text = '0 / sem base';
        } else if (current > 0) {
            text = `${sign}${delta} / novo`;
            trendClass = lowerIsBetter ? 'trend-down' : 'trend-up';
            trendArrow = '↑';
        } else {
            text = `${sign}${delta} / sem base`;
            trendClass = lowerIsBetter ? 'trend-up' : 'trend-down';
            trendArrow = '↓';
        }
    } else {
        const percent = calculatePercentChange(current, previous);
        text = `${sign}${delta} / ${percent.toFixed(1).replace('.', ',')}%`;
        if (delta === 0) {
            trendClass = 'trend-flat';
        } else {
            const improved = lowerIsBetter ? delta < 0 : delta > 0;
            trendClass = improved ? 'trend-up' : 'trend-down';
        }
        trendArrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    }
    return `<span class="stats-trend ${trendClass}">${trendArrow} ${text}</span>`;
}

function getPeriodDateKeys(days, offsetDays) {
    const keys = new Set();
    for (let i = offsetDays + days - 1; i >= offsetDays; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        keys.add(getLocalDateString(d));
    }
    return keys;
}

function getEventDateKey(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return entry.completedDate || entry.failedDate || entry.skippedDate || entry.date || '';
}

function getTotalsFromDateKeys(keys) {
    const safeKeys = keys instanceof Set ? keys : new Set();
    const totals = {
        missions: 0,
        missionsMissed: 0,
        works: 0,
        worksMissed: 0,
        workouts: 0,
        workoutsMissed: 0,
        studies: 0,
        studiesMissed: 0,
        totalXP: 0
    };

    const productiveSource = appData.statistics.productiveDays || {};
    safeKeys.forEach(key => {
        const data = productiveSource[key] || {};
        totals.totalXP += Number(data.totalXP || 0);
    });

    (appData.completedMissions || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!safeKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.missionsMissed += 1;
        else totals.missions += 1;
    });

    (appData.completedWorks || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!safeKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.worksMissed += 1;
        else totals.works += 1;
    });

    (appData.completedWorkouts || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!safeKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.workoutsMissed += 1;
        else totals.workouts += 1;
    });

    (appData.completedStudies || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!safeKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.studiesMissed += 1;
        else totals.studies += 1;
    });

    return totals;
}

function formatRate(done, planned) {
    if (!planned || planned <= 0) return '0/0 (0,0%)';
    const rate = (done / planned) * 100;
    return `${done}/${planned} (${rate.toFixed(1).replace('.', ',')}%)`;
}

function getGoalStatusClass(current, target) {
    const safeTarget = Math.max(1, Number(target || 0));
    const ratio = Number(current || 0) / safeTarget;
    if (ratio >= 1) return 'goal-status-ok';
    if (ratio >= 0.7) return 'goal-status-warn';
    return 'goal-status-danger';
}

function syncStatisticsGoalsInputs() {
    const goals = appData.statisticsGoals || { missions: 14, workouts: 5, studies: 7, works: 5 };
    const missionsInput = document.getElementById('goal-missions');
    const worksInput = document.getElementById('goal-works');
    const workoutsInput = document.getElementById('goal-workouts');
    const studiesInput = document.getElementById('goal-studies');
    if (missionsInput && document.activeElement !== missionsInput) missionsInput.value = goals.missions;
    if (worksInput && document.activeElement !== worksInput) worksInput.value = goals.works;
    if (workoutsInput && document.activeElement !== workoutsInput) workoutsInput.value = goals.workouts;
    if (studiesInput && document.activeElement !== studiesInput) studiesInput.value = goals.studies;
}

function saveStatisticsGoals() {
    const missions = parseInt(document.getElementById('goal-missions')?.value || '0', 10);
    const works = parseInt(document.getElementById('goal-works')?.value || '0', 10);
    const workouts = parseInt(document.getElementById('goal-workouts')?.value || '0', 10);
    const studies = parseInt(document.getElementById('goal-studies')?.value || '0', 10);
    if (!Number.isFinite(missions) || missions <= 0 || !Number.isFinite(works) || works <= 0 || !Number.isFinite(workouts) || workouts <= 0 || !Number.isFinite(studies) || studies <= 0) {
        alert('Informe metas válidas (números maiores que zero).');
        return;
    }
    appData.statisticsGoals = { missions, works, workouts, studies };
    updateUI({ mode: 'activity' });
}

// Atualizar tabela de detalhes de treinos
function updateWorkoutDetailsTable() {
    const tbody = document.querySelector('#workout-details-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    appData.workouts.forEach(workout => {
        const row = document.createElement('tr');
        
        let totalReps = 0;
        let totalDistance = 0;
        let totalTime = 0;
        let timesDone = 0;
        
        if (workout.stats) {
            totalReps = workout.stats.totalReps || 0;
            totalDistance = workout.stats.totalDistance || 0;
            totalTime = workout.stats.totalTime || 0;
            timesDone = workout.stats.completed || 0;
        }
        
        row.innerHTML = `
            <td>${workout.emoji} ${workout.name}</td>
            <td>${workout.type === 'repeticao' ? totalReps : '-'}</td>
            <td>${workout.type === 'distancia' ? totalDistance.toFixed(2) + ' km' : '-'}</td>
            <td>${workout.type === 'maior-tempo' || workout.type === 'menor-tempo' ? totalTime.toFixed(1) + ' min' : '-'}</td>
            <td>${timesDone}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Atualizar records
function updateRecords() {
    const container = document.getElementById('personal-records');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Records de treinos
    appData.workouts.forEach(workout => {
        if (workout.stats) {
            let recordText = '';
            
            if (workout.type === 'repeticao' && workout.stats.bestReps > 0) {
                recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestReps} repetições`;
            } else if (workout.type === 'distancia' && workout.stats.bestDistance > 0) {
                recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestDistance.toFixed(2)} km`;
            } else if ((workout.type === 'maior-tempo' || workout.type === 'menor-tempo') && workout.stats.bestTime > 0) {
                recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestTime.toFixed(1)} min`;
            }
            
            if (recordText) {
                const recordItem = document.createElement('div');
                recordItem.className = 'record-item';
                recordItem.textContent = recordText;
                container.appendChild(recordItem);
            }
        }
    });
    
    const productiveDaysRecords = Object.values(appData.statistics.productiveDays || {});
    
    // Records de missões
    const maxMissionsPerDay = Math.max(
        0,
        ...productiveDaysRecords.map(r => r.missions || 0)
    );
    if (maxMissionsPerDay > 0) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `🎯 Máximo de missões em um dia: ${maxMissionsPerDay}`;
        container.appendChild(recordItem);
    }

    // Records de estudos
    const maxStudiesPerDay = Math.max(
        0,
        ...productiveDaysRecords.map(r => r.studies || 0)
    );
    if (maxStudiesPerDay > 0) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `📚 Máximo de estudos em um dia: ${maxStudiesPerDay}`;
        container.appendChild(recordItem);
    }

    // Records de treinos
    const maxWorkoutsPerDay = Math.max(
        0,
        ...productiveDaysRecords.map(r => r.workouts || 0)
    );
    if (maxWorkoutsPerDay > 0) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `💪 Máximo de treinos em um dia: ${maxWorkoutsPerDay}`;
        container.appendChild(recordItem);
    }

    const maxWorksPerDay = Math.max(
        0,
        ...productiveDaysRecords.map(r => r.works || 0)
    );
    if (maxWorksPerDay > 0) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `💼 Máximo de trabalhos em um dia: ${maxWorksPerDay}`;
        container.appendChild(recordItem);
    }

    // Novos records agregados
    const dayStats = {};
    const ensureDayStats = (dateKey) => {
        if (!dateKey) return null;
        if (!dayStats[dateKey]) {
            dayStats[dateKey] = { done: 0, missed: 0 };
        }
        return dayStats[dateKey];
    };
    const addEventToDayStats = (entry) => {
        const key = getEventDateKey(entry);
        const stats = ensureDayStats(key);
        if (!stats) return;
        if (entry.failed || entry.skipped) stats.missed += 1;
        else stats.done += 1;
    };
    (appData.completedMissions || []).forEach(addEventToDayStats);
    (appData.completedWorks || []).forEach(addEventToDayStats);
    (appData.completedWorkouts || []).forEach(addEventToDayStats);
    (appData.completedStudies || []).forEach(addEventToDayStats);

    const sortedDates = Object.keys(dayStats).sort();
    const toDate = (key) => new Date(`${key}T00:00:00`);
    const daysDiff = (a, b) => Math.round((toDate(a) - toDate(b)) / 86400000);
    const toWeekWindowSet = (endDateKey) => {
        const keys = new Set();
        const end = toDate(endDateKey);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(end);
            d.setDate(d.getDate() - i);
            keys.add(getLocalDateString(d));
        }
        return keys;
    };

    // Maior sequencia sem falhas
    let bestNoFailStreak = 0;
    let currentNoFailStreak = 0;
    let prevDateKey = '';
    sortedDates.forEach(dateKey => {
        const stats = dayStats[dateKey];
        const isPerfectDay = stats.done > 0 && stats.missed === 0;
        if (!isPerfectDay) {
            currentNoFailStreak = 0;
            prevDateKey = dateKey;
            return;
        }
        const isConsecutive = prevDateKey && daysDiff(dateKey, prevDateKey) === 1;
        currentNoFailStreak = isConsecutive ? (currentNoFailStreak + 1) : 1;
        bestNoFailStreak = Math.max(bestNoFailStreak, currentNoFailStreak);
        prevDateKey = dateKey;
    });
    if (bestNoFailStreak > 0) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `🛡️ Maior sequência sem falhas: ${bestNoFailStreak} dias`;
        container.appendChild(recordItem);
    }

    // Maior XP em um dia
    let bestXpDate = '';
    let bestXpValue = 0;
    Object.entries(appData.statistics.productiveDays || {}).forEach(([dateKey, data]) => {
        const total = Number(data?.totalXP || 0);
        if (total > bestXpValue) {
            bestXpValue = total;
            bestXpDate = dateKey;
        }
    });
    if (bestXpValue > 0 && bestXpDate) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `⭐ Maior XP em um dia: ${bestXpValue} (${formatDate(bestXpDate)})`;
        container.appendChild(recordItem);
    }

    // Melhor semana (atividades concluidas) e melhor aderencia semanal
    let bestWeekDone = 0;
    let bestWeekEnd = '';
    let bestWeekAdherence = 0;
    let bestWeekAdherenceEnd = '';
    sortedDates.forEach(endDateKey => {
        const weekTotals = getTotalsFromDateKeys(toWeekWindowSet(endDateKey));
        const weekDone = weekTotals.missions + weekTotals.works + weekTotals.workouts + weekTotals.studies;
        const weekMissed = weekTotals.missionsMissed + weekTotals.worksMissed + weekTotals.workoutsMissed + weekTotals.studiesMissed;
        const planned = weekDone + weekMissed;
        if (weekDone > bestWeekDone) {
            bestWeekDone = weekDone;
            bestWeekEnd = endDateKey;
        }
        if (planned > 0) {
            const adherence = (weekDone / planned) * 100;
            if (adherence > bestWeekAdherence) {
                bestWeekAdherence = adherence;
                bestWeekAdherenceEnd = endDateKey;
            }
        }
    });
    if (bestWeekDone > 0 && bestWeekEnd) {
        const start = toDate(bestWeekEnd);
        start.setDate(start.getDate() - 6);
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `📈 Melhor semana: ${bestWeekDone} concluídas (${formatDate(getLocalDateString(start))} a ${formatDate(bestWeekEnd)})`;
        container.appendChild(recordItem);
    }
    if (bestWeekAdherenceEnd) {
        const start = toDate(bestWeekAdherenceEnd);
        start.setDate(start.getDate() - 6);
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `✅ Maior aderência semanal: ${bestWeekAdherence.toFixed(1).replace('.', ',')}% (${formatDate(getLocalDateString(start))} a ${formatDate(bestWeekAdherenceEnd)})`;
        container.appendChild(recordItem);
    }

    // Melhor mes (XP)
    const monthXpTotals = {};
    Object.entries(appData.statistics.productiveDays || {}).forEach(([dateKey, data]) => {
        const monthKey = (dateKey || '').slice(0, 7);
        if (!monthKey) return;
        monthXpTotals[monthKey] = (monthXpTotals[monthKey] || 0) + Number(data?.totalXP || 0);
    });
    let bestMonthKey = '';
    let bestMonthXp = 0;
    Object.entries(monthXpTotals).forEach(([monthKey, totalXp]) => {
        if (totalXp > bestMonthXp) {
            bestMonthXp = totalXp;
            bestMonthKey = monthKey;
        }
    });
    if (bestMonthKey && bestMonthXp > 0) {
        const [year, month] = bestMonthKey.split('-').map(Number);
        const label = new Date(year, (month || 1) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `🗓️ Melhor mês (XP): ${bestMonthXp} em ${label}`;
        container.appendChild(recordItem);
    }

    // Records de streaks
    if (appData.statistics.maxStreakGeneral) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `🔥 Maior streak geral: ${appData.statistics.maxStreakGeneral} dias`;
        container.appendChild(recordItem);
    }
    if (appData.statistics.maxStreakPhysical) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `💪 Maior streak físico: ${appData.statistics.maxStreakPhysical} dias`;
        container.appendChild(recordItem);
    }
    if (appData.statistics.maxStreakMental) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = `📚 Maior streak mental: ${appData.statistics.maxStreakMental} dias`;
        container.appendChild(recordItem);
    }
}

// Atualizar dias produtivos
function updateProductiveDays() {
    const tbody = document.querySelector('#productive-days-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Ordenar dias por total XP
    const productiveDays = Object.entries(appData.statistics.productiveDays || {})
        .filter(([date]) => !isRestDay(date))
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 10); // Top 10 dias
    
    productiveDays.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(day.date)}</td>
            <td class="col-mission">${day.missions || 0}</td>
            <td class="col-work">${day.works || 0}</td>
            <td class="col-workout">${day.workouts || 0}</td>
            <td class="col-study">${day.studies || 0}</td>
            <td>${day.totalXP || 0}</td>
        `;
        tbody.appendChild(row);
    });
}

// Atualizar diário
function updateDiary() {
    updateDiaryEntries();
}

// Atualizar entradas do diário
function updateDiaryEntries() {
    const container = document.getElementById('diary-entries-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!diaryLoaded) {
        container.innerHTML = '<p class="empty-message">Carregando diário...</p>';
        return;
    }

    const entries = diaryDbAvailable ? diaryCache : (appData.diaryEntries || []);
    updateDiaryFilterOptions(entries);

    if (entries.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma entrada no diário ainda.</p>';
        return;
    }

    const searchFilter = (document.getElementById('diary-search')?.value || '').trim().toLowerCase();
    const monthFilter = document.getElementById('diary-filter-month')?.value || '';
    const dateFilter = document.getElementById('diary-filter-date')?.value || '';
    const attributeFilter = document.getElementById('diary-filter-attribute')?.value || '';
    const xpFilter = document.getElementById('diary-filter-xp')?.value || 'all';
    
    // Ordenar por data (mais recente primeiro)
    const sortedEntries = [...entries].sort((a, b) => parseLocalDateString(b.date) - parseLocalDateString(a.date));
    const filteredEntries = sortedEntries.filter(entry => {
        const entryDate = parseLocalDateString(entry.date);
        const entryDateString = getLocalDateString(entryDate);
        const entryMonth = entryDateString.slice(0, 7);

        if (monthFilter && entryMonth !== monthFilter) return false;
        if (dateFilter && entryDateString !== dateFilter) return false;

        const entryAttributes = Array.isArray(entry.attributes) ? entry.attributes.map(id => String(id)) : [];
        if (attributeFilter && !entryAttributes.includes(String(attributeFilter))) return false;

        const xpGained = Number(entry.xpGained) || 0;
        if (xpFilter === 'with' && xpGained <= 0) return false;
        if (xpFilter === 'without' && xpGained > 0) return false;

        if (searchFilter) {
            const attributesText = entryAttributes
                .map(attrId => appData.attributes.find(a => String(a.id) === String(attrId))?.name || '')
                .join(' ')
                .toLowerCase();
            const fullText = `${entry.title || ''} ${entry.content || ''} ${attributesText}`.toLowerCase();
            if (!fullText.includes(searchFilter)) return false;
        }

        return true;
    });

    if (filteredEntries.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhuma entrada encontrada para os filtros selecionados.</p>';
        return;
    }
    
    filteredEntries.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'diary-entry';
        
        const date = parseLocalDateString(entry.date);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const attributesText = entry.attributes && entry.attributes.length > 0
            ? entry.attributes.map(attrId => {
                const attr = appData.attributes.find(a => a.id === attrId);
                return attr ? `${attr.emoji} ${escapeHtml(attr.name)}` : '';
            }).filter(text => text).join(', ')
            : 'Nenhum atributo selecionado';
        
        const safeTitle = escapeHtml(entry.title || 'Sem título');
        const safeContent = escapeHtml(entry.content || '');
        entryElement.innerHTML = `
            <div class="diary-entry-header">
                <div class="diary-entry-title">${safeTitle}</div>
                <div class="diary-entry-date">${formattedDate}</div>
            </div>
            <div class="diary-entry-content">${safeContent}</div>
            <div class="diary-entry-attributes">
                <strong>Atributos:</strong> ${attributesText}
            </div>
            ${entry.xpGained ? `<div class="diary-entry-xp">XP ganho: ${entry.xpGained}</div>` : ''}
            <div class="diary-entry-actions">
                <button class="diary-action-btn edit" data-action="edit" data-id="${escapeHtml(String(entry.id))}">Editar</button>
                <button class="diary-action-btn delete" data-action="delete" data-id="${escapeHtml(String(entry.id))}">Excluir</button>
            </div>
        `;
        
        container.appendChild(entryElement);
    });

    container.querySelectorAll('.diary-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.getAttribute('data-action');
            const entryId = btn.getAttribute('data-id');
            if (!entryId || !action) return;
            if (action === 'edit') {
                await editDiaryEntry(entryId);
            } else if (action === 'delete') {
                await deleteDiaryEntry(entryId);
            }
        });
    });
}

function updateFinanceSummary() {
    const incomeEl = document.getElementById('finance-income');
    const expenseEl = document.getElementById('finance-expense');
    const balanceEl = document.getElementById('finance-balance');
    if (!incomeEl || !expenseEl || !balanceEl) return;
    const formatBRL = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const monthFilter = document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7);
    const monthKey = monthFilter === 'all' ? getLocalDateString().slice(0, 7) : monthFilter;
    const prevMonthKey = getPreviousMonthKey(monthKey);
    updateFinanceKpiContext(monthKey);

    const monthEntries = appData.financeEntries.filter(e => getMonthKey(e.date) === monthKey);
    const prevMonthEntries = appData.financeEntries.filter(e => getMonthKey(e.date) === prevMonthKey);

    const income = monthEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);
    const expense = monthEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);
    const balance = income - expense;

    const prevIncome = prevMonthEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);
    const prevExpense = prevMonthEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);
    const prevBalance = prevIncome - prevExpense;

    const savingsRate = income > 0 ? (balance / income) * 100 : 0;
    const fixedExpenses = monthEntries
        .filter(e => e.type === 'expense' && e.recurringId)
        .reduce((sum, e) => sum + e.amount, 0);
    const variableExpenses = monthEntries
        .filter(e => e.type === 'expense' && !e.recurringId)
        .reduce((sum, e) => sum + e.amount, 0);

    const dayData = getMonthDayData(monthKey);
    const averageDailyExpense = dayData.daysInPeriod > 0 ? expense / dayData.daysInPeriod : 0;
    const projectedBalance = monthKey === getLocalDateString().slice(0, 7)
        ? (dayData.daysInPeriod > 0 ? (balance / dayData.daysInPeriod) * dayData.daysInMonth : balance)
        : balance;

    incomeEl.textContent = formatBRL(income);
    expenseEl.textContent = formatBRL(expense);
    balanceEl.textContent = formatBRL(balance);

    setFinanceDelta('finance-income-delta', calculatePercentChange(income, prevIncome), true);
    setFinanceDelta('finance-expense-delta', calculatePercentChange(expense, prevExpense), true);
    setFinanceDelta('finance-balance-delta', calculatePercentChange(balance, prevBalance), false);

    const savingsEl = document.getElementById('finance-savings-rate');
    if (savingsEl) savingsEl.textContent = `${savingsRate.toFixed(1).replace('.', ',')}%`;

    const fixedVariableEl = document.getElementById('finance-fixed-variable');
    if (fixedVariableEl) fixedVariableEl.textContent = `${formatBRL(fixedExpenses)} / ${formatBRL(variableExpenses)}`;

    const dailyAvgEl = document.getElementById('finance-daily-average');
    if (dailyAvgEl) dailyAvgEl.textContent = formatBRL(averageDailyExpense);

    const projectedEl = document.getElementById('finance-projected-balance');
    if (projectedEl) projectedEl.textContent = formatBRL(projectedBalance);
}

function updateFinanceView() {
    applyRecurringFinanceEntries();
    updateFinanceSummary();
    renderFinanceBudgets();
    renderFinanceRecurringList();
    renderFinanceList();
    updateFinanceCharts();
}

function applyRecurringFinanceEntries() {
    const todayStr = getLocalDateString();
    const currentMonth = getMonthKey(todayStr);
    const skipSet = new Set((appData.financeRecurringSkips || []).map(s => String(s)));

    if (!Array.isArray(appData.financeRecurring) || appData.financeRecurring.length === 0) return;

    appData.financeRecurring.forEach(rec => {
        if (!rec || rec.active === false) return;
        const amount = Number(rec.amount);
        if (!Number.isFinite(amount) || amount <= 0) return;

        const startDate = parseLocalDateString(rec.startDate || todayStr);
        const startMonthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const startMonth = getMonthKey(getLocalDateString(startMonthDate));
        const monthCursor = startMonth;

        for (let monthKey = monthCursor; monthKey <= currentMonth;) {
            const [y, m] = monthKey.split('-').map(v => parseInt(v, 10));
            const lastDay = new Date(y, m, 0).getDate();
            const day = Math.min(Math.max(1, parseInt(rec.dayOfMonth, 10) || 1), lastDay);
            const dueDate = getLocalDateString(new Date(y, m - 1, day));

            const startsOk = !rec.startDate || dueDate >= rec.startDate;
            const endsOk = !rec.endDate || dueDate <= rec.endDate;
            const dueReached = dueDate <= todayStr;

            if (startsOk && endsOk && dueReached) {
                const skipKey = getRecurringSkipKey(rec.id, monthKey);
                const exists = appData.financeEntries.some(e =>
                    String(e.recurringId || '') === String(rec.id) &&
                    e.recurringMonth === monthKey
                );

                if (!exists && !skipSet.has(skipKey)) {
                    appData.financeEntries.push({
                        id: createUniqueId(appData.financeEntries),
                        type: rec.type === 'income' ? 'income' : 'expense',
                        amount,
                        category: rec.category || '',
                        description: rec.description || '',
                        date: dueDate,
                        recurringId: rec.id,
                        recurringMonth: monthKey
                    });
                }
            }

            const next = new Date(y, m, 1);
            monthKey = getMonthKey(getLocalDateString(next));
        }
    });
}

function updateDiaryFilterOptions(entriesSource) {
    const entries = Array.isArray(entriesSource) ? entriesSource : [];
    const monthSelect = document.getElementById('diary-filter-month');
    const attributeSelect = document.getElementById('diary-filter-attribute');
    if (monthSelect) {
        const previousMonth = monthSelect.value || '';
        const months = Array.from(new Set(
            entries
                .map(entry => getLocalDateString(parseLocalDateString(entry.date)).slice(0, 7))
                .filter(month => /^\d{4}-\d{2}$/.test(month))
        ))
            .sort((a, b) => b.localeCompare(a));
        monthSelect.innerHTML = '<option value="">Todos os meses</option>' +
            months.map(month => `<option value="${month}">${month}</option>`).join('');
        monthSelect.value = months.includes(previousMonth) ? previousMonth : '';
    }
    if (attributeSelect) {
        const previousAttribute = attributeSelect.value || '';
        const options = appData.attributes
            .slice()
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
            .map(attr => `<option value="${attr.id}">${attr.emoji} ${escapeHtml(attr.name)}</option>`)
            .join('');
        attributeSelect.innerHTML = '<option value="">Todos os atributos</option>' + options;
        const isValidValue = appData.attributes.some(attr => String(attr.id) === String(previousAttribute));
        attributeSelect.value = isValidValue ? previousAttribute : '';
    }
}

async function editDiaryEntry(entryId) {
    const entries = diaryDbAvailable ? (diaryCache || []) : (appData.diaryEntries || []);
    const entry = entries.find(item => String(item?.id) === String(entryId));
    if (!entry) return;

    const titleInput = prompt('Editar título da entrada:', entry.title || '');
    if (titleInput === null) return;

    const contentInput = prompt('Editar conteúdo da entrada:', entry.content || '');
    if (contentInput === null) return;
    if (!contentInput.trim()) {
        alert('O conteúdo não pode ficar vazio.');
        return;
    }

    const nextEntries = entries.map(item => {
        if (String(item?.id) !== String(entryId)) return item;
        return {
            ...item,
            title: titleInput.trim() || 'Sem título',
            content: contentInput,
            updatedAt: new Date().toISOString()
        };
    });

    await replaceDiaryEntriesInStorage(nextEntries);
    saveToLocalStorage();
    updateDiaryEntries();
}

async function deleteDiaryEntry(entryId) {
    if (!confirm('Deseja excluir esta entrada do diário?')) return;
    const entries = diaryDbAvailable ? (diaryCache || []) : (appData.diaryEntries || []);
    const nextEntries = entries.filter(item => String(item?.id) !== String(entryId));
    if (nextEntries.length === entries.length) return;

    await replaceDiaryEntriesInStorage(nextEntries);
    saveToLocalStorage();
    updateDiaryEntries();
}

function renderFinanceBudgets() {
    const list = document.getElementById('finance-budget-list');
    if (!list) return;

    const monthKey = document.getElementById('finance-month')?.value === 'all'
        ? getLocalDateString().slice(0, 7)
        : (document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7));

    const monthExpenses = appData.financeEntries
        .filter(e => e.type === 'expense' && getMonthKey(e.date) === monthKey);

    const budgets = appData.financeBudgets.filter(b => b.month === monthKey);
    list.innerHTML = '';

    if (budgets.length === 0) {
        list.innerHTML = '<p class="empty-message">Nenhum orçamento cadastrado para este mês.</p>';
        return;
    }

    budgets.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));
    budgets.forEach(budget => {
        const spent = monthExpenses
            .filter(e => (e.category || '').trim().toLowerCase() === budget.category.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);
        const percent = budget.limit > 0 ? Math.min(200, (spent / budget.limit) * 100) : 0;
        const remaining = budget.limit - spent;
        const statusClass = percent >= 100 ? 'danger' : percent >= 80 ? 'warn' : 'ok';

        const item = document.createElement('div');
        item.className = `finance-budget-item ${statusClass}`;
        const safeCategory = escapeHtml(budget.category);
        item.innerHTML = `
            <div class="finance-budget-top">
                <div class="finance-budget-title">${safeCategory}</div>
                <button class="finance-delete-btn" data-id="${budget.id}" data-kind="budget">Excluir</button>
            </div>
            <div class="finance-budget-meta">
                <span>Usado: ${spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span>Limite: ${budget.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span>${remaining >= 0 ? 'Restante' : 'Excedido'}: ${Math.abs(remaining).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div class="finance-budget-bar">
                <div class="finance-budget-fill ${statusClass}" style="width: ${Math.min(100, percent)}%"></div>
            </div>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('button[data-kind="budget"]').forEach(btn => {
        btn.addEventListener('click', () => deleteFinanceBudget(parseInt(btn.getAttribute('data-id'), 10)));
    });
}

function renderFinanceRecurringList() {
    const list = document.getElementById('finance-recurring-list');
    if (!list) return;

    const entries = appData.financeRecurring || [];
    list.innerHTML = '';

    if (entries.length === 0) {
        list.innerHTML = '<p class="empty-message">Nenhum lançamento recorrente cadastrado.</p>';
        return;
    }

    entries
        .slice()
        .sort((a, b) => (a.dayOfMonth || 1) - (b.dayOfMonth || 1))
        .forEach(rec => {
            const item = document.createElement('div');
            item.className = `finance-item ${rec.type}`;
            const safeCategory = rec.category ? escapeHtml(rec.category) : '';
            const safeDescription = rec.description ? escapeHtml(rec.description) : '';
            const meta = `Todo dia ${rec.dayOfMonth} • Início: ${formatDate(rec.startDate)}${rec.endDate ? ` • Fim: ${formatDate(rec.endDate)}` : ''}${safeCategory ? ` • ${safeCategory}` : ''}${safeDescription ? ` • ${safeDescription}` : ''}`;
            item.innerHTML = `
                <div>
                    <div class="finance-item-title">${rec.type === 'income' ? 'Recorrente: Receita' : 'Recorrente: Despesa'}</div>
                    <div class="finance-item-meta">${meta}</div>
                </div>
                <div class="finance-item-actions">
                    <div class="finance-item-value">${Number(rec.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <button class="finance-delete-btn" data-id="${rec.id}" data-kind="recurring">Excluir</button>
                </div>
            `;
            list.appendChild(item);
        });

    list.querySelectorAll('button[data-kind="recurring"]').forEach(btn => {
        btn.addEventListener('click', () => deleteFinanceRecurring(parseInt(btn.getAttribute('data-id'), 10)));
    });
}

function renderFinanceList() {
    const list = document.getElementById('finance-list');
    if (!list) return;
    
    const entries = getFinanceFilteredEntries().sort((a, b) => parseLocalDateString(b.date) - parseLocalDateString(a.date));
    list.innerHTML = '';
    
    if (entries.length === 0) {
        list.innerHTML = '<p class="empty-message">Nenhum lançamento para os filtros selecionados.</p>';
        return;
    }
    
    const formatBRL = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    entries.forEach(entry => {
        const item = document.createElement('div');
        item.className = `finance-item ${entry.type}`;
        const dateLabel = formatDate(entry.date);
        const catLabel = entry.category ? ` • ${escapeHtml(entry.category)}` : '';
        const descLabel = entry.description ? ` • ${escapeHtml(entry.description)}` : '';
        const recurringLabel = entry.recurringId ? ' • Recorrente' : '';
        item.innerHTML = `
            <div>
                <div class="finance-item-title">${entry.type === 'income' ? 'Receita' : 'Despesa'}</div>
                <div class="finance-item-meta">${dateLabel}${catLabel}${descLabel}${recurringLabel}</div>
            </div>
            <div class="finance-item-actions">
                <div class="finance-item-value">${formatBRL(entry.amount)}</div>
                <button class="finance-delete-btn" data-id="${entry.id}">Excluir</button>
            </div>
        `;
        list.appendChild(item);
    });
    
    list.querySelectorAll('.finance-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            deleteFinanceEntry(id);
        });
    });
}

function getFinanceFilteredEntries() {
    const monthFilter = document.getElementById('finance-month')?.value || 'all';
    const typeFilter = document.getElementById('finance-filter-type')?.value || 'all';
    const categoryFilter = (document.getElementById('finance-filter-category')?.value || '').trim().toLowerCase();
    
    return appData.financeEntries.filter(entry => {
        if (monthFilter !== 'all' && getMonthKey(entry.date) !== monthFilter) return false;
        if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
        if (categoryFilter) {
            const cat = (entry.category || '').toLowerCase();
            if (!cat.includes(categoryFilter)) return false;
        }
        return true;
    });
}

function getPreviousMonthKey(monthKey) {
    const [year, month] = monthKey.split('-').map(v => parseInt(v, 10));
    const prev = new Date(year, month - 2, 1);
    return getLocalDateString(prev).slice(0, 7);
}

function getMonthDayData(monthKey) {
    const [year, month] = monthKey.split('-').map(v => parseInt(v, 10));
    const now = new Date();
    const currentMonthKey = getLocalDateString().slice(0, 7);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPeriod = monthKey === currentMonthKey
        ? Math.min(daysInMonth, now.getDate())
        : daysInMonth;
    return { daysInMonth, daysInPeriod };
}

function calculatePercentChange(current, previous) {
    if (!Number.isFinite(previous) || previous === 0) {
        if (!Number.isFinite(current) || current === 0) return 0;
        return current > 0 ? 100 : -100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
}

function getRecurringSkipKey(recurringId, monthKey) {
    return `${String(recurringId)}|${monthKey}`;
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setFinanceDelta(elementId, changeValue, inverseGood) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const formatted = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(1).replace('.', ',')}%`;
    element.textContent = `vs mês anterior: ${formatted}`;
    element.className = 'finance-delta';
    if (Math.abs(changeValue) < 0.05) {
        element.classList.add('neutral');
        return;
    }
    const isPositive = changeValue > 0;
    const isGood = inverseGood ? !isPositive : isPositive;
    element.classList.add(isGood ? 'positive' : 'negative');
}

function updateFinanceKpiContext(monthKey) {
    const noteEl = document.getElementById('finance-kpi-note');
    if (!noteEl) return;
    if (!monthKey || monthKey.length !== 7) {
        noteEl.textContent = 'KPIs do topo consideram apenas o mês selecionado (ignoram filtros de tipo e categoria).';
        return;
    }
    const [year, month] = monthKey.split('-');
    noteEl.textContent = `KPIs do topo consideram ${month}/${year} (ignoram filtros de tipo e categoria).`;
}

function populateFinanceMonthOptions() {
    const select = document.getElementById('finance-month');
    if (!select) return;
    
    const current = getLocalDateString().slice(0, 7);
    const months = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = getLocalDateString(d).slice(0, 7);
        months.push(key);
    }
    
    select.innerHTML = '<option value="all">Todos</option>' + 
        months.map(m => `<option value="${m}">${m}</option>`).join('');
    select.value = current;
}

function updateFinanceCharts() {
    if (typeof Chart === 'undefined') return;
    
    const entries = getFinanceFilteredEntries();
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    
    const pieCtx = document.getElementById('finance-pie-chart');
    if (pieCtx) {
        if (pieCtx.chart) pieCtx.chart.destroy();
        pieCtx.chart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Receitas', 'Despesas'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['rgba(124, 255, 178, 0.7)', 'rgba(255, 77, 141, 0.7)'],
                    borderColor: ['rgba(124, 255, 178, 1)', 'rgba(255, 77, 141, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#C9D1E7'
                        }
                    }
                }
            }
        });
    }
    
    const balanceCtx = document.getElementById('finance-balance-chart');
    if (balanceCtx) {
        if (balanceCtx.chart) balanceCtx.chart.destroy();
        
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(getLocalDateString(d).slice(0, 7));
        }
        
        const balances = months.map(monthKey => {
            const monthEntries = appData.financeEntries.filter(e => getMonthKey(e.date) === monthKey);
            const inc = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
            const exp = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
            return inc - exp;
        });
        
        balanceCtx.chart = new Chart(balanceCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Saldo',
                    data: balances,
                    backgroundColor: 'rgba(0, 229, 255, 0.35)',
                    borderColor: 'rgba(0, 229, 255, 0.9)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#C9D1E7' },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    },
                    x: {
                        ticks: { color: '#C9D1E7' },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#C9D1E7'
                        }
                    }
                }
            }
        });
    }

    const categoryCtx = document.getElementById('finance-category-chart');
    if (categoryCtx) {
        if (categoryCtx.chart) categoryCtx.chart.destroy();
        
        const incomeByCategory = {};
        const expenseByCategory = {};
        entries.forEach(e => {
            const key = (e.category || 'Sem categoria').trim() || 'Sem categoria';
            if (e.type === 'income') {
                if (!incomeByCategory[key]) incomeByCategory[key] = 0;
                incomeByCategory[key] += e.amount;
            } else {
                if (!expenseByCategory[key]) expenseByCategory[key] = 0;
                expenseByCategory[key] += e.amount;
            }
        });
        
        const categoryLabels = Array.from(new Set([
            ...Object.keys(incomeByCategory),
            ...Object.keys(expenseByCategory)
        ])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const incomeData = categoryLabels.map(k => incomeByCategory[k] || 0);
        const expenseData = categoryLabels.map(k => expenseByCategory[k] || 0);
        
        categoryCtx.chart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categoryLabels,
                datasets: [
                    {
                        label: 'Receitas por Categoria',
                        data: incomeData,
                        backgroundColor: 'rgba(124, 255, 178, 0.35)',
                        borderColor: 'rgba(124, 255, 178, 0.9)',
                        borderWidth: 1
                    },
                    {
                        label: 'Despesas por Categoria',
                        data: expenseData,
                        backgroundColor: 'rgba(255, 77, 141, 0.35)',
                        borderColor: 'rgba(255, 77, 141, 0.9)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#C9D1E7' },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    },
                    x: {
                        ticks: { color: '#C9D1E7' },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#C9D1E7'
                        }
                    }
                }
            }
        });
    }
}

function deleteFinanceEntry(entryId) {
    if (!confirm('Deseja excluir este lançamento?')) return;
    const index = appData.financeEntries.findIndex(e => e.id === entryId);
    if (index === -1) return;
    const entry = appData.financeEntries[index];
    if (entry && entry.recurringId && entry.recurringMonth) {
        const skipKey = getRecurringSkipKey(entry.recurringId, entry.recurringMonth);
        if (!appData.financeRecurringSkips.includes(skipKey)) {
            appData.financeRecurringSkips.push(skipKey);
        }
    }
    appData.financeEntries.splice(index, 1);
    updateUI({ mode: 'finance' });
}

function handleFinanceBudgetSubmit(e) {
    e.preventDefault();
    const month = document.getElementById('finance-budget-month')?.value || getLocalDateString().slice(0, 7);
    const category = (document.getElementById('finance-budget-category')?.value || '').trim();
    const limit = parseFloat(document.getElementById('finance-budget-limit')?.value || '0');

    if (!month || !category || !Number.isFinite(limit) || limit <= 0) {
        alert('Preencha mês, categoria e limite válido.');
        return;
    }

    const existing = appData.financeBudgets.find(b =>
        b.month === month && b.category.toLowerCase() === category.toLowerCase()
    );

    if (existing) {
        existing.limit = limit;
    } else {
        appData.financeBudgets.push({
            id: createUniqueId(appData.financeBudgets),
            month,
            category,
            limit
        });
    }

    e.target.reset();
    const monthInput = document.getElementById('finance-budget-month');
    if (monthInput) monthInput.value = document.getElementById('finance-month')?.value !== 'all'
        ? document.getElementById('finance-month')?.value
        : getLocalDateString().slice(0, 7);
    updateUI({ mode: 'finance' });
}

function deleteFinanceBudget(budgetId) {
    if (!confirm('Deseja excluir este orçamento?')) return;
    const idx = appData.financeBudgets.findIndex(b => b.id === budgetId);
    if (idx === -1) return;
    appData.financeBudgets.splice(idx, 1);
    updateUI({ mode: 'finance' });
}

function handleFinanceRecurringSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('finance-recurring-type')?.value || 'expense';
    const amount = parseFloat(document.getElementById('finance-recurring-amount')?.value || '0');
    const category = (document.getElementById('finance-recurring-category')?.value || '').trim();
    const description = (document.getElementById('finance-recurring-desc')?.value || '').trim();
    const dayOfMonth = parseInt(document.getElementById('finance-recurring-day')?.value || '1', 10);
    const startDate = document.getElementById('finance-recurring-start')?.value || getLocalDateString();
    const endDate = document.getElementById('finance-recurring-end')?.value || '';

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        alert('Preencha valor e dia do mês válidos.');
        return;
    }
    if (endDate && endDate < startDate) {
        alert('A data final não pode ser anterior à data inicial.');
        return;
    }

    appData.financeRecurring.push({
        id: createUniqueId(appData.financeRecurring),
        type: type === 'income' ? 'income' : 'expense',
        amount,
        category,
        description,
        dayOfMonth,
        startDate,
        endDate,
        active: true
    });

    e.target.reset();
    const startInput = document.getElementById('finance-recurring-start');
    if (startInput) startInput.value = getLocalDateString();
    updateUI({ mode: 'finance' });
}

function deleteFinanceRecurring(recurringId) {
    if (!confirm('Deseja excluir este lançamento recorrente?')) return;
    const idx = appData.financeRecurring.findIndex(r => r.id === recurringId);
    if (idx === -1) return;
    appData.financeRecurring.splice(idx, 1);
    appData.financeRecurringSkips = (appData.financeRecurringSkips || [])
        .filter(key => !key.startsWith(`${String(recurringId)}|`));
    updateUI({ mode: 'finance' });
}

// Atualizar treinos do dia
function updateDailyWorkouts() {
    const container = document.getElementById('daily-workouts');
    if (!container) return;
    
    container.innerHTML = '';
    
    const today = getLocalDateString();
    const dailyWorkoutsSource = Array.isArray(appData.dailyWorkouts) ? appData.dailyWorkouts : [];
    const workoutsSource = Array.isArray(appData.workouts) ? appData.workouts : [];
    const dailyWorkouts = dailyWorkoutsSource.filter(dw => dw && dw.date === today && !dw.completed && !dw.skipped);
    const sameId = (a, b) => String(a) === String(b);
    
    if (dailyWorkouts.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum treino para hoje. Aproveite o descanso!</p>';
        return;
    }
    
    let renderedCount = 0;
    dailyWorkouts.forEach(workoutDay => {
        const workout = workoutsSource.find(w => sameId(w?.id, workoutDay.workoutId));
        if (!workout) return;
        renderedCount++;
        
        const workoutCard = document.createElement('div');
        workoutCard.className = 'workout-card';
        
        let inputFields = '';
        if (workout.type === 'repeticao') {
            inputFields = `
                <div class="series-inputs">
                    <h4>Séries:</h4>
                    ${[1, 2, 3].map(i => `
                        <div class="series-input">
                            <label>Série ${i}:</label>
                            <input type="number" min="0" class="series-input-field" data-series="${i}" 
                                   value="${workoutDay.series[i-1] || ''}" placeholder="Repetições">
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (workout.type === 'distancia') {
            inputFields = `
                <div class="distance-input">
                    <label>Distância (km):</label>
                    <input type="number" min="0" step="0.1" class="distance-input-field" 
                           value="${workoutDay.distance || ''}">
                </div>
            `;
        } else if (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') {
            inputFields = `
                <div class="time-input">
                    <label>Tempo (minutos):</label>
                    <input type="number" min="0" step="0.1" class="time-input-field" 
                           value="${workoutDay.time || ''}">
                </div>
            `;
        }
        
        workoutCard.innerHTML = `
            <div class="workout-header">
                <div class="workout-name">
                    <span class="workout-emoji">${workout.emoji}</span>
                    <span>${workout.name}</span>
                </div>
                <span class="workout-type ${workout.type}">${getWorkoutTypeName(workout.type)}</span>
            </div>
            <div class="workout-details">
                ${inputFields}
            </div>
            <div class="workout-actions">
                <button class="complete-workout-btn" data-id="${workoutDay.id}">
                    <i class="fas fa-check"></i> Concluir Treino
                </button>
                <button class="skip-btn skip-workout-btn" data-id="${workoutDay.id}">
                    <i class="fas fa-forward"></i> Pular (-${SKIP_ACTIVITY_COST})
                </button>
            </div>
        `;
        
        container.appendChild(workoutCard);
    });

    if (renderedCount === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum treino para hoje. Aproveite o descanso!</p>';
    }
}

function createUniqueId(list) {
    const existingIds = new Set((Array.isArray(list) ? list : []).map(item => String(item?.id)));
    let candidate = Date.now();
    while (existingIds.has(String(candidate))) {
        candidate += 1;
    }
    return candidate;
}

function getCheckedDays(selector) {
    const dayCheckboxes = document.querySelectorAll(selector);
    return Array.from(dayCheckboxes).map(cb => parseInt(cb.value, 10));
}

function createWorkoutPayload(name, emoji, type, days) {
    return {
        id: createUniqueId(appData.workouts),
        name,
        emoji: emoji || '💪',
        type,
        days: days.length > 0 ? days : [1, 2, 3, 4, 5],
        xp: 0,
        level: 0,
        stats: {
            totalReps: 0,
            bestReps: 0,
            totalDistance: 0,
            bestDistance: 0,
            totalTime: 0,
            bestTime: 0,
            completed: 0
        }
    };
}

function createStudyPayload(name, emoji, type, days) {
    return {
        id: createUniqueId(appData.studies),
        name,
        emoji: emoji || '📚',
        type,
        days: days.length > 0 ? days : [1, 2, 3, 4, 5],
        xp: 0,
        level: 0,
        stats: {
            completed: 0,
            applied: 0
        }
    };
}

// Atualizar estudos do dia
function updateDailyStudies() {
    const container = document.getElementById('daily-studies');
    if (!container) return;
    
    container.innerHTML = '';
    
    const today = getLocalDateString();
    const dailyStudiesSource = Array.isArray(appData.dailyStudies) ? appData.dailyStudies : [];
    const studiesSource = Array.isArray(appData.studies) ? appData.studies : [];
    const dailyStudies = dailyStudiesSource.filter(ds => ds && ds.date === today && !ds.completed && !ds.skipped);
    const sameId = (a, b) => String(a) === String(b);
    
    if (dailyStudies.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum estudo para hoje.</p>';
        return;
    }
    
    let renderedCount = 0;
    dailyStudies.forEach(studyDay => {
        const study = studiesSource.find(s => sameId(s?.id, studyDay.studyId));
        if (!study) return;
        renderedCount++;
        
        const studyCard = document.createElement('div');
        studyCard.className = 'study-card';
        
        studyCard.innerHTML = `
            <div class="study-header">
                <div class="study-name">
                    <span class="study-emoji">${study.emoji}</span>
                    <span>${study.name}</span>
                </div>
                <span class="study-type ${study.type}">${study.type === 'logico' ? 'Lógico' : 'Criativo'}</span>
            </div>
            <div class="study-details">
                <label class="applied-checkbox">
                    <input type="checkbox" class="apply-study-checkbox" data-id="${studyDay.id}" 
                           ${studyDay.applied ? 'checked' : ''}>
                    Aplicado (conhecimento usado na prática)
                </label>
            </div>
            <div class="study-actions">
                <button class="complete-study-btn" data-id="${studyDay.id}">
                    <i class="fas fa-check"></i> Concluir Estudo
                </button>
                <button class="skip-btn skip-study-btn" data-id="${studyDay.id}">
                    <i class="fas fa-forward"></i> Pular (-${SKIP_ACTIVITY_COST})
                </button>
            </div>
        `;
        
        container.appendChild(studyCard);
    });

    if (renderedCount === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum estudo para hoje.</p>';
    }
}

// Renderizar calendário de missões (diárias, semanais, eventuais e épicas)
function renderMissionsCalendar() {
    const grid = document.getElementById('cal-missions-grid');
    const title = document.getElementById('cal-month-title');
    if (!grid || !title) return;
    
    const month = calendarState.month;
    const year = calendarState.year;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const monthName = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    title.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
    const startWeekday = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    grid.innerHTML = '';
    
    // Dias do mês anterior para preencher a primeira semana
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
        const dayNumber = prevLastDay - i;
        const cell = createCalendarCell(year, month - 1, dayNumber, true);
        grid.appendChild(cell);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= totalDays; day++) {
        const cell = createCalendarCell(year, month, day, false);
        grid.appendChild(cell);
    }
    
    // Dias do próximo mês para completar a última semana
    const endWeekday = lastDay.getDay();
    const remaining = 6 - endWeekday;
    for (let i = 1; i <= remaining; i++) {
        const cell = createCalendarCell(year, month + 1, i, true);
        grid.appendChild(cell);
    }

    // Priorizar a data selecionada, se estiver no mês atual
    if (calendarState.selectedDate) {
        const selectedCell = grid.querySelector(`[data-date="${calendarState.selectedDate}"]`);
        if (selectedCell) {
            setCalendarSelection(selectedCell);
            return;
        }
    }
    
    // Selecionar automaticamente o dia de hoje, se estiver no mês atual
    const today = new Date();
    if (today.getMonth() === month && today.getFullYear() === year) {
        const todayCell = grid.querySelector(`[data-date="${getLocalDateString(today)}"]`);
        if (todayCell) {
            setCalendarSelection(todayCell);
            return;
        }
    }
    
    calendarState.selectedDate = null;
    resetCalendarDetails();
}

function hasFailedActivities(dateStr) {
    const failedMissions = appData.completedMissions.some(m => (m.failedDate === dateStr || m.date === dateStr) && m.failed);
    const failedWorks = appData.completedWorks.some(w => (w.failedDate === dateStr || w.date === dateStr) && w.failed);
    const failedWorkouts = appData.completedWorkouts.some(w => (w.failedDate === dateStr || w.date === dateStr) && w.failed);
    const failedStudies = appData.completedStudies.some(s => (s.failedDate === dateStr || s.date === dateStr) && s.failed);
    return failedMissions || failedWorks || failedWorkouts || failedStudies;
}

function hasCompletedActivities(dateStr) {
    const completedMissions = appData.completedMissions.some(m => m.completedDate === dateStr && !m.failed);
    const completedWorks = appData.completedWorks.some(w => w.completedDate === dateStr && !w.failed);
    const completedWorkouts = appData.completedWorkouts.some(w => w.completedDate === dateStr && !w.failed);
    const completedStudies = appData.completedStudies.some(s => s.completedDate === dateStr && !s.failed);
    return completedMissions || completedWorks || completedWorkouts || completedStudies;
}

function createCalendarCell(year, monthIndex, dayNumber, isOtherMonth) {
    const date = new Date(year, monthIndex, dayNumber);
    const dateStr = getLocalDateString(date);
    const todayStr = getLocalDateString();
    
    const cell = document.createElement('div');
    cell.className = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${dateStr === todayStr ? 'today' : ''}`.trim();
    cell.dataset.date = dateStr;

    if (hasCompletedActivities(dateStr) && !hasFailedActivities(dateStr)) cell.classList.add('streak-day');
    if (hasFailedActivities(dateStr)) cell.classList.add('failure-day');
    if (appData.statistics?.deathDates?.includes(dateStr)) cell.classList.add('death-day');
    
    const markers = getCalendarMarkersForDate(date);
    const markersHtml = markers.map(type => `<span class="marker ${type}"></span>`).join('');
    
    cell.innerHTML = `
        <div class="calendar-day-number">${dayNumber}</div>
        <div class="calendar-markers">${markersHtml}</div>
    `;
    
    cell.addEventListener('click', () => {
        setCalendarSelection(cell);
    });
    
    return cell;
}

function setCalendarSelection(cell) {
    const grid = document.getElementById('cal-missions-grid');
    if (!grid) return;
    grid.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    cell.classList.add('selected');
    const dateStr = cell.dataset.date;
    if (dateStr) {
        calendarState.selectedDate = dateStr;
        renderCalendarDetails(dateStr);
    }
}

  function ensureCalendarDetailsFilterOptions() {
      const detailsFilter = document.getElementById('cal-details-filter');
      if (!detailsFilter) return;
  
      const currentValue = calendarState.detailsFilter || 'all';
      const baseOptions = [
          { value: 'all', label: 'Todos' },
          { value: 'daily', label: 'Missões diárias' },
          { value: 'weekly', label: 'Missões semanais' },
          { value: 'eventual', label: 'Missões eventuais' },
          { value: 'epic', label: 'Missões épicas' },
          { value: 'workout', label: 'Treinos' },
          { value: 'study', label: 'Estudos' },
          { value: 'work', label: 'Trabalhos' }
      ];
  
      detailsFilter.innerHTML = '';
  
      baseOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          detailsFilter.appendChild(option);
      });
  
      if ([...detailsFilter.options].some(o => o.value === currentValue)) {
          detailsFilter.value = currentValue;
      } else {
          calendarState.detailsFilter = 'all';
          detailsFilter.value = 'all';
      }
  }
  
  function renderCalendarDetails(dateStr) {
      const detailsTitle = document.getElementById('cal-details-title');
      const detailsList = document.getElementById('cal-details-list');
      const restStatus = document.getElementById('cal-rest-status');
      const restToggle = document.getElementById('cal-rest-toggle');
      const detailsFilter = document.getElementById('cal-details-filter');
      if (!detailsTitle || !detailsList) return;
    
    const dateObj = parseLocalDateString(dateStr);
    detailsTitle.textContent = `Detalhes de ${dateObj.toLocaleDateString('pt-BR')}`;
    
    if (restStatus && restToggle) {
        const isRest = isRestDay(dateStr);
        restStatus.textContent = isRest ? 'Descanso planejado' : 'Dia normal';
        restStatus.classList.toggle('active', isRest);
        restToggle.textContent = isRest ? 'Remover descanso' : 'Marcar descanso';
    }

      if (detailsFilter) {
          ensureCalendarDetailsFilterOptions();
          detailsFilter.value = calendarState.detailsFilter || 'all';
      }
      
      const items = getCalendarItemsForDate(dateStr);
      const filterValue = (calendarState.detailsFilter || 'all');
      let filteredItems = items;
      if (filterValue !== 'all') {
          if (filterValue === 'work') {
        filteredItems = items.filter(item => item.kindClass === 'work-kind');
      } else {
        filteredItems = items.filter(item => item.typeClass === filterValue);
      }
      }
    detailsList.innerHTML = '';
    
    if (filteredItems.length === 0) {
        detailsList.innerHTML = '<p class="empty-message">Nenhuma atividade para este filtro.</p>';
        return;
    }
    
    filteredItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'calendar-details-item';
        
        const statusTag = item.status === 'failed' ? 'Falhou' : item.status === 'skipped' ? 'Pulada' : item.status === 'done' ? 'Concluida' : 'Pendente';
        const statusClass = item.status === 'failed' ? 'failed' : item.status === 'skipped' ? 'skipped' : item.status === 'done' ? 'done' : '';
        
        row.innerHTML = `
            <div class="calendar-details-title">
                <span>${item.emoji || '🎯'}</span>
                <span>${item.name}</span>
            </div>
            <div class="calendar-details-tags">
                <span class="calendar-tag kind ${item.kindClass}">${item.kindLabel}</span>
                <span class="calendar-tag ${item.typeClass}">${item.typeLabel}</span>
                <span class="calendar-tag ${statusClass}">${statusTag}</span>
            </div>
        `;
        
        detailsList.appendChild(row);
    });
}

function resetCalendarDetails() {
    const detailsTitle = document.getElementById('cal-details-title');
    const detailsList = document.getElementById('cal-details-list');
    const restStatus = document.getElementById('cal-rest-status');
    const restToggle = document.getElementById('cal-rest-toggle');
    const detailsFilter = document.getElementById('cal-details-filter');
    if (!detailsTitle || !detailsList) return;
    
    detailsTitle.textContent = 'Detalhes do dia';
    detailsList.innerHTML = '<p class="empty-message">Selecione um dia para ver as missões.</p>';
    
    if (restStatus && restToggle) {
        restStatus.textContent = 'Dia normal';
        restStatus.classList.remove('active');
        restToggle.textContent = 'Marcar descanso';
    }

    if (detailsFilter) {
        detailsFilter.value = calendarState.detailsFilter || 'all';
    }
}

function getCalendarItemsForDate(dateStr) {
    const items = [];
    const dateObj = parseLocalDateString(dateStr);
    const dayOfWeek = dateObj.getDay();
    
    // Missões ativas
    appData.missions.forEach(mission => {
        const typeInfo = getMissionTypeInfo(mission.type);
        if (!typeInfo) return;
        
        if (mission.type === 'diaria') {
            const availableFrom = mission.availableDate || mission.dateAdded || null;
            if (!availableFrom || availableFrom <= dateStr) {
                items.push({ ...typeInfo, ...mission, status: 'pending' });
            }
        }
        
        if (mission.type === 'semanal' && mission.days && mission.days.includes(dayOfWeek)) {
            items.push({ ...typeInfo, ...mission, status: 'pending' });
        }
        
        if (mission.type === 'eventual' && mission.date) {
            const missionDateStr = getLocalDateString(parseLocalDateString(mission.date));
            if (missionDateStr === dateStr) {
                items.push({ ...typeInfo, ...mission, status: 'pending' });
            }
        }
        
        if (mission.type === 'epica' && mission.deadline) {
            const deadlineStr = getLocalDateString(parseLocalDateString(mission.deadline));
            if (dateStr <= deadlineStr) {
                items.push({ ...typeInfo, ...mission, status: 'pending' });
            }
        }
    });
    
    // Missões concluídas/falhadas
    appData.completedMissions.forEach(mission => {
        const typeInfo = getMissionTypeInfo(mission.type);
        if (!typeInfo) return;
        const completedDate = mission.completedDate || mission.failedDate || mission.skippedDate;
        if (completedDate === dateStr) {
            items.push({
                ...typeInfo,
                ...mission,
                status: mission.failed ? 'failed' : mission.skipped ? 'skipped' : 'done'
            });
        }
    });

    // Trabalhos ativos
    appData.works.forEach(work => {
        const typeInfo = getWorkTypeInfo(work.type);
        if (!typeInfo) return;
        
        if (work.type === 'diaria') {
            const availableFrom = work.availableDate || work.dateAdded || null;
            if (!availableFrom || availableFrom <= dateStr) {
                items.push({ ...typeInfo, ...work, status: 'pending' });
            }
        }
        
        if (work.type === 'semanal' && work.days && work.days.includes(dayOfWeek)) {
            items.push({ ...typeInfo, ...work, status: 'pending' });
        }
        
        if (work.type === 'eventual' && work.date) {
            const workDateStr = getLocalDateString(parseLocalDateString(work.date));
            if (workDateStr === dateStr) {
                items.push({ ...typeInfo, ...work, status: 'pending' });
            }
        }
        
        if (work.type === 'epica' && work.deadline) {
            const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
            if (dateStr <= deadlineStr) {
                items.push({ ...typeInfo, ...work, status: 'pending' });
            }
        }
    });
    
    // Trabalhos concluídos/falhados
    appData.completedWorks.forEach(work => {
        const typeInfo = getWorkTypeInfo(work.type);
        if (!typeInfo) return;
        const completedDate = work.completedDate || work.failedDate || work.skippedDate;
        if (completedDate === dateStr) {
            items.push({
                ...typeInfo,
                ...work,
                status: work.failed ? 'failed' : work.skipped ? 'skipped' : 'done'
            });
        }
    });

    // Treinos do dia (agenda)
    appData.workouts.forEach(workout => {
        if (workout.days && workout.days.includes(dayOfWeek)) {
            items.push({
                kindLabel: 'Treino',
                kindClass: 'workout',
                typeLabel: getWorkoutTypeName(workout.type),
                typeClass: 'workout',
                status: 'pending',
                id: `workout-${workout.id}`,
                name: workout.name,
                emoji: workout.emoji
            });
        }
    });
    
    // Estudos do dia (agenda)
    appData.studies.forEach(study => {
        if (study.days && study.days.includes(dayOfWeek)) {
            items.push({
                kindLabel: 'Estudo',
                kindClass: 'study',
                typeLabel: study.type === 'logico' ? 'Lógico' : 'Criativo',
                typeClass: 'study',
                status: 'pending',
                id: `study-${study.id}`,
                name: study.name,
                emoji: study.emoji
            });
        }
    });
    
    // Treinos concluídos/falhados
    appData.completedWorkouts.forEach(entry => {
        if (entry.date === dateStr || entry.completedDate === dateStr || entry.failedDate === dateStr || entry.skippedDate === dateStr) {
            items.push({
                kindLabel: 'Treino',
                kindClass: 'workout',
                typeLabel: getWorkoutTypeName(entry.type),
                typeClass: 'workout',
                status: entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'done',
                id: `workout-${entry.workoutId}-${entry.date}`,
                name: entry.name,
                emoji: entry.emoji
            });
        }
    });
    
    // Estudos concluídos/falhados
    appData.completedStudies.forEach(entry => {
        if (entry.date === dateStr || entry.completedDate === dateStr || entry.failedDate === dateStr || entry.skippedDate === dateStr) {
            items.push({
                kindLabel: 'Estudo',
                kindClass: 'study',
                typeLabel: entry.type === 'logico' ? 'Lógico' : 'Criativo',
                typeClass: 'study',
                status: entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'done',
                id: `study-${entry.studyId}-${entry.date}`,
                name: entry.name,
                emoji: entry.emoji
            });
        }
    });
    
    // Remover pendentes quando há concluídas/falhadas no mesmo dia
    const doneKeys = new Set(
        items
            .filter(i => i.status !== 'pending')
            .map(i => `${i.kindLabel}-${i.name}-${dateStr}`)
    );
    
    const filtered = items.filter(i => {
        if (i.status !== 'pending') return true;
        return !doneKeys.has(`${i.kindLabel}-${i.name}-${dateStr}`);
    });
    
    // Remover duplicidade por id e status
    const byId = new Map();
    filtered.forEach(item => {
        const key = `${item.id}-${item.status}`;
        byId.set(key, item);
    });
    return Array.from(byId.values());
}

function getMissionTypeInfo(type) {
    switch(type) {
        case 'diaria':
            return { kindLabel: 'Missão', kindClass: 'kind', type: 'daily', typeLabel: 'Diária', typeClass: 'daily' };
        case 'semanal':
            return { kindLabel: 'Missão', kindClass: 'kind', type: 'weekly', typeLabel: 'Semanal', typeClass: 'weekly' };
        case 'eventual':
            return { kindLabel: 'Missão', kindClass: 'kind', type: 'eventual', typeLabel: 'Eventual', typeClass: 'eventual' };
        case 'epica':
            return { kindLabel: 'Missão', kindClass: 'kind', type: 'epic', typeLabel: 'Épica', typeClass: 'epic' };
        default:
            return null;
    }
}

function getWorkTypeInfo(type) {
    switch(type) {
        case 'diaria':
            return { kindLabel: 'Trabalho', kindClass: 'work-kind', type: 'daily', typeLabel: 'Diária', typeClass: 'daily' };
        case 'semanal':
            return { kindLabel: 'Trabalho', kindClass: 'work-kind', type: 'weekly', typeLabel: 'Semanal', typeClass: 'weekly' };
        case 'eventual':
            return { kindLabel: 'Trabalho', kindClass: 'work-kind', type: 'eventual', typeLabel: 'Eventual', typeClass: 'eventual' };
        case 'epica':
            return { kindLabel: 'Trabalho', kindClass: 'work-kind', type: 'epic', typeLabel: 'Épica', typeClass: 'epic' };
        default:
            return null;
    }
}

function getCalendarMarkersForDate(date) {
    const markers = new Set();
    const dateStr = getLocalDateString(date);
    const pendingItems = getCalendarItemsForDate(dateStr).filter(item => item.status === 'pending');

    if (pendingItems.some(item => item.kindClass === 'kind')) markers.add('mission');
    if (pendingItems.some(item => item.kindClass === 'work-kind')) markers.add('work');
    if (pendingItems.some(item => item.kindClass === 'workout')) markers.add('workout');
    if (pendingItems.some(item => item.kindClass === 'study')) markers.add('study');

    // Descanso planejado
    if (isRestDay(dateStr)) {
        markers.add('rest');
    }

    return Array.from(markers);
}

function isRestDay(dateStr) {
    return appData.restDays && appData.restDays.includes(dateStr);
}

function toggleRestDay(dateStr) {
    if (!appData.restDays) appData.restDays = [];
    const index = appData.restDays.indexOf(dateStr);
    if (index >= 0) {
        appData.restDays.splice(index, 1);
        addHeroLog('rest', 'Descanso removido', `Dia ${dateStr} voltou ao normal.`);
    } else {
        const monthKey = getMonthKey(dateStr);
        const monthCount = appData.restDays.filter(d => getMonthKey(d) === monthKey).length;
        if (monthCount >= REST_DAYS_PER_MONTH_LIMIT) {
            alert(`Limite de descanso do mês atingido (${REST_DAYS_PER_MONTH_LIMIT}).`);
            return;
        }
        appData.restDays.push(dateStr);
        addHeroLog('rest', 'Descanso planejado', `Dia ${dateStr} marcado como descanso.`);
    }
    updateUI({ mode: 'activity', forceCalendar: true });
}

function getMonthKey(dateStr) {
    // dateStr no formato YYYY-MM-DD
    return dateStr.slice(0, 7);
}

function parseLocalDateString(dateStr) {
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr !== 'string') return new Date(dateStr);
    const parts = dateStr.split('-').map(p => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return new Date(dateStr);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Atualizar histórico de treinos (concluídos e falhas)
function updateWorkoutHistory() {
    const completedContainer = document.getElementById('completed-workouts');
    if (!completedContainer) return;
    
    completedContainer.innerHTML = '';
    const allEntries = appData.completedWorkouts;
    
    if (allEntries.length === 0) {
        completedContainer.innerHTML = '<p class="empty-message">Nenhum histórico de treino ainda.</p>';
        return;
    }
    
    const recent = allEntries.slice(-30).reverse();
    const prevTotalsByEntryId = new Map();
    const lastTotalsByWorkoutId = new Map();
    const prevDistancesByEntryId = new Map();
    const lastDistancesByWorkoutId = new Map();
    allEntries.forEach(entry => {
        if (entry.failed || entry.skipped) return;
        if (entry.type === 'repeticao' && Array.isArray(entry.series)) {
            const totalReps = entry.series.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
            const prevTotal = lastTotalsByWorkoutId.get(entry.workoutId);
            if (prevTotal !== undefined) {
                prevTotalsByEntryId.set(entry.id, prevTotal);
            }
            lastTotalsByWorkoutId.set(entry.workoutId, totalReps);
        }
        if (entry.type === 'distancia' && entry.distance !== null && entry.distance !== undefined) {
            const distance = Number(entry.distance);
            if (Number.isFinite(distance)) {
                const prevDistance = lastDistancesByWorkoutId.get(entry.workoutId);
                if (prevDistance !== undefined) {
                    prevDistancesByEntryId.set(entry.id, prevDistance);
                }
                lastDistancesByWorkoutId.set(entry.workoutId, distance);
            }
        }
    });
    recent.forEach(entry => {
        const card = document.createElement('div');
        card.className = `history-card ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : ''}`.trim();
        
        const details = [];
        if (entry.failed) {
            details.push(`<p>Falhou em: ${formatDate(entry.failedDate || entry.date)}</p>`);
        } else if (entry.skipped) {
            details.push(`<p>Pulado em: ${formatDate(entry.skippedDate || entry.date)}</p>`);
        } else {
            details.push(`<p>Concluido em: ${formatDate(entry.completedDate || entry.date)}</p>`);
        }
        details.push(`<p>Tipo: ${getWorkoutTypeName(entry.type)}</p>`);
        
        if (!entry.failed && !entry.skipped && entry.type === 'repeticao' && Array.isArray(entry.series)) {
            const totalReps = entry.series.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
            const prevTotal = prevTotalsByEntryId.get(entry.id);
            let trend = '';
            if (prevTotal !== undefined) {
                if (totalReps > prevTotal) trend = ' <span class="trend-up">&uarr;</span>';
                else if (totalReps < prevTotal) trend = ' <span class="trend-down">&darr;</span>';
            }
            details.push(`<p>Séries: ${entry.series.map(v => v || 0).join(' / ')} (Total: ${totalReps})${trend}</p>`);
        }
        if (!entry.failed && !entry.skipped && entry.type === 'distancia' && entry.distance !== null && entry.distance !== undefined) {
            const distance = Number(entry.distance);
            let trend = '';
            const prevDistance = prevDistancesByEntryId.get(entry.id);
            if (prevDistance !== undefined && Number.isFinite(distance)) {
                if (distance > prevDistance) trend = ' <span class="trend-up">&uarr;</span>';
                else if (distance < prevDistance) trend = ' <span class="trend-down">&darr;</span>';
            }
            details.push(`<p>Distância: ${entry.distance} km${trend}</p>`);
        }
        if (!entry.failed && !entry.skipped && (entry.type === 'maior-tempo' || entry.type === 'menor-tempo') && entry.time !== null && entry.time !== undefined) {
            details.push(`<p>Tempo: ${entry.time} min</p>`);
        }
        if (entry.reason) {
            details.push(`<p class="mission-reason">Motivo: ${entry.reason}</p>`);
        }
        if (entry.feedback) {
            details.push(`<p>Feedback: ${entry.feedback}</p>`);
        }
        
        card.innerHTML = `
            <div class="history-header">
                <div class="history-title">
                    <span class="history-emoji">${entry.emoji || '💪'}</span>
                    <span>${entry.name}</span>
                </div>
                <span class="history-status ${entry.failed ? 'failed-status' : entry.skipped ? 'skipped-status' : 'completed-status'}">
                    ${entry.failed ? 'FALHOU' : entry.skipped ? 'PULADO' : 'CONCLUIDO'}
                </span>
            </div>
            <div class="history-details">
                ${details.join('')}
            </div>
        `;
        
        completedContainer.appendChild(card);
    });
}

// Atualizar histórico de estudos (concluídos e falhas)
function updateStudyHistory() {
    const completedContainer = document.getElementById('completed-studies');
    if (!completedContainer) return;
    
    completedContainer.innerHTML = '';
    const allEntries = appData.completedStudies;
    
    if (allEntries.length === 0) {
        completedContainer.innerHTML = '<p class="empty-message">Nenhum histórico de estudo ainda.</p>';
        return;
    }
    
    const recent = allEntries.slice(-30).reverse();
    recent.forEach(entry => {
        const card = document.createElement('div');
        card.className = `history-card ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : ''}`.trim();
        
        const details = [];
        if (entry.failed) {
            details.push(`<p>Falhou em: ${formatDate(entry.failedDate || entry.date)}</p>`);
        } else if (entry.skipped) {
            details.push(`<p>Pulado em: ${formatDate(entry.skippedDate || entry.date)}</p>`);
        } else {
            details.push(`<p>Concluido em: ${formatDate(entry.completedDate || entry.date)}</p>`);
        }
        details.push(`<p>Tipo: ${entry.type === 'logico' ? 'Lógico' : 'Criativo'}</p>`);
        if (!entry.failed && !entry.skipped) {
            details.push(`<p>Aplicado: ${entry.applied ? 'Sim' : 'Não'}</p>`);
        }
        if (entry.reason) {
            details.push(`<p class="mission-reason">Motivo: ${entry.reason}</p>`);
        }
        if (entry.feedback) {
            details.push(`<p>Feedback: ${entry.feedback}</p>`);
        }
        
        card.innerHTML = `
            <div class="history-header">
                <div class="history-title">
                    <span class="history-emoji">${entry.emoji || '📚'}</span>
                    <span>${entry.name}</span>
                </div>
                <span class="history-status ${entry.failed ? 'failed-status' : entry.skipped ? 'skipped-status' : 'completed-status'}">
                    ${entry.failed ? 'FALHOU' : entry.skipped ? 'PULADO' : 'CONCLUIDO'}
                </span>
            </div>
            <div class="history-details">
                ${details.join('')}
            </div>
        `;
        
        completedContainer.appendChild(card);
    });
}

// Inicializar seletores de atributos
function initAttributesSelectors() {
    // Seletor para missões
    const missionAttributesContainer = document.getElementById('mission-attributes');
    if (missionAttributesContainer) {
        missionAttributesContainer.innerHTML = '';
        
        appData.attributes.forEach(attr => {
            const checkbox = document.createElement('div');
            checkbox.className = 'attribute-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="mission-attr-${attr.id}" value="${attr.id}">
                <label for="mission-attr-${attr.id}">${attr.emoji} ${attr.name}</label>
            `;
            missionAttributesContainer.appendChild(checkbox);
        });
    }

    const workAttributesContainer = document.getElementById('work-attributes');
    if (workAttributesContainer) {
        workAttributesContainer.innerHTML = '';
        appData.attributes.forEach(attr => {
            const checkbox = document.createElement('div');
            checkbox.className = 'attribute-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="work-attr-${attr.id}" value="${attr.id}">
                <label for="work-attr-${attr.id}">${attr.emoji} ${attr.name}</label>
            `;
            workAttributesContainer.appendChild(checkbox);
        });
    }
    
    // Seletor para diário
    const diaryAttributesContainer = document.getElementById('diary-attributes');
    if (diaryAttributesContainer) {
        diaryAttributesContainer.innerHTML = '';
        
        appData.attributes.forEach(attr => {
            const checkbox = document.createElement('div');
            checkbox.className = 'attribute-checkbox';
            checkbox.innerHTML = `
                <input type="checkbox" id="diary-attr-${attr.id}" value="${attr.id}" name="diary-attributes">
                <label for="diary-attr-${attr.id}">${attr.emoji} ${attr.name}</label>
            `;
            diaryAttributesContainer.appendChild(checkbox);
        });
    }
}

function initClassSelectors() {
    updateWorkClassOptions();
}

function isTabActive(tabId) {
    return document.getElementById(tabId)?.classList.contains('active') === true;
}

// Trocar entre abas principais
function switchTab(tabName) {
    // Remover a classe active de todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Adicionar a classe active à aba selecionada
    document.getElementById(tabName)?.classList.add('active');
    
    document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Atualizar a interface específica da aba
    if (tabName === 'estatisticas') {
        updateCharts();
    } else if (tabName === 'calendarios') {
        renderMissionsCalendar();
    }
}

// Trocar entre abas secundárias
function switchSubTab(subTabName, parentElement) {
    // Encontrar o container de conteúdo
    const subContent = parentElement.querySelector('.sub-content');
    if (!subContent) return;
    
    // Remover a classe active de todas as sub-abas
    subContent.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    parentElement.querySelectorAll('.sub-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adicionar a classe active à sub-aba selecionada
    subContent.querySelector(`#${subTabName}`)?.classList.add('active');
    
    // Ativar o botão correspondente
    parentElement.querySelector(`.sub-nav-btn[data-subtab="${subTabName}"]`)?.classList.add('active');
    if (subTabName === 'graficos') {
        updateCharts();
    }
}

// Mostrar modal para adicionar item
function showItemModal(itemType) {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    
    if (!modal || !modalTitle || !form) return;
    
    // Limpar o formulário
    form.innerHTML = '';
    
    // Configurar título e formulário baseado no tipo de item
    let formHTML = '';
    
    switch(itemType) {
        case 'treino':
            modalTitle.textContent = 'Adicionar Novo Treino';
            formHTML = `
                <div class="form-group">
                    <label for="modal-item-name">Nome do Treino</label>
                    <input type="text" id="modal-item-name" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="💪">
                </div>
                <div class="form-group">
                    <label for="modal-item-type">Tipo de Treino</label>
                    <select id="modal-item-type" required>
                        <option value="repeticao">Repetição</option>
                        <option value="distancia">Distância</option>
                        <option value="maior-tempo">Maior Tempo</option>
                        <option value="menor-tempo">Menor Tempo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dias da Semana</label>
                    <div class="days-selector">
                        <label class="day-checkbox"><input type="checkbox" value="0"> Dom</label>
                        <label class="day-checkbox"><input type="checkbox" value="1"> Seg</label>
                        <label class="day-checkbox"><input type="checkbox" value="2"> Ter</label>
                        <label class="day-checkbox"><input type="checkbox" value="3"> Qua</label>
                        <label class="day-checkbox"><input type="checkbox" value="4"> Qui</label>
                        <label class="day-checkbox"><input type="checkbox" value="5"> Sex</label>
                        <label class="day-checkbox"><input type="checkbox" value="6"> Sáb</label>
                    </div>
                </div>
                <input type="hidden" id="modal-item-category" value="workout">
            `;
            break;
            
        case 'estudo':
            modalTitle.textContent = 'Adicionar Novo Estudo';
            formHTML = `
                <div class="form-group">
                    <label for="modal-item-name">Nome do Estudo</label>
                    <input type="text" id="modal-item-name" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="📚">
                </div>
                <div class="form-group">
                    <label for="modal-item-type">Tipo de Estudo</label>
                    <select id="modal-item-type" required>
                        <option value="logico">Lógico</option>
                        <option value="criativo">Criativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dias da Semana</label>
                    <div class="days-selector">
                        <label class="day-checkbox"><input type="checkbox" value="0"> Dom</label>
                        <label class="day-checkbox"><input type="checkbox" value="1"> Seg</label>
                        <label class="day-checkbox"><input type="checkbox" value="2"> Ter</label>
                        <label class="day-checkbox"><input type="checkbox" value="3"> Qua</label>
                        <label class="day-checkbox"><input type="checkbox" value="4"> Qui</label>
                        <label class="day-checkbox"><input type="checkbox" value="5"> Sex</label>
                        <label class="day-checkbox"><input type="checkbox" value="6"> Sáb</label>
                    </div>
                </div>
                <input type="hidden" id="modal-item-category" value="study">
            `;
            break;
    }
    
    form.innerHTML = formHTML + `
        <button type="submit" class="submit-btn">Salvar</button>
    `;
    
    // Mostrar modal
    modal.classList.add('active');
}

// Mostrar modal para adicionar livro
function showBookModal() {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    
    if (!modal || !modalTitle || !form) return;
    
    modalTitle.textContent = 'Adicionar Novo Livro';
    form.innerHTML = `
        <div class="form-group">
            <label for="book-name">Nome do Livro</label>
            <input type="text" id="book-name" required>
        </div>
        <div class="form-group">
            <label for="book-author">Autor (opcional)</label>
            <input type="text" id="book-author">
        </div>
        <div class="form-group">
            <label for="book-emoji">Emoji (opcional)</label>
            <input type="text" id="book-emoji" placeholder="📖">
        </div>
        <input type="hidden" id="modal-item-category" value="book">
        <button type="submit" class="submit-btn">Salvar</button>
    `;
    
    modal.classList.add('active');
}

// Mostrar modal para conclusão de treino
function showWorkoutCompletionModal(workoutDayId) {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    
    if (!modal || !modalTitle || !form) return;
    
    const workoutDay = appData.dailyWorkouts.find(dw => dw.id === workoutDayId);
    if (!workoutDay) return;
    
    const workout = appData.workouts.find(w => w.id === workoutDay.workoutId);
    if (!workout) return;
    
    modalTitle.textContent = `Concluir ${workout.name}`;
    
    let inputFields = '';
    const workoutCard = document.querySelector(`.complete-workout-btn[data-id="${workoutDayId}"]`)?.closest('.workout-card') || null;
    
    if (workout.type === 'repeticao') {
        // Obter valores dos campos de série
        const seriesInputs = workoutCard ? workoutCard.querySelectorAll('.series-input-field') : [];
        const seriesValues = seriesInputs.length > 0
            ? Array.from(seriesInputs).map(input => input.value || '0')
            : (workoutDay.series || [0, 0, 0]).map(v => v || 0);
        
        inputFields = seriesValues.map((value, index) => `
            <div class="form-group">
                <label>Série ${index + 1}: ${value} repetições</label>
                <input type="hidden" name="series-${index}" value="${value}">
            </div>
        `).join('');
    } else if (workout.type === 'distancia') {
        const distanceInput = workoutCard ? workoutCard.querySelector('.distance-input-field') : null;
        const distanceValue = distanceInput ? distanceInput.value : (workoutDay.distance ?? '0');
        
        inputFields = `
            <div class="form-group">
                <label>Distância: ${distanceValue} km</label>
                <input type="hidden" name="distance" value="${distanceValue}">
            </div>
        `;
    } else if (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') {
        const timeInput = workoutCard ? workoutCard.querySelector('.time-input-field') : null;
        const timeValue = timeInput ? timeInput.value : (workoutDay.time ?? '0');
        
        inputFields = `
            <div class="form-group">
                <label>Tempo: ${timeValue} minutos</label>
                <input type="hidden" name="time" value="${timeValue}">
            </div>
        `;
    }
    
    form.innerHTML = `
        ${inputFields}
        <div class="form-group">
            <label for="workout-feedback">Feedback (opcional)</label>
            <textarea id="workout-feedback" rows="3" placeholder="Como foi o treino? O que você aprendeu?"></textarea>
        </div>
        <input type="hidden" id="workout-day-id" value="${workoutDayId}">
        <input type="hidden" id="modal-item-category" value="complete-workout">
        <button type="submit" class="submit-btn">Concluir e Salvar Feedback</button>
    `;
    
    modal.classList.add('active');
}

// Mostrar modal para conclusão de estudo
function showStudyCompletionModal(studyDayId) {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    
    if (!modal || !modalTitle || !form) return;
    
    const studyDay = appData.dailyStudies.find(ds => ds.id === studyDayId);
    if (!studyDay) return;
    
    const study = appData.studies.find(s => s.id === studyDay.studyId);
    if (!study) return;
    
    modalTitle.textContent = `Concluir ${study.name}`;
    
    form.innerHTML = `
        <div class="form-group">
            <label>Status aplicado</label>
            <div class="status-chip">${studyDay.applied ? 'Aplicado' : 'Não aplicado'}</div>
        </div>
        <div class="form-group">
            <label for="study-feedback">Feedback (opcional)</label>
            <textarea id="study-feedback" rows="3" placeholder="O que você aprendeu? Como aplicou?"></textarea>
        </div>
        <input type="hidden" id="study-day-id" value="${studyDayId}">
        <input type="hidden" id="modal-item-category" value="complete-study">
        <button type="submit" class="submit-btn">Concluir e Salvar Feedback</button>
    `;
    
    modal.classList.add('active');
}

// Mostrar modal para conclusão de missão
function showMissionCompletionModal(missionId) {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    
    if (!modal || !modalTitle || !form) return;
    
    const mission = appData.missions.find(m => m.id === missionId);
    if (!mission) return;
    
    modalTitle.textContent = `Concluir ${mission.name}`;
    
    form.innerHTML = `
        <div class="form-group">
            <label for="mission-feedback">Feedback (opcional)</label>
            <textarea id="mission-feedback" rows="3" placeholder="O que foi feito? O que aprendeu?"></textarea>
        </div>
        <input type="hidden" id="mission-id" value="${missionId}">
        <input type="hidden" id="modal-item-category" value="complete-mission">
        <button type="submit" class="submit-btn">Concluir e Salvar Feedback</button>
    `;
    
    modal.classList.add('active');
}

function showWorkCompletionModal(workId) {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    if (!modal || !modalTitle || !form) return;

    const work = appData.works.find(w => w.id === workId);
    if (!work) return;

    modalTitle.textContent = `Concluir ${work.name}`;
    form.innerHTML = `
        <div class="form-group">
            <label for="work-feedback">Feedback (opcional)</label>
            <textarea id="work-feedback" rows="3" placeholder="O que foi entregue? Qual resultado?"></textarea>
        </div>
        <input type="hidden" id="work-id" value="${workId}">
        <input type="hidden" id="modal-item-category" value="complete-work">
        <button type="submit" class="submit-btn">Concluir e Salvar Feedback</button>
    `;

    modal.classList.add('active');
}

// Fechar modal
function closeModal() {
    const modal = document.getElementById('item-modal');
    if (modal) {
        if (modal.dataset.locked === 'true') return;
        modal.classList.remove('active');
    }
}

function resetAllXpKeepLevels() {
    if (!appData.hero) appData.hero = {};
    appData.hero.xp = 0;

    if (Array.isArray(appData.attributes)) {
        appData.attributes.forEach(attr => {
            attr.xp = 0;
        });
    }

    if (Array.isArray(appData.classes)) {
        appData.classes.forEach(cls => {
            cls.xp = 0;
        });
    }

    if (Array.isArray(appData.workouts)) {
        appData.workouts.forEach(workout => {
            workout.xp = 0;
        });
    }

    if (Array.isArray(appData.studies)) {
        appData.studies.forEach(study => {
            study.xp = 0;
        });
    }
}

function showGameOverModal() {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('item-form');
    if (!modal || !modalTitle || !form) return;

    modal.dataset.locked = 'true';
    modal.dataset.gameOverShown = 'true';
    modalTitle.textContent = 'Game Over';
    form.innerHTML = `
        <div class="form-group">
            <p>Suas vidas chegaram a 0. Ao restaurar, 1 vida volta e todo o XP é zerado (níveis mantidos).</p>
        </div>
        <button type="button" id="gameover-restore-btn" class="submit-btn">Restaurar 1 vida</button>
    `;

    form.querySelector('#gameover-restore-btn')?.addEventListener('click', function() {
        const maxLives = Number.isFinite(appData.hero.maxLives) ? appData.hero.maxLives : 1;
        appData.hero.lives = Math.min(maxLives, 1);
        appData.hero.gameOverCounted = false;
        resetAllXpKeepLevels();
        addHeroLog('system', 'Restaurar vida', 'Vida restaurada para 1 e todo o XP foi zerado (níveis mantidos).');
        modal.dataset.locked = 'false';
        modal.dataset.gameOverShown = 'false';
        closeModal();
        saveToLocalStorage();
        updateUI();
    });

    modal.classList.add('active');
}

function handleGameOverIfNeeded() {
    if (!appData.hero) return;
    if (appData.hero.lives > 0) {
        appData.hero.gameOverCounted = false;
        return;
    }
    if (appData.hero.lives <= 0) {
        const modal = document.getElementById('item-modal');
        if (modal?.dataset.gameOverShown === 'true') return;
        if (appData.hero.gameOverCounted === true) return;
        if (!appData.statistics) appData.statistics = {};
        appData.statistics.deaths = (appData.statistics.deaths || 0) + 1;
        if (!appData.statistics.deathDates) appData.statistics.deathDates = [];
        appData.statistics.deathDates.push(getLocalDateString());
        appData.hero.gameOverCounted = true;
        appData.hero.coins = 0;
        const deathsEl = document.getElementById('stat-deaths');
        if (deathsEl) {
            deathsEl.textContent = appData.statistics.deaths;
        }
        addHeroLog('system', 'Game Over', 'Vidas chegaram a 0. Moedas zeradas e modal de restauração exibido; XP será zerado ao confirmar.');
        saveToLocalStorage();
        if (modal) {
            showGameOverModal();
        }
    }
}

// Manipular envio do formulário de item
function handleItemFormSubmit(e) {
    e.preventDefault();
    
    const category = document.getElementById('modal-item-category').value;
    
    switch(category) {
        case 'workout':
            handleNewWorkout();
            break;
            
        case 'study':
            handleNewStudy();
            break;
            
        case 'book':
            handleNewBook();
            break;
            
        case 'complete-workout':
            handleWorkoutCompletion();
            break;
            
        case 'complete-study':
            handleStudyCompletion();
            break;

        case 'complete-mission':
            handleMissionCompletion();
            break;

        case 'complete-work':
            handleWorkCompletion();
            break;
    }
    
    closeModal();
}

// Manipular novo treino
function handleNewWorkout() {
    const name = document.getElementById('modal-item-name').value;
    const emoji = document.getElementById('modal-item-emoji').value;
    const type = document.getElementById('modal-item-type').value;
    
    const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
    const newWorkout = createWorkoutPayload(name, emoji, type, days);
    
    appData.workouts.push(newWorkout);
    updateUI();
    alert('Treino cadastrado com sucesso!');
}

// Manipular novo estudo
function handleNewStudy() {
    const name = document.getElementById('modal-item-name').value;
    const emoji = document.getElementById('modal-item-emoji').value;
    const type = document.getElementById('modal-item-type').value;
    
    const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
    const newStudy = createStudyPayload(name, emoji, type, days);
    
    appData.studies.push(newStudy);
    updateUI();
    alert('Estudo cadastrado com sucesso!');
}

// Manipular novo livro
function handleNewBook() {
    const name = document.getElementById('book-name').value;
    const author = document.getElementById('book-author').value;
    const emoji = document.getElementById('book-emoji').value;
    
    const newBook = {
        id: appData.books.length > 0 ? Math.max(...appData.books.map(b => b.id)) + 1 : 1,
        name,
        author: author || '',
        emoji: emoji || '📖',
        completed: false,
        dateAdded: getLocalDateString()
    };
    
    appData.books.push(newBook);
    updateUI();
    alert('Livro cadastrado com sucesso!');
}

// Manipular conclusão de treino
function handleWorkoutCompletion() {
    const workoutDayId = parseInt(document.getElementById('workout-day-id').value);
    const feedback = document.getElementById('workout-feedback')?.value || '';
    
    const workoutDay = appData.dailyWorkouts.find(dw => dw.id === workoutDayId);
    if (!workoutDay) return;
    
    const workout = appData.workouts.find(w => w.id === workoutDay.workoutId);
    if (!workout) return;
    
    // Atualizar valores
    if (workout.type === 'repeticao') {
        const series1 = parseInt(document.querySelector('input[name="series-0"]')?.value || 0);
        const series2 = parseInt(document.querySelector('input[name="series-1"]')?.value || 0);
        const series3 = parseInt(document.querySelector('input[name="series-2"]')?.value || 0);
        
        workoutDay.series = [series1, series2, series3];
        
        // Calcular total de repetições
        const totalReps = series1 + series2 + series3;
        
        // Atualizar estatísticas do treino
        if (!workout.stats) workout.stats = {};
        workout.stats.totalReps = (workout.stats.totalReps || 0) + totalReps;
        workout.stats.bestReps = Math.max(workout.stats.bestReps || 0, totalReps);
        workout.stats.completed = (workout.stats.completed || 0) + 1;
        
    } else if (workout.type === 'distancia') {
        const distance = parseFloat(document.querySelector('input[name="distance"]')?.value || 0);
        workoutDay.distance = distance;
        
        if (!workout.stats) workout.stats = {};
        workout.stats.totalDistance = (workout.stats.totalDistance || 0) + distance;
        workout.stats.bestDistance = Math.max(workout.stats.bestDistance || 0, distance);
        workout.stats.completed = (workout.stats.completed || 0) + 1;
        
    } else if (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') {
        const time = parseFloat(document.querySelector('input[name="time"]')?.value || 0);
        workoutDay.time = time;
        
        if (!workout.stats) workout.stats = {};
        workout.stats.totalTime = (workout.stats.totalTime || 0) + time;
        
        if (workout.type === 'menor-tempo') {
            if (workout.stats.bestTime === undefined || time < workout.stats.bestTime) {
                workout.stats.bestTime = time;
            }
        } else {
            workout.stats.bestTime = Math.max(workout.stats.bestTime || 0, time);
        }
        workout.stats.completed = (workout.stats.completed || 0) + 1;
    }
    
    workoutDay.completed = true;
    workoutDay.feedback = feedback;
    
    // Adicionar feedback
    if (feedback) {
        appData.feedbacks.push({
            type: 'workout',
            activityId: workoutDay.workoutId,
            feedback: feedback,
            date: new Date().toISOString()
        });
    }

    // Registrar no histórico de treinos (evitar duplicidade)
    const workoutHistoryExists = appData.completedWorkouts.some(w => 
        w.workoutId === workoutDay.workoutId && w.date === workoutDay.date
    );
    if (!workoutHistoryExists) {
        appData.completedWorkouts.push({
            id: Date.now() + workoutDay.id,
            workoutId: workoutDay.workoutId,
            name: workout.name,
            emoji: workout.emoji,
            type: workout.type,
            date: workoutDay.date,
            completedDate: getLocalDateString(),
            failed: false,
            series: workoutDay.series || [null, null, null],
            distance: workoutDay.distance ?? null,
            time: workoutDay.time ?? null,
            feedback: workoutDay.feedback || ''
        });
    }
    
    // Calcular XP e recompensas
    let xpGained = 3; // XP geral base
    
    // XP de vigor (sempre)
    addAttributeXP(2, 1); // Vigor
    
    // XP adicional baseado no tipo de treino
    if (workout.type === 'menor-tempo') {
        addAttributeXP(3, 1); // Agilidade
    }
    
    if (workout.type === 'repeticao' || workout.type === 'maior-tempo') {
        addAttributeXP(1, 1); // Força
    }
    
    if (workout.type === 'distancia') {
        addAttributeXP(6, 1); // Disciplina
    }
    
    // Adicionar XP ao treino
    workout.xp += 10;
    if (workout.xp >= 100) {
        workout.xp = 0;
        workout.level++;
    }
    
    // Adicionar XP geral
    addXP(xpGained);
    
    // Adicionar moedas
    appData.hero.coins += 1;
    
    // Atualizar streak
    
    // Atualizar estatísticas
    appData.statistics.workoutsDone = (appData.statistics.workoutsDone || 0) + 1;
    
    // Atualizar dia produtivo
    updateProductiveDay(1, 0, 0, xpGained);
    
    // Causar dano ao chefe físico (25 treinos para derrotar)
    damageBoss('Físico', 4);

    addHeroLog(
        'workout',
        `Treino concluído: ${workout.name}`,
        `+${xpGained} XP, +1 moeda`
    );
    
    updateUI({ mode: 'activity' });
    celebrateAction({
        containerSelector: '#daily-workouts',
        xp: xpGained,
        coins: 1,
        message: 'Treino concluído com sucesso!'
    });
    saveToLocalStorage();
}

// Manipular conclusão de estudo via modal
function handleStudyCompletion() {
    const studyDayId = parseInt(document.getElementById('study-day-id').value);
    const feedback = document.getElementById('study-feedback')?.value || '';
    
    completeStudy(studyDayId, feedback);
}

// Manipular conclusão de missão via modal
function handleMissionCompletion() {
    const missionId = parseInt(document.getElementById('mission-id').value);
    const feedback = document.getElementById('mission-feedback')?.value || '';
    
    completeMission(missionId, feedback);
}

function handleWorkCompletion() {
    const workId = parseInt(document.getElementById('work-id').value, 10);
    const feedback = document.getElementById('work-feedback')?.value || '';
    completeWork(workId, feedback);
}

// Concluir estudo
function completeStudy(studyDayId, feedbackText = '') {
    const studyDay = appData.dailyStudies.find(ds => ds.id === studyDayId);
    if (!studyDay) return;
    
    const study = appData.studies.find(s => s.id === studyDay.studyId);
    if (!study) return;
    
    // Marcar como concluído
    studyDay.completed = true;
    studyDay.feedback = feedbackText;

    // Registrar no histórico de estudos (evitar duplicidade)
    const studyHistoryExists = appData.completedStudies.some(s => 
        s.studyId === studyDay.studyId && s.date === studyDay.date
    );
    if (!studyHistoryExists) {
        appData.completedStudies.push({
            id: Date.now() + studyDay.id,
            studyId: studyDay.studyId,
            name: study.name,
            emoji: study.emoji,
            type: study.type,
            date: studyDay.date,
            completedDate: getLocalDateString(),
            failed: false,
            applied: !!studyDay.applied,
            feedback: studyDay.feedback || ''
        });
    }

    // Adicionar feedback
    if (feedbackText) {
        appData.feedbacks.push({
            type: 'study',
            activityId: studyDay.studyId,
            feedback: feedbackText,
            date: new Date().toISOString()
        });
    }
    
    // Calcular XP
    let xpGained = 1; // XP geral base
    let knowledgeXP = 1; // XP de conhecimento base
    
    // XP de conhecimento
    addAttributeXP(12, knowledgeXP);
    
    // 3 XP de criatividade se for do tipo criativo
    if (study.type === 'criativo') {
        addAttributeXP(5, 3); // Criatividade
    }
    
    // Bônus se foi aplicado
    if (studyDay.applied) {
        xpGained += 2; // +2 XP geral
        addAttributeXP(12, 2); // +2 XP de conhecimento
        addAttributeXP(7, 3); // +3 XP de inteligência
    }
    
    // Adicionar XP ao estudo
    study.xp += 5;
    if (study.xp >= 100) {
        study.xp = 0;
        study.level++;
    }
    
    // Atualizar estatísticas do estudo
    if (!study.stats) study.stats = {};
    study.stats.completed = (study.stats.completed || 0) + 1;
    if (studyDay.applied) {
        study.stats.applied = (study.stats.applied || 0) + 1;
    }
    
    // Adicionar XP geral
    addXP(xpGained);
    
    // Adicionar moedas
    appData.hero.coins += 1;
    
    // Atualizar streak
    
    // Atualizar estatísticas
    appData.statistics.studiesDone = (appData.statistics.studiesDone || 0) + 1;
    
    // Atualizar dia produtivo
    updateProductiveDay(0, 0, 1, xpGained);
    
    // Causar dano ao chefe mental (maior se aplicado)
    const mentalDamage = studyDay.applied ? 5 : 3;
    damageBoss('Mental', mentalDamage);

    addHeroLog(
        'study',
        `Estudo concluído: ${study.name}`,
        `+${xpGained} XP, +1 moeda${studyDay.applied ? ' (aplicado)' : ''}`
    );
    
    updateUI({ mode: 'activity' });
    celebrateAction({
        containerSelector: '#daily-studies',
        xp: xpGained,
        coins: 1,
        message: 'Estudo concluído com sucesso!'
    });
    saveToLocalStorage();
}

// Concluir livro
function completeBook(bookId) {
    const book = appData.books.find(b => b.id === bookId);
    if (!book) return;
    
    book.completed = true;
    book.dateCompleted = getLocalDateString();
    
    // Adicionar XP
    addXP(20); // 20 XP geral
    addAttributeXP(12, 20); // 20 XP de conhecimento
    
    // Atualizar estatísticas
    appData.statistics.booksRead = (appData.statistics.booksRead || 0) + 1;
    
    // Causar dano ao chefe mental
    damageBoss('Mental', 20);

    addHeroLog(
        'book',
        `Livro concluído: ${book.name}`,
        '+20 XP'
    );
    
    alert('Livro concluído com sucesso!');
    updateUI();
}

// Manipular envio do formulário de missão
function handleClassSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('class-name')?.value?.trim();
    const emoji = document.getElementById('class-emoji')?.value?.trim();
    if (!name) return;
    
    const newClass = {
        id: appData.classes.length > 0 ? Math.max(...appData.classes.map(c => c.id)) + 1 : 1,
        name,
        emoji: emoji || '💼',
        xp: 0,
        maxXp: 100,
        level: 0
    };
    
    appData.classes.push(newClass);
    if (!appData.hero.primaryClassId) {
        appData.hero.primaryClassId = newClass.id;
    }
    
    e.target.reset();
    updateUI();
    alert('Classe cadastrada com sucesso!');
}

function handleMissionSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('mission-name').value;
    const emoji = document.getElementById('mission-emoji').value;
    const type = document.getElementById('mission-type').value;
    
    // Obter atributos selecionados
    const attributeCheckboxes = document.querySelectorAll('#mission-attributes input[type="checkbox"]:checked');
    const attributes = Array.from(attributeCheckboxes).map(cb => parseInt(cb.value));
    
    const newMission = {
        id: appData.missions.length > 0 ? Math.max(...appData.missions.map(m => m.id)) + 1 : 1,
        name,
        emoji: emoji || '🎯',
        type,
        attributes,
        completed: false,
        dateAdded: getLocalDateString()
    };
    
    // Adicionar campos específicos por tipo
    if (type === 'semanal') {
        const dayCheckboxes = document.querySelectorAll('#mission-days-container input[type="checkbox"]:checked');
        newMission.days = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
    } else if (type === 'eventual') {
        const date = document.getElementById('mission-date').value;
        newMission.date = date || getLocalDateString();
    } else if (type === 'epica') {
        const deadline = document.getElementById('mission-deadline').value;
        newMission.deadline = deadline;
    }
    
    appData.missions.push(newMission);
    
    // Limpar formulário
    e.target.reset();
    
    // Atualizar UI
    updateUI();
    
    // Mostrar mensagem de sucesso
    alert('Missão cadastrada com sucesso!');
}

function handleWorkSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('work-name').value;
    const emoji = document.getElementById('work-emoji').value;
    const type = document.getElementById('work-type').value;
    const classIdRaw = document.getElementById('work-class')?.value;
    const classId = classIdRaw ? parseInt(classIdRaw, 10) : null;

    const attributeCheckboxes = document.querySelectorAll('#work-attributes input[type="checkbox"]:checked');
    const attributes = Array.from(attributeCheckboxes).map(cb => parseInt(cb.value, 10));

    const newWork = {
        id: appData.works.length > 0 ? Math.max(...appData.works.map(w => w.id)) + 1 : 1,
        name,
        emoji: emoji || '💼',
        type,
        attributes,
        classId: Number.isFinite(classId) ? classId : null,
        completed: false,
        dateAdded: getLocalDateString()
    };

    if (type === 'semanal') {
        const dayCheckboxes = document.querySelectorAll('#work-days-container input[type="checkbox"]:checked');
        newWork.days = Array.from(dayCheckboxes).map(cb => parseInt(cb.value, 10));
    } else if (type === 'eventual') {
        const date = document.getElementById('work-date').value;
        newWork.date = date || getLocalDateString();
    } else if (type === 'epica') {
        const deadline = document.getElementById('work-deadline').value;
        newWork.deadline = deadline;
    }

    appData.works.push(newWork);
    e.target.reset();
    updateUI();
    alert('Trabalho cadastrado com sucesso!');
}

// Manipular envio do formulário de treino
function handleWorkoutSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('workout-name').value;
    const emoji = document.getElementById('workout-emoji').value;
    const type = document.getElementById('workout-type').value;
    
    // Obter dias selecionados
    const days = getCheckedDays('#workout-form .days-selector input[type="checkbox"]:checked');
    const newWorkout = createWorkoutPayload(name, emoji, type, days);
    
    appData.workouts.push(newWorkout);
    
    // Limpar formulário
    e.target.reset();
    
    // Atualizar UI
    updateUI();
    
    // Mostrar mensagem de sucesso
    alert('Treino cadastrado com sucesso!');
}

// Manipular envio do formulário de estudo
function handleStudySubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('study-name').value;
    const emoji = document.getElementById('study-emoji').value;
    const type = document.getElementById('study-type').value;
    
    // Obter dias selecionados
    const days = getCheckedDays('#study-form .days-selector input[type="checkbox"]:checked');
    const newStudy = createStudyPayload(name, emoji, type, days);
    
    appData.studies.push(newStudy);
    
    // Limpar formulário
    e.target.reset();
    
    // Atualizar UI
    updateUI();
    
    // Mostrar mensagem de sucesso
    alert('Estudo cadastrado com sucesso!');
}

function handleFinanceSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('finance-type').value;
    const amount = parseFloat(document.getElementById('finance-amount').value);
    const category = document.getElementById('finance-category').value.trim();
    const description = document.getElementById('finance-desc').value.trim();
    
    if (!type || isNaN(amount) || amount <= 0) {
        alert('Informe um valor válido.');
        return;
    }
    
    appData.financeEntries.push({
        id: createUniqueId(appData.financeEntries),
        type,
        amount,
        category,
        description,
        date: getLocalDateString()
    });
    
    e.target.reset();
    updateUI({ mode: 'finance' });
}

//Formulário de missão baseado no tipo
function updateMissionForm(missionType) {
    const daysContainer = document.getElementById('mission-days-container');
    const dateContainer = document.getElementById('mission-date-container');
    const deadlineContainer = document.getElementById('mission-deadline-container');
    
    // Esconder todos os containers
    daysContainer.style.display = 'none';
    dateContainer.style.display = 'none';
    deadlineContainer.style.display = 'none';
    
    // Mostrar o container apropriado
    switch(missionType) {
        case 'semanal':
            daysContainer.style.display = 'block';
            break;
        case 'eventual':
            dateContainer.style.display = 'block';
            // Usar a nova função para obter data local correta
            document.getElementById('mission-date').value = getLocalDateString();
            break;
        case 'epica':
            deadlineContainer.style.display = 'block';
            // Definir prazo padrão para uma semana a partir de hoje
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            document.getElementById('mission-deadline').value = getLocalDateString(nextWeek);
            break;
    }
}

function updateWorkForm(workType) {
    const daysContainer = document.getElementById('work-days-container');
    const dateContainer = document.getElementById('work-date-container');
    const deadlineContainer = document.getElementById('work-deadline-container');
    if (!daysContainer || !dateContainer || !deadlineContainer) return;

    daysContainer.style.display = 'none';
    dateContainer.style.display = 'none';
    deadlineContainer.style.display = 'none';

    switch(workType) {
        case 'semanal':
            daysContainer.style.display = 'block';
            break;
        case 'eventual':
            dateContainer.style.display = 'block';
            document.getElementById('work-date').value = getLocalDateString();
            break;
        case 'epica':
            deadlineContainer.style.display = 'block';
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            document.getElementById('work-deadline').value = getLocalDateString(nextWeek);
            break;
    }
}

// Completar uma missão (função corrigida - VERSÃO FINAL)
function completeMission(missionId, feedbackText = '') {
    const missionIndex = appData.missions.findIndex(m => m.id === missionId);
    if (missionIndex === -1) return;
    
    const mission = appData.missions[missionIndex];
    const todayStr = getLocalDateString();

    // Marcar como concluída
    mission.completed = true;
    mission.completedDate = todayStr;

    // Registrar feedback (opcional)
    if (feedbackText) {
        mission.feedback = feedbackText;
        appData.feedbacks.push({
            type: 'mission',
            activityId: missionId,
            feedback: feedbackText,
            date: new Date().toISOString()
        });
    }
    
    // 1. PRIMEIRO: Mover para missões concluídas
    appData.completedMissions.push({...mission});
    
    // 2. SEGUNDO: Remover da lista de missões ativas (IMEDIATAMENTE)
    appData.missions.splice(missionIndex, 1);
    
    // 3. Se for missão diária, recriar para amanhã
    if (mission.type === 'diaria') {
        recreateDailyMissionForTomorrow(mission);
    }
    
    // 4. Aplicar recompensas
    let xpGained = 1;
    let coinsGained = 1;
    
    if (mission.type === 'epica') {
        xpGained = 20;
        coinsGained = 10;
        mission.attributes.forEach(attrId => {
            const attrXp = attrId === 14 ? 100 : 20;
            addAttributeXP(attrId, attrXp);
        });
    } else {
        mission.attributes.forEach(attrId => {
            const attrXp = attrId === 14 ? 20 : 1;
            addAttributeXP(attrId, attrXp);
        });
    }
    
    // Adicionar XP e moedas
    addXP(xpGained);
    appData.hero.coins += coinsGained;
    
    // Atualizar estatísticas
    appData.statistics.missionsDone = (appData.statistics.missionsDone || 0) + 1;
    updateProductiveDay(0, 1, 0, xpGained);
    damageBossesByAttributes(mission.attributes);

    addHeroLog(
        'mission',
        `Missão concluída: ${mission.name}`,
        `+${xpGained} XP, +${coinsGained} moeda(s)`
    );
    
    // 5. ATUALIZAR UI IMEDIATAMENTE (ANTES DO ALERT)
    updateUI({ mode: 'activity' });
    
    // 6. Mostrar feedback visual
    const missionDoneMessage = `Missão "${mission.name}" concluída! ${mission.type === 'diaria' ? 'Ela reaparecerá amanhã.' : ''}`;
    celebrateAction({
        containerSelector: '#daily-missions',
        xp: xpGained,
        coins: coinsGained,
        message: missionDoneMessage
    });
    saveToLocalStorage();
}

function completeWork(workId, feedbackText = '') {
    const workIndex = appData.works.findIndex(w => w.id === workId);
    if (workIndex === -1) return;

    const work = appData.works[workIndex];
    const todayStr = getLocalDateString();

    work.completed = true;
    work.completedDate = todayStr;

    if (feedbackText) {
        work.feedback = feedbackText;
        appData.feedbacks.push({
            type: 'work',
            activityId: workId,
            feedback: feedbackText,
            date: new Date().toISOString()
        });
    }

    appData.completedWorks.push({ ...work });
    appData.works.splice(workIndex, 1);

    if (work.type === 'diaria') {
        recreateDailyWorkForTomorrow(work);
    }

    let xpGained = 1;
    let coinsGained = 1;

    if (work.classId) {
        addClassXP(work.classId, xpGained);
    }

    addXP(xpGained);
    appData.hero.coins += coinsGained;
    appData.statistics.worksDone = (appData.statistics.worksDone || 0) + 1;
    updateProductiveDay(0, 0, 0, xpGained, 1);

    damageBoss('Trabalho', 15);

    addHeroLog(
        'mission',
        `Trabalho concluído: ${work.name}`,
        `+${xpGained} XP, +${coinsGained} moeda(s)`
    );

    updateUI({ mode: 'activity' });
    celebrateAction({
        containerSelector: '#daily-works',
        xp: xpGained,
        coins: coinsGained,
        message: `Trabalho "${work.name}" concluído! ${work.type === 'diaria' ? 'Ele reaparecerá amanhã.' : ''}`
    });
    saveToLocalStorage();
}

// Recriar missão diária para o próximo dia (VERSÃO CORRIGIDA)
function recreateDailyMissionForTomorrow(originalMission) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);
    
    // Criar nova missão com os mesmos dados, mas com data DE AMANHÃ
    const newMission = {
        id: appData.missions.length > 0 ? Math.max(...appData.missions.map(m => m.id)) + 1 : 1,
        name: originalMission.name,
        emoji: originalMission.emoji || '🎯',
        type: 'diaria',
        attributes: [...originalMission.attributes],
        completed: false,
        dateAdded: tomorrowStr,  // Data de amanhã
        availableDate: tomorrowStr  // NOVO: Data em que estará disponível
    };
    
    // Adicionar à lista de missões
    appData.missions.push(newMission);
    
    console.log(`Missão diária "${originalMission.name}" recriada para ${tomorrowStr} (disponível amanhã)`);
}

// Recriar missões diárias para o dia atual (VERSÃO CORRIGIDA)
function recreateDailyMissionsForToday() {
    const today = new Date();
    const todayStr = getLocalDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    // Encontrar missões diárias concluídas ontem
    const yesterdayCompletedMissions = appData.completedMissions.filter(mission => 
        mission.type === 'diaria' && 
        mission.completedDate === yesterdayStr &&
        !mission.failed
    );
    
    // Recriar cada missão diária concluída ontem
    yesterdayCompletedMissions.forEach(originalMission => {
        // Verificar se já existe uma missão igual disponível HOJE
        const alreadyExists = appData.missions.some(mission => 
            mission.type === 'diaria' && 
            mission.name === originalMission.name &&
            !mission.completed &&
            !mission.failed &&
            mission.dateAdded === todayStr  // Adicionada hoje
        );
        
        if (!alreadyExists) {
            const newMission = {
                id: appData.missions.length > 0 ? Math.max(...appData.missions.map(m => m.id)) + 1 : 1,
                name: originalMission.name,
                emoji: originalMission.emoji || '🎯',
                type: 'diaria',
                attributes: [...originalMission.attributes],
                completed: false,
                dateAdded: todayStr,
                availableDate: todayStr  // Disponível HOJE
            };
            
            appData.missions.push(newMission);
            console.log(`Missão diária "${originalMission.name}" recriada para HOJE (${todayStr})`);
        }
    });
}

// Limpar missões diárias antigas que não foram completadas
function cleanupOldDailyMissions() {
    const today = new Date();
    const todayStr = getLocalDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    // Remover missões diárias com dateAdded de ontem ou anterior que não foram concluídas
    // (isso limpa missões que o usuário pulou)
    const missionsToRemove = [];
    
    appData.missions.forEach((mission, index) => {
        if (mission.type === 'diaria' && 
            !mission.completed && 
            !mission.failed &&
            mission.dateAdded && 
            mission.dateAdded < todayStr) {
            
            console.log(`Removendo missão diária antiga: ${mission.name} (adicionada em ${mission.dateAdded})`);
            missionsToRemove.unshift(index); // Adicionar no início para remover do final
        }
    });
    
    // Remover do final para não afetar índices
    missionsToRemove.forEach(index => {
        appData.missions.splice(index, 1);
    });
    
    if (missionsToRemove.length > 0) {
        console.log(`Removidas ${missionsToRemove.length} missões diárias antigas`);
    }
}

function recreateDailyWorkForTomorrow(originalWork) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    const newWork = {
        id: appData.works.length > 0 ? Math.max(...appData.works.map(w => w.id)) + 1 : 1,
        name: originalWork.name,
        emoji: originalWork.emoji || '💼',
        type: 'diaria',
        attributes: [...originalWork.attributes],
        classId: originalWork.classId || null,
        completed: false,
        dateAdded: tomorrowStr,
        availableDate: tomorrowStr
    };

    appData.works.push(newWork);
}

function recreateDailyWorksForToday() {
    const today = new Date();
    const todayStr = getLocalDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const yesterdayCompletedWorks = appData.completedWorks.filter(work =>
        work.type === 'diaria' &&
        work.completedDate === yesterdayStr &&
        !work.failed
    );

    yesterdayCompletedWorks.forEach(originalWork => {
        const alreadyExists = appData.works.some(work =>
            work.type === 'diaria' &&
            work.name === originalWork.name &&
            !work.completed &&
            !work.failed &&
            work.dateAdded === todayStr
        );

        if (!alreadyExists) {
            appData.works.push({
                id: appData.works.length > 0 ? Math.max(...appData.works.map(w => w.id)) + 1 : 1,
                name: originalWork.name,
                emoji: originalWork.emoji || '💼',
                type: 'diaria',
                attributes: [...originalWork.attributes],
                classId: originalWork.classId || null,
                completed: false,
                dateAdded: todayStr,
                availableDate: todayStr
            });
        }
    });
}

function cleanupOldDailyWorks() {
    const todayStr = getLocalDateString();
    const worksToRemove = [];

    appData.works.forEach((work, index) => {
        if (
            work.type === 'diaria' &&
            !work.completed &&
            !work.failed &&
            work.dateAdded &&
            work.dateAdded < todayStr
        ) {
            worksToRemove.unshift(index);
        }
    });

    worksToRemove.forEach(index => {
        appData.works.splice(index, 1);
    });
}

// Atualizar dia produtivo
function updateProductiveDay(workouts = 0, missions = 0, studies = 0, xp = 0, works = 0) {
    const today = getLocalDateString();
    
    if (!appData.statistics.productiveDays) {
        appData.statistics.productiveDays = {};
    }
    
    if (!appData.statistics.productiveDays[today]) {
        appData.statistics.productiveDays[today] = {
            workouts: 0,
            missions: 0,
            works: 0,
            studies: 0,
            totalXP: 0
        };
    }
    
    appData.statistics.productiveDays[today].workouts += workouts;
    appData.statistics.productiveDays[today].missions += missions;
    appData.statistics.productiveDays[today].works += works;
    appData.statistics.productiveDays[today].studies += studies;
    appData.statistics.productiveDays[today].totalXP += xp;
}

// Comprar item (atualizado para verificar nível)
function buyItem(itemId) {
    const item = appData.shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Verificar nível
    if (appData.hero.level < item.level) {
        showToast(`Você precisa estar no nível ${item.level} para comprar este item!`, 'warn');
        return;
    }
    
    // Verificar se tem moedas suficientes
    if (appData.hero.coins < item.cost) {
        showToast('Moedas insuficientes!', 'warn');
        return;
    }
    
    // Subtrair moedas
    appData.hero.coins -= item.cost;
    
    // Adicionar ao inventário
    appData.inventory.push({
        id: itemId,
        purchaseDate: new Date().toISOString()
    });
    
    // Atualizar UI
    updateUI({ mode: 'shop' });
    
    // Mostrar feedback de compra
    celebrateAction({
        containerSelector: '#shop-items',
        coins: -item.cost,
        message: `${item.name} comprado com sucesso!`
    });
    addHeroLog('item', `Item comprado: ${item.name}`, `-${item.cost} moedas`);
}

// Usar item do inventário (atualizado para remover apenas 1 unidade)
function useItem(itemId) {
    // Encontrar o primeiro item deste tipo no inventário
    const itemIndex = appData.inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    
    const item = appData.shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Remover apenas 1 unidade do inventário
    appData.inventory.splice(itemIndex, 1);
    
    // Aplicar efeito
    switch(item.effect) {
        case 'heal':
            if (appData.hero.lives < appData.hero.maxLives) {
                appData.hero.lives++;
                showToast('Poção usada! Vida restaurada.', 'success');
                celebrateAction({ containerSelector: '#inventory-items', message: '+1 vida aplicada' });
                addHeroLog('item', 'Poção usada', '+1 vida');
            } else {
                showToast('Você já está com vida máxima!', 'warn');
                // Devolver ao inventário
                appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
            }
            break;
            
        case 'shield':
            showToast('Escudo ativado! Você está protegido contra o próximo dano e quebra de streak.', 'success');
            celebrateAction({ containerSelector: '#inventory-items', message: 'Escudo equipado' });
            // Aqui você precisaria implementar a lógica de escudo
            // Por exemplo, adicionar uma flag de proteção ao herói
            if (!appData.hero.protection) appData.hero.protection = {};
            appData.hero.protection.shield = true;
            addHeroLog('item', 'Escudo ativado', 'O próximo dano e quebra de streak serão evitados.');
            break;
            
        case 'bomb':
            const bossName = prompt('Selecione o chefe para atacar:\n1. Físico\n2. Mental\n3. Social\n4. Espiritual\n5. Trabalho');
            let boss;
            
            switch(bossName) {
                case '1': boss = appData.bosses.find(b => b.name === 'Físico'); break;
                case '2': boss = appData.bosses.find(b => b.name === 'Mental'); break;
                case '3': boss = appData.bosses.find(b => b.name === 'Social'); break;
                case '4': boss = appData.bosses.find(b => b.name === 'Espiritual'); break;
                case '5': boss = appData.bosses.find(b => b.name === 'Trabalho'); break;
                default: 
                    alert('Chefe inválido!');
                    appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
                    return;
            }
            
            if (boss) {
                damageBoss(boss.name, 50);
                showToast(`Bomba usada! Causou 50 de dano no chefe ${boss.name}.`, 'success');
                celebrateAction({ containerSelector: '#chefoes', message: `${boss.name} recebeu 50 de dano` });
                addHeroLog('item', 'Bomba usada', `Dano de 50 no chefe ${boss.name}.`);
            }
            break;
            
        case 'custom':
            alert(`${item.name} usado! Recompensa: ${item.description}`);
            // Aqui você pode adicionar lógica personalizada para itens customizados
            addHeroLog('item', `Item usado: ${item.name}`, item.description || 'Recompensa aplicada.');
            break;
    }
    
    // Atualizar UI
    updateUI();
}

// Adicionar XP ao herói
function addXP(amount) {
    // Aplicar bônus de chefões derrotados
    const bonusMultiplier = 1 + (appData.bosses.filter(b => b.bonusActive).length * 0.01); // +1% por chefe derrotado
    const finalAmount = Math.floor(amount * bonusMultiplier);
    
    appData.hero.xp += finalAmount;
    
    // Verificar se subiu de nível
    while (appData.hero.xp >= appData.hero.maxXp) {
        appData.hero.xp -= appData.hero.maxXp;
        appData.hero.level++;
        appData.hero.maxXp = Math.floor(appData.hero.maxXp * 1.5); // Aumentar XP necessário para próximo nível
        
        // Mostrar mensagem de novo nível
        showToast(`Parabéns! Você alcançou o nível ${appData.hero.level}!`, 'success', 2800);
        celebrateAction({
            target: document.getElementById('current-level'),
            message: 'Novo nível alcançado!'
        });
        addHeroLog(
            'level',
            `Nível ${appData.hero.level} alcançado`,
            `Novo XP necessário: ${appData.hero.maxXp}`
        );
    }
}

// Adicionar XP a um atributo
function addAttributeXP(attributeId, amount) {
    const attribute = appData.attributes.find(a => a.id === attributeId);
    if (!attribute) return;
    
    // Aplicar bônus de chefões derrotados
    const bonusMultiplier = 1 + (appData.bosses.filter(b => b.bonusActive).length * 0.01);
    const finalAmount = Math.floor(amount * bonusMultiplier);
    
    attribute.xp += finalAmount;
    
    // Verificar se subiu de nível
    const oldLevel = Math.floor((attribute.xp - finalAmount) / 100);
    const newLevel = Math.floor(attribute.xp / 100);
    
    if (newLevel > oldLevel) {
        // Mostrar mensagem de novo nível do atributo
        console.log(`Atributo ${attribute.name} alcançou o nível ${newLevel}!`);
    }
    
    // Ajustar maxXp se necessário
    attribute.maxXp = (newLevel + 1) * 100;
}

// Causar dano aos chefões baseado em atributos
function addClassXP(classId, amount) {
    if (!Array.isArray(appData.classes)) return;
    const cls = appData.classes.find(c => c.id === classId);
    if (!cls) return;
    
    // Aplicar bônus de chefes derrotados
    const bonusMultiplier = 1 + (appData.bosses.filter(b => b.bonusActive).length * 0.01);
    const finalAmount = Math.floor(amount * bonusMultiplier);
    
    cls.xp += finalAmount;
    
    const oldLevel = Math.floor((cls.xp - finalAmount) / 100);
    const newLevel = Math.floor(cls.xp / 100);
    
    if (newLevel > oldLevel) {
        console.log(`Classe ${cls.name} alcançou o nível ${newLevel}!`);
    }
    
    cls.maxXp = (newLevel + 1) * 100;
    cls.level = newLevel;
}

function damageBossesByAttributes(attributeIds) {
    // Contar atributos por chefe
    const bossDamage = {
        'Físico': 0,
        'Mental': 0,
        'Social': 0,
        'Espiritual': 0
    };
    
    // Mapear atributos para chefões
    attributeIds.forEach(attrId => {
        // Força, Vigor, Agilidade, Habilidade -> Físico
        if ([1, 2, 3, 4].includes(attrId)) {
            bossDamage['Físico']++;
        }
        // Criatividade, Disciplina, Inteligência, Conhecimento -> Mental
        if ([5, 6, 7, 12].includes(attrId)) {
            bossDamage['Mental']++;
        }
        // Liderança, Sociabilidade -> Social
        if ([9, 10].includes(attrId)) {
            bossDamage['Social']++;
        }
        // Fé, Justiça, Casamento -> Espiritual
        if ([8, 11, 13].includes(attrId)) {
            bossDamage['Espiritual']++;
        }
    });
    
    // Aplicar dano
    Object.entries(bossDamage).forEach(([bossName, damage]) => {
        if (damage > 0) {
            damageBoss(bossName, damage * 2);
        }
    });
}

// Causar dano a um chefe específico
function damageBoss(bossName, damage) {
    const boss = appData.bosses.find(b => b.name === bossName);
    if (!boss) return;
    
    boss.hp = Math.max(0, boss.hp - damage);
    
    // Verificar se foi derrotado
    if (boss.hp <= 0 && !boss.defeated) {
        boss.defeated = true;
        boss.bonusActive = true;
        
        // Recompensas por derrotar chefe
        addXP(20);
        if (boss.attributes && boss.attributes.length > 0) {
            boss.attributes.forEach(attrId => addAttributeXP(attrId, 10));
        }
        addHeroLog(
            'boss',
            `Chefe derrotado: ${boss.name}`,
            '+20 XP e +10 XP em cada atributo associado'
        );
        celebrateAction({
            containerSelector: '#chefoes',
            xp: 20,
            message: `Chefe ${boss.name} derrotado! Bônus ativo.`
        });
        
    }
}

// Adicione esta função para gerar resumos do herói
  function generateHeroLogs() {
      const container = document.getElementById('hero-logs');
      if (!container) return;
      
      container.innerHTML = '';
    
    if (!appData.heroLogs || appData.heroLogs.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum registro ainda.</p>';
        return;
    }
    
      const recentLogs = appData.heroLogs.slice(-20).reverse();
      
      const logIcons = {
          mission: '🎯',
          workout: '💪',
          study: '📚',
          book: '📖',
          level: '🏆',
          item: '🎁',
          boss: '🐉',
          rest: '🌙',
          penalty: '⚠️',
          system: '⚙️'
      };
      
      recentLogs.forEach(log => {
          const logElement = document.createElement('div');
          logElement.className = `log-item ${log.type}`;
          const logDate = parseLocalDateString(log.date).toLocaleString('pt-BR');
          const icon = logIcons[log.type] || '📝';
          logElement.innerHTML = `
              <div class="log-icon">${icon}</div>
              <div class="log-content">
                  <div class="log-title">${log.title}</div>
                  <div class="log-text">${log.content}</div>
                  <div class="log-text">${logDate}</div>
              </div>
        `;
        container.appendChild(logElement);
    });
}

// Inicializar gráficos
function initCharts() {
    // Esta função será chamada quando a aba de estatísticas for acessada
    console.log('Gráficos inicializados');
}

// Adicione esta função para adicionar a quarta aba com calendário

// Atualizar gráficos
function updateCharts() {
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') return;
    
    // Atualizar gráfico de atributos
    updateAttributesChart();
    
    // Atualizar gráfico de atividades
    updateActivitiesChart();
    
    // Atualizar gráfico semanal
    updateWeeklyChart();

    // Atualizar gráfico de falhas/ignorados
    updateFailuresChart();

    // Atualizar gráfico de concluidas x falhas
    updateCompletedVsFailedChart();

    // Atualizar gráfico de taxa de aderencia
    updateAdherenceRateChart();

    // Atualizar gráfico de XP por fonte
    updateXpBySourceChart();
}

function getSelectedStatsChartPeriodDays() {
    const select = document.getElementById('stats-chart-period');
    const parsed = parseInt(select?.value || '7', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function getStatsChartPeriodDateKeys(days) {
    const totalDays = Number.isFinite(days) && days > 0 ? days : 7;
    const keys = [];
    for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        keys.push(getLocalDateString(date));
    }
    return keys;
}

// Atualizar gráfico de atributos
function updateAttributesChart() {
    const ctx = document.getElementById('attributes-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente se houver
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    const labels = appData.attributes.map(attr => attr.name);
    const data = appData.attributes.map(attr => attr.xp % 100); // Mostrar progresso no nível atual
    
    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Progresso dos Atributos (%)',
                data: data,
                backgroundColor: 'rgba(74, 111, 165, 0.7)',
                borderColor: 'rgba(74, 111, 165, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Progresso (%)'
                    }
                }
            }
        }
    });
}

// Atualizar gráfico de atividades
function updateActivitiesChart() {
    const ctx = document.getElementById('activities-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente se houver
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    const periodDays = getSelectedStatsChartPeriodDays();
    const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
    const missionsDone = (appData.completedMissions || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
        return count + 1;
    }, 0);
    const worksDone = (appData.completedWorks || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
        return count + 1;
    }, 0);
    const workoutsDone = (appData.completedWorkouts || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
        return count + 1;
    }, 0);
    const studiesDone = (appData.completedStudies || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
        return count + 1;
    }, 0);
    const booksRead = (appData.books || []).reduce((count, book) => {
        if (!book?.completed || !book?.dateCompleted) return count;
        return periodKeys.has(book.dateCompleted) ? count + 1 : count;
    }, 0);

    const data = {
        labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos', 'Livros'],
        datasets: [{
            label: `Atividades Realizadas (${periodDays} dias)`,
            data: [
                missionsDone,
                worksDone,
                workoutsDone,
                studiesDone,
                booksRead
            ],
            backgroundColor: [
                CATEGORY_COLORS.mission.solid,
                CATEGORY_COLORS.work.solid,
                CATEGORY_COLORS.workout.solid,
                CATEGORY_COLORS.study.solid,
                CATEGORY_COLORS.book.solid
            ],
            borderColor: [
                CATEGORY_COLORS.mission.border,
                CATEGORY_COLORS.work.border,
                CATEGORY_COLORS.workout.border,
                CATEGORY_COLORS.study.border,
                CATEGORY_COLORS.book.border
            ],
            borderWidth: 1
        }]
    };
    
    ctx.chart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true
        }
    });
}

// Atualizar gráfico semanal
function updateWeeklyChart() {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente se houver
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    const periodDays = getSelectedStatsChartPeriodDays();
    const periodDates = getStatsChartPeriodDateKeys(periodDays);
    
    const missionsData = periodDates.map(date => {
        const dayData = appData.statistics.productiveDays[date];
        return dayData ? dayData.missions : 0;
    });
    
    const workoutsData = periodDates.map(date => {
        const dayData = appData.statistics.productiveDays[date];
        return dayData ? dayData.workouts : 0;
    });

    const worksData = periodDates.map(date => {
        const dayData = appData.statistics.productiveDays[date];
        return dayData ? (dayData.works || 0) : 0;
    });
    
    const studiesData = periodDates.map(date => {
        const dayData = appData.statistics.productiveDays[date];
        return dayData ? dayData.studies : 0;
    });

    const goals = appData.statisticsGoals || {};
    const missionGoalPerDay = Math.max(0, Number(goals.missions || 0) / 7);
    const worksGoalPerDay = Math.max(0, Number(goals.works || 0) / 7);
    const workoutsGoalPerDay = Math.max(0, Number(goals.workouts || 0) / 7);
    const studiesGoalPerDay = Math.max(0, Number(goals.studies || 0) / 7);
    const missionGoalData = periodDates.map(() => missionGoalPerDay);
    const worksGoalData = periodDates.map(() => worksGoalPerDay);
    const workoutsGoalData = periodDates.map(() => workoutsGoalPerDay);
    const studiesGoalData = periodDates.map(() => studiesGoalPerDay);
    
    // Formatar datas para exibição
    const labels = periodDates.map(date => {
        const d = new Date(date);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    
    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Missões',
                    data: missionsData,
                    borderColor: CATEGORY_COLORS.mission.border,
                    backgroundColor: CATEGORY_COLORS.mission.soft,
                    tension: 0.4
                },
                {
                    label: 'Meta Missões',
                    data: missionGoalData,
                    borderColor: CATEGORY_COLORS.mission.goal,
                    backgroundColor: CATEGORY_COLORS.mission.soft,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Treinos',
                    data: workoutsData,
                    borderColor: CATEGORY_COLORS.workout.border,
                    backgroundColor: CATEGORY_COLORS.workout.soft,
                    tension: 0.4
                },
                {
                    label: 'Meta Treinos',
                    data: workoutsGoalData,
                    borderColor: CATEGORY_COLORS.workout.goal,
                    backgroundColor: CATEGORY_COLORS.workout.soft,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Trabalhos',
                    data: worksData,
                    borderColor: CATEGORY_COLORS.work.border,
                    backgroundColor: CATEGORY_COLORS.work.soft,
                    tension: 0.4
                },
                {
                    label: 'Meta Trabalhos',
                    data: worksGoalData,
                    borderColor: CATEGORY_COLORS.work.goal,
                    backgroundColor: CATEGORY_COLORS.work.soft,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0
                },
                {
                    label: 'Estudos',
                    data: studiesData,
                    borderColor: CATEGORY_COLORS.study.border,
                    backgroundColor: CATEGORY_COLORS.study.soft,
                    tension: 0.4
                },
                {
                    label: 'Meta Estudos',
                    data: studiesGoalData,
                    borderColor: CATEGORY_COLORS.study.goal,
                    backgroundColor: CATEGORY_COLORS.study.soft,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    });
}

function updateFailuresChart() {
    const ctx = document.getElementById('failures-chart');
    if (!ctx) return;

    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const periodDays = getSelectedStatsChartPeriodDays();
    const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
    const missionsMissed = (appData.completedMissions || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
        return count + 1;
    }, 0);
    const worksMissed = (appData.completedWorks || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
        return count + 1;
    }, 0);
    const workoutsMissed = (appData.completedWorkouts || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
        return count + 1;
    }, 0);
    const studiesMissed = (appData.completedStudies || []).reduce((count, entry) => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
        return count + 1;
    }, 0);

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos'],
            datasets: [{
                label: `Falhas/Ignorados (${periodDays} dias)`,
                data: [missionsMissed, worksMissed, workoutsMissed, studiesMissed],
                backgroundColor: [
                    CATEGORY_COLORS.mission.solid,
                    CATEGORY_COLORS.work.solid,
                    CATEGORY_COLORS.workout.solid,
                    CATEGORY_COLORS.study.solid
                ],
                borderColor: [
                    CATEGORY_COLORS.mission.border,
                    CATEGORY_COLORS.work.border,
                    CATEGORY_COLORS.workout.border,
                    CATEGORY_COLORS.study.border
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    });
}

function updateCompletedVsFailedChart() {
    const ctx = document.getElementById('completed-failed-chart');
    if (!ctx) return;

    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const periodDays = getSelectedStatsChartPeriodDays();
    const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
    const categories = ['Missões', 'Trabalhos', 'Treinos', 'Estudos'];

    const totals = {
        mission: { done: 0, missed: 0 },
        work: { done: 0, missed: 0 },
        workout: { done: 0, missed: 0 },
        study: { done: 0, missed: 0 }
    };

    (appData.completedMissions || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.mission.missed += 1;
        else totals.mission.done += 1;
    });
    (appData.completedWorks || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.work.missed += 1;
        else totals.work.done += 1;
    });
    (appData.completedWorkouts || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.workout.missed += 1;
        else totals.workout.done += 1;
    });
    (appData.completedStudies || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.study.missed += 1;
        else totals.study.done += 1;
    });

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: 'Concluídas',
                    data: [totals.mission.done, totals.work.done, totals.workout.done, totals.study.done],
                    backgroundColor: [
                        CATEGORY_COLORS.mission.solid,
                        CATEGORY_COLORS.work.solid,
                        CATEGORY_COLORS.workout.solid,
                        CATEGORY_COLORS.study.solid
                    ],
                    borderColor: [
                        CATEGORY_COLORS.mission.border,
                        CATEGORY_COLORS.work.border,
                        CATEGORY_COLORS.workout.border,
                        CATEGORY_COLORS.study.border
                    ],
                    borderWidth: 1,
                    stack: 'activities'
                },
                {
                    label: 'Falhas/Ignorados',
                    data: [totals.mission.missed, totals.work.missed, totals.workout.missed, totals.study.missed],
                    backgroundColor: 'rgba(120, 130, 150, 0.65)',
                    borderColor: 'rgba(120, 130, 150, 1)',
                    borderWidth: 1,
                    stack: 'activities'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    });
}

function updateAdherenceRateChart() {
    const ctx = document.getElementById('adherence-rate-chart');
    if (!ctx) return;

    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const periodDays = getSelectedStatsChartPeriodDays();
    const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
    const categories = ['Missões', 'Trabalhos', 'Treinos', 'Estudos'];

    const totals = {
        mission: { done: 0, missed: 0 },
        work: { done: 0, missed: 0 },
        workout: { done: 0, missed: 0 },
        study: { done: 0, missed: 0 }
    };

    (appData.completedMissions || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.mission.missed += 1;
        else totals.mission.done += 1;
    });
    (appData.completedWorks || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.work.missed += 1;
        else totals.work.done += 1;
    });
    (appData.completedWorkouts || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.workout.missed += 1;
        else totals.workout.done += 1;
    });
    (appData.completedStudies || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key)) return;
        if (entry.failed || entry.skipped) totals.study.missed += 1;
        else totals.study.done += 1;
    });

    const toRate = (done, missed) => {
        const planned = done + missed;
        if (planned <= 0) return 0;
        return Number(((done / planned) * 100).toFixed(1));
    };

    const rates = [
        toRate(totals.mission.done, totals.mission.missed),
        toRate(totals.work.done, totals.work.missed),
        toRate(totals.workout.done, totals.workout.missed),
        toRate(totals.study.done, totals.study.missed)
    ];

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: `Aderência (${periodDays} dias)`,
                data: rates,
                backgroundColor: [
                    CATEGORY_COLORS.mission.solid,
                    CATEGORY_COLORS.work.solid,
                    CATEGORY_COLORS.workout.solid,
                    CATEGORY_COLORS.study.solid
                ],
                borderColor: [
                    CATEGORY_COLORS.mission.border,
                    CATEGORY_COLORS.work.border,
                    CATEGORY_COLORS.workout.border,
                    CATEGORY_COLORS.study.border
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentual (%)'
                    }
                }
            }
        }
    });
}

function updateXpBySourceChart() {
    const ctx = document.getElementById('xp-source-chart');
    if (!ctx) return;

    if (ctx.chart) {
        ctx.chart.destroy();
    }

    const periodDays = getSelectedStatsChartPeriodDays();
    const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));

    let missionXP = 0;
    let workXP = 0;
    let workoutXP = 0;
    let studyXP = 0;
    let bookXP = 0;
    let diaryXP = 0;

    (appData.completedMissions || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
        missionXP += entry.type === 'epica' ? 20 : 1;
    });
    (appData.completedWorks || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
        workXP += entry.type === 'epica' ? 20 : 1;
    });
    (appData.completedWorkouts || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
        workoutXP += 3;
    });
    (appData.completedStudies || []).forEach(entry => {
        const key = getEventDateKey(entry);
        if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
        studyXP += entry.applied ? 3 : 1;
    });
    (appData.books || []).forEach(book => {
        if (!book?.completed || !book?.dateCompleted) return;
        if (periodKeys.has(book.dateCompleted)) {
            bookXP += 20;
        }
    });
    const diaryEntries = diaryDbAvailable ? diaryCache : (appData.diaryEntries || []);
    (diaryEntries || []).forEach(entry => {
        if (!entry?.date) return;
        const key = getLocalDateString(new Date(entry.date));
        if (!periodKeys.has(key)) return;
        const attrs = Array.isArray(entry.attributes) ? entry.attributes.length : 0;
        diaryXP += attrs * 2;
    });

    ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos', 'Livros', 'Diário'],
            datasets: [{
                label: `XP estimado por fonte (${periodDays} dias)`,
                data: [missionXP, workXP, workoutXP, studyXP, bookXP, diaryXP],
                backgroundColor: [
                    CATEGORY_COLORS.mission.solid,
                    CATEGORY_COLORS.work.solid,
                    CATEGORY_COLORS.workout.solid,
                    CATEGORY_COLORS.study.solid,
                    CATEGORY_COLORS.book.solid,
                    'rgba(201, 203, 207, 0.7)'
                ],
                borderColor: [
                    CATEGORY_COLORS.mission.border,
                    CATEGORY_COLORS.work.border,
                    CATEGORY_COLORS.workout.border,
                    CATEGORY_COLORS.study.border,
                    CATEGORY_COLORS.book.border,
                    'rgba(201, 203, 207, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'XP'
                    }
                }
            }
        }
    });
}


// Atualizar contador para meia-noite
function updateMidnightCountdown() {
    const countdownElement = document.getElementById('midnight-countdown');
    if (!countdownElement) return;
    
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const diff = midnight - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    countdownElement.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Atualizar data atual
function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    const workDateElement = document.getElementById('current-date-work');
    if (!dateElement && !workDateElement) return;
    
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    if (dateElement) dateElement.textContent = formattedDate;
    if (workDateElement) workDateElement.textContent = formattedDate;
}

// Salvar entrada no diário
async function saveDiaryEntry() {
    const title = document.getElementById('diary-title').value;
    const content = document.getElementById('diary-content').value;
    
    if (!content.trim()) {
        alert('Por favor, escreva algo no diário.');
        return;
    }
    
    // Obter atributos selecionados
    const attributeCheckboxes = document.querySelectorAll('#diary-attributes input[type="checkbox"]:checked');
    const attributes = Array.from(attributeCheckboxes).map(cb => parseInt(cb.value));
    
    // Limitar a 3 atributos
    const selectedAttributes = attributes.slice(0, 3);
    
    const newEntry = {
        id: Date.now(),
        title: title || 'Sem título',
        content,
        attributes: selectedAttributes,
        date: new Date().toISOString(),
        xpGained: selectedAttributes.length * 5 // 5 XP por atributo
    };
    
    await saveDiaryEntryToStorage(newEntry);
    
    // Adicionar XP aos atributos selecionados
    selectedAttributes.forEach(attrId => {
        addAttributeXP(attrId, 5);
    });
    
    // Adicionar XP geral
    addXP(selectedAttributes.length * 2); // 2 XP geral por atributo
    
    // Limpar formulário
    document.getElementById('diary-title').value = '';
    document.getElementById('diary-content').value = '';
    
    // Desmarcar checkboxes
    attributeCheckboxes.forEach(cb => cb.checked = false);
    
    // Atualizar UI
    updateUI();
    
    // Mostrar mensagem de sucesso
    alert('Entrada do diário salva com sucesso!');
}

// Resetar progresso
function resetProgress() {
    if (!confirm('Tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito.')) return;
    const confirmationText = prompt('Digite RESETAR para confirmar a exclusão total do progresso:');
    if (confirmationText !== 'RESETAR') {
        alert('Reset cancelado.');
        return;
    }

    // Limpar localStorage
    localStorage.removeItem('heroJourneyData');
    if (diaryDbAvailable) {
        replaceDiaryEntriesInDB([]).then(() => {
            diaryCache = [];
            location.reload();
        });
        return;
    }

    // Recarregar a página
    location.reload();
}

// Exportar dados
async function exportData() {
    const diaryEntries = diaryDbAvailable ? await getAllDiaryEntriesFromDB() : (appData.diaryEntries || []);
    const dataToExport = { ...appData, diaryEntries };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `hero-journey-data-${getLocalDateString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert('Dados exportados com sucesso!');
}

// Importar dados
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validar dados importados
                if (!importedData.hero || !importedData.attributes) {
                    throw new Error('Arquivo inválido');
                }
                
                const importedDiaryEntries = Array.isArray(importedData.diaryEntries) ? importedData.diaryEntries : [];

                // Mesclar com defaults para evitar campos críticos ausentes
                const mergedImport = JSON.parse(JSON.stringify(APP_DEFAULTS));
                mergeData(mergedImport, importedData);
                Object.keys(appData).forEach(key => delete appData[key]);
                Object.assign(appData, mergedImport);
                ensureCriticalDataShape();
                ensureCoreAttributes();
                ensureClasses();
                ensureStartingLevels();
                normalizeClassIds();
                populateFinanceMonthOptions();

                if (diaryDbAvailable) {
                    await replaceDiaryEntriesInDB(importedDiaryEntries);
                    await refreshDiaryCache();
                    appData.diaryEntries = [];
                } else {
                    appData.diaryEntries = importedDiaryEntries;
                    diaryCache = appData.diaryEntries;
                    diaryLoaded = true;
                }
                
                // Salvar no localStorage
                saveToLocalStorage();
                
                // Atualizar UI
                updateUI();
                
                alert('Dados importados com sucesso!');
            } catch (error) {
                alert('Erro ao importar dados: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}


// Funções auxiliares
function getWorkoutTypeName(type) {
    const types = {
        'repeticao': 'Repetição',
        'distancia': 'Distância',
        'maior-tempo': 'Maior Tempo',
        'menor-tempo': 'Menor Tempo'
    };
    return types[type] || type;
}

function getMissionTypeName(type) {
    const types = {
        'diaria': 'Diária',
        'semanal': 'Semanal',
        'eventual': 'Eventual',
        'epica': 'Épica'
    };
    return types[type] || type;
}

function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex] || '';
}

function getDaysNames(dayNumbers) {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return dayNumbers.map(num => days[num]).join(', ');
}

// Obter data local no formato YYYY-MM-DD
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = parseLocalDateString(dateString);

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function editNamedEmojiItem(config) {
    const { list, id, namePrompt, emojiPrompt, updateMode } = config;
    const item = list.find(i => i.id === id);
    if (!item) return;
    
    const newName = prompt(namePrompt, item.name);
    if (newName) item.name = newName;
    
    const newEmoji = prompt(emojiPrompt, item.emoji);
    if (newEmoji) item.emoji = newEmoji;
    
    updateUI({ mode: updateMode });
}

function deleteNamedEmojiItem(config) {
    const { list, id, confirmText, successText, updateMode } = config;
    if (!confirm(confirmText)) return;
    
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return;
    
    list.splice(index, 1);
    updateUI({ mode: updateMode });
    alert(successText);
}

// Editar e excluir funções (implementações básicas)
function editWorkout(id) {
    editNamedEmojiItem({
        list: appData.workouts,
        id,
        namePrompt: 'Novo nome do treino:',
        emojiPrompt: 'Novo emoji (opcional):',
        updateMode: 'activity'
    });
}

function deleteWorkout(id) {
    deleteNamedEmojiItem({
        list: appData.workouts,
        id,
        confirmText: 'Tem certeza que deseja excluir este treino?',
        successText: 'Treino excluído com sucesso!',
        updateMode: 'activity'
    });
}

function editStudy(id) {
    editNamedEmojiItem({
        list: appData.studies,
        id,
        namePrompt: 'Novo nome do estudo:',
        emojiPrompt: 'Novo emoji (opcional):',
        updateMode: 'activity'
    });
}

function deleteStudy(id) {
    deleteNamedEmojiItem({
        list: appData.studies,
        id,
        confirmText: 'Tem certeza que deseja excluir este estudo?',
        successText: 'Estudo excluído com sucesso!',
        updateMode: 'activity'
    });
}

function editMission(id) {
    editNamedEmojiItem({
        list: appData.missions,
        id,
        namePrompt: 'Novo nome da missão:',
        emojiPrompt: 'Novo emoji (opcional):',
        updateMode: 'activity'
    });
}

function deleteMission(id) {
    deleteNamedEmojiItem({
        list: appData.missions,
        id,
        confirmText: 'Tem certeza que deseja excluir esta missão?',
        successText: 'Missão excluída com sucesso!',
        updateMode: 'activity'
    });
}

function editWork(id) {
    editNamedEmojiItem({
        list: appData.works,
        id,
        namePrompt: 'Novo nome do trabalho:',
        emojiPrompt: 'Novo emoji (opcional):',
        updateMode: 'activity'
    });
}

function deleteWork(id) {
    deleteNamedEmojiItem({
        list: appData.works,
        id,
        confirmText: 'Tem certeza que deseja excluir este trabalho?',
        successText: 'Trabalho excluído com sucesso!',
        updateMode: 'activity'
    });
}

// Aplicar penalidades por não conclusão (deve ser chamada diariamente)
function editClass(id) {
    editNamedEmojiItem({
        list: appData.classes,
        id,
        namePrompt: 'Novo nome da classe:',
        emojiPrompt: 'Novo emoji (opcional):',
        updateMode: 'activity'
    });
}

function deleteClass(id) {
    if (!confirm('Tem certeza que deseja excluir esta classe?')) return;
    
    const index = appData.classes.findIndex(c => c.id === id);
    if (index === -1) return;
    
    appData.classes.splice(index, 1);
    
    appData.works.forEach(w => {
        if (w.classId === id) w.classId = null;
    });
    appData.completedWorks.forEach(w => {
        if (w.classId === id) w.classId = null;
    });
    
    if (appData.hero.primaryClassId === id) {
        appData.hero.primaryClassId = appData.classes[0]?.id || null;
    }
    
    updateUI({ mode: 'activity' });
    alert('Classe excluída com sucesso!');
}

function applyPenalties(dateStr = getLocalDateString()) {
    const targetDateStr = dateStr;
    
    if (isRestDay(targetDateStr)) {
        return;
    }
    
    applyActivityPenalties({
        targetDateStr,
        dailyList: appData.dailyWorkouts,
        itemList: appData.workouts,
        completedList: appData.completedWorkouts,
        idKey: 'workoutId',
        nameFallback: 'Treino',
        emojiFallback: '💪',
        typeFallback: 'repeticao',
        statsKey: 'workoutsIgnored',
        streakKeys: ['general', 'physical'],
        alertFail: 'Você perdeu 1 vida por não completar treinos! Streak físico quebrado.',
        alertShield: 'Escudo consumido! Você evitou perder 1 vida e streaks.',
        logShieldTitle: 'Escudo consumido',
        logShieldContent: 'Treino não concluído, penalidade evitada.',
        logFailTitle: 'Treino não concluído',
        logFailContent: 'Perdeu 1 vida, streaks e -1 Disciplina.'
    });
    
    applyActivityPenalties({
        targetDateStr,
        dailyList: appData.dailyStudies,
        itemList: appData.studies,
        completedList: appData.completedStudies,
        idKey: 'studyId',
        nameFallback: 'Estudo',
        emojiFallback: '📚',
        typeFallback: 'logico',
        statsKey: 'studiesIgnored',
        streakKeys: ['general', 'mental'],
        alertFail: 'Você perdeu 1 vida por não completar estudos! Streak mental quebrado.',
        alertShield: 'Escudo consumido! Você evitou perder 1 vida e streaks.',
        logShieldTitle: 'Escudo consumido',
        logShieldContent: 'Estudo não concluído, penalidade evitada.',
        logFailTitle: 'Estudo não concluído',
        logFailContent: 'Perdeu 1 vida, streaks e -1 Disciplina.'
    });
    
    updateUI({ mode: 'activity' });
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");

    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
}

// Carregar tema salvo
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
    }
});
