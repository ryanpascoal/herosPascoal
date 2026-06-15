function initUI() {
  // Configurar a data atual
  const formattedNow = getGameNow().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentDateActivitiesElement = document.getElementById('activities-current-date');
  if (currentDateActivitiesElement) {
    currentDateActivitiesElement.textContent = formattedNow;
  }

  // Inicializar os seletores de atributos
  initAttributesSelectors();
  initClassSelectors();
  if (typeof initPeopleSelectors === 'function') {
    initPeopleSelectors();
  }
  initSelectAllDays('#activity-days-container .days-selector');
  if (typeof updateActivityForm === 'function') {
    updateActivityForm();
  }
  if (typeof setActivityFormSubmitLabel === 'function') {
    setActivityFormSubmitLabel(false);
  }

  // Inicializar opções do mês em Gestão
  populateFinanceMonthOptions();
  const financeMonth =
    document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7);
  const budgetMonthInput = document.getElementById('finance-budget-month');
  if (budgetMonthInput)
    budgetMonthInput.value =
      financeMonth === 'all' ? getLocalDateString().slice(0, 7) : financeMonth;
  const recurringStartInput = document.getElementById('finance-recurring-start');
  if (recurringStartInput && !recurringStartInput.value)
    recurringStartInput.value = getLocalDateString();
  const financeDateInput = document.getElementById('finance-date');
  if (financeDateInput && !financeDateInput.value) financeDateInput.value = getLocalDateString();
  if (typeof ensurePlanningState === 'function') {
    ensurePlanningState(appData);
  }
  if (typeof populateObjectiveOptions === 'function') {
    populateObjectiveOptions();
  }
  initNutritionForms();
  setNotesFormEditingState();

  // Inicializar gráficos
  if (typeof Chart !== 'undefined') {
    initCharts();
  }
}

function bindById(id, eventName, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener(eventName, handler);
}

function bindManyById(eventName, handlersById) {
  Object.entries(handlersById).forEach(([id, handler]) => bindById(id, eventName, handler));
}

function switchInnerSubTab(innerTabName, parentElement) {
  if (!parentElement) return;

  parentElement.querySelectorAll('.inner-sub-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-inner-tab') === innerTabName);
  });

  parentElement.querySelectorAll('.inner-tab').forEach((panel) => {
    panel.classList.remove('active');
    panel.style.display = 'none';
  });

  const targetPanel =
    parentElement.querySelector(`#${innerTabName}`) || document.getElementById(innerTabName);
  if (!targetPanel) return;

  targetPanel.classList.add('active');
  targetPanel.style.removeProperty('display');
}

function initSelectAllDays(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const selectAll = container.querySelector('input[data-select-all="true"]');
  const dayCheckboxes = Array.from(
    container.querySelectorAll('input[type="checkbox"][value]:not([data-select-all])')
  );
  if (!selectAll || dayCheckboxes.length === 0) return;

  const syncSelectAllState = () => {
    const checkedCount = dayCheckboxes.filter((checkbox) => checkbox.checked).length;
    selectAll.checked = checkedCount === dayCheckboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < dayCheckboxes.length;
  };

  selectAll.addEventListener('change', function () {
    dayCheckboxes.forEach((checkbox) => {
      checkbox.checked = this.checked;
    });
    this.indeterminate = false;
  });

  dayCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', syncSelectAllState);
  });

  const form = container.closest('form');
  if (form) {
    form.addEventListener('reset', () => {
      requestAnimationFrame(() => {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      });
    });
  }

  syncSelectAllState();
}

function getSortedNotes(notes = appData.notes) {
  return [...(Array.isArray(notes) ? notes : [])].sort((left, right) => {
    const favoriteDelta = Number(Boolean(right?.favorite)) - Number(Boolean(left?.favorite));
    if (favoriteDelta !== 0) return favoriteDelta;

    const leftCreatedAt = String(left?.createdAt || '').trim();
    const rightCreatedAt = String(right?.createdAt || '').trim();
    const createdAtDelta = leftCreatedAt.localeCompare(rightCreatedAt);
    if (createdAtDelta !== 0) return createdAtDelta;

    return Number(left?.id || 0) - Number(right?.id || 0);
  });
}

