function handleNutritionFoodSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('nutrition-food-name')?.value || '').trim();
  const brand = (document.getElementById('nutrition-food-brand')?.value || '').trim();
  const portionGrams = Number(document.getElementById('nutrition-food-portion')?.value || 0);
  const kcal = Number(document.getElementById('nutrition-food-kcal')?.value || 0);
  const protein = Number(document.getElementById('nutrition-food-protein')?.value || 0);
  const carbs = Number(document.getElementById('nutrition-food-carbs')?.value || 0);
  const fat = Number(document.getElementById('nutrition-food-fat')?.value || 0);
  const fiber = Number(document.getElementById('nutrition-food-fiber')?.value || 0);

  if (!name || !Number.isFinite(portionGrams) || portionGrams <= 0) {
    showFeedback('Informe nome e por\u00e7\u00e3o base v\u00e1lidos.', 'warn');
    return;
  }
  const numbers = [kcal, protein, carbs, fat, fiber];
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
    showFeedback('Macros inv\u00e1lidos. Use apenas n\u00fameros positivos.', 'warn');
    return;
  }

  appData.foodItems.push({
    id: createUniqueId(appData.foodItems),
    name,
    brand,
    portionGrams,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
  });
  event.target.reset();
  const portionInput = document.getElementById('nutrition-food-portion');
  if (portionInput) portionInput.value = '100';
  const fiberInput = document.getElementById('nutrition-food-fiber');
  if (fiberInput) fiberInput.value = '0';
  if (typeof queueSave === 'function') queueSave();
  updateNutritionView();
  showFeedback('Alimento cadastrado com sucesso!', 'success');
}

function safeRemoveLocalProgressCache(keys) {
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Falha ao remover item do localStorage:', key, error);
    }
  });
}

function handleImportFoods(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showFeedback('Por favor, selecione um arquivo JSON v\u00e1lido.', 'warn');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);
      let importedCount = 0;
      let skippedCount = 0;

      if (!Array.isArray(jsonData)) {
        throw new Error('O arquivo JSON deve conter um array de alimentos.');
      }

      jsonData.forEach((item) => {
        const name = (item.name || item.nome || '').trim();
        const brand = (item.brand || item.marca || '').trim();
        const portionGrams = Number(
          item.portionGrams || item.porcao || item['por\u00e7\u00e3o'] || 100
        );
        const kcal = Number(item.kcal || item.calorias || 0);
        const protein = Number(item.protein || item.proteina || item['prote\u00edna'] || 0);
        const carbs = Number(item.carbs || item.carboidratos || 0);
        const fat = Number(item.fat || item.gordura || 0);
        const fiber = Number(item.fiber || item.fibra || 0);

        if (!name || !Number.isFinite(portionGrams) || portionGrams <= 0) {
          skippedCount++;
          return;
        }

        const numbers = [kcal, protein, carbs, fat, fiber];
        if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
          skippedCount++;
          return;
        }

        appData.foodItems.push({
          id: createUniqueId(appData.foodItems),
          name,
          brand,
          portionGrams,
          kcal,
          protein,
          carbs,
          fat,
          fiber,
        });
        importedCount++;
      });

      if (typeof queueSave === 'function') queueSave();
      updateNutritionView();

      if (importedCount > 0) {
        showFeedback(
          `${importedCount} alimento(s) importado(s) com sucesso!${skippedCount > 0 ? ` (${skippedCount} ignorado(s))` : ''}`,
          'success'
        );
      } else {
        showFeedback('Nenhum alimento v\u00e1lido foi encontrado no arquivo.', 'warn');
      }
    } catch (error) {
      console.error('Erro ao importar alimentos:', error);
      showFeedback('Erro ao processar o arquivo JSON. Verifique o formato.', 'error');
    }
    event.target.value = '';
  };

  reader.onerror = function () {
    showFeedback('Erro ao ler o arquivo.', 'error');
    event.target.value = '';
  };

  reader.readAsText(file);
}

function handleNutritionEntrySubmit(event) {
  event.preventDefault();
  const date = getNutritionEntryDate();
  const meal = document.getElementById('nutrition-entry-meal')?.value || 'lanche';
  const foodId = Number(document.getElementById('nutrition-entry-food')?.value || 0);
  const quantity = Number(document.getElementById('nutrition-entry-qty')?.value || 0);
  const notes = (document.getElementById('nutrition-entry-notes')?.value || '').trim();
  const food = (appData.foodItems || []).find((item) => Number(item.id) === foodId);

  if (!food) {
    showFeedback('Selecione um alimento v\u00e1lido.', 'warn');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showFeedback('Quantidade inv\u00e1lida.', 'warn');
    return;
  }

  if (typeof ensureNutritionStatsState === 'function') {
    ensureNutritionStatsState();
  }
  const entry = {
    id: createUniqueId(appData.nutritionEntries),
    date,
    meal,
    createdAt: (typeof getGameNow === 'function' ? getGameNow() : new Date()).toISOString(),
    foodId: food.id,
    foodName: food.name,
    quantity,
    grams: food.portionGrams * quantity,
    kcal: food.kcal * quantity,
    protein: food.protein * quantity,
    carbs: food.carbs * quantity,
    fat: food.fat * quantity,
    fiber: food.fiber * quantity,
    notes,
    consolidated: false,
    consolidatedAt: '',
  };
  appData.nutritionEntries.push(entry);
  recalcNutritionStats();

  event.target.reset();
  const searchInput = document.getElementById('nutrition-entry-food-search');
  if (searchInput) searchInput.value = '';
  const dateInput = document.getElementById('nutrition-entry-date');
  if (dateInput) dateInput.value = date;
  const qtyInput = document.getElementById('nutrition-entry-qty');
  if (qtyInput) qtyInput.value = '1';
  const diaryInput = document.getElementById('nutrition-diary-date');
  if (diaryInput) diaryInput.value = date;
  if (typeof queueSave === 'function') queueSave();
  updateNutritionView();
  showFeedback(
    'Refeição adicionada ao diário. Consolide o dia para contar no histórico.',
    'success'
  );
}

