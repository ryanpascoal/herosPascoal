function updateFinanceSummary() {
  const incomeEl = document.getElementById('finance-income');
  const expenseEl = document.getElementById('finance-expense');
  const balanceEl = document.getElementById('finance-balance');
  if (!incomeEl || !expenseEl || !balanceEl) return;
  const formatBRL = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const monthFilter =
    document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7);
  const monthKey = monthFilter === 'all' ? getLocalDateString().slice(0, 7) : monthFilter;
  const prevMonthKey = getPreviousMonthKey(monthKey);
  updateFinanceKpiContext(monthKey);

  const monthEntries = appData.financeEntries.filter((e) => getMonthKey(e.date) === monthKey);
  const prevMonthEntries = appData.financeEntries.filter(
    (e) => getMonthKey(e.date) === prevMonthKey
  );

  const income = monthEntries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = monthEntries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);
  const balance = income - expense;

  const prevIncome = prevMonthEntries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);
  const prevExpense = prevMonthEntries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);
  const prevBalance = prevIncome - prevExpense;

  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  const fixedExpenses = monthEntries
    .filter((e) => e.type === 'expense' && e.recurringId)
    .reduce((sum, e) => sum + e.amount, 0);
  const variableExpenses = monthEntries
    .filter((e) => e.type === 'expense' && !e.recurringId)
    .reduce((sum, e) => sum + e.amount, 0);

  const dayData = getMonthDayData(monthKey);
  const averageDailyExpense = dayData.daysInPeriod > 0 ? expense / dayData.daysInPeriod : 0;
  const projectedBalance =
    monthKey === getLocalDateString().slice(0, 7)
      ? dayData.daysInPeriod > 0
        ? (balance / dayData.daysInPeriod) * dayData.daysInMonth
        : balance
      : balance;

  incomeEl.textContent = formatBRL(income);
  expenseEl.textContent = formatBRL(expense);
  balanceEl.textContent = formatBRL(balance);

  setFinanceDelta('finance-income-delta', calculatePercentChange(income, prevIncome), true);
  setFinanceDelta('finance-expense-delta', calculatePercentChange(expense, prevExpense), true);
  setFinanceDelta('finance-balance-delta', calculatePercentChange(balance, prevBalance), false);

  const savingsEl = document.getElementById('finance-savings-rate');
  if (savingsEl) savingsEl.textContent = `${savingsRate.toFixed(1).replace('.', ',')}%`;

  const fixedVariableEl = document.getElementById('finance-fixed-variable');
  if (fixedVariableEl)
    fixedVariableEl.textContent = `${formatBRL(fixedExpenses)} / ${formatBRL(variableExpenses)}`;

  const dailyAvgEl = document.getElementById('finance-daily-average');
  if (dailyAvgEl) dailyAvgEl.textContent = formatBRL(averageDailyExpense);

  const projectedEl = document.getElementById('finance-projected-balance');
  if (projectedEl) projectedEl.textContent = formatBRL(projectedBalance);
}

function updateFinanceView() {
  applyRecurringFinanceEntries();
  updateFinanceSummary();
  renderFinanceBudgets();
  renderFinanceRecurringList();
  renderFinanceList();
  updateFinanceCharts();
}

