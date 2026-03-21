function handleItemFormSubmit(e) {
  e.preventDefault();

  const category = document.getElementById('modal-item-category').value;

  switch (category) {
    case 'workout':
      handleNewWorkout();
      break;

    case 'study':
      handleNewStudy();
      break;

    case 'book':
      handleNewBook();
      break;

    case 'complete-workout':
      handleWorkoutCompletion();
      break;

    case 'complete-study':
      handleStudyCompletion();
      break;

    case 'complete-mission':
      handleMissionCompletion();
      break;

    case 'complete-work':
      handleWorkCompletion();
      break;
  }

  closeModal();
}

// Manipular novo treino
function handleNewWorkout() {
  const name = document.getElementById('modal-item-name').value;
  const emoji = document.getElementById('modal-item-emoji').value;
  const type = document.getElementById('modal-item-type').value;

  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
  const newWorkout = createWorkoutPayload(name, emoji, type, days);

  appData.workouts.push(newWorkout);
  updateUI();
  showFeedback('Treino cadastrado com sucesso!', 'success');
}

// Manipular novo estudo
function handleNewStudy() {
  const name = document.getElementById('modal-item-name').value;
  const emoji = document.getElementById('modal-item-emoji').value;
  const type = document.getElementById('modal-item-type').value;

  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');
  const newStudy = createStudyPayload(name, emoji, type, days);

  appData.studies.push(newStudy);
  updateUI();
  showFeedback('Estudo cadastrado com sucesso!', 'success');
}

// Manipular novo livro
function handleNewBook() {
  const name = document.getElementById('book-name').value;
  const author = document.getElementById('book-author').value;
  const emoji = document.getElementById('book-emoji').value;

  const newBook = {
    id: createUniqueId(appData.books),
    name,
    author: author || '',
    emoji: emoji || '📖',
    completed: false,
    dateAdded: getLocalDateString(),
  };

  appData.books.push(newBook);
  updateUI();
  showFeedback('Livro cadastrado com sucesso!', 'success');
}

// Manipular conclusão de treino
function handleWorkoutCompletion() {
  const workoutDayId = parseInt(document.getElementById('workout-day-id').value);
  const feedback = document.getElementById('workout-feedback')?.value || '';

  const workoutDay = appData.dailyWorkouts.find((dw) => dw.id === workoutDayId);
  if (!workoutDay) return;

  const workout = appData.workouts.find((w) => w.id === workoutDay.workoutId);
  if (!workout) return;

  // Atualizar valores
  if (workout.type === 'repeticao') {
    const series1 = parseInt(document.querySelector('input[name="series-0"]')?.value || 0);
    const series2 = parseInt(document.querySelector('input[name="series-1"]')?.value || 0);
    const series3 = parseInt(document.querySelector('input[name="series-2"]')?.value || 0);

    workoutDay.series = [series1, series2, series3];

    // Calcular total de repetições
    const totalReps = series1 + series2 + series3;

    // Atualizar estatísticas do treino
    if (!workout.stats) workout.stats = {};
    workout.stats.totalReps = (workout.stats.totalReps || 0) + totalReps;
    workout.stats.bestReps = Math.max(workout.stats.bestReps || 0, totalReps);
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  } else if (workout.type === 'distancia') {
    const distance = parseFloat(document.querySelector('input[name="distance"]')?.value || 0);
    const time = parseFloat(document.querySelector('input[name="time"]')?.value || 0);
    workoutDay.distance = distance;
    workoutDay.time = time;

    if (!workout.stats) workout.stats = {};
    workout.stats.totalDistance = (workout.stats.totalDistance || 0) + distance;
    workout.stats.bestDistance = Math.max(workout.stats.bestDistance || 0, distance);
    workout.stats.totalTime = (workout.stats.totalTime || 0) + time;
    if (time > 0) {
      if (workout.stats.bestTime === undefined || time < workout.stats.bestTime) {
        workout.stats.bestTime = time;
      }
    }
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  } else if (workout.type === 'maior-tempo' || workout.type === 'menor-tempo') {
    const time = parseFloat(document.querySelector('input[name="time"]')?.value || 0);
    workoutDay.time = time;

    if (!workout.stats) workout.stats = {};
    workout.stats.totalTime = (workout.stats.totalTime || 0) + time;

    if (workout.type === 'menor-tempo') {
      if (workout.stats.bestTime === undefined || time < workout.stats.bestTime) {
        workout.stats.bestTime = time;
      }
    } else {
      workout.stats.bestTime = Math.max(workout.stats.bestTime || 0, time);
    }
    workout.stats.completed = (workout.stats.completed || 0) + 1;
  }

  workoutDay.completed = true;
  workoutDay.feedback = feedback;

  // Adicionar feedback
  if (feedback) {
    appData.feedbacks.push({
      type: 'workout',
      activityId: workoutDay.workoutId,
      feedback: feedback,
      date: new Date().toISOString(),
    });
  }

  // Registrar no histórico de treinos (evitar duplicidade)
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
      completedDate: getLocalDateString(),
      failed: false,
      series: workoutDay.series || [null, null, null],
      distance: workoutDay.distance ?? null,
      time: workoutDay.time ?? null,
      feedback: workoutDay.feedback || '',
    });
  }

  // Calcular XP e recompensas
  let xpGained = 3; // XP geral base

  // XP de vigor (sempre)
  addAttributeXP(2, 1); // Vigor

  // XP adicional baseado no tipo de treino
  if (workout.type === 'menor-tempo') {
    addAttributeXP(3, 1); // Agilidade
  }

  if (workout.type === 'repeticao' || workout.type === 'maior-tempo') {
    addAttributeXP(1, 1); // Força
  }

  if (workout.type === 'distancia') {
    addAttributeXP(6, 1); // Disciplina
  }

  // Adicionar XP ao treino
  workout.xp += 10;
  if (workout.xp >= 100) {
    workout.xp = 0;
    workout.level++;
  }

  // Adicionar XP geral
  addXP(xpGained);

  // Adicionar moedas
  appData.hero.coins += 1;

  // Atualizar streak

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.workoutsDone = (appData.statistics.workoutsDone || 0) + 1;

  // Atualizar dia produtivo
  updateProductiveDay(1, 0, 0, xpGained);

  addHeroLog('workout', `Treino concluído: ${workout.name}`, `+${xpGained} XP, +1 moeda`);

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-workouts',
    xp: xpGained,
    coins: 1,
    message: 'Treino concluído com sucesso!',
  });
  saveToLocalStorage();
}

