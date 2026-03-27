function initCharts() {
  // Esta função será chamada quando a aba de estatísticas for acessada
  console.log('Gráficos inicializados');
}

// Adicione esta função para adicionar a quarta aba com calendário

// Atualizar gráficos
function updateCharts() {
  // Verificar se Chart.js está disponível
  if (typeof Chart === 'undefined') return;

  populateWorkoutEvolutionOptions();

  // Atualizar gráfico de atributos
  updateAttributesChart();

  // Atualizar gráfico de atividades
  updateActivitiesChart();

  // Atualizar gráfico semanal
  updateWeeklyChart();

  // Atualizar gráfico de falhas/ignorados
  updateFailuresChart();

  // Atualizar gráfico de concluidas x falhas
  updateCompletedVsFailedChart();

  // Atualizar gráfico de taxa de aderencia
  updateAdherenceRateChart();

  // Atualizar gráfico de XP por fonte
  updateXpBySourceChart();

  // Atualizar volume semanal de treinos
  updateWorkoutVolumeChart();

  // Atualizar evolução por exercício
  updateWorkoutEvolutionChart();
}

function getSelectedStatsChartPeriodDays() {
  const select = document.getElementById('stats-chart-period');
  const parsed = parseInt(select?.value || '7', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function getStatsChartPeriodDateKeys(days) {
  const totalDays = Number.isFinite(days) && days > 0 ? days : 7;
  const keys = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    keys.push(getLocalDateString(date));
  }
  return keys;
}

function getDateFromKey(dateKey) {
  if (typeof parseLocalDateString === 'function') {
    return parseLocalDateString(dateKey);
  }
  if (typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateKey);
}

function getWeekStartKey(dateKey) {
  const date = getDateFromKey(dateKey);
  if (!Number.isFinite(date.getTime())) return '';
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getLocalDateString(date);
}

function formatShortDate(dateKey) {
  const date = getDateFromKey(dateKey);
  if (!Number.isFinite(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getWorkoutEntryMetric(entry) {
  if (!entry || entry.failed || entry.skipped) {
    return { primaryLabel: 'Volume', primaryValue: 0, typeLabel: '', extraSeries: [] };
  }

  if (entry.type === 'repeticao') {
    const totalReps = Array.isArray(entry.series)
      ? entry.series.reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0)
      : 0;
    return {
      primaryLabel: 'Repetições',
      primaryValue: totalReps,
      typeLabel: 'Repetição',
      extraSeries: [],
    };
  }

  if (entry.type === 'distancia') {
    const distance = Number(entry.distance || 0);
    const time = Number(entry.time || 0);
    const speed = distance > 0 && time > 0 ? (distance / time) * 60 : 0;
    return {
      primaryLabel: 'Distância (km)',
      primaryValue: distance,
      typeLabel: 'Distância',
      extraSeries: [
        { label: 'Tempo (min)', value: time },
        { label: 'Velocidade média (km/h)', value: speed },
      ],
    };
  }

  const time = Number(entry.time || 0);
  return {
    primaryLabel: 'Tempo (min)',
    primaryValue: time,
    typeLabel: entry.type === 'menor-tempo' ? 'Menor tempo' : 'Maior tempo',
    extraSeries: [],
  };
}

function populateWorkoutEvolutionOptions() {
  const select = document.getElementById('workout-evolution-select');
  if (!select) return;

  const previousValue = select.value;
  const workouts = Array.isArray(appData.workouts) ? appData.workouts.slice() : [];

  if (workouts.length === 0) {
    select.innerHTML = '<option value="">Nenhum treino cadastrado</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = workouts
    .map(
      (workout) =>
        `<option value="${workout.id}">${workout.emoji || '💪'} ${workout.name}</option>`
    )
    .join('');

  const hasPrevious = workouts.some((workout) => String(workout.id) === String(previousValue));
  select.value = hasPrevious ? previousValue : String(workouts[0].id);
}

// Atualizar gráfico de atributos
function updateAttributesChart() {
  const ctx = document.getElementById('attributes-chart');
  if (!ctx) return;

  // Destruir gráfico existente se houver
  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const labels = appData.attributes.map((attr) => attr.name);
  const data = appData.attributes.map((attr) => attr.xp % 100); // Mostrar progresso no nível atual

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Progresso dos Atributos (%)',
          data: data,
          backgroundColor: 'rgba(74, 111, 165, 0.7)',
          borderColor: 'rgba(74, 111, 165, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Progresso (%)',
          },
        },
      },
    },
  });
}

// Atualizar gráfico de atividades
function updateActivitiesChart() {
  const ctx = document.getElementById('activities-chart');
  if (!ctx) return;

  // Destruir gráfico existente se houver
  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
  const missionsDone = (appData.completedMissions || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
    return count + 1;
  }, 0);
  const worksDone = (appData.completedWorks || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
    return count + 1;
  }, 0);
  const workoutsDone = (appData.completedWorkouts || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
    return count + 1;
  }, 0);
  const studiesDone = (appData.completedStudies || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return count;
    return count + 1;
  }, 0);
  const booksRead = (appData.books || []).reduce((count, book) => {
    if (!book?.completed || !book?.dateCompleted) return count;
    return periodKeys.has(book.dateCompleted) ? count + 1 : count;
  }, 0);

  const data = {
    labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos', 'Livros'],
    datasets: [
      {
        label: `Atividades Realizadas (${periodDays} dias)`,
        data: [missionsDone, worksDone, workoutsDone, studiesDone, booksRead],
        backgroundColor: [
          CATEGORY_COLORS.mission.solid,
          CATEGORY_COLORS.work.solid,
          CATEGORY_COLORS.workout.solid,
          CATEGORY_COLORS.study.solid,
          CATEGORY_COLORS.book.solid,
        ],
        borderColor: [
          CATEGORY_COLORS.mission.border,
          CATEGORY_COLORS.work.border,
          CATEGORY_COLORS.workout.border,
          CATEGORY_COLORS.study.border,
          CATEGORY_COLORS.book.border,
        ],
        borderWidth: 1,
      },
    ],
  };

  ctx.chart = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
    },
  });
}