function applyRecurringFinanceEntries() {
  const todayStr = getLocalDateString();
  const currentMonth = getMonthKey(todayStr);
  const skipSet = new Set((appData.financeRecurringSkips || []).map((s) => String(s)));

  if (!Array.isArray(appData.financeRecurring) || appData.financeRecurring.length === 0) return;

  appData.financeRecurring.forEach((rec) => {
    if (!rec || rec.active === false) return;
    const amount = Number(rec.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const startDate = parseLocalDateString(rec.startDate || todayStr);
    const startMonthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const startMonth = getMonthKey(getLocalDateString(startMonthDate));
    const monthCursor = startMonth;

    for (let monthKey = monthCursor; monthKey <= currentMonth; ) {
      const [y, m] = monthKey.split('-').map((v) => parseInt(v, 10));
      const lastDay = new Date(y, m, 0).getDate();
      const day = Math.min(Math.max(1, parseInt(rec.dayOfMonth, 10) || 1), lastDay);
      const dueDate = getLocalDateString(new Date(y, m - 1, day));

      const startsOk = !rec.startDate || dueDate >= rec.startDate;
      const endsOk = !rec.endDate || dueDate <= rec.endDate;
      const dueReached = dueDate <= todayStr;

      if (startsOk && endsOk && dueReached) {
        const skipKey = getRecurringSkipKey(rec.id, monthKey);
        const exists = appData.financeEntries.some(
          (e) => String(e.recurringId || '') === String(rec.id) && e.recurringMonth === monthKey
        );

        if (!exists && !skipSet.has(skipKey)) {
          appData.financeEntries.push({
            id: createUniqueId(appData.financeEntries),
            type: rec.type === 'income' ? 'income' : 'expense',
            amount,
            category: rec.category || '',
            description: rec.description || '',
            date: dueDate,
            recurringId: rec.id,
            recurringMonth: monthKey,
          });
        }
      }

      const next = new Date(y, m, 1);
      monthKey = getMonthKey(getLocalDateString(next));
    }
  });
}

function renderFinanceBudgets() {
  const list = document.getElementById('finance-budget-list');
  if (!list) return;

  const monthKey =
    document.getElementById('finance-month')?.value === 'all'
      ? getLocalDateString().slice(0, 7)
      : document.getElementById('finance-month')?.value || getLocalDateString().slice(0, 7);

  const monthExpenses = appData.financeEntries.filter(
    (e) => e.type === 'expense' && getMonthKey(e.date) === monthKey
  );

  const budgets = appData.financeBudgets.filter((b) => b.month === monthKey);
  list.innerHTML = '';

  if (budgets.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum orçamento cadastrado para este mês.</p>';
    return;
  }

  budgets.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR'));
  budgets.forEach((budget) => {
    const spent = monthExpenses
      .filter((e) => (e.category || '').trim().toLowerCase() === budget.category.toLowerCase())
      .reduce((sum, e) => sum + e.amount, 0);
    const percent = budget.limit > 0 ? Math.min(200, (spent / budget.limit) * 100) : 0;
    const remaining = budget.limit - spent;
    const statusClass = percent >= 100 ? 'danger' : percent >= 80 ? 'warn' : 'ok';

    const item = document.createElement('div');
    item.className = `finance-budget-item ${statusClass}`;
    const safeCategory = escapeHtml(budget.category);
    item.innerHTML = `
            <div class="finance-budget-top">
                <div class="finance-budget-title">${safeCategory}</div>
                <button class="finance-delete-btn" data-id="${budget.id}" data-kind="budget">Excluir</button>
            </div>
            <div class="finance-budget-meta">
                <span>Usado: ${spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span>Limite: ${budget.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                <span>${remaining >= 0 ? 'Restante' : 'Excedido'}: ${Math.abs(remaining).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div class="finance-budget-bar">
                <div class="finance-budget-fill ${statusClass}" style="width: ${Math.min(100, percent)}%"></div>
            </div>
        `;
    list.appendChild(item);
  });

  list.querySelectorAll('button[data-kind="budget"]').forEach((btn) => {
    btn.addEventListener('click', () =>
      deleteFinanceBudget(parseInt(btn.getAttribute('data-id'), 10))
    );
  });
}

function renderFinanceRecurringList() {
  const list = document.getElementById('finance-recurring-list');
  if (!list) return;

  const entries = appData.financeRecurring || [];
  list.innerHTML = '';

  if (entries.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum lançamento recorrente cadastrado.</p>';
    return;
  }

  entries
    .slice()
    .sort((a, b) => (a.dayOfMonth || 1) - (b.dayOfMonth || 1))
    .forEach((rec) => {
      const item = document.createElement('div');
      item.className = `finance-item ${rec.type}`;
      const safeCategory = rec.category ? escapeHtml(rec.category) : '';
      const safeDescription = rec.description ? escapeHtml(rec.description) : '';
      const meta = `Todo dia ${rec.dayOfMonth} • Início: ${formatDate(rec.startDate)}${rec.endDate ? ` • Fim: ${formatDate(rec.endDate)}` : ''}${safeCategory ? ` • ${safeCategory}` : ''}${safeDescription ? ` • ${safeDescription}` : ''}`;
      item.innerHTML = `
                <div>
                    <div class="finance-item-title">${rec.type === 'income' ? 'Recorrente: Receita' : 'Recorrente: Despesa'}</div>
                    <div class="finance-item-meta">${meta}</div>
                </div>
                <div class="finance-item-actions">
                    <div class="finance-item-value">${Number(rec.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    <button class="finance-delete-btn" data-id="${rec.id}" data-kind="recurring">Excluir</button>
                </div>
            `;
      list.appendChild(item);
    });

  list.querySelectorAll('button[data-kind="recurring"]').forEach((btn) => {
    btn.addEventListener('click', () =>
      deleteFinanceRecurring(parseInt(btn.getAttribute('data-id'), 10))
    );
  });
}

function renderFinanceList() {
  const list = document.getElementById('finance-list');
  if (!list) return;

  const entries = getFinanceFilteredEntries().sort(
    (a, b) => parseLocalDateString(b.date) - parseLocalDateString(a.date)
  );
  list.innerHTML = '';

  if (entries.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum lançamento para os filtros selecionados.</p>';
    return;
  }

  const formatBRL = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = `finance-item ${entry.type}`;
    const dateLabel = formatDate(entry.date);
    const catLabel = entry.category ? ` • ${escapeHtml(entry.category)}` : '';
    const descLabel = entry.description ? ` • ${escapeHtml(entry.description)}` : '';
    const recurringLabel = entry.recurringId ? ' • Recorrente' : '';
    item.innerHTML = `
            <div>
                <div class="finance-item-title">${entry.type === 'income' ? 'Receita' : 'Despesa'}</div>
                <div class="finance-item-meta">${dateLabel}${catLabel}${descLabel}${recurringLabel}</div>
            </div>
            <div class="finance-item-actions">
                <div class="finance-item-value">${formatBRL(entry.amount)}</div>
                <button class="finance-delete-btn" data-id="${entry.id}">Excluir</button>
            </div>
        `;
    list.appendChild(item);
  });

  list.querySelectorAll('.finance-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      deleteFinanceEntry(id);
    });
  });
}

