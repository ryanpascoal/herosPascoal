function initUI() {
  // Configurar a data atual
  const currentDateElement = document.getElementById('current-date');
  if (currentDateElement) {
    const now = getGameNow();
    currentDateElement.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  const currentDateWorkElement = document.getElementById('current-date-work');
  if (currentDateWorkElement) {
    currentDateWorkElement.textContent =
      currentDateElement?.textContent || getGameNow().toLocaleDateString('pt-BR');
  }

  // Inicializar os seletores de atributos
  initAttributesSelectors();
  initClassSelectors();
  initSelectAllDays('#mission-days-container .days-selector');
  initSelectAllDays('#work-days-container .days-selector');

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
  initNutritionForms();

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

// Inicializar eventos
function initEvents() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', function () {
      const tab = this.getAttribute('data-tab');
      if (!tab) return;
      switchTab(tab);
      document.getElementById('mobile-more-menu')?.classList.remove('active');
    });
  });

  // Botão editar foto do perfil
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

  document.getElementById('nav-more-toggle')?.addEventListener('click', function (e) {
    e.preventDefault();
    const menu = document.getElementById('mobile-more-menu');
    if (menu) menu.classList.toggle('active');
  });

  document.querySelectorAll('.mobile-more-item').forEach((btn) => {
    btn.addEventListener('click', function () {
      const tab = this.getAttribute('data-tab');
      if (tab) switchTab(tab);
      document.getElementById('mobile-more-menu')?.classList.remove('active');
    });
  });

  document.querySelectorAll('.sub-nav-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const subtab = this.getAttribute('data-subtab');
      const parent = this.closest('.sub-nav').parentElement;
      switchSubTab(subtab, parent);
    });
  });

  // Abas internas (inner-sub) para Alimentação
  document.querySelectorAll('.inner-sub-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const innerTab = this.getAttribute('data-inner-tab');
      const parent = this.closest('.inner-sub-nav').parentElement;

      // Atualizar botões ativos
      parent.querySelectorAll('.inner-sub-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      // Atualizar painéis visíveis
      parent.querySelectorAll('.inner-tab').forEach((panel) => panel.classList.remove('active'));
      parent.querySelector(`#${innerTab}`)?.classList.add('active');
    });
  });

  // Bindings por id para reduzir repetição no setup de eventos
  bindManyById('click', {
    'hydration-add-btn': addHydrationGlass,
    'hydration-remove-btn': removeHydrationGlass,
    'add-book-btn': () => showBookModal(),
    'save-stats-goals-btn': saveStatisticsGoals,
    'reset-foods-btn': resetNutritionFoods,
    'reset-btn': resetProgress,
    'export-btn': exportData,
    'import-btn': importData,
  });
  bindById('input', 'books-search', () => {
    if (globalThis.historyPaginationState) {
      globalThis.historyPaginationState['books-list'] = 1;
      globalThis.historyPaginationState['books-history-list'] = 1;
    }
    updateBooks();
  });
  bindManyById('submit', {
    'mission-form': handleMissionSubmit,
    'shop-item-form': handleShopItemSubmit,
    'work-form': handleWorkSubmit,
    'workout-form': handleWorkoutSubmit,
    'study-form': handleStudySubmit,
    'class-form': handleClassSubmit,
    'finance-form': handleFinanceSubmit,
    'finance-budget-form': handleFinanceBudgetSubmit,
    'finance-recurring-form': handleFinanceRecurringSubmit,
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

  // Calendário
  document.getElementById('cal-prev-month')?.addEventListener('click', () => {
    calendarState.month -= 1;
    if (calendarState.month < 0) {
      calendarState.month = 11;
      calendarState.year -= 1;
    }
    renderMissionsCalendar();
  });
  document.getElementById('cal-next-month')?.addEventListener('click', () => {
    calendarState.month += 1;
    if (calendarState.month > 11) {
      calendarState.month = 0;
      calendarState.year += 1;
    }
    renderMissionsCalendar();
  });
  document.getElementById('cal-go-today')?.addEventListener('click', () => {
    const today = getGameNow();
    calendarState.month = today.getMonth();
    calendarState.year = today.getFullYear();
    calendarState.selectedDate = getLocalDateString(today);
    renderMissionsCalendar();
  });
  document.getElementById('cal-rest-toggle')?.addEventListener('click', () => {
    if (!calendarState.selectedDate) return;
    toggleRestDay(calendarState.selectedDate);
  });
  document.getElementById('cal-work-off-toggle')?.addEventListener('click', () => {
    if (!calendarState.selectedDate) return;
    toggleWorkOffDay(calendarState.selectedDate);
  });
  document.getElementById('cal-details-filter')?.addEventListener('change', function () {
    calendarState.detailsFilter = this.value || 'all';
    if (calendarState.selectedDate) {
      renderCalendarDetails(calendarState.selectedDate);
    } else {
      resetCalendarDetails();
    }
  });

  // Modal
  document.querySelector('.close-modal')?.addEventListener('click', closeModal);
  document.getElementById('item-form')?.addEventListener('submit', handleItemFormSubmit);

  // Fechar modal ao clicar fora
  document.getElementById('item-modal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // Mudança no tipo de missão
  document.getElementById('mission-type')?.addEventListener('change', function () {
    updateMissionForm(this.value);
  });
  document.getElementById('work-type')?.addEventListener('change', function () {
    updateWorkForm(this.value);
  });

  // Botões de conclusão de treinos do dia
  document.addEventListener('click', function (e) {
    const calendarCompleteMissionBtn = e.target.closest('.calendar-complete-mission-btn');
    if (calendarCompleteMissionBtn) {
      const missionId = parseInt(calendarCompleteMissionBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(missionId)) completeMission(missionId);
      return;
    }

    const calendarSkipMissionBtn = e.target.closest('.calendar-skip-mission-btn');
    if (calendarSkipMissionBtn) {
      const missionId = parseInt(calendarSkipMissionBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(missionId)) skipMission(missionId);
      return;
    }

    const calendarCompleteWorkBtn = e.target.closest('.calendar-complete-work-btn');
    if (calendarCompleteWorkBtn) {
      const workId = parseInt(calendarCompleteWorkBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workId)) completeWork(workId);
      return;
    }

    const calendarSkipWorkBtn = e.target.closest('.calendar-skip-work-btn');
    if (calendarSkipWorkBtn) {
      const workId = parseInt(calendarSkipWorkBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workId)) skipWork(workId);
      return;
    }

    const calendarCompleteWorkoutBtn = e.target.closest('.calendar-complete-workout-btn');
    if (calendarCompleteWorkoutBtn) {
      const workoutDayId = parseInt(calendarCompleteWorkoutBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workoutDayId)) showWorkoutCompletionModal(workoutDayId);
      return;
    }

    const calendarSkipWorkoutBtn = e.target.closest('.calendar-skip-workout-btn');
    if (calendarSkipWorkoutBtn) {
      const workoutDayId = parseInt(calendarSkipWorkoutBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(workoutDayId)) skipDailyWorkout(workoutDayId);
      return;
    }

    const calendarCompleteStudyBtn = e.target.closest('.calendar-complete-study-btn');
    if (calendarCompleteStudyBtn) {
      const studyDayId = parseInt(calendarCompleteStudyBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(studyDayId)) showStudyCompletionModal(studyDayId);
      return;
    }

    const calendarSkipStudyBtn = e.target.closest('.calendar-skip-study-btn');
    if (calendarSkipStudyBtn) {
      const studyDayId = parseInt(calendarSkipStudyBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(studyDayId)) skipDailyStudy(studyDayId);
      return;
    }

    const skipWorkoutBtn = e.target.closest('.skip-workout-btn');
    if (skipWorkoutBtn) {
      const workoutDayId = parseInt(skipWorkoutBtn.getAttribute('data-id'));
      skipDailyWorkout(workoutDayId);
      return;
    }

    const workoutBtn = e.target.closest('.complete-workout-btn');
    if (workoutBtn) {
      const workoutDayId = parseInt(workoutBtn.getAttribute('data-id'));
      showWorkoutCompletionModal(workoutDayId);
      return;
    }

    const skipStudyBtn = e.target.closest('.skip-study-btn');
    if (skipStudyBtn) {
      const studyDayId = parseInt(skipStudyBtn.getAttribute('data-id'));
      skipDailyStudy(studyDayId);
      return;
    }

    const studyBtn = e.target.closest('.complete-study-btn');
    if (studyBtn) {
      const studyDayId = parseInt(studyBtn.getAttribute('data-id'));
      showStudyCompletionModal(studyDayId);
      return;
    }

    const bookBtn = e.target.closest('.complete-book-btn');
    if (bookBtn) {
      const bookId = parseInt(bookBtn.getAttribute('data-id'));
      completeBook(bookId);
      return;
    }

    const deleteBookBtn = e.target.closest('.delete-book-btn');
    if (deleteBookBtn) {
      const bookId = parseInt(deleteBookBtn.getAttribute('data-id'));
      deleteBook(bookId);
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

  document.addEventListener('change', function (e) {
    const statusSelect = e.target.closest('.book-status-select');
    if (statusSelect) {
      const bookId = parseInt(statusSelect.getAttribute('data-id'), 10);
      setBookStatus(bookId, statusSelect.value);
    }
  });
}

// Atualizar a interface (VERSÃO ÚNICA - remover duplicata)
function updateUI(options = {}) {
  const mode = options.mode || 'full';
  const isFull = mode === 'full';
  const isActivity = mode === 'activity';
  const isShop = mode === 'shop';
  const isFinance = mode === 'finance';

  const shouldUpdateActivity = isFull || isActivity;
  const shouldUpdateShop = isFull || isShop;
  const shouldUpdateFinance = isFull || isFinance;
  const shouldUpdateNutrition =
    (isFull || isActivity || options.forceNutrition) && isTabActive('alimentacao');
  const shouldUpdateCalendar =
    (isFull || isActivity || options.forceCalendar) && isTabActive('calendarios');

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
    const xpProgress = appData.hero.maxXp > 0 ? (appData.hero.xp / appData.hero.maxXp) * 100 : 0;
    xpFillEl.style.width = `${xpProgress}%`;
  }

  // Atualizar contadores
  const coinEl = document.getElementById('coin-count');
  if (coinEl) coinEl.textContent = appData.hero.coins;
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = appData.hero.streak.general;
  const lifeEl = document.getElementById('life-count');
  if (lifeEl) lifeEl.textContent = `${appData.hero.lives}/${appData.hero.maxLives}`;

  // Atualizar status do escudo
  const shieldStatus = document.getElementById('shield-status');
  if (shieldStatus) {
    const hasShield = appData.hero.protection?.shield === true;
    shieldStatus.classList.toggle('active', hasShield);
    shieldStatus.classList.toggle('inactive', !hasShield);
    const shieldText = shieldStatus.querySelector('.shield-text');
    if (shieldText) {
      shieldText.textContent = hasShield ? 'Escudo ativo' : 'Sem escudo';
    }
  }

  // Atualizar vidas integradas
  updateIntegratedHearts();

  // Atualizar streaks
  updateStreaksDisplay();

  // Atualizar atributos
  updateAttributes();
  updateClassesList();
  updateWorkClassOptions();

  if (shouldUpdateActivity) {
    // Garante que atividades do dia reflitam cadastros/edições feitos na sessão atual
    normalizeActivityDays();
    generateDailyActivities();

    // Atualizar treinos (visualização)
    updateWorkoutsDisplay();
    updateWorkouts();

    // Atualizar estudos (visualização)
    updateStudiesDisplay();
    updateStudies();

    // Atualizar missões
    updateMissions();
    updateWorks();

    // Atualizar estatísticas
    updateStatistics();

    // Atualizar logs do herói
    generateHeroLogs();

    // Atualizar treinos do dia
    updateDailyWorkouts();

    // Atualizar estudos do dia
    updateDailyStudies();

    // Atualizar históricos de treinos e estudos
    updateWorkoutHistory();
    updateStudyHistory();

    // Atualizar livros
    updateBooks();
  }

  if (shouldUpdateShop) {
    // Atualizar loja
    updateShop();

    // Atualizar inventário
    updateInventory();

    // Atualizar lista de itens da loja para gerenciamento
    updateShopItemsList();
  }

  if (shouldUpdateCalendar) {
    // Atualizar calendário de missões
    renderMissionsCalendar();
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

// Atualizar vidas integradas
function updateIntegratedHearts() {
  const container = document.getElementById('hearts-container');
  const countText = document.getElementById('lives-count-text');

  if (!container) return;

  // Validação segura para vidas
  const maxHearts =
    Number.isFinite(appData.hero.maxLives) && appData.hero.maxLives > 0
      ? appData.hero.maxLives
      : 10;
  const currentHearts = Number.isFinite(appData.hero.lives)
    ? Math.max(0, Math.min(appData.hero.lives, maxHearts))
    : maxHearts;

  container.innerHTML = '';

  for (let i = 0; i < maxHearts; i++) {
    const heart = document.createElement('div');
    heart.className = `heart-integrated ${i < currentHearts ? 'full' : 'empty'}`;
    heart.innerHTML = '<i class="fas fa-heart"></i>';
    container.appendChild(heart);
  }

  if (countText) {
    countText.textContent = `${currentHearts}/${maxHearts}`;
  }
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
    const level = Math.floor(cls.xp / 100);
    const currentXp = cls.xp % 100;
    const percentage = (currentXp / 100) * 100;
    const isPrimary = appData.hero?.primaryClassId === cls.id;

    const classCard = document.createElement('div');
    classCard.className = 'item-card';
    classCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${cls.emoji || '💼'}</span>
                <div>
                    <div class="item-name">${cls.name}${isPrimary ? ' (Principal)' : ''}</div>
                    <div class="item-level">Nível ${level} - ${currentXp}/100 XP</div>
                    <div class="item-type">Progresso: ${percentage.toFixed(0)}%</div>
                    <div class="attribute-bar">
                        <div class="attribute-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
            <div class="item-actions">
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

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteClass(id);
    });
  });
}