// Atualizar gráfico semanal
function updateWeeklyChart() {
  const ctx = document.getElementById('weekly-chart');
  if (!ctx) return;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // Destruir gráfico existente se houver
  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodDates = getStatsChartPeriodDateKeys(periodDays);

  const missionsData = periodDates.map((date) => {
    const dayData = appData.statistics.productiveDays[date];
    return dayData ? dayData.missions : 0;
  });

  const workoutsData = periodDates.map((date) => {
    const dayData = appData.statistics.productiveDays[date];
    return dayData ? dayData.workouts : 0;
  });

  const worksData = periodDates.map((date) => {
    const dayData = appData.statistics.productiveDays[date];
    return dayData ? dayData.works || 0 : 0;
  });

  const studiesData = periodDates.map((date) => {
    const dayData = appData.statistics.productiveDays[date];
    return dayData ? dayData.studies : 0;
  });

  const goals = appData.statisticsGoals || {};
  const missionGoalPerDay = Math.max(0, Number(goals.missions || 0) / 7);
  const worksGoalPerDay = Math.max(0, Number(goals.works || 0) / 7);
  const workoutsGoalPerDay = Math.max(0, Number(goals.workouts || 0) / 7);
  const studiesGoalPerDay = Math.max(0, Number(goals.studies || 0) / 7);
  const missionGoalData = periodDates.map(() => missionGoalPerDay);
  const worksGoalData = periodDates.map(() => worksGoalPerDay);
  const workoutsGoalData = periodDates.map(() => workoutsGoalPerDay);
  const studiesGoalData = periodDates.map(() => studiesGoalPerDay);

  // Formatar datas para exibição
  const labels = periodDates.map((date) => {
    const d = parseLocalDateString(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });

  ctx.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Missões',
          data: missionsData,
          borderColor: CATEGORY_COLORS.mission.border,
          backgroundColor: CATEGORY_COLORS.mission.soft,
          tension: 0.4,
        },
        {
          label: 'Meta Missões',
          data: missionGoalData,
          borderColor: CATEGORY_COLORS.mission.goal,
          backgroundColor: CATEGORY_COLORS.mission.soft,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: 'Treinos',
          data: workoutsData,
          borderColor: CATEGORY_COLORS.workout.border,
          backgroundColor: CATEGORY_COLORS.workout.soft,
          tension: 0.4,
        },
        {
          label: 'Meta Treinos',
          data: workoutsGoalData,
          borderColor: CATEGORY_COLORS.workout.goal,
          backgroundColor: CATEGORY_COLORS.workout.soft,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: 'Trabalhos',
          data: worksData,
          borderColor: CATEGORY_COLORS.work.border,
          backgroundColor: CATEGORY_COLORS.work.soft,
          tension: 0.4,
        },
        {
          label: 'Meta Trabalhos',
          data: worksGoalData,
          borderColor: CATEGORY_COLORS.work.goal,
          backgroundColor: CATEGORY_COLORS.work.soft,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
        {
          label: 'Estudos',
          data: studiesData,
          borderColor: CATEGORY_COLORS.study.border,
          backgroundColor: CATEGORY_COLORS.study.soft,
          tension: 0.4,
        },
        {
          label: 'Meta Estudos',
          data: studiesGoalData,
          borderColor: CATEGORY_COLORS.study.goal,
          backgroundColor: CATEGORY_COLORS.study.soft,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
            boxWidth: isMobile ? 10 : 12,
            boxHeight: isMobile ? 6 : 8,
            padding: isMobile ? 8 : 10,
            font: {
              size: isMobile ? 10 : 11,
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Quantidade',
          },
        },
      },
    },
  });
}

function updateFailuresChart() {
  const ctx = document.getElementById('failures-chart');
  if (!ctx) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
  const missionsMissed = (appData.completedMissions || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
    return count + 1;
  }, 0);
  const worksMissed = (appData.completedWorks || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
    return count + 1;
  }, 0);
  const workoutsMissed = (appData.completedWorkouts || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
    return count + 1;
  }, 0);
  const studiesMissed = (appData.completedStudies || []).reduce((count, entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || !(entry.failed || entry.skipped)) return count;
    return count + 1;
  }, 0);

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos'],
      datasets: [
        {
          label: `Falhas/Ignorados (${periodDays} dias)`,
          data: [missionsMissed, worksMissed, workoutsMissed, studiesMissed],
          backgroundColor: [
            CATEGORY_COLORS.mission.solid,
            CATEGORY_COLORS.work.solid,
            CATEGORY_COLORS.workout.solid,
            CATEGORY_COLORS.study.solid,
          ],
          borderColor: [
            CATEGORY_COLORS.mission.border,
            CATEGORY_COLORS.work.border,
            CATEGORY_COLORS.workout.border,
            CATEGORY_COLORS.study.border,
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Quantidade',
          },
        },
      },
    },
  });
}

function updateCompletedVsFailedChart() {
  const ctx = document.getElementById('completed-failed-chart');
  if (!ctx) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
  const categories = ['Missões', 'Trabalhos', 'Treinos', 'Estudos'];

  const totals = {
    mission: { done: 0, missed: 0 },
    work: { done: 0, missed: 0 },
    workout: { done: 0, missed: 0 },
    study: { done: 0, missed: 0 },
  };

  (appData.completedMissions || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.mission.missed += 1;
    else totals.mission.done += 1;
  });
  (appData.completedWorks || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.work.missed += 1;
    else totals.work.done += 1;
  });
  (appData.completedWorkouts || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.workout.missed += 1;
    else totals.workout.done += 1;
  });
  (appData.completedStudies || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.study.missed += 1;
    else totals.study.done += 1;
  });

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        {
          label: 'Concluídas',
          data: [totals.mission.done, totals.work.done, totals.workout.done, totals.study.done],
          backgroundColor: [
            CATEGORY_COLORS.mission.solid,
            CATEGORY_COLORS.work.solid,
            CATEGORY_COLORS.workout.solid,
            CATEGORY_COLORS.study.solid,
          ],
          borderColor: [
            CATEGORY_COLORS.mission.border,
            CATEGORY_COLORS.work.border,
            CATEGORY_COLORS.workout.border,
            CATEGORY_COLORS.study.border,
          ],
          borderWidth: 1,
          stack: 'activities',
        },
        {
          label: 'Falhas/Ignorados',
          data: [
            totals.mission.missed,
            totals.work.missed,
            totals.workout.missed,
            totals.study.missed,
          ],
          backgroundColor: 'rgba(120, 130, 150, 0.65)',
          borderColor: 'rgba(120, 130, 150, 1)',
          borderWidth: 1,
          stack: 'activities',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Quantidade',
          },
        },
      },
    },
  });
}

function updateAdherenceRateChart() {
  const ctx = document.getElementById('adherence-rate-chart');
  if (!ctx) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));
  const categories = ['Missões', 'Trabalhos', 'Treinos', 'Estudos'];

  const totals = {
    mission: { done: 0, missed: 0 },
    work: { done: 0, missed: 0 },
    workout: { done: 0, missed: 0 },
    study: { done: 0, missed: 0 },
  };

  (appData.completedMissions || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.mission.missed += 1;
    else totals.mission.done += 1;
  });
  (appData.completedWorks || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.work.missed += 1;
    else totals.work.done += 1;
  });
  (appData.completedWorkouts || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.workout.missed += 1;
    else totals.workout.done += 1;
  });
  (appData.completedStudies || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key)) return;
    if (entry.failed || entry.skipped) totals.study.missed += 1;
    else totals.study.done += 1;
  });

  const toRate = (done, missed) => {
    const planned = done + missed;
    if (planned <= 0) return 0;
    return Number(((done / planned) * 100).toFixed(1));
  };

  const rates = [
    toRate(totals.mission.done, totals.mission.missed),
    toRate(totals.work.done, totals.work.missed),
    toRate(totals.workout.done, totals.workout.missed),
    toRate(totals.study.done, totals.study.missed),
  ];

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        {
          label: `Aderência (${periodDays} dias)`,
          data: rates,
          backgroundColor: [
            CATEGORY_COLORS.mission.solid,
            CATEGORY_COLORS.work.solid,
            CATEGORY_COLORS.workout.solid,
            CATEGORY_COLORS.study.solid,
          ],
          borderColor: [
            CATEGORY_COLORS.mission.border,
            CATEGORY_COLORS.work.border,
            CATEGORY_COLORS.workout.border,
            CATEGORY_COLORS.study.border,
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Percentual (%)',
          },
        },
      },
    },
  });
}