function formatNoteTimestamp(timestamp) {
  const parsed = new Date(String(timestamp || '').trim());
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PEOPLE_PAGE_SIZE = 12;
let currentPeoplePage = 1;

function setNotesFormEditingState(note = null) {
  const titleEl = document.getElementById('notes-form-title');
  const editIdEl = document.getElementById('note-edit-id');
  const contentEl = document.getElementById('note-content');
  const submitBtn = document.getElementById('note-submit-btn');
  const cancelBtn = document.getElementById('note-cancel-btn');

  if (!titleEl || !editIdEl || !contentEl || !submitBtn || !cancelBtn) return;

  if (note) {
    titleEl.textContent = 'Editar nota';
    editIdEl.value = String(note.id ?? '');
    contentEl.value = String(note.content || '');
    submitBtn.textContent = 'Atualizar nota';
    cancelBtn.style.display = 'inline-flex';
    contentEl.focus();
    contentEl.setSelectionRange(contentEl.value.length, contentEl.value.length);
    return;
  }

  titleEl.textContent = 'Nova nota';
  editIdEl.value = '';
  contentEl.value = '';
  submitBtn.textContent = 'Salvar nota';
  cancelBtn.style.display = 'none';
}

function getSortedPeople(people = appData.people) {
  return [...(Array.isArray(people) ? people : [])].sort((left, right) => {
    const levelDelta = Number(right?.level || 0) - Number(left?.level || 0);
    if (levelDelta !== 0) return levelDelta;

    const xpDelta = Number(right?.xp || 0) - Number(left?.xp || 0);
    if (xpDelta !== 0) return xpDelta;

    const interactionsDelta = Number(right?.interactions || 0) - Number(left?.interactions || 0);
    if (interactionsDelta !== 0) return interactionsDelta;

    return String(left?.name || '').localeCompare(String(right?.name || ''), 'pt-BR');
  });
}

function formatPersonDate(dateStr) {
  if (!dateStr) return '';
  const parsed = parseLocalDateString(dateStr);
  if (!Number.isFinite(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR');
}

function clampPeoplePage(totalItems) {
  const totalPages = Math.max(1, Math.ceil(Number(totalItems || 0) / PEOPLE_PAGE_SIZE));
  currentPeoplePage = Math.min(Math.max(1, currentPeoplePage), totalPages);
  return totalPages;
}

function changePeoplePage(step) {
  const totalPeople = Array.isArray(appData.people) ? appData.people.length : 0;
  const totalPages = clampPeoplePage(totalPeople);
  currentPeoplePage = Math.min(totalPages, Math.max(1, currentPeoplePage + Number(step || 0)));
  updatePeopleList();
}

function populateActivityPeopleSelector(selectedIds = null) {
  const container = document.getElementById('activity-people');
  if (!container) return;

  if (!Array.isArray(appData.people)) appData.people = [];

  const preservedIds = Array.isArray(selectedIds)
    ? selectedIds.map((id) => String(id))
    : Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((checkbox) =>
        String(checkbox.value)
      );
  const people = [...appData.people].sort((left, right) =>
    String(left?.name || '').localeCompare(String(right?.name || ''), 'pt-BR')
  );

  if (people.length === 0) {
    container.innerHTML =
      '<p class="empty-message selector-empty-message">Nenhuma pessoa cadastrada ainda.</p>';
    return;
  }

  container.innerHTML = '';
  people.forEach((person) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'attribute-checkbox';
    wrapper.innerHTML = `
      <input type="checkbox" value="${person.id}" ${preservedIds.includes(String(person.id)) ? 'checked' : ''} />
      <span>${escapeHtml(person.name || 'Pessoa')}</span>
    `;
    container.appendChild(wrapper);
  });
}

function setPersonFormEditingState(person = null) {
  const titleEl = document.getElementById('person-form-title');
  const editIdEl = document.getElementById('person-edit-id');
  const nameEl = document.getElementById('person-name');
  const relationTypeEl = document.getElementById('person-relation-type');
  const relationStartEl = document.getElementById('person-relation-start');
  const contactEl = document.getElementById('person-contact');
  const submitBtn = document.getElementById('person-submit-btn');
  const cancelBtn = document.getElementById('person-cancel-btn');

  if (
    !titleEl ||
    !editIdEl ||
    !nameEl ||
    !relationTypeEl ||
    !relationStartEl ||
    !contactEl ||
    !submitBtn ||
    !cancelBtn
  ) {
    return;
  }

  if (person) {
    titleEl.textContent = 'Editar Pessoa';
    editIdEl.value = String(person.id ?? '');
    nameEl.value = String(person.name || '');
    relationTypeEl.value = String(person.relationType || '');
    relationStartEl.value = String(person.relationStart || '');
    contactEl.value = String(person.contact || '');
    submitBtn.textContent = 'Atualizar Pessoa';
    cancelBtn.style.display = 'inline-flex';
    nameEl.focus();
    return;
  }

  titleEl.textContent = 'Cadastrar Pessoa';
  editIdEl.value = '';
  nameEl.value = '';
  relationTypeEl.value = '';
  relationStartEl.value = '';
  contactEl.value = '';
  submitBtn.textContent = 'Salvar Pessoa';
  cancelBtn.style.display = 'none';
}

function updatePeopleList() {
  const container = document.getElementById('people-list');
  const paginationEl = document.getElementById('people-pagination');
  const paginationSummaryEl = document.getElementById('people-pagination-summary');
  const prevBtn = document.getElementById('people-page-prev');
  const nextBtn = document.getElementById('people-page-next');
  if (!container) return;

  if (!Array.isArray(appData.people)) appData.people = [];
  const people = getSortedPeople();
  const totalPages = clampPeoplePage(people.length);

  if (people.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma pessoa cadastrada.</p>';
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }

  container.innerHTML = '';
  const startIndex = (currentPeoplePage - 1) * PEOPLE_PAGE_SIZE;
  const paginatedPeople = people.slice(startIndex, startIndex + PEOPLE_PAGE_SIZE);

  paginatedPeople.forEach((person) => {
    const totalXp = Number(person.xp || 0);
    const currentXp = totalXp % 100;
    const percentage = Math.min(100, Math.max(0, (currentXp / 100) * 100));
    const personCard = document.createElement('div');
    personCard.className = 'item-card person-card';
    personCard.innerHTML = `
      <div class="item-info person-info">
        <span class="item-emoji">🤝</span>
        <div>
          <div class="item-name-row">
            <div class="item-name">${escapeHtml(person.name || 'Pessoa')}</div>
            <span class="item-type">${escapeHtml(person.relationType || 'Relação')}</span>
          </div>
          <div class="person-meta">
            <span>${Number(person.interactions || 0)} interações</span>
          </div>
          <div class="display-xp-bar">
            <div class="person-xp-head">
              <div class="display-level">Nível ${Number(person.level || 0)}</div>
              <div class="display-xp-text">${currentXp}/100 XP</div>
            </div>
            <div class="display-xp-progress">
              <div class="display-xp-fill" style="width: ${percentage}%"></div>
            </div>
          </div>
          ${
            person.relationStart || person.contact
              ? `<div class="person-meta">
                  ${person.relationStart ? `<span>Desde ${escapeHtml(formatPersonDate(person.relationStart) || person.relationStart)}</span>` : ''}
                  ${person.contact ? `<span>${escapeHtml(person.contact)}</span>` : ''}
                </div>`
              : ''
          }
        </div>
      </div>
      <div class="item-actions">
        <button class="action-btn edit-btn person-edit-btn" data-id="${person.id}" title="Editar pessoa">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn person-delete-btn" data-id="${person.id}" title="Excluir pessoa">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(personCard);
  });

  if (paginationEl) {
    paginationEl.style.display = totalPages > 1 ? 'grid' : 'none';
  }
  if (paginationSummaryEl) {
    const firstItem = startIndex + 1;
    const lastItem = Math.min(startIndex + PEOPLE_PAGE_SIZE, people.length);
    paginationSummaryEl.textContent =
      `Mostrando ${firstItem}-${lastItem} de ${people.length}` +
      ` • Página ${currentPeoplePage} de ${totalPages}`;
  }
  if (prevBtn) prevBtn.disabled = currentPeoplePage <= 1;
  if (nextBtn) nextBtn.disabled = currentPeoplePage >= totalPages;

  container.querySelectorAll('.person-edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      if (Number.isFinite(id)) editPerson(id);
    });
  });

  container.querySelectorAll('.person-delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'), 10);
      if (Number.isFinite(id)) deletePerson(id);
    });
  });
}

function handlePersonSubmit(event) {
  event.preventDefault();

  if (!Array.isArray(appData.people)) appData.people = [];

  const editId = parseInt(document.getElementById('person-edit-id')?.value || '', 10);
  const name = document.getElementById('person-name')?.value?.trim() || '';
  const relationType = document.getElementById('person-relation-type')?.value?.trim() || '';
  const relationStart = document.getElementById('person-relation-start')?.value || '';
  const contact = document.getElementById('person-contact')?.value?.trim() || '';

  if (!name || !relationType) {
    showFeedback('Informe pelo menos nome e tipo de relação.', 'warn');
    return;
  }

  const existingPerson = Number.isFinite(editId)
    ? appData.people.find((person) => person.id === editId)
    : null;

  if (existingPerson) {
    existingPerson.name = name;
    existingPerson.relationType = relationType;
    existingPerson.relationStart = relationStart;
    existingPerson.contact = contact;
  } else {
    appData.people.push({
      id: createUniqueId(appData.people),
      name,
      relationType,
      relationStart,
      contact,
      xp: 0,
      maxXp: 100,
      level: 0,
      interactions: 0,
      lastInteractionDate: null,
    });
  }

  const savedPerson = existingPerson || appData.people[appData.people.length - 1];
  const sortedPeople = getSortedPeople();
  const savedIndex = sortedPeople.findIndex((person) => Number(person?.id) === Number(savedPerson?.id));
  if (savedIndex >= 0) {
    currentPeoplePage = Math.floor(savedIndex / PEOPLE_PAGE_SIZE) + 1;
  }

  setPersonFormEditingState();
  updateUI({ mode: 'activity' });
  showFeedback(
    existingPerson ? 'Pessoa atualizada com sucesso!' : 'Pessoa cadastrada com sucesso!',
    'success'
  );
}

function editPerson(personId) {
  const person = Array.isArray(appData.people)
    ? appData.people.find((entry) => Number(entry?.id) === Number(personId))
    : null;
  if (!person) return;

  const profileMainPanels = document.querySelector('.profile-main-panels');
  const profileTabs = document.querySelector('.profile-tabs');
  if (profileMainPanels || profileTabs) {
    switchTab('perfil');
    switchInnerSubTab('perfil-geral', profileMainPanels);
  }
  if (profileTabs) {
    switchSubTab('pessoas', profileTabs);
  }

  setPersonFormEditingState(person);
}

function removePersonAssociations(personId) {
  const targetId = String(personId);
  [
    appData.missions,
    appData.works,
    appData.workouts,
    appData.studies,
    appData.books,
    appData.completedMissions,
    appData.completedWorks,
    appData.completedWorkouts,
    appData.completedStudies,
  ].forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (!Array.isArray(item?.peopleIds)) return;
      item.peopleIds = item.peopleIds.filter((id) => String(id) !== targetId);
    });
  });
}

async function deletePerson(personId) {
  if (!Array.isArray(appData.people)) return;
  const personIndex = appData.people.findIndex((entry) => Number(entry?.id) === Number(personId));
  if (personIndex === -1) return;

  const confirmed = await askConfirmation('Tem certeza que deseja excluir esta pessoa?', {
    title: 'Excluir pessoa',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const [removedPerson] = appData.people.splice(personIndex, 1);
  removePersonAssociations(personId);

  const currentEditId = parseInt(document.getElementById('person-edit-id')?.value || '', 10);
  if (
    removedPerson &&
    Number.isFinite(currentEditId) &&
    Number(currentEditId) === Number(removedPerson.id)
  ) {
    setPersonFormEditingState();
  }

  updateUI({ mode: 'activity' });
  showFeedback('Pessoa excluída com sucesso!', 'success');
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  if (!container) return;

  const notes = getSortedNotes();
  if (notes.length === 0) {
    container.innerHTML =
      '<p class="empty-message">Nenhuma nota ainda. Crie a primeira para começar.</p>';
    return;
  }

  container.innerHTML = notes
    .map((note) => {
      const safeContent = escapeHtml(String(note.content || '')).replace(/\n/g, '<br>');
      const createdLabel = formatNoteTimestamp(note.createdAt);
      const updatedLabel =
        note.updatedAt && note.updatedAt !== note.createdAt
          ? formatNoteTimestamp(note.updatedAt)
          : '';
      return `
        <article class="item-card note-card${note.favorite ? ' is-favorite' : ''}" data-id="${note.id}">
          <div class="item-info note-info">
            <div class="note-head">
              <div class="item-name-row">
                <span class="item-emoji">${note.favorite ? '⭐' : '📝'}</span>
                <span class="item-name">Nota</span>
              </div>
              <div class="note-meta">
                <span>Criada em ${createdLabel || 'data inválida'}</span>
                ${updatedLabel ? `<span>Editada em ${updatedLabel}</span>` : ''}
              </div>
            </div>
            <div class="note-content">${safeContent}</div>
          </div>
          <div class="item-actions note-actions">
            <button
              type="button"
              class="action-btn note-favorite-btn${note.favorite ? ' is-active' : ''}"
              data-id="${note.id}"
              title="${note.favorite ? 'Remover dos favoritos' : 'Favoritar nota'}"
              aria-label="${note.favorite ? 'Remover dos favoritos' : 'Favoritar nota'}"
            >
              <i class="fas fa-star"></i>
            </button>
            <button
              type="button"
              class="action-btn edit-btn note-edit-btn"
              data-id="${note.id}"
              title="Editar nota"
              aria-label="Editar nota"
            >
              <i class="fas fa-edit"></i>
            </button>
            <button
              type="button"
              class="action-btn delete-btn note-delete-btn"
              data-id="${note.id}"
              title="Excluir nota"
              aria-label="Excluir nota"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function handleNoteSubmit(event) {
  event.preventDefault();

  if (!Array.isArray(appData.notes)) appData.notes = [];

  const contentEl = document.getElementById('note-content');
  const editIdEl = document.getElementById('note-edit-id');
  if (!contentEl || !editIdEl) return;

  const content = String(contentEl.value || '').trim();
  if (!content) {
    showFeedback('Escreva algo antes de salvar a nota.', 'warn');
    return;
  }

  const now = new Date().toISOString();
  const editingId = Number.parseInt(editIdEl.value || '', 10);
  const note = Number.isFinite(editingId)
    ? appData.notes.find((entry) => Number(entry?.id) === editingId)
    : null;

  if (note) {
    note.content = content;
    note.updatedAt = now;
    setNotesFormEditingState();
    updateUI({ mode: 'notes' });
    showFeedback('Nota atualizada.', 'success');
    return;
  }

  appData.notes.push({
    id: createUniqueId(appData.notes),
    content,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  });

  setNotesFormEditingState();
  updateUI({ mode: 'notes' });
  showFeedback('Nota salva.', 'success');
}

function editNote(noteId) {
  const note = Array.isArray(appData.notes)
    ? appData.notes.find((entry) => Number(entry?.id) === Number(noteId))
    : null;
  if (!note) return;
  setNotesFormEditingState(note);
}

async function deleteNote(noteId) {
  if (!Array.isArray(appData.notes)) return;
  const noteIndex = appData.notes.findIndex((entry) => Number(entry?.id) === Number(noteId));
  if (noteIndex === -1) return;

  const confirmed = await askConfirmation('Deseja excluir esta nota?', {
    title: 'Excluir nota',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const [removedNote] = appData.notes.splice(noteIndex, 1);
  const currentEditId = Number.parseInt(document.getElementById('note-edit-id')?.value || '', 10);
  if (removedNote && Number.isFinite(currentEditId) && currentEditId === Number(removedNote.id)) {
    setNotesFormEditingState();
  }

  updateUI({ mode: 'notes' });
  showFeedback('Nota excluída.', 'info');
}

function toggleNoteFavorite(noteId) {
  if (!Array.isArray(appData.notes)) return;
  const note = appData.notes.find((entry) => Number(entry?.id) === Number(noteId));
  if (!note) return;

  note.favorite = note.favorite !== true;
  note.updatedAt = new Date().toISOString();
  updateUI({ mode: 'notes' });
  showFeedback(
    note.favorite ? 'Nota adicionada aos favoritos.' : 'Nota removida dos favoritos.',
    'info'
  );
}

// Inicializar eventos
function initEvents() {
  // Toggle das seções do perfil
  document.querySelectorAll('.section-collapse-toggle').forEach((btn) => {
    btn.addEventListener('click', function () {
      const section = this.getAttribute('data-section');
      const panel = document.getElementById(section);
      if (!panel) return;
      panel.classList.toggle('collapsed');
      const icon = this.querySelector('.fa-chevron-down');
      if (icon) {
        icon.style.transform = panel.classList.contains('collapsed')
          ? 'rotate(-90deg)'
          : 'rotate(0deg)';
      }
    });
  });

  // Filtro de atividades
  document.getElementById('activity-filter')?.addEventListener('change', function () {
    renderUnifiedTodayActivities();
    if (typeof updateActivityProgressBar === 'function') {
      updateActivityProgressBar();
    }
  });

  document.getElementById('activity-history-filter')?.addEventListener('change', function () {
    if (typeof resetHistoryPage === 'function') {
      resetHistoryPage('completed-activities');
    }
    if (typeof renderUnifiedActivitiesHistory === 'function') {
      renderUnifiedActivitiesHistory();
    }
  });
  document.getElementById('activity-history-date')?.addEventListener('change', function () {
    if (typeof resetHistoryPage === 'function') {
      resetHistoryPage('completed-activities');
    }
    if (typeof renderUnifiedActivitiesHistory === 'function') {
      renderUnifiedActivitiesHistory();
    }
    if (typeof renderTimelineDayControls === 'function') {
      renderTimelineDayControls();
    }
  });
  document.getElementById('activity-history-date-clear')?.addEventListener('click', function () {
    const dateInput = document.getElementById('activity-history-date');
    if (dateInput) dateInput.value = '';
    if (typeof resetHistoryPage === 'function') {
      resetHistoryPage('completed-activities');
    }
    if (typeof renderUnifiedActivitiesHistory === 'function') {
      renderUnifiedActivitiesHistory();
    }
    if (typeof renderTimelineDayControls === 'function') {
      renderTimelineDayControls();
    }
  });
  document.getElementById('nutrition-history-date')?.addEventListener('change', function () {
    if (typeof resetHistoryPage === 'function') {
      resetHistoryPage('nutrition-timeline-list');
    }
    if (typeof renderNutritionHydrationHistory === 'function') {
      renderNutritionHydrationHistory();
    }
  });
  document.getElementById('nutrition-history-date-clear')?.addEventListener('click', function () {
    const dateInput = document.getElementById('nutrition-history-date');
    if (dateInput) dateInput.value = '';
    if (typeof resetHistoryPage === 'function') {
      resetHistoryPage('nutrition-timeline-list');
    }
    if (typeof renderNutritionHydrationHistory === 'function') {
      renderNutritionHydrationHistory();
    }
  });
  document.getElementById('timeline-rest-day-toggle')?.addEventListener('click', function () {
    const targetDateKey =
      typeof getTimelineControlDateKey === 'function'
        ? getTimelineControlDateKey()
        : getLocalDateString();
    if (!targetDateKey || typeof toggleRestDay !== 'function') return;
    toggleRestDay(targetDateKey);
  });
  document.getElementById('timeline-work-off-toggle')?.addEventListener('click', function () {
    const targetDateKey =
      typeof getTimelineControlDateKey === 'function'
        ? getTimelineControlDateKey()
        : getLocalDateString();
    if (!targetDateKey || typeof toggleWorkOffDay !== 'function') return;
    toggleWorkOffDay(targetDateKey);
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', function () {
      const tab = this.getAttribute('data-tab');
      if (!tab) return;
      switchTab(tab);
    });
  });

  // Botão editar nome do perfil
  document.querySelector('.edit-profile-btn')?.addEventListener('click', async function () {
    const newName = await askInput('Digite seu nome:', {
      title: 'Editar Perfil',
      defaultValue: appData.hero?.name || 'Herói',
    });
    if (newName && newName.trim()) {
      appData.hero.name = newName.trim();
      const nameEl = document.querySelector('.hero-name');
      if (nameEl) nameEl.textContent = appData.hero.name;
      saveToLocalStorage();
      showFeedback('Nome atualizado!', 'success');
    }
  });

  document.querySelectorAll('.sub-nav-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const subtab = this.getAttribute('data-subtab');
      // Encontrar o sub-content mais próximo do botão
      const parentElement =
        this.closest('.sub-content') ||
        this.closest('.shop-inventory, .profile-tabs, .stats-tabs') ||
        this.closest('.tab-content');
      if (parentElement) {
        switchSubTab(subtab, parentElement);
      }
    });
  });

  // Abas internas (inner-sub) reutilizadas em painéis como Alimentação, Perfil e Gerenciar
  document.querySelectorAll('.inner-sub-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const innerTab = this.getAttribute('data-inner-tab');
      const parent = this.closest('.inner-sub-nav').parentElement;
      switchInnerSubTab(innerTab, parent);
    });
  });

  // Bindings por id para reduzir repetição no setup de eventos
  bindManyById('click', {
    'hydration-add-btn': addHydrationGlass,
    'hydration-remove-btn': removeHydrationGlass,
    'nutrition-consolidate-day-btn': () => globalThis.consolidateNutritionDay?.(),
    'nutrition-reopen-day-btn': () => globalThis.reopenNutritionDay?.(),
    'note-cancel-btn': () => setNotesFormEditingState(),
    'person-cancel-btn': () => setPersonFormEditingState(),
    'people-page-prev': () => changePeoplePage(-1),
    'people-page-next': () => changePeoplePage(1),
    'save-stats-goals-btn': saveStatisticsGoals,
    'reset-foods-btn': resetNutritionFoods,
    'reset-btn': resetProgress,
    'export-btn': exportData,
    'import-btn': importData,
    'theme-toggle-btn': toggleTheme,
  });
  bindManyById('submit', {
    'activity-form': handleActivitySubmit,
    'shop-item-form': handleShopItemSubmit,
    'class-form': handleClassSubmit,
    'person-form': handlePersonSubmit,
    'objective-form': handleObjectiveSubmit,
    'finance-form': handleFinanceSubmit,
    'finance-budget-form': handleFinanceBudgetSubmit,
    'finance-recurring-form': handleFinanceRecurringSubmit,
    'notes-form': handleNoteSubmit,
    'nutrition-food-form': handleNutritionFoodSubmit,
    'nutrition-entry-form': handleNutritionEntrySubmit,
    'nutrition-goals-form': handleNutritionGoalsSubmit,
  });
  bindManyById('change', {
    'stats-chart-period': updateCharts,
    'workout-evolution-select': () => globalThis.updateWorkoutEvolutionChart?.(),
    'import-foods-file': handleImportFoods,
    'nutrition-diary-date': updateNutritionView,
    'nutrition-entry-date': updateNutritionView,
    'nutrition-report-period': renderNutritionReports,
    'finance-filter-type': updateFinanceView,
  });
  bindManyById('input', {
    'nutrition-entry-qty': updateNutritionEntryPreview,
    'finance-filter-category': updateFinanceView,
  });

  bindById('import-foods-btn', 'click', () => {
    document.getElementById('import-foods-file')?.click();
  });
  document.getElementById('nutrition-entry-food-search')?.addEventListener('input', function () {
    const hidden = document.getElementById('nutrition-entry-food');
    const dropdown = document.getElementById('nutrition-food-suggestions');
    if (!hidden || !dropdown) return;

    const typed = this.value.trim().toLowerCase();
    const items = window._nutritionFoodItems || [];

    // Filter items based on search
    const filtered = typed
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(typed) ||
            (item.brand && item.brand.toLowerCase().includes(typed))
        )
      : items.slice(0, 10); // Show first 10 items when empty

    // Render dropdown
    if (filtered.length > 0) {
      dropdown.innerHTML = filtered
        .map(
          (item) => `
                <div class="custom-autocomplete-item" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-brand="${escapeHtml(item.brand || '')}">
                    <span class="food-name">${escapeHtml(item.name)}</span>
                    ${item.brand ? `<span class="food-brand">(${escapeHtml(item.brand)})</span>` : ''}
                    <div class="food-macros">${item.kcal} kcal | P: ${item.protein}g | C: ${item.carbs}g | G: ${item.fat}g</div>
                </div>
            `
        )
        .join('');
      dropdown.classList.add('active');

      // Add click handlers to items
      dropdown.querySelectorAll('.custom-autocomplete-item').forEach((el) => {
        el.addEventListener('click', function () {
          const foodId = this.getAttribute('data-id');
          const foodName = this.getAttribute('data-name');
          const foodBrand = this.getAttribute('data-brand');

          hidden.value = foodId;
          document.getElementById('nutrition-entry-food-search').value = foodBrand
            ? `${foodName} (${foodBrand})`
            : foodName;
          dropdown.classList.remove('active');
          updateNutritionEntryPreview();
        });
      });
    } else {
      dropdown.innerHTML =
        '<div class="custom-autocomplete-no-results">Nenhum alimento encontrado</div>';
      dropdown.classList.add('active');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    const searchInput = document.getElementById('nutrition-entry-food-search');
    const dropdown = document.getElementById('nutrition-food-suggestions');
    if (
      searchInput &&
      dropdown &&
      !searchInput.contains(e.target) &&
      !dropdown.contains(e.target)
    ) {
      dropdown.classList.remove('active');
    }
  });

  // Also close on focusout with delay
  document.getElementById('nutrition-entry-food-search')?.addEventListener('blur', function () {
    setTimeout(() => {
      const dropdown = document.getElementById('nutrition-food-suggestions');
      if (dropdown) dropdown.classList.remove('active');
    }, 200);
  });
  document.getElementById('finance-month')?.addEventListener('change', function () {
    const budgetMonthInput = document.getElementById('finance-budget-month');
    if (budgetMonthInput) {
      budgetMonthInput.value = this.value === 'all' ? getLocalDateString().slice(0, 7) : this.value;
    }
    updateFinanceView();
  });

  // Modal
  document.querySelector('.close-modal')?.addEventListener('click', closeModal);
  document.getElementById('item-form')?.addEventListener('submit', handleItemFormSubmit);

  // Fechar modal ao clicar fora
  document.getElementById('item-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  document.getElementById('activity-category')?.addEventListener('change', function () {
    if (typeof clearActivityEditState === 'function') {
      clearActivityEditState();
    }
    updateActivityForm();
  });
  document.getElementById('activity-schedule-type')?.addEventListener('change', function () {
    updateActivityForm();
  });
  document.getElementById('activity-workout-type')?.addEventListener('change', function () {
    updateActivityForm();
  });
  document.getElementById('activity-due-lock')?.addEventListener('change', function () {
    updateActivityForm();
  });
  if (typeof initPlanningEvents === 'function') {
    initPlanningEvents();
  }

  // Botões de conclusão de treinos do dia
  document.addEventListener('click', function (e) {
    const unifiedCompleteMissionBtn = e.target.closest('.unified-complete-mission-btn');
    if (unifiedCompleteMissionBtn) {
      const missionId = parseInt(unifiedCompleteMissionBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(missionId)) showMissionCompletionModal(missionId);
      return;
    }

    const unifiedSkipMissionBtn = e.target.closest('.unified-skip-mission-btn');
    if (unifiedSkipMissionBtn) {
      const missionId = parseInt(unifiedSkipMissionBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(missionId)) skipMission(missionId);
      return;
    }

    const unifiedCompleteWorkBtn = e.target.closest('.unified-complete-work-btn');
    if (unifiedCompleteWorkBtn) {
      const workId = parseInt(unifiedCompleteWorkBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workId)) showWorkCompletionModal(workId);
      return;
    }

    const unifiedSkipWorkBtn = e.target.closest('.unified-skip-work-btn');
    if (unifiedSkipWorkBtn) {
      const workId = parseInt(unifiedSkipWorkBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workId)) skipWork(workId);
      return;
    }

    const unifiedCompleteWorkoutBtn = e.target.closest('.unified-complete-workout-btn');
    if (unifiedCompleteWorkoutBtn) {
      const workoutDayId = parseInt(unifiedCompleteWorkoutBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workoutDayId)) showWorkoutCompletionModal(workoutDayId);
      return;
    }

    const unifiedSkipWorkoutBtn = e.target.closest('.unified-skip-workout-btn');
    if (unifiedSkipWorkoutBtn) {
      const workoutDayId = parseInt(unifiedSkipWorkoutBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workoutDayId)) skipDailyWorkout(workoutDayId);
      return;
    }

    const unifiedCompleteStudyBtn = e.target.closest('.unified-complete-study-btn');
    if (unifiedCompleteStudyBtn) {
      const studyDayId = parseInt(unifiedCompleteStudyBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(studyDayId)) showStudyCompletionModal(studyDayId);
      return;
    }

    const unifiedCompleteBookBtn = e.target.closest('.unified-complete-book-btn');
    if (unifiedCompleteBookBtn) {
      const bookId = parseInt(unifiedCompleteBookBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(bookId)) showBookCompletionModal(bookId);
      return;
    }

    const unifiedSkipStudyBtn = e.target.closest('.unified-skip-study-btn');
    if (unifiedSkipStudyBtn) {
      const studyDayId = parseInt(unifiedSkipStudyBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(studyDayId)) skipDailyStudy(studyDayId);
      return;
    }

    const unifiedEditActivityBtn = e.target.closest('.unified-edit-activity-btn');
    if (unifiedEditActivityBtn) {
      const category = unifiedEditActivityBtn.getAttribute('data-category');
      const id = parseInt(unifiedEditActivityBtn.getAttribute('data-id'), 10);
      if (!Number.isFinite(id)) return;
      if (category === 'mission') editMission(id);
      else if (category === 'work') editWork(id);
      else if (category === 'workout') editWorkout(id);
      else if (category === 'study') editStudy(id);
      else if (category === 'book') editBook(id);
      return;
    }

    const unifiedDeleteActivityBtn = e.target.closest('.unified-delete-activity-btn');
    if (unifiedDeleteActivityBtn) {
      const category = unifiedDeleteActivityBtn.getAttribute('data-category');
      const id = parseInt(unifiedDeleteActivityBtn.getAttribute('data-id'), 10);
      if (!Number.isFinite(id)) return;
      if (category === 'mission') deleteMission(id);
      else if (category === 'work') deleteWork(id);
      else if (category === 'workout') deleteWorkout(id);
      else if (category === 'study') deleteStudy(id);
      else if (category === 'book') deleteBook(id);
      return;
    }

    const noteFavoriteBtn = e.target.closest('.note-favorite-btn');
    if (noteFavoriteBtn) {
      const noteId = parseInt(noteFavoriteBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(noteId)) toggleNoteFavorite(noteId);
      return;
    }

    const noteEditBtn = e.target.closest('.note-edit-btn');
    if (noteEditBtn) {
      const noteId = parseInt(noteEditBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(noteId)) editNote(noteId);
      return;
    }

    const noteDeleteBtn = e.target.closest('.note-delete-btn');
    if (noteDeleteBtn) {
      const noteId = parseInt(noteDeleteBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(noteId)) deleteNote(noteId);
      return;
    }

    const applyCheckbox = e.target.closest('.apply-study-checkbox');
    if (applyCheckbox) {
      const studyDayId = parseInt(applyCheckbox.getAttribute('data-id'));
      const studyDay = appData.dailyStudies.find((ds) => ds.id === studyDayId);
      if (studyDay) {
        studyDay.applied = applyCheckbox.checked;
        saveToLocalStorage();
      }
    }
  });
}