function updateWorkClassOptions() {
  const select = document.getElementById('work-class');
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
}

// Atualizar treinos
function updateWorkouts() {
  const container = document.getElementById('workouts-list');
  if (!container) return;

  container.innerHTML = '';

  appData.workouts.forEach((workout) => {
    const level = Number.isFinite(workout.level) ? workout.level : Math.floor(workout.xp / 100);
    const percentage = workout.xp % 100;

    const workoutCard = document.createElement('div');
    workoutCard.className = 'item-card';
    workoutCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${workout.emoji}</span>
                <div>
                    <div class="item-name">${workout.name}</div>
                    <div class="item-level">Nível ${level} - ${percentage}%</div>
                    <div class="item-type">Tipo: ${getWorkoutTypeName(workout.type)}</div>
                    ${workout.stats ? `<div class="item-stats">Recorde: ${getWorkoutStats(workout)}</div>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${workout.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${workout.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(workoutCard);
  });

  // Adicionar eventos aos botões
  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      editWorkout(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteWorkout(id);
    });
  });
}

// Obter estatísticas do treino
function getWorkoutStats(workout) {
  if (workout.type === 'repeticao') {
    return `${workout.stats.bestReps || 0} repetições`;
  } else if (workout.type === 'distancia') {
    return `${workout.stats.bestDistance || 0} km`;
  } else if (workout.type === 'maior-tempo') {
    return `${workout.stats.bestTime || 0} min`;
  } else if (workout.type === 'menor-tempo') {
    return `${workout.stats.bestTime || 0} min`;
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
                    <span class="display-emoji">${study.emoji}</span>
                    <span>${study.name}</span>
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

// Atualizar estudos
function updateStudies() {
  const container = document.getElementById('studies-list');
  if (!container) return;

  container.innerHTML = '';

  appData.studies.forEach((study) => {
    const level = Number.isFinite(study.level) ? study.level : Math.floor(study.xp / 100);
    const percentage = study.xp % 100;

    const studyCard = document.createElement('div');
    studyCard.className = 'item-card';
    studyCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${study.emoji}</span>
                <div>
                    <div class="item-name">${study.name}</div>
                    <div class="item-level">Nível ${level} - ${percentage}%</div>
                    <div class="item-type">Tipo: ${study.type === 'logico' ? 'Lógico' : 'Criativo'}</div>
                    ${study.stats ? `<div class="item-stats">Concluído: ${study.stats.completed || 0} vezes</div>` : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn edit-btn" data-id="${study.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn" data-id="${study.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

    container.appendChild(studyCard);
  });

  // Adicionar eventos aos botões
  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      editStudy(id);
    });
  });

  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const id = parseInt(this.getAttribute('data-id'));
      deleteStudy(id);
    });
  });
}

function normalizeBook(book) {
  if (!book || typeof book !== 'object') return null;
  const isCompleted = book.completed === true || book.status === 'concluido';
  book.completed = isCompleted;
  book.status = isCompleted ? 'concluido' : book.status || 'quero-ler';
  return book;
}

function getBookStatusMeta(status) {
  switch (status) {
    case 'lendo':
      return { label: 'Lendo', className: 'reading' };
    case 'concluido':
      return { label: 'Concluído', className: 'completed' };
    case 'quero-ler':
    default:
      return { label: 'Quero ler', className: 'wishlist' };
  }
}

async function deleteBook(bookId) {
  const confirmed = await askConfirmation('Tem certeza que deseja excluir este livro?', {
    title: 'Excluir livro',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const index = appData.books.findIndex((book) => Number(book.id) === Number(bookId));
  if (index === -1) return;

  appData.books.splice(index, 1);
  updateUI({ mode: 'activity' });
  showFeedback('Livro excluído com sucesso!', 'success');
}

function setBookStatus(bookId, status) {
  const book = appData.books.find((item) => Number(item.id) === Number(bookId));
  if (!book) return;
  normalizeBook(book);
  if (book.status === 'concluido') return;
  if (!['quero-ler', 'lendo'].includes(status)) return;

  book.status = status;
  updateUI({ mode: 'activity' });
  showFeedback(`Status do livro atualizado para "${getBookStatusMeta(status).label}".`, 'success');
}

function createBookCard(book, options = {}) {
  const { isHistory = false } = options;
  const safeEmoji = escapeHtml(book.emoji || '📖');
  const safeName = escapeHtml(book.name || 'Livro');
  const safeAuthor = escapeHtml(book.author || '');
  const statusMeta = getBookStatusMeta(book.status);
  const bookCard = document.createElement('div');
  bookCard.className = `item-card book-card ${book.completed ? 'completed' : ''}`;
  bookCard.innerHTML = `
          <div class="item-info">
              <span class="item-emoji">${safeEmoji}</span>
              <div>
                  <div class="item-name">${safeName}</div>
                  ${safeAuthor ? `<div class="item-author">${safeAuthor}</div>` : ''}
                  <div class="book-status-row">
                    <span class="book-status-badge ${statusMeta.className}">${statusMeta.label}</span>
                    ${book.completed ? `<span class="item-completed">Concluído em: ${formatDate(book.dateCompleted)}</span>` : ''}
                  </div>
              </div>
          </div>
          <div class="item-actions book-actions">
              ${
                !isHistory
                  ? `
              <select class="book-status-select" data-id="${book.id}" aria-label="Status do livro">
                <option value="quero-ler" ${book.status === 'quero-ler' ? 'selected' : ''}>Quero ler</option>
                <option value="lendo" ${book.status === 'lendo' ? 'selected' : ''}>Lendo</option>
              </select>
              <button class="action-btn complete-book-btn" data-id="${book.id}">Concluir</button>
              `
                  : ''
              }
              <button class="action-btn delete-btn delete-book-btn" data-id="${book.id}"><i class="fas fa-trash"></i></button>
          </div>
      `;
  return bookCard;
}

// Atualizar livros
function updateBooks() {
  const activeContainer = document.getElementById('books-list');
  const historyContainer = document.getElementById('books-history-list');
  if (!activeContainer || !historyContainer) return;

  const query = (document.getElementById('books-search')?.value || '').trim().toLowerCase();
  const searchableStatus = {
    'quero-ler': 'quero ler',
    lendo: 'lendo',
    concluido: 'concluido',
  };

  const normalizedBooks = (appData.books || [])
    .map((book) => normalizeBook(book))
    .filter((book) => {
      if (!query) return true;
      const haystack = [book.name || '', book.author || '', searchableStatus[book.status] || '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

  const activeBooks = normalizedBooks
    .filter((book) => book.status !== 'concluido')
    .sort((a, b) => {
      const rank = { lendo: 0, 'quero-ler': 1 };
      const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });

  const completedBooks = normalizedBooks
    .filter((book) => book.status === 'concluido')
    .sort((a, b) => String(b.dateCompleted || '').localeCompare(String(a.dateCompleted || '')));

  renderPaginatedHistory(
    activeContainer,
    activeBooks,
    (book) => createBookCard(book),
    query ? 'Nenhum livro encontrado na biblioteca.' : 'Nenhum livro pendente na biblioteca.',
    updateBooks
  );

  renderPaginatedHistory(
    historyContainer,
    completedBooks,
    (book) => createBookCard(book, { isHistory: true }),
    query ? 'Nenhum livro concluído encontrado.' : 'Nenhum livro concluído ainda.',
    updateBooks
  );
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
                    <span class="display-emoji">${workout.emoji}</span>
                    <span>${workout.name}</span>
                </div>
                <div class="display-type">${getWorkoutTypeName(workout.type)}</div>
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

    const shopItem = document.createElement('div');
    shopItem.className = 'shop-item';
    shopItem.innerHTML = `
            <div class="shop-item-header">
                <div class="shop-item-name">
                    <span class="item-emoji">${item.emoji}</span>
                    <span>${item.name}</span>
                </div>
                <div class="shop-item-level">Nível ${item.level}+</div>
            </div>
            <div class="shop-item-body">
                <p class="shop-item-desc">${item.description}</p>
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
    const inventoryItem = document.createElement('div');
    inventoryItem.className = 'inventory-item';
    inventoryItem.innerHTML = `
            <div class="inventory-item-header">
                <div class="inventory-item-name">
                    <span class="item-emoji">${item.emoji}</span>
                    <span>${item.name}</span>
                </div>
                <div class="inventory-item-quantity">x${item.count}</div>
            </div>
            <div class="inventory-item-body">
                <p class="inventory-item-desc">${item.description}</p>
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
      lastGeneralCheck: null,
      lastPhysicalCheck: null,
      lastMentalCheck: null,
    };
  }

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
  const hasMission = appData.completedMissions.some((m) => m.completedDate === targetDateStr);

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
  return (
    missionFailed ||
    workFailed ||
    hasWorkoutFailure(targetDateStr) ||
    hasStudyFailure(targetDateStr)
  );
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
    const itemCard = document.createElement('div');
    itemCard.className = 'item-card';
    itemCard.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">${item.emoji}</span>
                <div>
                    <div class="item-name">${item.name}</div>
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

// Função para falhar uma missão
function failMission(missionId, reason = '', options = {}) {
  const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
  if (missionIndex === -1) return;

  const mission = appData.missions[missionIndex];

  // Verificar se já está falida para evitar penalidades duplicadas
  if (mission.failed) return;

  const isRoutine = isRoutineType(mission.type);
  const todayStr = getLocalDateString();

  // Marcar como falhada (sem remover itens de rotina da lista)
  if (!isRoutine) {
    mission.failed = true;
    mission.failedDate = todayStr;
  }

  // Registrar falha para o pipeline unificado de penalidades (applyPenalties)
  const penaltyDate = options.missedDate || todayStr;
  const missionLineageKey = mission.originalId || mission.id;
  const alreadyFailedForDate = appData.completedMissions.some(
    (m) =>
      m.failed &&
      String(m.originalId || m.id) === String(missionLineageKey) &&
      m.failedDate === penaltyDate
  );
  if (alreadyFailedForDate) return;

  // Mover para missões concluídas (com status de falha)
  appData.completedMissions.push({
    ...mission,
    completedDate: todayStr,
    failedDate: penaltyDate,
    failed: true,
    penaltyApplied: false,
    reason: reason,
    missedDate: options.missedDate || null,
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: penaltyDate,
    missionsMissed: 1,
  });

  // Remover da lista de missões ativas
  if (!isRoutine) {
    appData.missions.splice(missionIndex, 1);
  }

  // Atualizar UI
  updateUI();
  applyPenalties(penaltyDate, { onlyTypes: ['mission'] });

  addHeroLog(
    'mission',
    `Missão falhada: ${mission.name}`,
    `Falha registrada para ${penaltyDate}. Penalidades aplicadas no pipeline diário.`
  );
  showFeedback(`Missão "${mission.name}" falhou (${penaltyDate}).`, 'error', 3200);
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
  if (!(await tryConsumeSkipItem(`a missao "${mission.name}"`))) return;

  const todayStr = getLocalDateString();
  appData.completedMissions.push({
    ...mission,
    completed: false,
    failed: false,
    skipped: true,
    skippedDate: todayStr,
    reason: 'Atividade pulada (1 item de pulo consumido)',
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: todayStr,
    missionsMissed: 1,
  });
  if (!isRoutine) {
    appData.missions.splice(missionIndex, 1);
  }

  addHeroLog(
    'mission',
    `Missao pulada: ${mission.name}`,
    '1 item de pulo consumido. Sem penalidade.'
  );

  updateUI({ mode: 'activity' });
  showFeedback(`Missao "${mission.name}" pulada sem penalidade.`, 'info');
}

function failWork(workId, reason = '', options = {}) {
  const workIndex = appData.works.findIndex((w) => w.id === workId);
  if (workIndex === -1) return;

  const work = appData.works[workIndex];

  // Verificar se já está falido para evitar penalidades duplicadas
  if (work.failed) return;

  const isRoutine = isRoutineType(work.type);
  const todayStr = getLocalDateString();
  if (!isRoutine) {
    work.failed = true;
    work.failedDate = todayStr;
  }

  const penaltyDate = options.missedDate || todayStr;
  const workLineageKey = work.originalId || work.id;
  const alreadyFailedForDate = appData.completedWorks.some(
    (w) =>
      w.failed &&
      String(w.originalId || w.id) === String(workLineageKey) &&
      w.failedDate === penaltyDate
  );
  if (alreadyFailedForDate) return;
  appData.completedWorks.push({
    ...work,
    completedDate: todayStr,
    failedDate: penaltyDate,
    failed: true,
    penaltyApplied: false,
    reason,
    missedDate: options.missedDate || null,
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: penaltyDate,
    worksMissed: 1,
  });

  if (!isRoutine) {
    appData.works.splice(workIndex, 1);
  }

  updateUI({ mode: 'activity' });
  applyPenalties(penaltyDate, { onlyTypes: ['work'] });

  addHeroLog(
    'mission',
    `Trabalho falhado: ${work.name}`,
    `Falha registrada para ${penaltyDate}. Penalidades aplicadas no pipeline diário.`
  );
}

async function skipWork(workId) {
  const workIndex = appData.works.findIndex((w) => w.id === workId);
  if (workIndex === -1) return;

  const work = appData.works[workIndex];
  const isRoutine = isRoutineType(work.type);
  if (!(await tryConsumeSkipItem(`o trabalho "${work.name}"`))) return;

  const todayStr = getLocalDateString();
  appData.completedWorks.push({
    ...work,
    completed: false,
    failed: false,
    skipped: true,
    skippedDate: todayStr,
    reason: 'Atividade pulada (1 item de pulo consumido)',
  });
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: todayStr,
    worksMissed: 1,
  });
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.worksIgnored = (appData.statistics.worksIgnored || 0) + 1;
  if (!isRoutine) {
    appData.works.splice(workIndex, 1);
  }

  addHeroLog(
    'mission',
    `Trabalho pulado: ${work.name}`,
    '1 item de pulo consumido. Sem penalidade.'
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
      skipped: true,
      skippedDate: workoutDay.skippedDate,
      failed: false,
      reason: 'Atividade pulada (1 item de pulo consumido)',
    });
  }
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: workoutDay.date,
    workoutsMissed: 1,
  });

  addHeroLog(
    'workout',
    `Treino pulado: ${workout.name}`,
    '1 item de pulo consumido. Sem penalidade.'
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
      failed: false,
      applied: !!studyDay.applied,
      reason: 'Atividade pulada (1 item de pulo consumido)',
    });
  }
  updateProductiveDay(0, 0, 0, 0, 0, {
    date: studyDay.date,
    studiesMissed: 1,
  });

  addHeroLog('study', `Estudo pulado: ${study.name}`, '1 item de pulo consumido. Sem penalidade.');

  updateUI({ mode: 'activity' });
  showFeedback(`Estudo "${study.name}" pulado sem penalidade.`, 'info');
}

// __appUiBridge: exposes ui APIs for legacy scripts during module migration
Object.assign(globalThis, {
  initUI,
  bindById,
  bindManyById,
  initEvents,
  updateUI,
  updateIntegratedHearts,
  updateAttributes,
  getPrimaryClass,
  getClassNameById,
  updateClassesList,
  updateWorkClassOptions,
  updateWorkouts,
  getWorkoutStats,
  updateStudiesDisplay,
  updateStudies,
  updateBooks,
  deleteBook,
  setBookStatus,
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