function handleNutritionGoalsSubmit(event) {
  event.preventDefault();
  const kcal = Number(document.getElementById('nutrition-goal-kcal')?.value || 0);
  const protein = Number(document.getElementById('nutrition-goal-protein')?.value || 0);
  const carbs = Number(document.getElementById('nutrition-goal-carbs')?.value || 0);
  const fat = Number(document.getElementById('nutrition-goal-fat')?.value || 0);
  const fiber = Number(document.getElementById('nutrition-goal-fiber')?.value || 0);
  const values = [kcal, protein, carbs, fat, fiber];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    showFeedback('Preencha metas válidas (maiores que zero).', 'warn');
    return;
  }

  appData.nutritionGoals = { kcal, protein, carbs, fat, fiber };
  recalcNutritionStats();
  if (typeof queueSave === 'function') queueSave();
  updateNutritionView();
  showFeedback('Metas nutricionais atualizadas!', 'success');
}

// Atualizar contador para meia-noite
function updateMidnightCountdown() {
  const countdownElement = document.getElementById('midnight-countdown');
  if (!countdownElement) return;

  const now = getGameNow();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diff = midnight - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  countdownElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Atualizar data atual
function updateCurrentDate() {
  const dateElement = document.getElementById('current-date');
  const workDateElement = document.getElementById('current-date-work');
  if (!dateElement && !workDateElement) return;

  const now = getGameNow();
  const formattedDate = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  if (dateElement) dateElement.textContent = formattedDate;
  if (workDateElement) workDateElement.textContent = formattedDate;
}

// Resetar progresso
async function resetProgress() {
  const delegatedReset = window.resetProgress;
  // Delegar para cloud-sync quando disponível (reset local + nuvem)
  if (typeof delegatedReset === 'function' && delegatedReset !== resetProgress) {
    await delegatedReset();
    return;
  }

  // Verificar se o Firebase está disponível para tentar limpar também o remoto
  if (typeof firebase !== 'undefined') {
    // Se a função global não existe, fazer o reset manualmente com nuvem
    const confirmed = await askConfirmation(
      'Tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito.',
      {
        title: 'Resetar progresso',
        confirmText: 'Continuar',
      }
    );
    if (!confirmed) return;

    const confirmationText = await askInput(
      'Digite RESETAR para confirmar a exclusão total do progresso:',
      {
        title: 'Confirmar reset',
        confirmText: 'Resetar',
        validate: (value) => (value === 'RESETAR' ? '' : 'Digite exatamente RESETAR.'),
      }
    );
    if (confirmationText === null || confirmationText !== 'RESETAR') {
      showFeedback('Reset cancelado.', 'info');
      return;
    }

    window.__suppressSave = true;
    safeRemoveLocalProgressCache([
      'heroJourneyData',
      'heroJourneyLocalSaveMeta',
      'heroJourneyLastSync',
      'heroJourneyAuth',
    ]);

    // Tentar apagar dados na nuvem usando Firebase diretamente
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        const db = firebase.firestore();
        await db.collection('users').doc(user.uid).collection('progress').doc('main').delete();
        console.log('Dados na nuvem apagados com sucesso');
      }
    } catch (err) {
      console.error('Erro ao limpar dados na nuvem:', err);
    }

    // Recarregar a página
    window.__suppressSave = true;
    location.reload();
    return;
  }

  // Fallback para modo offline: apenas reset local
  const confirmed = await askConfirmation(
    'Tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito.',
    {
      title: 'Resetar progresso',
      confirmText: 'Continuar',
    }
  );
  if (!confirmed) return;

  const confirmationText = await askInput(
    'Digite RESETAR para confirmar a exclusão total do progresso:',
    {
      title: 'Confirmar reset',
      confirmText: 'Resetar',
      validate: (value) => (value === 'RESETAR' ? '' : 'Digite exatamente RESETAR.'),
    }
  );
  if (confirmationText === null || confirmationText !== 'RESETAR') {
    showFeedback('Reset cancelado.', 'info');
    return;
  }

  window.__suppressSave = true;
  safeRemoveLocalProgressCache([
    'heroJourneyData',
    'heroJourneyLocalSaveMeta',
    'heroJourneyLastSync',
    'heroJourneyAuth',
  ]);

  // Também limpar dados na nuvem se estiver logado
  if (typeof currentUser !== 'undefined' && currentUser && typeof getProgressRef === 'function') {
    try {
      await getProgressRef(currentUser.uid).delete();
      console.log('Dados na nuvem apagados com sucesso');
    } catch (err) {
      console.error('Erro ao limpar dados na nuvem:', err);
    }
  }

  // Recarregar a página
  window.__suppressSave = true;
  location.reload();
}