function updateXpBySourceChart() {
  const ctx = document.getElementById('xp-source-chart');
  if (!ctx) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodKeys = new Set(getStatsChartPeriodDateKeys(periodDays));

  let missionXP = 0;
  let workXP = 0;
  let workoutXP = 0;
  let studyXP = 0;
  let bookXP = 0;
  let diaryXP = 0;

  (appData.completedMissions || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
    missionXP += entry.type === 'epica' ? 20 : 1;
  });
  (appData.completedWorks || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
    workXP += entry.type === 'epica' ? 20 : 1;
  });
  (appData.completedWorkouts || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
    workoutXP += 3;
  });
  (appData.completedStudies || []).forEach((entry) => {
    const key = getEventDateKey(entry);
    if (!periodKeys.has(key) || entry.failed || entry.skipped) return;
    studyXP += entry.applied ? 3 : 1;
  });
  (appData.books || []).forEach((book) => {
    if (!book?.completed || !book?.dateCompleted) return;
    if (periodKeys.has(book.dateCompleted)) {
      bookXP += 20;
    }
  });
  const diaryEntries = diaryDbAvailable ? diaryCache : appData.diaryEntries || [];
  (diaryEntries || []).forEach((entry) => {
    if (!entry?.date) return;
    const key = getLocalDateString(new Date(entry.date));
    if (!periodKeys.has(key)) return;
    diaryXP += Number(entry.xpGained || 0);
  });

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Missões', 'Trabalhos', 'Treinos', 'Estudos', 'Livros', 'Diário'],
      datasets: [
        {
          label: `XP estimado por fonte (${periodDays} dias)`,
          data: [missionXP, workXP, workoutXP, studyXP, bookXP, diaryXP],
          backgroundColor: [
            CATEGORY_COLORS.mission.solid,
            CATEGORY_COLORS.work.solid,
            CATEGORY_COLORS.workout.solid,
            CATEGORY_COLORS.study.solid,
            CATEGORY_COLORS.book.solid,
            'rgba(201, 203, 207, 0.7)',
          ],
          borderColor: [
            CATEGORY_COLORS.mission.border,
            CATEGORY_COLORS.work.border,
            CATEGORY_COLORS.workout.border,
            CATEGORY_COLORS.study.border,
            CATEGORY_COLORS.book.border,
            'rgba(201, 203, 207, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'XP',
          },
        },
      },
    },
  });
}

function updateWorkoutVolumeChart() {
  const ctx = document.getElementById('workout-volume-chart');
  if (!ctx) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const periodDays = getSelectedStatsChartPeriodDays();
  const periodDates = getStatsChartPeriodDateKeys(periodDays);
  const weeks = new Map();

  periodDates.forEach((dateKey) => {
    const weekKey = getWeekStartKey(dateKey);
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, {
        label: `Sem. ${formatShortDate(weekKey)}`,
        sessions: 0,
        reps: 0,
        distance: 0,
        time: 0,
      });
    }
  });

  (appData.completedWorkouts || []).forEach((entry) => {
    if (entry.failed || entry.skipped) return;
    const dateKey = getEventDateKey(entry);
    if (!dateKey) return;
    const weekKey = getWeekStartKey(dateKey);
    const bucket = weeks.get(weekKey);
    if (!bucket) return;

    bucket.sessions += 1;

    if (entry.type === 'repeticao' && Array.isArray(entry.series)) {
      bucket.reps += entry.series.reduce((sum, value) => sum + (parseInt(value, 10) || 0), 0);
      return;
    }

    if (entry.type === 'distancia') {
      bucket.distance += Number(entry.distance || 0);
      bucket.time += Number(entry.time || 0);
      return;
    }

    bucket.time += Number(entry.time || 0);
  });

  const weekBuckets = Array.from(weeks.values());

  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekBuckets.map((week) => week.label),
      datasets: [
        {
          label: 'Sessões',
          data: weekBuckets.map((week) => week.sessions),
          backgroundColor: CATEGORY_COLORS.workout.solid,
          borderColor: CATEGORY_COLORS.workout.border,
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Repetições',
          data: weekBuckets.map((week) => week.reps),
          type: 'line',
          borderColor: '#ff9f40',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.35,
          yAxisID: 'yReps',
        },
        {
          label: 'Distância (km)',
          data: weekBuckets.map((week) => Number(week.distance.toFixed(2))),
          type: 'line',
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.35,
          yAxisID: 'yDistance',
        },
        {
          label: 'Tempo (min)',
          data: weekBuckets.map((week) => Number(week.time.toFixed(1))),
          type: 'line',
          borderColor: '#4bc0c0',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.35,
          yAxisID: 'yTime',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterBody(items) {
              const index = items?.[0]?.dataIndex ?? -1;
              const week = weekBuckets[index];
              if (!week) return [];
              return [
                `Sessões: ${week.sessions}`,
                `Repetições: ${week.reps}`,
                `Distância: ${week.distance.toFixed(2)} km`,
                `Tempo: ${week.time.toFixed(1)} min`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Sessões',
          },
        },
        yReps: {
          beginAtZero: true,
          display: false,
        },
        yDistance: {
          beginAtZero: true,
          display: false,
        },
        yTime: {
          beginAtZero: true,
          display: false,
        },
      },
    },
  });
}

function updateWorkoutEvolutionChart() {
  const ctx = document.getElementById('workout-evolution-chart');
  const select = document.getElementById('workout-evolution-select');
  if (!ctx || !select) return;

  if (ctx.chart) {
    ctx.chart.destroy();
  }

  const selectedWorkoutId = select.value;
  if (!selectedWorkoutId) {
    return;
  }

  const periodKeys = new Set(getStatsChartPeriodDateKeys(getSelectedStatsChartPeriodDays()));
  const entries = (appData.completedWorkouts || [])
    .filter((entry) => {
      const eventKey = getEventDateKey(entry);
      return (
        String(entry.workoutId) === String(selectedWorkoutId) &&
        !entry.failed &&
        !entry.skipped &&
        periodKeys.has(eventKey)
      );
    })
    .sort((a, b) => {
      const aKey = getEventDateKey(a);
      const bKey = getEventDateKey(b);
      return aKey.localeCompare(bKey);
    });

  const workout = (appData.workouts || []).find(
    (item) => String(item.id) === String(selectedWorkoutId)
  );
  const referenceMetric = entries[0] ? getWorkoutEntryMetric(entries[0]) : null;
  const primaryLabel = referenceMetric?.primaryLabel || 'Volume';

  ctx.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: entries.map((entry) => formatShortDate(getEventDateKey(entry))),
      datasets: [
        {
          label: primaryLabel,
          data: entries.map((entry) => getWorkoutEntryMetric(entry).primaryValue),
          borderColor: CATEGORY_COLORS.workout.border,
          backgroundColor: CATEGORY_COLORS.workout.soft,
          tension: 0.35,
          fill: false,
        },
        ...(referenceMetric?.extraSeries || []).map((series, index) => ({
          label: series.label,
          data: entries.map((entry) => {
            const metric = getWorkoutEntryMetric(entry);
            return metric.extraSeries[index]?.value || 0;
          }),
          borderColor: index === 0 ? '#36a2eb' : '#ff9f40',
          backgroundColor: index === 0 ? 'rgba(54, 162, 235, 0.2)' : 'rgba(255, 159, 64, 0.2)',
          tension: 0.35,
          fill: false,
          borderDash: index === 0 ? [6, 4] : [],
        })),
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: workout ? `${workout.emoji || '💪'} ${workout.name}` : 'Treino selecionado',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: primaryLabel,
          },
        },
      },
    },
  });
}