// Atualizar a interface (VERSÃO ÚNICA - remover duplicata)
function updateUI(options = {}) {
  const mode = options.mode || 'full';
  const isFull = mode === 'full';
  const isActivity = mode === 'activity';
  const isNotes = mode === 'notes';
  const isShop = mode === 'shop';
  const isFinance = mode === 'finance';

  const shouldUpdateActivity = isFull || isActivity;
  const shouldUpdateNotes = isFull || isNotes;
  const shouldUpdateShop = isFull || isShop;
  const shouldUpdateFinance = isFull || isFinance;
  const shouldUpdateNutrition =
    (isFull || isActivity || options.forceNutrition) &&
    (typeof isTabActive === 'function' ? isTabActive('alimentacao') : false);
  const levelEl = document.getElementById('level');
  if (levelEl) levelEl.textContent = appData.hero.level;

  // Atualizar nome do herói
  const heroNameEl = document.querySelector('.hero-name');
  if (heroNameEl) heroNameEl.textContent = appData.hero?.name || 'Herói';

  const currentXpEl = document.getElementById('current-xp');
  if (currentXpEl) currentXpEl.textContent = appData.hero.xp;
  const maxXpEl = document.getElementById('max-xp');
  if (maxXpEl) maxXpEl.textContent = appData.hero.maxXp;
  const xpFillEl = document.getElementById('xp-fill');
  if (xpFillEl) {
    const rawProgress = appData.hero.maxXp > 0 ? (appData.hero.xp / appData.hero.maxXp) * 100 : 0;
    const xpProgress = Math.min(100, Math.max(0, rawProgress));
    xpFillEl.style.width = `${xpProgress}%`;
  }

  // Atualizar contadores
  const coinEl = document.getElementById('coin-count');
  if (coinEl) coinEl.textContent = appData.hero.coins;
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = appData.hero.streak.general;

  // Atualizar streaks
  updateStreaksDisplay();

  // Atualizar atributos
  updateAttributes();
  updateClassesList();
  updatePeopleList();
  updateWorkClassOptions();
  populateActivityPeopleSelector();

  if (shouldUpdateActivity) {
    // Garante que atividades do dia reflitam cadastros/edições feitos na sessão atual
    if (typeof ensurePlanningState === 'function') {
      ensurePlanningState(appData);
    }
    generateDailyActivities();

    // Atualizar cartões do perfil
    updateWorkoutsDisplay();
    updateStudiesDisplay();
    if (typeof updateUnifiedActivities === 'function') {
      updateUnifiedActivities();
    }
    if (
      typeof getUnifiedTodayActivities === 'function' &&
      typeof renderPlanningViews === 'function'
    ) {
      renderPlanningViews(getUnifiedTodayActivities());
    }

    // Atualizar estatísticas
    updateStatistics();
  }

  if (shouldUpdateNotes) {
    renderNotes();
  }

  if (shouldUpdateShop) {
    // Atualizar loja
    updateShop();

    // Atualizar inventário
    updateInventory();

    // Atualizar lista de itens da loja para gerenciamento
    updateShopItemsList();
  }

  if (shouldUpdateFinance) {
    updateFinanceView();
  }

  if (shouldUpdateNutrition) {
    updateNutritionView();
  }

  // Salvar dados
  saveToLocalStorage();
}

