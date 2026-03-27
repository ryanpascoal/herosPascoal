function updateMissions() {
  updateDailyMissions();
  updateCompletedMissions();
  updateMissionsList();
}

function updateWorks() {
  updateDailyWorks();
  updateCompletedWorks();
  updateWorksList();
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

function updateDailyWorks() {
  const container = document.getElementById('daily-works');
  if (!container) return;

  container.innerHTML = '';

  const today = getGameNow();
  const dayOfWeek = today.getDay();
  const todayStr = getLocalDateString();

  if (isWorkOffDay(todayStr)) {
    container.innerHTML =
      '<p class="empty-message">Hoje esta marcado como folga. Sem trabalhos no dia.</p>';
    return;
  }

  const dailyWorks = appData.works.filter((work) => {
    if (work.completed || work.failed) return false;

    if (work.type === 'diaria') {
      const alreadyLogged = wasItemLoggedForDate(work, appData.completedWorks, todayStr);
      if (alreadyLogged) return false;
      if (work.availableDate) return work.availableDate <= todayStr;
      if (work.dateAdded) return work.dateAdded <= todayStr;
      return true;
    }

    if (work.type === 'semanal') {
      const alreadyLogged = wasItemLoggedForDate(work, appData.completedWorks, todayStr);
      return !alreadyLogged && work.days && work.days.includes(dayOfWeek);
    }

    if (work.type === 'eventual') {
      if (!work.date) return false;
      const workDateStr = getLocalDateString(parseLocalDateString(work.date));
      return workDateStr >= todayStr;
    }

    if (work.type === 'epica') {
      if (!work.deadline) return false;
      const deadlineStr = getLocalDateString(parseLocalDateString(work.deadline));
      return deadlineStr >= todayStr;
    }

    return false;
  });

  const getWorkDueDate = (work) => {
    if (work.type === 'epica' && work.deadline)
      return getLocalDateString(parseLocalDateString(work.deadline));
    if (work.type === 'eventual' && work.date)
      return getLocalDateString(parseLocalDateString(work.date));
    if (work.type === 'diaria') return work.availableDate || work.dateAdded || todayStr;
    if (work.type === 'semanal') return todayStr;
    return '9999-12-31';
  };

  dailyWorks.sort((a, b) => {
    // Urgentes primeiro
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    // Depois por data
    return getWorkDueDate(a).localeCompare(getWorkDueDate(b));
  });

  if (dailyWorks.length === 0) {
    container.innerHTML =
      '<p class="empty-message">Nenhum trabalho para hoje. Adicione novos trabalhos na aba de gerenciamento.</p>';
    return;
  }
  const skipCount = getSkipItemCount();

  dailyWorks.forEach((work) => {
    const card = document.createElement('div');
    const urgentClass = work.urgent ? 'urgent' : '';
    card.className = `mission-card with-side-actions ${urgentClass}`;

    const attributesText = work.attributes
      .map((attrId) => {
        const attr = appData.attributes.find((a) => a.id === attrId);
        return attr ? `${attr.emoji} ${attr.name}` : '';
      })
      .filter(Boolean)
      .join(', ');
    const className = work.classId ? getClassNameById(work.classId) : '';
    const classLine = className ? `<p>Classe: ${className}</p>` : '';
    const dueBadge = getDueBadgeHtml(getWorkDueDate(work), todayStr, work.type);

    card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${work.emoji || '💼'}</span>
                    <span>${work.name} ${work.urgent ? '<span class="urgent-badge">🚨 URGENTE</span>' : ''}</span>
                </div>
                <span class="mission-type ${work.type}">${getMissionTypeName(work.type)}</span>
            </div>
            <div class="mission-details">
                ${dueBadge ? `<p>${dueBadge}</p>` : ''}
                ${work.type === 'epica' ? `<p>Prazo: ${formatDate(work.deadline)}</p>` : ''}
                ${work.type === 'eventual' ? `<p>Prazo: ${formatDate(work.date)}</p>` : ''}
                ${work.type === 'semanal' ? `<p>Dias: ${getDaysNames(work.days)}</p>` : ''}
                ${classLine}
            </div>
            <div class="mission-attributes">
                ${attributesText ? `<p>Atributos: ${attributesText}</p>` : ''}
            </div>
            <div class="mission-actions">
                <button class="complete-btn complete-work-btn" data-id="${work.id}">
                    <i class="fas fa-check"></i> Concluir
                </button>
                ${
                  skipCount > 0
                    ? `
                <button class="skip-btn skip-work-btn" data-id="${work.id}">
                    <i class="fas fa-forward"></i> Pular (x${skipCount})
                </button>
                `
                    : ''
                }
            </div>
        `;

    container.appendChild(card);
  });

  container.querySelectorAll('.complete-work-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      showWorkCompletionModal(id);
    });
  });

  container.querySelectorAll('.skip-work-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      skipWork(id);
    });
  });
}

function updateCompletedWorks() {
  const container = document.getElementById('completed-works');
  if (!container) return;

  container.innerHTML = '';

  if (appData.completedWorks.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum trabalho concluído ainda.</p>';
    return;
  }

  const recentWorks = appData.completedWorks.slice(-30).reverse();
  recentWorks.forEach((work) => {
    const card = document.createElement('div');
    card.className = `mission-card ${work.failed ? 'failed' : work.skipped ? 'skipped' : 'completed'}`;

    const statusText = work.failed ? 'FALHOU' : work.skipped ? 'PULADO' : 'CONCLUIDO';
    const statusClass = work.failed
      ? 'failed-status'
      : work.skipped
        ? 'skipped-status'
        : 'completed-status';
    const rewardText = work.failed
      ? 'Penalidade: -1 vida'
      : work.skipped
        ? 'Custo: 1 item de pulo'
        : work.type === 'epica'
          ? 'Recompensa: 1 XP + 1 moeda'
          : 'Recompensa: 1 XP + 1 moeda';
    const eventDateLabel = work.failed ? 'Falhou em' : work.skipped ? 'Pulado em' : 'Concluido em';
    const eventDateValue = work.completedDate || work.failedDate || work.skippedDate;
    const className = work.classId ? getClassNameById(work.classId) : '';
    const classLine = className ? `<p>Classe: ${className}</p>` : '';

    card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${work.emoji || '💼'}</span>
                    <span>${work.name}</span>
                </div>
                <span class="mission-status ${statusClass}">${statusText}</span>
                <span class="mission-type ${work.type}">${getMissionTypeName(work.type)}</span>
            </div>
            <div class="mission-details">
                <p>${eventDateLabel}: ${formatDate(eventDateValue)}</p>
                <p>${rewardText}</p>
                ${classLine}
                ${work.reason ? `<p class="mission-reason">Motivo: ${work.reason}</p>` : ''}
                ${work.feedback ? `<p class="mission-feedback">Feedback: ${work.feedback}</p>` : ''}
            </div>
        `;

    container.appendChild(card);
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
        overdueToFail.push({ id: work.id, reason: 'Falha no dia seguinte ao prazo (épica)' });
      }
    }

    // Diárias: falha se availableDate ou dateAdded <= ontem
    if (work.type === 'diaria') {
      const availableDate = work.availableDate || work.dateAdded;
      if (availableDate && availableDate <= yesterdayStr) {
        overdueToFail.push({ id: work.id, reason: 'Prazo diário expirado' });
      }
    }

    // Semanais: falha no dia seguinte ao dia programado não cumprido
    if (!skipWeekly && work.type === 'semanal') {
      const workLineageKey = work.originalId || work.id;
      const yesterdayDayOfWeek = yesterday.getDay();
      const availableFrom = work.availableDate || work.dateAdded || todayStr;
      const shouldCheckYesterday =
        work.days && work.days.includes(yesterdayDayOfWeek) && availableFrom <= yesterdayStr;
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
            reason: 'Semanal não concluída no dia programado',
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

function updateWorksList() {
  const container = document.getElementById('works-list');
  if (!container) return;

  container.innerHTML = '';

  if (appData.works.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum trabalho cadastrado.</p>';
    return;
  }

  // Ordenar: urgentes primeiro, depois por data
  const sortedWorks = [...appData.works].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return 0;
  });

  sortedWorks.forEach((work) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isOverdue =
      (work.type === 'epica' &&
        work.deadline &&
        parseLocalDateString(work.deadline) < startOfToday) ||
      (work.type === 'eventual' && work.date && parseLocalDateString(work.date) < startOfToday);
    const className = work.classId ? getClassNameById(work.classId) : '';
    const classInfo = className
      ? `<div class="item-type">Classe: ${escapeHtml(className)}</div>`
      : '';
    const safeWorkName = escapeHtml(work.name || 'Trabalho');
    const safeWorkEmoji = escapeHtml(work.emoji || '💼');

    let deadlineInfo = '';
    if (work.type === 'epica' && work.deadline) {
      const deadline = parseLocalDateString(work.deadline);
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(work.deadline)} (${daysLeft} dias)</div>`;
    } else if (work.type === 'eventual' && work.date) {
      const deadline = parseLocalDateString(work.date);
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(work.date)} (${daysLeft} dias)</div>`;
    }

    const card = document.createElement('div');
    const urgentClass = work.urgent ? 'urgent' : '';
    card.className = `item-card ${isOverdue ? 'overdue' : ''} ${urgentClass}`;
    card.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${safeWorkEmoji}</span>
                <div>
                    <div class="item-name">${safeWorkName} ${work.urgent ? '<span class="urgent-badge">🚨 URGENTE</span>' : ''}</div>
                    <div class="item-type">${getMissionTypeName(work.type)}</div>
                    ${classInfo}
                    ${deadlineInfo}
                    ${isOverdue ? '<div class="overdue-warning">ATRASADO!</div>' : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn urgent-btn ${work.urgent ? 'active' : ''}" data-id="${work.id}" title="${work.urgent ? 'Remover urgência' : 'Marcar como urgente'}"><i class="fas fa-bell"></i></button>
                <button class="action-btn edit-btn" data-id="${work.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${work.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(card);
  });

  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      editWork(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      deleteWork(id);
    });
  });

  // Toggle urgency
  container.querySelectorAll('.urgent-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      const work = appData.works.find((w) => w.id === id);
      if (work) {
        work.urgent = !work.urgent;
        updateWorksList();
        saveToLocalStorage();
      }
    });
  });
}

