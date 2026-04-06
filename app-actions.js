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

    case 'edit-workout':
      handleEditWorkout();
      break;

    case 'edit-study':
      handleEditStudy();
      break;

    case 'book':
      handleNewBook();
      break;

    case 'edit-book':
      handleEditBook();
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

function handleEditWorkout() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const workout = appData.workouts.find((item) => item.id === id);
  if (!workout) return;

  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value.trim();
  const type = document.getElementById('modal-item-type').value;
  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');

  if (!name) {
    showFeedback('Informe um nome válido para o treino.', 'warn');
    return;
  }

  workout.name = name;
  workout.emoji = emoji || '💪';
  workout.type = type;
  workout.days = days;

  updateUI({ mode: 'activity' });
  showFeedback('Treino atualizado com sucesso!', 'success');
}

function handleEditStudy() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const study = appData.studies.find((item) => item.id === id);
  if (!study) return;

  const name = document.getElementById('modal-item-name').value.trim();
  const emoji = document.getElementById('modal-item-emoji').value.trim();
  const type = document.getElementById('modal-item-type').value;
  const days = getCheckedDays('#item-form .days-selector input[type="checkbox"]:checked');

  if (!name) {
    showFeedback('Informe um nome válido para o estudo.', 'warn');
    return;
  }

  study.name = name;
  study.emoji = emoji || '📚';
  study.type = type;
  study.days = days;

  updateUI({ mode: 'activity' });
  showFeedback('Estudo atualizado com sucesso!', 'success');
}

// Manipular novo livro
function handleNewBook() {
  const name = document.getElementById('book-name').value;
  const author = document.getElementById('book-author').value;
  const emoji = document.getElementById('book-emoji').value;
  const status = document.getElementById('book-status')?.value || 'quero-ler';

  appData.books.push(createBookPayload(name, emoji, status, author));
  updateUI();
  showFeedback('Livro cadastrado com sucesso!', 'success');
}

function handleEditBook() {
  const id = parseInt(document.getElementById('modal-item-id').value, 10);
  const book = appData.books.find((item) => item.id === id);
  if (!book) return;

  const name = document.getElementById('book-name').value.trim();
  const author = document.getElementById('book-author').value.trim();
  const emoji = document.getElementById('book-emoji').value.trim();
  const status = document.getElementById('book-status')?.value || 'quero-ler';

  if (!name) {
    showFeedback('Informe um nome válido para o livro.', 'warn');
    return;
  }

  book.name = name;
  book.author = author;
  book.emoji = emoji || '📖';
  if (!book.completed) {
    book.status = status === 'lendo' ? 'lendo' : 'quero-ler';
  }

  updateUI({ mode: 'activity' });
  showFeedback('Livro atualizado com sucesso!', 'success');
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
  updateProductiveDay(1, 0, 0, xpGained, 0, { xpWorkout: xpGained });

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
  updateProductiveDay(0, 0, 1, xpGained, 0, { xpStudy: xpGained });

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
  if (book.completed || book.status === 'concluido') return;

  book.completed = true;
  book.status = 'concluido';
  book.dateCompleted = getLocalDateString();

  // Adicionar XP
  addXP(20); // 20 XP geral
  addAttributeXP(12, 20); // 20 XP de conhecimento

  // Atualizar estatísticas
  if (!appData.statistics) appData.statistics = {};
  appData.statistics.booksRead = (appData.statistics.booksRead || 0) + 1;
  updateProductiveDay(0, 0, 0, 20, 0, { xpBook: 20 });

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

function updateActivityForm() {
  const category = document.getElementById('activity-category')?.value || 'mission';
  const scheduleType = document.getElementById('activity-schedule-type')?.value || 'rotina';

  const scheduleContainer = document.getElementById('activity-schedule-container');
  const workoutTypeContainer = document.getElementById('activity-workout-type-container');
  const studyTypeContainer = document.getElementById('activity-study-type-container');
  const daysContainer = document.getElementById('activity-days-container');
  const dateContainer = document.getElementById('activity-date-container');
  const deadlineContainer = document.getElementById('activity-deadline-container');
  const attributesContainer = document.getElementById('activity-attributes-container');
  const classContainer = document.getElementById('activity-class-container');
  const urgentContainer = document.getElementById('activity-urgent-container');
  const bookAuthorContainer = document.getElementById('activity-book-author-container');
  const bookStatusContainer = document.getElementById('activity-book-status-container');

  if (!scheduleContainer) return;

  const isMission = category === 'mission';
  const isWork = category === 'work';
  const isWorkout = category === 'workout';
  const isStudy = category === 'study';
  const isBook = category === 'book';
  const supportsScheduleType = isMission || isWork;

  scheduleContainer.style.display = supportsScheduleType ? 'block' : 'none';
  workoutTypeContainer.style.display = isWorkout ? 'block' : 'none';
  studyTypeContainer.style.display = isStudy ? 'block' : 'none';
  if (bookAuthorContainer) bookAuthorContainer.style.display = isBook ? 'block' : 'none';
  if (bookStatusContainer) bookStatusContainer.style.display = isBook ? 'block' : 'none';
  attributesContainer.style.display = isMission || isWork ? 'block' : 'none';
  classContainer.style.display = isWork ? 'block' : 'none';
  urgentContainer.style.display = isWork ? 'block' : 'none';

  daysContainer.style.display = 'none';
  dateContainer.style.display = 'none';
  deadlineContainer.style.display = 'none';

  if (!supportsScheduleType || scheduleType === 'rotina') {
    daysContainer.style.display = 'block';
  } else if (scheduleType === 'eventual') {
    dateContainer.style.display = 'block';
    const dateInput = document.getElementById('activity-date');
    if (dateInput && !dateInput.value) dateInput.value = getLocalDateString();
  } else if (scheduleType === 'epica') {
    deadlineContainer.style.display = 'block';
    const deadlineInput = document.getElementById('activity-deadline');
    if (deadlineInput && !deadlineInput.value) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      deadlineInput.value = getLocalDateString(nextWeek);
    }
  }
}