// Exportar dados
async function exportData() {
  const dataToExport = { ...appData };
  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `hero-journey-data-${getLocalDateString()}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();

  showFeedback('Dados exportados com sucesso!', 'success');
}

// Importar dados
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validar dados importados
        if (!importedData.hero || !importedData.attributes) {
          throw new Error('Arquivo inválido');
        }

        replaceAppState(importedData);
        finalizeLoadedState();

        // Salvar no localStorage
        saveToLocalStorage();

        // Atualizar UI
        updateUI();

        showFeedback('Dados importados com sucesso!', 'success');
      } catch (error) {
        showFeedback('Erro ao importar dados: ' + error.message, 'error', 3400);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

// Funções auxiliares
function getMissionTypeName(type) {
  const types = {
    rotina: 'Rotina',
    eventual: 'Eventual',
    epica: 'Épica',
  };
  return types[type] || type;
}

function isRoutineType(type) {
  return type === 'rotina';
}

function getRoutineDays(item) {
  if (!item || !isRoutineType(item.type)) return [];
  const sourceDays = Array.isArray(item.days) ? item.days : [];
  return Array.from(
    new Set(
      sourceDays
        .map((day) =>
          typeof normalizeWeekdayValue === 'function' ? normalizeWeekdayValue(day) : Number(day)
        )
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    )
  );
}

function getMonthName(monthIndex) {
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return months[monthIndex] || '';
}

function getDaysNames(dayNumbers) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return dayNumbers.map((num) => days[num]).join(', ');
}

function getDueBadgeHtml(dueDateStr, todayStr, type) {
  if (!dueDateStr) return '';
  const dueDate = parseLocalDateString(dueDateStr);
  const todayDate = parseLocalDateString(todayStr);
  dueDate.setHours(0, 0, 0, 0);
  todayDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate - todayDate) / 86400000);
  let text = '';
  let cls = 'due-later';
  const isStrict = type === 'eventual' || type === 'epica';
  if (diffDays < 0) {
    text = `Atrasado ${Math.abs(diffDays)}d`;
    cls = 'due-overdue';
  } else if (diffDays === 0) {
    if (!isStrict) return '';
    text = 'Vence hoje';
    cls = 'due-today';
  } else if (diffDays === 1) {
    text = 'Vence amanhã';
    cls = 'due-soon';
  } else if (diffDays <= 3) {
    text = `Vence em ${diffDays} dias`;
    cls = 'due-soon';
  } else {
    text = `Vence em ${diffDays} dias`;
    cls = 'due-later';
  }
  return `<span class="due-badge ${cls}">${text}</span>`;
}

function formatDate(dateString) {
  if (!dateString) return '';

  const date = parseLocalDateString(dateString);

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function editNamedEmojiItem(config) {
  const { list, id, namePrompt, emojiPrompt, updateMode } = config;
  const item = list.find((i) => i.id === id);
  if (!item) return;

  const newName = await askInput(namePrompt, {
    title: 'Editar item',
    defaultValue: item.name || '',
  });
  if (newName === null) return;
  if (newName.trim()) item.name = newName.trim();

  const newEmoji = await askInput(emojiPrompt, {
    title: 'Editar item',
    defaultValue: item.emoji || '',
  });
  if (newEmoji !== null && newEmoji.trim()) item.emoji = newEmoji.trim();

  updateUI({ mode: updateMode });
  showFeedback('Item atualizado com sucesso!', 'success');
}

async function deleteNamedEmojiItem(config) {
  const { list, id, confirmText, successText, updateMode } = config;
  const confirmed = await askConfirmation(confirmText, {
    title: 'Confirmar exclusão',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const index = list.findIndex((i) => i.id === id);
  if (index === -1) return;

  list.splice(index, 1);
  updateUI({ mode: updateMode });
  showFeedback(successText, 'success');
}

function validateIsoDateInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'Use o formato AAAA-MM-DD.';
  const parsed = parseLocalDateString(trimmed);
  if (getLocalDateString(parsed) !== trimmed) return 'Data inválida.';
  return null;
}

async function maybeEditItemDeadline(item, options = {}) {
  if (!item || (item.type !== 'eventual' && item.type !== 'epica')) return;
  if (item.dueDateLocked === true) {
    showFeedback('O prazo desta atividade está trancado e não pode ser alterado.', 'warn');
    return;
  }

  const field = item.type === 'epica' ? 'deadline' : 'date';
  const label = item.type === 'epica' ? 'Prazo (épica)' : 'Prazo (eventual)';
  const currentValue = item[field] || '';
  const newValue = await askInput(`${label} (AAAA-MM-DD). Deixe em branco para manter:`, {
    title: options.title || 'Editar prazo',
    defaultValue: currentValue,
    confirmText: 'Salvar',
    validate: validateIsoDateInput,
  });
  if (newValue === null) return;
  const trimmed = newValue.trim();
  if (!trimmed) return;
  item[field] = trimmed;
}

// Editar e excluir funções (implementações básicas)
function openActivityEditor(category, item) {
  if (!item) return;

  const activitiesSection = document.getElementById('atividades');
  if (!activitiesSection) return;

  switchTab('atividades');
  switchSubTab('atividades-gerenciar', activitiesSection);

  const categorySelect = document.getElementById('activity-category');
  const editIdInput = document.getElementById('activity-edit-id');
  const nameInput = document.getElementById('activity-name');
  const emojiInput = document.getElementById('activity-emoji');
  const scheduleTypeInput = document.getElementById('activity-schedule-type');
  const workoutTypeInput = document.getElementById('activity-workout-type');
  const workoutUsesWeightInput = document.getElementById('activity-workout-uses-weight');
  const studyTypeInput = document.getElementById('activity-study-type');
  const dateInput = document.getElementById('activity-date');
  const deadlineInput = document.getElementById('activity-deadline');
  const dueLockInput = document.getElementById('activity-due-lock');
  const authorInput = document.getElementById('activity-book-author');
  const bookStatusInput = document.getElementById('activity-book-status');
  const classInput = document.getElementById('activity-class');
  const urgentInput = document.getElementById('activity-urgent');

  if (categorySelect) categorySelect.value = category;
  if (editIdInput) editIdInput.value = item.id;
  if (nameInput) nameInput.value = item.name || '';
  if (emojiInput) emojiInput.value = item.emoji || '';
  if (scheduleTypeInput && (category === 'mission' || category === 'work')) {
    scheduleTypeInput.value = item.type || 'rotina';
  }
  if (dueLockInput) dueLockInput.checked = item.dueDateLocked === true;

  if (typeof updateActivityForm === 'function') updateActivityForm();
  if (typeof populateActivityPeopleSelector === 'function') {
    populateActivityPeopleSelector(item.peopleIds || []);
  }

  if (workoutTypeInput && category === 'workout') {
    workoutTypeInput.value =
      typeof getWorkoutSelectionValue === 'function'
        ? getWorkoutSelectionValue(item)
        : 'reps|maximize';
  }
  if (workoutUsesWeightInput && category === 'workout') {
    workoutUsesWeightInput.checked =
      typeof workoutUsesWeight === 'function' ? workoutUsesWeight(item) : item.usesWeight === true;
  }
  if (studyTypeInput && category === 'study') studyTypeInput.value = item.type || 'logico';
  if (dateInput) dateInput.value = item.date || '';
  if (deadlineInput) deadlineInput.value = item.deadline || '';
  if (authorInput) authorInput.value = item.author || '';
  if (bookStatusInput) bookStatusInput.value = item.status === 'lendo' ? 'lendo' : 'quero-ler';
  if (classInput) classInput.value = item.classId ? String(item.classId) : '';
  if (urgentInput) urgentInput.checked = item.urgent === true;

  document
    .querySelectorAll(
      '#activity-days-container input[type="checkbox"][value]:not([data-select-all])'
    )
    .forEach((checkbox) => {
      checkbox.checked = Array.isArray(item.days)
        ? item.days.map((day) => String(day)).includes(checkbox.value)
        : false;
    });

  const selectAllDaysCheckbox = document.querySelector(
    '#activity-days-container input[data-select-all="true"]'
  );
  const dayCheckboxes = Array.from(
    document.querySelectorAll(
      '#activity-days-container input[type="checkbox"][value]:not([data-select-all])'
    )
  );
  if (selectAllDaysCheckbox) {
    const checkedCount = dayCheckboxes.filter((checkbox) => checkbox.checked).length;
    selectAllDaysCheckbox.checked = checkedCount === dayCheckboxes.length && checkedCount > 0;
    selectAllDaysCheckbox.indeterminate = checkedCount > 0 && checkedCount < dayCheckboxes.length;
  }

  document.querySelectorAll('#activity-attributes input[type="checkbox"]').forEach((checkbox) => {
    const attrId = parseInt(checkbox.value, 10);
    checkbox.checked = Array.isArray(item.attributes) && item.attributes.includes(attrId);
  });
  document.querySelectorAll('#activity-people input[type="checkbox"]').forEach((checkbox) => {
    const personId = parseInt(checkbox.value, 10);
    checkbox.checked = Array.isArray(item.peopleIds) && item.peopleIds.includes(personId);
  });

  if (typeof fillActivityPlanningForm === 'function') fillActivityPlanningForm(item);
  if (typeof setActivityFormSubmitLabel === 'function') setActivityFormSubmitLabel(true);
  if (typeof updateActivityForm === 'function') updateActivityForm();
  if (typeof populateActivityPeopleSelector === 'function') {
    populateActivityPeopleSelector(item.peopleIds || []);
  }
  nameInput?.focus();
}

function editWorkout(id) {
  const workout = appData.workouts.find((item) => item.id === id);
  if (!workout) return;
  openActivityEditor('workout', workout);
}

function deleteWorkoutLegacy(id) {
  deleteNamedEmojiItem({
    list: appData.workouts,
    id,
    confirmText: 'Tem certeza que deseja excluir este treino?',
    successText: 'Treino excluído com sucesso!',
    confirmText: 'Tem certeza que deseja excluir esta ação?',
    successText: 'Ação excluída com sucesso!',
    updateMode: 'activity',
  });
}

function deleteWorkout(id) {
  deleteNamedEmojiItem({
    list: appData.workouts,
    id,
    confirmText: 'Tem certeza que deseja excluir este treino?',
    successText: 'Treino excluído com sucesso!',
    updateMode: 'activity',
  });
}

function editStudy(id) {
  const study = appData.studies.find((item) => item.id === id);
  if (!study) return;
  openActivityEditor('study', study);
}

function removeStudyStateArtifacts(studyId) {
  const studyKey = String(studyId || '').trim();
  if (!studyKey) return;

  if (Array.isArray(appData.dailyStudies)) {
    appData.dailyStudies = appData.dailyStudies.filter(
      (entry) => String(entry?.studyId || '') !== studyKey
    );
  }
}

async function deleteStudy(id) {
  const confirmed = await askConfirmation('Tem certeza que deseja excluir este estudo?', {
    title: 'Confirmar exclusao',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const index = appData.studies.findIndex((item) => item.id === id);
  if (index === -1) return;

  removeStudyStateArtifacts(id);
  appData.studies.splice(index, 1);
  updateUI({ mode: 'activity' });
  showFeedback('Estudo excluido com sucesso!', 'success');
  if (typeof saveToLocalStorage === 'function') {
    saveToLocalStorage();
  }
}

function editBook(id) {
  const book = appData.books.find((item) => Number(item.id) === Number(id));
  if (!book) return;
  openActivityEditor('book', book);
}

function deleteBook(id) {
  deleteNamedEmojiItem({
    list: appData.books,
    id,
    confirmText: 'Tem certeza que deseja excluir este livro?',
    successText: 'Livro excluído com sucesso!',
    updateMode: 'activity',
  });
}

function editMission(id) {
  const mission = appData.missions.find((m) => m.id === id);
  if (!mission) return;
  openActivityEditor('mission', mission);
}

function deleteMissionLegacy(id) {
  deleteNamedEmojiItem({
    list: appData.missions,
    id,
    confirmText: 'Tem certeza que deseja excluir esta ação?',
    successText: 'Ação excluída com sucesso!',
    confirmText: 'Tem certeza que deseja excluir esta ação?',
    successText: 'Ação excluída com sucesso!',
    updateMode: 'activity',
  });
}

function deleteMission(id) {
  deleteNamedEmojiItem({
    list: appData.missions,
    id,
    confirmText: 'Tem certeza que deseja excluir esta ação?',
    successText: 'Ação excluída com sucesso!',
    updateMode: 'activity',
  });
}

function editWork(id) {
  const work = appData.works.find((w) => w.id === id);
  if (!work) return;
  openActivityEditor('work', work);
}

function deleteWork(id) {
  deleteNamedEmojiItem({
    list: appData.works,
    id,
    confirmText: 'Tem certeza que deseja excluir este trabalho?',
    successText: 'Trabalho excluído com sucesso!',
    updateMode: 'activity',
  });
}

// Aplicar penalidades por não conclusão (deve ser chamada diariamente)
function editClass(id) {
  editNamedEmojiItem({
    list: appData.classes,
    id,
    namePrompt: 'Novo nome da classe:',
    emojiPrompt: 'Novo emoji (opcional):',
    updateMode: 'activity',
  });
}

function setPrimaryClass(id) {
  const cls = appData.classes.find((item) => item.id === id);
  if (!cls) return;
  appData.hero.primaryClassId = cls.id;
  updateUI({ mode: 'activity' });
  showFeedback(`Classe principal definida: ${cls.name}`, 'success');
}

async function deleteClass(id) {
  const confirmed = await askConfirmation('Tem certeza que deseja excluir esta classe?', {
    title: 'Excluir classe',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;

  const index = appData.classes.findIndex((c) => c.id === id);
  if (index === -1) return;

  appData.classes.splice(index, 1);

  appData.works.forEach((w) => {
    if (w.classId === id) w.classId = null;
  });
  appData.completedWorks.forEach((w) => {
    if (w.classId === id) w.classId = null;
  });

  if (appData.hero.primaryClassId === id) {
    appData.hero.primaryClassId = appData.classes[0]?.id || null;
  }

  updateUI({ mode: 'activity' });
  showFeedback('Classe excluída com sucesso!', 'success');
}

function applyPenalties(dateStr = getLocalDateString(), options = {}) {
  const targetDateStr = dateStr;
  const onlyTypes = Array.isArray(options.onlyTypes) ? new Set(options.onlyTypes) : null;
  const shouldCheckType = (type) => !onlyTypes || onlyTypes.has(type);
  const getFailedTypeLabel = (type) => {
    if (type === 'workout') return 'treino';
    if (type === 'study') return 'estudo';
    if (type === 'mission') return 'ação';
    if (type === 'work') return 'trabalho';
    if (type === 'nutrition') return 'alimentação';
    if (type === 'hydration') return 'hidratação';
    return type;
  };
  const formatNamedFailure = (label, name, feminine = false) => {
    const safeName = String(name || '').trim();
    const suffix = feminine ? 'não concluída' : 'não concluído';
    return safeName ? `${label} "${safeName}" ${suffix}` : `${label} ${suffix}`;
  };
  const resolveFailureItem = (category, item) => {
    if (!item || typeof item !== 'object') return item || {};
    if (item.name) return item;
    if (category === 'workout') {
      return (
        appData.workouts?.find((workout) => workout.id === item.workoutId) ||
        appData.dailyWorkouts?.find(
          (workoutDay) => workoutDay.workoutId === item.workoutId && workoutDay.date === item.date
        ) ||
        item
      );
    }
    if (category === 'study') {
      return (
        appData.studies?.find((study) => study.id === item.studyId) ||
        appData.dailyStudies?.find(
          (studyDay) => studyDay.studyId === item.studyId && studyDay.date === item.date
        ) ||
        item
      );
    }
    return item;
  };
  const formatFailureDetail = (category, item = null) => {
    const sourceItem = resolveFailureItem(category, item);
    if (category === 'mission') return formatNamedFailure('Ação', sourceItem?.name, true);
    if (category === 'work') return formatNamedFailure('Trabalho', sourceItem?.name);
    if (category === 'workout') return formatNamedFailure('Treino', sourceItem?.name);
    if (category === 'study') return formatNamedFailure('Estudo', sourceItem?.name);
    if (category === 'nutrition') {
      const mealLabel = String(item || '').trim();
      return mealLabel
        ? formatNamedFailure('Refeição', mealLabel, true)
        : 'Refeição não registrada';
    }
    if (category === 'hydration') return 'Hidratação não concluída';
    return getFailedTypeLabel(category);
  };
  const todayStr = getLocalDateString();
  const getItemAvailableFromDateKey = (item) =>
    String(item?.availableDate || item?.dateAdded || todayStr || '').trim();
  const isItemAvailableOnDate = (item, dateKey) => {
    const availableFrom = getItemAvailableFromDateKey(item);
    return !availableFrom || availableFrom <= dateKey;
  };
  const getFailurePenaltyItemCount = (summary = {}) =>
    Number(summary.missionFailureCount || 0) +
    Number(summary.workFailureCount || 0) +
    Number(summary.workoutFailureCount || 0) +
    Number(summary.studyFailureCount || 0) +
    Number(summary.nutritionFailureCount || 0) +
    Number(summary.hydrationFailureCount || 0);
  const workOffActive = typeof isWorkOffDay === 'function' && isWorkOffDay(targetDateStr);
  const yesterdayDate = parseLocalDateString(todayStr);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);
  const shouldResetCurrentStreaks = targetDateStr === todayStr || targetDateStr === yesterdayStr;

  if (isRestDay(targetDateStr)) {
    return;
  }

  const getPenaltyDaySnapshot = () => {
    if (!appData.statistics) appData.statistics = {};
    if (!appData.statistics.productiveDays) appData.statistics.productiveDays = {};
    if (!appData.statistics.productiveDays[targetDateStr]) {
      appData.statistics.productiveDays[targetDateStr] = {};
    }
    return appData.statistics.productiveDays[targetDateStr];
  };

  const logMissedRoutineItems = (list, completedList, typeLabel, entryType) => {
    if (entryType === 'work' && workOffActive) return [];
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const missed = list.filter(
      (item) =>
        item &&
        isRoutineType(item.type) &&
        !item.completed &&
        !item.failed &&
        isItemAvailableOnDate(item, targetDateStr) &&
        getRoutineDays(item).includes(dayOfWeek)
    );
    if (missed.length === 0) return [];
    const addedEntries = [];
    missed.forEach((item) => {
      const key = item.originalId || item.id;
      const alreadyLogged = completedList.some(
        (entry) =>
          (entry.originalId || entry.id) === key &&
          (entry.failedDate === targetDateStr ||
            entry.completedDate === targetDateStr ||
            entry.skippedDate === targetDateStr)
      );
      if (alreadyLogged) return;
      const failedEntry = {
        ...item,
        completedDate: targetDateStr,
        failedDate: targetDateStr,
        failed: true,
        ...(entryType === 'mission' || entryType === 'work' ? { penaltyApplied: true } : {}),
        reason: `Não concluída no dia (${typeLabel} de rotina)`,
      };
      completedList.push(failedEntry);
      addedEntries.push(failedEntry);
    });
    if (addedEntries.length > 0 && typeof updateProductiveDay === 'function') {
      updateProductiveDay(0, 0, 0, 0, 0, {
        date: targetDateStr,
        missionsMissed: entryType === 'mission' ? addedEntries.length : 0,
        worksMissed: entryType === 'work' ? addedEntries.length : 0,
      });
    }
    return addedEntries;
  };

  // Check for failed activities by type
  const failedTypes = [];
  const failedMissionEntries = [];
  const failedWorkEntries = [];

  // Check workouts - was there any failed workout on this day?
  let failedWorkouts = [];
  if (shouldCheckType('workout')) {
    const existingFailedWorkouts = appData.completedWorkouts.filter(
      (entry) => entry.failedDate === targetDateStr && entry.failed && entry.penaltyApplied !== true
    );
    if (existingFailedWorkouts.length > 0) {
      failedWorkouts = existingFailedWorkouts.slice();
      existingFailedWorkouts.forEach((entry) => {
        entry.penaltyApplied = true;
      });
    } else {
      failedWorkouts = appData.dailyWorkouts.filter(
        (item) => item.date === targetDateStr && !item.completed && !item.skipped && !item.failed
      );
    }
  }
  if (shouldCheckType('workout') && failedWorkouts.length > 0) {
    failedTypes.push('workout');
  } else if (shouldCheckType('workout')) {
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const scheduledWorkouts = appData.workouts.filter(
      (w) =>
        Array.isArray(w.days) &&
        w.days.some((d) => normalizeWeekdayValue(d) === dayOfWeek) &&
        isItemAvailableOnDate(w, targetDateStr)
    );
    if (scheduledWorkouts.length > 0) {
      const hasWorkoutEntry = (workoutId) =>
        appData.completedWorkouts.some(
          (w) =>
            w.workoutId === workoutId &&
            (w.completedDate === targetDateStr ||
              w.failedDate === targetDateStr ||
              w.skippedDate === targetDateStr ||
              w.date === targetDateStr)
        ) ||
        appData.dailyWorkouts.some(
          (dw) =>
            dw.workoutId === workoutId &&
            dw.date === targetDateStr &&
            (dw.completed || dw.skipped || dw.failed)
        );
      const missedScheduledWorkouts = scheduledWorkouts.filter((w) => !hasWorkoutEntry(w.id));
      if (missedScheduledWorkouts.length > 0) {
        failedTypes.push('workout');
        // Also add to failedWorkouts array for processing below
        missedScheduledWorkouts.forEach((workout) => {
          failedWorkouts.push({
            workoutId: workout.id,
            date: targetDateStr,
            failed: true,
          });
        });
      }
    }
  }

  // Check studies - was there any failed study on this day?
  let failedStudies = [];
  if (shouldCheckType('study')) {
    const existingFailedStudies = appData.completedStudies.filter(
      (entry) => entry.failedDate === targetDateStr && entry.failed && entry.penaltyApplied !== true
    );
    if (existingFailedStudies.length > 0) {
      failedStudies = existingFailedStudies.slice();
      existingFailedStudies.forEach((entry) => {
        entry.penaltyApplied = true;
      });
    } else {
      failedStudies = appData.dailyStudies.filter(
        (item) => item.date === targetDateStr && !item.completed && !item.skipped && !item.failed
      );
    }
  }
  if (shouldCheckType('study') && failedStudies.length > 0) {
    failedTypes.push('study');
  } else if (shouldCheckType('study')) {
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const scheduledStudies = appData.studies.filter(
      (s) =>
        Array.isArray(s.days) &&
        s.days.some((d) => normalizeWeekdayValue(d) === dayOfWeek) &&
        isItemAvailableOnDate(s, targetDateStr)
    );
    if (scheduledStudies.length > 0) {
      const hasStudyEntry = (studyId) =>
        appData.completedStudies.some(
          (s) =>
            s.studyId === studyId &&
            (s.completedDate === targetDateStr ||
              s.failedDate === targetDateStr ||
              s.skippedDate === targetDateStr ||
              s.date === targetDateStr)
        ) ||
        appData.dailyStudies.some(
          (ds) =>
            ds.studyId === studyId &&
            ds.date === targetDateStr &&
            (ds.completed || ds.skipped || ds.failed)
        );
      const missedScheduledStudies = scheduledStudies.filter((s) => !hasStudyEntry(s.id));
      if (missedScheduledStudies.length > 0) {
        failedTypes.push('study');
        // Also add to failedStudies array for processing below
        missedScheduledStudies.forEach((study) => {
          failedStudies.push({
            studyId: study.id,
            date: targetDateStr,
            failed: true,
          });
        });
      }
    }
  }

  // Check missions - was there any failed mission on this day?
  let missionFailureCount = 0;
  if (shouldCheckType('mission')) {
    const failedMissions = appData.completedMissions.filter(
      (m) => m.failedDate === targetDateStr && m.failed && m.penaltyApplied !== true
    );
    if (failedMissions.length > 0) {
      failedTypes.push('mission');
      missionFailureCount += failedMissions.length;
      failedMissionEntries.push(...failedMissions);
      failedMissions.forEach((m) => {
        m.penaltyApplied = true;
      });
    }

    const missedRoutineMissions = logMissedRoutineItems(
      appData.missions || [],
      appData.completedMissions || [],
      'ação',
      'mission'
    );
    missionFailureCount += missedRoutineMissions.length;
    failedMissionEntries.push(...missedRoutineMissions);
    if (missedRoutineMissions.length > 0 && !failedTypes.includes('mission')) {
      failedTypes.push('mission');
    }
  }

  // Check works - was there any failed work on this day?
  let workFailureCount = 0;
  if (shouldCheckType('work') && !workOffActive) {
    const failedWorks = appData.completedWorks.filter(
      (w) => w.failedDate === targetDateStr && w.failed && w.penaltyApplied !== true
    );
    if (failedWorks.length > 0) {
      failedTypes.push('work');
      workFailureCount += failedWorks.length;
      failedWorkEntries.push(...failedWorks);
      failedWorks.forEach((w) => {
        w.penaltyApplied = true;
      });
    }

    const missedRoutineWorks = logMissedRoutineItems(
      appData.works || [],
      appData.completedWorks || [],
      'trabalho',
      'work'
    );
    workFailureCount += missedRoutineWorks.length;
    failedWorkEntries.push(...missedRoutineWorks);
    if (missedRoutineWorks.length > 0 && !failedTypes.includes('work')) {
      failedTypes.push('work');
    }
  }

  // Check nutrition - was there any food logged on this day?
  // Only penalize if not a rest day and nutrition tracking is active
  const nutritionActive =
    (appData.nutritionEntries && appData.nutritionEntries.length > 0) ||
    (appData.foodItems && appData.foodItems.length > 0) ||
    (appData.nutritionStats?.logDates && appData.nutritionStats.logDates.length > 0);
  const penaltyDaySnapshot = getPenaltyDaySnapshot();
  const nutritionPenaltyAlreadyApplied = Number(penaltyDaySnapshot.nutritionFailed || 0) > 0;
  const nutritionMissingMeals =
    shouldCheckType('nutrition') &&
    nutritionActive &&
    !isRestDay(targetDateStr) &&
    !nutritionPenaltyAlreadyApplied &&
    typeof getNutritionMissingMealsForDate === 'function'
      ? getNutritionMissingMealsForDate(targetDateStr)
      : [];
  if (
    shouldCheckType('nutrition') &&
    nutritionActive &&
    !isRestDay(targetDateStr) &&
    !nutritionPenaltyAlreadyApplied &&
    nutritionMissingMeals.length > 0
  ) {
    failedTypes.push('nutrition');
  }

  // Check hydration - penalize every day the goal is not met
  if (shouldCheckType('hydration') && appData.hydration && appData.hydration.startDate) {
    if (targetDateStr >= appData.hydration.startDate) {
      const hydrationGoalHit = appData.hydration.goalHitDates?.includes(targetDateStr);
      const hydrationPenaltyAlreadyApplied = Number(penaltyDaySnapshot.hydrationFailed || 0) > 0;
      if (!hydrationGoalHit && !hydrationPenaltyAlreadyApplied) {
        failedTypes.push('hydration');
      }
    }
  }

  const nutritionFailureCount = failedTypes.includes('nutrition') ? 1 : 0;
  const hydrationFailureCount = failedTypes.includes('hydration') ? 1 : 0;
  const totalPenaltyItems = getFailurePenaltyItemCount({
    missionFailureCount,
    workFailureCount,
    workoutFailureCount: failedWorkouts.length,
    studyFailureCount: failedStudies.length,
    nutritionFailureCount,
    hydrationFailureCount,
  });

  // Apply streak and XP penalties based on the types that failed
  if (failedTypes.length > 0) {
    if (shouldResetCurrentStreaks) {
      // Replays antigos não devem derrubar o streak atual do herói.
      appData.hero.streak.general = 0;

      if (failedTypes.includes('workout')) {
        appData.hero.streak.physical = 0;
      }

      if (failedTypes.includes('study')) {
        appData.hero.streak.mental = 0;
      }
    }

    // Remove XP from Disciplina attribute
    addAttributeXP(6, -totalPenaltyItems);

    // Update statistics
    if (!appData.statistics) appData.statistics = {};
    if (missionFailureCount > 0) {
      appData.statistics.missionsFailed =
        (appData.statistics.missionsFailed || 0) + missionFailureCount;
    }
    if (workFailureCount > 0) {
      appData.statistics.worksFailed = (appData.statistics.worksFailed || 0) + workFailureCount;
    }
    if (failedTypes.includes('workout')) {
      appData.statistics.workoutsFailed =
        (appData.statistics.workoutsFailed || 0) + failedWorkouts.length;
    }
    if (failedTypes.includes('study')) {
      appData.statistics.studiesFailed =
        (appData.statistics.studiesFailed || 0) + failedStudies.length;
    }

    // Mark daily items as failed and record in history
    failedWorkouts.forEach((item) => {
      item.failed = true;
      // Also add to completedWorkouts history
      if (
        !appData.completedWorkouts.some(
          (w) => w.workoutId === item.workoutId && w.date === item.date
        )
      ) {
        // Buscar informações do workout original
        const originalWorkout =
          appData.workouts?.find((w) => w.id === item.workoutId) ||
          appData.dailyWorkouts?.find((dw) => dw.workoutId === item.workoutId) ||
          {};
        appData.completedWorkouts.push({
          id: createUniqueId(appData.completedWorkouts),
          workoutId: item.workoutId,
          name: originalWorkout.name || 'Treino',
          emoji: originalWorkout.emoji || '💪',
          metric:
            typeof getWorkoutMetric === 'function' ? getWorkoutMetric(originalWorkout) : 'reps',
          goalDirection:
            typeof getWorkoutGoalDirection === 'function'
              ? getWorkoutGoalDirection(originalWorkout)
              : 'maximize',
          usesWeight:
            typeof workoutUsesWeight === 'function'
              ? workoutUsesWeight(originalWorkout)
              : originalWorkout.usesWeight === true,
          date: item.date,
          completedDate: item.date,
          failedDate: item.date,
          failed: true,
          reason: 'Atividade não completada',
        });
      }
    });
    if (failedWorkouts.length > 0 && typeof updateProductiveDay === 'function') {
      updateProductiveDay(0, 0, 0, 0, 0, {
        date: targetDateStr,
        workoutsMissed: failedWorkouts.length,
      });
    }
    failedStudies.forEach((item) => {
      item.failed = true;
      // Also add to completedStudies history
      if (
        !appData.completedStudies.some((s) => s.studyId === item.studyId && s.date === item.date)
      ) {
        // Buscar informações do estudo original
        const originalStudy =
          appData.studies?.find((s) => s.id === item.studyId) ||
          appData.dailyStudies?.find((ds) => ds.studyId === item.studyId) ||
          {};
        appData.completedStudies.push({
          id: createUniqueId(appData.completedStudies),
          studyId: item.studyId,
          name: originalStudy.name || 'Estudo',
          emoji: originalStudy.emoji || '📚',
          type: originalStudy.type || 'logico',
          date: item.date,
          completedDate: item.date,
          failedDate: item.date,
          failed: true,
          reason: 'Atividade não completada',
        });
      }
    });
    if (failedStudies.length > 0 && typeof updateProductiveDay === 'function') {
      updateProductiveDay(0, 0, 0, 0, 0, {
        date: targetDateStr,
        studiesMissed: failedStudies.length,
      });
    }
    if (
      (nutritionFailureCount > 0 || hydrationFailureCount > 0) &&
      typeof updateProductiveDay === 'function'
    ) {
      updateProductiveDay(0, 0, 0, 0, 0, {
        date: targetDateStr,
        nutritionFailed: nutritionFailureCount,
        hydrationFailed: hydrationFailureCount,
      });
    }

    const failedTypesLabel = failedTypes.map((type) => getFailedTypeLabel(type)).join(', ');
    const failedDetails = [
      ...failedMissionEntries.map((entry) => formatFailureDetail('mission', entry)),
      ...failedWorkEntries.map((entry) => formatFailureDetail('work', entry)),
      ...failedWorkouts.map((entry) => formatFailureDetail('workout', entry)),
      ...failedStudies.map((entry) => formatFailureDetail('study', entry)),
      ...(nutritionFailureCount > 0
        ? nutritionMissingMeals.length > 0
          ? nutritionMissingMeals.map((mealLabel) => formatFailureDetail('nutrition', mealLabel))
          : [formatFailureDetail('nutrition')]
        : []),
      ...(hydrationFailureCount > 0 ? [formatFailureDetail('hydration')] : []),
    ].filter(Boolean);
    const failedDetailsLabel =
      failedDetails.length > 0 ? failedDetails.join(', ') : failedTypesLabel;
    const penaltyLogMeta =
      failedTypes.length > 0 &&
      failedTypes.every((type) => type === 'nutrition' || type === 'hydration')
        ? {
            category: failedTypes.includes('nutrition') ? 'nutrition' : 'hydration',
            eventDateKey: targetDateStr,
            status: 'failed',
          }
        : null;

    applyCoinPenalty({
      requestedAmount: totalPenaltyItems,
      failMessage: `Atividades não concluídas: ${failedDetailsLabel}.`,
      failLogTitle: 'Atividades n\u00e3o conclu\u00eddas',
      failLogContent: `Registros com falha: ${failedDetailsLabel}. Streaks resetados e disciplina reduzida.`,
      failLogMeta: penaltyLogMeta,
    });
  }

  updateUI({ mode: 'activity' });
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');

  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }
}

function normalizeWorkoutMetric(metric) {
  const normalizedMetric = String(metric || '').trim();
  if (
    normalizedMetric === 'reps' ||
    normalizedMetric === 'distance' ||
    normalizedMetric === 'duration'
  ) {
    return normalizedMetric;
  }
  return 'reps';
}

function normalizeWorkoutGoalDirection(metric, goalDirection) {
  const normalizedMetric = normalizeWorkoutMetric(metric);
  const normalizedGoal = String(goalDirection || '').trim();
  if (normalizedMetric === 'duration' && normalizedGoal === 'minimize') {
    return 'minimize';
  }
  return 'maximize';
}

function normalizeWorkoutUsesWeight(source, fallbackMetric = '') {
  const resolvedMetric = normalizeWorkoutMetric(
    fallbackMetric ||
      (source && typeof source === 'object' && !Array.isArray(source)
        ? source.metric || source.selection || 'reps'
        : source)
  );
  if (resolvedMetric !== 'reps') return false;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return false;
  return source.usesWeight === true;
}

function normalizeWorkoutModel(source, fallbackGoalDirection = 'maximize') {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const metric = source.metric || source.selection || 'reps';
    const goalDirection = source.goalDirection || fallbackGoalDirection;
    const normalizedModel = normalizeWorkoutModel(metric, goalDirection);
    return {
      ...normalizedModel,
      usesWeight: normalizeWorkoutUsesWeight(source, normalizedModel.metric),
    };
  }

  const normalizedSource = String(source || '').trim();
  if (normalizedSource.includes('|')) {
    const [rawMetric, rawGoalDirection] = normalizedSource.split('|');
    const metric = normalizeWorkoutMetric(rawMetric);
    return {
      metric,
      goalDirection: normalizeWorkoutGoalDirection(
        metric,
        rawGoalDirection || fallbackGoalDirection
      ),
      usesWeight: false,
    };
  }

  const metric = normalizeWorkoutMetric(normalizedSource || 'reps');
  return {
    metric,
    goalDirection: normalizeWorkoutGoalDirection(metric, fallbackGoalDirection),
    usesWeight: false,
  };
}

function getWorkoutTypeConfig(source, fallbackGoalDirection = 'maximize') {
  const { metric, goalDirection, usesWeight } = normalizeWorkoutModel(
    source,
    fallbackGoalDirection
  );
  let label = 'Treino';

  if (metric === 'reps') {
    label = usesWeight ? 'Repetição com carga' : 'Repetição';
  } else if (metric === 'distance') {
    label = 'Distância';
  } else if (metric === 'duration') {
    label = goalDirection === 'minimize' ? 'Contra o tempo' : 'Duração';
  }

  return {
    label,
    metric,
    goalDirection,
    usesWeight,
    selectionValue: `${metric}|${goalDirection}`,
  };
}

function getWorkoutTypeName(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutTypeConfig(source, fallbackGoalDirection).label;
}

function getWorkoutMetric(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutTypeConfig(source, fallbackGoalDirection).metric;
}

function getWorkoutTypeMetric(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutMetric(source, fallbackGoalDirection);
}

function getWorkoutGoalDirection(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutTypeConfig(source, fallbackGoalDirection).goalDirection;
}

function getWorkoutSelectionValue(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutTypeConfig(source, fallbackGoalDirection).selectionValue;
}

function applyWorkoutModel(target, source, fallbackGoalDirection = 'maximize') {
  if (!target || typeof target !== 'object') return target;
  const config = getWorkoutTypeConfig(source, fallbackGoalDirection);
  target.metric = config.metric;
  target.goalDirection = config.goalDirection;
  target.usesWeight = config.usesWeight === true;
  return target;
}

function workoutUsesWeight(source, fallbackGoalDirection = 'maximize') {
  const config = getWorkoutTypeConfig(source, fallbackGoalDirection);
  return config.metric === 'reps' && config.usesWeight === true;
}

function isRepetitionWorkoutType(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutMetric(source, fallbackGoalDirection) === 'reps';
}

function isDistanceWorkoutType(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutMetric(source, fallbackGoalDirection) === 'distance';
}

function isTimedWorkoutType(source, fallbackGoalDirection = 'maximize') {
  return getWorkoutMetric(source, fallbackGoalDirection) === 'duration';
}

// __appImportThemeBridge: exposes import/theme APIs for legacy scripts during module migration
Object.assign(globalThis, {
  handleNutritionFoodSubmit,
  handleImportFoods,
  handleNutritionEntrySubmit,
  handleNutritionGoalsSubmit,
  updateMidnightCountdown,
  updateCurrentDate,
  resetProgress,
  exportData,
  importData,
  normalizeWorkoutMetric,
  normalizeWorkoutGoalDirection,
  normalizeWorkoutModel,
  getWorkoutTypeConfig,
  getWorkoutTypeName,
  getWorkoutMetric,
  getWorkoutTypeMetric,
  getWorkoutGoalDirection,
  getWorkoutSelectionValue,
  applyWorkoutModel,
  workoutUsesWeight,
  isRepetitionWorkoutType,
  isDistanceWorkoutType,
  isTimedWorkoutType,
  getMissionTypeName,
  isRoutineType,
  getRoutineDays,
  getMonthName,
  getDaysNames,
  getDueBadgeHtml,
  formatDate,
  editNamedEmojiItem,
  deleteNamedEmojiItem,
  editWorkout,
  deleteWorkout,
  editStudy,
  deleteStudy,
  editBook,
  deleteBook,
  editMission,
  deleteMission,
  editWork,
  deleteWork,
  editClass,
  setPrimaryClass,
  deleteClass,
  applyPenalties,
  toggleTheme,
  applySavedTheme,
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeWorkoutMetric,
    normalizeWorkoutGoalDirection,
    normalizeWorkoutModel,
    getWorkoutTypeConfig,
    getWorkoutTypeName,
    getWorkoutMetric,
    getWorkoutTypeMetric,
    getWorkoutGoalDirection,
    getWorkoutSelectionValue,
    applyWorkoutModel,
    workoutUsesWeight,
    isRepetitionWorkoutType,
    isDistanceWorkoutType,
    isTimedWorkoutType,
    setPrimaryClass,
    applyPenalties,
  };
}