// Atualizar missões do dia (função ajustada)
function updateDailyMissions() {
  const container = document.getElementById('daily-missions');
  if (!container) return;

  container.innerHTML = '';

  const today = getGameNow();
  const dayOfWeek = today.getDay();
  const todayStr = getLocalDateString();

  // Filtrar apenas missões não concluídas e relevantes para HOJE
  const dailyMissions = appData.missions.filter((mission) => {
    if (mission.completed || mission.failed) return false;

    // Para missões diárias: verificar se estão disponíveis HOJE
    if (mission.type === 'diaria') {
      const alreadyLogged = wasItemLoggedForDate(mission, appData.completedMissions, todayStr);
      if (alreadyLogged) return false;
      // Se tiver availableDate, verificar se é hoje ou antes
      if (mission.availableDate) {
        return mission.availableDate <= todayStr;
      }
      // Se não tiver availableDate, verificar se foi adicionada hoje ou antes
      if (mission.dateAdded) {
        return mission.dateAdded <= todayStr;
      }
      // Se não tiver data, mostrar sempre (compatibilidade)
      return true;
    }

    if (mission.type === 'semanal') {
      const alreadyLogged = wasItemLoggedForDate(mission, appData.completedMissions, todayStr);
      return !alreadyLogged && mission.days && mission.days.includes(dayOfWeek);
    }

    if (mission.type === 'eventual') {
      if (!mission.date) return false;
      const missionDateStr = getLocalDateString(parseLocalDateString(mission.date));
      return missionDateStr >= todayStr;
    }

    if (mission.type === 'epica') {
      if (!mission.deadline) return false;
      const deadline = parseLocalDateString(mission.deadline);
      const deadlineStr = getLocalDateString(deadline);
      return deadlineStr >= todayStr;
    }

    return false;
  });

  const getMissionDueDate = (mission) => {
    if (mission.type === 'epica' && mission.deadline)
      return getLocalDateString(parseLocalDateString(mission.deadline));
    if (mission.type === 'eventual' && mission.date)
      return getLocalDateString(parseLocalDateString(mission.date));
    if (mission.type === 'diaria') return mission.availableDate || mission.dateAdded || todayStr;
    if (mission.type === 'semanal') return todayStr;
    return '9999-12-31';
  };

  dailyMissions.sort((a, b) => getMissionDueDate(a).localeCompare(getMissionDueDate(b)));

  console.log(`Missões filtradas para hoje (${todayStr}): ${dailyMissions.length}`);

  if (dailyMissions.length === 0) {
    container.innerHTML =
      '<p class="empty-message">Nenhuma missão para hoje. Adicione novas missões na aba de gerenciamento.</p>';
    return;
  }
  const skipCount = getSkipItemCount();

  dailyMissions.forEach((mission) => {
    const missionCard = document.createElement('div');
    missionCard.className = 'mission-card with-side-actions';

    const attributesText = mission.attributes
      .map((attrId) => {
        const attr = appData.attributes.find((a) => a.id === attrId);
        return attr ? `${attr.emoji} ${attr.name}` : '';
      })
      .filter((text) => text)
      .join(', ');
    const dueBadge = getDueBadgeHtml(getMissionDueDate(mission), todayStr, mission.type);
    missionCard.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${mission.emoji || '🎯'}</span>
                    <span>${mission.name}</span>
                </div>
                <span class="mission-type ${mission.type}">${getMissionTypeName(mission.type)}</span>
            </div>
            <div class="mission-details">
                ${dueBadge ? `<p>${dueBadge}</p>` : ''}
                ${mission.type === 'epica' ? `<p>Prazo: ${formatDate(mission.deadline)}</p>` : ''}
                ${mission.type === 'eventual' ? `<p>Prazo: ${formatDate(mission.date)}</p>` : ''}
                ${mission.type === 'semanal' ? `<p>Dias: ${getDaysNames(mission.days)}</p>` : ''}
            </div>
            <div class="mission-attributes">
                ${attributesText ? `<p>Atributos: ${attributesText}</p>` : ''}
            </div>
            <div class="mission-actions">
                <button class="complete-btn" data-id="${mission.id}">
                    <i class="fas fa-check"></i> Concluir
                </button>
                ${
                  skipCount > 0
                    ? `
                <button class="skip-btn skip-mission-btn" data-id="${mission.id}">
                    <i class="fas fa-forward"></i> Pular (x${skipCount})
                </button>
                `
                    : ''
                }
            </div>
        `;

    container.appendChild(missionCard);
  });

  // Adicionar eventos aos botões de conclusão
  container.querySelectorAll('.complete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      showMissionCompletionModal(id);
    });
  });
  container.querySelectorAll('.skip-mission-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      skipMission(id);
    });
  });
}

function updateCompletedMissions() {
  const container = document.getElementById('completed-missions');
  if (!container) return;

  container.innerHTML = '';

  if (appData.completedMissions.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma missão concluída ainda.</p>';
    return;
  }

  // Mostrar apenas as últimas 30 missões (concluídas ou falhadas)
  const recentMissions = appData.completedMissions.slice(-30).reverse();

  recentMissions.forEach((mission) => {
    const missionCard = document.createElement('div');
    missionCard.className = `mission-card ${mission.failed ? 'failed' : mission.skipped ? 'skipped' : 'completed'}`;

    const statusText = mission.failed ? 'FALHOU' : mission.skipped ? 'PULADA' : 'CONCLUIDA';
    const statusClass = mission.failed
      ? 'failed-status'
      : mission.skipped
        ? 'skipped-status'
        : 'completed-status';
    const rewardText = mission.failed
      ? 'Penalidade: -1 vida'
      : mission.skipped
        ? 'Custo: 1 item de pulo'
        : mission.type === 'epica'
          ? 'Recompensa: 20 XP + 10 moedas'
          : 'Recompensa: 1 XP + 1 moeda';
    const eventDateLabel = mission.failed
      ? 'Falhou em'
      : mission.skipped
        ? 'Pulada em'
        : 'Concluida em';
    const eventDateValue = mission.completedDate || mission.failedDate || mission.skippedDate;
    missionCard.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${mission.emoji || '🎯'}</span>
                    <span>${mission.name}</span>
                </div>
                <span class="mission-status ${statusClass}">${statusText}</span>
                <span class="mission-type ${mission.type}">${getMissionTypeName(mission.type)}</span>
            </div>
            <div class="mission-details">
                <p>${eventDateLabel}: ${formatDate(eventDateValue)}</p>
                <p>${rewardText}</p>
                ${mission.reason ? `<p class="mission-reason">Motivo: ${mission.reason}</p>` : ''}
                ${mission.feedback ? `<p class="mission-feedback">Feedback: ${mission.feedback}</p>` : ''}
            </div>
        `;

    container.appendChild(missionCard);
  });
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
        overdueToFail.push({ id: mission.id, reason: 'Falha no dia seguinte ao prazo (épica)' });
      }
    }

    // Diárias: falha se availableDate ou dateAdded <= ontem
    if (mission.type === 'diaria') {
      const availableDate = mission.availableDate || mission.dateAdded;
      if (availableDate && availableDate <= yesterdayStr) {
        overdueToFail.push({ id: mission.id, reason: 'Prazo diário expirado' });
      }
    }

    // Semanais: falha no dia seguinte ao dia programado não cumprido
    if (!skipWeekly && mission.type === 'semanal') {
      const missionLineageKey = mission.originalId || mission.id;
      const yesterdayDayOfWeek = yesterday.getDay();
      const availableFrom = mission.availableDate || mission.dateAdded || todayStr;
      const shouldCheckYesterday =
        mission.days && mission.days.includes(yesterdayDayOfWeek) && availableFrom <= yesterdayStr;
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
            reason: 'Semanal não concluída no dia programado',
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

// Atualizar lista de missões cadastradas
function updateMissionsList() {
  const container = document.getElementById('missions-list');
  if (!container) return;

  container.innerHTML = '';

  if (appData.missions.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma missão cadastrada.</p>';
    return;
  }

  appData.missions.forEach((mission) => {
    // Verificar se a missão está atrasada
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isOverdue =
      (mission.type === 'epica' &&
        mission.deadline &&
        parseLocalDateString(mission.deadline) < startOfToday) ||
      (mission.type === 'eventual' &&
        mission.date &&
        parseLocalDateString(mission.date) < startOfToday);
    const missionCard = document.createElement('div');
    missionCard.className = `item-card ${isOverdue ? 'overdue' : ''}`;

    let deadlineInfo = '';
    if (mission.type === 'epica' && mission.deadline) {
      const deadline = parseLocalDateString(mission.deadline);
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(mission.deadline)} (${daysLeft} dias)</div>`;
    } else if (mission.type === 'eventual' && mission.date) {
      const deadline = parseLocalDateString(mission.date);
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      deadlineInfo = `<div class="mission-deadline">Prazo: ${formatDate(mission.date)} (${daysLeft} dias)</div>`;
    }

    missionCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${mission.emoji || '🎯'}</span>
                <div>
                    <div class="item-name">${mission.name}</div>
                    <div class="item-type">${getMissionTypeName(mission.type)}</div>
                    ${deadlineInfo}
                    ${isOverdue ? '<div class="overdue-warning">ATRASADA!</div>' : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${mission.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${mission.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(missionCard);
  });

  // Adicionar eventos aos botões
  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      editMission(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteMission(id);
    });
  });
}

// Atualizar streaks display
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
  (appData.completedMissions || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (key && key.slice(0, 7) === monthKey) keys.add(key);
  });
  (appData.completedWorks || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (key && key.slice(0, 7) === monthKey) keys.add(key);
  });
  (appData.completedWorkouts || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (key && key.slice(0, 7) === monthKey) keys.add(key);
  });
  (appData.completedStudies || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (key && key.slice(0, 7) === monthKey) keys.add(key);
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
      trendArrow = '↑';
    } else {
      text = `${sign}${delta} / sem base`;
      trendClass = lowerIsBetter ? 'trend-up' : 'trend-down';
      trendArrow = '↓';
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
    totals.totalXP += Number(data.totalXP || 0);
  });

  (appData.completedMissions || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!safeKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.missionsMissed += 1;
    else totals.missions += 1;
  });

  (appData.completedWorks || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!safeKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.worksMissed += 1;
    else totals.works += 1;
  });

  (appData.completedWorkouts || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!safeKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.workoutsMissed += 1;
    else totals.workouts += 1;
  });

  (appData.completedStudies || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!safeKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.studiesMissed += 1;
    else totals.studies += 1;
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

  container.innerHTML = '';

  // Records de treinos
  appData.workouts.forEach((workout) => {
    if (workout.stats) {
      let recordText = '';

      if (workout.type === 'repeticao' && workout.stats.bestReps > 0) {
        recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestReps} repetições`;
      } else if (workout.type === 'distancia' && workout.stats.bestDistance > 0) {
        recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestDistance.toFixed(2)} km`;
      } else if (
        (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') &&
        workout.stats.bestTime > 0
      ) {
        recordText = `${workout.emoji} ${workout.name}: ${workout.stats.bestTime.toFixed(1)} min`;
      }

      if (recordText) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.textContent = recordText;
        container.appendChild(recordItem);
      }
    }
  });

  const productiveDaysRecords = Object.values(appData.statistics.productiveDays || {});

  // Records de missões
  const maxMissionsPerDay = Math.max(0, ...productiveDaysRecords.map((r) => r.missions || 0));
  if (maxMissionsPerDay > 0) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `🎯 Máximo de missões em um dia: ${maxMissionsPerDay}`;
    container.appendChild(recordItem);
  }

  // Records de estudos
  const maxStudiesPerDay = Math.max(0, ...productiveDaysRecords.map((r) => r.studies || 0));
  if (maxStudiesPerDay > 0) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `📚 Máximo de estudos em um dia: ${maxStudiesPerDay}`;
    container.appendChild(recordItem);
  }

  // Records de treinos
  const maxWorkoutsPerDay = Math.max(0, ...productiveDaysRecords.map((r) => r.workouts || 0));
  if (maxWorkoutsPerDay > 0) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `💪 Máximo de treinos em um dia: ${maxWorkoutsPerDay}`;
    container.appendChild(recordItem);
  }

  const maxWorksPerDay = Math.max(0, ...productiveDaysRecords.map((r) => r.works || 0));
  if (maxWorksPerDay > 0) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `💼 Máximo de trabalhos em um dia: ${maxWorksPerDay}`;
    container.appendChild(recordItem);
  }

  // Novos records agregados
  const dayStats = {};
  const ensureDayStats = (dateKey) => {
    if (!dateKey) return null;
    if (!dayStats[dateKey]) {
      dayStats[dateKey] = { done: 0, missed: 0 };
    }
    return dayStats[dateKey];
  };
  const addEventToDayStats = (entry) => {
    const key = getEventDateKey(entry);
    const stats = ensureDayStats(key);
    if (!stats) return;
    if (entry.failed || entry.skipped) stats.missed += 1;
    else stats.done += 1;
  };
  (appData.completedMissions || []).forEach(addEventToDayStats);
  (appData.completedWorks || []).forEach(addEventToDayStats);
  (appData.completedWorkouts || []).forEach(addEventToDayStats);
  (appData.completedStudies || []).forEach(addEventToDayStats);

  const sortedDates = Object.keys(dayStats).sort();
  const toDate = (key) => new Date(`${key}T00:00:00`);
  const daysDiff = (a, b) => Math.round((toDate(a) - toDate(b)) / 86400000);
  const toWeekWindowSet = (endDateKey) => {
    const keys = new Set();
    const end = toDate(endDateKey);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      keys.add(getLocalDateString(d));
    }
    return keys;
  };

  // Maior sequencia sem falhas
  let bestNoFailStreak = 0;
  let currentNoFailStreak = 0;
  let prevDateKey = '';
  sortedDates.forEach((dateKey) => {
    const stats = dayStats[dateKey];
    const isPerfectDay = stats.done > 0 && stats.missed === 0;
    if (!isPerfectDay) {
      currentNoFailStreak = 0;
      prevDateKey = dateKey;
      return;
    }
    const isConsecutive = prevDateKey && daysDiff(dateKey, prevDateKey) === 1;
    currentNoFailStreak = isConsecutive ? currentNoFailStreak + 1 : 1;
    bestNoFailStreak = Math.max(bestNoFailStreak, currentNoFailStreak);
    prevDateKey = dateKey;
  });
  if (bestNoFailStreak > 0) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `🛡️ Maior sequência sem falhas: ${bestNoFailStreak} dias`;
    container.appendChild(recordItem);
  }

  // Maior XP em um dia
  let bestXpDate = '';
  let bestXpValue = 0;
  Object.entries(appData.statistics.productiveDays || {}).forEach(([dateKey, data]) => {
    const total = Number(data?.totalXP || 0);
    if (total > bestXpValue) {
      bestXpValue = total;
      bestXpDate = dateKey;
    }
  });
  if (bestXpValue > 0 && bestXpDate) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `⭐ Maior XP em um dia: ${bestXpValue} (${formatDate(bestXpDate)})`;
    container.appendChild(recordItem);
  }

  // Melhor semana (atividades concluidas) e melhor aderencia semanal
  let bestWeekDone = 0;
  let bestWeekEnd = '';
  let bestWeekAdherence = 0;
  let bestWeekAdherenceEnd = '';
  sortedDates.forEach((endDateKey) => {
    const weekTotals = getTotalsFromDateKeys(toWeekWindowSet(endDateKey));
    const weekDone =
      weekTotals.missions + weekTotals.works + weekTotals.workouts + weekTotals.studies;
    const weekMissed =
      weekTotals.missionsMissed +
      weekTotals.worksMissed +
      weekTotals.workoutsMissed +
      weekTotals.studiesMissed;
    const planned = weekDone + weekMissed;
    if (weekDone > bestWeekDone) {
      bestWeekDone = weekDone;
      bestWeekEnd = endDateKey;
    }
    if (planned > 0) {
      const adherence = (weekDone / planned) * 100;
      if (adherence > bestWeekAdherence) {
        bestWeekAdherence = adherence;
        bestWeekAdherenceEnd = endDateKey;
      }
    }
  });
  if (bestWeekDone > 0 && bestWeekEnd) {
    const start = toDate(bestWeekEnd);
    start.setDate(start.getDate() - 6);
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `📈 Melhor semana: ${bestWeekDone} concluídas (${formatDate(getLocalDateString(start))} a ${formatDate(bestWeekEnd)})`;
    container.appendChild(recordItem);
  }
  if (bestWeekAdherenceEnd) {
    const start = toDate(bestWeekAdherenceEnd);
    start.setDate(start.getDate() - 6);
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `✅ Maior aderência semanal: ${bestWeekAdherence.toFixed(1).replace('.', ',')}% (${formatDate(getLocalDateString(start))} a ${formatDate(bestWeekAdherenceEnd)})`;
    container.appendChild(recordItem);
  }

  // Melhor mes (XP)
  const monthXpTotals = {};
  Object.entries(appData.statistics.productiveDays || {}).forEach(([dateKey, data]) => {
    const monthKey = (dateKey || '').slice(0, 7);
    if (!monthKey) return;
    monthXpTotals[monthKey] = (monthXpTotals[monthKey] || 0) + Number(data?.totalXP || 0);
  });
  let bestMonthKey = '';
  let bestMonthXp = 0;
  Object.entries(monthXpTotals).forEach(([monthKey, totalXp]) => {
    if (totalXp > bestMonthXp) {
      bestMonthXp = totalXp;
      bestMonthKey = monthKey;
    }
  });
  if (bestMonthKey && bestMonthXp > 0) {
    const [year, month] = bestMonthKey.split('-').map(Number);
    const label = new Date(year, (month || 1) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `🗓️ Melhor mês (XP): ${bestMonthXp} em ${label}`;
    container.appendChild(recordItem);
  }

  // Records de streaks
  if (appData.statistics.maxStreakGeneral) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `🔥 Maior streak geral: ${appData.statistics.maxStreakGeneral} dias`;
    container.appendChild(recordItem);
  }
  if (appData.statistics.maxStreakPhysical) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `💪 Maior streak físico: ${appData.statistics.maxStreakPhysical} dias`;
    container.appendChild(recordItem);
  }
  if (appData.statistics.maxStreakMental) {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';
    recordItem.textContent = `📚 Maior streak mental: ${appData.statistics.maxStreakMental} dias`;
    container.appendChild(recordItem);
  }
}

// Atualizar dias produtivos
function updateProductiveDays() {
  const tbody = document.querySelector('#productive-days-table tbody');
  if (!tbody) return;

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
}

// Atualizar diário

// __appActivitiesBridge: exposes activity APIs for legacy scripts during module migration
Object.assign(globalThis, {
  updateMissions,
  updateWorks,
  wasItemLoggedForDate,
  updateDailyWorks,
  updateCompletedWorks,
  checkOverdueWorks,
  updateWorksList,
  updateDailyMissions,
  updateCompletedMissions,
  checkOverdueMissions,
  updateMissionsList,
  updateStreaksDisplay,
  updateMaxStreaks,
  updateStatistics,
  updateAdvancedStatistics,
  getPeriodTotals,
  getMonthTotals,
  formatDeltaWithPercent,
  formatTrendHtml,
  getPeriodDateKeys,
  getEventDateKey,
  getTotalsFromDateKeys,
  formatRate,
  getGoalStatusClass,
  syncStatisticsGoalsInputs,
  saveStatisticsGoals,
  updateWorkoutDetailsTable,
  updateRecords,
  updateProductiveDays,
});