function handleActivitySubmit(e) {
  e.preventDefault();

  const category = document.getElementById('activity-category')?.value || 'mission';
  const name = document.getElementById('activity-name')?.value?.trim();
  const emoji = document.getElementById('activity-emoji')?.value?.trim();
  const scheduleType = document.getElementById('activity-schedule-type')?.value || 'rotina';
  const daySelector =
    '#activity-days-container input[type="checkbox"]:checked:not([data-select-all])';
  const selectedDays = Array.from(document.querySelectorAll(daySelector)).map((cb) =>
    parseInt(cb.value, 10)
  );

  if (!name) {
    showFeedback('Informe um nome válido para a atividade.', 'warn');
    return;
  }

  if ((category === 'mission' || category === 'work' || category === 'workout' || category === 'study') && selectedDays.length === 0 && (category === 'workout' || category === 'study' || scheduleType === 'rotina')) {
    showFeedback('Selecione pelo menos um dia da semana.', 'warn');
    return;
  }

  if (category === 'mission') {
    const attributes = Array.from(
      document.querySelectorAll('#activity-attributes input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value, 10));
    const newMission = {
      id: createUniqueId(appData.missions, appData.completedMissions),
      name,
      emoji: emoji || '🎯',
      type: scheduleType,
      attributes,
      completed: false,
      dateAdded: getLocalDateString(),
    };
    if (scheduleType === 'rotina') {
      newMission.days = selectedDays;
      newMission.originalId = newMission.id;
    } else if (scheduleType === 'eventual') {
      newMission.date = document.getElementById('activity-date')?.value || getLocalDateString();
    } else {
      newMission.deadline = document.getElementById('activity-deadline')?.value || '';
    }
    appData.missions.push(newMission);
  } else if (category === 'work') {
    const attributes = Array.from(
      document.querySelectorAll('#activity-attributes input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value, 10));
    const classIdRaw = document.getElementById('activity-class')?.value;
    const classId = classIdRaw ? parseInt(classIdRaw, 10) : null;
    const newWork = {
      id: createUniqueId(appData.works, appData.completedWorks),
      name,
      emoji: emoji || '💼',
      type: scheduleType,
      attributes,
      classId: Number.isFinite(classId) ? classId : null,
      completed: false,
      urgent: document.getElementById('activity-urgent')?.checked === true,
      dateAdded: getLocalDateString(),
    };
    if (scheduleType === 'rotina') {
      newWork.days = selectedDays;
      newWork.originalId = newWork.id;
    } else if (scheduleType === 'eventual') {
      newWork.date = document.getElementById('activity-date')?.value || getLocalDateString();
    } else {
      newWork.deadline = document.getElementById('activity-deadline')?.value || '';
    }
    appData.works.push(newWork);
  } else if (category === 'workout') {
    const workoutType = document.getElementById('activity-workout-type')?.value || 'repeticao';
    appData.workouts.push(createWorkoutPayload(name, emoji, workoutType, selectedDays));
  } else if (category === 'study') {
    const studyType = document.getElementById('activity-study-type')?.value || 'logico';
    appData.studies.push(createStudyPayload(name, emoji, studyType, selectedDays));
  } else if (category === 'book') {
    const author = document.getElementById('activity-book-author')?.value?.trim() || '';
    const status = document.getElementById('activity-book-status')?.value || 'quero-ler';
    appData.books.push(createBookPayload(name, emoji, status, author));
  }

  e.target.reset();
  updateActivityForm();
  updateUI({ mode: 'activity' });
  showFeedback('Atividade cadastrada com sucesso!', 'success');
}

//Formulário de missão baseado no tipo
// Completar uma missão (função corrigida - VERSÃO FINAL)
function completeMission(missionId, feedbackText = '') {
  const missionIndex = appData.missions.findIndex((m) => m.id === missionId);
  if (missionIndex === -1) return;

  const mission = appData.missions[missionIndex];
  const todayStr = getLocalDateString();
  const isRoutine = isRoutineType(mission.type);

  // Marcar como concluída (sem remover itens semanais da lista)
  if (!isRoutine) {
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
  if (!isRoutine) {
    appData.missions.splice(missionIndex, 1);
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
  updateProductiveDay(0, 1, 0, xpGained, 0, { xpMission: xpGained });

  addHeroLog(
    'mission',
    `Missão concluída: ${mission.name}`,
    `+${xpGained} XP, +${coinsGained} moeda(s)`
  );

  // 5. ATUALIZAR UI IMEDIATAMENTE (ANTES DO ALERT)
  updateUI({ mode: 'activity' });

  // 6. Mostrar feedback visual
  const missionDoneMessage = `Missão "${mission.name}" concluída! ${
    isRoutine ? 'Ela reaparecerá conforme os dias marcados.' : ''
  }`;
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
  const isRoutine = isRoutineType(work.type);

  if (!isRoutine) {
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
  if (!isRoutine) {
    appData.works.splice(workIndex, 1);
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
  updateProductiveDay(0, 0, 0, xpGained, 1, { xpWork: xpGained });

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
    message: `Trabalho "${work.name}" concluído! ${
      isRoutine ? 'Ele reaparecerá conforme os dias marcados.' : ''
    }`,
  });
  saveToLocalStorage();
}

// Recriar rotinas para o dia atual
function recreateDailyMissionsForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const yesterdayRoutineMissionsByLineage = new Map();
  appData.completedMissions.forEach((mission) => {
    if (!isRoutineType(mission.type)) return;
    const missionDate = mission.completedDate || mission.failedDate || mission.skippedDate;
    if (missionDate !== yesterdayStr) return;
    const lineageKey = String(mission.originalId || mission.id);
    if (!yesterdayRoutineMissionsByLineage.has(lineageKey)) {
      yesterdayRoutineMissionsByLineage.set(lineageKey, mission);
    }
  });

  yesterdayRoutineMissionsByLineage.forEach((originalMission, lineageKey) => {
    const alreadyExists = appData.missions.some(
      (mission) =>
        isRoutineType(mission.type) &&
        String(mission.originalId || mission.id) === lineageKey &&
        mission.dateAdded === todayStr
    );

    if (!alreadyExists) {
      const newMission = {
        id: createUniqueId(appData.missions, appData.completedMissions),
        originalId: originalMission.originalId || originalMission.id,
        name: originalMission.name,
        emoji: originalMission.emoji || '🎯',
        type: 'rotina',
        attributes: [...originalMission.attributes],
        days: getRoutineDays(originalMission),
        completed: false,
        dateAdded: todayStr,
      };

      appData.missions.push(newMission);
      console.log(`Rotina "${originalMission.name}" recriada para hoje (${todayStr})`);
    }
  });
}

// Limpar rotinas antigas que não foram completadas
function cleanupOldDailyMissions() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const missionsToRemove = [];

  appData.missions.forEach((mission, index) => {
    if (
      isRoutineType(mission.type) &&
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
      console.log(`Removendo rotina antiga: ${mission.name} (adicionada em ${mission.dateAdded})`);
      missionsToRemove.push(index);
    }
  });

  missionsToRemove.sort((a, b) => b - a);
  missionsToRemove.forEach((index) => {
    appData.missions.splice(index, 1);
  });

  if (missionsToRemove.length > 0) {
    console.log(`Removidas ${missionsToRemove.length} rotinas antigas de missões`);
  }
}

function recreateDailyWorksForToday() {
  const today = getGameNow();
  const todayStr = getLocalDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const yesterdayRoutineWorksByLineage = new Map();
  appData.completedWorks.forEach((work) => {
    if (!isRoutineType(work.type)) return;
    const workDate = work.completedDate || work.failedDate || work.skippedDate;
    if (workDate !== yesterdayStr) return;
    const lineageKey = String(work.originalId || work.id);
    if (!yesterdayRoutineWorksByLineage.has(lineageKey)) {
      yesterdayRoutineWorksByLineage.set(lineageKey, work);
    }
  });

  yesterdayRoutineWorksByLineage.forEach((originalWork, lineageKey) => {
    const alreadyExists = appData.works.some(
      (work) =>
        isRoutineType(work.type) &&
        String(work.originalId || work.id) === lineageKey &&
        work.dateAdded === todayStr
    );

    if (!alreadyExists) {
      appData.works.push({
        id: createUniqueId(appData.works, appData.completedWorks),
        originalId: originalWork.originalId || originalWork.id,
        name: originalWork.name,
        emoji: originalWork.emoji || '💼',
        type: 'rotina',
        attributes: [...originalWork.attributes],
        days: getRoutineDays(originalWork),
        classId: originalWork.classId || null,
        completed: false,
        dateAdded: todayStr,
      });
    }
  });
}

function cleanupOldDailyWorks() {
  const todayStr = getLocalDateString();
  const worksToRemove = [];

  appData.works.forEach((work, index) => {
    if (
      isRoutineType(work.type) &&
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

function ensureProductiveDaySnapshot(data = {}) {
  return {
    workouts: Number(data.workouts || 0),
    missions: Number(data.missions || 0),
    works: Number(data.works || 0),
    studies: Number(data.studies || 0),
    workoutsMissed: Number(data.workoutsMissed || 0),
    missionsMissed: Number(data.missionsMissed || 0),
    worksMissed: Number(data.worksMissed || 0),
    studiesMissed: Number(data.studiesMissed || 0),
    xpMission: Number(data.xpMission || 0),
    xpWork: Number(data.xpWork || 0),
    xpWorkout: Number(data.xpWorkout || 0),
    xpStudy: Number(data.xpStudy || 0),
    xpBook: Number(data.xpBook || 0),
    totalXP: Number(data.totalXP || 0),
  };
}

function ensureProductiveDayEntry(dateKey = getLocalDateString()) {
  const safeDateKey = dateKey || getLocalDateString();

  if (!appData.statistics) appData.statistics = {};
  if (!appData.statistics.productiveDays) {
    appData.statistics.productiveDays = {};
  }

  appData.statistics.productiveDays[safeDateKey] = ensureProductiveDaySnapshot(
    appData.statistics.productiveDays[safeDateKey]
  );

  return appData.statistics.productiveDays[safeDateKey];
}

// Atualizar dia produtivo
function updateProductiveDay(
  workouts = 0,
  missions = 0,
  studies = 0,
  xp = 0,
  works = 0,
  options = {}
) {
  const productiveDay = ensureProductiveDayEntry(options.date || getLocalDateString());

  productiveDay.workouts += Number(workouts || 0);
  productiveDay.missions += Number(missions || 0);
  productiveDay.works += Number(works || 0);
  productiveDay.studies += Number(studies || 0);
  productiveDay.workoutsMissed += Number(options.workoutsMissed || 0);
  productiveDay.missionsMissed += Number(options.missionsMissed || 0);
  productiveDay.worksMissed += Number(options.worksMissed || 0);
  productiveDay.studiesMissed += Number(options.studiesMissed || 0);
  productiveDay.xpMission += Number(options.xpMission || 0);
  productiveDay.xpWork += Number(options.xpWork || 0);
  productiveDay.xpWorkout += Number(options.xpWorkout || 0);
  productiveDay.xpStudy += Number(options.xpStudy || 0);
  productiveDay.xpBook += Number(options.xpBook || 0);
  productiveDay.totalXP += Number(xp || 0);
}

function rebuildProductiveDaysFromHistory() {
  if (!appData.statistics) appData.statistics = {};

  const rebuilt = {};
  const previousProductiveDays = appData.statistics.productiveDays || {};

  Object.entries(previousProductiveDays).forEach(([dateKey, data]) => {
    if (!dateKey) return;
    rebuilt[dateKey] = ensureProductiveDaySnapshot({
      totalXP: data?.totalXP || 0,
      xpMission: data?.xpMission || 0,
      xpWork: data?.xpWork || 0,
      xpWorkout: data?.xpWorkout || 0,
      xpStudy: data?.xpStudy || 0,
      xpBook: data?.xpBook || 0,
    });
  });

  const registerEntry = (entry, counts) => {
    const dateKey =
      entry?.completedDate || entry?.failedDate || entry?.skippedDate || entry?.date || '';
    if (!dateKey) return;
    const day = rebuilt[dateKey] || ensureProductiveDaySnapshot();
    day.workouts += Number(counts.workouts || 0);
    day.missions += Number(counts.missions || 0);
    day.works += Number(counts.works || 0);
    day.studies += Number(counts.studies || 0);
    day.workoutsMissed += Number(counts.workoutsMissed || 0);
    day.missionsMissed += Number(counts.missionsMissed || 0);
    day.worksMissed += Number(counts.worksMissed || 0);
    day.studiesMissed += Number(counts.studiesMissed || 0);
    day.xpMission += Number(counts.xpMission || 0);
    day.xpWork += Number(counts.xpWork || 0);
    day.xpWorkout += Number(counts.xpWorkout || 0);
    day.xpStudy += Number(counts.xpStudy || 0);
    day.xpBook += Number(counts.xpBook || 0);
    rebuilt[dateKey] = day;
  };

  (appData.completedMissions || []).forEach((entry) => {
    registerEntry(
      entry,
      entry.failed || entry.skipped
        ? { missionsMissed: 1 }
        : { missions: 1, xpMission: entry.type === 'epica' ? 20 : 1 }
    );
  });
  (appData.completedWorks || []).forEach((entry) => {
    registerEntry(
      entry,
      entry.failed || entry.skipped
        ? { worksMissed: 1 }
        : { works: 1, xpWork: entry.type === 'epica' ? 20 : 1 }
    );
  });
  (appData.completedWorkouts || []).forEach((entry) => {
    registerEntry(
      entry,
      entry.failed || entry.skipped ? { workoutsMissed: 1 } : { workouts: 1, xpWorkout: 3 }
    );
  });
  (appData.completedStudies || []).forEach((entry) => {
    registerEntry(
      entry,
      entry.failed || entry.skipped
        ? { studiesMissed: 1 }
        : { studies: 1, xpStudy: entry.applied ? 3 : 1 }
    );
  });
  (appData.books || []).forEach((book) => {
    if (!book?.completed || !book?.dateCompleted) return;
    registerEntry(book, { xpBook: 20 });
  });
  appData.statistics.productiveDays = rebuilt;
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

function getMysteryGiftPool() {
  return (appData.shopItems || []).filter((item) => item && item.effect === 'custom');
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

    case 'mystery-gift': {
      const rewardPool = getMysteryGiftPool();
      if (rewardPool.length === 0) {
        showFeedback(
          'Cadastre pelo menos 1 item personalizado na loja para usar o Presente Misterioso.',
          'warn'
        );
        appData.inventory.push({ id: itemId, purchaseDate: new Date().toISOString() });
        break;
      }

      const rewardedItem = rewardPool[Math.floor(Math.random() * rewardPool.length)];
      appData.inventory.push({
        id: rewardedItem.id,
        purchaseDate: new Date().toISOString(),
        source: 'mystery-gift',
      });
      celebrateAction({
        containerSelector: '#inventory-items',
        message: `${rewardedItem.emoji || '🎁'} ${rewardedItem.name} sorteado!`,
      });
      showFeedback(
        `O Presente Misterioso sorteou "${rewardedItem.name}" para o seu inventário!`,
        'success'
      );
      addHeroLog(
        'item',
        'Presente Misterioso usado',
        `Item sorteado: ${rewardedItem.name}`
      );
      break;
    }

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
  handleEditBook,
  handleWorkoutCompletion,
  handleStudyCompletion,
  handleMissionCompletion,
  handleWorkCompletion,
  completeStudy,
  completeBook,
  handleClassSubmit,
  handleActivitySubmit,
  handleFinanceSubmit,
  updateActivityForm,
  completeMission,
  completeWork,
  recreateDailyMissionsForToday,
  cleanupOldDailyMissions,
  recreateDailyWorksForToday,
  cleanupOldDailyWorks,
  ensureProductiveDayEntry,
  updateProductiveDay,
  rebuildProductiveDaysFromHistory,
  buyItem,
  getMysteryGiftPool,
  useItem,
  addXP,
  addAttributeXP,
  addClassXP,
  generateHeroLogs,
});
