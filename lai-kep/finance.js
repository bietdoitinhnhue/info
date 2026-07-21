(() => {
  'use strict';

  const STORAGE_KEY = 'tich-luy-personal-finance-v1';
  const MAX_MONTHS = 600;
  const strategyNames = {
    snowball: 'Snowball',
    avalanche: 'Avalanche',
    hybrid: 'Hybrid'
  };

  const defaultState = {
    income: 30000000,
    essentialSpending: 12000000,
    familyBudget: 2500000,
    charityBudget: 500000,
    startMonth: '2026-08',
    monthlySavings: 1500000,
    monthlyInvestment: 2000000,
    emergencyCurrent: 30000000,
    emergencyContribution: 2000000,
    emergencyTargetMonths: 6,
    debtExtraPayment: 1000000,
    strategy: 'hybrid',
    debts: [
      { id: 'debt-consumer', name: 'Vay tiêu dùng', balance: 12000000, apr: 12, minimum: 800000 },
      { id: 'debt-card', name: 'Thẻ tín dụng', balance: 25000000, apr: 28, minimum: 1200000 },
      { id: 'debt-bnpl', name: 'Mua trước trả sau', balance: 18000000, apr: 20, minimum: 900000 },
      { id: 'debt-vehicle', name: 'Vay xe', balance: 70000000, apr: 9.5, minimum: 2000000 }
    ]
  };

  const root = document.getElementById('finance-manager');
  if (!root) return;

  const elements = {
    saveState: document.getElementById('financeSaveState'),
    overviewTab: document.getElementById('overviewTab'),
    debtTab: document.getElementById('debtTab'),
    overview: document.getElementById('financeOverview'),
    debtWorkspace: document.getElementById('debtWorkspace'),
    income: document.getElementById('financeIncome'),
    essentialSpending: document.getElementById('essentialSpending'),
    familyBudget: document.getElementById('familyBudget'),
    charityBudget: document.getElementById('charityBudget'),
    startMonth: document.getElementById('financeStartMonth'),
    monthlySavings: document.getElementById('monthlySavings'),
    monthlyInvestment: document.getElementById('monthlyInvestment'),
    emergencyCurrent: document.getElementById('emergencyCurrent'),
    emergencyContribution: document.getElementById('emergencyContribution'),
    emergencyTargetMonths: document.getElementById('emergencyTargetMonths'),
    debtExtraPayment: document.getElementById('debtExtraPayment'),
    availableCash: document.getElementById('availableCash'),
    availableCashNote: document.getElementById('availableCashNote'),
    financeScore: document.getElementById('financeScore'),
    emergencyRunway: document.getElementById('emergencyRunway'),
    emergencyTargetNote: document.getElementById('emergencyTargetNote'),
    debtFreeSummary: document.getElementById('debtFreeSummary'),
    debtFreeSummaryNote: document.getElementById('debtFreeSummaryNote'),
    obligationTotal: document.getElementById('obligationTotal'),
    safetyTotal: document.getElementById('safetyTotal'),
    growthTotal: document.getElementById('growthTotal'),
    obligationShare: document.getElementById('obligationShare'),
    safetyShare: document.getElementById('safetyShare'),
    growthShare: document.getElementById('growthShare'),
    allocatedRate: document.getElementById('allocatedRate'),
    budgetBar: document.getElementById('budgetBar'),
    budgetLegend: document.getElementById('budgetLegend'),
    recommendation: document.getElementById('financeRecommendation'),
    debtList: document.getElementById('debtList'),
    addDebtButton: document.getElementById('addDebtButton'),
    debtFreeDate: document.getElementById('debtFreeDate'),
    debtDuration: document.getElementById('debtDuration'),
    totalDebtInterest: document.getElementById('totalDebtInterest'),
    interestSaved: document.getElementById('interestSaved'),
    monthlyDebtBudget: document.getElementById('monthlyDebtBudget'),
    strategyComparison: document.getElementById('strategyComparison'),
    payoffTimeline: document.getElementById('debtPayoffTimeline'),
    scheduleBody: document.getElementById('debtScheduleBody'),
    debtPlanLabel: document.getElementById('debtPlanLabel'),
    exportButton: document.getElementById('exportFinanceButton'),
    importButton: document.getElementById('importFinanceButton'),
    importFile: document.getElementById('financeImportFile'),
    resetButton: document.getElementById('resetFinanceButton')
  };

  const fixedInputKeys = {
    financeIncome: 'income',
    essentialSpending: 'essentialSpending',
    familyBudget: 'familyBudget',
    charityBudget: 'charityBudget',
    financeStartMonth: 'startMonth',
    monthlySavings: 'monthlySavings',
    monthlyInvestment: 'monthlyInvestment',
    emergencyCurrent: 'emergencyCurrent',
    emergencyContribution: 'emergencyContribution',
    emergencyTargetMonths: 'emergencyTargetMonths',
    debtExtraPayment: 'debtExtraPayment'
  };

  let state = loadState();
  let renderTimer = null;
  let saveTimer = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const parseCurrency = (value) => {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
  };
  const formatInputCurrency = (value) => Math.round(safeNumber(value)).toLocaleString('vi-VN');
  const formatCurrency = (value, compact = false) => {
    const amount = safeNumber(value);
    if (compact) {
      const absolute = Math.abs(amount);
      const sign = amount < 0 ? '-' : '';
      if (absolute >= 1e9) return `${sign}${(absolute / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
      if (absolute >= 1e6) return `${sign}${(absolute / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
    }
    return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
  };
  const formatPercent = (value, digits = 1) => `${safeNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: digits })}%`;
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const uid = () => globalThis.crypto?.randomUUID?.() || `debt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function normalizeDebt(debt, index) {
    return {
      id: String(debt?.id || `debt-${index}-${Date.now()}`),
      name: String(debt?.name || `Khoản nợ ${index + 1}`).slice(0, 80),
      balance: clamp(safeNumber(debt?.balance), 0, 1e15),
      apr: clamp(safeNumber(debt?.apr), 0, 200),
      minimum: clamp(safeNumber(debt?.minimum), 0, 1e12)
    };
  }

  function normalizeState(candidate) {
    const base = cloneDefaults();
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const numericKeys = [
      'income', 'essentialSpending', 'familyBudget', 'charityBudget', 'monthlySavings',
      'monthlyInvestment', 'emergencyCurrent', 'emergencyContribution', 'debtExtraPayment'
    ];
    numericKeys.forEach((key) => { base[key] = clamp(safeNumber(source[key], base[key]), 0, 1e15); });
    base.emergencyTargetMonths = Math.round(clamp(safeNumber(source.emergencyTargetMonths, base.emergencyTargetMonths), 1, 24));
    base.startMonth = /^\d{4}-\d{2}$/.test(source.startMonth) ? source.startMonth : base.startMonth;
    base.strategy = strategyNames[source.strategy] ? source.strategy : base.strategy;
    if (Array.isArray(source.debts)) base.debts = source.debts.slice(0, 30).map(normalizeDebt);
    return base;
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      return cloneDefaults();
    }
  }

  function saveState() {
    clearTimeout(saveTimer);
    elements.saveState.classList.add('saving');
    elements.saveState.lastChild.textContent = ' Đang lưu...';
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        elements.saveState.classList.remove('saving');
        elements.saveState.lastChild.textContent = ' Đã lưu trên trình duyệt';
      } catch {
        elements.saveState.classList.remove('saving');
        elements.saveState.lastChild.textContent = ' Không thể lưu dữ liệu';
      }
    }, 180);
  }

  function setFixedInputs() {
    elements.income.value = formatInputCurrency(state.income);
    elements.essentialSpending.value = formatInputCurrency(state.essentialSpending);
    elements.familyBudget.value = formatInputCurrency(state.familyBudget);
    elements.charityBudget.value = formatInputCurrency(state.charityBudget);
    elements.startMonth.value = state.startMonth;
    elements.monthlySavings.value = formatInputCurrency(state.monthlySavings);
    elements.monthlyInvestment.value = formatInputCurrency(state.monthlyInvestment);
    elements.emergencyCurrent.value = formatInputCurrency(state.emergencyCurrent);
    elements.emergencyContribution.value = formatInputCurrency(state.emergencyContribution);
    elements.emergencyTargetMonths.value = state.emergencyTargetMonths;
    elements.debtExtraPayment.value = formatInputCurrency(state.debtExtraPayment);
  }

  function activeDebts() {
    return state.debts.filter((debt) => debt.balance > 0).map((debt) => ({ ...debt }));
  }

  function totalDebtMinimums() {
    return activeDebts().reduce((sum, debt) => sum + debt.minimum, 0);
  }

  function monthDate(startMonth, monthIndex) {
    const [year, month] = startMonth.split('-').map(Number);
    return new Date(year, month - 1 + monthIndex - 1, 1);
  }

  function formatMonth(date) {
    return `T${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  function chooseTarget(debts, strategy, hybridStarterId) {
    const remaining = debts.filter((debt) => debt.balance > .5);
    if (!remaining.length) return null;
    if (strategy === 'snowball') {
      return [...remaining].sort((a, b) => a.balance - b.balance || b.apr - a.apr)[0];
    }
    if (strategy === 'hybrid') {
      const starter = remaining.find((debt) => debt.id === hybridStarterId);
      if (starter) return starter;
    }
    return [...remaining].sort((a, b) => b.apr - a.apr || a.balance - b.balance)[0];
  }

  function simulateDebtStrategy(debts, extraPayment, strategy, startMonth) {
    const original = debts.filter((debt) => debt.balance > 0).map((debt) => ({ ...debt }));
    const work = original.map((debt) => ({ ...debt }));
    const minimumBudget = original.reduce((sum, debt) => sum + debt.minimum, 0);
    const monthlyBudget = minimumBudget + Math.max(extraPayment, 0);
    const hybridStarter = [...original].sort((a, b) => a.balance - b.balance || b.apr - a.apr)[0]?.id;
    const paidIds = new Set();
    const payoffs = [];
    const schedule = [];
    let totalInterest = 0;
    let complete = original.length === 0;
    let months = 0;

    if (!original.length) return { strategy, complete: true, months: 0, totalInterest: 0, monthlyBudget: 0, payoffs, schedule };

    for (let month = 1; month <= MAX_MONTHS; month += 1) {
      months = month;
      const openingBalance = work.reduce((sum, debt) => sum + debt.balance, 0);
      let monthInterest = 0;
      let monthPayment = 0;

      work.forEach((debt) => {
        if (debt.balance <= .5) return;
        const interest = debt.balance * debt.apr / 100 / 12;
        debt.balance += interest;
        monthInterest += interest;
      });
      totalInterest += monthInterest;

      work.forEach((debt) => {
        if (debt.balance <= .5) return;
        const payment = Math.min(debt.minimum, debt.balance);
        debt.balance -= payment;
        monthPayment += payment;
      });

      let available = Math.max(monthlyBudget - monthPayment, 0);
      const targets = [];
      let guard = 0;
      while (available > .5 && guard < work.length + 2) {
        const target = chooseTarget(work, strategy, hybridStarter);
        if (!target) break;
        if (!targets.includes(target.name)) targets.push(target.name);
        const payment = Math.min(available, target.balance);
        target.balance -= payment;
        available -= payment;
        monthPayment += payment;
        guard += 1;
      }

      work.forEach((debt) => {
        if (debt.balance <= .5 && !paidIds.has(debt.id)) {
          debt.balance = 0;
          paidIds.add(debt.id);
          payoffs.push({
            id: debt.id,
            name: debt.name,
            month,
            date: monthDate(startMonth, month),
            startingBalance: original.find((item) => item.id === debt.id)?.balance || 0
          });
        }
      });

      const endingBalance = work.reduce((sum, debt) => sum + debt.balance, 0);
      schedule.push({
        month,
        date: monthDate(startMonth, month),
        target: targets.join(' → ') || 'Trả tối thiểu',
        openingBalance,
        interest: monthInterest,
        payment: monthPayment,
        endingBalance
      });

      if (endingBalance <= .5) {
        complete = true;
        break;
      }
      if (monthPayment <= .5 && monthInterest > 0) break;
    }

    return { strategy, complete, months, totalInterest, monthlyBudget, payoffs, schedule };
  }

  function simulateMinimumOnly(debts) {
    let totalInterest = 0;
    let maxMonths = 0;
    let complete = true;
    debts.filter((debt) => debt.balance > 0).forEach((source) => {
      let balance = source.balance;
      let paid = false;
      for (let month = 1; month <= MAX_MONTHS; month += 1) {
        const interest = balance * source.apr / 100 / 12;
        totalInterest += interest;
        balance += interest;
        const payment = Math.min(source.minimum, balance);
        balance -= payment;
        if (balance <= .5) {
          maxMonths = Math.max(maxMonths, month);
          paid = true;
          break;
        }
        if (payment <= interest && month === MAX_MONTHS) break;
      }
      if (!paid) complete = false;
    });
    return { complete, months: maxMonths, totalInterest };
  }

  function calculatePlans() {
    const debts = activeDebts();
    return {
      snowball: simulateDebtStrategy(debts, state.debtExtraPayment, 'snowball', state.startMonth),
      avalanche: simulateDebtStrategy(debts, state.debtExtraPayment, 'avalanche', state.startMonth),
      hybrid: simulateDebtStrategy(debts, state.debtExtraPayment, 'hybrid', state.startMonth),
      baseline: simulateMinimumOnly(debts)
    };
  }

  function budgetSummary() {
    const minimumDebt = totalDebtMinimums();
    const debtBudget = activeDebts().length ? minimumDebt + state.debtExtraPayment : 0;
    const obligation = state.essentialSpending + state.familyBudget + state.charityBudget + debtBudget;
    const safety = state.monthlySavings + state.emergencyContribution;
    const growth = state.monthlyInvestment;
    const allocated = obligation + safety + growth;
    return { minimumDebt, debtBudget, obligation, safety, growth, allocated, available: state.income - allocated };
  }

  function financialScore(summary) {
    const income = Math.max(state.income, 1);
    const runway = state.essentialSpending > 0 ? state.emergencyCurrent / state.essentialSpending : state.emergencyTargetMonths;
    const cashScore = summary.available >= 0 ? 25 : clamp(25 + summary.available / income * 50, 0, 25);
    const emergencyScore = clamp(runway / state.emergencyTargetMonths, 0, 1) * 25;
    const debtRatio = summary.debtBudget / income;
    const debtScore = activeDebts().length === 0 ? 25 : debtRatio <= .2 ? 25 : debtRatio <= .35 ? 18 : debtRatio <= .5 ? 10 : 3;
    const futureRate = (summary.safety + summary.growth) / income;
    const futureScore = clamp(futureRate / .2, 0, 1) * 25;
    return Math.round(cashScore + emergencyScore + debtScore + futureScore);
  }

  function renderDashboard(plans) {
    const summary = budgetSummary();
    const selectedPlan = plans[state.strategy];
    const income = Math.max(state.income, 1);
    const runway = state.essentialSpending > 0 ? state.emergencyCurrent / state.essentialSpending : 0;
    const emergencyTarget = state.essentialSpending * state.emergencyTargetMonths;
    const emergencyProgress = emergencyTarget > 0 ? state.emergencyCurrent / emergencyTarget * 100 : 100;
    const score = financialScore(summary);

    elements.availableCash.textContent = formatCurrency(summary.available);
    elements.availableCash.classList.toggle('negative-value', summary.available < 0);
    elements.availableCashNote.textContent = summary.available >= 0 ? 'Có thể phân bổ thêm hoặc tạo vùng đệm' : `Đang vượt thu nhập ${formatCurrency(Math.abs(summary.available), true)}`;
    elements.financeScore.textContent = `${score}/100`;
    elements.emergencyRunway.textContent = `${runway.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tháng`;
    elements.emergencyTargetNote.textContent = `${formatPercent(emergencyProgress)} mục tiêu ${state.emergencyTargetMonths} tháng (${formatCurrency(emergencyTarget, true)})`;

    if (!activeDebts().length) {
      elements.debtFreeSummary.textContent = 'Không có nợ';
      elements.debtFreeSummaryNote.textContent = 'Có thể ưu tiên quỹ an toàn và đầu tư';
    } else if (selectedPlan.complete) {
      elements.debtFreeSummary.textContent = formatMonth(monthDate(state.startMonth, selectedPlan.months));
      elements.debtFreeSummaryNote.textContent = `${strategyNames[state.strategy]} · ${selectedPlan.months} tháng`;
    } else {
      elements.debtFreeSummary.textContent = '> 50 năm';
      elements.debtFreeSummaryNote.textContent = 'Cần tăng ngân sách trả nợ';
    }

    elements.obligationTotal.textContent = formatCurrency(summary.obligation, true);
    elements.safetyTotal.textContent = formatCurrency(summary.safety, true);
    elements.growthTotal.textContent = formatCurrency(summary.growth, true);
    elements.obligationShare.textContent = `${formatPercent(summary.obligation / income * 100)} thu nhập`;
    elements.safetyShare.textContent = `${formatPercent(summary.safety / income * 100)} thu nhập`;
    elements.growthShare.textContent = `${formatPercent(summary.growth / income * 100)} thu nhập`;
    elements.allocatedRate.textContent = `${formatPercent(summary.allocated / income * 100)} đã phân bổ`;

    const categories = [
      { label: 'Nợ', value: summary.debtBudget, color: '#bd4b43' },
      { label: 'Chi tiêu', value: state.essentialSpending, color: '#e9884d' },
      { label: 'Gia đình & thiện nguyện', value: state.familyBudget + state.charityBudget, color: '#d8aa63' },
      { label: 'Tiết kiệm', value: state.monthlySavings, color: '#75a889' },
      { label: 'Quỹ khẩn cấp', value: state.emergencyContribution, color: '#1b7655' },
      { label: 'Đầu tư', value: state.monthlyInvestment, color: '#10261f' },
      { label: summary.available >= 0 ? 'Chưa phân bổ' : 'Thiếu hụt', value: Math.abs(summary.available), color: summary.available >= 0 ? '#b8f36b' : '#7f2d2a' }
    ].filter((item) => item.value > 0);
    const barTotal = Math.max(state.income, summary.allocated);
    elements.budgetBar.innerHTML = categories.map((item) => `<span style="width:${item.value / barTotal * 100}%;background:${item.color}" title="${escapeHtml(item.label)}: ${formatCurrency(item.value)}"></span>`).join('');
    elements.budgetLegend.innerHTML = categories.map((item) => `
      <div><i style="background:${item.color}"></i><span>${escapeHtml(item.label)}<strong>${formatCurrency(item.value, true)} · ${formatPercent(item.value / income * 100)}</strong></span></div>
    `).join('');

    const highestAprDebt = activeDebts().sort((a, b) => b.apr - a.apr)[0];
    let recommendation = { good: false, title: 'Giữ dòng tiền dương trước', text: 'Giảm một phần chi tiêu linh hoạt hoặc tạm hạ mức đầu tư để tổng phân bổ không vượt thu nhập.' };
    if (summary.available >= 0 && runway < 1) {
      recommendation = { good: false, title: 'Dựng 1 tháng quỹ khẩn cấp trước', text: `Ưu tiên phần tiền còn lại cho quỹ khẩn cấp đến ít nhất ${formatCurrency(state.essentialSpending, true)}, đồng thời vẫn trả tối thiểu mọi khoản nợ.` };
    } else if (summary.available >= 0 && highestAprDebt?.apr >= 15) {
      recommendation = { good: false, title: `Tấn công ${highestAprDebt.name}`, text: `Khoản này có lãi ${formatPercent(highestAprDebt.apr, 2)}/năm. Avalanche tối ưu tiền lãi; Hybrid phù hợp nếu bạn vẫn cần một chiến thắng nhanh để duy trì kỷ luật.` };
    } else if (summary.available >= 0 && emergencyProgress < 100) {
      const gap = Math.max(emergencyTarget - state.emergencyCurrent, 0);
      recommendation = { good: true, title: 'Hoàn thiện quỹ an toàn', text: `Quỹ còn thiếu ${formatCurrency(gap, true)}. Có thể chia phần dư giữa quỹ khẩn cấp và mục tiêu đầu tư dài hạn.` };
    } else if (summary.available >= 0) {
      recommendation = { good: true, title: 'Dòng tiền đang có vùng đệm', text: `Còn ${formatCurrency(summary.available, true)} mỗi tháng. Có thể tăng đầu tư, trả nợ sớm hoặc dành cho mục tiêu gia đình mà không phá vỡ kế hoạch hiện tại.` };
    }
    elements.recommendation.classList.toggle('good', recommendation.good);
    elements.recommendation.innerHTML = `<span>Ưu tiên tháng này</span><strong>${escapeHtml(recommendation.title)}</strong><p>${escapeHtml(recommendation.text)}</p>`;
  }

  function renderDebtList() {
    if (!state.debts.length) {
      elements.debtList.innerHTML = '<div class="debt-empty">Chưa có khoản nợ. Nhấn “Thêm khoản nợ” để bắt đầu lập kế hoạch.</div>';
      return;
    }
    elements.debtList.innerHTML = state.debts.map((debt) => `
      <div class="debt-row" data-debt-id="${escapeHtml(debt.id)}">
        <input class="debt-name" data-debt-field="name" type="text" value="${escapeHtml(debt.name)}" aria-label="Tên khoản nợ">
        <input data-debt-field="balance" data-debt-currency type="text" inputmode="numeric" value="${formatInputCurrency(debt.balance)}" aria-label="Dư nợ ${escapeHtml(debt.name)}">
        <input data-debt-field="apr" type="number" min="0" max="200" step="0.1" value="${debt.apr}" aria-label="Lãi suất năm ${escapeHtml(debt.name)}">
        <input data-debt-field="minimum" data-debt-currency type="text" inputmode="numeric" value="${formatInputCurrency(debt.minimum)}" aria-label="Thanh toán tối thiểu ${escapeHtml(debt.name)}">
        <button class="remove-debt" data-remove-debt="${escapeHtml(debt.id)}" type="button" aria-label="Xóa ${escapeHtml(debt.name)}">×</button>
      </div>
    `).join('');
  }

  function renderDebtResults(plans) {
    const selected = plans[state.strategy];
    const hasDebt = activeDebts().length > 0;
    const interestSaved = plans.baseline.complete ? Math.max(plans.baseline.totalInterest - selected.totalInterest, 0) : null;
    document.querySelectorAll('[data-debt-strategy]').forEach((button) => {
      const active = button.dataset.debtStrategy === state.strategy;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    elements.debtPlanLabel.textContent = strategyNames[state.strategy];
    elements.debtFreeDate.textContent = !hasDebt ? 'Không có nợ' : selected.complete ? formatMonth(monthDate(state.startMonth, selected.months)) : '> 50 năm';
    elements.debtDuration.textContent = !hasDebt ? 'Danh mục nợ đang trống' : selected.complete ? `${selected.months} tháng để hoàn tất` : 'Ngân sách chưa đủ để kết thúc';
    elements.totalDebtInterest.textContent = formatCurrency(selected.totalInterest, true);
    elements.interestSaved.textContent = interestSaved === null ? 'Chưa xác định' : formatCurrency(interestSaved, true);
    elements.monthlyDebtBudget.textContent = formatCurrency(selected.monthlyBudget, true);

    elements.strategyComparison.innerHTML = ['snowball', 'avalanche', 'hybrid'].map((strategy) => {
      const plan = plans[strategy];
      const first = plan.payoffs[0]?.name || 'Chưa xác định';
      return `
        <button class="comparison-card ${strategy === state.strategy ? 'active' : ''}" type="button" data-compare-strategy="${strategy}">
          <header><strong>${strategyNames[strategy]}</strong><span>${plan.complete ? `${plan.months} tháng` : '> 50 năm'}</span></header>
          <div><span><small>Tổng tiền lãi</small><b>${formatCurrency(plan.totalInterest, true)}</b></span><span><small>Xóa đầu tiên</small><b>${escapeHtml(first)}</b></span></div>
        </button>
      `;
    }).join('');

    if (!hasDebt) {
      elements.payoffTimeline.innerHTML = '<div class="debt-empty">Không có khoản nợ cần lập timeline.</div>';
      elements.scheduleBody.innerHTML = '<tr><td colspan="6">Chưa có lịch thanh toán.</td></tr>';
      return;
    }

    elements.payoffTimeline.innerHTML = selected.payoffs.map((event, index) => `
      <article class="payoff-event"><span>Mốc ${String(index + 1).padStart(2, '0')} · ${formatMonth(event.date)}</span><strong>${escapeHtml(event.name)}</strong><small>Xóa dư nợ ban đầu ${formatCurrency(event.startingBalance, true)} sau ${event.month} tháng.</small></article>
    `).join('') || '<div class="debt-empty">Chưa có khoản nào được thanh toán hết trong phạm vi mô phỏng.</div>';

    elements.scheduleBody.innerHTML = selected.schedule.slice(0, 24).map((row) => `
      <tr><td>${formatMonth(row.date)}</td><td>${escapeHtml(row.target)}</td><td>${formatCurrency(row.openingBalance)}</td><td>${formatCurrency(row.interest)}</td><td>${formatCurrency(row.payment)}</td><td>${formatCurrency(row.endingBalance)}</td></tr>
    `).join('');
  }

  function renderAll({ debts = false } = {}) {
    if (debts) renderDebtList();
    const plans = calculatePlans();
    renderDashboard(plans);
    renderDebtResults(plans);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      renderAll();
      saveState();
    }, 100);
  }

  function showTab(tab) {
    const selected = tab === 'debt' ? 'debt' : 'overview';
    elements.overview.hidden = selected !== 'overview';
    elements.debtWorkspace.hidden = selected !== 'debt';
    [elements.overviewTab, elements.debtTab].forEach((button) => {
      const active = button.dataset.financeTab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function syncInvestmentCalculator() {
    const investmentInput = document.getElementById('monthlyContribution');
    const startInput = document.getElementById('startMonth');
    if (investmentInput && parseCurrency(investmentInput.value) !== state.monthlyInvestment) {
      investmentInput.value = formatInputCurrency(state.monthlyInvestment);
      investmentInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (startInput && startInput.value !== state.startMonth) {
      startInput.value = state.startMonth;
      startInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateFixedState(input) {
    const key = fixedInputKeys[input.id];
    if (!key) return;
    if (input.type === 'month') state[key] = /^\d{4}-\d{2}$/.test(input.value) ? input.value : defaultState.startMonth;
    else if (input.type === 'number') state[key] = input.id === 'emergencyTargetMonths'
      ? Math.round(clamp(safeNumber(input.value, 1), 1, 24))
      : Math.max(safeNumber(input.value), 0);
    else state[key] = parseCurrency(input.value);
  }

  function updateDebtState(input) {
    const row = input.closest('[data-debt-id]');
    const field = input.dataset.debtField;
    const debt = state.debts.find((item) => item.id === row?.dataset.debtId);
    if (!debt || !field) return;
    if (field === 'name') debt.name = input.value.slice(0, 80);
    else if (field === 'apr') debt.apr = clamp(safeNumber(input.value), 0, 200);
    else debt[field] = parseCurrency(input.value);
  }

  function exportFinanceData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'Tích Lũy Personal Finance',
      version: 1,
      data: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tai-chinh-ca-nhan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    elements.saveState.lastChild.textContent = ' Đã tải bản sao JSON';
  }

  async function importFinanceData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      state = normalizeState(parsed.data || parsed);
      setFixedInputs();
      renderAll({ debts: true });
      syncInvestmentCalculator();
      saveState();
    } catch {
      elements.saveState.lastChild.textContent = ' File JSON không hợp lệ';
    } finally {
      elements.importFile.value = '';
    }
  }

  root.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.debtField) updateDebtState(input);
    else updateFixedState(input);
    scheduleRender();
  });

  root.addEventListener('focusin', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && (input.hasAttribute('data-finance-currency') || input.hasAttribute('data-debt-currency'))) {
      input.value = parseCurrency(input.value) || '';
      input.select();
    }
  });

  root.addEventListener('focusout', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.hasAttribute('data-finance-currency') || input.hasAttribute('data-debt-currency')) input.value = formatInputCurrency(parseCurrency(input.value));
    if (input.id === 'monthlyInvestment' || input.id === 'financeStartMonth') syncInvestmentCalculator();
  });

  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-finance-tab]');
    if (tab) {
      showTab(tab.dataset.financeTab);
      return;
    }
    const strategyButton = event.target.closest('[data-debt-strategy], [data-compare-strategy]');
    if (strategyButton) {
      state.strategy = strategyButton.dataset.debtStrategy || strategyButton.dataset.compareStrategy;
      renderAll();
      saveState();
      return;
    }
    const removeButton = event.target.closest('[data-remove-debt]');
    if (removeButton) {
      state.debts = state.debts.filter((debt) => debt.id !== removeButton.dataset.removeDebt);
      renderAll({ debts: true });
      saveState();
    }
  });

  elements.addDebtButton.addEventListener('click', () => {
    state.debts.push({ id: uid(), name: `Khoản nợ ${state.debts.length + 1}`, balance: 0, apr: 0, minimum: 0 });
    renderAll({ debts: true });
    saveState();
    elements.debtList.querySelector('.debt-row:last-child .debt-name')?.focus();
  });
  elements.exportButton.addEventListener('click', exportFinanceData);
  elements.importButton?.addEventListener('click', () => elements.importFile.click());
  elements.importFile?.addEventListener('change', () => importFinanceData(elements.importFile.files?.[0]));
  elements.resetButton.addEventListener('click', () => {
    if (!window.confirm('Đặt lại toàn bộ dữ liệu quản lý tài chính về kịch bản mẫu?')) return;
    state = cloneDefaults();
    setFixedInputs();
    renderAll({ debts: true });
    syncInvestmentCalculator();
    saveState();
  });
  document.querySelectorAll('[data-open-finance-tab]').forEach((link) => link.addEventListener('click', () => showTab(link.dataset.openFinanceTab)));

  setFixedInputs();
  renderAll({ debts: true });
  syncInvestmentCalculator();
})();
