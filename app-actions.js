function handleItemFormSubmit(e) {
  e.preventDefault();

  const category = document.getElementById('modal-item-category').value;
  let shouldClose = true;

  switch (category) {
    case 'workout':
      shouldClose = handleNewWorkout();
      break;

    case 'study':
      shouldClose = handleNewStudy();
      break;

    case 'edit-workout':
      shouldClose = handleEditWorkout();
      break;

    case 'edit-study':
      shouldClose = handleEditStudy();
      break;

    case 'book':
      shouldClose = handleNewBook();
      break;

    case 'edit-book':
      shouldClose = handleEditBook();
      break;

    case 'complete-workout':
      shouldClose = handleWorkoutCompletion();
      break;

    case 'complete-study':
      shouldClose = handleStudyCompletion();
      break;

    case 'complete-mission':
      shouldClose = handleMissionCompletion();
      break;

    case 'complete-work':
      shouldClose = handleWorkCompletion();
      break;

    case 'complete-book':
      shouldClose = handleBookCompletion();
      break;
  }

  if (shouldClose !== false) {
    closeModal();
  }
}

function getOneOffScheduleValidationMessage(scheduleType, dueValue, todayStr = getLocalDateString()) {
  if (scheduleType !== 'eventual' && scheduleType !== 'epica') return '';

  const normalizedDueValue = String(dueValue || '').trim();
  const itemLabel = scheduleType === 'epica' ? 'atividade épica' : 'atividade eventual';
  if (!normalizedDueValue) {
    return `Informe o prazo da ${itemLabel}.`;
  }

  const isOverdue =
    typeof isOneOffScheduledItemOverdue === 'function'
      ? isOneOffScheduledItemOverdue(
          scheduleType === 'epica'
            ? { type: scheduleType, deadline: normalizedDueValue }
            : { type: scheduleType, date: normalizedDueValue },
          todayStr
        )
      : normalizedDueValue < todayStr;

  if (isOverdue) {
    return `O prazo da ${itemLabel} não pode ficar no passado.`;
  }

  return '';
}

function supportsDueDateLock(category, scheduleType) {
  return (
    (category === 'mission' || category === 'work') &&
    (scheduleType === 'eventual' || scheduleType === 'epica')
  );
}

function resolveScheduledActivityFormState(existingItem, formState = {}) {
  const requestedScheduleType = String(formState.scheduleType || 'rotina');
  const requestedDateValue = String(formState.dateValue || '').trim();
  const requestedDeadlineValue = String(formState.deadlineValue || '').trim();
  const requestedLock = formState.dueDateLocked === true;
  const dueDateWasLocked =
    existingItem?.dueDateLocked === true &&
    (existingItem?.type === 'eventual' || existingItem?.type === 'epica');
  const scheduleType = dueDateWasLocked ? String(existingItem.type || requestedScheduleType) : requestedScheduleType;
  const isOneOffSchedule = scheduleType === 'eventual' || scheduleType === 'epica';

  return {
    scheduleType,
    dateValue:
      scheduleType === 'eventual'
        ? dueDateWasLocked
          ? String(existingItem?.date || '').trim()
          : requestedDateValue
        : '',
    deadlineValue:
      scheduleType === 'epica'
        ? dueDateWasLocked
          ? String(existingItem?.deadline || '').trim()
          : requestedDeadlineValue
        : '',
    dueDateLocked: isOneOffSchedule && (dueDateWasLocked || requestedLock),
    dueDateWasLocked,
  };
}

function getBestWorkoutSetValue(series = []) {
  if (!Array.isArray(series)) return 0;
  return series.reduce((best, value) => {
    const parsedValue = parseInt(value, 10) || 0;
    return parsedValue > best ? parsedValue : best;
  }, 0);
}

function getWorkoutDayTotalReps(series = []) {
  if (!Array.isArray(series)) return 0;
  return series.reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
}

function getWorkoutBestRepsRecord(workout, completedWorkouts = []) {
  const stats = workout?.stats || {};
  const explicitBestSet = Number(stats.bestSetReps || 0);
  const workoutId = String(workout?.id || workout?.workoutId || '');
  let bestFromHistory = 0;

  if (workoutId && Array.isArray(completedWorkouts)) {
    completedWorkouts.forEach((entry) => {
      if (!entry || entry.failed || entry.skipped || entry.type !== 'repeticao') return;
      if (String(entry.workoutId || entry.id || '') !== workoutId) return;
      bestFromHistory = Math.max(bestFromHistory, getBestWorkoutSetValue(entry.series));
    });
  }

  if (explicitBestSet > 0 || bestFromHistory > 0) {
    return Math.max(explicitBestSet, bestFromHistory);
  }

  return 0;
}

function getWorkoutBestDayRepsRecord(workout, completedWorkouts = []) {
  const stats = workout?.stats || {};
  const explicitBestDay = Number(stats.bestDayReps || 0);
  const legacyBestDay = Number(stats.bestReps || 0);
  const workoutId = String(workout?.id || workout?.workoutId || '');
  let bestFromHistory = 0;

  if (workoutId && Array.isArray(completedWorkouts)) {
    completedWorkouts.forEach((entry) => {
      if (!entry || entry.failed || entry.skipped || entry.type !== 'repeticao') return;
      if (String(entry.workoutId || entry.id || '') !== workoutId) return;
      bestFromHistory = Math.max(bestFromHistory, getWorkoutDayTotalReps(entry.series));
    });
  }

  return Math.max(explicitBestDay, legacyBestDay, bestFromHistory);
}

function getWorkoutSpeedValue(distance = 0, time = 0) {
  const safeDistance = Number(distance || 0);
  const safeTime = Number(time || 0);
  if (!Number.isFinite(safeDistance) || safeDistance <= 0 || !Number.isFinite(safeTime) || safeTime <= 0) {
    return 0;
  }

  return (safeDistance * 3600) / safeTime;
}

function getWorkoutBestSpeedRecord(workout, completedWorkouts = []) {
  const stats = workout?.stats || {};
  const explicitBestSpeed = Number(stats.bestSpeed || 0);
  const workoutId = String(workout?.id || workout?.workoutId || '');
  let bestFromHistory = 0;

  if (workoutId && Array.isArray(completedWorkouts)) {
    completedWorkouts.forEach((entry) => {
      if (!entry || entry.failed || entry.skipped || entry.type !== 'distancia') return;
      if (String(entry.workoutId || entry.id || '') !== workoutId) return;
      bestFromHistory = Math.max(bestFromHistory, getWorkoutSpeedValue(entry.distance, entry.time));
    });
  }

  return Math.max(explicitBestSpeed, bestFromHistory);
}

function buildHistoryActionTimestamp(dateKey = getLocalDateString()) {
  const now = new Date();
  const currentDateKey = getLocalDateString(now);
  if (!dateKey || dateKey === currentDateKey) {
    return now.toISOString();
  }

  const parsedDate =
    typeof parseLocalDateString === 'function' ? parseLocalDateString(dateKey) : new Date(dateKey);
  if (!Number.isFinite(parsedDate.getTime())) {
    return now.toISOString();
  }

  parsedDate.setHours(12, 0, 0, 0);
  return parsedDate.toISOString();
}

// Manipular novo treino
function handleNewWorkout() {
  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value;
  const type = document.getElementById('modal-item-type').value;

  if (!name) {
    showFeedback('Informe um nome válido para o treino.', 'warn');
    return false;
  }

  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
  const newWorkout = createWorkoutPayload(name, emoji, type, days);

  appData.workouts.push(newWorkout);
  updateUI();
  showFeedback('Treino cadastrado com sucesso!', 'success');
  return true;
}

// Manipular novo estudo
function handleNewStudy() {
  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value;
  const type = document.getElementById('modal-item-type').value;

  if (!name) {
    showFeedback('Informe um nome válido para o estudo.', 'warn');
    return false;
  }

  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
  const newStudy = createStudyPayload(name, emoji, type, days);

  appData.studies.push(newStudy);
  updateUI();
  showFeedback('Estudo cadastrado com sucesso!', 'success');
  return true;
}

function handleEditWorkout() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const workout = appData.workouts.find((item) => item.id === id);
  if (!workout) return false;

  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value.trim();
  const type = document.getElementById('modal-item-type').value;
  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');

  if (!name) {
    showFeedback('Informe um nome válido para o treino.', 'warn');
    return false;
  }

  workout.name = name;
  workout.emoji = emoji || '💪';
  workout.type = type;
  workout.days = days;

  updateUI({ mode: 'activity' });
  showFeedback('Treino atualizado com sucesso!', 'success');
  return true;
}

function handleEditStudy() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const study = appData.studies.find((item) => item.id === id);
  if (!study) return false;

  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value.trim();
  const type = document.getElementById('modal-item-type').value;
  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');

  if (!name) {
    showFeedback('Informe um nome válido para o estudo.', 'warn');
    return false;
  }

  study.name = name;
  study.emoji = emoji || '📚';
  study.type = type;
  study.days = days;

  updateUI({ mode: 'activity' });
  showFeedback('Estudo atualizado com sucesso!', 'success');
  return true;
}

// Manipular novo livro
function handleNewBook() {
  const name = document.getElementById('book-name').value;
  const author = document.getElementById('book-author').value;
  const emoji = document.getElementById('book-emoji').value;
  const status = document.getElementById('book-status')?.value || 'quero-ler';

  appData.books.push(createBookPayload(name, emoji, status, author));
  updateUI();
  showFeedback('Livro cadastrado com sucesso!', 'success');
  return true;
}

function handleEditBook() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const book = appData.books.find((item) => item.id === id);
  if (!book) return false;

  const name = document.getElementById('book-name').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const emoji = document.getElementById('book-emoji').value.trim();
  const status = document.getElementById('book-status')?.value || 'quero-ler';

  if (!name) {
    showFeedback('Informe um nome válido para o livro.', 'warn');
    return false;
  }

  book.name = name;
  book.author = author;
  book.emoji = emoji || '📖';
  if (!book.completed) {
    book.status = status === 'lendo' ? 'lendo' : 'quero-ler';
  }

  updateUI({ mode: 'activity' });
  showFeedback('Livro atualizado com sucesso!', 'success');
  return true;
}

function getProgressionApi() {
  return globalThis.AppProgression || {};
}

function addHeroCoins(amount) {
  const currentCoins = Number.isFinite(appData.hero?.coins) ? appData.hero.coins : 0;
  const coinDelta = Number.isFinite(Number(amount)) ? Math.trunc(Number(amount)) : 0;
  const nextCoins = Math.max(0, currentCoins + coinDelta);
  appData.hero.coins = nextCoins;
  return nextCoins - currentCoins;
}

function addTrackerXP(entity, amount, mode = 'cyclic') {
  if (!entity) return null;

  const progressionApi = getProgressionApi();
  const advanceFn =
    mode === 'linear' ? progressionApi.advanceLinearProgress : progressionApi.advanceCyclicProgress;
  if (typeof advanceFn !== 'function') return null;

  const nextState = advanceFn(entity, amount, { step: 100 });
  entity.xp = nextState.xp;
  entity.level = nextState.level;
  entity.maxXp = nextState.maxXp;
  return nextState;
}

