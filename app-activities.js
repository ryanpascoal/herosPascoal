function getActivityCategoryMeta(category) {
  switch (category) {
    case 'mission':
      return { label: 'Missão', emoji: '🎯', className: 'mission' };
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

function getAllTodayActivities() {
  const today = getGameNow();
  const todayStr = getLocalDateString(today);
  const dayOfWeek = today.getDay();
  const items = [];

  (appData.missions || []).forEach((mission) => {
    if (mission.failed) return;
    let visible = false;
    if (isRoutineType(mission.type)) {
      visible = getRoutineDays(mission).includes(dayOfWeek);
    } else if (mission.type === 'eventual' && mission.date) {
      visible = getLocalDateString(parseLocalDateString(mission.date)) >= todayStr;
    } else if (mission.type === 'epica' && mission.deadline) {
      visible = getLocalDateString(parseLocalDateString(mission.deadline)) >= todayStr;
    }
    if (visible) items.push({ category: 'mission', item: mission });
  });

  if (!isWorkOffDay(todayStr)) {
    (appData.works || []).forEach((work) => {
      if (work.failed) return;
      let visible = false;
      if (isRoutineType(work.type)) {
        visible = getRoutineDays(work).includes(dayOfWeek);
      } else if (work.type === 'eventual' && work.date) {
        visible = getLocalDateString(parseLocalDateString(work.date)) >= todayStr;
      } else if (work.type === 'epica' && work.deadline) {
        visible = getLocalDateString(parseLocalDateString(work.deadline)) >= todayStr;
      }
      if (visible) items.push({ category: 'work', item: work });
    });
  }

  if (!isRestDay(todayStr)) {
    (appData.dailyWorkouts || [])
      .filter((entry) => entry && entry.date === todayStr)
      .forEach((entry) => {
        const workout = (appData.workouts || []).find(
          (item) => String(item.id) === String(entry.workoutId)
        );
        if (workout) items.push({ category: 'workout', item: workout, dailyEntry: entry });
      });

    (appData.dailyStudies || [])
      .filter((entry) => entry && entry.date === todayStr)
      .forEach((entry) => {
        const study = (appData.studies || []).find(
          (item) => String(item.id) === String(entry.studyId)
        );
        if (study) items.push({ category: 'study', item: study, dailyEntry: entry });
      });
  }

  (appData.books || []).forEach((book) => {
    if (!book || book.status === 'concluido') return;
    if (book.status === 'lendo' || book.status === 'quero ler')
      items.push({ category: 'book', item: book });
  });

  return items.sort((a, b) => {
    if (a.category === 'work' && a.item.urgent && !(b.category === 'work' && b.item.urgent))
      return -1;
    if (b.category === 'work' && b.item.urgent && !(a.category === 'work' && a.item.urgent))
      return 1;
    return String(a.item.name || '').localeCompare(String(b.item.name || ''), 'pt-BR');
  });
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
  const items = [];

  (appData.missions || []).forEach((mission) => {
    if (mission.completed || mission.failed) return;
    let visible = false;
    if (isRoutineType(mission.type)) {
      visible =
        getRoutineDays(mission).includes(dayOfWeek) &&
        !wasItemLoggedForDate(mission, appData.completedMissions, todayStr);
    } else if (mission.type === 'eventual' && mission.date) {
      visible = getLocalDateString(parseLocalDateString(mission.date)) >= todayStr;
    } else if (mission.type === 'epica' && mission.deadline) {
      visible = getLocalDateString(parseLocalDateString(mission.deadline)) >= todayStr;
    }
    if (visible) items.push({ category: 'mission', item: mission });
  });

  if (!isWorkOffDay(todayStr)) {
    (appData.works || []).forEach((work) => {
      if (work.completed || work.failed) return;
      let visible = false;
      if (isRoutineType(work.type)) {
        visible =
          getRoutineDays(work).includes(dayOfWeek) &&
          !wasItemLoggedForDate(work, appData.completedWorks, todayStr);
      } else if (work.type === 'eventual' && work.date) {
        visible = getLocalDateString(parseLocalDateString(work.date)) >= todayStr;
      } else if (work.type === 'epica' && work.deadline) {
        visible = getLocalDateString(parseLocalDateString(work.deadline)) >= todayStr;
      }
      if (visible) items.push({ category: 'work', item: work });
    });
  }

  if (!isRestDay(todayStr)) {
    (appData.dailyWorkouts || [])
      .filter((entry) => entry && entry.date === todayStr && !entry.completed && !entry.skipped)
      .forEach((entry) => {
        const workout = (appData.workouts || []).find(
          (item) => String(item.id) === String(entry.workoutId)
        );
        if (workout) items.push({ category: 'workout', item: workout, dailyEntry: entry });
      });

    (appData.dailyStudies || [])
      .filter((entry) => entry && entry.date === todayStr && !entry.completed && !entry.skipped)
      .forEach((entry) => {
        const study = (appData.studies || []).find(
          (item) => String(item.id) === String(entry.studyId)
        );
        if (study) items.push({ category: 'study', item: study, dailyEntry: entry });
      });
  }

  (appData.books || []).forEach((book) => {
    if (!book || book.completed || book.status === 'concluido') return;
    if (book.status === 'lendo') items.push({ category: 'book', item: book });
  });

  return items.sort((a, b) => {
    if (a.category === 'work' && a.item.urgent && !(b.category === 'work' && b.item.urgent))
      return -1;
    if (b.category === 'work' && b.item.urgent && !(a.category === 'work' && a.item.urgent))
      return 1;
    return String(a.item.name || '').localeCompare(String(b.item.name || ''), 'pt-BR');
  });
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
    const dateA = getEventDateKey(a.item);
    const dateB = getEventDateKey(b.item);
    return String(dateB).localeCompare(String(dateA));
  });
}