function getFinanceFilteredEntries() {
  const monthFilter = document.getElementById('finance-month')?.value || 'all';
  const typeFilter = document.getElementById('finance-filter-type')?.value || 'all';
  const categoryFilter = (document.getElementById('finance-filter-category')?.value || '')
    .trim()
    .toLowerCase();

  return appData.financeEntries.filter((entry) => {
    if (monthFilter !== 'all' && getMonthKey(entry.date) !== monthFilter) return false;
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
    if (categoryFilter) {
      const cat = (entry.category || '').toLowerCase();
      if (!cat.includes(categoryFilter)) return false;
    }
    return true;
  });
}

function getPreviousMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map((v) => parseInt(v, 10));
  const prev = new Date(year, month - 2, 1);
  return getLocalDateString(prev).slice(0, 7);
}

function getMonthDayData(monthKey) {
  const [year, month] = monthKey.split('-').map((v) => parseInt(v, 10));
  const now = new Date();
  const currentMonthKey = getLocalDateString().slice(0, 7);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPeriod =
    monthKey === currentMonthKey ? Math.min(daysInMonth, now.getDate()) : daysInMonth;
  return { daysInMonth, daysInPeriod };
}

function calculatePercentChange(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) {
    if (!Number.isFinite(current) || current === 0) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getRecurringSkipKey(recurringId, monthKey) {
  return `${String(recurringId)}|${monthKey}`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setFinanceDelta(elementId, changeValue, inverseGood) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const formatted = `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(1).replace('.', ',')}%`;
  element.textContent = `vs mês anterior: ${formatted}`;
  element.className = 'finance-delta';
  if (Math.abs(changeValue) < 0.05) {
    element.classList.add('neutral');
    return;
  }
  const isPositive = changeValue > 0;
  const isGood = inverseGood ? !isPositive : isPositive;
  element.classList.add(isGood ? 'positive' : 'negative');
}

function updateFinanceKpiContext(monthKey) {
  const noteEl = document.getElementById('finance-kpi-note');
  if (!noteEl) return;
  if (!monthKey || monthKey.length !== 7) {
    noteEl.textContent =
      'KPIs do topo consideram apenas o mês selecionado (ignoram filtros de tipo e categoria).';
    return;
  }
  const [year, month] = monthKey.split('-');
  noteEl.textContent = `KPIs do topo consideram ${month}/${year} (ignoram filtros de tipo e categoria).`;
}

function populateFinanceMonthOptions() {
  const select = document.getElementById('finance-month');
  if (!select) return;

  const current = getLocalDateString().slice(0, 7);
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = getLocalDateString(d).slice(0, 7);
    months.push(key);
  }

  select.innerHTML =
    '<option value="all">Todos</option>' +
    months.map((m) => `<option value="${m}">${m}</option>`).join('');
  select.value = current;
}

