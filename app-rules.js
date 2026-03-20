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

  const AppRules = {
    getIsoDate,
    getWeekKey,
    shouldRunDailyReset,
    shouldRunWeeklyReset,
    getMissedDateKeys,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppRules;
  }

  if (globalScope) {
    globalScope.AppRules = AppRules;
  }
})(typeof window !== 'undefined' ? window : globalThis);
