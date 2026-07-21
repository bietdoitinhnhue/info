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
    monthlyDebtReserve: 5000000,
    startMonth: '2026-08',
    monthlySavings: 1500000,
    monthlyInvestment: 1000000,
    emergencyCurrent: 30000000,
    emergencyContribution: 2334000,
    emergencyTargetMonths: 6,
    emergencyDeadlineMonths: 18,
    savingsGoalName: 'Quỹ cá nhân',
    savingsCurrent: 0,
    savingsGoalAmount: 36000000,
    savingsDeadlineMonths: 24,
    investmentCurrent: 0,
    investmentGoalAmount: 200000000,
    investmentDeadlineYears: 10,
    investmentExpectedReturn: 10,
    monthlyRiskInvestment: 613000,
    riskInvestmentCurrent: 0,
    riskInvestmentGoalAmount: 50000000,
    riskInvestmentDeadlineYears: 5,
    riskInvestmentExpectedReturn: 12,
    strategy: 'hybrid',
    debts: [
      { id: 'debt-consumer', name: 'Vay tiêu dùng', balance: 12000000, principalPayment: 680000, monthlyInterest: 120000 },
      { id: 'debt-card', name: 'Thẻ tín dụng', balance: 25000000, principalPayment: 616667, monthlyInterest: 583333 },
      { id: 'debt-bnpl', name: 'Mua trước trả sau', balance: 18000000, principalPayment: 600000, monthlyInterest: 300000 },
      { id: 'debt-vehicle', name: 'Vay xe', balance: 70000000, principalPayment: 1445833, monthlyInterest: 554167 }
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
    monthlyDebtReserve: document.getElementById('monthlyDebtReserve'),
    startMonth: document.getElementById('financeStartMonth'),
    monthlySavings: document.getElementById('monthlySavings'),
    monthlyInvestment: document.getElementById('monthlyInvestment'),
    emergencyCurrent: document.getElementById('emergencyCurrent'),
    emergencyContribution: document.getElementById('emergencyContribution'),
    emergencyTargetMonths: document.getElementById('emergencyTargetMonths'),
    emergencyDeadlineMonths: document.getElementById('emergencyDeadlineMonths'),
    savingsGoalName: document.getElementById('savingsGoalName'),
    savingsCurrent: document.getElementById('savingsCurrent'),
    savingsGoalAmount: document.getElementById('savingsGoalAmount'),
    savingsDeadlineMonths: document.getElementById('savingsDeadlineMonths'),
    investmentCurrent: document.getElementById('investmentCurrent'),
    investmentGoalAmount: document.getElementById('investmentGoalAmount'),
    investmentDeadlineYears: document.getElementById('investmentDeadlineYears'),
    investmentExpectedReturn: document.getElementById('investmentExpectedReturn'),
    monthlyRiskInvestment: document.getElementById('monthlyRiskInvestment'),
    riskInvestmentCurrent: document.getElementById('riskInvestmentCurrent'),
    riskInvestmentGoalAmount: document.getElementById('riskInvestmentGoalAmount'),
    riskInvestmentDeadlineYears: document.getElementById('riskInvestmentDeadlineYears'),
    riskInvestmentExpectedReturn: document.getElementById('riskInvestmentExpectedReturn'),
    fundEmergencyBalance: document.getElementById('fundEmergencyBalance'),
    fundEmergencyPlan: document.getElementById('fundEmergencyPlan'),
    fundEmergencyTarget: document.getElementById('fundEmergencyTarget'),
    fundEmergencyProgress: document.getElementById('fundEmergencyProgress'),
    fundEmergencyCard: document.getElementById('fundEmergencyCard'),
    fundSavingsBalance: document.getElementById('fundSavingsBalance'),
    fundSavingsPlan: document.getElementById('fundSavingsPlan'),
    fundSavingsTarget: document.getElementById('fundSavingsTarget'),
    fundSavingsProgress: document.getElementById('fundSavingsProgress'),
    fundSavingsCard: document.getElementById('fundSavingsCard'),
    fundInvestmentBalance: document.getElementById('fundInvestmentBalance'),
    fundInvestmentPlan: document.getElementById('fundInvestmentPlan'),
    fundInvestmentTarget: document.getElementById('fundInvestmentTarget'),
    fundInvestmentProgress: document.getElementById('fundInvestmentProgress'),
    fundInvestmentCard: document.getElementById('fundInvestmentCard'),
    fundRiskBalance: document.getElementById('fundRiskBalance'),
    fundRiskPlan: document.getElementById('fundRiskPlan'),
    fundRiskTarget: document.getElementById('fundRiskTarget'),
    fundRiskProgress: document.getElementById('fundRiskProgress'),
    fundRiskCard: document.getElementById('fundRiskCard'),
    autoDebtExtraDisplay: document.getElementById('autoDebtExtraDisplay'),
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
    monthlyDebtReserve: 'monthlyDebtReserve',
    financeStartMonth: 'startMonth',
    emergencyCurrent: 'emergencyCurrent',
    emergencyTargetMonths: 'emergencyTargetMonths',
    emergencyDeadlineMonths: 'emergencyDeadlineMonths',
    savingsGoalName: 'savingsGoalName',
    savingsCurrent: 'savingsCurrent',
    savingsGoalAmount: 'savingsGoalAmount',
    savingsDeadlineMonths: 'savingsDeadlineMonths',
    investmentCurrent: 'investmentCurrent',
    investmentGoalAmount: 'investmentGoalAmount',
    investmentDeadlineYears: 'investmentDeadlineYears',
    investmentExpectedReturn: 'investmentExpectedReturn',
    riskInvestmentCurrent: 'riskInvestmentCurrent',
    riskInvestmentGoalAmount: 'riskInvestmentGoalAmount',
    riskInvestmentDeadlineYears: 'riskInvestmentDeadlineYears',
    riskInvestmentExpectedReturn: 'riskInvestmentExpectedReturn'
  };

  let state = null;
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
  state = loadState();

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function normalizeDebt(debt, index) {
    const balance = clamp(safeNumber(debt?.balance), 0, 1e15);
    const legacyApr = clamp(safeNumber(debt?.apr), 0, 200);
    const legacyMinimum = clamp(safeNumber(debt?.minimum), 0, 1e12);
    const inferredInterest = balance * legacyApr / 100 / 12;
    const monthlyInterest = clamp(safeNumber(debt?.monthlyInterest, inferredInterest), 0, 1e12);
    const principalPayment = clamp(safeNumber(debt?.principalPayment, Math.max(legacyMinimum - monthlyInterest, 0)), 0, 1e12);
    return {
      id: String(debt?.id || `debt-${index}-${Date.now()}`),
      name: String(debt?.name || `Khoản nợ ${index + 1}`).slice(0, 80),
      balance,
      principalPayment,
      monthlyInterest,
      apr: balance > 0 ? clamp(monthlyInterest / balance * 12 * 100, 0, 200) : legacyApr,
      minimum: principalPayment + monthlyInterest
    };
  }

  function deriveGoalContributions(target) {
    const roundUpThousand = (value) => value > 0 ? Math.ceil(value / 1000) * 1000 : 0;
    const compoundContribution = (current, goal, years, annualReturn) => {
      const months = Math.max(Math.round(years * 12), 1);
      const monthlyRate = annualReturn / 100 / 12;
      const growthFactor = Math.pow(1 + monthlyRate, months);
      const remainingGoal = Math.max(goal - current * growthFactor, 0);
      const required = monthlyRate > 0
        ? remainingGoal * monthlyRate / Math.max(growthFactor - 1, 1e-9)
        : remainingGoal / months;
      return roundUpThousand(required);
    };
    const emergencyTarget = target.essentialSpending * target.emergencyTargetMonths;
    target.emergencyContribution = roundUpThousand(Math.max(emergencyTarget - target.emergencyCurrent, 0) / Math.max(target.emergencyDeadlineMonths, 1));
    target.monthlySavings = roundUpThousand(Math.max(target.savingsGoalAmount - target.savingsCurrent, 0) / Math.max(target.savingsDeadlineMonths, 1));
    target.monthlyInvestment = clamp(compoundContribution(
      target.investmentCurrent,
      target.investmentGoalAmount,
      target.investmentDeadlineYears,
      target.investmentExpectedReturn
    ), 1e6, 1e9);
    target.monthlyRiskInvestment = clamp(compoundContribution(
      target.riskInvestmentCurrent,
      target.riskInvestmentGoalAmount,
      target.riskInvestmentDeadlineYears,
      target.riskInvestmentExpectedReturn
    ), 0, 1e9);
    return target;
  }

  function normalizeState(candidate) {
    const base = cloneDefaults();
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const numericKeys = [
      'income', 'essentialSpending', 'familyBudget', 'charityBudget', 'monthlyDebtReserve',
      'emergencyCurrent', 'savingsCurrent', 'savingsGoalAmount', 'investmentCurrent',
      'investmentGoalAmount', 'riskInvestmentCurrent', 'riskInvestmentGoalAmount'
    ];
    numericKeys.forEach((key) => { base[key] = clamp(safeNumber(source[key], base[key]), 0, 1e15); });
    base.emergencyTargetMonths = Math.round(clamp(safeNumber(source.emergencyTargetMonths, base.emergencyTargetMonths), 1, 24));
    base.emergencyDeadlineMonths = Math.round(clamp(safeNumber(source.emergencyDeadlineMonths, base.emergencyDeadlineMonths), 1, 120));
    base.savingsDeadlineMonths = Math.round(clamp(safeNumber(source.savingsDeadlineMonths, base.savingsDeadlineMonths), 1, 240));
    base.investmentDeadlineYears = Math.round(clamp(safeNumber(source.investmentDeadlineYears, base.investmentDeadlineYears), 1, 50));
    base.investmentExpectedReturn = clamp(safeNumber(source.investmentExpectedReturn, base.investmentExpectedReturn), 0, 100);
    base.riskInvestmentDeadlineYears = Math.round(clamp(safeNumber(source.riskInvestmentDeadlineYears, base.riskInvestmentDeadlineYears), 1, 50));
    base.riskInvestmentExpectedReturn = clamp(safeNumber(source.riskInvestmentExpectedReturn, base.riskInvestmentExpectedReturn), 0, 200);
    base.savingsGoalName = String(source.savingsGoalName || base.savingsGoalName).slice(0, 80);
    base.startMonth = /^\d{4}-\d{2}$/.test(source.startMonth) ? source.startMonth : base.startMonth;
    base.strategy = strategyNames[source.strategy] ? source.strategy : base.strategy;
    base.debts = (Array.isArray(source.debts) ? source.debts : base.debts).slice(0, 30).map(normalizeDebt);
    return deriveGoalContributions(base);
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      return normalizeState(null);
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
    elements.monthlyDebtReserve.value = formatInputCurrency(state.monthlyDebtReserve);
    elements.startMonth.value = state.startMonth;
    elements.monthlySavings.value = formatInputCurrency(state.monthlySavings);
    elements.monthlyInvestment.value = formatInputCurrency(state.monthlyInvestment);
    elements.emergencyCurrent.value = formatInputCurrency(state.emergencyCurrent);
    elements.emergencyContribution.value = formatInputCurrency(state.emergencyContribution);
    elements.emergencyTargetMonths.value = state.emergencyTargetMonths;
    elements.emergencyDeadlineMonths.value = state.emergencyDeadlineMonths;
    elements.savingsGoalName.value = state.savingsGoalName;
    elements.savingsCurrent.value = formatInputCurrency(state.savingsCurrent);
    elements.savingsGoalAmount.value = formatInputCurrency(state.savingsGoalAmount);
    elements.savingsDeadlineMonths.value = state.savingsDeadlineMonths;
    elements.investmentCurrent.value = formatInputCurrency(state.investmentCurrent);
    elements.investmentGoalAmount.value = formatInputCurrency(state.investmentGoalAmount);
    elements.investmentDeadlineYears.value = state.investmentDeadlineYears;
    elements.investmentExpectedReturn.value = state.investmentExpectedReturn;
    elements.monthlyRiskInvestment.value = formatInputCurrency(state.monthlyRiskInvestment);
    elements.riskInvestmentCurrent.value = formatInputCurrency(state.riskInvestmentCurrent);
    elements.riskInvestmentGoalAmount.value = formatInputCurrency(state.riskInvestmentGoalAmount);
    elements.riskInvestmentDeadlineYears.value = state.riskInvestmentDeadlineYears;
    elements.riskInvestmentExpectedReturn.value = state.riskInvestmentExpectedReturn;
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

  function simulateDebtStrategy(debts, debtReserve, extraPayment, strategy, startMonth) {
    const original = debts.filter((debt) => debt.balance > 0).map((debt) => ({ ...debt }));
    const work = original.map((debt) => ({ ...debt }));
    const minimumBudget = original.reduce((sum, debt) => sum + debt.minimum, 0);
    const monthlyBudget = Math.max(minimumBudget, Math.max(debtReserve, 0)) + Math.max(extraPayment, 0);
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
        debt.currentInterest = interest;
        debt.balance += interest;
        monthInterest += interest;
      });
      totalInterest += monthInterest;

      work.forEach((debt) => {
        if (debt.balance <= .5) return;
        const payment = Math.min(debt.principalPayment + (debt.currentInterest || 0), debt.balance);
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
        const payment = Math.min(source.principalPayment + interest, balance);
        balance -= payment;
        if (balance <= .5) {
          maxMonths = Math.max(maxMonths, month);
          paid = true;
          break;
        }
        if (source.principalPayment <= .5 && month === MAX_MONTHS) break;
      }
      if (!paid) complete = false;
    });
    return { complete, months: maxMonths, totalInterest };
  }

  function calculatePlans() {
    const debts = activeDebts();
    const summary = budgetSummary();
    return {
      snowball: simulateDebtStrategy(debts, summary.mandatoryDebtBudget, summary.autoDebtExtra, 'snowball', state.startMonth),
      avalanche: simulateDebtStrategy(debts, summary.mandatoryDebtBudget, summary.autoDebtExtra, 'avalanche', state.startMonth),
      hybrid: simulateDebtStrategy(debts, summary.mandatoryDebtBudget, summary.autoDebtExtra, 'hybrid', state.startMonth),
      baseline: simulateMinimumOnly(debts)
    };
  }

  function budgetSummary() {
    const minimumDebt = totalDebtMinimums();
    const hasDebt = activeDebts().length > 0;
    const reserveShortfall = hasDebt ? Math.max(minimumDebt - state.monthlyDebtReserve, 0) : 0;
    const mandatoryDebtBudget = hasDebt ? Math.max(minimumDebt, state.monthlyDebtReserve) : 0;
    const safety = state.monthlySavings + state.emergencyContribution;
    const growth = state.monthlyInvestment + state.monthlyRiskInvestment;
    const baseObligation = state.essentialSpending + state.familyBudget + state.charityBudget + mandatoryDebtBudget;
    const baseAllocated = baseObligation + safety + growth;
    const rawAvailable = state.income - baseAllocated;
    const autoDebtExtra = hasDebt ? Math.max(rawAvailable, 0) : 0;
    const debtBudget = mandatoryDebtBudget + autoDebtExtra;
    const obligation = state.essentialSpending + state.familyBudget + state.charityBudget + debtBudget;
    const allocated = obligation + safety + growth;
    return {
      hasDebt,
      minimumDebt,
      reserveShortfall,
      mandatoryDebtBudget,
      autoDebtExtra,
      rawAvailable,
      debtBudget,
      obligation,
      safety,
      growth,
      allocated,
      available: state.income - allocated
    };
  }

  function financialScore(summary) {
    const income = Math.max(state.income, 1);
    const runway = state.essentialSpending > 0 ? state.emergencyCurrent / state.essentialSpending : state.emergencyTargetMonths;
    const cashScore = summary.available >= 0 ? 25 : clamp(25 + summary.available / income * 50, 0, 25);
    const emergencyScore = clamp(runway / state.emergencyTargetMonths, 0, 1) * 25;
    const debtRatio = summary.mandatoryDebtBudget / income;
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

    elements.autoDebtExtraDisplay.textContent = formatCurrency(summary.autoDebtExtra);
    elements.availableCash.textContent = formatCurrency(summary.available);
    elements.availableCash.classList.toggle('negative-value', summary.available < 0);
    if (summary.autoDebtExtra > 0) {
      elements.availableCashNote.textContent = `${formatCurrency(summary.autoDebtExtra, true)} phần dư đã tự động dồn trả nợ`;
    } else if (summary.available >= 0) {
      elements.availableCashNote.textContent = 'Có thể phân bổ thêm hoặc tạo vùng đệm';
    } else {
      elements.availableCashNote.textContent = `Đang vượt thu nhập ${formatCurrency(Math.abs(summary.available), true)}`;
    }
    elements.financeScore.textContent = `${score}/100`;
    elements.emergencyRunway.textContent = `${runway.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tháng`;
    elements.emergencyTargetNote.textContent = `${formatPercent(emergencyProgress)} mục tiêu ${state.emergencyTargetMonths} tháng (${formatCurrency(emergencyTarget, true)})`;
    const renderFund = (card, progressOutput, balanceOutput, planOutput, targetOutput, current, contribution, target) => {
      const progress = target > 0 ? clamp(current / target * 100, 0, 100) : 100;
      card.style.setProperty('--fund-progress', `${progress}%`);
      progressOutput.textContent = formatPercent(progress, 0);
      balanceOutput.textContent = formatCurrency(current);
      planOutput.textContent = `+${formatCurrency(contribution, true)}`;
      targetOutput.textContent = formatCurrency(target, true);
    };
    renderFund(elements.fundEmergencyCard, elements.fundEmergencyProgress, elements.fundEmergencyBalance, elements.fundEmergencyPlan, elements.fundEmergencyTarget, state.emergencyCurrent, state.emergencyContribution, emergencyTarget);
    renderFund(elements.fundSavingsCard, elements.fundSavingsProgress, elements.fundSavingsBalance, elements.fundSavingsPlan, elements.fundSavingsTarget, state.savingsCurrent, state.monthlySavings, state.savingsGoalAmount);
    renderFund(elements.fundInvestmentCard, elements.fundInvestmentProgress, elements.fundInvestmentBalance, elements.fundInvestmentPlan, elements.fundInvestmentTarget, state.investmentCurrent, state.monthlyInvestment, state.investmentGoalAmount);
    renderFund(elements.fundRiskCard, elements.fundRiskProgress, elements.fundRiskBalance, elements.fundRiskPlan, elements.fundRiskTarget, state.riskInvestmentCurrent, state.monthlyRiskInvestment, state.riskInvestmentGoalAmount);

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
      { label: state.savingsGoalName || 'Tiết kiệm cá nhân', value: state.monthlySavings, color: '#75a889' },
      { label: 'Quỹ khẩn cấp', value: state.emergencyContribution, color: '#1b7655' },
      { label: 'Đầu tư dài hạn', value: state.monthlyInvestment, color: '#10261f' },
      { label: 'Đầu tư rủi ro', value: state.monthlyRiskInvestment, color: '#7f4bb2' },
      { label: summary.available >= 0 ? 'Chưa phân bổ' : 'Thiếu hụt', value: Math.abs(summary.available), color: summary.available >= 0 ? '#b8f36b' : '#7f2d2a' }
    ].filter((item) => item.value > 0);
    const barTotal = Math.max(state.income, summary.allocated);
    elements.budgetBar.innerHTML = categories.map((item) => `<span style="width:${item.value / barTotal * 100}%;background:${item.color}" title="${escapeHtml(item.label)}: ${formatCurrency(item.value)}"></span>`).join('');
    elements.budgetLegend.innerHTML = categories.map((item) => `
      <div><i style="background:${item.color}"></i><span>${escapeHtml(item.label)}<strong>${formatCurrency(item.value, true)} · ${formatPercent(item.value / income * 100)}</strong></span></div>
    `).join('');

    const highestAprDebt = activeDebts().sort((a, b) => b.apr - a.apr)[0];
    let recommendation = { good: false, title: 'Giữ dòng tiền dương trước', text: 'Giảm một phần chi tiêu linh hoạt hoặc tạm hạ mức đầu tư để tổng phân bổ không vượt thu nhập.' };
    if (summary.reserveShortfall > 0) {
      recommendation = { good: false, title: 'Mức trả nợ tối thiểu đang thiếu', text: `Tổng gốc + lãi tháng đầu là ${formatCurrency(summary.minimumDebt, true)}, cao hơn số tiền bạn nhập ${formatCurrency(summary.reserveShortfall, true)}. Công cụ đang dùng mức hợp đồng thực tế để tránh trả thiếu.` };
    } else if (summary.available < 0) {
      recommendation = { good: false, title: 'Mục tiêu đang vượt thu nhập', text: `Kế hoạch thiếu ${formatCurrency(Math.abs(summary.available), true)} mỗi tháng. Hãy kéo dài thời hạn mục tiêu, giảm chi linh hoạt hoặc điều chỉnh khoản đầu tư trước khi tăng tốc trả nợ.` };
    } else if (summary.autoDebtExtra > 0) {
      recommendation = { good: true, title: `Tự động dồn ${formatCurrency(summary.autoDebtExtra, true)} để trả nợ`, text: `Sau mọi nghĩa vụ và quỹ mục tiêu, toàn bộ phần dư được đưa vào ngân sách ${strategyNames[state.strategy]} để rút ngắn thời gian trả nợ.` };
    } else if (summary.available >= 0 && runway < 1) {
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
        <input data-debt-field="principalPayment" data-debt-currency type="text" inputmode="numeric" value="${formatInputCurrency(debt.principalPayment)}" aria-label="Tiền gốc mỗi tháng ${escapeHtml(debt.name)}">
        <input data-debt-field="monthlyInterest" data-debt-currency type="text" inputmode="numeric" value="${formatInputCurrency(debt.monthlyInterest)}" aria-label="Tiền lãi tháng hiện tại ${escapeHtml(debt.name)}">
        <span class="debt-derived" data-debt-derived-apr><small>Lãi suất quy đổi</small><strong>${formatPercent(debt.apr, 2)}/năm</strong></span>
        <span class="debt-derived debt-derived-total" data-debt-derived-total><small>Gốc + lãi</small><strong>${formatCurrency(debt.minimum, true)}</strong></span>
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
      syncInvestmentCalculator();
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
    if (key === 'savingsGoalName') state[key] = input.value.slice(0, 80);
    else if (input.type === 'month') state[key] = /^\d{4}-\d{2}$/.test(input.value) ? input.value : defaultState.startMonth;
    else if (input.type === 'number') {
      const limits = {
        emergencyTargetMonths: [1, 24],
        emergencyDeadlineMonths: [1, 120],
        savingsDeadlineMonths: [1, 240],
        investmentDeadlineYears: [1, 50],
        investmentExpectedReturn: [0, 100],
        riskInvestmentDeadlineYears: [1, 50],
        riskInvestmentExpectedReturn: [0, 200]
      };
      const [min, max] = limits[key] || [0, 1e15];
      state[key] = clamp(safeNumber(input.value, min), min, max);
    } else state[key] = parseCurrency(input.value);
    deriveGoalContributions(state);
    elements.emergencyContribution.value = formatInputCurrency(state.emergencyContribution);
    elements.monthlySavings.value = formatInputCurrency(state.monthlySavings);
    elements.monthlyInvestment.value = formatInputCurrency(state.monthlyInvestment);
    elements.monthlyRiskInvestment.value = formatInputCurrency(state.monthlyRiskInvestment);
  }

  function updateDebtState(input) {
    const row = input.closest('[data-debt-id]');
    const field = input.dataset.debtField;
    const debt = state.debts.find((item) => item.id === row?.dataset.debtId);
    if (!debt || !field) return;
    if (field === 'name') debt.name = input.value.slice(0, 80);
    else debt[field] = parseCurrency(input.value);
    debt.apr = debt.balance > 0 ? clamp(debt.monthlyInterest / debt.balance * 12 * 100, 0, 200) : 0;
    debt.minimum = debt.principalPayment + debt.monthlyInterest;
    const aprOutput = row.querySelector('[data-debt-derived-apr] strong');
    const totalOutput = row.querySelector('[data-debt-derived-total] strong');
    if (aprOutput) aprOutput.textContent = `${formatPercent(debt.apr, 2)}/năm`;
    if (totalOutput) totalOutput.textContent = formatCurrency(debt.minimum, true);
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
    if (input.id === 'financeStartMonth') syncInvestmentCalculator();
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
    state.debts.push({ id: uid(), name: `Khoản nợ ${state.debts.length + 1}`, balance: 0, principalPayment: 0, monthlyInterest: 0, apr: 0, minimum: 0 });
    renderAll({ debts: true });
    saveState();
    elements.debtList.querySelector('.debt-row:last-child .debt-name')?.focus();
  });
  elements.exportButton.addEventListener('click', exportFinanceData);
  elements.importButton?.addEventListener('click', () => elements.importFile.click());
  elements.importFile?.addEventListener('change', () => importFinanceData(elements.importFile.files?.[0]));
  elements.resetButton.addEventListener('click', () => {
    if (!window.confirm('Đặt lại toàn bộ dữ liệu quản lý tài chính về kịch bản mẫu?')) return;
    state = normalizeState(null);
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