// Atualizar atributos
function updateAttributes() {
  const container = document.getElementById('attributes-container');
  if (!container) return;

  container.innerHTML = '';

  appData.attributes.forEach((attr) => {
    const level = Math.floor(attr.xp / 100);
    const currentXp = attr.xp % 100;
    const percentage = (currentXp / 100) * 100;

    const attributeCard = document.createElement('div');
    attributeCard.className = 'attribute-card';
    attributeCard.innerHTML = `
            <div class="attribute-header">
                <div class="attribute-name">
                    <span>${attr.emoji}</span>
                    <span>${attr.name}</span>
                </div>
                <div class="attribute-meta">
                    <div class="attribute-level">Nível ${level}</div>
                    <div class="attribute-xp">${currentXp}/100 XP</div>
                </div>
            </div>
            <div class="attribute-bar">
                <div class="attribute-fill" style="width: ${percentage}%"></div>
            </div>
        `;

    container.appendChild(attributeCard);
  });
}

function getPrimaryClass() {
  const primaryId = appData.hero?.primaryClassId;
  if (primaryId) {
    const primary = appData.classes?.find((c) => c.id === primaryId);
    if (primary) return primary;
  }
  return appData.classes?.[0] || null;
}

function getClassNameById(classId) {
  const cls = appData.classes?.find((c) => c.id === classId);
  return cls ? cls.name : '';
}

