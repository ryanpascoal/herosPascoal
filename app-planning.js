(function (globalScope) {
  'use strict';

  const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
  const TIER_ORDER = { high: 3, medium: 2, low: 1 };
  const PRIORITY_LABELS = {
    critical: 'Critica',
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  };
  const TIER_LABELS = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
  };
  const STATUS_LABELS = {
    active: 'Ativo',
    paused: 'Pausado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
  };
  const RECENT_ACTIVITY_WINDOW_DAYS = 14;
  const RECENT_FEEDBACK_WINDOW_DAYS = 21;

  function toFiniteNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function normalizeId(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  function normalizeProgress(value) {
    const numericValue = Math.round(toFiniteNumber(value, 0));
    return Math.min(100, Math.max(0, numericValue));
  }

  function normalizeEnum(value, allowedValues, fallback) {
    return allowedValues.includes(value) ? value : fallback;
  }

  function parseIsoDate(dateStr) {
    if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split('-').map((part) => parseInt(part, 10));
    const parsedDate = new Date(year, month - 1, day);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  function toIsoDate(dateValue) {
    if (typeof dateValue === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const parsedFromNative = new Date(dateValue);
      if (!Number.isNaN(parsedFromNative.getTime())) dateValue = parsedFromNative;
    }
    const parsedDate = dateValue instanceof Date ? dateValue : parseIsoDate(dateValue);
    if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) return null;
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateStr) {
    const isoDate = toIsoDate(dateStr);
    if (!isoDate) return 'Sem prazo';
    const parsedDate = parseIsoDate(isoDate);
    return parsedDate ? parsedDate.toLocaleDateString('pt-BR') : 'Sem prazo';
  }

  function diffDaysFrom(baseStr, targetStr) {
    const baseDate = parseIsoDate(baseStr);
    const targetDate = parseIsoDate(targetStr);
    if (!baseDate || !targetDate) return null;
    return Math.round((targetDate.getTime() - baseDate.getTime()) / 86400000);
  }

  function getTodayStr() {
    if (typeof globalScope.getLocalDateString === 'function') return globalScope.getLocalDateString();
    return toIsoDate(new Date());
  }

  function safeEscape(value) {
    const stringValue = String(value ?? '');
    if (typeof globalScope.escapeHtml === 'function') return globalScope.escapeHtml(stringValue);
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getActivityDueDate(item) {
    if (!item || typeof item !== 'object') return '';
    if (typeof globalScope.getActivityDueDate === 'function') return globalScope.getActivityDueDate(item) || '';
    return item.deadline || item.date || '';
  }

  function normalizePlanningFields(item) {
    if (!item || typeof item !== 'object') return item;
    item.objectiveId = normalizeId(item.objectiveId);
    item.projectId = null;
    item.priority = normalizeEnum(item.priority, Object.keys(PRIORITY_ORDER), 'medium');
    item.impact = normalizeEnum(item.impact, Object.keys(TIER_ORDER), 'medium');
    item.effort = normalizeEnum(item.effort, Object.keys(TIER_ORDER), 'medium');
    item.energy = normalizeEnum(item.energy, Object.keys(TIER_ORDER), 'medium');
    return item;
  }

  function normalizeObjective(objective) {
    if (!objective || typeof objective !== 'object') return objective;
    objective.status = normalizeEnum(objective.status, ['active', 'paused', 'completed', 'cancelled'], 'active');
    objective.horizon = normalizeEnum(objective.horizon, ['annual', 'quarter', 'month', 'custom'], 'quarter');
    objective.progress = normalizeProgress(objective.progress);
    objective.progressMode = normalizeEnum(objective.progressMode, ['manual', 'auto', 'hybrid'], 'auto');
    objective.targetDate = toIsoDate(objective.targetDate) || '';
    objective.notes = typeof objective.notes === 'string' ? objective.notes : '';
    objective.completedAt = toIsoDate(objective.completedAt) || '';
    objective.updatedAt = toIsoDate(objective.updatedAt) || objective.updatedAt || getTodayStr();
    return objective;
  }

  function getActiveActivityCollections(data) {
    return [
      ...(data.missions || []).map((item) => ({ category: 'mission', item })),
      ...(data.works || []).map((item) => ({ category: 'work', item })),
      ...(data.workouts || []).map((item) => ({ category: 'workout', item })),
      ...(data.studies || []).map((item) => ({ category: 'study', item })),
      ...(data.books || []).map((item) => ({ category: 'book', item })),
    ];
  }

  function getCompletionEvents(data) {
    const events = [];

    (data.completedMissions || []).forEach((item) => {
      events.push({
        category: 'mission',
        item,
        date: item.completedDate || item.failedDate || item.skippedDate || item.date || '',
      });
    });

    (data.completedWorks || []).forEach((item) => {
      events.push({
        category: 'work',
        item,
        date: item.completedDate || item.failedDate || item.skippedDate || item.date || '',
      });
    });

    (data.completedWorkouts || []).forEach((item) => {
      events.push({
        category: 'workout',
        item,
        date: item.completedDate || item.failedDate || item.skippedDate || item.date || '',
      });
    });

    (data.completedStudies || []).forEach((item) => {
      events.push({
        category: 'study',
        item,
        date: item.completedDate || item.failedDate || item.skippedDate || item.date || '',
      });
    });

    (data.books || [])
      .filter((item) => item && (item.completed || item.status === 'concluido'))
      .forEach((item) => {
        events.push({
          category: 'book',
          item,
          date: item.dateCompleted || item.dateAdded || '',
        });
      });

    return events;
  }

  function getObjectiveById(data, objectiveId) {
    const normalizedId = normalizeId(objectiveId);
    if (!normalizedId) return null;
    return (data.objectives || []).find((objective) => Number(objective.id) === normalizedId) || null;
  }

  function itemBelongsToObjective(data, item, objectiveId) {
    if (!item) return false;
    return normalizeId(item.objectiveId) === normalizeId(objectiveId);
  }

  function getLastProgressDateForObjective(data, objectiveId) {
    const objective = getObjectiveById(data, objectiveId);
    let latest = toIsoDate(objective?.updatedAt) || '';

    getCompletionEvents(data).forEach((event) => {
      if (!itemBelongsToObjective(data, event.item, objectiveId)) return;
      const eventDate = toIsoDate(event.date) || '';
      if (eventDate > latest) latest = eventDate;
    });

    return latest;
  }

  function isCompletedEvent(event) {
    return !!event && !event.item?.failed && !event.item?.skipped;
  }

  function isFailedEvent(event) {
    return !!event && (event.item?.failed || event.item?.skipped);
  }

  function isDateWithinWindow(baseDateStr, todayStr, windowDays) {
    const diffDays = diffDaysFrom(baseDateStr, todayStr);
    return diffDays !== null && diffDays >= 0 && diffDays <= windowDays;
  }

  function getOpenActivitiesForObjective(data, objectiveId) {
    return getActiveActivityCollections(data).filter(({ item }) => itemBelongsToObjective(data, item, objectiveId));
  }

  function getOverdueOpenActivities(activityEntries, todayStr) {
    return activityEntries.filter(({ item }) => {
      const dueDate = getActivityDueDate(item);
      const dueInDays = dueDate ? diffDaysFrom(todayStr, dueDate) : null;
      return dueInDays !== null && dueInDays < 0;
    });
  }

  function getRecentEventsForObjective(completionEvents, todayStr, objectiveId, data) {
    return completionEvents.filter(
      (event) =>
        itemBelongsToObjective(data, event.item, objectiveId) &&
        isDateWithinWindow(toIsoDate(event.date) || '', todayStr, RECENT_ACTIVITY_WINDOW_DAYS)
    );
  }

  function getActivityLineageKey(item) {
    if (!item) return '';
    return `${item.type || 'item'}:${item.originalId || item.id || item.workoutId || item.studyId || item.activityId || ''}`;
  }

  function dedupeEventsByLineage(events) {
    const seen = new Set();
    return events.filter((event) => {
      const key = getActivityLineageKey(event.item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function resolveFeedbackSourceItem(data, feedbackEntry) {
    if (!feedbackEntry || !feedbackEntry.type) return null;
    const activityId = normalizeId(feedbackEntry.activityId);
    if (!activityId) return null;

    if (feedbackEntry.type === 'mission') {
      return (
        (data.missions || []).find((item) => normalizeId(item.id) === activityId) ||
        (data.completedMissions || []).find(
          (item) => normalizeId(item.id) === activityId || normalizeId(item.originalId) === activityId
        ) ||
        null
      );
    }

    if (feedbackEntry.type === 'work') {
      return (
        (data.works || []).find((item) => normalizeId(item.id) === activityId) ||
        (data.completedWorks || []).find(
          (item) => normalizeId(item.id) === activityId || normalizeId(item.originalId) === activityId
        ) ||
        null
      );
    }

    if (feedbackEntry.type === 'workout') {
      return (
        (data.workouts || []).find((item) => normalizeId(item.id) === activityId) ||
        (data.completedWorkouts || []).find(
          (item) => normalizeId(item.workoutId) === activityId || normalizeId(item.id) === activityId
        ) ||
        null
      );
    }

    if (feedbackEntry.type === 'study') {
      return (
        (data.studies || []).find((item) => normalizeId(item.id) === activityId) ||
        (data.completedStudies || []).find(
          (item) => normalizeId(item.studyId) === activityId || normalizeId(item.id) === activityId
        ) ||
        null
      );
    }

    if (feedbackEntry.type === 'book') {
      return (data.books || []).find((item) => normalizeId(item.id) === activityId) || null;
    }

    return null;
  }

  function getRecentFeedbackInsights(data, todayStr, options = {}) {
    const windowDays = toFiniteNumber(options.windowDays, RECENT_FEEDBACK_WINDOW_DAYS);
    const limit = toFiniteNumber(options.limit, 6);

    return (data.feedbacks || [])
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .filter((entry) => isDateWithinWindow(toIsoDate(entry.date) || '', todayStr, windowDays))
      .map((entry) => {
        const sourceItem = resolveFeedbackSourceItem(data, entry);
        const sourceObjective =
          getObjectiveById(data, entry.objectiveId) || getObjectiveById(data, sourceItem?.objectiveId);
        return {
          type: entry.type,
          feedback: entry.feedback || '',
          date: toIsoDate(entry.date) || '',
          itemName: sourceItem?.name || '',
          objectiveId: normalizeId(entry.objectiveId) || normalizeId(sourceObjective?.id),
          objectiveName: entry.objectiveName || sourceObjective?.name || '',
        };
      })
      .filter((entry) => entry.feedback)
      .slice(0, limit);
  }

  function buildExecutionStats(data, objectiveId, todayStr, completionEvents, feedbackInsights) {
    const openActivities = getOpenActivitiesForObjective(data, objectiveId);
    const recentEvents = getRecentEventsForObjective(completionEvents, todayStr, objectiveId, data);
    const recentCompleted = dedupeEventsByLineage(recentEvents.filter(isCompletedEvent));
    const recentFailed = dedupeEventsByLineage(recentEvents.filter(isFailedEvent));
    const overdueOpen = getOverdueOpenActivities(openActivities, todayStr);
    const recentFeedbackCount = feedbackInsights.filter((entry) => entry.objectiveId === normalizeId(objectiveId)).length;
    const baseCount = Math.max(1, openActivities.length);
    const coverageBase = Math.max(1, openActivities.length + recentCompleted.length + recentFailed.length);
    const coveragePercent = normalizeProgress((recentCompleted.length / coverageBase) * 100);
    const consistencyPercent = normalizeProgress(
      Math.max(0, 100 - overdueOpen.length * 12 - recentFailed.length * 10)
    );
    const autoProgress = normalizeProgress(
      coveragePercent * 0.5 +
      normalizeProgress((recentCompleted.length / baseCount) * 100) * 0.25 +
      consistencyPercent * 0.25
    );

    return {
      openActivitiesCount: openActivities.length,
      overdueOpenCount: overdueOpen.length,
      recentCompletedCount: recentCompleted.length,
      recentFailedCount: recentFailed.length,
      recentFeedbackCount,
      autoProgress,
      rhythmPercent: normalizeProgress((recentCompleted.length / baseCount) * 100),
      pressureScore: normalizeProgress(overdueOpen.length * 20 + recentFailed.length * 15),
    };
  }

  function completeObjective(id) {
    ensurePlanningState();
    const objectiveId = normalizeId(id);
    if (!objectiveId) return false;
    const objective = getObjectiveById(globalScope.appData, objectiveId);
    if (!objective || objective.status === 'completed') return false;
    if (!globalScope.confirm?.('Marcar este objetivo como concluido?')) return false;

    const todayStr = getTodayStr();
    objective.status = 'completed';
    objective.progress = 100;
    objective.completedAt = todayStr;
    objective.updatedAt = todayStr;
    normalizeObjective(objective);

    globalScope.showFeedback?.('Objetivo concluido.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
    return true;
  }

  function resolveEffectiveProgress(manualProgress, autoProgress, progressMode) {
    const safeManual = normalizeProgress(manualProgress);
    const safeAuto = normalizeProgress(autoProgress);
    const mode = normalizeEnum(progressMode, ['manual', 'auto', 'hybrid'], 'auto');
    if (mode === 'manual') return safeManual;
    if (mode === 'auto') return safeAuto;
    return normalizeProgress((safeManual * 0.6) + (safeAuto * 0.4));
  }

  function comparePlannedActivities(left, right) {
    const leftItem = left?.item || {};
    const rightItem = right?.item || {};

    const priorityDiff =
      (PRIORITY_ORDER[rightItem.priority || 'medium'] || 0) - (PRIORITY_ORDER[leftItem.priority || 'medium'] || 0);
    if (priorityDiff !== 0) return priorityDiff;

    const impactDiff = (TIER_ORDER[rightItem.impact || 'medium'] || 0) - (TIER_ORDER[leftItem.impact || 'medium'] || 0);
    if (impactDiff !== 0) return impactDiff;

    const leftDueDate = getActivityDueDate(leftItem);
    const rightDueDate = getActivityDueDate(rightItem);
    if (leftDueDate && rightDueDate && leftDueDate !== rightDueDate) {
      return leftDueDate.localeCompare(rightDueDate);
    }
    if (leftDueDate && !rightDueDate) return -1;
    if (!leftDueDate && rightDueDate) return 1;

    return String(leftItem.name || '').localeCompare(String(rightItem.name || ''), 'pt-BR');
  }

  function readActivityPlanningFields() {
    return {
      objectiveId: normalizeId(document.getElementById('activity-objective')?.value),
      projectId: null,
      priority: normalizeEnum(
        document.getElementById('activity-priority')?.value,
        Object.keys(PRIORITY_ORDER),
        'medium'
      ),
      impact: 'medium',
      effort: 'medium',
      energy: 'medium',
    };
  }

  function fillActivityPlanningForm(item) {
    if (!item || typeof item !== 'object') return;
    const objectiveSelect = document.getElementById('activity-objective');
    const prioritySelect = document.getElementById('activity-priority');
    if (objectiveSelect) objectiveSelect.value = String(normalizeId(item.objectiveId) || '');
    if (prioritySelect) prioritySelect.value = item.priority || 'medium';
  }

  function touchPlanningRelation(parentEntity) {
    if (!parentEntity || typeof parentEntity !== 'object') return;
    parentEntity.updatedAt = getTodayStr();
  }

  function applyPlanningFields(item, planningFields) {
    if (!item || typeof item !== 'object') return item;
    Object.assign(item, planningFields || {});
    normalizePlanningFields(item);
    touchPlanningRelation(getObjectiveById(globalScope.appData, item.objectiveId));
    return item;
  }

  function populateObjectiveOptions() {
    const select = document.getElementById('activity-objective');
    if (!select) return;

    const objectives = (globalScope.appData?.objectives || []).slice().sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
    );
    const currentValue = select.value;

    select.innerHTML =
      '<option value="">Nenhum</option>' +
      objectives.map((objective) => `<option value="${objective.id}">${safeEscape(objective.name || 'Objetivo')}</option>`).join('');

    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
      select.value = currentValue;
    }
  }

  function getActivityPlanningMeta(item) {
    if (!item) return null;
    const objective = getObjectiveById(globalScope.appData, item.objectiveId);
    return {
      objectiveName: objective?.name || '',
      priorityLabel: PRIORITY_LABELS[item.priority || 'medium'] || PRIORITY_LABELS.medium,
    };
  }

  function buildPlanningSnapshot(data, todayActivities = [], options = {}) {
    const todayStr = options.todayStr || getTodayStr();
    const activeObjectives = (data.objectives || []).filter((objective) => objective.status === 'active');
    const completionEvents = getCompletionEvents(data);
    const feedbackInsights = getRecentFeedbackInsights(data, todayStr, { limit: 6 });
    const recentThreshold = parseIsoDate(todayStr);
    if (recentThreshold) recentThreshold.setDate(recentThreshold.getDate() - 7);
    const thresholdStr = recentThreshold ? toIsoDate(recentThreshold) : '';

    const objectiveCards = activeObjectives
      .map((objective) => {
        const linkedActivities = getOpenActivitiesForObjective(data, objective.id);
        const recentCompletions = completionEvents.filter(
          (event) =>
            itemBelongsToObjective(data, event.item, objective.id) &&
            (!thresholdStr || String(event.date || '') >= thresholdStr)
        );
        const executionStats = buildExecutionStats(data, objective.id, todayStr, completionEvents, feedbackInsights);
        const effectiveProgress = resolveEffectiveProgress(
          objective.progress,
          executionStats.autoProgress,
          objective.progressMode
        );
        const lastProgressDate = getLastProgressDateForObjective(data, objective.id);
        const stalledDays =
          lastProgressDate && diffDaysFrom(lastProgressDate, todayStr) !== null
            ? Math.abs(diffDaysFrom(lastProgressDate, todayStr))
            : null;
        const dueInDays = objective.targetDate ? diffDaysFrom(todayStr, objective.targetDate) : null;

        return {
          id: objective.id,
          name: objective.name,
          status: objective.status,
          progress: objective.progress,
          effectiveProgress,
          autoProgress: executionStats.autoProgress,
          progressMode: objective.progressMode,
          targetDate: objective.targetDate,
          dueInDays,
          linkedActivitiesOpen: linkedActivities.filter(({ item }) => !item.completed).length,
          todayActivities: todayActivities.filter(({ item }) => itemBelongsToObjective(data, item, objective.id)).length,
          recentCompletions: recentCompletions.length,
          stalledDays,
          rhythmPercent: executionStats.rhythmPercent,
          pressureScore: executionStats.pressureScore,
          overdueOpenCount: executionStats.overdueOpenCount,
          recentFailedCount: executionStats.recentFailedCount,
          recentFeedbackCount: executionStats.recentFeedbackCount,
        };
      })
      .sort((left, right) => {
        const targetDiff =
          (left.dueInDays ?? Number.POSITIVE_INFINITY) - (right.dueInDays ?? Number.POSITIVE_INFINITY);
        if (targetDiff !== 0) return targetDiff;
        return right.effectiveProgress - left.effectiveProgress;
      });

    const alerts = [];

    objectiveCards.forEach((objective) => {
      if (objective.stalledDays !== null && objective.stalledDays >= 7) {
        alerts.push({
          type: 'warning',
          title: `Objetivo parado ha ${objective.stalledDays} dias`,
          description: objective.name,
        });
      }
      if (objective.dueInDays !== null && objective.dueInDays < 0 && objective.effectiveProgress < 100) {
        alerts.push({
          type: 'danger',
          title: 'Objetivo atrasado',
          description: `${objective.name} (${Math.abs(objective.dueInDays)}d de atraso)`,
        });
      }
      if (objective.overdueOpenCount > 0) {
        alerts.push({
          type: 'warning',
          title: 'Objetivo com pendencias vencidas',
          description: `${objective.name} (${objective.overdueOpenCount} atrasadas)`,
        });
      }
    });

    return {
      todayStr,
      objectivesActive: activeObjectives.length,
      projectsActive: 0,
      reviewsCount: 0,
      focusItems: todayActivities.slice().sort(comparePlannedActivities).slice(0, 5),
      objectiveCards: objectiveCards.slice(0, 6),
      projectCards: [],
      alerts: alerts.slice(0, 10),
      feedbackInsights,
      latestReviews: [],
    };
  }

  function createPlanningEntityId(list) {
    const maxId = (Array.isArray(list) ? list : []).reduce((maxValue, item) => {
      const numericId = toFiniteNumber(item?.id, 0);
      return Math.max(maxValue, numericId);
    }, 0);
    return maxId + 1;
  }

  function ensurePlanningState(data = globalScope.appData) {
    if (!data || typeof data !== 'object') return data;
    if (!Array.isArray(data.objectives)) data.objectives = [];

    data.objectives.forEach(normalizeObjective);
    getActiveActivityCollections(data).forEach(({ item }) => normalizePlanningFields(item));
    getCompletionEvents(data).forEach(({ item }) => normalizePlanningFields(item));
    return data;
  }

  function resetObjectiveForm() {
    const form = document.getElementById('objective-form');
    if (!form) return;
    form.reset();
    const editIdInput = document.getElementById('objective-edit-id');
    if (editIdInput) editIdInput.value = '';
  }

  function handleObjectiveSubmit(event) {
    event.preventDefault();
    ensurePlanningState();

    const name = document.getElementById('objective-name')?.value?.trim();
    if (!name) {
      globalScope.showFeedback?.('Informe um nome para o objetivo.', 'warn');
      return;
    }

    const targetDate = toIsoDate(document.getElementById('objective-target-date')?.value) || '';
    const editId = normalizeId(document.getElementById('objective-edit-id')?.value);
    const todayStr = getTodayStr();

    if (editId) {
      const objective = getObjectiveById(globalScope.appData, editId);
      if (!objective) return;
      objective.name = name;
      objective.targetDate = targetDate;
      objective.updatedAt = todayStr;
      normalizeObjective(objective);
      globalScope.showFeedback?.('Objetivo atualizado.', 'success');
    } else {
      globalScope.appData.objectives.push(
        normalizeObjective({
          id: createPlanningEntityId(globalScope.appData.objectives),
          name,
          horizon: 'quarter',
          status: 'active',
          targetDate,
          progress: 0,
          progressMode: 'auto',
          notes: '',
          createdAt: todayStr,
          updatedAt: todayStr,
        })
      );
      globalScope.showFeedback?.('Objetivo criado.', 'success');
    }

    resetObjectiveForm();
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function editObjective(id) {
    const objective = getObjectiveById(globalScope.appData, id);
    if (!objective) return;
    const editIdInput = document.getElementById('objective-edit-id');
    const nameInput = document.getElementById('objective-name');
    const targetDateInput = document.getElementById('objective-target-date');
    if (editIdInput) editIdInput.value = objective.id;
    if (nameInput) nameInput.value = objective.name || '';
    if (targetDateInput) targetDateInput.value = objective.targetDate || '';
    nameInput?.focus();
  }

  function clearActivityObjectiveLinks(objectiveId) {
    getActiveActivityCollections(globalScope.appData).forEach(({ item }) => {
      if (normalizeId(item.objectiveId) !== objectiveId) return;
      item.objectiveId = null;
      item.projectId = null;
    });
  }

  function deleteObjective(id) {
    const objectiveId = normalizeId(id);
    if (!objectiveId) return;
    if (!globalScope.confirm?.('Excluir este objetivo e desvincular atividades relacionadas?')) return;
    globalScope.appData.objectives = (globalScope.appData.objectives || []).filter(
      (objective) => normalizeId(objective.id) !== objectiveId
    );
    clearActivityObjectiveLinks(objectiveId);
    globalScope.showFeedback?.('Objetivo excluido.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function renderObjectiveList() {
    const container = document.getElementById('objectives-list');
    const historyContainer = document.getElementById('completed-objectives-list');
    if (!container) return;
    ensurePlanningState();
    const snapshot = buildPlanningSnapshot(globalScope.appData);
    const activeCards = snapshot.objectiveCards;
    const completedObjectives = (globalScope.appData?.objectives || [])
      .filter((objective) => objective.status === 'completed')
      .slice()
      .sort((left, right) => {
        const dateDiff = String(right.completedAt || '').localeCompare(String(left.completedAt || ''));
        if (dateDiff !== 0) return dateDiff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
      });

    if (activeCards.length === 0) {
      container.innerHTML = '<p class="empty-message">Nenhum objetivo ativo.</p>';
    } else {
      container.innerHTML = `
        <h4>Objetivos Ativos</h4>
        ${activeCards
          .map((objective) => {
            const progressValue = objective.effectiveProgress ?? normalizeProgress(objective.progress);
            return `
              <div class="planning-item-card">
                <div class="planning-item-header">
                  <div>
                    <div class="planning-item-title">${safeEscape(objective.name || 'Objetivo')}</div>
                    <div class="planning-item-meta">
                      <span>${safeEscape(STATUS_LABELS[objective.status] || 'Ativo')}</span>
                      ${objective.targetDate ? `<span>${safeEscape(formatDate(objective.targetDate))}</span>` : ''}
                    </div>
                  </div>
                  <div class="planning-item-actions">
                    <button type="button" class="action-btn planning-complete-objective-btn" data-id="${objective.id}" title="Concluir objetivo">
                      <i class="fas fa-check"></i>
                    </button>
                    <button type="button" class="action-btn planning-edit-objective-btn" data-id="${objective.id}">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="action-btn planning-delete-objective-btn" data-id="${objective.id}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="planning-progress-bar">
                  <div class="planning-progress-fill" style="width: ${progressValue}%"></div>
                </div>
                <div class="planning-item-foot">
                  <span>${progressValue}% de progresso</span>
                  <span>${objective.linkedActivitiesOpen || 0} acoes ligadas</span>
                  <span>${objective.todayActivities || 0} hoje</span>
                  <span>${objective.overdueOpenCount || 0} atrasadas</span>
                </div>
              </div>
            `;
          })
          .join('')}
      `;
    }

    if (!historyContainer) return;
    if (completedObjectives.length === 0) {
      historyContainer.innerHTML = '';
      return;
    }

    historyContainer.innerHTML = `
      <h4>Historico de Objetivos Concluidos</h4>
      ${completedObjectives
        .map((objective) => `
          <div class="planning-item-card">
            <div class="planning-item-header">
              <div>
                <div class="planning-item-title">${safeEscape(objective.name || 'Objetivo')}</div>
                <div class="planning-item-meta">
                  <span>${safeEscape(STATUS_LABELS[objective.status] || 'Concluido')}</span>
                  ${objective.completedAt ? `<span>Concluido em ${safeEscape(formatDate(objective.completedAt))}</span>` : ''}
                </div>
              </div>
              <div class="planning-item-actions">
                <button type="button" class="action-btn planning-edit-objective-btn" data-id="${objective.id}">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="action-btn planning-delete-objective-btn" data-id="${objective.id}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="planning-progress-bar">
              <div class="planning-progress-fill" style="width: 100%"></div>
            </div>
            <div class="planning-item-foot">
              <span>100% concluido</span>
              ${objective.targetDate ? `<span>Prazo ${safeEscape(formatDate(objective.targetDate))}</span>` : ''}
            </div>
          </div>
        `)
        .join('')}
    `;
  }

  function renderPlanningDashboard(todayActivities) {
    const container = document.getElementById('planning-dashboard');
    if (!container) return;
    const snapshot = buildPlanningSnapshot(globalScope.appData, todayActivities || []);

    const focusHtml =
      snapshot.focusItems.length === 0
        ? '<p class="empty-message">Nenhum foco puxado para hoje.</p>'
        : snapshot.focusItems
            .map(({ item }) => {
              const objective = getObjectiveById(globalScope.appData, item.objectiveId);
              const dueDate = getActivityDueDate(item);
              return `
                <div class="focus-item">
                  <div class="focus-item-main">
                    <span class="focus-item-name">${safeEscape(item.name || 'Atividade')}</span>
                    <span class="focus-item-priority priority-${safeEscape(item.priority || 'medium')}">${safeEscape(PRIORITY_LABELS[item.priority || 'medium'])}</span>
                  </div>
                  <div class="focus-item-meta">
                    <span>${safeEscape(objective?.name || 'Sem objetivo')}</span>
                    ${dueDate ? `<span>Prazo ${safeEscape(formatDate(dueDate))}</span>` : ''}
                  </div>
                </div>
              `;
            })
            .join('');

    const objectiveHtml =
      snapshot.objectiveCards.length === 0
        ? '<p class="empty-message">Nenhum objetivo ativo.</p>'
        : snapshot.objectiveCards
            .map(
              (objective) => `
                <div class="focus-objective-card">
                  <div class="focus-objective-header">
                    <span class="focus-objective-name">${safeEscape(objective.name)}</span>
                    <span class="focus-objective-progress">${objective.effectiveProgress}%</span>
                  </div>
                  <div class="planning-progress-bar">
                    <div class="planning-progress-fill" style="width: ${objective.effectiveProgress}%"></div>
                  </div>
                  <div class="focus-objective-meta">
                    <span>${objective.todayActivities} acoes hoje</span>
                    <span>${objective.overdueOpenCount} atrasadas</span>
                    ${objective.stalledDays !== null ? `<span>${objective.stalledDays}d sem avanco</span>` : '<span>Sem historico</span>'}
                  </div>
                </div>
              `
            )
            .join('');

    const alertHtml =
      snapshot.alerts.length === 0
        ? '<p class="empty-message">Nenhum alerta critico agora.</p>'
        : snapshot.alerts
            .map(
              (alert) => `
                <div class="planning-alert ${safeEscape(alert.type)}">
                  <strong>${safeEscape(alert.title)}</strong>
                  <span>${safeEscape(alert.description)}</span>
                </div>
              `
            )
            .join('');

    const feedbackHtml =
      snapshot.feedbackInsights.length === 0
        ? '<p class="empty-message">Sem feedback recente ligado as metas.</p>'
        : snapshot.feedbackInsights
            .map(
              (entry) => `
                <div class="planning-feedback-card">
                  <div class="planning-item-meta">
                    <span>${safeEscape(entry.itemName || entry.type)}</span>
                    ${entry.objectiveName ? `<span>${safeEscape(entry.objectiveName)}</span>` : ''}
                  </div>
                  <p>${safeEscape(entry.feedback)}</p>
                </div>
              `
            )
            .join('');

    container.innerHTML = `
      <div class="planning-summary-grid">
        <div class="planning-summary-card">
          <span class="planning-summary-label">Objetivos ativos</span>
          <strong>${snapshot.objectivesActive}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Focos de hoje</span>
          <strong>${snapshot.focusItems.length}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Alertas</span>
          <strong>${snapshot.alerts.length}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Feedbacks recentes</span>
          <strong>${snapshot.feedbackInsights.length}</strong>
        </div>
      </div>
      <div class="planning-board-grid">
        <section class="planning-board-card">
          <h3>Foco do dia</h3>
          ${focusHtml}
        </section>
        <section class="planning-board-card">
          <h3>Objetivos em andamento</h3>
          ${objectiveHtml}
        </section>
        <section class="planning-board-card">
          <h3>Alertas</h3>
          ${alertHtml}
        </section>
        <section class="planning-board-card">
          <h3>Feedbacks recentes</h3>
          ${feedbackHtml}
        </section>
      </div>
    `;
  }

  function getPlanningStatisticsSnapshot(data = globalScope.appData, options = {}) {
    ensurePlanningState(data);
    const todayActivities = options.todayActivities || [];
    const snapshot = buildPlanningSnapshot(data, todayActivities, options);
    const atRiskObjectives = snapshot.objectiveCards.filter(
      (objective) => objective.overdueOpenCount > 0 || (objective.stalledDays !== null && objective.stalledDays >= 7)
    );
    const topObjective =
      snapshot.objectiveCards
        .slice()
        .sort((left, right) => {
          const progressDiff = Number(right.effectiveProgress || 0) - Number(left.effectiveProgress || 0);
          if (progressDiff !== 0) return progressDiff;
          return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
        })[0] || null;

    return {
      ...snapshot,
      objectivesActive: snapshot.objectivesActive,
      projectsActive: 0,
      atRiskObjectives: atRiskObjectives.length,
      delayedProjects: 0,
      topObjective,
      hottestProject: null,
      recentFeedbackCount: snapshot.feedbackInsights.length,
      focusCount: snapshot.focusItems.length,
    };
  }

  function ensurePlanningRecordState(data = globalScope.appData) {
    if (!data.statistics) data.statistics = {};
    if (!data.statistics.planningRecords || typeof data.statistics.planningRecords !== 'object') {
      data.statistics.planningRecords = {};
    }
    return data.statistics.planningRecords;
  }

  function updateHistoricalPlanningRecords(snapshot, data = globalScope.appData) {
    const records = ensurePlanningRecordState(data);
    const todayStr = snapshot?.todayStr || getTodayStr();

    if (
      snapshot?.topObjective &&
      (!records.topObjectiveProgress ||
        Number(snapshot.topObjective.effectiveProgress) > Number(records.topObjectiveProgress.value || 0))
    ) {
      records.topObjectiveProgress = {
        name: snapshot.topObjective.name,
        value: snapshot.topObjective.effectiveProgress,
        date: todayStr,
      };
    }

    return records;
  }

  function renderPlanningStatisticsPanel(todayActivities) {
    const snapshot = getPlanningStatisticsSnapshot(globalScope.appData, { todayActivities });
    updateHistoricalPlanningRecords(snapshot, globalScope.appData);

    const statObjectivesActive = document.getElementById('stat-objectives-active');
    if (statObjectivesActive) statObjectivesActive.textContent = String(snapshot.objectivesActive || 0);

    const statObjectivesRisk = document.getElementById('stat-objectives-risk');
    if (statObjectivesRisk) statObjectivesRisk.textContent = String(snapshot.atRiskObjectives || 0);

    const planningHealthEl = document.getElementById('stat-planning-health');
    if (planningHealthEl) {
      planningHealthEl.innerHTML = `
        <p>Objetivos ativos: ${snapshot.objectivesActive}</p>
        <p>Focos puxados hoje: ${snapshot.focusCount}</p>
        <p>Alertas de metas: ${snapshot.atRiskObjectives}</p>
        <p>Feedbacks recentes: ${snapshot.recentFeedbackCount}</p>
      `;
    }

    const objectiveProgressEl = document.getElementById('stat-objective-progress');
    if (objectiveProgressEl) {
      if (!snapshot.topObjective) {
        objectiveProgressEl.innerHTML = '<p>Sem objetivo ativo.</p>';
      } else {
        objectiveProgressEl.innerHTML = `
          <p><strong>${safeEscape(snapshot.topObjective.name)}</strong></p>
          <p>Progresso efetivo: ${snapshot.topObjective.effectiveProgress}%</p>
          <p>Atividades ligadas: ${snapshot.topObjective.linkedActivitiesOpen}</p>
          <p>Atrasadas: ${snapshot.topObjective.overdueOpenCount}</p>
          <p>Feedbacks recentes: ${snapshot.topObjective.recentFeedbackCount}</p>
        `;
      }
    }

    return snapshot;
  }

  function getPlanningRecords(data = globalScope.appData) {
    const recordState = ensurePlanningRecordState(data);
    const records = [];

    if (recordState.topObjectiveProgress) {
      records.push({
        emoji: '🎯',
        label: 'Maior progresso efetivo em objetivo',
        value: `${recordState.topObjectiveProgress.name} (${recordState.topObjectiveProgress.value}%)`,
      });
    }

    return records;
  }

  function renderPlanningViews(todayActivities) {
    ensurePlanningState();
    populateObjectiveOptions();
    renderObjectiveList();
    renderPlanningDashboard(todayActivities || []);
  }

  function initPlanningEvents() {
    if (globalScope.__planningEventsBound) return;
    globalScope.__planningEventsBound = true;

    document.addEventListener('click', function (event) {
      const completeObjectiveBtn = event.target.closest('.planning-complete-objective-btn');
      if (completeObjectiveBtn) {
        const id = normalizeId(completeObjectiveBtn.getAttribute('data-id'));
        if (id) completeObjective(id);
        return;
      }

      const editObjectiveBtn = event.target.closest('.planning-edit-objective-btn');
      if (editObjectiveBtn) {
        const id = normalizeId(editObjectiveBtn.getAttribute('data-id'));
        if (id) editObjective(id);
        return;
      }

      const deleteObjectiveBtn = event.target.closest('.planning-delete-objective-btn');
      if (deleteObjectiveBtn) {
        const id = normalizeId(deleteObjectiveBtn.getAttribute('data-id'));
        if (id) deleteObjective(id);
      }
    });
  }

  const AppPlanning = {
    PRIORITY_LABELS,
    TIER_LABELS,
    ensurePlanningState,
    normalizePlanningFields,
    applyPlanningFields,
    readActivityPlanningFields,
    fillActivityPlanningForm,
    comparePlannedActivities,
    getActivityPlanningMeta,
    buildPlanningSnapshot,
    getPlanningStatisticsSnapshot,
    updateHistoricalPlanningRecords,
    getPlanningRecords,
    renderPlanningViews,
    renderPlanningDashboard,
    renderPlanningStatisticsPanel,
    handleObjectiveSubmit,
    completeObjective,
    initPlanningEvents,
    populateObjectiveOptions,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppPlanning;
  }

  if (globalScope) {
    Object.assign(globalScope, AppPlanning);
  }
})(typeof window !== 'undefined' ? window : globalThis);