// Manipular conclusão de estudo via modal
function handleStudyCompletion() {
  const studyDayId = parseInt(document.getElementById('study-day-id').value);
  const feedback = document.getElementById('study-feedback')?.value || '';

  completeStudy(studyDayId, feedback);
}

// Manipular conclusão de missão via modal
function handleMissionCompletion() {
  const missionId = parseInt(document.getElementById('mission-id').value);
  const feedback = document.getElementById('mission-feedback')?.value || '';

  completeMission(missionId, feedback);
}

function handleWorkCompletion() {
  const workId = parseInt(document.getElementById('work-id').value, 10);
  const feedback = document.getElementById('work-feedback')?.value || '';
  completeWork(workId, feedback);
}

// Concluir estudo
function completeStudy(studyDayId, feedbackText = '') {
  const studyDay = appData.dailyStudies.find((ds) => ds.id === studyDayId);
  if (!studyDay) return;

  const study = appData.studies.find((s) => s.id === studyDay.studyId);
  if (!study) return;

  // Marcar como concluído
  studyDay.completed = true;
  studyDay.feedback = feedbackText;

  // Registrar no histórico de estudos (evitar duplicidade)
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
      completedDate: getLocalDateString(),
      failed: false,
      applied: !!studyDay.applied,
      feedback: studyDay.feedback || '',
    });
  }

  // Adicionar feedback
  if (feedbackText) {
    appData.feedbacks.push({
      type: 'study',
      activityId: studyDay.studyId,
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  // Calcular XP
  let xpGained = 1; // XP geral base
  let knowledgeXP = 1; // XP de conhecimento base

  // XP de conhecimento
  addAttributeXP(12, knowledgeXP);

  // 3 XP de criatividade se for do tipo criativo
  if (study.type === 'criativo') {
    addAttributeXP(5, 3); // Criatividade
  }

  // Bônus se foi aplicado
  if (studyDay.applied) {
    xpGained += 2; // +2 XP geral
    addAttributeXP(12, 2); // +2 XP de conhecimento
    addAttributeXP(7, 3); // +3 XP de inteligência
  }

  // Adicionar XP ao estudo
  study.xp += 5;
  if (study.xp >= 100) {
    study.xp = 0;
    study.level++;
  }

  // Atualizar estatísticas do estudo
  if (!study.stats) study.stats = {};
  study.stats.completed = (study.stats.completed || 0) + 1;
  if (studyDay.applied) {
    study.stats.applied = (study.stats.applied || 0) + 1;
  }

  // Adicionar XP geral
  addXP(xpGained);

  // Adicionar moedas
  appData.hero.coins += 1;

  // Atualizar streak

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.studiesDone = (appData.statistics.studiesDone || 0) + 1;

  // Atualizar dia produtivo
  updateProductiveDay(0, 0, 1, xpGained);

  addHeroLog(
    'study',
    `Estudo concluído: ${study.name}`,
    `+${xpGained} XP, +1 moeda${studyDay.applied ? ' (aplicado)' : ''}`
  );

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-studies',
    xp: xpGained,
    coins: 1,
    message: 'Estudo concluído com sucesso!',
  });
  saveToLocalStorage();
}

// Concluir livro
function completeBook(bookId) {
  const book = appData.books.find((b) => b.id === bookId);
  if (!book) return;

  book.completed = true;
  book.dateCompleted = getLocalDateString();

  // Adicionar XP
  addXP(20); // 20 XP geral
  addAttributeXP(12, 20); // 20 XP de conhecimento

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.booksRead = (appData.statistics.booksRead || 0) + 1;

  addHeroLog('book', `Livro concluído: ${book.name}`, '+20 XP');

  showFeedback('Livro concluído com sucesso!', 'success');
  updateUI();
}

// Manipular envio do formulário de missão
function handleClassSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('class-name')?.value?.trim();
  const emoji = document.getElementById('class-emoji')?.value?.trim();
  if (!name) return;

  const newClass = {
    id: createUniqueId(appData.classes),
    name,
    emoji: emoji || '💼',
    xp: 0,
    maxXp: 100,
    level: 0,
  };

  appData.classes.push(newClass);
  if (!appData.hero.primaryClassId) {
    appData.hero.primaryClassId = newClass.id;
  }

  e.target.reset();
  updateUI();
  showFeedback('Classe cadastrada com sucesso!', 'success');
}

function handleMissionSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('mission-name').value;
  const emoji = document.getElementById('mission-emoji').value;
  const type = document.getElementById('mission-type').value;

  // Obter atributos selecionados
  const attributeCheckboxes = document.querySelectorAll(
    '#mission-attributes input[type="checkbox"]:checked'
  );
  const attributes = Array.from(attributeCheckboxes).map((cb) => parseInt(cb.value));

  const newMission = {
    id: createUniqueId(appData.missions, appData.completedMissions),
    name,
    emoji: emoji || '🎯',
    type,
    attributes,
    completed: false,
    dateAdded: getLocalDateString(),
  };
  if (type === 'diaria' || type === 'semanal') {
    newMission.originalId = newMission.id;
  }

  // Adicionar campos específicos por tipo
  if (type === 'semanal') {
    const dayCheckboxes = document.querySelectorAll(
      '#mission-days-container input[type="checkbox"]:checked'
    );
    const selectedDays = Array.from(dayCheckboxes).map((cb) => parseInt(cb.value, 10));
    if (selectedDays.length === 0) {
      showFeedback('Selecione pelo menos um dia da semana para missão semanal.', 'warn');
      return;
    }
    newMission.days = selectedDays;
  } else if (type === 'eventual') {
    const date = document.getElementById('mission-date').value;
    newMission.date = date || getLocalDateString();
  } else if (type === 'epica') {
    const deadline = document.getElementById('mission-deadline').value;
    newMission.deadline = deadline;
  }

  appData.missions.push(newMission);

  // Limpar formulário
  e.target.reset();

  // Atualizar UI
  updateUI();

  // Mostrar mensagem de sucesso
  showFeedback('Missão cadastrada com sucesso!', 'success');
}

function handleWorkSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('work-name').value;
  const emoji = document.getElementById('work-emoji').value;
  const type = document.getElementById('work-type').value;
  const classIdRaw = document.getElementById('work-class')?.value;
  const classId = classIdRaw ? parseInt(classIdRaw, 10) : null;

  const attributeCheckboxes = document.querySelectorAll(
    '#work-attributes input[type="checkbox"]:checked'
  );
  const attributes = Array.from(attributeCheckboxes).map((cb) => parseInt(cb.value, 10));
  const isUrgent = document.getElementById('work-urgent')?.checked === true;

  const newWork = {
    id: createUniqueId(appData.works, appData.completedWorks),
    name,
    emoji: emoji || '💼',
    type,
    attributes,
    classId: Number.isFinite(classId) ? classId : null,
    completed: false,
    urgent: isUrgent,
    dateAdded: getLocalDateString(),
  };
  if (type === 'diaria' || type === 'semanal') {
    newWork.originalId = newWork.id;
  }

  if (type === 'semanal') {
    const dayCheckboxes = document.querySelectorAll(
      '#work-days-container input[type="checkbox"]:checked'
    );
    const selectedDays = Array.from(dayCheckboxes).map((cb) => parseInt(cb.value, 10));
    if (selectedDays.length === 0) {
      showFeedback('Selecione pelo menos um dia da semana para trabalho semanal.', 'warn');
      return;
    }
    newWork.days = selectedDays;
  } else if (type === 'eventual') {
    const date = document.getElementById('work-date').value;
    newWork.date = date || getLocalDateString();
  } else if (type === 'epica') {
    const deadline = document.getElementById('work-deadline').value;
    newWork.deadline = deadline;
  }

  appData.works.push(newWork);
  e.target.reset();
  updateUI();
  showFeedback('Trabalho cadastrado com sucesso!', 'success');
}

// Manipular envio do formulário de treino
function handleWorkoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('workout-name').value;
  const emoji = document.getElementById('workout-emoji').value;
  const type = document.getElementById('workout-type').value;

  // Obter dias selecionados
  const days = getCheckedDays('#workout-form .days-selector input[type="checkbox"]:checked');
  const newWorkout = createWorkoutPayload(name, emoji, type, days);

  appData.workouts.push(newWorkout);

  // Limpar formulário
  e.target.reset();

  // Atualizar UI
  updateUI();

  // Mostrar mensagem de sucesso
  showFeedback('Treino cadastrado com sucesso!', 'success');
}

// Manipular envio do formulário de estudo
function handleStudySubmit(e) {
  e.preventDefault();

  const name = document.getElementById('study-name').value;
  const emoji = document.getElementById('study-emoji').value;
  const type = document.getElementById('study-type').value;

  // Obter dias selecionados
  const days = getCheckedDays('#study-form .days-selector input[type="checkbox"]:checked');
  const newStudy = createStudyPayload(name, emoji, type, days);

  appData.studies.push(newStudy);

  // Limpar formulário
  e.target.reset();

  // Atualizar UI
  updateUI();

  // Mostrar mensagem de sucesso
  showFeedback('Estudo cadastrado com sucesso!', 'success');
}

function handleFinanceSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('finance-type').value;
  const amount = parseFloat(document.getElementById('finance-amount').value);
  const category = document.getElementById('finance-category').value.trim();
  const description = document.getElementById('finance-desc').value.trim();

  if (!type || isNaN(amount) || amount <= 0) {
    showFeedback('Informe um valor válido.', 'warn');
    return;
  }

  appData.financeEntries.push({
    id: createUniqueId(appData.financeEntries),
    type,
    amount,
    category,
    description,
    date: getLocalDateString(),
  });

  e.target.reset();
  updateUI({ mode: 'finance' });
}

//Formulário de missão baseado no tipo
function updateMissionForm(missionType) {
  const daysContainer = document.getElementById('mission-days-container');
  const dateContainer = document.getElementById('mission-date-container');
  const deadlineContainer = document.getElementById('mission-deadline-container');

  // Esconder todos os containers
  daysContainer.style.display = 'none';
  dateContainer.style.display = 'none';
  deadlineContainer.style.display = 'none';

  // Mostrar o container apropriado
  switch (missionType) {
    case 'semanal':
      daysContainer.style.display = 'block';
      break;
    case 'eventual':
      dateContainer.style.display = 'block';
      // Usar a nova função para obter data local correta
      document.getElementById('mission-date').value = getLocalDateString();
      break;
    case 'epica':
      deadlineContainer.style.display = 'block';
      // Definir prazo padrão para uma semana a partir de hoje
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      document.getElementById('mission-deadline').value = getLocalDateString(nextWeek);
      break;
  }
}

function updateWorkForm(workType) {
  const daysContainer = document.getElementById('work-days-container');
  const dateContainer = document.getElementById('work-date-container');
  const deadlineContainer = document.getElementById('work-deadline-container');
  if (!daysContainer || !dateContainer || !deadlineContainer) return;

  daysContainer.style.display = 'none';
  dateContainer.style.display = 'none';
  deadlineContainer.style.display = 'none';

  switch (workType) {
    case 'semanal':
      daysContainer.style.display = 'block';
      break;
    case 'eventual':
      dateContainer.style.display = 'block';
      document.getElementById('work-date').value = getLocalDateString();
      break;
    case 'epica':
      deadlineContainer.style.display = 'block';
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      document.getElementById('work-deadline').value = getLocalDateString(nextWeek);
      break;
  }
}