function updateClassesList() {
  const container = document.getElementById('classes-list');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(appData.classes) || appData.classes.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhuma classe cadastrada.</p>';
    return;
  }

  appData.classes.forEach((cls) => {
    const level = Number.isFinite(cls.level) ? cls.level : Math.floor((cls.xp || 0) / 100);
    const currentXp = Number.isFinite(cls.xp) ? cls.xp % 100 : 0;
    const percentage = Math.max(0, Math.min(100, (currentXp / 100) * 100));
    const isPrimary = appData.hero?.primaryClassId === cls.id;
    const safeEmoji = escapeHtml(cls.emoji || '💼');
    const safeName = escapeHtml(cls.name || 'Classe');
    const primaryButtonLabel = isPrimary ? 'Principal' : 'Definir principal';

    const classCard = document.createElement('div');
    classCard.className = 'item-card';
    classCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${safeEmoji}</span>
                <div>
                    <div class="item-name">${safeName}${isPrimary ? ' (Principal)' : ''}</div>
                    <div class="item-level">Nível ${level} - ${currentXp}/100 XP</div>
                    <div class="item-type">Progresso: ${percentage.toFixed(0)}%</div>
                    <div class="attribute-bar">
                        <div class="attribute-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn primary-btn" data-id="${cls.id}" ${isPrimary ? 'disabled' : ''}>${primaryButtonLabel}</button>
                <button class="action-btn edit-btn" data-id="${cls.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${cls.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(classCard);
  });

  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      editClass(id);
    });
  });

  container.querySelectorAll('.primary-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      setPrimaryClass(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteClass(id);
    });
  });
}

function updateWorkClassOptions() {
  ['work-class', 'activity-class'].forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Nenhuma</option>';

    if (Array.isArray(appData.classes)) {
      appData.classes.forEach((cls) => {
        const option = document.createElement('option');
        option.value = String(cls.id);
        option.textContent = `${cls.emoji || '💼'} ${cls.name}`;
        select.appendChild(option);
      });
    }

    if (currentValue) {
      select.value = currentValue;
    }
  });
}

// Obter estatísticas do treino
function formatWorkoutStatsDuration(totalTimeSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalTimeSeconds || 0)));
  if (typeof formatWorkoutDuration === 'function') {
    return formatWorkoutDuration(safeSeconds);
  }

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatWorkoutWeightStat(weightKg) {
  const safeWeight = Math.max(0, Number(weightKg || 0));
  const roundedWeight = Math.round(safeWeight * 100) / 100;
  const label = Number.isInteger(roundedWeight)
    ? String(roundedWeight)
    : String(roundedWeight).replace('.', ',');
  return `${label} kg`;
}

function getWorkoutStats(workout) {
  const workoutGoalDirection =
    typeof getWorkoutGoalDirection === 'function'
      ? getWorkoutGoalDirection(workout)
      : 'maximize';
  const isRepetitionWorkout =
    typeof isRepetitionWorkoutType === 'function'
      ? isRepetitionWorkoutType(workout)
      : true;
  const isDistanceWorkout =
    typeof isDistanceWorkoutType === 'function'
      ? isDistanceWorkoutType(workout)
      : false;
  const isTimedWorkout =
    typeof isTimedWorkoutType === 'function'
      ? isTimedWorkoutType(workout)
      : false;

  if (isRepetitionWorkout) {
    const usesWeight =
      typeof workoutUsesWeight === 'function'
        ? workoutUsesWeight(workout)
        : workout?.usesWeight === true;
    if (usesWeight) {
      const bestWeight =
        typeof getWorkoutBestWeightRecord === 'function'
          ? getWorkoutBestWeightRecord(workout, appData.completedWorkouts || [])
          : Number(workout?.stats?.bestWeight || 0);
      const bestDayLoad =
        typeof getWorkoutBestDayLoadRecord === 'function'
          ? getWorkoutBestDayLoadRecord(workout, appData.completedWorkouts || [])
          : Number(workout?.stats?.bestDayLoad || 0);
      return `Maior carga: ${formatWorkoutWeightStat(bestWeight)} | Melhor volume: ${formatWorkoutWeightStat(bestDayLoad)}`;
    }
    const bestSetReps =
      typeof getWorkoutBestRepsRecord === 'function'
        ? getWorkoutBestRepsRecord(workout, appData.completedWorkouts || [])
        : Number(workout?.stats?.bestSetReps || 0);
    const bestDayReps =
      typeof getWorkoutBestDayRepsRecord === 'function'
        ? getWorkoutBestDayRepsRecord(workout, appData.completedWorkouts || [])
        : Number(workout?.stats?.bestDayReps || 0);
    return `Melhor série: ${bestSetReps} rep | Melhor dia: ${bestDayReps} rep`;
  } else if (isDistanceWorkout) {
    const bestDistance = Number(workout?.stats?.bestDistance || 0);
    const bestSpeed =
      typeof getWorkoutBestSpeedRecord === 'function'
        ? getWorkoutBestSpeedRecord(workout, appData.completedWorkouts || [])
        : Number(workout?.stats?.bestSpeed || 0);
    const bestSpeedLabel =
      typeof formatWorkoutSpeedSummary === 'function'
        ? formatWorkoutSpeedSummary(
            bestDistance,
            bestDistance > 0 && bestSpeed > 0 ? (bestDistance * 3600) / bestSpeed : 0
          )
        : `${bestSpeed.toFixed(1)} km/h`;
    return `Melhor distância: ${bestDistance.toFixed(2)} km | Melhor velocidade: ${bestSpeedLabel}`;
  } else if (isTimedWorkout) {
    const bestTime = Number(workout?.stats?.bestTime || 0);
    const bestTimeLabel = formatWorkoutStatsDuration(bestTime);
    return workoutGoalDirection === 'minimize'
      ? `Melhor tempo: ${bestTimeLabel}`
      : `Maior duração: ${bestTimeLabel}`;
  }
  return '';
}

