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
  updateUI({ mode: 'activity' });
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
  updateUI({ mode: 'activity' });
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

function formatWorkoutWeightValue(weightKg) {
  const safeWeight = Math.max(0, Number(weightKg || 0));
  const roundedWeight = Math.round(safeWeight * 100) / 100;
  return Number.isInteger(roundedWeight)
    ? `${roundedWeight} kg`
    : `${String(roundedWeight).replace('.', ',')} kg`;
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
    if (isRepetitionWorkoutType(entry) && Array.isArray(entry.series)) {
      const totalReps = entry.series.reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
      const usesWeight =
        typeof workoutUsesWeight === 'function'
          ? workoutUsesWeight(entry)
          : entry?.usesWeight === true;
      const totalValue =
        usesWeight && typeof getWorkoutDayTotalLoad === 'function'
          ? getWorkoutDayTotalLoad(entry.series, entry.weights)
          : totalReps;
      const prevTotal = lastTotalsByWorkoutId.get(entry.workoutId);
      if (prevTotal !== undefined) {
        prevTotalsByEntryId.set(entry.id, prevTotal);
      }
      lastTotalsByWorkoutId.set(entry.workoutId, totalValue);
    }
    if (isDistanceWorkoutType(entry) && entry.distance !== null && entry.distance !== undefined) {
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
      details.push(`<p>Tipo: ${getWorkoutTypeName(entry)}</p>`);

      if (!entry.failed && !entry.skipped && isRepetitionWorkoutType(entry) && Array.isArray(entry.series)) {
        const totalReps = entry.series.reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
        const usesWeight =
          typeof workoutUsesWeight === 'function'
            ? workoutUsesWeight(entry)
            : entry?.usesWeight === true;
        const weights = Array.isArray(entry.weights) ? entry.weights : [null, null, null];
        const totalLoad =
          usesWeight && typeof getWorkoutDayTotalLoad === 'function'
            ? getWorkoutDayTotalLoad(entry.series, weights)
            : 0;
        const comparisonValue = usesWeight ? totalLoad : totalReps;
        const prevTotal = prevTotalsByEntryId.get(entry.id);
        let trend = '';
        if (prevTotal !== undefined) {
          if (comparisonValue > prevTotal) trend = ' <span class="trend-up">&uarr;</span>';
          else if (comparisonValue < prevTotal) trend = ' <span class="trend-down">&darr;</span>';
        }
        const seriesLabel = usesWeight
          ? entry.series
              .map(
                (value, index) =>
                  `${value || 0} rep x ${formatWorkoutWeightValue(weights[index])}`
              )
              .join(' / ')
          : entry.series.map((v) => v || 0).join(' / ');
        const totalsLabel = usesWeight
          ? `Total: ${totalReps} rep | Volume: ${formatWorkoutWeightValue(totalLoad)}`
          : `Total: ${totalReps}`;
        details.push(`<p>Séries: ${seriesLabel} (${totalsLabel})${trend}</p>`);
      }
      if (!entry.failed && !entry.skipped && isDistanceWorkoutType(entry) && entry.distance !== null && entry.distance !== undefined) {
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
            const durationLabel =
              typeof formatWorkoutDuration === 'function'
                ? formatWorkoutDuration(time)
                : `${time}s`;
            const speedLabel =
              typeof formatWorkoutSpeedSummary === 'function'
                ? formatWorkoutSpeedSummary(distance, time)
                : `${((distance * 3600) / time).toFixed(1)} km/h`;
            details.push(`<p>Tempo: ${durationLabel}</p>`);
            details.push(`<p>Velocidade média: ${speedLabel}</p>`);
          }
        }
      }
      if (!entry.failed && !entry.skipped && isTimedWorkoutType(entry) && entry.time !== null && entry.time !== undefined) {
        const timeLabel =
          typeof formatWorkoutDuration === 'function'
            ? formatWorkoutDuration(entry.time)
            : `${entry.time}s`;
        details.push(`<p>Tempo: ${timeLabel}</p>`);
      }
      if (entry.reason && !entry.failed) {
        details.push(`<p class="mission-reason">Motivo: ${escapeHtml(entry.reason)}</p>`);
      }
      if (entry.feedback) {
        details.push(`<p>Feedback: ${escapeHtml(entry.feedback)}</p>`);
      }
      const safeEmoji = escapeHtml(entry.emoji || '??');
      const safeName = escapeHtml(entry.name || 'Treino');

      card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
                </div>
                <span class="mission-status ${statusClass}">
                    ${statusText}
                </span>
                <span class="workout-type compact-history-type">${getWorkoutTypeName(entry)}</span>
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
        details.push(`<p class="mission-reason">Motivo: ${escapeHtml(entry.reason)}</p>`);
      }
      if (entry.feedback) {
        details.push(`<p>Feedback: ${escapeHtml(entry.feedback)}</p>`);
      }
      const safeEmoji = escapeHtml(entry.emoji || '??');
      const safeName = escapeHtml(entry.name || 'Estudo');

      card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">
                    <span class="mission-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
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