function initNutritionForms() {
  const today = getLocalDateString();
  const dateInput = document.getElementById('nutrition-entry-date');
  if (dateInput && !dateInput.value) dateInput.value = today;
  const diaryInput = document.getElementById('nutrition-diary-date');
  if (diaryInput && !diaryInput.value) diaryInput.value = today;
}

function formatMealName(mealKey) {
  return NUTRITION_MEALS[mealKey] || NUTRITION_MEALS.lanche;
}

function getNutritionEntryDate() {
  return document.getElementById('nutrition-entry-date')?.value || getLocalDateString();
}

function getNutritionDiaryDate() {
  return document.getElementById('nutrition-diary-date')?.value || getLocalDateString();
}

function calculateNutritionTotals(entries) {
  const source = Array.isArray(entries) ? entries : [];
  return source.reduce(
    (totals, entry) => ({
      kcal: totals.kcal + Number(entry.kcal || 0),
      protein: totals.protein + Number(entry.protein || 0),
      carbs: totals.carbs + Number(entry.carbs || 0),
      fat: totals.fat + Number(entry.fat || 0),
      fiber: totals.fiber + Number(entry.fiber || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

function getNutritionEntriesByDate(dateStr) {
  return (appData.nutritionEntries || [])
    .filter((entry) => entry.date === dateStr)
    .sort((a, b) => {
      const ai = NUTRITION_MEAL_ORDER.indexOf(a.meal);
      const bi = NUTRITION_MEAL_ORDER.indexOf(b.meal);
      if (ai !== bi) return ai - bi;
      return Number(a.id) - Number(b.id);
    });
}

function evaluateNutritionGoalStatus(totals) {
  const goals = appData.nutritionGoals || {};
  const kcalRatio = goals.kcal > 0 ? totals.kcal / goals.kcal : 0;
  const proteinRatio = goals.protein > 0 ? totals.protein / goals.protein : 0;
  const carbsRatio = goals.carbs > 0 ? totals.carbs / goals.carbs : 0;
  const fatRatio = goals.fat > 0 ? totals.fat / goals.fat : 0;
  const fiberRatio = goals.fiber > 0 ? totals.fiber / goals.fiber : 0;

  const isGoalHit =
    kcalRatio >= 0.9 &&
    kcalRatio <= 1.1 &&
    proteinRatio >= 0.85 &&
    carbsRatio <= 1.15 &&
    fatRatio <= 1.15 &&
    fiberRatio >= 0.75;

  return {
    isGoalHit,
    items: [
      { key: 'kcal', label: 'Kcal', current: totals.kcal, target: goals.kcal, mode: 'range' },
      {
        key: 'protein',
        label: 'Proteína',
        current: totals.protein,
        target: goals.protein,
        mode: 'min',
      },
      { key: 'carbs', label: 'Carbo', current: totals.carbs, target: goals.carbs, mode: 'max' },
      { key: 'fat', label: 'Gordura', current: totals.fat, target: goals.fat, mode: 'max' },
      { key: 'fiber', label: 'Fibra', current: totals.fiber, target: goals.fiber, mode: 'min' },
    ],
  };
}

function getNutritionStatusClass(item) {
  if (!Number.isFinite(item.target) || item.target <= 0) return 'warn';
  const ratio = item.current / item.target;
  if (item.mode === 'min') return ratio >= 1 ? 'ok' : ratio >= 0.75 ? 'warn' : 'bad';
  if (item.mode === 'max') return ratio <= 1 ? 'ok' : ratio <= 1.15 ? 'warn' : 'bad';
  if (item.mode === 'range')
    return ratio >= 0.9 && ratio <= 1.1 ? 'ok' : ratio >= 0.75 && ratio <= 1.25 ? 'warn' : 'bad';
  return 'warn';
}

function formatNutritionValue(value, unit = 'g') {
  const parsed = Number(value || 0);
  const decimals = unit === 'kcal' ? 0 : 1;
  return `${parsed.toFixed(decimals)}${unit === 'kcal' ? '' : unit}`;
}

function updateNutritionFoodSelect() {
  // Update datalist (for desktop compatibility)
  const datalist = document.getElementById('nutrition-food-datalist');
  const hidden = document.getElementById('nutrition-entry-food');
  const dropdown = document.getElementById('nutrition-food-suggestions');

  if (!hidden) return;

  const previousId = hidden.value;
  const items = (appData.foodItems || [])
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));

  // Update datalist for desktop
  if (datalist) {
    datalist.innerHTML = items
      .map(
        (item) =>
          `<option value="${escapeHtml(item.name)}${item.brand ? ` (${escapeHtml(item.brand)})` : ''}" data-id="${item.id}"></option>`
      )
      .join('');
  }

  // Store items for custom dropdown
  window._nutritionFoodItems = items;

  if (previousId && items.some((item) => String(item.id) === String(previousId))) {
    const prev = items.find((item) => String(item.id) === String(previousId));
    const searchInput = document.getElementById('nutrition-entry-food-search');
    if (searchInput && prev) {
      searchInput.value = prev.name + (prev.brand ? ` (${prev.brand})` : '');
    }
  }
}

function renderNutritionFoodList() {
  const list = document.getElementById('nutrition-food-list');
  if (!list) return;
  const items = appData.foodItems || [];
  list.innerHTML = '';
  if (items.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum alimento cadastrado.</p>';
    return;
  }

  items
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'))
    .forEach((item) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
                <div class="item-info">
                    <span class="item-emoji">🍽️</span>
                    <div>
                        <div class="item-name">${escapeHtml(item.name)}${item.brand ? ` (${escapeHtml(item.brand)})` : ''}</div>
                        <div class="nutrition-food-meta">
                            ${item.portionGrams}g • ${item.kcal.toFixed(0)} kcal • P ${item.protein.toFixed(1)}g • C ${item.carbs.toFixed(1)}g • G ${item.fat.toFixed(1)}g • F ${item.fiber.toFixed(1)}g
                        </div>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="action-btn delete-btn" data-food-delete="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
      list.appendChild(card);
    });

  list.querySelectorAll('[data-food-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const foodId = parseInt(btn.getAttribute('data-food-delete'), 10);
      await deleteNutritionFood(foodId);
    });
  });
}