// Completar uma missão (função corrigida - VERSÃO FINAL)
function completeMission(missionId, feedbackText = '') {
  const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
  if (missionIndex === -1) return;

  const mission = appData.missions[missionIndex];
  const todayStr = getLocalDateString();
  const isWeekly = mission.type === 'semanal';

  // Marcar como concluída (sem remover itens semanais da lista)
  if (!isWeekly) {
    mission.completed = true;
    mission.completedDate = todayStr;
  }

  // Registrar feedback (opcional)
  if (feedbackText) {
    mission.feedback = feedbackText;
    appData.feedbacks.push({
      type: 'mission',
      activityId: missionId,
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  // 1. PRIMEIRO: Mover para missões concluídas
  appData.completedMissions.push({
    ...mission,
    completed: true,
    completedDate: todayStr,
  });

  // 2. SEGUNDO: Remover da lista de missões ativas (IMEDIATAMENTE)
  if (!isWeekly) {
    appData.missions.splice(missionIndex, 1);
  }

  // 3. Se for missão diária, recriar para amanhã
  if (mission.type === 'diaria') {
    recreateDailyMissionForTomorrow(mission);
  }

  // 4. Aplicar recompensas
  let xpGained = 1;
  let coinsGained = 1;

  if (mission.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    mission.attributes.forEach((attrId) => {
      const attrXp = attrId === 14 ? 100 : 20;
      addAttributeXP(attrId, attrXp);
    });
  } else {
    mission.attributes.forEach((attrId) => {
      const attrXp = attrId === 14 ? 20 : 1;
      addAttributeXP(attrId, attrXp);
    });
  }

  // Adicionar XP e moedas
  addXP(xpGained);
  appData.hero.coins += coinsGained;

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.missionsDone = (appData.statistics.missionsDone || 0) + 1;
  updateProductiveDay(0, 1, 0, xpGained);

  addHeroLog(
    'mission',
    `Missão concluída: ${mission.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s)`
  );

  // 5. ATUALIZAR UI IMEDIATAMENTE (ANTES DO ALERT)
  updateUI({ mode: 'activity' });

  // 6. Mostrar feedback visual
  const missionDoneMessage = `Missão "${mission.name}" concluída! ${mission.type === 'diaria' ? 'Ela reaparecerá amanhã.' : ''}`;
  celebrateAction({
    containerSelector: '#daily-missions',
    xp: xpGained,
    coins: coinsGained,
    message: missionDoneMessage,
  });
  saveToLocalStorage();
}

function completeWork(workId, feedbackText = '') {
  const workIndex = appData.works.findIndex((w) => w.id === workId);
  if (workIndex === -1) return;

  const work = appData.works[workIndex];
  const todayStr = getLocalDateString();
  const isWeekly = work.type === 'semanal';

  if (!isWeekly) {
    work.completed = true;
    work.completedDate = todayStr;
  }

  if (feedbackText) {
    work.feedback = feedbackText;
    appData.feedbacks.push({
      type: 'work',
      activityId: workId,
      feedback: feedbackText,
      date: new Date().toISOString(),
    });
  }

  appData.completedWorks.push({
    ...work,
    completed: true,
    completedDate: todayStr,
  });
  if (!isWeekly) {
    appData.works.splice(workIndex, 1);
  }

  if (work.type === 'diaria') {
    recreateDailyWorkForTomorrow(work);
  }

  let xpGained = 1;
  let coinsGained = 1;
  if (work.type === 'epica') {
    xpGained = 20;
    coinsGained = 10;
    (work.attributes || []).forEach((attrId) => {
      const attrXp = attrId === 14 ? 100 : 20;
      addAttributeXP(attrId, attrXp);
    });
  } else {
    (work.attributes || []).forEach((attrId) => {
      addAttributeXP(attrId, 1);
    });
  }

  if (work.classId) {
    addClassXP(work.classId, xpGained);
  }

  addXP(xpGained);
  appData.hero.coins += coinsGained;
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.worksDone = (appData.statistics.worksDone || 0) + 1;
  updateProductiveDay(0, 0, 0, xpGained, 1);

  addHeroLog(
    'mission',
    `Trabalho concluído: ${work.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s)`
  );

  updateUI({ mode: 'activity' });
  celebrateAction({
    containerSelector: '#daily-works',
    xp: xpGained,
    coins: coinsGained,
    message: `Trabalho "${work.name}" concluído! ${work.type === 'diaria' ? 'Ele reaparecerá amanhã.' : ''}`,
  });
  saveToLocalStorage();
}

// Recriar missão diária para o próximo dia (VERSÃO CORRIGIDA)
function recreateDailyMissionForTomorrow(originalMission) {
  const tomorrow = getGameNow();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  // Criar nova missão com os mesmos dados, mas com data DE AMANHÃ
  const newMission = {
    id: createUniqueId(appData.missions, appData.completedMissions),
    originalId: originalMission.originalId || originalMission.id,
    name: originalMission.name,
    emoji: originalMission.emoji || '🎯',
    type: 'diaria',
    attributes: [...originalMission.attributes],
    completed: false,
    dateAdded: tomorrowStr,
    availableDate: tomorrowStr,
  };

  // Adicionar à lista de missões
  appData.missions.push(newMission);

  console.log(
    `Missão diária "${originalMission.name}" recriada para ${tomorrowStr} (disponível amanhã)`
  );
}

// Recriar missão semanal para o próximo dia agendado da semana
function recreateWeeklyMissionForNextWeek(originalMission) {
  if (!originalMission.days || originalMission.days.length === 0) {
    console.log(
      `Missão semanal "${originalMission.name}" não tem dias agendados, não será recriada`
    );
    return;
  }

  const today = getGameNow();
  const currentDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.

  // Encontrar o próximo dia agendado
  let nextDay = null;
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDayOfWeek + i + 1) % 7;
    if (originalMission.days.includes(checkDay)) {
      nextDay = checkDay;
      break;
    }
  }

  if (nextDay === null) {
    console.log(`Missão semanal "${originalMission.name}" não tem próximo dia agendado`);
    return;
  }

  // Calcular a data do próximo dia agendado
  const nextDate = new Date(today);
  const daysUntilNext = (nextDay - currentDayOfWeek + 7) % 7;
  if (daysUntilNext === 0) {
    nextDate.setDate(nextDate.getDate() + 7); // Se é hoje, vai para próxima semana
  } else {
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
  }
  const nextDateStr = getLocalDateString(nextDate);

  // Criar nova missão semanal para o próximo dia
  const newMission = {
    id: createUniqueId(appData.missions, appData.completedMissions),
    originalId: originalMission.originalId || originalMission.id,
    name: originalMission.name,
    emoji: originalMission.emoji || '🎯',
    type: 'semanal',
    attributes: [...originalMission.attributes],
    days: [...originalMission.days],
    completed: false,
    dateAdded: nextDateStr,
    availableDate: nextDateStr,
    lastShownWeek: getWeekKey(nextDate),
  };

  // Adicionar à lista de missões
  appData.missions.push(newMission);

  console.log(
    `Missão semanal "${originalMission.name}" recriada para ${nextDateStr} (dia ${nextDay})`
  );
}

// Recriar missões diárias para o dia atual (VERSÃO CORRIGIDA)
function recreateDailyMissionsForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Encontrar missões diárias de ontem (concluídas, falhadas ou puladas), 1 por linhagem
  const yesterdayDailyMissionsByLineage = new Map();
  appData.completedMissions.forEach((mission) => {
    if (mission.type !== 'diaria') return;
    const missionDate = mission.completedDate || mission.failedDate || mission.skippedDate;
    if (missionDate !== yesterdayStr) return;
    const lineageKey = String(mission.originalId || mission.id);
    if (!yesterdayDailyMissionsByLineage.has(lineageKey)) {
      yesterdayDailyMissionsByLineage.set(lineageKey, mission);
    }
  });

  // Recriar cada missão diária de ontem para hoje
  yesterdayDailyMissionsByLineage.forEach((originalMission, lineageKey) => {
    // Verificar se já existe uma missão igual disponível HOJE
    const alreadyExists = appData.missions.some(
      (mission) =>
        mission.type === 'diaria' &&
        String(mission.originalId || mission.id) === lineageKey &&
        mission.dateAdded === todayStr
    );

    if (!alreadyExists) {
      const newMission = {
        id: createUniqueId(appData.missions, appData.completedMissions),
        originalId: originalMission.originalId || originalMission.id,
        name: originalMission.name,
        emoji: originalMission.emoji || '🎯',
        type: 'diaria',
        attributes: [...originalMission.attributes],
        completed: false,
        dateAdded: todayStr,
        availableDate: todayStr, // Disponível HOJE
      };

      appData.missions.push(newMission);
      console.log(`Missão diária "${originalMission.name}" recriada para HOJE (${todayStr})`);
    }
  });
}