// Atualizar visualização de estudos (VERSÃO ÚNICA)
function updateStudiesDisplay() {
  const container = document.getElementById('studies-display');
  if (!container) return;

  container.innerHTML = '';

  appData.studies.forEach((study) => {
    const level = Number.isFinite(study.level) ? study.level : Math.floor(study.xp / 100);
    const currentXp = study.xp % 100;
    const percentage = (currentXp / 100) * 100;
    const safeEmoji = escapeHtml(study.emoji || '📚');
    const safeName = escapeHtml(study.name || 'Estudo');

    // Converter números dos dias para nomes
    const dayNames = (study.days || [])
      .map((day) => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return days[day];
      })
      .join(', ');

    const studyCard = document.createElement('div');
    studyCard.className = 'study-display-card';
    studyCard.innerHTML = `
            <div class="display-card-header">
                <div class="display-name">
                    <span class="display-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
                </div>
                <div class="display-type">${study.type === 'logico' ? 'Lógico' : 'Criativo'}</div>
            </div>
            
            <div class="display-xp-bar">
                <div class="display-level">Nível ${level}</div>
                <div class="display-xp-progress">
                    <div class="display-xp-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="display-xp-text">${currentXp}/100 XP</div>
            </div>
            
            <div class="display-details">
                <div class="display-days">
                    <i class="fas fa-calendar"></i>
                    <span>${dayNames}</span>
                </div>
                ${
                  study.stats
                    ? `
                <div class="display-record">
                    <i class="fas fa-trophy"></i>
                    <span>Concluído: ${study.stats.completed || 0} vezes</span>
                </div>
                `
                    : ''
                }
            </div>
        `;

    container.appendChild(studyCard);
  });
}

// Atualizar visualização de treinos (VERSÃO ÚNICA)
function updateWorkoutsDisplay() {
  const container = document.getElementById('workouts-display');
  if (!container) return;

  container.innerHTML = '';

  appData.workouts.forEach((workout) => {
    const level = Number.isFinite(workout.level) ? workout.level : Math.floor(workout.xp / 100);
    const currentXp = workout.xp % 100;
    const percentage = (currentXp / 100) * 100;
    const safeEmoji = escapeHtml(workout.emoji || '💪');
    const safeName = escapeHtml(workout.name || 'Treino');

    // Converter números dos dias para nomes
    const dayNames = (workout.days || [])
      .map((day) => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return days[day];
      })
      .join(', ');

    const workoutCard = document.createElement('div');
    workoutCard.className = 'workout-display-card';
    workoutCard.innerHTML = `
            <div class="display-card-header">
                <div class="display-name">
                    <span class="display-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
                </div>
                <div class="display-type">${getWorkoutTypeName(workout)}</div>
            </div>
            
            <div class="display-xp-bar">
                <div class="display-level">Nível ${level}</div>
                <div class="display-xp-progress">
                    <div class="display-xp-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="display-xp-text">${currentXp}/100 XP</div>
            </div>
            
            <div class="display-details">
                <div class="display-days">
                    <i class="fas fa-calendar"></i>
                    <span>${dayNames}</span>
                </div>
                ${
                  workout.stats
                    ? `
                <div class="display-record">
                    <i class="fas fa-trophy"></i>
                    <span>Recorde: ${getWorkoutStats(workout)}</span>
                </div>
                `
                    : ''
                }
            </div>
        `;

    container.appendChild(workoutCard);
  });
}

// Atualizar loja (VERSÃO ÚNICA)
function updateShop() {
  const container = document.getElementById('shop-items');
  if (!container) return;

  container.innerHTML = '';

  // Filtrar itens que o jogador pode comprar (nível mínimo)
  const availableItems = appData.shopItems.filter((item) => item.level <= appData.hero.level);

  if (availableItems.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum item disponível para seu nível.</p>';
    return;
  }

  availableItems.forEach((item) => {
    const canAfford = appData.hero.coins >= item.cost;
    const safeEmoji = escapeHtml(item.emoji || '🎁');
    const safeName = escapeHtml(item.name || 'Item');
    const safeDescription = escapeHtml(item.description || '');

    const shopItem = document.createElement('div');
    shopItem.className = 'shop-item';
    shopItem.innerHTML = `
            <div class="shop-item-header">
                <div class="shop-item-name">
                    <span class="item-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
                </div>
                <div class="shop-item-level">Nível ${item.level}+</div>
            </div>
            <div class="shop-item-body">
                <p class="shop-item-desc">${safeDescription}</p>
                <div class="shop-item-footer">
                    <div class="shop-item-cost">
                        <i class="fas fa-coins"></i>
                        <span>${item.cost}</span>
                    </div>
                    <button class="buy-btn" data-id="${item.id}" ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'Comprar' : 'Moedas insuficientes'}
                    </button>
                </div>
            </div>
        `;

    container.appendChild(shopItem);
  });

  // Adicionar eventos aos botões de compra
  container.querySelectorAll('.buy-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      buyItem(id);
    });
  });
}

// Atualizar inventário (VERSÃO ÚNICA)
function updateInventory() {
  const container = document.getElementById('inventory-items');
  if (!container) return;

  container.innerHTML = '';

  if (appData.inventory.length === 0) {
    container.innerHTML = '<p class="empty-message">Inventário vazio.</p>';
    return;
  }

  // Agrupar itens por tipo e contar quantidades
  const itemsByType = {};
  appData.inventory.forEach((item) => {
    const shopItem = appData.shopItems.find((shopItem) => shopItem.id === item.id);
    if (!shopItem) return;

    if (!itemsByType[item.id]) {
      itemsByType[item.id] = {
        ...shopItem,
        count: 0,
        instances: [],
      };
    }
    itemsByType[item.id].count++;
    itemsByType[item.id].instances.push(item);
  });

  // Exibir itens agrupados
  Object.values(itemsByType).forEach((item) => {
    const itemActionHtml =
      item.effect === 'skip'
        ? '<div class="inventory-item-meta">Consumido automaticamente ao clicar em Pular.</div>'
        : `<button class="use-btn" data-id="${item.id}">Usar</button>`;
    const safeEmoji = escapeHtml(item.emoji || '🎁');
    const safeName = escapeHtml(item.name || 'Item');
    const safeDescription = escapeHtml(item.description || '');
    const inventoryItem = document.createElement('div');
    inventoryItem.className = 'inventory-item';
    inventoryItem.innerHTML = `
            <div class="inventory-item-header">
                <div class="inventory-item-name">
                    <span class="item-emoji">${safeEmoji}</span>
                    <span>${safeName}</span>
                </div>
                <div class="inventory-item-quantity">x${item.count}</div>
            </div>
            <div class="inventory-item-body">
                <p class="inventory-item-desc">${safeDescription}</p>
                ${itemActionHtml}
            </div>
        `;

    container.appendChild(inventoryItem);
  });

  // Adicionar eventos aos botões de uso
  container.querySelectorAll('.use-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      useItem(id);
    });
  });
}

function handleShopItemSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('item-name').value;
  const emoji = document.getElementById('item-emoji').value;
  const price = parseInt(document.getElementById('item-price').value);
  const level = parseInt(document.getElementById('item-level').value);

  if (!name || !price) {
    showFeedback('Por favor, preencha pelo menos nome e preço.', 'warn');
    return;
  }

  const newItem = {
    id: createUniqueId(appData.shopItems),
    name,
    emoji: emoji || '🎁',
    cost: price,
    level: level || 0,
    description: 'Recompensa no mundo real',
    effect: 'custom',
  };

  appData.shopItems.push(newItem);

  e.target.reset();

  updateUI();

  showFeedback('Item cadastrado com sucesso!', 'success');
}

// Editar item da loja
async function editShopItem(id) {
  const item = appData.shopItems.find((i) => i.id === id);
  if (!item) return;

  const newName = await askInput('Novo nome do item:', {
    title: 'Editar item',
    defaultValue: item.name,
  });
  if (newName === null) return;
  if (newName.trim()) item.name = newName.trim();

  const newEmoji = await askInput('Novo emoji (opcional):', {
    title: 'Editar item',
    defaultValue: item.emoji || '',
  });
  if (newEmoji !== null && newEmoji.trim()) item.emoji = newEmoji.trim();

  const newPrice = await askInput('Novo preço (moedas):', {
    title: 'Editar item',
    defaultValue: String(item.cost ?? ''),
  });
  if (newPrice === null) return;
  const parsedPrice = parseInt(newPrice, 10);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    showFeedback('Preço inválido.', 'warn');
    return;
  }
  item.cost = parsedPrice;

  const newLevel = await askInput('Novo nível mínimo:', {
    title: 'Editar item',
    defaultValue: String(item.level ?? 0),
  });
  if (newLevel === null) return;
  const parsedLevel = parseInt(newLevel, 10);
  if (!Number.isFinite(parsedLevel) || parsedLevel < 0) {
    showFeedback('Nível mínimo inválido.', 'warn');
    return;
  }
  item.level = parsedLevel;

  updateUI({ mode: 'shop' });
  showFeedback('Item atualizado com sucesso!', 'success');
}