function applyRewardPackage(options = {}) {
  const {
    heroXp = 0,
    coins = 0,
    attributeRewards = [],
    classRewards = [],
    trackerRewards = [],
  } = options;

  attributeRewards.forEach((reward) => {
    if (!reward) return;
    addAttributeXP(reward.id, reward.amount);
  });

  classRewards.forEach((reward) => {
    if (!reward) return;
    addClassXP(reward.id, reward.amount);
  });

  trackerRewards.forEach((reward) => {
    if (!reward || !reward.entity) return;
    addTrackerXP(reward.entity, reward.amount, reward.mode);
  });

  if (heroXp) {
    addXP(heroXp);
  }

  if (coins) {
    addHeroCoins(coins);
  }
}

function buildAttributeRewards(attributeIds = [], amountPerAttribute = 1, wealthAmount = amountPerAttribute) {
  return (Array.isArray(attributeIds) ? attributeIds : []).map((attrId) => ({
    id: attrId,
    amount: attrId === 14 ? wealthAmount : amountPerAttribute,
  }));
}

function ensurePendingFailureReviews() {
  if (!Array.isArray(appData.pendingFailureReviews)) {
    appData.pendingFailureReviews = [];
  }
  return appData.pendingFailureReviews;
}

function getActivityHistoryListByCategory(category) {
  if (category === 'work') return appData.completedWorks;
  if (category === 'workout') return appData.completedWorkouts;
  if (category === 'study') return appData.completedStudies;
  return appData.completedMissions;
}

function getActiveActivityListByCategory(category) {
  return category === 'work' ? appData.works : appData.missions;
}

function getActivityLabelByCategory(category) {
  if (category === 'work') return 'trabalho';
  if (category === 'workout') return 'treino';
  if (category === 'study') return 'estudo';
  return 'missão';
}

function getActivityLineageKey(item, category = 'mission') {
  if (category === 'workout') {
    return String(item?.workoutId || item?.id || '');
  }
  if (category === 'study') {
    return String(item?.studyId || item?.id || '');
  }
  return String(item?.originalId || item?.id || '');
}

function getActivityResolvedDate(entry) {
  return entry?.completedDate || entry?.failedDate || entry?.skippedDate || entry?.date || '';
}

function hasResolvedActivityForDate(category, item, missedDate) {
  const lineageKey = getActivityLineageKey(item, category);
  if (!lineageKey || !missedDate) return false;
  return getActivityHistoryListByCategory(category).some(
    (entry) =>
      getActivityLineageKey(entry, category) === lineageKey &&
      getActivityResolvedDate(entry) === missedDate
  );
}

function queuePendingFailureReview(category, item, options = {}) {
  const pendingReviews = ensurePendingFailureReviews();
  const missedDate = String(options.missedDate || item?.dateAdded || getLocalDateString()).trim();
  const lineageKey = getActivityLineageKey(item, category);
  if (!item || !lineageKey || !missedDate) return false;
  if (hasResolvedActivityForDate(category, item, missedDate)) return false;

  const alreadyQueued = pendingReviews.some(
    (review) =>
      review?.category === category &&
      String(review.lineageKey || '') === lineageKey &&
      String(review.missedDate || '') === missedDate
  );
  if (alreadyQueued) return false;

  pendingReviews.push({
    id: createUniqueId(pendingReviews),
    category,
    lineageKey,
    missedDate,
    reason: String(options.reason || '').trim(),
    activity: JSON.parse(JSON.stringify(item)),
    createdAt: new Date().toISOString(),
  });
  return true;
}

function inferLastDailyResetForStartupReview(todayStr) {
  if (appData.serverMeta?.lastDailyReset) {
    return appData.serverMeta.lastDailyReset;
  }
  if (
    window.AppRules &&
    typeof window.AppRules.inferLegacyLastDailyResetDate === 'function'
  ) {
    return window.AppRules.inferLegacyLastDailyResetDate(appData, todayStr);
  }
  return null;
}

function shouldPrepareStartupFailureReviews() {
  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  return inferLastDailyResetForStartupReview(todayStr) === yesterdayStr;
}

function prepareStartupFailureReviews() {
  if (!shouldPrepareStartupFailureReviews()) return 0;

  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const yesterdayDayOfWeek = yesterday.getDay();
  const workOffYesterday =
    typeof isWorkOffDay === 'function' && isWorkOffDay(yesterdayStr);
  let queuedCount = 0;

  const collectPendingReviews = (category) => {
    const activeList = getActiveActivityListByCategory(category);
    const historyList = getActivityHistoryListByCategory(category);
    const indexesToRemove = [];

    activeList.forEach((item, index) => {
      if (!item || item.completed || item.failed) return;

      const isRoutine = typeof isRoutineType === 'function' && isRoutineType(item.type);
      const availableFrom = item.availableDate || item.dateAdded || todayStr;
      const alreadyLoggedYesterday =
        typeof wasItemLoggedForDate === 'function'
          ? wasItemLoggedForDate(item, historyList, yesterdayStr)
          : hasResolvedActivityForDate(category, item, yesterdayStr);
      const shouldQueueRoutineReview =
        isRoutine &&
        availableFrom <= yesterdayStr &&
        getRoutineDays(item).includes(yesterdayDayOfWeek) &&
        !alreadyLoggedYesterday &&
        !(category === 'work' && workOffYesterday);
      const shouldQueueOverdueReview =
        typeof isOneOffScheduledItemOverdue === 'function' &&
        isOneOffScheduledItemOverdue(item, todayStr);

      let missedDate = '';
      let reason = '';
      if (shouldQueueOverdueReview) {
        missedDate =
          typeof getOneOffScheduledFailureDateKey === 'function'
            ? getOneOffScheduledFailureDateKey(item)
            : todayStr;
        reason =
          item.type === 'epica'
            ? 'Falha no dia seguinte ao prazo (Épica)'
            : 'Falha no dia seguinte ao prazo (eventual)';
      } else if (shouldQueueRoutineReview) {
        missedDate = yesterdayStr;
        reason = 'Rotina não concluída no dia programado';
      }

      if (!missedDate) return;
      if (!queuePendingFailureReview(category, item, { missedDate, reason })) return;

      indexesToRemove.push(index);
      queuedCount += 1;
    });

    indexesToRemove
      .sort((a, b) => b - a)
      .forEach((index) => {
        activeList.splice(index, 1);
      });
  };

  const buildWorkoutReviewSnapshot = (workoutDay, workout, missedDate) => ({
    workoutId: workoutDay?.workoutId || workout?.id || null,
    date: missedDate,
    name: workout?.name || workoutDay?.name || 'Treino',
    emoji: workout?.emoji || workoutDay?.emoji || '💪',
    type: workout?.type || workoutDay?.type || 'normal',
    objectiveId: workout?.objectiveId || null,
    priority: workout?.priority || 'medium',
    impact: workout?.impact || 'medium',
    effort: workout?.effort || 'medium',
    energy: workout?.energy || 'medium',
    feedback: workoutDay?.feedback || '',
    series: Array.isArray(workoutDay?.series) ? [...workoutDay.series] : [null, null, null],
    distance: workoutDay?.distance ?? null,
    time: workoutDay?.time ?? null,
  });

  const buildStudyReviewSnapshot = (studyDay, study, missedDate) => ({
    studyId: studyDay?.studyId || study?.id || null,
    date: missedDate,
    name: study?.name || studyDay?.name || 'Estudo',
    emoji: study?.emoji || studyDay?.emoji || '📚',
    type: study?.type || studyDay?.type || 'logico',
    objectiveId: study?.objectiveId || null,
    priority: study?.priority || 'medium',
    impact: study?.impact || 'medium',
    effort: study?.effort || 'medium',
    energy: study?.energy || 'medium',
    applied: Boolean(studyDay?.applied),
    feedback: studyDay?.feedback || '',
  });

  const collectPendingDailyReviews = (category) => {
    const isWorkout = category === 'workout';
    const dailyList = isWorkout ? appData.dailyWorkouts || [] : appData.dailyStudies || [];
    const sourceList = isWorkout ? appData.workouts || [] : appData.studies || [];
    const historyList = getActivityHistoryListByCategory(category);
    const idField = isWorkout ? 'workoutId' : 'studyId';
    const indexesToRemove = [];

    dailyList.forEach((item, index) => {
      if (!item || item.date !== yesterdayStr || item.completed || item.skipped || item.failed) return;
      const source = sourceList.find(
        (entry) => String(entry?.id || '') === String(item?.[idField] || '')
      );
      const reviewActivity = isWorkout
        ? buildWorkoutReviewSnapshot(item, source, yesterdayStr)
        : buildStudyReviewSnapshot(item, source, yesterdayStr);
      if (
        !queuePendingFailureReview(category, reviewActivity, {
          missedDate: yesterdayStr,
          reason: `${getActivityLabelByCategory(category)} não concluído no dia`,
        })
      ) {
        return;
      }
      indexesToRemove.push(index);
      queuedCount += 1;
    });

    indexesToRemove
      .sort((a, b) => b - a)
      .forEach((index) => {
        dailyList.splice(index, 1);
      });

    sourceList.forEach((source) => {
      const sourceId = String(source?.id || '');
      if (!sourceId) return;
      const availableFrom = source.availableDate || source.dateAdded || todayStr;
      const scheduledForYesterday =
        Array.isArray(source.days) &&
        source.days.some((day) => normalizeWeekdayValue(day) === yesterdayDayOfWeek) &&
        availableFrom <= yesterdayStr;
      if (!scheduledForYesterday) return;

      const alreadyLogged = historyList.some(
        (entry) =>
          getActivityLineageKey(entry, category) === sourceId &&
          getActivityResolvedDate(entry) === yesterdayStr
      );
      if (alreadyLogged) return;

      const hadDailyEntry = dailyList.some(
        (item) =>
          String(item?.[idField] || '') === sourceId &&
          String(item?.date || '') === yesterdayStr
      );
      if (hadDailyEntry) return;

      const reviewActivity = isWorkout
        ? buildWorkoutReviewSnapshot(null, source, yesterdayStr)
        : buildStudyReviewSnapshot(null, source, yesterdayStr);
      if (
        queuePendingFailureReview(category, reviewActivity, {
          missedDate: yesterdayStr,
          reason: `${getActivityLabelByCategory(category)} não concluído no dia`,
        })
      ) {
        queuedCount += 1;
      }
    });
  };

  collectPendingReviews('mission');
  collectPendingReviews('work');
  collectPendingDailyReviews('workout');
  collectPendingDailyReviews('study');
  return queuedCount;
}

function getPendingRoutineReviewsForDate(category, dateKey) {
  return ensurePendingFailureReviews().filter(
    (review) =>
      review?.category === category &&
      review?.missedDate === dateKey &&
      review?.activity &&
      typeof isRoutineType === 'function' &&
      isRoutineType(review.activity.type)
  );
}

function getPendingFailureReviewsForDate(category, dateKey) {
  return ensurePendingFailureReviews().filter(
    (review) => review?.category === category && review?.missedDate === dateKey
  );
}

function discardResolvedPendingFailureReview(review) {
  if (review?.id !== undefined) {
    removePendingFailureReview(review.id);
  }
  return false;
}