// Limpar missões diárias antigas que não foram completadas
function cleanupOldDailyMissions() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Remover missões diárias com dateAdded de ontem ou anterior que não foram concluídas
  // (isso limpa missões que o usuário pulou)
  const missionsToRemove = [];

  appData.missions.forEach((mission, index) => {
    if (
      mission.type === 'diaria' &&
      !mission.completed &&
      !mission.failed &&
      mission.dateAdded &&
      mission.dateAdded < todayStr
    ) {
      const failedDate = mission.dateAdded;
      const alreadyLogged = appData.completedMissions.some(
        (entry) =>
          entry.failed &&
          (entry.failedDate === failedDate || entry.completedDate === failedDate) &&
          (entry.originalId || entry.id) === (mission.originalId || mission.id)
      );
      if (!alreadyLogged) {
        appData.completedMissions.push({
          ...mission,
          completedDate: failedDate,
          failedDate: failedDate,
          failed: true,
          reason: 'Não concluída no dia',
        });
      }
      console.log(
        `Removendo missão diária antiga: ${mission.name} (adicionada em ${mission.dateAdded})`
      );
      missionsToRemove.push(index);
    }
  });

  missionsToRemove.sort((a, b) => b - a);
  missionsToRemove.forEach((index) => {
    appData.missions.splice(index, 1);
  });

  if (missionsToRemove.length > 0) {
    console.log(`Removidas ${missionsToRemove.length} missões diárias antigas`);
  }
}

function recreateDailyWorkForTomorrow(originalWork) {
  const tomorrow = getGameNow();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const newWork = {
    id: createUniqueId(appData.works, appData.completedWorks),
    originalId: originalWork.originalId || originalWork.id,
    name: originalWork.name,
    emoji: originalWork.emoji || '💼',
    type: 'diaria',
    attributes: [...originalWork.attributes],
    classId: originalWork.classId || null,
    completed: false,
    dateAdded: tomorrowStr,
    availableDate: tomorrowStr,
  };

  appData.works.push(newWork);
}

// Recriar trabalho semanal para o próximo dia agendado da semana
function recreateWeeklyWorkForNextWeek(originalWork) {
  if (!originalWork.days || originalWork.days.length === 0) {
    console.log(
      `Trabalho semanal "${originalWork.name}" não tem dias agendados, não será recriado`
    );
    return;
  }

  const today = getGameNow();
  const currentDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.

  // Encontrar o próximo dia agendado
  let nextDay = null;
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDayOfWeek + i + 1) % 7;
    if (originalWork.days.includes(checkDay)) {
      nextDay = checkDay;
      break;
    }
  }

  if (nextDay === null) {
    console.log(`Trabalho semanal "${originalWork.name}" não tem próximo dia agendado`);
    return;
  }

  // Calcular a data do próximo dia agendado
  const nextDate = new Date(today);
  const daysUntilNext = (nextDay - currentDayOfWeek + 7) % 7;
  if (daysUntilNext === 0) {
    nextDate.setDate(nextDate.getDate() + 7); // Se é hoje, vai para próxima semana
  } else {
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
  }
  const nextDateStr = getLocalDateString(nextDate);

  // Criar novo trabalho semanal para o próximo dia
  const newWork = {
    id: createUniqueId(appData.works, appData.completedWorks),
    originalId: originalWork.originalId || originalWork.id,
    name: originalWork.name,
    emoji: originalWork.emoji || '💼',
    type: 'semanal',
    attributes: [...originalWork.attributes],
    days: [...originalWork.days],
    classId: originalWork.classId || null,
    completed: false,
    dateAdded: nextDateStr,
    availableDate: nextDateStr,
    lastShownWeek: getWeekKey(nextDate),
  };

  // Adicionar à lista de trabalhos
  appData.works.push(newWork);

  console.log(
    `Trabalho semanal "${originalWork.name}" recriado para ${nextDateStr} (dia ${nextDay})`
  );
}

function recreateDailyWorksForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const yesterdayDailyWorksByLineage = new Map();
  appData.completedWorks.forEach((work) => {
    if (work.type !== 'diaria') return;
    const workDate = work.completedDate || work.failedDate || work.skippedDate;
    if (workDate !== yesterdayStr) return;
    const lineageKey = String(work.originalId || work.id);
    if (!yesterdayDailyWorksByLineage.has(lineageKey)) {
      yesterdayDailyWorksByLineage.set(lineageKey, work);
    }
  });

  yesterdayDailyWorksByLineage.forEach((originalWork, lineageKey) => {
    const alreadyExists = appData.works.some(
      (work) =>
        work.type === 'diaria' &&
        String(work.originalId || work.id) === lineageKey &&
        work.dateAdded === todayStr
    );

    if (!alreadyExists) {
      appData.works.push({
        id: createUniqueId(appData.works, appData.completedWorks),
        originalId: originalWork.originalId || originalWork.id,
        name: originalWork.name,
        emoji: originalWork.emoji || '💼',
        type: 'diaria',
        attributes: [...originalWork.attributes],
        classId: originalWork.classId || null,
        completed: false,
        dateAdded: todayStr,
        availableDate: todayStr,
      });
    }
  });
}