// Excluir item da loja
async function deleteShopItem(id) {
  const confirmed = await askConfirmation('Tem certeza que deseja excluir este item da loja?', {
    title: 'Excluir item',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const index = appData.shopItems.findIndex((i) => i.id === id);
  if (index === -1) return;
  appData.shopItems.splice(index, 1);
  updateUI({ mode: 'shop' });
  showFeedback('Item excluído com sucesso!', 'success');
}

// Função para verificar e atualizar streaks
function updateStreaks() {
  const today = getLocalDateString();
  const todayDate = parseLocalDateString(today);
  const DAY_MS = 1000 * 60 * 60 * 24;

  // Inicializar se não existir
  if (!appData.hero.streak) {
    appData.hero.streak = {
      general: 0,
      physical: 0,
      mental: 0,
      nutrition: 0,
      lastGeneralCheck: null,
      lastPhysicalCheck: null,
      lastMentalCheck: null,
      lastNutritionCheck: null,
    };
  }
  appData.hero.streak.general = Number(appData.hero.streak.general || 0);
  appData.hero.streak.physical = Number(appData.hero.streak.physical || 0);
  appData.hero.streak.mental = Number(appData.hero.streak.mental || 0);
  appData.hero.streak.nutrition = Number(appData.hero.streak.nutrition || 0);
  appData.hero.streak.lastGeneralCheck = appData.hero.streak.lastGeneralCheck || null;
  appData.hero.streak.lastPhysicalCheck = appData.hero.streak.lastPhysicalCheck || null;
  appData.hero.streak.lastMentalCheck = appData.hero.streak.lastMentalCheck || null;
  appData.hero.streak.lastNutritionCheck = appData.hero.streak.lastNutritionCheck || null;

  const updateStreakType = (streakKey, lastCheckKey, hasFailureFn, hasActivityFn) => {
    const lastCheckStr = appData.hero.streak[lastCheckKey];
    if (!lastCheckStr) {
      appData.hero.streak[lastCheckKey] = today;
      return;
    }

    const lastCheckDate = parseLocalDateString(lastCheckStr);
    const diffDays = Math.floor((todayDate - lastCheckDate) / DAY_MS);

    if (diffDays > 1) {
      appData.hero.streak[streakKey] = 0;
    } else if (diffDays === 1) {
      const yesterday = new Date(todayDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      if (hasFailureFn(yesterdayStr)) {
        appData.hero.streak[streakKey] = 0;
      } else if (hasActivityFn(yesterdayStr)) {
        appData.hero.streak[streakKey]++;
      }
    }

    appData.hero.streak[lastCheckKey] = today;
  };

  updateStreakType('general', 'lastGeneralCheck', hasGeneralFailure, checkDailyActivity);
  updateStreakType('physical', 'lastPhysicalCheck', hasWorkoutFailure, checkWorkoutActivity);
  updateStreakType('mental', 'lastMentalCheck', hasStudyFailure, checkStudyActivity);
  updateStreakType(
    'nutrition',
    'lastNutritionCheck',
    hasNutritionHydrationFailure,
    checkNutritionHydrationActivity
  );
}

// Modificar checkWorkoutActivity() e checkStudyActivity() para verificar o dia anterior:
function checkWorkoutActivity(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  const hasCompletedHistory = appData.completedWorkouts.some(
    (w) => w.completedDate === targetDateStr && !w.failed
  );
  const hasDailyEntry = appData.dailyWorkouts.some(
    (dw) => dw.date === targetDateStr && dw.completed
  );
  return hasCompletedHistory || hasDailyEntry;
}

// Verificar se houve atividade no dia
function checkDailyActivity(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();

  // Verificar miss??es
  const hasMission = appData.completedMissions.some(
    (m) => m.completedDate === targetDateStr && !m.failed && !m.skipped
  );

  // Verificar trabalhos
  const hasWork = appData.completedWorks.some(
    (w) => w.completedDate === targetDateStr && !w.failed
  );

  // Verificar treinos/estudos
  const hasWorkout = checkWorkoutActivity(targetDateStr);
  const hasStudy = checkStudyActivity(targetDateStr);

  return hasMission || hasWork || hasWorkout || hasStudy;
}

function hasWorkoutFailure(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  return (
    appData.completedWorkouts.some((w) => w.failed && w.failedDate === targetDateStr) ||
    appData.dailyWorkouts.some((dw) => dw.date === targetDateStr && dw.failed)
  );
}

function hasStudyFailure(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  return (
    appData.completedStudies.some((s) => s.failed && s.failedDate === targetDateStr) ||
    appData.dailyStudies.some((ds) => ds.date === targetDateStr && ds.failed)
  );
}

function hasGeneralFailure(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  const missionFailed = appData.completedMissions.some(
    (m) => m.failed && m.failedDate === targetDateStr
  );
  const workFailed = appData.completedWorks.some((w) => w.failed && w.failedDate === targetDateStr);
  const productiveDay = appData.statistics?.productiveDays?.[targetDateStr] || {};
  return (
    missionFailed ||
    workFailed ||
    Number(productiveDay.nutritionFailed || 0) > 0 ||
    Number(productiveDay.hydrationFailed || 0) > 0 ||
    hasWorkoutFailure(targetDateStr) ||
    hasStudyFailure(targetDateStr)
  );
}

function hasNutritionHydrationFailure(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  const productiveDay = appData.statistics?.productiveDays?.[targetDateStr] || {};
  return (
    Number(productiveDay.nutritionFailed || 0) > 0 || Number(productiveDay.hydrationFailed || 0) > 0
  );
}

function checkNutritionHydrationActivity(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  const hasNutritionLog = (appData.nutritionStats?.logDates || []).includes(targetDateStr);
  const hydrationGoalHit = (appData.hydration?.goalHitDates || []).includes(targetDateStr);
  return hasNutritionLog && hydrationGoalHit;
}

// Verificar se houve estudo no dia
function checkStudyActivity(dateStr) {
  const targetDateStr = dateStr || getLocalDateString();
  const hasCompletedHistory = appData.completedStudies.some(
    (s) => s.completedDate === targetDateStr && !s.failed
  );
  const hasDailyEntry = appData.dailyStudies.some(
    (ds) => ds.date === targetDateStr && ds.completed
  );
  return hasCompletedHistory || hasDailyEntry;
}

// Atualizar lista de itens da loja para gerenciamento (VERSÃO ÚNICA)
function updateShopItemsList() {
  const container = document.getElementById('shop-items-list');
  if (!container) return;

  container.innerHTML = '';

  if (appData.shopItems.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum item cadastrado.</p>';
    return;
  }

  appData.shopItems.forEach((item) => {
    const safeEmoji = escapeHtml(item.emoji || '🎁');
    const safeName = escapeHtml(item.name || 'Item');
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${safeEmoji}</span>
                <div>
                    <div class="item-name">${safeName}</div>
                    <div class="item-details">
                        <div class="item-price"><i class="fas fa-coins"></i> ${item.cost}</div>
                        <div class="item-level">Nível mínimo: ${item.level}</div>
                    </div>
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(itemCard);
  });

  // Adicionar eventos aos botões
  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      editShopItem(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteShopItem(id);
    });
  });
}

function failManagedActivity(category, activityId, reason = '', options = {}) {
  const isWorkCategory = category === 'work';
  const activeList = isWorkCategory ? appData.works : appData.missions;
  const activityIndex = activeList.findIndex((item) => item.id === activityId);
  if (activityIndex === -1) return null;

  const activity = activeList[activityIndex];
  if (activity.failed) return null;

  const isRoutine = isRoutineType(activity.type);
  const todayStr = getLocalDateString();
  const penaltyDate = options.missedDate || todayStr;
  const failedAt =
    typeof buildHistoryActionTimestamp === 'function'
      ? buildHistoryActionTimestamp(penaltyDate)
      : new Date().toISOString();

  if (!isRoutine) {
    activity.failed = true;
    activity.failedDate = todayStr;
    activity.failedAt = failedAt;
  }

  const record = recordManagedActivityFailure(category, activity, {
    missedDate: penaltyDate,
    reason,
    recordFields: {
      missedDate: options.missedDate || null,
    },
  });
  if (!record) return null;

  if (!isRoutine) {
    activeList.splice(activityIndex, 1);
  }

  return {
    activity,
    penaltyDate,
  };
}

// Função para falhar uma missão
function failMission(missionId, reason = '', options = {}) {
  const result = failManagedActivity('mission', missionId, reason, options);
  if (!result) return;

  const { activity: mission, penaltyDate } = result;
  updateUI();

  addHeroLog(
    'mission',
    `Tarefa falhada: ${mission.name}`,
    `Falha registrada para ${penaltyDate}. Penalidades aplicadas no pipeline diário.`,
    {
      category: 'mission',
      sourceId: String(mission.originalId || mission.id || ''),
      eventDateKey: penaltyDate,
      status: 'failed',
    }
  );
  showFeedback(`Tarefa "${mission.name}" falhou (${penaltyDate}).`, 'error', 3200);
}

// Atualizar missões
function getSkipShopItem() {
  return (appData.shopItems || []).find((item) => item && item.effect === 'skip') || null;
}

function getSkipItemCount() {
  const skipItem = getSkipShopItem();
  if (!skipItem || !Array.isArray(appData.inventory)) return 0;
  return appData.inventory.filter((item) => String(item.id) === String(skipItem.id)).length;
}

async function tryConsumeSkipItem(activityLabel) {
  const skipItem = getSkipShopItem();
  if (!skipItem) {
    showFeedback('Item de pulo não está disponível na loja.', 'warn');
    return false;
  }
  const skipCount = getSkipItemCount();
  if (skipCount <= 0) {
    showFeedback(`Voce precisa comprar "${skipItem.name}" para pular ${activityLabel}.`, 'warn');
    return false;
  }
  const confirmed = await askConfirmation(
    `Pular ${activityLabel} consumira 1 ${skipItem.name}. Restantes apos uso: ${Math.max(0, skipCount - 1)}. Deseja continuar?`,
    {
      title: 'Confirmar pulo',
      confirmText: 'Pular',
    }
  );
  if (!confirmed) return false;
  const index = appData.inventory.findIndex((item) => String(item.id) === String(skipItem.id));
  if (index === -1) {
    showFeedback(`Voce precisa comprar "${skipItem.name}" para pular ${activityLabel}.`, 'warn');
    return false;
  }
  appData.inventory.splice(index, 1);
  return true;
}