function updateNutritionEntryPreview() {
  const preview = document.getElementById('nutrition-entry-preview');
  if (!preview) return;
  const foodId = parseInt(document.getElementById('nutrition-entry-food')?.value || '', 10);
  const qty = Math.max(0.1, Number(document.getElementById('nutrition-entry-qty')?.value || 1));
  const food = (appData.foodItems || []).find((item) => Number(item.id) === foodId);
  if (!food) {
    preview.innerHTML =
      '<p class="empty-message">Selecione um alimento para visualizar os macros.</p>';
    return;
  }

  const kcal = food.kcal * qty;
  const protein = food.protein * qty;
  const carbs = food.carbs * qty;
  const fat = food.fat * qty;
  const fiber = food.fiber * qty;
  const grams = food.portionGrams * qty;
  preview.innerHTML = `
        <div class="nutrition-preview-grid">
            <div class="nutrition-macro-chip"><strong>Peso</strong><span>${grams.toFixed(0)}g</span></div>
            <div class="nutrition-macro-chip"><strong>Kcal</strong><span>${kcal.toFixed(0)}</span></div>
            <div class="nutrition-macro-chip"><strong>Proteína</strong><span>${protein.toFixed(1)}g</span></div>
            <div class="nutrition-macro-chip"><strong>Carbo</strong><span>${carbs.toFixed(1)}g</span></div>
            <div class="nutrition-macro-chip"><strong>Gordura</strong><span>${fat.toFixed(1)}g</span></div>
        </div>
    `;
}