function cleanupOldDailyWorks() {
  const todayStr = getLocalDateString();
  const worksToRemove = [];

  appData.works.forEach((work, index) => {
    if (
      work.type === 'diaria' &&
      !work.completed &&
      !work.failed &&
      work.dateAdded &&
      work.dateAdded < todayStr
    ) {
      const failedDate = work.dateAdded;
      const alreadyLogged = appData.completedWorks.some(
        (entry) =>
          entry.failed &&
          (entry.failedDate === failedDate || entry.completedDate === failedDate) &&
          (entry.originalId || entry.id) === (work.originalId || work.id)
      );
      if (!alreadyLogged) {
        appData.completedWorks.push({
          ...work,
          completedDate: failedDate,
          failedDate: failedDate,
          failed: true,
          reason: 'Não concluído no dia',
        });
      }
      worksToRemove.push(index);
    }
  });

  worksToRemove.sort((a, b) => b - a);
  worksToRemove.forEach((index) => {
    appData.works.splice(index, 1);
  });
}

// Atualizar dia produtivo
function updateProductiveDay(workouts = 0, missions = 0, studies = 0, xp = 0, works = 0) {
  const today = getLocalDateString();

  if (!appData.statistics) appData.statistics = {};
  if (!appData.statistics.productiveDays) {
    appData.statistics.productiveDays = {};
  }

  if (!appData.statistics.productiveDays[today]) {
    appData.statistics.productiveDays[today] = {
      workouts: 0,
      missions: 0,
      works: 0,
      studies: 0,
      totalXP: 0,
    };
  }

  appData.statistics.productiveDays[today].workouts += workouts;
  appData.statistics.productiveDays[today].missions += missions;
  appData.statistics.productiveDays[today].works += works;
  appData.statistics.productiveDays[today].studies += studies;
  appData.statistics.productiveDays[today].totalXP += xp;
}

// Comprar item (atualizado para verificar nível)
function buyItem(itemId) {
  const item = appData.shopItems.find((i) => i.id === itemId);
  if (!item) return;

  // Verificar nível
  if (appData.hero.level < item.level) {
    showToast(`Você precisa estar no nível ${item.level} para comprar este item!`, 'warn');
    return;
  }

  // Verificar se tem moedas suficientes
  if (appData.hero.coins < item.cost) {
    showToast('Moedas insuficientes!', 'warn');
    return;
  }

  // Subtrair moedas
  appData.hero.coins -= item.cost;

  // Adicionar ao inventário
  appData.inventory.push({
    id: itemId,
    purchaseDate: new Date().toISOString(),
  });

  // Atualizar UI
  updateUI({ mode: 'shop' });

  // Mostrar feedback de compra
  celebrateAction({
    containerSelector: '#shop-items',
    coins: -item.cost,
    message: `${item.name} comprado com sucesso!`,
  });
  addHeroLog('item', `Item comprado: ${item.name}`, `-${item.cost} moedas`);
}

// Usar item do inventário (atualizado para remover apenas 1 unidade)
async function useItem(itemId) {
  // Encontrar o primeiro item deste tipo no inventário
  const itemIndex = appData.inventory.findIndex((i) => i.id === itemId);
  if (itemIndex === -1) return;

  const item = appData.shopItems.find((i) => i.id === itemId);
  if (!item) return;

  // Remover apenas 1 unidade do inventário
  appData.inventory.splice(itemIndex, 1);

  // Aplicar efeito
  switch (item.effect) {
    case 'heal':
      if (
        Number.isFinite(appData.hero.lives) &&
        Number.isFinite(appData.hero.maxLives) &&
        appData.hero.lives < appData.hero.maxLives
      ) {
        appData.hero.lives++;
        showToast('Poção usada! Vida restaurada.', 'success');
        celebrateAction({ containerSelector: '#inventory-items', message: '+1 vida aplicada' });
        addHeroLog('item', 'Poção usada', '+1 vida');
      } else {
        showToast('Você já está com vida máxima!', 'warn');
        // Devolver ao inventário
        appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
      }
      break;

    case 'shield':
      showToast(
        'Escudo ativado! Você está protegido contra o próximo dano e quebra de streak.',
        'success'
      );
      celebrateAction({ containerSelector: '#inventory-items', message: 'Escudo equipado' });
      // Aqui você precisaria implementar a lógica de escudo
      // Por exemplo, adicionar uma flag de proteção ao herói
      if (!appData.hero.protection) appData.hero.protection = {};
      appData.hero.protection.shield = true;
      addHeroLog('item', 'Escudo ativado', 'O próximo dano e quebra de streak serão evitados.');
      break;

    case 'skip':
      // Token de pulo e consumido automaticamente ao pular atividades.
      appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
      showFeedback('O item de pulo é usado ao clicar em "Pular" nas atividades.', 'info');
      break;

    case 'custom':
      showFeedback(`${item.name} usado! Recompensa: ${item.description}`, 'success');
      // Aqui você pode adicionar lógica personalizada para itens customizados
      addHeroLog('item', `Item usado: ${item.name}`, item.description || 'Recompensa aplicada.');
      break;
  }

  // Atualizar UI
  updateUI();
}

