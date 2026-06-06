function getActivityCategoryMeta(category) {
  switch (category) {
    case 'mission':
      return { label: 'Tarefa', emoji: '🎯', className: 'mission' };
    case 'work':
      return { label: 'Trabalho', emoji: '💼', className: 'work-kind' };
    case 'workout':
      return { label: 'Treino', emoji: '💪', className: 'workout' };
    case 'study':
      return { label: 'Estudo', emoji: '📚', className: 'study' };
    case 'book':
      return { label: 'Livro', emoji: '📖', className: 'study' };
    default:
      return { label: 'Atividade', emoji: '⭐', className: 'kind' };
  }
}

function sortActivityItems(items) {
  if (typeof comparePlannedActivities === 'function') {
    return items.sort(comparePlannedActivities);
  }
  return items.sort((a, b) => String(a.item.name || '').localeCompare(String(b.item.name || ''), 'pt-BR'));
}

function isUrgentWorkActivity(entry) {
  return entry?.category === 'work' && entry?.item?.urgent === true;
}

function compareManagedActivityEntries(left, right) {
  const leftIsUrgentWork = isUrgentWorkActivity(left);
  const rightIsUrgentWork = isUrgentWorkActivity(right);

  if (leftIsUrgentWork !== rightIsUrgentWork) {
    return leftIsUrgentWork ? -1 : 1;
  }

  if (leftIsUrgentWork && rightIsUrgentWork && typeof comparePlannedActivities === 'function') {
    const plannedDiff = comparePlannedActivities(left, right);
    if (plannedDiff !== 0) return plannedDiff;
  }

  return String(left?.item?.name || '').localeCompare(String(right?.item?.name || ''), 'pt-BR');
}