async function deleteNutritionFood(foodId) {
  const usedCount = (appData.nutritionEntries || []).filter(
    (entry) => Number(entry.foodId) === Number(foodId)
  ).length;
  if (usedCount > 0) {
    showFeedback('Este alimento já foi usado no diário e não pode ser excluído.', 'warn');
    return;
  }
  const confirmed = await askConfirmation('Deseja excluir este alimento cadastrado?', {
    title: 'Excluir alimento',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;
  appData.foodItems = (appData.foodItems || []).filter(
    (item) => Number(item.id) !== Number(foodId)
  );
  updateNutritionView();
  showFeedback('Alimento excluído com sucesso!', 'success');
}

async function resetNutritionFoods() {
  const confirmed = await askConfirmation(
    'Tem certeza que deseja apagar todos os alimentos cadastrados?',
    {
      title: 'Resetar alimentos',
      confirmText: 'Resetar',
    }
  );
  if (!confirmed) return;
  appData.foodItems = [];
  const hidden = document.getElementById('nutrition-entry-food');
  if (hidden) hidden.value = '';
  const searchInput = document.getElementById('nutrition-entry-food-search');
  if (searchInput) searchInput.value = '';
  updateNutritionView();
  showFeedback('Alimentos resetados com sucesso!', 'success');
}

async function deleteNutritionEntry(entryId) {
  const confirmed = await askConfirmation('Deseja excluir esta refeição do diário?', {
    title: 'Excluir refeição',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;
  appData.nutritionEntries = (appData.nutritionEntries || []).filter(
    (entry) => Number(entry.id) !== Number(entryId)
  );
  recalcNutritionStats();
  updateNutritionView();
  showFeedback('Refeição removida.', 'success');
}

function renderNutritionDaySummary(dateStr) {
  const container = document.getElementById('nutrition-day-summary');
  if (!container) return;
  const totals = calculateNutritionTotals(getNutritionEntriesByDate(dateStr));
  container.innerHTML = `
        <div class="nutrition-summary-card"><div class="label">Kcal</div><div class="value">${totals.kcal.toFixed(0)}</div></div>
        <div class="nutrition-summary-card"><div class="label">Proteína</div><div class="value">${totals.protein.toFixed(1)}g</div></div>
        <div class="nutrition-summary-card"><div class="label">Carbo</div><div class="value">${totals.carbs.toFixed(1)}g</div></div>
        <div class="nutrition-summary-card"><div class="label">Gordura</div><div class="value">${totals.fat.toFixed(1)}g</div></div>
        <div class="nutrition-summary-card"><div class="label">Fibra</div><div class="value">${totals.fiber.toFixed(1)}g</div></div>
    `;
}

function renderNutritionDayEntries(dateStr) {
  const list = document.getElementById('nutrition-day-list');
  if (!list) return;
  const entries = getNutritionEntriesByDate(dateStr);
  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhuma refeição registrada para o dia.</p>';
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    const notes = entry.notes
      ? `<div class="nutrition-entry-meta">Obs: ${escapeHtml(entry.notes)}</div>`
      : '';
    card.innerHTML = `
            <div class="item-info">
                <span class="item-emoji">🍴</span>
                <div>
                    <div class="item-name">${formatMealName(entry.meal)} • ${escapeHtml(entry.foodName)}</div>
                    <div class="nutrition-entry-meta">${entry.grams.toFixed(0)}g • ${entry.kcal.toFixed(0)} kcal • P ${entry.protein.toFixed(1)}g • C ${entry.carbs.toFixed(1)}g • G ${entry.fat.toFixed(1)}g • F ${entry.fiber.toFixed(1)}g</div>
                    ${notes}
                </div>
            </div>
            <div class="item-actions">
                <button class="action-btn delete-btn" data-nutrition-delete="${entry.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-nutrition-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const entryId = parseInt(btn.getAttribute('data-nutrition-delete'), 10);
      await deleteNutritionEntry(entryId);
    });
  });
}

function renderNutritionGoalStatus(dateStr) {
  const container = document.getElementById('nutrition-goal-status');
  if (!container) return;
  const totals = calculateNutritionTotals(getNutritionEntriesByDate(dateStr));
  const evaluation = evaluateNutritionGoalStatus(totals);
  container.innerHTML = evaluation.items
    .map((item) => {
      const statusClass = getNutritionStatusClass(item);
      const targetUnit = item.key === 'kcal' ? '' : 'g';
      const currentLabel = item.key === 'kcal' ? item.current.toFixed(0) : item.current.toFixed(1);
      const targetLabel =
        item.key === 'kcal' ? Number(item.target).toFixed(0) : Number(item.target).toFixed(1);
      return `
            <div class="nutrition-goal-item ${statusClass}">
                <strong>${item.label}</strong>
                <div>${currentLabel}${targetUnit} / ${targetLabel}${targetUnit}</div>
            </div>
        `;
    })
    .join('');
}

function getSelectedNutritionReportDays() {
  const value = Number(document.getElementById('nutrition-report-period')?.value || 30);
  return [7, 30, 90, 120, 180, 365].includes(value) ? value : 30;
}

function getNutritionEntriesWithinDays(days) {
  const periodDays = Number(days) > 0 ? Number(days) : 30;
  const todayStr = getLocalDateString();
  const start = parseLocalDateString(todayStr);
  start.setDate(start.getDate() - (periodDays - 1));
  const startStr = getLocalDateString(start);
  return (appData.nutritionEntries || [])
    .filter((entry) => entry.date >= startStr && entry.date <= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      const ai = NUTRITION_MEAL_ORDER.indexOf(a.meal);
      const bi = NUTRITION_MEAL_ORDER.indexOf(b.meal);
      if (ai !== bi) return ai - bi;
      return Number(a.id) - Number(b.id);
    });
}

function getNutritionDailySeries(days) {
  const periodDays = Number(days) > 0 ? Number(days) : 30;
  const today = parseLocalDateString(getLocalDateString());
  const daily = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const totals = calculateNutritionTotals(getNutritionEntriesByDate(key));
    daily.push({ key, totals });
  }
  return daily;
}

function aggregateNutritionByMeal(entries) {
  const base = {};
  NUTRITION_MEAL_ORDER.forEach((meal) => {
    base[meal] = { meal, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 };
  });
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const key = Object.prototype.hasOwnProperty.call(base, entry.meal) ? entry.meal : 'lanche';
    base[key].kcal += Number(entry.kcal || 0);
    base[key].protein += Number(entry.protein || 0);
    base[key].carbs += Number(entry.carbs || 0);
    base[key].fat += Number(entry.fat || 0);
    base[key].fiber += Number(entry.fiber || 0);
    base[key].count += 1;
  });
  return NUTRITION_MEAL_ORDER.map((key) => base[key]);
}

function getTopNutritionFoods(entries, limit = 8) {
  const source = Array.isArray(entries) ? entries : [];
  const map = new Map();
  source.forEach((entry) => {
    const name = String(entry.foodName || 'Sem nome').trim() || 'Sem nome';
    if (!map.has(name)) {
      map.set(name, { name, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, grams: 0, count: 0 });
    }
    const item = map.get(name);
    item.kcal += Number(entry.kcal || 0);
    item.protein += Number(entry.protein || 0);
    item.carbs += Number(entry.carbs || 0);
    item.fat += Number(entry.fat || 0);
    item.fiber += Number(entry.fiber || 0);
    item.grams += Number(entry.grams || 0);
    item.count += 1;
  });
  return Array.from(map.values())
    .sort((a, b) => b.kcal - a.kcal)
    .slice(0, Math.max(1, Number(limit) || 8));
}

function getNutritionLogStreak() {
  const dates = new Set((appData.nutritionStats?.logDates || []).map((v) => String(v)));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = getLocalDateString(cursor);
    if (!dates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderNutritionReports() {
  const statsGrid = document.getElementById('nutrition-stats-grid');
  if (!statsGrid) return;
  const days = getSelectedNutritionReportDays();
  const dailySeries = getNutritionDailySeries(days);
  const entries = getNutritionEntriesWithinDays(days);
  const totals = calculateNutritionTotals(entries);
  const avgKcal = totals.kcal / Math.max(1, days);
  const avgProtein = totals.protein / Math.max(1, days);
  const avgFiber = totals.fiber / Math.max(1, days);
  const mealMap = aggregateNutritionByMeal(entries);
  const mealsLogged = mealMap.reduce((sum, item) => sum + item.count, 0);
  const topMeal = mealMap.slice().sort((a, b) => b.kcal - a.kcal)[0];
  const todayStr = getLocalDateString();
  const start = parseLocalDateString(todayStr);
  start.setDate(start.getDate() - (days - 1));
  const startStr = getLocalDateString(start);
  const goalsHit = (appData.nutritionStats?.goalHitDates || [])
    .map(String)
    .filter((date) => date >= startStr && date <= todayStr).length;
  const logDays = Array.from(new Set(entries.map((entry) => String(entry.date)))).length;
  const streak = getNutritionLogStreak();

  statsGrid.innerHTML = `
        <div class="stat-card"><h4><i class="fas fa-fire"></i> Streak de registro</h4><div class="stat-value">${streak}</div></div>
        <div class="stat-card"><h4><i class="fas fa-calendar-check"></i> Dias com registro</h4><div class="stat-value">${logDays}</div></div>
        <div class="stat-card"><h4><i class="fas fa-bullseye"></i> Metas batidas (${days}d)</h4><div class="stat-value">${goalsHit}</div></div>
        <div class="stat-card"><h4><i class="fas fa-chart-line"></i> Média kcal/dia</h4><div class="stat-value">${avgKcal.toFixed(0)}</div></div>
        <div class="stat-card"><h4><i class="fas fa-drumstick-bite"></i> Média proteína/dia</h4><div class="stat-value">${avgProtein.toFixed(1)}g</div></div>
        <div class="stat-card"><h4><i class="fas fa-seedling"></i> Média fibra/dia</h4><div class="stat-value">${avgFiber.toFixed(1)}g</div></div>
        <div class="stat-card"><h4><i class="fas fa-utensils"></i> Refeição destaque</h4><div class="stat-value">${topMeal && topMeal.kcal > 0 ? formatMealName(topMeal.meal) : '-'}</div></div>
        <div class="stat-card"><h4><i class="fas fa-list-ol"></i> Registros no período</h4><div class="stat-value">${mealsLogged}</div></div>
    `;

  // Verificar se Chart.js está disponível antes de renderizar gráficos
  if (typeof Chart === 'undefined') return;

  updateNutritionWeeklyChart(dailySeries, days);
  updateNutritionMacroSplitChart(entries);
  updateNutritionMealDistributionChart(entries);
  updateNutritionTopFoodsChart(entries);
  renderNutritionMealBreakdown(entries);
}

function updateNutritionWeeklyChart(weekData, days = 30) {
  const ctx = document.getElementById('nutrition-weekly-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (ctx.chart) ctx.chart.destroy();
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const data = Array.isArray(weekData) ? weekData : getNutritionDailySeries(days);
  const labels = data.map((item) => {
    const d = parseLocalDateString(item.key);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const kcal = data.map((item) => Number(item.totals.kcal || 0));
  const goal = data.map(() => Number(appData.nutritionGoals?.kcal || 0));
  const maxTicks = isMobile ? 8 : 12;
  const tickStep = Math.max(1, Math.ceil(data.length / maxTicks));
  const pointRadius = days >= 120 ? 0 : days >= 30 ? 1.5 : 2;
  ctx.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Kcal consumidas (${days}d)`,
          data: kcal,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          pointRadius,
          pointHoverRadius: 3,
          tension: 0.25,
        },
        {
          label: 'Meta kcal',
          data: goal,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.15)',
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: false,
            callback: function (value, index) {
              if (index % tickStep === 0 || index === labels.length - 1) {
                return labels[index];
              }
              return '';
            },
          },
        },
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function updateNutritionMacroSplitChart(entries) {
  const ctx = document.getElementById('nutrition-macro-split-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (ctx.chart) ctx.chart.destroy();
  const totals = calculateNutritionTotals(entries);
  const proteinKcal = Math.max(0, Number(totals.protein || 0) * 4);
  const carbsKcal = Math.max(0, Number(totals.carbs || 0) * 4);
  const fatKcal = Math.max(0, Number(totals.fat || 0) * 9);
  const chartData = [proteinKcal, carbsKcal, fatKcal];
  const hasData = chartData.some((value) => value > 0);
  ctx.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: hasData ? ['Proteína', 'Carboidratos', 'Gorduras'] : ['Sem dados no período'],
      datasets: [
        {
          data: hasData ? chartData : [1],
          backgroundColor: hasData
            ? ['rgba(54, 162, 235, 0.75)', 'rgba(255, 206, 86, 0.75)', 'rgba(255, 99, 132, 0.75)']
            : ['rgba(148, 163, 184, 0.5)'],
          borderColor: hasData
            ? ['rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)']
            : ['rgba(148, 163, 184, 1)'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

function updateNutritionMealDistributionChart(entries) {
  const ctx = document.getElementById('nutrition-meal-kcal-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (ctx.chart) ctx.chart.destroy();
  const mealTotals = aggregateNutritionByMeal(entries);
  const filtered = mealTotals.filter((item) => item.kcal > 0);
  const hasData = filtered.length > 0;
  ctx.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: hasData
        ? filtered.map((item) => formatMealName(item.meal))
        : ['Sem dados no período'],
      datasets: [
        {
          data: hasData ? filtered.map((item) => Number(item.kcal.toFixed(1))) : [1],
          backgroundColor: hasData
            ? [
                'rgba(255, 159, 64, 0.75)',
                'rgba(75, 192, 192, 0.75)',
                'rgba(153, 102, 255, 0.75)',
                'rgba(255, 99, 132, 0.75)',
              ]
            : ['rgba(148, 163, 184, 0.5)'],
          borderColor: hasData
            ? [
                'rgba(255, 159, 64, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 99, 132, 1)',
              ]
            : ['rgba(148, 163, 184, 1)'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

function updateNutritionTopFoodsChart(entries) {
  const ctx = document.getElementById('nutrition-top-foods-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (ctx.chart) ctx.chart.destroy();
  const topFoods = getTopNutritionFoods(entries, 8);
  const hasData = topFoods.length > 0 && topFoods.some((item) => item.kcal > 0);
  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hasData ? topFoods.map((item) => item.name) : ['Sem dados no período'],
      datasets: [
        {
          label: 'Kcal acumuladas',
          data: hasData ? topFoods.map((item) => Number(item.kcal.toFixed(0))) : [0],
          backgroundColor: hasData ? 'rgba(255, 159, 64, 0.7)' : 'rgba(148, 163, 184, 0.45)',
          borderColor: hasData ? 'rgba(255, 159, 64, 1)' : 'rgba(148, 163, 184, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { beginAtZero: true },
      },
    },
  });
}

function renderNutritionMealBreakdown(entries) {
  const tbody = document.getElementById('nutrition-meal-breakdown-body');
  if (!tbody) return;
  const mealTotals = aggregateNutritionByMeal(entries);
  const usedMeals = mealTotals.filter((item) => item.count > 0);
  if (usedMeals.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-message">Sem registros no período selecionado.</td></tr>';
    return;
  }
  tbody.innerHTML = usedMeals
    .map(
      (item) => `
        <tr>
            <td>${formatMealName(item.meal)}</td>
            <td>${item.kcal.toFixed(0)}</td>
            <td>${item.protein.toFixed(1)}g</td>
            <td>${item.carbs.toFixed(1)}g</td>
            <td>${item.fat.toFixed(1)}g</td>
            <td>${item.fiber.toFixed(1)}g</td>
            <td>${item.count}</td>
        </tr>
    `
    )
    .join('');
}

function recalcNutritionStats() {
  const logDates = Array.from(
    new Set((appData.nutritionEntries || []).map((entry) => entry.date))
  ).sort();
  const previousGoalHitSet = new Set(
    (appData.nutritionStats?.goalHitDates || []).map((v) => String(v))
  );
  const rewardedGoalSet = new Set(
    (appData.nutritionStats?.rewardedGoalDates || []).map((v) => String(v))
  );
  const goalHitDates = logDates.filter((date) => {
    const totals = calculateNutritionTotals(getNutritionEntriesByDate(date));
    const evaluation = evaluateNutritionGoalStatus(totals);
    return evaluation.isGoalHit || previousGoalHitSet.has(date) || rewardedGoalSet.has(date);
  });
  const rewardedMealKeys = Array.from(
    new Set((appData.nutritionStats?.rewardedMealKeys || []).map((v) => String(v)))
  ).filter((v) => /^\d{4}-\d{2}-\d{2}\|(cafe|almoco|jantar|lanche)$/.test(v));
  appData.nutritionStats = {
    logDates,
    goalHitDates,
    rewardedGoalDates: Array.from(rewardedGoalSet),
    rewardedMealKeys,
  };
}

function maybeRewardNutritionGoal(dateStr) {
  const totals = calculateNutritionTotals(getNutritionEntriesByDate(dateStr));
  const evaluation = evaluateNutritionGoalStatus(totals);
  if (!evaluation.isGoalHit) return;
  const today = getLocalDateString();
  if (dateStr !== today) return;
  if (!appData.nutritionStats.rewardedGoalDates.includes(dateStr)) {
    appData.nutritionStats.rewardedGoalDates.push(dateStr);
    if (!appData.nutritionStats.goalHitDates.includes(dateStr)) {
      appData.nutritionStats.goalHitDates.push(dateStr);
    }
    addXP(2);
    addAttributeXP(2, 1);
    appData.hero.coins += 2;
    addHeroLog('system', 'Meta de alimentação batida', `${dateStr}: bônus +2 XP e +2 moedas.`);
    showFeedback('Meta nutricional do dia atingida! +2 XP e +2 moedas.', 'success');
  }
}

function updateNutritionCurrentDateLabel() {
  const element = document.getElementById('nutrition-current-date');
  if (!element) return;
  const date = parseLocalDateString(getNutritionDiaryDate());
  element.textContent = date.toLocaleDateString('pt-BR');
}

// Funções de Hidratação
function recordHydrationDay(dateStr, glasses, goal) {
  if (!dateStr) return;
  if (!Array.isArray(appData.hydration.logDates)) appData.hydration.logDates = [];
  if (!Array.isArray(appData.hydration.goalHitDates)) appData.hydration.goalHitDates = [];
  if (!appData.hydration.logDates.includes(dateStr)) {
    appData.hydration.logDates.push(dateStr);
  }
  if (glasses >= goal && !appData.hydration.goalHitDates.includes(dateStr)) {
    appData.hydration.goalHitDates.push(dateStr);
  }
}

function rolloverHydrationDay(today = getLocalDateString()) {
  if (!appData.hydration || typeof appData.hydration !== 'object') {
    appData.hydration = {
      glasses: 0,
      goal: 8,
      lastDate: null,
      currentStreak: 0,
      bestStreak: 0,
      startDate: today,
      logDates: [],
      goalHitDates: [],
    };
  }
  const goal =
    Number.isFinite(Number(appData.hydration.goal)) && Number(appData.hydration.goal) > 0
      ? Number(appData.hydration.goal)
      : 8;
  appData.hydration.goal = goal;

  if (appData.hydration.lastDate === today) return;

  if (appData.hydration.lastDate) {
    const previousDate = appData.hydration.lastDate;
    const previousGlasses = Number.isFinite(Number(appData.hydration.glasses))
      ? Number(appData.hydration.glasses)
      : 0;
    recordHydrationDay(previousDate, previousGlasses, goal);

    const yesterday = getGameNow();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (previousDate === yesterdayStr) {
      if (previousGlasses >= goal) {
        appData.hydration.currentStreak = (appData.hydration.currentStreak || 0) + 1;
      } else {
        appData.hydration.currentStreak = 0;
      }
    } else {
      appData.hydration.currentStreak = 0;
    }
  }

  if ((appData.hydration.currentStreak || 0) > (appData.hydration.bestStreak || 0)) {
    appData.hydration.bestStreak = appData.hydration.currentStreak;
  }

  appData.hydration.glasses = 0;
  appData.hydration.lastDate = today;
}

function addHydrationGlass() {
  const today = getLocalDateString();
  rolloverHydrationDay(today);

  // Adicionar copo (máximo = meta do dia)
  if (appData.hydration.glasses < appData.hydration.goal) {
    appData.hydration.glasses++;
  }

  // Atualizar melhor streak
  if (appData.hydration.currentStreak > appData.hydration.bestStreak) {
    appData.hydration.bestStreak = appData.hydration.currentStreak;
  }

  updateHydrationUI();
  saveToLocalStorage();

  // Feedback se atingiu a meta
  if (appData.hydration.glasses >= appData.hydration.goal) {
    showFeedback(`🎉 Meta diária atingida! ${appData.hydration.goal} copos de água!`, 'success');
  } else {
    showFeedback('💧 +1 copo de água!', 'info');
  }
}

function removeHydrationGlass() {
  const today = getLocalDateString();
  rolloverHydrationDay(today);

  // Remover copo (mínimo 0)
  if (appData.hydration.glasses > 0) {
    appData.hydration.glasses--;
  }

  updateHydrationUI();
  saveToLocalStorage();
}

function updateHydrationUI() {
  const currentEl = document.getElementById('hydration-current');
  const goalEl = document.getElementById('hydration-goal');
  const waterEl = document.getElementById('hydration-water');
  const barFillEl = document.getElementById('hydration-bar-fill');
  const percentageEl = document.getElementById('hydration-percentage');
  const iconsRowEl = document.getElementById('hydration-icons-row');
  const streakCurrentEl = document.getElementById('hydration-streak-current');
  const streakBestEl = document.getElementById('hydration-streak-best');
  const motivationEl = document.getElementById('hydration-motivation');

  const glasses = appData.hydration.glasses || 0;
  const goal = appData.hydration.goal || 8;
  const percentage = Math.min(100, (glasses / goal) * 100);

  if (currentEl) currentEl.textContent = glasses;
  if (goalEl) goalEl.textContent = goal;

  // Atualizar nível de água no copo
  if (waterEl) {
    waterEl.style.height = `${percentage}%`;
  }

  // Atualizar barra de progresso
  if (barFillEl) {
    barFillEl.style.width = `${percentage}%`;
  }

  // Atualizar percentual
  if (percentageEl) {
    percentageEl.textContent = `${Math.round(percentage)}%`;
  }

  // Atualizar ícones de copos
  if (iconsRowEl) {
    iconsRowEl.innerHTML = '';
    for (let i = 0; i < glasses; i++) {
      const icon = document.createElement('span');
      icon.className = 'hydration-cup-icon';
      icon.innerHTML = '💧';
      iconsRowEl.appendChild(icon);
    }
  }

  // Atualizar streaks
  if (streakCurrentEl) streakCurrentEl.textContent = appData.hydration.currentStreak || 0;
  if (streakBestEl) streakBestEl.textContent = appData.hydration.bestStreak || 0;

  // Atualizar mensagem motivacional
  if (motivationEl) {
    const messages = {
      0: '☀️ Comece seu dia bebendo água!',
      1: '💧 Bom início! Continue assim!',
      2: '💧 Você está no caminho certo!',
      3: '💪 Quase na metade! Continue!',
      4: '🔥 Metade do caminho! Você consegue!',
      5: '💪 Muito bem! Falta pouco!',
      6: '🌟 Quase lá! Só mais 2 copos!',
      7: '🎉 Você está quase na meta!',
      8: '🎊 PARABÉNS! Meta atingida!',
    };

    if (glasses >= goal) {
      motivationEl.className = 'hydration-motivation success';
      motivationEl.textContent = messages[8];
    } else {
      motivationEl.className = 'hydration-motivation info';
      motivationEl.textContent = messages[glasses] || messages[0];
    }
  }
}

// Inicializar UI de hidratação
function initHydrationUI() {
  const today = getLocalDateString();
  rolloverHydrationDay(today);

  updateHydrationUI();
}

function updateNutritionView() {
  recalcNutritionStats();
  initNutritionForms();
  const goals = appData.nutritionGoals || {};
  const kcalInput = document.getElementById('nutrition-goal-kcal');
  const proteinInput = document.getElementById('nutrition-goal-protein');
  const carbsInput = document.getElementById('nutrition-goal-carbs');
  const fatInput = document.getElementById('nutrition-goal-fat');
  const fiberInput = document.getElementById('nutrition-goal-fiber');
  if (kcalInput && document.activeElement !== kcalInput) kcalInput.value = Number(goals.kcal || 0);
  if (proteinInput && document.activeElement !== proteinInput)
    proteinInput.value = Number(goals.protein || 0);
  if (carbsInput && document.activeElement !== carbsInput)
    carbsInput.value = Number(goals.carbs || 0);
  if (fatInput && document.activeElement !== fatInput) fatInput.value = Number(goals.fat || 0);
  if (fiberInput && document.activeElement !== fiberInput)
    fiberInput.value = Number(goals.fiber || 0);
  updateNutritionCurrentDateLabel();
  updateNutritionFoodSelect();
  renderNutritionFoodList();
  updateNutritionEntryPreview();

  const diaryDate = getNutritionDiaryDate();
  renderNutritionDaySummary(diaryDate);
  renderNutritionDayEntries(diaryDate);
  renderNutritionGoalStatus(diaryDate);
  renderNutritionReports();
}

// __appChartsNutritionBridge: exposes charts/nutrition APIs for legacy scripts during module migration
Object.assign(globalThis, {
  initCharts,
  updateCharts,
  getSelectedStatsChartPeriodDays,
  getStatsChartPeriodDateKeys,
  updateAttributesChart,
  updateActivitiesChart,
  updateWeeklyChart,
  updateFailuresChart,
  updateCompletedVsFailedChart,
  updateAdherenceRateChart,
  updateXpBySourceChart,
  initNutritionForms,
  formatMealName,
  getNutritionEntryDate,
  getNutritionDiaryDate,
  calculateNutritionTotals,
  getNutritionEntriesByDate,
  evaluateNutritionGoalStatus,
  getNutritionStatusClass,
  formatNutritionValue,
  updateNutritionFoodSelect,
  renderNutritionFoodList,
  updateNutritionEntryPreview,
  deleteNutritionFood,
  resetNutritionFoods,
  deleteNutritionEntry,
  renderNutritionDaySummary,
  renderNutritionDayEntries,
  renderNutritionGoalStatus,
  getSelectedNutritionReportDays,
  getNutritionEntriesWithinDays,
  getNutritionDailySeries,
  aggregateNutritionByMeal,
  getTopNutritionFoods,
  getNutritionLogStreak,
  renderNutritionReports,
  updateNutritionWeeklyChart,
  updateNutritionMacroSplitChart,
  updateNutritionMealDistributionChart,
  updateNutritionTopFoodsChart,
  renderNutritionMealBreakdown,
  recalcNutritionStats,
  maybeRewardNutritionGoal,
  updateNutritionCurrentDateLabel,
  recordHydrationDay,
  rolloverHydrationDay,
  addHydrationGlass,
  removeHydrationGlass,
  updateHydrationUI,
  initHydrationUI,
  updateNutritionView,
});