// Adicionar XP ao herói
function addXP(amount) {
  appData.hero.xp += amount;

  // Verificar se subiu de nível
  while (appData.hero.xp >= appData.hero.maxXp) {
    appData.hero.xp -= appData.hero.maxXp;
    appData.hero.level++;
    appData.hero.maxXp = Math.floor(appData.hero.maxXp * 1.5); // Aumentar XP necessário para próximo nível

    // Mostrar mensagem de novo nível
    showToast(`Parabéns! Você alcançou o nível ${appData.hero.level}!`, 'success', 2800);
    celebrateAction({
      target: document.getElementById('level'),
      message: 'Novo nível alcançado!',
    });
    addHeroLog(
      'level',
      `Nível ${appData.hero.level} alcançado`,
      `Novo XP necessário: ${appData.hero.maxXp}`
    );
  }
}

// Adicionar XP a um atributo
function addAttributeXP(attributeId, amount) {
  const attribute = appData.attributes.find((a) => a.id === attributeId);
  if (!attribute) return;

  const oldXp = Number.isFinite(attribute.xp) ? attribute.xp : 0;
  attribute.xp = Math.max(0, oldXp + amount);

  // Verificar se subiu de nível
  const oldLevel = Math.floor(oldXp / 100);
  const newLevel = Math.floor(attribute.xp / 100);

  if (newLevel > oldLevel) {
    // Mostrar mensagem de novo nível do atributo
    console.log(`Atributo ${attribute.name} alcançou o nível ${newLevel}!`);
  }

  // Ajustar maxXp se necessário
  attribute.maxXp = (newLevel + 1) * 100;
  attribute.level = newLevel;
}

// Causar dano aos chefões baseado em atributos
function addClassXP(classId, amount) {
  if (!Array.isArray(appData.classes)) return;
  const cls = appData.classes.find((c) => c.id === classId);
  if (!cls) return;

  cls.xp += amount;

  const oldLevel = Math.floor((cls.xp - amount) / 100);
  const newLevel = Math.floor(cls.xp / 100);

  if (newLevel > oldLevel) {
    console.log(`Classe ${cls.name} alcançou o nível ${newLevel}!`);
  }

  cls.maxXp = (newLevel + 1) * 100;
  cls.level = newLevel;
}

function generateHeroLogs() {
  const container = document.getElementById('hero-logs');
  if (!container) return;

  container.innerHTML = '';

  if (!appData.heroLogs || appData.heroLogs.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum registro ainda.</p>';
    return;
  }

  const recentLogs = appData.heroLogs.slice(-20).reverse();

  const logIcons = {
    mission: '🎯',
    workout: '💪',
    study: '📚',
    book: '📖',
    level: '🏆',
    item: '🎁',
    rest: '🌙',
    penalty: '⚠️',
    system: '⚙️',
  };

  recentLogs.forEach((log) => {
    const logElement = document.createElement('div');
    logElement.className = `log-item ${log.type || 'system'}`;
    // Validação segura para data
    let logDate = 'Data desconhecida';
    if (log.date) {
      try {
        const d = new Date(log.date);
        if (!isNaN(d.getTime())) {
          logDate = d.toLocaleString('pt-BR');
        }
      } catch (e) {
        logDate = 'Data inválida';
      }
    }
    const icon = logIcons[log.type] || '📝';
    // Usar textContent para evitar XSS
    const iconEl = document.createElement('div');
    iconEl.className = 'log-icon';
    iconEl.textContent = icon;

    const contentEl = document.createElement('div');
    contentEl.className = 'log-content';

    const titleEl = document.createElement('div');
    titleEl.className = 'log-title';
    titleEl.textContent = log.title || '';

    const textEl = document.createElement('div');
    textEl.className = 'log-text';
    textEl.textContent = log.content || '';

    const dateEl = document.createElement('div');
    dateEl.className = 'log-text';
    dateEl.textContent = logDate;

    contentEl.appendChild(titleEl);
    contentEl.appendChild(textEl);
    contentEl.appendChild(dateEl);

    logElement.appendChild(iconEl);
    logElement.appendChild(contentEl);
    container.appendChild(logElement);
  });
}

// Inicializar gráficos

// __appActionsBridge: exposes action APIs for legacy scripts during module migration
Object.assign(globalThis, {
  handleItemFormSubmit,
  handleNewWorkout,
  handleNewStudy,
  handleNewBook,
  handleWorkoutCompletion,
  handleStudyCompletion,
  handleMissionCompletion,
  handleWorkCompletion,
  completeStudy,
  completeBook,
  handleClassSubmit,
  handleMissionSubmit,
  handleWorkSubmit,
  handleWorkoutSubmit,
  handleStudySubmit,
  handleFinanceSubmit,
  updateMissionForm,
  updateWorkForm,
  completeMission,
  completeWork,
  recreateDailyMissionForTomorrow,
  recreateWeeklyMissionForNextWeek,
  recreateDailyMissionsForToday,
  cleanupOldDailyMissions,
  recreateDailyWorkForTomorrow,
  recreateWeeklyWorkForNextWeek,
  recreateDailyWorksForToday,
  cleanupOldDailyWorks,
  updateProductiveDay,
  buyItem,
  useItem,
  addXP,
  addAttributeXP,
  addClassXP,
  generateHeroLogs,
});
