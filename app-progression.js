(function (globalScope) {
  'use strict';

  function toFiniteNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function toPositiveStep(value, fallback = 100) {
    const numericValue = Math.floor(toFiniteNumber(value, fallback));
    return numericValue > 0 ? numericValue : fallback;
  }

  function advanceHeroProgress(state, amount, options = {}) {
    const growthFactor = toFiniteNumber(options.growthFactor, 1.5);
    const safeGrowthFactor = growthFactor > 1 ? growthFactor : 1.5;

    let xp = Math.max(0, toFiniteNumber(state?.xp, 0)) + Math.max(0, toFiniteNumber(amount, 0));
    let level = Math.max(1, Math.floor(toFiniteNumber(state?.level, 1)));
    let maxXp = toPositiveStep(state?.maxXp, 100);
    const levelUps = [];

    while (xp >= maxXp) {
      xp -= maxXp;
      level += 1;
      maxXp = Math.max(1, Math.floor(maxXp * safeGrowthFactor));
      levelUps.push({
        level,
        maxXp,
      });
    }

    return {
      xp,
      level,
      maxXp,
      levelsGained: levelUps.length,
      levelUps,
    };
  }

  function advanceLinearProgress(state, amount, options = {}) {
    const step = toPositiveStep(options.step, 100);
    const previousXp = Math.max(0, toFiniteNumber(state?.xp, 0));
    const nextXp = Math.max(0, previousXp + toFiniteNumber(amount, 0));
    const previousLevel = Math.floor(previousXp / step);
    const level = Math.floor(nextXp / step);
    const currentXp = nextXp % step;

    return {
      xp: nextXp,
      level,
      maxXp: (level + 1) * step,
      currentXp,
      progressPercent: (currentXp / step) * 100,
      levelsGained: Math.max(0, level - previousLevel),
    };
  }

  function advanceCyclicProgress(state, amount, options = {}) {
    const step = toPositiveStep(options.step, 100);
    let xp = Math.max(0, toFiniteNumber(state?.xp, 0));
    let level = Math.max(0, Math.floor(toFiniteNumber(state?.level, 0)));
    let delta = toFiniteNumber(amount, 0);
    let levelsGained = 0;

    xp = Math.max(0, xp + delta);

    while (xp >= step) {
      xp -= step;
      level += 1;
      levelsGained += 1;
    }

    return {
      xp,
      level,
      maxXp: step,
      currentXp: xp,
      progressPercent: (xp / step) * 100,
      levelsGained,
    };
  }

  const AppProgression = {
    advanceHeroProgress,
    advanceLinearProgress,
    advanceCyclicProgress,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppProgression;
  }

  if (globalScope) {
    globalScope.AppProgression = AppProgression;
  }
})(typeof window !== 'undefined' ? window : globalThis);