function getUnifiedManagedActivities() {
  return [
    ...(appData.missions || []).map((item) => ({ category: 'mission', item })),
    ...(appData.works || []).map((item) => ({ category: 'work', item })),
    ...(appData.workouts || []).map((item) => ({ category: 'workout', item })),
    ...(appData.studies || []).map((item) => ({ category: 'study', item })),
    ...(appData.books || []).map((item) => ({ category: 'book', item })),
  ].sort((a, b) => String(a.item.name || '').localeCompare(String(b.item.name || ''), 'pt-BR'));
}

function renderUnifiedTodayActivities() {
  const container = document.getElementById('daily-activities');
  if (!container) return;
  const filter = document.getElementById('activity-filter')?.value || 'all';
  const items = getUnifiedTodayActivities().filter(
    (i) => filter === 'all' || i.category === filter
  );
  const skipCount = getSkipItemCount();

  container.innerHTML = '';
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma atividade para hoje.</p>';
    return;
  }

  items.forEach(({ category, item, dailyEntry }) => {
    const categoryMeta = getActivityCategoryMeta(category);
    let leftColorClass = 'activity-color-mission';
    if (category === 'work') leftColorClass = 'activity-color-work';
    else if (category === 'workout') leftColorClass = 'activity-color-workout';
    else if (category === 'study') leftColorClass = 'activity-color-study';
    else if (category === 'book') leftColorClass = 'activity-color-book';

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
        <input type="number" class="workout-entries-input" data-id="${dailyEntry.id}" 
          value="${dailyEntry.entries || ''}" placeholder="Reps" min="0" step="1">
        <button class="complete-btn ${completeClass}" data-id="${actionId}">
          <i class="fas fa-check"></i>
        </button>
      `;
    } else if (isStudy && dailyEntry) {
      actionContent = `
        <input type="checkbox" class="study-checkbox" data-id="${dailyEntry.id}" ${dailyEntry.completed ? 'checked' : ''}>
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

    const card = document.createElement('div');
    card.className = 'compact-activity-card';
    card.innerHTML = `
      <div class="activity-color-bar ${leftColorClass}"></div>
      <span class="activity-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
      <span class="activity-name">${escapeHtml(item.name || 'Atividade')}</span>
      ${dueDateHtml}
      <div class="activity-actions">
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
  const items = getUnifiedHistoryActivities();
  renderPaginatedHistory(
    container,
    items,
    ({ category, item }) => {
      const categoryMeta = getActivityCategoryMeta(category);
      const card = document.createElement('div');
      card.className = `mission-card ${item.failed ? 'failed' : item.skipped ? 'skipped' : 'completed'}`;
      const statusText = item.failed ? 'FALHOU' : item.skipped ? 'PULADO' : 'CONCLUÍDO';
      const statusClass = item.failed
        ? 'failed-status'
        : item.skipped
          ? 'skipped-status'
          : 'completed-status';
      const typeLabel =
        category === 'workout'
          ? getWorkoutTypeName(item.type)
          : category === 'study'
            ? item.type === 'logico'
              ? 'Lógico'
              : 'Criativo'
            : category === 'book'
              ? getBookActivityStatusLabel(item)
              : getMissionTypeName(item.type);
      const eventDate = getEventDateKey(item);
      card.innerHTML = `
        <div class="mission-header">
          <div class="mission-name">
            <span class="mission-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
            <span>${escapeHtml(item.name || 'Atividade')}</span>
          </div>
          <span class="mission-status ${statusClass}">${statusText}</span>
          <span class="mission-type ${categoryMeta.className}">${categoryMeta.label}</span>
        </div>
        <div class="mission-details">
          <p>Tipo: ${typeLabel}</p>
          <p>Data: ${formatDate(eventDate)}</p>
          ${category === 'book' && item.author ? `<p>Autor: ${escapeHtml(item.author)}</p>` : ''}
          ${item.reason ? `<p class="mission-reason">Motivo: ${escapeHtml(item.reason)}</p>` : ''}
          ${item.feedback ? `<p class="mission-feedback">Feedback: ${escapeHtml(item.feedback)}</p>` : ''}
        </div>
      `;
      return card;
    },
    'Nenhuma atividade concluída ainda.',
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
    const categoryMeta = getActivityCategoryMeta(category);
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
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-info">
        <span class="item-emoji">${escapeHtml(item.emoji || categoryMeta.emoji)}</span>
        <div>
          <div class="item-name">${escapeHtml(item.name || 'Atividade')}</div>
          <div class="item-type">${categoryMeta.label} - ${secondary}</div>
          ${category === 'book' && item.author ? `<div class="item-author">${escapeHtml(item.author)}</div>` : ''}
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

  // Se for verificação inicial e lives <= 3, pode ser que o usuário acabou de restaurar
  // Neste caso, pular falhas automáticas para evitar loop de game over
  if (options.isInitialCheck && appData.hero.lives <= 3 && appData.hero.gameOverCounted === false) {
    // Verificar se há flag de "recentemente restaurado"
    const lastRestore = appData.hero.lastRestoreDate;
    if (lastRestore) {
      const today = getLocalDateString();
      if (lastRestore === today) {
        console.log('Verificação inicial: pulando falhas automáticas (usuário restaurou hoje)');
        return;
      }
    }
  }

  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const overdueToFail = [];

  appData.works.forEach((work) => {
    if (work.completed || work.failed) return;

    // Eventuais
    if (work.type === 'eventual' && work.date) {
      const workDateStr = getLocalDateString(parseLocalDateString(work.date));
      if (workDateStr < todayStr) {
        overdueToFail.push({ id: work.id, reason: 'Falha no dia seguinte ao prazo (eventual)' });
      }
    }

    // Épicas
    if (work.type === 'epica' && work.deadline) {
      const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
      if (deadlineStr < todayStr) {
        overdueToFail.push({ id: work.id, reason: 'Falha no dia seguinte ao prazo (Épica)' });
      }
    }

    if (!skipWeekly && isRoutineType(work.type)) {
      const workLineageKey = work.originalId || work.id;
      const yesterdayDayOfWeek = yesterday.getDay();
      const availableFrom = work.availableDate || work.dateAdded || todayStr;
      const shouldCheckYesterday =
        getRoutineDays(work).includes(yesterdayDayOfWeek) && availableFrom <= yesterdayStr;
      if (shouldCheckYesterday) {
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

  // Se for verificação inicial e lives <= 3, pode ser que o usuário acabou de restaurar
  // Neste caso, pular falhas automáticas para evitar loop de game over
  if (options.isInitialCheck && appData.hero.lives <= 3 && appData.hero.gameOverCounted === false) {
    // Verificar se há flag de "recentemente restaurado"
    const lastRestore = appData.hero.lastRestoreDate;
    if (lastRestore) {
      const today = getLocalDateString();
      if (lastRestore === today) {
        console.log('Verificação inicial: pulando falhas automáticas (usuário restaurou hoje)');
        return;
      }
    }
  }

  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const overdueToFail = [];

  appData.missions.forEach((mission) => {
    if (mission.completed || mission.failed) return;

    // Eventuais
    if (mission.type === 'eventual' && mission.date) {
      const missionDateStr = getLocalDateString(parseLocalDateString(mission.date));
      if (missionDateStr < todayStr) {
        overdueToFail.push({ id: mission.id, reason: 'Falha no dia seguinte ao prazo (eventual)' });
      }
    }

    // Épicas
    if (mission.type === 'epica' && mission.deadline) {
      const deadlineStr = getLocalDateString(parseLocalDateString(mission.deadline));
      if (deadlineStr < todayStr) {
        overdueToFail.push({ id: mission.id, reason: 'Falha no dia seguinte ao prazo (Épica)' });
      }
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

  const generalRecord = document.getElementById('streak-general-record');
  const physicalRecord = document.getElementById('streak-physical-record');
  const mentalRecord = document.getElementById('streak-mental-record');
  if (generalRecord)
    generalRecord.textContent = `Recorde: ${appData.statistics.maxStreakGeneral || 0} dias`;
  if (physicalRecord)
    physicalRecord.textContent = `Recorde: ${appData.statistics.maxStreakPhysical || 0} dias`;
  if (mentalRecord)
    mentalRecord.textContent = `Recorde: ${appData.statistics.maxStreakMental || 0} dias`;
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
}

// Atualizar estatísticas
function updateStatistics() {
  const statWorkoutsDone = document.getElementById('stat-workouts-done');
  if (statWorkoutsDone) statWorkoutsDone.textContent = appData.statistics.workoutsDone || 0;
  const statWorkoutsIgnored = document.getElementById('stat-workouts-ignored');
  if (statWorkoutsIgnored)
    statWorkoutsIgnored.textContent = appData.statistics.workoutsIgnored || 0;
  const statStudiesDone = document.getElementById('stat-studies-done');
  if (statStudiesDone) statStudiesDone.textContent = appData.statistics.studiesDone || 0;
  const statStudiesIgnored = document.getElementById('stat-studies-ignored');
  if (statStudiesIgnored) statStudiesIgnored.textContent = appData.statistics.studiesIgnored || 0;
  const statWorksDone = document.getElementById('stat-works-done');
  if (statWorksDone) statWorksDone.textContent = appData.statistics.worksDone || 0;
  const statWorksFailed = document.getElementById('stat-works-failed');
  if (statWorksFailed) statWorksFailed.textContent = appData.statistics.worksFailed || 0;
  const statWorksIgnored = document.getElementById('stat-works-ignored');
  if (statWorksIgnored) statWorksIgnored.textContent = appData.statistics.worksIgnored || 0;
  const statBooksRead = document.getElementById('stat-books-read');
  if (statBooksRead) statBooksRead.textContent = appData.statistics.booksRead || 0;
  const statMissionsDone = document.getElementById('stat-missions-done');
  if (statMissionsDone) statMissionsDone.textContent = appData.statistics.missionsDone || 0;
  const statMissionsFailed = document.getElementById('stat-missions-failed');
  if (statMissionsFailed) statMissionsFailed.textContent = appData.statistics.missionsFailed || 0;
  const statDeaths = document.getElementById('stat-deaths');
  if (statDeaths) statDeaths.textContent = appData.statistics.deaths || 0;
  const statJusticeDone = document.getElementById('stat-justice-done');
  if (statJusticeDone) statJusticeDone.textContent = appData.statistics.justiceDone || 0;

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

  const weeklyCurrent = getPeriodTotals(7, 0);
  const weeklyPrevious = getPeriodTotals(7, 7);
  if (weeklyCompareEl) {
    weeklyCompareEl.innerHTML = `
            <p>Missões: ${weeklyCurrent.missions} (${formatTrendHtml(weeklyCurrent.missions, weeklyPrevious.missions)})</p>
            <p>Falhas/Ignoradas Missões: ${weeklyCurrent.missionsMissed} (${formatTrendHtml(weeklyCurrent.missionsMissed, weeklyPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${weeklyCurrent.works} (${formatTrendHtml(weeklyCurrent.works, weeklyPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${weeklyCurrent.worksMissed} (${formatTrendHtml(weeklyCurrent.worksMissed, weeklyPrevious.worksMissed, true)})</p>
            <p>Treinos: ${weeklyCurrent.workouts} (${formatTrendHtml(weeklyCurrent.workouts, weeklyPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${weeklyCurrent.workoutsMissed} (${formatTrendHtml(weeklyCurrent.workoutsMissed, weeklyPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${weeklyCurrent.studies} (${formatTrendHtml(weeklyCurrent.studies, weeklyPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${weeklyCurrent.studiesMissed} (${formatTrendHtml(weeklyCurrent.studiesMissed, weeklyPrevious.studiesMissed, true)})</p>
            <p>XP: ${weeklyCurrent.totalXP} (${formatTrendHtml(weeklyCurrent.totalXP, weeklyPrevious.totalXP)})</p>
        `;
  }

  const monthCurrent = getMonthTotals(getLocalDateString().slice(0, 7));
  const monthPrevious = getMonthTotals(getPreviousMonthKey(getLocalDateString().slice(0, 7)));
  if (monthlyCompareEl) {
    monthlyCompareEl.innerHTML = `
            <p>Missões: ${monthCurrent.missions} (${formatTrendHtml(monthCurrent.missions, monthPrevious.missions)})</p>
            <p>Falhas/Ignoradas Missões: ${monthCurrent.missionsMissed} (${formatTrendHtml(monthCurrent.missionsMissed, monthPrevious.missionsMissed, true)})</p>
            <p>Trabalhos: ${monthCurrent.works} (${formatTrendHtml(monthCurrent.works, monthPrevious.works)})</p>
            <p>Falhas/Ignorados Trabalhos: ${monthCurrent.worksMissed} (${formatTrendHtml(monthCurrent.worksMissed, monthPrevious.worksMissed, true)})</p>
            <p>Treinos: ${monthCurrent.workouts} (${formatTrendHtml(monthCurrent.workouts, monthPrevious.workouts)})</p>
            <p>Falhas/Ignorados Treinos: ${monthCurrent.workoutsMissed} (${formatTrendHtml(monthCurrent.workoutsMissed, monthPrevious.workoutsMissed, true)})</p>
            <p>Estudos: ${monthCurrent.studies} (${formatTrendHtml(monthCurrent.studies, monthPrevious.studies)})</p>
            <p>Falhas/Ignorados Estudos: ${monthCurrent.studiesMissed} (${formatTrendHtml(monthCurrent.studiesMissed, monthPrevious.studiesMissed, true)})</p>
            <p>XP: ${monthCurrent.totalXP} (${formatTrendHtml(monthCurrent.totalXP, monthPrevious.totalXP)})</p>
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
            <p>7 dias - Missões: ${formatRate(weeklyCurrent.missions, weekMissionsPlanned)}</p>
            <p>7 dias - Trabalhos: ${formatRate(weeklyCurrent.works, weekWorksPlanned)}</p>
            <p>7 dias - Treinos: ${formatRate(weeklyCurrent.workouts, weekWorkoutsPlanned)}</p>
            <p>7 dias - Estudos: ${formatRate(weeklyCurrent.studies, weekStudiesPlanned)}</p>
            <p>Mês - Missões: ${formatRate(monthCurrent.missions, monthMissionsPlanned)}</p>
            <p>Mês - Trabalhos: ${formatRate(monthCurrent.works, monthWorksPlanned)}</p>
            <p>Mês - Treinos: ${formatRate(monthCurrent.workouts, monthWorkoutsPlanned)}</p>
            <p>Mês - Estudos: ${formatRate(monthCurrent.studies, monthStudiesPlanned)}</p>
        `;
  }

  syncStatisticsGoalsInputs();
  if (goalsStatusEl) {
    const goals = appData.statisticsGoals || { missions: 60, workouts: 20, studies: 20, works: 30 };
    goalsStatusEl.innerHTML = `
            <p class="${getGoalStatusClass(weeklyCurrent.missions, goals.missions)}">Missões: ${weeklyCurrent.missions}/${goals.missions}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.works, goals.works)}">Trabalhos: ${weeklyCurrent.works}/${goals.works}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.workouts, goals.workouts)}">Treinos: ${weeklyCurrent.workouts}/${goals.workouts}</p>
            <p class="${getGoalStatusClass(weeklyCurrent.studies, goals.studies)}">Estudos: ${weeklyCurrent.studies}/${goals.studies}</p>
        `;
  }
}

function getPeriodTotals(days, offsetDays) {
  const keys = getPeriodDateKeys(days, offsetDays);
  return getTotalsFromDateKeys(keys);
}

function getMonthTotals(monthKey) {
  const keys = new Set();
  const source = appData.statistics.productiveDays || {};
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
  let trendArrow = '?';

  if (!Number.isFinite(previous) || previous === 0) {
    if (!Number.isFinite(current) || current === 0) {
      text = '0 / sem base';
    } else if (current > 0) {
      text = `${sign}${delta} / novo`;
      trendClass = lowerIsBetter ? 'trend-down' : 'trend-up';
      trendArrow = '?';
    } else {
      text = `${sign}${delta} / sem base`;
      trendClass = lowerIsBetter ? 'trend-up' : 'trend-down';
      trendArrow = '?';
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
    trendArrow = delta > 0 ? '?' : delta < 0 ? '?' : '?';
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
  return entry.completedDate || entry.failedDate || entry.skippedDate || entry.date || '';
}

function getTotalsFromDateKeys(keys) {
  const safeKeys = keys instanceof Set ? keys : new Set();
  const totals = {
    missions: 0,
    missionsMissed: 0,
    works: 0,
    worksMissed: 0,
    workouts: 0,
    workoutsMissed: 0,
    studies: 0,
    studiesMissed: 0,
    totalXP: 0,
  };

  const productiveSource = appData.statistics.productiveDays || {};
  safeKeys.forEach((key) => {
    const data = productiveSource[key] || {};
    totals.missions += Number(data.missions || 0);
    totals.missionsMissed += Number(data.missionsMissed || 0);
    totals.works += Number(data.works || 0);
    totals.worksMissed += Number(data.worksMissed || 0);
    totals.workouts += Number(data.workouts || 0);
    totals.workoutsMissed += Number(data.workoutsMissed || 0);
    totals.studies += Number(data.studies || 0);
    totals.studiesMissed += Number(data.studiesMissed || 0);
    totals.totalXP += Number(data.totalXP || 0);
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

  appData.workouts.forEach((workout) => {
    const row = document.createElement('tr');

    let totalReps = 0;
    let totalDistance = 0;
    let totalTime = 0;
    let timesDone = 0;

    if (workout.stats) {
      totalReps = workout.stats.totalReps || 0;
      totalDistance = workout.stats.totalDistance || 0;
      totalTime = workout.stats.totalTime || 0;
      timesDone = workout.stats.completed || 0;
    }

    row.innerHTML = `
            <td>${workout.emoji} ${workout.name}</td>
            <td>${workout.type === 'repeticao' ? totalReps : '-'}</td>
            <td>${workout.type === 'distancia' ? totalDistance.toFixed(2) + ' km' : '-'}</td>
            <td>${workout.type === 'distancia' ? (totalTime > 0 ? totalTime.toFixed(1) + ' min' : '-') : workout.type === 'maior-tempo' || workout.type === 'menor-tempo' ? totalTime.toFixed(1) + ' min' : '-'}</td>
            <td>${workout.type === 'distancia' && totalTime > 0 ? ((totalDistance / totalTime) * 60).toFixed(1) + ' km/h' : '-'}</td>
            <td>${timesDone}</td>
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
    if (appData.statistics?.maxStreakGeneral) {
      const recordItem = document.createElement('div');
      recordItem.className = 'record-item';
      recordItem.textContent = `🏆 Maior streak geral: ${appData.statistics.maxStreakGeneral} dias`;
      container.appendChild(recordItem);
    }
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
    const productiveDays = Object.entries(appData.statistics.productiveDays || {})
      .filter(([date]) => !isRestDay(date))
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.totalXP - a.totalXP)
      .slice(0, 10); // Top 10 dias

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
  getUnifiedTodayActivities,
  getAllTodayActivities,
  getUnifiedHistoryActivities,
  getUnifiedManagedActivities,
  updateUnifiedActivities,
  renderUnifiedTodayActivities,
  wasItemLoggedForDate,
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
  renderPaginatedHistory,
  formatRate,
  getGoalStatusClass,
  syncStatisticsGoalsInputs,
  saveStatisticsGoals,
  updateWorkoutDetailsTable,
  updateRecords,
  updateProductiveDays,
});