async function skipMission(missionId) {
  const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
  if (missionIndex === -1) return;

  const mission = appData.missions[missionIndex];
  const isRoutine = isRoutineType(mission.type);
  const todayStr = getLocalDateString();
  const skippedAt =
    typeof buildHistoryActionTimestamp === 'function'
      ? buildHistoryActionTimestamp(todayStr)
      : new Date().toISOString();
  const routineAlreadyResolvedToday =
    isRoutine &&
    appData.completedMissions.some(
      (entry) =>
        String(entry.originalId || entry.id) === String(mission.originalId || mission.id) &&
        (entry.completedDate === todayStr ||
          entry.failedDate === todayStr ||
          entry.skippedDate === todayStr)
    );
  if (routineAlreadyResolvedToday) return;
  if (!(await tryConsumeSkipItem(`a missao "${mission.name}"`))) return;

  appData.completedMissions.push({
    ...mission,
    completed: false,
    failed: false,
    skipped: true,
    skippedDate: todayStr,
    skippedAt,
    reason: 'Atividade pulada (1 item de pulo consumido)',
  });
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.missionsIgnored = (appData.statistics.missionsIgnored || 0) + 1;
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: todayStr,
    missionsIgnored: 1,
  });
  if (!isRoutine) {
    appData.missions.splice(missionIndex, 1);
  }

  addHeroLog(
    'mission',
    `Missao pulada: ${mission.name}`,
    '1 item de pulo consumido. Sem penalidade.',
    {
      category: 'mission',
      sourceId: String(mission.originalId || mission.id || ''),
      eventDateKey: todayStr,
      status: 'skipped',
    }
  );

  updateUI({ mode: 'activity' });
  showFeedback(`Missao "${mission.name}" pulada sem penalidade.`, 'info');
}

function failWork(workId, reason = '', options = {}) {
  const result = failManagedActivity('work', workId, reason, options);
  if (!result) return;

  const { activity: work, penaltyDate } = result;
  updateUI({ mode: 'activity' });

  addHeroLog(
    'work',
    `Trabalho falhado: ${work.name}`,
    `Falha registrada para ${penaltyDate}. Penalidades aplicadas no pipeline diário.`,
    {
      category: 'work',
      sourceId: String(work.originalId || work.id || ''),
      eventDateKey: penaltyDate,
      status: 'failed',
    }
  );
}

async function skipWork(workId) {
  const workIndex = appData.works.findIndex((w) => w.id === workId);
  if (workIndex === -1) return;

  const work = appData.works[workIndex];
  const isRoutine = isRoutineType(work.type);
  const todayStr = getLocalDateString();
  const skippedAt =
    typeof buildHistoryActionTimestamp === 'function'
      ? buildHistoryActionTimestamp(todayStr)
      : new Date().toISOString();
  const routineAlreadyResolvedToday =
    isRoutine &&
    appData.completedWorks.some(
      (entry) =>
        String(entry.originalId || entry.id) === String(work.originalId || work.id) &&
        (entry.completedDate === todayStr ||
          entry.failedDate === todayStr ||
          entry.skippedDate === todayStr)
    );
  if (routineAlreadyResolvedToday) return;
  if (!(await tryConsumeSkipItem(`o trabalho "${work.name}"`))) return;

  appData.completedWorks.push({
    ...work,
    completed: false,
    failed: false,
    skipped: true,
    skippedDate: todayStr,
    skippedAt,
    reason: 'Atividade pulada (1 item de pulo consumido)',
  });
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.worksIgnored = (appData.statistics.worksIgnored || 0) + 1;
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: todayStr,
    worksIgnored: 1,
  });
  if (!isRoutine) {
    appData.works.splice(workIndex, 1);
  }

  addHeroLog(
    'work',
    `Trabalho pulado: ${work.name}`,
    '1 item de pulo consumido. Sem penalidade.',
    {
      category: 'work',
      sourceId: String(work.originalId || work.id || ''),
      eventDateKey: todayStr,
      status: 'skipped',
    }
  );

  updateUI({ mode: 'activity' });
  showFeedback(`Trabalho "${work.name}" pulado sem penalidade.`, 'info');
}

async function skipDailyWorkout(workoutDayId) {
  const workoutDay = appData.dailyWorkouts.find((dw) => dw.id === workoutDayId);
  if (!workoutDay || workoutDay.completed || workoutDay.skipped) return;

  const workout = appData.workouts.find((w) => w.id === workoutDay.workoutId);
  if (!workout) return;
  if (!(await tryConsumeSkipItem(`o treino "${workout.name}"`))) return;

  workoutDay.skipped = true;
  workoutDay.skippedDate = getLocalDateString();
  const skippedAt =
    typeof buildHistoryActionTimestamp === 'function'
      ? buildHistoryActionTimestamp(workoutDay.skippedDate)
      : new Date().toISOString();

  const workoutHistoryExists = appData.completedWorkouts.some(
    (w) => w.workoutId === workoutDay.workoutId && w.date === workoutDay.date
  );
  if (!workoutHistoryExists) {
    appData.completedWorkouts.push({
      id: createUniqueId(appData.completedWorkouts),
      workoutId: workoutDay.workoutId,
      name: workout.name,
      emoji: workout.emoji,
      metric: typeof getWorkoutMetric === 'function' ? getWorkoutMetric(workout) : 'reps',
      goalDirection:
        typeof getWorkoutGoalDirection === 'function'
          ? getWorkoutGoalDirection(workout)
          : 'maximize',
      usesWeight:
        typeof workoutUsesWeight === 'function'
          ? workoutUsesWeight(workout)
          : workout.usesWeight === true,
      date: workoutDay.date,
      skipped: true,
      skippedDate: workoutDay.skippedDate,
      skippedAt,
      failed: false,
      reason: 'Atividade pulada (1 item de pulo consumido)',
    });
  }
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.workoutsIgnored = (appData.statistics.workoutsIgnored || 0) + 1;
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: workoutDay.date || workoutDay.skippedDate,
    workoutsIgnored: 1,
  });

  addHeroLog(
    'workout',
    `Treino pulado: ${workout.name}`,
    '1 item de pulo consumido. Sem penalidade.',
    {
      category: 'workout',
      sourceId: String(workoutDay.workoutId || workout.id || ''),
      eventDateKey: String(workoutDay.skippedDate || workoutDay.date || ''),
      status: 'skipped',
    }
  );

  updateUI({ mode: 'activity' });
  showFeedback(`Treino "${workout.name}" pulado sem penalidade.`, 'info');
}

async function skipDailyStudy(studyDayId) {
  const studyDay = appData.dailyStudies.find((ds) => ds.id === studyDayId);
  if (!studyDay || studyDay.completed || studyDay.skipped) return;

  const study = appData.studies.find((s) => s.id === studyDay.studyId);
  if (!study) return;
  if (!(await tryConsumeSkipItem(`o estudo "${study.name}"`))) return;

  studyDay.skipped = true;
  studyDay.skippedDate = getLocalDateString();
  const skippedAt =
    typeof buildHistoryActionTimestamp === 'function'
      ? buildHistoryActionTimestamp(studyDay.skippedDate)
      : new Date().toISOString();

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
      skipped: true,
      skippedDate: studyDay.skippedDate,
      skippedAt,
      failed: false,
      applied: !!studyDay.applied,
      reason: 'Atividade pulada (1 item de pulo consumido)',
    });
  }
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.studiesIgnored = (appData.statistics.studiesIgnored || 0) + 1;
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: studyDay.date || studyDay.skippedDate,
    studiesIgnored: 1,
  });

  addHeroLog('study', `Estudo pulado: ${study.name}`, '1 item de pulo consumido. Sem penalidade.', {
    category: 'study',
    sourceId: String(studyDay.studyId || study.id || ''),
    eventDateKey: String(studyDay.skippedDate || studyDay.date || ''),
    status: 'skipped',
  });

  if (typeof document !== 'undefined') {
    updateUI({ mode: 'activity' });
  }
  showFeedback(`Estudo "${study.name}" pulado sem penalidade.`, 'info');
  saveToLocalStorage();
}

// __appUiBridge: exposes ui APIs for legacy scripts during module migration
Object.assign(globalThis, {
  initUI,
  bindById,
  bindManyById,
  getSortedNotes,
  getSortedPeople,
  renderNotes,
  populateActivityPeopleSelector,
  updatePeopleList,
  handleNoteSubmit,
  handlePersonSubmit,
  editNote,
  editPerson,
  deleteNote,
  deletePerson,
  toggleNoteFavorite,
  initEvents,
  updateUI,
  updateAttributes,
  getPrimaryClass,
  getClassNameById,
  updateClassesList,
  updateWorkClassOptions,
  getWorkoutStats,
  updateStudiesDisplay,
  updateWorkoutsDisplay,
  updateShop,
  updateInventory,
  handleShopItemSubmit,
  editShopItem,
  deleteShopItem,
  updateStreaks,
  checkWorkoutActivity,
  checkDailyActivity,
  hasWorkoutFailure,
  hasStudyFailure,
  hasGeneralFailure,
  checkStudyActivity,
  updateShopItemsList,
  failMission,
  getSkipShopItem,
  getSkipItemCount,
  tryConsumeSkipItem,
  skipMission,
  failWork,
  skipWork,
  skipDailyWorkout,
  skipDailyStudy,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getSortedNotes,
    getSortedPeople,
    getWorkoutStats,
    hasGeneralFailure,
    hasNutritionHydrationFailure,
    checkNutritionHydrationActivity,
    updateStreaks,
  };
}
