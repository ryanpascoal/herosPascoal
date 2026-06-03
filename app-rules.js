(function (globalScope) {
  'use strict';

  function toDateAtMidnight(value) {
    let date;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = value instanceof Date ? new Date(value) : new Date(value);
    }
    if (!Number.isFinite(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getIsoDate(value) {
    const date = toDateAtMidnight(value);
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getWeekKey(dateInput) {
    const date = toDateAtMidnight(dateInput);
    if (!date) return null;
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const weekYear = date.getFullYear();
    const yearStart = new Date(weekYear, 0, 1);
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${weekYear}-W${weekNo}`;
  }

  function shouldRunDailyReset(lastResetDate, todayDate) {
    const todayIso = getIsoDate(todayDate);
    if (!todayIso) return false;
    if (!lastResetDate) return false;
    return lastResetDate !== todayIso;
  }

  function shouldRunWeeklyReset(lastWeeklyResetKey, todayDate) {
    const thisWeekKey = getWeekKey(todayDate);
    if (!thisWeekKey) return false;
    if (!lastWeeklyResetKey) return false;
    return lastWeeklyResetKey !== thisWeekKey;
  }

  function getMissedDateKeys(lastResetDate, todayDate) {
    const start = toDateAtMidnight(lastResetDate);
    const end = toDateAtMidnight(todayDate);
    if (!start || !end || !(start < end)) return [];

    const keys = [];
    const cursor = new Date(start);
    while (cursor < end) {
      keys.push(getIsoDate(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }

  function inferLegacyLastDailyResetDate(state, todayDate) {
    const todayIso = getIsoDate(todayDate);
    if (!state || !todayIso) return null;

    const candidates = new Set();
    const pushCandidate = (value) => {
      const iso = getIsoDate(value);
      if (iso && iso < todayIso) candidates.add(iso);
    };
    const pushEntryDate = (entry) => {
      if (!entry || typeof entry !== 'object') return;
      pushCandidate(entry.completedDate || entry.failedDate || entry.skippedDate || entry.date);
    };
    const pushDatesFromList = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(pushEntryDate);
    };
    const pushRawDates = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach(pushCandidate);
    };

    pushDatesFromList(state.completedMissions);
    pushDatesFromList(state.completedWorks);
    pushDatesFromList(state.completedWorkouts);
    pushDatesFromList(state.completedStudies);
    pushDatesFromList(state.nutritionEntries);

    Object.keys(state.statistics?.productiveDays || {}).forEach(pushCandidate);

    pushRawDates(state.nutritionStats?.logDates);
    pushRawDates(state.nutritionStats?.goalHitDates);
    pushRawDates(state.nutritionStats?.rewardedGoalDates);
    pushRawDates(state.hydration?.logDates);
    pushRawDates(state.hydration?.goalHitDates);
    pushRawDates(state.hydration?.rewardedGoalDates);

    pushCandidate(state.hero?.streak?.lastGeneralCheck);
    pushCandidate(state.hero?.streak?.lastPhysicalCheck);
    pushCandidate(state.hero?.streak?.lastMentalCheck);
    pushCandidate(state.hero?.streak?.lastNutritionCheck);

    if (candidates.size === 0) return null;
    return Array.from(candidates).sort().pop() || null;
  }

  const AppRules = {
    getIsoDate,
    getWeekKey,
    shouldRunDailyReset,
    shouldRunWeeklyReset,
    getMissedDateKeys,
    inferLegacyLastDailyResetDate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppRules;
  }

  if (globalScope) {
    globalScope.AppRules = AppRules;
  }
})(typeof window !== 'undefined' ? window : globalThis);
