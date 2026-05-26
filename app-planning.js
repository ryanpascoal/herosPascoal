(function (globalScope) {
  'use strict';

  const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
  const TIER_ORDER = { high: 3, medium: 2, low: 1 };
  const PRIORITY_LABELS = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  const TIER_LABELS = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  const HORIZON_LABELS = {
    annual: 'Anual',
    quarter: 'Trimestral',
    month: 'Mensal',
    custom: 'Livre',
  };
  const STATUS_LABELS = {
    active: 'Ativo',
    paused: 'Pausado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };
  const PROGRESS_MODE_LABELS = {
    manual: 'Manual',
    auto: 'Automático',
    hybrid: 'Híbrido',
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
      if (!Number.isNaN(parsedFromNative.getTime())) {
        dateValue = parsedFromNative;
      }
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
    return parsedDate.toLocaleDateString('pt-BR');
  }

  function diffDaysFrom(todayStr, targetStr) {
    const today = parseIsoDate(todayStr);
    const target = parseIsoDate(targetStr);
    if (!today || !target) return null;
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / 86400000);
  }

  function getTodayStr() {
    if (typeof globalScope.getLocalDateString === 'function') {
      return globalScope.getLocalDateString();
    }
    return toIsoDate(new Date());
  }

  function normalizePlanningFields(item) {
    if (!item || typeof item !== 'object') return item;
    item.objectiveId = normalizeId(item.objectiveId);
    item.projectId = normalizeId(item.projectId);
    item.priority = normalizeEnum(item.priority, Object.keys(PRIORITY_ORDER), 'medium');
    item.impact = normalizeEnum(item.impact, Object.keys(TIER_ORDER), 'medium');
    item.effort = normalizeEnum(item.effort, Object.keys(TIER_ORDER), 'medium');
    item.energy = normalizeEnum(item.energy, Object.keys(TIER_ORDER), 'medium');
    return item;
  }

  function normalizeObjective(objective) {
    if (!objective || typeof objective !== 'object') return objective;
    objective.status = normalizeEnum(
      objective.status,
      ['active', 'paused', 'completed', 'cancelled'],
      'active'
    );
    objective.horizon = normalizeEnum(
      objective.horizon,
      ['annual', 'quarter', 'month', 'custom'],
      'quarter'
    );
    objective.progress = normalizeProgress(objective.progress);
    objective.progressMode = normalizeEnum(objective.progressMode, ['manual', 'auto', 'hybrid'], 'hybrid');
    objective.targetDate = toIsoDate(objective.targetDate) || '';
    objective.notes = typeof objective.notes === 'string' ? objective.notes : '';
    objective.updatedAt = toIsoDate(objective.updatedAt) || objective.updatedAt || getTodayStr();
    return objective;
  }

  function normalizeProject(project) {
    if (!project || typeof project !== 'object') return project;
    project.objectiveId = normalizeId(project.objectiveId);
    project.status = normalizeEnum(
      project.status,
      ['active', 'paused', 'completed', 'cancelled'],
      'active'
    );
    project.progress = normalizeProgress(project.progress);
    project.progressMode = normalizeEnum(project.progressMode, ['manual', 'auto', 'hybrid'], 'hybrid');
    project.targetDate = toIsoDate(project.targetDate) || '';
    project.nextAction = typeof project.nextAction === 'string' ? project.nextAction : '';
    project.notes = typeof project.notes === 'string' ? project.notes : '';
    project.updatedAt = toIsoDate(project.updatedAt) || project.updatedAt || getTodayStr();
    return project;
  }

  function normalizeReview(review) {
    if (!review || typeof review !== 'object') return review;
    review.periodType = normalizeEnum(review.periodType, ['weekly', 'monthly'], 'weekly');
    review.periodStart = toIsoDate(review.periodStart) || getTodayStr();
    review.wins = typeof review.wins === 'string' ? review.wins : '';
    review.blockers = typeof review.blockers === 'string' ? review.blockers : '';
    review.nextFocus = typeof review.nextFocus === 'string' ? review.nextFocus : '';
    review.notes = typeof review.notes === 'string' ? review.notes : '';
    review.createdAt = toIsoDate(review.createdAt) || getTodayStr();
    return review;
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

  function getProjectById(data, projectId) {
    const normalizedId = normalizeId(projectId);
    if (!normalizedId) return null;
    return (data.projects || []).find((project) => Number(project.id) === normalizedId) || null;
  }

  function getObjectiveById(data, objectiveId) {
    const normalizedId = normalizeId(objectiveId);
    if (!normalizedId) return null;
    return (data.objectives || []).find((objective) => Number(objective.id) === normalizedId) || null;
  }

  function itemBelongsToObjective(data, item, objectiveId) {
    if (!item) return false;
    const normalizedObjectiveId = normalizeId(objectiveId);
    if (!normalizedObjectiveId) return false;
    if (normalizeId(item.objectiveId) === normalizedObjectiveId) return true;
    const project = getProjectById(data, item.projectId);
    return normalizeId(project?.objectiveId) === normalizedObjectiveId;
  }

  function itemBelongsToProject(item, projectId) {
    if (!item) return false;
    return normalizeId(item.projectId) === normalizeId(projectId);
  }

  function getLastProgressDateForObjective(data, objectiveId) {
    const objective = getObjectiveById(data, objectiveId);
    let latest = toIsoDate(objective?.updatedAt) || '';

    (data.projects || []).forEach((project) => {
      if (normalizeId(project.objectiveId) !== normalizeId(objectiveId)) return;
      const updatedAt = toIsoDate(project.updatedAt) || '';
      if (updatedAt > latest) latest = updatedAt;
    });

    getCompletionEvents(data).forEach((event) => {
      if (!itemBelongsToObjective(data, event.item, objectiveId)) return;
      const eventDate = toIsoDate(event.date) || '';
      if (eventDate > latest) latest = eventDate;
    });

    return latest;
  }

  function getLastProgressDateForProject(data, projectId) {
    const project = getProjectById(data, projectId);
    let latest = toIsoDate(project?.updatedAt) || '';

    getCompletionEvents(data).forEach((event) => {
      if (!itemBelongsToProject(event.item, projectId)) return;
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

  function isDateWithinWindow(dateStr, todayStr, windowDays) {
    const diffDays = diffDaysFrom(dateStr, todayStr);
    return diffDays !== null && diffDays >= 0 && diffDays <= windowDays;
  }

  function getOpenActivitiesForObjective(data, objectiveId) {
    return getActiveActivityCollections(data).filter(({ item }) => itemBelongsToObjective(data, item, objectiveId));
  }

  function getOpenActivitiesForProject(data, projectId) {
    return getActiveActivityCollections(data).filter(({ item }) => itemBelongsToProject(item, projectId));
  }

  function getOverdueOpenActivities(activityEntries, todayStr) {
    return activityEntries.filter(({ item }) => {
      const dueDate = getActivityDueDate(item);
      const dueInDays = dueDate ? diffDaysFrom(todayStr, dueDate) : null;
      return dueInDays !== null && dueInDays < 0;
    });
  }

  function getRecentEventsForSelector(completionEvents, todayStr, windowDays, selector) {
    return completionEvents.filter(
      (event) => selector(event.item) && isDateWithinWindow(event.date, todayStr, windowDays)
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
    const limit = toFiniteNumber(options.limit, 4);

    return (data.feedbacks || [])
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      .filter((entry) => isDateWithinWindow(toIsoDate(entry.date) || '', todayStr, windowDays))
      .map((entry) => {
        const sourceItem = resolveFeedbackSourceItem(data, entry);
        const sourceProject = getProjectById(data, sourceItem?.projectId);
        const sourceObjective =
          getObjectiveById(data, sourceItem?.objectiveId) ||
          getObjectiveById(data, sourceProject?.objectiveId);

        return {
          type: entry.type,
          feedback: entry.feedback || '',
          date: toIsoDate(entry.date) || '',
          itemName: sourceItem?.name || '',
          projectId: normalizeId(sourceProject?.id),
          projectName: sourceProject?.name || '',
          objectiveId: normalizeId(sourceObjective?.id),
          objectiveName: sourceObjective?.name || '',
        };
      })
      .filter((entry) => entry.feedback)
      .slice(0, limit);
  }

  function buildExecutionStats(data, options = {}) {
    const todayStr = options.todayStr || getTodayStr();
    const completionEvents = options.completionEvents || getCompletionEvents(data);
    const activityWindow = toFiniteNumber(options.activityWindow, RECENT_ACTIVITY_WINDOW_DAYS);
    const feedbackInsights = options.feedbackInsights || getRecentFeedbackInsights(data, todayStr, { limit: 20 });
    const openActivities = options.projectId
      ? getOpenActivitiesForProject(data, options.projectId)
      : getOpenActivitiesForObjective(data, options.objectiveId);
    const recentEvents = getRecentEventsForSelector(
      completionEvents,
      todayStr,
      activityWindow,
      options.projectId
        ? (item) => itemBelongsToProject(item, options.projectId)
        : (item) => itemBelongsToObjective(data, item, options.objectiveId)
    );
    const recentCompleted = dedupeEventsByLineage(recentEvents.filter(isCompletedEvent));
    const recentFailed = dedupeEventsByLineage(recentEvents.filter(isFailedEvent));
    const overdueOpen = getOverdueOpenActivities(openActivities, todayStr);
    const recentFeedbackCount = feedbackInsights.filter((entry) =>
      options.projectId ? entry.projectId === normalizeId(options.projectId) : entry.objectiveId === normalizeId(options.objectiveId)
    ).length;
    const baseCount = Math.max(1, openActivities.length);
    const coverageBase = Math.max(1, openActivities.length + recentCompleted.length + recentFailed.length);
    const coveragePercent = normalizeProgress((recentCompleted.length / coverageBase) * 100);
    const consistencyPercent = normalizeProgress(
      Math.max(0, 100 - (overdueOpen.length * 12) - (recentFailed.length * 10))
    );
    const feedbackPercent = normalizeProgress(recentFeedbackCount * 20);
    const autoProgress = normalizeProgress(
      (coveragePercent * 0.45) +
      ((normalizeProgress((recentCompleted.length / baseCount) * 100)) * 0.3) +
      (feedbackPercent * 0.1) +
      (consistencyPercent * 0.15)
    );

    return {
      openActivitiesCount: openActivities.length,
      overdueOpenCount: overdueOpen.length,
      recentCompletedCount: recentCompleted.length,
      recentFailedCount: recentFailed.length,
      recentFeedbackCount,
      coveragePercent,
      consistencyPercent,
      autoProgress,
      rhythmPercent: normalizeProgress((recentCompleted.length / baseCount) * 100),
      pressureScore: normalizeProgress((overdueOpen.length * 20) + (recentFailed.length * 15)),
    };
  }

  function resolveEffectiveProgress(manualProgress, autoProgress, progressMode) {
    const safeManual = normalizeProgress(manualProgress);
    const safeAuto = normalizeProgress(autoProgress);
    const mode = normalizeEnum(progressMode, ['manual', 'auto', 'hybrid'], 'hybrid');
    if (mode === 'manual') return safeManual;
    if (mode === 'auto') return safeAuto;
    return normalizeProgress((safeManual * 0.5) + (safeAuto * 0.5));
  }

  function getActivityDueDate(item) {
    if (!item) return '';
    if (item.type === 'eventual') return toIsoDate(item.date) || '';
    if (item.type === 'epica') return toIsoDate(item.deadline) || '';
    return '';
  }

  function getActivityPriorityScore(activityEntry) {
    const item = activityEntry?.item || activityEntry;
    const priorityScore = PRIORITY_ORDER[item?.priority] || PRIORITY_ORDER.medium;
    const impactScore = TIER_ORDER[item?.impact] || TIER_ORDER.medium;
    const effortScore = TIER_ORDER[item?.effort] || TIER_ORDER.medium;
    const energyScore = TIER_ORDER[item?.energy] || TIER_ORDER.medium;
    const dueDate = getActivityDueDate(item);
    const daysToDue = dueDate ? diffDaysFrom(getTodayStr(), dueDate) : null;
    const dueScore =
      daysToDue === null ? 0 : daysToDue < 0 ? 6 : daysToDue === 0 ? 5 : daysToDue <= 2 ? 4 : 1;
    const urgentScore = activityEntry?.category === 'work' && item?.urgent ? 4 : 0;
    return (priorityScore * 10) + (impactScore * 7) + dueScore + urgentScore - effortScore + energyScore;
  }

  function comparePlannedActivities(left, right) {
    const scoreDiff = getActivityPriorityScore(right) - getActivityPriorityScore(left);
    if (scoreDiff !== 0) return scoreDiff;
    const leftDueDate = getActivityDueDate(left?.item || left) || '9999-12-31';
    const rightDueDate = getActivityDueDate(right?.item || right) || '9999-12-31';
    if (leftDueDate !== rightDueDate) return String(leftDueDate).localeCompare(String(rightDueDate), 'pt-BR');
    const leftName = String((left?.item || left)?.name || '');
    const rightName = String((right?.item || right)?.name || '');
    return leftName.localeCompare(rightName, 'pt-BR');
  }

  function readActivityPlanningFields() {
    return {
      objectiveId: normalizeId(document.getElementById('activity-objective')?.value),
      projectId: normalizeId(document.getElementById('activity-project')?.value),
      priority: normalizeEnum(
        document.getElementById('activity-priority')?.value,
        Object.keys(PRIORITY_ORDER),
        'medium'
      ),
      impact: normalizeEnum(
        document.getElementById('activity-impact')?.value,
        Object.keys(TIER_ORDER),
        'medium'
      ),
      effort: normalizeEnum(
        document.getElementById('activity-effort')?.value,
        Object.keys(TIER_ORDER),
        'medium'
      ),
      energy: normalizeEnum(
        document.getElementById('activity-energy')?.value,
        Object.keys(TIER_ORDER),
        'medium'
      ),
    };
  }

  function fillActivityPlanningForm(item) {
    if (!item) return;
    const objectiveSelect = document.getElementById('activity-objective');
    const projectSelect = document.getElementById('activity-project');
    const prioritySelect = document.getElementById('activity-priority');
    const impactSelect = document.getElementById('activity-impact');
    const effortSelect = document.getElementById('activity-effort');
    const energySelect = document.getElementById('activity-energy');

    if (objectiveSelect) objectiveSelect.value = String(normalizeId(item.objectiveId) || '');
    updateProjectSelectOptions();
    if (projectSelect) projectSelect.value = String(normalizeId(item.projectId) || '');
    if (prioritySelect) prioritySelect.value = item.priority || 'medium';
    if (impactSelect) impactSelect.value = item.impact || 'medium';
    if (effortSelect) effortSelect.value = item.effort || 'medium';
    if (energySelect) energySelect.value = item.energy || 'medium';
  }

  function touchPlanningRelation(parentEntity) {
    if (!parentEntity || typeof parentEntity !== 'object') return;
    parentEntity.updatedAt = getTodayStr();
  }

  function applyPlanningFields(item, planningFields) {
    if (!item || typeof item !== 'object') return item;
    Object.assign(item, planningFields || {});
    normalizePlanningFields(item);
    const linkedObjective = getObjectiveById(globalScope.appData, item.objectiveId);
    const linkedProject = getProjectById(globalScope.appData, item.projectId);
    touchPlanningRelation(linkedObjective);
    touchPlanningRelation(linkedProject);
    return item;
  }

  function populateObjectiveOptions() {
    const selects = [
      document.getElementById('activity-objective'),
      document.getElementById('project-objective'),
    ].filter(Boolean);

    const objectives = (globalScope.appData?.objectives || []).slice().sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
    );

    selects.forEach((select) => {
      const currentValue = select.value;
      const defaultLabel = select.id === 'project-objective' ? 'Sem objetivo' : 'Nenhum';
      select.innerHTML =
        `<option value="">${defaultLabel}</option>` +
        objectives
          .map(
            (objective) =>
              `<option value="${objective.id}">${safeEscape(objective.name || 'Objetivo')}</option>`
          )
          .join('');
      if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
      }
    });
  }

  function updateProjectSelectOptions() {
    const projectSelect = document.getElementById('activity-project');
    if (!projectSelect) return;
    const objectiveId = normalizeId(document.getElementById('activity-objective')?.value);
    const currentValue = projectSelect.value;
    const allProjects = (globalScope.appData?.projects || []).filter((project) =>
      project.status === 'active' || project.status === 'paused'
    );
    const filteredProjects = allProjects
      .filter((project) => !objectiveId || normalizeId(project.objectiveId) === objectiveId)
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));

    projectSelect.innerHTML =
      '<option value="">Nenhum</option>' +
      filteredProjects
        .map(
          (project) => `<option value="${project.id}">${safeEscape(project.name || 'Projeto')}</option>`
        )
        .join('');

    if (currentValue && projectSelect.querySelector(`option[value="${currentValue}"]`)) {
      projectSelect.value = currentValue;
    }
  }

  function syncActivityObjectiveFromProject() {
    const projectSelect = document.getElementById('activity-project');
    const objectiveSelect = document.getElementById('activity-objective');
    if (!projectSelect || !objectiveSelect) return;
    const selectedProject = getProjectById(globalScope.appData, projectSelect.value);
    if (selectedProject?.objectiveId && !objectiveSelect.value) {
      objectiveSelect.value = String(selectedProject.objectiveId);
      updateProjectSelectOptions();
      projectSelect.value = String(selectedProject.id);
    }
  }

  function safeEscape(value) {
    const stringValue = String(value ?? '');
    if (typeof globalScope.escapeHtml === 'function') {
      return globalScope.escapeHtml(stringValue);
    }
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getActivityPlanningMeta(item) {
    if (!item) return null;
    const objective = getObjectiveById(globalScope.appData, item.objectiveId);
    const project = getProjectById(globalScope.appData, item.projectId);
    return {
      objectiveName: objective?.name || '',
      projectName: project?.name || '',
      priorityLabel: PRIORITY_LABELS[item.priority || 'medium'] || PRIORITY_LABELS.medium,
      impactLabel: TIER_LABELS[item.impact || 'medium'] || TIER_LABELS.medium,
      effortLabel: TIER_LABELS[item.effort || 'medium'] || TIER_LABELS.medium,
      energyLabel: TIER_LABELS[item.energy || 'medium'] || TIER_LABELS.medium,
    };
  }

  function buildPlanningSnapshot(data, todayActivities = [], options = {}) {
    const todayStr = options.todayStr || getTodayStr();
    const activeObjectives = (data.objectives || []).filter((objective) => objective.status === 'active');
    const activeProjects = (data.projects || []).filter((project) => project.status === 'active');
    const completionEvents = getCompletionEvents(data);
    const feedbackInsights = getRecentFeedbackInsights(data, todayStr, { limit: 6 });
    const recentThreshold = parseIsoDate(todayStr);
    if (recentThreshold) recentThreshold.setDate(recentThreshold.getDate() - 7);
    const thresholdStr = recentThreshold ? toIsoDate(recentThreshold) : '';

    const objectiveCards = activeObjectives
      .map((objective) => {
        const linkedProjects = (data.projects || []).filter(
          (project) => normalizeId(project.objectiveId) === normalizeId(objective.id)
        );
        const linkedActivities = getOpenActivitiesForObjective(data, objective.id);
        const recentCompletions = completionEvents.filter(
          (event) =>
            itemBelongsToObjective(data, event.item, objective.id) &&
            (!thresholdStr || String(event.date || '') >= thresholdStr)
        );
        const executionStats = buildExecutionStats(data, {
          objectiveId: objective.id,
          todayStr,
          completionEvents,
          feedbackInsights,
        });
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
          horizon: objective.horizon,
          status: objective.status,
          progress: objective.progress,
          effectiveProgress,
          autoProgress: executionStats.autoProgress,
          progressMode: objective.progressMode,
          targetDate: objective.targetDate,
          dueInDays,
          linkedProjectsOpen: linkedProjects.filter((project) => project.status !== 'completed').length,
          linkedActivitiesOpen: linkedActivities.filter(({ item }) => !item.completed).length,
          todayActivities: todayActivities.filter(({ item }) => itemBelongsToObjective(data, item, objective.id))
            .length,
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

    const projectCards = activeProjects
      .map((project) => {
        const executionStats = buildExecutionStats(data, {
          projectId: project.id,
          todayStr,
          completionEvents,
          feedbackInsights,
        });
        const effectiveProgress = resolveEffectiveProgress(
          project.progress,
          executionStats.autoProgress,
          project.progressMode
        );
        const dueInDays = project.targetDate ? diffDaysFrom(todayStr, project.targetDate) : null;
        const lastProgressDate = getLastProgressDateForProject(data, project.id);
        const stalledDays =
          lastProgressDate && diffDaysFrom(lastProgressDate, todayStr) !== null
            ? Math.abs(diffDaysFrom(lastProgressDate, todayStr))
            : null;
        const objective = getObjectiveById(data, project.objectiveId);

        return {
          id: project.id,
          name: project.name,
          objectiveName: objective?.name || '',
          progress: project.progress,
          effectiveProgress,
          autoProgress: executionStats.autoProgress,
          progressMode: project.progressMode,
          targetDate: project.targetDate,
          dueInDays,
          nextAction: project.nextAction || '',
          stalledDays,
          rhythmPercent: executionStats.rhythmPercent,
          pressureScore: executionStats.pressureScore,
          overdueOpenCount: executionStats.overdueOpenCount,
          recentCompletedCount: executionStats.recentCompletedCount,
          recentFailedCount: executionStats.recentFailedCount,
          recentFeedbackCount: executionStats.recentFeedbackCount,
        };
      })
      .sort((left, right) => {
        if ((right.pressureScore || 0) !== (left.pressureScore || 0)) {
          return (right.pressureScore || 0) - (left.pressureScore || 0);
        }
        return (left.dueInDays ?? Number.POSITIVE_INFINITY) - (right.dueInDays ?? Number.POSITIVE_INFINITY);
      });

    const alerts = [];

    objectiveCards.forEach((objective) => {
      if (objective.stalledDays !== null && objective.stalledDays >= 7) {
        alerts.push({
          type: 'warning',
          title: `Objetivo parado há ${objective.stalledDays} dias`,
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
          title: 'Objetivo com pendências vencidas',
          description: `${objective.name} (${objective.overdueOpenCount} atrasadas)`,
        });
      }
    });

    projectCards.forEach((project) => {
      if (project.dueInDays !== null && project.dueInDays < 0 && project.effectiveProgress < 100) {
        alerts.push({
          type: 'danger',
          title: 'Projeto atrasado',
          description: `${project.name} (${Math.abs(project.dueInDays)}d de atraso)`,
        });
      }
      if (!project.nextAction) {
        alerts.push({
          type: 'warning',
          title: 'Projeto sem próxima ação',
          description: project.name,
        });
      }
      if (project.stalledDays !== null && project.stalledDays >= 10) {
        alerts.push({
          type: 'muted',
          title: `Projeto sem movimento há ${project.stalledDays} dias`,
          description: project.name,
        });
      }
      if (project.overdueOpenCount > 0) {
        alerts.push({
          type: 'warning',
          title: 'Projeto acumulando atraso',
          description: `${project.name} (${project.overdueOpenCount} ações vencidas)`,
        });
      }
    });

    const latestReviewDate = (data.reviews || [])
      .map((review) => toIsoDate(review.periodStart) || '')
      .sort()
      .pop() || '';
    const daysSinceReview =
      latestReviewDate && diffDaysFrom(latestReviewDate, todayStr) !== null
        ? Math.abs(diffDaysFrom(latestReviewDate, todayStr))
        : null;
    if (daysSinceReview === null || daysSinceReview >= 7) {
      alerts.push({
        type: 'muted',
        title: 'Revisão semanal atrasada',
        description: daysSinceReview === null ? 'Nenhuma revisão registrada' : `${daysSinceReview} dias sem revisar`,
      });
    }

    return {
      todayStr,
      objectivesActive: activeObjectives.length,
      projectsActive: activeProjects.length,
      reviewsCount: (data.reviews || []).length,
      daysSinceReview,
      focusItems: todayActivities.slice().sort(comparePlannedActivities).slice(0, 5),
      objectiveCards: objectiveCards.slice(0, 6),
      projectCards: projectCards.slice(0, 6),
      alerts: alerts.slice(0, 10),
      feedbackInsights,
      latestReviews: (data.reviews || []).slice().sort((a, b) => String(b.periodStart).localeCompare(String(a.periodStart))).slice(0, 3),
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
    if (!Array.isArray(data.projects)) data.projects = [];
    if (!Array.isArray(data.reviews)) data.reviews = [];

    data.objectives.forEach(normalizeObjective);
    data.projects.forEach(normalizeProject);
    data.reviews.forEach(normalizeReview);

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
    const progressInput = document.getElementById('objective-progress');
    if (progressInput) progressInput.value = '0';
  }

  function resetProjectForm() {
    const form = document.getElementById('project-form');
    if (!form) return;
    form.reset();
    const editIdInput = document.getElementById('project-edit-id');
    if (editIdInput) editIdInput.value = '';
    const progressInput = document.getElementById('project-progress');
    if (progressInput) progressInput.value = '0';
  }

  function handleObjectiveSubmit(event) {
    event.preventDefault();
    ensurePlanningState();

    const name = document.getElementById('objective-name')?.value?.trim();
    if (!name) {
      globalScope.showFeedback?.('Informe um nome para o objetivo.', 'warn');
      return;
    }

    const horizon = document.getElementById('objective-horizon')?.value || 'quarter';
    const status = document.getElementById('objective-status')?.value || 'active';
    const targetDate = toIsoDate(document.getElementById('objective-target-date')?.value) || '';
    const progress = normalizeProgress(document.getElementById('objective-progress')?.value);
    const progressMode = document.getElementById('objective-progress-mode')?.value || 'hybrid';
    const notes = document.getElementById('objective-notes')?.value?.trim() || '';
    const editId = normalizeId(document.getElementById('objective-edit-id')?.value);
    const todayStr = getTodayStr();

    if (editId) {
      const objective = getObjectiveById(globalScope.appData, editId);
      if (!objective) return;
      objective.name = name;
      objective.horizon = horizon;
      objective.status = status;
      objective.targetDate = targetDate;
      objective.progress = progress;
      objective.progressMode = progressMode;
      objective.notes = notes;
      objective.updatedAt = todayStr;
      normalizeObjective(objective);
      globalScope.showFeedback?.('Objetivo atualizado.', 'success');
    } else {
      globalScope.appData.objectives.push(
        normalizeObjective({
          id: createPlanningEntityId(globalScope.appData.objectives),
          name,
          horizon,
          status,
          targetDate,
          progress,
          progressMode,
          notes,
          createdAt: todayStr,
          updatedAt: todayStr,
        })
      );
      globalScope.showFeedback?.('Objetivo criado.', 'success');
    }

    resetObjectiveForm();
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function handleProjectSubmit(event) {
    event.preventDefault();
    ensurePlanningState();

    const name = document.getElementById('project-name')?.value?.trim();
    if (!name) {
      globalScope.showFeedback?.('Informe um nome para o projeto.', 'warn');
      return;
    }

    const objectiveId = normalizeId(document.getElementById('project-objective')?.value);
    const status = document.getElementById('project-status')?.value || 'active';
    const targetDate = toIsoDate(document.getElementById('project-target-date')?.value) || '';
    const progress = normalizeProgress(document.getElementById('project-progress')?.value);
    const progressMode = document.getElementById('project-progress-mode')?.value || 'hybrid';
    const nextAction = document.getElementById('project-next-action')?.value?.trim() || '';
    const notes = document.getElementById('project-notes')?.value?.trim() || '';
    const editId = normalizeId(document.getElementById('project-edit-id')?.value);
    const todayStr = getTodayStr();

    if (editId) {
      const project = getProjectById(globalScope.appData, editId);
      if (!project) return;
      project.name = name;
      project.objectiveId = objectiveId;
      project.status = status;
      project.targetDate = targetDate;
      project.progress = progress;
      project.progressMode = progressMode;
      project.nextAction = nextAction;
      project.notes = notes;
      project.updatedAt = todayStr;
      normalizeProject(project);
      globalScope.showFeedback?.('Projeto atualizado.', 'success');
    } else {
      globalScope.appData.projects.push(
        normalizeProject({
          id: createPlanningEntityId(globalScope.appData.projects),
          name,
          objectiveId,
          status,
          targetDate,
          progress,
          progressMode,
          nextAction,
          notes,
          createdAt: todayStr,
          updatedAt: todayStr,
        })
      );
      globalScope.showFeedback?.('Projeto criado.', 'success');
    }

    if (objectiveId) {
      touchPlanningRelation(getObjectiveById(globalScope.appData, objectiveId));
    }
    resetProjectForm();
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function handleReviewSubmit(event) {
    event.preventDefault();
    ensurePlanningState();

    const periodType = document.getElementById('review-period-type')?.value || 'weekly';
    const periodStart = toIsoDate(document.getElementById('review-period-start')?.value) || getTodayStr();
    const wins = document.getElementById('review-wins')?.value?.trim() || '';
    const blockers = document.getElementById('review-blockers')?.value?.trim() || '';
    const nextFocus = document.getElementById('review-next-focus')?.value?.trim() || '';
    const notes = document.getElementById('review-notes')?.value?.trim() || '';

    if (!wins && !blockers && !nextFocus && !notes) {
      globalScope.showFeedback?.('Preencha pelo menos um campo da revisão.', 'warn');
      return;
    }

    globalScope.appData.reviews.push(
      normalizeReview({
        id: createPlanningEntityId(globalScope.appData.reviews),
        periodType,
        periodStart,
        wins,
        blockers,
        nextFocus,
        notes,
        createdAt: getTodayStr(),
      })
    );

    event.target.reset();
    const reviewDateInput = document.getElementById('review-period-start');
    if (reviewDateInput) reviewDateInput.value = getTodayStr();
    globalScope.showFeedback?.('Revisão salva.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function editObjective(id) {
    const objective = getObjectiveById(globalScope.appData, id);
    if (!objective) return;
    const editIdInput = document.getElementById('objective-edit-id');
    if (editIdInput) editIdInput.value = objective.id;
    const nameInput = document.getElementById('objective-name');
    const horizonInput = document.getElementById('objective-horizon');
    const statusInput = document.getElementById('objective-status');
    const targetDateInput = document.getElementById('objective-target-date');
    const progressInput = document.getElementById('objective-progress');
    const progressModeInput = document.getElementById('objective-progress-mode');
    const notesInput = document.getElementById('objective-notes');
    if (nameInput) nameInput.value = objective.name || '';
    if (horizonInput) horizonInput.value = objective.horizon || 'quarter';
    if (statusInput) statusInput.value = objective.status || 'active';
    if (targetDateInput) targetDateInput.value = objective.targetDate || '';
    if (progressInput) progressInput.value = String(normalizeProgress(objective.progress));
    if (progressModeInput) progressModeInput.value = objective.progressMode || 'hybrid';
    if (notesInput) notesInput.value = objective.notes || '';
    nameInput?.focus();
  }

  function editProject(id) {
    const project = getProjectById(globalScope.appData, id);
    if (!project) return;
    const editIdInput = document.getElementById('project-edit-id');
    if (editIdInput) editIdInput.value = project.id;
    const nameInput = document.getElementById('project-name');
    const objectiveInput = document.getElementById('project-objective');
    const statusInput = document.getElementById('project-status');
    const targetDateInput = document.getElementById('project-target-date');
    const progressInput = document.getElementById('project-progress');
    const progressModeInput = document.getElementById('project-progress-mode');
    const nextActionInput = document.getElementById('project-next-action');
    const notesInput = document.getElementById('project-notes');
    if (nameInput) nameInput.value = project.name || '';
    if (objectiveInput) objectiveInput.value = String(normalizeId(project.objectiveId) || '');
    if (statusInput) statusInput.value = project.status || 'active';
    if (targetDateInput) targetDateInput.value = project.targetDate || '';
    if (progressInput) progressInput.value = String(normalizeProgress(project.progress));
    if (progressModeInput) progressModeInput.value = project.progressMode || 'hybrid';
    if (nextActionInput) nextActionInput.value = project.nextAction || '';
    if (notesInput) notesInput.value = project.notes || '';
    nameInput?.focus();
  }

  function clearActivityPlanningLinks(matchFn, clearProjectLinksOnly = false) {
    getActiveActivityCollections(globalScope.appData).forEach(({ item }) => {
      if (!matchFn(item)) return;
      if (!clearProjectLinksOnly) item.objectiveId = null;
      item.projectId = null;
    });
  }

  function deleteObjective(id) {
    const objectiveId = normalizeId(id);
    if (!objectiveId) return;
    if (!globalScope.confirm?.('Excluir este objetivo e desvincular seus projetos/atividades?')) return;
    globalScope.appData.objectives = (globalScope.appData.objectives || []).filter(
      (objective) => normalizeId(objective.id) !== objectiveId
    );
    (globalScope.appData.projects || []).forEach((project) => {
      if (normalizeId(project.objectiveId) === objectiveId) project.objectiveId = null;
    });
    clearActivityPlanningLinks((item) => normalizeId(item.objectiveId) === objectiveId);
    globalScope.showFeedback?.('Objetivo excluído.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function deleteProject(id) {
    const projectId = normalizeId(id);
    if (!projectId) return;
    if (!globalScope.confirm?.('Excluir este projeto e desvincular atividades relacionadas?')) return;
    const project = getProjectById(globalScope.appData, projectId);
    const objectiveId = normalizeId(project?.objectiveId);
    globalScope.appData.projects = (globalScope.appData.projects || []).filter(
      (entry) => normalizeId(entry.id) !== projectId
    );
    clearActivityPlanningLinks((item) => normalizeId(item.projectId) === projectId, true);
    if (objectiveId) touchPlanningRelation(getObjectiveById(globalScope.appData, objectiveId));
    globalScope.showFeedback?.('Projeto excluído.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function deleteReview(id) {
    const reviewId = normalizeId(id);
    if (!reviewId) return;
    if (!globalScope.confirm?.('Excluir esta revisão?')) return;
    globalScope.appData.reviews = (globalScope.appData.reviews || []).filter(
      (review) => normalizeId(review.id) !== reviewId
    );
    globalScope.showFeedback?.('Revisão excluída.', 'success');
    globalScope.updateUI?.({ mode: 'activity' });
  }

  function renderObjectiveList() {
    const container = document.getElementById('objectives-list');
    if (!container) return;
    const objectives = (globalScope.appData?.objectives || []).slice().sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
    );
    const snapshot = buildPlanningSnapshot(globalScope.appData);
    if (objectives.length === 0) {
      container.innerHTML = '<p class="empty-message">Nenhum objetivo cadastrado.</p>';
      return;
    }

    container.innerHTML = objectives
      .map((objective) => {
        const card = snapshot.objectiveCards.find((entry) => Number(entry.id) === Number(objective.id));
        return `
          <div class="planning-item-card">
            <div class="planning-item-header">
              <div>
                <div class="planning-item-title">${safeEscape(objective.name || 'Objetivo')}</div>
                <div class="planning-item-meta">
                  <span>${safeEscape(HORIZON_LABELS[objective.horizon] || 'Livre')}</span>
                  <span>${safeEscape(STATUS_LABELS[objective.status] || 'Ativo')}</span>
                  ${objective.targetDate ? `<span>${safeEscape(formatDate(objective.targetDate))}</span>` : ''}
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
              <div class="planning-progress-fill" style="width: ${objective.effectiveProgress ?? normalizeProgress(objective.progress)}%"></div>
            </div>
            <div class="planning-item-foot">
              <span>${objective.effectiveProgress ?? normalizeProgress(objective.progress)}% efetivo</span>
              <span>${safeEscape(PROGRESS_MODE_LABELS[objective.progressMode] || 'Híbrido')}</span>
              <span>Manual ${normalizeProgress(objective.progress)}%</span>
              <span>Auto ${objective.autoProgress ?? 0}%</span>
              <span>${card?.linkedProjectsOpen || 0} projetos abertos</span>
              <span>${card?.linkedActivitiesOpen || 0} ações ligadas</span>
              <span>Ritmo ${card?.rhythmPercent || 0}%</span>
              <span>Pressão ${card?.pressureScore || 0}%</span>
              <span>${card?.overdueOpenCount || 0} atrasadas</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderProjectList() {
    const container = document.getElementById('projects-list');
    if (!container) return;
    const projects = (globalScope.appData?.projects || []).slice().sort((left, right) =>
      String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
    );
    const snapshot = buildPlanningSnapshot(globalScope.appData);
    if (projects.length === 0) {
      container.innerHTML = '<p class="empty-message">Nenhum projeto cadastrado.</p>';
      return;
    }

    container.innerHTML = projects
      .map((project) => {
        const objective = getObjectiveById(globalScope.appData, project.objectiveId);
        const card = snapshot.projectCards.find((entry) => Number(entry.id) === Number(project.id));
        return `
          <div class="planning-item-card">
            <div class="planning-item-header">
              <div>
                <div class="planning-item-title">${safeEscape(project.name || 'Projeto')}</div>
                <div class="planning-item-meta">
                  ${objective ? `<span>${safeEscape(objective.name)}</span>` : '<span>Sem objetivo</span>'}
                  <span>${safeEscape(STATUS_LABELS[project.status] || 'Ativo')}</span>
                  ${project.targetDate ? `<span>${safeEscape(formatDate(project.targetDate))}</span>` : ''}
                </div>
              </div>
              <div class="planning-item-actions">
                <button type="button" class="action-btn planning-edit-project-btn" data-id="${project.id}">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="action-btn planning-delete-project-btn" data-id="${project.id}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="planning-progress-bar">
              <div class="planning-progress-fill" style="width: ${card?.effectiveProgress ?? normalizeProgress(project.progress)}%"></div>
            </div>
            <div class="planning-item-foot">
              <span>${card?.effectiveProgress ?? normalizeProgress(project.progress)}% efetivo</span>
              <span>${safeEscape(PROGRESS_MODE_LABELS[project.progressMode] || 'Híbrido')}</span>
              <span>Manual ${normalizeProgress(project.progress)}%</span>
              <span>Auto ${card?.autoProgress ?? 0}%</span>
              <span>${project.nextAction ? safeEscape(project.nextAction) : 'Sem próxima ação'}</span>
              <span>Ritmo ${card?.rhythmPercent || 0}%</span>
              <span>Pressão ${card?.pressureScore || 0}%</span>
              <span>${card?.overdueOpenCount || 0} atrasadas</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderReviewsList() {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    const reviews = (globalScope.appData?.reviews || []).slice().sort((left, right) =>
      String(right.periodStart || '').localeCompare(String(left.periodStart || ''))
    );
    if (reviews.length === 0) {
      container.innerHTML = '<p class="empty-message">Nenhuma revisão registrada.</p>';
      return;
    }

    container.innerHTML = reviews
      .slice(0, 8)
      .map(
        (review) => `
          <div class="review-card">
            <div class="planning-item-header">
              <div>
                <div class="planning-item-title">${review.periodType === 'monthly' ? 'Revisão mensal' : 'Revisão semanal'}</div>
                <div class="planning-item-meta"><span>${safeEscape(formatDate(review.periodStart))}</span></div>
              </div>
              <div class="planning-item-actions">
                <button type="button" class="action-btn planning-delete-review-btn" data-id="${review.id}">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            ${review.wins ? `<p><strong>Ganhos:</strong> ${safeEscape(review.wins)}</p>` : ''}
            ${review.blockers ? `<p><strong>Travou:</strong> ${safeEscape(review.blockers)}</p>` : ''}
            ${review.nextFocus ? `<p><strong>Foco:</strong> ${safeEscape(review.nextFocus)}</p>` : ''}
            ${review.notes ? `<p><strong>Notas:</strong> ${safeEscape(review.notes)}</p>` : ''}
          </div>
        `
      )
      .join('');
  }

  function renderPlanningDashboard(todayActivities) {
    const container = document.getElementById('planning-dashboard');
    if (!container) return;
    const snapshot = buildPlanningSnapshot(globalScope.appData, todayActivities || []);

    const focusHtml =
      snapshot.focusItems.length === 0
        ? '<p class="empty-message">Nenhum foco puxado para hoje.</p>'
        : snapshot.focusItems
            .map(({ category, item }) => {
              const project = getProjectById(globalScope.appData, item.projectId);
              const objective = getObjectiveById(globalScope.appData, item.objectiveId);
              const dueDate = getActivityDueDate(item);
              return `
                <div class="focus-item">
                  <div class="focus-item-main">
                    <span class="focus-item-name">${safeEscape(item.name || 'Atividade')}</span>
                    <span class="focus-item-priority priority-${safeEscape(item.priority || 'medium')}">${safeEscape(PRIORITY_LABELS[item.priority || 'medium'])}</span>
                  </div>
                  <div class="focus-item-meta">
                    <span>${safeEscape(project?.name || objective?.name || category)}</span>
                    <span>Impacto ${safeEscape(TIER_LABELS[item.impact || 'medium'])}</span>
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
                    <span>${safeEscape(HORIZON_LABELS[objective.horizon] || 'Livre')}</span>
                    <span>${safeEscape(PROGRESS_MODE_LABELS[objective.progressMode] || 'Híbrido')}</span>
                    <span>Auto ${objective.autoProgress}%</span>
                    <span>${objective.linkedProjectsOpen} projetos</span>
                    <span>${objective.todayActivities} ações hoje</span>
                    ${
                      objective.stalledDays !== null
                        ? `<span>${objective.stalledDays}d sem avanço</span>`
                        : '<span>Sem histórico</span>'
                    }
                  </div>
                </div>
              `
            )
            .join('');

    const alertHtml =
      snapshot.alerts.length === 0
        ? '<p class="empty-message">Nenhum alerta crítico agora.</p>'
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

    const reviewHtml =
      snapshot.latestReviews.length === 0
        ? '<p class="empty-message">Sem revisão recente.</p>'
        : snapshot.latestReviews
            .map(
              (review) => `
                <div class="planning-review-pill">
                  <strong>${review.periodType === 'monthly' ? 'Mensal' : 'Semanal'}</strong>
                  <span>${safeEscape(formatDate(review.periodStart))}</span>
                  ${review.nextFocus ? `<span>${safeEscape(review.nextFocus)}</span>` : ''}
                </div>
              `
            )
            .join('');

    const projectHtml =
      snapshot.projectCards.length === 0
        ? '<p class="empty-message">Nenhum projeto ativo.</p>'
        : snapshot.projectCards
            .slice(0, 4)
            .map(
              (project) => `
                <div class="focus-objective-card">
                  <div class="focus-objective-header">
                    <span class="focus-objective-name">${safeEscape(project.name)}</span>
                    <span class="focus-objective-progress">${project.pressureScore}% pressão</span>
                  </div>
                  <div class="planning-progress-bar">
                    <div class="planning-progress-fill" style="width: ${project.effectiveProgress}%"></div>
                  </div>
                  <div class="focus-objective-meta">
                    <span>${safeEscape(project.objectiveName || 'Sem objetivo')}</span>
                    <span>${safeEscape(PROGRESS_MODE_LABELS[project.progressMode] || 'Híbrido')}</span>
                    <span>Auto ${project.autoProgress}%</span>
                    <span>Ritmo ${project.rhythmPercent}%</span>
                    <span>${project.overdueOpenCount} vencidas</span>
                    <span>${project.recentCompletedCount} concluídas</span>
                  </div>
                </div>
              `
            )
            .join('');

    const feedbackHtml =
      snapshot.feedbackInsights.length === 0
        ? '<p class="empty-message">Sem feedback recente ligado às metas.</p>'
        : snapshot.feedbackInsights
            .map(
              (entry) => `
                <div class="planning-feedback-card">
                  <div class="planning-item-meta">
                    <span>${safeEscape(entry.itemName || entry.type)}</span>
                    ${entry.projectName ? `<span>${safeEscape(entry.projectName)}</span>` : ''}
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
          <span class="planning-summary-label">Projetos ativos</span>
          <strong>${snapshot.projectsActive}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Alertas</span>
          <strong>${snapshot.alerts.length}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Revisões</span>
          <strong>${snapshot.reviewsCount}</strong>
        </div>
        <div class="planning-summary-card">
          <span class="planning-summary-label">Dias sem revisão</span>
          <strong>${snapshot.daysSinceReview ?? 0}</strong>
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
          <h3>Pulso dos projetos</h3>
          ${projectHtml}
        </section>
        <section class="planning-board-card">
          <h3>Feedbacks recentes</h3>
          ${feedbackHtml}
        </section>
        <section class="planning-board-card">
          <h3>Revisões recentes</h3>
          ${reviewHtml}
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
    const delayedProjects = snapshot.projectCards.filter(
      (project) => (project.dueInDays !== null && project.dueInDays < 0) || project.overdueOpenCount > 0
    );
    const topObjective = snapshot.objectiveCards[0] || null;
    const hottestProject = snapshot.projectCards[0] || null;

    return {
      objectivesActive: snapshot.objectivesActive,
      projectsActive: snapshot.projectsActive,
      atRiskObjectives: atRiskObjectives.length,
      delayedProjects: delayedProjects.length,
      daysSinceReview: snapshot.daysSinceReview,
      topObjective,
      hottestProject,
      recentFeedbackCount: snapshot.feedbackInsights.length,
      focusCount: snapshot.focusItems.length,
      reviewBacklog: snapshot.daysSinceReview === null ? 0 : snapshot.daysSinceReview,
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

    if (
      snapshot?.hottestProject &&
      (!records.topProjectPressure ||
        Number(snapshot.hottestProject.pressureScore) > Number(records.topProjectPressure.value || 0))
    ) {
      records.topProjectPressure = {
        name: snapshot.hottestProject.name,
        value: snapshot.hottestProject.pressureScore,
        date: todayStr,
      };
    }

    if (
      snapshot?.daysSinceReview !== null &&
      (!records.maxReviewGap || Number(snapshot.daysSinceReview) > Number(records.maxReviewGap.value || 0))
    ) {
      records.maxReviewGap = {
        value: snapshot.daysSinceReview,
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

    const statProjectsActive = document.getElementById('stat-projects-active');
    if (statProjectsActive) statProjectsActive.textContent = String(snapshot.projectsActive || 0);

    const statObjectivesRisk = document.getElementById('stat-objectives-risk');
    if (statObjectivesRisk) statObjectivesRisk.textContent = String(snapshot.atRiskObjectives || 0);

    const statProjectsDelayed = document.getElementById('stat-projects-delayed');
    if (statProjectsDelayed) statProjectsDelayed.textContent = String(snapshot.delayedProjects || 0);

    const planningHealthEl = document.getElementById('stat-planning-health');
    if (planningHealthEl) {
      planningHealthEl.innerHTML = `
        <p>Objetivos ativos: ${snapshot.objectivesActive}</p>
        <p>Projetos ativos: ${snapshot.projectsActive}</p>
        <p>Alertas de metas: ${snapshot.atRiskObjectives}</p>
        <p>Projetos em atraso: ${snapshot.delayedProjects}</p>
        <p>Dias sem revisão: ${snapshot.daysSinceReview ?? 0}</p>
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
          <p>Progresso automático: ${snapshot.topObjective.autoProgress}%</p>
          <p>Ritmo: ${snapshot.topObjective.rhythmPercent}%</p>
          <p>Pressão: ${snapshot.topObjective.pressureScore}%</p>
        `;
      }
    }

    const projectPressureEl = document.getElementById('stat-project-pressure');
    if (projectPressureEl) {
      if (!snapshot.hottestProject) {
        projectPressureEl.innerHTML = '<p>Sem projeto ativo.</p>';
      } else {
        projectPressureEl.innerHTML = `
          <p><strong>${safeEscape(snapshot.hottestProject.name)}</strong></p>
          <p>Pressão: ${snapshot.hottestProject.pressureScore}%</p>
          <p>Progresso efetivo: ${snapshot.hottestProject.effectiveProgress}%</p>
          <p>Ações vencidas: ${snapshot.hottestProject.overdueOpenCount}</p>
          <p>Concluídas recentes: ${snapshot.hottestProject.recentCompletedCount}</p>
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

    if (recordState.topProjectPressure) {
      records.push({
        emoji: '🔥',
        label: 'Maior pressão já registrada em projeto',
        value: `${recordState.topProjectPressure.name} (${recordState.topProjectPressure.value}%)`,
      });
    }

    if (recordState.maxReviewGap) {
      records.push({
        emoji: '🗓️',
        label: 'Maior intervalo entre revisões',
        value: `${recordState.maxReviewGap.value} dias`,
      });
    }

    return records;
  }

  function renderPlanningViews(todayActivities) {
    ensurePlanningState();
    populateObjectiveOptions();
    updateProjectSelectOptions();
    renderObjectiveList();
    renderProjectList();
    renderReviewsList();
    renderPlanningDashboard(todayActivities || []);
  }

  function initPlanningEvents() {
    if (globalScope.__planningEventsBound) return;
    globalScope.__planningEventsBound = true;

    document.getElementById('activity-objective')?.addEventListener('change', updateProjectSelectOptions);
    document.getElementById('activity-project')?.addEventListener('change', syncActivityObjectiveFromProject);

    document.addEventListener('click', function (event) {
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
        return;
      }

      const editProjectBtn = event.target.closest('.planning-edit-project-btn');
      if (editProjectBtn) {
        const id = normalizeId(editProjectBtn.getAttribute('data-id'));
        if (id) editProject(id);
        return;
      }

      const deleteProjectBtn = event.target.closest('.planning-delete-project-btn');
      if (deleteProjectBtn) {
        const id = normalizeId(deleteProjectBtn.getAttribute('data-id'));
        if (id) deleteProject(id);
        return;
      }

      const deleteReviewBtn = event.target.closest('.planning-delete-review-btn');
      if (deleteReviewBtn) {
        const id = normalizeId(deleteReviewBtn.getAttribute('data-id'));
        if (id) deleteReview(id);
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
    handleProjectSubmit,
    handleReviewSubmit,
    initPlanningEvents,
    populateObjectiveOptions,
    updateProjectSelectOptions,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppPlanning;
  }

  if (globalScope) {
    Object.assign(globalScope, AppPlanning);
  }
})(typeof window !== 'undefined' ? window : globalThis);