function updateFinanceCharts() {
  if (typeof Chart === 'undefined') return;

  const entries = getFinanceFilteredEntries();
  const income = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const pieCtx = document.getElementById('finance-pie-chart');
  if (pieCtx) {
    if (pieCtx.chart) pieCtx.chart.destroy();
    pieCtx.chart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['Receitas', 'Despesas'],
        datasets: [
          {
            data: [income, expense],
            backgroundColor: ['rgba(124, 255, 178, 0.7)', 'rgba(255, 77, 141, 0.7)'],
            borderColor: ['rgba(124, 255, 178, 1)', 'rgba(255, 77, 141, 1)'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#C9D1E7',
            },
          },
        },
      },
    });
  }

  const balanceCtx = document.getElementById('finance-balance-chart');
  if (balanceCtx) {
    if (balanceCtx.chart) balanceCtx.chart.destroy();

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(getLocalDateString(d).slice(0, 7));
    }

    const balances = months.map((monthKey) => {
      const monthEntries = appData.financeEntries.filter((e) => getMonthKey(e.date) === monthKey);
      const inc = monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const exp = monthEntries
        .filter((e) => e.type === 'expense')
        .reduce((s, e) => s + e.amount, 0);
      return inc - exp;
    });

    balanceCtx.chart = new Chart(balanceCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Saldo',
            data: balances,
            backgroundColor: 'rgba(0, 229, 255, 0.35)',
            borderColor: 'rgba(0, 229, 255, 0.9)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#C9D1E7' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          x: {
            ticks: { color: '#C9D1E7' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#C9D1E7',
            },
          },
        },
      },
    });
  }

  const categoryCtx = document.getElementById('finance-category-chart');
  if (categoryCtx) {
    if (categoryCtx.chart) categoryCtx.chart.destroy();

    const incomeByCategory = {};
    const expenseByCategory = {};
    entries.forEach((e) => {
      const key = (e.category || 'Sem categoria').trim() || 'Sem categoria';
      if (e.type === 'income') {
        if (!incomeByCategory[key]) incomeByCategory[key] = 0;
        incomeByCategory[key] += e.amount;
      } else {
        if (!expenseByCategory[key]) expenseByCategory[key] = 0;
        expenseByCategory[key] += e.amount;
      }
    });

    const categoryLabels = Array.from(
      new Set([...Object.keys(incomeByCategory), ...Object.keys(expenseByCategory)])
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const incomeData = categoryLabels.map((k) => incomeByCategory[k] || 0);
    const expenseData = categoryLabels.map((k) => expenseByCategory[k] || 0);

    categoryCtx.chart = new Chart(categoryCtx, {
      type: 'bar',
      data: {
        labels: categoryLabels,
        datasets: [
          {
            label: 'Receitas por Categoria',
            data: incomeData,
            backgroundColor: 'rgba(124, 255, 178, 0.35)',
            borderColor: 'rgba(124, 255, 178, 0.9)',
            borderWidth: 1,
          },
          {
            label: 'Despesas por Categoria',
            data: expenseData,
            backgroundColor: 'rgba(255, 77, 141, 0.35)',
            borderColor: 'rgba(255, 77, 141, 0.9)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#C9D1E7' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          x: {
            ticks: { color: '#C9D1E7' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
        },
        plugins: {
          legend: {
            labels: {
              color: '#C9D1E7',
            },
          },
        },
      },
    });
  }
}

async function deleteFinanceEntry(entryId) {
  const confirmed = await askConfirmation('Deseja excluir este lançamento?', {
    title: 'Excluir lançamento',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;
  const index = appData.financeEntries.findIndex((e) => e.id === entryId);
  if (index === -1) return;
  const entry = appData.financeEntries[index];
  if (entry && entry.recurringId && entry.recurringMonth) {
    const skipKey = getRecurringSkipKey(entry.recurringId, entry.recurringMonth);
    if (!appData.financeRecurringSkips.includes(skipKey)) {
      appData.financeRecurringSkips.push(skipKey);
    }
  }
  appData.financeEntries.splice(index, 1);
  updateUI({ mode: 'finance' });
}

function handleFinanceBudgetSubmit(e) {
  e.preventDefault();
  const month =
    document.getElementById('finance-budget-month')?.value || getLocalDateString().slice(0, 7);
  const category = (document.getElementById('finance-budget-category')?.value || '').trim();
  const limit = parseFloat(document.getElementById('finance-budget-limit')?.value || '0');

  if (!month || !category || !Number.isFinite(limit) || limit <= 0) {
    showFeedback('Preencha mês, categoria e limite válido.', 'warn');
    return;
  }

  const existing = appData.financeBudgets.find(
    (b) => b.month === month && b.category.toLowerCase() === category.toLowerCase()
  );

  if (existing) {
    existing.limit = limit;
  } else {
    appData.financeBudgets.push({
      id: createUniqueId(appData.financeBudgets),
      month,
      category,
      limit,
    });
  }

  e.target.reset();
  const monthInput = document.getElementById('finance-budget-month');
  if (monthInput)
    monthInput.value =
      document.getElementById('finance-month')?.value !== 'all'
        ? document.getElementById('finance-month')?.value
        : getLocalDateString().slice(0, 7);
  updateUI({ mode: 'finance' });
}

async function deleteFinanceBudget(budgetId) {
  const confirmed = await askConfirmation('Deseja excluir este orçamento?', {
    title: 'Excluir orçamento',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;
  const idx = appData.financeBudgets.findIndex((b) => b.id === budgetId);
  if (idx === -1) return;
  appData.financeBudgets.splice(idx, 1);
  updateUI({ mode: 'finance' });
}

function handleFinanceRecurringSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('finance-recurring-type')?.value || 'expense';
  const amount = parseFloat(document.getElementById('finance-recurring-amount')?.value || '0');
  const category = (document.getElementById('finance-recurring-category')?.value || '').trim();
  const description = (document.getElementById('finance-recurring-desc')?.value || '').trim();
  const dayOfMonth = parseInt(document.getElementById('finance-recurring-day')?.value || '1', 10);
  const startDate =
    document.getElementById('finance-recurring-start')?.value || getLocalDateString();
  const endDate = document.getElementById('finance-recurring-end')?.value || '';

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(dayOfMonth) ||
    dayOfMonth < 1 ||
    dayOfMonth > 31
  ) {
    showFeedback('Preencha valor e dia do mês válidos.', 'warn');
    return;
  }
  if (endDate && endDate < startDate) {
    showFeedback('A data final não pode ser anterior à data inicial.', 'warn');
    return;
  }

  appData.financeRecurring.push({
    id: createUniqueId(appData.financeRecurring),
    type: type === 'income' ? 'income' : 'expense',
    amount,
    category,
    description,
    dayOfMonth,
    startDate,
    endDate,
    active: true,
  });

  e.target.reset();
  const startInput = document.getElementById('finance-recurring-start');
  if (startInput) startInput.value = getLocalDateString();
  updateUI({ mode: 'finance' });
}

async function deleteFinanceRecurring(recurringId) {
  const confirmed = await askConfirmation('Deseja excluir este lançamento recorrente?', {
    title: 'Excluir recorrente',
    confirmText: 'Excluir',
  });
  if (!confirmed) return;
  const idx = appData.financeRecurring.findIndex((r) => r.id === recurringId);
  if (idx === -1) return;
  appData.financeRecurring.splice(idx, 1);
  appData.financeRecurringSkips = (appData.financeRecurringSkips || []).filter(
    (key) => !key.startsWith(`${String(recurringId)}|`)
  );
  updateUI({ mode: 'finance' });
}
function createUniqueId(...lists) {
  const existingIds = new Set();
  lists.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item) => {
      if (item && item.id !== undefined && item.id !== null) {
        existingIds.add(String(item.id));
      }
    });
  });
  let candidate = Date.now();
  while (existingIds.has(String(candidate))) {
    candidate += 1;
  }
  return candidate;
}

function normalizeEntityIds(list) {
  if (!Array.isArray(list)) return;
  const used = new Set();
  let candidate = Date.now();

  list.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    let id = Number(item.id);
    if (!Number.isFinite(id) || used.has(String(id))) {
      while (used.has(String(candidate))) {
        candidate += 1;
      }
      id = candidate;
      candidate += 1;
    }
    item.id = id;
    used.add(String(id));
  });
}

