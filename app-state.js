// Dados iniciais do aplicativo
const appData = {
  hero: {
    name: 'Ryan Pascoal',
    primaryClassId: 1,
    level: 1,
    xp: 0,
    maxXp: 100,
    lives: 7,
    maxLives: 7,
    coins: 0,
    protection: {
      shield: false,
    },
    streak: {
      general: 0,
      physical: 0,
      mental: 0,
      lastGeneralCheck: null,
      lastPhysicalCheck: null,
      lastMentalCheck: null,
    },
  },
  attributes: [
    { id: 1, name: 'Força', emoji: '💪', xp: 0, maxXp: 100, level: 0 },
    { id: 2, name: 'Vigor', emoji: '❤️', xp: 0, maxXp: 100, level: 0 },
    { id: 3, name: 'Agilidade', emoji: '⚡', xp: 0, maxXp: 100, level: 0 },
    { id: 4, name: 'Habilidade', emoji: '🎯', xp: 0, maxXp: 100, level: 0 },
    { id: 5, name: 'Criatividade', emoji: '🎨', xp: 0, maxXp: 100, level: 0 },
    { id: 6, name: 'Disciplina', emoji: '📘', xp: 0, maxXp: 100, level: 0 },
    { id: 7, name: 'Inteligência', emoji: '🧠', xp: 0, maxXp: 100, level: 0 },
    { id: 8, name: 'Fé', emoji: '🙏', xp: 0, maxXp: 100, level: 0 },
    { id: 9, name: 'Liderança', emoji: '👑', xp: 0, maxXp: 100, level: 0 },
    { id: 10, name: 'Sociabilidade', emoji: '🗣️', xp: 0, maxXp: 100, level: 0 },
    { id: 11, name: 'Justiça', emoji: '⚖️', xp: 0, maxXp: 100, level: 0 },
    { id: 12, name: 'Conhecimento', emoji: '📚', xp: 0, maxXp: 100, level: 0 },
    { id: 13, name: 'Casamento', emoji: '💍', xp: 0, maxXp: 100, level: 0 },
    { id: 14, name: 'Riqueza', emoji: '💎', xp: 0, maxXp: 100, level: 0 },
  ],
  classes: [],
  workouts: [],
  studies: [],
  works: [],
  books: [],
  shopItems: [
    {
      id: 1,
      name: 'Poção',
      emoji: '🧪',
      cost: 50,
      level: 0,
      description: 'Restaura 1 vida',
      effect: 'heal',
    },
    {
      id: 2,
      name: 'Escudo',
      emoji: '🛡️',
      cost: 100,
      level: 0,
      description: 'Protege de 1 dano e de uma quebra de streak',
      effect: 'shield',
    },
    {
      id: 4,
      name: 'Pulo',
      emoji: '⏭️',
      cost: 25,
      level: 0,
      description: 'Permite pular 1 atividade sem penalidade',
      effect: 'skip',
    },
  ],
  inventory: [],
  missions: [],
  completedMissions: [],
  completedWorks: [],
  completedWorkouts: [],
  completedStudies: [],
  heroLogs: [],
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
    deathDates: [],
  },
  diaryEntries: [],
  feedbacks: [],
  dailyWorkouts: [],
  dailyStudies: [],
  restDays: [],
  workOffDays: [],
  statisticsGoals: {
    missions: 60,
    workouts: 20,
    studies: 20,
    works: 30,
  },
  financeEntries: [],
  financeBudgets: [],
  financeRecurring: [],
  financeRecurringSkips: [],
  foodItems: [],
  nutritionEntries: [],
  nutritionGoals: {
    kcal: 2200,
    protein: 140,
    carbs: 240,
    fat: 70,
    fiber: 30,
  },
  nutritionStats: {
    logDates: [],
    goalHitDates: [],
    rewardedGoalDates: [],
    rewardedMealKeys: [],
  },
  hydration: {
    glasses: 0,
    goal: 8,
    lastDate: null,
    currentStreak: 0,
    bestStreak: 0,
    startDate: null,
    logDates: [],
    goalHitDates: [],
  },
};
const APP_DEFAULTS = JSON.parse(JSON.stringify(appData));

function getGameNow() {
  return new Date();
}

// Obter data local no formato YYYY-MM-DD
function getLocalDateString(date = getGameNow()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Estado do calendário (aba Calendários)
let calendarState = {
  month: getGameNow().getMonth(),
  year: getGameNow().getFullYear(),
  selectedDate: null,
  detailsFilter: 'all',
};

const REST_DAY_COST = 160;
const SKIP_ACTIVITY_COST = 25;
const NUTRITION_MEALS = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
};
const NUTRITION_MEAL_ORDER = ['cafe', 'almoco', 'jantar', 'lanche'];
const CATEGORY_COLORS = {
  mission: {
    solid: 'rgba(255, 99, 132, 0.7)',
    border: 'rgba(255, 99, 132, 1)',
    soft: 'rgba(255, 99, 132, 0.2)',
    goal: 'rgba(255, 99, 132, 0.65)',
  },
  work: {
    solid: 'rgba(153, 102, 255, 0.7)',
    border: 'rgba(153, 102, 255, 1)',
    soft: 'rgba(153, 102, 255, 0.2)',
    goal: 'rgba(153, 102, 255, 0.65)',
  },
  workout: {
    solid: 'rgba(54, 162, 235, 0.7)',
    border: 'rgba(54, 162, 235, 1)',
    soft: 'rgba(54, 162, 235, 0.2)',
    goal: 'rgba(54, 162, 235, 0.65)',
  },
  study: {
    solid: 'rgba(255, 206, 86, 0.7)',
    border: 'rgba(255, 206, 86, 1)',
    soft: 'rgba(255, 206, 86, 0.2)',
    goal: 'rgba(255, 206, 86, 0.65)',
  },
  book: {
    solid: 'rgba(75, 192, 192, 0.7)',
    border: 'rgba(75, 192, 192, 1)',
    soft: 'rgba(75, 192, 192, 0.2)',
  },
};

// Diário em IndexedDB (para evitar limite do localStorage)
const DIARY_DB_NAME = 'heroJourneyDB';
const DIARY_DB_VERSION = 1;
const DIARY_STORE = 'diaryEntries';
let diaryDbPromise = null;
let diaryCache = [];
let diaryLoaded = false;
let diaryDbAvailable = true;

Object.assign(globalThis, {
  appData,
  APP_DEFAULTS,
  getGameNow,
  getLocalDateString,
  calendarState,
  REST_DAY_COST,
  SKIP_ACTIVITY_COST,
  NUTRITION_MEALS,
  NUTRITION_MEAL_ORDER,
  CATEGORY_COLORS,
  DIARY_DB_NAME,
  DIARY_DB_VERSION,
  DIARY_STORE,
  diaryDbPromise,
  diaryCache,
  diaryLoaded,
  diaryDbAvailable,
});
