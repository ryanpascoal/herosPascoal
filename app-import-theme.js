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
    showFeedback('Informe nome e porção base válidos.', 'warn');
    return;
  }
  const numbers = [kcal, protein, carbs, fat, fiber];
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
    showFeedback('Macros inválidos. Use apenas números positivos.', 'warn');
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
  updateNutritionView();
  showFeedback('Alimento cadastrado com sucesso!', 'success');
}

function handleImportFoods(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showFeedback('Por favor, selecione um arquivo JSON válido.', 'warn');
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
        const portionGrams = Number(item.portionGrams || item.porcao || item.porção || 100);
        const kcal = Number(item.kcal || item.calorias || 0);
        const protein = Number(item.protein || item.proteina || item.proteína || 0);
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

      updateNutritionView();

      if (importedCount > 0) {
        showFeedback(
          `${importedCount} alimento(s) importado(s) com sucesso!${skippedCount > 0 ? ` (${skippedCount} ignorado(s))` : ''}`,
          'success'
        );
      } else {
        showFeedback('Nenhum alimento válido foi encontrado no arquivo.', 'warn');
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
    showFeedback('Selecione um alimento válido.', 'warn');
    return;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    showFeedback('Quantidade inválida.', 'warn');
    return;
  }

  const today = getLocalDateString();
  const mealRewardKey = `${date}|${meal}`;
  const hasMealReward = appData.nutritionStats.rewardedMealKeys.includes(mealRewardKey);
  const entry = {
    id: createUniqueId(appData.nutritionEntries),
    date,
    meal,
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
  };
  appData.nutritionEntries.push(entry);

  if (date === today && !hasMealReward) {
    appData.nutritionStats.rewardedMealKeys.push(mealRewardKey);
    addXP(1);
    addAttributeXP(6, 1);
    appData.hero.coins += 1;
    updateProductiveDay(0, 0, 0, 1, 0);
    addHeroLog(
      'study',
      `Refeição registrada: ${formatMealName(meal)}`,
      `+1 XP, +1 moeda (${food.name})`
    );
  }

  if (!appData.nutritionStats.logDates.includes(date)) {
    appData.nutritionStats.logDates.push(date);
  }
  maybeRewardNutritionGoal(date);
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
  updateNutritionView();
  showFeedback('Refeição registrada!', 'success');
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

// Salvar entrada no diário
async function saveDiaryEntry() {
  const title = (document.getElementById('diary-title').value || '').trim();
  const content = (document.getElementById('diary-content').value || '').trim();

  if (!content) {
    showFeedback('Por favor, escreva algo no diário.', 'warn');
    return;
  }

  const todayStr = getLocalDateString();
  const diaryEntries = diaryDbAvailable ? diaryCache || [] : appData.diaryEntries || [];
  const alreadyRewardedToday = diaryEntries.some((entry) => {
    if (!entry?.date) return false;
    const entryDate = getLocalDateString(new Date(entry.date));
    return entryDate === todayStr && Number(entry.xpGained || 0) > 0;
  });
  const diaryXpGained = alreadyRewardedToday ? 0 : 2;

  const newEntry = {
    id: createUniqueId(diaryDbAvailable ? diaryCache : appData.diaryEntries),
    title: title || 'Sem título',
    content,
    date: new Date().toISOString(),
    // Armazenar também a data local para display rápido
    localDate:
      getLocalDateString() +
      ' ' +
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    xpGained: diaryXpGained,
  };

  await saveDiaryEntryToStorage(newEntry);

  if (diaryXpGained > 0) {
    // Diario: recompensa fixa, no maximo uma vez por dia.
    addAttributeXP(6, 1); // Disciplina
    addAttributeXP(7, 1); // Inteligência
    addAttributeXP(12, 1); // Conhecimento
    appData.hero.coins += 1;
  }

  // Limpar formulário
  document.getElementById('diary-title').value = '';
  document.getElementById('diary-content').value = '';

  // Atualizar UI
  updateUI();

  // Mostrar mensagem de sucesso
  if (diaryXpGained > 0) {
    showFeedback(
      'Entrada salva! +1 XP de Disciplina, +1 XP de Inteligência, +1 XP de Conhecimento e +1 moeda.',
      'success'
    );
  } else {
    showFeedback('Entrada salva! Recompensa de diário já foi aplicada hoje.', 'info');
  }
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
    // Limpar localStorage
    localStorage.removeItem('heroJourneyData');

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

    if (diaryDbAvailable) {
      replaceDiaryEntriesInDB([]).then(() => {
        diaryCache = [];
        window.__suppressSave = true;
        location.reload();
      });
      return;
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
  // Limpar localStorage
  localStorage.removeItem('heroJourneyData');

  // Também limpar dados na nuvem se estiver logado
  if (typeof currentUser !== 'undefined' && currentUser && typeof getProgressRef === 'function') {
    try {
      await getProgressRef(currentUser.uid).delete();
      console.log('Dados na nuvem apagados com sucesso');
    } catch (err) {
      console.error('Erro ao limpar dados na nuvem:', err);
    }
  }

  if (diaryDbAvailable) {
    replaceDiaryEntriesInDB([]).then(() => {
      diaryCache = [];
      window.__suppressSave = true;
      location.reload();
    });
    return;
  }

  // Recarregar a página
  window.__suppressSave = true;
  location.reload();
}

// Exportar dados
async function exportData() {
  const diaryEntries = diaryDbAvailable
    ? await getAllDiaryEntriesFromDB()
    : appData.diaryEntries || [];
  const dataToExport = { ...appData, diaryEntries };
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

        const importedDiaryEntries = Array.isArray(importedData.diaryEntries)
          ? importedData.diaryEntries
          : [];

        // Mesclar com defaults para evitar campos críticos ausentes
        const mergedImport = JSON.parse(JSON.stringify(APP_DEFAULTS));
        mergeData(mergedImport, importedData);
        Object.keys(appData).forEach((key) => delete appData[key]);
        Object.assign(appData, mergedImport);
        ensureDataIntegrity();
        populateFinanceMonthOptions();

        if (diaryDbAvailable) {
          await replaceDiaryEntriesInDB(importedDiaryEntries);
          await refreshDiaryCache();
          appData.diaryEntries = [];
        } else {
          appData.diaryEntries = importedDiaryEntries;
          diaryCache = appData.diaryEntries;
          diaryLoaded = true;
        }

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
function getWorkoutTypeName(type) {
  const types = {
    repeticao: 'Repetição',
    distancia: 'Distância',
    'maior-tempo': 'Maior Tempo',
    'menor-tempo': 'Menor Tempo',
  };
  return types[type] || type;
}

function getMissionTypeName(type) {
  const types = {
    diaria: 'Diária',
    semanal: 'Semanal',
    eventual: 'Eventual',
    epica: 'Épica',
  };
  return types[type] || type;
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
function editWorkout(id) {
  editNamedEmojiItem({
    list: appData.workouts,
    id,
    namePrompt: 'Novo nome do treino:',
    emojiPrompt: 'Novo emoji (opcional):',
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
  editNamedEmojiItem({
    list: appData.studies,
    id,
    namePrompt: 'Novo nome do estudo:',
    emojiPrompt: 'Novo emoji (opcional):',
    updateMode: 'activity',
  });
}

function deleteStudy(id) {
  deleteNamedEmojiItem({
    list: appData.studies,
    id,
    confirmText: 'Tem certeza que deseja excluir este estudo?',
    successText: 'Estudo excluído com sucesso!',
    updateMode: 'activity',
  });
}

function editMission(id) {
  const mission = appData.missions.find((m) => m.id === id);
  if (!mission) return;

  (async () => {
    const newName = await askInput('Novo nome da missão:', {
      title: 'Editar missão',
      defaultValue: mission.name,
    });
    if (newName === null) return;
    if (newName.trim()) mission.name = newName.trim();

    const newEmoji = await askInput('Novo emoji (opcional):', {
      title: 'Editar missão',
      defaultValue: mission.emoji || '',
    });
    if (newEmoji !== null && newEmoji.trim()) mission.emoji = newEmoji.trim();

    await maybeEditItemDeadline(mission, { title: 'Editar missão' });

    updateUI({ mode: 'activity' });
    showFeedback('Missão atualizada com sucesso!', 'success');
  })();
}

function deleteMission(id) {
  deleteNamedEmojiItem({
    list: appData.missions,
    id,
    confirmText: 'Tem certeza que deseja excluir esta missão?',
    successText: 'Missão excluída com sucesso!',
    updateMode: 'activity',
  });
}

function editWork(id) {
  const work = appData.works.find((w) => w.id === id);
  if (!work) return;

  (async () => {
    const newName = await askInput('Novo nome do trabalho:', {
      title: 'Editar trabalho',
      defaultValue: work.name,
    });
    if (newName === null) return;
    if (newName.trim()) work.name = newName.trim();

    const newEmoji = await askInput('Novo emoji (opcional):', {
      title: 'Editar trabalho',
      defaultValue: work.emoji || '',
    });
    if (newEmoji !== null && newEmoji.trim()) work.emoji = newEmoji.trim();

    await maybeEditItemDeadline(work, { title: 'Editar trabalho' });

    updateUI({ mode: 'activity' });
    showFeedback('Trabalho atualizado com sucesso!', 'success');
  })();
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

  if (isRestDay(targetDateStr)) {
    return;
  }

  const logMissedWeeklyItems = (list, completedList, typeLabel, entryType) => {
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const missed = list.filter(
      (item) =>
        item &&
        item.type === 'semanal' &&
        !item.completed &&
        !item.failed &&
        Array.isArray(item.days) &&
        item.days.includes(dayOfWeek)
    );
    if (missed.length === 0) return 0;
    let added = 0;
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
      completedList.push({
        ...item,
        completedDate: targetDateStr,
        failedDate: targetDateStr,
        failed: true,
        ...(entryType === 'mission' || entryType === 'work' ? { penaltyApplied: true } : {}),
        reason: `Não concluída no dia (${typeLabel} semanal)`,
      });
      added++;
    });
    return added;
  };

  // Check for failed activities by type - only 1 life lost per type
  let livesLost = 0;
  let shieldUsed = false;
  const failedTypes = [];

  // Check workouts - was there any failed workout on this day?
  let failedWorkouts = [];
  if (shouldCheckType('workout')) {
    failedWorkouts = appData.dailyWorkouts.filter(
      (item) => item.date === targetDateStr && !item.completed && !item.skipped && !item.failed
    );
  }
  if (shouldCheckType('workout') && failedWorkouts.length > 0) {
    failedTypes.push('workout');
  } else if (shouldCheckType('workout')) {
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const scheduledWorkouts = appData.workouts.filter(
      (w) => Array.isArray(w.days) && w.days.some((d) => normalizeWeekdayValue(d) === dayOfWeek)
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
    failedStudies = appData.dailyStudies.filter(
      (item) => item.date === targetDateStr && !item.completed && !item.skipped && !item.failed
    );
  }
  if (shouldCheckType('study') && failedStudies.length > 0) {
    failedTypes.push('study');
  } else if (shouldCheckType('study')) {
    const dayOfWeek = parseLocalDateString(targetDateStr).getDay();
    const scheduledStudies = appData.studies.filter(
      (s) => Array.isArray(s.days) && s.days.some((d) => normalizeWeekdayValue(d) === dayOfWeek)
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
  if (shouldCheckType('mission')) {
    const failedMissions = appData.completedMissions.filter(
      (m) => m.failedDate === targetDateStr && m.failed && m.penaltyApplied !== true
    );
    if (failedMissions.length > 0) {
      failedTypes.push('mission');
      failedMissions.forEach((m) => {
        m.penaltyApplied = true;
      });
    }

    // Processar missões diárias que falharam (não foram completadas)
    const missedDailyMissions = (appData.missions || []).filter(
      (m) =>
        m.type === 'diaria' &&
        !m.completed &&
        !m.failed &&
        m.dateAdded &&
        m.dateAdded < targetDateStr
    );
    missedDailyMissions.forEach((mission) => {
      // Verificar se já foi registrada como falha
      const alreadyLogged = appData.completedMissions.some(
        (entry) =>
          entry.failed &&
          (entry.originalId || entry.id) === (mission.originalId || mission.id) &&
          entry.failedDate === targetDateStr
      );
      if (!alreadyLogged) {
        appData.completedMissions.push({
          ...mission,
          completedDate: targetDateStr,
          failedDate: targetDateStr,
          failed: true,
          penaltyApplied: true,
          reason: 'Missão diária não completada',
        });
      }
    });
    // Remover missões diárias falhadas da lista ativa
    if (missedDailyMissions.length > 0) {
      const idsToRemove = new Set(missedDailyMissions.map((m) => m.id));
      appData.missions = (appData.missions || []).filter((m) => !idsToRemove.has(m.id));
      if (!failedTypes.includes('mission')) {
        failedTypes.push('mission');
      }
    }

    const missedWeeklyMissions = logMissedWeeklyItems(
      appData.missions || [],
      appData.completedMissions || [],
      'missão',
      'mission'
    );
    if (missedWeeklyMissions > 0 && !failedTypes.includes('mission')) {
      failedTypes.push('mission');
    }
  }

  // Check works - was there any failed work on this day?
  if (shouldCheckType('work')) {
    const failedWorks = appData.completedWorks.filter(
      (w) => w.failedDate === targetDateStr && w.failed && w.penaltyApplied !== true
    );
    if (failedWorks.length > 0) {
      failedTypes.push('work');
      failedWorks.forEach((w) => {
        w.penaltyApplied = true;
      });
    }

    // Processar trabalhos diários que falharam (não foram completados)
    const missedDailyWorks = (appData.works || []).filter(
      (w) =>
        w.type === 'diaria' &&
        !w.completed &&
        !w.failed &&
        w.dateAdded &&
        w.dateAdded < targetDateStr
    );
    missedDailyWorks.forEach((work) => {
      // Verificar se já foi registrada como falha
      const alreadyLogged = appData.completedWorks.some(
        (entry) =>
          entry.failed &&
          (entry.originalId || entry.id) === (work.originalId || work.id) &&
          entry.failedDate === targetDateStr
      );
      if (!alreadyLogged) {
        appData.completedWorks.push({
          ...work,
          completedDate: targetDateStr,
          failedDate: targetDateStr,
          failed: true,
          penaltyApplied: true,
          reason: 'Trabalho diário não completado',
        });
      }
    });
    // Remover trabalhos diários falhados da lista ativa
    if (missedDailyWorks.length > 0) {
      const idsToRemove = new Set(missedDailyWorks.map((w) => w.id));
      appData.works = (appData.works || []).filter((w) => !idsToRemove.has(w.id));
      if (!failedTypes.includes('work')) {
        failedTypes.push('work');
      }
    }

    const missedWeeklyWorks = logMissedWeeklyItems(
      appData.works || [],
      appData.completedWorks || [],
      'trabalho',
      'work'
    );
    if (missedWeeklyWorks > 0 && !failedTypes.includes('work')) {
      failedTypes.push('work');
    }
  }

  // Check nutrition - was there any food logged on this day?
  // Only penalize if not a rest day and nutrition tracking is active
  const nutritionActive =
    (appData.nutritionEntries && appData.nutritionEntries.length > 0) ||
    (appData.foodItems && appData.foodItems.length > 0) ||
    (appData.nutritionStats?.logDates && appData.nutritionStats.logDates.length > 0);
  const hasNutritionLog = appData.nutritionStats?.logDates?.includes(targetDateStr);
  if (
    shouldCheckType('nutrition') &&
    nutritionActive &&
    !hasNutritionLog &&
    !isRestDay(targetDateStr)
  ) {
    // Check if there's any nutrition goal/activity that was expected
    // For now, we assume nutrition should be logged daily
    // You can modify this condition if nutrition should not be required every day
    failedTypes.push('nutrition');
  }

  // Check diary - was there any diary entry on this day?
  // Only penalize if not a rest day
  const diaryEntries = diaryDbAvailable ? diaryCache || [] : appData.diaryEntries || [];
  const diaryActive = diaryLoaded && diaryEntries.length > 0;
  const hasDiaryEntry = diaryEntries.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.localDate === 'string' && entry.localDate.length >= 10) {
      return entry.localDate.slice(0, 10) === targetDateStr;
    }
    if (typeof entry.date === 'string' && entry.date.length >= 10) {
      const isoPrefix = entry.date.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix) && isoPrefix === targetDateStr) {
        return true;
      }
    }
    if (!entry.date) return false;
    const parsed = new Date(entry.date);
    return Number.isFinite(parsed.getTime()) && getLocalDateString(parsed) === targetDateStr;
  });
  if (shouldCheckType('diary') && diaryActive && !hasDiaryEntry && !isRestDay(targetDateStr)) {
    failedTypes.push('diary');
  }

  // Check hydration - penalize every day the goal is not met
  if (shouldCheckType('hydration') && appData.hydration && appData.hydration.startDate) {
    if (targetDateStr >= appData.hydration.startDate) {
      const hydrationGoalHit = appData.hydration.goalHitDates?.includes(targetDateStr);
      if (!hydrationGoalHit) {
        failedTypes.push('hydration');
      }
    }
  }

  // Now apply penalties - 1 life per failed type
  failedTypes.forEach((type) => {
    if (appData.hero.protection?.shield) {
      appData.hero.protection.shield = false;
      shieldUsed = true;
      return;
    }
    appData.hero.lives = Math.max(0, appData.hero.lives - 1);
    livesLost++;
  });

  // Apply streak and XP penalties based on the types that failed
  if (livesLost > 0) {
    // Reset streaks
    appData.hero.streak.general = 0;

    // Reset physical streak if workout failed
    if (failedTypes.includes('workout')) {
      appData.hero.streak.physical = 0;
    }

    // Reset mental streak if study failed
    if (failedTypes.includes('study')) {
      appData.hero.streak.mental = 0;
    }

    // Remove XP from Disciplina attribute
    addAttributeXP(6, -1);

    // Update statistics
    if (!appData.statistics) appData.statistics = {};
    if (failedTypes.includes('mission')) {
      appData.statistics.missionsFailed = (appData.statistics.missionsFailed || 0) + 1;
    }
    if (failedTypes.includes('work')) {
      appData.statistics.worksFailed = (appData.statistics.worksFailed || 0) + 1;
    }
    if (failedTypes.includes('workout')) {
      appData.statistics.workoutsIgnored =
        (appData.statistics.workoutsIgnored || 0) + failedWorkouts.length;
    }
    if (failedTypes.includes('study')) {
      appData.statistics.studiesIgnored =
        (appData.statistics.studiesIgnored || 0) + failedStudies.length;
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
          type: originalWorkout.type || 'normal',
          date: item.date,
          completedDate: item.date,
          failedDate: item.date,
          failed: true,
          reason: 'Atividade não completada',
        });
      }
    });
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

    // Build failure message
    let failMessage = 'Você perdeu vidas por não completar atividades: ';
    failMessage +=
      failedTypes
        .map((t) => {
          if (t === 'workout') return 'treino';
          if (t === 'study') return 'estudo';
          if (t === 'mission') return 'missão';
          if (t === 'work') return 'trabalho';
          if (t === 'nutrition') return 'alimentação';
          if (t === 'diary') return 'diário';
          return t;
        })
        .join(', ') + '.';

    showFeedback(failMessage, 'error');

    // Log to hero log
    addHeroLog(
      'penalty',
      'Atividades não concluídas',
      `Você perdeu ${livesLost} vida(s). Tipos com falha: ${failedTypes.join(', ')}. Streaks resetados.`
    );

    handleGameOverIfNeeded();
  } else if (shieldUsed) {
    showFeedback('Escudo consumido! Você evitou perder vidas.', 'warn');
    addHeroLog(
      'penalty',
      'Escudo consumido',
      'Atividades não concluídas, penalidade evitada pelo escudo.'
    );
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

// __appImportThemeBridge: exposes import/theme APIs for legacy scripts during module migration
Object.assign(globalThis, {
  handleNutritionFoodSubmit,
  handleImportFoods,
  handleNutritionEntrySubmit,
  handleNutritionGoalsSubmit,
  updateMidnightCountdown,
  updateCurrentDate,
  saveDiaryEntry,
  resetProgress,
  exportData,
  importData,
  getWorkoutTypeName,
  getMissionTypeName,
  getMonthName,
  getDaysNames,
  getDueBadgeHtml,
  formatDate,
  editNamedEmojiItem,
  deleteNamedEmojiItem,
  validateIsoDateInput,
  maybeEditItemDeadline,
  editWorkout,
  deleteWorkout,
  editStudy,
  deleteStudy,
  editMission,
  deleteMission,
  editWork,
  deleteWork,
  editClass,
  deleteClass,
  applyPenalties,
  toggleTheme,
  applySavedTheme,
});