function getCheckedDays(selector) {
  const dayCheckboxes = document.querySelectorAll(selector);
  return Array.from(dayCheckboxes).map((cb) => parseInt(cb.value, 10));
}

function createWorkoutPayload(name, emoji, type, days) {
  return {
    id: createUniqueId(appData.workouts),
    name,
    emoji: emoji || '??',
    type,
    days: days.length > 0 ? days : [1, 2, 3, 4, 5],
    xp: 0,
    level: 0,
    stats: {
      totalReps: 0,
      bestReps: 0,
      totalDistance: 0,
      bestDistance: 0,
      totalTime: 0,
      bestTime: 0,
      completed: 0,
    },
  };
}

function createStudyPayload(name, emoji, type, days) {
  return {
    id: createUniqueId(appData.studies),
    name,
    emoji: emoji || '??',
    type,
    days: days.length > 0 ? days : [1, 2, 3, 4, 5],
    xp: 0,
    level: 0,
    stats: {
      completed: 0,
      applied: 0,
    },
  };
}

function createBookPayload(name, emoji, status, author = '') {
  return {
    id: createUniqueId(appData.books),
    name,
    author: author || '',
    emoji: emoji || '📖',
    type: 'book',
    status: status === 'lendo' ? 'lendo' : 'quero-ler',
    completed: false,
    dateAdded: getLocalDateString(),
  };
}
// Renderizar calendário de missões
// __appDiaryFinanceBridge: exposes diary/finance APIs for legacy scripts during module migration
Object.assign(globalThis, {
  updateFinanceSummary,
  updateFinanceView,
  applyRecurringFinanceEntries,
  renderFinanceBudgets,
  renderFinanceRecurringList,
  renderFinanceList,
  getFinanceFilteredEntries,
  getPreviousMonthKey,
  getMonthDayData,
  calculatePercentChange,
  getRecurringSkipKey,
  escapeHtml,
  setFinanceDelta,
  updateFinanceKpiContext,
  populateFinanceMonthOptions,
  updateFinanceCharts,
  deleteFinanceEntry,
  handleFinanceBudgetSubmit,
  deleteFinanceBudget,
  handleFinanceRecurringSubmit,
  deleteFinanceRecurring,
  createUniqueId,
  normalizeEntityIds,
  getCheckedDays,
  createWorkoutPayload,
  createStudyPayload,
  createBookPayload,
});