function initPeopleSelectors() {
  if (typeof populateActivityPeopleSelector === 'function') {
    populateActivityPeopleSelector();
  }
}

function isTabActive(tabId) {
  return document.getElementById(tabId)?.classList.contains('active') === true;
}

function hidePanel(panel) {
  if (!panel) return;
  panel.classList.remove('active');
  panel.style.display = 'none';
}

function showPanel(panel) {
  if (!panel) return;
  panel.classList.add('active');
  panel.style.removeProperty('display');
}

function getDirectPanels(container, className) {
  return Array.from(container?.children || []).filter((child) =>
    child?.classList?.contains(className)
  );
}

function restoreActiveNestedPanels(container) {
  if (!container?.querySelectorAll) return;
  container.querySelectorAll('.sub-tab.active, .inner-tab.active').forEach((panel) => {
    panel.style.removeProperty('display');
  });
}

// Trocar entre abas principais
function switchTab(tabName) {
  // Remover a classe active de todas as abas
  document.querySelectorAll('.tab-content').forEach((tab) => {
    hidePanel(tab);
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
  });

  // Adicionar a classe active à aba selecionada
  const activeTab = document.getElementById(tabName);
  if (activeTab) {
    showPanel(activeTab);
    restoreActiveNestedPanels(activeTab);
  }

  document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');

  // Atualizar a interface específica da aba
  if (tabName === 'estatisticas') {
    updateCharts();
  } else if (tabName === 'gestao') {
    const financeTabs = document.getElementById('gestao');
    if (financeTabs && !financeTabs.querySelector('.sub-tab.active')) {
      switchSubTab('gestao-resumo', financeTabs);
    }
  } else if (tabName === 'notas') {
    if (typeof renderNotes === 'function') renderNotes();
  } else if (tabName === 'alimentacao') {
    updateNutritionView();
  } else if (tabName === 'perfil') {
    const profileTabs = document.querySelector('.profile-tabs');
    if (profileTabs && !profileTabs.querySelector('.sub-tab.active')) {
      switchSubTab('atributos', profileTabs);
    }
    if (typeof updateAttributes === 'function') updateAttributes();
    if (typeof updateWorkoutsDisplay === 'function') updateWorkoutsDisplay();
    if (typeof updateStudiesDisplay === 'function') updateStudiesDisplay();
    if (typeof updateClassesList === 'function') updateClassesList();
    if (typeof updateShop === 'function') updateShop();
    if (typeof updateInventory === 'function') updateInventory();
  }
}

