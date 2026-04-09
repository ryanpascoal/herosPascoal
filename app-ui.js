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

  // Popular menu "Mais" no mobile
  populateMobileMoreMenu();

  // Inicializar os seletores de atributos
  initAttributesSelectors();
  initClassSelectors();
  initSelectAllDays('#activity-days-container .days-selector');
  if (typeof updateActivityForm === 'function') {
    updateActivityForm();
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
  initNutritionForms();

  // Inicializar gráficos
  if (typeof Chart !== 'undefined') {
    initCharts();
  }
}

function populateMobileMoreMenu() {
  const menu = document.getElementById('mobile-more-menu');
  if (!menu) return;

  const extraTabs = [
    { tab: 'gestao', icon: 'fa-wallet', label: 'Gestão' },
    { tab: 'alimentacao', icon: 'fa-utensils', label: 'Alimentação' },
    { tab: 'estatisticas', icon: 'fa-chart-bar', label: 'Estatísticas' },
  ];

  menu.innerHTML = extraTabs
    .map(
      (t) => `
    <button class="mobile-more-item" data-tab="${t.tab}">
      <i class="fas ${t.icon}"></i>
      <span>${t.label}</span>
    </button>
  `
    )
    .join('');
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
  // Toggle do calendário
  document.getElementById('calendar-collapse-toggle')?.addEventListener('click', function () {
    const panel = document.getElementById('calendar-panel');
    if (!panel) return;
    panel.classList.toggle('collapsed');
    const icon = this.querySelector('.fa-chevron-down');
    if (icon)
      icon.style.transform = panel.classList.contains('collapsed')
        ? 'rotate(-90deg)'
        : 'rotate(0deg)';
  });

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
      const parentElement =
        this.closest('.shop-inventory, .profile-tabs, .stats-tabs') ||
        this.closest('.tab-content');
      if (parentElement) {
        switchSubTab(subtab, parentElement);
      }
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
    'save-stats-goals-btn': saveStatisticsGoals,
    'reset-foods-btn': resetNutritionFoods,
    'reset-btn': resetProgress,
    'export-btn': exportData,
    'import-btn': importData,
  });
  bindManyById('submit', {
    'activity-form': handleActivitySubmit,
    'shop-item-form': handleShopItemSubmit,
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

  document.getElementById('activity-category')?.addEventListener('change', function () {
    updateActivityForm();
  });
  document.getElementById('activity-schedule-type')?.addEventListener('change', function () {
    updateActivityForm();
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

    const unifiedCompleteMissionBtn = e.target.closest('.unified-complete-mission-btn');
    if (unifiedCompleteMissionBtn) {
      const missionId = parseInt(unifiedCompleteMissionBtn.getAttribute('data-id'), 10);
      if (Number.isFinite(missionId)) completeMission(missionId);
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
      if (Number.isFinite(workId)) completeWork(workId);
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
      if (Number.isFinite(bookId)) completeBook(bookId);
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
  const isShop = mode === 'shop';
  const isFinance = mode === 'finance';

  const shouldUpdateActivity = isFull || isActivity;
  const shouldUpdateShop = isFull || isShop;
  const shouldUpdateFinance = isFull || isFinance;
  const shouldUpdateNutrition =
    (isFull || isActivity || options.forceNutrition) && isTabActive('alimentacao');
  const shouldUpdateCalendar =
    (isFull || isActivity || options.forceCalendar) && isTabActive('atividades');

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

    // Atualizar cartões do perfil
    updateWorkoutsDisplay();
    updateStudiesDisplay();
    if (typeof updateUnifiedActivities === 'function') {
      updateUnifiedActivities();
    }

    // Atualizar estatísticas
    updateStatistics();

    // Atualizar logs do herói
    generateHeroLogs();
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
