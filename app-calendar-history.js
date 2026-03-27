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
    { value: 'daily', label: 'Missões diárias' },
    { value: 'weekly', label: 'Missões semanais' },
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

    const statusTag =
      item.status === 'failed'
        ? 'Falhou'
        : item.status === 'skipped'
          ? 'Pulada'
          : item.status === 'done'
            ? 'Concluida'
            : 'Pendente';
    const statusClass =
      item.status === 'failed'
        ? 'failed'
        : item.status === 'skipped'
          ? 'skipped'
          : item.status === 'done'
            ? 'done'
            : 'pending';

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
      if (dateStr <= missionDateStr) {
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
  appData.completedMissions.forEach((mission) => {
    const typeInfo = getMissionTypeInfo(mission.type);
    if (!typeInfo) return;
    const completedDate = mission.completedDate || mission.failedDate || mission.skippedDate;
    if (completedDate === dateStr) {
      items.push({
        ...typeInfo,
        ...mission,
        status: mission.failed ? 'failed' : mission.skipped ? 'skipped' : 'done',
      });
    }
  });

  // Trabalhos ativos
  appData.works.forEach((work) => {
    if (isWorkOffDay(dateStr)) return;
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
      if (dateStr <= workDateStr) {
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
  appData.completedWorks.forEach((work) => {
    const typeInfo = getWorkTypeInfo(work.type);
    if (!typeInfo) return;
    const completedDate = work.completedDate || work.failedDate || work.skippedDate;
    if (completedDate === dateStr) {
      items.push({
        ...typeInfo,
        ...work,
        status: work.failed ? 'failed' : work.skipped ? 'skipped' : 'done',
      });
    }
  });

  // Treinos do dia (agenda)
  appData.workouts.forEach((workout) => {
    if (workout.days && workout.days.includes(dayOfWeek)) {
      items.push({
        kindLabel: 'Treino',
        kindClass: 'workout',
        typeLabel: getWorkoutTypeName(workout.type),
        typeClass: 'workout',
        status: 'pending',
        id: `workout-${workout.id}`,
        name: workout.name,
        emoji: workout.emoji,
      });
    }
  });

  // Estudos do dia (agenda)
  appData.studies.forEach((study) => {
    if (study.days && study.days.includes(dayOfWeek)) {
      items.push({
        kindLabel: 'Estudo',
        kindClass: 'study',
        typeLabel: study.type === 'logico' ? 'Lógico' : 'Criativo',
        typeClass: 'study',
        status: 'pending',
        id: `study-${study.id}`,
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
    case 'diaria':
      return {
        kindLabel: 'Missão',
        kindClass: 'kind',
        type: 'daily',
        typeLabel: 'Diária',
        typeClass: 'daily',
      };
    case 'semanal':
      return {
        kindLabel: 'Missão',
        kindClass: 'kind',
        type: 'weekly',
        typeLabel: 'Semanal',
        typeClass: 'weekly',
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
    case 'diaria':
      return {
        kindLabel: 'Trabalho',
        kindClass: 'work-kind',
        type: 'daily',
        typeLabel: 'Diária',
        typeClass: 'daily',
      };
    case 'semanal':
      return {
        kindLabel: 'Trabalho',
        kindClass: 'work-kind',
        type: 'weekly',
        typeLabel: 'Semanal',
        typeClass: 'weekly',
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
  recent.forEach((entry) => {
    const card = document.createElement('div');
    card.className = `mission-card history-card compact-history ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'completed'}`.trim();

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
  recent.forEach((entry) => {
    const card = document.createElement('div');
    card.className = `mission-card history-card compact-history ${entry.failed ? 'failed' : entry.skipped ? 'skipped' : 'completed'}`.trim();

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

    completedContainer.appendChild(card);
  });
}

// Inicializar seletores de atributos
function initAttributesSelectors() {
  // Seletor para missões
  const missionAttributesContainer = document.getElementById('mission-attributes');
  if (missionAttributesContainer) {
    missionAttributesContainer.innerHTML = '';

    appData.attributes.forEach((attr) => {
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
    appData.attributes.forEach((attr) => {
      const checkbox = document.createElement('div');
      checkbox.className = 'attribute-checkbox';
      checkbox.innerHTML = `
                <input type="checkbox" id="work-attr-${attr.id}" value="${attr.id}">
                <label for="work-attr-${attr.id}">${attr.emoji} ${attr.name}</label>
            `;
      workAttributesContainer.appendChild(checkbox);
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
function showItemModal(itemType) {
  const modal = document.getElementById('item-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('item-form');

  if (!modal || !modalTitle || !form) return;

  // Limpar o formulário
  form.innerHTML = '';

  // Configurar título e formulário baseado no tipo de item
  let formHTML = '';

  switch (itemType) {
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

  form.innerHTML =
    formHTML +
    `
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
            <p>Suas vidas chegaram a 0. Ao restaurar, 3 vidas voltam e todo o XP é zerado (níveis mantidos).</p>
        </div>
        <button type="button" id="gameover-restore-btn" class="submit-btn">Restaurar 3 vidas</button>
    `;

  form.querySelector('#gameover-restore-btn')?.addEventListener('click', function () {
    // Garantir que maxLives seja pelo menos 1
    const maxLives = Math.max(
      1,
      Number.isFinite(appData.hero.maxLives) ? appData.hero.maxLives : 10
    );
    appData.hero.maxLives = maxLives;
    // Restaurar para 3 vidas (ou maxLives se for menor)
    appData.hero.lives = Math.min(3, maxLives);
    appData.hero.gameOverCounted = false;
    // Marcar que o usuário restaurou hoje (previne loop de game over)
    appData.hero.lastRestoreDate = getLocalDateString();
    resetAllXpKeepLevels();
    addHeroLog(
      'system',
      'Restaurar vida',
      'Vidas restauradas para 3 e todo o XP foi zerado (níveis mantidos).'
    );
    modal.dataset.locked = 'false';
    modal.dataset.gameOverShown = 'false';
    closeModal();
    saveToLocalStorage();
    updateUI();
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

    // Se o usuário restaurou hoje, não mostrar game over novamente
    if (appData.hero.lastRestoreDate === todayStr) {
      // Garantir que as vidas foram restauradas
      const maxLives = Math.max(1, appData.hero.maxLives || 10);
      appData.hero.lives = Math.min(3, maxLives);
      appData.hero.gameOverCounted = false;
      saveToLocalStorage();
      updateUI({ mode: 'activity' });
      return;
    }

    const coinsWereReset = appData.hero.coins === 0;
    appData.hero.coins = 0;

    const modal = document.getElementById('item-modal');
    if (modal?.dataset.gameOverShown === 'true') {
      if (!coinsWereReset) {
        saveToLocalStorage();
        updateUI({ mode: 'activity' });
      }
      return;
    }
    if (appData.hero.gameOverCounted === true) {
      if (!coinsWereReset) {
        saveToLocalStorage();
        updateUI({ mode: 'activity' });
      }
      return;
    }
    if (!appData.statistics) appData.statistics = {};
    appData.statistics.deaths = (appData.statistics.deaths || 0) + 1;
    if (!appData.statistics.deathDates) appData.statistics.deathDates = [];
    appData.statistics.deathDates.push(getLocalDateString());
    appData.hero.gameOverCounted = true;
    const deathsEl = document.getElementById('stat-deaths');
    if (deathsEl) {
      deathsEl.textContent = appData.statistics.deaths;
    }
    addHeroLog(
      'system',
      'Game Over',
      'Vidas chegaram a 0. Moedas zeradas e modal de restauração exibido; XP será zerado ao confirmar.'
    );
    saveToLocalStorage();
    updateUI({ mode: 'activity' });
    if (modal) {
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
  showBookModal,
  showWorkoutCompletionModal,
  showStudyCompletionModal,
  showMissionCompletionModal,
  showWorkCompletionModal,
  closeModal,
  resetAllXpKeepLevels,
  showGameOverModal,
  handleGameOverIfNeeded,
});