// Trocar entre abas secundárias
function switchSubTab(subTabName, parentElement) {
  if (!subTabName || !parentElement) return;

  // Se o parentElement já é um sub-content, usá-lo diretamente
  // Caso contrário, procurar o sub-content dentro dele
  let subContent = parentElement.classList.contains('sub-content')
    ? parentElement
    : parentElement.querySelector('.sub-content');

  if (!subContent) {
    subContent = parentElement;
  }

  if (!subContent) {
    console.error('switchSubTab: subContent não encontrado', parentElement);
    return;
  }

  // Oculta apenas as sub-abas diretas deste grupo para preservar o estado das abas internas.
  getDirectPanels(subContent, 'sub-tab').forEach((tab) => {
    hidePanel(tab);
  });

  // Encontra o elemento de destino pelo ID (dentro de subContent primero)
  let targetTab = subContent.querySelector(`#${subTabName}`);

  // Se não encontrou, tenta no documento todo
  if (!targetTab) {
    targetTab = document.getElementById(subTabName);
  }

  // Se ainda não encontrou, tenta com prefixo
  if (!targetTab) {
    const sectionParent = subContent.closest('section');
    const sectionId = sectionParent?.id;
    if (sectionId) {
      targetTab =
        document.getElementById(`${sectionId}-${subTabName}`) ||
        subContent.querySelector(`#${sectionId}-${subTabName}`);
    }
  }

  if (targetTab) {
    showPanel(targetTab);
    restoreActiveNestedPanels(targetTab);
  }

  // Atualiza os botões.active do sub-nav relacionado
  const subNav = parentElement.classList.contains('sub-content')
    ? parentElement.parentElement?.querySelector('.sub-nav')
    : parentElement.querySelector('.sub-nav');
    
  if (subNav) {
    subNav.querySelectorAll('.sub-nav-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    subNav.querySelector(`[data-subtab="${subTabName}"]`)?.classList.add('active');
  }

  if (subTabName === 'graficos') {
    updateCharts();
  } else if (subTabName === 'records') {
    updateRecords();
    updateProductiveDays();
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
  const existingUsesWeight =
    typeof workoutUsesWeight === 'function'
      ? workoutUsesWeight(existingItem)
      : existingItem?.usesWeight === true;
  const safeExistingName = escapeHtml(existingItem?.name || '');
  const safeExistingEmoji = escapeHtml(existingItem?.emoji || '');

  switch (itemType) {
    case 'treino':
      modalTitle.textContent = isEditing ? 'Editar Treino' : 'Adicionar Novo Treino';
      formHTML = `
                <div class="form-group">
                    <label for="modal-item-name">Nome do Treino</label>
                    <input type="text" id="modal-item-name" value="${safeExistingName}" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="??" value="${safeExistingEmoji}">
                </div>
                <div class="form-group">
                    <label for="modal-item-type">Tipo de Treino</label>
                    <select id="modal-item-type" required>
                        <option value="reps|maximize" ${((typeof getWorkoutSelectionValue === 'function' ? getWorkoutSelectionValue(existingItem) : '') === 'reps|maximize') ? 'selected' : ''}>Repetição</option>
                        <option value="distance|maximize" ${((typeof getWorkoutSelectionValue === 'function' ? getWorkoutSelectionValue(existingItem) : '') === 'distance|maximize') ? 'selected' : ''}>Distância</option>
                        <option value="duration|maximize" ${((typeof getWorkoutSelectionValue === 'function' ? getWorkoutSelectionValue(existingItem) : '') === 'duration|maximize') ? 'selected' : ''}>Duração</option>
                        <option value="duration|minimize" ${((typeof getWorkoutSelectionValue === 'function' ? getWorkoutSelectionValue(existingItem) : '') === 'duration|minimize') ? 'selected' : ''}>Contra o tempo</option>
                    </select>
                </div>
                <div class="form-group" id="modal-item-weight-container">
                    <label class="day-checkbox" for="modal-item-uses-weight">
                        <input type="checkbox" id="modal-item-uses-weight" ${existingUsesWeight ? 'checked' : ''}>
                        Registrar carga (kg)
                    </label>
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
                    <input type="text" id="modal-item-name" value="${safeExistingName}" required>
                </div>
                <div class="form-group">
                    <label for="modal-item-emoji">Emoji (opcional)</label>
                    <input type="text" id="modal-item-emoji" placeholder="??" value="${safeExistingEmoji}">
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

  const modalWorkoutTypeInput = document.getElementById('modal-item-type');
  const modalWorkoutWeightContainer = document.getElementById('modal-item-weight-container');
  const modalWorkoutUsesWeightInput = document.getElementById('modal-item-uses-weight');
  if (modalWorkoutTypeInput && modalWorkoutWeightContainer && modalWorkoutUsesWeightInput) {
    const syncModalWorkoutWeightVisibility = () => {
      const metric =
        typeof getWorkoutMetric === 'function'
          ? getWorkoutMetric(modalWorkoutTypeInput.value)
          : String(modalWorkoutTypeInput.value || '').trim().startsWith('reps')
            ? 'reps'
            : 'other';
      const isRepetitionWorkout = metric === 'reps';
      modalWorkoutWeightContainer.style.display = isRepetitionWorkout ? 'block' : 'none';
      modalWorkoutUsesWeightInput.disabled = !isRepetitionWorkout;
      if (!isRepetitionWorkout) {
        modalWorkoutUsesWeightInput.checked = false;
      }
    };
    syncModalWorkoutWeightVisibility();
    modalWorkoutTypeInput.addEventListener('change', syncModalWorkoutWeightVisibility);
  }

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
  const usesWeight =
    typeof workoutUsesWeight === 'function'
      ? workoutUsesWeight(workoutDay) || workoutUsesWeight(workout)
      : workoutDay?.usesWeight === true || workout?.usesWeight === true;
  
  // Obter valores do workoutDay diretamente (não precisa procurar no DOM)
  if (typeof isRepetitionWorkoutType === 'function' ? isRepetitionWorkoutType(workout) : false) {
    const series = workoutDay.series || [0, 0, 0];
    const seriesValues = [series[0] || 0, series[1] || 0, series[2] || 0];
    const weights = workoutDay.weights || [0, 0, 0];
    const weightValues = [weights[0] || 0, weights[1] || 0, weights[2] || 0];

    inputFields = seriesValues
      .map(
        (value, index) => `
          <div class="form-group">
            <label>Série ${index + 1} (repetições):</label>
            <input type="number" name="series-${index}" value="${value}" min="0">
          </div>
          ${
            usesWeight
              ? `
          <div class="form-group">
            <label>Carga ${index + 1} (kg):</label>
            <input type="number" name="weight-${index}" value="${weightValues[index]}" min="0" step="0.5">
          </div>
          `
              : ''
          }
        `
      )
      .join('');
  } else if (typeof isDistanceWorkoutType === 'function' ? isDistanceWorkoutType(workout) : false) {
    const distance = workoutDay.distance ?? 0;
    const time = workoutDay.time ?? 0;
    const timeMin = Math.floor(time / 60);
    const timeSec = time % 60;

    inputFields = `
        <div class="form-group">
          <label>Distância (km):</label>
          <input type="number" name="distance" value="${distance}" min="0" step="0.1">
        </div>
        <div class="form-group">
          <label>Tempo (min):</label>
          <input type="number" name="time-min" value="${timeMin}" min="0">
        </div>
        <div class="form-group">
          <label>Tempo (seg):</label>
          <input type="number" name="time-sec" value="${timeSec}" min="0">
        </div>
    `;
  } else if (typeof isTimedWorkoutType === 'function' ? isTimedWorkoutType(workout) : false) {
    const time = workoutDay.time ?? 0;
    const timeMin = Math.floor(time / 60);
    const timeSec = time % 60;

    inputFields = `
        <div class="form-group">
          <label>Tempo (min):</label>
          <input type="number" name="time-min" value="${timeMin}" min="0">
        </div>
        <div class="form-group">
          <label>Tempo (seg):</label>
          <input type="number" name="time-sec" value="${timeSec}" min="0">
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

function showBookCompletionModal(bookId) {
  const modal = document.getElementById('item-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('item-form');
  if (!modal || !modalTitle || !form) return;

  const book = appData.books.find((b) => b.id === bookId);
  if (!book) return;

  modalTitle.textContent = `Concluir ${book.name}`;
  form.innerHTML = `
        <div class="form-group">
            <label for="book-feedback">Feedback (opcional)</label>
            <textarea id="book-feedback" rows="3" placeholder="O que o livro te ensinou? Qual insight vale guardar?"></textarea>
        </div>
        <input type="hidden" id="book-id" value="${bookId}">
        <input type="hidden" id="modal-item-category" value="complete-book">
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

// Manipular envio do formulário de item

// __appCalendarHistoryBridge: exposes calendar/history APIs for legacy scripts during module migration
Object.assign(globalThis, {
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
  initPeopleSelectors,
  isTabActive,
  switchTab,
  switchSubTab,
  showItemModal,
  showWorkoutCompletionModal,
  showStudyCompletionModal,
  showMissionCompletionModal,
  showWorkCompletionModal,
  showBookCompletionModal,
  closeModal,
  resetAllXpKeepLevels,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isTabActive,
    switchTab,
    switchSubTab,
  };
}

