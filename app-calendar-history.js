function renderMissionsCalendar() {
  const grid = document.getElementById('cal-missions-grid');
  const title = document.getElementById('cal-month-title');
  renderCalendarTodayPanel();
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

function getCalendarStatusMeta(status) {
  return {
    tag:
      status === 'failed'
        ? 'Falhou'
        : status === 'skipped'
          ? 'Pulada'
          : status === 'done'
            ? 'Concluída'
            : 'Pendente',
    className:
      status === 'failed'
        ? 'failed'
        : status === 'skipped'
          ? 'skipped'
          : status === 'done'
            ? 'done'
            : 'pending',
  };
}

function renderCalendarTodayPanel() {
  const title = document.getElementById('cal-today-title');
  const subtitle = document.getElementById('cal-today-subtitle');
  const list = document.getElementById('cal-today-list');
  const pendingCountEl = document.getElementById('cal-today-pending-count');
  const doneCountEl = document.getElementById('cal-today-done-count');
  const failedCountEl = document.getElementById('cal-today-failed-count');
  if (!title || !subtitle || !list) return;

  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const items = getCalendarItemsForDate(todayStr);
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const doneCount = items.filter((item) => item.status === 'done').length;
  const failedCount = items.filter(
    (item) => item.status === 'failed' || item.status === 'skipped'
  ).length;

  title.textContent = `Hoje, ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  subtitle.textContent = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (pendingCountEl) pendingCountEl.textContent = String(pendingCount);
  if (doneCountEl) doneCountEl.textContent = String(doneCount);
  if (failedCountEl) failedCountEl.textContent = String(failedCount);

  const statusOrder = { pending: 0, failed: 1, skipped: 2, done: 3 };
  const sortedItems = items
    .slice()
    .sort(
      (a, b) =>
        (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) ||
        String(a.kindLabel).localeCompare(String(b.kindLabel), 'pt-BR') ||
        String(a.name).localeCompare(String(b.name), 'pt-BR')
    );

  list.innerHTML = '';

  if (sortedItems.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhuma atividade para hoje.</p>';
    return;
  }

  sortedItems.forEach((item) => {
    const statusMeta = getCalendarStatusMeta(item.status);
    const row = document.createElement('div');
    row.className = `calendar-today-item ${item.status}`;

    const meta = document.createElement('div');
    meta.className = 'calendar-today-main';
    meta.innerHTML = `
      <div class="calendar-today-title">
        <span>${item.emoji || '🎯'}</span>
        <span>${item.name}</span>
      </div>
      <div class="calendar-today-meta">
        <span class="calendar-tag kind ${item.kindClass}">${item.kindLabel}</span>
        <span class="calendar-tag ${item.typeClass}">${item.typeLabel}</span>
        <span class="calendar-tag ${statusMeta.className}">${statusMeta.tag}</span>
      </div>
    `;
    row.appendChild(meta);

    const actionsHtml = getCalendarTodayActionsHtml(item);
    if (actionsHtml) {
      const actions = document.createElement('div');
      actions.className = 'calendar-today-actions';
      actions.innerHTML = actionsHtml;
      row.appendChild(actions);
    }

    list.appendChild(row);
  });
}

function getCalendarTodayActionsHtml(item) {
  if (item.status !== 'pending' || !Number.isFinite(Number(item.actionId))) {
    return '';
  }

  switch (item.entryKind) {
    case 'mission':
      return `
        <button type="button" class="calendar-action-btn primary calendar-complete-mission-btn" data-id="${item.actionId}">
          Concluir
        </button>
        <button type="button" class="calendar-action-btn warn calendar-skip-mission-btn" data-id="${item.actionId}">
          Pular
        </button>
      `;
    case 'work':
      return `
        <button type="button" class="calendar-action-btn primary calendar-complete-work-btn" data-id="${item.actionId}">
          Concluir
        </button>
        <button type="button" class="calendar-action-btn warn calendar-skip-work-btn" data-id="${item.actionId}">
          Pular
        </button>
      `;
    case 'workout':
      return `
        <button type="button" class="calendar-action-btn primary calendar-complete-workout-btn" data-id="${item.actionId}">
          Registrar
        </button>
        <button type="button" class="calendar-action-btn warn calendar-skip-workout-btn" data-id="${item.actionId}">
          Pular
        </button>
      `;
    case 'study':
      return `
        <button type="button" class="calendar-action-btn primary calendar-complete-study-btn" data-id="${item.actionId}">
          Registrar
        </button>
        <button type="button" class="calendar-action-btn warn calendar-skip-study-btn" data-id="${item.actionId}">
          Pular
        </button>
      `;
    default:
      return '';
  }
}

function hasFailedActivities(dateStr) {
  const failedMissions = appData.completedMissions.some(
    (m) => (m.failedDate === dateStr || m.date === dateStr) && m.failed
  );
  const failedWorks = appData.completedWorks.some(
    (w) => (w.failedDate === dateStr || w.date === dateStr) && w.failed
  );
  const failedWorkouts = appData.completedWorkouts.some(
    (w) => (w.failedDate === dateStr || w.date === dateStr) && w.failed
  );
  const failedStudies = appData.completedStudies.some(
    (s) => (s.failedDate === dateStr || s.date === dateStr) && s.failed
  );
  return failedMissions || failedWorks || failedWorkouts || failedStudies;
}

function hasCompletedActivities(dateStr) {
  const completedMissions = appData.completedMissions.some(
    (m) => m.completedDate === dateStr && !m.failed
  );
  const completedWorks = appData.completedWorks.some(
    (w) => w.completedDate === dateStr && !w.failed
  );
  const completedWorkouts = appData.completedWorkouts.some(
    (w) => w.completedDate === dateStr && !w.failed
  );
  const completedStudies = appData.completedStudies.some(
    (s) => s.completedDate === dateStr && !s.failed
  );
  return completedMissions || completedWorks || completedWorkouts || completedStudies;
}

function createCalendarCell(year, monthIndex, dayNumber, isOtherMonth) {
  const date = new Date(year, monthIndex, dayNumber);
  const dateStr = getLocalDateString(date);
  const todayStr = getLocalDateString();

  const cell = document.createElement('div');
  cell.className =
    `calendar-day ${isOtherMonth ? 'other-month' : ''} ${dateStr === todayStr ? 'today' : ''}`.trim();
  cell.dataset.date = dateStr;

  if (hasCompletedActivities(dateStr) && !hasFailedActivities(dateStr))
    cell.classList.add('streak-day');
  if (hasFailedActivities(dateStr)) cell.classList.add('failure-day');
  if (appData.statistics?.deathDates?.includes(dateStr)) cell.classList.add('death-day');

  const markers = getCalendarMarkersForDate(date);
  const markersHtml = markers.map((type) => `<span class="marker ${type}"></span>`).join('');

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
  grid.querySelectorAll('.calendar-day.selected').forEach((el) => el.classList.remove('selected'));
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
    { value: 'routine', label: 'Rotinas' },
    { value: 'eventual', label: 'Missões eventuais' },
    { value: 'epic', label: 'Missões épicas' },
    { value: 'workout', label: 'Treinos' },
    { value: 'study', label: 'Estudos' },
    { value: 'work', label: 'Trabalhos' },
  ];

  detailsFilter.innerHTML = '';

  baseOptions.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    detailsFilter.appendChild(option);
  });

  if ([...detailsFilter.options].some((o) => o.value === currentValue)) {
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
  const workOffStatus = document.getElementById('cal-work-off-status');
  const workOffToggle = document.getElementById('cal-work-off-toggle');
  const detailsFilter = document.getElementById('cal-details-filter');
  if (!detailsTitle || !detailsList) return;

  const dateObj = parseLocalDateString(dateStr);
  detailsTitle.textContent = `Detalhes de ${dateObj.toLocaleDateString('pt-BR')}`;

  if (restStatus && restToggle) {
    const isRest = isRestDay(dateStr);
    restStatus.textContent = isRest ? 'Descanso planejado (dia livre)' : 'Dia normal';
    restStatus.classList.toggle('active', isRest);
    restToggle.textContent = isRest ? 'Remover descanso' : 'Marcar descanso';
  }
  if (workOffStatus && workOffToggle) {
    const isOffDay = isWorkOffDay(dateStr);
    workOffStatus.textContent = isOffDay ? 'Folga de trabalho ativa' : 'Sem folga de trabalho';
    workOffStatus.classList.toggle('active', isOffDay);
    workOffToggle.textContent = isOffDay ? 'Remover folga' : 'Marcar folga';
  }

  if (detailsFilter) {
    ensureCalendarDetailsFilterOptions();
    detailsFilter.value = calendarState.detailsFilter || 'all';
  }

  const items = getCalendarItemsForDate(dateStr);
  const filterValue = calendarState.detailsFilter || 'all';
  let filteredItems = items;
  if (filterValue !== 'all') {
    if (filterValue === 'work') {
      filteredItems = items.filter((item) => item.kindClass === 'work-kind');
    } else {
      filteredItems = items.filter((item) => item.typeClass === filterValue);
    }
  }
  detailsList.innerHTML = '';

  if (filteredItems.length === 0) {
    detailsList.innerHTML = '<p class="empty-message">Nenhuma atividade para este filtro.</p>';
    return;
  }

  filteredItems.forEach((item) => {
    const row = document.createElement('div');
    const isPending = item.status === 'pending';
    row.className = `calendar-details-item ${isPending ? 'pending' : 'completed'}`;

    const statusMeta = getCalendarStatusMeta(item.status);

    row.innerHTML = `
            <div class="calendar-details-title">
                <span>${item.emoji || '🎯'}</span>
                <span>${item.name}</span>
            </div>
            <div class="calendar-details-tags">
                <span class="calendar-tag kind ${item.kindClass}">${item.kindLabel}</span>
                <span class="calendar-tag ${item.typeClass}">${item.typeLabel}</span>
                <span class="calendar-tag ${statusMeta.className}">${statusMeta.tag}</span>
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
  const workOffStatus = document.getElementById('cal-work-off-status');
  const workOffToggle = document.getElementById('cal-work-off-toggle');
  const detailsFilter = document.getElementById('cal-details-filter');
  if (!detailsTitle || !detailsList) return;

  detailsTitle.textContent = 'Detalhes do dia';
  detailsList.innerHTML = '<p class="empty-message">Selecione um dia para ver as missões.</p>';

  if (restStatus && restToggle) {
    restStatus.textContent = 'Dia normal';
    restStatus.classList.remove('active');
    restToggle.textContent = 'Marcar descanso';
  }
  if (workOffStatus && workOffToggle) {
    workOffStatus.textContent = 'Sem folga de trabalho';
    workOffStatus.classList.remove('active');
    workOffToggle.textContent = 'Marcar folga';
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
  appData.missions.forEach((mission) => {
    const typeInfo = getMissionTypeInfo(mission.type);
    if (!typeInfo) return;

    if (isRoutineType(mission.type) && getRoutineDays(mission).includes(dayOfWeek)) {
      items.push({
        ...typeInfo,
        ...mission,
        entryKind: 'mission',
        actionId: mission.id,
        status: 'pending',
      });
    }

    if (mission.type === 'eventual' && mission.date) {
      const missionDateStr = getLocalDateString(parseLocalDateString(mission.date));
      if (dateStr <= missionDateStr) {
        items.push({
          ...typeInfo,
          ...mission,
          entryKind: 'mission',
          actionId: mission.id,
          status: 'pending',
        });
      }
    }

    if (mission.type === 'epica' && mission.deadline) {
      const deadlineStr = getLocalDateString(parseLocalDateString(mission.deadline));
      if (dateStr <= deadlineStr) {
        items.push({
          ...typeInfo,
          ...mission,
          entryKind: 'mission',
          actionId: mission.id,
          status: 'pending',
        });
      }
    }
  });

  // Missões concluídas/falhadas
  appData.completedMissions.forEach((mission) => {
    const typeInfo = getMissionTypeInfo(mission.type);
    if (!typeInfo) return;
    const completedDate = mission.completedDate || mission.failedDate || mission.skippedDate;
    if (completedDate === dateStr) {
      items.push({
        ...typeInfo,
        ...mission,
        entryKind: 'mission',
        status: mission.failed ? 'failed' : mission.skipped ? 'skipped' : 'done',
      });
    }
  });

  // Trabalhos ativos
  appData.works.forEach((work) => {
    if (isWorkOffDay(dateStr)) return;
    const typeInfo = getWorkTypeInfo(work.type);
    if (!typeInfo) return;

    if (isRoutineType(work.type) && getRoutineDays(work).includes(dayOfWeek)) {
      items.push({ ...typeInfo, ...work, entryKind: 'work', actionId: work.id, status: 'pending' });
    }

    if (work.type === 'eventual' && work.date) {
      const workDateStr = getLocalDateString(parseLocalDateString(work.date));
      if (dateStr <= workDateStr) {
        items.push({
          ...typeInfo,
          ...work,
          entryKind: 'work',
          actionId: work.id,
          status: 'pending',
        });
      }
    }

    if (work.type === 'epica' && work.deadline) {
      const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
      if (dateStr <= deadlineStr) {
        items.push({
          ...typeInfo,
          ...work,
          entryKind: 'work',
          actionId: work.id,
          status: 'pending',
        });
      }
    }
  });

  // Trabalhos concluídos/falhados
  appData.completedWorks.forEach((work) => {
    const typeInfo = getWorkTypeInfo(work.type);
    if (!typeInfo) return;
    const completedDate = work.completedDate || work.failedDate || work.skippedDate;
    if (completedDate === dateStr) {
      items.push({
        ...typeInfo,
        ...work,
        entryKind: 'work',
        status: work.failed ? 'failed' : work.skipped ? 'skipped' : 'done',
      });
    }
  });

  // Treinos do dia (agenda)
  appData.workouts.forEach((workout) => {
    if (workout.days && workout.days.includes(dayOfWeek)) {
      const dailyEntry = appData.dailyWorkouts.find(
        (entry) => String(entry.workoutId) === String(workout.id) && entry.date === dateStr
      );
      items.push({
        entryKind: 'workout',
        kindLabel: 'Treino',
        kindClass: 'workout',
        typeLabel: getWorkoutTypeName(workout.type),
        typeClass: 'workout',
        status: 'pending',
        id: `workout-${workout.id}`,
        actionId: dailyEntry?.id ?? null,
        name: workout.name,
        emoji: workout.emoji,
      });
    }
  });

  // Estudos do dia (agenda)
  appData.studies.forEach((study) => {
    if (study.days && study.days.includes(dayOfWeek)) {
      const dailyEntry = appData.dailyStudies.find(
        (entry) => String(entry.studyId) === String(study.id) && entry.date === dateStr
      );
      items.push({
        entryKind: 'study',
        kindLabel: 'Estudo',
        kindClass: 'study',
        typeLabel: study.type === 'logico' ? 'Lógico' : 'Criativo',
        typeClass: 'study',
        status: 'pending',
        id: `study-${study.id}`,
        actionId: dailyEntry?.id ?? null,
        name: study.name,
        emoji: study.emoji,
      });
    }
  });

  // Treinos concluídos/falhados
  appData.completedWorkouts.forEach((entry) => {
    if (
      entry.date === dateStr ||
      entry.completedDate === dateStr ||
      entry.failedDate === dateStr ||
      entry.skippedDate === dateStr
    ) {
      items.push({
        entryKind: 'workout',
        kindLabel: 'Treino',
        kindClass: 'workout',
        typeLabel: getWorkoutTypeName(entry.type),
        typeClass: 'workout',
        status: entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'done',
        id: `workout-${entry.workoutId}-${entry.date}`,
        name: entry.name,
        emoji: entry.emoji,
      });
    }
  });

  // Estudos concluídos/falhados
  appData.completedStudies.forEach((entry) => {
    if (
      entry.date === dateStr ||
      entry.completedDate === dateStr ||
      entry.failedDate === dateStr ||
      entry.skippedDate === dateStr
    ) {
      items.push({
        entryKind: 'study',
        kindLabel: 'Estudo',
        kindClass: 'study',
        typeLabel: entry.type === 'logico' ? 'Lógico' : 'Criativo',
        typeClass: 'study',
        status: entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'done',
        id: `study-${entry.studyId}-${entry.date}`,
        name: entry.name,
        emoji: entry.emoji,
      });
    }
  });

  // Remover pendentes quando há concluídas/falhadas no mesmo dia
  const doneKeys = new Set(
    items.filter((i) => i.status !== 'pending').map((i) => `${i.kindLabel}-${i.name}-${dateStr}`)
  );

  const filtered = items.filter((i) => {
    if (i.status !== 'pending') return true;
    return !doneKeys.has(`${i.kindLabel}-${i.name}-${dateStr}`);
  });

  // Remover duplicidade por id e status
  const byId = new Map();
  filtered.forEach((item) => {
    const key = `${item.id}-${item.status}`;
    byId.set(key, item);
  });
  return Array.from(byId.values());
}

function getMissionTypeInfo(type) {
  switch (type) {
    case 'rotina':
      return {
        kindLabel: 'Missão',
        kindClass: 'kind',
        type: 'routine',
        typeLabel: 'Rotina',
        typeClass: 'routine',
      };
    case 'eventual':
      return {
        kindLabel: 'Missão',
        kindClass: 'kind',
        type: 'eventual',
        typeLabel: 'Eventual',
        typeClass: 'eventual',
      };
    case 'epica':
      return {
        kindLabel: 'Missão',
        kindClass: 'kind',
        type: 'epic',
        typeLabel: 'Épica',
        typeClass: 'epic',
      };
    default:
      return null;
  }
}

function getWorkTypeInfo(type) {
  switch (type) {
    case 'rotina':
      return {
        kindLabel: 'Trabalho',
        kindClass: 'work-kind',
        type: 'routine',
        typeLabel: 'Rotina',
        typeClass: 'routine',
      };
    case 'eventual':
      return {
        kindLabel: 'Trabalho',
        kindClass: 'work-kind',
        type: 'eventual',
        typeLabel: 'Eventual',
        typeClass: 'eventual',
      };
    case 'epica':
      return {
        kindLabel: 'Trabalho',
        kindClass: 'work-kind',
        type: 'epic',
        typeLabel: 'Épica',
        typeClass: 'epic',
      };
    default:
      return null;
  }
}

function getCalendarMarkersForDate(date) {
  const markers = new Set();
  const dateStr = getLocalDateString(date);
  const pendingItems = getCalendarItemsForDate(dateStr).filter((item) => item.status === 'pending');

  if (pendingItems.some((item) => item.kindClass === 'kind')) markers.add('mission');
  if (pendingItems.some((item) => item.kindClass === 'work-kind')) markers.add('work');
  if (pendingItems.some((item) => item.kindClass === 'workout')) markers.add('workout');
  if (pendingItems.some((item) => item.kindClass === 'study')) markers.add('study');

  if (isRestDay(dateStr)) {
    markers.add('rest');
  }
  if (isWorkOffDay(dateStr)) markers.add('work-off');

  return Array.from(markers);
}

function isRestDay(dateStr) {
  return appData.restDays && appData.restDays.includes(dateStr);
}

function isWorkOffDay(dateStr) {
  return appData.workOffDays && appData.workOffDays.includes(dateStr);
}

async function toggleRestDay(dateStr) {
  if (!appData.restDays) appData.restDays = [];
  const index = appData.restDays.indexOf(dateStr);
  if (index >= 0) {
    appData.restDays.splice(index, 1);
    addHeroLog('rest', 'Descanso removido', `Dia ${dateStr} voltou ao normal.`);
  } else {
    if (appData.hero.coins < REST_DAY_COST) {
      showFeedback(`Voce precisa de ${REST_DAY_COST} moedas para marcar descanso.`, 'warn');
      return;
    }
    const confirmed = await askConfirmation(
      `Marcar descanso custa ${REST_DAY_COST} moedas. Deseja continuar?`,
      {
        title: 'Marcar descanso',
        confirmText: 'Confirmar',
      }
    );
    if (!confirmed) return;
    appData.hero.coins -= REST_DAY_COST;
    appData.restDays.push(dateStr);
    addHeroLog(
      'rest',
      'Descanso planejado',
      `Dia ${dateStr} marcado como descanso (-${REST_DAY_COST} moedas).`
    );
  }
  updateUI({ mode: 'activity', forceCalendar: true });
}

function toggleWorkOffDay(dateStr) {
  if (!appData.workOffDays) appData.workOffDays = [];
  const index = appData.workOffDays.indexOf(dateStr);
  if (index >= 0) {
    appData.workOffDays.splice(index, 1);
    addHeroLog('rest', 'Folga removida', `Dia ${dateStr} voltou a permitir trabalhos.`);
  } else {
    appData.workOffDays.push(dateStr);
    addHeroLog('rest', 'Folga planejada', `Dia ${dateStr} marcado como folga de trabalho.`);
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
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Atualizar histórico de treinos (concluídos e falhas)
function updateWorkoutHistory() {
  const completedContainer = document.getElementById('completed-workouts');
  if (!completedContainer) return;
  const allEntries = appData.completedWorkouts;
  const recent = allEntries.slice().reverse();
  const prevTotalsByEntryId = new Map();
  const lastTotalsByWorkoutId = new Map();
  const prevDistancesByEntryId = new Map();
  const lastDistancesByWorkoutId = new Map();
  allEntries.forEach((entry) => {
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
  globalThis.renderPaginatedHistory?.(
    completedContainer,
    recent,
    (entry) => {
      const card = document.createElement('div');
      card.className =
        `mission-card history-card compact-history ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'completed'}`.trim();

      const details = [];
      const statusText = entry.failed ? 'FALHOU' : entry.skipped ? 'PULADO' : 'CONCLUIDO';
      const statusClass = entry.failed
        ? 'failed-status'
        : entry.skipped
          ? 'skipped-status'
          : 'completed-status';
      if (entry.failed) {
        details.push(`<p>Falhou em: ${formatDate(entry.failedDate || entry.date)}</p>`);
      } else if (entry.skipped) {
        details.push(`<p>Pulado em: ${formatDate(entry.skippedDate || entry.date)}</p>`);
      } else {
        details.push(`<p>Concluido em: ${formatDate(entry.completedDate || entry.date)}</p>`);
      }
      details.push(`<p>Tipo: ${getWorkoutTypeName(entry.type)}</p>`);

      if (
        !entry.failed &&
        !entry.skipped &&
        entry.type === 'repeticao' &&
        Array.isArray(entry.series)
      ) {
        const totalReps = entry.series.reduce((sum, val) => sum + (parseInt(val) || 0), 0);
        const prevTotal = prevTotalsByEntryId.get(entry.id);
        let trend = '';
        if (prevTotal !== undefined) {
          if (totalReps > prevTotal) trend = ' <span class="trend-up">&uarr;</span>';
          else if (totalReps < prevTotal) trend = ' <span class="trend-down">&darr;</span>';
        }
        details.push(
          `<p>Séries: ${entry.series.map((v) => v || 0).join(' / ')} (Total: ${totalReps})${trend}</p>`
        );
      }
      if (
        !entry.failed &&
        !entry.skipped &&
        entry.type === 'distancia' &&
        entry.distance !== null &&
        entry.distance !== undefined
      ) {
        const distance = Number(entry.distance);
        let trend = '';
        const prevDistance = prevDistancesByEntryId.get(entry.id);
        if (prevDistance !== undefined && Number.isFinite(distance)) {
          if (distance > prevDistance) trend = ' <span class="trend-up">&uarr;</span>';
          else if (distance < prevDistance) trend = ' <span class="trend-down">&darr;</span>';
        }
        details.push(`<p>Distância: ${entry.distance} km${trend}</p>`);
        if (entry.time !== null && entry.time !== undefined) {
          const time = Number(entry.time);
          if (Number.isFinite(time) && time > 0) {
            const speed = (distance / time) * 60;
            details.push(`<p>Tempo: ${time} min</p>`);
            details.push(`<p>Velocidade média: ${speed.toFixed(1)} km/h</p>`);
          }
        }
      }
      if (
        !entry.failed &&
        !entry.skipped &&
        (entry.type === 'maior-tempo' || entry.type === 'menor-tempo') &&
        entry.time !== null &&
        entry.time !== undefined
      ) {
        details.push(`<p>Tempo: ${entry.time} min</p>`);
      }
      if (entry.reason && !entry.failed) {
        details.push(`<p class="mission-reason">Motivo: ${entry.reason}</p>`);
      }
      if (entry.feedback) {
        details.push(`<p>Feedback: ${entry.feedback}</p>`);
      }

      card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${entry.emoji || '💪'}</span>
                    <span>${entry.name}</span>
                </div>
                <span class="mission-status ${statusClass}">
                    ${statusText}
                </span>
                <span class="workout-type compact-history-type">${getWorkoutTypeName(entry.type)}</span>
            </div>
            <div class="mission-details compact-history-details">
                ${details.join('')}
            </div>
        `;
      return card;
    },
    'Nenhum histórico de treino ainda.',
    updateWorkoutHistory
  );
}

// Atualizar histórico de estudos (concluídos e falhas)
function updateStudyHistory() {
  const completedContainer = document.getElementById('completed-studies');
  if (!completedContainer) return;
  const allEntries = appData.completedStudies;
  const recent = allEntries.slice().reverse();
  globalThis.renderPaginatedHistory?.(
    completedContainer,
    recent,
    (entry) => {
      const card = document.createElement('div');
      card.className =
        `mission-card history-card compact-history ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'completed'}`.trim();

      const details = [];
      const statusText = entry.failed ? 'FALHOU' : entry.skipped ? 'PULADO' : 'CONCLUIDO';
      const statusClass = entry.failed
        ? 'failed-status'
        : entry.skipped
          ? 'skipped-status'
          : 'completed-status';
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
      if (entry.reason && !entry.failed) {
        details.push(`<p class="mission-reason">Motivo: ${entry.reason}</p>`);
      }
      if (entry.feedback) {
        details.push(`<p>Feedback: ${entry.feedback}</p>`);
      }

      card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${entry.emoji || '📚'}</span>
                    <span>${entry.name}</span>
                </div>
                <span class="mission-status ${statusClass}">
                    ${statusText}
                </span>
                <span class="study-type compact-history-type">${entry.type === 'logico' ? 'Lógico' : 'Criativo'}</span>
            </div>
            <div class="mission-details compact-history-details">
                ${details.join('')}
            </div>
        `;
      return card;
    },
    'Nenhum histórico de estudo ainda.',
    updateStudyHistory
  );
}

// Inicializar seletores de atributos
function initAttributesSelectors() {
  [
    { containerId: 'mission-attributes', prefix: 'mission' },
    { containerId: 'work-attributes', prefix: 'work' },
    { containerId: 'activity-attributes', prefix: 'activity' },
  ].forEach(({ containerId, prefix }) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    appData.attributes.forEach((attr) => {
      const checkbox = document.createElement('div');
      checkbox.className = 'attribute-checkbox';
      checkbox.innerHTML = `
                <input type="checkbox" id="${prefix}-attr-${attr.id}" value="${attr.id}">
                <label for="${prefix}-attr-${attr.id}">${attr.emoji} ${attr.name}</label>
            `;
      container.appendChild(checkbox);
    });
  });
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
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
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
  } else if (tabName === 'alimentacao') {
    updateNutritionView();
  }
}

// Trocar entre abas secundárias
function switchSubTab(subTabName, parentElement) {
  // Encontrar o container de conteúdo
  const subContent = parentElement.querySelector('.sub-content');
  if (!subContent) return;

  // Remover a classe active de todas as sub-abas
  subContent.querySelectorAll('.sub-tab').forEach((tab) => {
    tab.classList.remove('active');
  });

  parentElement.querySelectorAll('.sub-nav-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Adicionar a classe active à sub-aba selecionada
  subContent.querySelector(`#${subTabName}`)?.classList.add('active');

  // Ativar o botão correspondente
  parentElement.querySelector(`.sub-nav-btn[data-subtab="${subTabName}"]`)?.classList.add('active');
  if (subTabName === 'graficos') {
    updateCharts();
  } else if (typeof subTabName === 'string' && subTabName.startsWith('nutricao-')) {
    updateNutritionView();
  }
}

// Mostrar modal para adicionar item
function showItemModal(itemType, existingItem = null) {
  const modal = document.getElementById('item-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('item-form');

  if (!modal || !modalTitle || !form) return;

  // Limpar o formulário
  form.innerHTML = '';

  // Configurar título e formulário baseado no tipo de item
  let formHTML = '';
  const selectedDays = new Set(
    Array.isArray(existingItem?.days) ? existingItem.days.map((day) => String(day)) : []
  );
  const isEditing = !!existingItem;

  switch (itemType) {
    case 'treino':
      modalTitle.textContent = isEditing ? 'Editar Treino' : 'Adicionar Novo Treino';
      formHTML = `
                <div class="form-group">
                    <label for="modal-item-name">Nome do Treino</label>
                    <input type="text" id="modal-item-name" value="${existingItem?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="💪" value="${existingItem?.emoji || ''}">
                </div>
                <div class="form-group">
                    <label for="modal-item-type">Tipo de Treino</label>
                    <select id="modal-item-type" required>
                        <option value="repeticao" ${existingItem?.type === 'repeticao' ? 'selected' : ''}>Repetição</option>
                        <option value="distancia" ${existingItem?.type === 'distancia' ? 'selected' : ''}>Distância</option>
                        <option value="maior-tempo" ${existingItem?.type === 'maior-tempo' ? 'selected' : ''}>Maior Tempo</option>
                        <option value="menor-tempo" ${existingItem?.type === 'menor-tempo' ? 'selected' : ''}>Menor Tempo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dias da Semana</label>
                    <div class="days-selector">
                        <label class="day-checkbox"><input type="checkbox" value="0" ${selectedDays.has('0') ? 'checked' : ''}> Dom</label>
                        <label class="day-checkbox"><input type="checkbox" value="1" ${selectedDays.has('1') ? 'checked' : ''}> Seg</label>
                        <label class="day-checkbox"><input type="checkbox" value="2" ${selectedDays.has('2') ? 'checked' : ''}> Ter</label>
                        <label class="day-checkbox"><input type="checkbox" value="3" ${selectedDays.has('3') ? 'checked' : ''}> Qua</label>
                        <label class="day-checkbox"><input type="checkbox" value="4" ${selectedDays.has('4') ? 'checked' : ''}> Qui</label>
                        <label class="day-checkbox"><input type="checkbox" value="5" ${selectedDays.has('5') ? 'checked' : ''}> Sex</label>
                        <label class="day-checkbox"><input type="checkbox" value="6" ${selectedDays.has('6') ? 'checked' : ''}> Sáb</label>
                    </div>
                </div>
                <input type="hidden" id="modal-item-category" value="${isEditing ? 'edit-workout' : 'workout'}">
                ${isEditing ? `<input type="hidden" id="modal-item-id" value="${existingItem.id}">` : ''}
            `;
      break;

    case 'estudo':
      modalTitle.textContent = isEditing ? 'Editar Estudo' : 'Adicionar Novo Estudo';
      formHTML = `
                <div class="form-group">
                    <label for="modal-item-name">Nome do Estudo</label>
                    <input type="text" id="modal-item-name" value="${existingItem?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="📚" value="${existingItem?.emoji || ''}">
                </div>
                <div class="form-group">
                    <label for="modal-item-type">Tipo de Estudo</label>
                    <select id="modal-item-type" required>
                        <option value="logico" ${existingItem?.type === 'logico' ? 'selected' : ''}>Lógico</option>
                        <option value="criativo" ${existingItem?.type === 'criativo' ? 'selected' : ''}>Criativo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dias da Semana</label>
                    <div class="days-selector">
                        <label class="day-checkbox"><input type="checkbox" value="0" ${selectedDays.has('0') ? 'checked' : ''}> Dom</label>
                        <label class="day-checkbox"><input type="checkbox" value="1" ${selectedDays.has('1') ? 'checked' : ''}> Seg</label>
                        <label class="day-checkbox"><input type="checkbox" value="2" ${selectedDays.has('2') ? 'checked' : ''}> Ter</label>
                        <label class="day-checkbox"><input type="checkbox" value="3" ${selectedDays.has('3') ? 'checked' : ''}> Qua</label>
                        <label class="day-checkbox"><input type="checkbox" value="4" ${selectedDays.has('4') ? 'checked' : ''}> Qui</label>
                        <label class="day-checkbox"><input type="checkbox" value="5" ${selectedDays.has('5') ? 'checked' : ''}> Sex</label>
                        <label class="day-checkbox"><input type="checkbox" value="6" ${selectedDays.has('6') ? 'checked' : ''}> Sáb</label>
                    </div>
                </div>
                <input type="hidden" id="modal-item-category" value="${isEditing ? 'edit-study' : 'study'}">
                ${isEditing ? `<input type="hidden" id="modal-item-id" value="${existingItem.id}">` : ''}
            `;
      break;
  }

  form.innerHTML =
    formHTML +
    `
        <button type="submit" class="submit-btn">Salvar</button>
    `;

  // Mostrar modal
  modal.classList.add('active');
}

// Mostrar modal para conclusão de treino
function showWorkoutCompletionModal(workoutDayId) {
  const modal = document.getElementById('item-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('item-form');

  if (!modal || !modalTitle || !form) return;

  const workoutDay = appData.dailyWorkouts.find((dw) => dw.id === workoutDayId);
  if (!workoutDay) return;

  const workout = appData.workouts.find((w) => w.id === workoutDay.workoutId);
  if (!workout) return;

  modalTitle.textContent = `Concluir ${workout.name}`;

  let inputFields = '';
  const workoutCard =
    document
      .querySelector(`.complete-workout-btn[data-id="${workoutDayId}"]`)
      ?.closest('.workout-card') || null;

  if (workout.type === 'repeticao') {
    // Obter valores dos campos de série
    const seriesInputs = workoutCard ? workoutCard.querySelectorAll('.series-input-field') : [];
    const seriesValues =
      seriesInputs.length > 0
        ? Array.from(seriesInputs).map((input) => input.value || '0')
        : (workoutDay.series || [0, 0, 0]).map((v) => v || 0);

    inputFields = seriesValues
      .map(
        (value, index) => `
            <div class="form-group">
                <label>Série ${index + 1}: ${value} repetições</label>
                <input type="hidden" name="series-${index}" value="${value}">
            </div>
        `
      )
      .join('');
  } else if (workout.type === 'distancia') {
    const distanceInput = workoutCard ? workoutCard.querySelector('.distance-input-field') : null;
    const distanceValue = distanceInput ? distanceInput.value : (workoutDay.distance ?? '0');
    const timeInput = workoutCard ? workoutCard.querySelector('.time-input-field') : null;
    const timeValue = timeInput ? timeInput.value : (workoutDay.time ?? '0');

    inputFields = `
            <div class="form-group">
                <label>Distância: ${distanceValue} km</label>
                <input type="hidden" name="distance" value="${distanceValue}">
            </div>
            <div class="form-group">
                <label>Tempo: ${timeValue} minutos</label>
                <input type="hidden" name="time" value="${timeValue}">
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

  const studyDay = appData.dailyStudies.find((ds) => ds.id === studyDayId);
  if (!studyDay) return;

  const study = appData.studies.find((s) => s.id === studyDay.studyId);
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

  const mission = appData.missions.find((m) => m.id === missionId);
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

  const work = appData.works.find((w) => w.id === workId);
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
    appData.attributes.forEach((attr) => {
      attr.xp = 0;
    });
  }

  if (Array.isArray(appData.classes)) {
    appData.classes.forEach((cls) => {
      cls.xp = 0;
    });
  }

  if (Array.isArray(appData.workouts)) {
    appData.workouts.forEach((workout) => {
      workout.xp = 0;
    });
  }

  if (Array.isArray(appData.studies)) {
    appData.studies.forEach((study) => {
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
            <p>Suas vidas chegaram a 0. O game over foi aplicado automaticamente: 3 vidas foram restauradas e moedas e XP foram zerados, mantendo os níveis.</p>
        </div>
        <button type="button" id="gameover-continue-btn" class="submit-btn">Continuar</button>
    `;

  form.querySelector('#gameover-continue-btn')?.addEventListener('click', function () {
    if (appData.hero) {
      appData.hero.pendingGameOverNotice = false;
    }
    modal.dataset.locked = 'false';
    modal.dataset.gameOverShown = 'false';
    closeModal();
    saveToLocalStorage();
  });

  modal.classList.add('active');
}

function handleGameOverIfNeeded(options = {}) {
  if (!appData.hero) return;

  // Garantir que maxLives seja válido
  if (!Number.isFinite(appData.hero.maxLives) || appData.hero.maxLives < 1) {
    appData.hero.maxLives = 10;
  }

  // Se tem vida, garantir que gameOverCounted está como false
  if (appData.hero.lives > 0) {
    // Só resetar gameOverCounted se não for a verificação inicial
    if (!options.isInitialCheck) {
      appData.hero.gameOverCounted = false;
    }
    return;
  }

  // Se lives <= 0, verificar se já tratamos isso
  if (appData.hero.lives <= 0) {
    const todayStr = getLocalDateString();
    const maxLives = Math.max(1, appData.hero.maxLives || 10);
    appData.hero.maxLives = maxLives;
    appData.hero.coins = 0;
    const modal = document.getElementById('item-modal');

    if (!appData.statistics) appData.statistics = {};
    appData.statistics.deaths = (appData.statistics.deaths || 0) + 1;
    if (!appData.statistics.deathDates) appData.statistics.deathDates = [];
    appData.statistics.deathDates.push(todayStr);
    resetAllXpKeepLevels();
    appData.hero.lives = Math.min(3, maxLives);
    appData.hero.gameOverCounted = false;
    appData.hero.lastRestoreDate = todayStr;
    const deathsEl = document.getElementById('stat-deaths');
    if (deathsEl) {
      deathsEl.textContent = appData.statistics.deaths;
    }
    addHeroLog(
      'system',
      'Game Over',
      'Vidas chegaram a 0. 3 vidas foram restauradas automaticamente e moedas e XP foram zerados (níveis mantidos).'
    );
    saveToLocalStorage();
    updateUI({ mode: 'activity' });
    if (modal?.dataset.gameOverShown !== 'true') {
      showGameOverModal();
    }
  }
}

// Manipular envio do formulário de item

// __appCalendarHistoryBridge: exposes calendar/history APIs for legacy scripts during module migration
Object.assign(globalThis, {
  renderMissionsCalendar,
  hasFailedActivities,
  hasCompletedActivities,
  createCalendarCell,
  setCalendarSelection,
  ensureCalendarDetailsFilterOptions,
  renderCalendarDetails,
  resetCalendarDetails,
  getCalendarItemsForDate,
  getMissionTypeInfo,
  getWorkTypeInfo,
  getCalendarMarkersForDate,
  isRestDay,
  isWorkOffDay,
  toggleRestDay,
  toggleWorkOffDay,
  getMonthKey,
  parseLocalDateString,
  updateWorkoutHistory,
  updateStudyHistory,
  initAttributesSelectors,
  initClassSelectors,
  isTabActive,
  switchTab,
  switchSubTab,
  showItemModal,
  showWorkoutCompletionModal,
  showStudyCompletionModal,
  showMissionCompletionModal,
  showWorkCompletionModal,
  closeModal,
  resetAllXpKeepLevels,
  showGameOverModal,
  handleGameOverIfNeeded,
});