function parseLocalDateString(dateStr) {
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr !== 'string') return new Date(dateStr);
  const parts = dateStr.split('-').map((part) => parseInt(part, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function getEmergencyBadgeHtml(entry, className = 'activity-emergency-badge') {
  if (!isUrgentWorkActivity(entry)) return '';
  return `<span class="${className}">Urgente</span>`;
}

function getScheduledItemDueDateKey(item) {
  if (!item) return '';
  if (item.type === 'eventual' && item.date) {
    return getLocalDateString(parseLocalDateString(item.date));
  }
  if (item.type === 'epica' && item.deadline) {
    return getLocalDateString(parseLocalDateString(item.deadline));
  }
  return '';
}

function isOneOffScheduledItemOverdue(item, todayStr = getLocalDateString()) {
  if (!item || isRoutineType(item.type)) return false;
  const dueDateKey = getScheduledItemDueDateKey(item);
  return Boolean(dueDateKey) && dueDateKey < todayStr;
}

function getOneOffScheduledFailureDateKey(item) {
  const dueDateKey = getScheduledItemDueDateKey(item);
  if (!dueDateKey) return '';
  const failureDate = parseLocalDateString(dueDateKey);
  failureDate.setDate(failureDate.getDate() + 1);
  return getLocalDateString(failureDate);
}

function isScheduledItemVisibleToday(item, todayStr, dayOfWeek, completedList, options = {}) {
  if (!item || item.failed) return false;

  if (isRoutineType(item.type)) {
    const isScheduledToday = getRoutineDays(item).includes(dayOfWeek);
    if (!isScheduledToday) return false;
    if (options.excludeResolvedRoutine === true) {
      return !wasItemLoggedForDate(item, completedList, todayStr);
    }
    return true;
  }

  const dueDateKey = getScheduledItemDueDateKey(item);
  return Boolean(dueDateKey) && dueDateKey >= todayStr;
}

function collectVisibleScheduledItems(config) {
  const {
    sourceList,
    category,
    completedList,
    todayStr,
    dayOfWeek,
    excludeCompleted = false,
    excludeResolvedRoutine = false,
  } = config;
  const items = [];

  (sourceList || []).forEach((item) => {
    if (!item) return;
    if (excludeCompleted && item.completed) return;
    if (
      isScheduledItemVisibleToday(item, todayStr, dayOfWeek, completedList, {
        excludeResolvedRoutine,
      })
    ) {
      items.push({ category, item });
    }
  });

  return items;
}

function collectDailyTrackerItems(config) {
  const { sourceList, itemList, category, idKey, todayStr, pendingOnly = false } = config;
  const items = [];

  (sourceList || [])
    .filter((entry) => {
      if (!entry || entry.date !== todayStr) return false;
      if (!pendingOnly) return true;
      return !entry.completed && !entry.skipped;
    })
    .forEach((entry) => {
      const item = (itemList || []).find((candidate) => String(candidate.id) === String(entry[idKey]));
      if (item) items.push({ category, item, dailyEntry: entry });
    });

  return items;
}

function getAllTodayActivities() {
  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const dayOfWeek = today.getDay();
  const items = collectVisibleScheduledItems({
    sourceList: appData.missions,
    category: 'mission',
    completedList: appData.completedMissions,
    todayStr,
    dayOfWeek,
  });

  if (!isWorkOffDay(todayStr)) {
    items.push(
      ...collectVisibleScheduledItems({
        sourceList: appData.works,
        category: 'work',
        completedList: appData.completedWorks,
        todayStr,
        dayOfWeek,
      })
    );
  }

  if (!isRestDay(todayStr)) {
    items.push(
      ...collectDailyTrackerItems({
        sourceList: appData.dailyWorkouts,
        itemList: appData.workouts,
        category: 'workout',
        idKey: 'workoutId',
        todayStr,
      }),
      ...collectDailyTrackerItems({
        sourceList: appData.dailyStudies,
        itemList: appData.studies,
        category: 'study',
        idKey: 'studyId',
        todayStr,
      })
    );
  }

  (appData.books || []).forEach((book) => {
    if (!book || book.status === 'concluido') return;
    if (book.status === 'lendo') items.push({ category: 'book', item: book });
  });

  return sortActivityItems(items);
}

function updateActivityProgressBar() {
  const totalCount = document.getElementById('activity-total-count');
  const doneCount = document.getElementById('activity-done-count');
  const progressFill = document.getElementById('activity-progress-fill');
  if (!totalCount || !doneCount || !progressFill) return;

  const filter = document.getElementById('activity-filter')?.value || 'all';
  const allItems = getAllTodayActivities();
  const filteredItems = filter === 'all' ? allItems : allItems.filter((i) => i.category === filter);

  const total = filteredItems.length;
  totalCount.textContent = String(total);

  const done = filteredItems.filter(({ category, item, dailyEntry }) => {
    if (category === 'mission')
      return (
        item.completed ||
        wasItemLoggedForDate(item, appData.completedMissions, getLocalDateString())
      );
    if (category === 'work')
      return (
        item.completed || wasItemLoggedForDate(item, appData.completedWorks, getLocalDateString())
      );
    if (category === 'workout') return dailyEntry?.completed;
    if (category === 'study') return dailyEntry?.completed;
    if (category === 'book') return item.completed || item.status === 'concluido';
    return false;
  }).length;
  doneCount.textContent = String(done);

  const percent = total > 0 ? (done / total) * 100 : 0;
  progressFill.style.width = `${percent}%`;
}

function getBookActivityStatusLabel(book) {
  if (book?.completed || book?.status === 'concluido') return 'Concluído';
  return book?.status === 'lendo' ? 'Lendo' : 'Quero ler';
}

function getUnifiedTodayActivities() {
  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const dayOfWeek = today.getDay();
  const items = collectVisibleScheduledItems({
    sourceList: appData.missions,
    category: 'mission',
    completedList: appData.completedMissions,
    todayStr,
    dayOfWeek,
    excludeCompleted: true,
    excludeResolvedRoutine: true,
  });

  if (!isWorkOffDay(todayStr)) {
    items.push(
      ...collectVisibleScheduledItems({
        sourceList: appData.works,
        category: 'work',
        completedList: appData.completedWorks,
        todayStr,
        dayOfWeek,
        excludeCompleted: true,
        excludeResolvedRoutine: true,
      })
    );
  }

  if (!isRestDay(todayStr)) {
    items.push(
      ...collectDailyTrackerItems({
        sourceList: appData.dailyWorkouts,
        itemList: appData.workouts,
        category: 'workout',
        idKey: 'workoutId',
        todayStr,
        pendingOnly: true,
      }),
      ...collectDailyTrackerItems({
        sourceList: appData.dailyStudies,
        itemList: appData.studies,
        category: 'study',
        idKey: 'studyId',
        todayStr,
        pendingOnly: true,
      })
    );
  }

  (appData.books || []).forEach((book) => {
    if (!book || book.completed || book.status === 'concluido') return;
    if (book.status === 'lendo') items.push({ category: 'book', item: book });
  });

  return sortActivityItems(items);
}

function getUnifiedHistoryActivities() {
  return [
    ...(appData.completedMissions || []).map((item) => ({ category: 'mission', item })),
    ...(appData.completedWorks || []).map((item) => ({ category: 'work', item })),
    ...(appData.completedWorkouts || []).map((item) => ({ category: 'workout', item })),
    ...(appData.completedStudies || []).map((item) => ({ category: 'study', item })),
    ...(appData.books || [])
      .filter((item) => item && (item.completed || item.status === 'concluido'))
      .map((item) => ({ category: 'book', item })),
  ].sort((a, b) => {
    const timestampDelta =
      getTimelineSortTimestamp(getEventDateKey(b.item), getHistoryEventTimestamp(b.item)) -
      getTimelineSortTimestamp(getEventDateKey(a.item), getHistoryEventTimestamp(a.item));
    if (timestampDelta !== 0) return timestampDelta;
    const dateA = getEventDateKey(a.item);
    const dateB = getEventDateKey(b.item);
    return String(dateB).localeCompare(String(dateA));
  });
}

function normalizeTimelineText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getTimelineStatusMeta(item) {
  if (item?.failed) {
    return { text: 'FALHOU', className: 'failed-status', tone: 'failed' };
  }
  if (item?.skipped) {
    return { text: 'PULADO', className: 'skipped-status', tone: 'skipped' };
  }
  return { text: 'CONCLUÍDO', className: 'completed-status', tone: 'completed' };
}

function getPlannedTimelineStatusMeta() {
  return { text: 'PLANEJADO', className: 'planned-status', tone: 'planned' };
}

function getHistoryEntryTypeLabel(category, item) {
  if (category === 'workout') return getWorkoutTypeName(item.type);
  if (category === 'study') return item.type === 'logico' ? 'Lógico' : 'Criativo';
  if (category === 'book') return getBookActivityStatusLabel(item);
  return getMissionTypeName(item.type);
}

function getTimelineLogDateKey(log) {
  if (!log?.date) return '';
  const parsed = new Date(log.date);
  if (!Number.isFinite(parsed.getTime())) return '';
  return getLocalDateString(parsed);
}

function getHistoryEventTimestamp(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (entry.failed) return String(entry.failedAt || '').trim();
  if (entry.skipped) return String(entry.skippedAt || '').trim();
  return String(entry.completedAt || '').trim();
}

function getTimelineSortTimestamp(dateKey, isoDate = '') {
  const isoCandidate = String(isoDate || '').trim();
  if (isoCandidate) {
    const parsedIso = new Date(isoCandidate);
    if (Number.isFinite(parsedIso.getTime())) return parsedIso.getTime();
  }
  const safeDateKey = String(dateKey || '').trim();
  if (!safeDateKey) return 0;
  const parsedDate =
    typeof parseLocalDateString === 'function' ? parseLocalDateString(safeDateKey) : new Date(safeDateKey);
  if (!Number.isFinite(parsedDate.getTime())) return 0;
  parsedDate.setHours(12, 0, 0, 0);
  return parsedDate.getTime();
}

function formatTimelineTime(isoDate = '') {
  const isoCandidate = String(isoDate || '').trim();
  if (!isoCandidate) return '';
  const parsedIso = new Date(isoCandidate);
  if (!Number.isFinite(parsedIso.getTime())) return '';
  return parsedIso.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActivityTimelineTitle(category, item) {
  const itemName = item.name || 'Atividade';
  if (category === 'mission') {
    if (item?.failed) return `Tarefa falhada: ${itemName}`;
    if (item?.skipped) return `Tarefa pulada: ${itemName}`;
    return `Tarefa concluída: ${itemName}`;
  }
  if (category === 'work') {
    if (item?.failed) return `Trabalho falhado: ${itemName}`;
    if (item?.skipped) return `Trabalho pulado: ${itemName}`;
    return `Trabalho concluído: ${itemName}`;
  }
  if (category === 'workout') {
    if (item?.failed) return `Treino falhado: ${itemName}`;
    if (item?.skipped) return `Treino pulado: ${itemName}`;
    return `Treino concluído: ${itemName}`;
  }
  if (category === 'study') {
    if (item?.failed) return `Estudo falhado: ${itemName}`;
    if (item?.skipped) return `Estudo pulado: ${itemName}`;
    return `Estudo concluído: ${itemName}`;
  }
  if (category === 'book') return `Livro concluído: ${itemName}`;
  return `Atividade concluída: ${itemName}`;
}

function getPlannedActivityTimelineTitle(category, item) {
  const itemName = item?.name || 'Atividade';
  if (category === 'mission') return `Tarefa planejada: ${itemName}`;
  if (category === 'work') return `Trabalho planejado: ${itemName}`;
  if (category === 'workout') return `Treino planejado: ${itemName}`;
  if (category === 'study') return `Estudo planejado: ${itemName}`;
  if (category === 'book') return `Livro planejado: ${itemName}`;
  return `Atividade planejada: ${itemName}`;
}

function isFutureTimelineDate(dateKey) {
  const safeDateKey = String(dateKey || '').trim();
  if (!safeDateKey) return false;
  const todayKey = typeof getLocalDateString === 'function' ? getLocalDateString(getGameNow()) : '';
  return Boolean(todayKey) && safeDateKey > todayKey;
}

function hasScheduledHistoryEntryForDate(item, completedList, dateKey) {
  if (!item || !Array.isArray(completedList) || !dateKey) return false;
  const itemId = String(item.originalId || item.id || '').trim();
  if (!itemId) return false;
  return completedList.some((entry) => {
    const entryId = String(entry?.originalId || entry?.id || '').trim();
    const entryDateKey = getEventDateKey(entry);
    return entryId === itemId && entryDateKey === dateKey;
  });
}

function hasDailyTrackerResolutionForDate(item, completedList, pendingList, idKey, dateKey) {
  if (!item || !dateKey) return false;
  const itemId = String(item.id || '').trim();
  if (!itemId) return false;

  const inCompletedHistory = Array.isArray(completedList)
    ? completedList.some(
        (entry) =>
          String(entry?.[idKey] || entry?.id || '').trim() === itemId && getEventDateKey(entry) === dateKey
      )
    : false;
  if (inCompletedHistory) return true;

  return Array.isArray(pendingList)
    ? pendingList.some(
        (entry) =>
          String(entry?.[idKey] || '').trim() === itemId &&
          entry?.date === dateKey &&
          (entry.completed || entry.failed || entry.skipped)
      )
    : false;
}

function collectFutureScheduledItemsForDate(config) {
  const {
    sourceList,
    completedList,
    category,
    targetDateKey,
    targetDayOfWeek,
    exactDueDateOnly = false,
  } = config;
  const items = [];

  (sourceList || []).forEach((item) => {
    if (!item || item.completed || item.failed) return;

    if (isRoutineType(item.type)) {
      const availableFrom = String(item.availableDate || item.dateAdded || '').trim();
      if (availableFrom && availableFrom > targetDateKey) return;
      if (!getRoutineDays(item).includes(targetDayOfWeek)) return;
      if (hasScheduledHistoryEntryForDate(item, completedList, targetDateKey)) return;
      items.push({ category, item, plannedDateKey: targetDateKey });
      return;
    }

    const dueDateKey = getScheduledItemDueDateKey(item);
    if (!dueDateKey || dueDateKey !== targetDateKey) return;
    if (!exactDueDateOnly && dueDateKey < targetDateKey) return;
    if (hasScheduledHistoryEntryForDate(item, completedList, targetDateKey)) return;
    items.push({ category, item, plannedDateKey: targetDateKey });
  });

  return items;
}

function collectFutureTrackerItemsForDate(config) {
  const { sourceList, pendingList, completedList, category, idKey, targetDateKey, targetDayOfWeek } = config;
  const items = [];

  (sourceList || []).forEach((item) => {
    if (!item || item.completed || item.failed) return;
    if (!getRoutineDays(item).includes(targetDayOfWeek)) return;
    if (hasDailyTrackerResolutionForDate(item, completedList, pendingList, idKey, targetDateKey)) return;
    items.push({ category, item, plannedDateKey: targetDateKey });
  });

  return items;
}

function getUnifiedFutureTimelineActivities(targetDateKey) {
  const safeDateKey = String(targetDateKey || '').trim();
  if (!isFutureTimelineDate(safeDateKey)) return [];

  const targetDate =
    typeof parseLocalDateString === 'function' ? parseLocalDateString(safeDateKey) : new Date(safeDateKey);
  if (!Number.isFinite(targetDate.getTime())) return [];

  const targetDayOfWeek = targetDate.getDay();
  const items = collectFutureScheduledItemsForDate({
    sourceList: appData.missions,
    completedList: appData.completedMissions,
    category: 'mission',
    targetDateKey: safeDateKey,
    targetDayOfWeek,
    exactDueDateOnly: true,
  });

  if (!isWorkOffDay(safeDateKey)) {
    items.push(
      ...collectFutureScheduledItemsForDate({
        sourceList: appData.works,
        completedList: appData.completedWorks,
        category: 'work',
        targetDateKey: safeDateKey,
        targetDayOfWeek,
        exactDueDateOnly: true,
      })
    );
  }

  if (!isRestDay(safeDateKey)) {
    items.push(
      ...collectFutureTrackerItemsForDate({
        sourceList: appData.workouts,
        pendingList: appData.dailyWorkouts,
        completedList: appData.completedWorkouts,
        category: 'workout',
        idKey: 'workoutId',
        targetDateKey: safeDateKey,
        targetDayOfWeek,
      }),
      ...collectFutureTrackerItemsForDate({
        sourceList: appData.studies,
        pendingList: appData.dailyStudies,
        completedList: appData.completedStudies,
        category: 'study',
        idKey: 'studyId',
        targetDateKey: safeDateKey,
        targetDayOfWeek,
      })
    );
  }

  return sortActivityItems(items);
}

function getExpectedHistoryLogPrefixes(category, item) {
  if (category === 'mission') {
    if (item?.failed) return ['tarefa falhada'];
    if (item?.skipped) return ['missao pulada', 'missão pulada'];
    return ['missao concluida', 'missão concluída'];
  }
  if (category === 'work') {
    if (item?.failed) return ['trabalho falhado'];
    if (item?.skipped) return ['trabalho pulado'];
    return ['trabalho concluido', 'trabalho concluído'];
  }
  if (category === 'workout') {
    if (item?.skipped) return ['treino pulado'];
    if (item?.failed) return ['treino falhado'];
    return ['treino concluido', 'treino concluído'];
  }
  if (category === 'study') {
    if (item?.skipped) return ['estudo pulado'];
    if (item?.failed) return ['estudo falhado'];
    return ['estudo concluido', 'estudo concluído'];
  }
  if (category === 'book') return ['livro concluido', 'livro concluído'];
  return [];
}

function getTimelineHistorySourceId(category, item) {
  if (!item || typeof item !== 'object') return '';
  if (category === 'mission' || category === 'work') {
    return String(item.originalId || item.id || '').trim();
  }
  if (category === 'workout') {
    return String(item.workoutId || item.id || '').trim();
  }
  if (category === 'study') {
    return String(item.studyId || item.id || '').trim();
  }
  if (category === 'book') {
    return String(item.id || '').trim();
  }
  return '';
}

function getTimelineHistoryStatus(item) {
  if (item?.failed) return 'failed';
  if (item?.skipped) return 'skipped';
  return 'completed';
}

function doesHeroLogMetaMatchHistoryEntry(log, category, item, eventDateKey) {
  const meta = log?.meta;
  if (!meta || typeof meta !== 'object') return false;

  const logCategory = String(meta.category || '').trim();
  const logSourceId = String(meta.sourceId || '').trim();
  const logEventDateKey = String(meta.eventDateKey || '').trim();
  const logStatus = String(meta.status || '').trim();

  if (!logCategory || !logSourceId || !logEventDateKey || !logStatus) return false;

  return (
    logCategory === String(category || '') &&
    logSourceId === getTimelineHistorySourceId(category, item) &&
    logEventDateKey === String(eventDateKey || '') &&
    logStatus === getTimelineHistoryStatus(item)
  );
}

function doesHeroLogMatchHistoryEntry(log, category, item, eventDateKey) {
  if (!log || !item || !eventDateKey) return false;
  if (doesHeroLogMetaMatchHistoryEntry(log, category, item, eventDateKey)) return true;
  const logDateKey = getTimelineLogDateKey(log);
  if (logDateKey !== eventDateKey) return false;

  const allowedTypes =
    category === 'mission' || category === 'work'
      ? ['mission']
      : category === 'workout'
        ? ['workout']
        : category === 'study'
          ? ['study']
          : category === 'book'
            ? ['book']
            : [];
  if (!allowedTypes.includes(String(log.type || ''))) return false;

  const normalizedTitle = normalizeTimelineText(log.title);
  const normalizedName = normalizeTimelineText(item.name);
  if (!normalizedName || !normalizedTitle.includes(normalizedName)) return false;

  return getExpectedHistoryLogPrefixes(category, item).some((prefix) =>
    normalizedTitle.startsWith(normalizeTimelineText(prefix))
  );
}

function getStandaloneTimelineLogCategory(log) {
  const safeType = String(log?.type || 'system').trim();
  if (safeType === 'level' || safeType === 'item' || safeType === 'penalty' || safeType === 'system') {
    return safeType;
  }
  return 'hero-log';
}

function getStandaloneTimelineLogStatusClass(log) {
  if (log?.type === 'penalty') return 'failed';
  if (log?.type === 'system') return 'skipped';
  return 'completed';
}

function getStandaloneTimelineLogLabel(log) {
  switch (log?.type) {
    case 'level':
      return 'Nível';
    case 'item':
      return 'Item';
    case 'penalty':
      return 'Penalidade';
    case 'system':
      return 'Sistema';
    default:
      return 'Narrativa';
  }
}

function getStandaloneTimelineLogIcon(log) {
  switch (log?.type) {
    case 'mission':
      return '🎯';
    case 'workout':
      return '💪';
    case 'study':
      return '📚';
    case 'book':
      return '📖';
    case 'level':
      return '🏆';
    case 'item':
      return '🎁';
    case 'penalty':
      return '⚠️';
    case 'system':
      return '⚙️';
    default:
      return '📝';
  }
}

function getUnifiedTimelineEvents() {
  const heroLogs = Array.isArray(appData.heroLogs) ? appData.heroLogs.slice() : [];
  const consumedLogIds = new Set();
  const activityEvents = getUnifiedHistoryActivities().map(({ category, item }) => {
    const eventDateKey = getEventDateKey(item);
    const matchedLog = heroLogs.find(
      (log) => !consumedLogIds.has(log.id) && doesHeroLogMatchHistoryEntry(log, category, item, eventDateKey)
    );
    if (matchedLog?.id !== undefined) {
      consumedLogIds.add(matchedLog.id);
    }
    const historyTimestamp = getHistoryEventTimestamp(item);
    return {
      timelineKind: 'activity',
      category,
      item,
      eventDateKey,
      eventTimestamp: historyTimestamp || matchedLog?.date || '',
      sortTimestamp: getTimelineSortTimestamp(eventDateKey, historyTimestamp || matchedLog?.date || ''),
      matchedLog: matchedLog || null,
      statusMeta: getTimelineStatusMeta(item),
      typeLabel: getHistoryEntryTypeLabel(category, item),
      title: getActivityTimelineTitle(category, item),
    };
  });

  const selectedFutureDate = getSelectedTimelineDateFilter();
  const plannedEvents = getUnifiedFutureTimelineActivities(selectedFutureDate).map(({ category, item, plannedDateKey }) => ({
    timelineKind: 'activity',
    category,
    item,
    eventDateKey: plannedDateKey,
    eventTimestamp: '',
    sortTimestamp: getTimelineSortTimestamp(plannedDateKey, ''),
    matchedLog: null,
    statusMeta: getPlannedTimelineStatusMeta(),
    typeLabel: getHistoryEntryTypeLabel(category, item),
    title: getPlannedActivityTimelineTitle(category, item),
    isPlanned: true,
  }));

  const logEvents = heroLogs
    .filter((log) => !consumedLogIds.has(log.id))
    .map((log) => {
      const eventDateKey = getTimelineLogDateKey(log);
      return {
        timelineKind: 'log',
        category: getStandaloneTimelineLogCategory(log),
        log,
        eventDateKey,
        eventTimestamp: String(log.date || '').trim(),
        sortTimestamp: getTimelineSortTimestamp(eventDateKey, log.date || ''),
        title: String(log.title || 'Registro do herói').trim() || 'Registro do herói',
      };
    });

  return [...plannedEvents, ...activityEvents, ...logEvents].sort((left, right) => {
    const timeDelta = Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0);
    if (timeDelta !== 0) return timeDelta;
    const isoDelta = String(right.eventTimestamp || '').localeCompare(String(left.eventTimestamp || ''));
    if (isoDelta !== 0) return isoDelta;
    if (left.timelineKind !== right.timelineKind) return left.timelineKind === 'log' ? -1 : 1;
    return String(right.eventDateKey || '').localeCompare(String(left.eventDateKey || ''));
  });
}

function filterTimelineEntries(items, filterId = 'activity-history-filter') {
  const filter = getSelectedActivityFilter(filterId);
  const selectedDate = getSelectedTimelineDateFilter();
  return (items || []).filter((entry) => {
    if (selectedDate && String(entry.eventDateKey || '') !== selectedDate) return false;
    if (filter === 'all') return true;
    if (filter === 'activity') return entry.timelineKind === 'activity';
    if (filter === 'hero-log') return entry.timelineKind === 'log';
    if (entry.timelineKind === 'activity') return entry.category === filter;
    return entry.category === filter;
  });
}

function getSelectedTimelineDateFilter() {
  if (typeof document === 'undefined') return '';
  return String(document.getElementById('activity-history-date')?.value || '').trim();
}

function getTimelineControlDateKey() {
  const selectedDate = getSelectedTimelineDateFilter();
  if (selectedDate) return selectedDate;
  return typeof getLocalDateString === 'function' ? getLocalDateString() : '';
}

function renderTimelineDayControls() {
  if (typeof document === 'undefined') return;

  const root = document.getElementById('timeline-day-controls');
  if (!root) return;

  const targetEl = document.getElementById('timeline-day-target');
  const statusEl = document.getElementById('timeline-day-status');
  const restButton = document.getElementById('timeline-rest-day-toggle');
  const workOffButton = document.getElementById('timeline-work-off-toggle');
  const selectedDate = getSelectedTimelineDateFilter();
  const targetDateKey = getTimelineControlDateKey();
  const targetLabel = targetDateKey ? formatDate(targetDateKey) : 'Hoje';
  const restActive =
    !!targetDateKey && typeof isRestDay === 'function' ? !!isRestDay(targetDateKey) : false;
  const workOffActive =
    !!targetDateKey && typeof isWorkOffDay === 'function' ? !!isWorkOffDay(targetDateKey) : false;

  if (targetEl) {
    targetEl.textContent = `Dia alvo: ${targetLabel}${selectedDate ? '' : ' (hoje)'}`;
  }

  if (restButton) {
    restButton.textContent = restActive ? 'Remover descanso' : 'Marcar descanso';
    restButton.classList.toggle('is-active', restActive);
    restButton.setAttribute('aria-pressed', restActive ? 'true' : 'false');
    restButton.disabled = !targetDateKey;
  }

  if (workOffButton) {
    workOffButton.textContent = workOffActive ? 'Remover folga' : 'Marcar folga';
    workOffButton.classList.toggle('is-active', workOffActive);
    workOffButton.setAttribute('aria-pressed', workOffActive ? 'true' : 'false');
    workOffButton.disabled = !targetDateKey;
  }

  if (statusEl) {
    if (restActive && workOffActive) {
      statusEl.textContent = 'Descanso e folga de trabalho ativos neste dia.';
    } else if (restActive) {
      statusEl.textContent = 'Descanso ativo neste dia.';
    } else if (workOffActive) {
      statusEl.textContent = 'Folga de trabalho ativa neste dia.';
    } else {
      statusEl.textContent = 'Dia normal.';
    }
  }
}

function renderTimelineEventCard(entry) {
  if (entry.timelineKind === 'log') {
    const card = document.createElement('div');
    const toneClass = getStandaloneTimelineLogStatusClass(entry.log);
    const timelineTime = formatTimelineTime(entry.eventTimestamp);
    card.className = `mission-card history-card compact-history timeline-log-card ${toneClass}`;
    card.innerHTML = `
      <div class="mission-header">
        <div class="mission-name">
          <span class="mission-emoji">${escapeHtml(getStandaloneTimelineLogIcon(entry.log))}</span>
          <span>${escapeHtml(entry.title)}</span>
        </div>
        <span class="mission-status ${toneClass === 'failed' ? 'failed-status' : toneClass === 'skipped' ? 'skipped-status' : 'completed-status'}">
          ${escapeHtml(getStandaloneTimelineLogLabel(entry.log).toUpperCase())}
        </span>
        <span class="mission-type kind">${escapeHtml(getStandaloneTimelineLogLabel(entry.log))}</span>
      </div>
      <div class="mission-details">
        <p>Data: ${formatDate(entry.eventDateKey)}</p>
        ${timelineTime ? `<p>Hora: ${escapeHtml(timelineTime)}</p>` : ''}
        ${entry.log?.content ? `<p class="timeline-narrative">Registro: ${escapeHtml(entry.log.content)}</p>` : ''}
      </div>
    `;
    return card;
  }

  const { category, item, statusMeta, typeLabel, eventDateKey, matchedLog } = entry;
  const categoryMeta = getActivityCategoryMeta(category);
  const card = document.createElement('div');
  card.className = `mission-card history-card compact-history ${statusMeta.tone}`;
  const timelineTime = formatTimelineTime(entry.eventTimestamp);
  const workoutDetailLines =
    category === 'workout'
      ? getWorkoutHistoryDetailLines(item)
          .map((detail) => `<p>${detail}</p>`)
          .join('')
      : '';
  card.innerHTML = `
    <div class="mission-header">
      <div class="mission-name">
        <span class="mission-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
        <span>${escapeHtml(item.name || 'Atividade')}</span>
      </div>
      <span class="mission-status ${statusMeta.className}">${statusMeta.text}</span>
      <span class="mission-type ${categoryMeta.className}">${categoryMeta.label}</span>
    </div>
    <div class="mission-details">
      <p>Tipo: ${typeLabel}</p>
      <p>Data: ${formatDate(eventDateKey)}</p>
      ${entry.isPlanned ? '<p>Status: Prevista para este dia.</p>' : ''}
      ${timelineTime ? `<p>Hora: ${escapeHtml(timelineTime)}</p>` : ''}
      ${workoutDetailLines}
      ${category === 'book' && item.author ? `<p>Autor: ${escapeHtml(item.author)}</p>` : ''}
      ${item.reason ? `<p class="mission-reason">Motivo: ${escapeHtml(item.reason)}</p>` : ''}
      ${matchedLog?.content ? `<p class="timeline-narrative">Registro do herói: ${escapeHtml(matchedLog.content)}</p>` : ''}
      ${item.feedback ? `<p class="mission-feedback">Feedback: ${escapeHtml(item.feedback)}</p>` : ''}
    </div>
  `;
  return card;
}

function getUnifiedManagedActivities() {
  return [
    ...(appData.missions || []).map((item) => ({ category: 'mission', item })),
    ...(appData.works || []).map((item) => ({ category: 'work', item })),
    ...(appData.workouts || []).map((item) => ({ category: 'workout', item })),
    ...(appData.studies || []).map((item) => ({ category: 'study', item })),
    ...(appData.books || []).map((item) => ({ category: 'book', item })),
  ].sort(compareManagedActivityEntries);
}

function getSelectedActivityFilter(filterId = 'activity-filter') {
  return document.getElementById(filterId)?.value || 'all';
}

function filterActivitiesByCategory(items, filterId = 'activity-filter') {
  const filter = getSelectedActivityFilter(filterId);
  return items.filter((entry) => filter === 'all' || entry.category === filter);
}

function renderUnifiedTodayActivities() {
  const container = document.getElementById('daily-activities');
  if (!container) return;
  const items = filterActivitiesByCategory(getUnifiedTodayActivities(), 'activity-filter');
  const skipCount = getSkipItemCount();

  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma atividade para hoje.</p>';
    return;
  }

  items.forEach(({ category, item, dailyEntry }) => {
    const activityEntry = { category, item };
    const categoryMeta = getActivityCategoryMeta(category);
    let leftColorClass = 'activity-color-mission';
    if (category === 'work') leftColorClass = 'activity-color-work';
    else if (category === 'workout') leftColorClass = 'activity-color-workout';
    else if (category === 'study') leftColorClass = 'activity-color-study';
    else if (category === 'book') leftColorClass = 'activity-color-book';
    const emergencyBadgeHtml = getEmergencyBadgeHtml(activityEntry);

    const isWorkout = category === 'workout';
    const isStudy = category === 'study';
    const isMissionOrWork = category === 'mission' || category === 'work';
    let dueDateHtml = '';
    if (isMissionOrWork && (item.type === 'eventual' || item.type === 'epica')) {
      const dueValue = item.type === 'epica' ? item.deadline : item.date;
      if (dueValue) {
        const dueDate = parseLocalDateString(dueValue);
        const today = new Date();
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        let dateLabel = formatDate(dueValue);
        if (diffDays >= 0 && diffDays <= 7) {
          dateLabel = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays}d`;
          dueDateHtml = `<span class="activity-due-date ${diffDays <= 2 ? 'urgent' : ''}">${dateLabel}</span>`;
        }
      }
    }
    const actionId = dailyEntry ? dailyEntry.id : item.id;
    const completeClass =
      category === 'mission'
        ? 'unified-complete-mission-btn'
        : category === 'work'
          ? 'unified-complete-work-btn'
          : category === 'workout'
            ? 'unified-complete-workout-btn'
            : category === 'study'
              ? 'unified-complete-study-btn'
              : 'unified-complete-book-btn';
    const skipClass =
      category === 'mission'
        ? 'unified-skip-mission-btn'
        : category === 'work'
          ? 'unified-skip-work-btn'
          : category === 'workout'
            ? 'unified-skip-workout-btn'
            : 'unified-skip-study-btn';

    let actionContent = '';
    if (isWorkout && dailyEntry) {
      actionContent = `
        <button class="complete-btn ${completeClass}" data-id="${actionId}">
          <i class="fas fa-check"></i> Registrar
        </button>
      `;
    } else if (isStudy && dailyEntry) {
      actionContent = `
        <input type="checkbox" class="apply-study-checkbox" data-id="${dailyEntry.id}" ${dailyEntry.applied ? 'checked' : ''}>
        <button class="complete-btn ${completeClass}" data-id="${actionId}">
          <i class="fas fa-check"></i>
        </button>
      `;
    } else {
      actionContent = `
        <button class="complete-btn ${completeClass}" data-id="${actionId}">
          <i class="fas fa-check"></i> ${category === 'workout' || category === 'study' ? 'Registrar' : 'Concluir'}
        </button>
      `;
    }

    const skipButton =
      category !== 'book' && skipCount > 0
        ? `<button class="skip-btn ${skipClass}" data-id="${actionId}">
          <i class="fas fa-forward"></i>
        </button>`
        : '';
    const actionLayoutClasses = ['activity-actions'];
    if (skipButton) actionLayoutClasses.push('has-skip');
    if (isStudy && dailyEntry) actionLayoutClasses.push('has-study-toggle');

    const card = document.createElement('div');
    card.className = `compact-activity-card${isUrgentWorkActivity(activityEntry) ? ' compact-activity-card-emergency' : ''}`;
    card.innerHTML = `
      <div class="activity-color-bar ${leftColorClass}"></div>
      <div class="activity-main">
        <span class="activity-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
        <div class="activity-name-row">
          <span class="activity-name">${escapeHtml(item.name || 'Atividade')}</span>
          ${emergencyBadgeHtml}
        </div>
      </div>
      <div class="activity-meta">
        ${
          dueDateHtml ||
          '<span class="activity-due-date activity-due-date-empty" aria-hidden="true">Sem prazo</span>'
        }
      </div>
      <div class="${actionLayoutClasses.join(' ')}">
        ${actionContent}
        ${skipButton}
      </div>
    `;
    container.appendChild(card);
  });

  if (typeof updateActivityProgressBar === 'function') {
    updateActivityProgressBar();
  }
}

function renderUnifiedActivitiesHistory() {
  const container = document.getElementById('completed-activities');
  if (!container) return;
  renderTimelineDayControls();
  const items = filterTimelineEntries(getUnifiedTimelineEvents(), 'activity-history-filter');
  renderPaginatedHistory(
    container,
    items,
    renderTimelineEventCard,
    'Nenhum evento na linha do tempo para este filtro.',
    renderUnifiedActivitiesHistory
  );
}

function renderUnifiedActivitiesList() {
  const container = document.getElementById('activities-list');
  if (!container) return;
  const items = getUnifiedManagedActivities();
  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma atividade cadastrada.</p>';
    return;
  }

  items.forEach(({ category, item }) => {
    const activityEntry = { category, item };
    const categoryMeta = getActivityCategoryMeta(category);
    const planningMeta =
      typeof getActivityPlanningMeta === 'function' ? getActivityPlanningMeta(item) : null;
    const secondary =
      category === 'workout'
        ? getWorkoutTypeName(item.type)
        : category === 'study'
          ? item.type === 'logico'
            ? 'Lógico'
            : 'Criativo'
          : category === 'book'
            ? getBookActivityStatusLabel(item)
            : getMissionTypeName(item.type);
    const planningLine = planningMeta
      ? [
          planningMeta.objectiveName ? `Objetivo: ${planningMeta.objectiveName}` : '',
          `Prioridade: ${planningMeta.priorityLabel}`,
        ]
          .filter(Boolean)
          .map((part) => `<div class="item-type">${escapeHtml(part)}</div>`)
          .join('')
      : '';
    const emergencyBadgeHtml = getEmergencyBadgeHtml(activityEntry, 'item-emergency-badge');
    const card = document.createElement('div');
    card.className = `item-card${isUrgentWorkActivity(activityEntry) ? ' item-card-emergency' : ''}`;
    card.innerHTML = `
      <div class="item-info">
        <span class="item-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
          <div>
            <div class="item-name-row">
              <div class="item-name">${escapeHtml(item.name || 'Atividade')}</div>
              ${emergencyBadgeHtml}
            </div>
            <div class="item-type">${categoryMeta.label} - ${secondary}</div>
            ${category === 'book' && item.author ? `<div class="item-author">${escapeHtml(item.author)}</div>` : ''}
            ${planningLine}
          </div>
        </div>
      <div class="item-actions">
        <button class="action-btn unified-edit-activity-btn" data-category="${category}" data-id="${item.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn unified-delete-activity-btn" data-category="${category}" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
`;
    container.appendChild(card);
  });
}

function updateUnifiedActivities() {
  renderUnifiedTodayActivities();
  renderUnifiedActivitiesHistory();
  renderUnifiedActivitiesList();
}

const HISTORY_PAGE_SIZE = 20;
const historyPaginationState = globalThis.historyPaginationState || {};
globalThis.historyPaginationState = historyPaginationState;

function resetHistoryPage(containerId) {
  if (!containerId) return;
  historyPaginationState[containerId] = 1;
}

function renderPaginatedHistory(container, items, renderItem, emptyMessage, rerender) {
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  const stateKey = container.id || 'history';
  const totalPages = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, historyPaginationState[stateKey] || 1), totalPages);
  historyPaginationState[stateKey] = currentPage;
  const startIndex = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const endIndex = Math.min(startIndex + HISTORY_PAGE_SIZE, items.length);

  items.slice(startIndex, endIndex).forEach((item) => {
    const node = renderItem(item);
    if (node) container.appendChild(node);
  });

  if (items.length <= HISTORY_PAGE_SIZE) return;

  const footer = document.createElement('div');
  footer.className = 'history-pagination';

  const summary = document.createElement('span');
  summary.className = 'history-pagination-summary';
  summary.textContent = `Página ${currentPage} de ${totalPages}`;
  footer.appendChild(summary);

  const actions = document.createElement('div');
  actions.className = 'history-pagination-actions';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'history-pagination-btn secondary';
  prevBtn.textContent = 'Anterior';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      historyPaginationState[stateKey] = currentPage - 1;
      rerender();
    }
  });
  actions.appendChild(prevBtn);

  const pageNumbers = [];
  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page++) pageNumbers.push(page);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let page = start; page <= end; page++) pageNumbers.push(page);
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  pageNumbers.forEach((page) => {
    if (page === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'history-pagination-ellipsis';
      ellipsis.textContent = '...';
      actions.appendChild(ellipsis);
      return;
    }

    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className =
      `history-pagination-btn ${page === currentPage ? 'active' : 'secondary'}`.trim();
    pageBtn.textContent = String(page);
    pageBtn.disabled = page === currentPage;
    pageBtn.addEventListener('click', () => {
      historyPaginationState[stateKey] = page;
      rerender();
    });
    actions.appendChild(pageBtn);
  });

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'history-pagination-btn secondary';
  nextBtn.textContent = 'Próxima';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      historyPaginationState[stateKey] = currentPage + 1;
      rerender();
    }
  });
  actions.appendChild(nextBtn);

  footer.appendChild(actions);
  container.appendChild(footer);
}

function wasItemLoggedForDate(item, completedList, dateStr) {
  const key = item?.originalId || item?.id;
  if (!key) return false;
  return (completedList || []).some((entry) => {
    const entryKey = entry?.originalId || entry?.id;
    if (String(entryKey) !== String(key)) return false;
    return (
      entry.completedDate === dateStr ||
      entry.failedDate === dateStr ||
      entry.skippedDate === dateStr
    );
  });
}
function checkOverdueWorks(options = {}) {
  const skipWeekly = options.skipWeekly === true;

  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const overdueToFail = [];

  appData.works.forEach((work) => {
    if (work.completed || work.failed) return;

    if (isOneOffScheduledItemOverdue(work, todayStr)) {
      overdueToFail.push({
        id: work.id,
        reason:
          work.type === 'epica'
            ? 'Falha no dia seguinte ao prazo (Épica)'
            : 'Falha no dia seguinte ao prazo (eventual)',
        missedDate: getOneOffScheduledFailureDateKey(work),
      });
    }

    if (!skipWeekly && isRoutineType(work.type)) {
      const workLineageKey = work.originalId || work.id;
      const yesterdayDayOfWeek = yesterday.getDay();
      const availableFrom = work.availableDate || work.dateAdded || todayStr;
      const shouldCheckYesterday =
        getRoutineDays(work).includes(yesterdayDayOfWeek) && availableFrom <= yesterdayStr;
      const workOffActive =
        typeof isWorkOffDay === 'function' && isWorkOffDay(yesterdayStr);
      if (shouldCheckYesterday && !workOffActive) {
        const alreadyLoggedYesterday = wasItemLoggedForDate(
          work,
          appData.completedWorks,
          yesterdayStr
        );
        const alreadyFailedForMissedDate = appData.completedWorks.some(
          (w) =>
            String(w.originalId || w.id) === String(workLineageKey) &&
            w.failed === true &&
            w.missedDate === yesterdayStr
        );
        if (!alreadyLoggedYesterday && !alreadyFailedForMissedDate) {
          overdueToFail.push({
            id: work.id,
            reason: 'Rotina não concluída no dia programado',
            missedDate: yesterdayStr,
          });
        }
      }
    }
  });

  if (overdueToFail.length > 0) {
    console.log(
      `Auto-falhando ${overdueToFail.length} trabalhos por atraso:`,
      overdueToFail.map((i) => i.reason)
    );
    overdueToFail.forEach((item) =>
      failWork(item.id, `[AUTO] ${item.reason}`, { missedDate: item.missedDate })
    );
  }

  recreateDailyWorksForToday();
}
// Verificar missões atrasadas diariamente (função ajustada)
function checkOverdueMissions(options = {}) {
  const skipWeekly = options.skipWeekly === true;

  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const overdueToFail = [];

  appData.missions.forEach((mission) => {
    if (mission.completed || mission.failed) return;

    if (isOneOffScheduledItemOverdue(mission, todayStr)) {
      overdueToFail.push({
        id: mission.id,
        reason:
          mission.type === 'epica'
            ? 'Falha no dia seguinte ao prazo (Épica)'
            : 'Falha no dia seguinte ao prazo (eventual)',
        missedDate: getOneOffScheduledFailureDateKey(mission),
      });
    }

    if (!skipWeekly && isRoutineType(mission.type)) {
      const missionLineageKey = mission.originalId || mission.id;
      const yesterdayDayOfWeek = yesterday.getDay();
      const availableFrom = mission.availableDate || mission.dateAdded || todayStr;
      const shouldCheckYesterday =
        getRoutineDays(mission).includes(yesterdayDayOfWeek) && availableFrom <= yesterdayStr;
      if (shouldCheckYesterday) {
        const alreadyLoggedYesterday = wasItemLoggedForDate(
          mission,
          appData.completedMissions,
          yesterdayStr
        );
        const alreadyFailedForMissedDate = appData.completedMissions.some(
          (m) =>
            String(m.originalId || m.id) === String(missionLineageKey) &&
            m.failed === true &&
            m.missedDate === yesterdayStr
        );
        if (!alreadyLoggedYesterday && !alreadyFailedForMissedDate) {
          overdueToFail.push({
            id: mission.id,
            reason: 'Rotina não concluída no dia programado',
            missedDate: yesterdayStr,
          });
        }
      }
    }
  });

  if (overdueToFail.length > 0) {
    console.log(
      `Auto-falhando ${overdueToFail.length} missões por atraso:`,
      overdueToFail.map((i) => i.reason)
    );
    overdueToFail.forEach((item) =>
      failMission(item.id, `[AUTO] ${item.reason}`, { missedDate: item.missedDate })
    );
  }

  recreateDailyMissionsForToday();
}

// Atualizar lista de missões cadastradas`r`n// Atualizar streaks display
function updateStreaksDisplay() {
  updateMaxStreaks();
  const generalEl = document.getElementById('streak-general');
  if (generalEl) generalEl.textContent = `${appData.hero.streak.general} dias`;
  const physicalEl = document.getElementById('streak-physical');
  if (physicalEl) physicalEl.textContent = `${appData.hero.streak.physical} dias`;
  const mentalEl = document.getElementById('streak-mental');
  if (mentalEl) mentalEl.textContent = `${appData.hero.streak.mental} dias`;
  const nutritionEl = document.getElementById('streak-nutrition');
  if (nutritionEl) nutritionEl.textContent = `${appData.hero.streak.nutrition || 0} dias`;

  const generalRecord = document.getElementById('streak-general-record');
  const physicalRecord = document.getElementById('streak-physical-record');
  const mentalRecord = document.getElementById('streak-mental-record');
  const nutritionRecord = document.getElementById('streak-nutrition-record');
  if (generalRecord)
    generalRecord.textContent = `Recorde: ${appData.statistics.maxStreakGeneral || 0} dias`;
  if (physicalRecord)
    physicalRecord.textContent = `Recorde: ${appData.statistics.maxStreakPhysical || 0} dias`;
  if (mentalRecord)
    mentalRecord.textContent = `Recorde: ${appData.statistics.maxStreakMental || 0} dias`;
  if (nutritionRecord)
    nutritionRecord.textContent = `Recorde: ${appData.statistics.maxStreakNutrition || 0} dias`;
}

function updateMaxStreaks() {
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.maxStreakGeneral = Math.max(
    appData.statistics.maxStreakGeneral || 0,
    appData.hero.streak.general || 0
  );
  appData.statistics.maxStreakPhysical = Math.max(
    appData.statistics.maxStreakPhysical || 0,
    appData.hero.streak.physical || 0
  );
  appData.statistics.maxStreakMental = Math.max(
    appData.statistics.maxStreakMental || 0,
    appData.hero.streak.mental || 0
  );
  appData.statistics.maxStreakNutrition = Math.max(
    appData.statistics.maxStreakNutrition || 0,
    appData.hero.streak.nutrition || 0
  );
}

function getDailyStatisticsBreakdown(dayData = {}) {
  const missionsFailed = Number(dayData.missionsMissed || 0);
  const worksFailed = Number(dayData.worksMissed || 0);
  const workoutsFailed = Number(dayData.workoutsMissed || 0);
  const studiesFailed = Number(dayData.studiesMissed || 0);
  const missionsIgnored = Number(dayData.missionsIgnored || 0);
  const worksIgnored = Number(dayData.worksIgnored || 0);
  const workoutsIgnored = Number(dayData.workoutsIgnored || 0);
  const studiesIgnored = Number(dayData.studiesIgnored || 0);

  return {
    missions: Number(dayData.missions || 0),
    works: Number(dayData.works || 0),
    workouts: Number(dayData.workouts || 0),
    studies: Number(dayData.studies || 0),
    missionsFailed,
    worksFailed,
    workoutsFailed,
    studiesFailed,
    missionsIgnored,
    worksIgnored,
    workoutsIgnored,
    studiesIgnored,
    missionsMissed: missionsFailed + missionsIgnored,
    worksMissed: worksFailed + worksIgnored,
    workoutsMissed: workoutsFailed + workoutsIgnored,
    studiesMissed: studiesFailed + studiesIgnored,
    totalXP: Number(dayData.totalXP || 0),
  };
}

function buildStatisticsRecordSnapshot(productiveDays = {}) {
  const snapshot = {
    maxXpDay: { value: 0, date: '' },
    maxMissionsDay: { value: 0, date: '' },
    maxWorksDay: { value: 0, date: '' },
    maxWorkoutsDay: { value: 0, date: '' },
    maxStudiesDay: { value: 0, date: '' },
  };

  Object.entries(productiveDays || {}).forEach(([dateKey, dayData]) => {
    const breakdown = getDailyStatisticsBreakdown(dayData);

    if (breakdown.totalXP > snapshot.maxXpDay.value) {
      snapshot.maxXpDay = { value: breakdown.totalXP, date: dateKey };
    }
    if (breakdown.missions > snapshot.maxMissionsDay.value) {
      snapshot.maxMissionsDay = { value: breakdown.missions, date: dateKey };
    }
    if (breakdown.works > snapshot.maxWorksDay.value) {
      snapshot.maxWorksDay = { value: breakdown.works, date: dateKey };
    }
    if (breakdown.workouts > snapshot.maxWorkoutsDay.value) {
      snapshot.maxWorkoutsDay = { value: breakdown.workouts, date: dateKey };
    }
    if (breakdown.studies > snapshot.maxStudiesDay.value) {
      snapshot.maxStudiesDay = { value: breakdown.studies, date: dateKey };
    }
  });

  return snapshot;
}

function getWorkoutSummaryFromStats(workout = {}) {
  const stats = workout?.stats;
  if (!stats || typeof stats !== 'object') return null;

  return {
    totalReps: Number(stats.totalReps || 0),
    totalDistance: Number(stats.totalDistance || 0),
    totalTime: Number(stats.totalTime || 0),
    timesDone: Number(stats.completed || 0),
  };
}

function buildWorkoutHistorySummary(workouts = [], completedWorkouts = []) {
  const summaryById = new Map();

  const ensureBucket = (id, fallback = {}) => {
    const safeId = String(id || fallback.id || fallback.workoutId || '');
    if (!safeId) return null;
    if (!summaryById.has(safeId)) {
      summaryById.set(safeId, {
        id: safeId,
        name: fallback.name || 'Treino',
        emoji: fallback.emoji || '💪',
        type: fallback.type || '',
        totalReps: 0,
        totalDistance: 0,
        totalTime: 0,
        timesDone: 0,
        fromStats: false,
      });
    }
    const bucket = summaryById.get(safeId);
    if (!bucket.name && fallback.name) bucket.name = fallback.name;
    if ((!bucket.emoji || bucket.emoji === '💪') && fallback.emoji) bucket.emoji = fallback.emoji;
    if (!bucket.type && fallback.type) bucket.type = fallback.type;
    return bucket;
  };

  (workouts || []).forEach((workout) => {
    const bucket = ensureBucket(workout?.id, workout);
    if (!bucket) return;

    const statsSummary = getWorkoutSummaryFromStats(workout);
    if (!statsSummary) return;

    bucket.totalReps = statsSummary.totalReps;
    bucket.totalDistance = statsSummary.totalDistance;
    bucket.totalTime = statsSummary.totalTime;
    bucket.timesDone = statsSummary.timesDone;
    bucket.fromStats = true;
  });

  (completedWorkouts || []).forEach((entry) => {
    if (!entry || entry.failed || entry.skipped) return;
    const bucket = ensureBucket(entry.workoutId, entry);
    if (!bucket) return;
    if (bucket.fromStats) return;

    bucket.timesDone += 1;

    if (entry.type === 'repeticao' && Array.isArray(entry.series)) {
      bucket.totalReps += entry.series.reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
      return;
    }

    if (entry.type === 'distancia') {
      bucket.totalDistance += Number(entry.distance || 0);
      bucket.totalTime += Number(entry.time || 0);
      return;
    }

    bucket.totalTime += Number(entry.time || 0);
  });

  return Array.from(summaryById.values())
    .map(({ fromStats, ...bucket }) => bucket)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
}

function formatWorkoutTotalMinutes(totalTimeSeconds) {
  const safeSeconds = Number(totalTimeSeconds || 0);
  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return '-';
  return `${(safeSeconds / 60).toFixed(1)} min`;
}

function formatWorkoutDuration(totalTimeSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalTimeSeconds || 0)));
  if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return '';

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

function formatWorkoutAverageSpeed(totalDistanceKm, totalTimeSeconds) {
  const safeDistance = Number(totalDistanceKm || 0);
  const safeSeconds = Number(totalTimeSeconds || 0);
  if (!Number.isFinite(safeDistance) || safeDistance <= 0 || !Number.isFinite(safeSeconds) || safeSeconds <= 0) {
    return '-';
  }

  return `${((safeDistance * 3600) / safeSeconds).toFixed(1)} km/h`;
}

function formatWorkoutPace(totalDistanceKm, totalTimeSeconds) {
  const safeDistance = Number(totalDistanceKm || 0);
  const safeSeconds = Number(totalTimeSeconds || 0);
  if (!Number.isFinite(safeDistance) || safeDistance <= 0 || !Number.isFinite(safeSeconds) || safeSeconds <= 0) {
    return '-';
  }

  let paceSeconds = Math.round(safeSeconds / safeDistance);
  const minutes = Math.floor(paceSeconds / 60);
  let seconds = paceSeconds % 60;

  if (seconds === 60) {
    paceSeconds = 0;
    seconds = 0;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')} min/km`;
}

function formatWorkoutSpeedSummary(totalDistanceKm, totalTimeSeconds) {
  const speedLabel = formatWorkoutAverageSpeed(totalDistanceKm, totalTimeSeconds);
  const paceLabel = formatWorkoutPace(totalDistanceKm, totalTimeSeconds);
  if (speedLabel === '-' || paceLabel === '-') return '-';
  return `${speedLabel} | ${paceLabel}`;
}

function getWorkoutHistoryDetailLines(item = {}) {
  if (!item || item.failed || item.skipped) return [];

  if (item.type === 'repeticao' && Array.isArray(item.series)) {
    const series = item.series.map((value) => parseInt(value, 10) || 0);
    const totalReps = series.reduce((sum, value) => sum + value, 0);
    return [`Séries: ${series.join(' / ')}`, `Total repetições: ${totalReps}`];
  }

  if (item.type === 'distancia') {
    const details = [];
    const distance = Number(item.distance || 0);
    const time = Number(item.time || 0);

    if (Number.isFinite(distance) && distance > 0) {
      details.push(`Distância: ${distance.toFixed(2)} km`);
    }
    if (Number.isFinite(time) && time > 0) {
      details.push(`Tempo: ${formatWorkoutDuration(time)}`);
    }
    if (Number.isFinite(distance) && distance > 0 && Number.isFinite(time) && time > 0) {
      details.push(`Velocidade média: ${formatWorkoutSpeedSummary(distance, time)}`);
    }

    return details;
  }

  if (item.type === 'maior-tempo' || item.type === 'menor-tempo') {
    const time = Number(item.time || 0);
    if (Number.isFinite(time) && time > 0) {
      return [`Tempo: ${formatWorkoutDuration(time)}`];
    }
  }

  return [];
}

function formatRecordValueWithDate(record) {
  if (!record || !record.value) return '';
  if (!record.date) return String(record.value);
  return `${record.value} (${formatDate(record.date)})`;
}

// Atualizar estatísticas
function updateStatistics() {
  const stats = appData.statistics || {};
  const statWorkoutsDone = document.getElementById('stat-workouts-done');
  if (statWorkoutsDone) statWorkoutsDone.textContent = stats.workoutsDone || 0;
  const statWorkoutsFailed = document.getElementById('stat-workouts-failed');
  if (statWorkoutsFailed) statWorkoutsFailed.textContent = stats.workoutsFailed || 0;
  const statWorkoutsIgnored = document.getElementById('stat-workouts-ignored');
  if (statWorkoutsIgnored) statWorkoutsIgnored.textContent = stats.workoutsIgnored || 0;
  const statStudiesDone = document.getElementById('stat-studies-done');
  if (statStudiesDone) statStudiesDone.textContent = stats.studiesDone || 0;
  const statStudiesFailed = document.getElementById('stat-studies-failed');
  if (statStudiesFailed) statStudiesFailed.textContent = stats.studiesFailed || 0;
  const statStudiesIgnored = document.getElementById('stat-studies-ignored');
  if (statStudiesIgnored) statStudiesIgnored.textContent = stats.studiesIgnored || 0;
  const statWorksDone = document.getElementById('stat-works-done');
  if (statWorksDone) statWorksDone.textContent = stats.worksDone || 0;
  const statWorksFailed = document.getElementById('stat-works-failed');
  if (statWorksFailed) statWorksFailed.textContent = stats.worksFailed || 0;
  const statWorksIgnored = document.getElementById('stat-works-ignored');
  if (statWorksIgnored) statWorksIgnored.textContent = stats.worksIgnored || 0;
  const statBooksRead = document.getElementById('stat-books-read');
  if (statBooksRead) statBooksRead.textContent = stats.booksRead || 0;
  const statMissionsDone = document.getElementById('stat-missions-done');
  if (statMissionsDone) statMissionsDone.textContent = stats.missionsDone || 0;
  const statMissionsFailed = document.getElementById('stat-missions-failed');
  if (statMissionsFailed) statMissionsFailed.textContent = stats.missionsFailed || 0;
  const statMissionsIgnored = document.getElementById('stat-missions-ignored');
  if (statMissionsIgnored) statMissionsIgnored.textContent = stats.missionsIgnored || 0;
  if (typeof renderPlanningStatisticsPanel === 'function') {
    renderPlanningStatisticsPanel(typeof getUnifiedTodayActivities === 'function' ? getUnifiedTodayActivities() : []);
  }

  // Atualizar tabela de detalhes de treinos
  updateWorkoutDetailsTable();

  // Atualizar records
  updateRecords();

  // Atualizar dias produtivos
  updateProductiveDays();
  updateAdvancedStatistics();
  if (typeof isTabActive === 'function' && isTabActive('estatisticas')) {
    updateCharts();
  }
}

function updateAdvancedStatistics() {
  const weeklyCompareEl = document.getElementById('stat-weekly-compare');
  const monthlyCompareEl = document.getElementById('stat-monthly-compare');
  const adherenceEl = document.getElementById('stat-adherence');
  const goalsStatusEl = document.getElementById('stat-goals-status');
  const planningSnapshot =
    typeof getPlanningStatisticsSnapshot === 'function'
      ? getPlanningStatisticsSnapshot(
          appData,
          typeof getUnifiedTodayActivities === 'function'
            ? { todayActivities: getUnifiedTodayActivities() }
            : undefined
        )
      : null;
  const planningObjectivesHealthy = planningSnapshot
    ? Math.max(0, Number(planningSnapshot.objectivesActive || 0) - Number(planningSnapshot.atRiskObjectives || 0))
    : 0;

  const weeklyCurrent = getPeriodTotals(7, 0);
  const weeklyPrevious = getPeriodTotals(7, 7);
  if (weeklyCompareEl) {
    weeklyCompareEl.innerHTML = `
            <p>Tarefas: ${weeklyCurrent.missions} (${formatTrendHtml(weeklyCurrent.missions, weeklyPrevious.missions)})</p>
            <p>Falhas/Ignoradas Tarefas: ${weeklyCurrent.missionsMissed} (${formatTrendHtml(weeklyCurrent.missionsMissed, weeklyPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${weeklyCurrent.works} (${formatTrendHtml(weeklyCurrent.works, weeklyPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${weeklyCurrent.worksMissed} (${formatTrendHtml(weeklyCurrent.worksMissed, weeklyPrevious.worksMissed, true)})</p>
            <p>Treinos: ${weeklyCurrent.workouts} (${formatTrendHtml(weeklyCurrent.workouts, weeklyPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${weeklyCurrent.workoutsMissed} (${formatTrendHtml(weeklyCurrent.workoutsMissed, weeklyPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${weeklyCurrent.studies} (${formatTrendHtml(weeklyCurrent.studies, weeklyPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${weeklyCurrent.studiesMissed} (${formatTrendHtml(weeklyCurrent.studiesMissed, weeklyPrevious.studiesMissed, true)})</p>
            <p>XP: ${weeklyCurrent.totalXP} (${formatTrendHtml(weeklyCurrent.totalXP, weeklyPrevious.totalXP)})</p>
            ${
              planningSnapshot
                ? `<p>Objetivos em risco agora: ${planningSnapshot.atRiskObjectives}/${planningSnapshot.objectivesActive}</p>`
                : ''
            }
        `;
  }

  const monthCurrent = getMonthTotals(getLocalDateString().slice(0, 7));
  const monthPrevious = getMonthTotals(getPreviousMonthKey(getLocalDateString().slice(0, 7)));
  if (monthlyCompareEl) {
    monthlyCompareEl.innerHTML = `
            <p>Tarefas: ${monthCurrent.missions} (${formatTrendHtml(monthCurrent.missions, monthPrevious.missions)})</p>
            <p>Falhas/Ignoradas Tarefas: ${monthCurrent.missionsMissed} (${formatTrendHtml(monthCurrent.missionsMissed, monthPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${monthCurrent.works} (${formatTrendHtml(monthCurrent.works, monthPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${monthCurrent.worksMissed} (${formatTrendHtml(monthCurrent.worksMissed, monthPrevious.worksMissed, true)})</p>
            <p>Treinos: ${monthCurrent.workouts} (${formatTrendHtml(monthCurrent.workouts, monthPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${monthCurrent.workoutsMissed} (${formatTrendHtml(monthCurrent.workoutsMissed, monthPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${monthCurrent.studies} (${formatTrendHtml(monthCurrent.studies, monthPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${monthCurrent.studiesMissed} (${formatTrendHtml(monthCurrent.studiesMissed, monthPrevious.studiesMissed, true)})</p>
            <p>XP: ${monthCurrent.totalXP} (${formatTrendHtml(monthCurrent.totalXP, monthPrevious.totalXP)})</p>
            ${
              planningSnapshot?.topObjective
                ? `<p>Objetivo líder agora: ${escapeHtml(planningSnapshot.topObjective.name)} (${planningSnapshot.topObjective.effectiveProgress}%)</p>`
                : ''
            }
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
            <p>7 dias - Tarefas: ${formatRate(weeklyCurrent.missions, weekMissionsPlanned)}</p>
            <p>7 dias - Trabalhos: ${formatRate(weeklyCurrent.works, weekWorksPlanned)}</p>
            <p>7 dias - Treinos: ${formatRate(weeklyCurrent.workouts, weekWorkoutsPlanned)}</p>
            <p>7 dias - Estudos: ${formatRate(weeklyCurrent.studies, weekStudiesPlanned)}</p>
            <p>Mês - Tarefas: ${formatRate(monthCurrent.missions, monthMissionsPlanned)}</p>
            <p>Mês - Trabalhos: ${formatRate(monthCurrent.works, monthWorksPlanned)}</p>
            <p>Mês - Treinos: ${formatRate(monthCurrent.workouts, monthWorkoutsPlanned)}</p>
            <p>Mês - Estudos: ${formatRate(monthCurrent.studies, monthStudiesPlanned)}</p>
            ${
              planningSnapshot
                ? `<p>Objetivos saudáveis: ${formatRate(planningObjectivesHealthy, planningSnapshot.objectivesActive || 0)}</p>`
                : ''
            }
        `;
  }

  syncStatisticsGoalsInputs();
  if (goalsStatusEl) {
    const goals = appData.statisticsGoals || { missions: 60, workouts: 20, studies: 20, works: 30 };
    goalsStatusEl.innerHTML = `
            <p class="${getGoalStatusClass(weeklyCurrent.missions, goals.missions)}">Tarefas: ${weeklyCurrent.missions}/${goals.missions}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.works, goals.works)}">Trabalhos: ${weeklyCurrent.works}/${goals.works}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.workouts, goals.workouts)}">Treinos: ${weeklyCurrent.workouts}/${goals.workouts}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.studies, goals.studies)}">Estudos: ${weeklyCurrent.studies}/${goals.studies}</p>
            ${
              planningSnapshot
                ? `<p class="${planningSnapshot.atRiskObjectives === 0 ? 'goal-status-ok' : 'goal-status-danger'}">Objetivos em risco: ${planningSnapshot.atRiskObjectives}</p>`
                : ''
            }
        `;
  }
}

function getPeriodTotals(days, offsetDays) {
  const keys = getPeriodDateKeys(days, offsetDays);
  return getTotalsFromDateKeys(keys);
}

function getMonthTotals(monthKey) {
  const keys = new Set();
  const source = appData.statistics?.productiveDays || {};
  Object.keys(source).forEach((dateKey) => {
    if (dateKey && dateKey.slice(0, 7) === monthKey) keys.add(dateKey);
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
      trendArrow = lowerIsBetter ? '↓' : '↑';
    } else {
      text = `${sign}${delta} / sem base`;
      trendClass = lowerIsBetter ? 'trend-up' : 'trend-down';
      trendArrow = lowerIsBetter ? '↑' : '↓';
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
  if (entry.failed) return entry.failedDate || entry.missedDate || entry.date || '';
  if (entry.skipped) return entry.skippedDate || entry.date || '';
  return entry.completedDate || entry.dateCompleted || entry.date || '';
}

function getTotalsFromDateKeys(keys) {
  const safeKeys = keys instanceof Set ? keys : new Set();
  const totals = {
    missions: 0,
    missionsFailed: 0,
    missionsIgnored: 0,
    missionsMissed: 0,
    works: 0,
    worksFailed: 0,
    worksIgnored: 0,
    worksMissed: 0,
    workouts: 0,
    workoutsFailed: 0,
    workoutsIgnored: 0,
    workoutsMissed: 0,
    studies: 0,
    studiesFailed: 0,
    studiesIgnored: 0,
    studiesMissed: 0,
    totalXP: 0,
  };

  const productiveSource = appData.statistics?.productiveDays || {};
  safeKeys.forEach((key) => {
    const breakdown = getDailyStatisticsBreakdown(productiveSource[key] || {});
    totals.missions += breakdown.missions;
    totals.missionsFailed += breakdown.missionsFailed;
    totals.missionsIgnored += breakdown.missionsIgnored;
    totals.missionsMissed += breakdown.missionsMissed;
    totals.works += breakdown.works;
    totals.worksFailed += breakdown.worksFailed;
    totals.worksIgnored += breakdown.worksIgnored;
    totals.worksMissed += breakdown.worksMissed;
    totals.workouts += breakdown.workouts;
    totals.workoutsFailed += breakdown.workoutsFailed;
    totals.workoutsIgnored += breakdown.workoutsIgnored;
    totals.workoutsMissed += breakdown.workoutsMissed;
    totals.studies += breakdown.studies;
    totals.studiesFailed += breakdown.studiesFailed;
    totals.studiesIgnored += breakdown.studiesIgnored;
    totals.studiesMissed += breakdown.studiesMissed;
    totals.totalXP += breakdown.totalXP;
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
  const goals = appData.statisticsGoals || { missions: 60, workouts: 20, studies: 20, works: 30 };
  const missionsInput = document.getElementById('goal-missions');
  const worksInput = document.getElementById('goal-works');
  const workoutsInput = document.getElementById('goal-workouts');
  const studiesInput = document.getElementById('goal-studies');
  if (missionsInput && document.activeElement !== missionsInput)
    missionsInput.value = goals.missions;
  if (worksInput && document.activeElement !== worksInput) worksInput.value = goals.works;
  if (workoutsInput && document.activeElement !== workoutsInput)
    workoutsInput.value = goals.workouts;
  if (studiesInput && document.activeElement !== studiesInput) studiesInput.value = goals.studies;
}

function saveStatisticsGoals() {
  const missions = parseInt(document.getElementById('goal-missions')?.value || '0', 10);
  const works = parseInt(document.getElementById('goal-works')?.value || '0', 10);
  const workouts = parseInt(document.getElementById('goal-workouts')?.value || '0', 10);
  const studies = parseInt(document.getElementById('goal-studies')?.value || '0', 10);
  if (
    !Number.isFinite(missions) ||
    missions <= 0 ||
    !Number.isFinite(works) ||
    works <= 0 ||
    !Number.isFinite(workouts) ||
    workouts <= 0 ||
    !Number.isFinite(studies) ||
    studies <= 0
  ) {
    showFeedback('Informe metas válidas (números maiores que zero).', 'warn');
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

  buildWorkoutHistorySummary(appData.workouts, appData.completedWorkouts).forEach((workout) => {
    const row = document.createElement('tr');
    const safeWorkoutLabel = escapeHtml(`${workout.emoji || '💪'} ${workout.name || 'Treino'}`);
    const totalTimeLabel =
      workout.timesDone > 0 &&
      (workout.type === 'distancia' || workout.type === 'maior-tempo' || workout.type === 'menor-tempo')
        ? formatWorkoutTotalMinutes(workout.totalTime)
        : '-';

    row.innerHTML = `
            <td>${safeWorkoutLabel}</td>
            <td>${workout.type === 'repeticao' ? workout.totalReps : '-'}</td>
            <td>${workout.type === 'distancia' ? workout.totalDistance.toFixed(2) + ' km' : '-'}</td>
            <td>${totalTimeLabel}</td>
            <td>${workout.type === 'distancia' ? formatWorkoutSpeedSummary(workout.totalDistance, workout.totalTime) : '-'}</td>
            <td>${workout.timesDone}</td>
        `;

    tbody.appendChild(row);
  });
}

// Atualizar records
function updateRecords() {
  const container = document.getElementById('personal-records');
  if (!container) return;

  try {
    container.innerHTML = '';
    const stats = appData.statistics || {};
    const recordSnapshot = buildStatisticsRecordSnapshot(stats.productiveDays || {});
    const records = [];

    if (stats.maxStreakGeneral) {
      records.push({
        emoji: '🏆',
        label: 'Maior streak geral',
        value: `${stats.maxStreakGeneral} dias`,
      });
    }
    if (stats.maxStreakPhysical) {
      records.push({
        emoji: '💪',
        label: 'Maior streak físico',
        value: `${stats.maxStreakPhysical} dias`,
      });
    }
    if (stats.maxStreakMental) {
      records.push({
        emoji: '🧠',
        label: 'Maior streak mental',
        value: `${stats.maxStreakMental} dias`,
      });
    }
    if (stats.maxStreakNutrition) {
      records.push({
        emoji: '🥗',
        label: 'Maior streak de nutrição',
        value: `${stats.maxStreakNutrition} dias`,
      });
    }
    if (recordSnapshot.maxXpDay.value) {
      records.push({
        emoji: '⭐',
        label: 'Mais XP em um dia',
        value: formatRecordValueWithDate({
          value: `${recordSnapshot.maxXpDay.value} XP`,
          date: recordSnapshot.maxXpDay.date,
        }),
      });
    }
    if (recordSnapshot.maxMissionsDay.value) {
      records.push({
        emoji: '🎯',
        label: 'Mais tarefas em um dia',
        value: formatRecordValueWithDate({
          value: `${recordSnapshot.maxMissionsDay.value}`,
          date: recordSnapshot.maxMissionsDay.date,
        }),
      });
    }
    if (recordSnapshot.maxWorksDay.value) {
      records.push({
        emoji: '💼',
        label: 'Mais trabalhos em um dia',
        value: formatRecordValueWithDate({
          value: `${recordSnapshot.maxWorksDay.value}`,
          date: recordSnapshot.maxWorksDay.date,
        }),
      });
    }
    if (recordSnapshot.maxWorkoutsDay.value) {
      records.push({
        emoji: '🏋️',
        label: 'Mais treinos em um dia',
        value: formatRecordValueWithDate({
          value: `${recordSnapshot.maxWorkoutsDay.value}`,
          date: recordSnapshot.maxWorkoutsDay.date,
        }),
      });
    }
    if (recordSnapshot.maxStudiesDay.value) {
      records.push({
        emoji: '📚',
        label: 'Mais estudos em um dia',
        value: formatRecordValueWithDate({
          value: `${recordSnapshot.maxStudiesDay.value}`,
          date: recordSnapshot.maxStudiesDay.date,
        }),
      });
    }
    if (stats.booksRead) {
      records.push({ emoji: '📖', label: 'Livros lidos no total', value: `${stats.booksRead}` });
    }
    if (stats.workoutsDone) {
      records.push({
        emoji: '💪',
        label: 'Treinos realizados no total',
        value: `${stats.workoutsDone}`,
      });
    }
    if (stats.studiesDone) {
      records.push({
        emoji: '📚',
        label: 'Estudos realizados no total',
        value: `${stats.studiesDone}`,
      });
    }
    if (stats.worksDone) {
      records.push({
        emoji: '💼',
        label: 'Trabalhos concluídos no total',
        value: `${stats.worksDone}`,
      });
    }
    if (stats.missionsDone) {
      records.push({
        emoji: '🎯',
        label: 'Tarefas concluídas no total',
        value: `${stats.missionsDone}`,
      });
    }
    if (typeof getPlanningRecords === 'function') {
      records.push(...getPlanningRecords(appData));
    }

    if (records.length === 0) {
      container.innerHTML =
        '<p class="empty-message">Nenhum record ainda. Complete atividades para estabelecer records!</p>';
      return;
    }

    records.forEach((record) => {
      const recordItem = document.createElement('div');
      recordItem.className = 'record-item';
      recordItem.innerHTML = `<span class="record-emoji">${record.emoji}</span> <span class="record-label">${record.label}:</span> <span class="record-value">${record.value}</span>`;
      container.appendChild(recordItem);
    });
  } catch (e) {
    console.error('Erro em updateRecords:', e);
  }
}

// Atualizar dias produtivos
function updateProductiveDays() {
  const tbody = document.querySelector('#productive-days-table tbody');
  if (!tbody) {
    console.warn('tbody não encontrado para productive-days-table');
    return;
  }

  try {
    tbody.innerHTML = '';

    // Ordenar dias por total XP
    const productiveDays = Object.entries(appData.statistics?.productiveDays || {})
      .filter(([date]) => typeof isRestDay !== 'function' || !isRestDay(date))
      .map(([date, data]) => ({ date, ...getDailyStatisticsBreakdown(data) }))
      .sort((a, b) => Number(b.totalXP || 0) - Number(a.totalXP || 0))
      .slice(0, 10); // Top 10 dias

    if (productiveDays.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML =
        '<td colspan="6" class="empty-table-message">Nenhum dia produtivo registrado ainda.</td>';
      tbody.appendChild(row);
      return;
    }

    productiveDays.forEach((day) => {
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
  } catch (e) {
    console.error('Erro em updateProductiveDays:', e);
  }
}

// Atualizar diário

// __appActivitiesBridge: exposes activity APIs for legacy scripts during module migration
Object.assign(globalThis, {
  getActivityCategoryMeta,
  parseLocalDateString,
  getScheduledItemDueDateKey,
  getOneOffScheduledFailureDateKey,
  getUnifiedTodayActivities,
  getAllTodayActivities,
  getUnifiedHistoryActivities,
  getUnifiedTimelineEvents,
  filterTimelineEntries,
  getTimelineControlDateKey,
  getUnifiedManagedActivities,
  updateUnifiedActivities,
  renderUnifiedTodayActivities,
  renderUnifiedActivitiesHistory,
  renderTimelineDayControls,
  resetHistoryPage,
  wasItemLoggedForDate,
  isOneOffScheduledItemOverdue,
  checkOverdueWorks,
  checkOverdueMissions,
  updateStreaksDisplay,
  updateMaxStreaks,
  updateStatistics,
  updateAdvancedStatistics,
  updateActivityProgressBar,
  getPeriodTotals,
  getMonthTotals,
  formatDeltaWithPercent,
  formatTrendHtml,
  getPeriodDateKeys,
  getEventDateKey,
  getTotalsFromDateKeys,
  getDailyStatisticsBreakdown,
  buildStatisticsRecordSnapshot,
  buildWorkoutHistorySummary,
  getWorkoutHistoryDetailLines,
  renderPaginatedHistory,
  formatRate,
  formatWorkoutPace,
  formatWorkoutSpeedSummary,
  getGoalStatusClass,
  syncStatisticsGoalsInputs,
  saveStatisticsGoals,
  updateWorkoutDetailsTable,
  updateRecords,
  updateProductiveDays,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    compareManagedActivityEntries,
    parseLocalDateString,
    getEventDateKey,
    getScheduledItemDueDateKey,
    getOneOffScheduledFailureDateKey,
    getEmergencyBadgeHtml,
    isOneOffScheduledItemOverdue,
    isUrgentWorkActivity,
    getUnifiedTimelineEvents,
    filterTimelineEntries,
    getTimelineControlDateKey,
    getDailyStatisticsBreakdown,
    buildStatisticsRecordSnapshot,
    buildWorkoutHistorySummary,
    getWorkoutHistoryDetailLines,
    formatWorkoutPace,
    formatWorkoutSpeedSummary,
    formatTrendHtml,
    getTotalsFromDateKeys,
  };
}