function recordCompletedMissionFromReview(mission, completedDate, review = null) {
  if (!mission || !completedDate) return false;
  if (hasResolvedActivityForDate('mission', mission, completedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const completedAt = buildHistoryActionTimestamp(completedDate);
  const record = {
    ...mission,
    completed: true,
    failed: false,
    skipped: false,
    completedDate,
    completedAt,
    confirmedNextDay: true,
    confirmedNextDayAt: new Date().toISOString(),
  };
  delete record.failedDate;
  delete record.failedAt;
  delete record.skippedDate;
  delete record.skippedAt;
  delete record.penaltyApplied;
  delete record.reason;
  delete record.missedDate;

  appData.completedMissions.push(record);

  let xpGained = 1;
  let coinsGained = 1;
  let attributeRewards = [];
  if (mission.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    attributeRewards = buildAttributeRewards(mission.attributes, 20, 100);
  } else {
    attributeRewards = buildAttributeRewards(mission.attributes, 1, 20);
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: coinsGained,
    attributeRewards,
  });

  if (!appData.statistics) appData.statistics = {};
  appData.statistics.missionsDone = (appData.statistics.missionsDone || 0) + 1;
  updateProductiveDay(0, 1, 0, xpGained, 0, {
    date: completedDate,
    xpMission: xpGained,
  });

  addHeroLog(
    'mission',
    `Missão concluída: ${mission.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s). Confirmada no dia seguinte.`,
    {
      category: 'mission',
      sourceId: getActivityLineageKey(mission, 'mission'),
      eventDateKey: completedDate,
      status: 'completed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(
      `Missão "${mission.name}" confirmada como concluída em ${completedDate}.`,
      'success'
    );
  }

  return true;
}

function recordCompletedWorkFromReview(work, completedDate, review = null) {
  if (!work || !completedDate) return false;
  if (hasResolvedActivityForDate('work', work, completedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const completedAt = buildHistoryActionTimestamp(completedDate);
  const record = {
    ...work,
    completed: true,
    failed: false,
    skipped: false,
    completedDate,
    completedAt,
    confirmedNextDay: true,
    confirmedNextDayAt: new Date().toISOString(),
  };
  delete record.failedDate;
  delete record.failedAt;
  delete record.skippedDate;
  delete record.skippedAt;
  delete record.penaltyApplied;
  delete record.reason;
  delete record.missedDate;

  appData.completedWorks.push(record);

  let xpGained = 1;
  let coinsGained = 1;
  let attributeRewards = [];
  if (work.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    attributeRewards = buildAttributeRewards(work.attributes || [], 20, 100);
  } else {
    attributeRewards = buildAttributeRewards(work.attributes || [], 1, 1);
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: coinsGained,
    attributeRewards,
    classRewards: work.classId ? [{ id: work.classId, amount: xpGained }] : [],
  });

  if (!appData.statistics) appData.statistics = {};
  appData.statistics.worksDone = (appData.statistics.worksDone || 0) + 1;
  updateProductiveDay(0, 0, 0, xpGained, 1, {
    date: completedDate,
    xpWork: xpGained,
  });

  addHeroLog(
    'mission',
    `Trabalho concluído: ${work.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s). Confirmado no dia seguinte.`,
    {
      category: 'work',
      sourceId: getActivityLineageKey(work, 'work'),
      eventDateKey: completedDate,
      status: 'completed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(
      `Trabalho "${work.name}" confirmado como concluído em ${completedDate}.`,
      'success'
    );
  }

  return true;
}

function recordFailedMissionFromReview(mission, missedDate, review = null) {
  if (!mission || !missedDate) return false;
  if (hasResolvedActivityForDate('mission', mission, missedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const failedAt = buildHistoryActionTimestamp(missedDate);
  appData.completedMissions.push({
    ...mission,
    completedDate: missedDate,
    failedAt,
    failedDate: missedDate,
    failed: true,
    penaltyApplied: false,
    reason: review?.reason || 'Não concluída no dia',
    missedDate,
    reviewedNextDay: true,
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: missedDate,
    missionsMissed: 1,
  });
  applyPenalties(missedDate, { onlyTypes: ['mission'] });

  addHeroLog(
    'mission',
    `Tarefa falhada: ${mission.name}`,
    `Falha confirmada no dia seguinte para ${missedDate}. Penalidades aplicadas no pipeline diário.`,
    {
      category: 'mission',
      sourceId: getActivityLineageKey(mission, 'mission'),
      eventDateKey: missedDate,
      status: 'failed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(`Missão "${mission.name}" mantida como falha em ${missedDate}.`, 'warn');
  }

  return true;
}

function recordFailedWorkFromReview(work, missedDate, review = null) {
  if (!work || !missedDate) return false;
  if (hasResolvedActivityForDate('work', work, missedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const failedAt = buildHistoryActionTimestamp(missedDate);
  appData.completedWorks.push({
    ...work,
    completedDate: missedDate,
    failedAt,
    failedDate: missedDate,
    failed: true,
    penaltyApplied: false,
    reason: review?.reason || 'Não concluído no dia',
    missedDate,
    reviewedNextDay: true,
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: missedDate,
    worksMissed: 1,
  });
  applyPenalties(missedDate, { onlyTypes: ['work'] });

  addHeroLog(
    'mission',
    `Trabalho falhado: ${work.name}`,
    `Falha confirmada no dia seguinte para ${missedDate}. Penalidades aplicadas no pipeline diário.`,
    {
      category: 'work',
      sourceId: getActivityLineageKey(work, 'work'),
      eventDateKey: missedDate,
      status: 'failed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(`Trabalho "${work.name}" mantido como falha em ${missedDate}.`, 'warn');
  }

  return true;
}

function recordCompletedWorkoutFromReview(workoutDay, completedDate, review = null) {
  if (!workoutDay || !completedDate) return false;
  if (hasResolvedActivityForDate('workout', workoutDay, completedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const workout = (appData.workouts || []).find(
    (entry) => String(entry?.id || '') === String(workoutDay.workoutId || '')
  );
  const completedAt = buildHistoryActionTimestamp(completedDate);

  if (!appData.completedWorkouts.some((entry) => entry.workoutId === workoutDay.workoutId && entry.date === completedDate)) {
    appData.completedWorkouts.push({
      id: createUniqueId(appData.completedWorkouts),
      workoutId: workoutDay.workoutId,
      name: workoutDay.name || workout?.name || 'Treino',
      emoji: workoutDay.emoji || workout?.emoji || '💪',
      type: workoutDay.type || workout?.type || 'normal',
      date: completedDate,
      completedDate,
      completedAt,
      failed: false,
      series: Array.isArray(workoutDay.series) ? [...workoutDay.series] : [null, null, null],
      distance: workoutDay.distance ?? null,
      time: workoutDay.time ?? null,
      feedback: workoutDay.feedback || '',
      objectiveId: workoutDay.objectiveId || workout?.objectiveId || null,
      priority: workoutDay.priority || workout?.priority || 'medium',
      impact: workoutDay.impact || workout?.impact || 'medium',
      effort: workoutDay.effort || workout?.effort || 'medium',
      energy: workoutDay.energy || workout?.energy || 'medium',
      confirmedNextDay: true,
      confirmedNextDayAt: new Date().toISOString(),
    });
  }

  const attributeRewards = [{ id: 2, amount: 1 }];
  if (workoutDay.type === 'menor-tempo') {
    attributeRewards.push({ id: 3, amount: 1 });
  }
  if (workoutDay.type === 'repeticao' || workoutDay.type === 'maior-tempo') {
    attributeRewards.push({ id: 1, amount: 1 });
  }
  if (workoutDay.type === 'distancia') {
    attributeRewards.push({ id: 6, amount: 1 });
  }

  if (workout?.stats) {
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  } else if (workout) {
    workout.stats = { completed: 1 };
  }

  applyRewardPackage({
    heroXp: 3,
    coins: 1,
    attributeRewards,
    trackerRewards: workout ? [{ entity: workout, amount: 10, mode: 'cyclic' }] : [],
  });

  if (!appData.statistics) appData.statistics = {};
  appData.statistics.workoutsDone = (appData.statistics.workoutsDone || 0) + 1;
  updateProductiveDay(1, 0, 0, 3, 0, {
    date: completedDate,
    xpWorkout: 3,
  });

  addHeroLog(
    'workout',
    `Treino concluído: ${workoutDay.name || workout?.name || 'Treino'}`,
    '+3 XP, +1 moeda. Confirmado no dia seguinte.',
    {
      category: 'workout',
      sourceId: getActivityLineageKey(workoutDay, 'workout'),
      eventDateKey: completedDate,
      status: 'completed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(
      `Treino "${workoutDay.name || workout?.name || 'Treino'}" confirmado como concluído em ${completedDate}.`,
      'success'
    );
  }

  return true;
}

function recordCompletedStudyFromReview(studyDay, completedDate, review = null) {
  if (!studyDay || !completedDate) return false;
  if (hasResolvedActivityForDate('study', studyDay, completedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  const study = (appData.studies || []).find(
    (entry) => String(entry?.id || '') === String(studyDay.studyId || '')
  );
  const completedAt = buildHistoryActionTimestamp(completedDate);

  if (!appData.completedStudies.some((entry) => entry.studyId === studyDay.studyId && entry.date === completedDate)) {
    appData.completedStudies.push({
      id: createUniqueId(appData.completedStudies),
      studyId: studyDay.studyId,
      name: studyDay.name || study?.name || 'Estudo',
      emoji: studyDay.emoji || study?.emoji || '📚',
      type: studyDay.type || study?.type || 'logico',
      date: completedDate,
      completedDate,
      completedAt,
      failed: false,
      applied: Boolean(studyDay.applied),
      feedback: studyDay.feedback || '',
      objectiveId: studyDay.objectiveId || study?.objectiveId || null,
      priority: studyDay.priority || study?.priority || 'medium',
      impact: studyDay.impact || study?.impact || 'medium',
      effort: studyDay.effort || study?.effort || 'medium',
      energy: studyDay.energy || study?.energy || 'medium',
      confirmedNextDay: true,
      confirmedNextDayAt: new Date().toISOString(),
    });
  }

  let xpGained = 1;
  const attributeRewards = [{ id: 12, amount: 1 }];
  if (studyDay.type === 'criativo') {
    attributeRewards.push({ id: 5, amount: 3 });
  }
  if (studyDay.applied) {
    xpGained += 2;
    attributeRewards.push({ id: 12, amount: 2 });
    attributeRewards.push({ id: 7, amount: 3 });
  }

  if (study?.stats) {
    study.stats.completed = (study.stats.completed || 0) + 1;
    if (studyDay.applied) {
      study.stats.applied = (study.stats.applied || 0) + 1;
    }
  } else if (study) {
    study.stats = {
      completed: 1,
      applied: studyDay.applied ? 1 : 0,
    };
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: 1,
    attributeRewards,
    trackerRewards: study ? [{ entity: study, amount: 5, mode: 'cyclic' }] : [],
  });

  if (!appData.statistics) appData.statistics = {};
  appData.statistics.studiesDone = (appData.statistics.studiesDone || 0) + 1;
  updateProductiveDay(0, 0, 1, xpGained, 0, {
    date: completedDate,
    xpStudy: xpGained,
  });

  addHeroLog(
    'study',
    `Estudo concluído: ${studyDay.name || study?.name || 'Estudo'}`,
    `+${xpGained} XP, +1 moeda${studyDay.applied ? ' (aplicado)' : ''}. Confirmado no dia seguinte.`,
    {
      category: 'study',
      sourceId: getActivityLineageKey(studyDay, 'study'),
      eventDateKey: completedDate,
      status: 'completed',
    }
  );

  if (typeof showFeedback === 'function') {
    showFeedback(
      `Estudo "${studyDay.name || study?.name || 'Estudo'}" confirmado como concluído em ${completedDate}.`,
      'success'
    );
  }

  return true;
}

function recordFailedWorkoutFromReview(workoutDay, missedDate, review = null) {
  if (!workoutDay || !missedDate) return false;
  if (hasResolvedActivityForDate('workout', workoutDay, missedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  appData.completedWorkouts.push({
    id: createUniqueId(appData.completedWorkouts),
    workoutId: workoutDay.workoutId,
    name: workoutDay.name || 'Treino',
    emoji: workoutDay.emoji || '💪',
    type: workoutDay.type || 'normal',
    date: missedDate,
    completedDate: missedDate,
    failedDate: missedDate,
    failedAt: buildHistoryActionTimestamp(missedDate),
    failed: true,
    penaltyApplied: false,
    reason: review?.reason || 'Atividade não completada',
    feedback: workoutDay.feedback || '',
    objectiveId: workoutDay.objectiveId || null,
  });
  applyPenalties(missedDate, { onlyTypes: ['workout'] });

  if (typeof showFeedback === 'function') {
    showFeedback(`Treino "${workoutDay.name || 'Treino'}" mantido como falha em ${missedDate}.`, 'warn');
  }

  return true;
}

function recordFailedStudyFromReview(studyDay, missedDate, review = null) {
  if (!studyDay || !missedDate) return false;
  if (hasResolvedActivityForDate('study', studyDay, missedDate)) {
    return discardResolvedPendingFailureReview(review);
  }
  if (review) removePendingFailureReview(review.id);

  appData.completedStudies.push({
    id: createUniqueId(appData.completedStudies),
    studyId: studyDay.studyId,
    name: studyDay.name || 'Estudo',
    emoji: studyDay.emoji || '📚',
    type: studyDay.type || 'logico',
    date: missedDate,
    completedDate: missedDate,
    failedDate: missedDate,
    failedAt: buildHistoryActionTimestamp(missedDate),
    failed: true,
    penaltyApplied: false,
    reason: review?.reason || 'Atividade não completada',
    feedback: studyDay.feedback || '',
    objectiveId: studyDay.objectiveId || null,
  });
  applyPenalties(missedDate, { onlyTypes: ['study'] });

  if (typeof showFeedback === 'function') {
    showFeedback(`Estudo "${studyDay.name || 'Estudo'}" mantido como falha em ${missedDate}.`, 'warn');
  }

  return true;
}

function removePendingFailureReview(reviewId) {
  const pendingReviews = ensurePendingFailureReviews();
  const reviewIndex = pendingReviews.findIndex((review) => Number(review?.id) === Number(reviewId));
  if (reviewIndex === -1) return false;
  pendingReviews.splice(reviewIndex, 1);
  return true;
}

function resolvePendingFailureReview(review, wasCompleted) {
  if (!review || !review.activity || !review.category) return false;
  if (review.category === 'workout') {
    return wasCompleted
      ? recordCompletedWorkoutFromReview(review.activity, review.missedDate, review)
      : recordFailedWorkoutFromReview(review.activity, review.missedDate, review);
  }
  if (review.category === 'study') {
    return wasCompleted
      ? recordCompletedStudyFromReview(review.activity, review.missedDate, review)
      : recordFailedStudyFromReview(review.activity, review.missedDate, review);
  }
  if (review.category === 'work') {
    return wasCompleted
      ? recordCompletedWorkFromReview(review.activity, review.missedDate, review)
      : recordFailedWorkFromReview(review.activity, review.missedDate, review);
  }
  return wasCompleted
    ? recordCompletedMissionFromReview(review.activity, review.missedDate, review)
    : recordFailedMissionFromReview(review.activity, review.missedDate, review);
}

async function processPendingFailureReviews() {
  if (window.__pendingFailureReviewInFlight === true) return false;

  const pendingReviews = ensurePendingFailureReviews().slice();
  if (pendingReviews.length === 0) return false;

  window.__pendingFailureReviewInFlight = true;
  try {
    for (const review of pendingReviews) {
      const item = review.activity;
      if (!item) {
        removePendingFailureReview(review.id);
        continue;
      }
      if (hasResolvedActivityForDate(review.category, item, review.missedDate)) {
        removePendingFailureReview(review.id);
        continue;
      }

      const label = getActivityLabelByCategory(review.category);
      const formattedDate =
        typeof formatDate === 'function' ? formatDate(review.missedDate) : review.missedDate;
      const confirmed = await askConfirmation(
        `No dia ${formattedDate}, você concluiu a ${label} "${item.name}"?`,
        {
          title: 'Revisar atividade falhada',
          confirmText: 'Concluí',
          cancelText: 'Não concluí',
          returnNullOnDismiss: true,
        }
      );
      if (confirmed === null) {
        break;
      }
      resolvePendingFailureReview(review, confirmed);
      if (typeof saveToLocalStorage === 'function') {
        saveToLocalStorage();
      }
    }
  } finally {
    window.__pendingFailureReviewInFlight = false;
  }

  if (typeof updateStreaks === 'function') {
    updateStreaks();
  }
  if (typeof updateUI === 'function') {
    updateUI({ mode: 'full', forceNutrition: true });
  }
  return true;
}

// Manipular conclusão de treino
function handleWorkoutCompletion() {
  const workoutDayId = parseInt(document.getElementById('workout-day-id').value);
  const feedback = document.getElementById('workout-feedback')?.value || '';

  const workoutDay = appData.dailyWorkouts.find((dw) => dw.id === workoutDayId);
  if (!workoutDay) return false;
  if (workoutDay.completed || workoutDay.skipped || workoutDay.failed) return false;

  const workout = appData.workouts.find((w) => w.id === workoutDay.workoutId);
  if (!workout) return false;
  const completedDateKey = getLocalDateString();
  const completedAt = buildHistoryActionTimestamp(completedDateKey);

  // Atualizar valores
  if (workout.type === 'repeticao') {
    const series1 = parseInt(document.querySelector('input[name="series-0"]')?.value || 0);
    const series2 = parseInt(document.querySelector('input[name="series-1"]')?.value || 0);
    const series3 = parseInt(document.querySelector('input[name="series-2"]')?.value || 0);

    workoutDay.series = [series1, series2, series3];
    const bestSetReps = getBestWorkoutSetValue(workoutDay.series);

    // Calcular total de repetições
    const totalReps = getWorkoutDayTotalReps(workoutDay.series);

    // Atualizar estatísticas do treino
    if (!workout.stats) workout.stats = {};
    workout.stats.totalReps = (workout.stats.totalReps || 0) + totalReps;
    workout.stats.bestDayReps = Math.max(
      getWorkoutBestDayRepsRecord(workout, appData.completedWorkouts || []),
      totalReps
    );
    workout.stats.bestSetReps = Math.max(
      getWorkoutBestRepsRecord(workout, appData.completedWorkouts || []),
      bestSetReps
    );
    workout.stats.bestReps = workout.stats.bestDayReps;
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  } else if (workout.type === 'distancia') {
    const distance = parseFloat(document.querySelector('input[name="distance"]')?.value || 0);
    const timeMin = parseFloat(document.querySelector('input[name="time-min"]')?.value || 0);
    const timeSec = parseFloat(document.querySelector('input[name="time-sec"]')?.value || 0);
    const time = (timeMin * 60) + timeSec;
    const speed = getWorkoutSpeedValue(distance, time);
    workoutDay.distance = distance;
    workoutDay.time = time;

    if (!workout.stats) workout.stats = {};
    workout.stats.totalDistance = (workout.stats.totalDistance || 0) + distance;
    workout.stats.bestDistance = Math.max(workout.stats.bestDistance || 0, distance);
    workout.stats.bestSpeed = Math.max(
      getWorkoutBestSpeedRecord(workout, appData.completedWorkouts || []),
      speed
    );
    workout.stats.totalTime = (workout.stats.totalTime || 0) + time;
    if (time > 0) {
      if (workout.stats.bestTime === undefined || time < workout.stats.bestTime) {
        workout.stats.bestTime = time;
      }
    }
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  } else if (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') {
    const timeMin = parseFloat(document.querySelector('input[name="time-min"]')?.value || 0);
    const timeSec = parseFloat(document.querySelector('input[name="time-sec"]')?.value || 0);
    const time = (timeMin * 60) + timeSec;
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
      objectiveId: workout.objectiveId || null,
      objectiveName: workout.objectiveId ? appData.objectives.find((objective) => objective.id === workout.objectiveId)?.name || '' : '',
      feedback: feedback,
      date: new Date().toISOString(),
    });
  }

  // Registrar no histórico de treinos (evitar duplicidade)
  const workoutHistoryExists = appData.completedWorkouts.some(
    (w) => w.workoutId === workoutDay.workoutId && w.date === workoutDay.date
  );
  if (!workoutHistoryExists) {
    appData.completedWorkouts.push({
      id: createUniqueId(appData.completedWorkouts),
      workoutId: workoutDay.workoutId,
      name: workout.name,
      emoji: workout.emoji,
      type: workout.type,
      date: workoutDay.date,
      completedDate: completedDateKey,
      completedAt,
      failed: false,
      series: workoutDay.series || [null, null, null],
      distance: workoutDay.distance ?? null,
      time: workoutDay.time ?? null,
      feedback: workoutDay.feedback || '',
      objectiveId: workout.objectiveId || null,
      priority: workout.priority || 'medium',
      impact: workout.impact || 'medium',
      effort: workout.effort || 'medium',
      energy: workout.energy || 'medium',
    });
  }

  // Calcular XP e recompensas
  let xpGained = 3; // XP geral base
  const attributeRewards = [{ id: 2, amount: 1 }]; // Vigor sempre ganha XP

  if (workout.type === 'menor-tempo') {
    attributeRewards.push({ id: 3, amount: 1 }); // Agilidade
  }

  if (workout.type === 'repeticao' || workout.type === 'maior-tempo') {
    attributeRewards.push({ id: 1, amount: 1 }); // Força
  }

  if (workout.type === 'distancia') {
    attributeRewards.push({ id: 6, amount: 1 }); // Disciplina
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: 1,
    attributeRewards,
    trackerRewards: [{ entity: workout, amount: 10, mode: 'cyclic' }],
  });

  // Atualizar streak

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.workoutsDone = (appData.statistics.workoutsDone || 0) + 1;

  // Atualizar dia produtivo
  updateProductiveDay(1, 0, 0, xpGained, 0, { xpWorkout: xpGained });

  addHeroLog(
    'workout',
    `Treino concluído: ${workout.name}`,
    `+${xpGained} XP, +1 moeda`,
    {
      category: 'workout',
      sourceId: String(workoutDay.workoutId || workout.id || ''),
      eventDateKey: completedDateKey,
      status: 'completed',
    }
  );

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-workouts',
    xp: xpGained,
    coins: 1,
    message: 'Treino concluído com sucesso!',
  });
  saveToLocalStorage();
  return true;
}

// Manipular conclusão de estudo via modal
function handleStudyCompletion() {
  const studyDayId = parseInt(document.getElementById('study-day-id').value);
  const feedback = document.getElementById('study-feedback')?.value || '';

  return completeStudy(studyDayId, feedback);
}

// Manipular conclusão de missão via modal
function handleMissionCompletion() {
  const missionId = parseInt(document.getElementById('mission-id').value);
  const feedback = document.getElementById('mission-feedback')?.value || '';

  return completeMission(missionId, feedback);
}

function handleWorkCompletion() {
  const workId = parseInt(document.getElementById('work-id').value, 10);
  const feedback = document.getElementById('work-feedback')?.value || '';
  return completeWork(workId, feedback);
}

function handleBookCompletion() {
  const bookId = parseInt(document.getElementById('book-id').value, 10);
  const feedback = document.getElementById('book-feedback')?.value || '';
  return completeBook(bookId, feedback);
}

// Concluir estudo
function completeStudy(studyDayId, feedbackText = '') {
  const studyDay = appData.dailyStudies.find((ds) => ds.id === studyDayId);
  if (!studyDay) return false;
  if (studyDay.completed || studyDay.skipped || studyDay.failed) return false;

  const study = appData.studies.find((s) => s.id === studyDay.studyId);
  if (!study) return false;
  const completedDateKey = getLocalDateString();
  const completedAt = buildHistoryActionTimestamp(completedDateKey);

  // Marcar como concluído
  studyDay.completed = true;
  studyDay.feedback = feedbackText;

  // Registrar no histórico de estudos (evitar duplicidade)
  const studyHistoryExists = appData.completedStudies.some(
    (s) => s.studyId === studyDay.studyId && s.date === studyDay.date
  );
  if (!studyHistoryExists) {
    appData.completedStudies.push({
      id: createUniqueId(appData.completedStudies),
      studyId: studyDay.studyId,
      name: study.name,
      emoji: study.emoji,
      type: study.type,
      date: studyDay.date,
      completedDate: completedDateKey,
      completedAt,
      failed: false,
      applied: !!studyDay.applied,
      feedback: studyDay.feedback || '',
      objectiveId: study.objectiveId || null,
      priority: study.priority || 'medium',
      impact: study.impact || 'medium',
      effort: study.effort || 'medium',
      energy: study.energy || 'medium',
    });
  }

  // Adicionar feedback
  if (feedbackText) {
    appData.feedbacks.push({
      type: 'study',
      activityId: studyDay.studyId,
      objectiveId: study.objectiveId || null,
      objectiveName: study.objectiveId ? appData.objectives.find((objective) => objective.id === study.objectiveId)?.name || '' : '',
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  // Calcular XP
  let xpGained = 1; // XP geral base
  const attributeRewards = [{ id: 12, amount: 1 }]; // Conhecimento base

  // 3 XP de criatividade se for do tipo criativo
  if (study.type === 'criativo') {
    attributeRewards.push({ id: 5, amount: 3 }); // Criatividade
  }

  // Bônus se foi aplicado
  if (studyDay.applied) {
    xpGained += 2; // +2 XP geral
    attributeRewards.push({ id: 12, amount: 2 }); // +2 XP de conhecimento
    attributeRewards.push({ id: 7, amount: 3 }); // +3 XP de inteligência
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: 1,
    attributeRewards,
    trackerRewards: [{ entity: study, amount: 5, mode: 'cyclic' }],
  });

  // Atualizar estatísticas do estudo
  if (!study.stats) study.stats = {};
  study.stats.completed = (study.stats.completed || 0) + 1;
  if (studyDay.applied) {
    study.stats.applied = (study.stats.applied || 0) + 1;
  }

  // Atualizar streak

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.studiesDone = (appData.statistics.studiesDone || 0) + 1;

  // Atualizar dia produtivo
  updateProductiveDay(0, 0, 1, xpGained, 0, { xpStudy: xpGained });

  addHeroLog(
    'study',
    `Estudo concluído: ${study.name}`,
    `+${xpGained} XP, +1 moeda${studyDay.applied ? ' (aplicado)' : ''}`,
    {
      category: 'study',
      sourceId: String(studyDay.studyId || study.id || ''),
      eventDateKey: completedDateKey,
      status: 'completed',
    }
  );

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-studies',
    xp: xpGained,
    coins: 1,
    message: 'Estudo concluído com sucesso!',
  });
  saveToLocalStorage();
  return true;
}

// Concluir livro
function completeBook(bookId, feedbackText = '') {
  const book = appData.books.find((b) => b.id === bookId);
  if (!book) return false;
  if (book.completed || book.status === 'concluido') return false;

  book.completed = true;
  book.status = 'concluido';
  const completedDateKey = getLocalDateString();
  const completedAt = buildHistoryActionTimestamp(completedDateKey);
  book.dateCompleted = completedDateKey;
  book.completedDate = completedDateKey;
  book.completedAt = completedAt;
  book.feedback = feedbackText;

  if (feedbackText) {
    appData.feedbacks.push({
      type: 'book',
      activityId: bookId,
      objectiveId: book.objectiveId || null,
      objectiveName: book.objectiveId ? appData.objectives.find((objective) => objective.id === book.objectiveId)?.name || '' : '',
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  applyRewardPackage({
    heroXp: 20,
    attributeRewards: [{ id: 12, amount: 20 }],
  });

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.booksRead = (appData.statistics.booksRead || 0) + 1;
  updateProductiveDay(0, 0, 0, 20, 0, { xpBook: 20 });

  addHeroLog('book', `Livro concluído: ${book.name}`, '+20 XP', {
    category: 'book',
    sourceId: String(book.id || ''),
    eventDateKey: completedDateKey,
    status: 'completed',
  });

  showFeedback('Livro concluído com sucesso!', 'success');
  updateUI();
  saveToLocalStorage();
  return true;
}

// Manipular envio do formulário de missão
function handleClassSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('class-name')?.value?.trim();
  const emoji = document.getElementById('class-emoji')?.value?.trim();
  if (!name) return;

  const newClass = {
    id: createUniqueId(appData.classes),
    name,
    emoji: emoji || '💼',
    xp: 0,
    maxXp: 100,
    level: 0,
  };

  appData.classes.push(newClass);
  if (!appData.hero.primaryClassId) {
    appData.hero.primaryClassId = newClass.id;
  }

  e.target.reset();
  updateUI();
  showFeedback('Classe cadastrada com sucesso!', 'success');
}

function handleFinanceSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('finance-type').value;
  const amount = parseFloat(document.getElementById('finance-amount').value);
  const category = document.getElementById('finance-category').value.trim();
  const description = document.getElementById('finance-desc').value.trim();
  const date = document.getElementById('finance-date')?.value || getLocalDateString();

  if (!type || isNaN(amount) || amount <= 0 || !date) {
    showFeedback('Informe valor e data válidos.', 'warn');
    return;
  }

  appData.financeEntries.push({
    id: createUniqueId(appData.financeEntries),
    type,
    amount,
    category,
    description,
    date,
  });

  e.target.reset();
  const financeDateInput = document.getElementById('finance-date');
  if (financeDateInput) financeDateInput.value = getLocalDateString();
  updateUI({ mode: 'finance' });
}

function updateActivityForm() {
  const category = document.getElementById('activity-category')?.value || 'mission';
  const scheduleType = document.getElementById('activity-schedule-type')?.value || 'rotina';
  const editIdValue = parseInt(document.getElementById('activity-edit-id')?.value || '', 10);
  const currentItem =
    Number.isFinite(editIdValue) && (category === 'mission' || category === 'work')
      ? (category === 'mission' ? appData.missions : appData.works).find((item) => item.id === editIdValue) || null
      : null;
  const dueDateWasLocked =
    currentItem?.dueDateLocked === true &&
    (currentItem?.type === 'eventual' || currentItem?.type === 'epica');

  const scheduleContainer = document.getElementById('activity-schedule-container');
  const workoutTypeContainer = document.getElementById('activity-workout-type-container');
  const studyTypeContainer = document.getElementById('activity-study-type-container');
  const daysContainer = document.getElementById('activity-days-container');
  const dateContainer = document.getElementById('activity-date-container');
  const deadlineContainer = document.getElementById('activity-deadline-container');
  const dueLockContainer = document.getElementById('activity-due-lock-container');
  const dueLockInput = document.getElementById('activity-due-lock');
  const dueLockHint = document.getElementById('activity-due-lock-hint');
  const scheduleTypeInput = document.getElementById('activity-schedule-type');
  const dateInput = document.getElementById('activity-date');
  const deadlineInput = document.getElementById('activity-deadline');
  const attributesContainer = document.getElementById('activity-attributes-container');
  const classContainer = document.getElementById('activity-class-container');
  const urgentContainer = document.getElementById('activity-urgent-container');
  const bookAuthorContainer = document.getElementById('activity-book-author-container');
  const bookStatusContainer = document.getElementById('activity-book-status-container');

  if (!scheduleContainer) return;

  const isMission = category === 'mission';
  const isWork = category === 'work';
  const isWorkout = category === 'workout';
  const isStudy = category === 'study';
  const isBook = category === 'book';
  const supportsScheduleType = isMission || isWork;

  scheduleContainer.style.display = supportsScheduleType ? 'block' : 'none';
  workoutTypeContainer.style.display = isWorkout ? 'block' : 'none';
  studyTypeContainer.style.display = isStudy ? 'block' : 'none';
  if (bookAuthorContainer) bookAuthorContainer.style.display = isBook ? 'block' : 'none';
  if (bookStatusContainer) bookStatusContainer.style.display = isBook ? 'block' : 'none';
  attributesContainer.style.display = isMission || isWork ? 'block' : 'none';
  classContainer.style.display = isWork ? 'block' : 'none';
  urgentContainer.style.display = isWork ? 'block' : 'none';

  daysContainer.style.display = 'none';
  dateContainer.style.display = 'none';
  deadlineContainer.style.display = 'none';
  if (dueLockContainer) dueLockContainer.style.display = 'none';

  if (!supportsScheduleType || scheduleType === 'rotina') {
    daysContainer.style.display = 'block';
  } else if (scheduleType === 'eventual') {
    dateContainer.style.display = 'block';
    if (dateInput && !dateInput.value) dateInput.value = getLocalDateString();
  } else if (scheduleType === 'epica') {
    deadlineContainer.style.display = 'block';
    if (deadlineInput && !deadlineInput.value) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      deadlineInput.value = getLocalDateString(nextWeek);
    }
  }

  const shouldShowDueLock = supportsDueDateLock(category, scheduleType);
  if (dueLockContainer) dueLockContainer.style.display = shouldShowDueLock ? 'block' : 'none';
  if (scheduleTypeInput) scheduleTypeInput.disabled = dueDateWasLocked;
  if (dateInput) {
    dateInput.disabled = dueDateWasLocked && currentItem?.type === 'eventual';
    dateInput.title =
      dateInput.disabled ? 'O prazo desta atividade foi trancado e não pode mais ser alterado.' : '';
  }
  if (deadlineInput) {
    deadlineInput.disabled = dueDateWasLocked && currentItem?.type === 'epica';
    deadlineInput.title =
      deadlineInput.disabled ? 'O prazo desta atividade foi trancado e não pode mais ser alterado.' : '';
  }
  if (dueLockInput) {
    if (dueDateWasLocked) {
      dueLockInput.checked = true;
    } else if (!shouldShowDueLock) {
      dueLockInput.checked = false;
    }
    dueLockInput.disabled = dueDateWasLocked;
  }
  if (dueLockHint) {
    if (dueDateWasLocked) {
      dueLockHint.textContent = 'Prazo trancado: esse campo não pode mais ser alterado depois de salvo.';
    } else if (shouldShowDueLock && dueLockInput?.checked) {
      dueLockHint.textContent = 'Esse prazo será permanente depois de salvar esta atividade.';
    } else {
      dueLockHint.textContent = 'Marque para impedir alterações futuras no prazo desta atividade.';
    }
  }
}

function setActivityFormSubmitLabel(isEditing) {
  const submitButton = document.querySelector('#activity-form button[type="submit"]');
  if (!submitButton) return;
  submitButton.textContent = isEditing ? 'Atualizar Atividade' : 'Cadastrar Atividade';
}

function clearActivityEditState(options = {}) {
  const editIdInput = document.getElementById('activity-edit-id');
  if (editIdInput) editIdInput.value = '';
  setActivityFormSubmitLabel(false);

  if (options.resetForm === true) {
    document.getElementById('activity-form')?.reset();
    updateActivityForm();
  }
}

function handleActivitySubmit(e) {
  e.preventDefault();

  const category = document.getElementById('activity-category')?.value || 'mission';
  const editIdInput = document.getElementById('activity-edit-id');
  const editIdValue = editIdInput ? parseInt(editIdInput.value, 10) : null;
  const isEditing = Number.isFinite(editIdValue);
  const name = document.getElementById('activity-name')?.value?.trim();
  const emoji = document.getElementById('activity-emoji')?.value?.trim();
  const scheduleType = document.getElementById('activity-schedule-type')?.value || 'rotina';
  const dateValue = document.getElementById('activity-date')?.value || '';
  const deadlineValue = document.getElementById('activity-deadline')?.value || '';
  const dueDateLockRequested = document.getElementById('activity-due-lock')?.checked === true;
  const daySelector =
    '#activity-days-container input[type="checkbox"]:checked:not([data-select-all])';
  const selectedDays = Array.from(document.querySelectorAll(daySelector)).map((cb) =>
    parseInt(cb.value, 10)
  );
  const existingMission = isEditing ? appData.missions.find((item) => item.id === editIdValue) : null;
  const existingWork = isEditing ? appData.works.find((item) => item.id === editIdValue) : null;
  const existingScheduledItem =
    category === 'mission' ? existingMission : category === 'work' ? existingWork : null;
  const resolvedScheduleState = resolveScheduledActivityFormState(existingScheduledItem, {
    scheduleType,
    dateValue,
    deadlineValue,
    dueDateLocked: dueDateLockRequested,
  });
  const planningFields =
    typeof readActivityPlanningFields === 'function'
      ? readActivityPlanningFields()
      : {
          objectiveId: null,
          priority: 'medium',
          impact: 'medium',
          effort: 'medium',
          energy: 'medium',
        };

  if (!name) {
    showFeedback('Informe um nome válido para a atividade.', 'warn');
    return;
  }

  if (
    (category === 'mission' ||
      category === 'work' ||
      category === 'workout' ||
      category === 'study') &&
    selectedDays.length === 0 &&
    (category === 'workout' || category === 'study' || scheduleType === 'rotina')
  ) {
    showFeedback('Selecione pelo menos um dia da semana.', 'warn');
    return;
  }

  if (category === 'mission' || category === 'work') {
    const scheduleValidationMessage = getOneOffScheduleValidationMessage(
      resolvedScheduleState.scheduleType,
      resolvedScheduleState.scheduleType === 'epica'
        ? resolvedScheduleState.deadlineValue
        : resolvedScheduleState.dateValue
    );
    if (scheduleValidationMessage) {
      showFeedback(scheduleValidationMessage, 'warn');
      return;
    }
  }

  if (category === 'mission') {
    const attributes = Array.from(
      document.querySelectorAll('#activity-attributes input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value, 10));
    const mission = existingMission;
    const targetMission =
      mission ||
      {
        id: createUniqueId(appData.missions, appData.completedMissions),
        completed: false,
        dateAdded: getLocalDateString(),
      };
    targetMission.name = name;
    targetMission.emoji = emoji || '🎯';
    targetMission.type = resolvedScheduleState.scheduleType;
    targetMission.attributes = attributes;
    delete targetMission.days;
    delete targetMission.date;
    delete targetMission.deadline;
    delete targetMission.dueDateLocked;
    if (resolvedScheduleState.scheduleType !== 'rotina') {
      delete targetMission.originalId;
    }
    if (resolvedScheduleState.scheduleType === 'rotina') {
      targetMission.days = selectedDays;
      targetMission.originalId = targetMission.originalId || targetMission.id;
    } else if (resolvedScheduleState.scheduleType === 'eventual') {
      targetMission.date = resolvedScheduleState.dateValue || getLocalDateString();
    } else {
      targetMission.deadline = resolvedScheduleState.deadlineValue;
    }
    if (resolvedScheduleState.dueDateLocked) {
      targetMission.dueDateLocked = true;
    }
    if (typeof applyPlanningFields === 'function') {
      applyPlanningFields(targetMission, planningFields);
    }
    if (!mission) appData.missions.push(targetMission);
  } else if (category === 'work') {
    const attributes = Array.from(
      document.querySelectorAll('#activity-attributes input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value, 10));
    const classIdRaw = document.getElementById('activity-class')?.value;
    const classId = classIdRaw ? parseInt(classIdRaw, 10) : null;
    const work = existingWork;
    const targetWork =
      work ||
      {
        id: createUniqueId(appData.works, appData.completedWorks),
        completed: false,
        dateAdded: getLocalDateString(),
      };
    targetWork.name = name;
    targetWork.emoji = emoji || '💼';
    targetWork.type = resolvedScheduleState.scheduleType;
    targetWork.attributes = attributes;
    targetWork.classId = Number.isFinite(classId) ? classId : null;
    targetWork.urgent = document.getElementById('activity-urgent')?.checked === true;
    delete targetWork.days;
    delete targetWork.date;
    delete targetWork.deadline;
    delete targetWork.dueDateLocked;
    if (resolvedScheduleState.scheduleType !== 'rotina') {
      delete targetWork.originalId;
    }
    if (resolvedScheduleState.scheduleType === 'rotina') {
      targetWork.days = selectedDays;
      targetWork.originalId = targetWork.originalId || targetWork.id;
    } else if (resolvedScheduleState.scheduleType === 'eventual') {
      targetWork.date = resolvedScheduleState.dateValue || getLocalDateString();
    } else {
      targetWork.deadline = resolvedScheduleState.deadlineValue;
    }
    if (resolvedScheduleState.dueDateLocked) {
      targetWork.dueDateLocked = true;
    }
    if (typeof applyPlanningFields === 'function') {
      applyPlanningFields(targetWork, planningFields);
    }
    if (!work) appData.works.push(targetWork);
  } else if (category === 'workout') {
    const workoutType = document.getElementById('activity-workout-type')?.value || 'repeticao';
    const existingWorkout = isEditing ? appData.workouts.find((item) => item.id === editIdValue) : null;
    const workout = existingWorkout || createWorkoutPayload(name, emoji, workoutType, selectedDays);
    workout.name = name;
    workout.emoji = emoji || '💪';
    workout.type = workoutType;
    workout.days = selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5];
    workout.dateAdded = workout.dateAdded || getLocalDateString();
    if (typeof applyPlanningFields === 'function') {
      applyPlanningFields(workout, planningFields);
    }
    if (!existingWorkout) appData.workouts.push(workout);
  } else if (category === 'study') {
    const studyType = document.getElementById('activity-study-type')?.value || 'logico';
    const existingStudy = isEditing ? appData.studies.find((item) => item.id === editIdValue) : null;
    const study = existingStudy || createStudyPayload(name, emoji, studyType, selectedDays);
    study.name = name;
    study.emoji = emoji || '📚';
    study.type = studyType;
    study.days = selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5];
    study.dateAdded = study.dateAdded || getLocalDateString();
    if (typeof applyPlanningFields === 'function') {
      applyPlanningFields(study, planningFields);
    }
    if (!existingStudy) appData.studies.push(study);
  } else if (category === 'book') {
    const author = document.getElementById('activity-book-author')?.value?.trim() || '';
    const status = document.getElementById('activity-book-status')?.value || 'quero-ler';
    if (isEditing) {
      const book = appData.books.find((b) => b.id === editIdValue);
      if (book) {
        book.name = name;
        book.author = author;
        book.emoji = emoji || '📖';
        if (!book.completed) {
          book.status = status === 'lendo' ? 'lendo' : 'quero-ler';
        }
        if (typeof applyPlanningFields === 'function') {
          applyPlanningFields(book, planningFields);
        }
      }
    } else {
      const book = createBookPayload(name, emoji, status, author);
      if (typeof applyPlanningFields === 'function') {
        applyPlanningFields(book, planningFields);
      }
      appData.books.push(book);
    }
  }

  clearActivityEditState();
  e.target.reset();
  updateActivityForm();
  updateUI({ mode: 'activity' });
  showFeedback(isEditing ? 'Atividade atualizada com sucesso!' : 'Atividade cadastrada com sucesso!', 'success');
}

//Formulário de missão baseado no tipo
// Completar uma missão (função corrigida - VERSÃO FINAL)
function completeMission(missionId, feedbackText = '') {
  const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
  if (missionIndex === -1) return false;

  const mission = appData.missions[missionIndex];
  const todayStr = getLocalDateString();
  const completedAt = buildHistoryActionTimestamp(todayStr);
  const isRoutine = isRoutineType(mission.type);
  const routineAlreadyResolvedToday =
    isRoutine &&
    appData.completedMissions.some(
      (entry) =>
        String(entry.originalId || entry.id) === String(mission.originalId || mission.id) &&
        (entry.completedDate === todayStr ||
          entry.failedDate === todayStr ||
          entry.skippedDate === todayStr)
    );
  if (routineAlreadyResolvedToday) return false;

  if (!isRoutine) {
    mission.completed = true;
    mission.completedDate = todayStr;
    mission.completedAt = completedAt;
  }

  // Registrar feedback (opcional)
  if (feedbackText) {
    mission.feedback = feedbackText;
    appData.feedbacks.push({
      type: 'mission',
      activityId: missionId,
      objectiveId: mission.objectiveId || null,
      objectiveName: mission.objectiveId ? appData.objectives.find((objective) => objective.id === mission.objectiveId)?.name || '' : '',
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  // 1. PRIMEIRO: Mover para missões concluídas
  appData.completedMissions.push({
    ...mission,
    completed: true,
    completedDate: todayStr,
    completedAt,
  });

  // 2. SEGUNDO: Remover da lista de missões ativas (IMEDIATAMENTE)
  if (!isRoutine) {
    appData.missions.splice(missionIndex, 1);
  }

  // 4. Aplicar recompensas
  let xpGained = 1;
  let coinsGained = 1;
  let attributeRewards = [];

  if (mission.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    attributeRewards = buildAttributeRewards(mission.attributes, 20, 100);
  } else {
    attributeRewards = buildAttributeRewards(mission.attributes, 1, 20);
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: coinsGained,
    attributeRewards,
  });

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.missionsDone = (appData.statistics.missionsDone || 0) + 1;
  updateProductiveDay(0, 1, 0, xpGained, 0, { xpMission: xpGained });

  addHeroLog(
    'mission',
    `Missão concluída: ${mission.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s)`,
    {
      category: 'mission',
      sourceId: String(mission.originalId || mission.id || ''),
      eventDateKey: todayStr,
      status: 'completed',
    }
  );

  // 5. ATUALIZAR UI IMEDIATAMENTE (ANTES DO ALERT)
  updateUI({ mode: 'activity' });

  // 6. Mostrar feedback visual
  const missionDoneMessage = `Missão "${mission.name}" concluída! ${
    isRoutine ? 'Ela reaparecerá conforme os dias marcados.' : ''
  }`;
  celebrateAction({
    containerSelector: '#daily-missions',
    xp: xpGained,
    coins: coinsGained,
    message: missionDoneMessage,
  });
  saveToLocalStorage();
  return true;
}

function completeWork(workId, feedbackText = '') {
  const workIndex = appData.works.findIndex((w) => w.id === workId);
  if (workIndex === -1) return false;

  const work = appData.works[workIndex];
  const todayStr = getLocalDateString();
  const completedAt = buildHistoryActionTimestamp(todayStr);
  const isRoutine = isRoutineType(work.type);
  const routineAlreadyResolvedToday =
    isRoutine &&
    appData.completedWorks.some(
      (entry) =>
        String(entry.originalId || entry.id) === String(work.originalId || work.id) &&
        (entry.completedDate === todayStr ||
          entry.failedDate === todayStr ||
          entry.skippedDate === todayStr)
    );
  if (routineAlreadyResolvedToday) return false;

  if (!isRoutine) {
    work.completed = true;
    work.completedDate = todayStr;
    work.completedAt = completedAt;
  }

  if (feedbackText) {
    work.feedback = feedbackText;
    appData.feedbacks.push({
      type: 'work',
      activityId: workId,
      objectiveId: work.objectiveId || null,
      objectiveName: work.objectiveId ? appData.objectives.find((objective) => objective.id === work.objectiveId)?.name || '' : '',
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  appData.completedWorks.push({
    ...work,
    completed: true,
    completedDate: todayStr,
    completedAt,
  });
  if (!isRoutine) {
    appData.works.splice(workIndex, 1);
  }

  let xpGained = 1;
  let coinsGained = 1;
  let attributeRewards = [];
  if (work.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    attributeRewards = buildAttributeRewards(work.attributes || [], 20, 100);
  } else {
    attributeRewards = buildAttributeRewards(work.attributes || [], 1, 1);
  }

  applyRewardPackage({
    heroXp: xpGained,
    coins: coinsGained,
    attributeRewards,
    classRewards: work.classId ? [{ id: work.classId, amount: xpGained }] : [],
  });
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.worksDone = (appData.statistics.worksDone || 0) + 1;
  updateProductiveDay(0, 0, 0, xpGained, 1, { xpWork: xpGained });

  addHeroLog(
    'mission',
    `Trabalho concluído: ${work.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s)`,
    {
      category: 'work',
      sourceId: String(work.originalId || work.id || ''),
      eventDateKey: todayStr,
      status: 'completed',
    }
  );

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-works',
    xp: xpGained,
    coins: coinsGained,
    message: `Trabalho "${work.name}" concluído! ${
      isRoutine ? 'Ele reaparecerá conforme os dias marcados.' : ''
    }`,
  });
  saveToLocalStorage();
  return true;
}

// Recriar rotinas para o dia atual
function recreateDailyMissionsForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const yesterdayRoutineMissionsByLineage = new Map();
  appData.completedMissions.forEach((mission) => {
    if (!isRoutineType(mission.type)) return;
    const missionDate = mission.completedDate || mission.failedDate || mission.skippedDate;
    if (missionDate !== yesterdayStr) return;
    const lineageKey = String(mission.originalId || mission.id);
    if (!yesterdayRoutineMissionsByLineage.has(lineageKey)) {
      yesterdayRoutineMissionsByLineage.set(lineageKey, mission);
    }
  });
  getPendingRoutineReviewsForDate('mission', yesterdayStr).forEach((review) => {
    const mission = review.activity;
    const lineageKey = String(mission.originalId || mission.id);
    if (!yesterdayRoutineMissionsByLineage.has(lineageKey)) {
      yesterdayRoutineMissionsByLineage.set(lineageKey, mission);
    }
  });

  yesterdayRoutineMissionsByLineage.forEach((originalMission, lineageKey) => {
    const alreadyExists = appData.missions.some(
      (mission) =>
        isRoutineType(mission.type) &&
        String(mission.originalId || mission.id) === lineageKey &&
        mission.dateAdded === todayStr
    );

    if (!alreadyExists) {
      const newMission = {
        id: createUniqueId(appData.missions, appData.completedMissions),
        originalId: originalMission.originalId || originalMission.id,
        name: originalMission.name,
        emoji: originalMission.emoji || '🎯',
        type: 'rotina',
        attributes: [...originalMission.attributes],
        days: getRoutineDays(originalMission),
        completed: false,
        dateAdded: todayStr,
      };

      appData.missions.push(newMission);
      console.log(`Rotina "${originalMission.name}" recriada para hoje (${todayStr})`);
    }
  });
}

// Limpar rotinas antigas que não foram completadas
function cleanupOldDailyMissions() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const missionsToRemove = [];

  appData.missions.forEach((mission, index) => {
    if (
      isRoutineType(mission.type) &&
      !mission.completed &&
      !mission.failed &&
      mission.dateAdded &&
      mission.dateAdded < todayStr
    ) {
      const failedDate = mission.dateAdded;
      const alreadyResolved = appData.completedMissions.some(
        (entry) =>
          String(entry.originalId || entry.id) === String(mission.originalId || mission.id) &&
          (entry.completedDate === failedDate ||
            entry.failedDate === failedDate ||
            entry.skippedDate === failedDate)
      );
      if (!alreadyResolved) {
        const failedAt = buildHistoryActionTimestamp(failedDate);
        appData.completedMissions.push({
          ...mission,
          completedDate: failedDate,
          failedAt,
          failedDate: failedDate,
          failed: true,
          penaltyApplied: false,
          reason: 'Não concluída no dia',
          missedDate: failedDate,
        });
        updateProductiveDay(0, 0, 0, 0, 0, {
          date: failedDate,
          missionsMissed: 1,
        });
        applyPenalties(failedDate, { onlyTypes: ['mission'] });
      }
      console.log(`Removendo rotina antiga: ${mission.name} (adicionada em ${mission.dateAdded})`);
      missionsToRemove.push(index);
    }
  });

  missionsToRemove.sort((a, b) => b - a);
  missionsToRemove.forEach((index) => {
    appData.missions.splice(index, 1);
  });

  if (missionsToRemove.length > 0) {
    console.log(`Removidas ${missionsToRemove.length} rotinas antigas de missões`);
  }
}

function recreateDailyWorksForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const yesterdayRoutineWorksByLineage = new Map();
  appData.completedWorks.forEach((work) => {
    if (!isRoutineType(work.type)) return;
    const workDate = work.completedDate || work.failedDate || work.skippedDate;
    if (workDate !== yesterdayStr) return;
    const lineageKey = String(work.originalId || work.id);
    if (!yesterdayRoutineWorksByLineage.has(lineageKey)) {
      yesterdayRoutineWorksByLineage.set(lineageKey, work);
    }
  });
  getPendingRoutineReviewsForDate('work', yesterdayStr).forEach((review) => {
    const work = review.activity;
    const lineageKey = String(work.originalId || work.id);
    if (!yesterdayRoutineWorksByLineage.has(lineageKey)) {
      yesterdayRoutineWorksByLineage.set(lineageKey, work);
    }
  });

  yesterdayRoutineWorksByLineage.forEach((originalWork, lineageKey) => {
    const alreadyExists = appData.works.some(
      (work) =>
        isRoutineType(work.type) &&
        String(work.originalId || work.id) === lineageKey &&
        work.dateAdded === todayStr
    );

    if (!alreadyExists) {
      appData.works.push({
        id: createUniqueId(appData.works, appData.completedWorks),
        originalId: originalWork.originalId || originalWork.id,
        name: originalWork.name,
        emoji: originalWork.emoji || '💼',
        type: 'rotina',
        attributes: [...originalWork.attributes],
        days: getRoutineDays(originalWork),
        classId: originalWork.classId || null,
        completed: false,
        dateAdded: todayStr,
      });
    }
  });
}

function cleanupOldDailyWorks() {
  const todayStr = getLocalDateString();
  const worksToRemove = [];

  appData.works.forEach((work, index) => {
    if (
      isRoutineType(work.type) &&
      !work.completed &&
      !work.failed &&
      work.dateAdded &&
      work.dateAdded < todayStr
    ) {
      const failedDate = work.dateAdded;
      const alreadyResolved = appData.completedWorks.some(
        (entry) =>
          String(entry.originalId || entry.id) === String(work.originalId || work.id) &&
          (entry.completedDate === failedDate ||
            entry.failedDate === failedDate ||
            entry.skippedDate === failedDate)
      );
      if (!alreadyResolved) {
        const workOffActive =
          typeof isWorkOffDay === 'function' && isWorkOffDay(failedDate);
        const resolvedAt = buildHistoryActionTimestamp(failedDate);
        if (workOffActive) {
          appData.completedWorks.push({
            ...work,
            skipped: true,
            skippedAt: resolvedAt,
            skippedDate: failedDate,
            penaltyApplied: true,
            reason: 'Folga de trabalho',
            missedDate: failedDate,
          });
        } else {
          appData.completedWorks.push({
            ...work,
            completedDate: failedDate,
            failedAt: resolvedAt,
            failedDate: failedDate,
            failed: true,
            penaltyApplied: false,
            reason: 'Não concluído no dia',
            missedDate: failedDate,
          });
          updateProductiveDay(0, 0, 0, 0, 0, {
            date: failedDate,
            worksMissed: 1,
          });
          applyPenalties(failedDate, { onlyTypes: ['work'] });
        }
      }
      worksToRemove.push(index);
    }
  });

  worksToRemove.sort((a, b) => b - a);
  worksToRemove.forEach((index) => {
    appData.works.splice(index, 1);
  });
}

function ensureProductiveDaySnapshot(data = {}) {
  return {
    workouts: Number(data.workouts || 0),
    missions: Number(data.missions || 0),
    works: Number(data.works || 0),
    studies: Number(data.studies || 0),
    workoutsMissed: Number(data.workoutsMissed || 0),
    missionsMissed: Number(data.missionsMissed || 0),
    worksMissed: Number(data.worksMissed || 0),
    studiesMissed: Number(data.studiesMissed || 0),
    workoutsIgnored: Number(data.workoutsIgnored || 0),
    missionsIgnored: Number(data.missionsIgnored || 0),
    worksIgnored: Number(data.worksIgnored || 0),
    studiesIgnored: Number(data.studiesIgnored || 0),
    xpMission: Number(data.xpMission || 0),
    xpWork: Number(data.xpWork || 0),
    xpWorkout: Number(data.xpWorkout || 0),
    xpStudy: Number(data.xpStudy || 0),
    xpBook: Number(data.xpBook || 0),
    nutritionFailed: Number(data.nutritionFailed || 0),
    hydrationFailed: Number(data.hydrationFailed || 0),
    totalXP: Number(data.totalXP || 0),
  };
}

function ensureProductiveDayEntry(dateKey = getLocalDateString()) {
  const safeDateKey = dateKey || getLocalDateString();

  if (!appData.statistics) appData.statistics = {};
  if (!appData.statistics.productiveDays) {
    appData.statistics.productiveDays = {};
  }

  appData.statistics.productiveDays[safeDateKey] = ensureProductiveDaySnapshot(
    appData.statistics.productiveDays[safeDateKey]
  );

  return appData.statistics.productiveDays[safeDateKey];
}

// Atualizar dia produtivo
function updateProductiveDay(
  workouts = 0,
  missions = 0,
  studies = 0,
  xp = 0,
  works = 0,
  options = {}
) {
  const productiveDay = ensureProductiveDayEntry(options.date || getLocalDateString());

  productiveDay.workouts += Number(workouts || 0);
  productiveDay.missions += Number(missions || 0);
  productiveDay.works += Number(works || 0);
  productiveDay.studies += Number(studies || 0);
  productiveDay.workoutsMissed += Number(options.workoutsMissed || 0);
  productiveDay.missionsMissed += Number(options.missionsMissed || 0);
  productiveDay.worksMissed += Number(options.worksMissed || 0);
  productiveDay.studiesMissed += Number(options.studiesMissed || 0);
  productiveDay.workoutsIgnored += Number(options.workoutsIgnored || 0);
  productiveDay.missionsIgnored += Number(options.missionsIgnored || 0);
  productiveDay.worksIgnored += Number(options.worksIgnored || 0);
  productiveDay.studiesIgnored += Number(options.studiesIgnored || 0);
  productiveDay.xpMission += Number(options.xpMission || 0);
  productiveDay.xpWork += Number(options.xpWork || 0);
  productiveDay.xpWorkout += Number(options.xpWorkout || 0);
  productiveDay.xpStudy += Number(options.xpStudy || 0);
  productiveDay.xpBook += Number(options.xpBook || 0);
  productiveDay.nutritionFailed += Number(options.nutritionFailed || 0);
  productiveDay.hydrationFailed += Number(options.hydrationFailed || 0);
  productiveDay.totalXP += Number(xp || 0);
}

// Comprar item (atualizado para verificar nível)
function buyItem(itemId) {
  const item = appData.shopItems.find((i) => i.id === itemId);
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
    purchaseDate: new Date().toISOString(),
  });

  // Atualizar UI
  updateUI({ mode: 'shop' });

  // Mostrar feedback de compra
  celebrateAction({
    containerSelector: '#shop-items',
    coins: -item.cost,
    message: `${item.name} comprado com sucesso!`,
  });
  addHeroLog('item', `Item comprado: ${item.name}`, `-${item.cost} moedas`);
}

function getMysteryGiftPool() {
  return (appData.shopItems || []).filter((item) => item && item.effect === 'custom');
}

// Usar item do inventário (atualizado para remover apenas 1 unidade)
async function useItem(itemId) {
  // Encontrar o primeiro item deste tipo no inventário
  const itemIndex = appData.inventory.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) return;

  const item = appData.shopItems.find((i) => i.id === itemId);
  if (!item) return;

  // Remover apenas 1 unidade do inventário
  appData.inventory.splice(itemIndex, 1);

  // Aplicar efeito
  switch (item.effect) {
    case 'heal':
      showToast('Esse item legado não tem mais efeito porque o sistema de vidas foi removido.', 'info');
      addHeroLog('item', 'Item legado sem efeito', 'A antiga poção de vida foi desativada.');
      break;

    case 'skip':
      // Token de pulo e consumido automaticamente ao pular atividades.
      appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
      showFeedback('O item de pulo é usado ao clicar em "Pular" nas atividades.', 'info');
      break;

    case 'mystery-gift': {
      const rewardPool = getMysteryGiftPool();
      if (rewardPool.length === 0) {
        showFeedback(
          'Cadastre pelo menos 1 item personalizado na loja para usar o Presente Misterioso.',
          'warn'
        );
        appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
        break;
      }

      const rewardedItem = rewardPool[Math.floor(Math.random() * rewardPool.length)];
      appData.inventory.push({
        id: rewardedItem.id,
        purchaseDate: new Date().toISOString(),
        source: 'mystery-gift',
      });
      celebrateAction({
        containerSelector: '#inventory-items',
        message: `${rewardedItem.emoji || '🎁'} ${rewardedItem.name} sorteado!`,
      });
      showFeedback(
        `O Presente Misterioso sorteou "${rewardedItem.name}" para o seu inventário!`,
        'success'
      );
      addHeroLog('item', 'Presente Misterioso usado', `Item sorteado: ${rewardedItem.name}`);
      break;
    }

    case 'custom':
      showFeedback(`${item.name} usado! Recompensa: ${item.description}`, 'success');
      // Aqui você pode adicionar lógica personalizada para itens customizados
      addHeroLog('item', `Item usado: ${item.name}`, item.description || 'Recompensa aplicada.');
      break;
  }

  // Atualizar UI
  updateUI();
}

// Adicionar XP ao herói
function addXP(amount) {
  const progressionApi = getProgressionApi();
  if (typeof progressionApi.advanceHeroProgress !== 'function') {
    appData.hero.xp += amount;
    return;
  }

  const nextState = progressionApi.advanceHeroProgress(appData.hero, amount, { growthFactor: 1.5 });
  appData.hero.xp = nextState.xp;
  appData.hero.level = nextState.level;
  appData.hero.maxXp = nextState.maxXp;

  nextState.levelUps.forEach((levelUp) => {
    showToast(`Parabéns! Você alcançou o nível ${levelUp.level}!`, 'success', 2800);
    celebrateAction({
      target: document.getElementById('level'),
      message: 'Novo nível alcançado!',
    });
    addHeroLog('level', `Nível ${levelUp.level} alcançado`, `Novo XP necessário: ${levelUp.maxXp}`);
  });
}

// Adicionar XP a um atributo
function addAttributeXP(attributeId, amount) {
  const attribute = appData.attributes.find((a) => a.id === attributeId);
  if (!attribute) return;

  const progressionApi = getProgressionApi();
  if (typeof progressionApi.advanceLinearProgress !== 'function') return;

  const oldLevel = Number.isFinite(attribute.level) ? attribute.level : Math.floor((attribute.xp || 0) / 100);
  const nextState = progressionApi.advanceLinearProgress(attribute, amount, { step: 100 });
  const newLevel = nextState.level;

  attribute.xp = nextState.xp;
  attribute.maxXp = nextState.maxXp;
  attribute.level = nextState.level;

  if (newLevel > oldLevel) {
    console.log(`Atributo ${attribute.name} alcançou o nível ${newLevel}!`);
  }
}

// Causar dano aos chefões baseado em atributos
function addClassXP(classId, amount) {
  if (!Array.isArray(appData.classes)) return;
  const cls = appData.classes.find((c) => c.id === classId);
  if (!cls) return;

  const progressionApi = getProgressionApi();
  if (typeof progressionApi.advanceLinearProgress !== 'function') return;

  const oldLevel = Number.isFinite(cls.level) ? cls.level : Math.floor((cls.xp || 0) / 100);
  const nextState = progressionApi.advanceLinearProgress(cls, amount, { step: 100 });
  const newLevel = nextState.level;

  cls.xp = nextState.xp;
  cls.maxXp = nextState.maxXp;
  cls.level = nextState.level;

  if (newLevel > oldLevel) {
    console.log(`Classe ${cls.name} alcançou o nível ${newLevel}!`);
  }
}

function generateHeroLogs() {
  const container = document.getElementById('hero-logs');
  if (!container) return;

  container.innerHTML = '';
  const timelineEvents =
    typeof getUnifiedTimelineEvents === 'function' ? getUnifiedTimelineEvents().slice(0, 12) : [];

  if (timelineEvents.length > 0) {
    timelineEvents.forEach((event) => {
      const logElement = document.createElement('div');
      const isActivity = event.timelineKind === 'activity';
      const icon = isActivity
        ? event.item?.emoji || getActivityCategoryMeta(event.category).emoji
        : event.log?.type === 'level'
          ? '🏆'
          : event.log?.type === 'item'
            ? '🎁'
            : event.log?.type === 'penalty'
              ? '⚠️'
              : event.log?.type === 'system'
                ? '⚙️'
                : '📝';
      const title = isActivity ? event.title : event.title || 'Registro do herói';
      const text = isActivity
        ? event.matchedLog?.content ||
          `${getActivityCategoryMeta(event.category).label} • ${event.statusMeta?.text || 'CONCLUÍDO'}`
        : event.log?.content || 'Sem detalhes adicionais.';
      const dateLabel = isActivity
        ? formatDate(event.eventDateKey)
        : event.log?.date
          ? new Date(event.log.date).toLocaleString('pt-BR')
          : formatDate(event.eventDateKey);

      logElement.className = `log-item ${isActivity ? event.statusMeta?.tone || event.category : event.category || 'system'}`;

      const iconEl = document.createElement('div');
      iconEl.className = 'log-icon';
      iconEl.textContent = icon;

      const contentEl = document.createElement('div');
      contentEl.className = 'log-content';

      const titleEl = document.createElement('div');
      titleEl.className = 'log-title';
      titleEl.textContent = title;

      const textEl = document.createElement('div');
      textEl.className = 'log-text';
      textEl.textContent = text;

      const dateEl = document.createElement('div');
      dateEl.className = 'log-text';
      dateEl.textContent = dateLabel;

      contentEl.appendChild(titleEl);
      contentEl.appendChild(textEl);
      contentEl.appendChild(dateEl);

      logElement.appendChild(iconEl);
      logElement.appendChild(contentEl);
      container.appendChild(logElement);
    });
    return;
  }

  if (!appData.heroLogs || appData.heroLogs.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum registro ainda.</p>';
    return;
  }

  container.innerHTML = '<p class="empty-message">A linha do tempo ainda não está disponível.</p>';
}

// Inicializar gráficos

// __appActionsBridge: exposes action APIs for legacy scripts during module migration
Object.assign(globalThis, {
  handleItemFormSubmit,
  handleNewWorkout,
  handleNewStudy,
  handleNewBook,
  handleEditBook,
  handleWorkoutCompletion,
  handleStudyCompletion,
  handleMissionCompletion,
  handleWorkCompletion,
  handleBookCompletion,
  completeStudy,
  completeBook,
  handleClassSubmit,
  handleActivitySubmit,
  handleFinanceSubmit,
  updateActivityForm,
  completeMission,
  completeWork,
  prepareStartupFailureReviews,
  processPendingFailureReviews,
  recreateDailyMissionsForToday,
  cleanupOldDailyMissions,
  recreateDailyWorksForToday,
  cleanupOldDailyWorks,
  ensureProductiveDayEntry,
  updateProductiveDay,
  buyItem,
  getMysteryGiftPool,
  useItem,
  addXP,
  addAttributeXP,
  addClassXP,
  generateHeroLogs,
  getBestWorkoutSetValue,
  getWorkoutBestRepsRecord,
  getWorkoutBestDayRepsRecord,
  getWorkoutBestSpeedRecord,
  getWorkoutSpeedValue,
  buildHistoryActionTimestamp,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getOneOffScheduleValidationMessage,
    resolveScheduledActivityFormState,
    getBestWorkoutSetValue,
    getWorkoutBestRepsRecord,
    getWorkoutBestDayRepsRecord,
    getWorkoutBestSpeedRecord,
    getWorkoutSpeedValue,
    buildHistoryActionTimestamp,
    prepareStartupFailureReviews,
    processPendingFailureReviews,
    cleanupOldDailyMissions,
    cleanupOldDailyWorks,
  };
}
